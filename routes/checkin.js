// backend/routes/checkin.js
const express = require('express');
const router = express.Router();
const Checkin = require('../models/Checkin');

router.post('/', async (req, res) => {
  try {
    const { email, latitude, longitude, distance, status } = req.body;

    if (!email || !latitude || !longitude) {
      return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    const checkin = new Checkin({
      email,
      latitude,
      longitude,
      distance,
      status
    });

    await checkin.save();

    res.status(201).json({
      message: 'Check-in registrado con éxito',
      checkin
    });

  } catch (error) {
    console.error('❌ Error en /api/checkin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
