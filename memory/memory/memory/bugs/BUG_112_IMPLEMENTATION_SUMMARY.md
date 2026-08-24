# BUG-112 — Implementation Summary (Phase 1)

**Status:** IMPLEMENTED — Phase 1
**Date:** 2026-06-07
**File:** `OrderEntry.jsx`

---

## What was done

### Change 1: `autoPrintNewOrderIfEnabled` — timeout reduction
- `waitForOrderReady(orderId, 3000)` → `waitForOrderReady(orderId, 500)`
- Socket delivers order to context before HTTP responds, so poll resolves instantly (~50ms)
- 500ms is safety-only cap

### Change 2: Prepaid path — early HTTP check at redirect point
- After engage/delay, check if `newOrderId` is already set (HTTP responded during wait)
- If yes → fire `autoPrintNewOrderIfEnabled` immediately (skip background wait)
- If no → fallback to `placePromise.then()` path (existing pattern, with 500ms poll)

### Change 3: QSR path — same pattern
- Same early HTTP check + fallback
- Uses inline print logic (own scope, no cross-scope function call)
- `waitForOrderReady` timeout reduced to 500ms

---

## Testing result

- QSR mode: `order-temp-store` fires correctly ✅
- Prepaid mode: `order-temp-store` fires correctly ✅
- `waitForOrderReady` resolves instantly (order already in context from socket) ✅
- Both paths currently hit the fallback ("HTTP responded after redirect") because HTTP consistently arrives after engage/delay

---

## Phase 2 (deferred)

For table-based orders (dine-in), a socket-first approach could eliminate the HTTP wait entirely by matching the new order via `tableId` in `ordersRef`. This would fire print at T=~200ms instead of T=~400ms. Deferred because:
- Requires new `OrderContext` function
- Only benefits table orders (walk-in/TA/Del still need HTTP orderId)
- Current Phase 1 already eliminated the 0-2500ms `waitForOrderReady` buffer

---

## Files touched
| File | Lines | Change |
|------|-------|--------|
| `OrderEntry.jsx` | L1640 | `waitForOrderReady` timeout 3000→500 |
| `OrderEntry.jsx` | L1812-1840 | Prepaid: early HTTP check + fallback |
| `OrderEntry.jsx` | L1198-1270 | QSR: early HTTP check + fallback |
