// Socket Event Handlers
// Business logic for handling each socket event

import { 
  SOCKET_EVENTS, 
  TABLE_STATUS_MAP, 
  MSG_INDEX 
} from './socketEvents';
import { fromAPI as orderFromAPI } from '../transforms/orderTransform';
import { fetchSingleOrderForSocket } from '../services/orderService';

// =============================================================================
// LOGGING HELPER
// =============================================================================
const log = (level, message, data = null) => {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[SocketHandler][${timestamp}][${level}]`;
  
  if (level === 'ERROR') {
    console.error(prefix, message, data || '');
  } else if (level === 'WARN') {
    console.warn(prefix, message, data || '');
  } else {
    console.log(prefix, message, data || '');
  }
};

// =============================================================================
// MESSAGE PARSING HELPERS
// =============================================================================

/**
 * Parse socket message array
 * @param {Array} message - Socket message [event, id, restaurant_id, status, payload?]
 * @returns {Object} Parsed message parts
 */
const parseMessage = (message) => {
  if (!Array.isArray(message) || message.length < 4) {
    return null;
  }
  
  return {
    event: message[MSG_INDEX.EVENT_NAME],
    orderId: message[MSG_INDEX.ORDER_ID],
    restaurantId: message[MSG_INDEX.RESTAURANT_ID],
    status: message[MSG_INDEX.STATUS],
    payload: message[MSG_INDEX.PAYLOAD] || null,
  };
};

/**
 * Parse update-table message (different structure)
 * @param {Array} message - [event, table_id, restaurant_id, status]
 * @returns {Object} Parsed message parts
 */
const parseTableMessage = (message) => {
  if (!Array.isArray(message) || message.length < 4) {
    return null;
  }
  
  return {
    event: message[0],
    tableId: message[1],
    restaurantId: message[2],
    status: message[3],
  };
};

// =============================================================================
// API FETCH HELPER
// =============================================================================

/**
 * Fetch single order from API with retry
 * Uses fetchSingleOrderForSocket which applies orderFromAPI.order transform
 * This ensures all fields (tableStatus, orderType, etc.) are present
 * @param {number} orderId 
 * @param {number} retries - Number of retry attempts
 * @returns {Object|null} Transformed order or null
 */
const fetchOrderWithRetry = async (orderId, retries = 1) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      log('INFO', `Fetching order ${orderId} (attempt ${attempt + 1})`);
      const order = await fetchSingleOrderForSocket(orderId);
      
      if (order) {
        log('INFO', `Fetched order ${orderId} successfully`);
        return order;
      } else {
        log('WARN', `Order ${orderId} not found in API response`);
        return null;
      }
    } catch (error) {
      log('ERROR', `Failed to fetch order ${orderId}`, error.message);
      
      if (attempt < retries) {
        log('INFO', `Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return null;
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle new-order event
 * Message: [new-order, order_id, restaurant_id, f_order_status, {orders: [...]}]
 * Action: Parse payload, transform, ADD to OrderContext
 */
export const handleNewOrder = (message, { addOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid new-order message format', message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `new-order received: ${orderId}`);
  
  // Validate payload
  if (!payload || !payload.orders || !Array.isArray(payload.orders)) {
    log('ERROR', 'new-order: Invalid payload - missing orders array', payload);
    return;
  }
  
  // Transform and add each order (usually just one)
  const orders = payload.orders;
  for (const apiOrder of orders) {
    try {
      const transformedOrder = orderFromAPI.order(apiOrder);
      addOrder(transformedOrder);
      log('INFO', `new-order: Added order ${transformedOrder.orderId}`);
    } catch (error) {
      log('ERROR', `new-order: Transform failed for order`, error.message);
    }
  }
};

/**
 * Handle update-order event
 * Message: [update-order, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, UPDATE in OrderContext
 */
export const handleUpdateOrder = async (message, { updateOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-order message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-order received: ${orderId}`);
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    log('INFO', `update-order: Updated order ${order.orderId}`);
  } else {
    log('WARN', `update-order: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle update-food-status event
 * Message: [update-food-status, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, UPDATE in OrderContext
 */
export const handleUpdateFoodStatus = async (message, { updateOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-food-status message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-food-status received: ${orderId}`);
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    log('INFO', `update-food-status: Updated order ${order.orderId}`);
  } else {
    log('WARN', `update-food-status: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle update-order-status event
 * Message: [update-order-status, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, UPDATE in OrderContext
 * 
 * BUG-107 Fix: For cancelled status (3), fetch order first to check if
 * only some items are cancelled (single item cancel) vs all items cancelled.
 */
export const handleUpdateOrderStatus = async (message, { updateOrder, removeOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-order-status message format', message);
    return;
  }
  
  const { orderId, status: fOrderStatus } = parsed;
  log('INFO', `update-order-status received: ${orderId}, status: ${fOrderStatus}`);
  
  // Paid orders (status 6) - remove immediately without fetching
  if (fOrderStatus === 6) {
    log('INFO', `update-order-status: Order ${orderId} is paid, removing`);
    removeOrder(orderId);
    return;
  }
  
  // For all other statuses (including cancelled=3), fetch fresh order data
  // This handles single item cancellation - order still exists with remaining items
  const order = await fetchOrderWithRetry(orderId);
  
  if (order) {
    // Check if ALL items are cancelled (order is truly cancelled)
    const allItemsCancelled = !order.items?.length || 
      order.items.every(item => item.status === 'cancelled');
    
    if (allItemsCancelled) {
      log('INFO', `update-order-status: Order ${orderId} has all items cancelled, removing`);
      removeOrder(orderId);
    } else {
      updateOrder(order.orderId, order);
      log('INFO', `update-order-status: Updated order ${orderId}`);
    }
  } else {
    // Order not found in API - might be fully cancelled/deleted
    log('WARN', `update-order-status: Order ${orderId} not found, removing from context`);
    removeOrder(orderId);
  }
};

/**
 * Handle scan-new-order event (QR code order)
 * Message: [scan-new-order, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, ADD to OrderContext
 */
export const handleScanNewOrder = async (message, { addOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid scan-new-order message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `scan-new-order received: ${orderId}`);
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    addOrder(order);
    log('INFO', `scan-new-order: Added order ${orderId}`);
  } else {
    log('WARN', `scan-new-order: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle delivery-assign-order event
 * Message: [delivery-assign-order, order_id, restaurant_id, rider_id]
 * Action: Fetch order from API, UPDATE in OrderContext
 */
export const handleDeliveryAssignOrder = async (message, { updateOrder }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid delivery-assign-order message format', message);
    return;
  }
  
  const { orderId, status: riderId } = parsed;
  log('INFO', `delivery-assign-order received: ${orderId}, rider: ${riderId}`);
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    log('INFO', `delivery-assign-order: Updated order ${order.orderId}`);
  } else {
    log('WARN', `delivery-assign-order: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle update-table event
 * Message: [update-table, table_id, restaurant_id, status]
 * Action: Update TableContext locally (no API call)
 */
export const handleUpdateTable = (message, { updateTableStatus }) => {
  const parsed = parseTableMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-table message format', message);
    return;
  }
  
  const { tableId, status: socketStatus } = parsed;
  log('INFO', `update-table received: table ${tableId}, status: ${socketStatus}`);
  
  // Skip tableId = 0 (walk-in/takeaway/delivery)
  if (tableId === 0) {
    log('INFO', `update-table: Skipping tableId=0 (walk-in/takeaway/delivery)`);
    return;
  }
  
  // Map socket status to frontend status
  const frontendStatus = TABLE_STATUS_MAP[socketStatus] || socketStatus;
  
  if (!TABLE_STATUS_MAP[socketStatus]) {
    log('WARN', `update-table: Unknown status "${socketStatus}", using as-is`);
  }
  
  updateTableStatus(tableId, frontendStatus);
  log('INFO', `update-table: Updated table ${tableId} to "${frontendStatus}"`);
};

// =============================================================================
// HANDLER REGISTRY
// =============================================================================

/**
 * Get handler function for an event
 * @param {string} eventName 
 * @returns {Function|null}
 */
export const getHandler = (eventName) => {
  const handlers = {
    [SOCKET_EVENTS.NEW_ORDER]: handleNewOrder,
    [SOCKET_EVENTS.UPDATE_ORDER]: handleUpdateOrder,
    [SOCKET_EVENTS.UPDATE_FOOD_STATUS]: handleUpdateFoodStatus,
    [SOCKET_EVENTS.UPDATE_ORDER_STATUS]: handleUpdateOrderStatus,
    [SOCKET_EVENTS.SCAN_NEW_ORDER]: handleScanNewOrder,
    [SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER]: handleDeliveryAssignOrder,
    [SOCKET_EVENTS.UPDATE_TABLE]: handleUpdateTable,
  };
  
  return handlers[eventName] || null;
};

/**
 * Check if handler is async
 * @param {string} eventName 
 * @returns {boolean}
 */
export const isAsyncHandler = (eventName) => {
  const asyncEvents = [
    SOCKET_EVENTS.UPDATE_ORDER,
    SOCKET_EVENTS.UPDATE_FOOD_STATUS,
    SOCKET_EVENTS.UPDATE_ORDER_STATUS,
    SOCKET_EVENTS.SCAN_NEW_ORDER,
    SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
  ];
  
  return asyncEvents.includes(eventName);
};
