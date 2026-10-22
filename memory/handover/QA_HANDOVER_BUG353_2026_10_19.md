# QA Handover — BUG-353 — 2026-10-19

**Implementation agent:** IMPLEMENTATION (Role 3)
**Date:** 2026-10-19
**Status:** GATE_5A_IMPLEMENTED — yarn build exit 0, EXIT GATE 5/5 PASS

---

## §1 — Verification Matrix (self-test results)

| # | Edit | File | Verification | Self-Test |
|---|------|------|-------------|:---:|
| V1 | E1 | SalesMockup.jsx:138 | `maxDays = 730` (was 60) | ✅ grep verified |
| V2 | E2 | PaymentsMockup.jsx:183 | `maxDays = 730` (was 60) | ✅ grep verified |
| V3 | E3 | DashboardMockup.jsx:74 | `MAX_RANGE_DAYS = 730` (was 365) | ✅ grep verified |
| V4 | E4 | ItemSalesHybridMockup.jsx:169 | `MAX_RANGE_DAYS = 730` + audit rule name updated | ✅ grep verified |
| V5 | E5 | CancellationsMockup.jsx:192 | `MAX_RANGE_DAYS = 730` (was 365) | ✅ grep verified |
| V6 | E6 | reportService.js | `_splitBetaDateRange` helper present | ✅ grep verified |
| V7 | E6 | reportService.js | Chunked loop with `onProgress` and `allDailyReports` | ✅ grep verified |
| V8 | E6 | reportService.js | Fast path (single-chunk) preserved | ✅ grep verified |
| V9 | E7 | OrderReportBetaPage.jsx | `fetchProgress` state added (L249) | ✅ grep verified |
| V10 | E7 | OrderReportBetaPage.jsx | `onProgress` callback in fetchData | ✅ grep verified |
| V11 | E7 | OrderReportBetaPage.jsx | `"Loading data… (month X of N)"` in loading spinner | ✅ grep verified |
| V12 | ALL | — | `yarn build` exit 0, 0 new warnings | ✅ PASS |

**Self-test: 12/12 PASS**

---

## §2 — Test Cases for QA Agent

### Group A — FE Cap Lift (5 pages)

| TC | Page | Steps | Expected | Priority |
|----|------|-------|----------|:---:|
| TC-1 | Sales (`/reports-module/sales`) | Set FROM = today−200d, TO = today. Click Apply. | Apply button enabled. Data loads. No "Max 60 days" error. | HIGH |
| TC-2 | Sales | Set FROM = today−731d (>730d). Click Apply. | "Max 730 days" error shown. Apply disabled. | HIGH |
| TC-3 | Sales | Set FROM = today−7d, TO = today (≤ 60d). Click Apply. | Works exactly as before — no regression. | HIGH |
| TC-4 | Payments (`/reports-module/payments`) | Same as TC-1 (200d range). | Apply enabled, data loads. No "Max 60 days" error. | HIGH |
| TC-5 | Payments | 7d range — regression check. | Works as before. | MEDIUM |
| TC-6 | Dashboard (`/reports-module/dashboard`) | Set 400-day range. Click Apply. | Apply enabled, data loads. No "Max 365 days" error. | HIGH |
| TC-7 | Dashboard | 7d range — regression check. | Works as before. | MEDIUM |
| TC-8 | Item Sales (`/reports-module/item-sales`) | Set 400-day range. Click Apply. | Apply enabled, data loads. No "Max 365 days" error. | HIGH |
| TC-9 | Cancellations (`/reports-module/cancellations`) | Set 400-day range. Click Apply. | Apply enabled, data loads. No cap error. | HIGH |

### Group B — OrderReportBeta Chunking

| TC | Steps | Expected | Priority |
|----|-------|----------|:---:|
| TC-10 | Go to `/reports-module/order-report-beta`. Set FROM = today, TO = today (1d). Click Apply. | Single fetch. Loading shows "Loading report…" (not month X/N). Orders load normally. | HIGH |
| TC-11 | Set FROM = today−40d, TO = today (>31d). Click Apply. | Loading shows "Loading data… (month 1 of 2)" then "month 2 of 2". After load, orders from all 40 days appear in table. | HIGH |
| TC-12 | Set FROM = today−100d, TO = today (~4 chunks). Click Apply. | Loading progresses month 1→4. Full 100-day order list shown. Grand total correct. | HIGH |
| TC-13 | With 40d range loaded: switch tabs (Settled, Cancelled…). | Tabs filter correctly across all fetched orders. | HIGH |
| TC-14 | With 40d range loaded: apply Waiter / Channel filters. | Filters work correctly across full date range. | MEDIUM |
| TC-15 | OrderReportBeta 7d range — regression check. | No progress text, single fetch, identical to pre-fix behaviour. | HIGH |

### Regression Tests

| TC | What to verify | Why |
|----|---------------|-----|
| TC-R1 | Sales 7d range still shows correct totals | Cap lift must not change calculation |
| TC-R2 | ItemSales audit tab still applies its own volume guard (separate from MAX_RANGE_DAYS) | Audit tab has its own 60d soft limit comment |
| TC-R3 | OrderReportBeta single-day fetch still works — no `fetchProgress` text shown | Fast path must be 100% unchanged |

---

## §3 — EXIT GATE Confirmation

```
✅ 1. REGISTRY SYNC:     BUG-353 → GATE_5A_IMPLEMENTED in registry.json
✅ 2. BUG_TRACKER.MD:    row updated to GATE_5A_IMPLEMENTED
✅ 3. FILE_OWNERSHIP.MD: 7 files listed with BUG-353 + 2026-10-19
✅ 4. CODE MARKERS:      // BUG-353 present in all 7 modified files
✅ 5. COMPILE CHECK:     yarn build exit 0, 0 new errors or warnings
EXIT GATE: 5/5 PASS
```

---

## §4 — Credentials & Environment

- App URL: from `frontend/.env` → `REACT_APP_BACKEND_URL`
- Test account: `cashier@kunafamahal.com` / `Qplazm@10`
- Reports are under: Reports tab in sidebar
- Note: wide-range data only shows if the backend has orders for those dates.
  Use a date range you know has real order data (e.g. last 2 months).
  Empty results for a 200d range on a new restaurant = expected (no data), not a bug.

---

## §5 — Known Limitation (not a regression)

`Export Excel` on OrderReportBeta remains capped at ~31 days (backend generates the file).
This is OD-353-03 LOCKED — out of scope. QA should not flag this as a failure.
