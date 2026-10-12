# BUG-425 — PmsCheckoutDrawer ROOM Balance Excludes GST

**ID:** BUG-425
**Date:** 2026-09-16
**Source:** OWNER-REPORTED (investigation session 2026-09-16 + screenshots)
**Confidence:** CONFIRMED (code-traced + screenshot comparison)

---

## Description

When checkout is opened from the **Guest Folio page** (`/pms/folio/:id`), the `PmsCheckoutDrawer` shows the **ROOM balance without GST**:

- ROOM: ₹1,000 ❌ (missing GST ₹50)
- Grand Total: ₹1,214 ❌ (should be ₹1,264)
- Checkout button: ₹1,214 ❌

The **Dashboard checkout** (old module, same order) correctly shows:
- ROOM: ₹1,050 ✅ (includes GST)
- Grand Total: ₹1,264 ✅
- Checkout button: ₹1,264 ✅

The cashier is presented with the **wrong amount** when checking out via the folio page.

---

## Root Cause (confirmed during investigation)

`CollectPaymentPanel` computes room balance as:
```
roomBalance = roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0
```

`PmsCheckoutDrawer` fetches fresh via `SINGLE_ORDER_NEW` → backend returns `room_payment_summary.remaining_room_balance = 1,000` (backend calculation does NOT include GST). `CollectPaymentPanel` **reads this and shows ₹1,000**.

Dashboard checkout uses cached order data which has no `remaining_room_balance` populated → falls back to `balance_payment = 1,050` (stored by new CheckInPage, which includes GST) → shows ₹1,050 correctly.

---

## Confirmed Fix Path

**Path A (owner confirmed 2026-09-16):** Override `roomInfo` inside `PmsCheckoutDrawer` before passing to `CollectPaymentPanel`. Compute the correct balance from constituent fields and inject it as `remainingRoomBalance`.

Formula: `roomPrice + gstTax − advancePayment − receiveBalance`

All four fields available in `detail.roomInfo` after `orderFromAPI.order(raw)` transform.

**Does NOT touch `CollectPaymentPanel`** (hotspot file R5 — avoided).

---

## Classification

- **Type:** BUG
- **Severity:** P1 — HIGH (cashier sees wrong checkout amount; impacts every folio-page checkout)
- **Risk:** HIGH (financial display at point of checkout; drives the amount collected from guest)
- **Duplicate check:** DISTINCT — no prior item for PmsCheckoutDrawer ROOM balance gap
- **Related:** BUG-423 (folio room balance — same root pattern, different surface), BUG-401 (checkout payload), investigation 2026-09-16
- **Dependency:** BUG-423 should ideally ship in same batch (consistent formula across folio + checkout)
- **Fast Lane:** NOT eligible (HIGH financial display, R6 adjacent)

---

## Evidence

- Screenshot: Screen 2 (2026-09-16) — PmsCheckoutDrawer shows ROOM ₹1,000, Grand Total ₹1,214
- Screenshot: Screen 3 (2026-09-16) — Dashboard checkout shows ROOM ₹1,050, Grand Total ₹1,264 (correct reference)
- Source: OWNER-REPORTED + AGENT-DISCOVERED | Confidence: CONFIRMED
- Investigation doc: `/app/memory/investigations/INVESTIGATION_2026_09_16_FOLIO_CHECKOUT_GAPS.md`

---

## Code Reality

**CONFIRMED BUG** — `PmsCheckoutDrawer.jsx` L271 passes `roomInfo={detail.roomInfo || null}` directly to `CollectPaymentPanel` with no override. `detail.roomInfo.roomPaymentSummary.remainingRoomBalance` = 1,000 from fresh API call (backend excludes GST from this field).

---

## Blast Radius

- `src/components/pms/PmsCheckoutDrawer.jsx` — override `roomInfo` prop before passing to CollectPaymentPanel (~8–12 lines)
- Estimated scope: SMALL (1 file, no hotspot)

---

## Test Scenarios (owner noted — ALL must be tested)

1. Guest with advance paid (e.g. room ₹1,000 + GST ₹50 − advance ₹130 → ROOM shows ₹920)
2. Guest with mid-stay payment received
3. Guest with zero advance
4. Guest with F&B posted (room + transferred + room-native)
5. Guest checked in via old modal
6. Guest checked in via new CheckInPage

---

## Owner Decisions

| ID | Question | Status |
|----|----------|--------|
| OD-425-01 | Fix inside PmsCheckoutDrawer only (Path A) — don't touch CollectPaymentPanel | ✅ CONFIRMED |
| OD-425-02 | All 6 test scenarios must pass before ship | ✅ CONFIRMED |

---

## Next

Gate 2 — Impact Analysis (Planning role)
