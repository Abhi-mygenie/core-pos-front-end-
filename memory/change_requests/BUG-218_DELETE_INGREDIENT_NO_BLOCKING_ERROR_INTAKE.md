# BUG-218 — Delete Ingredient: No Blocking Error When Used in Recipe

**ID:** BUG-218
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Ingredients Setup (InventorySetupPanel)
**Duplicate Check:** RELATED to BUG-201 (Expense deletion safety — same pattern). DISTINCT: ingredients module, no impact-check endpoint built yet.
**Code Reality:** NONE — `InventorySetupPanel.jsx:86-93` calls `deleteIngredient(id)` directly with only `window.confirm()`. Zero pre-delete check for recipe usage. Any API error shows a generic toast.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

The **Delete** button on an ingredient immediately fires the delete API call (after a generic `window.confirm()`). There is no check whether the ingredient is used in one or more recipes. If the backend allows deletion (or if it returns a generic error), the ingredient could be deleted silently, breaking all recipes that reference it.

Expected behavior (per BUG-201 pattern): Before delete, show a modal listing which recipes use this ingredient, and require owner to confirm deletion or cancel.

---

## Evidence

- Code: `InventorySetupPanel.jsx:86-93` — `deleteIngredient` function, no impact check
- Code: `InventorySetupPanel.jsx:87` — only `window.confirm()` guard, no recipe-usage lookup
- Contrast: BUG-201 implemented `GET /expense/item/{id}/impact` before delete
- Backend: need to check if `/inventory/delete/{id}` returns 422 when ingredient is in use, or just deletes

---

## Blast Radius

- 2-3 files: `InventorySetupPanel.jsx`, `inventoryService.js`, possibly `constants.js`
- ~30-40 lines change (impact-check call, modal/confirm dialog)
- Hotspot: NO (well-defined pattern from BUG-201)
- Scope: MEDIUM (2-3 files, new modal logic)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Curl-verify: does `DELETE /api/v2/vendoremployee/inventory/{id}` allow deleting ingredient in use? Does it return impact info?
2. If backend has impact endpoint: wire it as pre-delete check (BUG-201 pattern)
3. If not: add `GET` call to recipe list, filter by ingredient_id, count matches
4. Show blocking modal: "This ingredient is used in X recipes: [list]. Deleting will break those recipes." with Cancel/Force Delete options
5. Replace `window.confirm()` with proper Dialog component

---

## Next
Planning Gate 2 → Gate 3 → Implementation
