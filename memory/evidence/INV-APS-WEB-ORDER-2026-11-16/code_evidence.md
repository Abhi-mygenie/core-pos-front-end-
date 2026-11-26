# APS Web Order — Code Evidence Summary

## Date: 2026-11-16

### 1. Dynamic-Price Mechanism (BUG-035) — Existing, Unplaced Items Only

```
OrderEntry.jsx:847-854 — addToCart intercept:
  if (Number(item.price) === 1) {
    setDynamicPriceItem(item);  // show "Enter Price" modal
    return;
  }

OrderEntry.jsx:3018-3081 — "Enter Price" modal:
  <input type="number" data-testid="dynamic-price-input" ... />
  → Cashier enters price → confirmDynamicPriceAndAdd()
  → Adds to cart with { price: entered, _isDynamicPrice: true }

ItemCustomizationModal.jsx:21-25, 381-407 — Inline price for customizable ₹1:
  isDynamicEntry = Number(item?.price) === 1 && !selectedSize
  → Shows "Set Price" input if true
```

### 2. ScanOrderPopOut — Read-Only Items (NO price edit, NO cancel)

```
ScanOrderPopOut.jsx:447-557 — Item rendering:
  <ul className="divide-y">
    {activeOrder.items.map((it, idx) => (
      <li> ... {it.name} ... ₹{lineTotal.toFixed(2)} ... </li>
    ))}
  </ul>
  → Pure display. No <input>, no cancel button per item.

ScanOrderPopOut.jsx:589-648 — Actions:
  Mute | Edit | Reject | Accept
  → No item-level actions. Accept confirms entire order at current prices.
```

### 3. CartPanel PlacedItemRow — Qty Edit Only (NO price edit)

```
CartPanel.jsx:65 — PlacedItemRow component:
  Props: editingQtyItemId, setEditingQtyItemId, updateQuantity
  → Pencil icon triggers qty edit mode
  → No price-related props or state

CartPanel.jsx:189-190 — Pencil click:
  <button onClick={() => setEditingQtyItemId(item.id)}>
    <Pencil />
  </button>
  → Opens qty stepper (L179-183)
  → No price input anywhere in PlacedItemRow

CartPanel.jsx:200-210 — Price display (placed items):
  <span>₹{((item.price || 0) * (shownQty || 1) + addonSum).toLocaleString()}</span>
  → Read-only display. No edit capability.
```

### 4. Backend API Status

```
constants.js:92-93:
  EDIT_ORDER_ITEM:       'TBD',   // CHG-040: Edit placed item qty/notes
  EDIT_ORDER_ITEM_QTY:   'TBD',   // CHG-040 future: Edit placed item qty only
  → Both endpoints are PLACEHOLDER — not implemented
```

### 5. Product Transform — No APS Field

```
productTransform.js: No field for 'aps', 'open_price', 'price_type', 'is_open_price'
  → ₹1 catalog price is the ONLY signal for dynamic pricing
  → Convention: price === 1 → "As Per Size" / "Market Price" / "Enter Price"
```
