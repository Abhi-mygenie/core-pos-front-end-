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
export const printOrder = async (orderId, printType, stationKot = null) => {
  const payload = {
    order_id: Number(orderId),
    print_type: printType,
  };
  
  // KOT: send actual station value; Bill: send empty string
  payload.station_kot = (printType === 'kot' && stationKot) ? stationKot : '';
  
  console.log('[PrintOrder] payload:', payload);
  const response = await api.post(API_ENDPOINTS.PRINT_ORDER, payload);
  console.log('[PrintOrder] response:', response.data);
  return response.data;
};
