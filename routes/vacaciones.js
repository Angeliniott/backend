// PREVIEW: calcular desglose de días por periodo sin guardar registro
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { fechaInicio, fechaFin, supervisor } = req.body;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Fechas requeridas' });
    }

    if (!supervisor || !['elizabeth', 'francisco', 'servicio', 'fsantiago@mazakcorp.com'].includes(supervisor)) {
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

    // Verificar disponibilidad y calcular desglose por periodo
    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const solicitudes = await SolicitudVacaciones.find({ email });
    let disponibles = 0;

    // Calcular días disponibles por periodo (restando aprobados)
    const periodosDisponibles = periodos.map(p => {
      const usados = solicitudes
        .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin)
        .reduce((sum, s) => sum + (s.diasPeriodoPrevio || 0) + (s.diasPeriodoActual || 0), 0);
      return {
        inicio: p.inicio,
        fin: p.fin,
        dias: p.dias,
        disponibles: p.dias - usados
      };
    });

    // Sumar todos los disponibles
    disponibles = periodosDisponibles.reduce((sum, p) => sum + p.disponibles, 0);
    if (diasSolicitados > disponibles) {
      return res.status(400).json({ error: `Solo tienes ${disponibles} días disponibles.` });
    }

    // Descontar primero del periodo más antiguo
    let diasRestantes = diasSolicitados;
    let diasPeriodoPrevio = 0;
    let diasPeriodoActual = 0;
    let vigenciaPrevio = null;
    let vigenciaActual = null;

    // Asumimos que solo puede haber dos periodos activos (previo y actual)
    const activos = periodosDisponibles.filter(p => p.disponibles > 0);
    if (activos.length === 0) {
      return res.status(400).json({ error: 'No tienes días disponibles en ningún periodo.' });
    }
    // Tomar primero del más antiguo
    if (activos[0].disponibles > 0) {
      const tomar = Math.min(diasRestantes, activos[0].disponibles);
      diasPeriodoPrevio = tomar;
      vigenciaPrevio = activos[0].fin;
      diasRestantes -= tomar;
    }
    if (diasRestantes > 0 && activos.length > 1 && activos[1].disponibles > 0) {
      const tomar = Math.min(diasRestantes, activos[1].disponibles);
      diasPeriodoActual = tomar;
      vigenciaActual = activos[1].fin;
      diasRestantes -= tomar;
    }

    // Devolver solo el desglose, no guardar nada
    res.json({
      solicitud: {
        diasSolicitados,
        diasPeriodoPrevio,
        diasPeriodoActual,
        vigenciaPrevio,
        vigenciaActual
      }
    });
  } catch (err) {
    console.error('❌ Error en POST /vacaciones/preview:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
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
      let mesesTrabajados = (hoy.getFullYear() - fechaIngreso.getFullYear()) * 12 +
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
      const antiguedadAnios = (new Date() - new Date(user.fechaIngreso)) / (1000 * 60 * 60 * 24 * 365);
      const antiguedad = antiguedadAnios < 1 ? '<1' : Math.floor(antiguedadAnios);

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

      // Incluir desglose por periodo y vigencias
      return {
        ...sol.toObject(),
        fechaSolicitud: sol.createdAt,
        departamento: user.dpt,
        fechaContratacion: user.fechaIngreso.toISOString().slice(0, 10),
        antiguedad,
        diasDisponiblesAntes,
        diasDisponiblesDespues,
        disponibles: diasDisponiblesDespues,
        diasReposicion: 0,
        diasPeriodoPrevio: sol.diasPeriodoPrevio || 0,
        diasPeriodoActual: sol.diasPeriodoActual || 0,
        vigenciaPrevio: sol.vigenciaPrevio || null,
        vigenciaActual: sol.vigenciaActual || null
      };
    });

    res.json({
      nombre: user.name,
      email: user.email,
      fechaIngreso: user.fechaIngreso,
      departamento: user.dpt,
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

    if (!supervisor || !['elizabeth', 'francisco', 'servicio', 'fsantiago@mazakcorp.com'].includes(supervisor)) {
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

    // Verificar disponibilidad y calcular desglose por periodo
    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const solicitudes = await SolicitudVacaciones.find({ email });
    let disponibles = 0;

    // Calcular días disponibles por periodo (restando aprobados)
    const periodosDisponibles = periodos.map(p => {
      const usados = solicitudes
        .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin)
        .reduce((sum, s) => sum + (s.diasPeriodoPrevio || 0) + (s.diasPeriodoActual || 0), 0);
      return {
        inicio: p.inicio,
        fin: p.fin,
        dias: p.dias,
        disponibles: p.dias - usados
      };
    });

    // Sumar todos los disponibles
    disponibles = periodosDisponibles.reduce((sum, p) => sum + p.disponibles, 0);
    if (diasSolicitados > disponibles) {
      return res.status(400).json({ error: `Solo tienes ${disponibles} días disponibles.` });
    }

    // Descontar primero del periodo más antiguo
    let diasRestantes = diasSolicitados;
    let diasPeriodoPrevio = 0;
    let diasPeriodoActual = 0;
    let vigenciaPrevio = null;
    let vigenciaActual = null;

    // Asumimos que solo puede haber dos periodos activos (previo y actual)
    const activos = periodosDisponibles.filter(p => p.disponibles > 0);
    if (activos.length === 0) {
      return res.status(400).json({ error: 'No tienes días disponibles en ningún periodo.' });
    }
    // Tomar primero del más antiguo
    if (activos[0].disponibles > 0) {
      const tomar = Math.min(diasRestantes, activos[0].disponibles);
      diasPeriodoPrevio = tomar;
      vigenciaPrevio = activos[0].fin;
      diasRestantes -= tomar;
    }
    if (diasRestantes > 0 && activos.length > 1 && activos[1].disponibles > 0) {
      const tomar = Math.min(diasRestantes, activos[1].disponibles);
      diasPeriodoActual = tomar;
      vigenciaActual = activos[1].fin;
      diasRestantes -= tomar;
    }

    const nuevaSolicitud = new SolicitudVacaciones({
      usuario: user._id,
      email,
      fechaIngreso: user.fechaIngreso,
      fechaInicio: inicio,
      fechaFin: fin,
      diasSolicitados,
      motivo,
      supervisor,
      diasPeriodoPrevio,
      diasPeriodoActual,
      vigenciaPrevio,
      vigenciaActual
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
      solicitudes = await SolicitudVacaciones.find()
        .populate('usuario', 'name') // Incluye el campo 'name' del usuario
        .sort({ createdAt: -1 })
        .exec();
    } else if (req.user.role === 'admin') {
      // Admin ve solo solicitudes de empleados en su departamento gestionado
      const managedDept = adminDepartments[req.user.email];
      if (!managedDept) {
        return res.status(403).json({ error: 'Acceso denegado: departamento no asignado' });
      }

      const empleados = await User.find({ dpt: managedDept }).select('_id'); // Busca IDs de usuarios en el departamento
      const userIds = empleados.map(u => u._id);

      solicitudes = await SolicitudVacaciones.find({ usuario: { $in: userIds } })
        .populate('usuario', 'name') // Incluye el campo 'name' del usuario
        .sort({ createdAt: -1 })
        .exec();
    } else {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Asegurar que cada solicitud tenga el nombre del usuario
    const solicitudesConNombre = await Promise.all(solicitudes.map(async (sol) => {
      let nombre = '';
      if (sol.usuario && typeof sol.usuario === 'object' && sol.usuario.name) {
        nombre = sol.usuario.name;
      } else if (sol.email) {
        const user = await User.findOne({ email: sol.email });
        nombre = user && user.name ? user.name : '';
      }
      // Retornar la solicitud con el campo nombre y desglose por periodo
      return {
        ...sol.toObject(),
        nombre,
        diasPeriodoPrevio: sol.diasPeriodoPrevio || 0,
        diasPeriodoActual: sol.diasPeriodoActual || 0,
        vigenciaPrevio: sol.vigenciaPrevio || null,
        vigenciaActual: sol.vigenciaActual || null
      };
    }));
    res.json(solicitudesConNombre);
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

// Calculate pending days and their validity
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const fechaIngreso = new Date(user.fechaIngreso);
    const hoy = new Date();

    // Calculate validity for previous days (18 months after anniversary)
    const aniversario = new Date(fechaIngreso);
    aniversario.setFullYear(hoy.getFullYear());
    if (hoy < aniversario) aniversario.setFullYear(hoy.getFullYear() - 1);
    const vigenciaPrevios = new Date(aniversario);
    vigenciaPrevios.setMonth(vigenciaPrevios.getMonth() + 18);

    // Calculate validity for current days (next anniversary)
    const vigenciaActuales = new Date(aniversario);
    vigenciaActuales.setFullYear(vigenciaActuales.getFullYear() + 1);

    res.json({
      diasPendientesPrevios: user.diasPendientesPrevios,
      diasPendientesActuales: user.diasPendientesActuales,
      vigenciaPrevios,
      vigenciaActuales
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular días pendientes' });
  }
});

// Function to calculate and update pending days automatically
async function actualizarDiasPendientes(user) {
  const hoy = new Date();
  const fechaIngreso = new Date(user.fechaIngreso);

  // Calculate anniversary
  const aniversario = new Date(fechaIngreso);
  aniversario.setFullYear(hoy.getFullYear());
  if (hoy < aniversario) aniversario.setFullYear(hoy.getFullYear() - 1);

  // Move current days to previous if anniversary has passed
  if (hoy >= aniversario) {
    user.diasPendientesPrevios += user.diasPendientesActuales;
    user.vigenciaPrevios = new Date(aniversario);
    user.vigenciaPrevios.setMonth(user.vigenciaPrevios.getMonth() + 18);

    // Calculate new current days based on Mexican law
    const antiguedad = hoy.getFullYear() - fechaIngreso.getFullYear();
    let nuevosDias = 12;
    if (antiguedad >= 1 && antiguedad <= 4) {
      nuevosDias += antiguedad * 2;
    } else if (antiguedad >= 5) {
      nuevosDias += 8 + Math.floor((antiguedad - 5) / 5) * 2;
    }

    user.diasPendientesActuales = nuevosDias;
    user.vigenciaActuales = new Date(aniversario);
    user.vigenciaActuales.setFullYear(user.vigenciaActuales.getFullYear() + 1);
  }

  await user.save();
}

// Middleware to update pending days before any vacation-related route
router.use(authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      await actualizarDiasPendientes(user);
    }
    next();
  } catch (err) {
    console.error('Error updating pending days:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
