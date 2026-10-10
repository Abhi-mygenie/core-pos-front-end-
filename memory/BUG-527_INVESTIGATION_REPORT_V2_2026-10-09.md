# INVESTIGATION REPORT — BUG-527 (Revised): Dashboard CPP Missing Check-In Discount + Split Validation
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:            2026-10-09 (re-investigation per owner clarification)
Trigger:         Owner clarification: (1) CPP Room section must show check-in discount like
                 "Advance Paid" and subtract it from room balance; (2) split validation
                 must be food-only so split button enables at food total (₹248)
Files read:      CollectPaymentPanel.jsx, orderTransform.js, PmsCheckoutDrawer.jsx
Steps used:      8 / 10
Code changed:    NONE
```

---

## Owner Directives (now locked)

- **OD-BUG527-01:** Show check-in discount in CPP Room section (read-only, like Advance Paid). No checkout/room-split controls in dashboard CPP.
- **OD-BUG527-02:** Room section Balance must reflect check-in discount (₹1,600 → ₹600). Food-only split validation (₹248 covers the split button).

---

## 1. Summary

| Sub-Issue | Root Cause | Classification | Confidence |
|---|---|---|---|
| **A** — Room section shows wrong balance (₹1,600 not ₹600); check-in discount absent | CPP `roomBalance` memo reads `remainingRoomBalance=1600` from API; never subtracts `roomInfo.discountAmount=1000`. Room section JSX never renders a check-in discount line. | FE_BUG | HIGH |
| **B** — Split button gray despite Remaining ₹0.00 | CPP split disabled check (L3311) uses `effectiveTotal=food+room=848`; split sum covers only food (₹248); 248<848 → disabled. "Remaining" display uses `finalTotal` (food-only) → misleading. | FE_BUG | HIGH |

---

## 2. Data Flow Trace

### Sub-Issue A — Check-in discount missing

```
API: room_info.room_discount_amount = 1000  (check-in discount)
     room_info.room_payment_summary.remaining_room_balance = 1600

orderTransform.fromAPI.order (L412):
  roomInfo.discountAmount = 1000     ← available but NEVER READ in CPP
  roomInfo.roomPaymentSummary.remainingRoomBalance = 1600

CPP roomBalance memo (L195-203):
  roomBalance = remainingRoomBalance ?? balancePayment = 1600
  ← NEVER subtracts discountAmount

CPP Room section (L1807-1855):
  Room Charge:  roomInfo.roomPrice = 3000  ✓
  Lodging GST:  roomInfo.gstTax   = 100   ✓
  [MISSING]:    Check-in Discount  = -1000 ← NOT rendered (no code for it)
  Advance Paid: roomInfo.advancePayment = -1500  ✓
  Balance:      roomBalance = 1600        ✗ (should be 600)

BREAK POINT 1: roomBalance = 1600-0 = 1600 (discountAmount not subtracted)
BREAK POINT 2: No JSX line for check-in discount between GST and Advance Paid
```

### Sub-Issue B — Split validation

```
CPP effectiveTotal (L734):
  = finalTotal(food=248) + roomBalance(1600) = 1848
  [After Sub-A fix: roomBalance=600 → effectiveTotal = 248+600 = 848]

CPP "Remaining" display (L2937):
  = finalTotal(248) - splitSum(248) = 0 → "Remaining: ₹0.00"
  ← correctly food-only, but doesn't match disabled check

CPP split disabled check (L3311):
  splitSum(248) < effectiveTotal(848)  →  TRUE  →  DISABLED  ✗

BREAK POINT: L3311 uses effectiveTotal (food+room) not finalTotal (food-only)
OWNER INTENT: split should validate against food only; room handled by paid_room=yes
```

### PmsCheckoutDrawer path

```
PmsCheckoutDrawer.jsx L278-283 (BUG-425 formula):
  remainingRoomBalance = roomPrice(3000) + gstTax(100) - advancePayment(1500) - receiveBalance(0)
                       = 1600  ← NEVER subtracts discountAmount(1000)

Same two break points apply for PmsCheckoutDrawer path.
```

---

## 3. Evidence Artifacts

| Evidence | Location | Detail |
|---|---|---|
| `roomInfo.discountAmount` available, never read in CPP | orderTransform.js:412, CPP grep | `parseFloat(api.room_info.room_discount_amount)` confirmed at L412; CPP Room section (L1807-1855) has no reference to `discountAmount` |
| `roomBalance = remainingRoomBalance = 1600` (no discount) | CPP:200 | Memo reads `remainingRoomBalance ?? balancePayment` — discountAmount not subtracted |
| Split disabled check uses effectiveTotal | CPP:3311 | `splitPayments.reduce(...) < effectiveTotal` |
| "Remaining" uses finalTotal | CPP:2937 | `finalTotal - splitSum` |
| PmsCheckoutDrawer formula excludes discount | PmsCheckoutDrawer:278-283 | `roomPrice+gstTax-advance-receive`, no discountAmount |
| Check-in discount shows in FolioCheckoutPanel Statement | FolioCheckoutPanel.jsx | `checkInDiscountAmt = Number(order?.roomInfo?.discountAmount||0)` → "Check-in discount" line ← THE REFERENCE IMPLEMENTATION |

---

## 4. Exact Changes Needed

### E1 — CPP `roomBalance` memo (L195-203): subtract discountAmount — **CPP (R5)**

**Current L200:**
```js
? Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
```
**New:**
```js
? Math.max(0, (roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0) - (roomInfo.discountAmount || 0))
```

Effect: `roomBalance = 1600 - 1000 = 600` ✓

---

### E2 — CPP Room section (between Lodging GST and Advance Paid): add check-in discount line — **CPP (R5)**

**Insert between L1843 (Lodging GST close) and L1844 (Advance Paid):**
```jsx
{(roomInfo.discountAmount || 0) > 0 && (
  <div className="flex justify-between" data-testid="checkout-room-checkin-discount">
    <span style={{ color: COLORS.grayText }}>Check-in Discount</span>
    <span style={{ color: COLORS.darkText }}>−₹{(roomInfo.discountAmount || 0).toLocaleString()}</span>
  </div>
)}
```

Display result: Room Charge ₹3,000 → Lodging GST +₹100 → **Check-in Discount −₹1,000** → Advance Paid −₹1,500 → **Balance ₹600** ✓

---

### E3 — CPP split disabled check (L3311): use `finalTotal` for split when room — **CPP (R5)**

**Current L3311:**
```js
(showSplit && splitType === 'payment' && splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < effectiveTotal) ||
```
**New:**
```js
(showSplit && splitType === 'payment' && splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < (isRoom ? finalTotal : effectiveTotal)) ||
```

Effect: room checkout split validates against `finalTotal` (food-only=248); `248 < 248` = FALSE → **button ENABLED** ✓

Non-room orders: unchanged (use `effectiveTotal` = `finalTotal` for them) ✓

---

### E4 — PmsCheckoutDrawer.jsx (L278-282): subtract discountAmount from formula — **NOT R5**

**Current L278-283:**
```js
remainingRoomBalance: Math.max(0,
  (detail.roomInfo.roomPrice       ?? 0) +
  (detail.roomInfo.gstTax          ?? 0) -
  (detail.roomInfo.advancePayment  ?? 0) -
  (detail.roomInfo.receiveBalance  ?? 0)
),
```
**New:**
```js
remainingRoomBalance: Math.max(0,
  (detail.roomInfo.roomPrice       ?? 0) +
  (detail.roomInfo.gstTax          ?? 0) -
  (detail.roomInfo.discountAmount  ?? 0) -
  (detail.roomInfo.advancePayment  ?? 0) -
  (detail.roomInfo.receiveBalance  ?? 0)
),
```

Effect: PmsCheckoutDrawer balance = 3000+100-1000-1500-0 = 600 ✓

---

## 5. Scope Summary

| Edit | File | Risk | R5? | Lines |
|---|---|---|---|---|
| E1 — roomBalance subtract discountAmount | CollectPaymentPanel.jsx | HIGH (financial, room balance) | YES | ~2 |
| E2 — check-in discount line in Room section | CollectPaymentPanel.jsx | MEDIUM (display only) | YES | ~6 |
| E3 — split check uses finalTotal for room | CollectPaymentPanel.jsx | HIGH (financial, checkout validation) | YES | ~1 |
| E4 — PmsCheckoutDrawer formula fix | PmsCheckoutDrawer.jsx | HIGH (financial, room balance) | NO | ~1 |

**Total:** 2 files, ~10 lines. **R5 required.** NOT planning-skip eligible (financial + R5).

---

## 6. Payload Impact (backend safe)

With E3 (split uses `finalTotal`): split sum (food=248) enables button. When cashier clicks Checkout:
- `paymentData.finalTotal = effectiveTotal = 848` (food+room — unchanged for payload) 
- `paymentData.roomBalance = 600` (after E1 discount fix)
- `fbOnlyTotal = Math.max(0, 848 - 600) = 248` ← food-only payment_amount (same as before if backend already computed 248 anyway)
- `paid_room = 'yes'` ← unchanged
- `partial_payments = [{cash:200},{upi:48}]` ← food split

Backend receives: `payment_amount=248`, `paid_room=yes` — room balance (₹600) settled via `paid_room`. OD-BUG527-01 confirmed safe.

---

## 7. Recommendations

**Register as BUG-527 with revised scope: 2 files, 4 edits, R5 required.**

Fix path (all recommended):
1. E1+E2+E3 in CPP (R5, one gate cycle for all 3 edits — same file)
2. E4 in PmsCheckoutDrawer (can be parallel-safe with E1-E3)

**NOT:** room split legs, room discount input, checkout controls in dashboard CPP. Display-only fix for check-in discount.

Planning skip: NOT eligible (R5 + financial checkout validation).

---

## Handover

```
Two break points in CollectPaymentPanel.jsx:
  BP-1 (L200): roomBalance = remainingRoomBalance (1600) — discountAmount (1000) not subtracted → shows ₹1,600
  BP-2 (L3311): split check uses effectiveTotal (food+room=848) not finalTotal (food=248) → gray

One break point in PmsCheckoutDrawer.jsx:
  BP-3 (L278): BUG-425 formula excludes discountAmount → also produces 1600 (not 600)

Fix: 4 edits, 2 files, ~10 lines. E1+E2+E3 in CPP (R5). E4 in PmsCheckoutDrawer.
Backend payload unchanged (payment_amount = fbOnlyTotal = food-only = 248).
Owner decisions: LOCKED (OD-BUG527-01 = check-in discount display; OD-BUG527-02 = food-only split).
Steps: 8/10. Confidence: HIGH.
Report: /app/memory/BUG-527_INVESTIGATION_REPORT_V2_2026-10-09.md
Next: Register BUG-527 via INTAKE → Planning Gate 2-3.
```
