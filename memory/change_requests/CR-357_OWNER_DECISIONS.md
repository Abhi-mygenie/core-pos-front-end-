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

## Open Decision (OD-7) — Backend confirmation required

**Question:** Will backend update `remaining_room_balance` to mean (room_price + food_total − all_advances_paid)?

- **Option A (backend changes):** `remaining_room_balance` = combined balance. FE just uses it directly. Zero FE formula change.
- **Option B (FE computes):** Backend keeps room-only. FE computes: `(order.amount + roomInfo.roomPrice) − roomInfo.advancePayment − (roomInfo.roomPaymentSummary?.ledgerPaidAmount ?? 0)`

**Impact on implementation:** Option A is cleaner and safer (backend owns the math). Option B works but FE must handle edge cases (food amount timing, mid-stay payment sync).

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
