# BE-2 — Lodging Payment Breakdown (room_info shape extension)

**Status:** OPEN — backend ask, blocking accurate "cash-in-till" reporting on the Room Orders Report
**Filed by:** Frontend (CR-004 Phase 2 follow-up)
**Date:** 2026-04-29
**Priority:** P1 — UI ships an approximation today; this enables an accurate version
**Affected endpoints:**
- `GET /api/v2/vendoremployee/get-single-order-new` (RM-parent response)
- `POST /api/v2/vendoremployee/report/order-logs-report` (RM rows — ideally add too, to drop the 1+N detail-fetch pattern)

---

## 1. Problem statement

The Room Orders Report (`/reports/rooms`) and any future room-checkout reconciliation need to answer **"how much money actually hit the till for this room, and how much was discounted?"**

Today's backend payload does not expose this. The frontend can compute "billed amount" but not "collected amount". For checked-out rooms with non-zero `balance_payment`, we cannot tell whether:
- (a) a discount/write-off was applied, or
- (b) backend simply never updated the balance after checkout, or
- (c) the operator genuinely failed to collect.

All three look identical in today's payload.

---

## 2. Live evidence (preprod, Mantri tenant, 2026-04-29)

Order id=731926 (R1, guest "PRITI", `restaurant_order_id=000972`) — fully checked out, food bill collected:

```jsonc
// Today's /get-single-order-new(731926) — relevant fields only
{
  "id": 731926,
  "f_order_status": 6,                  // settled at order level
  "payment_method": "cash",             // food bill collected in cash
  "payment_status": "paid",
  "order_amount": 4821,                 // own food
  "collect_bill": "2026-04-29 22:08:12",
  "room_info": {
    "room_price":      "5000.00",
    "advance_payment": "2000.00",
    "balance_payment": "3000.00"        // still ₹3,000 — discount? bug? unpaid?
  },
  "associated_order_list": [
    { "id": 731928, "order_amount": 981 } // SRM child, transferred food
  ]
}
```

The room is no longer returned by `/get-room-list` (i.e., backend has marked it checked-out), yet `balance_payment = 3000` lingers. Frontend has **no field to disambiguate** the three scenarios above.

---

## 3. Current frontend workaround (locked, but approximate)

Per the product rule **"f_order_status === 6 ⇒ entire order paid; any residual `balance_payment` is treated as a discount"**, the Room Orders Report computes:

```
total       = room_price + food
isSettled   = (RM_parent.f_order_status === 6)
outstanding = isSettled ? 0 : (food + max(0, balance_payment))
paid        = total − outstanding
```

For PRITI this renders **Total ₹10,802 / Paid ₹10,802 / Outstanding ₹0**. It's the safest display under current data — but the **₹10,802 "Paid" is the billed amount, not money-in-till**. If a discount was applied, actual cash collected is ₹7,802; if backend bug, actual is the same as we display; if operator missed collection, actual cash gap goes hidden.

---

## 4. Requested backend change

### 4.1 Add three fields to `room_info` (mandatory)

```jsonc
"room_info": {
  // existing
  "room_price":      "5000.00",
  "advance_payment": "2000.00",
  "balance_payment": "3000.00",

  // NEW — required
  "lodging_collected":   "2000.00",  // sum of money received against the room
                                     //   (advance + any checkout collection)
                                     //   Always ≥ advance_payment.
  "discount_amount":     "3000.00",  // explicit write-off applied at checkout
                                     //   For in-house rooms: 0
                                     //   For settled rooms: room_price − lodging_collected
                                     //                       (or whatever was approved)
  "discount_reason":     null        // optional free text. null when discount_amount = 0.
}
```

**Invariants the backend must honour (so frontend can validate):**
```
lodging_collected + discount_amount + balance_payment === room_price
discount_amount === 0      while the room is in-house
balance_payment  === 0     when the room is checked out cleanly (no leftover)
```

### 4.2 (Optional, recommended) Per-method payment breakdown

Today we know food was collected via `payment_method = cash` (single value). When ops eventually allows split-payment at checkout (cash + card, etc.), one method field is insufficient. Add:

```jsonc
"room_info": {
  …
  "payment_breakdown": [
    { "method": "cash", "amount": "2000.00", "at": "check_in" },
    { "method": "upi",  "amount": "0.00",    "at": "checkout" }
  ]
}
```

`at` ∈ `"check_in" | "checkout" | "mid_stay"`. If split-payment is out-of-scope for now, omit this — the three fields in §4.1 are sufficient for the immediate ask.

### 4.3 Mirror the same fields on `/order-logs-report` rows (P2)

Today the Room Orders Report fires `/get-single-order-new` per row to read `room_info`. Adding `room_info` (with the new fields) to the `orders_table` payload of `/order-logs-report` would cut N detail calls per page load.

This is the same ask as **BE-1 P6** ("`room_info` on RM rows in `/order-logs-report`"). Subsume that ticket into this one once §4.1 is delivered.

---

## 5. Why this matters (business)

- Operators cannot today reconcile end-of-day cash without exporting and manually subtracting. With these fields, the Room Orders Report's Paid pill SummaryBar becomes **actual cash to expect from rooms**, with a separate Discount column showing approved write-offs.
- Audit trail: Owner/Manager can spot rogue discounts in real-time (high `discount_amount` rooms).
- Splits/partial collections become representable when `payment_breakdown` (§4.2) ships.

---

## 6. Frontend follow-up after delivery

Once §4.1 lands, the formula collapses to (~10 lines in `RoomRowCard.numbers`):
```
total       = room_price + food
paid        = lodging_collected + (food_paid_amount)         // food_paid via fos===6
discount    = discount_amount
outstanding = total − paid − discount                        // exact
```
Plus a new Discount column on the row strip and SummaryBar (1 column, mirrors Bucket A's PR-1 pattern).

If §4.2 ships, OrderDetailSheet's room view can show the per-method paid breakdown.

If §4.3 ships, the 1+N detail-fetch pattern on `/reports/rooms` collapses to a single endpoint call — page load gets noticeably faster on tenants with many rooms.

---

## 7. Acceptance criteria (testable on a single sample room)

Given:
- room_price = 5000
- advance_payment = 2000
- discount applied at checkout = 3000
- nothing else collected

Then `/get-single-order-new(roomOrderId).room_info` must return:
```jsonc
{
  "room_price": "5000.00",
  "advance_payment": "2000.00",
  "balance_payment": "0.00",          // 0 because the discount cleared it
  "lodging_collected": "2000.00",
  "discount_amount": "3000.00",
  "discount_reason": "<approver_note_or_null>"
}
```

And the invariant `2000 + 3000 + 0 === 5000` holds.

---

## 8. Related tickets

- **BE-1 P6** — `room_info` on `/order-logs-report` RM rows. Subsume into §4.3.
- **BE-1 G3** — `associated_order_list[i].payment_status` refresh post-settlement. Independent, still pending.
- **CR-004 Bucket A (PR-1)** — Frontend Paid column shipped on `/reports/rooms` using approximate formula; will switch to exact formula on §4.1 delivery.
- **CR-001 Bucket D-1** — Frontend SRM-badge fix. Unrelated to this ticket.
