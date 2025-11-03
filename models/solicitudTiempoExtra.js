// models/solicitudTiempoExtra.js
const mongoose = require('mongoose');

const solicitudTiempoExtraSchema = new mongoose.Schema({
  requesterEmail: { type: String, required: true }, // Admin who submitted
  employeeEmail: { type: String, required: true }, // Employee for whom it's requested
  cliente: { type: String, required: true }, // Cliente
  type: { type: String, enum: ['valor_agregado', 'tiempo_por_tiempo'], default: 'valor_agregado' },
  startDate: { type: Date },
  endDate: { type: Date },
  workedDates: [{ type: Date }], // For tiempo_por_tiempo type
  motivo: {
    trabajoFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    estadiaFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    viajesFinSemana: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } },
    diasFestivosLaborados: { selected: { type: Boolean, default: false }, cantidad: { type: Number, default: 0 } }
  },
  horasEntreSemana: { type: Number, default: 0 },
  horasFinSemana: { type: Number, default: 0 },
  diasFestivos: { type: Number, default: 0 },
  bonoEstanciaFinSemana: { type: Number, default: 0 },
  bonoViajeFinSemana: { type: Number, default: 0 },
  justification: { type: String },
  reportePath: { type: String }, // Path to uploaded report file
  status: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  commentsAdmin: { type: String },
  enterado: { type: Boolean, default: false },
  trabajado: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudTiempoExtra', solicitudTiempoExtraSchema);
