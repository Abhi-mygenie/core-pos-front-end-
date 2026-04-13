// Socket Event Constants
// All socket event names in one place to prevent typos and enable autocomplete

// =============================================================================
// SOCKET CONFIGURATION
// =============================================================================
export const SOCKET_CONFIG = {
  URL: (() => {
    const url = process.env.REACT_APP_SOCKET_URL;
    if (!url) throw new Error('[Config] REACT_APP_SOCKET_URL is not set. Check your .env file.');
    return url;
  })(),
  RECONNECTION: true,
  RECONNECTION_ATTEMPTS: 10,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 30000,
  TIMEOUT: 5000,
};

// =============================================================================
// CHANNEL NAME GENERATORS (Dynamic based on restaurantId)
// =============================================================================

/**
 * Generate channel name for order events
 * @param {number} restaurantId 
 * @returns {string} e.g., 'new_order_510'
 */
export const getOrderChannel = (restaurantId) => `new_order_${restaurantId}`;

/**
 * Generate channel name for table events
 * @param {number} restaurantId 
 * @returns {string} e.g., 'update_table_510'
 */
export const getTableChannel = (restaurantId) => `update_table_${restaurantId}`;

/**
 * Generate channel name for aggregator events
 * @param {number} restaurantId 
 * @returns {string} e.g., 'aggregator_order_510'
 */
export const getAggregatorChannel = (restaurantId) => `aggregator_order_${restaurantId}`;

/**
 * Generate channel name for order-engage events
 * @param {number} restaurantId 
 * @returns {string} e.g., 'order-engage_510'
 */
export const getOrderEngageChannel = (restaurantId) => `order-engage_${restaurantId}`;

// =============================================================================
// EVENT NAMES (sent within the channel message)
// =============================================================================
export const SOCKET_EVENTS = {
  // Order events - all come through new_order_${restaurantId} channel
  NEW_ORDER: 'new-order',
  UPDATE_ORDER: 'update-order',
  UPDATE_FOOD_STATUS: 'update-food-status',
  UPDATE_ORDER_STATUS: 'update-order-status',
  SCAN_NEW_ORDER: 'scan-new-order',
  DELIVERY_ASSIGN_ORDER: 'delivery-assign-order',

  // v2 order data events (April 2026) - come through new_order_${restaurantId} channel
  UPDATE_ORDER_TARGET: 'update-order-target',
  UPDATE_ORDER_SOURCE: 'update-order-source',
  UPDATE_ORDER_PAID: 'update-order-paid',

  // Table event - comes through update_table_${restaurantId} channel
  UPDATE_TABLE: 'update-table',
  
  // Order engage event - comes through order-engage_${restaurantId} channel
  ORDER_ENGAGE: 'order-engage',
};

// =============================================================================
// AGGREGATOR EVENTS (2) - Phase 3B
// =============================================================================
export const AGGREGATOR_EVENTS = {
  // Aggregator orders - come through aggregator_order_${restaurantId} channel
  AGGRIGATOR_ORDER: 'aggrigator-order',
  AGGRIGATOR_ORDER_UPDATE: 'aggrigator-order-update',
};

// =============================================================================
// CONNECTION EVENTS (Socket.IO built-in)
// =============================================================================
export const CONNECTION_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  RECONNECT_FAILED: 'reconnect_failed',
};

// =============================================================================
// EVENT CATEGORIES (for routing logic)
// =============================================================================

// Events that include full payload (no API call needed)
export const EVENTS_WITH_PAYLOAD = [
  SOCKET_EVENTS.NEW_ORDER,
  SOCKET_EVENTS.UPDATE_ORDER,
  SOCKET_EVENTS.UPDATE_ORDER_TARGET,
  SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
  SOCKET_EVENTS.UPDATE_ORDER_PAID,
];

// Events that require regular order API call
export const EVENTS_REQUIRING_ORDER_API = [
  SOCKET_EVENTS.UPDATE_FOOD_STATUS,
  SOCKET_EVENTS.UPDATE_ORDER_STATUS,
  SOCKET_EVENTS.SCAN_NEW_ORDER,
  SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
];

// Events that require aggregator API call
export const EVENTS_REQUIRING_AGGREGATOR_API = [
  AGGREGATOR_EVENTS.AGGRIGATOR_ORDER,
  AGGREGATOR_EVENTS.AGGRIGATOR_ORDER_UPDATE,
];

// Events for table updates (local only)
export const EVENTS_TABLE_UPDATE = [
  SOCKET_EVENTS.UPDATE_TABLE,
];

// =============================================================================
// TABLE STATUS MAPPING
// =============================================================================
export const TABLE_STATUS_MAP = {
  engage: 'occupied',
  free: 'available',
  // Future: reserved, disabled, etc.
};

// =============================================================================
// MESSAGE POSITION INDICES
// =============================================================================
export const MSG_INDEX = {
  EVENT_NAME: 0,
  ORDER_ID: 1,      // or TABLE_ID for update-table
  RESTAURANT_ID: 2,
  STATUS: 3,        // f_order_status, rider_id, or table status
  PAYLOAD: 4,       // only for new-order
};
