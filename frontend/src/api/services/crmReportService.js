// CRM Report Service — CR-131
// Wraps CR-078 Phase 1 report endpoints: /summary, /top-customers, /churn-risk.
// Auth: X-API-Key via existing crmAxios interceptor (login crm_token, BUG-300 refresh).
// Cache: 5-min TTL for summary + top-customers. No cache for churn-risk (CR-078 §5.2).

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

// ── Simple 5-min TTL cache — separate from insightsCache (different TTL contract) ──
const _cache = new Map();
const TTL_MS = 5 * 60 * 1000;

const _getCached = (key) => {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) { _cache.delete(key); return null; }
  return entry.data;
};
const _setCached = (key, data) => _cache.set(key, { data, ts: Date.now() });

/** Clear all cached CRM report data (call on logout or manual refresh). */
export const clearCrmReportCache = () => _cache.clear(); // CR-131

// ── Endpoints ────────────────────────────────────────────────────────────────

/**
 * GET /api/pos/reports/summary
 * Returns restaurant-wide CRM snapshot: customers, lifecycle, tiers, revenue, loyalty.
 * Cached 5 min.
 */
export const getSummary = async () => { // CR-131
  const key = 'crm-summary';
  const cached = _getCached(key);
  if (cached) return cached;
  const res = await crmApi.get(API_ENDPOINTS.CRM_REPORT_SUMMARY);
  if (!res.data?.success) throw new Error(res.data?.message || 'CRM /summary failed');
  _setCached(key, res.data.data);
  return res.data.data;
};

/**
 * GET /api/pos/reports/top-customers
 * Cached 5 min per sort_by+limit combination.
 * @param {string} sortBy  - 'total_spent' | 'total_visits' | 'total_points'
 * @param {number} limit   - 1–100 (default 20)
 */
export const getTopCustomers = async (sortBy = 'total_spent', limit = 20) => { // CR-131
  const key = `crm-top-customers-${sortBy}-${limit}`;
  const cached = _getCached(key);
  if (cached) return cached;
  const res = await crmApi.get(API_ENDPOINTS.CRM_REPORT_TOP_CUSTOMERS, {
    params: { sort_by: sortBy, limit },
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'CRM /top-customers failed');
  _setCached(key, res.data.data);
  return res.data.data;
};

/**
 * GET /api/pos/reports/churn-risk
 * NOT cached — always fresh (CR-078 §5.2).
 * IMPORTANT: data.count = full pool before limit. Use data.count for KPI badge.
 * @param {string} band   - 'high' (at-risk) | 'medium' (dormant)
 * @param {number} limit  - 1–200 (default 50)
 */
export const getChurnRisk = async (band = 'high', limit = 50) => { // CR-131
  const res = await crmApi.get(API_ENDPOINTS.CRM_REPORT_CHURN_RISK, {
    params: { band, limit },
  });
  if (!res.data?.success) throw new Error(res.data?.message || `CRM /churn-risk?band=${band} failed`);
  return res.data.data;
};

export default { getSummary, getTopCustomers, getChurnRisk, clearCrmReportCache };
