# CR-092 — Recipe Tabs: Sort Controls

**ID:** CR-092
**Type:** CR
**Created:** 2026-07-22
**Severity:** P3 (LOW)
**Risk:** LOW
**Module:** Inventory — Recipe Management (RecipeManagementPanel, RecipeTab)
**Duplicate Check:** NONE — new sort feature.
**Code Reality:** NONE — `RecipeManagementPanel.jsx` renders recipe cards in API-returned order. No sort control exists.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (feature gap verified)

---

## Description

The Recipe Management tabs (Standard, Sub, Addon) display recipes in API-returned order (likely creation date). Owner wants sort controls to organize the recipe list:

### Expected Sort Options
- By Name (A→Z, Z→A)
- By Creation Date (newest first, oldest first)
- By Cost (high→low, low→high) — if cost data is available

### Expected UI
- Sort dropdown or button group in the tab toolbar (above recipe cards)
- Sort applies per-tab, or globally

---

## Evidence

- Code: `RecipeManagementPanel.jsx:212` — `recipes={{ standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab]}` passed as-is (unsorted)
- `RecipeTab` component renders cards in received order
- No `sortBy` state or sort function in codebase

---

## Blast Radius

- 1-2 files: `RecipeManagementPanel.jsx`, possibly a shared `RecipeTab.jsx` component (if extracted)
- ~20-25 lines change (sort state + comparator + UI control)
- Scope: SMALL

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Add `sortBy` state to `RecipeManagementPanel.jsx`: `'name_asc' | 'name_desc' | 'date_asc' | 'date_desc'`
2. Add `sortRecipes(recipes, sortBy)` function (client-side sort)
3. Apply sort before passing recipes to `RecipeTab`
4. Add sort dropdown or toggle buttons in tab toolbar

---

## Next
Planning Gate 2 → Gate 3 → Implementation
