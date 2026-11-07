# BUG-353 — Impact Analysis (Gate 2) — REVISED
## All Backend-Aggregated Report Pages: Date Range Caps Lifted to 730 Days

**Date:** 2026-10-19 (revised from earlier v2 which only covered OrderReportBetaPage)
**Stage:** Gate 2 — Impact Analysis
**Author:** Planning Agent (AGENT_PROMPT_ALPHA v0.7 Role 2)
**Revision reason:** Owner confirmed BUG-353 covers ALL backend-aggregated report pages
with any date cap, not only OrderReportBetaPage.

---

## Code Reality Check

All caps confirmed in code by grep (2026-10-19):

| File | Line | Constant | Current | Fix |
|------|------|----------|:-------:|:---:|
| `SalesMockup.jsx` | 138 | `maxDays` | **60** | 730 |
| `PaymentsMockup.jsx` | 183 | `maxDays` | **60** | 730 |
| `DashboardMockup.jsx` | 74 | `MAX_RANGE_DAYS` | **365** | 730 |
| `ItemSalesHybridMockup.jsx` | 169 | `MAX_RANGE_DAYS` | **365** | 730 |
| `CancellationsMockup.jsx` | 192 | `MAX_RANGE_DAYS` | **365** | 730 |
| `OrderReportBetaPage.jsx` | — | no FE cap | backend caps at ~31d | chunking fix |

**Code Reality: NONE** — no fix implemented on any file.

---

## Conflict Pre-Check

| File | Last modifier | Date | Conflict? |
|------|--------------|------|-----------|
| `SalesMockup.jsx` | BUG-555 (flex-wrap) | 2026-10-15 | NONE — different lines |
| `PaymentsMockup.jsx` | BUG-555 (flex-wrap) | 2026-10-15 | NONE — different lines |
| `DashboardMockup.jsx` | BUG-547 (L88 transform fix) | 2026-10-17 | NONE — different lines |
| `ItemSalesHybridMockup.jsx` | BUG-555 (flex-wrap) | 2026-10-15 | NONE — different lines |
| `CancellationsMockup.jsx` | BUG-555 (flex-wrap) | 2026-10-15 | NONE — different lines |
| `reportService.js` | CR-377 | 2026-09-11 | NONE |
| `OrderReportBetaPage.jsx` | BUG-546 | 2026-10-17 | NONE — different lines |

Open items on same files: **CR-423** (export gaps — touches `OrderReportBetaPage.jsx` export button row, parallel-safe with `fetchData` edit). No other conflicts.

---

## Why All 5 Capped Pages Are Safe to Lift

All 5 pages call backend-aggregation endpoints from `insightsService.js`.
These endpoints accept any `from_date`/`to_date` and aggregate server-side.
There is no server-side cap on these endpoints (confirmed by existing usage —
`ItemSalesHybridMockup` was already at 365 days without backend issues).

| Page | API call | Backend cap? |
|------|----------|:---:|
| `SalesMockup` | `fetchInsightsSales` → `INSIGHTS_SALES` | None confirmed |
| `PaymentsMockup` | `fetchInsightsSales` → `INSIGHTS_SALES` | None confirmed |
| `DashboardMockup` | `fetchInsightsDashboard` → `INSIGHTS_DASHBOARD` | None confirmed |
| `ItemSalesHybridMockup` | `fetchInsightsItems` → `INSIGHTS_ITEMS` | None confirmed |
| `CancellationsMockup` | `fetchInsightsCancellations` → `INSIGHTS_CANCELLATIONS` | None confirmed |

Note: `PaymentsMockup` was incorrectly categorised as FE-aggregated in BUG-598 Sub-batch B.
Corrected here — it uses the same `fetchInsightsSales` endpoint as `SalesMockup`.

---

## OrderReportBetaPage — Different Problem, Same Bug

`OrderReportBetaPage` has NO FE cap but the backend endpoint
`/api/v1/vendoremployee/daily-order-report-details-combined` enforces a ~31-day server-side cap
and returns empty `daily_reports` silently for wider ranges.

Fix approach: FE-side chunking — split the date range into 31-day windows,
fetch sequentially, concatenate `daily_reports` arrays. The page computes ALL
totals FE-side (`filteredDays.reduce`) so merged chunks give correct results automatically.
Progress indicator shows `"Loading data… (month X of N)"` during multi-chunk fetch.

---

## Scope Summary

| Fix type | Pages | Files | Lines |
|----------|-------|:-----:|:-----:|
| FE cap lift (1 line each) | SalesMockup, PaymentsMockup, DashboardMockup, ItemSalesHybridMockup, CancellationsMockup | 5 | 5 |
| Chunking + progress | OrderReportBetaPage | 2 (`reportService.js` + page) | ~35 |
| **Total** | **6 report pages** | **7** | **~40** |

---

## Out of Scope (separate bugs)

- `OrderLedgerMockup`, `RoomOrdersMockup`, `SettlementReportMockup` — FE-aggregated
  (chunked `order-logs-report` calls). Lifting cap on these risks 24+ sequential calls.
  Tracked in `backend_briefs/BACKEND_BRIEF_BUG353_AGGREGATION_NEEDED_2026_10_18.md`.
- `OrderReportBetaPage` Excel export — binary blob, backend must fix separately.

---

## BUG-598 Relationship

BUG-598 Sub-batch A (SalesMockup, DashboardMockup, ItemSalesHybridMockup,
CancellationsMockup) is now **subsumed into BUG-353**. BUG-598 Sub-batch A
should be marked SUBSUMED_BUG353 and closed once BUG-353 ships.
BUG-598 Sub-batch B (OrderLedger, RoomOrders, Settlement) remains open — those
are FE-aggregated and need backend endpoints.

---

## Owner Decisions — LOCKED

| OD | Decision | Value | Status |
|----|---------|-------|--------|
| OD-353-01 | Maximum date range cap | **730 days (no practical limit)** | LOCKED 2026-10-19 |
| OD-353-02 | Progress indicator style | **Text in existing spinner** | LOCKED 2026-10-19 |
| OD-353-03 | Excel export cap | **Stays backend-capped** | LOCKED |

---

## Risk Classification

| Criterion | Assessment |
|-----------|-----------|
| Financial logic? | NO — date picker cap only; no money calculation changed |
| R5 hotspot? | NO |
| Lines changed | ~40 across 7 files |
| Regression risk | LOW — cap lift is additive; chunking single-chunk path unchanged |
| Risk | **MEDIUM** (financial report display, data stitching for chunked path) |

---

Gate 2: **COMPLETE**
Gate 3: See `plans/BUG-353_IMPLEMENTATION_PLAN_2026_10_19.md` (updated)
