# CR-509 — Order Beta Report: Order Details and Order Activity Logs

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P1 — HIGH (operational audit: full order transparency needed)
**Risk:** HIGH (major new feature — Order Details view + Activity Logs)
**Process required:** Full gate flow + regression. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #8)

---

## Description

Two features accessible from the Actions column in Order Beta report:

### A. Order Details
Full order drill-down showing:
- Item names, quantities, variations, add-ons
- Item-wise pricing
- Discounts (item-level and order-level)
- Taxes (GST/VAT breakdown)
- Payment modes and breakdown (for split/partial payments)
- Total bill amount
- Pending amount (for unpaid/partially paid)

### B. Order Activity Logs
Append-only audit trail recording:
- Order creation
- Modifications (item additions/removals, quantity changes, price changes)
- Payment collection and status changes
- Cancellations (with reason if available)
- Each event with: employee name, date/time

**Expected behavior:** Both views accessible via buttons/links in the Actions column. Logs are append-only — new events don't overwrite earlier ones.

**Current behavior:** `OrderDetailSheet.jsx` (965 lines) exists with item timeline, veg/non-veg indicators, and basic item display. But may not have full financial breakdown, payment split details, or activity logs.

**Implementation note from Excel:** "Activity history should be append-only/auditable; new events should not overwrite earlier events. Capture employee and timestamp for each supported event."

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: PARTIAL** — `OrderDetailSheet.jsx` exists (965 lines) with item display and `ItemTimeline` component (L260). `ORDER_LOGS_REPORT` endpoint exists in `constants.js:136`. The foundation is there but needs significant enhancement for full financial breakdown and activity logs.

## Duplicate Check

**DISTINCT** for Order Beta scope. BUG-643/644 are about Credit Management order details (different page).

## Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — major enhancement
- `OrderTable.jsx` (R5) — Actions column button
- `reportService.js` / `constants.js` — API calls for logs
- Possibly new `OrderActivityLog` component
- Estimated scope: LARGE (3-4 files, ~150-200 lines)

## Open Questions

- **OD-509-01:** Does the `get-single-order-new` endpoint (referenced in OrderDetailSheet L2) return all the fields needed (variations, add-ons, payment breakdown)?
- **OD-509-02:** Does the `order-logs-report` endpoint return per-order activity history, or is it a different report format?
- **OD-509-03:** Should Order Details and Activity Logs be separate tabs within the sheet, or separate buttons in Actions?
