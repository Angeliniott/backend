// models/vacaciones.js
const mongoose = require('mongoose');

const vacacionesSchema = new mongoose.Schema({
  email: { type: String, required: true },
  fechaSolicitud: { type: Date, default: Date.now },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  diasSolicitados: { type: Number, required: true },
  estado: { type: String, enum: ['pendiente', 'aprobado', 'rechazado'], default: 'pendiente' },
  supervisorEmail: { type: String, required: true },
  comentario: { type: String }
});

module.exports = mongoose.model('Vacaciones', vacacionesSchema);
