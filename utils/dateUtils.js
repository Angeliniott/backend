/**
 * Utility functions for date calculations related to employee service duration
 */

/**
 * Calculate months since a given date
 * @param {Date|string} date - The date to calculate from
 * @returns {number} Number of months since the given date
 */
function calculateMonthsSince(date) {
  const now = new Date();
  const targetDate = new Date(date);
  
  // Calculate months difference
  const months = (now.getFullYear() - targetDate.getFullYear()) * 12 + 
                 (now.getMonth() - targetDate.getMonth());
  
  // If the day hasn't passed yet this month, subtract 1
  if (now.getDate() < targetDate.getDate()) {
    return Math.max(0, months - 1);
  }
  
  return Math.max(0, months);
}

/**
 * Check if an employee is eligible for vacation based on service duration
 * @param {Date|string} hireDate - Employee's hire date
 * @returns {boolean} True if eligible (6+ months), false otherwise
 */
function isEligibleForVacation(hireDate) {
  return calculateMonthsSince(hireDate) >= 6;
}

/**
 * Get remaining days until employee becomes eligible for vacation
 * @param {Date|string} hireDate - Employee's hire date
 * @returns {number} Days remaining until eligibility
 */
function getDaysUntilEligible(hireDate) {
  const hire = new Date(hireDate);
  const eligibleDate = new Date(hire);
  eligibleDate.setMonth(eligibleDate.getMonth() + 6);
  
  const now = new Date();
  const diffTime = eligibleDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Format remaining time until eligibility
 * @param {Date|string} hireDate - Employee's hire date
 * @returns {string} Formatted string showing remaining time
 */
function formatRemainingTime(hireDate) {
  const days = getDaysUntilEligible(hireDate);
  
  if (days === 0) return "Eres elegible para solicitar vacaciones";
  if (days === 1) return "Falta 1 día para ser elegible";
  if (days <= 30) return `Faltan ${days} días para ser elegible`;
  
  const months = Math.ceil(days / 30);
  return `Faltan aproximadamente ${months} meses para ser elegible`;
}

module.exports = {
  calculateMonthsSince,
  isEligibleForVacation,
  getDaysUntilEligible,
  formatRemainingTime
};
