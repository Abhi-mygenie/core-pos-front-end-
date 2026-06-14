// Room Orders Service — CR-011-ROOM S-ROOM (Gate ⑤ single-call rewrite)
//
// Single-call approach: POST order-logs-report → pre-scan raw wrappers for
// room_info (RM rows) and SRM grouping → transform → filter → return
// fully-populated rows. ZERO per-row API calls.
//
// Follows the same pattern as orderLedgerService.js (S6).

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { reportListFromAPI } from '../transforms/reportTransform';
import { stripOrders } from '../transforms/orderPayloadStripper';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';

const inRange = (createdAt, fromDate, toDate) => {
  if (!createdAt) return false;
  const ca = createdAt.replace('T', ' ').substring(0, 19);
  return ca >= `${fromDate} 00:00:00` && ca <= `${toDate} 23:59:59`;
};

/**
 * Parse room_info from a raw wrapper into the canonical roomInfo shape.
 * Mirrors orderTransform.js:373-407 field extraction.
 */
const parseRoomInfo = (roomInfo, userName) => {
  if (!roomInfo) return null;
  const name3 = (roomInfo.name3 || '').trim();
  const top = (userName || '').trim();
  const bt = (roomInfo.booking_details?.booking_type || roomInfo.booking_type || '').trim();
  let guestName = null;
  if (name3) guestName = name3;
  else if (top) guestName = top;
  else if (bt.toLowerCase() === 'walkin' || bt.toLowerCase() === 'walk-in') guestName = 'Walk-in';
  else if (bt) guestName = bt;

  return {
    roomPrice:      parseFloat(roomInfo.room_price) || 0,
    advancePayment: parseFloat(roomInfo.advance_payment) || 0,
    balancePayment: parseFloat(roomInfo.balance_payment) || 0,
    receiveBalance: parseFloat(roomInfo.receive_balance) || 0,
    discountAmount: parseFloat(roomInfo.discount_amount) || 0,
    roomNo:         roomInfo.room_no || null,
    checkInDate:    roomInfo.checkin_date || null,
    checkOutDate:   roomInfo.checkout_date || null,
    guestName,
  };
};

/**
 * Map a transformed order-logs-report row to a fully-populated RoomRow.
 */
const toRoomRow = (o, roomInfoMap, associatedMap) => ({
  _source: 'logs-range',
  parentOrderId: o.id,
  restaurantOrderId: o.orderId || null,
  roomNumber: null,            // resolved by page via getTableById
  tableId: o.tableId || null,
  guestName: o.customer || 'Guest',
  checkInDateTime: o.createdAt,
  fOrderStatus: o.fOrderStatus,
  status: o.status || '',
  orderIn: o.orderIn || '',
  amount: o.amount,            // order_amount for financial computation
  // Pre-populated from single-call pre-scan:
  roomInfo: roomInfoMap[o.id] || null,
  associatedOrders: associatedMap[o.id] || [],
  _raw: o,
});

/**
 * Fetch room orders across a date range — single API call, no per-row fetching.
 *
 * @param {string} fromDate  YYYY-MM-DD
 * @param {string} toDate    YYYY-MM-DD
 * @param {Array}  schedules restaurant.schedules
 * @returns {Promise<{ rows: Array, anomalyCount: number }>}
 */
export const getRoomOrdersForRange = async (fromDate, toDate, schedules, restaurantId = 0) => {
  if (!fromDate || !toDate) return { rows: [], anomalyCount: 0 };

  // Step 1: Cached API call
  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'order-logs', 'created_at', fromDate, toDate),
    async () => {
      const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
        sort_by: 'created_at', from_date: fromDate, to_date: toDate,
      });
      const data = stripOrders(resp.data?.order || []);
      return { data, orderCount: data.length };
    }
  );

  // Step 2: Pre-scan raw wrappers BEFORE transform
  const roomInfoMap = {};   // RM parent id → parsed roomInfo
  const associatedMap = {}; // RM parent id → [SRM orders]

  raw.forEach((wrapper) => {
    const ot = wrapper.orders_table || {};
    // Collect room_info from RM wrappers
    if (ot.order_in === 'RM' && wrapper.room_info) {
      roomInfoMap[ot.id] = parseRoomInfo(wrapper.room_info, ot.user_name);
    }
    // Collect SRM rows grouped by parent_order_id
    if (ot.order_in === 'SRM' && ot.parent_order_id) {
      if (!associatedMap[ot.parent_order_id]) associatedMap[ot.parent_order_id] = [];
      associatedMap[ot.parent_order_id].push({
        orderId: ot.id,
        orderNumber: ot.restaurant_order_id || '',
        amount: parseFloat(ot.order_amount) || 0,
        transferredAt: ot.created_at || '',
      });
    }
  });

  // Step 3: Standard transform
  const transformed = reportListFromAPI.orderLogsReport(raw, null);

  // Step 4: Business-day / range filter (same as S6)
  const { start: dayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dayEnd } = getBusinessDayRange(toDate, schedules);
  const filtered = transformed.filter((o) => {
    const ca = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    if (fromDate === toDate) return isWithinBusinessDay(ca, dayStart, dayEnd);
    return ca >= dayStart && ca <= dayEnd && inRange(o.createdAt, fromDate, toDate);
  });

  // Filter to RM-only (room parent orders)
  const rmRows = filtered.filter((o) => o.orderIn === 'RM');

  // Drop cancelled/merged (anomaly)
  let anomalyCount = 0;
  const clean = rmRows.filter((o) => {
    if (o.status === 'cancelled' || o.status === 'merged') {
      anomalyCount += 1;
      return false;
    }
    return true;
  });

  // Sort by orderId desc (latest first)
  clean.sort((a, b) => {
    const ai = parseInt(String(a.orderId || a.id).replace(/\D/g, ''), 10) || 0;
    const bi = parseInt(String(b.orderId || b.id).replace(/\D/g, ''), 10) || 0;
    return bi - ai;
  });

  // Step 5+6: Attach pre-populated data — ZERO per-row API calls
  return {
    rows: clean.map((o) => toRoomRow(o, roomInfoMap, associatedMap)),
    anomalyCount,
  };
};
