# BUG-sub-recipe-purchase-endpoint — Investigation Report
**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Steps used:** 8/10  
**Confidence:** HIGH  
**Source:** Owner-reported — "when adding sub recipe still purchase endpoint is called"

---

## 1. Root Cause Summary

`fromAPI.ingredients()` (used by `getIngredients()` from `get-inventory-master`) does NOT map `is_sub_recipe` → `isSubRecipe`. Every component consuming `getIngredients()` — `AdHocTypeahead`, `PurchaseEntryPanel` — cannot distinguish sub-recipe items, and all submit handlers call `addPurchase()` unconditionally.

Only `fromAPI.stockItems()` (from `stock-inventory`) maps `isSubRecipe` correctly, which is why `computePlan` can filter sub-recipes in the auto-plan but ad-hoc adds and PurchaseEntryPanel cannot.

---

## 2. Gap Register

| # | Gap | File | Line | Severity |
|---|-----|------|------|----------|
| G1 | `fromAPI.ingredients()` missing `isSubRecipe`/`subrecipeId` | `inventoryTransform.js` | 8-31 | ROOT CAUSE |
| G2 | `AdHocTypeahead` no `isSubRecipe` filter | `AutoShoppingList.jsx` | 14-19 | HIGH |
| G3 | `SmartPurchasePanel.handleSubmit()` calls `addPurchase()` for all rows | `SmartPurchasePanel.jsx` | 194 | HIGH |
| G4 | `StockAuditPanel` fix requires `subrecipeId != null` — too strict | `StockAuditPanel.jsx` | ~65 | MEDIUM |
| G5 | `PurchaseEntryPanel` dropdown + submit no sub-recipe routing | `PurchaseEntryPanel.jsx` | 195, 95 | HIGH |

---

## 3. Fix Sequence (when approved)

- Fix A (prerequisite): Add `isSubRecipe` + `subrecipeId` to `fromAPI.ingredients()` — 2 lines
- Fix B: `AdHocTypeahead` filter `&& !i.isSubRecipe`
- Fix C: `SmartPurchasePanel.handleSubmit()` — route sub-recipe rows to `addSubRecipeStock()`
- Fix D: `StockAuditPanel` — relax condition to `item?.isSubRecipe` only (not `&& subrecipeId`)
- Fix E: `PurchaseEntryPanel` — filter dropdown + route submit

Planning skip: A+D = YES (≤5 lines, 2 files). Full set = NO (full gate cycle).
