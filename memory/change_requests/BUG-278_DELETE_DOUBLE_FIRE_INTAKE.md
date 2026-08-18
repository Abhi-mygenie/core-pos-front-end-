# BUG-278 — Ingredient Bulk Editor: DELETE API Called Twice Per Ingredient (400 Bad Request)

**ID:** BUG-278
**Type:** BUG
**Created:** 2026-07-29
**Severity:** P1 (HIGH — causes false error toasts)
**Risk:** LOW
**Module:** Inventory — Ingredient Bulk Editor
**Duplicate Check:** DISTINCT
**Code Reality:** CONFIRMED — two Save buttons can fire `handleSave` before async state disable
**Source:** OWNER-REPORTED (screenshot: 8 network requests for 4 ingredients, 400 errors)
**Confidence:** MEDIUM (hypothesis needs ref-guard verification)

---

## Description

When saving ingredient deletions, each DELETE API call fires TWICE. First call succeeds, second returns HTTP 400 (ingredient already deleted). Network panel shows: 1155×2, 1156×2, 3089×2, 3265×2.

### Root Cause

Two Save buttons exist: toolbar (L300) + footer (L466). Both call `handleSave`. The `disabled={saving}` guard uses React **state** — state updates are async. If both buttons are accessible (e.g., tall screen shows both), or if React batches a re-render late:

1. Click Save → `handleSave()` starts → `setSaving(true)` queued (async)
2. Before re-render disables button → second click/trigger → `handleSave()` starts again
3. Both loops iterate same `toDelete` → 8 DELETE calls instead of 4

### Alternative Hypothesis

The `allItems` useEffect (BUG-277) could rebuild `rows` mid-save, but this is less likely since `saving` state should prevent user interaction.

## Blast Radius

- 1 file: `IngredientBulkEditor.jsx` — add `useRef` guard at top of `handleSave`
- ~3 lines
- Hotspot: NO

## Fix

Add re-entry guard using `useRef` (synchronous, not subject to batching):
```js
const saveInProgress = useRef(false);
const handleSave = async () => {
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    try { ... } finally { saveInProgress.current = false; }
};
```
