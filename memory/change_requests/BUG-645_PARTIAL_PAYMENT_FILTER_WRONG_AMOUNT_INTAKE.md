# BUG-645 — Order Report + Orders (Beta): Payment filter shows wrong amount for split (partial) payments

**Registered:** 2026-11-05  
**Type:** BUG  
**Severity:** P1  
**Risk:** MEDIUM (financial display, R6)  
**Area:** Reports / Analytics  
**Sprint:** TBD  
**Source:** OWNER-REPORTED (2 screenshots, Payment = Cash, 05/11/2026)  
**Status:** INVESTIGATION_COMPLETE — ODs closed. Next: PLANNING Gate 2-3.

---

## Duplicate Check

| ID | Title | Relationship | Rationale |
|---|---|---|---|
| BUG-272 | Partial Payment Breakdown Missing in Order Report | **RELATED** | BUG-272 added `cashAmount/cardAmount/upiAmount` parsing to the transform (shipped, QA PASS). This bug is the next step: the filter and summary logic never consume those parsed fields. |
| BUG-546 | Order Report: split payment should show "Split Bill" label | **RELATED** | BUG-546 changed the Beta badge from "Partial" → "Split Bill". Different scope (label vs filter/amount/total). |

**Classification: DISTINCT** — new scope (filter inclusion + per-mode amount display + totals).

---

## Code Reality Check

**PARTIAL:**
- Daily Report (`AllOrdersReportPage.jsx`): BUG-272 logic already parses split legs into `cashAmount/cardAmount/upiAmount` (~L851-857, L1109-1111) but `calculateSummary` (~L1177) and row `amount` (~L1030) use full `order_amount`. Filter at ~L418-430 includes partial orders with matching leg (correct).
- Orders Beta (`OrderReportBetaPage.jsx`): No leg handling at all. L165 strict match `payment_method_raw === filters.payment` drops `partial` rows entirely.

---

## Symptom

- **Daily Report**, Payment = Cash: Order T-000285 (Cash ₹10,000 + UPI ₹5,750) shows Amount ₹15,750; header TOTAL ₹16,240. Correct cash amount = ₹10,000; correct total should be ₹10,490.
- **Orders (Beta)**, Payment = cash: T-000285 not listed at all; total ₹590 (missing the ₹10,000 cash leg entirely).

---

## Root Cause (HIGH confidence, FE_BUG)

Server sends one label per order (`cash`/`upi`/`card`/`partial`) plus a per-mode split breakdown. Split orders are labelled `partial`. Frontend uses the label and full bill amount, ignoring the per-mode split.

1. **Daily Report** — filter keeps partial orders with matching cash leg (correct), but row amount = full `order_amount` and `calculateSummary` sums full amount. Split legs parsed but unused.
2. **Orders Beta** — strict `===` match on `payment_method_raw` drops all `partial` rows when filtering by cash/card/upi. Totals sum `order_amount_raw`.

No backend changes needed. All data is already available in the API response.

---

## Owner Decisions (ALL CLOSED 2026-11-05)

| OD | Decision | Status |
|---|---|---|
| OD-645-01 | With a payment filter (cash/card/upi), a split order row shows only that mode's part (e.g. ₹10,000) with a small note "of ₹15,750"; totals/avg sum only that part. Applies to BOTH pages. | **CLOSED — YES** |
| OD-645-02 | Excel export is backend-generated — NO change. | **CLOSED** |
| OD-645-03 | #000249 appears in Beta but not Daily Report for same day — DO NOT investigate. | **CLOSED** |

---

## Evidence

- Screenshots: owner-provided (Payment = Cash, 05/11/2026)
- Beta API `POST /api/v1/vendoremployee/daily-order-report-details-combined` (1 Oct–5 Nov): 1,813 rows, 36 `partial`, each with `payment{cash,upi,card}`.
- Order-logs API (02-Oct): order #019223 `payment_method: partial`, `partial_payments[]` = cash 252 + upi 830.
- Backend day Cash totals already correct (FE-only gap confirmed).
- Source: OWNER-REPORTED  
- Confidence: CONFIRMED (traced in code, API data verified on cafe103)

---

## Blast Radius

- Files: 2-3 (`AllOrdersReportPage.jsx`, `OrderReportBetaPage.jsx`, possibly `reportTransform.js`)
- Hotspot files: YES — `AllOrdersReportPage.jsx` (R5)
- Estimated scope: **MEDIUM** (2-3 files, financial display)
- Planning skip: **NOT eligible** (2+ files, financial display R6, hotspot file)

---

## Scope for Planning

- FE only: `AllOrdersReportPage.jsx` (+ possibly `reportTransform.js` summary helper), `OrderReportBetaPage.jsx`.
- NOT touched: backend, Excel export, payment/settle flows.
- Full Gate 2-3 required.

---

## Investigation Reference

- Handover: `memory/handover/HANDOVER_TO_INTAKE_PARTIAL_PAYMENT_FILTER_2026_11_05.md`

---

## Next: PLANNING Gate 2-3
