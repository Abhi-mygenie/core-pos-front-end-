# BUG-312 — fromAPI.ingredients() Missing isSubRecipe/subrecipeId Fields (Root Cause)
**Registered:** 2026-08-13  
**Source:** AGENT-DISCOVERED (investigation — sub-recipe purchase endpoint root cause)  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** BUG  
- **Severity:** P1 — Feature broken (sub-recipe items unidentifiable via getIngredients)  
- **Risk:** HIGH (incorrect API routing for stock operations)  
- **Area:** Inventory → API Transform Layer  
- **Duplicate check:** DISTINCT (no prior bug covers this transform gap)

## Symptom
`getIngredients()` (from `GET /inventory/get-inventory-master`) returns items with no `isSubRecipe` or `subrecipeId` fields. Any component that uses `getIngredients()` — `AdHocTypeahead`, `PurchaseEntryPanel`, `SmartPurchasePanel` — cannot identify sub-recipe items, so they are treated as regular ingredients and routed to `addPurchase()` instead of `addSubRecipeStock()`.

## Root Cause
`inventoryTransform.js:8-31` — `fromAPI.ingredients()` maps 29 fields but NEVER maps:
- `isSubRecipe` (maps `is_sub_recipe` in `fromAPI.stockItems()` at line 74 ✅)
- `subrecipeId` (maps `subrecipe_id` in `fromAPI.stockItems()` at line 75 ✅)

The two transforms use different API endpoints and the `ingredients` transform was written before sub-recipe stock management was introduced.

## Downstream Impact (all caused by this root cause)
- `AdHocTypeahead` (AutoShoppingList.jsx:14-19): cannot filter sub-recipe items from the ad-hoc search dropdown
- `SmartPurchasePanel.handleSubmit()`: calls `addPurchase()` for all rows — no isSubRecipe routing possible
- `PurchaseEntryPanel`: ingredient dropdown lists potential sub-recipes, submit calls `addPurchase()`

## Blast Radius
- 1 file: `inventoryTransform.js:8-31`
- Scope: SMALL (1 file, 2 lines added)
- Hotspot: NO
- Financial: NO

## Fix (not implemented — awaiting Gate 4 GO)
Add to `fromAPI.ingredients()`:
```js
isSubRecipe: !!item.is_sub_recipe,
subrecipeId: item.subrecipe_id || null,
```
Planning skip eligible: YES — 1 file, 2 lines, non-hotspot, non-financial. Owner approval required.

## Evidence
Investigation report: `/app/memory/BUG-sub-recipe-purchase-endpoint_INVESTIGATION_REPORT.md` (Gap G8)  
Note: This is the ROOT CAUSE for BUG-313 (sub-recipe routing in submit handlers). Fix this first.
