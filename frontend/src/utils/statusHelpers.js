import { COLORS, ROOM_COLORS } from "../constants";

// Table status configurations
export const TABLE_STATUS_CONFIG = {
  yetToConfirm: {
    label: "YET TO CONFIRM",
    color: COLORS.errorText,
    borderColor: COLORS.errorText,
    buttonText: null
  },
  occupied: { 
    label: "OCCUPIED", 
    color: COLORS.amber,
    borderColor: COLORS.amber,
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
  running: { label: "RUNNING", color: COLORS.primaryOrange },
  unknown: { label: "PENDING", color: COLORS.grayText },
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
// Based on fOrderStatus: 7→5→2→1→10→8→9→available(last)
export const TABLE_STATUS_PRIORITY = {
  yetToConfirm: 0,  // fOrderStatus 7 — highest priority (needs confirmation)
  billReady: 1,     // fOrderStatus 5 — customer waiting to pay
  ready: 2,         // fOrderStatus 2 — food ready, needs serving
  occupied: 3,      // fOrderStatus 1 — preparing, in progress
  reserved: 4,      // fOrderStatus 10 — upcoming reservation
  running: 5,       // fOrderStatus 8 — active but not urgent
  pendingPayment: 6,// fOrderStatus 9 — awaiting payment
  available: 99,    // No order — always last for Dine-In
};

// fOrderStatus to priority mapping (for direct fOrderStatus-based sorting)
export const F_ORDER_STATUS_PRIORITY = {
  7: 0,   // YTC - highest
  5: 1,   // Served/Bill Ready
  2: 2,   // Ready
  1: 3,   // Preparing
  10: 4,  // Reserved
  8: 5,   // Running
  9: 6,   // Pending Payment
};

// Active states for tables (paid removed — status 6 now frees table) (CHG-009)
const TABLE_ACTIVE_STATES = ["yetToConfirm", "billReady", "ready", "occupied", "reserved", "running", "pendingPayment"];

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
 * Priority order based on fOrderStatus: 7→5→2→1→10→8→9→available(last)
 * @param {Array} items - Array of items to sort
 * @param {Object} priorityMap - Map of status → priority rank (lower = higher priority)
 * @returns {Array} Sorted array
 */
export const sortByActiveFirst = (items, priorityMap) => {
  const maxPriority = 99; // Available tables go last
  return [...items].sort((a, b) => {
    // Get priority from status or fOrderStatus
    const aPriority = priorityMap[a.status] ?? F_ORDER_STATUS_PRIORITY[a.fOrderStatus] ?? F_ORDER_STATUS_PRIORITY[a.order?.fOrderStatus] ?? maxPriority;
    const bPriority = priorityMap[b.status] ?? F_ORDER_STATUS_PRIORITY[b.fOrderStatus] ?? F_ORDER_STATUS_PRIORITY[b.order?.fOrderStatus] ?? maxPriority;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Secondary sort by table/order number
    const aStr = a.label || a.tableNumber || a.id || '';
    const bStr = b.label || b.tableNumber || b.id || '';
    const aNum = parseInt(String(aStr).replace(/\D/g, ''), 10) || 0;
    const bNum = parseInt(String(bStr).replace(/\D/g, ''), 10) || 0;
    return aNum - bNum;
  });
};

/**
 * Check if a table/room is active
 */
export const isTableActive = (status) => TABLE_ACTIVE_STATES.includes(status);
export const isRoomActive = (status) => ROOM_ACTIVE_STATES.includes(status);
