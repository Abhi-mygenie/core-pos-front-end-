# QA Handover — CR-139 Sub-Recipe Stock Tab
**Date:** 2026-08-13 | **Implementation agent** → QA agent  
**Items:** CR-139 (absorbs BUG-312 + BUG-313)  
**Registry:** IMPLEMENTED | **EXIT GATE:** 5/5 PASS

---

## §1 Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test |
|---|---|---|---|
| A | `inventoryTransform.js:30-31` | `isSubRecipe` + `subrecipeId` added to fromAPI.ingredients | ✅ PASS — code confirmed |
| B1 | `purchasePlanner.js:113,146` | Dual G9 guard: `!isSubRecipe && !subrecipeId` | ✅ PASS — code confirmed |
| B2 | `AutoShoppingList.jsx:17` | `!i.isSubRecipe` in AdHoc typeahead filter | ✅ PASS — code confirmed |
| B3 | `PurchaseEntryPanel.jsx:195` | `.filter(i => !i.isSubRecipe)` on dropdown | ✅ PASS — code confirmed |
| B4 | `SmartPurchasePanel.jsx:183` | Comment marker only | ✅ PASS — compile clean |
| C1 | `InventoryTabBar.jsx:12` | `sub-recipe-stock` tab after `smart-purchase` | ✅ PASS — code confirmed |
| C2 | `SubRecipeStockPanel.jsx` | NEW — full panel | ✅ PASS — code confirmed (iteration_2 100%) |
| C3 | `SubRecipeStockPage.jsx` | NEW — page wrapper | ✅ PASS — code confirmed |
| C4 | `App.js:81,225` | Import + route `/inventory-sub-recipe-stock` | ✅ PASS — code confirmed |

**Testing agent (iteration_2.json):** 100% code-level. All 9 files PASS.

---

## §2 Test Cases for QA Agent

### T1 — Tab navigation
- Navigate to any inventory page → verify "Sub-Recipe Stock" tab is visible after "Stock Update" in OPERATIONS group
- Click "Sub-Recipe Stock" tab → route changes to `/inventory-sub-recipe-stock`
- Page title shows "Sub-Recipe Stock" with blue Layers icon

### T2 — Panel loads with sub-recipe rows
- Page shows a table with columns: Sub-Recipe | Current Qty | New Qty | Unit | Drift | Wastage Reason | Batch | Expiry
- Each row has a purple "Sub-Recipe" badge below the name
- Search bar filters rows by name

### T3 — Positive drift (stock added)
- Enter a qty GREATER than current qty → row turns green, green "+X.XX unit" drift badge appears
- Wastage reason dropdown is disabled ("N/A — no drift")
- Save button activates showing "Save 1 Adjustment"

### T4 — Negative drift (wastage — wastage reason REQUIRED)
- Enter a qty LESS than current qty → row turns amber, amber "−X.XX unit preview" badge appears
- Wastage reason dropdown appears with red border
- Red text "Required for negative drift" shows below dropdown
- Click "Save Adjustments" without selecting reason → toast error fires, save blocked
- Select a wastage reason → dropdown border turns green
- Click "Save Adjustments" → POST /inventory/add-sub-recipe-stock called with correct `sub_recipe_id`

### T5 — Batch/Expiry optional
- Enter qty + wastage reason (if negative) + leave Batch and Expiry empty → save succeeds

### T6 — Save button state
- No entries → Save button disabled (grey, cannot click)
- 1+ entries → Save button green "Save N Adjustment(s)"
- Reset All → entries cleared, Save disabled again

### T7 — Stock Update does NOT show sub-recipe items
- Navigate to Stock Update (Smart Purchase) → search for a sub-recipe name
- Sub-recipe items should NOT appear in the available items list
- Click "+ Add Item" → search sub-recipe name in Ad-Hoc typeahead → NOT found

### T8 — Purchase Entry dropdown does NOT show sub-recipe items  
- Navigate to `/inventory-purchase` (or Purchase Entry tab if visible)
- Open ingredient dropdown → sub-recipe items should NOT be listed

---

## §3 Regression Tests

| # | What to verify | Why |
|---|---|---|
| R1 | Stock Update auto-plan still shows normal ingredients correctly | B1 dual guard change must not filter real ingredients |
| R2 | Stock Audit still works for both ingredients and sub-recipes | StockAuditPanel untouched |
| R3 | Current Stock still shows both types with Sub-Recipe badge | CurrentStockPanel untouched |
| R4 | Other inventory tabs (Dashboard, Receive, Ingredients, Recipes) still load | Tab bar change must not break other tabs |

---

## §4 Registry Sync Confirmation
- registry.json: CR-139 → IMPLEMENTED ✅
- registry.json: BUG-312 → IMPLEMENTED — SUBSUMED by CR-139 ✅
- registry.json: BUG-313 → IMPLEMENTED — SUBSUMED by CR-139 ✅
- EXIT GATE: 5/5 PASS ✅

## §5 Credentials + Environment
- App URL: https://mygenie-pos-ui-5.preview.emergentagent.com
- Backend: https://preprod.mygenie.online (external — login required for T3/T4 live API tests)
- test_credentials.md: empty (no stored credentials for preprod)
