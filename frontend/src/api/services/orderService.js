// Order Service - Running Orders API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI, toAPI } from '../transforms/orderTransform';

/**
 * Fetch running orders (includes all - tables and rooms)
 * @param {string} roleName - 'Manager' for all roles except 'Waiter'
 * @returns {Promise<Array>} - All orders with isRoom flag
 */
export const getRunningOrders = async (roleName = 'Manager') => {
  const response = await api.get(API_ENDPOINTS.RUNNING_ORDERS, {
    params: { role_name: roleName },
  });
  return fromAPI.orderList(response.data.orders || []);
};

/**
 * Determine the correct role_name param based on user's role
 * @param {string} userRole - The logged-in user's roleName
 * @returns {string} - 'Waiter' for waiters, 'Manager' for everyone else
 */
export const getOrderRoleParam = (userRole) => {
  if (userRole && userRole.toLowerCase() === 'waiter') {
    return 'Waiter';
  }
  return 'Manager';
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
export const completePrepaidOrder = async (orderId, serviceTax = 0, tipAmount = 0) => {
  const payload = {
    order_id: String(orderId),
    payment_status: 'paid',
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
 * @returns {Promise<Object>} - API response
 */
export const printOrder = async (orderId, printType, stationKot = null, orderData = null) => {
  let payload;

  if (printType === 'bill' && orderData) {
    // Full bill payload with financial data + billFoodList
    payload = toAPI.buildBillPrintPayload(orderData);
  } else {
    payload = {
      order_id: Number(orderId),
      print_type: printType,
    };
    // KOT: send actual station value; Bill without order data: send empty string
    payload.station_kot = (printType === 'kot' && stationKot) ? stationKot : '';
  }

  console.log('[PrintOrder] payload:', payload);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);
  return response.data;
};
