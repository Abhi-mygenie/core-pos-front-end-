# BUG-275 — Edit Ingredient: Conversion Factor Pre-Fills to 1 (Should Be Empty When No Conversion)

**ID:** BUG-275
**Type:** BUG
**Created:** 2026-07-29
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Inventory — Ingredient Transform + Edit Form
**Duplicate Check:** RELATED to BUG-226 (conversion factor save) and BUG-265 (help text) — different symptom
**Code Reality:** CONFIRMED — `inventoryTransform.js:18` defaults `Number(x) || 1`
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (code traced)

---

## Description

When editing an ingredient, the conversion factor input pre-fills with `1` even for ingredients that have NO conversion set (e.g., unit=piece, no smallUnit).

### Root Cause

`inventoryTransform.js:18` (fromAPI.ingredients):
```js
conversionFactor: Number(item.converion_factor) || 1
```

The `|| 1` fallback means:
- Backend returns `null` / `0` / `""` / missing → defaults to `1`
- This `1` propagates to `startEdit()` at `InventorySetupPanel.jsx:156`:  
  `conversionFactor: ing.conversionFactor || ''` — but `1` is truthy, so it stays `1`

Same issue at L62 (fromAPI.stockItems).

For items WITHOUT a conversion (no smallUnit), showing `1` is misleading. It should show empty (`''`) so the user knows no conversion is configured.

## Evidence

- Code: `inventoryTransform.js:18` — `|| 1` fallback
- Code: `inventoryTransform.js:62` — same pattern
- Code: `InventorySetupPanel.jsx:156` — `ing.conversionFactor || ''` doesn't catch `1`

## Blast Radius

- 1 file: `inventoryTransform.js` (L18 + L62)
- 2 lines changed
- Hotspot: NO
- Scope: SMALL

## Owner Decisions (2026-07-29 — CONFIRMED)

1. **kg/ltr/litre → gm/ml:** Don't show conversion factor. Don't send `converion_factor` or `consumption_unit`. DO send `small_unit`. Backend handles 1000.
2. **gm/ml (already small):** No conversion, no small unit field. Hide both.
3. **Other units (piece, pkt, bottle, etc.):** User picks small unit + enters conversion factor. Both editable.
4. **Small unit dropdown: read-only** when auto-mapped (kg→gm, ltr→ml). Editable for custom combos.
5. Same rules for ADD and EDIT forms.
6. No downstream code divides by conversionFactor — safe to change.

## Revised Fix Plan (scope expanded: 2 files, ~30 lines)

### `inventoryTransform.js` L18, L62:
```js
conversionFactor: item.has_unit_conversion ? (Number(item.converion_factor) || '') : '',
```

### `InventorySetupPanel.jsx` — ADD + EDIT forms:
- `AUTO_UNITS = {kg:'gm', ltr:'ml', litre:'ml'}` — conversion hidden, small unit read-only
- `NO_CONV_UNITS = ['gm','ml']` — no conversion, no small unit shown
- Other units → both fields editable

### `inventoryTransform.js` toAPI — skip `converion_factor` + `consumption_unit` for auto/no-conv units
