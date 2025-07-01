const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin'); // Usamos el mismo modelo
const { authMiddleware } = require('../middleware/auth');

// ==================== POST CHECK-OUT ====================
router.post('/', authMiddleware, async (req, res) => {
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
      type: 'checkout' // diferenciador clave
    });

    await newCheckout.save();

    return res.status(201).json({
      message: '✔️ Check-Out registrado con éxito',
      checkout: newCheckout
    });

  } catch (error) {
    console.error('❌ Error en /api/checkout:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==================== GET REPORT ====================
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);

    if (isNaN(month) || isNaN(year)) {
      return res.status(400).json({ error: "Mes y año inválidos." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const checkouts = await Checkin.find({
      type: 'checkout',
      createdAt: {
        $gte: start,
        $lt: end
      }
    }).sort({ createdAt: -1 });

    res.json(checkouts);
  } catch (error) {
    console.error("❌ Error en /api/checkout/report:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
