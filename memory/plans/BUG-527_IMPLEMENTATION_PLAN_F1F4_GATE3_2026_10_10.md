# BUG-527 — Implementation Plan (Gate 3, F1–F4)
## DashboardPage Tile + CartPanel Room: discountAmount Subtraction

**Date:** 2026-10-10
**Role:** PLANNING (Gate 3)
**IA doc:** `impact/BUG-527_IMPACT_ANALYSIS_F1F4_2026_10_10.md`
**Sprint:** oct_bug_batch
**Risk:** HIGH (DashboardPage.jsx = R5)
**ODs locked:** OD-BUG527-01, OD-BUG527-02 (no new ODs)
**Entry verification:** All 4 anchors confirmed at HEAD — no drift

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` — F1 only (L53-56, R5)
- `src/components/order-entry/CartPanel.jsx` — F2 (L457-463) + F3 (L1482) + F4 (L1609)

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5) — E1-E4 done ✓
- `PmsCheckoutDrawer.jsx` — E4 done ✓
- `OrderEntry.jsx` (R5) — passes `roomInfo` prop unchanged; no edit needed
- `orderTransform.js` (R5) — `discountAmount` already mapped at L412 ✓
- Any test files

---

## Execution Order

```
F1 (DashboardPage.jsx) — independent file, no order constraint
F2 (CartPanel.jsx L457-463) — first in CartPanel; F3/F4 are display-only and parallel-safe
F3 (CartPanel.jsx L1482) — display, parallel-safe with F2
F4 (CartPanel.jsx L1609) — display, parallel-safe with F2

Practical: F1 + F2 + F3 + F4 in one pass (all unique, non-overlapping search strings)
```

---

## Edit F1 — `DashboardPage.jsx` L53-55

### Why
`computeRoomCardAmount` builds the dashboard room tile total. `roomBal` reads raw `remainingRoomBalance` (₹1,600) without subtracting `discountAmount` (₹1,000) → tile shows ₹1,827 instead of ₹827.

### Current (L53-55)
```js
  const roomBal = Math.max(0,
    Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0);
```

### New (L53-56)
```js
  const roomBal = Math.max(0,
    (Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0)
    - (order?.roomInfo?.discountAmount || 0)); // BUG-527: subtract check-in discount — mirrors CPP E1
```

### Effect
`roomBal = 1600 − 1000 = 600` → tile total = 200 + 27 + 600 = **₹827** ✓

### Edge cases (from Gate 2 IA)
- No discount (`discountAmount=0`): `Max(0, 1600-0) = 1600` — unchanged ✓
- Over-discount: `Max(0, X-Y)` clamps to 0 ✓
- `remainingRoomBalance` absent: `balancePayment - discountAmount` — same logic ✓

---

## Edit F2 — `CartPanel.jsx` L457-463 (roomBalance useMemo)

### Why
`roomBalance` useMemo reads raw `remainingRoomBalance` (₹1,600) without `discountAmount`. Feeds `effectiveTotal` (L472), Hold/Pay button labels (L723/L725), cash auto-fill (L477), and QSR payment payload (L487-489). Gate 2 IA proved `fbOnlyTotal` (backend payment amount) is **algebraically invariant**: `(food + raw - disc) - (raw - disc) = food = 248` in all cases.

### Current (L457-463)
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        null
        ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
    : 0;
```

### New (L457-463)
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        (roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
        - (roomInfo.discountAmount || 0)) // BUG-527: subtract check-in discount; removes dead `null ??`
    : 0;
```

### Effect
`roomBalance = 600` → `effectiveTotal = 248 + 600 = 848` → Hold/Pay buttons show ₹848 ✓

### Payment payload safety (Gate 2 proof)
```
paymentData.finalTotal = effectiveTotal = 848
paymentData.roomBalance = roomBalance = 600
orderTransform: fbOnlyTotal = Max(0, 848 - 600) = 248  ← same as before ✓
```

### Note
`null ??` on L459 is dead code (always evaluates past null to the next operand). Removing it is a no-op but cleaner. Testing agent flagged it.

---

## Edit F3 — `CartPanel.jsx` L1482 (Room display)

### Why
`data-testid="cart-room-balance"` reads raw `remainingRoomBalance` directly (not via `roomBalance` useMemo). Displays "Room ₹1,600" in the order entry panel. F2 alone does NOT fix this line — it has its own independent read.

### `roomSummaryOverride` strategy
`roomSummaryOverride` (L850 state, null initially) is set after a mid-stay payment via RecordPaymentModal (CR-162). When set, its `remainingRoomBalance` is the backend's post-payment balance — it already accounts for the booking structure; do not subtract `discountAmount` again. When null (initial view before any payment): subtract `discountAmount`.

### Current (L1481-1483)
```jsx
              <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }} data-testid="cart-room-balance">
                ₹{(roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0).toLocaleString()}
              </span>
```

### New (L1481-1483)
```jsx
              <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }} data-testid="cart-room-balance">
                ₹{Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo.discountAmount || 0))).toLocaleString() /* BUG-527 */}
              </span>
```

### Effect
Initial state (no override): "Room ₹600" ✓
Post mid-stay payment (override set): uses post-payment balance as-is ✓

---

## Edit F4 — `CartPanel.jsx` L1609 (Checkout button label)

### Why
Checkout button label reads raw `remainingRoomBalance` directly (not via `roomBalance` useMemo). Shows "Checkout ₹1,827" — same independent read as F3. F2 alone does NOT fix this.

**Note:** This is the button label only. Clicking "Checkout" opens CPP via `onCheckout` → CPP uses its own `roomBalance` (fixed by E1). The label display is purely cosmetic here.

### Same `roomSummaryOverride` strategy as F3.

### Current (L1609)
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) : 0)).toLocaleString()}</span>
```

### New (L1609)
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo?.discountAmount || 0))) : 0)).toLocaleString() /* BUG-527 */}</span>
```

### Effect
`total(227) + associatedTotal(0) + Math.max(0, 600) = 827` → "Checkout ₹827" ✓

---

## Verification Matrix

| # | Edit | File | How to verify | Automated? |
|---|------|------|---------------|:----------:|
| VM-F1a | F1 code marker | DashboardPage.jsx | `grep -n "BUG-527" DashboardPage.jsx` → hit at L56 | YES |
| VM-F1b | F1 formula | DashboardPage.jsx | `grep -n "discountAmount" DashboardPage.jsx` → hit in computeRoomCardAmount | YES |
| VM-F2a | F2 code marker | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` → hit in roomBalance useMemo | YES |
| VM-F2b | F2 dead code removed | CartPanel.jsx | `grep -n "null$" CartPanel.jsx` → 0 hits in roomBalance useMemo | YES |
| VM-F3a | F3 code marker | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` → hit at L1482 area | YES |
| VM-F3b | F3 testid | CartPanel.jsx | `grep -n "cart-room-balance" CartPanel.jsx` → still present | YES |
| VM-F4a | F4 code marker | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` → hit at L1609 area | YES |
| VM-V1 | Dashboard tile | Browser | r4 tile amount = ₹827 (not ₹1,827) | NO |
| VM-V2 | Cart room display | Browser | `[data-testid=cart-room-balance]` = ₹600 (not ₹1,600) | NO |
| VM-V3 | Checkout button | Browser | Button label = "Checkout ₹827" (not ₹1,827) | NO |
| VM-V4 | Regression: no discount | Browser | Guest with no check-in discount — values unchanged | NO |
| VM-V5 | Compile | webpack | 0 new warnings | YES |

---

## Post-Code Registry Checklist

Implementation agent MUST execute after coding:
```
□ 1. registry.json: BUG-527 → status: GATE_5A_IMPLEMENTED (full scope — all E1-E4 + F1-F4)
□ 2. BUG_TRACKER.md: BUG-527 row updated (F1-F4 IMPLEMENTED)
□ 3. FILE_OWNERSHIP.md: DashboardPage.jsx + CartPanel.jsx → BUG-527 F1-F4, 2026-10-10
□ 4. Code markers: // BUG-527 in all 4 new edited locations (F1, F2, F3, F4)
□ 5. Compile check: webpack 0 new warnings from this edit batch
□ 6. BUG-528: already closed DUPLICATE — no further action
```

---

## QA Handover Seed

| # | Test | Steps | Expected | testid |
|---|------|-------|----------|--------|
| TC-F1 | Dashboard tile post-discount | Login → Dashboard → Room tab → bonk r4 | Tile shows ~₹827 (not ₹1,827) | room tile amount |
| TC-F2 | Cart room display | Dashboard → bonk r4 → open order | `[data-testid=cart-room-balance]` = ₹600 | `cart-room-balance` |
| TC-F3 | Checkout button label | Same order open | Button shows "Checkout ₹827" | checkout button label |
| TC-R1 | Regression: no discount guest | Open a room order with no check-in discount | Cart-room-balance = full raw balance (no change) | `cart-room-balance` |
| TC-R2 | Regression: CPP still correct | bonk → Checkout → CPP | CPP Balance still ₹600 (E1 unchanged) | `complete-payment-btn` |
