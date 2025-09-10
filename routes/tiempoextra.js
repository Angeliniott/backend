const express = require('express');
const router = express.Router();
const User = require('../models/user');
const SolicitudTiempoExtra = require('../models/solicitudTiempoExtra');
const { authMiddleware, verifyAdmin } = require('../middleware/auth');
const { sendTiempoExtraNotification } = require('../utils/emailService');

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
    const employeeUser = await User.findOne({ email: employeeEmail });

    if (!admin || !employeeUser || admin.dpt !== employeeUser.dpt) {
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

    // Notify all admin2 users via email
    const admin2Users = await User.find({ role: 'admin2' }).select('email name');
    const requester = await User.findOne({ email: requesterEmail }).select('name');
    const employeeInfo = await User.findOne({ email: employeeEmail }).select('name');

    for (const admin2 of admin2Users) {
      await sendTiempoExtraNotification(
        admin2.email,
        admin2.name,
        requester.name,
        employeeInfo.name,
        date,
        hours
      );
    }

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

// GET: solicitudes pendientes para admin2
router.get('/admin2/pendientes', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });

    if (!user || user.role !== 'admin2') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const solicitudes = await SolicitudTiempoExtra.find({ status: 'pendiente' })
      .sort({ createdAt: -1 });

    // Populate requester and employee names
    const populatedSolicitudes = await Promise.all(
      solicitudes.map(async (solicitud) => {
        const requester = await User.findOne({ email: solicitud.requesterEmail }).select('name');
        const employee = await User.findOne({ email: solicitud.employeeEmail }).select('name');
        return {
          ...solicitud.toObject(),
          requesterName: requester ? requester.name : solicitud.requesterEmail,
          employeeName: employee ? employee.name : solicitud.employeeEmail
        };
      })
    );

    res.json(populatedSolicitudes);
  } catch (err) {
    console.error('❌ Error en GET /admin2/pendientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT: actualizar estado de solicitud por admin2
router.put('/admin2/:id', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const user = await User.findOne({ email: userEmail });

    if (!user || user.role !== 'admin2') {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    const { id } = req.params;
    const { status, commentsAdmin } = req.body;

    if (!['aprobado', 'rechazado'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const solicitud = await SolicitudTiempoExtra.findByIdAndUpdate(
      id,
      {
        status,
        commentsAdmin: commentsAdmin || '',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ message: 'Solicitud actualizada exitosamente', solicitud });
  } catch (err) {
    console.error('❌ Error en PUT /admin2/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
