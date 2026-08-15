# Implementation Plan — BUG-275 (Conversion Factor Visibility + Default Fix)

**ID:** BUG-275
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-29
**Execution Phase:** 2 (Independent)
**Risk:** LOW
**Files:** 2 | **Lines changed:** ~40

---

## Step 0 — Starting Code State

**File 1:** `src/api/transforms/inventoryTransform.js`
**L18:** `conversionFactor: Number(item.converion_factor) || 1,`
**L19:** `hasUnitConversion: !!item.has_unit_conversion,`
**L62:** `conversionFactor: Number(item.converion_factor) || 1,`
**L63:** `hasUnitConversion: !!item.has_unit_conversion,`

**File 2:** `src/components/inventory/InventorySetupPanel.jsx`
**L16:** `const UNIT_SMALL_MAP = { kg: 'gm', ltr: 'ml', litre: 'ml' };`
**L313-317:** ADD form conversion factor input (always shown)
**L318-324:** ADD form small unit dropdown (always shown, editable)
**L370-374:** EDIT form conversion factor input (always shown)
**L375-381:** EDIT form small unit dropdown (always shown, editable)

---

## Owner-Confirmed Rules

| Unit | Small Unit | Conv Factor | Send conv keys? |
|---|---|---|---|
| kg | gm (auto, read-only) | Hidden | NO conv keys. YES small_unit |
| ltr/litre | ml (auto, read-only) | Hidden | NO conv keys. YES small_unit |
| gm/ml | Hidden | Hidden | NO conv keys |
| Other | Editable dropdown | Editable input | YES when filled |

---

## Edits

### Edit 1 — Fix fromAPI default: `|| 1` → conditional
**File:** `inventoryTransform.js`
**L18:** change:
```js
      conversionFactor: Number(item.converion_factor) || 1, // R9 typo: converion_factor
```
To:
```js
      conversionFactor: item.has_unit_conversion ? (Number(item.converion_factor) || '') : '', // BUG-275: no default 1
```

### Edit 2 — Same fix at L62 (stockItems)
**File:** `inventoryTransform.js`
**L62:** same change pattern.

### Edit 3 — Add constants for unit visibility rules
**File:** `InventorySetupPanel.jsx`
**After L16** (UNIT_SMALL_MAP), add:
```js
const AUTO_CONV_UNITS = new Set(['kg', 'ltr', 'litre']); // BUG-275: backend handles conversion (1000)
const NO_CONV_UNITS = new Set(['gm', 'ml']); // BUG-275: already small, no conversion
```

### Edit 4 — ADD form: conditionally render conversion factor
**File:** `InventorySetupPanel.jsx`
**L313-317** (conversion factor `<td>`): wrap in condition:
```jsx
<td className="py-2 px-4 text-center">
  {!AUTO_CONV_UNITS.has(newIng.unit) && !NO_CONV_UNITS.has(newIng.unit) ? (
    <Input type="number" value={newIng.conversionFactor} onChange={...} ... />
  ) : (
    <span className="text-xs text-slate-400">—</span>
  )}
</td>
```

### Edit 5 — ADD form: conditionally render small unit
**File:** `InventorySetupPanel.jsx`
**L318-324** (small unit `<td>`): wrap in condition:
```jsx
<td className="py-2 px-4 text-center">
  {NO_CONV_UNITS.has(newIng.unit) ? (
    <span className="text-xs text-slate-400">—</span>
  ) : AUTO_CONV_UNITS.has(newIng.unit) ? (
    <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
      data-testid="new-ingredient-small-unit">{UNIT_SMALL_MAP[newIng.unit] || '—'}</span>
  ) : (
    <select ...>{/* existing dropdown */}</select>
  )}
</td>
```

### Edit 6 — EDIT form: same conditional for conversion factor (L370-374)

### Edit 7 — EDIT form: same conditional for small unit (L375-381)

### Edit 8 — toAPI: skip converion_factor + consumption_unit for auto/no-conv units
**File:** `inventoryTransform.js`
**L131 (addIngredient hasConversion guard):** Add unit check:
```js
const isAutoUnit = ['kg','ltr','litre','gm','ml'].includes((data.unit || '').toLowerCase());
const hasConversion = !isAutoUnit && data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0 && data.unit !== data.smallUnit;
```

### Edit 9 — Same guard for updateIngredient (L150)

---

## Verification Matrix

| # | Test | Method | Expected |
|---|------|--------|----------|
| V1 | Code: `|| 1` removed from L18 and L62 | grep | no `\|\| 1` in fromAPI |
| V2 | ADD form: select unit=kg → conversion input hidden, small unit read-only "gm" | Playwright | UI correct |
| V3 | ADD form: select unit=gm → both hidden | Playwright | dash shown |
| V4 | ADD form: select unit=bottle → both editable | Playwright | inputs visible |
| V5 | EDIT form: edit kg ingredient → conversion hidden, small unit read-only | Playwright | UI correct |
| V6 | EDIT form: edit piece ingredient → conversion empty (not "1") | Playwright | empty |
| V7 | Compile: webpack | log | compiled successfully |
| V8 | toAPI: kg ingredient doesn't send converion_factor | code + network | key absent |

## Rollback
Revert both files. Conversion factor defaults back to 1, fields always shown.
