# Impact Analysis — CR-114 + CR-115 (Smart Purchase: Default Unselected + Search/Sort)

**IDs:** CR-114, CR-115
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-27
**Code Reality:** NONE
**Conflict Pre-Check:** SmartPurchasePanel and AutoShoppingList have no active non-IMPLEMENTED items. CLEAR.
**Risk:** MEDIUM

---

## Scope

Two related enhancements to Smart Purchase:
1. **CR-114:** Items start unselected by default. User opts in to items they want to buy.
2. **CR-115:** Add search filter + category sort/group to the item list.

---

## Data Flow Trace

### Current Flow
```
SmartPurchasePanel.fetchPlan()
  → inventoryService.getStockInventory() + getDailyConsumptionReport()
  → computePlan() returns ALL items with gap < 0
  → setRows(initialRows)  ← ALL items visible
  → AutoShoppingList renders ALL rows
  → User manually enters rate per row to "activate" it
  → activeRows = rows.filter(r => Number(r.rate) > 0)  ← only rated items submit
```

### After CR-114
```
SmartPurchasePanel.fetchPlan()
  → computePlan() returns ALL items (unchanged)
  → setRows(initialRows)  ← ALL items stored in state
  → NEW: setSelectedForPurchase(new Set())  ← nothing selected
  → AutoShoppingList renders in 2 sections:
    Section A: "Selected for Purchase" (items in selectedForPurchase set) — editable rate/qty/vendor
    Section B: "Available Items" (not selected) — collapsed, click to add
  → User clicks "+" to move item from B → A
  → activeRows = rows.filter(selected AND rate > 0)
```

### After CR-115
```
AutoShoppingList receives new props: searchQuery, categoryFilter
  → NEW: filter bar above table: [Search input] [Category dropdown]
  → Category data source: ingredientsMaster (passed from SmartPurchasePanel)
    — ingredientsMaster[].categoryName available from inventoryTransform
  → Client-side filter applied before rendering rows
  → Categories derived: [...new Set(ingredientsMaster.map(i => i.categoryName))]
```

---

## Affected Files

| File | Change | Lines Est. | Risk |
|------|--------|:---:|:---:|
| `SmartPurchasePanel.jsx` | Add `selectedForPurchase` state (Set). Pass category list + filter state to AutoShoppingList. Modify `activeRows` to also check selection. | ~25 | LOW |
| `AutoShoppingList.jsx` | Add filter bar (search + category dropdown). Split table into "Selected" and "Available" sections. Add "+" button to add items. Apply client-side search/category filter. | ~80 | MEDIUM |
| `purchasePlanner.js` | Add `categoryName` to output rows (lookup from stock inventory or ingredientsMaster). Currently missing. | ~5 | LOW |

## Files NOT Touched
- VendorSuggestionCell.jsx (unchanged)
- HorizonPicker.jsx (unchanged)
- GroupedVendorPreview.jsx (unchanged)
- inventoryService.js (no new API calls)
- inventoryTransform.js (already has categoryName)

---

## Category Data Source

`ingredientsMaster` is fetched via `inventoryService.getIngredients()` and already contains:
```js
{ id, name, categoryId, categoryName, unit, smallUnit, conversionFactor, ... }
```

For rows coming from `computePlan()`, category info must be joined:
```js
// In SmartPurchasePanel, after computePlan:
const catLookup = new Map(ingMaster.map(i => [String(i.id), i.categoryName]));
initialRows.forEach(r => { r.categoryName = catLookup.get(String(r.ingredient_id)) || 'Uncategorized'; });
```

---

## UX Design Recommendation

### Filter Bar (CR-115)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 [Search ingredients...]  [All Categories ▾]  Show: X items │
└─────────────────────────────────────────────────────────────┘
```

### Two-Section Layout (CR-114)
```
┌─ SELECTED FOR PURCHASE (3 items) ─────────────────────────┐
│ [table with rate/qty/vendor columns — editable]            │
└───────────────────────────────────────────────────────────┘

┌─ AVAILABLE ITEMS (47 items) ──── [Expand/Collapse] ───────┐
│ [compact list: name | category | on-hand | velocity | [+]] │
└───────────────────────────────────────────────────────────┘
```

---

## Owner Decisions Needed

| # | Question | Options |
|---|----------|---------|
| OD-7 | **CR-114 — Default view:** Should "Available Items" section be expanded or collapsed by default? | A: Collapsed (cleaner). B: Expanded (user can see all items). |
| OD-8 | **CR-114 — Selection UX:** Click "+" to add, or checkbox? | A: "+" button per row (simpler). B: Checkbox column (more traditional). |
| OD-9 | **CR-115 — Category sort:** Group items by category with headers, or just filter dropdown? | A: Category headers in table (like ConsumptionReport). B: Dropdown filter only (simpler). |

---

## Risk Register
- **MEDIUM:** AutoShoppingList is a complex component (245 lines) with existing features (ad-hoc typeahead, bulk select, vendor cells). Adding sections + filters increases complexity. Mitigated by keeping existing table structure and adding filter layer on top.
- **LOW:** No API changes, no financial logic, no state beyond local component.
