// Order Status Mapping (applies to both f_order_status and food_status)
export const ORDER_STATUS_MAP = {
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  5: 'served',
  6: 'paid',
  7: 'pending'  // Yet to be confirmed
};

// Reverse mapping for API calls
export const ORDER_STATUS_TO_CODE = {
  preparing: 1,
  ready: 2,
  cancelled: 3,
  served: 5,
  paid: 6,
  pending: 7
};

// UI display labels
export const ORDER_STATUS_LABELS = {
  preparing: 'Preparing',
  ready: 'Ready',
  cancelled: 'Cancelled',
  served: 'Served',
  paid: 'Paid',
  pending: 'Yet to Confirm'
};

// Map API status code to UI status key
export const getStatusFromCode = (code) => {
  return ORDER_STATUS_MAP[code] || 'pending';
};

// Map UI status key to API code
export const getCodeFromStatus = (status) => {
  return ORDER_STATUS_TO_CODE[status] || 7;
};

// Get display label for status
export const getStatusLabel = (statusOrCode) => {
  const status = typeof statusOrCode === 'number' 
    ? getStatusFromCode(statusOrCode) 
    : statusOrCode;
  return ORDER_STATUS_LABELS[status] || 'Unknown';
};
