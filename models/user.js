// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'admin2', 'empleado', 'coordinador'], default: 'empleado' },
  fechaIngreso: { type: Date, required: true }, // NUEVO
  diasPendientesPrevios: { type: Number, default: 0 },
  dpt: { type: String, enum: ['apps', 'hr', 'servicio', 'finanzas'], required: true }, // NUEVO
  reporta: { type: String }
});

module.exports = mongoose.model('user', userSchema);