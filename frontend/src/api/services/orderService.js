// Order Service - Running Orders API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/orderTransform';

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
