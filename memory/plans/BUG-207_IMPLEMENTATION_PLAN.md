# BUG-207 Implementation Plan — Recipe Cost/Margin via Purchase Rate Cross-Join

**ID:** BUG-207
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-19
**Risk:** MEDIUM
**Depends on:** Impact Analysis `impact/BUG-206_BUG-207_CR-073-FU-01_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change (1):**
1. `components/inventory/RecipeBulkEditor.jsx` — 4 edits, ~20 lines net add

**Files will NOT touch:**
- `inventoryService.js` — `getVendorItemList()` already exists (CR-078)
- `recipeService.js`, `recipeTransform.js`, `inventoryTransform.js`
- `RecipeFormPanel.jsx`, `RecipeManagementPanel.jsx`

---

## Owner Rulings (locked 2026-07-19)

- Cost source: **(a) Last purchase rate** from `vendor-item-list`
- If ANY ingredient in a recipe has no rate → show **"—"** for that recipe's cost AND margin
- No partial/approximate cost
- Ship now, no backend wait

---

## Execution Sequence

### Edit 1 — Add `purchaseRates` state + load in master useEffect (L67, L88-101)

**Current (L67):**
```js
const [foodsMaster, setFoodsMaster] = useState([]);
```

**Add after L67:**
```js
const [purchaseRates, setPurchaseRates] = useState(new Map()); // BUG-207: ingredient_id → last purchase unit_price
```

**Current (L88-101):** Master load useEffect loads `getIngredients()` + `getFoodsList()`.

**Change to also load `getVendorItemList()`:**
```js
useEffect(() => {
  (async () => {
    try {
      const [ings, foods, purchases] = await Promise.all([
        inventoryService.getIngredients(),
        menuManagementService.getFoodsList().then(res => res?.data?.foods || res?.foods || res || []).catch(() => []),
        inventoryService.getVendorItemList().catch(() => []),  // BUG-207
      ]);
      setIngredientsMaster(ings || []);
      setFoodsMaster(Array.isArray(foods) ? foods : []);
      // BUG-207: build last-purchase-rate map (ingredient_id → latest non-zero unit_price)
      const rateMap = new Map();
      (purchases || []).forEach(p => {
        const id = p.ingredient_id;
        const price = Number(p.unit_price);
        const date = p.Purchase_Date || '';
        if (id && price > 0) {
          const existing = rateMap.get(id);
          if (!existing || date > existing.date) rateMap.set(id, { price, date });
        }
      });
      setPurchaseRates(rateMap);
    } catch {
      toast.error('Failed to load ingredient master');
    }
  })();
}, []);
```

### Edit 2 — Update `costMarginFor()` to use purchaseRates (L114-123)

**Current:**
```js
const costMarginFor = useCallback((row) => {
  const cost = (row.ingredients || []).reduce((sum, ing) => sum + (Number(ing.cost) || 0) * (Number(ing.quantity) || 0), 0);
  const nm = (row.name || '').toLowerCase().trim();
  const price = priceByName.get(nm) || 0;
  const serves = Number(row.servePeople) || 1;
  const costPerServe = cost / (serves || 1);
  const margin = price > 0 ? ((price - costPerServe) / price) * 100 : null;
  return { cost, margin };
}, [priceByName]);
```

**New:**
```js
const costMarginFor = useCallback((row) => {
  // BUG-207: use last purchase rate from vendor-item-list for ingredient cost
  const ings = row.ingredients || [];
  let totalCost = 0;
  let allHaveRates = true;
  for (const ing of ings) {
    const ingId = Number(ing.ingredientId || ing.id);
    const qty = Number(ing.quantity) || 0;
    const rateEntry = purchaseRates.get(ingId);
    if (rateEntry) {
      totalCost += rateEntry.price * qty;
    } else if (qty > 0) {
      allHaveRates = false; // owner ruling: if ANY ingredient has no rate → show "—"
    }
  }
  if (!allHaveRates || ings.length === 0) return { cost: null, margin: null };
  const nm = (row.name || '').toLowerCase().trim();
  const price = priceByName.get(nm) || 0;
  const serves = Number(row.servePeople) || 1;
  const costPerServe = totalCost / (serves || 1);
  const margin = price > 0 ? ((price - costPerServe) / price) * 100 : null;
  return { cost: totalCost, margin };
}, [priceByName, purchaseRates]);
```

### Edit 3 — Update cost render in RecipeRow (L483)

**Current:**
```jsx
<td className="p-2 text-right text-sm text-slate-600 font-medium">₹{cost.toFixed(0)}</td>
```

**New:**
```jsx
<td className="p-2 text-right text-sm text-slate-600 font-medium">{cost != null ? `₹${cost.toFixed(0)}` : '—'}</td>
```

---

## Verification Matrix

| # | What | How to Verify | Automated? |
|---|------|---------------|:---:|
| 1 | `vendor-item-list` loaded on mount | Network tab: GET vendor-item-list → 200 | NO |
| 2 | Recipes with ALL ingredients covered show real cost | Browser: find recipe with known cost (e.g. "50-50 Aam -E -Bahar" = ~₹22) | NO |
| 3 | Recipes with ANY uncovered ingredient show "—" | Browser: find recipe using an uncovered ingredient (e.g. "Dark Chocolate") → cost = "—" | NO |
| 4 | Margin shows real % for costed recipes | Browser: recipe with cost + menu price → margin % with color band | NO |
| 5 | Margin shows "—" for uncosted recipes | Browser: recipe with "—" cost → margin = "—" | NO |
| 6 | No ₹0 cost displayed anywhere | Browser: scroll through grid, confirm no "₹0" in cost column | NO |
| 7 | Compile check | webpack 0 new warnings | YES |
| 8 | Save still works (no regression from BUG-206) | Edit prep → Save → 200 OK | NO |

---

## Post-Code Registry Checklist

- [ ] registry.json: BUG-207 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: RecipeBulkEditor.jsx + BUG-207 entry
- [ ] Code markers: `// BUG-207` in RecipeBulkEditor.jsx

---

## Estimation

- Lines changed: ~20 net add (1 state, 1 API call added to existing Promise.all, ~10 lines in costMarginFor, 1 render line)
- Complexity: LOW (data lookup + conditional display)
- No new API endpoints, no new transforms, no new routes

---

**Next:** Owner Gate 4 GO → BUG FIX role → Implementation
