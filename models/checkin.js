// backend/models/Checkin.js
const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  email: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  distance: Number,
  status: String
}, { timestamps: true }); // 👈 Esto incluye createdAt y updatedAt

module.exports = mongoose.model('Checkin', checkinSchema);
