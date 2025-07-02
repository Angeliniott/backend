const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const SpecialCheck = require('../models/specialcheck'); // Debes crear este modelo
const User = require('../models/User');

// Middleware para verificar token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

// POST /api/specialcheckin
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const { email, latitude, longitude } = req.body;
    if (!email || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const specialCheck = new SpecialCheck({
      user: user._id,
      email,
      latitude,
      longitude,
      type: 'checkin',
      timestamp: Date.now()
    });

    await specialCheck.save();
    res.json({ message: 'Check-in especial registrado', check: specialCheck });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// POST /api/specialcheckout
router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const { email, latitude, longitude } = req.body;
    if (!email || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const specialCheck = new SpecialCheck({
      user: user._id,
      email,
      latitude,
      longitude,
      type: 'checkout',
      timestamp: Date.now()
    });

    await specialCheck.save();
    res.json({ message: 'Check-out especial registrado', check: specialCheck });
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;