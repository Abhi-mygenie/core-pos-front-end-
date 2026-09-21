# CR-357 INTAKE — Room Advance Payment: Full-Bill Deduction + Mid-Stay Deposits + Credit Overflow
**Date:** 2026-09-02 | **Priority:** P2 (downgraded — see OD-357-PARK) | **Risk:** HIGH | **Status:** PARKED — 15 DAYS (2026-09-14)

---

## Description

Room orders currently take an advance at check-in. However:
1. The advance is only deducted from the **room charge** portion — food charges are not offset
2. The advance amount is **not visible** on the dashboard card while the order is running
3. Multiple mid-stay deposits can be taken but are not surfaced in the UI
4. If advance > final bill, excess is silently lost (clamped to ₹0)

Owner decisions frozen 2026-09-02.

---

## OD-357-PARK — PARKED 15 DAYS (2026-09-14)

**Owner decision:** CR-357 parked for ~15 days from 2026-09-14.

**Rationale (owner-stated + probe-confirmed):**
- Room advance is taken **at check-in only**. Whatever happens during the stay goes to food (SRM orders).
- This hotel is **not currently taking room advances** — probe confirmed `advance_payment = 0.00` on live order 1232245.
- With no advance in use, the `+ Pay` button (interim-disabled at CartPanel.jsx:1484) shows ₹0 balance — staff have nothing to interact with regardless.
- **Zero operational impact** for the next 15 days.

**Priority downgraded:** P1 → P2 (no active user pain while advances not in use).

**Re-enable trigger:** When hotel begins taking room advances at check-in, this CR becomes P1 again. Gate 2 Impact Analysis is fully unblocked (all 7 ODs resolved including OD-7).

**Re-evaluate date:** ~2026-09-29

---


| # | Decision | Value |
|---|---|---|
| OD-1 | **Advance covers** | Room + Food combined (entire stay) |
| OD-2 | **Deduction timing** | At checkout — advance deducted from (room_price + food_total) |
| OD-3 | **Mid-stay deposits** | Yes — multiple advances can be taken while order is running |
| OD-4 | **Excess advance (advance > total bill)** | Add to credit account |
| OD-5 | **Negative credit** | Allowed — no block on credit going negative |
| OD-6 | **Dashboard display while running** | Staff should see advance taken + outstanding balance on card |
| OD-7 | **Backend responsibility** | ✅ **ANSWERED 2026-09-14 (Q-366-06):** `remaining_room_balance` = room component ONLY (excl F&B). **Option B confirmed.** FE computes combined balance as `roomBalance + associatedOrdersTotal`. Night-audit endpoint splits `room_balance` vs `fnb_balance` separately. |

---

## Current Behaviour vs Required

| Scenario | Current | Required |
|---|---|---|
| Room ₹2,000 + Food ₹3,000 + Advance ₹3,000 | Shows Grand Total ₹3,000 (food only; room advance excess lost) | Shows Grand Total ₹2,000 (combined ₹5,000 − advance ₹3,000) |
| Advance > total bill | Excess silently lost (clamped ₹0) | Excess → credit account |
| Dashboard card while running | No advance info shown | Show advance paid + outstanding balance |
| Multiple mid-stays | Computed via `remainingRoomBalance`, not displayed | Show payment history or at minimum net outstanding |

---

## Code Reality: PARTIAL

Current code that exists and works:
- `CollectPaymentPanel.jsx` — shows Room section: Room Charge / Advance Paid / Balance at checkout ✅
- `orderTransform.js` — maps `roomPaymentSummary.remainingRoomBalance` (live backend value) ✅
- `RoomRowCard.jsx` — shows Total / Advance / Balance in room orders report ✅
- `RecordPaymentModal.jsx` — accepts mid-stay payments ✅

What's missing (FE work needed):
- `CollectPaymentPanel.jsx` — advance deduction formula needs to be (room + food) − advance, not just room − advance
- Dashboard card (OrderCard / DineInCard) — no advance/balance display while running
- Grand Total computation — `effectiveTotal` = food + max(0, roomBalance) needs to become food + max(0, combined − advance)
- Credit posting when advance > total bill

---

## Backend Dependency (OPEN — must confirm before Gate 3)

**OD-7 question:** Does backend `remaining_room_balance` already account for food charges, OR is it always (room_price − advance_payment) only?

- If backend changes `remaining_room_balance` = (room_price + food_total − all_advances) → FE just uses that field directly
- If backend stays room-only → FE computes: `combinedBalance = (order_amount + room_price) − advance_payment − ledger_paid_amount`

---

## Duplicate Check: DISTINCT
Related: CR-162 (mid-stay payments, implemented), BUG-360 (live balance, implemented)

## Blast Radius: MEDIUM
- `CollectPaymentPanel.jsx` (hotspot R5) — effectiveTotal formula
- `orderTransform.js` (hotspot R5) — grand_total payload field
- `OrderCard.jsx` or `DineInCard.jsx` — new advance display
- `creditService.js` — credit posting for excess

## Next: Gate 2 (Impact Analysis) — UNBLOCKED 2026-09-14

OD-7 answered (Q-366-06): `remaining_room_balance` = room-only. Option B path confirmed. All 7 ODs resolved. Gate 2 Impact Analysis ready.

**Interim fix:** `+ Pay` button disabled (BUG FIX 2026-09-14). Awaiting Gate 4 GO to re-enable with corrected formula.

*Intake: 2026-09-02 | Updated: 2026-09-14 — OD-7 ANSWERED (Q-366-06: room-only balance confirmed, Option B). Interim fix applied. Gate 2 UNBLOCKED. | Code reality: PARTIAL | Blast radius: MEDIUM | Risk: HIGH | **UNBLOCKED — READY FOR GATE 2***
