const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const getAppTimezone = () => {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
};

/**
 * Get current date as YYYY-MM-DD in configured timezone
 */
export const getCurrentBusinessDateString = () => {
  const tz = getAppTimezone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

/**
 * Get current month as YYYY-MM in configured timezone
 */
export const getCurrentBusinessMonthString = () => {
  const dateStr = getCurrentBusinessDateString();
  return dateStr.substring(0, 7); // "YYYY-MM"
};

/**
 * Validate YYYY-MM-DD date format
 */
export const isValidDateString = (dateStr) => {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = Date.parse(dateStr);
  return !isNaN(parsed);
};

/**
 * Validate YYYY-MM month format
 */
export const isValidMonthString = (monthStr) => {
  if (typeof monthStr !== 'string') return false;
  return /^\d{4}-\d{2}$/.test(monthStr);
};

/**
 * Validate HH:mm time format
 */
export const isValidTimeString = (timeStr) => {
  if (typeof timeStr !== 'string') return false;
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
};

/**
 * Checks if planDate belongs to monthKey
 */
export const isDateInMonth = (planDate, monthKey) => {
  if (!isValidDateString(planDate) || !isValidMonthString(monthKey)) return false;
  return planDate.startsWith(monthKey);
};

/**
 * Checks if target month is in the past compared to reference month
 */
export const isPastMonth = (targetMonth, referenceMonth) => {
  const [tYear, tMonth] = targetMonth.split('-').map(Number);
  const [rYear, rMonth] = referenceMonth.split('-').map(Number);
  if (tYear < rYear) return true;
  if (tYear === rYear && tMonth < rMonth) return true;
  return false;
};

/**
 * Checks if target month is within the future limit relative to reference month
 */
export const isMonthWithinFutureLimit = (targetMonth, referenceMonth, limitMonths = 2) => {
  const [tYear, tMonth] = targetMonth.split('-').map(Number);
  const [rYear, rMonth] = referenceMonth.split('-').map(Number);
  
  const diffMonths = (tYear - rYear) * 12 + (tMonth - rMonth);
  return diffMonths >= 0 && diffMonths <= limitMonths;
};
