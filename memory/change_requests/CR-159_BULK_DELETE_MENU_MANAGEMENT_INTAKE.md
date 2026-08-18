# CR-159 — Bulk Delete in Menu Management

**Type:** Change Request (New Feature)
**ID:** CR-159
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

Owner needs a **bulk delete** capability in Menu Management — the ability to select multiple menu items (products) and delete them all in one action. Currently only single-item delete exists (`ProductList.jsx` → `menuService.deleteFood(productId)`). There is no multi-select or batch delete mechanism anywhere in the menu management UI.

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | Menu Management → Product List / Bulk Editor |
| Priority | P1 |
| Severity | HIGH — menu cleanup (removing discontinued items, seasonal menus) is slow and error-prone one-by-one |
| Risk | HIGH (bulk irreversible data deletion; must require explicit confirmation) |
| Fast Lane | NO — multi-component change + confirmation UX + API endpoint check |

## Evidence

- Source: OWNER-REPORTED
- Screenshot: not provided
- Steps to reproduce: Open Menu Management — no way to select multiple items and delete them together
- Confidence: CONFIRMED (code inspection)

## Code Reality Check

```bash
# Single-item delete EXISTS:
  ProductList.jsx line 94:  const handleDelete = useCallback(async (product, reason) => { ... }
  ProductList.jsx line 96:  await menuService.deleteFood(product.productId, reason)
  menuService.js  line 97:  export const deleteFood = (foodId, deleteReason) => ...  ← single item only

# Multi-select / bulk selection: NONE
  BulkEditor.jsx — grep "select|checkbox|selectedIds|selectedRows|rowSelection" → 0 relevant hits
  No selectedIds state, no row checkbox column, no "Select All" header

# Bulk delete API endpoint: NONE confirmed
  menuManagementService.js → no bulkDelete / batchDelete / deleteMany function
```

- **Code reality: PARTIAL** — single delete exists and works; bulk select UI and bulk delete service call are both NONE
- Files relevant to implementation:
  - `src/components/panels/menu/BulkEditor.jsx` (add row checkbox column + Select All + Delete Selected button)
  - `src/components/panels/menu/ProductList.jsx` (card view may also need multi-select)
  - `src/api/services/menuManagementService.js` (add bulk delete service call)
  - `src/api/constants.js` (bulk delete endpoint constant)

## Blast Radius

- `BulkEditor.jsx` — add checkbox column, selection state, Delete Selected button (~30-40 lines)
- `menuManagementService.js` — add bulk delete function (~5 lines)
- `api/constants.js` — add endpoint constant (~1 line)
- Optional: `ProductList.jsx` card view multi-select (if owner wants it in card view too)
- Estimated scope: MEDIUM (3-4 files, ~50 lines)

## Expected Behavior

- **Bulk Editor (table view):**
  - Checkbox column on the left of each row
  - "Select All" checkbox in the header
  - When 1+ rows are selected: a "Delete Selected (N)" button appears in the toolbar
  - On click: confirmation modal — "Delete N items? This cannot be undone."
  - On confirm: batch API call → rows removed from table → success toast

- **Confirmation UX (mandatory — irreversible action):**
  - Must show count: "You are about to delete 7 items"
  - Require explicit confirm click (no accidental trigger)
  - On success: refresh menu list

- **Delete reason:** May or may not be required for bulk delete (single delete has `deleteReason` — owner to confirm)

## Owner Decisions Needed

1. Should bulk delete be available in **Card View** (ProductList) as well, or Bulk Editor (table) only?
2. Is a **delete reason** required for each item, or can bulk delete skip the reason field?
3. Does the backend have a bulk delete endpoint, or does it need to be added? (sequential single-deletes as fallback?)

## Duplicate Check

DISTINCT — no prior CR/BUG for bulk delete in menu management.

---

**Backend Brief Needed:** Confirm if a bulk delete endpoint exists (`DELETE /foods/bulk` or similar) or if sequential single deletes are the expected approach.
**Next:** Planning Gate 2
