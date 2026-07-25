# CR-049 — Insights Module: Migrate from Client-Side Aggregation to Backend Aggregation Endpoints

**Created:** 2026-06-15
**Status:** INTAKE COMPLETE
**Priority:** P1 (performance — current architecture cannot scale beyond 2-week date ranges)
**Area:** Insights / Reports Module
**Sprint:** POS 5.0
**Type:** CR (migration — replace FE aggregation with backend endpoints)

---

## 1. Problem Statement

The Insights module currently downloads **raw order data** from `order-logs-report` and computes all aggregations client-side via `insightsService.js` (1079 lines of aggregation logic). This worked for small volumes but doesn't scale:

| Date Range | Current (FE aggregation) | After (backend endpoints) |
|-----------|:------------------------:|:------------------------:|
| 1 week | 10 MB, 8-36 calls, 3-5s | ~50 KB, 4 calls, <1s |
| 1 month | 37.5 MB, 32-36 calls, 15-60s | ~215 KB, 4 calls, <1s |
| 3 months | ~110 MB, timeout | ~300 KB, 4 calls, <1s |
| 1 year | ~450 MB, impossible | ~500 KB, 4 calls, <1s |

Backend has delivered 4 new server-side aggregation endpoints that return pre-computed summaries. **FE must wire to these endpoints instead of computing everything locally.**

## 2. What Backend Has Delivered

| # | Endpoint | Status | Schema | Contract Section |
|---|----------|:------:|:------:|:----------------:|
| 1 | `POST insights-dashboard` | ✅ LIVE | ✅ 10/10 groups match | §3.1 |
| 2 | `POST insights-sales` | ✅ LIVE | ✅ 5/5 sections, 12/12 fields | §3.2 |
| 3 | `POST insights-items` | ✅ LIVE | ✅ 12/12 meta, 16/16 item fields | §3.3 |
| 4 | `POST insights-cancellations` | ✅ LIVE | ✅ 6/6 sections | §3.4 |
| 5 | `order-logs-report` +pagination | ❌ NOT YET | — | §4.1 |
| 6 | `order-logs-report` +field selection | ❌ NOT YET | — | §4.2 |

Validated on 2 restaurants (cafe103 + Palm House), May 2026 full month. All schema shapes match contract v1.0.

## 3. What's Waiting on Backend (6 Gaps)

### 2 Backend Bugs

| # | Bug | Impact | Status |
|---|-----|--------|--------|
| **B-1** | Cancel EP `order_scope.order_count` uses `created_at` instead of `cancel_at` | Cancel count wrong (72 vs 157 for Palm House May) | Reported in Amendment v1.1 |
| **B-2** | Tax not zeroed on cancelled lines (ESC-3) | ₹757 cancel loss discrepancy (Palm House May) | Already escalated June 2 |

### 4 Contract Amendments (backend needs to implement)

| # | Amendment | Impact | Effort |
|---|-----------|--------|:------:|
| **A-1** | TAB settlement needs timestamp → include in `by_hour` | Hourly SUM ≠ revenue total (Δ = TAB amount) | SMALL |
| **A-3** | `total_tax` must be non-TAB scope + add `tab_tax_total` | Daily tax SUM ≠ summary tax | SMALL |
| **A-4** | Dashboard discount must be non-TAB scope + add `tab_discount_total` | Dashboard discount ≠ Sales discount | SMALL |
| **A-6** | `daily.discount` scope explicit non-TAB | Daily discount SUM ≠ summary discount | SMALL |

**FE approach:** Wire to endpoints NOW with current data. Mark 6 gaps as "waiting for backend." When backend ships fixes, numbers auto-correct — no FE code change needed (FE just displays what API returns).

## 4. Scope — What FE Must Change

### Phase 1: Dashboard + Sales + Payments (wire to `insights-dashboard` + `insights-sales`)

| File | Current | After |
|------|---------|-------|
| `insightsService.js` | `getDashboardAggregated()` — downloads raw orders, 400 lines of aggregation | NEW: `fetchDashboard()` — single POST to `insights-dashboard`, return response.data directly |
| `DashboardMockup.jsx` | Calls `getDashboardAggregated`, expects FE-shaped tiles | Map backend response fields to existing tile component props |
| `SalesMockup.jsx` | Calls `getDashboardAggregated` (same data, different view) | Call `insights-sales`, map to existing chart/table props |
| `PaymentsMockup.jsx` | Calls `getDashboardAggregated` | Call `insights-sales` (payments section), map to existing props |

### Phase 2: Items & Menu (wire to `insights-items`)

| File | Current | After |
|------|---------|-------|
| `insightsService.js` | `getItemSalesAggregated()` — downloads raw orders, 600 lines of per-item aggregation + audit engine | NEW: `fetchItems()` — single POST to `insights-items`, return response.data directly |
| `ItemSalesHybridMockup.jsx` | Calls `getItemSalesAggregated`, expects FE-shaped item rows with 5 buckets | Map backend item fields to existing row/column structure |
| `ItemDrillSheet.jsx` | Uses item drill-down data from FE aggregation | Use `variations`, `addons`, `cancel_reasons` from backend response |

### Phase 3: Cancellations (wire to `insights-cancellations`)

| File | Current | After |
|------|---------|-------|
| `CancellationsMockup.jsx` | Calls `getItemSalesAggregated` (reuses same raw data) | NEW: call `insights-cancellations`, map to existing chart/table props |

### Phase 4: Order Ledger (waiting on pagination — §4.1/§4.2)

| File | Current | After |
|------|---------|-------|
| `OrderLedgerMockup.jsx` | Calls `order-logs-report` directly, downloads full dataset | Wire pagination when backend delivers §4.1. Not in this CR. |

### Not Changing (out of scope)

| File | Why |
|------|-----|
| `AllOrdersReportPage.jsx` | Audit Report — uses `order-logs-report` directly, not Insights endpoints |
| `RoomOrdersReportPage.jsx` | Room Orders Report — uses `order-logs-report` directly |
| `EdgeStatesMockup.jsx` | Edge States — uses own data source |
| `PrepServeTimeMockup.jsx` | Kitchen Ops — uses `order-logs-report` (no backend aggregation endpoint yet) |
| `FoodCourtMockup.jsx` | Food Court — uses `order-logs-report` (no backend aggregation endpoint yet) |
| `RoomOrdersMockup.jsx` | Room Orders Insight — uses `order-logs-report` (no backend aggregation endpoint yet) |
| `SettlementReportMockup.jsx` | Settlement — uses own `get-settlement-report` API |
| Audit engine (`auditEngine.js`, `auditManifest.js`) | Audit tab is env-gated (`REACT_APP_SHOW_AUDIT_TAB`). Audit rules need raw line-level data — backend aggregation cannot serve this. Audit stays on old pipeline, gated to preprod only. |

## 5. Evidence

### Validation Results (May 2026, both restaurants)
- Contract: `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md` (v1.0)
- Amendment: `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION_AMENDMENT_V1_1.md`
- HTML report: `/app/frontend/public/downloads/contract_amendment_v1_1.html`
- PDF report: `/app/frontend/public/downloads/contract_amendment_v1_1.pdf`
- Source: OWNER-DIRECTED
- Confidence: CONFIRMED (curl-validated on live preprod endpoints)

### Blast Radius
- ~20 files touched (6 report pages + 3 service files + 3 transforms + supporting files)
- Hotspot files: NONE (report pages are not in the R5 hotspot list)
- Estimated scope: LARGE (6+ files)
- Financial logic: YES — revenue, tax, discount numbers change source from FE computation to backend response. Must validate numbers match.

## 6. Duplicate Check

- DISTINCT — no existing CR for "wire insights to backend aggregation endpoints"
- RELATED to: CR-044 (Insights cache — cache layer stays, just caches backend response instead of FE-computed data)
- RELATED to: CR-045 (payload stripper — becomes unnecessary once FE stops downloading raw orders)

## 7. Open Questions

| # | Question | Blocks |
|---|----------|--------|
| OQ-1 | Should audit tab stay on old FE-aggregation pipeline (raw data needed for line-level audit rules)? | Phase 2 — audit tab scope |
| OQ-2 | When backend ships pagination (§4.1), should Order Ledger be a separate CR or part of this? | Phase 4 scope |
| OQ-3 | Should FE keep the old `getDashboardAggregated` / `getItemSalesAggregated` as fallback during transition, or hard-switch? | Implementation strategy |
| OQ-4 | InsightsCache (CR-044) currently caches FE-computed results. After migration, it caches backend responses. Any cache key changes needed? | Phase 1 |

## 8. Suggested Phases

| Phase | What | Depends On | Effort |
|-------|------|-----------|:------:|
| **1** | Dashboard + Sales + Payments → backend endpoints | Nothing (endpoints live) | MEDIUM |
| **2** | Items & Menu → backend endpoint | Nothing (endpoint live) | MEDIUM |
| **3** | Cancellations → backend endpoint | Nothing (endpoint live) | SMALL |
| **4** | Order Ledger → pagination | Backend delivers §4.1 | MEDIUM |
| **—** | Cleanup: remove old aggregation code from `insightsService.js` | Phases 1-3 complete + owner smoke | SMALL |

---

*CR-048 Intake — 2026-06-15. "Wire to what backend already built."*
