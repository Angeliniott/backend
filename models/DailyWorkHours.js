const mongoose = require('mongoose');

const dailyWorkHoursSchema = new mongoose.Schema({
  email: { type: String, required: true },
  date: { type: Date, required: true },
  totalMinutes: { type: Number, default: 0 },
  sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkSession' }],
  isComplete: { type: Boolean, default: false }
}, { timestamps: true });

// Unique index to prevent duplicate daily records
dailyWorkHoursSchema.index({ email: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyWorkHours', dailyWorkHoursSchema);
