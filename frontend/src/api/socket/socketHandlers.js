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
    tableId: Number(message[1]),  // Ensure number type for consistent lookup
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
 * Message: [new-order, order_id, restaurant_id, f_order_status, {orders: [...]}, {table_info: {...}}]
 * 
 * NEW (April 2026): Socket now includes complete order data (51 keys) and table_info
 * - No GET API call needed for enrichment
 * - Table engage status comes from socket (not hardcoded)
 */
export const handleNewOrder = (message, { addOrder, updateTableStatus, setTableEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid new-order message format', message);
    return;
  }
  
  const { orderId, payload } = parsed;
  
  // Extract table_info from message[5] (new structure)
  const tableInfo = message[5]?.table_info || null;
  
  log('INFO', `new-order received: ${orderId}`);
  
  // Validate payload
  if (!payload || !payload.orders || !Array.isArray(payload.orders)) {
    log('ERROR', 'new-order: Invalid payload - missing orders array', payload);
    return;
  }
  
  // Step 1: Engage table from socket (if table_info present)
  if (tableInfo && setTableEngaged) {
    const tableId = Number(tableInfo.table_id);
    if (tableInfo.table_status === 'engage' && tableId) {
      setTableEngaged(tableId, true);
      log('INFO', `new-order: Table ${tableId} ENGAGED from socket`);
    }
  }
  
  // Step 2: Transform and add order (complete 51 keys from socket - no GET API needed)
  const orders = payload.orders;
  for (const apiOrder of orders) {
    try {
      const transformedOrder = orderFromAPI.order(apiOrder);
      addOrder(transformedOrder);
      syncTableStatus(transformedOrder, updateTableStatus);
      log('INFO', `new-order: Added order ${transformedOrder.orderId} (complete socket data)`);
      
      // Step 3: Release table after context update
      if (setTableEngaged && transformedOrder.tableId) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTableEngaged(transformedOrder.tableId, false);
            log('INFO', `new-order: Table ${transformedOrder.tableId} released from ENGAGED`);
          });
        });
      }
    } catch (error) {
      log('ERROR', `new-order: Transform failed for order`, error.message);
    }
  }
};

/**
 * Handle update-order event (LEGACY — kept for rollback reference)
 * Replaced by handleOrderDataEvent for all 4 data events
 */
export const handleUpdateOrder = async (message, context) => {
  // Routed to handleOrderDataEvent — this function is no longer called
  return handleOrderDataEvent(message, context, 'update-order');
};

/**
 * Unified handler for all v2 order data events
 * Events: update-order, update-order-target, update-order-source, update-order-paid
 * 
 * Message format: [eventName, orderId, restaurantId, f_order_status, { orders: [...] }]
 * 
 * Strategy per event:
 * - update-order:        updateOrder()
 * - update-order-target: updateOrder() + detect table change (switch table)
 * - update-order-source: if cancelled/paid → removeOrder(), else updateOrder()
 * - update-order-paid:   if cancelled/paid → removeOrder(), else updateOrder()
 */
export const handleOrderDataEvent = async (message, context, eventName) => {
  const { updateOrder, removeOrder, updateTableStatus, getOrderById, setOrderEngaged, setTableEngaged } = context;
  
  const parsed = parseMessage(message);
  if (!parsed) {
    log('ERROR', `Invalid ${eventName} message format`, message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `${eventName} received: ${orderId}`);
  
  // Transform payload — v2 only, no GET fallback
  if (!payload || !payload.orders || !Array.isArray(payload.orders) || payload.orders.length === 0) {
    log('ERROR', `${eventName}: No payload in v2 event — backend issue. orderId=${orderId}`);
    return;
  }
  
  let order;
  try {
    order = orderFromAPI.order(payload.orders[0]);
    log('INFO', `${eventName}: Transformed order ${orderId}`);
  } catch (error) {
    log('ERROR', `${eventName}: Transform failed`, error.message);
    return;
  }
  
  // Detect table change (Switch Table: update-order-target only)
  if (eventName === 'update-order-target') {
    const oldOrder = getOrderById ? getOrderById(orderId) : null;
    const oldTableId = oldOrder?.tableId || 0;
    const newTableId = order.tableId || 0;
    
    if (oldTableId !== newTableId && oldTableId !== 0) {
      updateTableStatus(oldTableId, 'available');
      if (setTableEngaged) setTableEngaged(oldTableId, false);
      log('INFO', `${eventName}: Table changed ${oldTableId} → ${newTableId}, old table freed`);
    }
  }
  
  // Decide: remove or update
  const isTerminal = (order.status === 'cancelled' || order.status === 'paid');
  const shouldRemove = isTerminal && (eventName === 'update-order-source' || eventName === 'update-order-paid');
  
  if (shouldRemove) {
    syncTableStatus(order, updateTableStatus, 'available');
    removeOrder(orderId);
    log('INFO', `${eventName}: Order ${orderId} is ${order.status}, removed`);
  } else {
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `${eventName}: Updated order ${order.orderId} (status: ${order.status})`);
  }
  
  // Release engage after React paints
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (setOrderEngaged) {
        setOrderEngaged(orderId, false);
        log('INFO', `${eventName}: Order ${orderId} released from ENGAGED`);
      }
      // Switch table: also release new table engage
      if (eventName === 'update-order-target' && order.tableId && order.tableId !== 0 && setTableEngaged) {
        setTableEngaged(order.tableId, false);
        log('INFO', `${eventName}: Table ${order.tableId} released from ENGAGED`);
      }
    });
  });
};

/**
 * Handle update-food-status event
 * Message: [update-food-status, order_id, restaurant_id, f_order_status]
 * Action: Fetch order from API, UPDATE in OrderContext
 * 
 * ============================================================================
 * WORKAROUND: Table socket not firing for update-food-status
 * ----------------------------------------------------------------------------
 * Backend does not emit update-table socket for item-level status changes
 * (Ready/Serve). As a temporary fix, we manually engage/lock the table when
 * this event is received, and release it after the context update completes.
 *
 * TODO: Remove this workaround when backend emits table socket for item
 * status changes. The engage/free logic below can be deleted once backend
 * sends update-table events for update-food-status.
 * ============================================================================
 */
export const handleUpdateFoodStatus = async (message, { updateOrder, updateTableStatus, getOrderById, setTableEngaged }) => {
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
  
  // WORKAROUND: Get tableId from existing order to engage table immediately
  const existingOrder = getOrderById ? getOrderById(orderId) : null;
  const tableId = existingOrder?.tableId;
  
  // WORKAROUND: Engage table before fetch (lock UI)
  if (setTableEngaged && tableId && tableId !== 0) {
    setTableEngaged(tableId, true);
    log('INFO', `update-food-status: Table ${tableId} ENGAGED (workaround - no table socket)`);
  }
  
  const order = await fetchOrderWithRetry(orderId);
  if (order) {
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `update-food-status: Updated order ${order.orderId}`);
  } else {
    log('WARN', `update-food-status: Could not fetch order ${orderId}, skipping`);
  }
  
  // WORKAROUND: Release table after context update
  const finalTableId = order?.tableId || tableId;
  if (setTableEngaged && finalTableId && finalTableId !== 0) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTableEngaged(finalTableId, false);
        log('INFO', `update-food-status: Table ${finalTableId} released from ENGAGED (workaround)`);
      });
    });
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
export const handleUpdateOrderStatus = async (message, { updateOrder, removeOrder, updateTableStatus, getOrderById, setTableEngaged, setOrderEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-order-status message format', message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `update-order-status received: ${orderId}`);
  
  // Use socket payload directly (v2 pattern — no GET API call)
  if (!payload || !payload.orders || !Array.isArray(payload.orders) || payload.orders.length === 0) {
    log('ERROR', `update-order-status: No payload in event — backend issue. orderId=${orderId}`);
    return;
  }
  
  let order;
  try {
    order = orderFromAPI.order(payload.orders[0]);
    log('INFO', `update-order-status: Transformed order ${orderId}`);
  } catch (error) {
    log('ERROR', `update-order-status: Transform failed`, error.message);
    return;
  }
  
  // Decide: remove or update
  if (order.status === 'cancelled' || order.status === 'paid') {
    log('INFO', `update-order-status: Order ${orderId} is ${order.status}, removing`);
    syncTableStatus(order, updateTableStatus, 'available');
    removeOrder(orderId);
  } else {
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `update-order-status: Updated order ${orderId} (status: ${order.status})`);
  }

  // Release order engage after React paints
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (setOrderEngaged) {
        setOrderEngaged(orderId, false);
        log('INFO', `update-order-status: Order ${orderId} released from ENGAGED`);
      }
    });
  });
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
    // v2: No flow sends update-table free. Ignore it.
    // Table status is derived from order data in order event handlers.
    log('INFO', `update-table: Table ${tableId} free received — ignoring (v2: table status from order data)`);
  } else {
    // Other statuses: map and update
    const frontendStatus = TABLE_STATUS_MAP[socketStatus] || socketStatus;
    updateTableStatus(tableId, frontendStatus);
    log('INFO', `update-table: Updated table ${tableId} to "${frontendStatus}"`);
  }
};

// =============================================================================
// ORDER-ENGAGE HANDLER (New channel)
// =============================================================================

/**
 * Handle order-engage event
 * Message format: [orderId, restaurantOrderId, restaurantId, status]
 * Example: [730762, '008639', 644, 'engage']
 * 
 * Action: 
 * - 'engage' → Lock order card (show spinner), not clickable
 * - 'free' → Unlock order card (if needed, but typically auto-released after update-order)
 */
export const handleOrderEngage = (message, context) => {
  const { setOrderEngaged } = context;
  
  // Parse message - format: [orderId, restaurantOrderId, restaurantId, status]
  const orderId = Number(message[0]);
  const restaurantOrderId = message[1];
  const restaurantId = message[2];
  const status = message[3];
  
  log('INFO', `order-engage received: orderId=${orderId}, restaurantOrderId=${restaurantOrderId}, status=${status}`);
  
  if (!setOrderEngaged) {
    log('ERROR', 'order-engage: setOrderEngaged not available in context');
    return;
  }
  
  if (status === 'engage') {
    // Lock order card - show spinner, not clickable
    setOrderEngaged(orderId, true);
    log('INFO', `order-engage: Order ${orderId} ENGAGED (locked)`);
  } else if (status === 'free') {
    // Unlock order card (if backend sends 'free' explicitly)
    setOrderEngaged(orderId, false);
    log('INFO', `order-engage: Order ${orderId} FREED (unlocked)`);
  } else {
    log('WARN', `order-engage: Unknown status "${status}" for order ${orderId}`);
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
    [SOCKET_EVENTS.UPDATE_ORDER_TARGET]: handleOrderDataEvent,
    [SOCKET_EVENTS.UPDATE_ORDER_SOURCE]: handleOrderDataEvent,
    [SOCKET_EVENTS.UPDATE_ORDER_PAID]: handleOrderDataEvent,
    [SOCKET_EVENTS.UPDATE_ITEM_STATUS]: handleOrderDataEvent,
    [SOCKET_EVENTS.UPDATE_FOOD_STATUS]: handleUpdateFoodStatus,
    [SOCKET_EVENTS.UPDATE_ORDER_STATUS]: handleUpdateOrderStatus,
    [SOCKET_EVENTS.SCAN_NEW_ORDER]: handleScanNewOrder,
    [SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER]: handleDeliveryAssignOrder,
    [SOCKET_EVENTS.UPDATE_TABLE]: handleUpdateTable,
    [SOCKET_EVENTS.ORDER_ENGAGE]: handleOrderEngage,
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
    SOCKET_EVENTS.UPDATE_ORDER_TARGET,
    SOCKET_EVENTS.UPDATE_ORDER_SOURCE,
    SOCKET_EVENTS.UPDATE_ORDER_PAID,
    SOCKET_EVENTS.UPDATE_ITEM_STATUS,
    SOCKET_EVENTS.UPDATE_FOOD_STATUS,
    SOCKET_EVENTS.UPDATE_ORDER_STATUS,
    SOCKET_EVENTS.SCAN_NEW_ORDER,
    SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
  ];
  
  return asyncEvents.includes(eventName);
};
