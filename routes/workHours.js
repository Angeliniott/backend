const express = require('express');
const router = express.Router();
const WorkSession = require('../models/WorkSession');
const DailyWorkHours = require('../models/DailyWorkHours');
const WeeklyWorkHours = require('../models/WeeklyWorkHours');
const Checkin = require('../models/checkin');
const User = require('../models/user');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// Helper function to calculate work duration
function calculateWorkDuration(checkinTime, checkoutTime) {
  if (!checkoutTime) return 0;
  const durationMs = checkoutTime - checkinTime;
  return Math.floor(durationMs / (1000 * 60)); // Convert to minutes
}

// Helper function to get start of day
function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to get week start (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// POST - Create or update work session when checkout occurs
router.post('/complete-session', async (req, res) => {
  try {
    const { email, checkoutId } = req.body;

    // Find the open work session for this email
    const openSession = await WorkSession.findOne({ email, status: 'open' })
      .sort({ checkinTime: -1 });

    if (!openSession) {
      return res.status(404).json({ error: 'No open work session found' });
    }

    // Find the checkout record
    const checkout = await Checkin.findById(checkoutId);
    if (!checkout) {
      return res.status(404).json({ error: 'Checkout record not found' });
    }

    // Calculate work duration
    const workDuration = calculateWorkDuration(openSession.checkinTime, checkout.createdAt);

    // Update work session
    openSession.checkoutId = checkoutId;
    openSession.checkoutTime = checkout.createdAt;
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

    res.json({
      message: 'Work session completed successfully',
      workDuration: workDuration,
      dailyTotal: dailyHours.totalMinutes,
      weeklyTotal: weeklyHours.totalMinutes
    });

  } catch (error) {
    console.error('Error completing work session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST - Create work session when checkin occurs
router.post('/start-session', async (req, res) => {
  try {
    const { email, checkinId } = req.body;

    const checkin = await Checkin.findById(checkinId);
    if (!checkin) {
      return res.status(404).json({ error: 'Checkin record not found' });
    }

    const date = getStartOfDay(checkin.createdAt);

    const workSession = new WorkSession({
      email,
      checkinId,
      checkinTime: checkin.createdAt,
      date
    });

    await workSession.save();

    res.json({
      message: 'Work session started successfully',
      sessionId: workSession._id
    });

  } catch (error) {
    console.error('Error starting work session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Daily work hours report for admin
router.get('/daily-report', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { date, email } = req.query;
    
    let query = {};
    if (date) {
      query.date = getStartOfDay(new Date(date));
    }
    if (email) {
      query.email = email;
    }

    const dailyHours = await DailyWorkHours.find(query)
      .populate({
        path: 'sessions',
        populate: {
          path: 'checkinId checkoutId',
          model: 'Checkin'
        }
      })
      .populate('email', 'name', User)
      .sort({ date: -1 });

    const result = dailyHours.map(record => ({
      email: record.email,
      name: record.email?.name || '-',
      date: record.date,
      totalHours: Math.floor(record.totalMinutes / 60),
      totalMinutes: record.totalMinutes % 60,
      sessions: record.sessions
    }));

    res.json(result);

  } catch (error) {
    console.error('Error fetching daily report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Weekly work hours report for admin
router.get('/weekly-report', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { weekStart, email } = req.query;
    
    let query = {};
    if (weekStart) {
      query.weekStart = getWeekStart(new Date(weekStart));
    }
    if (email) {
      query.email = email;
    }

    const weeklyHours = await WeeklyWorkHours.find(query)
      .populate({
        path: 'dailyHours',
        populate: {
          path: 'sessions',
          populate: {
            path: 'checkinId checkoutId',
            model: 'Checkin'
          }
        }
      })
      .populate('email', 'name', User)
      .sort({ weekStart: -1 });

    const result = weeklyHours.map(record => ({
      email: record.email,
      name: record.email?.name || '-',
      weekStart: record.weekStart,
      weekEnd: record.weekEnd,
      totalHours: Math.floor(record.totalMinutes / 60),
      totalMinutes: record.totalMinutes % 60,
      dailyBreakdown: record.dailyHours
    }));

    res.json(result);

  } catch (error) {
    console.error('Error fetching weekly report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Employee work summary
router.get('/employee-summary/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const { startDate, endDate } = req.query;

    let query = { email };
    if (startDate && endDate) {
      query.date = {
        $gte: getStartOfDay(new Date(startDate)),
        $lte: getStartOfDay(new Date(endDate))
      };
    }

    const dailyHours = await DailyWorkHours.find(query)
      .sort({ date: 1 });

    const totalMinutes = dailyHours.reduce((sum, record) => sum + record.totalMinutes, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    res.json({
      email,
      totalHours,
      remainingMinutes,
      totalMinutes,
      dailyRecords: dailyHours
    });

  } catch (error) {
    console.error('Error fetching employee summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
