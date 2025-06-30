const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin');
const User = require('../models/user');

const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// ==================== GET REPORTE ADMIN ====================
router.get('/report', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: "Mes y año inválidos." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const checkins = await Checkin.find({
      createdAt: {
        $gte: start,
        $lt: end
      }
    }).sort({ createdAt: -1 });

    const users = await User.find({}, 'email name');

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

// ==================== POST CHECK-IN ====================
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

    const newCheckin = new Checkin({
      email,
      latitude,
      longitude,
      distance: distance || null,
      status: status || 'no especificado'
    });

    await newCheckin.save();

    return res.status(201).json({
      message: '✔️ Check-in registrado con éxito',
      checkin: newCheckin
    });

  } catch (error) {
    console.error('❌ Error en /api/checkin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
