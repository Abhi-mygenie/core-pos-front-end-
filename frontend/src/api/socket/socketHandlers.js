// Socket Event Handlers
// Business logic for handling each socket event
//
// BUG-203 (April 5, 2026): All order handlers now also update TableContext.
// Table status is derived from order data (tableId + tableStatus fields).
// The update-table socket channel is no longer subscribed to.

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
    orderId: Number(message[MSG_INDEX.ORDER_ID]),
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
// TABLE STATUS HELPER (BUG-203)
// Derives and updates table status from order data
// =============================================================================

/**
 * Update table status from order data
 * Skip walk-in/takeaway/delivery orders (tableId = 0)
 * @param {Object} order - Transformed order with tableId and tableStatus
 * @param {Function} updateTableStatus - From TableContext
 * @param {string} [overrideStatus] - Override table status (e.g., 'available' for paid/cancelled)
 */
const syncTableStatus = (order, updateTableStatus, overrideStatus = null) => {
  if (!updateTableStatus) return;
  if (!order?.tableId || order.tableId === 0) return; // skip walk-in/takeaway/delivery
  
  const status = overrideStatus || order.tableStatus;
  if (!status) return;
  
  updateTableStatus(order.tableId, status);
  log('INFO', `Table ${order.tableId} → "${status}" (derived from order ${order.orderId})`);
};

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle new-order event
 * Message: [new-order, order_id, restaurant_id, f_order_status, {orders: [...]}]
 * Action: Parse payload, transform, ADD to OrderContext
 *         Then fetch full order via GET API to fill missing financial fields
 */
export const handleNewOrder = (message, { addOrder, updateOrder, updateTableStatus, setTableEngaged }) => {
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
      syncTableStatus(transformedOrder, updateTableStatus);
      // Engage table immediately so waitForTableEngaged resolves in OrderEntry
      // (Backend does NOT send update-table engage for new orders, unlike update-order)
      if (setTableEngaged && transformedOrder.tableId) {
        setTableEngaged(transformedOrder.tableId, true);
        log('INFO', `new-order: Table ${transformedOrder.tableId} ENGAGED (locked)`);
      }
      log('INFO', `new-order: Added order ${transformedOrder.orderId} (socket data)`);

      // Enrich with GET single order (fills missing 16 fields: subtotal, tax, etc.)
      fetchOrderWithRetry(transformedOrder.orderId).then(fullOrder => {
        if (fullOrder) {
          updateOrder(fullOrder.orderId, fullOrder);
          log('INFO', `new-order: Enriched order ${fullOrder.orderId} (GET API data)`);
        }
        // Release engaged lock after React commits the enriched data
        if (setTableEngaged && transformedOrder.tableId) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTableEngaged(transformedOrder.tableId, false);
              log('INFO', `new-order: Table ${transformedOrder.tableId} released from ENGAGED`);
            });
          });
        }
      });
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
export const handleUpdateOrder = async (message, { updateOrder, updateTableStatus, getOrderById, setTableEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-order message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-order received: ${orderId}`);
  
  // Guard: skip if order was already removed (cancelled/paid)
  if (getOrderById && !getOrderById(orderId)) {
    log('INFO', `update-order: Order ${orderId} already removed, skipping`);
    return;
  }
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `update-order: Updated order ${order.orderId}`);
    // Release engaged after React commits and browser paints the state updates
    if (setTableEngaged && order.tableId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTableEngaged(order.tableId, false);
          log('INFO', `update-order: Table ${order.tableId} released from ENGAGED`);
        });
      });
    }
  } else {
    log('WARN', `update-order: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle update-food-status event
 * Message: [update-food-status, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, UPDATE in OrderContext
 */
export const handleUpdateFoodStatus = async (message, { updateOrder, updateTableStatus, getOrderById }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-food-status message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-food-status received: ${orderId}`);
  
  // Guard: skip if order was already removed (cancelled/paid)
  if (getOrderById && !getOrderById(orderId)) {
    log('INFO', `update-food-status: Order ${orderId} already removed, skipping`);
    return;
  }
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `update-food-status: Updated order ${order.orderId}`);
  } else {
    log('WARN', `update-food-status: Could not fetch order ${orderId}, skipping`);
  }
};

/**
 * Handle update-order-status event
 * Message: [update-order-status, order_id, restaurant_id, f_order_status]
 * 
 * Unified handler: ignore socket's fOrderStatus entirely.
 * Use orderId as trigger → fetch GET single order → decide from API response.
 * 
 * BUG-217: Backend sends status 6 (paid) for cancel item — should send update-order.
 * We don't branch on socket status at all.
 */
export const handleUpdateOrderStatus = async (message, { updateOrder, removeOrder, updateTableStatus, getOrderById, setTableEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-order-status message format', message);
    return;
  }
  
  const { orderId, status: fOrderStatus } = parsed;
  log('INFO', `update-order-status received: ${orderId}, socket status: ${fOrderStatus} (ignored — fetching API)`);
  
  // Fetch the actual order state from GET single order API
  const order = await fetchOrderWithRetry(orderId);
  
  if (order) {
    // Use order-level status from API response to decide
    if (order.status === 'cancelled' || order.status === 'paid') {
      log('INFO', `update-order-status: Order ${orderId} is ${order.status}, removing`);
      syncTableStatus(order, updateTableStatus);
      removeOrder(orderId);
    } else {
      // Order still active (cancel item case — remaining items exist)
      updateOrder(order.orderId, order);
      log('INFO', `update-order-status: Updated order ${orderId} (status: ${order.status})`);
    }
  } else {
    // Order not found in API — remove from context
    log('WARN', `update-order-status: Order ${orderId} not found in API, removing`);
    removeOrder(orderId);
  }

  // Release engaged lock after React commits
  const tableId = order?.tableId || (getOrderById ? getOrderById(orderId)?.tableId : null);
  if (setTableEngaged && tableId) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTableEngaged(tableId, false);
        log('INFO', `update-order-status: Table ${tableId} released from ENGAGED`);
      });
    });
  }
};

/**
 * Handle scan-new-order event (QR code order)
 * Message: [scan-new-order, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, ADD to OrderContext
 */
export const handleScanNewOrder = async (message, { addOrder, updateTableStatus }) => {
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
    syncTableStatus(order, updateTableStatus);
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
export const handleDeliveryAssignOrder = async (message, { updateOrder, updateTableStatus }) => {
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
    syncTableStatus(order, updateTableStatus);
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
export const handleUpdateTable = (message, { updateTableStatus, setTableEngaged }) => {
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
  
  if (socketStatus === 'engage' && setTableEngaged) {
    // Engage = lock table during transaction (not clickable)
    setTableEngaged(tableId, true);
    log('INFO', `update-table: Table ${tableId} ENGAGED (locked)`);
  } else if (socketStatus === 'free') {
    // BUG-216 workaround: Backend sends 'free' for cancel-item but should send 'engage'
    // Treat 'free' as 'engage' — lock the table until GET enrichment completes
    // Backend will fix to send 'engage'; once fixed, this becomes a normal engage
    if (setTableEngaged) setTableEngaged(tableId, true);
    log('INFO', `update-table: Table ${tableId} ENGAGED (free→engage workaround, BUG-216)`);
  } else {
    // Other statuses: map and update
    const frontendStatus = TABLE_STATUS_MAP[socketStatus] || socketStatus;
    updateTableStatus(tableId, frontendStatus);
    log('INFO', `update-table: Updated table ${tableId} to "${frontendStatus}"`);
  }
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
