// API Constants - Endpoints, Status Mappings, Field Aliases

// =============================================================================
// API ENDPOINTS
// =============================================================================
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/vendoremployee/login',
  
  // Profile
  PROFILE: '/api/v1/vendoremployee/profile',                                   // Owner override 2026-05-08: switched from v2 vendor-profile/profile → v1 profile (different path; new schema places `print_agent` at TOP LEVEL of response, not in restaurants[0])
  
  // Menu
  CATEGORIES: '/api/v1/vendoremployee/get-categories',
  PRODUCTS: '/api/v1/vendoremployee/get-products-list',
  
  // Table Operations (Phase 1C)
  TABLES: '/api/v1/vendoremployee/all-table-list',
  ORDER_TABLE_SWITCH: '/api/v2/vendoremployee/order/order-table-room-switch',
  MERGE_ORDER: '/api/v2/vendoremployee/order/transfer-order',
  TRANSFER_FOOD: '/api/v2/vendoremployee/order/transfer-food-item',

  // Cancel Operations (Phase 1C)
  CANCEL_ITEM: '/api/v2/vendoremployee/order/cancel-food-item',
  ORDER_STATUS_UPDATE: '/api/v2/vendoremployee/order/order-status-update',
  CONFIRM_ORDER:      '/api/v2/vendoremployee/order/waiter-dinein-order-status-update',
  FOOD_STATUS_UPDATE: '/api/v2/vendoremployee/order/food-status-update',

  // Delivery (BUG-097)
  DELIVERY_EMPLOYEE_LIST: '/api/v1/vendoremployee/delivery-employee-list',
  DELIVERY_ORDER_ASSIGN: '/api/v2/vendoremployee/order/delivery-order-assign',
  DELIVERY_ORDER_CANCEL: '/api/v2/vendoremployee/order/delivery-order-cancel',

  // Out of Menu Item (Phase 1C)
  ADD_CUSTOM_ITEM: '/api/v2/vendoremployee/product/add-single-product',

  // Sprint 3 — Order Taking
  CUSTOMER_SEARCH:   '/pos/customers',                                       // CRM: GET /pos/customers?search=
  CUSTOMER_LOOKUP:   '/pos/customer-lookup',                                  // CRM: POST /pos/customer-lookup
  CUSTOMER_DETAIL:   '/pos/customers',                                        // CRM: GET /pos/customers/{id}
  CUSTOMER_CREATE:   '/pos/customers',                                        // CRM: POST /pos/customers
  CUSTOMER_UPDATE:   '/pos/customers',                                        // CRM: PUT /pos/customers/{id}
  ADDRESS_LOOKUP:    '/pos/address-lookup',                                   // CRM: POST /pos/address-lookup
  CUSTOMER_ADDRESSES: '/pos/customers',                                       // CRM: /pos/customers/{id}/addresses
  // BUG-108 Phase C (CR-001C-LR, 2026-05-23) — loyalty redemption at billing.
  // Live in CRM preview; POS calls gated by `BUG108_FLAGS.loyaltyRedeemLive`.
  LOYALTY_REDEEM:    '/pos/loyalty/redeem',                                   // CRM: POST /pos/loyalty/redeem (POS Backend only — NOT called from POS Frontend)
  // BUG-108 Phase C corrected (2026-05-24): non-mutating CRM calculation endpoint.
  // POS calls this from Collect Bill to get CRM-calculated max redeemable discount.
  MAX_REDEEMABLE:    '/pos/max-redeemable',                                   // CRM: POST /pos/max-redeemable
  // BUG-108 V1A Coupon CRM (CR-001C-C, 2026-05-25). Read-only, non-mutating.
  // POS Frontend calls these directly via crmApi (X-API-Key). Gated by
  // restaurantSettings.isCoupon + BUG108_FLAGS.couponLive at the caller site.
  COUPONS_AVAILABLE: '/pos/coupons/available',                                // CRM: GET  /pos/coupons/available
  COUPONS_VALIDATE:  '/pos/coupons/validate',                                 // CRM: POST /pos/coupons/validate
  // CR-002 Cross-Sell + Customer Intelligence (CRM 2.0, 2026-05-26)
  CUSTOMER_ORDER_SUGGESTIONS: '/pos/customers/order-suggestions',             // CRM: POST /pos/customers/order-suggestions
  PLACE_ORDER:       '/api/v2/vendoremployee/order/place-order',          // CR-POS2-003-REOPEN-B (May-2026): reverted v1 → v2 per owner directive 2026-05-09. v2 confirmed deployed (HTTP 405 for GET, identical Laravel route shape as v1). Multipart shape unchanged. New order (unpaid + prepaid via payment_status=paid)
  PREPAID_ORDER:     '/api/v2/vendoremployee/order/paid-prepaid-order',    // Mark existing order as paid (JSON: {order_id, payment_status})
  UPDATE_ORDER:      '/api/v2/vendoremployee/order/update-place-order',   // Update existing order (add items)
  BILL_PAYMENT:      '/api/v2/vendoremployee/order/order-bill-payment',        // Collect bill on existing order
  // CR-017: WhatsApp Payment Link — generates Razorpay link + sends WhatsApp/SMS
  PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
  EDIT_ORDER_ITEM:       'TBD',   // CHG-040: Edit placed item qty/notes
  EDIT_ORDER_ITEM_QTY:   'TBD',   // CHG-040 future: Edit placed item qty only
  
  // Room Operations (Phase 2A + 2B)
  ROOM_CHECK_IN: '/api/v1/vendoremployee/pos/user-group-check-in',
  ORDER_SHIFTED_ROOM: '/api/v2/vendoremployee/order/order-shifted-room',
  // CR-004 Phase 2 — endpoint that returns the full set of currently-active
  // rooms (independent of order-creation date). Used to drive the cross-day
  // in-house view on /reports/rooms.
  GET_ROOM_LIST: '/api/v2/vendoremployee/get-room-list',
  
  // Split Bill
  SPLIT_ORDER: '/api/v2/vendoremployee/order/split-order',

  // Print Operations (KOT/Bill)
  PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store',

  // Settings
  CANCELLATION_REASONS: '/api/v1/vendoremployee/cancellation-reasons',

  // CR-019: Restaurant Settings (Self-Onboarding Wizard)
  RESTAURANT_SETTINGS_LIST: '/api/v2/vendoremployee/restaurant-settings/settings-list',
  RESTAURANT_SETTINGS_UPDATE: '/api/v2/vendoremployee/restaurant-settings/update-settings',
  
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

  // CR-003 — Paid & Hold Order Actions (financial mutations)
  CHANGE_ORDER_PAYMENT_METHOD: '/api/v2/vendoremployee/change-order-payment-method', // POST { order_id, payment_method }
  MAKE_ORDER_UNPAID:           '/api/v2/vendoremployee/make-order-unpaid',           // POST { order_id }

  // BUG-104 — Credit / Tab Management (Phase 1, frontend-only module)
  CREDIT_CUSTOMER_LIST:   '/api/v1/vendoremployee/pos/tap-waiter-list',           // POST {} → { "employee-tap-list": [...] }
  CREDIT_CUSTOMER_DETAIL: '/api/v2/vendoremployee/pos/tap-customer-record-list',  // GET ?customer_id={id}
  CREDIT_PAYMENT_INSERT:  '/api/v1/vendoremployee/pos/tap-waiter-order-insert',   // POST payment payload
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
  // 4: reserved for future development
  5: 'served',
  6: 'paid',
  7: 'pending',
  8: 'running',
  9: 'pendingPayment',
  10: 'reserved',
};

// f_order_status (API) → backend API payload value for confirm endpoint
//
// EXPERIMENTAL CHANGE (2026-05-12, owner-requested live test):
// Flipped `5: 'served'` → `5: 'serve'` to test BUG-037 hypothesis on
// restaurant 523 (owner@maur.com). Owner observed that the CONFIRM_ORDER
// endpoint rejects payload `order_status: 'served'` with
// `{"error":"Food order status not found"}`, and suspects backend expects
// the singular `'serve'` literal (matching what handleMarkServed already
// sends to ORDER_STATUS_UPDATE). Revert this one row to `'served'` if the
// test fails or if backend confirms the correct literal is different.
// Confirmed via grep: F_ORDER_STATUS_API is consumed only by
// profileTransform.js:206 → defaultOrderStatus → CONFIRM_ORDER payload.
// No other code path is affected by this row.
export const F_ORDER_STATUS_API = {
  1: 'cooking',
  2: 'ready',
  3: 'cancelled',
  5: 'serve',
  6: 'paid',
  7: 'pending',
  8: 'running',
  9: 'pendingPayment',
  10: 'reserved',
};

// Status columns for "By Status" dashboard view
// Order determines column display order
export const STATUS_COLUMNS = [
  { id: 7, fOrderStatus: 7, name: 'Yet to Confirm', key: 'pending' },
  { id: 1, fOrderStatus: 1, name: 'Preparing', key: 'preparing' },
  { id: 2, fOrderStatus: 2, name: 'Ready', key: 'ready' },
  // POS2-005: status 8 (Running/Active-Unpaid) is now Hold-classified;
  // surfaced only in the Audit Report Hold tab, not on the dashboard.
  // (Previously: { id: 8, fOrderStatus: 8, name: 'Running', key: 'running' }.)
  { id: 5, fOrderStatus: 5, name: 'Served', key: 'served' },
  { id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' },
  { id: 6, fOrderStatus: 6, name: 'Paid', key: 'paid' },
  { id: 3, fOrderStatus: 3, name: 'Cancelled', key: 'cancelled' },
  { id: 10, fOrderStatus: 10, name: 'Reserved', key: 'reserved' },
];

// Frontend status → table card status (for enriching table grid)
export const ORDER_TO_TABLE_STATUS = {
  pending: 'yetToConfirm',
  preparing: 'occupied',
  ready: 'occupied',
  running: 'occupied',
  served: 'billReady',
  paid: 'available',
  cancelled: 'available',
  pendingPayment: 'occupied',
  reserved: 'reserved',
};

// Order type values from API
export const ORDER_TYPES = {
  POS: 'pos',
  DINE_IN: 'dinein',
  WALK_IN: 'WalkIn',
  TAKE_AWAY: 'takeaway',
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
  // BUG-018 Part 1 (Apr-2026): backend sometimes emits lowercase for certain fields
  // (e.g., `complementary: "yes"` on the product/profile API). Add lowercase aliases
  // so toBoolean returns true. Safe: no existing truthy field was at risk of false-
  // negatives, and false-values ("no", "n") still resolve correctly.
  yes: true,
  no: false,
  y: true,
  n: false,
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
