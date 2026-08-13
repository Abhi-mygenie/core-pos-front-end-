# BUG-subrecipe-tab-architecture — Investigation Report
**Date:** 2026-08-13  
**Role:** INVESTIGATION  
**Steps used:** 10/10  
**Confidence:** HIGH  
**Source:** Owner-reported (screenshot: sub-recipe "sub1" appears in Stock Update; architectural gap)

---

## 1. Summary
Sub-recipes appear in Stock Update (purchase flow) because the backend `is_sub_recipe` flag is unreliable → G9 filter in computePlan is ineffective. No dedicated "Sub-Recipe Stock" tab exists. Wastage + Stock Audit with both types is CORRECT per owner.

---

## 2. Screenshot Root Cause
"sub1" appears in Stock Update auto-plan because `stock-inventory` response has `is_sub_recipe: false` (or absent) → `isSubRecipe: false` on frontend → passes G9 filter → enters velocityRows or alertRows.

---

## 3. Gap Register

| # | Gap | File | Severity |
|---|-----|------|----------|
| G1 | Backend `is_sub_recipe` unreliable → G9 filter blind | purchasePlanner.js:113 + backend | CRITICAL |
| G2 | No dedicated "Sub-Recipe Stock" tab | InventoryTabBar.jsx TABS array | HIGH |
| G3 | SmartPurchasePanel.handleSubmit() calls addPurchase() for all rows | SmartPurchasePanel.jsx:194 | HIGH |
| G4 | AdHocTypeahead has no isSubRecipe guard | AutoShoppingList.jsx:14-19 | HIGH |
| G5 | PurchaseEntryPanel dropdown shows sub-recipes | PurchaseEntryPanel.jsx:195,95 | HIGH |
| G6 | StockAuditPanel shows both types without visual grouping | StockAuditPanel.jsx | MEDIUM (OK per owner) |
| G7 | StockAuditPanel fix too strict: needs subrecipeId + isSubRecipe | StockAuditPanel.jsx:65 | MEDIUM |
| G8 | fromAPI.ingredients() lacks isSubRecipe/subrecipeId | inventoryTransform.js:8-31 | ROOT for G3/G4/G5 |

---

## 4. Target Architecture
- Stock Update: INGREDIENTS ONLY (no sub-recipes, hard block)
- Sub-Recipe Stock: NEW TAB — uses add-sub-recipe-stock endpoint
- Stock Audit: BOTH (correct per owner)
- Wastage in Audit: BOTH (correct per owner) — addSubRecipeStock supports waste_reason

---

## 5. Build Plan (when approved)
- P0: New "Sub-Recipe Stock" tab + panel + page
- P0: Hard block sub-recipes in Stock Update
- P1: Fix G7 (StockAuditPanel condition) + G8 (fromAPI.ingredients)
- P2: Filter AdHocTypeahead + PurchaseEntryPanel
