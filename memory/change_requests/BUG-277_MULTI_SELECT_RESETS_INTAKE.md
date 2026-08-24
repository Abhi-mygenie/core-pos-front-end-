# BUG-277 — Ingredient Bulk Editor: Multi-Select Checkbox Resets on 2nd Row Click

**ID:** BUG-277
**Type:** BUG
**Created:** 2026-07-29
**Severity:** P1 (HIGH — blocks bulk operations)
**Risk:** LOW
**Module:** Inventory — Ingredient Bulk Editor
**Duplicate Check:** DISTINCT (pre-existing, surfaced during BUG-274 testing)
**Code Reality:** CONFIRMED — `useEffect` at L65-67 wipes selection on `allItems` prop reference change
**Source:** TESTING-AGENT-FOUND + OWNER-CONFIRMED
**Confidence:** HIGH

---

## Description

When user clicks checkbox on a 2nd ingredient row, the 1st selection resets. The "N selected" banner flashes back to 0. User can only effectively select 1 row at a time.

### Root Cause

`IngredientBulkEditor.jsx` L65-67:
```js
useEffect(() => {
    setRows(allItems.map(buildRow));
    setSelected(new Set());  // ← WIPES selection
}, [allItems]);
```

`[allItems]` dependency fires on every **reference change**, not data change. Parent creates a new array on each render (e.g., `allItems={ingredients.map(...)}`). So ANY state update that triggers parent re-render → new `allItems` reference → useEffect fires → selection wiped.

## Blast Radius

- 1 file: `IngredientBulkEditor.jsx` L65-67
- ~5 lines (stable ID comparison guard)
- Hotspot: NO

## Fix

Guard with stable ID comparison — only reset rows + selection if actual ingredient IDs changed:
```js
useEffect(() => {
    const newIds = allItems.map(i => i.id).join(',');
    const oldIds = rows.filter(r => !r._isNew).map(r => r._id).join(',');
    if (newIds !== oldIds) {
        setRows(allItems.map(buildRow));
        setSelected(new Set());
    }
}, [allItems]);
```
