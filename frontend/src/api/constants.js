// API Constants - Endpoints, Status Mappings, Field Aliases

// =============================================================================
// API ENDPOINTS
// =============================================================================
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/vendoremployee/login',
  
  // Profile
  PROFILE: '/api/v2/vendoremployee/vendor-profile/profile',
  
  // Menu
  CATEGORIES: '/api/v1/vendoremployee/get-categories',
  PRODUCTS: '/api/v1/vendoremployee/get-products-list',
  POPULAR_FOOD: '/api/v2/vendoremployee/buffet/buffet-popular-food',
  
  // Table Operations (Phase 1C)
  TABLES: '/api/v1/vendoremployee/all-table-list',
  ORDER_TABLE_SWITCH: '/api/v1/vendoremployee/pos/order-table-room-switch',
  MERGE_ORDER: '/api/v2/vendoremployee/transfer-order',
  TRANSFER_FOOD: '/api/v2/vendoremployee/transfer-food-item',

  // Cancel Operations (Phase 1C)
  CANCEL_ITEM_FULL: '/api/v2/vendoremployee/cancel-food-item',
  CANCEL_ITEM_PARTIAL: '/api/v2/vendoremployee/partial-cancel-food-item',
  ORDER_STATUS_UPDATE: '/api/v2/vendoremployee/order-status-update',
  FOOD_STATUS_UPDATE: '/api/v2/vendoremployee/food-status-update',

  // Out of Menu Item (Phase 1C)
  ADD_CUSTOM_ITEM: '/api/v1/vendoremployee/add-single-product',

  // Sprint 3 — Order Taking (endpoints TBD — to be filled when provided)
  CUSTOMER_SEARCH:   '/api/v2/vendoremployee/restaurant-customer-list',   // CHG-036
  PLACE_ORDER:                '/api/v2/vendoremployee/pos/place-order',            // CHG-037
  PLACE_ORDER_AND_PAYMENT:   '/api/v1/vendoremployee/pos/place-order-and-payment', // CHG-038 Scenario 2
  UPDATE_ORDER:              '/api/v2/vendoremployee/pos/update-place-order',       // CHG-040 Scenario 1
  CLEAR_BILL:                '/api/v2/vendoremployee/order-bill-payment',           // CHG-038 Scenario 1
  // COLLECT_PAYMENT removed — migrated to CLEAR_BILL (CHG-038)
  EDIT_ORDER_ITEM:       'TBD',   // CHG-040: Edit placed item qty/notes
  EDIT_ORDER_ITEM_QTY:   'TBD',   // CHG-040 future: Edit placed item qty only
  
  // Room Operations (Phase 2A + 2B)
  ROOM_CHECK_IN: '/api/v1/vendoremployee/pos/user-group-check-in',
  ORDER_SHIFTED_ROOM: '/api/v1/vendoremployee/order-shifted-room',

  // Settings
  CANCELLATION_REASONS: '/api/v1/vendoremployee/cancellation-reasons',
  
  // Orders (Phase 1 Part B)
  RUNNING_ORDERS: '/api/v1/vendoremployee/pos/employee-orders-list',

  // Phase 4A — Order Reports
  REPORT_PAID_ORDERS: '/api/v2/vendoremployee/paid-order-list',
  REPORT_CANCELLED_ORDERS: '/api/v2/vendoremployee/cancel-order-list',
  REPORT_CREDIT_ORDERS: '/api/v2/vendoremployee/paid-in-tab-order-list',
  REPORT_HOLD_ORDERS: '/api/v2/vendoremployee/paid-paylater-order-list',
  REPORT_AGGREGATOR_ORDERS: '/api/v1/vendoremployee/urbanpiper/get-complete-order-list',
  REPORT_ORDER_DETAILS: '/api/v2/vendoremployee/employee-order-details',
  SINGLE_ORDER_NEW: '/api/v2/vendoremployee/get-single-order-new',
  DAILY_SALES_REPORT: '/api/v2/vendoremployee/daily-sales-revenue-report',
  ORDER_LOGS_REPORT: '/api/v2/vendoremployee/report/order-logs-report',
};

// =============================================================================
// STATUS MAPPINGS
// =============================================================================

// Table type mapping
export const TABLE_TYPES = {
  TB: 'table',
  RM: 'room',
};

// Table engage status
export const TABLE_STATUS = {
  FREE: 'free',
  OCCUPIED: 'occupied',
  DISABLED: 'disabled',
};

// Cancellation reason types
export const CANCELLATION_TYPES = {
  ORDER: 'Order',
  ITEM: 'Food',  // API returns 'Food' for item-level reasons (fix: was 'Item')
  BOTH: null,    // null in API means both
};

// Food type mapping
export const FOOD_TYPES = {
  VEG: 1,
  NON_VEG: 0,
  EGG: 'egg',
};

// Tax calculation types
export const TAX_CALC_TYPES = {
  INCLUSIVE: 'Inclusive',
  EXCLUSIVE: 'Exclusive',
};

// Station types for KOT routing
export const STATION_TYPES = {
  KDS: 'KDS',
  BAR: 'BAR',
  OTHER: 'OTHER',
};

// =============================================================================
// ORDER STATUS MAPPINGS (Phase 1 Part B)
// =============================================================================

// f_order_status (API) → frontend status key
export const F_ORDER_STATUS = {
  1: 'preparing',
  2: 'ready',
  3: 'cancelled',
  // 4: TBD — user will provide later
  5: 'served',
  6: 'paid',
  7: 'pending',
  8: 'running',   // active/running order on dashboard
  // 9: TBD — needs team clarification
};

// Frontend status → table card status (for enriching table grid)
export const ORDER_TO_TABLE_STATUS = {
  pending: 'yetToConfirm',
  preparing: 'occupied',
  ready: 'occupied',
  running: 'occupied',
  served: 'billReady',
  paid: null,      // skip — table goes back to available (CHG-006)
  cancelled: null, // skip — table goes back to available
};

// Order type values from API
export const ORDER_TYPES = {
  POS: 'pos',
  DINE_IN: 'dinein',
  WALK_IN: 'WalkIn',
  TAKE_AWAY: 'take_away',
  DELIVERY: 'delivery',
};

// Order lifecycle (order_status field)
export const ORDER_LIFECYCLE = {
  QUEUE: 'queue',       // active/running
  DELIVERED: 'delivered', // completed/settled
};

// Payment status
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  PAY_LATER: 'PayLater',
};

// =============================================================================
// YES/NO TRANSFORMS
// =============================================================================
export const YES_NO_MAP = {
  Yes: true,
  No: false,
  Y: true,
  N: false,
};

// =============================================================================
// LOADING STATES
// =============================================================================
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// =============================================================================
// API LOADING ORDER (for loading screen)
// =============================================================================
export const API_LOADING_ORDER = [
  { key: 'profile', label: 'Profile & Permissions', endpoint: 'PROFILE' },
  { key: 'categories', label: 'Categories', endpoint: 'CATEGORIES' },
  { key: 'products', label: 'Products', endpoint: 'PRODUCTS' },
  { key: 'tables', label: 'Tables', endpoint: 'TABLES' },
  { key: 'cancellationReasons', label: 'Settings', endpoint: 'CANCELLATION_REASONS' },
  { key: 'popularFood', label: 'Popular Items', endpoint: 'POPULAR_FOOD' },
  { key: 'runningOrders', label: 'Running Orders', endpoint: 'RUNNING_ORDERS' },
];

// =============================================================================
// DEFAULT PAGINATION
// =============================================================================
export const PAGINATION = {
  DEFAULT_LIMIT: 100, // Load all for caching
  DEFAULT_OFFSET: 1,
  PRODUCTS_TYPE: 'all',
};

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REMEMBER_ME: 'remember_me',
  USER_EMAIL: 'user_email',
};
