# BUG-279 — Ingredient Bulk Editor: Header Not Sticky on Scroll

**ID:** BUG-279
**Type:** BUG
**Created:** 2026-07-29
**Severity:** P2 (MEDIUM — UX confusion)
**Risk:** LOW
**Module:** Inventory — Ingredient Bulk Editor
**Duplicate Check:** DISTINCT
**Code Reality:** CONFIRMED — `<thead>` at L336 has no `sticky` positioning
**Source:** OWNER-REPORTED (screenshot showing header scrolled away)
**Confidence:** HIGH

---

## Description

When scrolling through the 426-item ingredient list in the Bulk Editor, the column header row (INGREDIENT NAME, CATEGORY, BASE UNIT, SMALL UNIT, CONVERSION, MIN QTY, MIN UNIT, STATUS) scrolls away. User loses context of which column is which.

### Root Cause

`IngredientBulkEditor.jsx` L336: `<thead>` has no `sticky` class.

Scroll container at L333: `<div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">` — correct scrollable container, but header isn't pinned.

## Blast Radius

- 1 file: `IngredientBulkEditor.jsx` L336
- ~1 line change
- Hotspot: NO

## Fix

Add `sticky top-0 z-10` to `<thead>`:
```jsx
<thead className="sticky top-0 z-10">
```

The `bg-slate-50` is already on `<tr>` — move to `<thead>` to prevent transparency on scroll.
