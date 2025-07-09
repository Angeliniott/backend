const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// ======================= FUNCIONES DE CÁLCULO =======================

function calcularDiasGenerados(fechaIngreso) {
  const hoy = new Date();
  const ingreso = new Date(fechaIngreso);

  let antiguedad = hoy.getFullYear() - ingreso.getFullYear();
  if (
    hoy.getMonth() < ingreso.getMonth() ||
    (hoy.getMonth() === ingreso.getMonth() && hoy.getDate() < ingreso.getDate())
  ) {
    antiguedad--;
  }

  let dias = 12;
  if (antiguedad >= 1 && antiguedad <= 4) {
    dias += (antiguedad * 2);
  } else if (antiguedad >= 5) {
    dias += 8;
    dias += Math.floor((antiguedad - 5) / 5) * 2;
  }

  return dias;
}

function eliminarAntiguasNoUsadas(solicitudes, fechaIngreso) {
  const expiradas = new Date();
  expiradas.setMonth(expiradas.getMonth() - 18);

  return solicitudes.filter(sol => {
    const fin = new Date(sol.fechaFin);
    return fin >= expiradas;
  });
}

function contarDiasValidos(solicitudes) {
  return solicitudes
    .filter(sol => sol.estado === 'aprobado')
    .reduce((sum, sol) => sum + sol.diasSolicitados, 0);
}

// ======================= RUTAS =======================

// Obtener resumen
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });

    if (!user || !user.fechaIngreso) {
      return res.status(400).json({ error: 'Usuario no válido o sin fecha de ingreso' });
    }

    const totalGenerados = calcularDiasGenerados(user.fechaIngreso) + (user.diasPendientesPrevios || 0);

    const solicitudes = await SolicitudVacaciones.find({ email: userEmail });
    const solicitudesValidas = eliminarAntiguasNoUsadas(solicitudes, user.fechaIngreso);
    const usados = contarDiasValidos(solicitudesValidas);
    const disponibles = totalGenerados - usados;

    res.json({
      nombre: user.name,
      email: user.email,
      fechaIngreso: user.fechaIngreso,
      generados: totalGenerados,
      usados,
      disponibles,
      solicitudes: solicitudesValidas
    });
  } catch (err) {
    console.error('❌ Error en GET /vacaciones/resumen:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Enviar solicitud
router.post('/solicitar', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    // Agrega supervisor aquí
    const { fechaInicio, fechaFin, motivo, supervisor } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }
    // Validar supervisor
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

    const nuevaSolicitud = new SolicitudVacaciones({
      email,
      fechaIngreso: user.fechaIngreso,
      fechaInicio: inicio,
      fechaFin: fin,
      diasSolicitados,
      motivo,
      supervisor // <-- Guardar el supervisor
    });

    await nuevaSolicitud.save();
    res.status(201).json({ message: 'Solicitud enviada', solicitud: nuevaSolicitud });
  } catch (err) {
    console.error('❌ Error en POST /vacaciones/solicitar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener solicitudes (admin)
router.get('/admin/solicitudes', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const solicitudes = await SolicitudVacaciones.find().sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (err) {
    console.error('❌ Error en GET /admin/solicitudes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Aprobar o rechazar (admin)
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
