# PROD-HOTFIX-004 — Walk-In Cart Not Cleared on Stay-on-Order Screen

**Date:** 2026-05-27
**Severity:** P1 (UX confusion — cashier thinks order not placed)
**Affected flow:** Walk-In → Place Order → Stay on Order Screen mode
**Files changed:** `DashboardPage.jsx` (+2 lines)

---

## 1. Symptom

When "Stay on Order Screen" toggle is ON and a cashier places a walk-in order:
- Order is created successfully on the backend
- But the order screen is NOT cleared — cart items remain visible
- Cashier may believe the order was not placed and attempt to re-place it

## 2. Root Cause

`handleCollectBillStayOnOrder()` in `DashboardPage.jsx` remounts `OrderEntry` via React `key` change (`orderEntryResetNonce`), but does **not** clear the persisted cart in `cartsByTable['walkIn']`.

The remounted OrderEntry receives the old cart items via `savedCart` prop:
```
savedCart={cartsByTable[orderEntryTable?.id || orderEntryType] || []}
         = cartsByTable[null?.id || 'walkIn']
         = cartsByTable['walkIn']  ← OLD ITEMS STILL HERE
```

**Only walk-in is affected** because the cart key (`'walkIn'`) stays the same before and after reset. Dine-in, takeaway, and delivery are unaffected because their cart keys change (from `table.id` / `'takeAway'` / `'delivery'` → `'walkIn'`), so the old cart is naturally orphaned.

## 3. Fix

Added 2 lines to `handleCollectBillStayOnOrder()` to clear the saved cart before remounting:

```js
const cartKey = orderEntryTable?.id || orderEntryType;
if (cartKey) setCartsByTable(prev => ({ ...prev, [cartKey]: [] }));
```

## 4. Regression Impact

| Order Type | Before Fix | After Fix | Regression? |
|---|---|---|---|
| Walk-In | Cart persists ❌ | Cart cleared ✅ | **FIX** |
| Dine-In (table) | Cart cleared ✅ | Cart cleared ✅ | None |
| Takeaway | Cart cleared ✅ | Cart cleared ✅ | None |
| Delivery | Cart cleared ✅ | Cart cleared ✅ | None |

The added lines also clear the cart for table orders, but since `handleCollectBillStayOnOrder` already changes the key from `table.id` to `'walkIn'`, the table's saved cart was already orphaned (never read again). Clearing it explicitly is harmless cleanup.

## 5. Screen Clear Timing (for reference)

The screen reset is triggered by `navigateAfterOrderAction()` which fires:
- **Physical table (dine-in):** After socket `update-table` engage event
- **Walk-in / takeaway / delivery:** After 500ms delay

The reset is done via React `key` change (component remount), **not** by socket or API response. The API call is fire-and-forget.

## 6. Build Verification

- `CI=false yarn build` → exit 0
- No new ESLint warnings
- Only pre-existing warning: `OrderEntry.jsx:1308` (printOrder dependency)
