# BUG-353 — Impact Analysis (Gate 2)
## Lift Date Range Caps to 730 Days (2 Years) on Report Pages

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** CONFIRMED — caps found in code at specific pages
**Conflict Pre-Check:** Same pages as CR-422 analysis — BUG-555 flex-wrap doesn't overlap with maxDays constant.

---

## Current Caps Found in Code

Verified from codebase scan:

| Pages | Current Cap | → New Cap | Notes |
|---|---|---|---|
| `SalesMockup` | `maxDays = 60` (L138) | 730 | Backend-aggregated (insights-sales) + FE-agg audit tab |
| `PaymentsMockup` | `maxDays = 60` | 730 | Backend-aggregated |
| `OrderLedgerMockup` | `MAX_RANGE_DAYS = 60` | 730 | FE-aggregated — chunking concern |
| `RoomOrdersMockup` | cap found | 730 | FE-aggregated — chunking concern |
| `DashboardMockup` | `MAX_RANGE_DAYS = 365` | 730 | Backend-aggregated (insights-dashboard) |
| `ItemSalesHybridMockup` | cap found | 730 | Backend-aggregated (insights-items) |
| `CancellationsMockup` | `MAX_RANGE_DAYS = 365` | 730 | Both backend + FE-agg |
| `SettlementReportMockup` | cap found | 730 | FE-aggregated — chunking concern |

**`OrderReportBetaPage`** — NO FE cap at all. Any cap is purely backend. NOT in scope.

---

## Fix — 1 line per page × 8 pages = 8 edits

Change `maxDays = 60` → `maxDays = 730` or `MAX_RANGE_DAYS = 365` → `MAX_RANGE_DAYS = 730` in each file.

---

## OD-353-01 LOCKED — FE-aggregated pages: DO NOT lift cap

Owner confirmed 2026-10-18:
- **OrderLedgerMockup, RoomOrdersMockup, SettlementReportMockup** — pure FE-aggregated (order-logs chunks). No backend aggregation endpoint exists. 730 days = 24 sequential API calls. **Keep at current caps.**
- **Lift only the 5 backend-aggregated pages:** DashboardMockup, ItemSalesHybridMockup, SalesMockup, PaymentsMockup, CancellationsMockup.

**Scope reduced to 5 pages, 1 line each.**

---

**Backend-aggregated pages (safe to lift immediately):**
`DashboardMockup`, `ItemSalesHybridMockup`, `SalesMockup`, `PaymentsMockup` — single API call to `insights-*` endpoints. Lifting to 730 days is safe.

**FE-aggregated pages (chunking concern):**
`OrderLedgerMockup`, `RoomOrdersMockup`, `SettlementReportMockup` — use `order-logs-report` + sequential 30-day chunks.
730 days = 24+ sequential API calls per load → potential backend load / browser timeout.

**Recommendation:** Lift all 8 caps to 730. For the 3 FE-aggregated pages, add a warning message:
`"Wide date ranges may take longer to load"` (existing UX pattern in other reports).
Backend team to confirm if `order-logs-report` can handle 730-day date windows without timeout.

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO — date picker cap only |
| R5 hotspot? | NO |
| Lines changed | 1 per page × 8 = 8 lines |
| Risk | LOW for backend-agg pages / MEDIUM for FE-agg pages |

**Overall Risk: LOW-MEDIUM**

---

## Owner Decision

**FE-aggregated pages (OrderLedger, RoomOrders, Settlement):** Lift cap to 730 with warning banner, or keep at current cap until backend confirms?
- **(a) Lift to 730 now, add loading warning (recommended)** — better UX, users can try
- **(b) Lift only backend-agg pages (5 pages), defer FE-agg (3 pages)** — safer

---

## Batch Strategy
Batch with CR-422 — both are date-related report fixes, same files partially overlap, same session.

---

Planning complete: BUG-353 | Gate 2 | Risk: LOW-MEDIUM | 8 files
Owner decision needed: lift FE-agg pages option (a) or (b)?
Batch with: CR-422 (same session)
