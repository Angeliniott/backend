// backend/routes/checkin.js
const express = require('express');
const router = express.Router();
const Checkin = require('../models/checkin'); // ✅ nombre corregido
const User = require('../models/user'); // Asegúrate de tener este modelo

// GET /api/checkin/report?month=6&year=2025
router.get('/report', async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: "Mes y año son requeridos." });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const checkins = await checkin.find({
      createdAt: {
        $gte: start,
        $lt: end
      }
    }).sort({ createdAt: -1 });

    // Obtener usuarios para asociar nombres
    const users = await User.find({}, 'email name');

    // Crear un mapa rápido de email -> nombre
    const userMap = {};
    users.forEach(user => {
      userMap[user.email] = user.name;
    });

    // Adjuntar nombre al resultado
    const result = checkins.map(entry => ({
      ...entry._doc,
      name: userMap[entry.email] || null
    }));

    res.json(result);
  } catch (error) {
    console.error("❌ Error en /api/checkin/report:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
// POST /api/checkin
// Registra un nuevo check-in
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
