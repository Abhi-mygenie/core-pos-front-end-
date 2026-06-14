// Food Court Service — CR-013 (Batched month-by-month fetch)
//
// Fetches order-logs-report and re-aggregates per station.
// For date ranges > 30 days, splits into monthly chunks and fetches
// in parallel (concurrency 3) to work around the backend 512MB memory limit.
//
// Only this file is affected — no frozen screens touched.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { reportListFromAPI } from '../transforms/reportTransform';
import { stripOrders } from '../transforms/orderPayloadStripper';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';

const CHUNK_MAX_DAYS = 30;
const PARALLEL_LIMIT = 3;

// ── Helpers ─────────────────────────────────────────────────────────────────

const inRange = (createdAt, fromDate, toDate) => {
  if (!createdAt) return false;
  const ca = createdAt.replace('T', ' ').substring(0, 19);
  return ca >= `${fromDate} 00:00:00` && ca <= `${toDate} 23:59:59`;
};

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

const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

// ── Date range splitter ─────────────────────────────────────────────────────

/**
 * Split a date range into chunks of ≤ maxDays each.
 * @returns {Array<{ from: string, to: string }>}
 */
const splitDateRange = (fromDate, toDate, maxDays = CHUNK_MAX_DAYS) => {
  const start = new Date(fromDate + 'T00:00:00');
  const end = new Date(toDate + 'T00:00:00');
  const diffDays = Math.round((end - start) / 86400000);

  if (diffDays <= maxDays) {
    return [{ from: fromDate, to: toDate }];
  }

  const chunks = [];
  let cur = new Date(start);

  while (cur <= end) {
    const chunkEnd = new Date(cur.getTime() + (maxDays - 1) * 86400000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ from: fmtISO(cur), to: fmtISO(actualEnd) });
    cur = new Date(actualEnd.getTime() + 86400000); // next day
  }

  return chunks;
};

// ── Parallel executor with concurrency limit ────────────────────────────────

const parallelMap = async (items, fn, limit, onProgress) => {
  const results = new Array(items.length);
  let nextIdx = 0;
  let completed = 0;

  const worker = async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch (err) {
        results[idx] = { _error: err.readableMessage || err.message || 'Chunk failed' };
      }
      completed++;
      onProgress?.(completed, items.length);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
};

// ── Single-chunk fetcher ────────────────────────────────────────────────────

const fetchChunk = async (chunk, schedules, restaurantId = 0) => {
  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'order-logs', 'created_at', chunk.from, chunk.to),
    async () => {
      const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
        sort_by: 'created_at', from_date: chunk.from, to_date: chunk.to,
      });
      const data = stripOrders(resp.data?.order || []);
      return { data, orderCount: data.length };
    }
  );
  const transformed = reportListFromAPI.orderLogsReport(raw, null);

  // Business-day filter for this chunk
  const { start: dayStart } = getBusinessDayRange(chunk.from, schedules);
  const { end: dayEnd } = getBusinessDayRange(chunk.to, schedules);
  return transformed.filter((o) => {
    const ca = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    if (chunk.from === chunk.to) return isWithinBusinessDay(ca, dayStart, dayEnd);
    return ca >= dayStart && ca <= dayEnd && inRange(o.createdAt, chunk.from, chunk.to);
  });
};

// ── Station row builder ─────────────────────────────────────────────────────

const toStationRow = (o, stationItems, stationName) => {
  const itemTotal = stationItems.reduce((s, it) => s + (it.price || 0), 0);
  const gstAmount = stationItems.filter((it) => it.foodStatus !== 3).reduce((s, it) => s + (it.gstAmount || 0), 0);
  const vatAmount = stationItems.filter((it) => it.foodStatus !== 3).reduce((s, it) => s + (it.vatAmount || 0), 0);

  // Proportional discount distribution by item price share
  const orderItemTotal = (o.items || []).reduce((s, it) => s + (it.price || 0), 0);
  const orderDiscount = o.discountAmount || o.discount || 0;
  const share = orderItemTotal > 0 ? itemTotal / orderItemTotal : 0;
  const discount = Math.round(orderDiscount * share * 100) / 100;
  const subTotal = Math.round((itemTotal - discount) * 100) / 100;
  const total = Math.round((subTotal + gstAmount + vatAmount) * 100) / 100;

  return {
    paymentMethod: o.paymentMethod || '',
    paymentStatus: o.paymentStatus || '',
    fOrderStatus: o.fOrderStatus,
    orderIn: o.orderIn || '',
    status: o.status || '',
    orderNumber: String(o.orderId || o.displayOrderId || o.id || '').replace(/^#/, ''),
    stationName,
    orderDate: dateOnly(o.createdAt),
    orderTime: timeOnly(o.createdAt),
    orderType: o.orderType || o.channel || 'Pos',
    itemCount: stationItems.length,
    totalQty: stationItems.reduce((s, it) => s + (it.quantity || 0), 0),
    orderDetails: stationItems.map((it) =>
      `${it.name || 'Item'} (${it.quantity || 1}) \u20B9${Math.round(it.price || 0)}`
    ).join(', '),
    stationItems,
    itemTotal,
    discount,
    subTotal,
    gstAmount,
    vatAmount,
    total,
    __source: o,
  };
};

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Fetch Food Court report for a date range + station.
 * Automatically batches into monthly chunks for ranges > 30 days.
 *
 * @param {string}   fromDate   YYYY-MM-DD
 * @param {string}   toDate     YYYY-MM-DD
 * @param {Array}    schedules  restaurant.schedules
 * @param {string}   station    selected station name (or '' for station list only)
 * @param {Function} onProgress (completed, total) => void — batch progress callback
 * @returns {Promise<{ orders, stations, meta }>}
 */
export const getFoodCourtForRange = async (fromDate, toDate, schedules, station, onProgress, restaurantId = 0) => {
  if (!fromDate || !toDate) return { orders: [], stations: [], meta: { chunks: 0, failed: 0 } };

  const chunks = splitDateRange(fromDate, toDate);
  const isBatched = chunks.length > 1;

  // Fetch all chunks (parallel with limit)
  const chunkResults = await parallelMap(
    chunks,
    (chunk) => fetchChunk(chunk, schedules, restaurantId),
    PARALLEL_LIMIT,
    onProgress
  );

  // Merge results, track failures
  let failed = 0;
  const allTransformed = [];
  const seenIds = new Set();

  chunkResults.forEach((result) => {
    if (result?._error) {
      failed++;
      return;
    }
    if (!Array.isArray(result)) return;
    result.forEach((o) => {
      // Deduplicate by order ID (edge case: order at chunk boundary)
      const oid = o.id || o.orderId;
      if (oid && seenIds.has(oid)) return;
      if (oid) seenIds.add(oid);
      allTransformed.push(o);
    });
  });

  // Sort by orderId desc
  allTransformed.sort((a, b) => {
    const ai = parseInt(String(a.orderId || a.id).replace(/\D/g, ''), 10) || 0;
    const bi = parseInt(String(b.orderId || b.id).replace(/\D/g, ''), 10) || 0;
    return bi - ai;
  });

  // Extract all unique station names
  const stationSet = new Set();
  allTransformed.forEach((o) => {
    (o.items || []).forEach((it) => {
      if (it.station) stationSet.add(it.station);
    });
  });
  const stations = [...stationSet].sort();

  const meta = { chunks: chunks.length, failed, totalRaw: allTransformed.length, batched: isBatched };

  // If no station selected, return empty orders (user must pick one)
  if (!station) return { orders: [], stations, meta, allOrders: allTransformed };

  // Station-scoped rows
  const orders = [];
  allTransformed.forEach((o) => {
    const items = (o.items || []).filter((it) => it.station === station);
    if (items.length === 0) return;
    orders.push(toStationRow(o, items, station));
  });

  return { orders, stations, meta, allOrders: allTransformed };
};
