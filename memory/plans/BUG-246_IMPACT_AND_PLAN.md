# BUG-246 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**ID:** BUG-246
**Title:** Customized items not merging in cart
**Date:** 2026-07-25
**Risk:** MEDIUM (R5 hotspot — OrderEntry.jsx)
**Code Reality:** Bug confirmed at `OrderEntry.jsx:676-689`
**Conflict Pre-Check:** OrderEntry.jsx last modified by CR-051 (2026-06-18, customer field validation). `addCustomizedItemToCart` function was NOT touched. SAFE — no conflict.

---

## Impact Analysis (Gate 2)

### Data Flow
```
User clicks customizable item → ItemCustomizationModal opens
  → User picks Half Cup + confirms → onAddToOrder(customizedItem) called
  → addCustomizedItemToCart(item) at L676
  → ALWAYS appends: setCartItems([...cartItems, { ...item, qty: 1 }])
  → 3 clicks = 3 separate cart entries
  → placeOrder serializes ALL cart entries → 3 order_details records in backend
  → ALL downstream reads (KOT, Bill, OrderCard) see 3 separate lines
```

### Customized Item Shape (from ItemCustomizationModal.jsx:220-256)
```js
{
  id: <foodId>,                            // product ID
  selectedSize: { name: "Half Cup", price: 80 },
  selectedVariants: { groupId: { name: "Extra Shot" } },
  selectedAddons: [{ name: "Sugar", quantity: 1 }],
  notes: "less ice",
  customizations: {
    size: "Half Cup",                       // string
    variants: ["Milk: Oat"],                // string[]
    addons: ["Sugar x1"],                   // string[]
    notes: "less ice"                       // string
  }
}
```

### Identity Key for Merge
Two customized items are identical when:
```
key = JSON.stringify([
  item.id || item.foodId,
  item.customizations?.size || '',
  [...(item.customizations?.variants || [])].sort(),
  [...(item.customizations?.addons || [])].sort(),
  item.customizations?.notes || ''
])
```

### Screens Affected (ALL auto-fixed by cart merge — no changes needed)
| Screen | File | How it reads items |
|--------|------|--------------------|
| Cart Panel | `CartPanel.jsx` | Iterates `cartItems` directly |
| Collect Bill | `CollectPaymentPanel.jsx:1822` | Iterates `cartItems` filtered |
| OrderCard | `OrderCard.jsx:675` | Reads `order.items` from backend |
| KOT Print | `orderService.js:148` | Reads `rawOrderDetails` from backend |
| Bill Print | `orderTransform.js:1714` | Reads `rawOrderDetails` from backend |
| QSR | `OrderEntry.jsx:1242` | Uses same cart |

**Zero print/display code changes needed.** Fix at cart insertion cascades everywhere.

### Risk Register
| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Merge matches items that should be separate | LOW | Key includes ALL customization fields + notes |
| `totalPrice` stale after qty bump | LOW | CartPanel already recomputes: `(item.totalPrice / originalQty) * newQty` |
| Placed items incorrectly merged with unplaced | NONE | Key checks `!placed` — only unplaced items merge |
| Different `addedAt` timestamps | NONE | Merge updates existing item's qty, keeps original `addedAt` |

---

## Implementation Plan (Gate 3)

### Scope Lock
- **File WILL change:** `components/order-entry/OrderEntry.jsx` (L676-689, `addCustomizedItemToCart`)
- **Files WILL NOT touch:** CartPanel.jsx, CollectPaymentPanel.jsx, orderTransform.js, orderService.js, ItemCustomizationModal.jsx, OrderCard.jsx — all auto-benefit from cart fix

### Edit

**Current (L676-689):**
```js
  const addCustomizedItemToCart = (item) => {
    // Case 3: Prepaid orders cannot be edited
    if (isPrepaid && placedOrderId) {
      toast({ title: "Cannot Edit", description: "Prepaid orders cannot be modified", variant: "destructive" });
      return;
    }
    setCartItems([...cartItems, {
      ...item,
      qty: item.quantity || 1,
      status: "preparing",
      placed: false,
      addedAt: new Date().toISOString()
    }]);
    setCustomizationItem(null);
  };
```

**New:**
```js
  // BUG-246: Build identity key for customization merge
  const customizationKey = (ci) => JSON.stringify([
    ci.id || ci.foodId,
    ci.customizations?.size || '',
    [...(ci.customizations?.variants || [])].sort(),
    [...(ci.customizations?.addons || [])].sort(),
    ci.customizations?.notes || '',
  ]);

  const addCustomizedItemToCart = (item) => {
    // Case 3: Prepaid orders cannot be edited
    if (isPrepaid && placedOrderId) {
      toast({ title: "Cannot Edit", description: "Prepaid orders cannot be modified", variant: "destructive" });
      return;
    }
    // BUG-246: Merge identical customized items instead of always appending
    const key = customizationKey(item);
    const existingIndex = cartItems.findIndex(ci => !ci.placed && ci.customizations && customizationKey(ci) === key);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + (item.quantity || 1) };
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString()
      }]);
    }
    setCustomizationItem(null);
    setFlashItemId(item.id || item.foodId);
    setTimeout(() => setFlashItemId(null), 400);
  };
```

**Change:** +8 lines (key builder function + findIndex + conditional merge). Existing append logic preserved as `else` branch.

### Verification Matrix

| # | Check | How to Verify |
|---|-------|--------------|
| V1 | Add Half Cup 3× → 1 line with qty=3 | Browser: click Half Cup 3 times → verify cart shows 1 row ×3 |
| V2 | Add Half Cup then Full Cup → 2 separate lines | Browser: verify different variations stay separate |
| V3 | Add Half Cup (no addon) + Half Cup (with Sugar) → 2 lines | Browser: verify different addons stay separate |
| V4 | Add Half Cup with notes "less ice" + Half Cup no notes → 2 lines | Browser: verify different notes stay separate |
| V5 | Placed item + new identical item → separate (not merged) | Browser: place order → add same item → verify new unplaced line |
| V6 | KOT prints merged qty | Browser: place order with merged items → check KOT |
| V7 | Collect Bill shows merged qty | Browser: open collect bill → verify 1 line ×3 |
| V8 | QSR mode works | Browser: enable QSR → add customized item 2× → verify merge |
| V9 | Webpack compiles | Logs check |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-246 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add OrderEntry.jsx with BUG-246
- [ ] Code markers: `// BUG-246` comment
