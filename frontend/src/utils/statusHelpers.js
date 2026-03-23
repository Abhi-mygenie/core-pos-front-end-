import { COLORS, ROOM_COLORS } from "../constants";

// Table status configurations
export const TABLE_STATUS_CONFIG = {
  yetToConfirm: {
    label: "YET TO CONFIRM",
    color: COLORS.amber,
    borderColor: COLORS.amber,
    buttonText: null
  },
  occupied: { 
    label: "OCCUPIED", 
    color: COLORS.primaryOrange,
    borderColor: COLORS.primaryOrange,
    buttonText: "Bill"
  },
  billReady: { 
    label: "BILL READY", 
    color: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
    buttonText: "Bill"
  },
  paid: { 
    label: "PAID", 
    color: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
    buttonText: "Clear"
  },
  reserved: { 
    label: "RESERVED", 
    color: COLORS.amber,
    borderColor: COLORS.amber,
    buttonText: "Seat"
  },
  available: { 
    label: "AVAILABLE", 
    color: COLORS.grayText,
    borderColor: COLORS.borderGray,
    buttonText: null
  },
};

// Order status configurations (for delivery/takeaway)
export const ORDER_STATUS_CONFIG = {
  yetToConfirm: { label: "YET TO CONFIRM", color: COLORS.amber },
  preparing: { label: "PREPARING", color: COLORS.primaryOrange },
  ready: { label: "READY", color: COLORS.primaryGreen },
  dispatched: { label: "DISPATCHED", color: "#3B82F6" },
  delivered: { label: "DELIVERED", color: COLORS.primaryGreen },
  pending: { label: "PENDING", color: COLORS.grayText },
};

// Rider status configurations
export const RIDER_STATUS_CONFIG = {
  lookingForRider: { label: "Looking for Rider", color: COLORS.amber },
  riderAssigned: { label: "Rider Assigned", color: COLORS.primaryOrange },
  riderReached: { label: "Rider Reached", color: COLORS.primaryGreen },
};

// Room status configurations
export const ROOM_STATUS_CONFIG = {
  available: { label: "Available", buttonText: "Book" },
  reserved: { label: "Reserved", buttonText: "Check In" },
  checkedIn: { label: "Checked In", buttonText: "Check Out" },
  checkedOut: { label: "Checked Out", buttonText: "Housekeeping" },
  housekeeping: { label: "Housekeeping", buttonText: "Mark Ready" },
  maintenance: { label: "Maintenance", buttonText: "Mark Ready" },
};

// Priority order for table statuses (lower = higher priority)
export const TABLE_STATUS_PRIORITY = {
  yetToConfirm: 0,
  paid: 1,
  billReady: 2,
  occupied: 3,
  reserved: 4,
  available: 5,
};

// Active states for tables
const TABLE_ACTIVE_STATES = ["yetToConfirm", "paid", "billReady", "occupied", "reserved"];

// Priority order for room statuses (lower = higher priority)
export const ROOM_STATUS_PRIORITY = {
  checkedIn: 0,
  reserved: 1,
  checkedOut: 2,
  housekeeping: 3,
  maintenance: 4,
  available: 5,
};

// Active states for rooms
const ROOM_ACTIVE_STATES = ["checkedIn", "reserved", "checkedOut", "housekeeping", "maintenance"];

/**
 * Get table status configuration
 */
export const getTableStatusConfig = (status) => {
  return TABLE_STATUS_CONFIG[status] || TABLE_STATUS_CONFIG.available;
};

/**
 * Get order status configuration
 */
export const getOrderStatusConfig = (status) => {
  return ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
};

/**
 * Get rider status configuration
 */
export const getRiderStatusConfig = (status) => {
  return RIDER_STATUS_CONFIG[status] || null;
};

/**
 * Get room status configuration
 */
export const getRoomStatusConfig = (status) => {
  return ROOM_STATUS_CONFIG[status] || ROOM_STATUS_CONFIG.available;
};

/**
 * Sort items by status priority, then by number
 * @param {Array} items - Array of items to sort
 * @param {Object} priorityMap - Map of status → priority rank (lower = higher priority)
 * @param {boolean} activeFirst - Whether to sort by priority
 * @returns {Array} Sorted array
 */
export const sortByActiveFirst = (items, priorityMap, activeFirst = true) => {
  const maxPriority = Object.keys(priorityMap).length;
  return [...items].sort((a, b) => {
    if (activeFirst) {
      const aPriority = priorityMap[a.status] ?? maxPriority;
      const bPriority = priorityMap[b.status] ?? maxPriority;
      if (aPriority !== bPriority) return aPriority - bPriority;
    }
    const aStr = a.label || a.id;
    const bStr = b.label || b.id;
    const aNum = parseInt(aStr.replace(/\D/g, ''), 10) || 0;
    const bNum = parseInt(bStr.replace(/\D/g, ''), 10) || 0;
    return aNum - bNum;
  });
};

/**
 * Check if a table/room is active
 */
export const isTableActive = (status) => TABLE_ACTIVE_STATES.includes(status);
export const isRoomActive = (status) => ROOM_ACTIVE_STATES.includes(status);
