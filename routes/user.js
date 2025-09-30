const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Ajusta el path si tu modelo está en otra carpeta
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// Crear nuevo usuario/empleado (solo admin)
router.post('/', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, role, fechaIngreso, dpt, reporta, diasPendientesPrevios } = req.body;
    if (!name || !email || !password || !fechaIngreso || !dpt) {
      return res.status(400).json({ error: 'Faltan datos requeridos: name, email, password, fechaIngreso, dpt' });
    }

    // Verifica si el usuario ya existe
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Crea el usuario
    const nuevoUsuario = new User({
      name,
      email,
      password, // Nota: deberías hashear la contraseña
      role: role || 'empleado',
      fechaIngreso: new Date(fechaIngreso),
      dpt,
      reporta: reporta || '',
      diasPendientesPrevios: diasPendientesPrevios || 0
    });

    await nuevoUsuario.save();
    res.status(201).json({ message: 'Empleado creado correctamente', user: { name, email, role: nuevoUsuario.role, dpt: nuevoUsuario.dpt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
});

router.post('/actualizar-dias-pendientes', authMiddleware, verifyAdmin, async (req, res) => {
  const { email, diasPendientesPrevios } = req.body;
  if (typeof diasPendientesPrevios !== 'number') {
    return res.status(400).json({ error: 'Valor inválido' });
  }
  await User.updateOne({ email }, { $set: { diasPendientesPrevios } });
  res.json({ message: 'Días pendientes actualizados' });
});

// Obtener perfil del usuario autenticado
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email role dpt'); // Selecciona los campos necesarios
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el perfil' });
  }
});

// Obtener todos los usuarios (solo admin)
router.get('/all', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('name email role dpt fechaIngreso reporta');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Eliminar usuario por ID (solo admin)
router.delete('/:id', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
