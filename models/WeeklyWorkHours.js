const mongoose = require('mongoose');

const weeklyWorkHoursSchema = new mongoose.Schema({
  email: { type: String, required: true },
  weekStart: { type: Date, required: true }, // Monday of the week
  weekEnd: { type: Date, required: true }, // Sunday of the week
  totalMinutes: { type: Number, default: 0 },
  dailyHours: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DailyWorkHours' }],
  year: { type: Number, required: true },
  weekNumber: { type: Number, required: true }
}, { timestamps: true });

// Unique index for week-based queries
weeklyWorkHoursSchema.index({ email: 1, weekStart: 1 }, { unique: true });
weeklyWorkHoursSchema.index({ email: 1, year: 1, weekNumber: 1 });

module.exports = mongoose.model('WeeklyWorkHours', weeklyWorkHoursSchema);
