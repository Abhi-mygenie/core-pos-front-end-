# BUG-484 — Impact Analysis (Gate 2)

**ID:** BUG-484
**Title:** Room bill-pay `payment_amount` / `order_amount` / `grant_amount` includes room rent — violates handover_5 §2 F&B-only contract
**Type:** BUG
**Date:** 2026-10-01
**Code Reality:** CONFIRMED — root cause traced to `orderTransform.js:1630` + `CollectPaymentPanel.jsx:1104`
**Conflict Pre-Check:** NONE — no open CR/BUG active on `orderTransform.js` or `CollectPaymentPanel.jsx` after 2026-09-24
**Risk:** CRITICAL (R6 — DB `orders.order_amount` written with rent included → revenue reports overstated)

---

## 1. Root Cause — CONFIRMED, HIGH confidence

### Data flow

```
CollectPaymentPanel.jsx:732-734
  effectiveTotal = finalTotal (F&B)
                + associatedTotal (transferred F&B)
                + roomBalance   ← room rent included here

CollectPaymentPanel.jsx:1104
  paymentData.finalTotal = effectiveTotal   ← sends F&B + rent combined

CollectPaymentPanel.jsx:1115
  paymentData.roomBalance = roomBalance     ← carve-out passed separately

orderTransform.js:1630
  payment_amount: finalTotal || 0           ← = effectiveTotal = F&B + rent  ❌

orderTransform.js:1646
  grant_amount:   finalTotal || 0           ← = effectiveTotal  ❌

orderTransform.js:1647-1653 (ROOM_CHECKIN_GAP3 comment)
  ...(roomBalance > 0 ? { order_amount: finalTotal || 0 } : {})  ❌
```

### The comment that confirms the bug

`CollectPaymentPanel.jsx:1092-1097`:
```
// ROOM_CHECKIN_GAP3 (Stage 2): grand total payable to backend now includes
// the room outstanding balance (`roomBalance`) for room orders.
//   payment_amount = grand_total (what cashier collects)
```

This was the OLD contract (baked in 2026-04-25). Handover_5 §2 (2026-10-01) explicitly changes it:
> `payment_amount` = F&B tender total only. Do NOT fold room rent into it.

### Why `roomBalance` is already available in the transform

`paymentData.roomBalance` IS passed separately from `CollectPaymentPanel.jsx:1115`. The fix is entirely within `orderTransform.js` — no change to CollectPaymentPanel is needed.

---

## 2. Fix — Scope (SMALL — 1 file, 3 lines in orderTransform.js)

### File: `orderTransform.js` — function `collectBillExisting`

| Edit | Line(s) | Current | Correct |
|---|---|---|---|
| E1 | ~L1630 | `payment_amount: finalTotal \|\| 0` | `payment_amount: Math.max(0, (finalTotal \|\| 0) - (roomBalance \|\| 0))` |
| E2 | ~L1646 | `grant_amount: finalTotal \|\| 0` | `grant_amount: Math.max(0, (finalTotal \|\| 0) - (roomBalance \|\| 0))` |
| E3 | ~L1653 | `...(roomBalance > 0 ? { order_amount: finalTotal \|\| 0 } : {})` | `...(roomBalance > 0 ? { order_amount: Math.max(0, (finalTotal \|\| 0) - (roomBalance \|\| 0)) } : {})` |

### Local variable for clarity (recommended)

Add one line before E1:
```javascript
// BUG-484: handover_5 §2 — payment_amount/grant_amount/order_amount must be F&B-only on room stays
const fbOnlyTotal = Math.max(0, (finalTotal || 0) - (roomBalance || 0));
```
Then E1 = `payment_amount: fbOnlyTotal`, E2 = `grant_amount: fbOnlyTotal`, E3 = `order_amount: fbOnlyTotal`.

### Non-room orders: unchanged

For non-room orders `roomBalance = 0`, so `fbOnlyTotal = finalTotal`. Byte-identical to current behavior.

---

## 3. Files WILL Change

| File | R5 hotspot? | Change |
|---|---|---|
| `api/transforms/orderTransform.js` | YES | E1–E4 (1 new var + 3 line changes in `collectBillExisting`) |

## 4. Files Will NOT Touch

- `CollectPaymentPanel.jsx` — no change needed; `roomBalance` already passes through
- `PmsCheckoutDrawer.jsx` — calls `collectBillExisting`, fix is in the transform
- `FolioCheckoutPanel.jsx` — calls `collectBillExisting`, fix is in the transform
- Any other file

---

## 5. Impact on Other Flows

| Flow | Effect |
|---|---|
| Dine-in / walk-in / delivery settle | `roomBalance = 0` → fbOnlyTotal = finalTotal → **unchanged** |
| Room settle via POS Collect Payment | `payment_amount` now F&B-only ✅ |
| Room settle via PmsCheckoutDrawer | Same (calls `collectBillExisting`) ✅ |
| Room settle via FolioCheckoutPanel (Front Desk) | Same (calls `collectBillExisting`) ✅ |
| Split payment (splitPayments) | Those paths use `p.amount` per leg, not `finalTotal` → **unchanged** |
| Print payload (`buildBillPrintPayload`) | Separate function, not touched → **unchanged** |

---

## 6. Downstream — Revenue Reports

Once fixed, `orders.order_amount` in DB will reflect F&B-only. Historical orders (before fix) will still have inflated amounts. Owner should be aware the fix is forward-only.

Reports affected: **Sales Report** (CR-377) · **Settlement Report** · **Order Summary** · **Insights**

---

## 7. Open Decisions for Gate 3 / Gate 4

- **OD-484-01 (resolved by this IA):** Yes, this is a confirmed bug. Root cause found.
- **OD-484-02 (resolved):** `collectBillExisting` in `orderTransform.js` is the single source. PmsCheckoutDrawer + FolioCheckoutPanel both call it.
- **OD-484-03 (resolved):** Room-only settle (no F&B): `finalTotal = 0`, `roomBalance > 0`. After fix: `fbOnlyTotal = 0`, `payment_amount = 0`, `order_amount = 0`. Matches handover_5 example C: `payment_amount: 0` for room-only. ✅

---

## 8. Verification Matrix

| # | Edit | Verification | Method |
|---|---|---|---|
| V1 | E4 (`fbOnlyTotal` var) | Var declared before L1630 | Code read |
| V2 | E1 `payment_amount` | = fbOnlyTotal, not effectiveTotal | Curl probe: room order settle; confirm DB `order_amount` = F&B only |
| V3 | E2 `grant_amount` | = fbOnlyTotal | Same curl |
| V4 | E3 `order_amount` | = fbOnlyTotal when roomBalance > 0 | Same curl |
| V5 | Non-room regression | `payment_amount` = `finalTotal` unchanged | Curl dine-in settle |
| V6 | Room-only settle | `payment_amount = 0`, `order_amount = 0` | Curl room-only order |
| V7 | `roomBalance > 0` guard | Still present | Code read |
| V8 | Webpack | 0 new warnings | `yarn build` |

---

## 9. Risk Register

| Risk | Mitigation |
|---|---|
| Other callers of `collectBillExisting` pass `roomBalance=undefined` | `(roomBalance \|\| 0)` default handles `undefined`/`null` |
| Historical DB data remains inflated | Forward-only fix — acceptable per R6 note |
| Associated orders total still in payment_amount | Correct — `associatedTotal` = F&B from transferred orders, must stay in payment_amount |

---

## 10. Planning Skip Assessment

- ≤10 lines: YES (4 lines in 1 file)
- 1 file: YES
- Hotspot: YES (orderTransform.js is R5)
- Financial logic: YES (R6)

**Planning skip: NOT eligible** (hotspot + financial). Full Gate 4 GO required.

---

## Summary

```
Code Reality: CONFIRMED (root cause traced, comment at L1647 proves old contract)
Confidence: HIGH
Blast radius: SMALL (1 file, 4 lines)
Hotspots: orderTransform.js (R5)
Owner decisions: ALL RESOLVED in this IA
Next: Gate 3 GO → Implementation Plan
```
