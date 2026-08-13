# CR-139 — Sub-Recipe Stock: Dedicated Tab (absorbs BUG-312 + BUG-313)
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (investigation session + owner decisions locked 2026-08-13)  
**Sprint:** POS 5.0  
**Status:** INTAKE COMPLETE — READY FOR GATE 2 (Planning)  
**Absorbs:** BUG-312, BUG-313

---

## Classification
- **Type:** CR  
- **Severity:** P1  
- **Risk:** HIGH (new tab + routing changes across 7 files)  
- **Area:** Inventory → Navigation + Sub-Recipe Stock Management  
- **Duplicate check:** DISTINCT

---

## Owner Problem Statement
Sub-recipe stock addition and update must be in a separate dedicated tab in the Inventory OPERATIONS group. Sub-recipes do NOT go for purchase. They need their own screen that calls `POST /inventory/add-sub-recipe-stock`. Sub-recipes currently appear in Stock Update (purchase flow) due to:
1. `fromAPI.ingredients()` missing `isSubRecipe`/`subrecipeId` fields (root cause — BUG-312)
2. G9 filter in `computePlan` is backend-dependent and unreliable
3. No routing guard in submit handlers (SmartPurchasePanel, PurchaseEntryPanel)

---

## Owner Decisions — ALL LOCKED 2026-08-13

| # | Question | Owner Answer |
|---|---|---|
| OD-1 | Tab position | **After Stock Update** — before Receive |
| OD-2 | Tab name | **"Sub-Recipe Stock"** |
| OD-3 | Show quantities? | **Yes — show actual sub-recipe stock quantity** (from `stock-inventory` filtered by `isSubRecipe: true`). No ingredients shown inside. |
| OD-4 | Wastage reason | **Required** (when negative drift / physical count < system qty) |
| OD-5 | Batch/Expiry fields | **Optional** |
| OD-6 | UX pattern | **Same as current Stock** (Stock Audit pattern — table of sub-recipe items with inline qty inputs, save all at once) |

---

## Scope — 3 Phases

### Phase A: BUG-312 — Foundation (inventoryTransform.js)
Add `isSubRecipe` + `subrecipeId` to `fromAPI.ingredients()`:
```js
isSubRecipe: !!item.is_sub_recipe,
subrecipeId: item.subrecipe_id || null,
```
- **File:** `src/api/transforms/inventoryTransform.js:8-31`
- **Lines:** +2
- **Prerequisite for:** Phase B + all downstream consumers (AdHocTypeahead, PurchaseEntryPanel)

### Phase B: BUG-313 — Block Sub-Recipes from Purchase Flow

**B1 — purchasePlanner.js (hard block, not just flag-dependent)**  
Add a secondary guard: even if `isSubRecipe` is false (backend flag absent), items identified as sub-recipes via `subrecipeId` should be excluded. OR: use `subrecipeId != null` as the filter key in addition to `isSubRecipe`.

**B2 — AutoShoppingList.jsx:14-19 — AdHocTypeahead filter**  
After Phase A lands: `ingredientsMaster.filter(i => !i.isSubRecipe && ...)`

**B3 — SmartPurchasePanel.jsx:194 — handleSubmit() routing**  
After Phase A: for rows where `isSubRecipe: true`, call `addSubRecipeStock()` OR exclude from `addPurchase()` items array (since sub-recipes should only be updated from the new tab, not from Stock Update).

**B4 — PurchaseEntryPanel.jsx:195 — Dropdown filter**  
After Phase A: exclude `isSubRecipe: true` items from ingredient dropdown. Add filter `ingredients.filter(i => !i.isSubRecipe)`.

### Phase C: CR-139 — Sub-Recipe Stock Tab (new UI)

**C1 — InventoryTabBar.jsx**  
Add to TABS array (after `smart-purchase`, before `receive`):
```js
{ id: 'sub-recipe-stock', label: 'Sub-Recipe Stock', path: '/inventory-sub-recipe-stock', group: 'OPERATIONS' }
```

**C2 — SubRecipeStockPanel.jsx (NEW)**  
UX pattern: same as `StockAuditPanel.jsx` (table of items, inline qty inputs, Save All button).

Data:
- Fetch: `getStockInventory()` → filter `item.isSubRecipe === true` → sub-recipe stock items
- Fetch: `getSubRecipes()` → for sub-recipe names/ids
- Fetch: `getWastageReasons()` → for required wastage reason on negative drift
- Submit: `addSubRecipeStock(item.subrecipeId, { quantity, unit, physicalQty, reason, batch?, expiry? })`

Columns:
| Sub-Recipe Name | Current Qty | Unit | New Qty (input) | Drift | Wastage Reason* | Batch (opt) | Expiry (opt) |

Rules:
- Wastage reason dropdown: REQUIRED (show when `newQty < currentQty`)
- Batch/Expiry: OPTIONAL — collapsible or always visible but not required
- "Save Adjustments" button: disabled until at least one qty entered
- Show "Sub-Recipe" purple badge on each row (consistent with CurrentStockPanel)

**C3 — SubRecipeStockPage.jsx (NEW)**  
Thin page wrapper with `InventoryTabBar active="sub-recipe-stock"` + `SubRecipeStockPanel`.

**C4 — App.js**  
Add route: `<Route path="/inventory-sub-recipe-stock" element={<SubRecipeStockPage />} />`

---

## Files Summary

| Phase | File | Change | Lines est. |
|---|---|---|---|
| A | `src/api/transforms/inventoryTransform.js` | +2 lines in `fromAPI.ingredients()` | +2 |
| B1 | `src/utils/purchasePlanner.js` | Strengthen G9 filter (+ subrecipeId check) | +3 |
| B2 | `src/components/inventory/smart/AutoShoppingList.jsx` | +`&& !i.isSubRecipe` in filtered | +1 |
| B3 | `src/components/inventory/SmartPurchasePanel.jsx` | Exclude sub-recipe rows from addPurchase items | +5 |
| B4 | `src/components/inventory/PurchaseEntryPanel.jsx` | Filter sub-recipe items from dropdown | +2 |
| C1 | `src/components/inventory/InventoryTabBar.jsx` | Add tab entry | +3 |
| C2 | `src/components/inventory/SubRecipeStockPanel.jsx` | **NEW component** | ~200 |
| C3 | `src/pages/SubRecipeStockPage.jsx` | **NEW page** | ~20 |
| C4 | `src/App.js` | Add route | +3 |

**Total: 9 files (~240 lines), 2 new files**

---

## Blast Radius
- Hotspot files: NONE (no R5 files touched)
- Financial logic: NO
- Socket/Auth: NO
- Estimated scope: LARGE (9 files, new route + component)

---

## Verification Matrix (for Implementation agent)
| Edit | File | How to Verify |
|---|---|---|
| A | inventoryTransform.js | `getIngredients()` response includes `isSubRecipe` + `subrecipeId` |
| B2 | AutoShoppingList.jsx | Search "sub1" in AdHoc typeahead → not found |
| B3 | SmartPurchasePanel.jsx | Sub-recipe item in plan → excluded from `addPurchase()` call items |
| B4 | PurchaseEntryPanel.jsx | Sub-recipe not in dropdown |
| C1-C4 | New tab | Tab visible in nav after Stock Update, route loads, panel renders |
| C2 | SubRecipeStockPanel | Enter qty for sub-recipe → `addSubRecipeStock()` called, `addPurchase()` NOT called |
| C2 | Wastage | Qty less than current → wastage reason required, save blocked if empty |
| C2 | Optional fields | Batch/expiry present but not required |

---

## Scope Lock
**WILL change:** `inventoryTransform.js`, `purchasePlanner.js`, `AutoShoppingList.jsx`, `SmartPurchasePanel.jsx`, `PurchaseEntryPanel.jsx`, `InventoryTabBar.jsx`, `App.js`, `SubRecipeStockPanel.jsx` (NEW), `SubRecipeStockPage.jsx` (NEW)  
**WILL NOT touch:** `StockAuditPanel.jsx`, `CurrentStockPanel.jsx`, `RecipeManagementPanel.jsx`, any order-taking or billing files

---

## Registry Sync Checklist (for Implementation agent)
- [ ] registry.json: CR-139 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] registry.json: BUG-312 → status: SUBSUMED into CR-139 (IMPLEMENTED)
- [ ] registry.json: BUG-313 → status: SUBSUMED into CR-139 (IMPLEMENTED)
- [ ] CR_REGISTRY.md: CR-139 row updated
- [ ] BUG_TRACKER.md: BUG-312 + BUG-313 rows updated
- [ ] FILE_OWNERSHIP.md: 9 files listed
- [ ] Code markers: `// CR-139` in every modified file

---

## Evidence
- Investigation report (purchase endpoint): `/app/memory/BUG-sub-recipe-purchase-endpoint_INVESTIGATION_REPORT.md`
- Investigation report (architecture): `/app/memory/BUG-subrecipe-tab-architecture_INVESTIGATION_REPORT.md`
- Intake docs: `BUG-312_FROM_API_INGREDIENTS_MISSING_ISSUBRECIPE_INTAKE.md`, `BUG-313_SUBRECIPE_APPEARS_IN_STOCK_UPDATE_PURCHASE_INTAKE.md`
- Backend endpoint verified: `POST /api/v2/vendoremployee/inventory/add-sub-recipe-stock`
