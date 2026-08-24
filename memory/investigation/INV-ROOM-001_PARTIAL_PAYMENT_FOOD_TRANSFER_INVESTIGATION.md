# INVESTIGATION REPORT — Room Module: Partial Payment & Food-to-Table Transfer

**ID:** INV-ROOM-001
**Date:** 2026-08-17
**Role:** INVESTIGATION
**Status:** COMPLETE — root cause identified for both cases, recommendations provided
**No code written this session.**

---

## Scope

Two owner-raised scenarios in the Room module:
1. Guest has ₹10k bill (room + food); pays ₹5k at check-in; wants to pay balance at or during checkout
2. Food already punched against a room; guest wants to pay a specific order separately; staff want to move that food to a dynamic table

---

## Case 1 — Partial Payment / Balance at Checkout

### What the Code Does Today

**Check-in (`roomService.checkIn`):**
```
advance_payment  → e.g. ₹5,000 (paid now)
balance_payment  → e.g. ₹5,000 (= room_price − advance, owed later)
receive_balance  → ₹0 (mid-stay payments, if any)
```

**Checkout (`CollectPaymentPanel.jsx` lines 182–184):**
```js
const roomBalance = isRoom && roomInfo
  ? Math.max(0, roomInfo.balancePayment || 0)   // ← the ₹5,000 owed
  : 0;
```

`effectiveTotal` = food items + associated order transfers + `roomBalance`
→ The ₹5,000 outstanding room balance IS already included in the checkout total.

**`receive_balance` field (mid-stay payments):**
```
orderTransform.js line 398:
  receiveBalance: parseFloat(api.room_info.receive_balance) || 0

RoomOrdersReportPage line 550–555:
  const receiveBalance = parseFloat(ri.receiveBalance) || 0;
  paid = advance + receiveBalance   ← backend already tracks mid-stay payments
```

### Finding

**SCENARIO A — Guest pays ₹5k at check-in, pays rest at checkout:**
→ **This already works.** At checkout, `CollectPaymentPanel` shows the outstanding balance (₹5k) inside the checkout total. The collect-bill flow handles it. No gap.

**SCENARIO B — Guest wants to pay a ₹2k intermediate payment on Day 3 (mid-stay partial):**
→ **NOT supported in the frontend.** The `receive_balance` field exists in the backend's `room_info` and IS read by the reports page — but there is **no frontend button or flow to record a mid-stay partial payment**. There is no "Record Payment" action on an active room card.

### Root Cause (Scenario B gap)

No "Record Mid-Stay Payment" UI flow exists. The backend field (`receive_balance`) is ready; only the frontend trigger is missing.

### Recommendation — Case 1

**Option A (Recommended): "Record Payment" button on the room order card**
- Add a "Collect Payment" or "Record Payment" action on the active room card (DashboardPage or RoomOrdersReportPage)
- Staff enter amount + payment method → POST to backend → `receive_balance` updated
- Outstanding balance displayed on room card updates immediately
- Needs backend endpoint: `PUT /room-order/{orderId}/receive-payment` or similar — **confirm with backend**

**Option B: Allow collect-bill mid-stay without full checkout**
- On the room order's OrderEntry view, allow a "Partial Collect" that records the amount against `receive_balance` without triggering checkout
- More complex — involves distinguishing a "partial collect" from a real checkout in the payment payload

**Verdict:** Option A is cleaner. Backend endpoint likely already exists (since `receive_balance` is populated in reports) — needs endpoint contract confirmation.

---

## Case 2 — Transfer Food from Room to a Dynamic Table

### What the Code Does Today

**`TransferFoodModal.jsx` (individual item transfer):**
```js
// BUG-066: Exclude room orders — rooms use orderType 'dineIn'
// but are not valid food transfer destinations
!o.isRoom   ← line 22
```
Rooms are **blocked as DESTINATIONS** for food transfer. The modal currently transfers items **to tables only**.

**`TRANSFER_FOOD` endpoint:**
`POST /api/v2/vendoremployee/order/transfer-food-item`
Used for item-level transfers (table-to-table). SOURCE order can be any order type — the frontend doesn't block room orders as source.

**`ORDER_TABLE_SWITCH` endpoint:**
`POST /api/v2/vendoremployee/order/order-table-room-switch`
Used for full-order shifts between tables/rooms. Shifts the ENTIRE order — not individual items.

**`ORDER_SHIFTED_ROOM` endpoint:**
`POST /api/v2/vendoremployee/order/order-shifted-room`
Transfers a TABLE order into a room (adds it as associated order). Direction: table → room only.

**`MERGE_ORDER` endpoint:**
`POST /api/v2/vendoremployee/order/transfer-order`
Merges one full order into another. Order-level, not item-level.

### Finding

**No room-to-table food transfer flow exists.** The three transfer mechanisms (item-level, full-order shift, merge) all work table↔table or table→room. None handles room→table direction for individual items.

The "create dynamic table" requirement means: create a new empty table order, move specific food items from the room to it, then the guest settles that table order independently.

### Root Cause

`TransferFoodModal` blocks rooms as destinations (BUG-066) but never addressed rooms as SOURCE with a table as destination. The `TRANSFER_FOOD` API itself may support this — it accepts `from_order_id` and `to_order_id` — but has not been tested or enabled for the room→table direction from the frontend.

### Recommendation — Case 2

**Option A (Recommended): "Move Items to Table" on room order**

*Flow:*
1. Staff opens room order in OrderEntry
2. Per-item "Move to Table" button (extends existing `TransferFoodModal` — rooms as source, table as destination)
3. Staff picks a free table (or a new auto-created temporary table)
4. Backend moves those items: room order loses them; table order receives them
5. Staff collects the table order normally — guest settles at the table
6. Room balance automatically reduces by the moved items' value

*Technical path:*
- Use existing `TRANSFER_FOOD` endpoint — confirm backend accepts room order as source
- Remove the `!o.isRoom` destination block for this specific flow (or add a separate "Move to Table" action distinct from the normal TransferFoodModal)
- If backend needs a new dynamic-table-creation step: confirm `POST /create-temp-table` or similar

**Option B: "Split Room Bill" dedicated flow**
- A "Split Bill" button on the room card that lets staff select items and create a companion table order
- More UX polish but same underlying mechanics as Option A
- Cleaner presentation for the guest

**Option C: "Shift Order" to a new table (full-order move)**
- Use `ORDER_TABLE_SWITCH` to move the entire room order to a table temporarily
- Guest settles the table, then staff re-attaches remaining room charges
- NOT recommended — too disruptive, loses room booking context

**Verdict:** Option A is the right approach. Key unknown: does `/transfer-food-item` accept a room order as the source `from_order_id`? **Backend confirmation needed before planning.**

---

## Summary Table

| Case | Current State | Gap | Recommended Fix | Backend Needed |
|------|--------------|-----|-----------------|----------------|
| 1A: Pay balance at checkout | **WORKS** — roomBalance in effectiveTotal | None | No action needed | No |
| 1B: Mid-stay partial payment | Backend field exists (`receive_balance`) | No frontend "Record Payment" flow | Add "Record Payment" button on room card | Confirm endpoint |
| 2: Move food to table | No room→table item transfer | `TransferFoodModal` blocks it | Extend TransferFoodModal; confirm TRANSFER_FOOD accepts room source | Confirm endpoint supports room as source |

---

## Open Questions for Owner / Backend

| # | Question | Case |
|---|----------|------|
| OQ-1 | Does a backend endpoint exist for mid-stay partial payment (`receive_balance` update)? If yes, what is the URL + payload? | Case 1B |
| OQ-2 | Does `/transfer-food-item` accept a room order as the `from_order_id`? | Case 2 |
| OQ-3 | For the dynamic table creation in Case 2 — should it be an existing free table the staff picks, or should the backend auto-create a temporary table? | Case 2 |
| OQ-4 | When food items are moved from room to table (Case 2) — should the room's outstanding balance auto-reduce, or does it stay and staff manually adjust? | Case 2 |

---

## Recommended Next Steps

1. **Case 1A** — Educate staff. Already works. No code needed.
2. **Case 1B** — Register as **CR-162**: "Mid-Stay Partial Payment for Room Orders". Backend endpoint confirmation first.
3. **Case 2** — Register as **CR-163**: "Move Food Items from Room to Table". Backend must confirm TRANSFER_FOOD supports room-as-source before Gate 3.

---

*Investigation complete. No code written. All recommendations are subject to owner approval and backend confirmation.*
