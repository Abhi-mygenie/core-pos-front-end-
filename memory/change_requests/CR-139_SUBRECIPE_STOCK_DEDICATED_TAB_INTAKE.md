# CR-139 — Sub-Recipe Stock: Dedicated Tab in OPERATIONS Group
**Registered:** 2026-08-13  
**Source:** OWNER-REPORTED (session: "sub recipe addition/update should be in separate tab, subrecipe doesn't go for purchase")  
**Sprint:** POS 5.0  
**Status:** INTAKE — GATE 1

---

## Classification
- **Type:** CR (Change Request)  
- **Severity:** P1 — Feature request (architectural gap — no dedicated sub-recipe stock management UI)  
- **Risk:** HIGH (new tab + page + panel, touches InventoryTabBar + routing)  
- **Area:** Inventory → Navigation + Sub-Recipe Stock  
- **Duplicate check:** DISTINCT (no existing CR covers sub-recipe stock as a dedicated screen)

## Owner Requirement
Sub-recipe stock addition and update must be in a **separate dedicated tab** in the Inventory OPERATIONS group. Sub-recipes do NOT go through purchase flow. They need their own screen that calls `POST /inventory/add-sub-recipe-stock` directly.

## Current State (Gap)
```
OPERATIONS tabs (current):
├─ Dashboard
├─ Current Stock     → shows sub-recipes with "Sub-Recipe" badge (read-only)
├─ Stock Update      → PURCHASE flow — sub-recipes leak in (BUG-313)
├─ Stock Audit       → both ingredients + sub-recipes (physical count, owner confirmed OK)
└─ Receive           → franchise only

MISSING: Sub-Recipe Stock tab
```

## Expected Behavior
```
OPERATIONS tabs (target):
├─ Current Stock     → ingredients + sub-recipes (read-only, unchanged)
├─ Stock Update      → INGREDIENTS ONLY — sub-recipes HARD BLOCKED
├─ Sub-Recipe Stock  → SUB-RECIPES ONLY — new tab
│                       Lists sub-recipe stock items (from /recipe/sub-recipes + stock levels)
│                       Enter: quantity, unit (+ optional: batch, expiry, waste_reason)
│                       Submit: POST /inventory/add-sub-recipe-stock
│                       Separate from purchase flow entirely
├─ Stock Audit       → both (unchanged, owner confirmed correct)
└─ Receive           → franchise only (unchanged)
```

## Scope
New components needed:
- `InventoryTabBar.jsx`: add `{ id: 'sub-recipe-stock', label: 'Sub-Recipe Stock', path: '/inventory-sub-recipe-stock', group: 'OPERATIONS' }` entry
- `SubRecipeStockPage.jsx`: new page (route `/inventory-sub-recipe-stock`)
- `SubRecipeStockPanel.jsx`: new panel
  - Fetches sub-recipe list (`GET /recipe/sub-recipes`) + stock levels
  - Inline qty/unit/batch/expiry inputs per item
  - Submit → `inventoryService.addSubRecipeStock(subRecipeId, data)`
  - Wastage reason select for negative adjustments
  - Sub-recipe name, current stock (from `getStockInventory()`, filtered by `isSubRecipe: true`)
- `App.js`: add route
- `Sidebar.jsx`: add navigation entry (if applicable)

Estimated scope: 4-5 files, ~250-350 lines.

## Owner Decisions Required (Gate 2)
1. Should sub-recipe stock show current quantity (from `stock-inventory`) or just entry form?
2. Should wastage reason be required or optional for negative adjustments?
3. Tab position: between Stock Update and Receive, or after Receive?
4. Batch/expiry fields — required or optional?
5. Should this tab support bulk entry (multiple sub-recipes at once) or one at a time?

## Evidence
Investigation report: `/app/memory/BUG-subrecipe-tab-architecture_INVESTIGATION_REPORT.md`  
Backend endpoint verified: `POST /api/v2/vendoremployee/inventory/add-sub-recipe-stock`  
Payload: `{ sub_recipe_id, quantity, unit, physical_qty?, waste_reason?, batch?, expiry_date? }`
