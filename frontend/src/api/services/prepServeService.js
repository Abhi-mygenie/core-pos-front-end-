// Prep & Serve Time Service — CR-011 S10 (Gate ④ — Live API wiring)
//
// Fetches order-logs-report, classifies items by timestamp pattern
// (Kitchen / Bar / Direct), computes timing analytics.
//
// Classification logic (from timestamps, no external config needed):
//   Kitchen: created_at → ready_at (gap > 30s) → serve_at
//   Bar:     created_at ≈ ready_at (gap ≤ 30s) → serve_at later
//   Direct:  no timestamps, or all timestamps ≈ created_at

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { reportListFromAPI } from '../transforms/reportTransform';
import { stripOrders } from '../transforms/orderPayloadStripper';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';

// ── Constants ───────────────────────────────────────────────────────────────

const THRESHOLD_MIN = 0.5;   // 30 seconds — below this = "instant" (auto-ready/auto-serve)
const MAX_MINUTES = 120;     // Cap outliers at 2 hours
const CHUNK_MAX_DAYS = 30;
const PARALLEL_LIMIT = 3;

// ── Helpers ─────────────────────────────────────────────────────────────────

const parseTS = (ts) => {
  if (!ts) return null;
  const d = new Date(ts.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

const minutesBetween = (ts1, ts2) => {
  const d1 = parseTS(ts1);
  const d2 = parseTS(ts2);
  if (!d1 || !d2) return null;
  return (d2 - d1) / 60000;
};

const clamp = (val) => {
  if (val === null || val === undefined) return null;
  if (val < 0) return null;  // negative = data error, skip
  if (val > MAX_MINUTES) return null;  // outlier, skip
  return Math.round(val * 10) / 10;
};

const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const dateOnly = (iso) => {
  if (!iso) return '';
  const d = iso.includes('T') ? iso.split('T')[0] : iso.split(' ')[0];
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : '';
};

const hourOf = (iso) => {
  if (!iso) return null;
  const t = iso.includes('T') ? iso.split('T')[1] : iso.split(' ')[1];
  if (!t) return null;
  return parseInt(t.substring(0, 2), 10);
};

// ── Item classification ─────────────────────────────────────────────────────

/**
 * Classify a single item by its timestamp pattern.
 * Uses RAW timestamps (not the Direct-serve fallback) to avoid
 * PACKAGED items with fake readyAt/serveAt being misclassified.
 *
 * @param {Object} item - Parsed item from reportTransform (has rawReadyAt, rawServeAt)
 * @param {string} orderCreatedAt - Order-level created_at timestamp
 * @returns {'kitchen'|'bar'|'direct'}
 */
const classifyItem = (item, orderCreatedAt) => {
  const readyAt = item.rawReadyAt;   // raw — no Direct-serve fallback
  const serveAt = item.rawServeAt;   // raw — no Direct-serve fallback

  // No timestamps at all → direct
  if (!readyAt && !serveAt) return 'direct';

  const readyDiff = minutesBetween(orderCreatedAt, readyAt);
  const serveDiff = minutesBetween(orderCreatedAt, serveAt);

  // Both timestamps exist
  if (readyDiff !== null && serveDiff !== null) {
    // Both ≈ created_at → direct billing (auto-ready + auto-serve)
    if (readyDiff < THRESHOLD_MIN && serveDiff < THRESHOLD_MIN) return 'direct';
    // ready ≈ created but serve later → bar (auto-ready, real serve)
    if (readyDiff < THRESHOLD_MIN && serveDiff >= THRESHOLD_MIN) return 'bar';
    // ready significantly after created → kitchen
    if (readyDiff >= THRESHOLD_MIN) return 'kitchen';
  }

  // Only ready_at, no serve_at (e.g. food_status=2 "Ready" items)
  if (readyDiff !== null && serveDiff === null) {
    if (readyDiff >= THRESHOLD_MIN) return 'kitchen';
    return 'direct';
  }

  // Only serve_at, no ready_at
  if (readyDiff === null && serveDiff !== null) {
    if (serveDiff >= THRESHOLD_MIN) return 'bar';
    return 'direct';
  }

  return 'direct';
};

// ── Date range splitter (reused from foodCourtService) ──────────────────────

const splitDateRange = (fromDate, toDate, maxDays = CHUNK_MAX_DAYS) => {
  const start = new Date(fromDate + 'T00:00:00');
  const end = new Date(toDate + 'T00:00:00');
  const diffDays = Math.round((end - start) / 86400000);
  if (diffDays <= maxDays) return [{ from: fromDate, to: toDate }];
  const chunks = [];
  let cur = new Date(start);
  while (cur <= end) {
    const chunkEnd = new Date(cur.getTime() + (maxDays - 1) * 86400000);
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ from: fmtISO(cur), to: fmtISO(actualEnd) });
    cur = new Date(actualEnd.getTime() + 86400000);
  }
  return chunks;
};

const parallelMap = async (items, fn, limit, onProgress) => {
  const results = new Array(items.length);
  let nextIdx = 0;
  let completed = 0;
  const worker = async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      try { results[idx] = await fn(items[idx], idx); }
      catch (err) { results[idx] = { _error: err.readableMessage || err.message || 'Chunk failed' }; }
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

  const { start: dayStart } = getBusinessDayRange(chunk.from, schedules);
  const { end: dayEnd } = getBusinessDayRange(chunk.to, schedules);
  return transformed.filter((o) => {
    const ca = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    if (chunk.from === chunk.to) return isWithinBusinessDay(ca, dayStart, dayEnd);
    return ca >= dayStart && ca <= dayEnd;
  });
};

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Fetch and compute Prep & Serve Time analytics for a date range.
 *
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} toDate YYYY-MM-DD
 * @param {Array} schedules restaurant.schedules
 * @param {Function} onProgress (completed, total) => void
 * @returns {Promise<Object>} analytics
 */
export const getPrepServeAnalytics = async (fromDate, toDate, schedules, onProgress, restaurantId = 0) => {
  if (!fromDate || !toDate) return null;

  // Fetch
  const chunks = splitDateRange(fromDate, toDate);
  const chunkResults = await parallelMap(chunks, (chunk) => fetchChunk(chunk, schedules, restaurantId), PARALLEL_LIMIT, onProgress);

  let failed = 0;
  const allOrders = [];
  const seenIds = new Set();
  chunkResults.forEach((result) => {
    if (result?._error) { failed++; return; }
    if (!Array.isArray(result)) return;
    result.forEach((o) => {
      const oid = o.id || o.orderId;
      if (oid && seenIds.has(oid)) return;
      if (oid) seenIds.add(oid);
      allOrders.push(o);
    });
  });

  // Process items
  const classifiedItems = [];

  allOrders.forEach((o) => {
    const orderCreatedAt = o.createdAt;
    const orderDate = dateOnly(orderCreatedAt);
    const orderHour = hourOf(orderCreatedAt);
    const channel = o.channel || o.orderType || 'unknown';

    (o.items || []).forEach((item) => {
      // Skip cancelled items
      if (item.foodStatus === 3) return;

      const mode = classifyItem(item, orderCreatedAt);

      let prepMin = null;
      let serveMin = null;
      let totalMin = null;

      if (mode === 'kitchen') {
        prepMin = clamp(minutesBetween(orderCreatedAt, item.rawReadyAt));
        serveMin = clamp(minutesBetween(item.rawReadyAt, item.rawServeAt));
        if (prepMin !== null) {
          totalMin = serveMin !== null ? Math.round((prepMin + serveMin) * 10) / 10 : prepMin;
        }
      } else if (mode === 'bar') {
        prepMin = null;
        // Bar: auto-ready, measure serve from created_at → serve_at
        if (item.rawServeAt) {
          serveMin = clamp(minutesBetween(orderCreatedAt, item.rawServeAt));
        }
        totalMin = serveMin;
      }
      // direct → all null

      classifiedItems.push({
        orderId: o.orderId || o.displayOrderId || o.id,
        name: item.name || 'Unknown',
        station: item.station || 'Unknown',
        mode,
        prepMin,
        serveMin,
        totalMin,
        date: orderDate,
        hour: orderHour,
        channel,
        quantity: item.quantity || 1,
      });
    });
  });

  // ── Aggregate analytics ─────────────────────────────────────────────────

  // Counts by mode
  const modeCount = { kitchen: 0, bar: 0, direct: 0 };
  classifiedItems.forEach((it) => { modeCount[it.mode]++; });

  // Items with valid timing (kitchen + bar only)
  const timedItems = classifiedItems.filter((it) => it.mode !== 'direct');
  const kitchenItems = classifiedItems.filter((it) => it.mode === 'kitchen' && it.prepMin !== null);
  const servedItems = classifiedItems.filter((it) => it.serveMin !== null);

  // KPIs
  const avgPrep = kitchenItems.length > 0
    ? Math.round(kitchenItems.reduce((s, it) => s + it.prepMin, 0) / kitchenItems.length * 10) / 10
    : null;
  const avgServe = servedItems.length > 0
    ? Math.round(servedItems.reduce((s, it) => s + it.serveMin, 0) / servedItems.length * 10) / 10
    : null;
  const totalTimeItems = timedItems.filter((it) => it.totalMin !== null);
  const avgTotal = totalTimeItems.length > 0
    ? Math.round(totalTimeItems.reduce((s, it) => s + it.totalMin, 0) / totalTimeItems.length * 10) / 10
    : null;

  // ── Daily aggregation ─────────────────────────────────────────────────
  const dailyMap = {};
  classifiedItems.forEach((it) => {
    if (!it.date) return;
    if (!dailyMap[it.date]) dailyMap[it.date] = { date: it.date, preps: [], serves: [], totals: [], orders: new Set() };
    const d = dailyMap[it.date];
    d.orders.add(it.orderId);
    if (it.prepMin !== null) d.preps.push(it.prepMin);
    if (it.serveMin !== null) d.serves.push(it.serveMin);
    if (it.totalMin !== null) d.totals.push(it.totalMin);
  });
  const daily = Object.values(dailyMap)
    .map((d) => ({
      date: d.date,
      avgPrep: d.preps.length > 0 ? Math.round(d.preps.reduce((s, v) => s + v, 0) / d.preps.length * 10) / 10 : 0,
      avgServe: d.serves.length > 0 ? Math.round(d.serves.reduce((s, v) => s + v, 0) / d.serves.length * 10) / 10 : 0,
      avgTotal: d.totals.length > 0 ? Math.round(d.totals.reduce((s, v) => s + v, 0) / d.totals.length * 10) / 10 : 0,
      orders: d.orders.size,
    }))
    .sort((a, b) => {
      const [da, ma, ya] = a.date.split('/');
      const [db, mb, yb] = b.date.split('/');
      return `${ya}${ma}${da}`.localeCompare(`${yb}${mb}${db}`);
    });

  // ── Hourly aggregation ────────────────────────────────────────────────
  const hourlyMap = {};
  classifiedItems.forEach((it) => {
    if (it.hour === null) return;
    const h = String(it.hour).padStart(2, '0');
    if (!hourlyMap[h]) hourlyMap[h] = { hour: h, preps: [], serves: [], orders: 0 };
    hourlyMap[h].orders++;
    if (it.prepMin !== null) hourlyMap[h].preps.push(it.prepMin);
    if (it.serveMin !== null) hourlyMap[h].serves.push(it.serveMin);
  });
  const hourly = Object.values(hourlyMap)
    .map((h) => ({
      hour: h.hour,
      avgPrep: h.preps.length > 0 ? Math.round(h.preps.reduce((s, v) => s + v, 0) / h.preps.length * 10) / 10 : 0,
      avgServe: h.serves.length > 0 ? Math.round(h.serves.reduce((s, v) => s + v, 0) / h.serves.length * 10) / 10 : 0,
      orders: h.orders,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  // ── Prep time distribution ────────────────────────────────────────────
  const buckets = [
    { label: '0-5 min', min: 0, max: 5 },
    { label: '5-10 min', min: 5, max: 10 },
    { label: '10-15 min', min: 10, max: 15 },
    { label: '15-20 min', min: 15, max: 20 },
    { label: '20-30 min', min: 20, max: 30 },
    { label: '30+ min', min: 30, max: 999 },
  ];
  const distTotal = kitchenItems.length;
  const distribution = buckets.map((b) => {
    const count = kitchenItems.filter((it) => it.prepMin >= b.min && it.prepMin < b.max).length;
    return { label: b.label, count, pct: distTotal > 0 ? Math.round(count / distTotal * 1000) / 10 : 0 };
  });

  // ── By channel ────────────────────────────────────────────────────────
  const channelMap = {};
  classifiedItems.forEach((it) => {
    if (it.mode === 'direct') return;
    const ch = it.channel || 'unknown';
    const label = ch === 'dinein' ? 'Dine-In' : ch === 'delivery' ? 'Delivery' : ch === 'takeaway' ? 'Takeaway' : ch === 'take_away' ? 'Takeaway' : ch;
    if (!channelMap[label]) channelMap[label] = { channel: label, preps: [], serves: [], totals: [], orders: new Set() };
    const c = channelMap[label];
    c.orders.add(it.orderId);
    if (it.prepMin !== null) c.preps.push(it.prepMin);
    if (it.serveMin !== null) c.serves.push(it.serveMin);
    if (it.totalMin !== null) c.totals.push(it.totalMin);
  });
  const byChannel = Object.values(channelMap).map((c) => ({
    channel: c.channel,
    avgPrep: c.preps.length > 0 ? Math.round(c.preps.reduce((s, v) => s + v, 0) / c.preps.length * 10) / 10 : 0,
    avgServe: c.serves.length > 0 ? Math.round(c.serves.reduce((s, v) => s + v, 0) / c.serves.length * 10) / 10 : 0,
    avgTotal: c.totals.length > 0 ? Math.round(c.totals.reduce((s, v) => s + v, 0) / c.totals.length * 10) / 10 : 0,
    orders: c.orders.size,
  }));

  // ── By station ────────────────────────────────────────────────────────
  const stationMap = {};
  classifiedItems.forEach((it) => {
    const st = it.station || 'Unknown';
    if (!stationMap[st]) stationMap[st] = { station: st, preps: [], serves: [], items: 0, orders: new Set(), modes: { kitchen: 0, bar: 0, direct: 0 } };
    const s = stationMap[st];
    s.items++;
    s.orders.add(it.orderId);
    s.modes[it.mode]++;
    if (it.prepMin !== null) s.preps.push(it.prepMin);
    if (it.serveMin !== null) s.serves.push(it.serveMin);
  });
  const byStation = Object.values(stationMap)
    .map((s) => ({
      station: s.station,
      avgPrep: s.preps.length > 0 ? Math.round(s.preps.reduce((sv, v) => sv + v, 0) / s.preps.length * 10) / 10 : 0,
      avgServe: s.serves.length > 0 ? Math.round(s.serves.reduce((sv, v) => sv + v, 0) / s.serves.length * 10) / 10 : 0,
      orders: s.orders.size,
      items: s.items,
      modes: s.modes,
    }))
    .sort((a, b) => b.orders - a.orders);

  // ── Slowest / Fastest items ───────────────────────────────────────────
  const itemAggMap = {};
  classifiedItems.forEach((it) => {
    if (it.mode === 'direct') return;
    const key = `${it.name}|${it.station}`;
    if (!itemAggMap[key]) itemAggMap[key] = { name: it.name, station: it.station, preps: [], serves: [], count: 0, mode: it.mode };
    const a = itemAggMap[key];
    a.count++;
    if (it.prepMin !== null) a.preps.push(it.prepMin);
    if (it.serveMin !== null) a.serves.push(it.serveMin);
  });
  const itemAgg = Object.values(itemAggMap)
    .filter((a) => a.count >= 2) // need at least 2 data points
    .map((a) => ({
      name: a.name,
      station: a.station,
      mode: a.mode,
      avgPrep: a.preps.length > 0 ? Math.round(a.preps.reduce((s, v) => s + v, 0) / a.preps.length * 10) / 10 : 0,
      avgServe: a.serves.length > 0 ? Math.round(a.serves.reduce((s, v) => s + v, 0) / a.serves.length * 10) / 10 : 0,
      orders: a.count,
    }));

  const slowItems = [...itemAgg]
    .filter((a) => a.avgPrep > 0)
    .sort((a, b) => (b.avgPrep + b.avgServe) - (a.avgPrep + a.avgServe))
    .slice(0, 10);

  const fastItems = [...itemAgg]
    .sort((a, b) => (a.avgPrep + a.avgServe) - (b.avgPrep + b.avgServe))
    .slice(0, 10);

  return {
    meta: { chunks: chunks.length, failed, totalOrders: allOrders.length, totalItems: classifiedItems.length },
    modeCount,
    kpi: { avgPrep, avgServe, avgTotal, totalOrders: allOrders.length, kitchenItems: kitchenItems.length, servedItems: servedItems.length },
    daily,
    hourly,
    distribution,
    byChannel,
    byStation,
    slowItems,
    fastItems,
  };
};
