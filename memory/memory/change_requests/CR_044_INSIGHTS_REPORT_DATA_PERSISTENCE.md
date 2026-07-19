# CR-044 — Insights Module: Report Data Persistence Across Navigation (Shared Cache)

**Status:** REGISTERED — INTAKE COMPLETE
**Created:** 2026-06-12
**Type:** CR (Change Request)
**Area:** Insights Module / Reports / Navigation
**Priority:** P1 (UX performance — unnecessary API calls on every report switch)
**Sprint:** POS 4.0

---

## 1. Symptom

When navigating between Insights reports (e.g., Dashboard → Item Ledger → Order Ledger → back to Dashboard), **each navigation triggers a full data reload** even if the same date range was already fetched. The page unmounts, remounts, and calls the API again from scratch.

Example: User selects 1st March – 31st March on Dashboard report → navigates to Item Ledger → data loads again for default date range → user has to re-select March → another API call. Going back to Dashboard → yet another API call.

---

## 2. Root Cause

Each Insights report is a **separate React route** (e.g., `/reports-module/dashboard`, `/reports-module/items`, `/reports-module/order-ledger`). When React Router navigates between routes, the old component **unmounts** (destroying all local state including date range and fetched data) and the new component **mounts** fresh.

There is **no shared context, no cache layer, and no date persistence** across reports. Each report manages its own:
- `fromDate` / `toDate` / `appliedFrom` / `appliedTo` via `useState` (local, destroyed on unmount)
- Data fetch via `useReportFetch` hook (local, destroyed on unmount)
- API call to `order-logs-report` endpoint (re-fetched every mount)

**Key finding:** Multiple reports call the **same API endpoint** (`order-logs-report`) with the **same parameters** (`sort_by`, `from_date`, `to_date`). The raw response is the same — only the FE aggregation differs per report. This is the prime caching opportunity.

### Current architecture (no sharing):
```
Dashboard page (local state + local fetch)
Item Ledger page (local state + local fetch)  ← same API, re-fetched
Order Ledger page (local state + local fetch)  ← same API, re-fetched
Sales page (local state + local fetch)          ← same API, re-fetched
```

### Target architecture (Option B — shared cache):
```
InsightsCacheContext (shared)
  ├── dateRange: { from, to } (persisted across navigation)
  ├── cache: Map<cacheKey, { data, timestamp }>
  └── fetchOrReuse(reportType, dateRange) → returns cached or fetches

Dashboard page → reads from cache
Item Ledger page → reads from cache (same raw data, different aggregation)
Order Ledger page → reads from cache
Sales page → reads from cache
```

---

## 3. Owner Decision

| # | Decision | Answer |
|---|----------|--------|
| OD-1 | Approach | **Option B — Full cache context** (not just date persistence). Switching reports with same date range reuses cached data. |

---

## 4. Scope (preliminary — deep planning needed)

### New files (likely)
- `contexts/InsightsCacheContext.jsx` — shared context with cache Map + date range state
- OR extend existing `useReportFetch.js` with a cache layer

### Modified files (likely)
- All 9+ report pages that use `useReportFetch` — switch from local date state to shared context
- `useReportFetch.js` — add cache-aware fetch (check cache before API call)
- Possibly `App.js` — wrap Insights routes in `InsightsCacheProvider`

### Key design decisions (for planning phase)
- Cache key structure: `{rid}:{sortBy}:{fromDate}:{toDate}` — **MUST include restaurant_id** (R-9 security)
- Cache invalidation: time-based (split TTL — 60s for today, 5 min for historical) + manual (refresh button clears)
- Should raw API response be cached (pre-aggregation) or aggregated data (post-aggregation)?
- Multiple reports share `order-logs-report` with same params — cache at raw level means 1 API call serves Dashboard + Item Ledger + Sales + Cancellations

### Critical risks identified during deep planning (2026-06-12)

| # | Risk | Severity | Required Mitigation |
|---|------|----------|-------------------|
| R-8 | Cache survives logout — data leak between restaurants | **CRITICAL** | Clear `responseCache` on logout |
| R-9 | Cache key collision across restaurants | **CRITICAL** | Include `restaurant_id` in key |
| R-3 | Stale "today" data | **HIGH** | Split TTL: 60s for today, 5 min for historical |
| R-7 | Race condition (duplicate fetches) | **MEDIUM** | Store Promises in pending Map |
| R-10 | Products/categories permission | **MEDIUM** | DO NOT use MenuContext — keep API fetch |

Full risk analysis: `PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md` Risk Register.

---

## 5. Reports That Share the Same API

| Report | API Call | sort_by | Aggregation Service |
|--------|----------|---------|-------------------|
| Dashboard | `order-logs-report` × 3 (created_at + collect_bill + cancel lookback) + `tap-waiter-list` + `tab-settlements` | created_at + collect_bill | `insightsService.getDashboardAggregated` |
| Item Ledger | `order-logs-report` × 1 | created_at or collect_bill | `insightsService.getItemSalesAggregated` |
| Order Ledger | `order-logs-report` × 1-2 | created_at + collect_bill | `orderLedgerService.getOrderLedgerForRange` |
| Sales | Uses Dashboard aggregated data (subset) | — | `insightsService.getDashboardAggregated` |
| Payments | Own fetch pattern | — | Own service |
| Cancellations | `order-logs-report` × 1 | created_at | Direct API call in component |
| Settlement | `get-settlement-report` | — | `settlementReportService` |
| Prep/Serve Time | `order-logs-report` | created_at | Own aggregation |
| Room Orders | `order-logs-report` + room APIs | created_at | `roomOrdersService` |
| Food Court | `order-logs-report` | created_at | `foodCourtService` |

---

## 6. Gate Status

| Gate | Status |
|------|--------|
| 0 — Registration | ✅ COMPLETE |
| 1 — Intake | ✅ COMPLETE (this document) |
| 2 — Impact Analysis | ✅ COMPLETE (`PHASE_5_INSIGHTS_OPTIMIZATION_IMPACT_ANALYSIS.md`) |
| 3 — Implementation Plan | ✅ COMPLETE (`PHASE_5_INSIGHTS_OPTIMIZATION_IMPLEMENTATION_PLAN.md` Part 2) |
| 4 — Code Gate | PENDING — risk mitigations (R-3/R-7/R-8/R-9/R-10) must be addressed in implementation |
| 5 — Implementation + QA | PENDING |
| 6 — Owner Smoke | PENDING |

---

*CR-044 Intake — 2026-06-12. Updated 2026-06-12: Gate 2+3 refs added, critical risks R-8/R-9 surfaced, R-4 corrected (no MenuContext for reports).*
