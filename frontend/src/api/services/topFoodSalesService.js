// topFoodSalesService.js — CR-136
//
// Fetches the backend-aggregated item sales report.
// Endpoint: POST /api/v1/vendoremployee/top-food%20sales-report
//
// IMPORTANT:
//   - ALL response numeric fields (root + row-level) are STRINGS — parseFloat() mandatory
//   - Payload uses { from, to } NOT { from_date, to_date }
//   - No businessDay filtering needed — backend applies it (response has adjusted from/to)
//   - No batching — single call handles any date range
//   - Backend pre-sorts rows by total_sales DESC — rank = index + 1

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { buildCacheKey, fetchOrReuse } from './insightsCache';

// ── Row transform ─────────────────────────────────────────────────────────────
// All API numeric fields are strings. parseFloat() + || 0 on every one.
export const parseTopFoodSalesRow = (r, index) => {
  const basePrice       = parseFloat(r.item_price)          || 0;
  const variationPrice  = parseFloat(r.variation_price)     || 0;
  const addonPrice      = parseFloat(r.addon_price)         || 0;
  const gst             = parseFloat(r.gst)                 || 0;
  const vat             = parseFloat(r.vat)                 || 0;
  const serviceCharge   = parseFloat(r.service_charge)      || 0;
  const discount        = parseFloat(r.discount)            || 0;
  const compPrice       = parseFloat(r.complementary_price) || 0;
  const netSales        = parseFloat(r.total_sales)         || 0;
  const totalQuantity   = parseFloat(r.total_quantity)      || 0;

  const grossRevenue    = basePrice + variationPrice + addonPrice;  // derived
  const subTotal        = grossRevenue - discount;                   // derived

  return {
    rank:            index + 1,                                      // 1-based, highest netSales first
    foodItem:        r.food_item        || '',
    stationName:     r.station_name     || '',
    categoryName:    r.category_name    || '',
    isComplementary: (r.complementary_status || '') === 'Yes', // field absent on some restaurant backends → defaults to false
    totalQuantity,
    basePrice,
    variationPrice,
    addonPrice,
    grossRevenue,
    discount,
    subTotal,
    gst,
    vat,
    serviceCharge,
    compPrice,
    netSales,
    pctOfTotal: 0,   // injected by component once grandTotal is known
  };
};

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Fetch item sales report for a date range.
 * Single API call — no batching, no date range limit.
 *
 * @param {string} fromDate     YYYY-MM-DD
 * @param {string} toDate       YYYY-MM-DD
 * @param {number} restaurantId from restaurant context (for cache key)
 * @returns {Promise<{ rows, grandTotal, apiFrom, apiTo }>}
 */
export const getTopFoodSalesForRange = async (fromDate, toDate, restaurantId = 0) => {
  if (!fromDate || !toDate) return { rows: [], grandTotal: 0, apiFrom: '', apiTo: '' };

  // NOTE: fetchOrReuse caches and returns only the `data` field (the raw array).
  // Extra root fields (grandTotal, apiFrom, apiTo) are NOT returned by fetchOrReuse.
  const rawData = await fetchOrReuse(
    buildCacheKey(restaurantId, 'top-food-sales', '', fromDate, toDate),
    async () => {
      const resp = await api.post(API_ENDPOINTS.TOP_FOOD_SALES_REPORT, {
        from: fromDate,   // NOTE: 'from' not 'from_date' — different from order-logs-report
        to:   toDate,     // NOTE: 'to'   not 'to_date'
      });
      const data = resp.data?.food_sales_report || [];
      return { data, orderCount: data.length };
    }
  );

  // rawData is the bare food_sales_report array (returned by fetchOrReuse)
  // Filter out 'check in' items — room check-in charges, not food (BUG-133 pattern)
  const rows = (rawData || [])
    .filter(r => (r.food_item || '').toLowerCase().trim() !== 'check in')
    .map(parseTopFoodSalesRow);
  const grandTotal = rows.reduce((s, r) => s + r.netSales, 0);

  return {
    rows,
    grandTotal,
    apiFrom: '',
    apiTo:   '',
  };
};
