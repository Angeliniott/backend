const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Asegúrate de que la ruta es correcta
require('dotenv').config(); // Por si no está ya cargado

// Ruta para login
router.post('/login', async (req, res) => {
  try {
    console.log("👉 [POST /login] Body recibido:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("❌ Faltan campos: email o password");
      return res.status(400).json({ error: 'Faltan datos de login' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("❌ Contraseña incorrecta para", email);
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'clavepordefecto',
      { expiresIn: '1d' }
    );

    console.log("✅ Login exitoso de", email);

    res.status(200).json({
      token,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    console.error("❌ Error en /login:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
