const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudVacaciones = require('../models/solicitudvacaciones');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');
const { isEligibleForVacation, formatRemainingTime } = require('../utils/dateUtils');
const { parseHolidays, countHolidaysInRange, countWeekdaysExcludingHolidays } = require('../utils/holidayUtils');

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

    const diasSolicitados = contarDiasHabiles(inicio, fin);

    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const aprobadas = await SolicitudVacaciones.find({ email, estado: 'aprobado' });
    const usados = obtenerUsadosPorPeriodo(aprobadas, periodos);
    const desglose = distribuirDiasSolicitados(periodos, usados, diasSolicitados);

    if (desglose.restante > 0) {
      const disponibles = periodos.reduce((sum, p, i) => sum + Math.max(0, p.dias - usados[i]), 0);
      return res.status(400).json({ error: `Solo tienes ${disponibles} días disponibles.`, disponibles });
    }

    res.json({
      solicitud: {
        diasSolicitados,
        diasPeriodoPrevio: desglose.diasPeriodoPrevio,
        diasPeriodoActual: desglose.diasPeriodoActual,
        vigenciaPrevio: desglose.vigenciaPrevio,
        vigenciaActual: desglose.vigenciaActual
      }
    });
  } catch (err) {
    console.error('❌ Error en POST /vacaciones/preview:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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

function contarDiasHabiles(inicio, fin) {
  return countWeekdaysExcludingHolidays(inicio, fin, parsedHolidays);
}

function calcularDiasPorAniversario(fechaIngreso) {
  const hoy = new Date();
  const periodos = [];

  // Primer año: prestación especial
  const inicio0 = new Date(fechaIngreso);
  const primerAniv = new Date(inicio0);
  primerAniv.setFullYear(primerAniv.getFullYear() + 1);
  const seisMeses = new Date(inicio0);
  seisMeses.setMonth(seisMeses.getMonth() + 6);
  const fin0 = new Date(primerAniv);
  fin0.setMonth(fin0.getMonth() + 18); // vigencia 18 meses desde primer aniversario

  let dias0 = 0;
  if (hoy >= seisMeses && hoy < primerAniv) dias0 = 6;
  if (hoy >= primerAniv) dias0 = 12;
  if (fin0 >= hoy) {
    periodos.push({ inicio: inicio0, fin: fin0, dias: dias0 });
  }

  // Años siguientes: habilitan solo al aniversario, vigencia 18 meses desde cada aniversario
  const diasPorAntiguedad = (n) => {
    // Tabla solicitada:
    // 1:12, 2:14, 3:16, 4:18, 5:20
    // 6-10:22, 11-15:24, 16-20:26, 21-25:28, 26-30:30, 31-35:32, 36-40:34, ...
    if (n <= 0) return 0;
    if (n === 1) return 12;
    if (n >= 2 && n <= 5) return 10 + (n * 2);
    const blockIndex = Math.floor((n - 6) / 5); // bloques de 5 años empezando en 6-10
    return 22 + (blockIndex * 2);
  };

  for (let año = 2; año <= 50; año++) {
    // Para años >=2, el periodo inicia en el aniversario donde se habilitan esos días
    const inicio = new Date(fechaIngreso);
    inicio.setFullYear(inicio.getFullYear() + año); // aniversario del año n

    const finVigencia = new Date(inicio);
    finVigencia.setMonth(finVigencia.getMonth() + 18); // vigencia 18 meses desde ese aniversario

    if (finVigencia < hoy) continue; // periodo completamente expirado

    // Habilitar días sólo al llegar ese aniversario
    const dias = hoy >= inicio ? diasPorAntiguedad(año) : 0;

    periodos.push({ inicio, fin: finVigencia, dias });

    // Cortar si el inicio está muy en el futuro (optimización)
    const corteFuturo = new Date(hoy);
    corteFuturo.setFullYear(corteFuturo.getFullYear() + 3);
    if (inicio > corteFuturo) break;
  }

  return periodos;
}

function obtenerUsadosPorPeriodo(solicitudesAprobadas, periodos) {
  const usados = periodos.map(() => 0);
  for (const sol of solicitudesAprobadas) {
    const inicio = new Date(sol.fechaInicio);
    const fin = new Date(sol.fechaFin);
    const dias = contarDiasHabiles(inicio, fin);
    let restante = dias;
    for (let i = 0; i < periodos.length && restante > 0; i++) {
      const p = periodos[i];
      const ref = new Date(sol.createdAt || sol.fechaSolicitud || inicio);
      if (ref > p.fin) continue; // fuera de vigencia
      const disponibleEnPeriodo = Math.max(0, p.dias - usados[i]);
      const usa = Math.min(disponibleEnPeriodo, restante);
      usados[i] += usa;
      restante -= usa;
    }
  }
  return usados;
}

function distribuirDiasSolicitados(periodos, usados, diasSolicitados) {
  let restante = diasSolicitados;
  let diasPeriodoPrevio = 0;
  let diasPeriodoActual = 0;
  let vigenciaPrevio = null;
  let vigenciaActual = null;

  for (let i = 0; i < periodos.length && restante > 0; i++) {
    const p = periodos[i];
    const disponible = Math.max(0, p.dias - usados[i]);
    if (disponible <= 0) continue;
    const toma = Math.min(disponible, restante);
    if (diasPeriodoPrevio === 0) {
      diasPeriodoPrevio = toma;
      vigenciaPrevio = p.fin;
    } else {
      diasPeriodoActual += toma;
      vigenciaActual = p.fin;
    }
    restante -= toma;
  }
  return { diasPeriodoPrevio, diasPeriodoActual, vigenciaPrevio, vigenciaActual, restante };
}

// ======================= RUTAS =======================

// GET: resumen de vacaciones
router.get('/resumen', authMiddleware, async (req, res) => {
  try {
    const emailParam = req.query.email;
    const user = emailParam ? await User.findOne({ email: emailParam }) : await User.findOne({ email: req.user.email });

    if (!user || !user.fechaIngreso) {
      return res.status(400).json({ error: 'Usuario no válido o sin fecha de ingreso' });
    }

    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const solicitudes = await SolicitudVacaciones.find({ email: user.email, estado: 'aprobado' });

    // Calcular usados por periodo con base en aprobadas
    const periodosResumen = periodos.map(p => {
      const usadosPeriodo = solicitudes
        .filter(s => new Date(s.fechaFin) >= p.inicio && new Date(s.fechaFin) <= p.fin)
        .reduce((sum, s) => sum + (s.diasPeriodoPrevio || 0) + (s.diasPeriodoActual || 0), 0);
      return {
        inicioAniversario: p.inicio,
        finAniversario: p.inicio, // fin del año laboral; no usado en vigencia
        vigenciaHasta: p.fin,
        habilitados: p.dias,
        usados: usadosPeriodo,
        disponibles: Math.max(0, p.dias - usadosPeriodo)
      };
    });
    const disponiblesTotal = periodosResumen.reduce((sum, r) => sum + r.disponibles, 0);

    // Además, incluir solicitudes del usuario enriquecidas para compatibilidad con misvacaciones.html
    const todasSolicitudes = await SolicitudVacaciones.find({ email: user.email }).lean();
    const solicitudesEnriquecidas = todasSolicitudes.map(sol => {
      // calcular días disponibles antes de esta solicitud (sumando disponibles por periodo antes de su fechaFin)
      let diasDisponiblesAntes = 0;
      for (const p of periodosResumen) {
        const usadosAntes = todasSolicitudes
          .filter(s => s.estado === 'aprobado' && new Date(s.fechaFin) >= p.inicioAniversario && new Date(s.fechaFin) <= p.vigenciaHasta && new Date(s.fechaFin) < new Date(sol.fechaFin))
          .reduce((sum, s) => sum + ((s.diasPeriodoPrevio || 0) + (s.diasPeriodoActual || 0)), 0);
        diasDisponiblesAntes += Math.max(0, p.habilitados - usadosAntes);
      }
      const diasDisponiblesDespues = Math.max(0, diasDisponiblesAntes - (sol.diasSolicitados || 0));
      return {
        ...sol,
        fechaSolicitud: sol.createdAt,
        departamento: user.dpt,
        fechaContratacion: user.fechaIngreso,
        antiguedad: Math.max(0, Math.floor((Date.now() - new Date(user.fechaIngreso)) / (1000*60*60*24*365))),
        diasDisponiblesAntes,
        diasDisponiblesDespues,
        diasPendientesPrevios: sol.diasPeriodoPrevio || 0,
        diasPendientesActuales: sol.diasPeriodoActual || 0,
        aprobadoPor: sol.aprobadoPor || null,
        fechaAprobacion: sol.fechaAprobacion || null
      };
    });

    res.json({
      nombre: user.name,
      email: user.email,
      fechaIngreso: user.fechaIngreso,
      departamento: user.dpt,
      periodos: periodosResumen,
      disponiblesTotal,
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


    const diasSolicitados = contarDiasHabiles(inicio, fin);

    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const aprobadas = await SolicitudVacaciones.find({ email, estado: 'aprobado' });
    const usados = obtenerUsadosPorPeriodo(aprobadas, periodos);
    const desglose = distribuirDiasSolicitados(periodos, usados, diasSolicitados);

    if (desglose.restante > 0) {
      const disponibles = periodos.reduce((sum, p, i) => sum + Math.max(0, p.dias - usados[i]), 0);
      return res.status(400).json({ error: `Solo tienes ${disponibles} días disponibles.` });
    }

    // Disponibles actuales al momento (referencia), después de considerar aprobadas previas
    const disponibles = periodos.reduce((sum, p, i) => sum + Math.max(0, p.dias - usados[i]), 0);

    const nuevaSolicitud = new SolicitudVacaciones({
      usuario: user._id,
      email,
      fechaIngreso: user.fechaIngreso,
      fechaInicio: inicio,
      fechaFin: fin,
      diasSolicitados,
      motivo,
      supervisor,
      diasPeriodoPrevio: desglose.diasPeriodoPrevio,
      diasPeriodoActual: desglose.diasPeriodoActual,
      vigenciaPrevio: desglose.vigenciaPrevio,
      vigenciaActual: desglose.vigenciaActual
      ,disponibles // Guardar los días disponibles al momento de la solicitud (antes de descontar la solicitud)
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

    const update = { estado, comentariosAdmin };
    if (estado === 'aprobado') {
      update.aprobadoPor = (req.user && (req.user.name || req.user.email)) || undefined;
      update.fechaAprobacion = new Date();
    } else if (estado === 'rechazado') {
      update.aprobadoPor = undefined;
      update.fechaAprobacion = undefined;
    }

    const solicitud = await SolicitudVacaciones.findByIdAndUpdate(
      id,
      update,
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

// POST: admin descuenta días pendientes como si fuera una solicitud aprobada
router.post('/admin/descontar', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { email, cantidad, motivo } = req.body;
    if (!email || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Email y cantidad > 0 son requeridos' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.fechaIngreso) {
      return res.status(404).json({ error: 'Usuario no encontrado o sin fecha de ingreso' });
    }

    // Calcular periodos y usados actuales
    const periodos = calcularDiasPorAniversario(user.fechaIngreso);
    const aprobadas = await SolicitudVacaciones.find({ email, estado: 'aprobado' });
    const usados = obtenerUsadosPorPeriodo(aprobadas, periodos);

    // Distribuir como si fuera una solicitud
    const desglose = distribuirDiasSolicitados(periodos, usados, cantidad);
    if (desglose.restante > 0) {
      const disponibles = periodos.reduce((sum, p, i) => sum + Math.max(0, p.dias - usados[i]), 0);
      return res.status(400).json({ error: `Solo tiene ${disponibles} días disponibles para descontar.` });
    }

    const now = new Date();
    const nueva = new SolicitudVacaciones({
      usuario: user._id,
      email,
      fechaIngreso: user.fechaIngreso,
      fechaInicio: now,
      fechaFin: now,
      diasSolicitados: cantidad,
      motivo: motivo || 'Ajuste administrativo de días pendientes',
      // Usar un supervisor permitido por el esquema (enum)
      supervisor: 'fsantiago@mazakcorp.com',
      estado: 'aprobado',
      diasPeriodoPrevio: desglose.diasPeriodoPrevio,
      diasPeriodoActual: desglose.diasPeriodoActual,
      vigenciaPrevio: desglose.vigenciaPrevio,
      vigenciaActual: desglose.vigenciaActual,
      disponibles: periodos.reduce((sum, p, i) => sum + Math.max(0, p.dias - usados[i]), 0)
    });
    await nueva.save();

    res.status(201).json({ message: 'Días descontados', solicitud: nueva });
  } catch (err) {
    console.error('❌ Error en POST /admin/descontar:', err);
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
// (Eliminada ruta duplicada '/resumen' para consolidación)

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

// DEBUG: endpoint opcional para verificar periodos y habilitados por fecha de ingreso
// Uso: GET /api/vacaciones/debug/periodos?fechaIngreso=2023-11-01 (requiere token)
//      GET /api/vacaciones/debug/periodos?email=user@example.com (admin)
// Devuelve los periodos calculados con inicio, vigencia y días habilitados al día de hoy.
router.get('/debug/periodos', authMiddleware, async (req, res) => {
  try {
    let fecha;
    if (req.query.fechaIngreso) {
      fecha = new Date(req.query.fechaIngreso);
    } else if (req.query.email) {
      const u = await User.findOne({ email: req.query.email });
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
      fecha = new Date(u.fechaIngreso);
    } else {
      const u = await User.findById(req.user.id);
      fecha = new Date(u.fechaIngreso);
    }
    if (isNaN(fecha)) return res.status(400).json({ error: 'fechaIngreso inválida' });
    const periodos = calcularDiasPorAniversario(fecha).map(p => ({
      inicio: p.inicio,
      vigenciaHasta: p.fin,
      habilitadosHoy: p.dias
    }));
    res.json({ fechaIngreso: fecha, hoy: new Date(), periodos });
  } catch (err) {
    console.error('❌ Error en GET /vacaciones/debug/periodos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
