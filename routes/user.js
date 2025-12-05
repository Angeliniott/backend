const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user'); // Ajusta el path si tu modelo está en otra carpeta
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// Crear nuevo usuario/empleado (solo admin)
router.post('/', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { name, email, password, role, fechaIngreso, dpt, reporta, diasPendientesPrevios, puesto } = req.body;
    if (!name || !email || !password || !fechaIngreso || !dpt || !puesto) {
      return res.status(400).json({ error: 'Faltan datos requeridos: name, email, password, fechaIngreso, dpt, puesto' });
    }

    // Verifica si el usuario ya existe
    const existe = await User.findOne({ email });
    if (existe) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crea el usuario
    const nuevoUsuario = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'empleado',
      fechaIngreso: new Date(fechaIngreso),
      dpt,
      reporta: reporta || '',
      diasPendientesPrevios: diasPendientesPrevios || 0,
      puesto,
    });

    await nuevoUsuario.save();
    res.status(201).json({ message: 'Empleado creado correctamente', user: { name, email, role: nuevoUsuario.role, dpt: nuevoUsuario.dpt, puesto: nuevoUsuario.puesto } });
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
    const users = await User.find({}).select('name email role dpt fechaIngreso reporta diasPendientesPrevios');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Actualizar usuario por ID (solo admin)
router.put('/:id', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const { name, email, role, fechaIngreso, dpt, reporta, diasPendientesPrevios, puesto } = req.body;

    // Validaciones básicas
    if (!name || !email || !fechaIngreso || !dpt || !puesto) {
      return res.status(400).json({ error: 'Faltan datos requeridos: name, email, fechaIngreso, dpt, puesto' });
    }

    // Verificar si el email ya existe en otro usuario
    const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (existingUser) {
      return res.status(409).json({ error: 'El email ya está en uso por otro usuario' });
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        role: role || 'empleado',
        fechaIngreso: new Date(fechaIngreso),
        dpt,
        reporta: reporta || '',
        diasPendientesPrevios: diasPendientesPrevios || 0,
        puesto,
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario actualizado correctamente', user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el usuario' });
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
