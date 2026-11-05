// Business Day Utility
// A "business day" is defined by the restaurant's opening/closing schedule.
// Example: open 06:00, close 03:00 → March 30th = 2026-03-30 06:00 to 2026-03-31 03:00

/**
 * Get the business day time range for a selected date.
 * @param {string} selectedDate - "YYYY-MM-DD" format
 * @param {Array} schedules - Restaurant schedules from context
 *   Each: { day: 0-6, openingTime: "HH:MM:SS", closingTime: "HH:MM:SS" }
 * @returns {{ start: string, end: string, searchDates: string[] }}
 *   start/end: "YYYY-MM-DD HH:MM:SS" in restaurant local time
 *   searchDates: calendar dates to fetch from API (1 or 2 dates)
 */
export const getBusinessDayRange = (selectedDate, schedules) => {
  if (!selectedDate || !schedules || schedules.length === 0) {
    // Fallback: full calendar day
    return {
      start: `${selectedDate} 00:00:00`,
      end: `${selectedDate} 23:59:59`,
      searchDates: [selectedDate],
    };
  }

  // Get day of week (0=Sunday, 1=Monday, ... 6=Saturday)
  const dateObj = new Date(selectedDate + 'T12:00:00'); // noon to avoid timezone quirks
  const dayOfWeek = dateObj.getDay();

  // Find schedule for this day
  const schedule = schedules.find(s => s.day === dayOfWeek);
  if (!schedule) {
    return {
      start: `${selectedDate} 00:00:00`,
      end: `${selectedDate} 23:59:59`,
      searchDates: [selectedDate],
    };
  }

  const openingTime = schedule.openingTime || schedule.opening_time || '00:00:00';
  const closingTime = schedule.closingTime || schedule.closing_time || '23:59:59';

  // Build the candidate same-day range. We compare the assembled start/end
  // strings directly so any midnight-crossing pattern is detected — including
  // the openHour === closeHour, closeMin <= openMin "24-hour open" edge case
  // (e.g., open 00:02:00, close 00:01:00). Format "YYYY-MM-DD HH:MM:SS" makes
  // lexicographic comparison equivalent to chronological.
  const start = `${selectedDate} ${openingTime}`;
  let end = `${selectedDate} ${closingTime}`;
  let searchDates = [selectedDate];

  // If end is not strictly after start, the schedule crosses midnight.
  // Push the end forward to the next calendar day and add it to searchDates
  // so consumers fetching per-calendar-date pull both days.
  if (end <= start) {
    const nextDate = getNextDate(selectedDate);
    end = `${nextDate} ${closingTime}`;
    searchDates = [selectedDate, nextDate];
  }

  return { start, end, searchDates };
};

/**
 * Check if a created_at timestamp falls within a business day range.
 * @param {string} createdAt - "YYYY-MM-DD HH:MM:SS" format (from API)
 * @param {string} start - Business day start "YYYY-MM-DD HH:MM:SS"
 * @param {string} end - Business day end "YYYY-MM-DD HH:MM:SS"
 * @returns {boolean}
 */
export const isWithinBusinessDay = (createdAt, start, end) => {
  if (!createdAt || !start || !end) return false;
  // Simple string comparison works because format is "YYYY-MM-DD HH:MM:SS" (lexicographic = chronological)
  return createdAt >= start && createdAt <= end;
};

/**
 * Get the next calendar date as "YYYY-MM-DD"
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {string}
 */
const getNextDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a Date object as "YYYY-MM-DD" in local (device) time.
 * @param {Date} d
 * @returns {string}
 */
const formatLocalYMD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * CR-003 — Page-level guardrail for financial-mutation actions on the
 * Audit Report (Change Payment Method, Mark as Unpaid).
 *
 * The Audit Report already filters its visible rows to the selected
 * business day, so every row on screen is by definition inside the
 * selected day's business-day range. The "2-day mutation window"
 * therefore reduces to a single page-level check on the selected
 * report date itself: is it the device's today, or the device's
 * yesterday (calendar date)?
 *
 * Anchored on the device clock (NOT a server time), so an operator
 * who scrolls the date picker back to an older day sees disabled
 * mutation controls regardless of how late their cashiering shift runs.
 *
 * @param {string} selectedDate - "YYYY-MM-DD" from the report's date picker.
 *                                Must be the calendar date the user picked,
 *                                not a derived business-day start.
 * @param {Date} [now]          - Optional injected clock for unit tests.
 *                                Defaults to `new Date()`.
 * @returns {boolean}             true iff selectedDate equals device today
 *                                or device yesterday.
 */
export const isMutationAllowedForSelectedDate = (selectedDate, now) => {
  if (!selectedDate || typeof selectedDate !== 'string') return false;
  const reference = now instanceof Date ? now : new Date();
  const today = formatLocalYMD(reference);
  const yesterdayDate = new Date(reference);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = formatLocalYMD(yesterdayDate);
  return selectedDate === today || selectedDate === yesterday;
};
