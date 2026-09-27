# BUG-455 — Implementation Plan (Gate 3)
**Current Stock: show `display_qty_text` alongside on-hand qty across all surfaces**

**Date:** 2026-09-24 · **Based on:** `impact/BUG-455_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)
**Code reality re-verified:** NONE (grep 0 hits). Line numbers confirmed at HEAD.

---

## Scope Lock

**Files WILL change (6):**
1. `src/api/transforms/inventoryTransform.js`
2. `src/components/inventory/CurrentStockPanel.jsx`
3. `src/components/inventory/SubRecipeStockPanel.jsx`
4. `src/components/inventory/StockAuditPanel.jsx`
5. `src/utils/purchasePlanner.js`
6. `src/components/inventory/smart/AutoShoppingList.jsx`

**Files will NOT touch:** all hotspot files · `toAPI` functions · any service file · any test file

---

## Edits

### E0 — `src/api/transforms/inventoryTransform.js`

**E0a — `fromAPI.ingredients()` — after L25 (`displayUnit: item.display_unit || '',`)**
```
// BEFORE (line 24–25):
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',

// AFTER:
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      displayQtyText: item.display_qty_text || '', // BUG-455
```

**E0b — `fromAPI.stockItems()` — after L71 (`displayUnit: item.display_unit || '',`)**
```
// BEFORE (line 70–71):
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',

// AFTER:
      displayQty: Number(item.display_qty) || 0,
      displayUnit: item.display_unit || '',
      displayQtyText: item.display_qty_text || '', // BUG-455
```

---

### E1 — `src/components/inventory/CurrentStockPanel.jsx`

**E1a — on-hand table cell — L325–326**
```jsx
// BEFORE:
      <span className="text-sm font-semibold text-slate-900">{item.displayQty || item.quantity}</span>
      <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>

// AFTER:
      <span className="text-sm font-semibold text-slate-900">{item.displayQty || item.quantity}</span>
      <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>
      {item.displayQtyText && item.displayQtyText !== `${item.displayQty} ${item.displayUnit}` && ( // BUG-455
        <span className="text-xs text-slate-300 ml-1">({item.displayQtyText})</span>
      )}
```

**E1b — Excel export row — L119 (`'Current Stock': item.displayQty || item.quantity,`)**
```js
// BEFORE:
        'Current Stock': item.displayQty || item.quantity,

// AFTER:
        'Current Stock': item.displayQty || item.quantity,
        'Stock (text)': item.displayQtyText || '', // BUG-455
```

**E1c — PDF export head array and body row**

Head array (find `['Ingredient', 'Category', 'Stock', 'Unit', 'Status', 'Days Left', 'Vendor', 'Min Alert']`):
```js
// BEFORE:
      head: [['Ingredient', 'Category', 'Stock', 'Unit', 'Status', 'Days Left', 'Vendor', 'Min Alert']],

// AFTER:
      head: [['Ingredient', 'Category', 'Stock', 'Unit', 'Stock (text)', 'Status', 'Days Left', 'Vendor', 'Min Alert']], // BUG-455
```

Body row (find `item.displayQty || item.quantity, item.displayUnit || item.unit,`):
```js
// BEFORE:
          item.displayQty || item.quantity, item.displayUnit || item.unit,

// AFTER:
          item.displayQty || item.quantity, item.displayUnit || item.unit,
          item.displayQtyText || '—', // BUG-455
```

---

### E2 — `src/components/inventory/SubRecipeStockPanel.jsx`

**E2a — `getCurrentQty()` helper — L57–63 (the return object)**
```js
// BEFORE:
    return {
      qty: Number(s?.displayQty ?? s?.quantity ?? sub.currentStock ?? 0),
      unit: s?.displayUnit || s?.unit || sub.stockUnit || sub.unit || '',
    };

// AFTER:
    return {
      qty: Number(s?.displayQty ?? s?.quantity ?? sub.currentStock ?? 0),
      unit: s?.displayUnit || s?.unit || sub.stockUnit || sub.unit || '',
      text: s?.displayQtyText || '', // BUG-455
    };
```

**E2b — book-stock cell — find `<span className="text-sm font-semibold text-slate-700">{currentQty}</span>` + `<span className="text-xs text-slate-400 ml-1">{displayUnit}</span>` (~L291–292)**

First update the destructure above this cell (find `const { qty: currentQty, unit: displayUnit } = getCurrentQty(sub);`):
```js
// BEFORE:
                const { qty: currentQty, unit: displayUnit } = getCurrentQty(sub);

// AFTER:
                const { qty: currentQty, unit: displayUnit, text: displayQtyText } = getCurrentQty(sub); // BUG-455
```

Then append after the `{displayUnit}` span:
```jsx
// BEFORE:
                      <span className="text-sm font-semibold text-slate-700">{currentQty}</span>
                      <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>

// AFTER:
                      <span className="text-sm font-semibold text-slate-700">{currentQty}</span>
                      <span className="text-xs text-slate-400 ml-1">{displayUnit}</span>
                      {displayQtyText && displayQtyText !== `${currentQty} ${displayUnit}` && ( // BUG-455
                        <span className="text-xs text-slate-300 ml-1">({displayQtyText})</span>
                      )}
```

---

### E3 — `src/components/inventory/StockAuditPanel.jsx`

**E3a — book-stock cell L174–175**
```jsx
// BEFORE:
                      <span className="text-sm font-semibold text-slate-700">{item.displayQty || item.quantity}</span>
                      <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>

// AFTER:
                      <span className="text-sm font-semibold text-slate-700">{item.displayQty || item.quantity}</span>
                      <span className="text-xs text-slate-400 ml-1">{item.displayUnit || item.unit}</span>
                      {item.displayQtyText && item.displayQtyText !== `${item.displayQty} ${item.displayUnit}` && ( // BUG-455
                        <span className="text-xs text-slate-300 ml-1">({item.displayQtyText})</span>
                      )}
```

---

### E4 — `src/utils/purchasePlanner.js`

**E4a — planner rows L132–133 (the return object inside the main plan `map`)**
```js
// BEFORE:
        on_hand:          Number(onHand.toFixed(3)),
        display_on_hand:  Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240: prefer backend display_qty for UI

// AFTER:
        on_hand:          Number(onHand.toFixed(3)),
        display_on_hand:  Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240: prefer backend display_qty for UI
        display_qty_text: item.displayQtyText || '', // BUG-455
```

**E4b — alert rows L157–158 (the return object inside the `alertRows` map)**
```js
// BEFORE:
        on_hand: Number(onHand.toFixed(3)),
        display_on_hand: Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240

// AFTER:
        on_hand: Number(onHand.toFixed(3)),
        display_on_hand: Number(item.displayQty) || Number(onHand.toFixed(3)), // BUG-240
        display_qty_text: item.displayQtyText || '', // BUG-455
```

---

### E5 — `src/components/inventory/smart/AutoShoppingList.jsx`

Two on-hand cells render `{fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}`. Append the text after each.

**E5a — first table on-hand cell (~L192–194)**
```jsx
// BEFORE:
                      <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                        {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                      </td>

// AFTER:
                      <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                        {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                        {r.display_qty_text && <span className="text-xs text-slate-300 ml-1">({r.display_qty_text})</span>} {/* BUG-455 */}
                      </td>
```

**E5b — second table on-hand cell (~L304–307, same pattern)**
```jsx
// BEFORE:
                        <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                          {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                        </td>

// AFTER:
                        <td className="py-2 px-3 text-sm font-medium" style={{ color: onHandColor(r.on_hand, daysLeft) }}>
                          {fmtQty(r.display_on_hand ?? r.on_hand, r.display_unit || r.unit)}
                          {r.display_qty_text && <span className="text-xs text-slate-300 ml-1">({r.display_qty_text})</span>} {/* BUG-455 */}
                        </td>
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V1 | E0a/b: `displayQtyText` mapped | `grep displayQtyText inventoryTransform.js` → 2 hits | YES |
| V2 | E0: fallback `''` when field absent | Code review: `item.display_qty_text \|\| ''` | YES |
| V3 | E1a: mixed-unit item shows "(1 kg 640 gm)" alongside "1.64 kg" | Browser: Current Stock → multi-unit item | NO |
| V4 | E1a: guard hides text when same as plain value | Browser: "5 gm" item → no parenthetical | NO |
| V5 | E1b: Excel export has "Stock (text)" column | Download Excel → open → verify column | NO |
| V6 | E1c: PDF export has extra column | Download PDF → verify column | NO |
| V7 | E2b: Sub-Recipe Stock shows text | Browser: Stock Update → Sub-Recipe tab | NO |
| V8 | E3a: Stock Audit book-stock shows text | Browser: Operations → Stock Audit | NO |
| V9 | E4a/b: planner row has `display_qty_text` | `grep display_qty_text purchasePlanner.js` → 2 hits | YES |
| V10 | E5a/b: Shopping list on-hand shows text | Browser: Stock Update → shopping list row | NO |
| V11 | No API payload change | `grep displayQtyText src/api/transforms/inventoryTransform.js toAPI` → 0 hits | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-455 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 6 files listed with BUG-455 + date
- [ ] Code markers: // BUG-455 on every modified line (at least one per file)
- [ ] Compile: yarn build exit 0, 0 new warnings
```
