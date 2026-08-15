# BUG-322 — Intake
# Recipe Form: SearchableSelect Ingredient Dropdown Clipped by `overflow-hidden` Table Container

**Date:** 2026-08-14
**Source:** OWNER-REPORTED (2× screenshots + verbal description)
**Confidence:** CONFIRMED (code trace — root cause at exact line numbers)
**Duplicate check:** DISTINCT
- Related: BUG-236 ("Smart Purchase — Ad-hoc Typeahead Clipped by overflow-hidden") — **same root pattern, different screen**
- Related: BUG-238 ("Recipe Form — Replace Plain `<select>` with Searchable Combobox") — **introduced `SearchableSelect`; overflow-hidden gap not caught at the time**
- No prior bug about recipe form ingredient dropdown clipping

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Severity | **P1 — HIGH** — ingredient selection broken on ALL recipe forms (sub, standard, addon); no workaround |
| Risk | **LOW** — 1 file, 1 local component, ~12 lines, no API change, not a hotspot file, not financial |
| Fast Lane eligible | YES — LOW risk, 1 file, ≤10 changed lines, no API/state/financial/hotspot — **owner must approve** |
| Sprint | pos_5_1 |

---

## Description

When adding or editing any recipe (sub-recipe, standard recipe, addon recipe) on the
`/recipes` screen, the **ingredient row dropdown** ("Search ingredient...") opens but is
**immediately clipped** to the bounds of its parent container — showing only 1–2 items and
cutting off the rest of the list. The in-dropdown search box and the `X` (clear) button are
also inaccessible when the list is clipped.

**Root cause (exact lines):**

| Location | Code | Problem |
|---|---|---|
| `RecipeFormPanel.jsx:46` | `className="absolute z-50 top-full mt-1 ..."` | Dropdown uses `position: absolute` |
| `RecipeFormPanel.jsx:305` | `className="... overflow-hidden mb-5"` | Ingredient table container clips all absolutely-positioned children |

`overflow-hidden` on a block ancestor clips every `position: absolute` descendant —
the dropdown is constrained to the container rectangle regardless of `z-index`.

**Why the Addon Item / Menu Item dropdowns work (screenshot 2 — "working"):**
Those `SearchableSelect` instances (lines 243, 258) are inside the **top card** (line 227):
`<div class="... p-5 mb-5">` — which has **no `overflow-hidden`**. The absolute dropdown
escapes freely.

---

## Owner Screenshots

| Screenshot | Screen | Status | Observation |
|---|---|---|---|
| Screenshot 1 | Sub-Recipe form → ingredient row | ❌ Broken | Dropdown opens but shows only 1–2 items, cut off at container edge |
| Screenshot 2 | Addon Recipe → Addon Item (top card) | ✅ Working | Full dropdown list visible with search |

---

## Code Reality

| Status | Details |
|---|---|
| **NONE** | No fix exists. `position: absolute` at L46 unchanged since BUG-238 shipped. No `position:fixed`, no `getBoundingClientRect`, no `dropPos` state anywhere in `RecipeFormPanel.jsx`. |

```
RecipeFormPanel.jsx:11  // BUG-238: Searchable select replacing plain <select> dropdowns for large lists
RecipeFormPanel.jsx:46  className="absolute z-50 top-full mt-1 w-full ..."   ← BROKEN: absolute inside overflow-hidden
RecipeFormPanel.jsx:305 className="... overflow-hidden mb-5"                  ← CLIPS child absolute dropdowns
```

---

## Affected Screens (all confirmed)

| Screen | Trigger | Broken? |
|---|---|---|
| Create/Edit **Sub-Recipe** → ingredient rows | `SearchableSelect` L328 inside `overflow-hidden` L305 | ✅ **BROKEN** |
| Create/Edit **Standard Recipe** → ingredient rows | same | ✅ **BROKEN** |
| Create/Edit **Addon Recipe** → ingredient rows | same | ✅ **BROKEN** |
| "Cancel pop-up" = `X` clear-search button inside dropdown | inside same clipped dropdown | ✅ **BROKEN** (inaccessible) |
| Create/Edit **Addon Recipe** → Addon Item (top card) | `SearchableSelect` L243, NO overflow-hidden parent | ✅ Working |
| Create/Edit **Standard Recipe** → Menu Item (top card) | `SearchableSelect` L258, NO overflow-hidden parent | ✅ Working |

---

## Evidence

- **Screenshots (owner-provided):** Screenshot 1 = broken ingredient dropdown (clipped list);
  Screenshot 2 = working addon item dropdown (full list)
- **Code trace:** `RecipeFormPanel.jsx:46` (absolute) vs `RecipeFormPanel.jsx:305` (overflow-hidden parent)
- **Investigation report:** `/app/memory/BUG-322_SEARCHABLESELECT_OVERFLOW_INVESTIGATION.md`
- **Confidence:** CONFIRMED — reproducible by opening any recipe form and clicking an ingredient row dropdown

---

## Blast Radius

```bash
# Files referencing RecipeFormPanel or SearchableSelect:
# RecipeFormPanel.jsx    — 364 lines, 1 local component (SearchableSelect)
# RecipeManagementPanel.jsx — mounts RecipeFormPanel, no change needed
# All other files — NONE
```

- Blast radius: **SMALL** — 1 file (`RecipeFormPanel.jsx`), 1 local component
- Hotspot files touched: **NO**
- Estimated scope: 1 file, ~12 lines changed in `SearchableSelect` function only

---

## Proposed Fix (from investigation — owner must Gate-4 GO)

**Pattern:** identical to BUG-311 Layer 1 `IngredientNameCombobox` (shipped 2026-08-14, verified).

Change `SearchableSelect` (lines 12–82) to use `position: fixed` + `getBoundingClientRect()`
on the trigger button instead of `position: absolute`.

| Edit | File | Line | Current → New |
|---|---|---|---|
| 1 | `RecipeFormPanel.jsx` | L13–16 | Add `dropPos` state + rename `containerRef` → `triggerRef` (ref moves to trigger button) |
| 2 | `RecipeFormPanel.jsx` | L37–44 | Add `openDrop()` fn that reads `triggerRef.getBoundingClientRect()` |
| 3 | `RecipeFormPanel.jsx` | L37 (trigger button) | `onClick={() => setOpen(o=>!o)}` → `onClick={() => open ? setOpen(false) : openDrop()}`, add `ref={triggerRef}` |
| 4 | `RecipeFormPanel.jsx` | L46 | `className="absolute z-50 top-full ..."` → `style={{ position:'fixed', top:dropPos.top, left:dropPos.left, width:dropPos.width, zIndex:9999 }}` |

**Risk:** LOW. Fast Lane eligible (owner approval needed).
**All 3 recipe types fixed by 1 edit** — single local component.

---

## Open Questions

None — fix pattern is clear and proven. No owner decision needed beyond Gate 4 GO.

---

## Owner Decisions Needed

1. **Gate 4 GO** — approve Fast Lane implementation (1 file, ~12 lines)

