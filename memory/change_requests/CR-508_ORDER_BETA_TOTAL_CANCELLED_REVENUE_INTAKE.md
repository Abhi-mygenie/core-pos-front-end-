# CR-508 — Order Beta Report: Total Cancelled Revenue Metric

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (financial visibility: owner needs to see money lost to cancellations)
**Risk:** MEDIUM (new summary metric, uses existing data)
**Process required:** Full gate flow. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #7)

---

## Description

Add a **Total Cancelled Revenue** metric to the Order Beta report summary that sums the bill value of fully cancelled orders within the selected date range. Exclude cancelled individual items from otherwise active orders — only count orders where the entire order was cancelled.

**Expected behavior:**
- New "Cancelled Revenue" metric in the summary section (alongside Total Sales, Paid Revenue, etc.)
- Sums bill value of fully cancelled orders only
- Respects the selected date range
- Item-level cancellations in active orders are excluded

**Current behavior:** Report shows "Cancelled: 2" count in the tab but NO revenue value. Grand Total section has Total Sales, Paid Revenue, Order Revenue but no cancelled revenue metric.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement + screenshot)
- **Screenshot:** "Cancelled: 2" visible but with ₹0 amounts, no revenue metric
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: PARTIAL** — `reportService.js:414-415` has `cancel_revenue` with Pre-Serve and Post-Serve breakdown from the API. The data is available but not surfaced as a summary metric in the Order Beta report UI. The Cancelled tab exists but no revenue total.

## Duplicate Check

**DISTINCT.** CR-444 (Revenue Report with cancellations) is a different report page.

## Blast Radius

- `OrderReportBetaPage.jsx` (815 lines) — summary cards section
- `reportService.js` — cancelled revenue may already be computed
- Estimated scope: SMALL (1-2 files, ~10-15 lines)

## Open Questions

- **OD-508-01:** Should this metric appear in the top summary cards (alongside Total Orders, Paid Orders) or only in the Grand Total footer?
- **OD-508-02:** Should it split into Pre-Serve vs Post-Serve cancelled revenue, or just one total?
