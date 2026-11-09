# BUG-527 — Impact Analysis (Gate 2, Revised)
## Remaining Scope: DashboardPage + CartPanel discountAmount Gaps (F1–F4)

**Date:** 2026-10-10
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Agent prompt version:** ALPHA v0.7
**Sprint:** oct_bug_batch
**Intake doc:** `change_requests/BUG-527_DASHBOARD_CPP_CHECKIN_DISCOUNT_SPLIT_GRAY_INTAKE.md` (§9)
**Testing evidence:** `test_reports/iteration_1.json` — F1/F2 FAIL confirmed

---

## Code Reality: NONE

```bash
grep -n "BUG-527\|discountAmount" /app/frontend/src/pages/DashboardPage.jsx   → 0 hits
grep -n "BUG-527\|discountAmount" /app/frontend/src/components/order-entry/CartPanel.jsx  → 0 hits
```

F1–F4 not yet implemented. E1–E4 (CPP + PmsDrawer) already at GATE_5A_IMPLEMENTED.

---

## Conflict Pre-Check

| File | Last modifier | Lines changed | Conflict with F1-F4? |
|------|--------------|---------------|----------------------|
| `DashboardPage.jsx` | BUG-452 (L1487-1518, handleTableClick) · BUG-453 (L1281, soundManager) — 2026-09-24 | Neither touches L48-57 | **NONE** |
| `CartPanel.jsx` | BUG-374 (qty +/- buttons, 2026-09-01) · BUG-304 (taxTotals L1, 2026-08-11) | Neither touches L457-463, L1482, L1609 | **NONE** |

No open registry items with status ≠ CLOSED/IMPLEMENTED currently modifying either file.

---

## Risk Classification

| Edit | Trigger | Risk |
|------|---------|------|
| F1 — DashboardPage.jsx (R5) | R5 hotspot + financial display | **HIGH** |
| F2 — CartPanel roomBalance useMemo | Financial: feeds effectiveTotal + QSR payment payload | **HIGH** |
| F3 — CartPanel Room display | Display-only (`data-testid="cart-room-balance"`) | **MEDIUM** |
| F4 — CartPanel Checkout button label | Display-only (label, not payment trigger) | **MEDIUM** |

---

## F1 — DashboardPage.jsx: `computeRoomCardAmount` (L48-57)

### Data Flow
```
API → orderTransform.fromAPI.order() (L412)
  order.roomInfo.discountAmount = 1000           ← always available (0 when no discount)
  order.roomInfo.roomPaymentSummary
    .remainingRoomBalance = 1600                 ← raw pre-discount backend value

DashboardPage.jsx:48-57  computeRoomCardAmount(order):
  roomBal = Math.max(0, remainingRoomBalance ?? balancePayment || 0)
          = 1600                                  ← MISSING - discountAmount(1000)
  return food(200) + transfers(0) + roomBal(1600) = 1827  ✗

DashboardPage.jsx:723  amount: computeRoomCardAmount(order)
  → Room tile shows ₹1,827  ✗  (should be ₹827)
```

### Call sites
`computeRoomCardAmount` is defined at L48 and called exactly **once** at L723 within the room tile mapping. No other callers.

### Downstream consumers of `amount`
The `amount` field at L723 is placed into the tile object used by dashboard room tile rendering. It affects:
- Room tile display value only
- Does NOT flow into any payment payload or API call
- Does NOT feed `CartPanel` or `CollectPaymentPanel`

### Edge cases
| Scenario | Before fix | After fix | Correct? |
|----------|-----------|-----------|----------|
| No check-in discount (`discountAmount=0`) | roomBal = 1600 | roomBal = Math.max(0, 1600-0) = 1600 | ✓ unchanged |
| Check-in discount = ₹1,000 | roomBal = 1600 | roomBal = Math.max(0, 1600-1000) = 600 | ✓ |
| Over-discount (discount > balance) | roomBal = X | roomBal = Math.max(0, X-Y) = 0 | ✓ clamped |
| `remainingRoomBalance` absent → fallback to `balancePayment` | balancePayment used | balancePayment - discountAmount | ✓ same logic |

### Fix (exact)
```js
// Line 53-55 current:
const roomBal = Math.max(0,
  Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
    ?? order?.roomInfo?.balancePayment) || 0);

// Line 53-56 new:
const roomBal = Math.max(0,
  (Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
    ?? order?.roomInfo?.balancePayment) || 0)
  - (order?.roomInfo?.discountAmount || 0)); // BUG-527: subtract check-in discount (mirrors CPP E1)
```

**Financial impact of F1:** Display-only. No payment payload touched. LOW financial risk within HIGH-rated R5 file.

---

## F2 — CartPanel.jsx: `roomBalance` useMemo (L457-463)

### Data Flow
```
CartPanel prop: roomInfo.discountAmount = 1000   ← available (orderTransform L412)
CartPanel prop: roomInfo.roomPaymentSummary
  .remainingRoomBalance = 1600                   ← raw pre-discount

CartPanel.jsx:457-463  roomBalance useMemo:
  roomBalance = Math.max(0, null ?? remainingRoomBalance ?? balancePayment ?? 0)
              = 1600                              ← MISSING - discountAmount(1000)

CartPanel.jsx:472  effectiveTotal:
  effectiveTotal = authoritativeTotal(248) + associatedTotal(0) + roomBalance(1600) = 1848  ✗

Downstream of roomBalance:
  L472: effectiveTotal = food + roomBalance       → feeds cash auto-fill, Hold/Pay buttons
  L487: paymentData.finalTotal = effectiveTotal   → QSR payment path
  L489: paymentData.roomBalance = roomBalance     → QSR payment path
```

### Critical: payment payload impact (QSR path)

`paymentData.roomBalance = roomBalance` (L489) is passed to `onQsrCollectBill` for QSR-mode room billing. Trace:

```
Before fix: paymentData = { finalTotal: 1848, roomBalance: 1600 }
  → orderTransform: fbOnlyTotal = Max(0, 1848 - 1600) = 248  ✓ correct food payment

After fix:  paymentData = { finalTotal: 848, roomBalance: 600 }
  → orderTransform: fbOnlyTotal = Max(0, 848 - 600) = 248   ✓ same food payment
```

**fbOnlyTotal (the actual payment_amount sent to backend) is UNCHANGED at ₹248 in both cases.** The fix is payment-safe: the math cancels because both `finalTotal` and `roomBalance` decrease by the same `discountAmount` offset.

**Formal proof:**
```
Before: finalTotal_B = food + roomBalance_B = food + raw
        fbOnlyTotal_B = Max(0, (food + raw) - raw) = food = 248

After:  finalTotal_A = food + roomBalance_A = food + (raw - disc)
        fbOnlyTotal_A = Max(0, (food + raw - disc) - (raw - disc)) = food = 248
```

`fbOnlyTotal` is algebraically invariant to the discount subtraction. Backend payment amount unchanged. ✓

### Fix (exact)
```js
// Current L457-463:
const roomBalance = isRoom && roomInfo
  ? Math.max(0,
      null
      ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
      ?? roomInfo.balancePayment
      ?? 0)
  : 0;

// New:
const roomBalance = isRoom && roomInfo
  ? Math.max(0,
      (roomInfo.roomPaymentSummary?.remainingRoomBalance
      ?? roomInfo.balancePayment
      ?? 0)
      - (roomInfo.discountAmount || 0)) // BUG-527: subtract check-in discount; removes dead `null ??`
  : 0;
```

*Also removes dead `null ??` at L459 (no functional change — testing agent flagged).*

---

## F3 — CartPanel.jsx: Room display (L1482)

### Data Flow
```
[data-testid="cart-room-balance"] at L1482:
  ₹{(roomSummaryOverride?.remainingRoomBalance    ← set after mid-stay payment (CR-162)
    ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
    ?? roomInfo.balancePayment
    ?? 0).toLocaleString()}

roomSummaryOverride = useState(null) at L850.
Initial state (null): shows roomInfo.roomPaymentSummary?.remainingRoomBalance = 1600  ✗
Post-payment (set): shows post-payment backend balance (correct, don't subtract)
```

**Note:** This display does NOT use the `roomBalance` useMemo — it has its own direct read. Fixing F2 alone will NOT fix this display.

### Fix strategy
```jsx
// When roomSummaryOverride is null (initial): subtract discountAmount
// When roomSummaryOverride is set (post mid-stay payment): use backend value as-is
// (Backend post-payment remainingRoomBalance is computed against original balance;
//  discountAmount was already baked into the initial booking, backend handles it)

₹{Math.max(0,
  (roomSummaryOverride?.remainingRoomBalance
    ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
    ?? roomInfo.balancePayment
    ?? 0)
  - (roomSummaryOverride ? 0 : (roomInfo.discountAmount || 0))
).toLocaleString() /* BUG-527 */}
```

### Edge cases
| Scenario | After fix | Correct? |
|----------|-----------|----------|
| No override, no discount | Max(0, 1600-0) = 1600 | ✓ |
| No override, discount=1000 | Max(0, 1600-1000) = 600 | ✓ |
| Override set (post-payment) | uses override.remainingRoomBalance as-is | ✓ |

---

## F4 — CartPanel.jsx: Checkout button total (L1609)

### Data Flow
```
L1609 (button label, display-only — does NOT trigger payment):
  ₹{(total + (isRoom
    ? associatedTotal + Math.max(0,
        roomSummaryOverride?.remainingRoomBalance
        ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo?.balancePayment
        ?? 0)
    : 0))}

= 248 + 0 + Max(0, 1600) = 1827  ✗  (should be 248 + 0 + 600 = 848)
```

**Note:** This is purely the button label. The Checkout button for room orders opens CPP (via `onCheckout` prop in OrderEntry.jsx), which uses CPP's own `roomBalance` (already fixed by E1). The label display is independent.

### Fix strategy: identical to F3
```jsx
<span>₹{(total + (isRoom
  ? associatedTotal + Math.max(0,
      (roomSummaryOverride?.remainingRoomBalance
        ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo?.balancePayment
        ?? 0)
      - (roomSummaryOverride ? 0 : (roomInfo?.discountAmount || 0)))
  : 0)).toLocaleString() /* BUG-527 */}</span>
```

---

## Impact Summary

| Edit | File | R5 | Financial | Payment payload changed? | Lines |
|------|------|----|-----------|--------------------------|-------|
| F1 | DashboardPage.jsx | YES | Display only | No | ~3 |
| F2 | CartPanel.jsx | No | useMemo feeds QSR path | No (fbOnlyTotal algebraically invariant — proved above) | ~3 |
| F3 | CartPanel.jsx | No | Display only | No | ~1 (inline expand) |
| F4 | CartPanel.jsx | No | Display only (label) | No | ~1 (inline expand) |

**Total: 2 files, ~8 lines. DashboardPage.jsx = R5.**
**Fast Lane: NOT eligible (R5 + financial display context).**
**Planning skip: NOT eligible (R5).**

---

## Owner Decisions

No new owner decisions needed. All ODs from original BUG-527 carry forward:
- **OD-BUG527-01** (check-in discount display) — applies to F3 (Room display)
- **OD-BUG527-02** (discounted room balance) — applies to F1, F2, F4

`roomSummaryOverride` strategy for F3/F4 (subtract only when no override) is a technical implementation choice consistent with OD-BUG527-02, no new owner decision required.

---

## Files WILL change (F1-F4)
- `src/pages/DashboardPage.jsx` (R5)
- `src/components/order-entry/CartPanel.jsx`

## Files WILL NOT touch
- `CollectPaymentPanel.jsx` (R5) — E1-E4 done
- `PmsCheckoutDrawer.jsx` — E4 done
- `OrderEntry.jsx` (R5) — no change needed; passes roomInfo prop to CartPanel correctly
- `orderTransform.js` (R5) — discountAmount already mapped at L412
- Any test files

---

```
Gate 2 Impact Analysis complete: BUG-527 (F1-F4)
Code reality: NONE (F1-F4 not yet implemented)
Conflict pre-check: CLEAN (no open items touching L48-57 in DashboardPage or L457/L1482/L1609 in CartPanel)
Risk: HIGH (DashboardPage R5) + HIGH (CartPanel roomBalance QSR payment, proved invariant)
Files WILL change: DashboardPage.jsx (R5) + CartPanel.jsx
Owner decisions: NONE needed (OD-BUG527-01/02 carry forward)
Payment safety: PROVED — fbOnlyTotal algebraically invariant to discountAmount subtraction
Awaiting Gate 3 GO → Implementation Plan
```
