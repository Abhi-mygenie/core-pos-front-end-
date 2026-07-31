# CR-049 — Impact Analysis (Gate 2)

**ID:** CR-049
**Title:** Insights Module: Migrate FE Aggregation to Backend Aggregation Endpoints
**Priority:** P1 (performance — current architecture cannot scale beyond 2-week date ranges)
**Sprint:** POS 5.0
**Date:** 2026-06-15
**Code Reality:** NONE — no backend aggregation endpoints wired in FE
**Conflict Pre-Check:** CLEAR — no other open item touches the target files

---

## 1. Summary

The Insights module currently downloads raw order data (10-450 MB depending on date range) and computes all aggregations client-side in `insightsService.js` (1078 lines). Backend has shipped 4 pre-computed aggregation endpoints. FE must wire to them to enable date ranges >2 weeks.

## 2. Backend Endpoints — Curl-Validated ✅

All 4 tested against cafe103 (RID 644), June 1-15, 2026.

| # | Endpoint | Status | Response Shape |
|---|----------|:------:|----------------|
| 1 | `POST insights-dashboard` | ✅ LIVE | `{ revenue, channel_mix, payment_mix, top_items, cancellations, discounts, kitchen, customers, audits, credit_outstanding }` |
| 2 | `POST insights-sales` | ✅ LIVE | `{ summary, daily, channels, payments, hourly }` |
| 3 | `POST insights-items` | ✅ LIVE | `{ meta, items[185] }` — each item has 15 fields + variations + addons |
| 4 | `POST insights-cancellations` | ✅ LIVE | `{ summary, by_day, by_reason, by_stage, by_employee, items }` |

Evidence saved: `/app/memory/evidence/CR-049/dashboard_response.json`, `sales_response.json`

## 3. Current FE Architecture (what gets replaced)

| Page | Currently Calls | Data Source | Lines of Aggregation |
|------|----------------|-------------|:---:|
| **DashboardMockup.jsx** | `getDashboardAggregated()` from `insightsService.js` | Raw orders via `order-logs-report` → 6 parallel fetches → FE computes tiles | ~475 |
| **SalesMockup.jsx** | `getOrderLedgerForRange()` from `orderLedgerService.js` | Raw orders → FE computes daily/hourly/channel/payment | — (uses different service) |
| **PaymentsMockup.jsx** | `getOrderLedgerForRange()` from `orderLedgerService.js` | Same as Sales | — (uses different service) |
| **ItemSalesHybridMockup.jsx** | `getItemSalesAggregated()` from `insightsService.js` | Raw orders → FE computes per-item buckets | ~560 |
| **CancellationsMockup.jsx** | Direct `api.post(ORDER_LOGS_REPORT)` | Raw orders → FE computes cancel aggregations in-component | ~300 (inline) |

**Key finding:** SalesMockup and PaymentsMockup use `orderLedgerService.js`, NOT `insightsService.js`. They can wire to `insights-sales` endpoint.

## 4. Field Mapping: Backend → FE

### Phase 1: DashboardMockup (backend `insights-dashboard` → FE `tiles`)

| FE tiles field | Backend response field | Transform needed? |
|----------------|----------------------|:---:|
| `sales.totalRevenue` | `revenue.total` | Round to int |
| `sales.paidOrderCount` | `revenue.paid_order_count` | Direct |
| `channels.mix` | `channel_mix[]` | Rename: `channel`→`name`, `revenue`→`value` |
| `payments.mix` | `payment_mix[]` | Rename: `method`→`name`, `revenue`→`value` |
| `topItems.items` | `top_items[]` | Rename: `qty`→`quantity` |
| `cancellations.orderCount` | `cancellations.order_scope_count` | Direct |
| `cancellations.totalRevenue` | `cancellations.total_loss` | Direct |
| `cancellations.topReason` | `cancellations.top_reason` | Direct |
| `discounts.directDiscount` | `discounts.manual_discount` | Direct |
| `discounts.couponDiscount` | `discounts.coupon_discount` | Direct |
| `discounts.totalLeakage` | `discounts.total_leakage` | Direct |
| `kitchen.avgPrep` | `kitchen.avg_prep_minutes` | Format mm:ss |
| `customers.repeatPct` | `customers.repeat_pct` | Direct |
| `audits.total` | `audits.total` | Direct |
| `payments.creditOutstanding` | `credit_outstanding` | Direct |

### Phase 2: ItemSalesHybridMockup (backend `insights-items` → FE item rows)

| FE item field | Backend item field | Transform? |
|---------------|-------------------|:---:|
| `productId` | `food_id` | Rename |
| `productName` | `name` | Rename |
| `categoryName` | `category_name` | Direct |
| `sold` | `sold` | Direct |
| `cancelled` | `cancelled` | Direct |
| `complementary` | `complementary` | Direct |
| `avgPrice` | `avg_price_sold` | Direct |
| `variations` | `variations[]` | Direct |
| `addons` | `addons[]` | Direct |

### Phase 3: CancellationsMockup (backend `insights-cancellations` → FE cancel data)

Backend returns pre-sectioned: `summary`, `by_day`, `by_reason`, `by_stage`, `by_employee`, `items`. Currently FE computes all of these from raw orders.

### Phase 1b: SalesMockup + PaymentsMockup (backend `insights-sales`)

These currently use `orderLedgerService.js`. Can wire to `insights-sales` which returns `summary`, `daily[]`, `channels[]`, `payments[]`, `hourly[]`.

## 5. Affected Files

### Will Change

| # | File | Current | After |
|---|------|---------|-------|
| 1 | `api/constants.js` | No insights endpoints | Add 4 endpoint constants |
| 2 | `api/services/insightsService.js` | 1078 lines FE aggregation | Add 4 new fetch functions (~40 lines). Keep old functions during transition. |
| 3 | `pages/reports-module/DashboardMockup.jsx` | Calls `getDashboardAggregated` | Call new `fetchInsightsDashboard`, map response to existing tile props |
| 4 | `pages/reports-module/SalesMockup.jsx` | Calls `orderLedgerService` | Call new `fetchInsightsSales`, map to existing chart/table props |
| 5 | `pages/reports-module/PaymentsMockup.jsx` | Calls `orderLedgerService` | Call new `fetchInsightsSales` (payments section) |
| 6 | `pages/reports-module/ItemSalesHybridMockup.jsx` | Calls `getItemSalesAggregated` | Call new `fetchInsightsItems`, map to existing row structure |
| 7 | `pages/reports-module/CancellationsMockup.jsx` | Direct `api.post(ORDER_LOGS_REPORT)` + inline aggregation | Call new `fetchInsightsCancellations` |
| 8 | `pages/reports-module/ItemDrillSheet.jsx` | Uses drill-down from FE aggregation | Use `variations`/`addons` from backend response |

### Will NOT Change

| File | Why |
|------|-----|
| `AllOrdersReportPage.jsx` | Audit Report — uses `order-logs-report` directly |
| `RoomOrdersReportPage.jsx` | Uses `order-logs-report` directly |
| `OrderLedgerMockup.jsx` | Waiting on backend pagination (§4.1) — separate CR |
| `PrepServeTimeMockup.jsx` | No backend endpoint yet |
| `FoodCourtMockup.jsx` | No backend endpoint yet |
| `RoomOrdersMockup.jsx` | No backend endpoint yet |
| `SettlementReportMockup.jsx` | Uses own `get-settlement-report` API |
| `EdgeStatesMockup.jsx` | Uses own data source |
| Audit engine files | Needs raw line-level data — stays on old pipeline |
| `insightsCache.js` | Cache layer stays — just caches backend response instead of FE-computed data |
| `orderPayloadStripper.js` | Becomes unnecessary for migrated pages but keep for non-migrated ones |

## 6. Known Backend Gaps (6 items — FE wires NOW, numbers auto-correct later)

| # | Gap | Impact on FE | FE Action |
|---|-----|-------------|-----------|
| B-1 | Cancel EP uses `created_at` not `cancel_at` | Cancel count may differ from FE computation | Display as-is, note in UI |
| B-2 | Tax not zeroed on cancelled lines | Cancel loss ₹ slightly off | Display as-is |
| A-1 | TAB settlement missing from `by_hour` | Hourly SUM ≠ revenue total | Display as-is |
| A-3 | `total_tax` scope includes TAB | Tax number slightly off | Display as-is |
| A-4 | Dashboard discount scope includes TAB | Discount number slightly off | Display as-is |
| A-6 | `daily.discount` scope includes TAB | Daily discount SUM ≠ summary | Display as-is |

**FE approach:** Wire now, display backend numbers. When backend ships fixes, numbers auto-correct — zero FE code change needed.

## 7. Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Numbers differ from current FE computation | MEDIUM | Expected — backend computes differently for TAB/cancel scope. Document in release notes. |
| Financial logic changes source | HIGH | This is the point — but validate key totals (revenue, tax) match within known gap tolerance |
| 8 files changed | MEDIUM | Phased rollout: Phase 1 (Dashboard) → validate → Phase 2 (Items) → Phase 3 (Cancellations) |
| Cache key changes needed | LOW | InsightsCache keys by date range — unchanged. Just caches different data shape. |
| Rollback needed | LOW | Keep old functions in insightsService.js during transition. Toggle via feature flag if desired. |

## 8. Suggested Phases

| Phase | Pages | Backend Endpoint | Effort | Depends On |
|-------|-------|-----------------|:------:|:---:|
| **1** | DashboardMockup | `insights-dashboard` | MEDIUM | Nothing |
| **1b** | SalesMockup + PaymentsMockup | `insights-sales` | MEDIUM | Nothing |
| **2** | ItemSalesHybridMockup + ItemDrillSheet | `insights-items` | MEDIUM | Nothing |
| **3** | CancellationsMockup | `insights-cancellations` | SMALL | Nothing |
| **Cleanup** | Remove old aggregation from insightsService.js | — | SMALL | Phases 1-3 + owner smoke |

## 9. Owner Decisions Needed

| # | Question | Recommendation |
|---|----------|---------------|
| OQ-1 | Audit tab stays on old FE pipeline? | YES — needs raw line-level data |
| OQ-2 | Order Ledger pagination — part of this CR or separate? | Separate (backend hasn't shipped §4.1) |
| OQ-3 | Keep old functions as fallback during transition? | YES — hard-switch after owner smoke per phase |
| OQ-4 | Cache key changes needed? | NO — keys stay (date range), just caches different response shape |
| OQ-5 | Feature flag for backend-vs-FE toggle? | Optional — recommend per-phase hard-switch after smoke |

---

*Evidence: `/app/memory/evidence/CR-049/` — curl responses from all 4 endpoints*
*Contract: `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION.md`*
*Amendment: `/app/memory/BACKEND_API_CONTRACT_INSIGHTS_AGGREGATION_AMENDMENT_V1_1.md`*
