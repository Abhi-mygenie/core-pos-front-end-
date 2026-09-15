# CR-357 Owner Decisions — Room Advance Payment
**Date frozen:** 2026-09-02
**Source:** Owner session (chat) 2026-09-02

---

## Frozen Decisions

| ID | Decision | Value | Owner confirmation |
|---|---|---|---|
| OD-1 | **Advance scope** | Covers **room + food combined** (not room-only) | "reduces final bill" — confirmed advance is against full stay |
| OD-2 | **Deduction timing** | At checkout only | "during checkout" |
| OD-3 | **Multiple mid-stay advances** | YES — allowed while order is running | "Yes" |
| OD-4 | **Excess advance (advance > total bill)** | Add to credit account | "add to credit" |
| OD-5 | **Negative credit** | ALLOWED — no block | "no need to curl if it takes negative value" |
| OD-6 | **Dashboard card display** | Show advance paid + outstanding balance while order is running | implied by "not getting displayed anywhere on card" complaint |

---

## OD-7 — ANSWERED 2026-09-14

**Question:** Will backend update `remaining_room_balance` to mean (room_price + food_total − all_advances_paid)?

✅ **ANSWERED — Option B (2026-09-14, Q-366-06 in BE reply `sep_14_be_reply.md`):**

> "Outstanding room balance = room component only (excl F&B)"

Backend keeps room-only balance. Night-audit endpoint additionally splits `room_balance` vs `fnb_balance`.

**FE implementation (Option B):**
`combinedBalance = roomInfo.balancePayment (room-only) + associatedOrdersTotal (food)`

Remove `Math.max(0, ...)` clamp once Gate 2 plan approved — excess advance posts to credit (OD-4).

---

## What currently works (DO NOT break)

1. **CollectPaymentPanel** — Room section shows: Room Charge / Advance Paid (−₹X) / Balance ✅
2. **RoomRowCard (Room Orders Report)** — Total / Advance / Balance columns ✅
3. **RecordPaymentModal** — mid-stay payment recording ✅
4. **orderTransform** — `roomPaymentSummary.remainingRoomBalance` mapped (live balance) ✅

## What needs building (CR-357 scope)

1. **Grand Total formula** — effectiveTotal must use (food + room − advance), not just food + max(0, room − advance)
2. **Dashboard card** — show advance paid + outstanding while order is live (OrderCard or DineInCard)
3. **Credit posting** — when advance > final bill, call creditService with excess amount
4. **Checkout display** — update Room section breakdown if formula changes

---

## Constraints

- `CollectPaymentPanel.jsx` and `orderTransform.js` are **hotspot R5 files** — require explicit file-level plan
- Credit module exists (`creditService.js`) — no new endpoint needed, just call add-credit
- `Math.max(0, ...)` clamp on roomBalance must be REMOVED once formula change is confirmed
