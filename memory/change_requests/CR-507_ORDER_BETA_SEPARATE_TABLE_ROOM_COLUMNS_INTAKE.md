# CR-507 — Order Beta Report: Separate Table Number and Room Number Columns

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P2 — MEDIUM (data visibility: users need to see which table/room each order belongs to)
**Risk:** LOW (additive columns, no existing logic modified)
**Process required:** Full gate flow. FAST LANE eligible? **NO** (OrderTable.jsx R5)
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #6)

---

## Description

Add separate **Table Number** and **Room Number** columns to the Order Beta report table. Dine-in orders show table number; room-service orders show room number in the appropriate column. Do not combine table and room details into one column.

**Expected behavior:**
- New "Table #" column for dine-in orders
- New "Room #" column for room-service orders
- Each column shows the relevant identifier; blank/dash for non-applicable order types
- Order #023216 (Dinein) → Table # shows "4", Room # blank
- Room service order → Room # shows "201", Table # blank

**Current behavior:** Report shows Order#, Time, Platform, Type, Waiter, Items, Amount, GST, Service, Payment, Status, Actions. No Table or Room column.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement + screenshot)
- **Confidence:** CONFIRMED (screenshot shows no Table/Room columns)

---

## Code Reality Check

**Code reality: PARTIAL** — `OrderTable.jsx:124-133` has a comment: "CR-001 Phase 2 — Replaced legacy 'table'/'waiter' columns with three new columns". The legacy table column was replaced. Order data likely contains table/room info. `displayOrderId` already has T-/R- prefix (L133).

## Duplicate Check

**DISTINCT.**

## Blast Radius

- `OrderTable.jsx` (R5, 947 lines) — `getColumns()` + cell renderer
- `reportService.js` — ensure table/room data is in transformed response
- Estimated scope: SMALL (1-2 files, ~15-20 lines)

## Open Questions

- **OD-507-01:** Should these columns appear on ALL tabs or only specific ones?
- **OD-507-02:** Column position — after Type? After Waiter? Before Amount?
