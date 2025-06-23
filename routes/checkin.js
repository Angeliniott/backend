// backend/routes/checkin.js
const express = require('express');
const router = express.Router();
const checkin = require('../models/checkin'); // ✅ Esta es la correcta


router.post('/', async (req, res) => {
  try {
    const { email, latitude, longitude, distance, status } = req.body;

    // Validación básica
    if (
      !email ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number'
    ) {
      return res.status(400).json({ error: 'Faltan o son inválidos los datos requeridos.' });
    }

    const checkin = new checkin({
      email,
      latitude,
      longitude,
      distance: distance || null,
      status: status || 'no especificado'
    });

    await checkin.save();

    return res.status(201).json({
      message: '✔️ Check-in registrado con éxito',
      checkin
    });

  } catch (error) {
    console.error('❌ Error en /api/checkin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
