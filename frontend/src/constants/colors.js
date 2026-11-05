// Brand Colors - 3 main colors: Orange, Amber, Green
export const COLORS = {
  primaryOrange: "#F26B33",
  primaryGreen: "#329937",
  amber: "#F4A11A",
  darkText: "#1A1A1A",
  lightBg: "#FFFFFF",
  sectionBg: "#F7F7F7",
  grayText: "#666666",
  borderGray: "#E5E5E5",
  // Order Type Colors
  delivery: "#3B82F6",    // Blue
  takeAway: "#8B5CF6",    // Purple
  dineIn: "#F26B33",      // Orange (same as primary)
  // Error/Danger Colors
  errorBg: "#FEE2E2",     // Light red background
  errorText: "#EF4444",   // Red text
};

// Logo URLs
export const LOGO_URL = "/mygenie-logo.png"; // CR-491: local asset (was external CDN)
export const GENIE_LOGO_URL = "/mygenie-logo.svg"; // CR-491: local asset (was external CDN)

// Source colors for delivery/takeaway orders
export const SOURCE_COLORS = {
  swiggy: "#FC8019",   // Swiggy Orange
  zomato: "#E23744",   // Zomato Red
  own: COLORS.primaryGreen,
};

// Room Colors - Simplified to brand colors
export const ROOM_COLORS = {
  available: COLORS.borderGray,
  reserved: COLORS.amber,
  checkedIn: COLORS.primaryOrange,
  checkedOut: COLORS.primaryGreen,
  housekeeping: COLORS.borderGray,
  maintenance: COLORS.borderGray,
};

// Booking Source Icons
export const BOOKING_SOURCES = {
  "booking.com": { label: "B", color: "#003580" },
  "airbnb": { label: "A", color: "#FF5A5F" },
  "expedia": { label: "E", color: "#FFCC00" },
  "website": { label: "W", color: COLORS.primaryGreen },
  "direct": { label: "D", color: COLORS.primaryOrange },
};

// CR-433: status-based colour for card border, amount, and table/order label
export const getStatusColor = (fOs, fallback = COLORS.darkText) => {
  if (fOs === 1)              return '#F59E0B';           // Preparing → Yellow
  if (fOs === 2)              return COLORS.primaryOrange; // Ready     → Orange
  if (fOs === 5 || fOs === 6) return COLORS.primaryGreen;  // Served/Billed → Green
  return fallback; // Hold(8), YTC(7), PayLater(9), Agg(0) → caller's fallback
};
