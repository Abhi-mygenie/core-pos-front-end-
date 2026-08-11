# Implementation Plan — BUG-276 (Bulk Editor UX: Category Move Jump + Consistent Delete)

**ID:** BUG-276
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 3 (AFTER BUG-274)
**Risk:** LOW
**Files:** 2 | **Lines changed:** ~40
**Dependency:** BUG-274 MUST be implemented first (fixes core delete)

---

## Step 0 — Starting Code State

**File 1:** `src/components/expense/ExpenseBulkEditor.jsx`
- L86-118: `groupedRows` re-sorts immediately after category move → item jumps
- L203-229: `bulkDeleteConfirmed()` removes rows from state immediately (no animation)

**File 2:** `src/components/inventory/IngredientBulkEditor.jsx`
- L139-143: `deleteSelected()` uses `window.confirm()` instead of proper dialog

---

## UX Approach: Option A — Keep-in-Place with Badge (owner-preferred for speed)

After category move: keep items in their CURRENT visual position. Add a colored badge "→ [NewCategory]" on the row. Items re-sort naturally on next page load or explicit "Refresh" click.

---

## Edits

### Edit 1 — ExpenseBulkEditor: After category move, keep item in original group position
**File:** `ExpenseBulkEditor.jsx`
**L290-293** (where row state is updated after successful move): Change to add a `_movedTo` flag instead of changing `categoryId` in groupedRows source:
```js
// BUG-276: Keep in visual position with badge
return {
  ...r,
  _saveStatus: "saved",
  _movedTo: targetCat.name,  // NEW: badge text
  _movedCatId: String(targetCatId),
  // Don't update categoryId/categoryName yet — keeps visual position
};
```

### Edit 2 — ExpenseBulkEditor: Render "→ [Category]" badge on moved rows
**File:** `ExpenseBulkEditor.jsx`
**In row render (around L641):** Add badge after row name:
```jsx
{row._movedTo && (
  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium"
    data-testid={`moved-badge-${row._id}`}>→ {row._movedTo}</span>
)}
```

### Edit 3 — ExpenseBulkEditor: Apply actual category change on refresh/unmount
**File:** `ExpenseBulkEditor.jsx`
**In the `onRefresh` callback or component cleanup:** Update rows that have `_movedTo`:
```js
// BUG-276: Apply deferred category moves on refresh
setRows(prev => prev.map(r => r._movedTo ? {
  ...r, categoryId: r._movedCatId, categoryName: r._movedTo,
  _original: { ...r._original, categoryId: r._movedCatId, categoryName: r._movedTo },
  _movedTo: undefined, _movedCatId: undefined, _saveStatus: undefined,
} : r));
```

### Edit 4 — IngredientBulkEditor: Replace window.confirm with proper Dialog
**File:** `IngredientBulkEditor.jsx`
**L139-142:** Replace `window.confirm()` with Dialog component pattern (matching Expense editor). Add state `showDeleteDialog` and render AlertDialog.

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Expense: Move item to new category → stays in place with badge | Playwright | badge "→ Marketing" visible |
| V2 | Expense: Refresh → moved items now in correct category group | Playwright | items in new group |
| V3 | Ingredient: Delete Selected → proper dialog (not window.confirm) | Playwright | dialog visible |
| V4 | Compile: webpack | log | compiled successfully |

## Rollback
Revert badge/deferred-move logic. Items jump immediately (original behavior).
