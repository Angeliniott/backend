const mongoose = require('mongoose');

const workSessionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  checkinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkin', required: true },
  checkoutId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkin' },
  checkinTime: { type: Date, required: true },
  checkoutTime: { type: Date },
  workDuration: { type: Number }, // in minutes
  date: { type: Date, required: true }, // normalized to start of day
  status: { type: String, enum: ['open', 'completed'], default: 'open' }
}, { timestamps: true });

// Index for efficient queries
workSessionSchema.index({ email: 1, date: 1 });
workSessionSchema.index({ email: 1, checkinTime: 1 });

module.exports = mongoose.model('WorkSession', workSessionSchema);
