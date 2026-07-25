# CR-105 — Implementation Plan (Gate 3)

**ID:** CR-105
**Title:** Smart Purchase: Show All Ingredients + Manual Add to Purchase List
**Date:** 2026-07-25
**Risk:** LOW
**Impact Analysis:** `/app/memory/impact/CR-105_IMPACT_ANALYSIS.md`
**Owner Decisions:** All 3 OQs resolved. Sub-A: editable. Sub-B: master-list only. Both together.
**Mockup:** `__dev/cr105-mockup.html`

---

## Scope Lock

### Files WILL change:
| File | Change |
|------|--------|
| `utils/purchasePlanner.js` | +`showAll` param, +`inStockRows`, merge into return |
| `components/inventory/SmartPurchasePanel.jsx` | +`showAll` state, pass to computePlan, toggle UI in header |
| `components/inventory/smart/AutoShoppingList.jsx` | +`in_stock` rowBg/badge, uncomment Add Item button |

### Files will NOT touch:
- `VendorSuggestionCell.jsx`, `GroupedVendorPreview.jsx`, `HorizonPicker.jsx`
- `vendorRanking.js`, `inventoryService.js`, `inventoryTransform.js`
- Any other file

---

## Edits

### File 1: `utils/purchasePlanner.js`

#### Edit 1 — Add `showAll` parameter (L107)

**Current:**
```js
export function computePlan({ stockInventory, dcrStockSummary, horizonDays }) {
```
**New:**
```js
export function computePlan({ stockInventory, dcrStockSummary, horizonDays, showAll = false }) {
```

#### Edit 2 — Add inStockRows computation (after L141, before L143)

**Insert after line 141:**
```js
  // CR-105 Sub-A: When showAll=true, include in-stock items (gap >= 0)
  const inStockRows = showAll
    ? rows.filter(r => r.gap >= 0).map(r => ({ ...r, suggest_qty: 0, origin: 'in_stock' }))
    : [];
```

#### Edit 3 — Merge inStockRows into return (L168)

**Current:**
```js
  return [...velocityRows, ...alertRows];                        // BUG-224
```
**New:**
```js
  return [...velocityRows, ...alertRows, ...inStockRows];        // BUG-224 + CR-105
```

---

### File 2: `components/inventory/SmartPurchasePanel.jsx`

#### Edit 4 — Add showAll state (after L19)

**Insert after line 19:**
```js
  const [showAll, setShowAll] = useState(false); // CR-105 Sub-A
```

#### Edit 5 — Pass showAll to computePlan (L45-49)

**Current:**
```js
      const planned = computePlan({
        stockInventory: stock,
        dcrStockSummary: dcr?.stock_summary || [],
        horizonDays,
      });
```
**New:**
```js
      const planned = computePlan({
        stockInventory: stock,
        dcrStockSummary: dcr?.stock_summary || [],
        horizonDays,
        showAll, // CR-105 Sub-A
      });
```

#### Edit 6 — Add showAll to useCallback deps (L75)

**Current:** `}, [horizonDays]);`
**New:** `}, [horizonDays, showAll]); // CR-105`

#### Edit 7 — Add toggle + pass showAll to AutoShoppingList (L200 area + L233 area)

In the header section (near L200 `{loading ? 'Computing plan…' : ...}`), add toggle switch.

Pass `showAll` and `onToggleShowAll={() => setShowAll(p => !p)}` to AutoShoppingList.

---

### File 3: `components/inventory/smart/AutoShoppingList.jsx`

#### Edit 8 — Add `in_stock` case to rowBg (L72-79)

**Insert after L73 (`if (row.origin === 'ad_hoc')`):**
```js
  if (row.origin === 'in_stock') return 'bg-green-50/30';
```

#### Edit 9 — Uncomment Add Item button (L106-110)

**Current (commented out):**
```js
        {/* BUG-247: Ad-hoc disabled — typeahead causes runtime error, needs deeper fix */}
        {/* <button type="button" onClick={() => setShowTypeahead(true)}
          className="text-xs font-semibold text-orange-600 hover:underline" data-testid="add-adhoc-header">
          + Add Ad-hoc Item
        </button> */}
```
**New:**
```js
        {/* CR-105 Sub-B: Add Item from master list */}
        <button type="button" onClick={() => setShowTypeahead(true)}
          className="text-xs font-semibold text-orange-600 hover:underline border border-dashed border-orange-300 px-2 py-1 rounded" data-testid="add-item-btn">
          + Add Item
        </button>
```

#### Edit 10 — Add `in_stock` badge (after L159)

**Insert after the stock_alert badge block (L159):**
```js
                    {r.origin === 'in_stock' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">In stock</span>}
```

#### Edit 11 — Accept showAll prop + add toggle UI in section header

Add `showAll` and `onToggleShowAll` to component props (L81).
Add toggle switch in section header (L96-111 area):
```jsx
<div className="flex items-center gap-2">
  <span className="text-xs font-medium text-slate-500">Show all</span>
  <button onClick={onToggleShowAll} className={`w-8 h-4.5 rounded-full transition-colors ${showAll ? 'bg-green-500' : 'bg-slate-300'}`}>
    <span className={`block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${showAll ? 'translate-x-4' : 'translate-x-0.5'}`} />
  </button>
</div>
```

---

## Execution Sequence

1. Edit 1-3: `purchasePlanner.js` (showAll param + inStockRows + return)
2. Edit 4-7: `SmartPurchasePanel.jsx` (state + pass + deps + toggle)
3. Edit 8-11: `AutoShoppingList.jsx` (rowBg + uncomment button + badge + toggle UI)
4. Verify webpack compiles
5. Self-test
6. EXIT GATE

---

## Verification Matrix

| # | Check | Method | Auto? |
|---|-------|--------|:---:|
| V1 | `showAll` parameter in computePlan signature | grep | YES |
| V2 | `inStockRows` computed when showAll=true | grep | YES |
| V3 | Toggle switch renders in AutoShoppingList header | grep for `Show all` | YES |
| V4 | Add Item button uncommented and visible | grep for `add-item-btn` | YES |
| V5 | `in_stock` badge and rowBg exist | grep | YES |
| V6 | Webpack compiles, 0 new warnings | log | YES |
| V7 | Toggle ON: all ingredients visible (in-stock green tint) | Browser | NO |
| V8 | Toggle OFF: only deficit + low-stock items (B2 preserved) | Browser | NO |
| V9 | Add Item: pick from dropdown → blue ad-hoc row appears | Browser | NO |

---

## Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: CR-105 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: 3 files listed under CR-105
- [ ] Code markers: // CR-105 in all 3 files
- [ ] Compile check: webpack 0 new warnings
```

---

## Next

Awaiting **Gate 4 GO** from owner to implement.
