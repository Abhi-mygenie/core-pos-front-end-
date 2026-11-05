# BUG-525 — Impact Analysis (Gate 2)
## Split Room Payment Legs Have No Amount Cap

**Date:** 2026-10-09
**Code Reality:** NONE — no guard exists yet
**Conflict Pre-Check:** `FolioCheckoutPanel.jsx` — BUG-524 at GATE_5A_IMPLEMENTED (different lines: L54/L74/L92). PARALLEL-SAFE.
**Risk:** MEDIUM — financial validation on room billing. Block pattern only (no money formula change).

---

## 1. Root Cause

`FolioCheckoutPanel.handlePaid()` sends `partial_payments_room` legs to `payBill()` with no validation that the sum of leg amounts ≤ effective room balance:

```js
// L309-317 (current — no cap)
if (roomSplitEnabled) {
  const positiveLegs = roomSplitLegs.filter(l => parseFloat(l.amount) > 0);
  if (positiveLegs.length > 0) {
    payload.partial_payments_room = positiveLegs.map(l => ({
      payment_mode:   l.mode,
      payment_amount: parseFloat(l.amount),
    }));
  }
}
const data = await payBill(payload);  // ← fires even if legs total ₹97,000 vs ₹600 balance
```

BREAK POINT: no guard between leg total computation and `payBill()` call.

---

## 2. Data Flow Trace

```
User: room balance = ₹600, roomSplitEnabled = true
  roomSplitLegs = [{mode:'cash', amount:'88000'}, {mode:'upi', amount:'9000'}]
  → sum = 97,000

FolioCheckoutPanel state:
  baseBalance = 600           (folio roomInfo.balancePayment)
  roomDiscountInfoRs = 0      (no discount applied)
  effectiveRoomBalance = Math.max(0, baseBalance - roomDiscountInfoRs) = 600

  MISSING: roomSplitTotal useMemo = 97,000
  MISSING: roomSplitOverBalance = 97,000 > 600 → true

handlePaid() L283: no early return for roomSplitOverBalance
  → positiveLegs = [{cash,88000},{upi,9000}]
  → payload.partial_payments_room = [{cash,88000},{upi,9000}]
  → payBill(payload)  ← sends wrong amounts
```

---

## 3. OD-525-01 (LOCKED by owner this session)

**Block or warn only?** → **BLOCK** (same pattern as `discountOverMax` guard at L278).

This means:
1. Visual alert in `RoomDiscountControls` when total > effectiveRoomBalance (cashier sees it immediately)
2. `handlePaid` guard: if `roomSplitOverBalance` → `setPayError(...)` + return (prevents API call)

---

## 4. Affected Files

**WILL CHANGE:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
  - Add `roomSplitTotal` useMemo in main component (after `roomDiscountInfoRs`)
  - Add `roomSplitOverBalance` computed value in main component
  - Pass `roomSplitOverBalance` to `RoomDiscountControls` as prop
  - Add alert JSX in `RoomDiscountControls` (after split legs section, same style as `discountOverMax` alert)
  - Add guard in `handlePaid`: `if (roomSplitOverBalance) { setPayError(...); return; }`

**WILL NOT TOUCH:**
- `CollectPaymentPanel.jsx` (R5)
- `frontDeskService.js`
- `profileTransform.js`
- Any test files for this item (no unit test needed for simple validation guard)

---

## 5. Variables Available in Scope

All in `FolioCheckoutPanel` main component (already computed):

| Variable | Source | Value in screenshot |
|---|---|---|
| `baseBalance` | useMemo L230-251 | ₹600 |
| `roomDiscountInfoRs` | useMemo L258-265 | ₹0 (no discount) |
| `effectiveRoomBalance` | NEW — `Math.max(0, (baseBalance??0) - roomDiscountInfoRs)` | ₹600 |
| `roomSplitLegs` | useState L214 | [{cash,88000},{upi,9000}] |
| `roomSplitEnabled` | useState L213 | true |
| `roomSplitTotal` | NEW useMemo | 97,000 |
| `roomSplitOverBalance` | NEW computed | true (97000 > 600) |

`roomSplitTotal` and `roomSplitOverBalance` are NEW — need to be added.

---

## 6. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| effectiveRoomBalance = 0 (no room balance) → false positive | LOW | Guard: `effectiveRoomBalance > 0` required for `roomSplitOverBalance` to be true |
| Partial legs (user typing) trigger alert while still entering | LOW | Same as discountOverMax — shows alert while typing, cashier just keeps entering |
| hideSectionRows test (L32-33 FolioCheckoutPanel math check) | LOW | New math uses `Math.max` + `reduce` — not in banned regex (`Math.round`, `toFixed`, `* 0.x`, `/ 100`) |

---

## 7. Owner Decisions

OD-525-01 LOCKED: **BLOCK** (confirmed this session).

No further owner decisions needed.

---

## 8. Verification

| # | What to verify | Method |
|---|---|---|
| V1 | Total > balance: alert shows in room split section | Browser: enable split, enter 88000 + 9000 with ₹600 balance → red alert appears |
| V2 | Total > balance: Checkout blocked with payError | Browser: click Checkout → error message shown, no API call |
| V3 | Total = balance: no alert, checkout proceeds | Browser: enter 600 in first leg → no alert |
| V4 | Total < balance: no alert | Browser: enter 300 + 100 → no alert |
| V5 | roomSplitEnabled = false: no validation | Browser: Split room Off → checkout normal |
| V6 | webpack 0 new warnings | `tail frontend.out.log` |

---

Code Reality: NONE (guard does not exist)
Conflict: PARALLEL-SAFE (BUG-524 at different lines in same file)
Owner decisions: OD-525-01 LOCKED (BLOCK)
Next: Gate 3 Implementation Plan
