// models/solicitudTiempoExtra.js
const mongoose = require('mongoose');

const solicitudTiempoExtraSchema = new mongoose.Schema({
  requesterEmail: { type: String, required: true }, // Admin who submitted
  employeeEmail: { type: String, required: true }, // Employee for whom it's requested
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  horasEntreSemana: { type: Number, default: 0 },
  horasFinSemana: { type: Number, default: 0 },
  diasFestivos: { type: Number, default: 0 },
  bonoEstanciaFinSemana: { type: Number, default: 0 },
  bonoViajeFinSemana: { type: Number, default: 0 },
  justification: { type: String, required: true },
  reportePath: { type: String }, // Path to uploaded report file
  status: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  commentsAdmin: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudTiempoExtra', solicitudTiempoExtraSchema);
