const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');
const { isEligibleForVacation, formatRemainingTime } = require('../utils/dateUtils');
const { parseHolidays, countHolidaysInRange, countWeekdaysExcludingHolidays } = require('../utils/holidayUtils');

// Static list of holidays in DD/MM/YY format
const HOLIDAYS = [
  '01/01/25', // Año Nuevo
  '03/02/25', // Día de la Constitución
  '17/03/25', // Natalicio de Benito Juárez
  '17/04/25', // Jueves Santo // **
  '18/04/25', // Viernes Santo // **
  '01/05/25', // Día del Trabajo
  '16/09/25', // Día de la Independencia
  '17/11/25', // Revolución Mexicana
  '24/12/25', // Noche Buena // **
  '25/12/25', // Navidad
  '31/12/25', // Fin de año // **
  '01/01/26', // Año Nuevo
  '02/02/26', // Día de la Constitución
  '16/03/26', // Natalicio de Benito Juárez
  '02/04/26', // Jueves Santo // **
  '03/04/26', // Viernes Santo // **
  '01/05/26', // Día del Trabajo
  '16/09/26', // Día de la Independencia
  '16/11/26', // Revolución Mexicana
  '24/12/26', // Noche Buena // **
  '25/12/26', // Navidad
  '31/12/26', // Fin de año // **
  '01/01/27', // Año Nuevo
  '01/02/27', // Día de la Constitución
  '15/03/27', // Natalicio de Benito Juárez
  '25/03/27', // Jueves Santo // **
  '26/03/27', // Viernes Santo // **
  '01/05/27', // Día del Trabajo
  '16/09/27', // Día de la Independencia
  '15/11/27', // Revolución Mexicana
  '24/12/27', // Noche Buena // **
  '25/12/27', // Navidad
  '31/12/27', // Fin de año // **
  '01/01/28', // Año Nuevo
  '07/02/28', // Día de la Constitución
  '20/03/28', // Natalicio de Benito Juárez
  '13/04/28', // Jueves Santo // **
  '14/04/28', // Viernes Santo // **
  '01/05/28', // Día del Trabajo
  '16/09/28', // Día de la Independencia
  '20/11/28', // Revolución Mexicana
  '24/12/28', // Noche Buena // **
  '25/12/28', // Navidad
  '31/12/28'  // Fin de año // **
];

// Parse holidays to Date objects
const parsedHolidays = parseHolidays(HOLIDAYS);

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

    let dias;
    if (año === 0) {
      // Para el primer año, calcular meses trabajados y asignar 1 día por mes, hasta 12
      const mesesTrabajados = (hoy.getFullYear() - fechaIngreso.getFullYear()) * 12 +
                              (hoy.getMonth() - fechaIngreso.getMonth());
      // Si el día actual es menor que el día de ingreso, restar 1 mes
      if (hoy.getDate() < fechaIngreso.getDate()) {
        mesesTrabajados = Math.max(0, mesesTrabajados - 1);
      }
      dias = Math.min(mesesTrabajados, 12);
    } else {
      // Para años siguientes, mantener lógica existente
      dias = 12;
      if (año >= 1 && año <= 4) {
        dias += año * 2;
      } else if (año >= 5) {
        dias += 8 + Math.floor((año - 5) / 5) * 2;
      }
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

    // Enriquecer solicitudes con campos adicionales para PDF
    const solicitudesEnriquecidas = solicitudes.map(sol => {
      // Calcular antigüedad en años
      const antiguedad = Math.floor((new Date() - new Date(user.fechaIngreso)) / (1000 * 60 * 60 * 24 * 365));

      // Calcular días disponibles antes de esta solicitud
      let diasDisponiblesAntes = 0;
      for (const p of periodos) {
        const usadosAntes = solicitudes
          .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin && new Date(s.fechaFin) < new Date(sol.fechaFin))
          .reduce((sum, s) => sum + s.diasSolicitados, 0);
        diasDisponiblesAntes += (p.dias - usadosAntes);
      }

      // Días disponibles después (antes - diasSolicitados)
      const diasDisponiblesDespues = diasDisponiblesAntes - sol.diasSolicitados;

      return {
        ...sol.toObject(),
        departamento: user.dpt,
        fechaContratacion: user.fechaIngreso.toISOString().slice(0, 10), // Formato YYYY-MM-DD
        antiguedad,
        diasDisponiblesAntes,
        diasDisponiblesDespues,
        diasReposicion: 0 // No existe, dejar como 0
      };
    });

    res.json({
      nombre: user.name,
      email: user.email,
      fechaIngreso: user.fechaIngreso,
      generados: totalGenerados,
      usados: totalUsados,
      disponibles: totalGenerados - totalUsados,
      resumenPeriodos: resumen,
      solicitudes: solicitudesEnriquecidas
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

    // Validar duración del servicio (mínimo 6 meses)
    if (!isEligibleForVacation(user.fechaIngreso)) {
      const remainingTime = formatRemainingTime(user.fechaIngreso);
      return res.status(400).json({ 
        error: `No eres elegible para solicitar vacaciones. ${remainingTime}.`,
        eligible: false,
        remainingDays: require('../utils/dateUtils').getDaysUntilEligible(user.fechaIngreso)
      });
    }

    const inicio = new Date(fechaInicio + 'T12:00:00');
    const fin = new Date(fechaFin + 'T12:00:00');
    if (fin < inicio) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    const diasSolicitados = countWeekdaysExcludingHolidays(inicio, fin, parsedHolidays);

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

// Mapa de admins a sus departamentos gestionados
const adminDepartments = {
  'edelgado@mazakcorp.com': 'finanzas',
  'ffernandez@mazakcorp.com': 'apps',
  'glopez@mazakcorp.com': 'servicio'
};

// Rutas admin para revisión
router.get('/admin/solicitudes', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    let solicitudes;
    if (req.user.role === 'admin2') {
      // Admin2 ve todas las solicitudes
      solicitudes = await SolicitudVacaciones.find().sort({ createdAt: -1 });
    } else if (req.user.role === 'admin') {
      // Admin ve solo solicitudes de empleados en su departamento gestionado
      const managedDept = adminDepartments[req.user.email];
      if (!managedDept) {
        return res.status(403).json({ error: 'Acceso denegado: departamento no asignado' });
      }
      const empleados = await User.find({ dpt: managedDept }).select('email');
      const emails = empleados.map(u => u.email);
      solicitudes = await SolicitudVacaciones.find({ email: { $in: emails } }).sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
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

// GET: contar solicitudes pendientes
router.get('/admin/pendientes', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const count = await SolicitudVacaciones.countDocuments({ estado: 'pendiente' });
    res.json({ pendientes: count });
  } catch (err) {
    console.error('❌ Error en GET /admin/pendientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
