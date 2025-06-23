// backend/models/Checkin.js
const mongoose = require('mongoose');

const CheckinSchema = new mongoose.Schema({
  email: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  latitude: Number,
  longitude: Number,
  distance: Number,
  status: String, // "en rango" o "fuera de rango"
});

module.exports = mongoose.model('Checkin', CheckinSchema);
