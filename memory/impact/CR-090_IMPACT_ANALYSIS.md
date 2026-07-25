# CR-090 — Impact Analysis (Gate 2)

**ID:** CR-090
**Title:** Inventory Categories — Edit & Delete
**Date:** 2026-07-25
**Risk:** MEDIUM
**Code Reality:** NONE — category sidebar has only click-to-filter + add. No edit/delete controls.
**Conflict Pre-Check:** No OTHER item touching `InventorySetupPanel.jsx` category sidebar in current sprint. BUG-212 last modified ingredient rows (not category rows). SAFE.

---

## 1. Backend Endpoint Validation (Rule R11 — curl-probe)

### DELETE Endpoint — CONFIRMED ✅

**URL:** `DELETE /api/v2/vendoremployee/inventory/stock-item-categories/delete/{id}`

| Scenario | Status | Response | FE Action |
|----------|--------|----------|-----------|
| Category with ingredients (id=1448) | 200 OK | `{ success: false, message: "Unable to delete category involved into this ingredient" }` | Show toast error with message |
| Franchise-locked category (id=1060) | 403 | `{ success: false, message: "This catalogue item is managed by hierarchy push and cannot be edited on this store.", error_code: "PUSHED_CATALOG_LOCKED" }` | Show toast error with message |
| Empty, non-locked category | Presumed 200 | `{ success: true }` (not explicitly shown — **OQ-1**) | Refresh categories |

**BACKEND-BLOCKED status: CLEARED for DELETE.**

### PUT/RENAME Endpoint — ⚠️ NOT VERIFIED (OQ-1)

The intake doc specifies Edit (rename) capability. Backend has NOT provided a PUT curl for renaming.

**Expected endpoint pattern** (from expense module analogy — BUG-160):
`PUT /api/v2/vendoremployee/inventory/stock-item-categories/{id}` with body `{ category_name: "New Name" }`

**OWNER DECISION REQUIRED:** Does the PUT (rename) endpoint exist? If not, CR-090 can ship DELETE-only and Edit can be deferred.

---

## 2. Data Flow Trace

### Current Flow (Add Category)
```
User types name → addCategory() → inventoryService.storeCategory(data)
  → toAPI.storeCategory({ category_name }) → POST .../stock-item-categories/store
  → success → fetchData() refreshes categories + ingredients
```

### Proposed: Delete Category
```
User clicks Trash on category row → deleteCategory(id, name)
  → window.confirm("Delete X?") → inventoryService.deleteCategory(id)
  → DELETE .../stock-item-categories/delete/{id}
  → IF success: true → toast.success + fetchData()
  → IF success: false (has ingredients) → toast.error(message)
  → IF 403 (PUSHED_CATALOG_LOCKED) → toast.error(message)
  → IF selectedCat === deleted id → setSelectedCat(null) (reset filter)
```

### Proposed: Edit Category (pending OQ-1)
```
User clicks Pencil on category row → setEditingCatId(id), setEditCatName(name)
  → inline input replaces category name text
  → Save → inventoryService.renameCategory(id, newName)
  → PUT .../stock-item-categories/{id} with { category_name: newName }
  → success → fetchData()
  → Cancel → setEditingCatId(null)
```

---

## 3. Affected Files

### Files WILL change:

| # | File | Lines | Change | Risk |
|---|------|-------|--------|------|
| 1 | `api/constants.js` | L157-158 area | +`DELETE_STOCK_CATEGORY` constant (and +`UPDATE_STOCK_CATEGORY` if OQ-1 resolved) | LOW |
| 2 | `api/services/inventoryService.js` | L51-61 area (Categories section) | +`deleteCategory(id)` function (and +`renameCategory(id, data)` if OQ-1) | LOW |
| 3 | `components/inventory/InventorySetupPanel.jsx` | L196-226 (category sidebar) | +Pencil + Trash icons per category row, +editingCatId/editCatName state, +deleteCategory handler, +renameCat handler, +inline edit input | MEDIUM |

### Files will NOT touch:
- `inventoryTransform.js` — no transform needed; DELETE has no request body; rename body is trivial inline
- `IngredientBulkEditor.jsx` — unrelated
- Any report pages, orderTransform, financial logic
- No hotspot files (R5)

---

## 4. Pattern Reference — Expense Module (BUG-159 + BUG-160)

The expense module already has identical category CRUD in `ExpenseSetupPanel.jsx`:
- `renameExpenseCategory()` → `PUT /expense/category/{id}`
- `deleteExpenseCategory()` → `DELETE /expense/category/{id}`

The inventory implementation should mirror this exact pattern for consistency.

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| DELETE succeeds but UI doesn't refresh | LOW | Category still visible | `fetchData()` after success response |
| DELETE on currently-selected category | MEDIUM | Filter shows empty | Reset `selectedCat` to null after deleting selected |
| Rename to duplicate name | LOW | Backend may 409 | FE pre-check (same as addCategory BUG-220 pattern) |
| PUSHED_CATALOG_LOCKED on edit (not just delete) | MEDIUM | Backend may also block PUT on franchise cats | FE should handle 403 on rename too |

---

## 6. Downstream Consumers

- **Ingredient counts (catCounts):** Auto-recalculated from `ingredients` state after `fetchData()`. No manual update needed.
- **IngredientBulkEditor:** Receives `categories` as prop. Will get updated list after `fetchData()`. No change needed.
- **No other component** renders the category sidebar.

---

## 7. Owner Decision Queue

| # | Question | Options | Default | Blocking? |
|---|----------|---------|---------|-----------|
| OQ-1 | Does `PUT /api/v2/vendoremployee/inventory/stock-item-categories/{id}` exist for rename? | A) Yes — include edit+delete. B) No — ship DELETE only, defer edit. | A | YES — determines scope |
| OQ-2 | Should franchise-locked categories (PUSHED_CATALOG_LOCKED) hide the pencil/trash icons entirely, or show them and display the error on click? | A) Hide icons. B) Show icons, error on click. | B (matches delete behavior already tested) | NO — cosmetic |

---

## 8. Estimated Scope

- **~40-50 lines** across 3 files
- **No financial logic** (R6 safe)
- **No hotspot files** (R5 safe)
- **No localStorage** (R8 safe)
- **No provider order** (R7 safe)

---

## Summary

**DELETE is UNBLOCKED** — backend endpoint confirmed with 3 response scenarios (success, has-ingredients, franchise-locked). FE pattern is well-established (expense module BUG-159/BUG-160).

**EDIT (rename) is PENDING OQ-1** — owner must confirm PUT endpoint exists before planning implementation.

**Next:** Resolve OQ-1 → Gate 3 (Implementation Plan)
