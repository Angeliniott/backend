// models/solicitudTiempoExtra.js
const mongoose = require('mongoose');

const solicitudTiempoExtraSchema = new mongoose.Schema({
  requesterEmail: { type: String, required: true }, // Admin who submitted
  employeeEmail: { type: String, required: true }, // Employee for whom it's requested
  cliente: { type: String, required: true }, // Cliente
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  motivo: {
    trabajoFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    estadiaFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    viajesFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    diasFestivosLaborados: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } }
  },
  reportePath: { type: String }, // Path to uploaded report file
  status: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  commentsAdmin: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudTiempoExtra', solicitudTiempoExtraSchema);
