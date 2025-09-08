const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudTiempoExtra = require('../models/solicitudTiempoExtra');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');

// GET: empleados por departamento del admin
router.get('/empleados', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    const empleados = await User.find({ dpt: admin.dpt, role: 'empleado' }).select('name email');
    res.json(empleados);
  } catch (err) {
    console.error('❌ Error en GET /tiempoextra/empleados:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST: solicitar tiempo extra
router.post('/solicitar', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const requesterEmail = req.user.email;
    const { employeeEmail, date, hours, justification } = req.body;

    if (!employeeEmail || !date || !hours || !justification) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Verificar que el empleado esté en el mismo departamento
    const admin = await User.findOne({ email: requesterEmail });
    const employee = await User.findOne({ email: employeeEmail });

    if (!admin || !employee || admin.dpt !== employee.dpt) {
      return res.status(400).json({ error: 'Empleado no válido o no en el mismo departamento' });
    }

    const nuevaSolicitud = new SolicitudTiempoExtra({
      requesterEmail,
      employeeEmail,
      date: new Date(date),
      hours: parseInt(hours),
      justification
    });

    await nuevaSolicitud.save();
    res.status(201).json({ message: 'Solicitud enviada', solicitud: nuevaSolicitud });
  } catch (err) {
    console.error('❌ Error en POST /tiempoextra/solicitar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET: solicitudes para admin (para revisión futura)
router.get('/admin/solicitudes', authMiddleware, verifyAdmin, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: 'Admin no encontrado' });
    }

    const solicitudes = await SolicitudTiempoExtra.find({ requesterEmail: adminEmail }).sort({ createdAt: -1 });
    res.json(solicitudes);
  } catch (err) {
    console.error('❌ Error en GET /admin/solicitudes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
