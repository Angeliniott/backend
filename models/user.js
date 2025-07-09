// models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'empleado'], default: 'empleado' },
  fechaIngreso: { type: Date, required: true }, // NUEVO
  diasPendientesPrevios: { type: Number, default: 0 }
});

module.exports = mongoose.model('user', userSchema);