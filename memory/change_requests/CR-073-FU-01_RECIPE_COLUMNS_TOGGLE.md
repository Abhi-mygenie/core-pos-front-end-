# CR-073-FU-01: Recipe Bulk Editor — Column Visibility Toggle (Missing Scope)

**ID:** CR-073-FU-01
**Type:** CR (Follow-Up — missing feature from CR-073 original spec)
**Priority:** P2 (MEDIUM — feature gap vs mockup, not blocking core usage)
**Risk:** MEDIUM (new UI state management, new component)
**Sprint:** POS 5.0
**Source:** QA-FOUND (CR-073 mockup comparison 2026-07-19)
**Parent:** CR-073

---

## Description

The frozen mockups (`recipe_bulk_editor_mockup.html` + `cr072-inventory-mockup-v5-full.html#screen-recipes`) both show a **"Columns 10"** button in the toolbar that opens a column visibility toggle dropdown — allowing users to show/hide columns in the bulk editor grid.

This feature was explicitly listed in the CR-073 intake doc:
- "Column visibility toggles (same as Menu 'Columns' dropdown)"
- "Toolbar: Search, **Columns toggle**, Excel export, Import, + Add Recipe, Batch Save"

The feature was NOT implemented in `RecipeBulkEditor.jsx`. The toolbar has Search, Excel, Import, Add Recipe, Save — but no Columns button.

---

## Code Reality: NONE

No column toggle code exists in `RecipeBulkEditor.jsx`. The Menu Management `BulkEditor.jsx` (1066 lines) has this feature and can serve as the reference pattern.

---

## Duplicate Check: DISTINCT

No existing CR or BUG covers recipe bulk editor column toggle. CR-036-FU-02 covered Menu BulkEditor column reorder (different component).

---

## Evidence

- **Standalone mockup:** `__dev/recipe_bulk_editor_mockup.html` line 65 — `Columns <span>10</span>` button in toolbar
- **V5 mockup:** `cr072-inventory-mockup-v5-full.html` screen-recipes toolbar — same Columns button
- **Live:** No Columns button in toolbar (verified via screenshot 2026-07-19)
- **CR-073 intake:** Lines 7, 98 explicitly list column visibility toggles as key feature

---

## Reference Pattern

`BulkEditor.jsx` (Menu Management) has:
- `visibleColumns` state (Set of column keys)
- `ALL_COLUMNS` array defining all available columns with labels
- Dropdown popover with checkboxes for each column
- Column count badge on button
- Grid dynamically hides/shows `<th>`/`<td>` based on visibility

---

## Blast Radius

- **New code:** ~50-80 lines in `RecipeBulkEditor.jsx` (column state, toggle dropdown, grid filter)
- **Modified files:** 1 (`RecipeBulkEditor.jsx`)
- **Hotspot files:** NO
- **Estimated scope:** MEDIUM

---

## Planning Skip Eligibility: NO

- Exceeds ≤10 lines
- New UI behavior + state management
- **Full gate flow required (Gate 2-3)**

---

## Next: Planning Gate 2 (Impact Analysis) → Gate 3 (Plan)
