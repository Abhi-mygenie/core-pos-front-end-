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

  // Parse hours to compare
  const openHour = parseInt(openingTime.split(':')[0], 10);
  const closeHour = parseInt(closingTime.split(':')[0], 10);

  const start = `${selectedDate} ${openingTime}`;

  // If closing time is less than opening time, it crosses midnight → next calendar day
  if (closeHour < openHour) {
    const nextDate = getNextDate(selectedDate);
    return {
      start,
      end: `${nextDate} ${closingTime}`,
      searchDates: [selectedDate, nextDate],
    };
  }

  // Same-day closing
  return {
    start,
    end: `${selectedDate} ${closingTime}`,
    searchDates: [selectedDate],
  };
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
