// backend/routes/checkin.js
const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin');

router.post('/', async (req, res) => {
  const { email, latitude, longitude, distance, status } = req.body;

  if (!email) return res.status(400).json({ error: 'Email es requerido' });

  try {
    const checkin = new Checkin({ email, latitude, longitude, distance, status });
    await checkin.save();
    res.status(201).json({ message: 'Check-in registrado con éxito', checkin });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar check-in' });
  }
});

module.exports = router;
