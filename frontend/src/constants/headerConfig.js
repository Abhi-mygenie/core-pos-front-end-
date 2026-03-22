// Header configuration constants
import { Bike, ShoppingBag, Utensils, DoorOpen } from "lucide-react";

// Multi-selectable channel IDs (excludes Room)
export const MULTI_CHANNEL_IDS = ["delivery", "takeAway", "dineIn"];

// Order Type channels with icons and short labels
export const CHANNELS = [
  { id: "delivery", label: "Del", fullLabel: "Delivery", icon: Bike },
  { id: "takeAway", label: "Take", fullLabel: "TakeAway", icon: ShoppingBag },
  { id: "dineIn", label: "Dine", fullLabel: "Dine In", icon: Utensils },
  { id: "room", label: "Room", fullLabel: "Room", icon: DoorOpen },
];

// Order Status filters
export const ORDER_STATUSES = [
  { id: "confirm", label: "Confirm" },
  { id: "cooking", label: "Cooking" },
  { id: "ready", label: "Ready" },
  { id: "running", label: "Running" },
  { id: "schedule", label: "Schedule" },
];

// Room-specific statuses - split into main and secondary
export const ROOM_STATUSES_MAIN = [
  { id: "available", label: "Available" },
  { id: "checkedIn", label: "Checked In" },
  { id: "reserved", label: "Reserved" },
];

export const ROOM_STATUSES_MORE = [
  { id: "checkedOut", label: "Checked Out" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "maintenance", label: "Maintenance" },
];

// Dine-In Table View statuses
export const DINE_IN_TABLE_STATUSES = [
  { id: "schedule", label: "Schedule" },
  { id: "confirm", label: "Confirm" },
];

// Payment methods configuration
export const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "upi", label: "UPI" },
];
