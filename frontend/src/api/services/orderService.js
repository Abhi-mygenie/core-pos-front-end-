// Order Service - Running Orders API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/orderTransform';
import { selectAgentsForBill, selectAgentsForKot } from '../transforms/printerAgentSelector';

/**
 * Fetch running orders (includes all - tables and rooms)
 * @param {string} roleName - 'Manager' for all roles except 'Waiter'
 * @returns {Promise<Array>} - All orders with isRoom flag
 */
export const getRunningOrders = async (roleName = 'Manager', options = {}) => {
  // CR ORDER_POLLING_RECONCILIATION (May-2026): additive optional
  // `options.signal` so callers (e.g. useOrderPollingReconciliation) can
  // attach an AbortController for per-call timeout. Existing callers
  // (LoadingPage, useRefreshAllData) ignore this arg → no behaviour change.
  const response = await api.get(API_ENDPOINTS.RUNNING_ORDERS, {
    params: { role_name: roleName },
    signal: options.signal,
  });
  const orders = fromAPI.orderList(response.data.orders || []);

  return orders;
};

/**
 * Fetch single order for socket updates
 * Uses fromAPI.order transform (same as running orders) for consistency
 * This ensures socket-fetched orders have all fields needed by dashboard UI
 * @param {number} orderId
 * @returns {Object|null} Transformed order with tableStatus, orderType, etc.
 */
export const fetchSingleOrderForSocket = async (orderId) => {
  const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
    order_id: orderId,
  });
  
  const orders = response.data?.orders || [];
  if (orders.length === 0) {
    console.warn('[fetchSingleOrderForSocket] No orders in response');
    return null;
  }
  
  const rawOrder = orders[0];
  return fromAPI.order(rawOrder);
};

/**
 * Update order status (ready/served)
 * @param {number|string} orderId - Order ID
 * @param {string} roleName - User's role name
 * @param {string} status - "ready" | "served"
 * @returns {Promise<Object>} - API response
 */
export const updateOrderStatus = async (orderId, roleName, status) => {
  const payload = toAPI.updateOrderStatus(orderId, roleName, status);
  const response = await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
  return response.data;
};

/**
 * Confirm/Accept a "Yet to Confirm" order (waiter dine-in flow)
 * Uses separate endpoint from ready/served status updates
 * Socket handler will process order-engage + update-order-paid events
 * @param {number|string} orderId - Order ID
 * @param {string} roleName - User's role name
 * @returns {Promise<Object>} - API response
 */
export const confirmOrder = async (orderId, roleName, orderStatus = 'paid') => {
  const payload = toAPI.updateOrderStatus(orderId, roleName, orderStatus);
  const response = await api.put(API_ENDPOINTS.CONFIRM_ORDER, payload);
  return response.data;
};

/**
 * Complete a prepaid order (called when prepaid order is marked Served)
 * Uses paid-prepaid-order endpoint instead of order-status-update
 * @param {number|string} orderId - Order ID
 * @param {number} serviceTax - Service tax amount
 * @param {number} tipAmount - Tip amount
 * @returns {Promise<Object>} - API response
 */
export const completePrepaidOrder = async (orderId, serviceTax = 0, tipAmount = 0, isPayLater = false) => {
  const payload = {
    order_id: String(orderId),
    // BUG-087: PayLater requires 'sucess' (PAY-007 baseline typo); regular prepaid uses 'paid'
    payment_status: isPayLater ? 'sucess' : 'paid',
    service_tax: serviceTax,
    tip_amount: tipAmount,
  };
  const response = await api.post(API_ENDPOINTS.PREPAID_ORDER, payload);
  return response.data;
};

/**
 * Split order among multiple people
 * @param {number|string} orderId - Original order ID
 * @param {number} splitCount - Number of splits
 * @param {Array} splits - Array of arrays, each containing items for that split
 *   - With qty: [[{ id: 123, qty: 1 }], [{ id: 456, qty: 2 }]]
 *   - Whole item: [[123], [456]]
 * @returns {Promise<Object>} - API response with new order IDs
 */
export const splitOrder = async (orderId, splitCount, splits) => {
  const payload = {
    order_id: Number(orderId),
    split_count: splitCount,
    splits: splits,
  };
  console.log('[SplitOrder] payload:', JSON.stringify(payload, null, 2));
  const response = await api.post(API_ENDPOINTS.SPLIT_ORDER, payload);
  console.log('[SplitOrder] response:', response.data);
  return response.data;
};

/**
 * Print KOT or Bill for an order
 * @param {number|string} orderId - Order ID
 * @param {string} printType - "kot" | "bill"
 * @param {string} stationKot - Comma-separated station names (e.g., "KDS,BAR") - required for KOT
 * @param {Object} orderData - Order object (required for bill print with financial data)
 * @param {number} serviceChargePercentage - Restaurant service charge % (used when overrides are absent)
 * @param {Object} overrides - BUG-273/277: Live bill values from payment screen
 *   (discountAmount, couponCode, loyaltyAmount, walletAmount, serviceChargeAmount,
 *    deliveryCharge, paymentAmount, orderItemTotal, orderSubtotal, gstTax, vatTax, tip)
 * @param {Array} printerAgents - CR-POS2-003 (May-2026). Per-station printer agent
 *   list from `restaurant.printerAgents` (profileTransform). For 'bill' the BILL
 *   agent is selected; for 'kot' the cart's stationKot tokens drive the filter
 *   (BILL is excluded). Empty / missing → `printer_agent: []` (R-OWNER-6 warns
 *   only when configured agents existed but produced an empty match set).
 * @returns {Promise<Object>} - API response
 */
export const printOrder = async (orderId, printType, stationKot = null, orderData = null, serviceChargePercentage = 0, overrides = {}, printerAgents = []) => {
  let payload;

  if (printType === 'bill' && orderData) {
    // Full bill payload with financial data + billFoodList
    payload = toAPI.buildBillPrintPayload(orderData, serviceChargePercentage, overrides);
  } else {
    // HOTFIX-KOT (2026-05-26): enrich KOT payload with waiterName, tablename,
    // orderNote, and billFoodList (carries per-item food_level_notes) so the
    // backend print template can render them on the KOT slip. Previously only
    // order_id + print_type were sent and these fields were missing.
    // PROD-HOTFIX-008 (2026-05-29): add custName/custPhone to KOT payload.
    // Previously missing — backend accepts these fields (curl-verified).
    payload = {
      order_id: Number(orderId),
      print_type: printType,
      waiterName: orderData?.waiter || '',
      tablename: orderData?.orderType === 'takeAway' ? 'TA'
        : orderData?.orderType === 'delivery' ? 'Del'
        : orderData?.isWalkIn ? 'WC'
        : orderData?.tableNumber || '',
      custName: orderData?.customerName || '',
      custPhone: orderData?.phone || '',
      orderNote: orderData?.orderNote || '',
      billFoodList: orderData?.rawOrderDetails || [],
    };
    // KOT: send actual station value; Bill without order data: send empty string
    payload.station_kot = (printType === 'kot' && stationKot) ? stationKot : '';
  }

  // CR-POS2-003 (May-2026): inject `printer_agent` (additive top-level field).
  // R-OWNER-7 BILL → BILL agent only.
  // R-OWNER-8 KOT  → cart-station match; exclude BILL.
  // OQ-PA-9/13     → empty match → []. Never omit the key.
  // OQ-PA-11       → `station_kot` shape unchanged.
  let agents = [];
  if (printType === 'bill') {
    agents = selectAgentsForBill(printerAgents);
  } else if (printType === 'kot' && stationKot) {
    const stationSet = String(stationKot).split(',').map((s) => s.trim()).filter(Boolean);
    agents = selectAgentsForKot(printerAgents, stationSet);
  }
  payload.printer_agent = agents;

  // R-OWNER-6 / R-LOG-1: warn ONLY when agents were configured but none matched.
  if (Array.isArray(printerAgents) && printerAgents.length > 0 && agents.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[printer_agent] empty agent set on order-temp-store', { printType, stationKot });
  }

  console.log('[PrintOrder] payload:', payload, 'printer_agent.length:', agents.length);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);
  return response.data;
};
