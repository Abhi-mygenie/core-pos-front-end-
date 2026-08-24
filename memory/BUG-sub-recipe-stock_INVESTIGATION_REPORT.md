# BUG-sub-recipe-stock — Investigation Report
**Date:** 2026-08-13  
**Role:** INVESTIGATION → BUG FIX  
**Steps used:** 8/10

---

## 1. Summary
Root cause: `StockAuditPanel.jsx` routes ALL stock items (including sub-recipe items) to `inventoryService.addStock(itemId)` which calls `POST /inventory/add-stock/{id}`. Sub-recipe items require a separate endpoint `POST /inventory/add-sub-recipe-stock` with `{ sub_recipe_id, quantity, unit }` in the request body.  
Classification: **FE_BUG — CODE_ERROR**  
Confidence: **HIGH**

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps Used | Result | Evidence |
|---|---|---|---|---|---|
| H1 | Endpoint constant missing | grep constants.js | 1 | CONFIRMED | No `ADD_SUB_RECIPE_STOCK` in `INVENTORY_ENDPOINTS` |
| H2 | Service function missing | grep inventoryService.js | 2 | CONFIRMED | No `addSubRecipeStock` fn |
| H3 | Wrong routing in StockAuditPanel | Read StockAuditPanel.jsx | 3 | CONFIRMED | `addStock(itemId)` used for all items including sub-recipes |
| H4 | Transform payload missing | grep inventoryTransform.js | 4 | CONFIRMED | No `addSubRecipeStock` in `toAPI` |

---

## 3. Data Flow Trace

**Broken chain (before fix):**
- User enters physical qty for a sub-recipe stock item in `StockAuditPanel`
- `handleSaveAll` → `inventoryService.addStock(itemId, {...})`
- → `POST /api/v2/vendoremployee/inventory/add-stock/{itemId}`
- Backend returns error: wrong endpoint for sub-recipe items

**Expected chain (after fix):**
- `handleSaveAll` checks `item.isSubRecipe && item.subrecipeId`
- → `inventoryService.addSubRecipeStock(item.subrecipeId, { quantity, unit, ... })`
- → `POST /api/v2/vendoremployee/inventory/add-sub-recipe-stock`
- Body: `{ sub_recipe_id: 17, quantity: 1, unit: "kg", ... }`

**BREAK POINT (before fix):** `StockAuditPanel.jsx:62` — no sub-recipe routing, wrong endpoint called

---

## 4. Files Changed

| File | Change |
|---|---|
| `src/api/constants.js` | Added `ADD_SUB_RECIPE_STOCK` to `INVENTORY_ENDPOINTS` |
| `src/api/transforms/inventoryTransform.js` | Added `toAPI.addSubRecipeStock(data)` transform |
| `src/api/services/inventoryService.js` | Added `addSubRecipeStock(subRecipeId, data)` service function |
| `src/components/inventory/StockAuditPanel.jsx` | `handleSaveAll` now routes sub-recipe items to `addSubRecipeStock` |

---

## 5. Recommendations
- **Classification:** FE_FIX — completed
- **Compile:** PASS (webpack compiled successfully)
- **Planning skip:** Not eligible (4 files changed) but root cause was HIGH confidence → fix applied directly

---

## 6. Key Details
- Sub-recipe stock items are identified by `item.isSubRecipe === true` AND `item.subrecipeId !== null`
- Backend requires `sub_recipe_id` in body (not URL), plus `unit` field
- Optional payload fields supported: `physical_qty`, `waste_reason`, `batch`, `expiry_date`
