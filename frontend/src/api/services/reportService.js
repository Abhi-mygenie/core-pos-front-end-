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

  // [BE-1 INVARIANT] — once-per-fetch dev-mode audit of expected backend fields.
  // Added 2026-05-01 per REPORTS_FIELD_MAPPING_LIVE_AUDIT. Fires only when a row
  // is missing a field the audit confirmed was shipped, OR when a field is
  // STILL MISSING that we have a backend ask filed for. Zero cost in production.
  if (process.env.NODE_ENV === 'development' && orders.length > 0) {
    const gaps = {
      // ── Confirmed shipped — regression detectors ──────────────────────────
      waiter_name: [],            // P1 — every row should have it
      cancellation_reason: [],    // P3 — every cancelled row should have it
      cancel_type: [],            // P4 — every cancelled row should have item-level cancel_type
      table_name: [],              // P5 — dine-in rows
      rm_room_info: [],            // P6 / BE-2 §4.3 — RM rows
      rm_associated_orders: [],    // RM rows
      rm_receive_balance: [],      // BE-2 §4.1 derived — settled rooms

      // ── Still missing — pending-backend detectors (will populate the moment BE ships) ──
      pending_collect_by_name: [], // BE-1 P2 paid — populates ACTIONED BY "Collected by …"
      pending_cancel_by_name: [],  // BE-1 P2 cancelled — order-level (item-level cancel_by_name exists)
      pending_merge_by_name: [],   // BE-1 P2 merged
      pending_room_info_discount: [], // BE-2 §4.1 — discount_amount / discount_reason on room_info
    };
    orders.forEach((w) => {
      const ot = w?.orders_table || {};
      const firstItem = w?.order_details_table?.[0] || {};
      const rid = ot.restaurant_order_id || ot.id;
      const isCancelled = ot.payment_method === 'Cancel' || ot.f_order_status === 3;
      const isPaid = ot.f_order_status === 6 && ot.payment_method !== 'Cancel';

      // ── Shipped checks ──
      if (!ot.waiter_name) gaps.waiter_name.push(rid);
      if (isCancelled && !ot.cancellation_reason) gaps.cancellation_reason.push(rid);
      if (isCancelled && !firstItem.cancel_type) gaps.cancel_type.push(rid);
      if (ot.table_id > 0 && !ot.table_name) gaps.table_name.push(rid);
      if (ot.order_in === 'RM') {
        if (!w.room_info) gaps.rm_room_info.push(rid);
        if (!Array.isArray(w.associated_orders)) gaps.rm_associated_orders.push(rid);
        if (w.room_info?.payment_status === 'paid' && w.room_info?.receive_balance == null) {
          gaps.rm_receive_balance.push(rid);
        }
      }

      // ── Pending checks (warn when STILL MISSING — flips to OK when BE ships) ──
      // Note 2026-05-01: `employee_name` is the canonical "collected by" on paid
      // rows (product-confirmed). It is credited first; legacy alt-keys are
      // accepted as fallback for older tenants.
      if (isPaid && !(ot.employee_name || ot.collect_by_name || ot.payment_collected_by_name)) {
        gaps.pending_collect_by_name.push(rid);
      }
      if (isCancelled && !(ot.cancel_by_name || ot.canceled_by_name || firstItem.cancel_by_name)) {
        gaps.pending_cancel_by_name.push(rid);
      }
      // merged is rare; only flag when payment_method indicates merge
      if ((ot.payment_method === 'Merge' || ot.payment_method === 'merged') && !ot.merge_by_name) {
        gaps.pending_merge_by_name.push(rid);
      }
      if (ot.order_in === 'RM' && w.room_info?.payment_status === 'paid' && w.room_info?.discount_amount == null) {
        gaps.pending_room_info_discount.push(rid);
      }

      // [BE-2 INVARIANT] — installed 2026-05-01 alongside derived-math wire-up.
      // For every settled RM (`f_order_status === 6` AND `room_info.payment_status === 'paid'`),
      // verify lodging math reconciles: room_price === advance + receive_balance + discount.
      // A positive delta means an undisclosed discount or operator under-collection;
      // surface it so owners can audit ahead of explicit `discount_amount` shipping.
      if (ot.order_in === 'RM' && ot.f_order_status === 6 && w.room_info?.payment_status === 'paid') {
        const ri = w.room_info;
        const price = parseFloat(ri.room_price) || 0;
        const advance = parseFloat(ri.advance_payment) || 0;
        const received = parseFloat(ri.receive_balance) || 0;
        const explicit = parseFloat(ri.discount_amount) || 0;
        const gap = price - advance - received - explicit;
        if (gap > 0.01) {
          // eslint-disable-next-line no-console
          console.warn(
            `[BE-2 INVARIANT] settled room ${rid} (room ${ri.room_no}) has ₹${gap.toFixed(2)} cash gap — `
            + `price=${price} advance=${advance} receive_balance=${received} explicit_discount=${explicit}`
          );
        }
      }
      // BE-1 G3 — RESOLVED (no longer pending) 2026-05-01:
      //   Backend ships `associated_orders[i].order_status` which mirrors the
      //   SRM child's `f_order_status`. Value `6` ⇒ settled/paid. Frontend can
      //   classify settlement directly without a separate `payment_status`
      //   field.
    });
    Object.entries(gaps).forEach(([field, ids]) => {
      if (ids.length > 0) {
        const tag = field.startsWith('pending_') ? '[BE-1 PENDING]' : '[BE-1 INVARIANT]';
        // eslint-disable-next-line no-console
        console.warn(`${tag} /order-logs-report — ${ids.length} row(s) missing '${field}':`, ids);
      }
    });
  }

  // Transform each order
  const transformedOrders = orders.map(orderWrapper => {
    const api = orderWrapper.orders_table || {};
    const toNum = (val) => parseFloat(val) || 0;
    
    // Extract location info
    const orderIn = api.order_in || null;
    const tableId = api.table_id || null;
    const tableName = api.table_name || null;
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
    const paymentMethodLower = paymentMethod.toLowerCase();
    const paymentStatus = api.payment_status || '';
    // CR-001: Default fallback changed from 'paid' to 'audit' (CS-2).
    // Unmatched real rows are now routed to the Audit tab instead of being
    // silently labelled as paid.
    let status = 'audit';

    // CR-001 priority-based status determination.
    // Order matters. The `hold` rule must run BEFORE `unpaid` so paylater rows
    // never leak into Unpaid. The legacy `transferred` rule (paymentMethod === 'ROOM'
    // || orderIn === 'SRM' → 'transferred') has been removed entirely per Q-A —
    // room rows are excluded globally at the page layer (CS-16..CS-22), so the
    // value is no longer derived here.
    if (paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled') {
      status = 'cancelled';
    } else if (paymentMethod === 'Merge' || paymentStatus === 'Merge') {
      status = 'merged';
    } else if (paymentMethod === 'TAB') {
      status = 'credit';
    } else if (fStatus === 9 || fStatus === 8 || paymentMethodLower === 'paylater') {
      // CR-001 CS-1 + POS2-005: Hold rule keyed on f_order_status === 9 OR
      // === 8 OR payment_method === 'paylater' (case-insensitive).
      // Method-first per EC-9 (paylater + payment_status === 'paid' is still Hold).
      // POS2-005: status-8 (Active/Unpaid Running) reclassified from 'running'
      // to 'hold' for FE display + Audit Report tab routing. CR-001's
      // audit-fall-through goal is preserved — status-8 still doesn't fall
      // to 'audit'; the destination changes from Running tab to Hold tab.
      status = 'hold';
    } else if (paymentMethodLower === 'transfertoroom') {
      // CR-001 Phase 2: transferToRoom rows are billed at the table
      // (typically f_order_status === 6) but the money is routed to a room
      // folio — it has NOT been collected at the restaurant. Treat them as
      // 'running' so the badge matches the other rows on the Running tab
      // (visual consistency — all rows on this tab share the same
      // "money not yet collected" meaning). The literal `transferToRoom`
      // value remains in the Payment column for operator visibility.
      //
      // CR-001 Bucket D-1 narrowing: backend never flips `payment_method`
      // post-checkout (verified live preprod 2026-04-29), so without an
      // additional guard, every settled SRM perpetually shows as Running on
      // Audit. When the caller has supplied an `activeSrmIds` set
      // (non-null), force `running` ONLY for rows whose id is in the set
      // (== parent room is currently in-house). Otherwise fall through to
      // the rest of the chain (`fStatus === 6` → `paid`).
      if (activeSrmIds === null || activeSrmIds.has(api.id)) {
        status = 'running';
      } else if (paymentStatus === 'unpaid') {
        status = 'unpaid';
      } else if (fStatus === 6) {
        status = 'paid';
      }
    } else if (paymentStatus === 'unpaid') {
      status = 'unpaid';
    } else if (fStatus === 6) {
      status = 'paid';
    } else if (fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus !== 8 && fStatus != null) {
      // CR-001 follow-up (Audit fall-through fix) + POS2-005: open / in-progress
      // orders (kitchen preparing, served, billed-not-collected — i.e.
      // f_order_status ∈ {0, 1, 2, 4, 5, 7}) are 'running', not 'audit'.
      // Audit must remain a true catch-all reserved for genuinely anomalous
      // rows where f_order_status is null/undefined or no other rule matched.
      // Cancelled (3), paid (6), hold (9 + paylater + 8) are already handled above.
      // POS2-005: status 8 is Hold, no longer Running.
      status = 'running';
    }
    // No silent `else status = 'paid'` — only orders with null/undefined
    // f_order_status (or no derivation rule match) fall through to the
    // 'audit' default declared above.

    // CR-001 CS-13/CS-14: Normalize channel from `order_type` and platform
    // from `order_from`. Channel canonical values: 'dinein' | 'takeaway' | 'delivery'
    // (any backend variant such as 'take_away', 'dine_in', 'home_delivery'
    // collapses to these three). Anything else returns null and the filter
    // simply will not match.
    const orderTypeRaw = (api.order_type || '').toString().toLowerCase();
    let channel = null;
    if (orderTypeRaw === 'dinein' || orderTypeRaw === 'dine_in' || orderTypeRaw === 'dine-in') {
      channel = 'dinein';
    } else if (orderTypeRaw === 'takeaway' || orderTypeRaw === 'take_away' || orderTypeRaw === 'take-away') {
      channel = 'takeaway';
    } else if (orderTypeRaw === 'delivery' || orderTypeRaw === 'home_delivery' || orderTypeRaw === 'home-delivery') {
      channel = 'delivery';
    }

    // CR-001 CS-15: platform = `order_from` normalized to 'pos' | 'web'.
    // Missing/null `order_from` is preserved as null; the page-level filter
    // is permissive on missing data (Q-D) and the entire filter is hidden if
    // the field is not consistently present (Q-F).
    const orderFromRaw = (api.order_from || '').toString().toLowerCase();
    let platform = null;
    if (orderFromRaw === 'pos') {
      platform = 'pos';
    } else if (orderFromRaw === 'web') {
      platform = 'web';
    } else if (orderFromRaw) {
      // Unknown value — pass through lower-cased so the page can still
      // reason about presence vs. value.
      platform = orderFromRaw;
    }

    // CR-001 CS-23..CS-28: Razorpay payment-gateway tri-state plumbing.
    const razorpayOrderId = api.razorpay_order_id || null;
    const isPaymentGateway = Boolean(razorpayOrderId);

    // CR-001 Phase 2 — Display fields for the redesigned table:
    //
    // (A) Order # prefix
    //   - 'RM'                                           → 'R-' (room order)
    //   - 'SRM'                                          → 'T-' (transfer to table)
    //   - tableId > 0                                    → 'T-' (dine-in)
    //   - payment_method === 'transferToRoom' (any case) → 'T-' (punched at table; money routed to room)
    //   - otherwise                                      → ''  (delivery/takeaway/walk-in/aggregator)
    //
    // The prefix is purely a display concern. Sorting, gap-detection and
    // exports continue to use the raw numeric `orderId`.
    let orderIdPrefix = '';
    if (orderIn === 'RM') {
      orderIdPrefix = 'R-';
    } else if (
      orderIn === 'SRM' ||
      (tableId && tableId > 0) ||
      paymentMethodLower === 'transfertoroom'
    ) {
      orderIdPrefix = 'T-';
    }
    const rawOrderIdStr = String(api.restaurant_order_id || api.id || '').replace(/^#/, '');
    const displayOrderId = orderIdPrefix ? `${orderIdPrefix}${rawOrderIdStr}` : rawOrderIdStr;

    // (B) Table No column display
    //   - BE-1 P5 wired 2026-05-01 — canonical backend key is `table_name`
    //     (live audit confirmed; original spec called for `table_no`).
    //   - When absent and the row is not at a room, fall back to the order_type
    //     label (Delivery / Takeaway / Walk-in) so operators see *what kind*
    //     of order it is rather than a bare em dash.
    //   - Rooms keep showing "Room" or "→ R<id>" (handled by the legacy
    //     `locationDisplay` already computed above).
    const tableNo = api.table_name || null;
    // BE-1 P6 / BE-2 §4.3 — wrapper-level `room_info` is available on RM rows.
    // Use `room_info.room_no` (e.g. "109") so the TABLE NO column shows the
    // actual room instead of a generic "Room" label.
    const wrapperRoomInfo = orderWrapper.room_info || null;
    const rmRoomNo = wrapperRoomInfo?.room_no || null;
    let displayLocationLabel;
    if (tableNo) {
      displayLocationLabel = tableNo;
    } else if (orderIn === 'RM') {
      displayLocationLabel = rmRoomNo ? `R${rmRoomNo}` : 'Room';
    } else if (orderIn === 'SRM') {
      displayLocationLabel = roomId ? `→ R${roomId}` : 'Room Transfer';
    } else if (channel === 'delivery') {
      displayLocationLabel = 'Delivery';
    } else if (channel === 'takeaway') {
      displayLocationLabel = 'Takeaway';
    } else if (orderTypeRaw === 'walkin' || orderTypeRaw === 'walk_in' || orderTypeRaw === 'walk-in') {
      displayLocationLabel = 'Walk-in';
    } else if (channel === 'dinein') {
      // dine-in but no table_name — extremely rare; show a generic fallback.
      displayLocationLabel = 'Dine-in';
    } else {
      displayLocationLabel = '—';
    }

    // (C) Punched By
    //   BE-1 P1 wired 2026-05-01 (live audit confirmed `waiter_name` on every
    //   row). No fallback — UI layer owns placeholder if column alignment
    //   needs a dash. `waiter_id` is no longer displayed.
    const punchedBy = api.waiter_name || '';

    // (D) Actioned By — dynamic per derived status.
    //   Paid      → "Collected by <name>" (cashier / payment collector)
    //   Cancelled → "Cancelled by <name>"
    //   Merged    → "Merged by <name>"
    //   else      → null (UI renders '—')
    //
    // Backend field names vary slightly across endpoints; we try a chain
    // of plausible fields and gracefully fall back to `Employee #<id>` or
    // `—` when nothing is present. This mirrors the pattern already used
    // by `reportTransform.js::cancelledBy`.
    const resolveName = (nameField, idField) => {
      if (nameField) return nameField;
      if (idField != null && idField !== '' && idField !== 0) {
        return `Employee #${idField}`;
      }
      return null;
    };
    let actionedByLabel = null;
    let actionedBy = null;
    if (status === 'paid') {
      actionedByLabel = 'Collected by';
      // BE-1 P2 (paid) wired 2026-05-01 — `employee_name` confirmed by product
      // as the canonical "collected by" field on paid rows of /order-logs-report.
      // Live verification (welcomeresort 2026-04-26..29): every paid row carries
      // `employee_name` (e.g. "counter2"). The earlier multi-key chain
      // (`payment_collected_by_name`, `collect_by_name`, etc.) is preserved as
      // defence in case other tenants ship those instead.
      actionedBy = resolveName(
        api.employee_name || api.payment_collected_by_name || api.collect_by_name || api.cashier_name || api.collected_by_name || api.bill_collected_by_name,
        api.employee_id || api.payment_collected_by || api.collect_by || api.cashier_id || api.collected_by || api.bill_collected_by
      );
    } else if (status === 'cancelled') {
      actionedByLabel = 'Cancelled by';
      // BE-1 P2 (cancelled, partial wire 2026-05-01) — backend ships
      // `cancel_by_name` at *item* level (`order_details_table[i]`), not order
      // level. For the Cancelled tab we fall back to the first item's value
      // when order-level keys are null. Verified live: order 822509 → null at
      // order level, but `order_details_table[0].cancel_by_name = "p"`.
      const firstItemCancelBy = orderWrapper.order_details_table?.[0] || {};
      actionedBy = resolveName(
        api.cancel_by_name || api.cancelled_by_name || firstItemCancelBy.cancel_by_name,
        api.cancel_by || api.cancelled_by || firstItemCancelBy.cancel_by
      );
    } else if (status === 'merged') {
      actionedByLabel = 'Merged by';
      actionedBy = resolveName(
        api.merge_by_name || api.merged_by_name,
        api.merge_by || api.merged_by
      );
    }

    // No-orphan-label policy (2026-05-01) — suppress the "Collected by" /
    // "Cancelled by" / "Merged by" prefix when no name resolves. Otherwise
    // the UI renders a dangling "Cancelled by" with nothing after it.
    if (!actionedBy) actionedByLabel = null;

    return {
      id: api.id,
      orderId: api.restaurant_order_id || `#${api.id}`,
      // CR-001 Phase 2: prefixed display version of orderId for the table.
      displayOrderId,
      orderIdPrefix,
      amount: toNum(api.order_amount),
      customer: api.user_name || 'Guest',
      // Legacy `waiter` field preserved for downstream consumers (detail
      // sheet, exports referencing it). The Audit table now uses `punchedBy`.
      // BE-1 P1 wired 2026-05-01 — no fallback.
      waiter: api.waiter_name || '',
      // CR-001 Phase 2 — new display fields.
      tableNo,
      displayLocationLabel,
      punchedBy,
      actionedBy,
      actionedByLabel,
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
      // CR-001: new normalized fields surfaced by the report page filters.
      channel,
      platform,
      razorpayOrderId,
      // CR-005 #1 / Bucket B2-split (May-2026): expose PG capture amount +
      // status. PG Status column auto-reveals once backend starts populating
      // snapshot_razorpay_status (BE-W2) — no frontend change required at
      // that point. Today: null on every row → column self-hides.
      pgAmount: (parseFloat(api.payment_amount) || null),
      pgStatus: api.snapshot_razorpay_status || null,
      isPaymentGateway,
      discount: toNum(api.restaurant_discount_amount || api.discount_value || 0),
      tax: toNum(api.gst_tax) + toNum(api.vat_tax) + toNum(api.service_tax),
      tip: toNum(api.tip_amount || 0),
      // BE-1 P3 wired 2026-05-01 — canonical key `cancellation_reason`.
      cancellationReason: api.cancellation_reason || '',
      // BE-1 P4 wired 2026-05-01 — read raw `cancel_type` from item-level
      // (`order_details_table[0]`). Backend literal set: `Pre-Serve` |
      // `Post-Serve` | `Order` | `full`. Render as-is — operators want to
      // know whole-order cancels too, not have them silently blanked.
      cancellationType: orderWrapper.order_details_table?.[0]?.cancel_type || '',
      ...(process.env.NODE_ENV === 'development' ? { _raw: api } : {}),
    };
  });
  
  // Filter transformed orders by business day range
  const filteredOrders = transformedOrders.filter(o => {
    const createdAt = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    return isWithinBusinessDay(createdAt, start, end);
  });

  // CR-001 TEMP DIAGNOSTIC — remove after issue is resolved.
  // eslint-disable-next-line no-console
  console.log('[CR-001 DIAG] getOrderLogsReport', {
    requestDate: dateStr,
    bdStart: start,
    bdEnd: end,
    apiOrdersRaw: orders.length,
    transformedCount: transformedOrders.length,
    afterBusinessDayFilter: filteredOrders.length,
    droppedByBusinessDay: transformedOrders.length - filteredOrders.length,
    sampleOriginal: orders[0] ? {
      created_at: (orders[0].orders_table || {}).created_at,
      order_in: (orders[0].orders_table || {}).order_in,
      payment_method: (orders[0].orders_table || {}).payment_method,
      f_order_status: (orders[0].orders_table || {}).f_order_status,
    } : null,
    sampleTransformed: transformedOrders[0] ? {
      orderId: transformedOrders[0].orderId,
      createdAt: transformedOrders[0].createdAt,
      orderIn: transformedOrders[0].orderIn,
      paymentMethod: transformedOrders[0].paymentMethod,
      status: transformedOrders[0].status,
    } : null,
  });

  // CR-001 Phase 2 TEMP DIAGNOSTIC — print full raw + derived fields for
  // any order whose restaurant_order_id matches the watch list. Used to
  // debug discrepancies between the row badge in the table and the detail
  // sheet (e.g. CASH → Unpaid post Mark-Unpaid). Remove once resolved.
  const WATCH_ORDER_IDS = [
    '002913', '002912', '002910', '002908', '002907', '002904',
    // Mantri-site IDs (from G5 investigation — prefix missing on dine-in rows)
    '000970', '000969', '000968', '000967', '000966', '000965', '000964', '000963', '000962', '000960', '000959', '000958',
  ];
  orders.forEach((wrapper) => {
    const raw = wrapper.orders_table || {};
    const rid = String(raw.restaurant_order_id || '');
    if (WATCH_ORDER_IDS.includes(rid)) {
      const transformed = transformedOrders.find((t) => String(t.orderId) === rid);
      // eslint-disable-next-line no-console
      console.log(`[CR-001 P2 DIAG] order=${rid}`, {
        // G5 investigation — capture order_type to determine if "walk-in" prefix is needed
        raw_order_type: raw.order_type,
        raw_payment_method: raw.payment_method,
        raw_payment_status: raw.payment_status,
        raw_f_order_status: raw.f_order_status,
        raw_order_in: raw.order_in,
        raw_table_id: raw.table_id,
        raw_table_no: raw.table_no,
        raw_waiter_id: raw.waiter_id,
        raw_waiter_name: raw.waiter_name,
        raw_cancel_by: raw.cancel_by,
        raw_cancel_by_name: raw.cancel_by_name,
        raw_collect_by: raw.collect_by,
        raw_collect_by_name: raw.collect_by_name,
        raw_payment_collected_by: raw.payment_collected_by,
        raw_payment_collected_by_name: raw.payment_collected_by_name,
        raw_cashier_id: raw.cashier_id,
        raw_cashier_name: raw.cashier_name,
        raw_merge_by: raw.merge_by,
        raw_merge_by_name: raw.merge_by_name,
        raw_room_info: raw.room_info,
        raw_order_amount: raw.order_amount,
        raw_razorpay_order_id: raw.razorpay_order_id,
        derived_status: transformed?.status,
        derived_channel: transformed?.channel,
        derived_paymentMethod: transformed?.paymentMethod,
        derived_paymentStatus: transformed?.paymentStatus,
        derived_punchedBy: transformed?.punchedBy,
        derived_actionedBy: transformed?.actionedBy,
        derived_actionedByLabel: transformed?.actionedByLabel,
        derived_displayOrderId: transformed?.displayOrderId,
        derived_orderIdPrefix: transformed?.orderIdPrefix,
        derived_tableNo: transformed?.tableNo,
        derived_displayLocationLabel: transformed?.displayLocationLabel,
        FULL_RAW: raw,
      });
    }
  });

  // G5 — Auto-snapshot any order missing a prefix (no R-/T-) to help find
  // walk-in / counter orders we haven't watched explicitly. Only logs once
  // per fetch to avoid console spam.
  const unprefixedSamples = transformedOrders
    .filter((t) => !t.orderIdPrefix)
    .slice(0, 5);
  if (unprefixedSamples.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      '[CR-001 G5 DIAG] orders without prefix (first 5) — please check raw_order_type / raw_order_in:',
      unprefixedSamples.map((t) => {
        const rawWrapper = orders.find((w) => (w.orders_table || {}).restaurant_order_id === t.orderId);
        const raw = rawWrapper ? rawWrapper.orders_table : {};
        return {
          orderId: t.orderId,
          status: t.status,
          derived_channel: t.channel,
          raw_order_type: raw.order_type,
          raw_order_in: raw.order_in,
          raw_table_id: raw.table_id,
          raw_table_no: raw.table_no,
        };
      })
    );
  }

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
