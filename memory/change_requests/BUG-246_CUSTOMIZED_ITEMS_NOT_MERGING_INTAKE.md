# BUG-246 — Customized Items Not Merging in Cart (Duplicate Line Items + Print)

**ID:** BUG-246
**Type:** BUG
**Created:** 2026-07-25
**Severity:** P1 (affects cart display, bill, KOT print, prep time — core order workflow)
**Risk:** MEDIUM
**Module:** Order Entry — Cart (`OrderEntry.jsx`)
**Duplicate Check:** DISTINCT. BUG-166 is addon amount math. BUG-168 is bill print addon qty. This bug is about cart item MERGING — different root cause and fix location.
**Code Reality:** Bug confirmed at `OrderEntry.jsx:676-689` — `addCustomizedItemToCart` has ZERO merge logic.
**Source:** OWNER-REPORTED (session 2026-07-25)
**Confidence:** CONFIRMED (code trace: function always appends, never checks for existing identical item)

---

## Description

When adding the same customized item multiple times (e.g., Organic Espresso → Half Cup × 3), each addition creates a separate line item in the cart. Expected: identical customizations should merge into a single line with qty incremented.

### Impact (cascades through entire system)

| Screen | Effect |
|--------|--------|
| Cart Panel | 3 rows "Half Cup ×1" instead of 1 row "Half Cup ×3" |
| Collect Bill | 3 line items instead of 1 |
| OrderCard (Dashboard) | 3 items with 3 separate prep timers |
| KOT Print | 3 separate printed lines |
| Bill Print (all 5 trigger points) | 3 printed lines |
| QSR Place & Pay | Same bug (same cart path) |

### Root Cause

`addCustomizedItemToCart()` at L676 ALWAYS appends:
```js
setCartItems([...cartItems, { ...item, qty: 1 }]); // NEVER checks for existing
```

Compare with `addToCart()` at L596 which merges non-customized items:
```js
const existingIndex = cartItems.findIndex(ci => ci.id === item.id && !ci.customizations && !ci.placed);
if (existingIndex >= 0) { updated[existingIndex].qty += 1; } // MERGE ✅
```

### "Identical" Definition

Two customized items are identical when ALL match:
- `id` (product ID)
- `customizations.size` (variation name)
- `customizations.variants` (sorted)
- `customizations.addons` (sorted)
- `customizations.notes`

---

## Blast Radius

- 1 file: `OrderEntry.jsx` (~10 lines in `addCustomizedItemToCart`)
- NO changes needed in: CartPanel, CollectPaymentPanel, orderTransform, orderService, any print code
- Scope: SMALL (1 function), but file is **R5 HOTSPOT**
- Financial: NO (qty × price calculation already handles merged items correctly in `buildCartItem`)

---

## Next
Planning Gate 2 → Gate 3 → Implementation (full gate flow — R5 hotspot)
