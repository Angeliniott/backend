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

// Auto-close any open sessions older than 10 hours
async function autoCloseStaleSessions(filter = {}) {
  const now = new Date();
  const threshold = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  const stale = await WorkSession.find({ status: 'open', checkinTime: { $lte: threshold }, ...filter });
  for (const s of stale) {
    const maxEnd = new Date(s.checkinTime.getTime() + 10 * 60 * 60 * 1000);
    s.checkoutTime = maxEnd;
    s.workDuration = Math.floor((s.checkoutTime - s.checkinTime) / (1000 * 60));
    s.status = 'completed';
    s.autoClosed = true;
    await s.save();
  }
}

// GET - Open session for current user
router.get('/open', authMiddleware, async (req, res) => {
  try {
    const email = req.user && req.user.email;
    if (!email) return res.status(401).json({ error: 'No autorizado' });

    // Auto-close if stale for this user
    await autoCloseStaleSessions({ email });

    const open = await WorkSession.findOne({ email, status: 'open' }).sort({ checkinTime: -1 });
    if (!open) return res.json({ open: false });
    return res.json({ open: true, session: { checkinTime: open.checkinTime } });
  } catch (e) {
    console.error('Error getting open session:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET - Complete sessions report for admin
router.get('/complete-sessions', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { date, email, supervisor } = req.query;

    // Ensure stale sessions are closed before reporting
    await autoCloseStaleSessions();

    let query = { status: 'completed' };
    if (date) {
      const start = getStartOfDay(new Date(date));
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      query.checkinTime = { $gte: start, $lt: end };
    }
    // Build allowed email set based on requester role/department
    const requester = req.user; // contains email, role
    let allowedEmails = null; // null means all
    if (requester && requester.role === 'admin') {
      const adminUser = await User.findOne({ email: requester.email }, 'dpt');
      if (!adminUser) {
        return res.status(403).json({ error: 'Usuario administrador no encontrado' });
      }
      const sameDeptUsers = await User.find({ dpt: adminUser.dpt }, 'email');
      allowedEmails = new Set(sameDeptUsers.map(u => u.email));
      if (allowedEmails.size === 0) return res.json([]);
    }

    // Optional supervisor filter
    let supervisorEmails = null;
    if (supervisor) {
      const users = await User.find({ reporta: supervisor }, 'email');
      const arr = users.map(u => u.email);
      supervisorEmails = new Set(arr);
      if (arr.length === 0) return res.json([]);
    }

    // Combine filters: allowedEmails ∩ supervisorEmails ∩ [email?]
    function intersectSets(a, b) {
      if (!a) return b; if (!b) return a;
      const out = new Set();
      a.forEach(v => { if (b.has(v)) out.add(v); });
      return out;
    }

    let finalEmails = null;
    if (allowedEmails) finalEmails = new Set(allowedEmails);
    if (supervisorEmails) finalEmails = intersectSets(finalEmails, supervisorEmails);
    if (email) {
      const single = new Set([email]);
      finalEmails = intersectSets(finalEmails, single);
    }
    if (finalEmails) {
      if (finalEmails.size === 0) return res.json([]);
      query.email = { $in: Array.from(finalEmails) };
    }

    const sessions = await WorkSession.find(query)
      .populate('checkinId', 'createdAt')
      .populate('checkoutId', 'createdAt')
      .sort({ checkinTime: -1 });

    // Get unique emails to fetch user names
    const emails = [...new Set(sessions.map(s => s.email))];
    const users = await User.find({ email: { $in: emails } }, 'email name reporta dpt');

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
      status: session.status,
      autoClosed: !!session.autoClosed,
      supervisor: (users.find(u => u.email === session.email) || {}).reporta || ''
    }));

    res.json(result);

  } catch (error) {
    console.error('Error fetching complete sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
