# Impact Analysis — BUG-276: Bulk Editor UX — Category Move Jump + Inconsistent Delete

**ID:** BUG-276
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-29
**Code Reality:** NONE (no UX fix started)
**Conflict Pre-Check:** `IngredientBulkEditor.jsx` also touched by BUG-274 — EXECUTION ORDER: BUG-274 FIRST (fix core delete), then BUG-276 (UX polish). `ExpenseBulkEditor.jsx` no other open items.
**Risk:** LOW

---

## Problem Trace

### Expense Bulk Editor — Category Move Jump
```
User selects 2 items in "Bills" category → "Move to Category" → picks "Marketing"
  → bulkMoveConfirmed() L236-300: API calls succeed
  → L290-293: row.categoryName = "Marketing", _saveStatus = "saved"
  → groupedRows useMemo L86-118 re-computes:
    - Groups by categoryName, sorts alphabetically
    - Items now in "Marketing" group instead of "Bills"
    - "Marketing" group may be far down the list
  → User sees items VANISH from "Bills" section
  → Items appear under "Marketing" — but user may not scroll there
  → No visual cue, no scroll, no highlight
```

### Expense Bulk Editor — Delete
```
User selects items → "Delete Selected" → confirmation dialog → bulkDeleteConfirmed()
  → L203-229: API calls immediately (good — different from ingredient editor)
  → L212: Successful rows REMOVED from state (.filter)
  → Remaining rows shift up
  → Toast: "N items removed" (good)
  → BUT: no fade-out animation, rows just vanish
```

### Ingredient Bulk Editor — Delete (BUG-274 core bug)
```
  → deleteSelected() marks _deleted (no API)
  → Save button disabled (dirtyCount excludes deletes)
  → Even if Save works: API calls one-by-one with no progress indicator
  → Uses window.confirm() instead of proper dialog
```

## Affected Files

### ExpenseBulkEditor.jsx
- L86-118: `groupedRows` — after category move, items jump
- L203-229: `bulkDeleteConfirmed` — works but no animation

### IngredientBulkEditor.jsx
- L139-143: `deleteSelected` — needs confirmation dialog (not window.confirm)
- After BUG-274 fix: delete will work, but same "no animation" issue

## UX Improvement Options

### Option A: Keep-in-Place (Minimal — recommended for speed)
After category move: keep item in its CURRENT visual position with a colored badge "→ Marketing". Re-sort only on next page load or explicit refresh. User sees exactly what happened.

### Option B: Re-sort + Scroll + Highlight (Polished)
After category move: re-sort (current behavior), then auto-scroll to moved item and flash-highlight (green pulse 2s). More complex, needs scroll ref tracking.

### Option C: Deferred Re-sort (Middle ground)
After category move: keep in place with badge. Add a "Refresh" button or auto-refresh after 3s idle.

### Shared improvements (both editors):
1. **Fade-out on delete** — 300ms opacity transition before DOM removal
2. **Consistent confirmation dialogs** — ingredient editor should use Dialog component (like expense)
3. **Progress indicator** — show saving/deleting spinner per-row during bulk operations

## Dependencies
- **BUG-274 MUST be done first** — fixes core delete in IngredientBulkEditor
- BUG-276 then polishes UX on top of the working delete

---
