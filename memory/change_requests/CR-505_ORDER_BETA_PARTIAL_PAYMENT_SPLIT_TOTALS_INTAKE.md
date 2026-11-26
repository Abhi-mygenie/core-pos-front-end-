# CR-505 — Order Beta Report: Partial Payment Split and Payment-wise Totals

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (financial accuracy: partial payments not reflected in totals)
**Risk:** CRITICAL (touches payment calculations, report totals — financial logic)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #4)

---

## Description

Partial payments are not fully represented in the payment-mode breakdown and report-level Payment filter totals. Each payment mode's total (Cash, UPI, Card, etc.) must include amounts from partially paid orders — not just fully settled bills.

**Expected behavior:**
- For partially paid orders (e.g., ₹300 Cash + ₹200 UPI), each mode's collected amount is shown
- Payment filter totals: Cash total = cash from fully paid + cash from partially paid orders
- Same logic for UPI, Card, and other payment modes
- No double-counting across modes
- Count actual collected amounts, not only fully settled bills

**Current behavior:** Partial payments not reflected in payment-mode breakdown. Filter totals may only count fully settled orders.

**Implementation note from Excel:** "Payment-mode totals should reflect actual amounts collected through each mode, including partial payments. Avoid double-counting a payment across report totals."

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Shows "Split Bill" and "Partial" payment statuses in the report
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: PARTIAL** — BUG-272 (Partial Payment Breakdown Missing) was fixed (QA PASS). `FilterBar.jsx:110` has `{ value: 'partial', label: 'Partial' }` filter option. But filter-level TOTALS aggregation for partials needs verification.

## Duplicate Check

**RELATED** to BUG-272 (Partial Payment Breakdown Missing — QA PASS). BUG-272 fixed parsing; this CR extends to filter-level totals aggregation.

## Blast Radius

- `reportService.js` (890 lines) — payment totals calculation
- `OrderReportBetaPage.jsx` (815 lines) — summary cards / grand total
- `FilterBar.jsx` — payment filter interaction
- Hotspot: `reportService.js` — financial calculations
- Estimated scope: MEDIUM (2-3 files, ~30-40 lines)

## Open Questions

- **OD-505-01:** For a ₹500 order paid ₹300 Cash + ₹200 UPI: does the "Cash" filter show this order (since it has a cash component), or only orders fully paid by cash?
- **OD-505-02:** How should the Payment filter interact with partial orders — show all orders that have ANY of the selected payment mode, or only orders where that mode is the primary?
