# CR-348 — Impact Analysis: Add GST / Tax Field to Custom Item Modal

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-26
**Code Reality:** NONE (no tax state in AddCustomItemModal, hardcoded 0/GST/Exclusive in orderTransform)
**Conflict Pre-Check:** NONE — AddCustomItemModal last touched BUG-147 (error prefix, minor). orderTransform.js addCustomItem function is isolated from financial payment builders.
**Risk:** HIGH (adds tax fields to a product-creation API payload)

---

## Data Flow Trace

```
useRestaurant() → restaurant.tax.gstStatus / restaurant.tax.gstPercentage
                         ↓ (OD-1: show GST fields only if gstStatus=true or gstPercentage > 0)
OrderEntry.jsx:1327
  handleAddCustomItem({ name, categoryId, price, qty, notes })
                         ↓ currently passes NO tax fields
  orderToAPI.addCustomItem(name, categoryId, price)
                         ↓ orderTransform.js:1012
  payload: { name, category_id, price, tax: 0, tax_type: 'GST', tax_calc: 'Exclusive' }
                         ↓ POST /api/v2/vendoremployee/product/add-single-product
  Backend creates product — tax fields accepted, currently hardcoded
```

---

## What Changes

### E1 — `AddCustomItemModal.jsx` (new state + conditional UI)

**New state:**
```js
const [taxPercent, setTaxPercent] = useState('');
const [taxCalc, setTaxCalc] = useState('Exclusive'); // default per OD-2 guidance
```

**New prop:** `showGst` (boolean) — passed from OrderEntry so modal doesn't need to access restaurant context directly.

**New UI block** (shown only when `showGst = true`, between Price and Quantity):
- Numeric input: GST % (staff types manually per OD-1)
- Toggle/Select: Inclusive / Exclusive (per OD-2)

**Pass to onAdd:** `{ name, categoryId, price, qty, notes, taxPercent, taxCalc }`

### E2 — `orderTransform.js` function `addCustomItem` (line 1012)

**Signature change:**
```js
addCustomItem: (name, categoryId, price, taxPercent = 0, taxCalc = 'Exclusive') => ({
  name,
  category_id: categoryId,
  price,
  tax:      Number(taxPercent) || 0,   // was: 0
  tax_type: 'GST',                      // unchanged — backend field
  tax_calc: taxCalc,                    // was: hardcoded 'Exclusive'
})
```

### E3 — `OrderEntry.jsx` (line 1327)

**`handleAddCustomItem` update:**
```js
const handleAddCustomItem = async ({ name, categoryId, price, qty, notes, taxPercent, taxCalc }) => {
  const payload = orderToAPI.addCustomItem(name, categoryId, price, taxPercent, taxCalc);
  // ... rest unchanged
};
```

**AddCustomItemModal mount** (~line 2779): pass `showGst` prop:
```jsx
<AddCustomItemModal
  showGst={!!(restaurant?.tax?.gstStatus || restaurant?.tax?.gstPercentage > 0)}
  ...
/>
```

---

## Files WILL Change

| File | Edit | Risk |
|---|---|---|
| `AddCustomItemModal.jsx` | New state + conditional UI section | LOW (self-contained) |
| `api/transforms/orderTransform.js` | addCustomItem signature + tax fields | HIGH (financial payload) |
| `components/order-entry/OrderEntry.jsx` | Pass taxPercent/taxCalc to transform + showGst prop to modal | HIGH (R5 hotspot) |

## Files Will NOT Touch

All other files — no downstream consumer reads tax fields from the product-creation response. The `onAdd` callback in `OrderEntry` calls `addToCart` which uses the existing cart item model; tax for order billing is computed separately at checkout from the menu item's stored tax rate.

---

## Verification Matrix

| Edit | File | How to Verify |
|---|---|---|
| E1 | AddCustomItemModal | Open modal with GST-enabled restaurant → GST % field visible. Open with GST=0 restaurant → GST field hidden |
| E2 | orderTransform.js | Add custom item with GST 5% Exclusive → Network tab: `tax: 5, tax_calc: "Exclusive"` in POST body |
| E3 | OrderEntry.jsx | Full flow: add item → check cart → place order → verify line carries correct tax |

---

## Post-Code Registry Checklist (for Implementation agent)

- [ ] registry.json: CR-348 → status: IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: AddCustomItemModal.jsx + OrderEntry.jsx + orderTransform.js listed
- [ ] Code markers: `// CR-348` in every modified file
- [ ] Compile: 0 new warnings
