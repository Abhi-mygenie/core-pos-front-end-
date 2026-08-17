# BUG-226 — Conversion Factor Not Saved on Add or Edit Ingredient

**ID:** BUG-226
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Ingredients Setup (inventoryTransform.js — ADD path)
**Duplicate Check:** RELATED to BUG-212 (BUG-212 fixed edit form — 7 fields including conversionFactor). DISTINCT: BUG-212 fixed the UI. BUG-226 is about the transform layer: `addIngredient()` still does NOT send `converion_factor` in its payload.
**Code Reality:** CONFIRMED — `inventoryTransform.js:128-136`: `addIngredient()` payload omits `converion_factor` entirely. Edit path (`updateIngredient`, line 146) sends `converion_factor: String(data.conversionFactor || 1)` — `|| 1` fallback may silently override a user-entered `0`.
**Source:** OWNER-REPORTED (session 2026-07-22, verbatim: "conversion factor is not working in add and edit both")
**Confidence:** CONFIRMED (code verified — add payload missing field, edit has `|| 1` issue)

---

## Description

### ADD Path (CONFIRMED BUG)
`inventoryTransform.js` `toAPI.addIngredient()` sends:
```
{ category_id, stock_title, unit, small_unit, minimun_stock_alert, min_unit_alert }
```
`converion_factor` is **completely absent** from the ADD payload. No matter what owner enters in the "Factor" field, it is never sent to the backend when creating a new ingredient.

### EDIT Path (POTENTIAL BUG)
`toAPI.updateIngredient()` sends:
```
converion_factor: String(data.conversionFactor || 1)
```
The `|| 1` fallback means:
- If owner enters `0` → becomes `1` (wrong)
- If owner clears the field → becomes `1` (wrong)
- If owner enters `3` → `'3'` (correct)

---

## Evidence

- Code: `inventoryTransform.js:128-136` — `addIngredient()` body, no `converion_factor` key
- Code: `inventoryTransform.js:146` — `updateIngredient()`, `|| 1` fallback
- Code: `InventorySetupPanel.jsx:104` — calls `inventoryService.addIngredient(newIng)` with full `newIng` object including `conversionFactor`
- The transform discards `conversionFactor` on ADD — it never reaches the backend
- Owner-reported: conversion factor not saving on add AND edit

---

## Blast Radius

- 1 file: `inventoryTransform.js`
- ~5 lines change (add `converion_factor` to ADD payload; fix `|| 1` to `|| ''` or `|| 0`)
- Hotspot: YES (R9 typo `converion_factor` must be preserved exactly — backend contract)
- Scope: SMALL (1 file, but high-risk due to R9 typo preservation requirement)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. In `toAPI.addIngredient()`: add `converion_factor: String(data.conversionFactor || '')` to the payload object
2. In `toAPI.updateIngredient()`: change `|| 1` to `|| ''` — let backend decide default, don't override with `1`
3. Preserve R9 typo `converion_factor` (backend contract requires misspelling)
4. Regression: run BUG-212 test suite to verify edit still works

---

## Next
Planning Gate 2 → Gate 3 → Implementation
