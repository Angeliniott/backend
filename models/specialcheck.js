const mongoose = require('mongoose');

const SpecialCheckSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  type: { type: String, enum: ['checkin', 'checkout'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SpecialCheck', SpecialCheckSchema);