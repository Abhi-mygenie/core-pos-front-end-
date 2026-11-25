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

---

## 11. Owner Decisions (2026-11-17)

| # | Question | Answer | Status |
|---|----------|--------|--------|
| OD-509-01 | Reuse OrderDetailSheet or build new? | **Reuse existing OrderDetailSheet** — import into Beta, wire row click | LOCKED |
| OD-509-02 | How to access Details + Activity? | **Needs design mockup** — owner not sure, wants design suggestion | OPEN |
| OD-509-03 | Plain English labels? | **Yes** — "Bill printed" not "bill print", "Payment collected" not "order bill payment" | LOCKED |

### Owner Clarification — Lifecycle Coverage (OD-509-04, NEW):

> "Complete lifecycle of order and item should be covered. Item horizontal movement, order vertical movement."

**Interpretation:**

- **Item = horizontal movement** — each item's journey across KDS stages:
  `Punched → Preparing → Ready → Served → (Cancelled)`
  Shown as a horizontal timeline/progress bar per item. Each stage with timestamp + actor.

- **Order = vertical movement** — the order's lifecycle as a chronological vertical list:
  `Created → Items added → Bill printed → Payment collected → Settled → (Made unpaid → Re-paid)`
  Shown as a vertical timeline. Each event with timestamp + actor + amount changes.

This maps to what OrderDetailSheet already has:
- `ItemTimeline` component (L258+) = item horizontal movement ✅
- `Activity Log` section (L804-852) = order vertical movement ✅

The "revamp" is about:
1. Plain English labels (OD-509-03 locked)
2. Clear visual separation: items move horizontally, order events flow vertically
3. Design mockup needed for the access pattern (OD-509-02)

### Next:
- Design mockup for OD-509-02 (how Details + Activity are accessed in Beta)
- Then Gate 2 Impact Analysis

---

## 12. Lifecycle Coverage Specification (2026-11-17 Owner Clarification)

### Item Lifecycle — Horizontal Movement

**KDS stages (happy path):** `Punched → Preparing → Ready → Served`

**Cancel is context-dependent, not a single stage:**

| Cancel Scenario | Risk | Flags |
|----------------|------|-------|
| Cancel before preparing (0-5 min) | OK | Time only |
| Cancel during preparing (5-15 min) | Doubt | Time + KDS stage |
| Cancel after ready (15-30 min) | Risk | Time + KDS stage |
| Cancel after served (30+ min) | High Risk | Time + KDS stage |
| Cancel after bill print | Fraud flag | `bill_printed_at` + gap |
| Cancel after unpaid | Fraud flag | `made_unpaid_at` + gap |
| Cancel after print AND unpaid | Multi-flag | All flags shown |

**Display:** Horizontal timeline per item showing stage progression + cancel point with risk badge, time gap, and context flags (after-print, after-unpaid).

**Suggested new backend field:** `kds_stage_at_cancel` — snapshot item's food_status when cancelled. Tells you food waste (was it cooked?) vs fraud risk (how long?). Currently NOT tracked.

### Order Lifecycle — Vertical Movement

**20 event types in chronological order:**
1. Order Created → 2. Items Added → 3. Item Cancelled → 4. Discount Applied → 5. Discount Removed → 6. Discount Replaced → 7. Bill Printed → 8. Bill Reprinted → 9. Payment Collected → 10. Payment Method Changed → 11. Order Settled → 12. Made Unpaid → 13. Re-paid → 14. Transferred to Room → 15. Transferred from Room → 16. Order Cancelled → 17. Customer Linked/Unlinked → 18. Complimentary Applied → 19. Item Qty Changed → 20. Item Transferred

**Display:** Vertical timeline with:
- Running ₹ total on the left at each step
- Amount diffs inline ("-₹80" in red)
- Audit flags inline (🔴 High Risk / 🖨️ After Print / 🔓 After Unpaid)
- Plain English labels (OD-509-03 locked)
- Actor + timestamp per event

### Design Principles (owner-approved):
1. Items = horizontal movement (KDS stage progression)
2. Order = vertical movement (chronological event timeline)
3. Plain English labels
4. Running total shows how final amount was reached
5. Multi-flag events show all applicable badges (Approach C overlap)
6. Net financial summary at bottom

### Open Items for Next Agent:
- OD-509-02: Access pattern (how sheet is opened in Beta) — needs design mockup
- `kds_stage_at_cancel`: Suggested backend addition — not registered yet, owner to decide priority
