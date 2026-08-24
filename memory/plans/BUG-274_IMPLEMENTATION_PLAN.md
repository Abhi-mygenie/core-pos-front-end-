# Implementation Plan — BUG-274 (Bulk Delete Not Working in Ingredient Bulk Editor)

**ID:** BUG-274
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 3 (before BUG-276)
**Risk:** LOW
**Files:** 1 | **Lines changed:** ~8

---

## Step 0 — Starting Code State

**File:** `src/components/inventory/IngredientBulkEditor.jsx`

**L89 today:**
```js
  const dirtyCount = useMemo(() => rows.filter(r => !r._deleted && isDirty(r)).length, [rows]);
```

**L147-148 today:**
```js
    const dirty = rows.filter(r => !r._deleted && isDirty(r));
    if (!dirty.length) { toast.info('No changes to save'); return; }
```

**L161 today:**
```js
    const toDelete = rows.filter(r => r._deleted && r._id);
```

**L294 today (Save button, toolbar):**
```js
    onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save">
```

**L460 today (Save button, footer):**
```js
    onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save-footer">
```

---

## Edits

### Edit 1 — Fix dirtyCount to include pending deletes
**File:** `IngredientBulkEditor.jsx`
**L89:** change from:
```js
  const dirtyCount = useMemo(() => rows.filter(r => !r._deleted && isDirty(r)).length, [rows]);
```
To:
```js
  const dirtyCount = useMemo(() => rows.filter(r => (!r._deleted && isDirty(r)) || (r._deleted && r._id)).length, [rows]);
```

### Edit 2 — Fix handleSave early return to check for pending deletes
**File:** `IngredientBulkEditor.jsx`
**L147-148:** change from:
```js
    const dirty = rows.filter(r => !r._deleted && isDirty(r));
    if (!dirty.length) { toast.info('No changes to save'); return; }
```
To:
```js
    const dirty = rows.filter(r => !r._deleted && isDirty(r));
    const toDelete = rows.filter(r => r._deleted && r._id);
    if (!dirty.length && !toDelete.length) { toast.info('No changes to save'); return; }
```

### Edit 3 — Remove duplicate toDelete declaration
**File:** `IngredientBulkEditor.jsx`
**L161:** Remove (now redundant since toDelete is declared at L148):
```js
    const toDelete = rows.filter(r => r._deleted && r._id);
```

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: dirtyCount includes `r._deleted && r._id` | grep | present |
| V2 | Code: early return checks `toDelete.length` | grep | present |
| V3 | Compile: webpack | log | compiled successfully |
| V4 | Runtime: Select ingredients → "Delete Selected" → Save button ENABLED | Playwright | button not disabled |
| V5 | Runtime: Click Save → delete API called → rows removed | Playwright + Network | DELETE requests sent |
| V6 | Runtime: Single-row trash → Save → delete works | Playwright | row deleted |

## Rollback
Revert 3 edits. Save button re-disables on delete-only operations.
