# BUG-755 — Dashboard Room Tile Amount Differs Between Table View and Order View

**ID:** BUG-755
**Type:** BUG
**Date:** 2026-11-27
**Reporter:** owner@palmforest.com (Palm Forest)
**Source:** OWNER-REPORTED + AGENT-INVESTIGATION (INVESTIGATION role, 8/10 steps, HIGH confidence)

---

## Summary

Room order cards on the dashboard show **different amounts** depending on which view is active:

| Room | Table View | Order View | Difference |
|------|-----------|-----------|------------|
| R1 (saurav, 10d) | ₹473 | ₹126 | ₹347 (room booking balance) |
| R2 (Test, 10m) | ₹525 | ₹0 | ₹525 (room balance, no food yet) |
| R9 (Bartlomiej, 14d) | ₹420 | ₹420 | ₹0 (no room balance — consistent) |
| TB1 (Dine-In) | ₹368 | ₹368 | ₹0 (dine-in unaffected) |

The cashier sees a lower — and misleading — number in Order View, which could lead to under-collection or confusion about how much is owed for a room stay.

---

## Root Cause

**Classification: FE_BUG / CODE_ERROR**

`DashboardPage.jsx` has two amount calculation paths:

**Table View** (TableCard rendering):
```javascript
// allRoomsList (line 740):
amount: computeRoomCardAmount(order)
// = food + serviceTax + transferredOrders + max(0, remainingRoomBalance − discountAmount)
```

**Order View** (OrderCard rendering via viewType prop switch at ~line 2066):
```javascript
// OrderCard receives raw order object → renders:
order.amount  // = F&B subtotal only
```

For rooms with an outstanding booking balance (roomPaymentSummary.remainingRoomBalance > 0), `computeRoomCardAmount` > `order.amount`. Order View never includes the room booking balance in the displayed figure.

**Break point:** `DashboardPage.jsx` ~L2066 — `viewType={activeView === 'table' ? 'table' : 'order'}` switches room rendering from TableCard (uses `item.amount = computeRoomCardAmount`) to OrderCard (uses `order.amount`).

---

## Evidence

- **Screenshots:** provided by owner (Table View vs Order View, same session, same restaurant)
- **Confidence:** HIGH — traced through `computeRoomCardAmount` function (DashboardPage.jsx L57-68) + `allRoomsList` amount assignment (L740) + Order View rendering path
- **Related fixed bug:** BUG-532 (CLOSED, QA_PASS) — fixed service charge exclusion in `computeRoomCardAmount`. This bug is about room balance exclusion in Order View.
- **Curl probe:** Auth token obtained (preprod); room balance delta probe not run (palmforest RID credentials not in memory store)

## Evidence Artifacts

Saved to: `/app/memory/evidence/BUG-DASH-PRICE-VIEW/`

---

## Classification

| Field | Value |
|-------|-------|
| **Severity** | P1 — financial display wrong; cashier sees incorrect room amount in Order View |
| **Risk** | HIGH — financial display, `DashboardPage.jsx` is R5 hotspot, PMS/room billing area |
| **Duplicate check** | DISTINCT — RELATED to BUG-532 (SC gap, now CLOSED), different root cause (balance exclusion) |
| **Code Reality** | NONE — `computeRoomCardAmount` exists but not used in Order View path |
| **Fast Lane eligible** | NO — hotspot file + financial display |
| **Blast radius** | SMALL (~1 file, 1 target area: Order View room rendering) |
| **Client** | ALL (any restaurant using PMS/rooms) |
| **Assignee** | Abhishek |
| **Sprint** | nov_cr_batch |
| **Area** | Dashboard / PMS |

---

## Steps to Reproduce

1. Log in as `owner@palmforest.com` (or any PMS restaurant with active room orders that have outstanding booking balances)
2. Navigate to Dashboard → note room tile amounts in **Table View**
3. Switch sidebar to **Order View**
4. Compare room tile amounts — rooms with booking balances show lower amounts

---

## Fix Direction (for Planning Gate 2)

When rendering Room OrderCards in the Order View path, pass `computeRoomCardAmount(order)` as the displayed amount instead of relying on `order.amount` from the raw order object. The function already exists at `DashboardPage.jsx:57`.

**Single file:** `DashboardPage.jsx` (~1-5 lines at the Order View room rendering call site)

---

## Open Questions for Planning

None — root cause is clear. Planning agent should verify exact rendering call site for Room OrderCards in Order View and confirm the fix does not affect Dine-In OrderCards (which should keep using `order.amount`).

---

## Next: Planning Gate 2 (Impact Analysis)
