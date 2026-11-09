# Session Handover — 2026-10-19 — BUG-595 FINAL FIX

**Role this session:** BUG FIX (Role 5)
**Date:** 2026-10-19
**Code changed:** YES — OrderEntry.jsx L1954

---

## Root Cause (final, confirmed)

`initialDiscount` prop passed to `CollectPaymentPanel` was sourced from `orderData?.orderDiscountJson`.

`orderData` is a **PROP** passed by `DashboardPage` via `getOrderDataForEntry(orderEntryTable)`.
That prop only updates when DashboardPage re-renders AND `getOrderDataForEntry` returns a new value.

`liveOrder` at `OrderEntry.jsx:876` already reads **directly from `orders` context** via `useOrders()`:
```js
const liveOrder = placedOrderId ? orders.find(o => o.orderId === placedOrderId) : null;
```
This IS reactive — `orders` updates on every socket event, `liveOrder` picks up the discount immediately.

The fix: use `liveOrder?.orderDiscountJson` FIRST, falling back to `orderData?.orderDiscountJson`.

---

## Fix Applied

**File:** `src/components/order-entry/OrderEntry.jsx`
**Line:** 1954

```jsx
// Before:
initialDiscount={orderData?.orderDiscountJson || null}

// After:
initialDiscount={liveOrder?.orderDiscountJson || orderData?.orderDiscountJson || null} // BUG-595
```

---

## Full Fix Summary (all 3 parts now in place)

| Part | File | Line | What |
|------|------|------|------|
| **1 (THIS SESSION)** | `OrderEntry.jsx` | 1954 | `liveOrder` as primary source for `initialDiscount` — direct context read |
| 2 (prev session) | `CollectPaymentPanel.jsx` | 366 | Reactive deps `[initialDiscount?.discount, initialDiscount?.discountType]` |
| 3 (prev session) | `OrderContext.jsx` | 342 | `orderDiscountJson` in `orderItemsByTableId` whitelist |

---

## How It Now Works

1. Owner opens CPP → clicks Apply → `applyOrderDiscount()` POSTs to backend
2. Backend saves `order_discount_json` → emits `update-order` socket with payload
3. Socket handler → `orderFromAPI.order()` transform → `orderDiscountJson: { discount:100, discountType:'flat' }`
4. `updateOrder(orderId, transformedOrder)` → `orders` state updates in context
5. **`liveOrder` in OrderEntry recomputes immediately** (reads directly from `orders`)
6. `liveOrder?.orderDiscountJson = { discount:100, discountType:'flat' }`
7. `initialDiscount` prop to CPP changes: `null` → `{ discount:100, discountType:'flat' }`
8. CPP's `useEffect` deps change: `[undefined,undefined]` → `[100,'flat']` → effect fires
9. `setDiscountValue('100')`, `setDiscountType('flat')`, `setIsDiscountApplied(true)`
10. `manualDiscount = 100` → `subtotalAfterDiscount = itemTotal − 100` → **total updates live ✅**

Cashier sees the grand total decrease instantly. Discount section stays hidden (no permission) but the TOTAL is correct.

---

## Test Steps (preview)

URL: https://pos-react-preview-4.preview.emergentagent.com

**Tab A — Cashier**
1. Login: cashier@kunafamahal.com / Qplazm@10
2. Open any placed order → Collect Bill
3. Note the grand total

**Tab B — Owner**
1. Login: owner@kunafamahal.com / Qplazm@10
2. Open SAME order → Collect Bill
3. Enter discount amount (e.g. ₹50) → select type → click **Apply**

**Expected:** Tab A grand total decreases by ₹50 immediately, no close/reopen needed.

---

## Registry

- BUG-595: `GATE_5A_IMPLEMENTED`
- webpack: compiled with 1 pre-existing warning (not from this change)
