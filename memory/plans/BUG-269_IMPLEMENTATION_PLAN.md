# Implementation Plan — BUG-269 (Ingredient Form: 3 UX Bugs)

**ID:** BUG-269
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-28
**Owner Decisions:** All confirmed — conversion only when unit≠smallUnit, auto-select gm/ml, alert unit locked to smallUnit

---

## Scope Lock
**Files WILL change:** `inventoryTransform.js`, `InventorySetupPanel.jsx`
**Files will NOT touch:** `inventoryService.js`, `constants.js`, `purchasePlanner.js`, all other components

---

## Edit 1: inventoryTransform.js — Fix hasConversion Check (Lines 130 + 148)

**Current (line 130, addIngredient):**
```js
const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0;
```

**New:**
```js
// BUG-269-A: Only send conversion when units differ AND user entered a factor
const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0 && data.unit !== data.smallUnit;
```

**Current (line 148, updateIngredient):**
```js
const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0;
```

**New:**
```js
// BUG-269-A: Only send conversion when units differ AND user entered a factor
const hasConversion = data.smallUnit && data.conversionFactor && Number(data.conversionFactor) > 0 && data.unit !== data.smallUnit;
```

---

## Edit 2: InventorySetupPanel.jsx — Add UNIT_MAP Constant (After line 15)

```js
// BUG-269-B: Auto-select small unit when base unit changes
const UNIT_SMALL_MAP = { kg: 'gm', ltr: 'ml', litre: 'ml' };
```

---

## Edit 3: InventorySetupPanel.jsx — ADD Form: Unit onChange Auto-Selects Small Unit + Alert Unit (Line 305)

**Current:**
```jsx
value={newIng.unit} onChange={e => setNewIng(p => ({ ...p, unit: e.target.value }))}
```

**New:**
```jsx
value={newIng.unit} onChange={e => {
  const u = e.target.value;
  const autoSmall = UNIT_SMALL_MAP[u] || '';
  setNewIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u }));
}}
```

Logic:
- If kg → auto-set smallUnit="gm", clear conversionFactor (user enters fresh), set minUnitAlert="gm"
- If ltr → auto-set smallUnit="ml", clear conversionFactor, set minUnitAlert="ml"
- If other → keep existing smallUnit unchanged, keep conversionFactor

---

## Edit 4: InventorySetupPanel.jsx — ADD Form: Small Unit onChange Syncs Alert Unit (Line 317)

**Current:**
```jsx
value={newIng.smallUnit} onChange={e => setNewIng(p => ({ ...p, smallUnit: e.target.value }))}
```

**New:**
```jsx
value={newIng.smallUnit} onChange={e => setNewIng(p => ({ ...p, smallUnit: e.target.value, minUnitAlert: e.target.value || p.unit }))}
```

When user manually changes smallUnit, alert unit follows.

---

## Edit 5: InventorySetupPanel.jsx — ADD Form: Replace Alert Unit Dropdown with Read-Only (Lines 327-331)

**Current:**
```jsx
<select className="h-8 text-xs border border-slate-200 rounded-md px-1 w-16 outline-none"
  value={newIng.minUnitAlert} onChange={e => setNewIng(p => ({ ...p, minUnitAlert: e.target.value }))} data-testid="new-ingredient-min-unit">
  <option value="">Unit...</option>
  {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
</select>
```

**New:**
```jsx
{/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
<span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
  data-testid="new-ingredient-min-unit">
  {newIng.smallUnit || newIng.unit || '—'}
</span>
```

---

## Edit 6: InventorySetupPanel.jsx — EDIT Form: Unit onChange Auto-Selects (Line 362)

**Current:**
```jsx
value={editIng.unit} onChange={e => setEditIng(p => ({ ...p, unit: e.target.value }))}
```

**New:**
```jsx
value={editIng.unit} onChange={e => {
  const u = e.target.value;
  const autoSmall = UNIT_SMALL_MAP[u] || '';
  setEditIng(p => ({ ...p, unit: u, smallUnit: autoSmall || p.smallUnit, conversionFactor: autoSmall ? '' : p.conversionFactor, minUnitAlert: autoSmall || p.smallUnit || u }));
}}
```

---

## Edit 7: InventorySetupPanel.jsx — EDIT Form: Small Unit onChange Syncs Alert Unit (Line 374)

**Current:**
```jsx
value={editIng.smallUnit} onChange={e => setEditIng(p => ({ ...p, smallUnit: e.target.value }))}
```

**New:**
```jsx
value={editIng.smallUnit} onChange={e => setEditIng(p => ({ ...p, smallUnit: e.target.value, minUnitAlert: e.target.value || p.unit }))}
```

---

## Edit 8: InventorySetupPanel.jsx — EDIT Form: Replace Alert Unit Dropdown with Read-Only (Lines 384-388)

**Current:**
```jsx
<select className="h-8 text-xs border border-slate-200 rounded-md px-1 w-16 outline-none"
  value={editIng.minUnitAlert} onChange={e => setEditIng(p => ({ ...p, minUnitAlert: e.target.value }))} data-testid="edit-ingredient-min-unit">
  <option value="">Unit...</option>
  {units.map((u, i) => <option key={i} value={typeof u === 'string' ? u : u.name}>{typeof u === 'string' ? u : u.name}</option>)}
</select>
```

**New:**
```jsx
{/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
<span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
  data-testid="edit-ingredient-min-unit">
  {editIng.smallUnit || editIng.unit || '—'}
</span>
```

---

## Edit 9: InventorySetupPanel.jsx — startEdit() Auto-Sync Alert Unit (Line 148-155)

Ensure that when entering edit mode, `minUnitAlert` is synced to `smallUnit`:

**Current (line 150-154):**
```js
setEditIng({
  name: ing.name, categoryId: ing.categoryId, unit: ing.unit,
  smallUnit: ing.smallUnit || '', conversionFactor: ing.conversionFactor || '',
  minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.minUnitAlert || '',
});
```

**New:**
```js
// BUG-269-C: Ensure minUnitAlert always matches smallUnit on edit start
setEditIng({
  name: ing.name, categoryId: ing.categoryId, unit: ing.unit,
  smallUnit: ing.smallUnit || '', conversionFactor: ing.conversionFactor || '',
  minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.smallUnit || ing.minUnitAlert || '',
});
```

---

## Execution Sequence

1. `inventoryTransform.js` — Fix hasConversion (Edit 1) — no UI impact yet
2. `InventorySetupPanel.jsx` — Add UNIT_MAP (Edit 2) — no UI impact
3. `InventorySetupPanel.jsx` — ADD form: unit onChange (Edit 3), smallUnit onChange (Edit 4), alert read-only (Edit 5)
4. `InventorySetupPanel.jsx` — EDIT form: unit onChange (Edit 6), smallUnit onChange (Edit 7), alert read-only (Edit 8), startEdit sync (Edit 9)

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|:---:|------|--------|---------------|
| 1 | inventoryTransform.js | hasConversion guard | Edit ingredient with unit=piece, smallUnit=piece → no 422 error |
| 2 | InventorySetupPanel.jsx | UNIT_MAP | Code inspection — constant defined |
| 3 | InventorySetupPanel.jsx | ADD: unit auto-selects smallUnit | Click + Add → select "kg" → small unit auto-fills "gm" |
| 4 | InventorySetupPanel.jsx | ADD: smallUnit syncs alert | Change small unit manually → alert unit follows |
| 5 | InventorySetupPanel.jsx | ADD: alert read-only | Click + Add → alert unit column shows text, not dropdown |
| 6 | InventorySetupPanel.jsx | EDIT: unit auto-selects | Click edit → change unit to "ltr" → small unit changes to "ml" |
| 7 | InventorySetupPanel.jsx | EDIT: smallUnit syncs alert | Change small unit → alert unit follows |
| 8 | InventorySetupPanel.jsx | EDIT: alert read-only | Click edit → alert unit is read-only text |
| 9 | InventorySetupPanel.jsx | startEdit syncs alert | Click edit on existing ingredient → minUnitAlert = smallUnit |

## Post-Code Registry Checklist
- [ ] registry.json: BUG-269 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: 2 files listed
- [ ] Code markers: `// BUG-269` in every modified file
