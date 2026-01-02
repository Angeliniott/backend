// models/solicitudVacaciones.js
const mongoose = require('mongoose');

const solicitudVacacionesSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  email: { type: String, required: true },
  fechaIngreso: { type: Date, required: true },
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, required: true },
  diasSolicitados: { type: Number, required: true },
  // Desglose por periodo
  diasPeriodoPrevio: { type: Number, default: 0 }, // Días tomados del periodo anterior
  diasPeriodoActual: { type: Number, default: 0 }, // Días tomados del periodo actual
  vigenciaPrevio: { type: Date }, // Vigencia de los días del periodo anterior
  vigenciaActual: { type: Date }, // Vigencia de los días del periodo actual
  // Ajustes administrativos de días (opcional): 'descontar' para restar, 'agregar' para abonar
  ajusteTipo: { type: String, enum: ['descontar', 'agregar'], default: undefined },
  motivo: { type: String },
  supervisor: { type: String, enum: ['elizabeth', 'francisco', 'servicio', 'fsantiago@mazakcorp.com'], required: true },
  estado: { type: String, enum: ['pendiente', 'aprobado', 'rechazado', 'cancelado'], default: 'pendiente' },
  comentariosAdmin: { type: String },
  aprobadoPor: { type: String },
  fechaAprobacion: { type: Date },
  disponibles: { type: Number, default: 0 }, // Días disponibles al momento de la solicitud
  creadoEn: { type: Date, default: Date.now },
}, {
  timestamps: true
});

module.exports = mongoose.model('SolicitudVacaciones', solicitudVacacionesSchema);
