const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin');
const User = require('../models/user');

const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// ==================== GET REPORTE ADMIN (Check-Ins) ====================
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
      type: { $in: [null, "checkin"] }, // check-ins o sin tipo definido (retrocompatibilidad)
      createdAt: { $gte: start, $lt: end }
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
      status: status || 'no especificado',
      type: "checkin"
    });

    await newCheckin.save();

    return res.status(201).json({
      message: '✔️ Check-in registrado con éxito',
      checkin: newCheckin
    });

  } catch (error) {
    console.error('❌ Error en POST /api/checkin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== POST CHECK-OUT ====================
router.post('/checkout', async (req, res) => {
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
      type: "checkout"
    });

    await newCheckout.save();

    return res.status(201).json({
      message: '✔️ Check-out registrado con éxito',
      checkout: newCheckout
    });

  } catch (error) {
    console.error('❌ Error en POST /api/checkout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
// ==================== GET CHECK-INS POR USUARIO ====================
/* router.get('/user/:email', authMiddleware, async (req, res) => {  
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: 'Email requerido.' });
    }

    const checkins = await Checkin.find({
      email,
      type: { $in: [null, "checkin"] } // check-ins o sin tipo definido (retrocompatibilidad)
    }).sort({ createdAt: -1 }); */