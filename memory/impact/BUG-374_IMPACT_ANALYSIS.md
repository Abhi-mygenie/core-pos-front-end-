# BUG-374 IMPACT ANALYSIS — Cart: Variation Qty Change Mirrors to All Variations of Same Item
**Date:** 2026-09-01 | **Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE (root cause traced, fix not yet written)
**Conflict Pre-Check:** OrderEntry.jsx — last modified by multiple CRs (BUG-246, CR-104, BUG-298/299, FO-B1-01). HIGH-RISK FILE — full audit of cart operations before any change.
**Risk:** CRITICAL

---

## Root Cause — HIGH Confidence

```
updateQuantity (OrderEntry.jsx:736) — matches cart items by item.id:
  setCartItems(prev => prev.map(item => {
    if (item.id !== itemId) return item;   ← BREAK POINT
    return { ...item, qty: newQty };
  }));

When 30ml and 60ml are added as separate cart entries:
  cartItems = [
    { id: 1001, customizations: { variants: ['30ml'] }, qty: 1 },
    { id: 1001, customizations: { variants: ['60ml'] }, qty: 1 },  ← SAME item.id
  ]

Calling updateQuantity(1001, 3) →
  BOTH entries match item.id === 1001 → BOTH get qty: 3  ← BUG
```

`customizationKey()` at line 698 correctly differentiates variations (uses `JSON.stringify([id, size, variants.sort(), addons.sort(), notes])`). But it is **only used in `addCustomizedItemToCart`** to merge identical items — **not used in `updateQuantity`** or other cart operations.

---

## Fix Approach

**Strategy: Assign a unique `_cartKey` to every cart item on creation. Use `_cartKey` (not `item.id`) as the match key in `updateQuantity` and all other per-slot cart operations.**

`_cartKey` = `Date.now() + Math.random()` (or `crypto.randomUUID()` if available) — a collision-proof string assigned once when a new cart slot is created.

This approach:
- Is additive (adds `_cartKey` to cart items, doesn't change existing id-based logic for non-qty operations)
- Does NOT break `addCustomizedItemToCart` merge logic (still uses `customizationKey`)
- Does NOT break the placed items delta flow (`_deltaForId` already uses a different mechanism)
- Does NOT affect the `buildCartItem` / `collectBillExisting` payloads (those don't use `_cartKey`)

---

## Affected Files

| File | Change | Risk |
|---|---|---|
| `OrderEntry.jsx` | (1) Assign `_cartKey` when adding to cart (all addToCart paths); (2) `updateQuantity` match by `_cartKey` for unplaced items | HIGH — near-hotspot, critical path |

## Scope Lock
**Files WILL change:** `OrderEntry.jsx`
**Files will NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, `TableCard.jsx`, `OrderCard.jsx`, any API layer

---

## Cart Entry Points That Need `_cartKey` Assigned

| Line range | Path | Action |
|---|---|---|
| ~586-664 | `addToCart` (no customization) — lines 596, 623, 651, 654, 664, 683 | Add `_cartKey` to each new cart object |
| ~706-727 | `addCustomizedItemToCart` — line 720 | Add `_cartKey` to new entry (merge path at 717 keeps existing `_cartKey`) |
| ~1332 | Custom item from API | Add `_cartKey` |

## `updateQuantity` Change (unplaced path only)
```js
// BEFORE (line 778):
if (item.id !== itemId) return item;

// AFTER:
// For unplaced items, match by _cartKey if available; fall back to id for backwards compat
if (item._cartKey ? item._cartKey !== itemId : item.id !== itemId) return item;
```
And callers pass `item._cartKey` as `itemId` when available.

---

## Owner Decisions: NONE — approach is clear from root cause
## Blast Radius: MEDIUM (1 file — OrderEntry.jsx — but large file with many cart paths)
## Downstream: No impact on API payloads, print, or financial logic
## Next: Gate 3 Implementation Plan → Gate 4 GO
