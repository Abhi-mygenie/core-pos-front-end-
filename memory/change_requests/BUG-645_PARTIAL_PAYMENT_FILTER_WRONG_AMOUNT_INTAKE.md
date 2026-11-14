# BUG-645 — Order Report + Orders (Beta): Payment filter shows wrong amount for split (partial) payments

**Registered:** 2026-11-05  
**Type:** BUG  
**Severity:** P1  
**Risk:** MEDIUM (financial display, R6)  
**Area:** Reports / Analytics  
**Sprint:** TBD  
**Source:** OWNER-REPORTED (2 screenshots, Payment = Cash, 05/11/2026)  
**Status:** INVESTIGATION_COMPLETE — ODs closed. Batch A/B/C defined. Next: PLANNING Gate 2-3.
**Updated:** 2026-11-08 — INV-PAYMENT-FILTER evidence merged; scope extended with batch structure (A/B/C).

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

## Batch Structure (added 2026-11-08 from INV-PAYMENT-FILTER investigation)

| Batch | Issue | Page | Root Cause | Fix |
|-------|-------|------|-----------|-----|
| **A** | UPI/Card missing from payment dropdown | Order Report Beta (`OrderReportBetaPage.jsx`) | `extractFilterOptions()` L191 builds dropdown from `payment_method_raw` which is `"partial"` for split orders — never `"upi"`/`"card"` standalone | Extract payment options from BOTH `payment_method_raw` AND non-zero keys in each order's `payment` breakdown object |
| **B** | No split-payment-aware filtering | Order Report Beta (`OrderReportBetaPage.jsx`) | `applyFilters()` L168 does exact match `r.payment_method_raw === filters.payment` — no partial-leg logic | Add BUG-272-style partial-leg matching: `"cash" → pm_raw === "cash" OR (pm_raw === "partial" && payment.cash > 0)` etc. |
| **C** | Payment filter shows full order amount for split orders | Audit (Daily) Report (`AllOrdersReportPage.jsx`) | BUG-272 filter correctly includes partial orders with matching leg, BUT row amount = full `order_amount` and `calculateSummary` sums full amount | **Owner decision (2026-11-08): Option C — show only matching leg amounts.** When filtered by Cash, a Cash+UPI split order row shows only the cash leg amount; totals sum only leg amounts. |

### Batch C — Owner Decision Detail

**Question:** Audit report Cash filter includes partial orders (BUG-272 intentional). Three options:
- Option A (current): Keep as-is — Cash includes partial orders with cash leg, shows full amount
- Option B: Exclude all partial orders from Cash/UPI/Card filters
- **Option C (SELECTED):** Cash includes partial orders with cash leg, but **shows only the matching leg amount** (not full order amount)

This aligns with OD-645-01 ("show only that mode's part... applies to BOTH pages").

### INV-PAYMENT-FILTER Evidence (merged 2026-11-08)

Evidence archived at: `/app/memory/evidence/INV-PAYMENT-FILTER/`

| File | Content |
|------|---------|
| `INV-PAYMENT-FILTER_INVESTIGATION_REPORT.md` | Full investigation report (3 hypotheses, all CONFIRMED) |
| `beta_report_raw.json` | Beta API response for 2026-11-07 (11 orders) |
| `payment_fields_summary.json` | Extracted payment fields for all 11 orders |
| `audit_report_raw.json` | Audit API response (auth expired — placeholder) |

**Key evidence — Order #001424:**
```json
{
  "payment_method_raw": "partial",
  "payment": { "cash": "100.00", "upi": "175.00" }
}
```
Beta page ignores the `payment` breakdown object entirely. Audit page includes the order under Cash filter but shows ₹275 (full) instead of ₹100 (cash leg).

---

## Next: PLANNING Gate 2-3
