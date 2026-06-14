// Order Ledger Service — CR-011 S6 (Phase 2) · Gate ⑤ classifier fix (2026-06-03)
//
// Owner directive: "use same logic as audit report". Earlier classifier used
// the wrong transform fields (isCancelled / status==='cancelled' / status==='hold'
// / platform / status==='merged') so Cancelled / Hold / Merged / Aggregator
// tabs were silently rendering 0, with all of their traffic leaking into
// Settled. Verified live on cafe103 May 2026: Settled = 2062 inflated,
// other buckets empty.
//
// This rewrite:
//   1. Stops pre-classifying into a single `tabFilter`. Each row now preserves
//      the canonical transform fields (paymentMethod / paymentStatus /
//      fOrderStatus / orderIn / status). The mockup applies AllOrdersReportPage's
//      TAB_FILTERS predicates at render time, so a row can legitimately appear
//      in multiple tab counts (e.g. Settled + Aggregator) — same as Audit
//      Report.
//   2. Adds room-exclusion (`isRoomOrderForReport`) — identical predicate to
//      AllOrdersReportPage line 40-41.
//   3. Returns BOTH `fullOrders` (for ID-gap detection) AND `orders`
//      (room-excluded, for tab display) — same split Audit Report uses.
//
// Service surface still separate from Phase 1 / insightsService.js — only
// internal delegation is to reportService.getOrderLogsReport (the same source
// Audit Report uses, NOT Phase 1 code).

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { reportListFromAPI } from '../transforms/reportTransform';
import { stripOrders } from '../transforms/orderPayloadStripper';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';

// Room-order predicate — verbatim copy of AllOrdersReportPage line 40-41
const isRoomOrderForReport = (o) =>
  o?.orderIn === 'RM' || o?.orderIn === 'SRM' || o?.paymentMethod === 'ROOM';

const dateOnly = (iso) => {
  if (!iso) return '';
  const d = iso.includes('T') ? iso.split('T')[0] : iso.split(' ')[0];
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : '';
};
const timeOnly = (iso) => {
  if (!iso) return '';
  const t = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1];
  return t ? t.substring(0, 5) : '';
};

const toLedgerRow = (o) => {
  const pm = (o.paymentMethod || '').toLowerCase();
  const amt = o.amount || o.itemTotal || 0;
  const gstAmount = o.gstAmount || 0;       // Pure GST (after VAT-FIX)
  const vatAmount = o.vatAmount || 0;        // Pure VAT
  const rawGstAmount = o.rawGstAmount || 0;  // VAT-FIX: total tax for audit engine
  const totalAmount = o.amount || 0;

  return {
    // ── Canonical classifier fields (DO NOT MUTATE — TAB_FILTERS depends on them) ──
    paymentMethod: o.paymentMethod || '',
    paymentStatus: o.paymentStatus || '',
    fOrderStatus: o.fOrderStatus,
    orderIn: o.orderIn || '',
    status: o.status || '',
    _isMissing: false,

    // ── Ledger display columns (51) ──
    orderNumber: String(o.orderId || o.displayOrderId || o.id || '').replace(/^#/, ''),
    orderDate: dateOnly(o.createdAt),
    orderTime: timeOnly(o.createdAt),
    orderType: o.orderType || o.channel || 'Pos',
    itemCount: o.itemCount || (o.items || []).length || 0,
    orderDetails: (o.items || []).map((it) => `${it.name || it.foodName || 'Item'} (${it.qty || it.quantity || 1})`).join(', '),
    waiterOrdered: o.punchedBy || o.waiter || '',
    waiterCollected: o.actionedBy || '',
    paymentType: o.paymentMethod || '',
    itemTotal: o.itemTotal || 0,
    subTotal: o.subtotal || 0,
    gstAmount, deliveryCharge: o.deliveryCharge || 0, deliveryChargeGst: o.deliveryChargeGst || 0, serviceCharge: o.serviceChargeAmount || 0,
    tipAmount: o.tipAmount || 0,
    couponCode: o.couponCode || '', couponDiscount: o.couponAmount || 0,
    walletUsed: 0, loyaltyUsed: 0,
    discount: o.discountAmount || 0,
    discountCategory: o.couponCode ? 'Coupon' : '',
    discountFor: o.discountAmount > 0 ? 'Customer' : '',
    roundOff: o.roundOff || 0,
    totalAmount,
    cashAmount: pm === 'cash' ? amt : 0,
    cardAmount: pm === 'card' ? amt : 0,
    upiAmount: pm === 'upi' || pm === 'razorpay' ? amt : 0,
    tabAmount: pm === 'tab' || pm === 'transfertoroom' ? amt : 0,
    zomatoGold: 0, partialPayment: 0,
    contactName: o.customer && o.customer !== 'Guest' ? o.customer : '',
    contactNumber: o.customerPhone || '', dob: '', anniversary: '',
    addressType: '', area: o.deliveryAddress?.subLocality || '', pincode: '', completeAddress: [o.deliveryAddress?.line1, o.deliveryAddress?.subLocality, o.deliveryAddress?.city].filter(Boolean).join(', '),
    location: o.displayLocationLabel || '',
    transactionId: o.transactionRef || '',
    collectBillDate: dateOnly(o.collectedAt),
    collectBillTime: timeOnly(o.collectedAt),
    gstAmountOnly: gstAmount, vatAmount,
    rawGstAmount,  // VAT-FIX: total tax (for audit engine grand total check)
    userName: o.customer && o.customer !== 'Guest' ? o.customer : '',
    userPhone: o.customerPhone || '',
    razorpayStatus: o.pgStatus || '',
    razorpayPaymentId: '',
    razorpayOrderId: o.razorpayOrderId || '',
    roomTotal: 0, roomAdvance: 0, roomCheckout: '',

    // Drill backref for OrderDetailSheet DATA MODE
    __source: o,
  };
};

const inRange = (createdAt, fromDate, toDate) => {
  if (!createdAt) return false;
  const ca = createdAt.replace('T', ' ').substring(0, 19);
  return ca >= `${fromDate} 00:00:00` && ca <= `${toDate} 23:59:59`;
};

/**
 * Fetch Order Ledger across a date range using a single sort_by call.
 *
 * @param {string} fromDate  YYYY-MM-DD
 * @param {string} toDate    YYYY-MM-DD
 * @param {Array}  schedules restaurant.schedules
 * @param {string} sortBy    'collect_bill' | 'created_at'
 * @returns {Promise<{ orders, fullOrders, meta }>}
 *   - `orders`     : room-EXCLUDED rows (operator-facing, used by all tabs)
 *   - `fullOrders` : EVERYTHING incl. rooms (used by ID-gap detection only)
 *   - `meta`       : aggregates over `orders`
 */
export const getOrderLedgerForRange = async (fromDate, toDate, schedules, sortBy = 'collect_bill', restaurantId = 0) => {
  if (!fromDate || !toDate) return { orders: [], fullOrders: [], meta: {} };

  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'order-logs', sortBy, fromDate, toDate),
    async () => {
      const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: sortBy, from_date: fromDate, to_date: toDate });
      const data = stripOrders(resp.data?.order || []);
      return { data, orderCount: data.length };
    }
  );
  const transformed = reportListFromAPI.orderLogsReport(raw, null);

  // Business-day / range filter
  const { start: dayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dayEnd } = getBusinessDayRange(toDate, schedules);
  const filtered = transformed.filter((o) => {
    const ca = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    if (fromDate === toDate) return isWithinBusinessDay(ca, dayStart, dayEnd);
    return ca >= dayStart && ca <= dayEnd && inRange(o.createdAt, fromDate, toDate);
  });

  // Sort by orderId desc (latest first)
  filtered.sort((a, b) => {
    const ai = parseInt(String(a.orderId || a.id).replace(/\D/g, ''), 10) || 0;
    const bi = parseInt(String(b.orderId || b.id).replace(/\D/g, ''), 10) || 0;
    return bi - ai;
  });

  // Map ALL filtered rows (incl. rooms) for gap detection
  const fullOrders = filtered.map(toLedgerRow);

  // CR-029 (GO-2): room food included EVERYWHERE — room exclusion removed.
  // Existing TAB_FILTERS classify all room stages correctly (Q3-val matrix):
  // checkout→Paid · TAB→Credit · unpaid RM→Running · transferToRoom→Running · pm='ROOM' fs6→Paid
  const orders = filtered.map(toLedgerRow);

  const meta = {
    totalOrders: orders.length,
    totalRevenue: orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    totalTax: orders.reduce((s, o) => s + (o.gstAmount || 0) + (o.vatAmount || 0), 0),
    totalDiscount: orders.reduce((s, o) => s + (o.discount || 0), 0),
  };
  return { orders, fullOrders, meta };
};

/* ════════════════════════════════════════════════════════════════════════════
 * CR-030 (GO-2, 2026-06-11) — Collection-date revenue pipeline
 * Owner formula (live-validated 5/5 days to the rupee, see CR_030 plan addendum):
 *   Sales(day) = Σ fs6 orders by collect_bill BUSINESS day (room incl, pm='TAB' excl)
 *              + tab_payment settlements (daily-sales API)
 *              = backend daily-sales `paid_revenue`
 * ──────────────────────────────────────────────────────────────────────────── */

// Rollback flag: single-line revert to 'punch' restores the old pipeline.
export const REVENUE_BASIS = 'collect';

const addDaysISO = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toDDMMYYYY = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Business day a collect_bill timestamp belongs to (00:00–03:00 tail → prior day)
const businessDayOf = (ts, schedules) => {
  const calDay = ts.substring(0, 10);
  const { start } = getBusinessDayRange(calDay, schedules);
  return ts < start ? addDaysISO(calDay, -1) : calDay;
};

/**
 * Collected revenue rows for a range (CR-030 B-1).
 * fs=6 only · collect_bill within business-day range · room rows INCLUDED (CR-029)
 * · pm='TAB' rows kept but flagged `isTabCredit` (excluded from revenue/mix by
 * consumers; their GST stays in tax-collected per H5).
 * Each row gains `revenueDate` (DD/MM/YYYY collect_bill business day).
 */
export const getRevenueOrdersForRange = async (fromDate, toDate, schedules, restaurantId = 0) => {
  if (!fromDate || !toDate) return [];
  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'order-logs', 'collect_bill', fromDate, addDaysISO(toDate, 1)),
    async () => {
      const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
        sort_by: 'collect_bill',
        from_date: fromDate,
        to_date: addDaysISO(toDate, 1),
      });
      const data = stripOrders(resp.data?.order || []);
      return { data, orderCount: data.length };
    }
  );
  const transformed = reportListFromAPI.orderLogsReport(raw, null);

  const { start: dayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dayEnd } = getBusinessDayRange(toDate, schedules);

  const rows = [];
  for (const o of transformed) {
    if (String(o.fOrderStatus) !== '6') continue;
    const pm = (o.paymentMethod || '').toLowerCase();
    if (pm === 'merge') continue;
    const cb = (o.collectedAt || '').replace('T', ' ').substring(0, 19);
    if (!cb || cb < dayStart || cb > dayEnd) continue;
    const row = toLedgerRow(o);
    row.isTabCredit = pm === 'tab';
    row.revenueDate = toDDMMYYYY(businessDayOf(cb, schedules));
    rows.push(row);
  }
  return rows;
};

/**
 * TAB settlements (Credit Cash/Card/UPI) per day from daily-sales-revenue-report.
 * N calls for N days (parallel) — backend brief #4 asks for a range endpoint.
 */
export const getTabSettlementsForRange = async (fromDate, toDate) => {
  if (!fromDate || !toDate) return [];
  const days = [];
  for (let d = fromDate; d <= toDate && days.length < 92; d = addDaysISO(d, 1)) days.push(d);
  const num = (x) => parseFloat(String(x ?? '0').replace(/,/g, '')) || 0;
  const results = await Promise.all(days.map((d) =>
    api.post(API_ENDPOINTS.DAILY_SALES_REPORT, { from: d })
      .then((r) => ({ d, data: r.data || {} }))
      .catch(() => ({ d, data: {} }))
  ));
  return results.map(({ d, data }) => {
    const tp = (data.paid_revenue_method || {}).tab_payment || {};
    const cash = num(tp['Credit Cash']);
    const card = num(tp['Credit Card']);
    const upi = num(tp['Credit UPI']);
    return { date: d, dateDisplay: toDDMMYYYY(d), cash, card, upi, total: cash + card + upi };
  });
};
