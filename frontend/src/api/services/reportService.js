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
// CR-004 (Phase 4.1): import the order-side transform so the Room Orders Report
// row-expand can use a transform that already extracts `roomInfo` (incl. the
// CR-004 additive checkInDate/guestName fields) and `associatedOrders[]`.
// The shared `reportFromAPI.singleOrderNew` transform is intentionally NOT
// modified — see CR-004 impact analysis Q-1 / pre-coding decision (b).
import { fromAPI as orderTransformFromAPI } from '../transforms/orderTransform';
// CR-004 Phase 2 (Bucket B / FE-1): consume `/get-room-list` directly for the
// Unpaid + All filters on the Room Orders Report.
import { transformRoomListToRows } from '../transforms/roomListTransform';
import { getRoomList } from './roomService';
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

/**
 * CR-004 (Phase 4.1): Fetch single order details for Room Orders Report.
 *
 * Why a separate function (vs. reusing `getSingleOrderNew`)?
 * The Audit Report drill-down side-sheet uses `reportFromAPI.singleOrderNew`,
 * which does NOT extract `room_info` or `associated_order_list[]`. The Room
 * Orders Report needs both. Pre-coding decision (b) of CR-004's Q-1 was:
 * add a NEW service function that calls the same endpoint but transforms via
 * `orderTransform.fromAPI.order` (which already extracts roomInfo +
 * associatedOrders, and now — post Phase 4.1 — also exposes checkInDate /
 * guestName / bookingType).
 *
 * This is intentionally a thin wrapper: ONE endpoint call, ONE transform.
 * The Room Orders Report fires this once per RM-parent on row-mount and caches
 * the result for the session.
 *
 * @param {number|string} orderId - The RM-parent order id whose detail we want.
 *   Caller is expected to pass the internal `id` (numeric) of an `order_in === 'RM'`
 *   parent order. Behavior on non-RM ids is "best-effort": the transform will
 *   produce `roomInfo === null` and an empty `associatedOrders[]`.
 * @returns {Promise<Object>} - Transformed order including:
 *   - `id`, `orderId`, `customer`, `amount`, `createdAt`, ...
 *   - `roomInfo`: { roomPrice, advancePayment, balancePayment, checkInDate,
 *                   checkOutDate, bookingType, guestName }   (null if not a room)
 *   - `associatedOrders`: Array of { orderId, orderNumber, amount, transferredAt, _raw }
 */
export const getSingleOrderRoom = async (orderId) => {
  const response = await api.post(API_ENDPOINTS.SINGLE_ORDER_NEW, {
    order_id: orderId,
  });
  // The endpoint nests its payload differently across consumers. Verified shapes
  // observed on preprod 2026-04-29:
  //   { orders: [<order>] }                                  ← actual shape today
  //   { orders: { order_details_order: <order>, ... } }      ← drill-down shape
  //   { order_details_order: <order> }                       ← alternate
  //   { ...orderFields }                                     ← bare object
  // The order-side `orderTransform.fromAPI.order` expects the raw order object
  // itself (the same shape used for table running orders), so we unwrap until
  // we have the canonical object. List responses pick the first element (this
  // endpoint always returns at most one order for a given order_id).
  let raw =
    response.data?.orders?.order_details_order ||
    response.data?.order_details_order ||
    response.data?.orders ||
    response.data ||
    {};
  if (Array.isArray(raw)) {
    raw = raw[0] || {};
  }
  return orderTransformFromAPI.order(raw);
};

// =============================================================================
// CR-001 BUCKET D-1 — Active SRM index for the Audit Report status override
// =============================================================================
//
// Why this exists:
//   `/order-logs-report` rows with `payment_method === 'transferToRoom'` are
//   force-flipped to `status: 'running'` by the per-row override below.
//   Backend does NOT update `payment_method` on the SRM after the parent room
//   is checked out (verified live preprod 2026-04-29 — row id=731922 was
//   `transferToRoom` even though parent r1 was fully settled & cash-collected).
//   Without a guard, settled SRMs perpetually show as Running on the Audit
//   Report.
//
// What this returns:
//   `Set<number>` — the SRM order ids whose parent room is CURRENTLY in-house.
//   The Audit Report calls this once per `fetchOrders` run and passes it to
//   `getOrderLogsReport`, which narrows the override to "fire only while the
//   linked room is still in-house". Settled SRMs then fall through to the
//   normal derivation chain → `f_order_status === 6` → `'paid'`.
//
// Cost:
//   1 `/get-room-list` call + N `/get-single-order-new(roomOrderId)` calls
//   in parallel, where N = currently in-house rooms (typically 1–10). Each
//   call is small (~1-3 KB). Failure modes are tolerated per-room — a folio
//   that fails to load contributes zero ids; the override falls back to the
//   conservative "fire" branch via the empty-set sentinel below.
//
// Consumed by:
//   `AllOrdersReportPage.fetchOrders` (Audit Report).
//   The Room Orders Report does NOT need this — it filters by
//   `orderIn === 'RM'` and the override only fires on `transferToRoom` rows
//   (which have `orderIn !== 'RM'` by definition).
export const getActiveSrmIds = async () => {
  let rooms;
  try {
    rooms = await getRoomList();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[CR-001 D-1] getRoomList failed; SRM override stays broad:', err?.message);
    return null; // null sentinel → override fires for ALL transferToRoom rows
  }
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return new Set();
  }
  const folioFetches = rooms
    .filter((r) => r && r.order_id)
    .map(async (r) => {
      try {
        const folio = await getSingleOrderRoom(r.order_id);
        return (folio?.associatedOrders || []).map((a) => a.orderId).filter(Boolean);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          '[CR-001 D-1] folio fetch failed for room order',
          r.order_id,
          '— SRMs of this room will be assumed running (safe fallback):',
          err?.message
        );
        return null; // null marks "unknown" — handled below
      }
    });
  const results = await Promise.all(folioFetches);
  // If ANY folio fetch failed (returned null), we can't safely tell whether
  // some SRMs belong to that room — fall back to the broad override (return
  // null) so we don't accidentally flip a still-running SRM to Paid.
  if (results.some((r) => r === null)) return null;
  return new Set(results.flat());
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
 * @param {Object} schedules - Restaurant schedules (for business-day window)
 * @param {string} [sortBy='created_at'] - Sort by 'collect_bill' or 'created_at'
 * @param {Set<number>|null} [activeSrmIds=null] - CR-001 Bucket D-1.
 *   When provided, narrows the `transferToRoom → running` override to only
 *   fire when the row's id is in this set (i.e., the linked room is
 *   currently in-house). When null (default), the override fires for every
 *   `transferToRoom` row — same as pre-Bucket-D-1 behaviour. The `null`
 *   sentinel is also produced by `getActiveSrmIds` on partial failure to
 *   avoid accidentally flipping a still-running SRM to Paid.
 * @returns {Promise<Object>} - { orders: Array, totalOrders: number }
 */
export const getOrderLogsReport = async (date, schedules, sortBy = 'created_at', activeSrmIds = null) => {
  const dateStr = formatDateParam(date);
  const { start, end } = getBusinessDayRange(dateStr, schedules);

  // Single API call with from_date and to_date (same date for single day view)
  const response = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
    sort_by: sortBy,
    from_date: dateStr,
    to_date: dateStr,
  });

  const orders = response.data?.order || [];

  // Transform via reportTransform (replaces inline transform + diagnostics)
  const transformedOrders = reportListFromAPI.orderLogsReport(orders, activeSrmIds);

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

// CR-004 Phase 2 (Bucket B / FE-1) — filter-pill-driven data source for the
// Room Orders Report.
//
// Three rules (locked):
//   - 'unpaid' → `/get-room-list` only (live, currently in-house rooms).
//                Date picker is irrelevant; backend already filters out
//                checked-out rooms server-side (verified live preprod).
//   - 'paid'   → `/order-logs-report` filtered to `orderIn === 'RM'` and
//                `status === 'paid'`. Selected business day applies.
//   - 'all'    → both, parallelised, deduplicated by `parentOrderId`.
//                In-house source wins (carries the live latest_order_id).
//
// Output shape:
//   { rows: RowSeed[], anomalyCount: number, source: 'live'|'logs'|'all' }
//
// `RowSeed` matches the shape consumed by `RoomOrdersReportPage.roomRows`
// and `RoomRowCard`. Live-source seeds carry `roomNumber` + `tableId`
// resolved from the `/get-room-list` payload. Logs-source seeds carry
// `tableId` only and rely on the page-level `getTableById` fallback to
// resolve `roomNumber`.

const orderLogsRowToRoomRowSeed = (o) => ({
  _source: 'logs',
  parentOrderId: o.id,
  restaurantOrderId: o.orderId,
  roomNumber: null,
  tableId: o.tableId || null,
  guestName: o.customer || 'Guest',
  checkInDateTime: o.createdAt,
  transferCount: null,
  food: null,
  total: null,
  paid: null,
  outstanding: null,
  _raw: o,
});

export const getRoomsForReport = async (filter, selectedDate, schedules) => {
  if (filter === 'unpaid') {
    const raw = await getRoomList();
    return {
      rows: transformRoomListToRows(raw),
      anomalyCount: 0,
      source: 'live',
    };
  }

  if (filter === 'paid') {
    const data = await getOrderLogsReport(selectedDate, schedules);
    const orders = data?.orders || [];
    const rmRows = orders.filter((o) => o.orderIn === 'RM');
    let dropped = 0;
    const clean = rmRows.filter((o) => {
      if (o.status === 'cancelled' || o.status === 'merged') {
        dropped += 1;
        return false;
      }
      return true;
    });
    const paidOnly = clean.filter((o) => o.status === 'paid');
    return {
      rows: paidOnly.map(orderLogsRowToRoomRowSeed),
      anomalyCount: dropped,
      source: 'logs',
    };
  }

  // filter === 'all' (default)
  const [raw, data] = await Promise.all([
    getRoomList(),
    getOrderLogsReport(selectedDate, schedules),
  ]);
  const liveRows = transformRoomListToRows(raw);
  const orders = data?.orders || [];
  const rmRows = orders.filter((o) => o.orderIn === 'RM');
  let dropped = 0;
  const clean = rmRows.filter((o) => {
    if (o.status === 'cancelled' || o.status === 'merged') {
      dropped += 1;
      return false;
    }
    return true;
  });
  const settled = clean.map(orderLogsRowToRoomRowSeed);
  const seen = new Set(liveRows.map((r) => r.parentOrderId));
  const merged = [...liveRows, ...settled.filter((r) => !seen.has(r.parentOrderId))];
  return { rows: merged, anomalyCount: dropped, source: 'all' };
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
  getSingleOrderRoom,
  getActiveSrmIds,
  getRoomsForReport,
};
