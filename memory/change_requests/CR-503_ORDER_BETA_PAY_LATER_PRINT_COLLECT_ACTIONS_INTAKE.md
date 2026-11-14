# CR-503 — Order Beta Report: Pay Later — Print Bill and Collect Payment Actions

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (operational: Pay Later orders stuck without action buttons)
**Risk:** HIGH (touches Actions column, payment status mutation — R5 OrderTable.jsx)
**Process required:** Full gate flow. FAST LANE eligible? **NO** (R5 hotspot, payment mutation)
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #1)

---

## Description

Orders marked as "Pay Later" (Tab) need accessible **Print Bill** and **Collect Payment** buttons in the Actions column of the Order Beta report. On successful collection, automatically update payment status from Unpaid → Paid.

**Expected behavior:**
- Pay Later orders show "Print Bill" and "Collect" buttons in Actions column
- Clicking "Collect" opens the payment collection flow
- On successful payment, status updates from Unpaid → Paid in the report
- Print Bill generates the bill for the pending order

**Current behavior:** Pay Later orders lack accessible action buttons in the Order Beta report to print or collect payment.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Attached Order Beta report screenshot shows Tab orders (e.g., #023219) with no Collect action
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: PARTIAL** — Actions column exists in `OrderTable.jsx` (L165-174) with "Change" + "Unpaid" + "Reprint" for Paid tab. Hold tab has "Collect Bill" button (L220-224, CR-003). The pattern exists — needs extension to Pay Later/Tab orders.

## Duplicate Check

**DISTINCT.** No existing CR covers Pay Later action buttons in Order Beta.

## Blast Radius

- `OrderTable.jsx` (R5, 947 lines) — Actions column rendering + eligibility
- `OrderReportBetaPage.jsx` (815 lines) — handler callbacks
- `reportService.js` (890 lines) — payment mutation API
- Estimated scope: MEDIUM (3 files, ~30-40 lines)

## Open Questions

- **OD-503-01:** Should "Collect" open the same CollectPaymentPanel used in order-taking, or a simplified payment dialog?
- **OD-503-02:** After collection, should the order move to the "Settled" tab automatically?
