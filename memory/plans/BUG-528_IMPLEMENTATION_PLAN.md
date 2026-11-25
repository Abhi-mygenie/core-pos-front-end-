# BUG-528 — Implementation Plan (Gate 3)
## Dashboard Tile + CartPanel Room Show Pre-Discount Balance

**Date:** 2026-10-10
**Risk:** HIGH (DashboardPage.jsx = R5 hotspot)
**Related:** BUG-527 (same root — discountAmount not subtracted from remainingRoomBalance)
**Testing:** iteration_1.json confirmed both failures. BUG-527 E1-E4 all PASS.

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` — F1 (R5)
- `src/components/order-entry/CartPanel.jsx` — F2 + F3 + F4

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5) — already fixed by BUG-527 E1
- `PmsCheckoutDrawer.jsx` — already fixed by BUG-527 E4
- `orderTransform.js` (R5) — `discountAmount` already mapped correctly at L412
- Any test files

---

## Edits

### F1 — `DashboardPage.jsx` L53-55: subtract `discountAmount` in `computeRoomCardAmount`

**Current L53-55:**
```js
  const roomBal = Math.max(0,
    Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0);
```

**New L53-56:**
```js
  const roomBal = Math.max(0,
    (Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0)
    - (order?.roomInfo?.discountAmount || 0)); // BUG-528: subtract check-in discount (mirrors CPP L200 BUG-527)
```

**Effect:** Dashboard r4 tile: roomBal = 1600 − 1000 = 600; total = food(200) + gst(27) + room(600) = **₹827** ✓

---

### F2 — `CartPanel.jsx` L459-461: subtract `discountAmount` in `roomBalance` useMemo

**Current L457-463:**
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        null
        ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
    : 0;
```

**New L457-464:**
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        (roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
        - (roomInfo.discountAmount || 0)) // BUG-528: subtract check-in discount (mirrors CPP L200 BUG-527)
    : 0;
```

**Note:** Also removes the dead `null ??` (testing agent flagged as dead code). No functional change to that removal.

**Effect:** `roomBalance` useMemo = 600; `effectiveTotal` = food + 600 = correct.

---

### F3 — `CartPanel.jsx` L1482: subtract `discountAmount` in Room display

**Current L1482:**
```jsx
                ₹{(roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0).toLocaleString()}
```

**New L1482:**
```jsx
                ₹{Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo.discountAmount || 0))).toLocaleString() /* BUG-528 */}
```

**Strategy:** When `roomSummaryOverride` is set (post-payment), its `remainingRoomBalance` comes from the backend post-payment response — subtract nothing (backend balance should already reflect payment against the post-discount base). When null (initial view), subtract `discountAmount`.

---

### F4 — `CartPanel.jsx` L1609: subtract `discountAmount` in Checkout button total

**Current L1609:**
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) : 0)).toLocaleString()}</span>
```

**New L1609:**
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo?.discountAmount || 0))) : 0)).toLocaleString() /* BUG-528 */}</span>
```

**Effect:** Checkout button shows ₹827 (food 200 + gst 27 + room 600) ✓

---

## Verification Matrix

| Edit | File | How to verify | Automated? |
|---|---|---|---|
| F1 code marker | DashboardPage.jsx | `grep -n "BUG-528" DashboardPage.jsx` → L56 | YES |
| F2 code marker | CartPanel.jsx | `grep -n "BUG-528" CartPanel.jsx` → L461 | YES |
| F3 code marker | CartPanel.jsx | `grep -n "BUG-528" CartPanel.jsx` → L1482 | YES |
| F4 code marker | CartPanel.jsx | `grep -n "BUG-528" CartPanel.jsx` → L1609 | YES |
| V1 Dashboard tile | Browser | r4 tile shows ~₹827 (not ₹1,827) | NO |
| V2 Cart room balance | Browser | `[data-testid=cart-room-balance]` = ₹600 (not ₹1,600) | NO |
| V3 Checkout button | Browser | Checkout button shows ₹827 (food+room post-discount) | NO |
| V4 Compile | webpack | 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-528 → status: GATE_5A_IMPLEMENTED
□ 2. BUG_TRACKER.md: BUG-528 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: DashboardPage.jsx + CartPanel.jsx → BUG-528
□ 4. Code markers: // BUG-528 in all 4 edited locations
□ 5. Compile check: webpack 0 new warnings
```
