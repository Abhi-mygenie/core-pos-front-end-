# POS3.0 BUG-097 Bucket 5 Planning Notes — 2026-05-20

> **Purpose**: Capture the owner-corrected expected delivery assignment state machine for Bucket 5 implementation planning.
> **Status**: PLANNING_ONLY — do not implement until backend provides BQ-097-2/3 event names/payloads.
> **Created by**: QA Continuation Agent
> **Date**: 2026-05-20
> **Source**: Owner smoke observation, 2026-05-20

---

## 1. Owner-Corrected Delivery Assignment State Machine

The owner's smoke QA revealed that the current post-assignment behavior is incorrect. Below is the **complete corrected state machine** for delivery orders with `delivery_assign = Yes`:

```
 fOrderStatus 2 (Ready)
         |
         v
 +---[No Rider Assigned]---+
 |                          |
 | Button: "Assign Rider"  |
 | Action: Open modal       |
 | KOT: Hidden              |
 | Serve: Hidden            |
 +----------+---------------+
            |
            v (Assign API succeeds)
 +---[Rider Assigned, Pending Accept]---+
 |                                       |
 | Button: "Reassign" / "Assign Another"|
 | Action: Open rider list modal         |
 | Show: Assigned rider name + status    |
 | KOT: Hidden                           |
 | Serve: HIDDEN (NOT shown)             |  <-- FIX NEEDED (currently shows Serve)
 +----------+----------------------------+
            |
     +------+------+
     |             |
     v             v
 [Rider Accepts]  [Rider Rejects]
     |                 |
     v                 v
 +---[Rider On The Way]---+   +---[Rider Rejected]---+
 |                         |   |                       |
 | Status: "Rider On The   |   | Button: "Reassign"    |
 |   Way" badge on card    |   | Action: Open rider     |
 | Serve: HIDDEN           |   |   list modal           |
 | KOT: Hidden             |   | Rejected rider: MARKED |
 | No action button for    |   |   in list (cashier     |
 |   cashier (waiting for  |   |   avoids re-assigning) |
 |   rider to deliver)     |   | KOT: Hidden            |
 +----------+--------------+   | Serve: HIDDEN          |
            |                   +----------+-------------+
            v                              |
 +---[Delivered / Handover]---+            |
 |                             |           |
 | Button: "Handover"         |    (Loop back to Assign)
 | Action: Existing Collect   |
 |   Bill flow                |
 | After completion: ORDER    |
 |   REMOVED from active      |
 |   dashboard (same as       |
 |   collect bill removal)    |
 +-----------------------------+
```

---

## 2. Implementation Breakdown

### 2A. Bucket 4 Corrective Patch (CAN implement now — no backend dependency)

**Issue**: After rider assigned, Serve button appears. Should show Reassign.

**Files to change**:
- `OrderCard.jsx` — L889-924: fOrderStatus 2 branching
- `TableCard.jsx` — L451-470: fOrderStatus 2 branching

**Required logic change**:
```
fOrderStatus === 2 && isDelivery:
  if (!hasRiderAssigned)     → "Assign Rider" button (existing, correct)
  if (hasRiderAssigned)      → "Reassign" button (opens AssignRiderModal)
                                + rider name/status already shown in rider section (L753-L808)
                                + NO Serve button

fOrderStatus === 2 && !isDelivery:
  → Serve button (existing, correct, unchanged)
```

**Notes**:
- The rider section (OrderCard L753-L808) already shows assigned rider name, phone, and a "Change" link. The "Change" link already opens `AssignRiderModal`. The fix is about the **main footer action button** — it should NOT be "Serve".
- Consider whether the main button should say "Reassign" or whether the rider section "Change" link is sufficient and the main button area should show no action / a status badge instead.
- Owner said "Assign Another Rider / Reassign option" — this likely means the primary action button should allow reassignment.

### 2B. Bucket 5 — Rider Accept Socket (BLOCKED on BQ-097-2)

**Requires**: Backend event name and payload for "rider accepted" socket event.

**Expected behavior when rider accepts**:
- Card shows status badge: **"Rider On The Way"**
- No Serve button
- No Reassign button (rider is en route)
- Rider section shows rider name + "On The Way" status

**Implementation needs**:
- Socket event listener registration
- Order state update when event received
- New status badge rendering (`riderStatus === 'riderOnTheWay'` or similar)
- OrderCard + TableCard button logic update

### 2C. Bucket 5 — Rider Reject Socket (BLOCKED on BQ-097-3)

**Requires**: Backend event name and payload for "rider rejected" socket event.

**Expected behavior when rider rejects**:
- Card shows **"Reassign"** button
- Opens AssignRiderModal
- **Rejected rider is marked in the rider list** so cashier does not assign the same rider again
- Need to track rejected rider IDs per order (local state or from backend)

**Implementation needs**:
- Socket event listener registration
- Order state update when event received (clear `deliveryManId` or set a rejection flag)
- AssignRiderModal enhancement: accept `rejectedRiderIds` prop, visually mark/disable rejected riders
- OrderCard + TableCard button logic update

### 2D. Delivered / Handover Completion — Dashboard Removal

**Expected**: After handover is completed, order is removed from the active delivery/dashboard list. Same behavior as collect bill completion for dine-in orders.

**Investigation needed**:
- Verify existing collect bill / payment completion flow removes orders from dashboard context
- Verify the same socket event (`update-order-paid` or similar) fires for delivery handover
- If not automatic, may need explicit dashboard context cleanup on handover success

---

## 3. Dependency Matrix

| Work Item | Can Start Now? | Backend Dependency | Frontend-Only? |
|-----------|----------------|-------------------|----------------|
| 2A. Replace Serve with Reassign after assign | YES | None | YES |
| 2B. Rider accept → "Rider On The Way" | NO | BQ-097-2 event name + payload | No |
| 2C. Rider reject → Reassign + mark rejected | NO | BQ-097-3 event name + payload | No |
| 2D. Handover → dashboard removal | MAYBE | Verify existing socket flow | Likely frontend-only |

---

## 4. Questions for Backend Team (BQ-097-2 / BQ-097-3)

These must be answered before Bucket 5 implementation can begin:

### BQ-097-2: Rider Accept Event
1. What is the socket event name? (e.g., `delivery-rider-accepted`, `order-rider-status-update`)
2. What is the payload shape? (e.g., `{ order_id, delivery_man_id, status: 'accepted' }`)
3. Does the event update `fOrderStatus` or only a rider-specific field?
4. Is there a corresponding REST API to poll rider status if socket is missed?

### BQ-097-3: Rider Reject Event
1. What is the socket event name?
2. What is the payload shape?
3. Does rejection clear `delivery_man_id` on the order, or does the backend maintain a rejection log?
4. Can the frontend get a list of previously rejected riders for an order via API?
5. After rejection, does `fOrderStatus` change or stay at 2?

### General
6. Is there a unified `delivery_man_status` field on the order that progresses through: `assigned → accepted → on_the_way → delivered`?
7. What are the exact string values for each status? (Current code checks for `riderAssigned` and `riderReached` at OrderCard L776-L793)

---

## 5. AssignRiderModal Enhancement Notes (for Bucket 5)

Current modal (`AssignRiderModal.jsx`) needs these additions for rider reject flow:

1. **New prop**: `rejectedRiderIds: number[]` — list of rider IDs who rejected this order
2. **Visual marking**: Riders in `rejectedRiderIds` should be:
   - Shown with a "Rejected" badge
   - Visually dimmed or moved to bottom of list
   - Selectable or disabled (owner to decide — cashier might want to force-reassign)
3. **Source of rejected IDs**: Either from backend order data or tracked locally via socket events

---

## 6. Endpoint URL Updates (Applied in Bucket 4.5)

| Constant | Old (v1) | New (v2) | File |
|----------|----------|----------|------|
| `DELIVERY_ORDER_ASSIGN` | `/api/v1/vendoremployee/delivery-order-assign` | `/api/v2/vendoremployee/order/delivery-order-assign` | `constants.js` L32 |
| `DELIVERY_ORDER_CANCEL` | `/api/v1/vendoremployee/delivery-order-cancel` | `/api/v2/vendoremployee/order/delivery-order-cancel` | `constants.js` L33 |

These are the endpoints for:
- **delivery-order-assign**: Rider assignment (used by Bucket 4 AssignRiderModal)
- **delivery-order-cancel**: Delivery order rejection/cancellation (defined but not yet wired — Bucket 5)

---

## 7. Decision Log

| Date | Decision | By |
|------|----------|----|
| 2026-05-20 | `delivery_assign` from restaurant profile is source of truth (not source/isOwn) | Owner |
| 2026-05-20 | After rider assigned: do NOT show Serve. Show Reassign + rider status. | Owner (smoke observation) |
| 2026-05-20 | After rider accepts: show "Rider On The Way", no Serve | Owner |
| 2026-05-20 | After rider rejects: show Reassign, mark rejected rider in list | Owner |
| 2026-05-20 | After delivered/handover: remove from dashboard (same as collect bill) | Owner |
| 2026-05-20 | Do not implement Bucket 5 until BQ-097-2/3 answered | Owner |
| 2026-05-20 | Do not delete DeliveryCard.jsx | Owner |
| 2026-05-20 | Endpoint URLs updated from v1 to v2 (delivery-order-assign, delivery-order-cancel) | Owner |
| 2026-05-20 | Bucket 4.5 corrective patch approved and applied (Serve → Reassign) | Owner |

---

## Document Metadata

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | 2026-05-20 |
| Agent | QA Continuation Agent |
| Branch | `20-may` |
| Code changed | NO |
| `/app/memory/final/` updated | NO |
