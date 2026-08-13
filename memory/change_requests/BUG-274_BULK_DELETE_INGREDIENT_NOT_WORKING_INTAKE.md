# BUG-274 — Bulk Delete in Ingredient Bulk Editor Not Working (handleSave Early Return)

**ID:** BUG-274
**Type:** BUG
**Created:** 2026-07-29
**Severity:** P1 (HIGH)
**Risk:** LOW
**Module:** Inventory — Ingredient Bulk Editor
**Duplicate Check:** DISTINCT
**Code Reality:** CONFIRMED — `IngredientBulkEditor.jsx:147-148` early return blocks delete processing
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (code traced)

---

## Description

Bulk delete in the Ingredient Bulk Editor silently fails. User selects items → clicks "Delete Selected" → rows visually disappear (strikethrough) → clicks Save → gets "No changes to save" toast → nothing deleted.

### Root Cause

`IngredientBulkEditor.jsx` `handleSave()`:
- **L139-142:** `deleteSelected()` marks rows as `_deleted: true` in local state only (no API call)
- **L147:** `dirty = rows.filter(r => !r._deleted && isDirty(r))` — this **EXCLUDES** deleted rows
- **L148:** `if (!dirty.length) return` — when ONLY deletes and no edits, `dirty` is empty → early return
- **L160-170:** Actual delete API calls — **NEVER REACHED** when there are no edits

The delete processing at L160-170 is correct but unreachable when the user only deletes without editing other rows.

## Evidence

- Code: `IngredientBulkEditor.jsx:147-148` — early return excludes delete-only saves
- Code: `IngredientBulkEditor.jsx:160-170` — delete processing exists but never reached

## Blast Radius

- 1 file: `IngredientBulkEditor.jsx`
- ~2 lines changed (fix the early return check)
- Hotspot: NO
- Scope: SMALL

## Fix

Change L147-148 from:
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

Also need to remove the duplicate `toDelete` declaration at L161 (move it before the early return).

## Owner Questions

1. BUG-268 reported that ALL ingredient EDITS fail with HTTP 500 (audit_logs.id missing AUTO_INCREMENT). **Does the single-item DELETE endpoint also hit the same audit_logs table?** If yes, bulk delete will still fail at the API level even after this FE fix — would be BACKEND-BLOCKED.
2. Should the "Delete Selected" button call the API immediately instead of waiting for Save? (Current UX: mark + save. Alternative: delete immediately on click.)
