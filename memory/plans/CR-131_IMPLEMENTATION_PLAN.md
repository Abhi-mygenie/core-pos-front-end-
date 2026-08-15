# CR-131 — Implementation Plan (Gate 3)

**ID:** CR-131
**Title:** Customer Intelligence (Beta) + Guest vs Registered (Beta) — CRM-enriched report screens
**Date:** 2026-08-06
**Author:** PLANNING agent
**Stage:** Gate 3 — Implementation Plan
**Depends on:** `impact/CR-131_IMPACT_ANALYSIS.md` (Gate 2, verified accurate before writing this plan)
**Risk:** MEDIUM
**Sprint:** pos_5_1

---

## GATE 4 GO RECORD

```
Gate 4 GO: APPROVED
Owner words: "read /memory/control/ and read agent alpha prompt choose implemnation plan for above CR follow gates and rules"
Date: 2026-08-06
```

---

## Entry Verification (run before touching any file)

```bash
# Confirm new files do not exist yet
ls /app/frontend/src/pages/reports-module/CustomerIntelligenceBeta* 2>/dev/null || echo "OK-NOT-EXISTS"
ls /app/frontend/src/pages/reports-module/GuestVsRegisteredBeta* 2>/dev/null    || echo "OK-NOT-EXISTS"
ls /app/frontend/src/api/services/crmReportService* 2>/dev/null                  || echo "OK-NOT-EXISTS"

# Confirm anchor lines in modified files still match
grep -n "CUSTOMER_ORDER_SUGGESTIONS" /app/frontend/src/api/constants.js          | head -3
grep -n "insights-customers-mix"      /app/frontend/src/components/layout/Sidebar.jsx | head -3
grep -n "CustomersMixMockup"          /app/frontend/src/App.js                   | head -3
```

Expected:
```
OK-NOT-EXISTS (×3)
constants.js:69:  CUSTOMER_ORDER_SUGGESTIONS: '/pos/customers/order-suggestions',
Sidebar.jsx:189:  { id: "insights-customers-mix", ...}
App.js:34:  import CustomersMixMockup ...
App.js:139: <Route path="customers-mix" ...>
```

If any line is missing or shifted → **STOP. Plan is stale. Return to PLANNING.**

---

## Scope Lock

**Files WILL change (6 files):**
1. `src/api/constants.js` — add 3 endpoint constants (additive)
2. `src/api/services/crmReportService.js` — **NEW** (3 fetch functions + 5-min TTL cache)
3. `src/pages/reports-module/CustomerIntelligenceBeta.jsx` — **NEW** (Screen 1)
4. `src/pages/reports-module/GuestVsRegisteredBeta.jsx` — **NEW** (Screen 2)
5. `src/components/layout/Sidebar.jsx` — 2 new sidebar entries (additive)
6. `src/App.js` — 2 imports + 2 routes (additive)

**Files WILL NOT touch:**
- `CustomersRfmMockup.jsx` — existing screen, untouched (owner directive OD-2)
- `CustomersMixMockup.jsx` — existing screen, untouched (owner directive OD-2)
- `crmAxios.js` — auth already handles X-API-Key, no changes needed
- `insightsService.js` — no changes needed
- `authService.js` — crmReportCache uses 5-min TTL; module Map auto-clears on page reload (logout navigates away)
- Any R5 hotspot files
- Any file under `/app/memory/final/`

---

## Execution Sequence

Execute **E1 → E2 → E3 → E4 → E5 → E6** in order.
E3 and E4 depend on E2 (import crmReportService). E5 and E6 depend on E3+E4 existing.

---

### E1 — `api/constants.js` — Add 3 CRM report endpoint constants

**Anchor (line 69):**
```js
  CUSTOMER_ORDER_SUGGESTIONS: '/pos/customers/order-suggestions',             // CRM: POST /pos/customers/order-suggestions
```

**Insert AFTER that line:**
```js
  // CR-131: CRM Report endpoints (CR-078 Phase 1 contract — GET only, X-API-Key auth)
  CRM_REPORT_SUMMARY:       '/pos/reports/summary',        // CR-131: restaurant snapshot (customers/lifecycle/tiers/revenue/loyalty)
  CRM_REPORT_TOP_CUSTOMERS: '/pos/reports/top-customers',  // CR-131: ?sort_by=total_spent|total_visits|total_points&limit=1-100
  CRM_REPORT_CHURN_RISK:    '/pos/reports/churn-risk',     // CR-131: ?band=high|medium&limit=1-200 — NO cache
```

**Verify:** `grep -n "CRM_REPORT_SUMMARY\|CRM_REPORT_TOP\|CRM_REPORT_CHURN" src/api/constants.js` → 3 hits

---

### E2 — `api/services/crmReportService.js` — NEW file

**Full file contents:**

```js
// CRM Report Service — CR-131
// Wraps CR-078 Phase 1 report endpoints: /summary, /top-customers, /churn-risk.
// Auth: X-API-Key via existing crmAxios interceptor (login crm_token, BUG-300 refresh).
// Cache: 5-min TTL for summary + top-customers. No cache for churn-risk (CR-078 §5.2).
// Note: cache is module-level Map — cleared on page reload (logout navigates away).

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';

// ── Simple 5-min TTL cache — separate from insightsCache (different TTL contract) ──
const _cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

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
 * @returns {Promise<Object>} data: { customers, lifecycle, tiers, revenue, loyalty, as_of }
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
 * Returns ranked customer list.
 * Cached 5 min per sort_by+limit combination.
 * @param {string} sortBy  - 'total_spent' | 'total_visits' | 'total_points' (default: 'total_spent')
 * @param {number} limit   - 1–100 (default: 20)
 * @returns {Promise<Object>} data: { customers[], total, sort_by }
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
 * Returns win-back target list by lifecycle band.
 * NOT cached — always fresh (CR-078 §5.2: stale win-back lists cause missed opportunities).
 * @param {string} band   - 'high' (at-risk) | 'medium' (dormant)
 * @param {number} limit  - 1–200 (default: 50)
 * @returns {Promise<Object>} data: { band, count, customers[] }
 *   IMPORTANT: data.count = full pool size before limit is applied.
 *   Use data.count for KPI badge — NOT customers.length.
 */
export const getChurnRisk = async (band = 'high', limit = 50) => { // CR-131
  const res = await crmApi.get(API_ENDPOINTS.CRM_REPORT_CHURN_RISK, {
    params: { band, limit },
  });
  if (!res.data?.success) throw new Error(res.data?.message || `CRM /churn-risk?band=${band} failed`);
  return res.data.data;
};

export default { getSummary, getTopCustomers, getChurnRisk, clearCrmReportCache };
```

**Verify:** `grep -n "CR-131\|getSummary\|getTopCustomers\|getChurnRisk" src/api/services/crmReportService.js` → ≥4 hits

---

### E3 — `pages/reports-module/CustomerIntelligenceBeta.jsx` — NEW file

**Full file contents:**

```jsx
/**
 * CustomerIntelligenceBeta — CR-131
 * CRM-enriched customer intelligence report.
 * Data: GET /api/pos/reports/{summary, top-customers, churn-risk} (CR-078 Phase 1).
 * No date range picker — CRM uses fixed windows (all-time / 30d / 7d).
 * Old screen (CustomersRfmMockup) is NOT touched.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { getSummary, getTopCustomers, getChurnRisk } from '../../api/services/crmReportService';
import { Users, TrendingUp, Star, AlertTriangle, RotateCcw } from 'lucide-react';

// CR-131: Tier badge styles — Platinum (not VIP), matches CRM contract
const TIER_STYLES = {
  Platinum: 'bg-violet-100 text-violet-700 border border-violet-200',
  Gold:     'bg-yellow-50  text-yellow-700 border border-yellow-200',
  Silver:   'bg-zinc-100   text-zinc-600   border border-zinc-300',
  Bronze:   'bg-amber-50   text-amber-700  border border-amber-200',
};
const tierBadge = (tier) => ( // CR-131
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[tier] || TIER_STYLES.Bronze}`}>
    {tier || 'Bronze'}
  </span>
);

// CR-131: lifecycle stage pill styles — NO day numbers (tenant-configurable thresholds)
const LC_STYLES = {
  new:     { bar: '#bfdbfe', text: 'text-blue-700',   label: 'New' },
  active:  { bar: '#86efac', text: 'text-emerald-700', label: 'Active' },
  at_risk: { bar: '#fde047', text: 'text-amber-700',   label: 'At Risk' },
  dormant: { bar: '#fca5a5', text: 'text-red-600',     label: 'Dormant' },
  churned: { bar: '#d4d4d8', text: 'text-zinc-500',    label: 'Churned' },
};

const SORT_OPTIONS = [
  { key: 'total_spent',  label: 'By Spend' },
  { key: 'total_visits', label: 'By Visits' },
  { key: 'total_points', label: 'By Points' },
];

const fmtINR = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;
const fmtDays = (d) => d == null ? '—' : d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`; // CR-131: last_visit_days_ago is nullable

const CustomerIntelligenceBeta = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  // Summary state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // Top customers state
  const [sortBy, setSortBy] = useState('total_spent');
  const [topData, setTopData] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [topError, setTopError] = useState(null);

  // Win-back state
  const [churnBand, setChurnBand] = useState('high');
  const [churnData, setChurnData] = useState({});     // { high: {...}, medium: {...} }
  const [churnLoading, setChurnLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null);
    try { setSummary(await getSummary()); setSummaryLoaded(true); }
    catch (e) { setSummaryError(e.message || 'Failed to load'); }
    finally { setSummaryLoading(false); }
  }, []);

  const loadTopCustomers = useCallback(async (sort) => {
    setTopLoading(true); setTopError(null);
    try { setTopData(await getTopCustomers(sort, 20)); }
    catch (e) { setTopError(e.message || 'Failed to load'); }
    finally { setTopLoading(false); }
  }, []);

  const loadChurnRisk = useCallback(async (band) => {
    setChurnLoading(true);
    try {
      const data = await getChurnRisk(band, 50);
      setChurnData(prev => ({ ...prev, [band]: data }));
    } catch (e) { /* silent — show empty state */ }
    finally { setChurnLoading(false); }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadTopCustomers(sortBy); }, [loadTopCustomers, sortBy]);
  useEffect(() => { loadChurnRisk(churnBand); }, [loadChurnRisk, churnBand]);

  const handleSortChange = (key) => { if (key !== sortBy) setSortBy(key); };
  const handleBandChange = (band) => { if (band !== churnBand) { setChurnBand(band); if (!churnData[band]) loadChurnRisk(band); } };

  const lc = summary?.lifecycle || {};
  const lcTotal = Object.values(lc).reduce((s, v) => s + (v || 0), 0) || 1;

  const activeChurn = churnData[churnBand]; // CR-131: data.count = full pool, not customers.length

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="customer-intel-beta-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={() => { loadSummary(); loadTopCustomers(sortBy); loadChurnRisk(churnBand); }}
        isRefreshing={summaryLoading} isOrderEntryOpen={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shrink-0" data-testid="customer-intel-beta-header">
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50" data-testid="customer-intel-beta-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Customer Intelligence</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200" data-testid="customer-intel-beta-badge">Beta</span>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">Source: CRM</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Lifecycle · tiers · revenue · top customers · win-back · data from CRM Phase 1</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg" data-testid="customer-intel-beta-window-note">
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            CRM uses fixed windows — date filter not applicable
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-5 bg-zinc-50">
          <ReportLoadingShield isLoading={summaryLoading} hasLoadedOnce={summaryLoaded} error={summaryError} onRetry={loadSummary}>

            {summary && (
              <>
                {/* KPI Strip — summary.customers + loyalty.points_outstanding */}
                <div className="grid grid-cols-4 gap-4" data-testid="customer-intel-beta-kpi-strip">
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-4 h-4 text-blue-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Registered</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-total">{(summary.customers?.total || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">customers.total</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-emerald-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Active (Last 30d)</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-active-30d">{(summary.customers?.active_30d || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">customers.active_30d</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="w-4 h-4 text-amber-500" /></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">New This Week</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-new-7d">{(summary.customers?.new_7d || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">customers.new_7d</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5">
                    <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Points Outstanding</span></div>
                    <div className="text-3xl font-extrabold text-zinc-950" data-testid="kpi-points">{(summary.loyalty?.points_outstanding || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-mono">loyalty.points_outstanding</div>
                  </div>
                </div>

                {/* Lifecycle + Tiers + Revenue */}
                <div className="grid grid-cols-5 gap-4">
                  {/* Lifecycle funnel — summary.lifecycle, NO day numbers */}
                  <div className="col-span-3 bg-white rounded-xl border border-zinc-200 p-6" data-testid="customer-intel-beta-lifecycle">
                    <div className="flex items-center justify-between mb-5">
                      <div><h2 className="text-sm font-semibold text-zinc-800">Customer Lifecycle</h2><p className="text-xs text-zinc-400 mt-0.5">Stage thresholds set per-restaurant in CRM settings</p></div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.lifecycle</span>
                    </div>
                    <div className="space-y-3">
                      {Object.entries(LC_STYLES).map(([key, cfg]) => {
                        const count = lc[key] || 0;
                        const pct = Math.round(count / lcTotal * 100);
                        return (
                          <div key={key} className="flex items-center gap-3" data-testid={`lifecycle-bar-${key}`}>
                            <span className={`w-20 text-[11px] font-bold px-2 py-1 rounded-md text-center ${cfg.text} bg-white border border-zinc-200`}>{cfg.label}</span>
                            <div className="flex-1 h-8 bg-zinc-100 rounded-lg overflow-hidden">
                              <div className="h-full rounded-lg flex items-center px-3" style={{ width: `${Math.max(pct, 4)}%`, background: cfg.bar, minWidth: 48 }} />
                            </div>
                            <span className="w-14 text-right text-sm font-bold text-zinc-800">{count.toLocaleString('en-IN')}</span>
                            <span className="w-10 text-right text-xs text-zinc-400">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tier distribution + Revenue */}
                  <div className="col-span-2 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-zinc-200 p-5 flex-1" data-testid="customer-intel-beta-tiers">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tier Distribution</h2>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.tiers</span>
                      </div>
                      <div className="space-y-2.5">
                        {[['platinum','bg-violet-500'],['gold','bg-yellow-400'],['silver','bg-zinc-400'],['bronze','bg-amber-400']].map(([t, barColor]) => {
                          const count = summary.tiers?.[t] || 0;
                          const total = Object.values(summary.tiers || {}).reduce((s, v) => s + v, 0) || 1;
                          const pct = Math.round(count / total * 100);
                          return (
                            <div key={t} className="flex items-center justify-between gap-3">
                              {tierBadge(t.charAt(0).toUpperCase() + t.slice(1))}
                              <div className="flex items-center gap-2 flex-1">
                                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                                </div>
                                <span className="text-sm font-bold text-zinc-800 w-16 text-right">{count.toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="customer-intel-beta-revenue">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Revenue</h2>
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.revenue</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide">All-Time Total</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.total)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide">Last 30 Days</div><div className="text-lg font-extrabold text-emerald-600">{fmtINR(summary.revenue?.revenue_30d)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide">All-Time AOV</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value)}</div></div>
                        <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide">30-Day AOV</div><div className="text-lg font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value_30d)}</div></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                        <span>Loyalty redemption</span>
                        <span className="font-bold text-emerald-600">{(summary.loyalty?.orders_with_redemption_pct || 0).toFixed(1)}% of orders</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Customers — /top-customers, sortable */}
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-testid="customer-intel-beta-top-customers">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800">Top Customers</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">sort_by: {sortBy} · limit: 20 · GET /api/pos/reports/top-customers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Sort toggle — wires directly to sort_by param */}
                      <div className="flex items-center bg-zinc-100 rounded-lg p-1 gap-1" data-testid="top-customers-sort-toggle">
                        {SORT_OPTIONS.map(({ key, label }) => (
                          <button key={key} onClick={() => handleSortChange(key)} disabled={topLoading}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${sortBy === key ? 'bg-[#F26B33] text-white' : 'text-zinc-600 hover:bg-zinc-200'}`}
                            data-testid={`sort-btn-${key}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">CRM</span>
                    </div>
                  </div>
                  {topLoading ? (
                    <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
                  ) : topError ? (
                    <div className="p-8 text-center text-red-500 text-sm">{topError}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">#</th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tier</th>
                            <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Visits</th>
                            <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Spent</th>
                            <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Avg Order</th>
                            <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Last Visit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(topData?.customers || []).map((c, i) => (
                            <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`top-customer-row-${i}`}>
                              <td className="px-5 py-3 text-sm font-bold text-zinc-400">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div>
                                <div className="text-xs text-zinc-400">{c.phone || '—'}</div>
                              </td>
                              <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-700">{c.total_visits}</td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-zinc-900">{fmtINR(c.total_spent)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-600">{fmtINR(c.avg_order_value)}</td>
                              <td className="px-4 py-3 text-sm text-right text-zinc-500">{fmtDays(c.last_visit_days_ago)}</td>
                            </tr>
                          ))}
                          {!topData?.customers?.length && (
                            <tr><td colSpan={7} className="py-12 text-center text-zinc-400 text-sm">No customers found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Win-Back — /churn-risk, two bands */}
                <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden" data-testid="customer-intel-beta-winback">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-800">Win-Back Action List</h2>
                      <p className="text-xs text-zinc-400 mt-0.5">GET /api/pos/reports/churn-risk · no cache · band counts = full pool before limit</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">CRM — always fresh</span>
                  </div>
                  <div className="flex border-b border-zinc-100">
                    <button onClick={() => handleBandChange('high')} data-testid="winback-band-high"
                      className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${churnBand === 'high' ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-400' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      At Risk
                      {/* CR-131: use data.count (full pool), not customers.length */}
                      {churnData.high && <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">{(churnData.high.count || 0).toLocaleString('en-IN')}</span>}
                    </button>
                    <button onClick={() => handleBandChange('medium')} data-testid="winback-band-medium"
                      className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${churnBand === 'medium' ? 'bg-red-50 text-red-700 border-b-2 border-red-400' : 'text-zinc-500 hover:bg-zinc-50'}`}>
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      Dormant
                      {churnData.medium && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full ml-1">{(churnData.medium.count || 0).toLocaleString('en-IN')}</span>}
                    </button>
                  </div>
                  {churnLoading ? (
                    <div className="p-8 text-center text-zinc-400 text-sm">Loading...</div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tier</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Days Since Visit</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Spent</th>
                          <th className="px-4 py-3 text-right text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Visits</th>
                          <th className="px-5 py-3 text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">WhatsApp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeChurn?.customers || []).map((c, i) => (
                          <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`winback-row-${i}`}>
                            <td className="px-5 py-3">
                              <div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div>
                              <div className="text-xs text-zinc-400">{c.phone || '—'}</div>
                            </td>
                            <td className="px-4 py-3">{tierBadge(c.tier)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-amber-600">{c.last_visit_days_ago != null ? `${c.last_visit_days_ago}d` : '—'}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-zinc-900">{fmtINR(c.total_spent)}</td>
                            <td className="px-4 py-3 text-sm text-right text-zinc-600">{c.total_visits}</td>
                            <td className="px-5 py-3 text-center">
                              {c.phone && (
                                <button
                                  onClick={() => window.open(`https://wa.me/91${c.phone}`, '_blank')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                  style={{ background: '#25D366' }}
                                  data-testid={`winback-wa-btn-${i}`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  WA
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {!activeChurn?.customers?.length && !churnLoading && (
                          <tr><td colSpan={6} className="py-12 text-center text-zinc-400 text-sm">No customers in this band</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                  {activeChurn && activeChurn.count > (activeChurn.customers?.length || 0) && (
                    <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-400 flex items-center justify-between">
                      <span>Showing {activeChurn.customers?.length} of {activeChurn.count.toLocaleString('en-IN')} · sorted oldest-visit-first</span>
                      <button onClick={() => loadChurnRisk(churnBand)} className="flex items-center gap-1 text-[#F26B33] font-medium hover:underline" data-testid="winback-refresh-btn">
                        <RotateCcw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default CustomerIntelligenceBeta;
```

**Verify:** `grep -n "CR-131\|data\.count\|last_visit_days_ago\|Platinum\|WA\|clearCrmReport" src/pages/reports-module/CustomerIntelligenceBeta.jsx` → ≥5 hits

---

### E4 — `pages/reports-module/GuestVsRegisteredBeta.jsx` — NEW file

```jsx
/**
 * GuestVsRegisteredBeta — CR-131
 * Customer lifecycle + win-back action screen — CRM-enriched.
 * Data: GET /api/pos/reports/summary + /churn-risk (both bands).
 * No date range picker — CRM uses fixed windows.
 * Old screen (CustomersMixMockup) is NOT touched.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import { getSummary, getChurnRisk } from '../../api/services/crmReportService';

// CR-131: tier badge (same helper as CustomerIntelligenceBeta)
const TIER_STYLES = {
  Platinum: 'bg-violet-100 text-violet-700 border border-violet-200',
  Gold:     'bg-yellow-50  text-yellow-700 border border-yellow-200',
  Silver:   'bg-zinc-100   text-zinc-600   border border-zinc-300',
  Bronze:   'bg-amber-50   text-amber-700  border border-amber-200',
};
const tierBadge = (tier) => (
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[tier] || TIER_STYLES.Bronze}`}>
    {tier || 'Bronze'}
  </span>
);

// CR-131: lifecycle stage config — NO day numbers in labels (tenant-configurable)
const LC = [
  { key: 'new',     label: 'New',     bg: '#dbeafe', textColor: '#1d4ed8', desc: 'First-timers & recent sign-ups' },
  { key: 'active',  label: 'Active',  bg: '#dcfce7', textColor: '#15803d', desc: 'Engaged, returning regulars' },
  { key: 'at_risk', label: 'At Risk', bg: '#fef9c3', textColor: '#854d0e', desc: 'Win-back window open — act now' },
  { key: 'dormant', label: 'Dormant', bg: '#fee2e2', textColor: '#b91c1c', desc: 'Going cold — last chance' },
  { key: 'churned', label: 'Churned', bg: '#f4f4f5', textColor: '#52525b', desc: 'Unlikely to return without campaign' },
];

const fmtINR = (n) => `₹${(parseFloat(n) || 0).toLocaleString('en-IN')}`;

const GuestVsRegisteredBeta = () => {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // CR-131: load both bands upfront for this screen
  const [churnHigh, setChurnHigh] = useState(null);
  const [churnMedium, setChurnMedium] = useState(null);
  const [churnLoading, setChurnLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setSummaryLoading(true); setSummaryError(null); setChurnLoading(true);
    try {
      const [s, ch, cm] = await Promise.all([
        getSummary(),
        getChurnRisk('high', 50),
        getChurnRisk('medium', 50),
      ]);
      setSummary(s); setSummaryLoaded(true);
      setChurnHigh(ch); setChurnMedium(cm);
    } catch (e) { setSummaryError(e.message || 'Failed to load'); }
    finally { setSummaryLoading(false); setChurnLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const lc = summary?.lifecycle || {};
  const lcTotal = Object.values(lc).reduce((s, v) => s + (v || 0), 0) || 1;

  const WaButton = ({ phone, testId }) => !phone ? null : (
    <button
      onClick={() => window.open(`https://wa.me/91${phone}`, '_blank')}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold text-white"
      style={{ background: '#25D366' }}
      data-testid={testId}>
      WA
    </button>
  );

  return (
    <div className="flex h-screen bg-white font-sans" data-testid="gvr-beta-page">
      <Sidebar
        isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded}
        isSilentMode={isSilentMode} setIsSilentMode={setIsSilentMode}
        onOpenSettings={() => {}} onOpenMenu={() => {}} onOpenCredit={() => {}}
        onRefresh={loadAll} isRefreshing={summaryLoading} isOrderEntryOpen={false}
      />
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-8 py-4 flex items-center justify-between shrink-0" data-testid="gvr-beta-header">
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50" data-testid="gvr-beta-back-btn" onClick={() => navigate('/reports-module/dashboard')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Guest vs Registered</h1>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 border border-violet-200" data-testid="gvr-beta-badge">Beta</span>
                <span className="text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">POS + CRM</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Lifecycle stages · engagement depth · win-back bands</p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg">
            CRM uses fixed windows — date filter not applicable
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-5 bg-zinc-50">
          <ReportLoadingShield isLoading={summaryLoading} hasLoadedOnce={summaryLoaded} error={summaryError} onRetry={loadAll}>
            {summary && (
              <>
                {/* Hero: Lifecycle funnel — summary.lifecycle */}
                <div className="bg-white rounded-xl border border-zinc-200 p-7" data-testid="gvr-beta-lifecycle-funnel">
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <h2 className="text-base font-bold text-zinc-900">Customer Journey — Where Are Your Registered Customers?</h2>
                      <p className="text-xs text-zinc-400 mt-1">summary.lifecycle · stage thresholds set in CRM tenant settings · never hardcoded</p>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.lifecycle</span>
                  </div>
                  <div className="space-y-2">
                    {LC.map(({ key, label, bg, textColor, desc }) => {
                      const count = lc[key] || 0;
                      const pct = Math.round(count / lcTotal * 100);
                      const isActionable = key === 'at_risk' || key === 'dormant';
                      return (
                        <div key={key}>
                          <div className="flex items-stretch gap-5">
                            <div className="w-28 shrink-0 flex flex-col justify-center">
                              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>{label}</div>
                              <div className="text-[10px] text-zinc-400 mt-0.5">summary.lifecycle.{key}</div>
                            </div>
                            <div className="flex-1 flex items-center">
                              <div className="h-14 rounded-xl flex items-center justify-between px-5 w-full" style={{ background: bg }}>
                                <span className="text-2xl font-extrabold" style={{ color: textColor }} data-testid={`lc-count-${key}`}>
                                  {count.toLocaleString('en-IN')}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold" style={{ color: textColor }}>{pct}% of base</span>
                                  <span className="text-[10px] bg-white/70 font-semibold px-2.5 py-1 rounded-full" style={{ color: textColor }}>{desc}</span>
                                  {isActionable && (
                                    <span className="text-[10px] font-bold text-white px-3 py-1 rounded-lg" style={{ background: '#F26B33' }}>
                                      {key === 'at_risk' ? 'See Win-Back ↓' : 'See Dormant ↓'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {key !== 'churned' && (
                            <div className="ml-28 pl-5 text-[10px] text-zinc-300 flex items-center gap-1 py-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                              {key === 'new' && 'Customers who return become Active'}
                              {key === 'active' && "Haven't visited recently → slip to At Risk"}
                              {key === 'at_risk' && 'Going cold — last chance before permanent churn'}
                              {key === 'dormant' && 'Exceeded churn threshold — very hard to recover'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center gap-8 text-xs text-zinc-400">
                    <span>Total registered: <strong className="text-zinc-700">{(summary.customers?.total || 0).toLocaleString('en-IN')}</strong></span>
                    <span>Healthy (New + Active): <strong className="text-emerald-600">{((lc.new || 0) + (lc.active || 0)).toLocaleString('en-IN')}</strong></span>
                    <span>Win-back opportunity: <strong className="text-amber-600">{((lc.at_risk || 0) + (lc.dormant || 0)).toLocaleString('en-IN')}</strong></span>
                    <span className="ml-auto text-[10px] italic text-zinc-300">Stage labels stable · day thresholds vary per tenant</span>
                  </div>
                </div>

                {/* Insight cards row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-aov-trend">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Order Value Trend</h2>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.revenue</span>
                    </div>
                    <div className="space-y-4">
                      <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">All-Time AOV</div><div className="text-3xl font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value)}</div><div className="text-xs text-zinc-400">{(summary.revenue?.total_orders || 0).toLocaleString('en-IN')} total orders tracked</div></div>
                      <div className="w-full h-px bg-zinc-100" />
                      <div><div className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">30-Day AOV</div><div className="text-3xl font-extrabold text-zinc-900">{fmtINR(summary.revenue?.avg_order_value_30d)}</div></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-redemption">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loyalty Engagement</h2>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.loyalty</span>
                    </div>
                    <div className="flex flex-col items-center justify-center h-28">
                      <div className="relative w-20 h-20">
                        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#f4f4f5" strokeWidth="4"/>
                          <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="#329937" strokeWidth="4"
                            strokeDasharray={`${Math.min(summary.loyalty?.orders_with_redemption_pct || 0, 100)} ${100 - Math.min(summary.loyalty?.orders_with_redemption_pct || 0, 100)}`} strokeDashoffset="0"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-extrabold text-zinc-900">{(summary.loyalty?.orders_with_redemption_pct || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 mt-2 text-center">of orders use loyalty redemption</div>
                    </div>
                    <div className="pt-3 border-t border-zinc-100 text-xs text-zinc-400 font-mono text-center">loyalty.orders_with_redemption_pct</div>
                  </div>
                  <div className="bg-white rounded-xl border border-zinc-200 p-5" data-testid="gvr-beta-points">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Points Outstanding</h2>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">summary.loyalty</span>
                    </div>
                    <div className="text-4xl font-extrabold text-zinc-900">{(summary.loyalty?.points_outstanding || 0).toLocaleString('en-IN')}</div>
                    <div className="text-xs text-zinc-400 mt-1">points held across all members</div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="text-xs text-amber-700 font-semibold">Liability (at ₹0.10/pt)</div>
                      <div className="text-lg font-bold text-amber-800">{fmtINR((summary.loyalty?.points_outstanding || 0) * 0.10)}</div>
                    </div>
                  </div>
                </div>

                {/* Win-back: both bands side-by-side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* At Risk — band=high, data.count = full pool */}
                  <div className="bg-white rounded-xl border border-amber-200 overflow-hidden" data-testid="gvr-beta-winback-high">
                    <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                        <span className="text-sm font-bold text-amber-800">At Risk</span>
                        {/* CR-131: data.count = full pool before limit */}
                        {churnHigh && <span className="text-xs font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{(churnHigh.count || 0).toLocaleString('en-IN')} total</span>}
                      </div>
                      <span className="text-[10px] text-amber-500 font-mono">band=high</span>
                    </div>
                    {churnLoading ? <div className="p-6 text-center text-zinc-400 text-xs">Loading...</div> : (
                      <table className="w-full">
                        <thead className="bg-zinc-50"><tr>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Customer</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Tier</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Days</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Spent</th>
                          <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-400 uppercase">WA</th>
                        </tr></thead>
                        <tbody>
                          {(churnHigh?.customers || []).map((c, i) => (
                            <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`gvr-high-row-${i}`}>
                              <td className="px-4 py-2.5"><div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div><div className="text-xs text-zinc-400">{c.phone || '—'}</div></td>
                              <td className="px-3 py-2.5">{tierBadge(c.tier)}</td>
                              <td className="px-3 py-2.5 text-xs text-right font-bold text-amber-600">{c.last_visit_days_ago != null ? `${c.last_visit_days_ago}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-right font-semibold">{fmtINR(c.total_spent)}</td>
                              <td className="px-3 py-2.5 text-center"><WaButton phone={c.phone} testId={`gvr-high-wa-${i}`} /></td>
                            </tr>
                          ))}
                          {!churnHigh?.customers?.length && <tr><td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">No at-risk customers</td></tr>}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Dormant — band=medium */}
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden" data-testid="gvr-beta-winback-medium">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                        <span className="text-sm font-bold text-red-700">Dormant</span>
                        {churnMedium && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{(churnMedium.count || 0).toLocaleString('en-IN')} total</span>}
                      </div>
                      <span className="text-[10px] text-red-400 font-mono">band=medium</span>
                    </div>
                    {churnLoading ? <div className="p-6 text-center text-zinc-400 text-xs">Loading...</div> : (
                      <table className="w-full">
                        <thead className="bg-zinc-50"><tr>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Customer</th>
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-400 uppercase">Tier</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Days</th>
                          <th className="px-3 py-2 text-right text-[10px] font-semibold text-zinc-400 uppercase">Spent</th>
                          <th className="px-3 py-2 text-center text-[10px] font-semibold text-zinc-400 uppercase">WA</th>
                        </tr></thead>
                        <tbody>
                          {(churnMedium?.customers || []).map((c, i) => (
                            <tr key={c.customer_id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors" data-testid={`gvr-medium-row-${i}`}>
                              <td className="px-4 py-2.5"><div className="text-sm font-medium text-zinc-800">{c.name || '—'}</div><div className="text-xs text-zinc-400">{c.phone || '—'}</div></td>
                              <td className="px-3 py-2.5">{tierBadge(c.tier)}</td>
                              <td className="px-3 py-2.5 text-xs text-right font-bold text-red-500">{c.last_visit_days_ago != null ? `${c.last_visit_days_ago}d` : '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-right font-semibold">{fmtINR(c.total_spent)}</td>
                              <td className="px-3 py-2.5 text-center"><WaButton phone={c.phone} testId={`gvr-medium-wa-${i}`} /></td>
                            </tr>
                          ))}
                          {!churnMedium?.customers?.length && <tr><td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">No dormant customers</td></tr>}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </ReportLoadingShield>
        </main>
      </div>
    </div>
  );
};

export default GuestVsRegisteredBeta;
```

**Verify:** `grep -n "CR-131\|data\.count\|last_visit_days_ago\|band=high\|band=medium" src/pages/reports-module/GuestVsRegisteredBeta.jsx` → ≥4 hits

---

### E5 — `Sidebar.jsx` — Add 2 new sidebar entries

**Anchor (line 189):**
```js
      { id: "insights-customers-mix", label: "Guest vs Registered", path: "/reports-module/customers-mix" },
```

**Insert AFTER that line:**
```js
      { id: "insights-customers-intel-beta", label: "Customer Intelligence (Beta)", path: "/reports-module/customers-intel-beta" }, // CR-131
      { id: "insights-customers-gvr-beta", label: "Guest vs Registered (Beta)", path: "/reports-module/customers-gvr-beta" }, // CR-131
```

**Verify:** `grep -n "customers-intel-beta\|customers-gvr-beta\|CR-131" src/components/layout/Sidebar.jsx` → 2–3 hits

---

### E6 — `App.js` — Add 2 imports + 2 routes

**Anchor A (line 34):**
```js
import CustomersMixMockup from "./pages/reports-module/CustomersMixMockup"; // CR-011 S37
```

**Insert AFTER that line:**
```js
import CustomerIntelligenceBeta from "./pages/reports-module/CustomerIntelligenceBeta"; // CR-131
import GuestVsRegisteredBeta from "./pages/reports-module/GuestVsRegisteredBeta"; // CR-131
```

**Anchor B (line 139):**
```js
              <Route path="customers-mix" element={<ProtectedRoute><CustomersMixMockup /></ProtectedRoute>} />
```

**Insert AFTER that line:**
```js
              <Route path="customers-intel-beta" element={<ProtectedRoute><CustomerIntelligenceBeta /></ProtectedRoute>} /> {/* CR-131 */}
              <Route path="customers-gvr-beta" element={<ProtectedRoute><GuestVsRegisteredBeta /></ProtectedRoute>} /> {/* CR-131 */}
```

**Verify:** `grep -n "CustomerIntelligenceBeta\|GuestVsRegisteredBeta\|customers-intel-beta\|customers-gvr-beta" src/App.js` → 4 hits

---

## Checkpoint After All Edits

```
✅ E1 — constants.js: 3 CRM_REPORT_* constants added
✅ E2 — crmReportService.js: NEW file with getSummary, getTopCustomers, getChurnRisk, clearCrmReportCache
✅ E3 — CustomerIntelligenceBeta.jsx: NEW file, data-testids present
✅ E4 — GuestVsRegisteredBeta.jsx: NEW file, data-testids present
✅ E5 — Sidebar.jsx: 2 new entries after customers-mix
✅ E6 — App.js: 2 imports + 2 routes after existing customer screens
✅ Compile: webpack 0 new warnings
```

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | E5/E6 anchors shifted due to other merged commits | Entry Verification grep must pass before coding; if shifted, find new line and update |
| R2 | crmApi import path wrong in crmReportService.js | Path is `../crmAxios` (confirmed from couponService.js and customerService.js — same directory) |
| R3 | `data.count` vs `customers.length` | Plan explicitly uses `churnData.count` in all badge displays — code review check V5 |
| R4 | `last_visit_days_ago` null crash | All usages null-check: `c.last_visit_days_ago != null` before accessing |
| R5 | Tier "VIP" appears anywhere | grep "VIP" in new files must return 0 hits |
| R6 | Day numbers in lifecycle labels | grep "30 day\|60 day\|90 day\|31 day" in new files must return 0 hits |
| R7 | Old screens broken | regression V8: CustomersRfmMockup + CustomersMixMockup render unchanged |

---

## Verification Matrix (Gate 5a — Self-Test)

| # | Check | Command / Method | Expected |
|---|-------|-----------------|---------|
| V1 | 3 endpoint constants added | `grep -n "CRM_REPORT_" src/api/constants.js` | 3 hits |
| V2 | crmReportService exports | `grep -n "export const" src/api/services/crmReportService.js` | 4 exports |
| V3 | No VIP in new files | `grep -r "VIP" src/pages/reports-module/CustomerIntelligenceBeta.jsx src/pages/reports-module/GuestVsRegisteredBeta.jsx` | 0 hits |
| V4 | No hardcoded day numbers | `grep -rn "30 day\|60 day\|90 day\|31.60\|61.90" src/pages/reports-module/CustomerIntelligenceBeta.jsx src/pages/reports-module/GuestVsRegisteredBeta.jsx` | 0 hits |
| V5 | data.count used for badge | `grep -n "\.count" src/pages/reports-module/CustomerIntelligenceBeta.jsx` | hits use `churnData[band].count` or `churnHigh.count` etc |
| V6 | last_visit_days_ago null-guarded | `grep -n "last_visit_days_ago" src/pages/reports-module/CustomerIntelligenceBeta.jsx` | uses `!= null` guard |
| V7 | Sidebar 2 new entries | `grep -n "customers-intel-beta\|customers-gvr-beta" src/components/layout/Sidebar.jsx` | 2 hits |
| V8 | App.js 4 new lines | `grep -n "CustomerIntelligenceBeta\|GuestVsRegisteredBeta" src/App.js` | 4 hits |
| V9 | Old screens unchanged | `grep -c "CR-131" src/pages/reports-module/CustomersRfmMockup.jsx src/pages/reports-module/CustomersMixMockup.jsx` | 0 hits |
| V10 | Compile clean | `tail -5 /var/log/supervisor/frontend.out.log` | "compiled" + 0 new warnings |
| V11 | Screen 1 loads via route | Browser: navigate to `/reports-module/customers-intel-beta` | page renders, KPI cards visible |
| V12 | Sort toggle changes network call | Browser → Network tab: By Visits → `sort_by=total_visits` in request params | confirmed |
| V13 | Win-back badge = data.count | Browser: check badge number vs table row count | badge > rows possible (full pool vs limited list) |
| V14 | WhatsApp link | Browser: click WA button → `wa.me/91{phone}` opens | correct |
| V15 | Screen 2 loads via route | Browser: navigate to `/reports-module/customers-gvr-beta` | lifecycle funnel renders |

---

## Post-Code Registry Checklist (EXIT GATE)

```
□ 1. REGISTRY SYNC:
     python3 -c "
     import json
     with open('/app/memory/control/registry.json') as f: d = json.load(f)
     items = {i['id']: i for i in d['items']}
     assert 'CR-131' in items, 'CR-131 MISSING'
     assert 'IMPLEMENTED' in items['CR-131'].get('status',''), 'CR-131 not IMPLEMENTED'
     assert items['CR-131'].get('sprint_key') == 'pos_5_1', 'wrong sprint'
     print('✅ Registry PASS')
     "

□ 2. CR_REGISTRY.md: CR-131 row → status IMPLEMENTED — Gate 5a <date>

□ 3. FILE_OWNERSHIP.md: Add 6 rows for all changed/created files with CR-131 + date

□ 4. CODE MARKERS: grep -rn "CR-131" src/api/constants.js src/api/services/crmReportService.js
     src/pages/reports-module/CustomerIntelligenceBeta.jsx
     src/pages/reports-module/GuestVsRegisteredBeta.jsx
     src/components/layout/Sidebar.jsx src/App.js
     → ≥8 hits across 6 files

□ 5. COMPILE CHECK: webpack 0 new warnings
```

---

## QA Handover Template (seed)

```markdown
## 1. Verification Matrix Results (V1–V15)
## 2. Regression Tests
   R1: CustomersRfmMockup still loads at /customers-rfm — unchanged
   R2: CustomersMixMockup still loads at /customers-mix — unchanged
   R3: crmAxios 401 auto-refresh still fires on token expiry (BUG-300 regression)
## 3. Registry Sync Confirmation
   Registry synced: YES | Item: CR-131 | Sprint: pos_5_1 | EXIT GATE: 5/5
## 4. Credentials + Environment
   Account: owner@kunafamahal.com / Qplazm@10 (or any restaurant with CRM enabled)
   CRM base: https://crm.mygenie.online
   App: https://pos-react-preview-3.preview.emergentagent.com
```
