// models/solicitudVacaciones.js
const mongoose = require('mongoose');

const solicitudVacacionesSchema = new mongoose.Schema({
  email: { type: String, required: true },
  fechaIngreso: { type: Date, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  diasSolicitados: { type: Number, required: true },
  motivo: { type: String },
  estado: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  comentariosAdmin: { type: String },
  creadoEn: { type: Date, default: Date.now },
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudVacaciones', solicitudVacacionesSchema);
