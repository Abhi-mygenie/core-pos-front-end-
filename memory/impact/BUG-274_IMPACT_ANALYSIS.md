# Impact Analysis — BUG-274: Bulk Delete Not Working in Ingredient Bulk Editor

**ID:** BUG-274
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-29
**Code Reality:** NONE (fix not started)
**Conflict Pre-Check:** BUG-276 also touches `IngredientBulkEditor.jsx` — EXECUTION ORDER: BUG-274 FIRST, then BUG-276
**Risk:** LOW

---

## Data Flow Trace

```
User: Select items → "Delete Selected" button
  → deleteSelected() L139-142: marks rows _deleted=true in state (NO API call)
  → UI: rows hidden from filtered list (L69/71)
  
User: Click "Save"
  → Save button L294: disabled={dirtyCount === 0}
  → dirtyCount L89: rows.filter(r => !r._deleted && isDirty(r)).length  ← EXCLUDES deleted
  → When only deletes: dirtyCount = 0 → BUTTON DISABLED → user can't click
  
  IF button somehow clicked (e.g., other edits exist):
  → handleSave() L147: dirty = rows.filter(r => !r._deleted && isDirty(r))
  → L148: if (!dirty.length) return "No changes to save"  ← BLOCKS when only deletes
  → L160-170: actual delete API calls → NEVER REACHED
```

**3 layers broken:**
1. Save button disabled (dirtyCount excludes deletes)
2. handleSave early return (dirty excludes deletes)
3. Badge text wrong ("0 unsaved" after marking deletions)

**Same bug for single-row trash icon** (`deleteRow` L122-124) — marks `_deleted`, same flow.

## Affected Files
- `IngredientBulkEditor.jsx` — L89 (dirtyCount), L147-148 (handleSave), L294/460 (button disabled)

## Fix Summary
1. L89: `dirtyCount` → also count rows with `_deleted && _id` (pending deletes)
2. L147-148: move `toDelete` before early return, check `!dirty.length && !toDelete.length`
3. Button text: reflect pending deletes in count

## Downstream
- `inventoryService.deleteIngredient(id)` — single-item DELETE API
- BUG-218 delete-blocker dialog (used-in-recipes guard) — still works per-item

---
