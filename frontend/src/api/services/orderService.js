/**
 * ⭐ PHASE 3: Socket.IO Integration
 * Added: getSingleOrder(), getAggregatorOrderDetails()
 * Modified: 2026-04-01
 */

// Order Service - Running Orders API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { fromAPI } from '../transforms/orderTransform';
import { reportFromAPI } from '../transforms/reportTransform';

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
 * ⭐ PHASE 3: Socket.IO - Fetch a single order by ID
 * @param {number|string} orderId - Order ID
 * @returns {Promise<Object|null>} - Transformed order or null if not found
 */
export const getSingleOrder = async (orderId) => {
  try {
    const response = await api.post('/api/v2/vendoremployee/get-single-order-new', {
      order_id: orderId,
    });
    
    // API returns { status: true, data: { ...order } } or { status: true, orders: [...] }
    const orderData = response.data?.data || response.data?.orders?.[0];
    
    if (!orderData) {
      console.log(`[orderService] Order ${orderId} not found in response`);
      return null;
    }
    
    return fromAPI.order(orderData);
  } catch (error) {
    // If 404, return null (order doesn't exist)
    if (error.response?.status === 404) {
      console.log(`[orderService] Order ${orderId} not found (404)`);
      return null;
    }
    throw error;
  }
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
 * ⭐ PHASE 3: Socket.IO - Fetch aggregator order details by ID
 * Uses UrbanPiper API endpoint for Zomato/Swiggy orders
 * @param {number|string} orderId - Order ID
 * @returns {Promise<Object|null>} - Transformed order or null if not found
 */
export const getAggregatorOrderDetails = async (orderId) => {
  try {
    const response = await api.post(API_ENDPOINTS.AGGREGATOR_ORDER_DETAILS, {
      order_id: orderId,
    });
    
    // API returns { orders: { order_details_order: {...}, order_details_food: [...] } }
    const ordersData = response.data?.orders;
    
    if (!ordersData?.order_details_order) {
      console.log(`[orderService] Aggregator order ${orderId} not found in response`);
      return null;
    }
    
    // Use reportTransform which handles this nested structure
    return reportFromAPI.aggregatorOrder(ordersData);
  } catch (error) {
    // If 404, return null (order doesn't exist)
    if (error.response?.status === 404) {
      console.log(`[orderService] Aggregator order ${orderId} not found (404)`);
      return null;
    }
    throw error;
  }
};
