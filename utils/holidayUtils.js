/**
 * Utility functions to handle holidays for vacation calculations
 */

/**
 * Parse a list of holiday strings in DD/MM/YY format to Date objects
 * @param {string[]} holidayList - List of holidays as strings in DD/MM/YY format
 * @returns {Date[]} Array of Date objects representing holidays
 */
function parseHolidays(holidayList) {
  return holidayList.map(dateStr => {
    const [day, month, year] = dateStr.split('/').map(Number);
    // Assuming year is two digits, convert to full year
    const fullYear = year < 100 ? 2000 + year : year;
    return new Date(fullYear, month - 1, day);
  });
}

/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @param {Date[]} holidays - Array of holiday Date objects
 * @returns {boolean} True if date is a holiday, false otherwise
 */
function isHoliday(date, holidays) {
  return holidays.some(holiday =>
    holiday.getFullYear() === date.getFullYear() &&
    holiday.getMonth() === date.getMonth() &&
    holiday.getDate() === date.getDate()
  );
}

/**
 * Count how many holidays fall within a date range (inclusive)
 * @param {Date} startDate - Start date of range
 * @param {Date} endDate - End date of range
 * @param {Date[]} holidays - Array of holiday Date objects
 * @returns {number} Number of holidays in the range
 */
function countHolidaysInRange(startDate, endDate, holidays) {
  let count = 0;
  for (const holiday of holidays) {
    if (holiday >= startDate && holiday <= endDate) {
      count++;
    }
  }
  return count;
}

/**
 * Count weekdays (Monday to Friday) in a date range, excluding holidays
 * @param {Date} startDate - Start date of range
 * @param {Date} endDate - End date of range
 * @param {Date[]} holidays - Array of holiday Date objects
 * @returns {number} Number of weekdays excluding holidays in the range
 */
function countWeekdaysExcludingHolidays(startDate, endDate, holidays) {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Monday to Friday (1-5), and not a holiday
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday(current, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

module.exports = {
  parseHolidays,
  isHoliday,
  countHolidaysInRange,
  countWeekdaysExcludingHolidays
};
