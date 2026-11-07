// variationAddonService.js — CR-136 (Variation & Addon Sales Report)
//
// Fetches order-logs-report and aggregates by variation name + addon name.
// Uses transformed item.variations and item.addOns (already parsed by reportTransform.js).
//
// Transformed fields used:
//   item.name          — food item name
//   item.quantity      — qty ordered (for revenue calculation)
//   item.foodStatus    — 3 = cancelled (skip)
//   item.variations[]  — [{ group, label, price }]  price = per-unit option surcharge
//   item.addOns[]      — [{ name, price }]           price = per-unit addon charge

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { reportListFromAPI } from '../transforms/reportTransform';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';

const fmtISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const addDay = (dateStr, n = 1) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return fmtISO(d);
};

// ── Main export ───────────────────────────────────────────────────────────────
export const getVariationAddonSalesForRange = async (fromDate, toDate, schedules = [], restaurantId = 0) => {
  if (!fromDate || !toDate) return { variations: [], addons: [], meta: {} };

  // Extend +1 day to capture cross-midnight business-day orders (BUG-296 pattern)
  const toDateExtended = addDay(toDate);

  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'var-addon', 'collect_bill', fromDate, toDate),
    async () => {
      const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
        sort_by: 'collect_bill',
        from_date: fromDate,
        to_date: toDateExtended,
      });
      const data = resp.data?.order || [];
      return { data, orderCount: data.length };
    }
  );

  const transformed = reportListFromAPI.orderLogsReport(raw, null);

  // Business-day filter
  const { start: dayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dayEnd }     = getBusinessDayRange(toDate, schedules);
  const filtered = transformed.filter((o) => {
    const ca = (o.createdAt || '').replace('T', ' ').substring(0, 19);
    return isWithinBusinessDay(ca, dayStart, dayEnd);
  });

  // ── Aggregate variations ──────────────────────────────────────────────────
  // item.variations = [{ group, label, price }]  price = per-unit surcharge
  // key = foodItem + "|||" + variantLabel  (unique variation option)
  const varMap = {};

  for (const order of filtered) {
    for (const item of (order.items || [])) {
      if (item.foodStatus === 3) continue;
      const foodName = item.name || 'Unknown';
      const itemQty  = item.quantity || 1;

      for (const v of (item.variations || [])) {
        const label = (v.label || '').trim();
        const price = v.price || 0;
        if (!label) continue;
        const key = `${foodName}|||${label}`;
        if (!varMap[key]) {
          varMap[key] = { foodItem: foodName, variantName: label, variantGroup: v.group || '', qty: 0, revenue: 0 };
        }
        varMap[key].qty     += itemQty;
        varMap[key].revenue  = Math.round((varMap[key].revenue + price * itemQty) * 100) / 100;
      }
    }
  }

  // ── Aggregate addons ──────────────────────────────────────────────────────
  // item.addOns = [{ name, price }]  price = per-unit addon charge
  // key = addon name  (groups across all food items that carry it)
  const addMap = {};

  for (const order of filtered) {
    for (const item of (order.items || [])) {
      if (item.foodStatus === 3) continue;
      const foodName = item.name || 'Unknown';
      const itemQty  = item.quantity || 1;

      for (const a of (item.addOns || [])) {
        const name  = (a.name || '').trim();
        const price = a.price || 0;
        if (!name) continue;
        if (!addMap[name]) {
          addMap[name] = { addonName: name, qty: 0, revenue: 0, foodItems: new Set() };
        }
        addMap[name].qty     += itemQty;   // count as 1 addon unit per item ordered
        addMap[name].revenue  = Math.round((addMap[name].revenue + price * itemQty) * 100) / 100;
        addMap[name].foodItems.add(foodName);
      }
    }
  }

  // Sort by revenue desc, assign rank
  const variations = Object.values(varMap)
    .sort((a, b) => b.revenue - a.revenue)
    .map((v, i) => ({ ...v, rank: i + 1 }));

  const addons = Object.values(addMap)
    .map(a => ({ ...a, dishCount: a.foodItems.size, foodItemsList: [...a.foodItems].sort().join(', ') }))
    .sort((a, b) => b.revenue - a.revenue)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  return {
    variations,
    addons,
    meta: {
      totalOrders: filtered.length,
      uniqueVariations: variations.length,
      uniqueAddons: addons.length,
      fromDate,
      toDate,
    },
  };
};
