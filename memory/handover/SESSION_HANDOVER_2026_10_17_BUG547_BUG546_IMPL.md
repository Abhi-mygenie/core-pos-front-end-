# Session Handover — 2026-10-17 — BUG-547 + BUG-546 GATE_5A_IMPLEMENTED (Final)

**Role:** BUG FIX
**Date:** 2026-10-17
**Agent:** E1
**Code changed:** YES — 2 files, 2 lines (1 line BUG-547, 1 line BUG-546)

---

## What Was Done

**BUG-547:** `DashboardMockup.jsx:88` — `transformDashboardResponse(raw)` → `transformDashboardResponse(raw.data || raw)`.
Root cause: `fetchInsightsDashboard` returns wrapper `{data:…, orderCount:0}`; transform received the wrapper → all channel/payment/revenue values = 0/empty. Fix passes the inner data. Also closes BUG-483.

**BUG-546:** `OrderReportBetaPage.jsx:40` — `getPaymentBadge` map key `partial` label `'Partial'` → `'Split Bill'`.
Root cause: split-settled orders have `payment_method_raw = 'partial'`; `getPaymentBadge` was labelling them "Partial". Fix: label now "Split Bill".

**BUG-546 L52 — intentionally NOT changed:**
`getStatusBadge` (line 52) has a separate `Partial` key that maps `payment_type='Partial'` (partial-collection/TAB orders) → this is a different concept to split-method payment. Changing it to "Split Bill" would mislabel partially-collected TAB orders in the Status column. The testing agent raised this flag; the fix was correctly scoped to L40 only.

---

## Files Changed

| File | Line | Change |
|---|---|---|
| `src/pages/reports-module/DashboardMockup.jsx` | L88 | `raw` → `raw.data \|\| raw` |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | L40 | `getPaymentBadge` partial label `'Partial'` → `'Split Bill'` |

---

## EXIT GATE

```
✅ 1. Registry: BUG-547 → GATE_5A_IMPLEMENTED · BUG-483 → CLOSED_SUPERSEDED · BUG-546 → GATE_5A_IMPLEMENTED
✅ 2. BUG_TRACKER.md: via registry
✅ 3. FILE_OWNERSHIP.md: both files listed
✅ 4. Code markers: // BUG-547 at DashboardMockup:88 · // BUG-546 at OrderReportBetaPage:40
✅ 5. Compile: webpack compiled with 1 warning (pre-existing allDays, 0 new)
```

---

## Next Agent Instructions

1. **QA role** — execute `handover/QA_HANDOVER_BUG547_BUG546_2026_10_17.md`
   - V1–V6: Insights Dashboard tiles and doughnut load with real data (needs live preprod session)
   - V7–V9: Order Report "Split Bill" badge for split-settled orders (payment_method_raw='partial')
   - V9 scope: Status column (`payment_type` field) should still say "Partial" for partial-collection orders — confirm "Split Bill" appears only in Payment Method column, not Status column
   - Live browser testing blocked by preprod Products API timeout — retry at non-peak
2. After QA PASS → Gate 6 Owner Smoke for both

## Pending previous queue

- BUG-565 QA → BUG-566 fix → CR-414 QA re-test → BUG-555 WP-C still pending
