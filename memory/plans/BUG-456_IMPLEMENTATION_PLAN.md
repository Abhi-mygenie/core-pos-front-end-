# BUG-456 — Implementation Plan (Gate 3)
**Ingredient edit: hard-lock Unit + Conversion fields when stock > 0**

**Date:** 2026-09-24 · **Based on:** `impact/BUG-456_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)
**Code reality re-verified:** NONE. Line numbers confirmed at HEAD.

---

## Scope Lock

**Files WILL change (2):**
1. `src/components/inventory/InventorySetupPanel.jsx`
2. `src/components/inventory/IngredientBulkEditor.jsx`

**Files will NOT touch:** `inventoryTransform.js` · `inventoryService.js` · any hotspot file · any test file

---

## Edits

### E1 — `src/components/inventory/InventorySetupPanel.jsx`

**E1a — `startEdit()` — L186–189: add `stockQty` to `setEditIng()`**
```js
// BEFORE (L186–189):
    setEditIng({
      name: ing.name, categoryId: ing.categoryId, unit: ing.unit,
      smallUnit: ing.smallUnit || '', conversionFactor: ing.conversionFactor || '',
      minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.smallUnit || ing.minUnitAlert || '',
    });

// AFTER:
    setEditIng({
      name: ing.name, categoryId: ing.categoryId, unit: ing.unit,
      smallUnit: ing.smallUnit || '', conversionFactor: ing.conversionFactor || '',
      minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.smallUnit || ing.minUnitAlert || '',
      stockQty: Number(ing.displayQty || ing.calQuantity || ing.quantity) || 0, // BUG-456
    });
```

**E1b — Unit `<select>` — L422: add `disabled` + opacity when stock > 0**
```jsx
// BEFORE (L421–422):
                      <select className="h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none"
                        value={editIng.unit} onChange={e => { const u = e.target.value; const autoSmall = UNIT_SMALL_MAP[u] || ''; setEditIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u })); }} data-testid="edit-ingredient-unit">

// AFTER:
                      <select className={`h-8 text-xs border border-slate-200 rounded-md px-2 w-full outline-none ${editIng.stockQty ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`} // BUG-456
                        disabled={!!editIng.stockQty} title={editIng.stockQty ? 'Unit locked — stock on hand > 0' : undefined}
                        value={editIng.unit} onChange={e => { const u = e.target.value; const autoSmall = UNIT_SMALL_MAP[u] || ''; setEditIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u })); }} data-testid="edit-ingredient-unit">
```

**E1c — Conversion `<Input>` — L429–431: add `disabled` + opacity when stock > 0**
```jsx
// BEFORE (L429–431):
                        <Input type="number" value={editIng.conversionFactor} onChange={e => setEditIng(p => ({ ...p, conversionFactor: e.target.value }))}
                          placeholder={`1 ${editIng.unit || 'unit'} = ? ${editIng.smallUnit || 'small'}`} className="h-8 text-xs" data-testid="edit-ingredient-conversion"
                          title="How many small units in 1 large unit? e.g. 1 KG = 1000 GM → enter 1000" />

// AFTER:
                        <Input type="number" value={editIng.conversionFactor} onChange={e => setEditIng(p => ({ ...p, conversionFactor: e.target.value }))}
                          placeholder={`1 ${editIng.unit || 'unit'} = ? ${editIng.smallUnit || 'small'}`}
                          className={`h-8 text-xs ${editIng.stockQty ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`} // BUG-456
                          disabled={!!editIng.stockQty}
                          title={editIng.stockQty ? 'Conversion locked — stock on hand > 0' : 'How many small units in 1 large unit? e.g. 1 KG = 1000 GM → enter 1000'}
                          data-testid="edit-ingredient-conversion" />
```

---

### E2 — `src/components/inventory/IngredientBulkEditor.jsx`

**E2a — `buildRow()` function — after `_originalConversion: ing.conversionFactor || '',` (~L28): add `stockQty`**
```js
// BEFORE (relevant excerpt):
    _originalUnit: ing.unit,
    ...
    _originalConversion: ing.conversionFactor || '',
    ...
    unit: ing.unit,
    ...
    conversionFactor: ing.conversionFactor || '',

// AFTER — add one line after _originalConversion:
    _originalUnit: ing.unit,
    ...
    _originalConversion: ing.conversionFactor || '',
    stockQty: Number(ing.displayQty || ing.calQuantity || ing.quantity) || 0, // BUG-456
    ...
    unit: ing.unit,
    ...
    conversionFactor: ing.conversionFactor || '',
```

**E2b — Unit `<select>` — L446–448: add `disabled` for existing rows with stock > 0**
```jsx
// BEFORE (L446–448):
                        <select className={isNew ? newSelectCls : selectCls(row.unit !== row._originalUnit)}
                          value={row.unit} onChange={e => updateRow(row._key, 'unit', e.target.value)}
                          data-testid={`bulk-unit-${row._key}`}>

// AFTER:
                        <select className={isNew ? newSelectCls : selectCls(row.unit !== row._originalUnit)} // BUG-456
                          disabled={!row._isNew && row.stockQty > 0}
                          title={!row._isNew && row.stockQty > 0 ? 'Unit locked — stock on hand > 0' : undefined}
                          value={row.unit} onChange={e => updateRow(row._key, 'unit', e.target.value)}
                          data-testid={`bulk-unit-${row._key}`}>
```

**E2c — Conversion `<input>` — L462–463: add `disabled` for existing rows with stock > 0**
```jsx
// BEFORE (L462–463):
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.conversionFactor) !== String(row._originalConversion))}
                          value={row.conversionFactor} onChange={e => updateRow(row._key, 'conversionFactor', e.target.value)}

// AFTER:
                        <input type="number" className={isNew ? newNumCls : numCls(String(row.conversionFactor) !== String(row._originalConversion))} // BUG-456
                          disabled={!row._isNew && row.stockQty > 0}
                          title={!row._isNew && row.stockQty > 0 ? 'Conversion locked — stock on hand > 0' : undefined}
                          value={row.conversionFactor} onChange={e => updateRow(row._key, 'conversionFactor', e.target.value)}
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V1 | E1a: `editIng.stockQty` set on startEdit | Browser DevTools: pencil stocked ingredient → React state `editIng.stockQty > 0` | NO |
| V2 | E1b: unit `<select>` greyed + unclickable for stock > 0 | Browser: pencil on stocked ingredient → unit dropdown greyed | NO |
| V3 | E1c: conversion `<Input>` greyed for stock > 0 | Browser: same row → conversion field greyed | NO |
| V4 | E1b/E1c: fields editable when stock = 0 | Browser: pencil on 0-stock ingredient → fields editable | NO |
| V5 | E2a: `buildRow` has `stockQty` | `grep stockQty IngredientBulkEditor.jsx` → ≥3 hits | YES |
| V6 | E2b/E2c: bulk edit existing stocked row — unit + conv greyed | Browser: Ingredient Bulk Edit → stocked ingredient → cells greyed | NO |
| V7 | E2b/E2c: new row in bulk editor — unit + conv editable | Browser: click Add New → unit + conv editable | NO |
| V8 | No API payload change | `grep stockQty inventoryTransform.js inventoryService.js` → 0 hits | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-456 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: InventorySetupPanel.jsx + IngredientBulkEditor.jsx with BUG-456 + date
- [ ] Code markers: // BUG-456 on every modified line
- [ ] Compile: yarn build exit 0, 0 new warnings
```
