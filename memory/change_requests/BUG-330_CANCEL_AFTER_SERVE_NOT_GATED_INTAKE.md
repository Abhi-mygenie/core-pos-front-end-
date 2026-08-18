# BUG-330 — Cancel After Serve Setting Not Gated in Frontend

**ID:** BUG-330  
**Type:** BUG  
**Severity:** P1 — HIGH  
**Risk:** HIGH (order cancellation flow)  
**Area:** Order Entry → Cart → Cancel Item  
**Sprint:** POS 5.x  
**Created:** 2026-08-18  
**Source:** INVESTIGATION (INV-AUG18-2026, INV-5A)  
**Duplicate check:** DISTINCT from BUG-025 (served-item display bug, different issue)  

---

## Description

Restaurant Settings Step 5 has a **"Cancel After Serve"** toggle (`canclePostServe`). When this is turned **OFF**, staff should NOT be able to cancel items that have already been served.

However, the cancel button in CartPanel/OrderEntry is **always shown** regardless of this setting. Turning off "Cancel After Serve" has no effect on the frontend UI.

## Evidence

- `OrderEntry.jsx:307`: `const canCancelItem = hasPermission('food');` — only permission gate, no setting check
- `OrderEntry.jsx:322-324`: `isItemCancelAllowed` returns `canCancelItem` — no `allowPostServeCancel` check
- `profileTransform.js:222`: `allowPostServeCancel: toBoolean(api.cancle_post_serve)` ✓ correctly mapped
- `RestaurantContext.jsx:53-54`: `allowPostServeCancel: false` default ✓ in context
- **Break point**: `OrderEntry.jsx:307` — `canCancelItem` never reads `restaurant.cancellation.allowPostServeCancel`
- Source: AGENT-DISCOVERED
- Confidence: HIGH

## Root Cause

`allowPostServeCancel` is correctly mapped in `profileTransform` and available at `restaurant.cancellation.allowPostServeCancel`, but `OrderEntry.jsx` **never reads it**. The cancel gate only checks role permission (`hasPermission('food')`).

## Blast Radius

- `OrderEntry.jsx` — add `cancellation.allowPostServeCancel` into `isItemCancelAllowed` logic (~3 lines)
- No other files need changing
- Hotspot files: NO (OrderEntry is a large file but this is an additive read of an existing context value)
- Estimated scope: SMALL (1 file, ~3 lines)

## Planning Skip Eligibility

- ≤10 lines: YES (~3 lines)
- 1 file only: YES (OrderEntry.jsx)  
- Not a hotspot: BORDERLINE (OrderEntry is large but change is additive read-only)
- Not financial: YES (cancel flow, not billing)
- **Planning skip eligible — owner approval required**

## Fix Direction

```js
// OrderEntry.jsx — in isItemCancelAllowed callback
const { cancellation } = useRestaurant();  // already destructured nearby
const isItemCancelAllowed = useCallback((item) => {
  if (!canCancelItem) return false;
  // BUG-330: gate on allowPostServeCancel when item is served
  if (item.status === 'served' && !cancellation.allowPostServeCancel) return false;
  return true;
}, [canCancelItem, cancellation.allowPostServeCancel]);
```

## Next: Owner approval for planning skip → Gate 4 GO → Implementation
