# BUG-313 — Sub-Recipe Appears in Stock Update + addPurchase() Called for All Rows (No Routing)
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (screenshot: "sub1" visible in Stock Update auto-plan)  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** BUG  
- **Severity:** P1 — Feature broken (sub-recipe stock update via wrong endpoint; purchase record created for non-purchasable item)  
- **Risk:** HIGH (incorrect stock + purchase records)  
- **Area:** Inventory → Stock Update (SmartPurchasePanel) + Purchase Entry  
- **Duplicate check:** DISTINCT. Related to BUG-308 (StockAuditPanel — IMPLEMENTED) and BUG-312 (root cause transform). This covers the SmartPurchasePanel and PurchaseEntryPanel paths.

## Symptom
Sub-recipe items appear in the "Stock Update" auto-plan (purchase flow) — evidenced by owner screenshot showing "sub1" in the ingredient list with "Out of stock" status. When submitted, `addPurchase()` is called for these items. Sub-recipes are NOT purchasable — they should have their own stock-update flow.

Additionally, the `AdHocTypeahead` (+ Add Item button) in Stock Update allows manually adding sub-recipe items to the purchase list, which then calls `addPurchase()` on submit.

## Root Causes

### RC1: G9 filter depends on unreliable backend flag
`purchasePlanner.js:113` filters `item?.isSubRecipe !== true`. But the backend's `stock-inventory` response does not reliably set `is_sub_recipe: true` for all sub-recipe items. Screenshot proves "sub1" has `is_sub_recipe: false/absent` → passes G9 → appears in plan.

### RC2: AdHocTypeahead has no sub-recipe filter
`AutoShoppingList.jsx:14-19` — search filter uses `ingredientsMaster` from `getIngredients()`, which lacks `isSubRecipe` (see BUG-312). Even if G9 filtered auto-plan rows, a user can manually add sub-recipes via the typeahead.

### RC3: SmartPurchasePanel.handleSubmit() calls addPurchase() for ALL rows
`SmartPurchasePanel.jsx:194` — no check `if (row.isSubRecipe)`. Even rows identified as sub-recipes would be submitted to `addPurchase()`.

### RC4: PurchaseEntryPanel ingredient dropdown has no sub-recipe filter
`PurchaseEntryPanel.jsx:195` — ingredient dropdown uses `getIngredients()` (no `isSubRecipe`). All items appear.  
`PurchaseEntryPanel.jsx:95` — submit always calls `addPurchase()`.

## Blast Radius
- 4 files: `purchasePlanner.js`, `AutoShoppingList.jsx`, `SmartPurchasePanel.jsx`, `PurchaseEntryPanel.jsx`
- Scope: LARGE (4 files, routing logic changes)
- Hotspot: NO
- Financial: NO (inventory stock, not billing)

## Dependency
BUG-312 (add `isSubRecipe` to `fromAPI.ingredients()`) must be implemented BEFORE RC2/RC3/RC4 fixes can work.

## Fix Approach (not implemented — awaiting Gate 2-3)
1. **RC1**: Add a secondary check using sub-recipes list endpoint to hard-block sub-recipes in Stock Update (not just rely on `is_sub_recipe` flag)
2. **RC2**: After BUG-312 fix — `AdHocTypeahead.filtered` adds `&& !i.isSubRecipe`
3. **RC3**: `SmartPurchasePanel.handleSubmit()` — route `isSubRecipe` rows to `addSubRecipeStock()`, exclude from `addPurchase()` items array
4. **RC4**: `PurchaseEntryPanel` — filter sub-recipe items from dropdown; route to `addSubRecipeStock()` on submit

Full Planning Gate 2-3 required (4 files, new routing logic).

## Evidence
Investigation report: `/app/memory/BUG-sub-recipe-purchase-endpoint_INVESTIGATION_REPORT.md`  
Architecture report: `/app/memory/BUG-subrecipe-tab-architecture_INVESTIGATION_REPORT.md`  
Screenshot: owner-provided (sub1 in Stock Update)
