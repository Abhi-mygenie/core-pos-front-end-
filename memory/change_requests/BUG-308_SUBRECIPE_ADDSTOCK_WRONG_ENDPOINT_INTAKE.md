# BUG-308 — Sub-Recipe Stock: addStock() called instead of addSubRecipeStock()
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (session investigation)  
**Sprint:** POS 5.0  
**Status:** IMPLEMENTED

---

## Classification
- **Type:** BUG  
- **Severity:** P1 — Feature broken (wrong endpoint, stock never credited)  
- **Risk:** MEDIUM (inventory stock integrity)  
- **Area:** Inventory → Stock Audit  
- **Duplicate check:** DISTINCT (no prior bug covers sub-recipe stock routing)

## Symptom
When a user enters a physical count for a sub-recipe item in Stock Audit and saves, the code calls `inventoryService.addStock(itemId)` → `POST /inventory/add-stock/{id}`. The backend expects `POST /inventory/add-sub-recipe-stock` with `{ sub_recipe_id, quantity, unit }` in the body. The adjustment is silently lost or rejected.

## Root Cause
`StockAuditPanel.jsx:62` — `handleSaveAll()` routes ALL stock items (including sub-recipes) to `addStock()`. No check for `item.isSubRecipe`. The `add-sub-recipe-stock` endpoint, its service function, and its transform were all missing.

## Fix Applied
- `api/constants.js`: added `ADD_SUB_RECIPE_STOCK` endpoint constant
- `api/transforms/inventoryTransform.js`: added `toAPI.addSubRecipeStock()` payload transform  
- `api/services/inventoryService.js`: added `addSubRecipeStock(subRecipeId, data)` service function
- `StockAuditPanel.jsx`: `handleSaveAll()` now checks `item?.isSubRecipe && item?.subrecipeId` → routes to `addSubRecipeStock()`, else falls through to `addStock()`

## Known Sub-Gap (G4)
Condition requires BOTH `isSubRecipe` AND `subrecipeId`. If backend sets `subrecipe_id: null`, sub-recipe still falls to `addStock()`. See BUG-315 for this follow-up.

## Files Changed
- `src/api/constants.js`
- `src/api/transforms/inventoryTransform.js`
- `src/api/services/inventoryService.js`
- `src/components/inventory/StockAuditPanel.jsx`

## Evidence
Investigation report: `/app/memory/BUG-sub-recipe-stock_INVESTIGATION_REPORT.md`  
Testing: iteration_1.json — 5/5 code verification PASS
