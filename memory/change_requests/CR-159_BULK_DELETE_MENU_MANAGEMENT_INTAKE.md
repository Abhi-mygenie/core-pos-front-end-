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

## Owner Decisions — RESOLVED (2026-08-17)

| # | Decision | Owner Answer |
|---|----------|--------------|
| 1 | Bulk delete in Card View or Bulk Editor only? | **Bulk Editor (table view) only** — card view not needed |
| 2 | Delete reason required per item or single reason for all? | **Single reason across all selected items** — one reason input covers the whole batch |
| 3 | Backend bulk delete endpoint or sequential single deletes? | **Backend will provide a bulk delete endpoint** — do not implement sequential fallback |

## Duplicate Check

DISTINCT — no prior CR/BUG for bulk delete in menu management.

---

- **Bulk Editor (table view) only** — no card view changes needed
- **One shared delete reason** for the entire batch (single text input in confirmation modal)
- **Backend will provide bulk delete endpoint** — no sequential fallback; await endpoint contract before implementation

- **Confirmation modal flow:**
  1. "Delete N items?" count display
  2. Single reason input field (required, same as single-item delete)
  3. Confirm / Cancel buttons

---

**Backend Brief Needed:** Owner to share bulk delete endpoint URL + method + payload shape when backend is ready.
**Owner Decisions:** ALL RESOLVED
**Next:** Planning Gate 2
