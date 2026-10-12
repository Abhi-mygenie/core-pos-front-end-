# BUG-527 — Revised Implementation Plan (F1–F4)
## DashboardPage Tile + CartPanel Room: Remaining discountAmount Gaps

**Date:** 2026-10-10 (revision — addendum to original plan)
**Original plan:** `plans/BUG-527_IMPLEMENTATION_PLAN.md` (E1-E4 IMPLEMENTED ✓)
**Risk:** HIGH (DashboardPage.jsx = R5)
**Sprint:** oct_bug_batch
**ODs locked:** OD-BUG527-01, OD-BUG527-02 (unchanged)
**Evidence:** `test_reports/iteration_1.json` — F1/F2 FAIL confirmed; E1-E4 PASS confirmed

---

## Context

E1-E4 fixed the CPP checkout panel and PmsCheckoutDrawer. The same `discountAmount` subtraction is needed in two upstream components that display the room balance **before** CPP opens:

| Component | Symptom | Confirmed FAIL |
|---|---|---|
| `DashboardPage.computeRoomCardAmount` | Dashboard tile shows ₹1,827 (should be ~₹827) | YES — iteration_1.json |
| `CartPanel` (3 locations) | OrderEntry "Room ₹1,600" + Checkout button ₹1,827 | YES — iteration_1.json |

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` — F1 (**R5 hotspot**)
- `src/components/order-entry/CartPanel.jsx` — F2 + F3 + F4

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5) — E1-E4 already done
- `PmsCheckoutDrawer.jsx` — E4 already done
- `orderTransform.js` (R5) — `discountAmount` correctly mapped at L412
- `OrderEntry.jsx` (R5) — passes roomInfo prop to CartPanel; no change needed
- Any test files

---

## Edits

### F1 — `DashboardPage.jsx` L53-55: subtract `discountAmount` in `computeRoomCardAmount`

**Current (L48-57):**
```js
const computeRoomCardAmount = (order) => {
  const food = Number(order?.amount) || 0;
  const transfers = (order?.associatedOrders || [])
    .reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);
  // CR-162: prefer live ledger balance over static check-in snapshot
  const roomBal = Math.max(0,
    Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0);
  return food + transfers + roomBal;
};
```

**New (L53-56 change only):**
```js
  const roomBal = Math.max(0,
    (Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
      ?? order?.roomInfo?.balancePayment) || 0)
    - (order?.roomInfo?.discountAmount || 0)); // BUG-527: subtract check-in discount (mirrors CPP E1)
```

**Effect:** r4 tile: roomBal = 1600 − 1000 = 600; tile total = 200 + 27 + 600 = **₹827** ✓

---

### F2 — `CartPanel.jsx` L457-463: subtract `discountAmount` in `roomBalance` useMemo

**Current:**
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        null
        ?? roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
    : 0;
```

**New:**
```js
  const roomBalance = isRoom && roomInfo
    ? Math.max(0,
        (roomInfo.roomPaymentSummary?.remainingRoomBalance
        ?? roomInfo.balancePayment
        ?? 0)
        - (roomInfo.discountAmount || 0)) // BUG-527: subtract check-in discount (mirrors CPP E1); removes dead `null ??`
    : 0;
```

**Note:** Also removes the dead `null ??` at the front (no functional change — testing agent flagged as dead code).

**Effect:** roomBalance = 600; effectiveTotal = food(248) + room(600) = 848 ✓

---

### F3 — `CartPanel.jsx` L1482: subtract `discountAmount` from Room display

**Current:**
```jsx
                ₹{(roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0).toLocaleString()}
```

**New:**
```jsx
                ₹{Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo.discountAmount || 0))).toLocaleString() /* BUG-527 */}
```

**Strategy:** `roomSummaryOverride` is set only after a mid-stay payment (CR-162). When set, the backend's post-payment balance is used as-is; when null (initial view), subtract `discountAmount`.

**Effect:** "Room ₹600" shown (not ₹1,600) ✓

---

### F4 — `CartPanel.jsx` L1609: subtract `discountAmount` from Checkout button total

**Current:**
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) : 0)).toLocaleString()}</span>
```

**New:**
```jsx
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, (roomSummaryOverride?.remainingRoomBalance ?? roomInfo?.roomPaymentSummary?.remainingRoomBalance ?? roomInfo?.balancePayment ?? 0) - (roomSummaryOverride ? 0 : (roomInfo?.discountAmount || 0))) : 0)).toLocaleString() /* BUG-527 */}</span>
```

**Effect:** Checkout button = food(200+27) + room(600) = **₹827** ✓

---

## Verification Matrix

| Edit | File | Automated check | Expected |
|------|------|-----------------|----------|
| F1 code | DashboardPage.jsx | `grep -n "BUG-527" DashboardPage.jsx` | hit at L56 |
| F2 code | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` | hit in roomBalance useMemo |
| F3 code | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` | hit at L1482 region |
| F4 code | CartPanel.jsx | `grep -n "BUG-527" CartPanel.jsx` | hit at L1609 region |
| V1 dashboard | Browser | r4 tile amount | ₹827 (not ₹1,827) |
| V2 cart room | Browser | `[data-testid=cart-room-balance]` | ₹600 (not ₹1,600) |
| V3 checkout btn | Browser | Checkout button label | ₹827 (not ₹1,827) |
| V4 compile | webpack | 0 new warnings | PASS |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-527 → status: GATE_5A_IMPLEMENTED (full scope)
□ 2. BUG_TRACKER.md: BUG-527 row updated (F1-F4 IMPLEMENTED)
□ 3. FILE_OWNERSHIP.md: DashboardPage.jsx + CartPanel.jsx → BUG-527 F1-F4
□ 4. Code markers: // BUG-527 in all 4 new edited locations
□ 5. Compile check: webpack 0 new warnings
□ 6. BUG-528: closed DUPLICATE in registry.json
```
