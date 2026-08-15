# BUG-212 — Ingredients: Edit Missing + Add Form Incomplete + Export Fake

**ID:** BUG-212
**Type:** BUG
**Created:** 2026-07-20
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Ingredients Setup
**Duplicate Check:** RELATED to BUG-197 (post-delivery gaps — #1 was Add Ingredient). DISTINCT from BUG-197 (edit was never in scope).
**Code Reality:** NONE for edit; PARTIAL for add (add works after this session's min_unit_alert fix but form is incomplete)
**Source:** OWNER-REPORTED (this session, with screenshot)
**Confidence:** CONFIRMED (code + curl verification)

---

## Description

Three bugs on the Ingredients screen (Inventory → Ingredients pill):

### Bug A: NO Edit Functionality (BLOCKER)
- Actions column has only Delete (🗑 icon). No edit/pencil icon.
- Backend endpoint **EXISTS and is live:** `PUT /api/v2/vendoremployee/inventory/update-inventory/{id}`
  - Required fields: `category_id`, `unit`, `reason` (string like "update")
  - Optional: `stock_title`, `small_unit`, `min_qty_alert`, `min_unit_alert`, `converion_factor`
  - Returns 422 with field validation if incomplete
  - Returns `"already exists"` if renaming to duplicate name
- Frontend has ZERO code for ingredient edit — no service function, no transform, no UI
- **Impact:** Owner cannot rename ingredients, change category, change unit, or set min alerts after creation. Only option is delete + re-add (loses purchase history).

### Bug B: Add Form Missing 4 Fields
- Current add form captures: Name, Category, Unit (3 fields only — see owner screenshot)
- Table headers show 6 columns: Ingredient Name, Base Unit, Conversion, Small Unit, Min Alert, Actions
- **Missing from add form:** Small Unit, Conversion Factor, Min Qty Alert, Min Unit Alert
- These fields ARE in the `toAPI.addIngredient()` transform but receive `undefined` → default `0`/empty
- **Impact:** New ingredients created with no conversion, no small unit, no alert thresholds

### Bug C: Export Button is Fake
- Export button (line 150-152) runs: `toast.info('Export in progress...')` — does NOT call any API
- The service function `inventoryService.exportIngredients()` EXISTS and is wired to `/api/v2/vendoremployee/inventory/export-inventory-master`
- **Impact:** Owner clicks Export, sees "in progress" toast, nothing downloads

---

## Evidence

- Screenshot: Owner-provided showing 3-field add form (name, category dropdown, unit dropdown)
- Code: `InventorySetupPanel.jsx` line 230-236 — Actions column has only `<Trash2>`, no `<Pencil>`
- Code: `InventorySetupPanel.jsx` line 22 — `newIng` state only has `{ name, categoryId, unit }`
- Code: `InventorySetupPanel.jsx` line 150-151 — Export onClick is `toast.info()`
- Curl: `PUT /update-inventory/10741` with `{stock_title, category_id, unit, reason}` → 422 (endpoint live)
- API: `inventoryService.exportIngredients()` exists at line 22 of inventoryService.js, never called from UI

## Blast Radius
- 3 files: `InventorySetupPanel.jsx`, `inventoryService.js`, `inventoryTransform.js`
- Optionally `constants.js` (add UPDATE_INVENTORY endpoint)
- ~80-100 lines change
- Hotspot: NO
- Scope: MEDIUM (3-5 files)

## Fix Plan (seeding — formal plan at Gate 3)

**Bug A (Edit):**
1. Add `UPDATE_INVENTORY` endpoint to constants.js
2. Add `updateIngredient(id, data)` to inventoryService.js
3. Add `toAPI.updateIngredient(data)` to inventoryTransform.js (maps to `{stock_title, category_id, unit, small_unit, min_qty_alert, min_unit_alert, converion_factor, reason: 'update'}`)
4. Add edit state + inline edit row in IngredientsTab (same pattern as VendorFormRow — blue-bordered)
5. Add Pencil icon in Actions column next to Trash

**Bug B (Add Form):**
1. Expand `newIng` state: `{ name, categoryId, unit, smallUnit, conversionFactor, minQtyAlert, minUnitAlert }`
2. Add 4 input fields to the add row (small unit dropdown, conversion number, min qty, min unit)

**Bug C (Export):**
1. Replace `toast.info(...)` with actual call to `inventoryService.exportIngredients()`
2. Handle dual-response (JSON download_url or blob fallback) — same pattern as `handleExport` in CurrentStockPanel

## Next
Planning Gate 2 → Gate 3 → Implementation
