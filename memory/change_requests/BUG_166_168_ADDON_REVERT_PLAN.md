# BUG-166 / BUG-168 — REVERT PLAN

**Date:** 2026-07-12
**Status:** PENDING OWNER GO — revert all addon × qty changes
**Reason:** Owner confirmed previous logic was correct for addon quantity. All addon-related changes must be reverted.

---

## Summary

All changes made for BUG-166 (`addon_amount × qty`) and BUG-168 (`add_on_qtys × qty` + display) are to be **fully reverted**. The original per-unit addon logic was correct.

---

## Complete Revert List — 11 Code Changes + 4 Test Files

### File 1: `api/transforms/orderTransform.js` — 3 changes

| # | Line | Bug ID | Current (to remove) | Revert to (original) |
|---|------|--------|---------------------|----------------------|
| 1 | L698 | BUG-168 | `add_on_qtys: addonQtys.map(q => q * (item.qty \|\| 1)), // BUG-168` | `add_on_qtys: addonQtys,` |
| 2 | L704 | BUG-166 | `addon_amount: isRuntimeComp ? 0 : addonAmount * (item.qty \|\| 1), // BUG-166 fix` | `addon_amount: isRuntimeComp ? 0 : addonAmount,` |
| 3 | L1493 | BUG-166 | `addon_amount: isRuntimeComp ? 0 : addonAmount * qty, // BUG-166 fix` | `addon_amount: isRuntimeComp ? 0 : addonAmount,` |

### File 2: `components/order-entry/CartPanel.jsx` — 4 changes

| # | Lines | Bug ID | What to revert |
|---|-------|--------|----------------|
| 4 | L8-23 | BUG-168 | **DELETE** `getAddonText()` and `hasAddons()` helper functions entirely |
| 5 | L95+L99 | BUG-168 | Revert condition from `hasAddons(item)` back to `item.customizations.addons?.length > 0`. Revert display from `getAddonText(item)` back to `item.customizations.addons.join(", ")` |
| 6 | L121-126 | BUG-168 | Revert `const addonQty = (a.quantity \|\| a.qty \|\| 1) * (item.qty \|\| 1); // BUG-168` back to `const qty = a.quantity \|\| a.qty \|\| 1;` and `addonQty > 1` back to `qty > 1` and `x${addonQty}` back to `x${qty}` |
| 7 | L236+L240 | BUG-168 | Revert condition from `hasAddons(item)` back to `item.customizations.addons?.length > 0`. Revert display from `getAddonText(item)` back to `item.customizations.addons.join(", ")` |

### File 3: `components/order-entry/CollectPaymentPanel.jsx` — 4 changes

| # | Lines | Bug ID | What to revert |
|---|-------|--------|----------------|
| 8 | L1862-1866 | BUG-168 | Revert entire block back to original: condition `item.customizations.addons?.length > 0`, display `item.customizations.addons.join(", ")`. Remove `selectedAddons/addOns` logic and `× (item.qty \|\| 1)` multiplication. |
| 9 | L1877-1879 | BUG-168 | Revert `const totalQty = (a.quantity \|\| a.qty \|\| 1) * (item.qty \|\| 1); // BUG-168` back to `const qty = a.quantity \|\| a.qty \|\| 1;` and `totalQty > 1` back to `qty > 1` and `x${totalQty}` back to `x${qty}` |
| 10 | L2217-2221 | BUG-168 | Same as #8 — revert to original `item.customizations.addons.join(", ")` |
| 11 | L2232-2234 | BUG-168 | Same as #9 — revert `totalQty` back to `qty` (per-unit only) |

### Test Files to Delete — 4 files

| # | File Path | Bug ID |
|---|-----------|--------|
| 12 | `src/__tests__/api/transforms/orderTransformAddonQty.test.js` | BUG-166 |
| 13 | `src/__tests__/api/transforms/orderTransformAddOnQtys.test.js` | BUG-168 |
| 14 | `src/__tests__/components/CartPanelAddonDisplay.test.js` | BUG-168 |
| 15 | `src/__tests__/components/CollectPaymentPanelAddonDisplay.test.js` | BUG-168 |

---

## Original Code (pre-change reference)

### orderTransform.js L698 (original)
```js
add_on_qtys:         addonQtys,
```

### orderTransform.js L704 (original)
```js
addon_amount:        isRuntimeComp ? 0 : addonAmount,
```

### orderTransform.js L1493 (original)
```js
addon_amount:       isRuntimeComp ? 0 : addonAmount,
```

### CartPanel.jsx — NO helper functions at L8-23 (original had nothing there)

### CartPanel.jsx L95 area (original)
```jsx
{item.customizations && !isCancelled && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
    {item.customizations.size && <span>{item.customizations.size}</span>}
    {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
    {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
  </div>
)}
```

### CartPanel.jsx L121-126 area (original)
```jsx
{item.addOns?.length > 0 && (
  <span>{item.variation?.length > 0 ? ' + ' : '+ '}{item.addOns.map(a => {
    const name = a.name || '';
    const qty = a.quantity || a.qty || 1;
    return qty > 1 ? `${name} x${qty}` : name;
  }).filter(Boolean).join(', ')}</span>
)}
```

### CartPanel.jsx L236 area (original)
```jsx
{item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
  <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
    {item.customizations.size && <span>{item.customizations.size}</span>}
    {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
    {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
  </div>
)}
```

### CollectPaymentPanel.jsx L1862-1881 (original)
```jsx
{item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
  <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
    └─ {item.customizations.size}
    {item.customizations.variants?.length > 0 && (item.customizations.size ? ', ' : '') + item.customizations.variants.join(", ")}
    {item.customizations.addons?.length > 0 && ` + ${item.customizations.addons.join(", ")}`}
  </div>
)}
{!item.customizations && (item.variation?.length > 0 || item.addOns?.length > 0) && (
  <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
    └─ {item.variation?.map(v => {
      const labels = Array.isArray(v.values)
        ? v.values.map(val => val.label).filter(Boolean)
        : (Array.isArray(v.values?.label) ? v.values.label : []);
      return labels.length > 0 ? `${v.name}: ${labels.join(', ')}` : v.name;
    }).filter(Boolean).join(', ')}
    {item.addOns?.length > 0 && `${item.variation?.length > 0 ? ' + ' : ''}${item.addOns.map(a => {
      const qty = a.quantity || a.qty || 1;
      return qty > 1 ? `${a.name} x${qty}` : a.name;
    }).filter(Boolean).join(', ')}`}
  </div>
)}
```

### CollectPaymentPanel.jsx L2217-2236 (original)
```jsx
{item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
  <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
    └─ {item.customizations.size}
    {item.customizations.variants?.length > 0 && (item.customizations.size ? ', ' : '') + item.customizations.variants.join(", ")}
    {item.customizations.addons?.length > 0 && ` + ${item.customizations.addons.join(", ")}`}
  </div>
)}
{!item.customizations && (item.variation?.length > 0 || item.addOns?.length > 0) && (
  <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
    └─ {item.variation?.map(v => {
      const labels = Array.isArray(v.values)
        ? v.values.map(val => val.label).filter(Boolean)
        : (Array.isArray(v.values?.label) ? v.values.label : []);
      return labels.length > 0 ? `${v.name}: ${labels.join(', ')}` : v.name;
    }).filter(Boolean).join(', ')}
    {item.addOns?.length > 0 && `${item.variation?.length > 0 ? ' + ' : ''}${item.addOns.map(a => {
      const qty = a.quantity || a.qty || 1;
      return qty > 1 ? `${a.name} x${qty}` : a.name;
    }).filter(Boolean).join(', ')}`}
  </div>
)}
```

---

## Registry Updates Required After Revert

| Doc | Action |
|-----|--------|
| `registry.json` | BUG-166 → REVERTED, BUG-168 → REVERTED |
| `BUG_TRACKER.md` | BUG-166 + BUG-168 rows → REVERTED |
| `FILE_OWNERSHIP.md` | Remove BUG-166 + BUG-168 entries |

---

## Notes

- **BUG-VQTY** (`variation_amount × qty`) at L703 and L1492 is **NOT part of this revert** — it was a separate fix
- The original addon logic treats `addon_amount` and `add_on_qtys` as **per-unit** values
- The backend handles the multiplication by item qty on its side
