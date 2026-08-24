# Impact Analysis — BUG-275: Conversion Factor Pre-Fills to 1 + Conditional Field Visibility

**ID:** BUG-275
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-29
**Code Reality:** NONE (fix not started)
**Conflict Pre-Check:** `inventoryTransform.js` — no other open items touch L18/L62. `InventorySetupPanel.jsx` — BUG-269 IMPLEMENTED (different lines L309/365 onChange handlers). No conflict.
**Risk:** LOW

---

## Owner-Confirmed Rules (2026-07-29)

| Unit | Small Unit | Conversion Factor | Send to Backend |
|---|---|---|---|
| **kg** | gm (auto, **read-only**) | **Hidden** | send `small_unit: 'gm'`, NO `converion_factor`, NO `consumption_unit` |
| **ltr / litre** | ml (auto, **read-only**) | **Hidden** | send `small_unit: 'ml'`, NO `converion_factor`, NO `consumption_unit` |
| **gm / ml** | **Hidden** (already small) | **Hidden** | No conversion keys at all |
| **Other** (piece, pkt, bottle, etc.) | **Editable** dropdown | **Editable** input | send all keys when filled |

---

## Data Flow Trace

### Current (broken)
```
Backend: item.converion_factor = null/0/"" (no conversion)
  → fromAPI L18: Number(null) || 1 = 1  ← WRONG DEFAULT
  → ing.conversionFactor = 1
  → startEdit L156: editIng.conversionFactor = 1 || '' = 1
  → Edit form shows "1" in conversion input ← USER SEES WRONG VALUE

Backend: item.converion_factor = 1000 (kg→gm)
  → fromAPI L18: Number(1000) || 1 = 1000  ← CORRECT
  → BUT: conversion field should be HIDDEN for kg/ltr (backend handles it)
```

### Required
```
Backend: item.converion_factor = null/0/"" AND has_unit_conversion = false
  → fromAPI: conversionFactor = ''  (empty)
  → UI: conversion field + small unit field HIDDEN (for gm/ml units)
  → UI: conversion field HIDDEN, small unit READ-ONLY (for kg/ltr/litre)

Backend: item.converion_factor = 1000 AND unit=kg
  → fromAPI: conversionFactor = 1000 (but UI won't show it — backend handles)
  → toAPI: DON'T send converion_factor or consumption_unit

Backend: item.converion_factor = 5 AND unit=bottle, smallUnit=ml
  → fromAPI: conversionFactor = 5
  → UI: both fields shown and editable
  → toAPI: send converion_factor + consumption_unit
```

## Affected Files

### 1. `inventoryTransform.js`
- **L18** (fromAPI.ingredients): `Number(x) || 1` → `item.has_unit_conversion ? (Number(x) || '') : ''`
- **L62** (fromAPI.stockItems): same fix
- **L131** (toAPI.addIngredient hasConversion guard): add `AUTO_UNITS` skip for kg/ltr/gm/ml
- **L150** (toAPI.updateIngredient hasConversion guard): same

### 2. `InventorySetupPanel.jsx`
- **L16**: Extend constants — add `NO_CONV_UNITS` set
- **L313-317** (ADD form conversion field): conditionally render based on unit
- **L318-324** (ADD form small unit field): read-only span for auto-mapped, hidden for gm/ml
- **L370-374** (EDIT form conversion field): same conditional
- **L375-381** (EDIT form small unit field): same conditional
- **L309** (ADD form unit onChange): clear conversionFactor when auto-mapped
- **L365** (EDIT form unit onChange): same

## Downstream
- `purchasePlanner.js`: reads `conversionFactor` for unit conversion — uses `|| 1` fallback itself, safe
- `RecipeFormPanel.jsx`: reads ingredient `conversionFactor` — display only, safe
- `BulkEditor.jsx` (IngredientBulkEditor): reads `conversionFactor` from transform — will inherit fix

## No Dependencies on Other Session Items
- BUG-269 (IMPLEMENTED): touched same file different lines (unit onChange). This extends that work. No conflict.

---
