const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin');
const User = require('../models/user');
const WorkSession = require('../models/WorkSession');
const DailyWorkHours = require('../models/DailyWorkHours');
const WeeklyWorkHours = require('../models/WeeklyWorkHours');

const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// Helper functions
function calculateWorkDuration(checkinTime, checkoutTime) {
  if (!checkoutTime) return 0;
  const durationMs = checkoutTime - checkinTime;
  return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
}

function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// ==================== GET REPORTE ADMIN (Check-Ins) ====================
router.get('/report', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    const supervisor = req.query.supervisor; // Nuevo parámetro para filtrar por supervisor

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: "Mes y año inválidos." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Obtener usuarios filtrados por supervisor si se especifica
    let userQuery = {};
    if (supervisor) {
      userQuery.reporta = supervisor;
    }
    const users = await User.find(userQuery, 'email name');

    if (users.length === 0) {
      return res.json([]);
    }

    const userEmails = users.map(user => user.email);

    const checkins = await Checkin.find({
      type: { $in: [null, "checkin"] },
      email: { $in: userEmails },
      createdAt: { $gte: start, $lt: end }
    }).sort({ createdAt: -1 });

    const userMap = {};
    users.forEach(user => {
      userMap[user.email] = user.name;
    });

    const result = checkins.map(entry => ({
      ...entry._doc,
      name: userMap[entry.email] || "-"
    }));

    res.json(result);
  } catch (error) {
    console.error("❌ Error en /api/checkin/report:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==================== GET REPORTE ADMIN (Check-Outs) ====================
router.get('/checkout/report', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: "Mes y año inválidos." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const checkouts = await Checkin.find({
      type: "checkout",
      createdAt: { $gte: start, $lt: end }
    }).sort({ createdAt: -1 });

    const users = await User.find({}, 'email name');

    const userMap = {};
    users.forEach(user => {
      userMap[user.email] = user.name;
    });

    const result = checkouts.map(entry => ({
      ...entry._doc,
      name: userMap[entry.email] || "-"
    }));

    res.json(result);
  } catch (error) {
    console.error("❌ Error en /api/checkout/report:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ==================== POST CHECK-IN ====================
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { locationUrl } = req.body || {};
    const email = req.user && req.user.email;
    if (!email) return res.status(401).json({ error: 'No autorizado' });

    // Enforce active location for check-in
    if (!locationUrl || typeof locationUrl !== 'string' || !locationUrl.trim()) {
      return res.status(400).json({
        error: 'location_required',
        message: 'Debes activar la ubicación (GPS) y otorgar permisos para registrar el inicio.'
      });
    }

    // Prevent duplicate open sessions
    const existingOpen = await WorkSession.findOne({ email, status: 'open' }).sort({ checkinTime: -1 });
    if (existingOpen) {
      return res.status(409).json({ error: 'session_already_open' });
    }

    // Create minimal checkin record for audit (lat/long optional now)
    const newCheckin = new Checkin({ email, type: "checkin" });

    await newCheckin.save();

    // Create work session
    const date = getStartOfDay(newCheckin.createdAt);
    const workSession = new WorkSession({
      email,
      checkinId: newCheckin._id,
      checkinTime: newCheckin.createdAt,
      date,
      startLocationUrl: locationUrl
    });

    await workSession.save();

    return res.status(201).json({
      message: '✔️ Inicio registrado con éxito',
      checkin: newCheckin
    });

  } catch (error) {
    console.error('❌ Error en POST /api/checkin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== POST CHECK-OUT ====================
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const { locationUrl } = req.body || {};
    const email = req.user && req.user.email;
    if (!email) return res.status(401).json({ error: 'No autorizado' });

    // Enforce active location for check-out
    if (!locationUrl || typeof locationUrl !== 'string' || !locationUrl.trim()) {
      return res.status(400).json({
        error: 'location_required',
        message: 'Debes activar la ubicación (GPS) y otorgar permisos para registrar el fin.'
      });
    }

    const newCheckout = new Checkin({ email, type: "checkout" });

    await newCheckout.save();

    // Find the open work session for this email
    const openSession = await WorkSession.findOne({ email, status: 'open' })
      .sort({ checkinTime: -1 });

    if (openSession) {
      // Clamp to 10 hours maximum
      const maxEnd = new Date(openSession.checkinTime.getTime() + 10 * 60 * 60 * 1000);
      const actualEnd = newCheckout.createdAt > maxEnd ? maxEnd : newCheckout.createdAt;
      const autoClosed = newCheckout.createdAt > maxEnd;

      // Calculate work duration
      const workDuration = calculateWorkDuration(openSession.checkinTime, actualEnd);

      // Update work session
      openSession.checkoutId = newCheckout._id;
      openSession.checkoutTime = actualEnd;
      openSession.workDuration = workDuration;
      openSession.status = 'completed';
      openSession.autoClosed = autoClosed;
      openSession.endLocationUrl = locationUrl;
      await openSession.save();

      // Update daily work hours
      const date = getStartOfDay(openSession.checkinTime);
      let dailyHours = await DailyWorkHours.findOne({ email, date });
      
      if (!dailyHours) {
        dailyHours = new DailyWorkHours({ email, date });
      }
      
      dailyHours.totalMinutes += workDuration;
      dailyHours.sessions.push(openSession._id);
      dailyHours.isComplete = true;
      await dailyHours.save();

      // Update weekly work hours
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const year = weekStart.getFullYear();
      const weekNumber = Math.ceil((weekStart - new Date(year, 0, 1)) / (7 * 24 * 60 * 60 * 1000));

      let weeklyHours = await WeeklyWorkHours.findOne({ email, weekStart });
      
      if (!weeklyHours) {
        weeklyHours = new WeeklyWorkHours({
          email,
          weekStart,
          weekEnd,
          year,
          weekNumber
        });
      }
      
      weeklyHours.totalMinutes += workDuration;
      if (!weeklyHours.dailyHours.includes(dailyHours._id)) {
        weeklyHours.dailyHours.push(dailyHours._id);
      }
      await weeklyHours.save();
    }

    if (!openSession) {
      return res.status(409).json({ error: 'no_open_session' });
    }
    return res.status(201).json({
      message: '✔️ Fin registrado con éxito',
      checkout: newCheckout,
      autoClosed: openSession ? openSession.autoClosed : false
    });

  } catch (error) {
    console.error('❌ Error en POST /api/checkout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
