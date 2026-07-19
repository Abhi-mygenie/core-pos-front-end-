# BUG-137: KOT Re-Print from Inside View (CartPanel) Fails — `getOrderById` Undefined

## Registered: 2026-06-18
**Sprint:** pos_5_0
**Priority:** P1 (feature broken, no workaround from inside view)
**Risk:** MEDIUM (component state fix, no financial logic)
**Status:** IMPLEMENTED — OWNER VERIFIED (2026-06-18)
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (code-traced + owner verified on live order #029709)

---

## 1. Description

When printing a KOT from the inside order detail view (CartPanel → RePrintOnlyButton), the KOT did not print. Printing from OrderCard or TableCard worked fine. The station picker for multi-station selection also failed from the inside view as a consequence.

## 2. Root Cause

`RePrintOnlyButton` (`components/order-entry/RePrintButton.jsx`, line 53) called `getOrderById(orderId)` but never destructured it from `useOrders()`. The component imported `useOrders` (line 3) but only called `useMenu()` and `useRestaurant()`. This caused a `ReferenceError` at runtime, caught by try/catch — print silently failed with toast "Failed to send KOT request".

## 3. Fix Applied

**Single line addition** in `RePrintButton.jsx` after line 18:
```js
const { getOrderById } = useOrders();
```

This mirrors `PrintBillButton` (same file, line 103) which already had the correct pattern.

## 4. Verification

- Owner tested on live order #029709 (shimlaqohfoodcourt, multi-station: CreambellParlour + MSB + Zorko)
- Station picker correctly appeared for 3 stations with item counts
- KOT print successful from inside view
- Single-station orders print directly without popup (original behavior preserved)

## 5. Files Changed

| File | Change |
|------|--------|
| `components/order-entry/RePrintButton.jsx` | +1 line: `const { getOrderById } = useOrders()` in `RePrintOnlyButton` |

## 6. Gate Status — CLOSED

| Gate | Status |
|------|--------|
| 0-1 — Intake | ✅ |
| 2 — Impact Analysis | ✅ |
| 3 — Implementation Plan | ✅ |
| 4 — Owner GO | ✅ |
| 5 — Implementation | ✅ |
| 6 — Owner Smoke | ✅ PASSED (2026-06-18, order #029709) |
