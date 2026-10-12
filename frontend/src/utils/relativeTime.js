/**
 * Convert ISO timestamp to human-readable relative time.
 * CR-002 Cross-Sell + Customer Intelligence (CRM 2.0, 2026-05-26)
 *
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} e.g. "just now", "3 hours ago", "2 weeks ago"
 */
export const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return '';
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const hours = diffMs / 3_600_000;
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.floor(hours)} hours ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)} days ago`;
  const weeks = days / 7;
  if (weeks < 4.3) return `${Math.floor(weeks)} weeks ago`;
  const months = days / 30;
  if (months < 12) return `${Math.floor(months)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};
