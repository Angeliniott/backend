const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

// ================= LOGIN =================
router.post('/login', async (req, res) => {
  try {
    console.log("👉 [POST /login] Body recibido:", req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Faltan datos de login' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // 🔒 Incluir `rol` en el token
    const token = jwt.sign(
      { id: user._id, role: user.role || 'empleado' },
      process.env.JWT_SECRET || 'clavepordefecto',
      { expiresIn: '1d' }
    );

    console.log("✅ Login exitoso de", email);

    res.status(200).json({
      token,
      name: user.name,
      email: user.email,
      role: user.role || 'empleado'
    });

  } catch (error) {
    console.error("❌ Error en /login:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ================= REGISTRO =================
router.post('/register', async (req, res) => {
  try {
    console.log("👉 [POST /register] Body recibido:", req.body);

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'empleado' // 👈 Valor por defecto: 'empleado'
    });

    await newUser.save();

    console.log("✅ Usuario registrado:", email);

    res.status(201).json({ message: 'Usuario creado con éxito' });
  } catch (error) {
    console.error("❌ Error en /register:", error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

module.exports = router;
