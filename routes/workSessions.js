const express = require('express');
const router = express.Router();
const WorkSession = require('../models/WorkSession');
const User = require('../models/user');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// Helper function to get start of day
function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET - Complete sessions report for admin
router.get('/complete-sessions', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { date, email, supervisor } = req.query;

    let query = { status: 'completed' };
    if (date) {
      const start = getStartOfDay(new Date(date));
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      query.checkinTime = { $gte: start, $lt: end };
    }
    if (email) {
      query.email = email;
    }

    // Filtrar por supervisor si se especifica
    let userEmails = [];
    if (supervisor) {
      const users = await User.find({ reporta: supervisor }, 'email');
      userEmails = users.map(user => user.email);
      if (userEmails.length === 0) {
        return res.json([]);
      }
      query.email = { $in: userEmails };
    }

    const sessions = await WorkSession.find(query)
      .populate('checkinId', 'createdAt')
      .populate('checkoutId', 'createdAt')
      .sort({ checkinTime: -1 });

    // Get unique emails to fetch user names
    const emails = [...new Set(sessions.map(s => s.email))];
    const users = await User.find({ email: { $in: emails } }, 'email name');

    const userMap = users.reduce((map, user) => {
      map[user.email] = user.name;
      return map;
    }, {});

    const result = sessions.map(session => ({
      email: session.email,
      userName: userMap[session.email] || '-',
      checkinTime: session.checkinTime,
      checkoutTime: session.checkoutTime,
      workDuration: session.workDuration,
      status: session.status
    }));

    res.json(result);

  } catch (error) {
    console.error('Error fetching complete sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
