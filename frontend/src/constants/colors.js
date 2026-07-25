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
export const LOGO_URL = "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/g6fet1ss_Screenshot%202026-03-19%20at%2012.18.41%E2%80%AFAM.png";
export const GENIE_LOGO_URL = "https://customer-assets.emergentagent.com/job_react-pos-phase1/artifacts/dwikbb41_logo111.svg";

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
