// Report Service - Order Reports API calls
// Phase 4A: Order Reports

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { 
  reportListFromAPI, 
  reportFromAPI,
  filterPaidOrders,
  filterRoomTransferOrders,
  filterCancelledOrders,
  filterMergedOrders,
} from '../transforms/reportTransform';

/**
 * Format date for API query param
 * @param {Date|string} date 
 * @returns {string} YYYY-MM-DD format
 */
const formatDateParam = (date) => {
  if (!date) {
    // Default to today
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
};

// =============================================================================
// PAID ORDERS (Tab: Paid + Room Transfer)
// =============================================================================

/**
 * Fetch paid orders for a given date
 * Source: paid-order-list endpoint (32 fields)
 * @param {string|Date} date - Date to fetch orders for
 * @returns {Promise<Array>} - Normalized order list
 */
export const getPaidOrders = async (date) => {
  const response = await api.get(API_ENDPOINTS.REPORT_PAID_ORDERS, {
    params: { search_date: formatDateParam(date) },
  });
  const orders = response.data?.orders || response.data || [];
  return reportListFromAPI.paidOrders(orders);
};

/**
 * Fetch paid orders filtered for Paid tab (excludes Room Transfers)
 */
export const getPaidOrdersFiltered = async (date) => {
  const allPaid = await getPaidOrders(date);
  return filterPaidOrders(allPaid);
};

/**
 * Fetch paid orders filtered for Room Transfer tab
 */
export const getRoomTransferOrders = async (date) => {
  const allPaid = await getPaidOrders(date);
  return filterRoomTransferOrders(allPaid);
};

// =============================================================================
// CANCELLED ORDERS (Tab: Cancelled + Merged)
// =============================================================================

/**
 * Fetch cancelled orders for a given date
 * Source: cancel-order-list endpoint (100+ fields - richest)
 * @param {string|Date} date 
 * @returns {Promise<Array>}
 */
export const getCancelledOrdersRaw = async (date) => {
  const response = await api.get(API_ENDPOINTS.REPORT_CANCELLED_ORDERS, {
    params: { search_date: formatDateParam(date) },
  });
  const orders = response.data?.orders || response.data || [];
  return reportListFromAPI.cancelledOrders(orders);
};

/**
 * Fetch cancelled orders filtered for Cancelled tab (excludes Merged)
 */
export const getCancelledOrders = async (date) => {
  const allCancelled = await getCancelledOrdersRaw(date);
  return filterCancelledOrders(allCancelled);
};

/**
 * Fetch cancelled orders filtered for Merged tab
 */
export const getMergedOrders = async (date) => {
  const allCancelled = await getCancelledOrdersRaw(date);
  return filterMergedOrders(allCancelled);
};

// =============================================================================
// CREDIT ORDERS (Tab: Credit)
// =============================================================================

/**
 * Fetch credit/TAB orders for a given date
 * Source: paid-in-tab-order-list endpoint (23 fields - leanest)
 * @param {string|Date} date 
 * @returns {Promise<Array>}
 */
export const getCreditOrders = async (date) => {
  const response = await api.get(API_ENDPOINTS.REPORT_CREDIT_ORDERS, {
    params: { search_date: formatDateParam(date) },
  });
  const orders = response.data?.orders || response.data || [];
  return reportListFromAPI.creditOrders(orders);
};

// =============================================================================
// HOLD ORDERS (Tab: On Hold)
// =============================================================================

/**
 * Fetch hold/paylater orders for a given date
 * Source: paid-paylater-order-list endpoint (31 fields)
 * NOTE: ISSUE-001 - This endpoint returns same data as paid-order-list (backend bug)
 * @param {string|Date} date 
 * @returns {Promise<Array>}
 */
export const getHoldOrders = async (date) => {
  const response = await api.get(API_ENDPOINTS.REPORT_HOLD_ORDERS, {
    params: { search_date: formatDateParam(date) },
  });
  const orders = response.data?.orders || response.data || [];
  return reportListFromAPI.holdOrders(orders);
};

// =============================================================================
// AGGREGATOR ORDERS (Tab: Aggregator - Zomato/Swiggy)
// =============================================================================

/**
 * Fetch aggregator orders (UrbanPiper) for a given date
 * Source: urbanpiper/get-complete-order-list endpoint (nested structure)
 * NOTE: This is a POST endpoint, not GET
 * @param {string|Date} date 
 * @returns {Promise<Array>}
 */
export const getAggregatorOrders = async (date) => {
  const response = await api.post(API_ENDPOINTS.REPORT_AGGREGATOR_ORDERS, {
    search_date: formatDateParam(date),
  });
  const orders = response.data?.orders || response.data || [];
  return reportListFromAPI.aggregatorOrders(orders);
};

// =============================================================================
// ORDER DETAILS (Side Sheet Drill-down)
// =============================================================================

/**
 * Fetch full order details for side sheet drill-down
 * Source: employee-order-details endpoint (108+ fields)
 * NOTE: Response structure is { orders: { order_details_order: {...}, order_details_food: [...] } }
 * @param {number} orderId - The order ID to fetch
 * @returns {Promise<Object>}
 */
export const getOrderDetails = async (orderId) => {
  const response = await api.get(API_ENDPOINTS.REPORT_ORDER_DETAILS, {
    params: { order_id: orderId },
  });
  // Pass the full response to transform which handles nested structure
  return reportFromAPI.orderDetails(response.data);
};

// =============================================================================
// TAB DATA FETCHER - Convenience function for all tabs
// =============================================================================

/**
 * Fetch orders for a specific tab
 * @param {string} tab - Tab name: 'all', 'paid', 'cancelled', 'credit', 'hold', 'merged', 'roomTransfer', 'aggregator'
 * @param {string|Date} date - Date to fetch
 * @returns {Promise<Array>}
 */
export const getOrdersByTab = async (tab, date) => {
  switch (tab) {
    case 'all':
      return getAllOrders(date);
    case 'paid':
      return getPaidOrdersFiltered(date);
    case 'cancelled':
      return getCancelledOrders(date);
    case 'credit':
      return getCreditOrders(date);
    case 'hold':
      return getHoldOrders(date);
    case 'merged':
      return getMergedOrders(date);
    case 'roomTransfer':
      return getRoomTransferOrders(date);
    case 'aggregator':
      return getAggregatorOrders(date);
    default:
      console.warn(`Unknown tab: ${tab}`);
      return [];
  }
};

// =============================================================================
// ALL ORDERS (Tab: All Orders - Combined view for sequence verification)
// =============================================================================

/**
 * Fetch all orders from all sources for sequence verification
 * Combines: Paid, Cancelled, Credit, Hold (excludes Aggregator - different ID format)
 * Deduplicates by order.id and adds status field
 * @param {string|Date} date 
 * @returns {Promise<Array>}
 */
export const getAllOrders = async (date) => {
  try {
    // Fetch from all sources in parallel
    const [paidAll, cancelledAll, credit, hold] = await Promise.all([
      getPaidOrders(date).catch(() => []),
      getCancelledOrdersRaw(date).catch(() => []),
      getCreditOrders(date).catch(() => []),
      getHoldOrders(date).catch(() => []),
    ]);

    // Add status to each order
    const paidFiltered = filterPaidOrders(paidAll).map(o => ({ ...o, _status: 'paid' }));
    const roomTransfer = filterRoomTransferOrders(paidAll).map(o => ({ ...o, _status: 'roomTransfer' }));
    const cancelledFiltered = filterCancelledOrders(cancelledAll).map(o => ({ ...o, _status: 'cancelled' }));
    const merged = filterMergedOrders(cancelledAll).map(o => ({ ...o, _status: 'merged' }));
    const creditOrders = credit.map(o => ({ ...o, _status: 'credit' }));
    // Note: Hold returns same as Paid (backend bug), but we still include it for completeness
    const holdOrders = hold.map(o => ({ ...o, _status: 'hold' }));

    // Combine all orders
    const allOrders = [
      ...paidFiltered,
      ...roomTransfer,
      ...cancelledFiltered,
      ...merged,
      ...creditOrders,
      // Skip holdOrders to avoid duplicates since it returns same as paid (ISSUE-001)
    ];

    // Deduplicate by order.id (keep first occurrence)
    const seen = new Set();
    const deduplicated = allOrders.filter(order => {
      if (seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    });

    // Sort by order ID descending (latest first)
    deduplicated.sort((a, b) => {
      const aId = parseInt(a.orderId?.replace(/\D/g, '') || a.id) || 0;
      const bId = parseInt(b.orderId?.replace(/\D/g, '') || b.id) || 0;
      return bId - aId; // Descending
    });

    return deduplicated;
  } catch (err) {
    console.error('Failed to fetch all orders:', err);
    throw err;
  }
};

export default {
  getPaidOrders,
  getPaidOrdersFiltered,
  getRoomTransferOrders,
  getCancelledOrdersRaw,
  getCancelledOrders,
  getMergedOrders,
  getCreditOrders,
  getHoldOrders,
  getAggregatorOrders,
  getOrderDetails,
  getOrdersByTab,
};
