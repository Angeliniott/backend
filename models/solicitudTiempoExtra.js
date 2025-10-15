// models/solicitudTiempoExtra.js
const mongoose = require('mongoose');

const solicitudTiempoExtraSchema = new mongoose.Schema({
  requesterEmail: { type: String, required: true }, // Admin who submitted
  employeeEmail: { type: String, required: true }, // Employee for whom it's requested
  date: { type: Date, required: true },
  entreSemana: { type: Number, default: 0 },
  finSemana: { type: Number, default: 0 },
  festivo: { type: Number, default: 0 },
  bonoViaje: { type: Number, default: 0 },
  justification: { type: String, required: true },
  status: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  commentsAdmin: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudTiempoExtra', solicitudTiempoExtraSchema);
