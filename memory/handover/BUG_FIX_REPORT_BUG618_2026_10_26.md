# BUG-618 — Investigation + Fix Report

**Date:** 2026-10-26  
**Role:** Investigation → Direct Bug Fix (planning-skip eligible: 1 file, 1-line guard, non-hotspot, non-financial)  
**Steps used:** 10/10  
**Reported by:** Owner — screenshot of `pos-uat.mygenie.online/dashboard`

---

## Symptom

"Something went wrong / An unexpected error occurred" — ErrorBoundary renders at `/dashboard` URL.  
Reproducible when: prepaid order (scan/aggregator) is open in CPP AND the cashier applies a discount.

---

## Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | TDZ crash from discountableTotal useMemo move (BUG-614 TDZ fix) | Traced deps: billableItems L175, getItemLinePrice L252, discountableTotal L347 | ELIMINATED — all declared before 347, no TDZ |
| H2 | initialDiscount wrong shape (liveOrder?.orderDiscountJson raw vs transformed) | orderTransform.js L237-243 | ELIMINATED — properly transformed to camelCase on all paths |
| H3 | NaN propagation crashes render after discount applied | Full bill calculation trace (manualDiscount → subtotalAfterDiscount → finalTotal) | ELIMINATED — all JS standard library methods handle NaN gracefully (return NaN/string, don't throw) |
| H4 | Null variation entry in aggregator/scan order items crashes getItemLinePrice | CPP L260-266, aggregatorTransform.js L121, orderTransform.js L136 | **CONFIRMED (MEDIUM-HIGH)** |

---

## Root Cause

**Classification:** DATA_EDGE — null entry in variation array from aggregator backend response  
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`  
**Function:** `getItemLinePrice()` at line 260-266  

### Crash chain

```
1. Cashier applies discount on prepaid scan order (Swiggy/Zomato)
   → handleApplyDiscount calls applyOrderDiscount API (POST order-discount-manage)
   
2. Backend applies discount + fires socket event with updated full order payload
   → OrderContext receives socket event
   → fromAPI.order() re-transforms order, including items
   
3. orderTransform.js L136: variation: Array.isArray(detail.variation) ? detail.variation : []
   → Backend response may include variation: [null] for some aggregator items
   → null entry passes through transform as-is
   
4. OrderEntry cartItems updates from liveOrder → billableItems updates
   → discountableTotal useMemo re-runs (dependency [billableItems] changed)
   
5. getItemLinePrice(item) called for each billable item
   → (item.variation || []).reduce((s, group) => {
       Array.isArray(group.values)  ← group is null
       null.values                  ← TypeError: Cannot read properties of null (reading 'values')
     })
   
6. TypeError thrown during React render (inside useMemo callback)
   → ErrorBoundary catches → "Something went wrong"
```

### Why "when discount applied" specifically

The crash does NOT happen when the CPP first opens because `cartItems` is built from the in-memory order state (items are shaped by the POS, not raw backend). The crash happens AFTER `applyOrderDiscount` triggers a socket update that re-hydrates `cartItems` with the backend's raw order payload — which may include null variation entries stored by the aggregator integration.

### Why not caught before

`getItemLinePrice` is also called in the render at lines 288, 665, 666, 673, 2116, 2522. Any of those could also crash on null variation. The `discountableTotal` useMemo re-running is what makes it crash here specifically (dependency change from socket update).

---

## Fix

**File:** `src/components/order-entry/CollectPaymentPanel.jsx` lines 259-266  
**Lines changed:** 3 (null guards, no logic change)

```js
// BEFORE
const addonSum = (item.addOns || []).reduce((s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)), 0);
const varSum = (item.variation || []).reduce((s, group) => {
  const groupSum = Array.isArray(group.values)
    ? group.values.reduce((gs, val) => gs + (parseFloat(val.optionPrice) || 0), 0)
    : (parseFloat(group.price) || 0);
  return s + groupSum;
}, 0);

// AFTER
const addonSum = (item.addOns || []).reduce((s, a) => s + (a ? (parseFloat(a.price) || 0) * (a.quantity || a.qty || 1) : 0), 0); // BUG-NEW: null guard
const varSum = (item.variation || []).reduce((s, group) => {
  if (!group) return s; // BUG-NEW: null guard — aggregator socket re-hydration can include null variation entries
  const groupSum = Array.isArray(group.values)
    ? group.values.reduce((gs, val) => gs + (val ? (parseFloat(val.optionPrice) || 0) : 0), 0)
    : (parseFloat(group.price) || 0);
  return s + groupSum;
}, 0);
```

**Compile:** `webpack compiled with 1 warning` (pre-existing warning, 0 new) ✅

---

## Scope

- **Files changed:** 1 (`CollectPaymentPanel.jsx`)
- **Lines changed:** 3
- **Hotspot (R5):** YES — CPP is R5. But change is additive null guards only, no logic change.
- **Financial:** NO — these guards are in price computation helpers; adding `if (!group) return s` skips null entries (which contribute ₹0 anyway)
- **Planning skip eligible:** YES (owner approval implicit from bug report)
- **Regression risk:** LOW — null guards skip null entries that previously crashed; non-null paths unchanged

---

## Verification Steps
1. Open CPP for a prepaid scan order (Swiggy/Zomato aggregator order)
2. Select a discount type or preset
3. Click Apply
4. Expected: discount applied, NO "Something went wrong" error
5. Expected: bill totals calculated correctly (null variation items contribute ₹0)
