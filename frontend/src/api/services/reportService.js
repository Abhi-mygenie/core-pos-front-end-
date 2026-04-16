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
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';
import { getRunningOrders } from './orderService';

/**
 * Format date for API query param
 * @param {Date|string} date 
 * @returns {string} YYYY-MM-DD format
 */
const formatDateParam = (date) => {
  if (!date) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof date === 'string') {
    return date;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Filter raw API orders by business day time range.
 * If no schedules, falls back to calendar date match on created_at.
 * @param {Array} orders - Raw API orders
 * @param {string} start - Business day start "YYYY-MM-DD HH:MM:SS"
 * @param {string} end - Business day end "YYYY-MM-DD HH:MM:SS"
 * @returns {Array}
 */
const filterByBusinessDay = (orders, start, end) => {
  return orders.filter(o => {
    const createdAt = o.created_at || '';
    return isWithinBusinessDay(createdAt, start, end);
  });
};

/**
 * Fetch raw orders from a GET endpoint for one or more search dates, merge and deduplicate.
 * @param {string} endpoint - API endpoint
 * @param {string[]} searchDates - Calendar dates to fetch
 * @returns {Promise<Array>} - Merged raw orders (deduped by id)
 */
const fetchAndMergeRaw = async (endpoint, searchDates) => {
  const responses = await Promise.all(
    searchDates.map(d =>
      api.get(endpoint, { params: { search_date: d } })
        .then(res => res.data?.orders || res.data || [])
        .catch(() => [])
    )
  );
  const merged = responses.flat();
  // Deduplicate by id (same order can appear in both dates' responses)
  const seen = new Set();
  return merged.filter(o => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
};

// =============================================================================
// PAID ORDERS (Tab: Paid + Room Transfer)
// =============================================================================

/**
 * Fetch paid orders for a given business day
 * @param {string|Date} date - Selected date
 * @param {Array} [schedules] - Restaurant schedules for business day calc
 * @returns {Promise<Array>} - Normalized order list
 */
export const getPaidOrders = async (date, schedules) => {
  const dateStr = formatDateParam(date);
  const { start, end, searchDates } = getBusinessDayRange(dateStr, schedules);
  const raw = await fetchAndMergeRaw(API_ENDPOINTS.REPORT_PAID_ORDERS, searchDates);
  const filtered = filterByBusinessDay(raw, start, end);
  return reportListFromAPI.paidOrders(filtered);
};

/**
 * Fetch paid orders filtered for Paid tab (excludes Room Transfers)
 */
export const getPaidOrdersFiltered = async (date, schedules) => {
  const allPaid = await getPaidOrders(date, schedules);
  return filterPaidOrders(allPaid);
};

/**
 * Fetch paid orders filtered for Room Transfer tab
 */
export const getRoomTransferOrders = async (date, schedules) => {
  const allPaid = await getPaidOrders(date, schedules);
  return filterRoomTransferOrders(allPaid);
};

// =============================================================================
// CANCELLED ORDERS (Tab: Cancelled + Merged)
// =============================================================================

/**
 * Fetch cancelled orders for a given business day
 * @param {string|Date} date 
 * @param {Array} [schedules]
 * @returns {Promise<Array>}
 */
export const getCancelledOrdersRaw = async (date, schedules) => {
  const dateStr = formatDateParam(date);
  const { start, end, searchDates } = getBusinessDayRange(dateStr, schedules);
  const raw = await fetchAndMergeRaw(API_ENDPOINTS.REPORT_CANCELLED_ORDERS, searchDates);
  const filtered = filterByBusinessDay(raw, start, end);
  return reportListFromAPI.cancelledOrders(filtered);
};

/**
 * Fetch cancelled orders filtered for Cancelled tab (excludes Merged)
 */
export const getCancelledOrders = async (date, schedules) => {
  const allCancelled = await getCancelledOrdersRaw(date, schedules);
  return filterCancelledOrders(allCancelled);
};

/**
 * Fetch cancelled orders filtered for Merged tab
 */
export const getMergedOrders = async (date, schedules) => {
  const allCancelled = await getCancelledOrdersRaw(date, schedules);
  return filterMergedOrders(allCancelled);
};

// =============================================================================
// CREDIT ORDERS (Tab: Credit)
// =============================================================================

/**
 * Fetch credit/TAB orders for a given business day
 * @param {string|Date} date 
 * @param {Array} [schedules]
 * @returns {Promise<Array>}
 */
export const getCreditOrders = async (date, schedules) => {
  const dateStr = formatDateParam(date);
  const { start, end, searchDates } = getBusinessDayRange(dateStr, schedules);
  const raw = await fetchAndMergeRaw(API_ENDPOINTS.REPORT_CREDIT_ORDERS, searchDates);
  const filtered = filterByBusinessDay(raw, start, end);
  return reportListFromAPI.creditOrders(filtered);
};

// =============================================================================
// HOLD ORDERS (Tab: On Hold)
// =============================================================================

/**
 * Fetch hold/paylater orders for a given business day
 * NOTE: ISSUE-001 - This endpoint returns same data as paid-order-list (backend bug)
 * @param {string|Date} date 
 * @param {Array} [schedules]
 * @returns {Promise<Array>}
 */
export const getHoldOrders = async (date, schedules) => {
  const dateStr = formatDateParam(date);
  const { start, end, searchDates } = getBusinessDayRange(dateStr, schedules);
  const raw = await fetchAndMergeRaw(API_ENDPOINTS.REPORT_HOLD_ORDERS, searchDates);
  const filtered = filterByBusinessDay(raw, start, end);
  return reportListFromAPI.holdOrders(filtered);
};

// =============================================================================
// AGGREGATOR ORDERS (Tab: Aggregator - Zomato/Swiggy)
// =============================================================================

/**
 * Fetch aggregator orders (UrbanPiper) for a given business day
 * NOTE: This is a POST endpoint, not GET
 * @param {string|Date} date 
 * @param {Array} [schedules]
 * @returns {Promise<Array>}
 */
export const getAggregatorOrders = async (date, schedules) => {
  const dateStr = formatDateParam(date);
  const { start, end, searchDates } = getBusinessDayRange(dateStr, schedules);
  // POST endpoint — fetch each date separately and merge
  const responses = await Promise.all(
    searchDates.map(d =>
      api.post(API_ENDPOINTS.REPORT_AGGREGATOR_ORDERS, { search_date: d })
        .then(res => res.data?.orders || res.data || [])
        .catch(() => [])
    )
  );
  const merged = responses.flat();
  // Deduplicate by id
  const seen = new Set();
  const deduped = merged.filter(o => {
    const oid = o.order_details_order?.id || o.id;
    if (seen.has(oid)) return false;
    seen.add(oid);
    return true;
  });
  // Filter by business day using created_at from nested structure
  const filtered = deduped.filter(o => {
    const createdAt = o.order_details_order?.created_at || o.created_at || '';
    return isWithinBusinessDay(createdAt, start, end);
  });
  return reportListFromAPI.aggregatorOrders(filtered);
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

/**
 * Fetch single order details using new endpoint (richer data)
 * Source: get-single-order-new endpoint
 * NOTE: POST request with order_id in body, returns rich item data with variations
 * @param {number} orderId - The internal order ID to fetch
 * @returns {Promise<Object>}
 */
export const getSingleOrderNew = async (orderId) => {
  const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
    order_id: orderId,
  });
  return reportFromAPI.singleOrderNew(response.data);
};

// =============================================================================
// DAILY SALES REPORT (For Order Summary & TAB Settlement Stats)
// =============================================================================

/**
 * Fetch daily sales revenue report - comprehensive data for Order Summary page
 * NOTE: This is a POST endpoint. Backend handles business hours filtering.
 * @param {string|Date} date - Selected date
 * @returns {Promise<Object>} - Full order summary data
 */
export const getDailySalesReport = async (date) => {
  const dateStr = formatDateParam(date);
  const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
    from: dateStr,
  });
  const data = response.data || {};
  
  // Parse helper
  const toNum = (val) => parseFloat(val) || 0;
  
  return {
    // Top Cards (Key Metrics)
    sales: toNum(data.total_sales),
    paidRevenue: toNum(data.paid_revenue),
    runningOrders: toNum(data.running_order),
    orderTAB: toNum(data.orderTAB),
    unpaidRevenue: toNum(data.unpaid_revenue),
    cancelled: toNum(data.cancel_revenue?.['Pre-Serve']) + toNum(data.cancel_revenue?.['Post-Serve']),
    
    // Payment Breakdown
    paymentBreakdown: {
      cash: toNum(data.Cash),
      card: toNum(data.Card),
      upi: toNum(data.UPI),
      room: toNum(data.paid_revenue_method?.order_payment?.Room),
    },
    
    // Station Revenue (raw object for dynamic rendering)
    stationRevenue: data.station_revenue || {},
    
    // TAB (Credit)
    tabSettled: {
      total: toNum(data.total_tab_payment),
      cash: toNum(data.tab_cash),
      card: toNum(data.tab_card),
      upi: toNum(data.tab_upi),
    },
    
    // Room
    room: {
      orders: toNum(data.orderRoom),
      settledCash: toNum(data.room_revenue?.['Room Cash']),
      settledCard: toNum(data.room_revenue?.['Room Card']),
      settledUPI: toNum(data.room_revenue?.['Room UPI']),
      settledTotal: toNum(data.room_revenue?.['Room Cash']) + toNum(data.room_revenue?.['Room Card']) + toNum(data.room_revenue?.['Room UPI']),
    },
    
    // Aggregators
    aggregators: {
      zomato: toNum(data.aggrigator_order?.Zomato),
      swiggy: toNum(data.aggrigator_order?.swiggy),
    },
    
    // Cancellations
    cancellations: {
      preServe: toNum(data.cancel_revenue?.['Pre-Serve']),
      postServe: toNum(data.cancel_revenue?.['Post-Serve']),
    },
    
    // Deductions & Extras
    deductions: {
      discount: toNum(data.discount),
      tax: toNum(data.tax),
      tips: toNum(data.tips),
      serviceCharge: toNum(data.service_charge),
      roundOff: toNum(data.round_off),
    },
    
    // Date Range (business hours)
    dateRange: {
      from: data.from || null,
      to: data.to || null,
    },
    
    // Raw data for any additional needs
    ...(process.env.NODE_ENV === 'development' ? { _raw: data } : {}),
  };
};

// =============================================================================
// TAB DATA FETCHER - Convenience function for all tabs
// =============================================================================

/**
 * Fetch orders for a specific tab
 * @param {string} tab - Tab name
 * @param {string|Date} date - Date to fetch
 * @param {Array} [schedules] - Restaurant schedules for business day calc
 * @returns {Promise<Array>}
 */
export const getOrdersByTab = async (tab, date, schedules) => {
  switch (tab) {
    case 'all':
      return getAllOrders(date, schedules);
    case 'paid':
      return getPaidOrdersFiltered(date, schedules);
    case 'cancelled':
      return getCancelledOrders(date, schedules);
    case 'credit':
      return getCreditOrders(date, schedules);
    case 'hold':
      return getHoldOrders(date, schedules);
    case 'merged':
      return getMergedOrders(date, schedules);
    case 'roomTransfer':
      return getRoomTransferOrders(date, schedules);
    case 'aggregator':
      return getAggregatorOrders(date, schedules);
    default:
      console.warn(`Unknown tab: ${tab}`);
      return [];
  }
};

// =============================================================================
// ORDER LOGS REPORT (For ALL Orders Report Page)
// =============================================================================

/**
 * Fetch order logs report - comprehensive order data with order_in, table_id, parent_order_id
 * @param {string|Date} date - Selected date
 * @param {string} sortBy - Sort by 'collect_bill' or 'created_at'
 * @returns {Promise<Object>} - { orders: Array, totalOrders: number }
 */
export const getOrderLogsReport = async (date, schedules, sortBy = 'created_at') => {
  const dateStr = formatDateParam(date);
  const { start, end } = getBusinessDayRange(dateStr, schedules);

  // Single API call with from_date and to_date (same date for single day view)
  const response = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
    sort_by: sortBy,
    from_date: dateStr,
    to_date: dateStr,
  });

  const orders = response.data?.order || [];
  
  // Transform each order
  const transformedOrders = orders.map(orderWrapper => {
    const api = orderWrapper.orders_table || {};
    const toNum = (val) => parseFloat(val) || 0;
    
    // Extract location info
    const orderIn = api.order_in || null;
    const tableId = api.table_id || null;
    const tableName = api.table_no || null;
    const roomId = orderIn === 'SRM' ? api.parent_order_id : null;
    
    let locationType, locationDisplay;
    if (orderIn === 'RM') {
      locationType = 'room';
      locationDisplay = 'Room';
    } else if (orderIn === 'SRM') {
      locationType = 'room_transfer';
      locationDisplay = `→ R${roomId}`;
    } else if (tableId && tableId > 0) {
      locationType = 'table';
      locationDisplay = tableName || `T${tableId}`;
    } else {
      locationType = 'counter';
      locationDisplay = '—';
    }
    
    // Determine status
    const fStatus = api.f_order_status;
    const paymentMethod = api.payment_method || '';
    const paymentStatus = api.payment_status || '';
    let status = 'paid';
    
    // Priority-based status determination
    if (paymentMethod === 'Cancel' || paymentMethod.toLowerCase() === 'cancelled') {
      status = 'cancelled';
    } else if (paymentMethod === 'Merge' || paymentStatus === 'Merge') {
      status = 'merged';
    } else if (paymentMethod === 'TAB') {
      status = 'credit';
    } else if (paymentMethod === 'ROOM' || orderIn === 'SRM') {
      status = 'transferred';
    } else if (paymentStatus === 'unpaid') {
      status = 'unpaid';
    } else if (fStatus === 6) {
      status = 'paid';
    }
    
    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      amount: toNum(api.order_amount),
      customer: api.user_name || 'Guest',
      waiter: api.waiter_name || '—',
      table: locationDisplay,
      tableId,
      orderIn,
      roomId,
      location: {
        type: locationType,
        display: locationDisplay,
        tableId,
        tableName,
        roomId,
        orderIn,
      },
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: api.payment_status || 'paid',
      status,
      fOrderStatus: fStatus,
      createdAt: api.created_at,
      collectedAt: api.collect_bill || api.updated_at,
      orderType: api.order_type,
      discount: toNum(api.restaurant_discount_amount || api.discount_value || 0),
      tax: toNum(api.gst_tax) + toNum(api.vat_tax) + toNum(api.service_tax),
      tip: toNum(api.tip_amount || 0),
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
    };
  });
  
  // Filter transformed orders by business day range
  const filteredOrders = transformedOrders.filter(o => {
    const createdAt = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    return isWithinBusinessDay(createdAt, start, end);
  });
  
  return {
    orders: filteredOrders,
    totalOrders: filteredOrders.length,
  };
};

// =============================================================================
// ALL ORDERS (Tab: All Orders - Combined view for sequence verification)
// =============================================================================

/**
 * Fetch all orders from all sources for sequence verification
 * Combines: Paid, Cancelled, Credit, Hold (excludes Aggregator - different ID format)
 * Deduplicates by order.id and adds status field
 * @param {string|Date} date 
 * @param {Array} [schedules]
 * @returns {Promise<Array>}
 */
export const getAllOrders = async (date, schedules) => {
  try {
    const [paidAll, cancelledAll, credit, hold, allRunningOrders] = await Promise.all([
      getPaidOrders(date, schedules).catch(() => []),
      getCancelledOrdersRaw(date, schedules).catch(() => []),
      getCreditOrders(date, schedules).catch(() => []),
      getHoldOrders(date, schedules).catch(() => []),
      getRunningOrders().catch(() => []),
    ]);

    // Filter running orders by business day range
    const dateStr = formatDateParam(date);
    const { start, end } = getBusinessDayRange(dateStr, schedules);
    const runningFiltered = allRunningOrders.filter(order => {
      if (!order.createdAt) return false;
      const ca = order.createdAt.replace('T', ' ').substring(0, 19);
      return isWithinBusinessDay(ca, start, end);
    });

    // Build running orders lookup by restaurant_order_id (orderNumber in transformed data)
    const runningOrdersMap = {};
    runningFiltered.forEach(o => {
      const numericId = String(o.orderNumber || '').replace(/\D/g, '');
      if (numericId) runningOrdersMap[numericId] = o;
    });

    // Add status to each order
    const paidFiltered = filterPaidOrders(paidAll).map(o => ({ ...o, _status: 'paid' }));
    const roomTransfer = filterRoomTransferOrders(paidAll).map(o => ({ ...o, _status: 'roomTransfer' }));
    const cancelledFiltered = filterCancelledOrders(cancelledAll).map(o => ({ ...o, _status: 'cancelled' }));
    const merged = filterMergedOrders(cancelledAll).map(o => ({ ...o, _status: 'merged' }));
    const creditOrders = credit.map(o => ({ ...o, _status: 'credit' }));

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

    // Attach running orders map as a non-enumerable property on the array
    // so consumers can access it without breaking array operations
    deduplicated._runningOrdersMap = runningOrdersMap;

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
  getDailySalesReport,
  getOrderLogsReport,
  getOrdersByTab,
};
