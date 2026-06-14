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
import { fromAPI as productFromAPI } from '../transforms/productTransform';
import { fetchSingleOrderForSocket } from '../services/orderService';

// BUG-089 (POS3.0): Dedup map — tracks orderIds recently processed by
// handleOrderDataEvent (v2 payload events). When handleUpdateFoodStatus
// fires for the same orderId within the window, skip the redundant API call.
// Room-transfer events (where update-food-status fires without a v2
// counterpart) pass through because no v2 event recorded the orderId.
const _recentV2Updates = new Map();
const V2_DEDUP_WINDOW_MS = 5000;

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
      // POS2-005 / BUG-042-C: skip status-8 (running/Hold-classified) and
      // status-9 (PayLater/Hold) orders defensively. Both belong on the
      // Audit Hold tab only, not the running dashboard. Same rationale as
      // handleScanNewOrder.
      if (transformedOrder.fOrderStatus === 8 || transformedOrder.fOrderStatus === 9) {
        log('INFO', `new-order: skipping order ${transformedOrder.orderId} (f_order_status=${transformedOrder.fOrderStatus} → Hold)`);
        continue;
      }
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
  
  // BUG-089: Record this orderId so the legacy update-food-status handler
  // can skip its redundant API call if it fires within the dedup window.
  _recentV2Updates.set(orderId, Date.now());
  // Housekeep: prune entries older than the window to prevent unbounded growth
  if (_recentV2Updates.size > 200) {
    const cutoff = Date.now() - V2_DEDUP_WINDOW_MS;
    for (const [k, t] of _recentV2Updates) {
      if (t < cutoff) _recentV2Updates.delete(k);
    }
  }
  
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
  // BUG-PREPAID-SETTLE (Apr-2026): order.status is the truth — if the order
  // is in a terminal state (paid / cancelled), drop it from the dashboard
  // regardless of which update-order* variant carried the news. Backend
  // emits a generic `update-order` (with f_order_status=6) on the prepaid
  // Settle flow (`paid-prepaid-order` endpoint) because `update-order-paid`
  // is reserved for the unpaid → bill-collected flow. Status-based removal
  // also future-proofs against any new lifecycle terminator events backend
  // may add later. Mirrors the rule already used by handleUpdateOrderStatus
  // at line 393.
  // BUG-042-C (Feb-2026): also drop status-9 (PayLater/Hold) — surfaces in
  // Audit Hold tab only, never on running dashboard.
  // BUG-049 (May-2026): status-9 is overloaded by backend for two distinct
  // cashier actions:
  //   (a) Hold/Park    → diners still at table; table stays 'occupied'.
  //   (b) PayLater settle (bill collected as PayLater) → table is freed.
  // Backend disambiguates by socket channel: PayLater settle ALWAYS arrives
  // on `update-order-paid`; Hold/Park arrives on the other update-order*
  // variants. Branch on eventName so the table-status write matches the
  // cashier action. Preserves BUG-042-C's Hold contract 1:1.
  const isTerminal       = (order.status === 'cancelled' || order.status === 'paid');
  const isPayLaterSettle = (order.fOrderStatus === 9) && (eventName === 'update-order-paid');
  const isHoldClear      = (order.fOrderStatus === 9) && !isPayLaterSettle;
  // BUG-087: PayLater complete — prepaid + paylater + sucess on update-order-paid.
  // Guard: eventName === 'update-order-paid' ensures this never fires on new-order
  // or regular status updates during cooking/ready.
  // PROD-BUG-003 (2026-05-20): Accept both 'sucess' (known backend typo PAY-007)
  // AND 'success' (correct spelling) to guard against backend normalization.
  const isPayLaterComplete = (eventName === 'update-order-paid') &&
                             (order.paymentType === 'prepaid') &&
                             (order.paymentMethod?.toLowerCase() === 'paylater') &&
                             (order.paymentStatus === 'sucess' || order.paymentStatus === 'success');
  const shouldRemove     = isTerminal || isHoldClear || isPayLaterSettle || isPayLaterComplete;
  
  if (shouldRemove) {
    // Hold/Park keeps the table 'occupied' (ORDER_TO_TABLE_STATUS maps
    // pendingPayment → 'occupied'). Terminal (status 3/6) and PayLater settle
    // free the table.
    // PROD-BUG-003: When event arrives on 'update-order' (not 'update-order-paid'),
    // isHoldClear fires for fOS=9. Distinguish real Hold/Park from PayLater settle
    // by checking PayLater fields — if it's a settled PayLater, free the table.
    const isPayLaterViaHold = isHoldClear &&
      (order.paymentType === 'prepaid') &&
      (order.paymentMethod?.toLowerCase() === 'paylater') &&
      (order.paymentStatus === 'sucess' || order.paymentStatus === 'success');
    if (isHoldClear && !isPayLaterViaHold) {
      syncTableStatus(order, updateTableStatus);
    } else {
      syncTableStatus(order, updateTableStatus, 'available');
    }
    removeOrder(orderId);
    log('INFO', `${eventName}: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removed`);
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
export const handleUpdateFoodStatus = async (message, { updateOrder, removeOrder, updateTableStatus, getOrderById, setTableEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid update-food-status message format', message);
    return;
  }
  
  const { orderId } = parsed;
  log('INFO', `update-food-status received: ${orderId}`);
  
  // BUG-089: If this orderId was recently processed by a v2 payload event
  // (update-item-status, update-order, etc.), the data is already in context.
  // Skip the redundant get-single-order-new API call.
  const lastV2 = _recentV2Updates.get(orderId);
  if (lastV2 && (Date.now() - lastV2) < V2_DEDUP_WINDOW_MS) {
    log('INFO', `update-food-status: Order ${orderId} recently updated via v2 payload (${Date.now() - lastV2}ms ago), skipping redundant API call`);
    return;
  }
  
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
    // BUG-060 (Wave 7): After room transfer, backend emits update-food-status
    // with f_order_status=6 (paid). Without this check, updateOrder() re-adds
    // the order to context even after optimistic removeOrder(). Mirrors the
    // terminal-status logic in handleOrderDataEvent (L289) and
    // handleUpdateOrderStatus (L437).
    const isTerminal = (order.status === 'cancelled' || order.status === 'paid');
    if (isTerminal && removeOrder) {
      syncTableStatus(order, updateTableStatus, 'available');
      removeOrder(orderId);
      log('INFO', `update-food-status: Order ${orderId} is ${order.status}, removed (terminal)`);
    } else {
      updateOrder(order.orderId, order);
      syncTableStatus(order, updateTableStatus);
      log('INFO', `update-food-status: Updated order ${order.orderId}`);
    }
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
  // BUG-042-C (Feb-2026): also drop status-9 (PayLater/Hold). Table stays
  // 'occupied' for status-9 (no force-clear by table id) — see syncTableStatus
  // below.
  // BUG-049 (May-2026): PayLater bill-collect never flows through this handler
  // (it arrives via `update-order-paid` on handleOrderDataEvent). Therefore any
  // status-9 seen here is unambiguously a Hold/Park signal; the existing
  // 'occupied' write is correct and stays unchanged. The refinement for the
  // PayLater settle path lives in handleOrderDataEvent.
  const isTerminalStatus = (order.status === 'cancelled' || order.status === 'paid');
  const isHoldClear      = (order.fOrderStatus === 9);
  // BUG-087: Defensive — PayLater complete via update-order-status (unlikely but safe).
  // PROD-BUG-003 (2026-05-20): Accept both 'sucess' and 'success' (see handleOrderDataEvent).
  const isPayLaterComplete = (order.paymentType === 'prepaid') &&
                             (order.paymentMethod?.toLowerCase() === 'paylater') &&
                             (order.paymentStatus === 'sucess' || order.paymentStatus === 'success') &&
                             (order.fOrderStatus >= 5);
  if (isTerminalStatus || isHoldClear || isPayLaterComplete) {
    log('INFO', `update-order-status: Order ${orderId} is ${order.status} (fOrderStatus=${order.fOrderStatus}), removing`);
    // Status-3/6 free the table; status-9 keeps it 'occupied' (see ORDER_TO_TABLE_STATUS).
    // PayLater complete frees the table.
    if (isHoldClear && !isPayLaterComplete) {
      syncTableStatus(order, updateTableStatus);
    } else {
      syncTableStatus(order, updateTableStatus, 'available');
    }
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
 * Handle scan-new-order event (QR code / Web order)
 *
 * BUG-082 (Wave 6, May-2026): Backend confirmed message structure:
 *   ['scan-new-order', orderId, restaurantId, fOrderStatus, 'web']
 * Index 4 is a PRIMITIVE string indicating order origin — NOT a payload object.
 *
 * No API call. Full order data arrives via subsequent socket events
 * (update-order-status, update-order, etc.) when the order is confirmed/edited.
 * Until then, a minimal order entry is added to OrderContext so the
 * ScanOrderPopOut popup can fire (predicate: fOrderStatus === 7).
 *
 * Owner directive Q-082-4: channel-based fallback at former L508-511 RETIRED.
 * Runtime validated 2026-05-17 (restaurant 478, order 868557).
 */
export const handleScanNewOrder = (message, { addOrder }) => {
  if (!Array.isArray(message) || message.length < 4) {
    log('ERROR', 'Invalid scan-new-order message format', message);
    return;
  }

  const orderId = Number(message[MSG_INDEX.ORDER_ID]);
  const fOrderStatus = Number(message[MSG_INDEX.STATUS]);

  // Detect new format: index 4 = {orders:[...]} payload, index 5 = orderFrom string
  // Old format (BUG-082): index 4 = primitive string ('web')
  const rawPayload = message[MSG_INDEX.PAYLOAD];
  const hasFullPayload = rawPayload && typeof rawPayload === 'object' && Array.isArray(rawPayload.orders);
  const orderFrom = hasFullPayload
    ? (typeof message[5] === 'string' ? message[5] : (rawPayload.orders[0]?.order_from || 'web'))
    : (typeof rawPayload === 'string' ? rawPayload : null);

  log('INFO', `scan-new-order received: orderId=${orderId}, fOrderStatus=${fOrderStatus}, orderFrom=${orderFrom}, hasFullPayload=${hasFullPayload}`);

  // POS2-005 / BUG-042-C: status-8/9 (Hold) → Audit tab only, skip dashboard.
  if (fOrderStatus === 8 || fOrderStatus === 9) {
    log('INFO', `scan-new-order: skipping order ${orderId} (fOrderStatus=${fOrderStatus} → Hold)`);
    return;
  }

  // New format: parse full order through orderFromAPI.order() — same as handleNewOrder
  if (hasFullPayload) {
    try {
      const transformedOrder = orderFromAPI.order(rawPayload.orders[0]);
      transformedOrder.orderFrom = orderFrom || 'web';
      transformedOrder.isWebOrder = (orderFrom === 'web');
      addOrder(transformedOrder);
      log('INFO', `scan-new-order: Added FULL order ${orderId} (${transformedOrder.items?.length || 0} items, ₹${transformedOrder.amount || 0})`);
      return;
    } catch (err) {
      log('ERROR', `scan-new-order: Transform failed for ${orderId}, falling back to minimal`, err.message);
    }
  }

  // Fallback: minimal order entry (old format or transform failure)
  const minimalOrder = {
    orderId,
    fOrderStatus,
    orderFrom: orderFrom || 'web',
    isWebOrder: orderFrom === 'web',
    status: 'pending',
    items: [],
    amount: 0,
    tableId: 0,
  };

  addOrder(minimalOrder);
  log('INFO', `scan-new-order: Added minimal order ${orderId} (orderFrom=${orderFrom})`);
};

/**
 * Handle delivery-assign-order event (BUG-097 Gap 1 fix, 2026-05-20)
 * Message: [delivery-assign-order, order_id, restaurant_id, f_order_status, { orders: [...] }]
 *
 * Emitted by backend on BOTH rider assign and rider cancel/reject.
 * Socket carries full order payload — use it directly (same pattern as
 * handleOrderDataEvent). GET fallback only if payload is missing/empty.
 */
export const handleDeliveryAssignOrder = async (message, { updateOrder, updateTableStatus, setOrderEngaged }) => {
  const parsed = parseMessage(message);
  
  if (!parsed) {
    log('ERROR', 'Invalid delivery-assign-order message format', message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `delivery-assign-order received: ${orderId}`);
  
  // Primary path: use socket payload directly (verified 2026-05-20 live capture)
  if (payload && payload.orders && Array.isArray(payload.orders) && payload.orders.length > 0) {
    let order;
    try {
      order = orderFromAPI.order(payload.orders[0]);
      log('INFO', `delivery-assign-order: Transformed order ${orderId} from socket payload`);
    } catch (error) {
      log('ERROR', `delivery-assign-order: Transform failed`, error.message);
      return;
    }
    updateOrder(order.orderId, order);
    syncTableStatus(order, updateTableStatus);
    log('INFO', `delivery-assign-order: Updated order ${order.orderId} from payload`);
  } else {
    // Fallback: no payload — fetch from API (legacy safety net)
    log('WARN', `delivery-assign-order: No payload for ${orderId}, falling back to API`);
    const order = await fetchOrderWithRetry(orderId);
    if (order) {
      updateOrder(order.orderId, order);
      syncTableStatus(order, updateTableStatus);
      log('INFO', `delivery-assign-order: Updated order ${order.orderId} from API fallback`);
    } else {
      log('WARN', `delivery-assign-order: Could not fetch order ${orderId}, skipping`);
    }
  }

  // Release engage after React paints
  if (setOrderEngaged) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setOrderEngaged(orderId, false);
        log('INFO', `delivery-assign-order: Order ${orderId} released from ENGAGED`);
      });
    });
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
// SPLIT ORDER HANDLER
// =============================================================================

/**
 * Handle split-order event
 * Message: [split-order, orderId, restaurantId, fOrderStatus, { orders: [...] }]
 * 
 * Socket sends the ORIGINAL order (with reduced items after split).
 * The NEW split order is NOT in this socket — handled by API response on initiating device.
 * Other devices get the new order on next refreshOrders().
 * 
 * Action: updateOrder() for the original order + release engage
 */
export const handleSplitOrder = async (message, context) => {
  const { updateOrder, updateTableStatus, setOrderEngaged } = context;
  
  const parsed = parseMessage(message);
  if (!parsed) {
    log('ERROR', 'Invalid split-order message format', message);
    return;
  }
  
  const { orderId, payload } = parsed;
  log('INFO', `split-order received: ${orderId}`);
  
  if (!payload || !payload.orders || !Array.isArray(payload.orders) || payload.orders.length === 0) {
    log('ERROR', `split-order: No payload in event — backend issue. orderId=${orderId}`);
    return;
  }
  
  let order;
  try {
    order = orderFromAPI.order(payload.orders[0]);
    log('INFO', `split-order: Transformed original order ${orderId}`);
  } catch (error) {
    log('ERROR', `split-order: Transform failed`, error.message);
    return;
  }
  
  // Update the original order (reduced items)
  updateOrder(order.orderId, order);
  syncTableStatus(order, updateTableStatus);
  log('INFO', `split-order: Updated original order ${order.orderId} (items reduced)`);
  
  // Release engage after React paints
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (setOrderEngaged) {
        setOrderEngaged(orderId, false);
        log('INFO', `split-order: Order ${orderId} released from ENGAGED`);
      }
    });
  });
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
    [SOCKET_EVENTS.SPLIT_ORDER]: handleSplitOrder,
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
    // BUG-082: SCAN_NEW_ORDER removed — no longer async (no API call).
    SOCKET_EVENTS.DELIVERY_ASSIGN_ORDER,
    SOCKET_EVENTS.SPLIT_ORDER,
  ];
  
  return asyncEvents.includes(eventName);
};

// =============================================================================
// FOOD-UPDATE HANDLER (BUG-116, 2026-06-08)
// =============================================================================

/**
 * Defaults for keys the current backend socket payload omits (BUG-116 / BUG-124, formerly BUG-121).
 * Spread BEFORE food_details so any value the backend sends — present or future —
 * overrides our default. We never override backend values.
 *
 * Why each key:
 *   status      → drives isActive. Missing today → product invisible in OrderEntry.
 *   is_disable  → drives isDisabled. Missing today.
 *   stock_out   → drives isOutOfStock. Used by getActiveProducts.
 *   food_status → kitchen-routing default (0 = ready).
 *   live_web    → online-ordering visibility default.
 */
const SOCKET_FOOD_DEFAULTS = {
  status: 1,
  is_disable: 'N',
  stock_out: 'N',
  food_status: 0,
  live_web: 'Y',
};

/**
 * Handle food_update_${rid} channel event.
 *
 * Envelope (NOT MSG_INDEX): args[0] = {
 *   type: 'update-food' | <future>,
 *   food_id: number,
 *   restaurant_id: number,
 *   food_details: { ...partial product as per current backend... }
 * }
 *
 * Side effect: actions.addOrUpdateProduct (MenuContext) — payload-driven, no API fetch.
 */
export const handleFoodUpdate = (args, actions) => {
  const data = args?.[0];
  if (!data || typeof data !== 'object') {
    log('ERROR', 'food-update: invalid envelope', args);
    return;
  }
  const { type, food_id, food_details } = data;
  if (type === SOCKET_EVENTS.UPDATE_FOOD && food_details) {
    // Backfill missing keys via SOCKET_FOOD_DEFAULTS; backend values always win.
    const normalised = { ...SOCKET_FOOD_DEFAULTS, ...food_details };
    const product = productFromAPI.product(normalised);
    if (actions?.addOrUpdateProduct) {
      actions.addOrUpdateProduct(product);
      log('INFO', `food-update: product ${food_id} added/updated in MenuContext`);
    } else {
      log('WARN', 'food-update: actions.addOrUpdateProduct not wired');
    }
  } else {
    log('WARN', `food-update: unhandled type='${type}' food_id=${food_id}`);
  }
};
