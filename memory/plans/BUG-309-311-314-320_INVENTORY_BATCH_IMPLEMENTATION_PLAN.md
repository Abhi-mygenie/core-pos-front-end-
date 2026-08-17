# Implementation Plan — Inventory Batch: BUG-309, BUG-310, BUG-311, BUG-314, BUG-320

**Gate:** 3 — Implementation Plan  
**Date:** 2026-08-13  
**Role:** PLANNING  
**Sprint:** pos_5_1  
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Owner Decisions Locked

| # | Decision | Answer |
|---|---|---|
| BUG-310 | Option A or B for styling? | **Option A** — subtle bg-slate-50/50, 1 line |
| BUG-311 | Layer 1 (typeahead) ship now or defer? | **Defer** — Layers 2+3 only this sprint |
| BUG-311 | Duplicate scope: global or per-category? | **Global** — across all categories |
| BUG-320 | Remove physical_qty? | **Yes, remove** — belongs to Stock Audit (ingredients), not sub-recipe produced-qty |
| BUG-314 | Backend fix live on preprod? | **Yes, fixed** — get-inventory-master now returns 200+[] |

---

## Pre-Plan Entry Verification (ALL PASS)

| Edit | File | IA Claim | Verified? |
|---|---|---|---|
| 1 | `IngredientBulkEditor.jsx:191` | `if (r._isNew) { await inventoryService.addIngredient(r);` | ✅ PASS |
| 2 | `IngredientBulkEditor.jsx:287` | `numCls` returns `border-transparent bg-transparent` | ✅ PASS |
| 3 | `IngredientBulkEditor.jsx:430` | `<input type="number" ... value={row.minUnitAlert}>` | ✅ PASS |
| 4 | `InventorySetupPanel.jsx:42` | `Promise.all([getIngredients, getCategories, getUnits])` | ✅ PASS |
| 5 | `InventorySetupPanel.jsx:136` | `addIngredient()` — no duplicate check before API call | ✅ PASS |
| 6 | `SubRecipeStockPanel.jsx:94` | `physicalQty: Number(entry.qty),` | ✅ PASS |
| 7 | `inventoryTransform.js:232` | `physical_qty: data.physicalQty ?? 0,` | ✅ PASS |

---

## Scope Lock

| File | Bugs | Edits | Touch? |
|---|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | BUG-309, BUG-310, BUG-311 L3 | 3 | ✅ YES |
| `components/inventory/InventorySetupPanel.jsx` | BUG-314, BUG-311 L2 | 2 | ✅ YES |
| `components/inventory/SubRecipeStockPanel.jsx` | BUG-320 | 1 | ✅ YES |
| `api/transforms/inventoryTransform.js` | BUG-320 | 1 | ✅ YES |
| All other files | — | 0 | ❌ NO |

**New files:** NONE  
**Total:** 4 files · 7 edits · ~30 lines net

---

## Execution Order

Group by file to minimise context-switching. Within `IngredientBulkEditor.jsx`, order by ascending line number.

```
FILE 1: IngredientBulkEditor.jsx  (3 edits)
  Edit 1 — BUG-311 L3  L191  handleSave dup skip
  Edit 2 — BUG-310     L287  numCls Option A styling
  Edit 3 — BUG-309     L430  minUnit input → span

FILE 2: InventorySetupPanel.jsx   (2 edits)
  Edit 4 — BUG-314     L42   Promise.allSettled
  Edit 5 — BUG-311 L2  L138  addIngredient dup guard

FILE 3: SubRecipeStockPanel.jsx   (1 edit)
  Edit 6 — BUG-320-A   L94   remove physicalQty

FILE 4: inventoryTransform.js     (1 edit)
  Edit 7 — BUG-320-B   L232  remove physical_qty

→ Compile check after all 7 edits
→ Self-test V1–V9
→ EXIT GATE (5 checkboxes)
```

---

## Edit 1 — BUG-311 Layer 3: Duplicate skip in `handleSave()` new-row path

**File:** `src/components/inventory/IngredientBulkEditor.jsx`  
**Lines:** 191–192 (inside the `for (const r of dirty)` loop, inside the `try` block)

**Current:**
```js
        if (r._isNew) {
          await inventoryService.addIngredient(r);
        } else {
```

**New:**
```js
        if (r._isNew) {
          // BUG-311: Layer 3 — global duplicate guard for new bulk-edit rows
          const dupName = (r.name || '').trim().toLowerCase();
          const dup = allItems.some(i => (i.name || '').trim().toLowerCase() === dupName);
          if (dup) {
            setRows(prev => prev.map(x => x._key === r._key
              ? { ...x, _saving: false, _saveError: `"${r.name}" already exists` }
              : x));
            fail++;
            continue;
          }
          await inventoryService.addIngredient(r);
        } else {
```

**Why it works:**
- `allItems` is already a prop of `IngredientBulkEditor` (confirmed at component signature) — no new data fetch needed
- `_saving: false + _saveError` resets the saving spinner (set to true before the try block) and shows the red ✗ badge
- `continue` skips to next row in the `for...of` loop — valid inside `try` block
- Existing rows (edits, not new) are unaffected — the guard is inside `if (r._isNew)`

---

## Edit 2 — BUG-310: numCls Option A — visible styling on clean inputs

**File:** `src/components/inventory/IngredientBulkEditor.jsx`  
**Lines:** 287–288 (inside `numCls` function, the `dirty=false` branch)

**Current:**
```js
  const numCls = (dirty) => `h-8 w-full text-xs border rounded-md px-2 outline-none text-center transition-colors ${
    dirty ? 'border-amber-300 bg-white focus:border-amber-500' : 'border-transparent bg-transparent hover:border-slate-200 focus:border-orange-400'
  }`;
```

**New:**
```js
  // BUG-310: Option A — subtle visible background on clean inputs (was fully transparent)
  const numCls = (dirty) => `h-8 w-full text-xs border rounded-md px-2 outline-none text-center transition-colors ${
    dirty ? 'border-amber-300 bg-white focus:border-amber-500' : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 focus:border-orange-400'
  }`;
```

**What changes:** `border-transparent bg-transparent` → `border-slate-100 bg-slate-50/50`. Adds faint visible border + background to conversion factor and minQtyAlert inputs when unchanged. Dirty (edited) state is untouched — still amber.

**Scope of numCls:** Used for `conversionFactor` and `minQtyAlert` columns. `minUnitAlert` column is removed by Edit 3 (BUG-309) and replaced by a span — no longer uses `numCls`.

---

## Edit 3 — BUG-309: Min Unit input → read-only span

**File:** `src/components/inventory/IngredientBulkEditor.jsx`  
**Lines:** 430–433 (Min Unit table cell content)

**Current:**
```jsx
                      <td className={`${cellCls} text-center`}>
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.minUnitAlert) !== String(row._originalMinUnit))}
                          value={row.minUnitAlert} onChange={e => updateRow(row._key, 'minUnitAlert', e.target.value)}
                          placeholder="—" data-testid={`bulk-minunit-${row._key}`} />
                      </td>
```

**New:**
```jsx
                      <td className={`${cellCls} text-center`}>
                        {/* BUG-309: minUnitAlert is a unit string — read-only, locked to smallUnit (matches card view BUG-269-C) */}
                        <span className="text-xs text-slate-500 select-none" data-testid={`bulk-minunit-${row._key}`}>
                          {row.minUnitAlert || row.smallUnit || row.unit || '—'}
                        </span>
                      </td>
```

**Why the span value:** `row.minUnitAlert` holds the stored unit string ("gm"). If empty (new row, no unit set yet), falls back to `row.smallUnit`, then `row.unit`, then `'—'`. This matches the card view read-only pattern exactly (BUG-269-C in `InventorySetupPanel.jsx`).

**Impact on save path:** `row.minUnitAlert` is never modified by user interaction → `isDirty` minUnit check always returns false for existing rows → `min_unit_alert` sent back unchanged on save → no data loss.

**Note:** `data-testid={`bulk-minunit-${row._key}`}` is kept on the span so existing tests continue to locate the element.

---

## Edit 4 — BUG-314: Promise.allSettled in `fetchData()`

**File:** `src/components/inventory/InventorySetupPanel.jsx`  
**Lines:** 42–51 (inside `fetchData()` try block)

**Context:** Backend has already fixed `get-inventory-master` to return 200+[]. The FE change ships as a defensive layer that gracefully handles any individual API failure.

**Current:**
```js
    try {
      const [ings, cats, unitList] = await Promise.all([
        inventoryService.getIngredients(),
        inventoryService.getCategories(),
        inventoryService.getUnits(),
      ]);
      setIngredients(ings);
      setCategories(cats);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (err) {
      toast.error('Failed to load ingredients');
    }
```

**New:**
```js
    try {
      // BUG-314: Promise.allSettled — categories+units load even if getIngredients fails
      const [ingsResult, catsResult, unitsResult] = await Promise.allSettled([
        inventoryService.getIngredients(),
        inventoryService.getCategories(),
        inventoryService.getUnits(),
      ]);
      const ings     = ingsResult.status  === 'fulfilled' ? ingsResult.value  : [];
      const cats     = catsResult.status  === 'fulfilled' ? catsResult.value  : [];
      const unitList = unitsResult.status === 'fulfilled' ? unitsResult.value : [];
      if (ingsResult.status === 'rejected') toast.error('Could not load ingredients list');
      setIngredients(ings);
      setCategories(cats);
      setUnits(Array.isArray(unitList) ? unitList : []);
    } catch (err) {
      toast.error('Failed to load inventory data');
    }
```

---

## Edit 5 — BUG-311 Layer 2: isDuplicate guard in `addIngredient()`

**File:** `src/components/inventory/InventorySetupPanel.jsx`  
**Lines:** 138–141 (after required-fields check, before try block)

**Current:**
```js
  const addIngredient = async () => {
    if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }
    try {
      await inventoryService.addIngredient(newIng);
```

**New:**
```js
  const addIngredient = async () => {
    if (!newIng.name.trim() || !newIng.categoryId || !newIng.unit) {
      toast.error('Name, category, and unit are required');
      return;
    }
    // BUG-311: Layer 2 — global duplicate guard (case-insensitive, across all categories)
    const dupName = newIng.name.trim().toLowerCase();
    if (ingredients.some(i => i.name.trim().toLowerCase() === dupName)) {
      toast.error(`"${newIng.name.trim()}" already exists`);
      return;
    }
    try {
      await inventoryService.addIngredient(newIng);
```

**`ingredients`** is already in scope — it's the component state initialized at line 21 and populated by `fetchData()`. No new data fetch required.

**Reference pattern:** Mirrors the category duplicate guard already at `InventorySetupPanel.jsx:84–87` (BUG-220) — same pattern, same file, same component.

---

## Edit 6 — BUG-320-A: Remove physicalQty from `handleSave()` call

**File:** `src/components/inventory/SubRecipeStockPanel.jsx`  
**Line:** 94 (inside `addSubRecipeStock` call object)

**Current:**
```js
        await inventoryService.addSubRecipeStock(sub.id, {
          quantity: Number(entry.qty),
          unit,
          physicalQty: Number(entry.qty), // V4: physicalQty always equals quantity entered
          reason: reasonLabel,
```

**New:**
```js
        await inventoryService.addSubRecipeStock(sub.id, {
          quantity: Number(entry.qty),
          unit,
          // BUG-320: physicalQty removed — physical_qty belongs to Stock Audit (ingredients), not sub-recipe produced-qty
          reason: reasonLabel,
```

---

## Edit 7 — BUG-320-B: Remove physical_qty from `addSubRecipeStock()` transform

**File:** `src/api/transforms/inventoryTransform.js`  
**Lines:** 227–236 (`addSubRecipeStock` function)

**Current:**
```js
  addSubRecipeStock(data) {
    return {
      sub_recipe_id: data.subRecipeId,
      quantity: data.quantity,
      unit: data.unit || '',
      physical_qty: data.physicalQty ?? 0,
      waste_reason: data.reason || '',
      ...(data.batch ? { batch: data.batch } : {}),
      ...(data.expiry ? { expiry_date: data.expiry } : {}),
    };
  },
```

**New:**
```js
  // BUG-320: physical_qty removed — belongs to Stock Audit (ingredients), not sub-recipe produced-qty recording
  addSubRecipeStock(data) {
    return {
      sub_recipe_id: data.subRecipeId,
      quantity: data.quantity,
      unit: data.unit || '',
      waste_reason: data.reason || '',
      ...(data.batch ? { batch: data.batch } : {}),
      ...(data.expiry ? { expiry_date: data.expiry } : {}),
    };
  },
```

**DO NOT TOUCH** `inventoryTransform.js:72` (`fromAPI.ingredients()` — reads `physical_qty` from the backend response for ingredient display. This is a separate READ path and is correct.)

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|---|---|---|
| R1 | `continue` inside `try` in `handleSave()` — skips `_saveOk` and leaves row in interim state | LOW | `_saving: false + _saveError` set before `continue` — row correctly shows ✗ badge |
| R2 | `allItems` prop stale when bulk editor is open | VERY LOW | `allItems` refreshed on every `onRefresh()` call; BUG-277 stable ID guard already handles this |
| R3 | numCls change affects `minQtyAlert` column styling too | NONE — intentional | Both columns benefit from visible styling. No functional change. |
| R4 | Backend uses `physical_qty` from sub-recipe endpoint | NONE | Owner confirmed: `physical_qty` belongs to Stock Audit only |
| R5 | BUG-314 — `Promise.allSettled` throws | VERY LOW — ES2020 built-in | Outer `catch` retained as safety net |

---

## Verification Matrix

| # | Edit | Bug | How to Verify | Method |
|---|---|---|---|---|
| V1 | Edit 1 | BUG-311 L3 | Bulk editor → add new row with existing ingredient name → Save → row shows red ✗ badge "already exists" | Browser |
| V2 | Edit 1 | BUG-311 L3 | Bulk editor → add new row with unique name → saves normally | Browser |
| V3 | Edit 2 | BUG-310 | Open bulk edit → Conversion column shows faint slate background on clean unchanged rows | Browser |
| V4 | Edit 2 | BUG-310 | Edit conversion value → column turns amber | Browser |
| V5 | Edit 3 | BUG-309 | Bulk edit → existing ingredient with "gm" min unit → Min Unit column shows "gm" span (not "—") | Browser |
| V6 | Edit 3 | BUG-309 | Save without editing → Network → `min_unit_alert` = "gm" not "" | DevTools |
| V7 | Edit 4 | BUG-314 | Login as owner@thegoankitchen.com → `/inventory-setup` → Category "body parts" appears in sidebar | Browser |
| V8 | Edit 4 | BUG-314 | `/inventory-setup` → "+ Add Ingredient" → Base Unit dropdown shows units | Browser |
| V9 | Edit 5 | BUG-311 L2 | Card view add form → type existing ingredient name → click Add → toast "already exists" | Browser |
| V10 | Edit 5 | BUG-311 L2 | Unique name → adds successfully | Browser |
| V11 | Edit 6+7 | BUG-320 | `/inventory-sub-recipe-stock` → adjust qty → Save → Network POST body has NO `physical_qty` key | DevTools |
| V12 | Edit 6+7 | BUG-320 | Adjustment saves successfully (HTTP 200) | Browser |
| V13 | Regression | — | Stock Audit tab: ingredient stock update still sends `physical_qty` (unchanged path) | DevTools |
| V14 | Regression | — | `inventoryTransform.js:72` fromAPI still maps `physical_qty` from GET response | Grep |

---

## Post-Code Registry Checklist

```
□ 1. REGISTRY SYNC — run after all edits:
     python3 -c "
     import json
     d = json.load(open('/app/memory/control/registry.json'))
     items = {i['id']: i for i in d['items']}
     for bid in ['BUG-309','BUG-310','BUG-311','BUG-314','BUG-320']:
         assert 'IMPLEMENTED' in items[bid].get('status',''), f'{bid} not IMPLEMENTED'
     print('Registry sync PASS')
     "

□ 2. BUG_TRACKER.md — update rows for all 5 bugs → IMPLEMENTED

□ 3. FILE_OWNERSHIP.md — add entries:
     | IngredientBulkEditor.jsx | BUG-311 L3: dup skip in handleSave (L191). BUG-310: numCls Option A (L287). BUG-309: minUnit input→span (L430). |
     | InventorySetupPanel.jsx  | BUG-314: Promise.allSettled in fetchData (L42). BUG-311 L2: dup guard in addIngredient (L138). |
     | SubRecipeStockPanel.jsx  | BUG-320-A: removed physicalQty from addSubRecipeStock call (L94). |
     | inventoryTransform.js    | BUG-320-B: removed physical_qty from toAPI.addSubRecipeStock (L232). |

□ 4. CODE MARKERS — every modified block must have // BUG-XXX: comment

□ 5. COMPILE CHECK — webpack compiled with 0 new warnings
```

---

## QA Handover Seeds

**Test account:** `owner@thegoankitchen.com` / `***`  
**App URL:** https://pos-frontend-deploy-28.preview.emergentagent.com

| Page | Tests |
|---|---|
| `/inventory-setup` | V7, V8 (BUG-314), V9, V10 (BUG-311 L2) |
| `/inventory-setup` → Bulk Edit | V1, V2 (BUG-311 L3), V3, V4 (BUG-310), V5, V6 (BUG-309) |
| `/inventory-sub-recipe-stock` | V11, V12 (BUG-320) |
| Stock Audit tab | V13 (regression) |
