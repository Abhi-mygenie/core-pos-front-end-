# CR-139 — Impact Analysis (Gate 2)
**Item:** CR-139 + BUG-312 + BUG-313 (bundle)  
**Date:** 2026-08-13  
**Role:** PLANNING — Gate 2  
**Status:** COMPLETE — Awaiting owner mockup approval → Gate 3

---

## Code Reality: NONE (all 3 phases require new code)
## Conflict Pre-Check: CLEAN — no active open items on any of the 9 target files
## Duplicate Check: DISTINCT

---

## BUG-308 Dependency Analysis

**BUG-308 (IMPLEMENTED) is INDEPENDENT of CR-139.**

`StockAuditPanel.jsx` calls `getStockInventory()` → `fromAPI.stockItems()`.  
`fromAPI.stockItems()` already maps `isSubRecipe` (line 74) and `subrecipeId` (line 75).  
Phase A (fixing `fromAPI.ingredients()`) affects ONLY `getIngredients()` consumers — NOT `StockAuditPanel`.

**Remaining BUG-308 sub-gap (G4):**  
The condition `item?.isSubRecipe && item?.subrecipeId` requires `subrecipeId != null`.  
If the backend returns `subrecipe_id: null` on a stock item, the call falls back to `addStock()`.  
This is a **backend data quality dependency** — if `subrecipe_id` is null, the frontend has no ID to pass to `add-sub-recipe-stock`. Not resolvable purely in FE.  
**Recommendation:** Flag to backend team that `subrecipe_id` must be populated for all sub-recipe stock items in `stock-inventory` response. Add a backend brief if confirmed missing.

---

## Data Flow Trace

### Phase A: fromAPI.ingredients() — missing fields (BUG-312)

```
GET /inventory/get-inventory-master
→ fromAPI.ingredients() [CURRENT — 29 fields, missing isSubRecipe + subrecipeId]
→ getIngredients() consumers:
    ├── PurchaseEntryPanel.jsx:31 → dropdown lists sub-recipes alongside ingredients ❌
    ├── SmartPurchasePanel.jsx:45 → ingredientsMaster passed to AdHocTypeahead ❌
    └── AdHocTypeahead (AutoShoppingList.jsx:14) → no filter possible ❌

AFTER Phase A fix (+2 lines):
→ fromAPI.ingredients() returns isSubRecipe + subrecipeId on each item ✅
→ All downstream consumers can now detect and exclude sub-recipe items
```

### Phase B: Purchase Flow Guards (BUG-313)

```
B1 — purchasePlanner.js
  CURRENT: G9 filter: item?.isSubRecipe !== true (stock-inventory flag, unreliable)
  FIX: Add secondary guard using stockItems' subrecipeId as hard fallback

B2 — AutoShoppingList.jsx (AdHocTypeahead)
  CURRENT: ingredientsMaster.filter(name match only) — depends on Phase A
  FIX (after Phase A): add && !i.isSubRecipe to filter

B3 — SmartPurchasePanel.handleSubmit()
  CURRENT: addPurchase() called for ALL rows unconditionally
  FIX: Exclude rows where isSubRecipe:true from addPurchase() items array
       (these should only be updated from Sub-Recipe Stock tab, not here)

B4 — PurchaseEntryPanel.jsx dropdown
  CURRENT: ingredients.map(all) — depends on Phase A
  FIX (after Phase A): ingredients.filter(i => !i.isSubRecipe).map(...)
```

### Phase C: New Sub-Recipe Stock Tab

```
Data source decision:
  getSubRecipes() → fromAPI.subRecipes() returns:
    id         = sub_recipe_id (what add-sub-recipe-stock needs) ✅
    name       = sub-recipe name ✅
    currentStock / calQuantity = current stock level ✅
    unit / stockUnit = unit ✅
  
  → NO need for getStockInventory() cross-reference.
    getSubRecipes() is the single data source.

Fetch: [getSubRecipes(), getWastageReasons()]
Submit: addSubRecipeStock(item.id, { quantity, unit, physicalQty, reason, batch?, expiry? })

UX pattern: same as StockAuditPanel
  - Table: Sub-Recipe | Current Qty | New Qty (input) | Unit | Drift | Wastage Reason* | Batch | Expiry
  - Wastage reason: show + REQUIRED when newQty < currentStock
  - Batch/Expiry: always visible, optional
  - Save button: disabled until ≥1 qty entered
```

---

## Risk Classification

| Phase | Files | Risk | Hotspot? | Financial? |
|---|---|---|---|---|
| A | `inventoryTransform.js` (+2 lines) | LOW | NO | NO |
| B1 | `purchasePlanner.js` (+3 lines) | LOW | NO | NO |
| B2 | `AutoShoppingList.jsx` (+1 line) | LOW | NO | NO |
| B3 | `SmartPurchasePanel.jsx` (+8 lines) | MEDIUM | NO | NO |
| B4 | `PurchaseEntryPanel.jsx` (+1 line) | LOW | NO | NO |
| C1 | `InventoryTabBar.jsx` (+3 lines) | LOW | NO | NO |
| C2 | `SubRecipeStockPanel.jsx` (NEW ~180 lines) | MEDIUM | NO | NO |
| C3 | `SubRecipeStockPage.jsx` (NEW ~25 lines) | LOW | NO | NO |
| C4 | `App.js` (+3 lines) | LOW | NO | NO |

**Overall bundle risk: MEDIUM** — no hotspot files, no financial logic, new isolated UI component.

---

## Affected Files (complete list)

### WILL change:
1. `src/api/transforms/inventoryTransform.js` — Phase A (+2 lines in fromAPI.ingredients)
2. `src/utils/purchasePlanner.js` — Phase B1 (strengthen G9 filter)
3. `src/components/inventory/smart/AutoShoppingList.jsx` — Phase B2 (+isSubRecipe filter)
4. `src/components/inventory/SmartPurchasePanel.jsx` — Phase B3 (exclude sub-recipes from submit)
5. `src/components/inventory/PurchaseEntryPanel.jsx` — Phase B4 (filter dropdown)
6. `src/components/inventory/InventoryTabBar.jsx` — Phase C1 (add tab entry)
7. `src/components/inventory/SubRecipeStockPanel.jsx` — **NEW** Phase C2
8. `src/pages/SubRecipeStockPage.jsx` — **NEW** Phase C3
9. `src/App.js` — Phase C4 (+import + route)

### WILL NOT touch:
- `StockAuditPanel.jsx` — BUG-308 already IMPLEMENTED, independent
- `CurrentStockPanel.jsx` — read-only view, no change needed
- `InventorySetupPanel.jsx` — setup tabs, unrelated
- `RecipeManagementPanel.jsx` — recipe CRUD, unrelated
- Any order-taking, billing, or reporting files

---

## Downstream Consumer Verification (after Phase A)

After adding `isSubRecipe` to `fromAPI.ingredients()`, verify no existing consumer BREAKS:
- `PurchaseEntryPanel.jsx` — uses `.unit`, `.name`, `.id` only → safe ✅
- `SmartPurchasePanel.jsx ingredientsMaster` — passes to AdHocTypeahead → gains filter → safe ✅
- Any other `getIngredients()` consumer? → None found via grep ✅

---

## Owner Decisions Already Locked (all resolved at Intake)

| # | Decision | Answer |
|---|---|---|
| OD-1 | Tab position + name | After Stock Update → "Sub-Recipe Stock" |
| OD-2 | Content | Actual sub-recipe quantity (from getSubRecipes), no ingredients |
| OD-3 | Wastage reason | REQUIRED on negative drift |
| OD-4 | Batch/Expiry | OPTIONAL |
| OD-5 | UX pattern | Same as Stock Audit (table + inline inputs + Save All) |

---

## Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| A | inventoryTransform.js | +isSubRecipe, +subrecipeId in fromAPI.ingredients | getIngredients() response in Network tab shows these fields |
| B1 | purchasePlanner.js | Stronger G9 guard | Sub-recipe items not in auto-plan even when backend flag absent |
| B2 | AutoShoppingList.jsx | !i.isSubRecipe filter | Search sub-recipe name in "+ Add Item" → not found |
| B3 | SmartPurchasePanel | Sub-recipes excluded from addPurchase() items | Select sub-recipe row → submit → only addPurchase() for non-sub-recipes fires |
| B4 | PurchaseEntryPanel | Sub-recipes filtered from dropdown | Open Purchase Entry form → sub-recipe items not in dropdown |
| C1 | InventoryTabBar | "Sub-Recipe Stock" tab after Stock Update | Tab visible in nav bar in correct position |
| C2 | SubRecipeStockPanel | Table loads with sub-recipe items | Navigate to tab → sub-recipe list with current qty |
| C2 | Input + submit | Enter qty → addSubRecipeStock called | Network: POST /inventory/add-sub-recipe-stock with sub_recipe_id in body |
| C2 | Wastage required | newQty < currentStock → wastage dropdown appears and blocks save if empty | Enter lower qty → dropdown appears, Save blocked without reason |
| C2 | Batch/Expiry | Optional fields | Batch/Expiry inputs present, save works without them |
| C3+C4 | Page + route | Route loads | Navigate to /inventory-sub-recipe-stock → page renders |

---

## Mockup
See: `/app/frontend/public/cr139-subrecipe-stock-mockup.html`
