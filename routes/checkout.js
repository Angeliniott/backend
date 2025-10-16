const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin');
const WorkSession = require('../models/WorkSession');
const DailyWorkHours = require('../models/DailyWorkHours');
const WeeklyWorkHours = require('../models/WeeklyWorkHours');
const User = require('../models/user');
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

// ==================== POST CHECK-OUT ====================
router.post('/', async (req, res) => {
  try {
    const { email, latitude, longitude, distance, status } = req.body;

    if (
      !email ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      return res.status(400).json({ error: 'Faltan o son inválidos los datos requeridos.' });
    }

    const newCheckout = new Checkin({
      email,
      latitude,
      longitude,
      distance: distance || null,
      status: status || 'no especificado',
      type: 'checkout'
    });

    await newCheckout.save();

    // Complete work session
    try {
      // Find the open work session for this email
      const openSession = await WorkSession.findOne({ email, status: 'open' })
        .sort({ checkinTime: -1 });

      if (openSession) {
        // Calculate work duration
        const workDuration = calculateWorkDuration(openSession.checkinTime, newCheckout.createdAt);

        // Update work session
        openSession.checkoutId = newCheckout._id;
        openSession.checkoutTime = newCheckout.createdAt;
        openSession.workDuration = workDuration;
        openSession.status = 'completed';
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
    } catch (error) {
      console.error('Error completing work session:', error);
    }

    return res.status(201).json({
      message: '✔️ Check-out registrado con éxito',
      checkout: newCheckout
    });

  } catch (error) {
    console.error('❌ Error en POST /api/checkout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== GET REPORT ====================
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

    const checkouts = await Checkin.find({
      type: 'checkout',
      email: { $in: userEmails },
      createdAt: {
        $gte: start,
        $lt: end
      }
    }).sort({ createdAt: -1 });

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

module.exports = router;
