# BUG-360 — Implementation Plan: Room Checkout Uses Stale balance_payment

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-26
**Impact Analysis:** `/app/memory/impact/BUG-360_IMPACT_ANALYSIS.md`
**Code Reality:** NONE — fix not present
**Risk:** CRITICAL — CollectPaymentPanel (R5), room billing / financial payload
**Owner approval:** MANDATORY before implementation
**Files WILL change:** `CollectPaymentPanel.jsx` · `RoomRowCard.jsx`
**Files will NOT touch:** `orderTransform.js`, any other file

---

## Entry Verification (mandatory before any code)

| # | File | Expected current state |
|---|---|---|
| 1 | `CollectPaymentPanel.jsx:195` | `() => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment \|\| 0) : 0),` |
| 2 | `CollectPaymentPanel.jsx:196` | `[isRoom, roomInfo]` (useMemo deps) |
| 3 | `RoomRowCard.jsx:393` | `const balance          = parseFloat(ri.balancePayment) \|\| 0;` |
| 4 | `RoomRowCard.jsx:413` | `return { ... balance, ... }` (balance in return object) |
| 5 | `RoomRowCard.jsx:594` | `balance={numbers.balance}` (prop passed to RoomBillingCard) |

---

## Edits

### Edit 1 — `CollectPaymentPanel.jsx:195` — Read live balance (1-line change)

**Current:**
```js
() => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0),
```

**New:**
```js
// BUG-360: prefer live remaining_room_balance over stale balance_payment
// Fallback to balancePayment when no mid-stay payments exist (roomPaymentSummary null)
// Math.max(0,...) clamp stays — per OD-1: pass 0 when balance <= 0 (no refund flow)
() => (isRoom && roomInfo
  ? Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
  : 0),
```

**useMemo deps (line 196):** `[isRoom, roomInfo]` — unchanged, `roomInfo` reference covers nested field.

---

### Edit 2 — `RoomRowCard.jsx:393-394` — Add `displayBalance` alongside `balance`

**Current:**
```js
const balance          = parseFloat(ri.balancePayment) || 0;
const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
```

**New:**
```js
const balance          = parseFloat(ri.balancePayment) || 0;  // keep for roomService formula
// BUG-360: live display balance — what was actually still owed (reflects mid-stay payments)
const displayBalance   = parseFloat(ri.roomPaymentSummary?.remainingRoomBalance ?? ri.balancePayment) || 0;
const receiveBalance   = parseFloat(ri.receiveBalance) || 0;
```

**Why keep `balance` for the formula:**
The `roomService` stripping formula at line 402-403 uses `balance` to isolate food charges from checkout collection:
```js
const roomService = isFullySettled
  ? Math.max(0, roomOrderAmount - balance - associatedTotal)
  : roomOrderAmount;
```
Using `remainingRoomBalance` here (which is 0 after payment) would make `roomService = roomOrderAmount - associatedTotal`, overcounting food. The original `balancePayment` (agreed balance at check-in) is arithmetically correct for this formula.

---

### Edit 3 — `RoomRowCard.jsx:413` — Add `displayBalance` to return object

**Current:**
```js
return {
  transferredCount: associatedOrders.length,
  food,
  total,
  paid,
  outstanding,
  discount,
  rent,
  advance,
  balance,
  roomOrderAmount,
  associatedOrders,
};
```

**New:** add `displayBalance` field:
```js
return {
  transferredCount: associatedOrders.length,
  food,
  total,
  paid,
  outstanding,
  discount,
  rent,
  advance,
  balance,          // kept for internal arithmetic (roomService formula)
  displayBalance,   // BUG-360: live balance for display (reflects mid-stay payments)
  roomOrderAmount,
  associatedOrders,
};
```

---

### Edit 4 — `RoomRowCard.jsx:594` — Pass `displayBalance` to RoomBillingCard

**Current:**
```jsx
<RoomBillingCard
  rent={numbers.rent}
  advance={numbers.advance}
  balance={numbers.balance}
/>
```

**New:**
```jsx
<RoomBillingCard
  rent={numbers.rent}
  advance={numbers.advance}
  balance={numbers.displayBalance}  {/* BUG-360: show live balance */}
/>
```

---

## Execution Sequence

1. **Owner GO** — MANDATORY before any code (CRITICAL risk)
2. Edit 1 — `CollectPaymentPanel.jsx:195` (1-line, highest priority — fixes the double-collection)
3. Compile check after Edit 1
4. Edit 2 — `RoomRowCard.jsx:393-394` (add displayBalance)
5. Edit 3 — `RoomRowCard.jsx` return object
6. Edit 4 — `RoomRowCard.jsx` RoomBillingCard prop
7. Final compile check → 0 warnings

---

## Critical Safety Notes

1. **`Math.max(0, ...)` clamp must stay** — OD-1: when balance ≤ 0 (excess advance), pass ₹0, no refund UI
2. **`?? roomInfo.balancePayment` fallback must stay** — when `room_payment_summary` is null (guest made no mid-stay payments), behaviour is identical to today
3. **`balance` (original) must NOT be removed** from RoomRowCard — it feeds the `roomService` arithmetic which is owner-locked (BUG-048, 2026-05-12). Only `displayBalance` goes to the display component.

---

## Verification Matrix

| Edit | File | Test | Manual/Auto |
|---|---|---|---|
| E1 (no mid-stay) | CollectPaymentPanel | Room with no mid-stay payments → checkout roomBalance = original `balancePayment` (unchanged) | MANUAL |
| E1 (mid-stay paid) | CollectPaymentPanel | Room + mid-stay payment → checkout roomBalance = `remainingRoomBalance` (reduced/zero) | MANUAL — needs live room |
| E1 (excess advance) | CollectPaymentPanel | Advance > room price → `balancePayment` negative → `remainingRoomBalance` null → clamp → ₹0 | MANUAL |
| E4 (display) | RoomRowCard | Room Orders Report → Balance card shows reduced balance after mid-stay payment | MANUAL |
| E2 formula safe | RoomRowCard | Settled room → food and total columns identical to pre-fix | MANUAL |
| Regression | CollectPaymentPanel | Non-room orders unaffected (`isRoom=false`, `roomBalance=0` always) | MANUAL spot-check |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-360 → `status: "IMPLEMENTED"`, `gate: "5"`
- [ ] `BUG_TRACKER.md`: row updated  
- [ ] `FILE_OWNERSHIP.md`: `CollectPaymentPanel.jsx` + `RoomRowCard.jsx` listed with BUG-360
- [ ] Code markers: `// BUG-360` on every modified line
- [ ] Compile: 0 new warnings
