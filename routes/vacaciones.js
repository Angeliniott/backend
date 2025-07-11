const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// ======================= FUNCIONES =======================

function calcularDiasPorAniversario(fechaIngreso) {
  const hoy = new Date();
  const periodos = [];

  for (let año = 0; año < 50; año++) {
    const inicio = new Date(fechaIngreso);
    inicio.setFullYear(inicio.getFullYear() + año);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + 18); // vence 18 meses después

    if (fin < hoy) continue; // expirado
    if (inicio > hoy) break; // futuro

    let dias = 12;
    if (año >= 1 && año <= 4) {
      dias += año * 2;
    } else if (año >= 5) {
      dias += 8 + Math.floor((año - 5) / 5) * 2;
    }

    periodos.push({ inicio, fin, dias });
  }

  return periodos;
}

function calcularDiasUsadosPorPeriodo(solicitudes) {
  const usados = {};

  solicitudes
    .filter(s => s.estado === 'aprobado')
    .forEach(s => {
      const fin = new Date(s.fechaFin);
      for (const key in usados) {
        const periodo = usados[key];
        if (fin >= periodo.inicio && fin <= periodo.fin) {
          periodo.usados += s.diasSolicitados;
          return;
        }
      }
    });

  return usados;
}

// ======================= RUTAS =======================

// GET: resumen de vacaciones
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });

    if (!user || !user.fechaIngreso) {
      return res.status(400).json({ error: 'Usuario no válido o sin fecha de ingreso' });
    }

    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const solicitudes = await SolicitudVacaciones.find({ email: userEmail });

    const resumen = [];
    let totalGenerados = 0;
    let totalUsados = 0;

    for (const p of periodos) {
      const usadosPeriodo = solicitudes
        .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin)
        .reduce((sum, s) => sum + s.diasSolicitados, 0);

      resumen.push({
        periodo: `${p.inicio.toISOString().slice(0, 10)} → ${p.fin.toISOString().slice(0, 10)}`,
        generados: p.dias,
        usados: usadosPeriodo,
        disponibles: p.dias - usadosPeriodo
      });

      totalGenerados += p.dias;
      totalUsados += usadosPeriodo;
    }

    res.json({
      nombre: user.name,
      email: user.email,
      fechaIngreso: user.fechaIngreso,
      generados: totalGenerados,
      usados: totalUsados,
      disponibles: totalGenerados - totalUsados,
      resumenPeriodos: resumen,
      solicitudes
    });

  } catch (err) {
    console.error('❌ Error en GET /vacaciones/resumen:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: solicitar vacaciones
router.post('/solicitar', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { fechaInicio, fechaFin, motivo, supervisor } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    if (!supervisor || !['elizabeth', 'francisco', 'servicio'].includes(supervisor)) {
      return res.status(400).json({ error: 'Supervisor requerido o inválido' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.fechaIngreso) {
      return res.status(400).json({ error: 'Usuario inválido' });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (fin < inicio) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    const diasSolicitados = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;

    // Verificar disponibilidad
    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const solicitudes = await SolicitudVacaciones.find({ email });
    let disponibles = 0;

    for (const p of periodos) {
      const usados = solicitudes
        .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin)
        .reduce((sum, s) => sum + s.diasSolicitados, 0);

      disponibles += (p.dias - usados);
    }

    if (diasSolicitados > disponibles) {
      return res.status(400).json({ error: `Solo tienes ${disponibles} días disponibles.` });
    }

    const nuevaSolicitud = new SolicitudVacaciones({
      email,
      fechaIngreso: user.fechaIngreso,
      fechaInicio: inicio,
      fechaFin: fin,
      diasSolicitados,
      motivo,
      supervisor
    });

    await nuevaSolicitud.save();
    res.status(201).json({ message: 'Solicitud enviada', solicitud: nuevaSolicitud });

  } catch (err) {
    console.error('❌ Error en POST /vacaciones/solicitar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Rutas admin para revisión
router.get('/admin/solicitudes', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const solicitudes = await SolicitudVacaciones.find().sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (err) {
    console.error('❌ Error en GET /admin/solicitudes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/admin/actualizar', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { id, estado, comentariosAdmin } = req.body;

    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const solicitud = await SolicitudVacaciones.findByIdAndUpdate(
      id,
      { estado, comentariosAdmin },
      { new: true }
    );

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ message: 'Estado actualizado', solicitud });
  } catch (err) {
    console.error('❌ Error en POST /admin/actualizar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
