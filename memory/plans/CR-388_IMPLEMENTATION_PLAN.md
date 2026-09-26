# Implementation Plan — CR-388
## Editable Min Alert Unit Field

**Date:** 2026-09-25
**Agent Role:** PLANNING (Gate 3 — Implementation Plan)
**Sprint:** TBD (next sprint)
**Impact Analysis:** `impact/CR-388_IMPACT_ANALYSIS.md`
**Risk:** MEDIUM
**Gate status:** GATE 3 COMPLETE. Awaiting Gate 4 GO.

---

## Pre-Entry Verification (implementation agent MUST run before first edit)

```bash
# E1 anchor — add form min unit span
grep -n "BUG-269-C: Alert unit locked" src/components/inventory/InventorySetupPanel.jsx
# Expected: ~L379 in add form AND ~L459 in edit form

# E3 anchor — startEdit minUnitAlert
grep -n "minUnitAlert: ing.smallUnit || ing.minUnitAlert" src/components/inventory/InventorySetupPanel.jsx
# Expected: ~L189

# E4 anchor — bulk edit min unit span
grep -n "BUG-309: minUnitAlert is a unit string" src/components/inventory/IngredientBulkEditor.jsx
# Expected: ~L478
```

If ANY anchor has drifted → STOP. Return to Planning.

---

## Scope Lock

**Files WILL change (2):**
1. `src/components/inventory/InventorySetupPanel.jsx` — E1, E2, E3
2. `src/components/inventory/IngredientBulkEditor.jsx` — E4

**Files will NOT touch:**
`inventoryTransform.js` · `inventoryService.js` · `IngredientBulkEditor.jsx handleSave` · `recipeTransform.js` · any other file.

**`units` prop:** NOT used for the dropdown — options come from `[unit, smallUnit].filter(Boolean)` per row/ingredient. No new props needed anywhere.

---

## Execution Sequence

```
E1 → E2 → E3 → E4 → [compile check]
```

All edits independent. Single compile check at end.

---

## OD-388-01 — Dropdown Logic (applied to all edits)

```
IF smallUnit exists:
  Show <select> with exactly 2 options: [unit, smallUnit]
  e.g. base=tin, small=gm → "tin" and "gm"

IF smallUnit is empty/absent:
  Keep read-only span — only 1 possible unit, no choice to offer
```

---

## Edit-by-Edit Plan

---

### E1 — `InventorySetupPanel.jsx` — ADD form min unit (~L379-383)

**Current:**
```jsx
{/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
<span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
  data-testid="new-ingredient-min-unit">
  {newIng.smallUnit || newIng.unit || '—'}
</span>
```

**Replace with:**
```jsx
{/* CR-388: Min alert unit — base or small unit only (OD-388-01) */}
{newIng.smallUnit ? (
  <select className="h-8 text-xs border border-slate-200 rounded-md px-2 outline-none"
    value={newIng.minUnitAlert || newIng.smallUnit || ''}
    onChange={e => setNewIng(p => ({ ...p, minUnitAlert: e.target.value }))}
    data-testid="new-ingredient-min-unit">
    {[newIng.unit, newIng.smallUnit].filter(Boolean).map((u, i) => (
      <option key={i} value={u}>{u}</option>
    ))}
  </select>
) : (
  <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
    data-testid="new-ingredient-min-unit">
    {newIng.unit || '—'}
  </span>
)}
```

**Verification:** Add form with `unit=tin, smallUnit=gm` → dropdown shows "tin" and "gm". Add form with `unit=pieces, smallUnit=''` → read-only span shows "pieces".

---

### E2 — `InventorySetupPanel.jsx` — EDIT form min unit (~L459-463)

**Current:**
```jsx
{/* BUG-269-C: Alert unit locked to smallUnit (read-only) */}
<span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
  data-testid="edit-ingredient-min-unit">
  {editIng.smallUnit || editIng.unit || '—'}
</span>
```

**Replace with:**
```jsx
{/* CR-388: Min alert unit — base or small unit only (OD-388-01) */}
{editIng.smallUnit ? (
  <select className="h-8 text-xs border border-slate-200 rounded-md px-2 outline-none"
    value={editIng.minUnitAlert || editIng.smallUnit || ''}
    onChange={e => setEditIng(p => ({ ...p, minUnitAlert: e.target.value }))}
    data-testid="edit-ingredient-min-unit">
    {[editIng.unit, editIng.smallUnit].filter(Boolean).map((u, i) => (
      <option key={i} value={u}>{u}</option>
    ))}
  </select>
) : (
  <span className="h-8 text-xs border border-slate-100 rounded-md px-2 w-16 inline-flex items-center justify-center bg-slate-50 text-slate-500"
    data-testid="edit-ingredient-min-unit">
    {editIng.unit || '—'}
  </span>
)}
```

**Verification:** Edit "Aloo Gobhi" (unit=kg, smallUnit=gm) → dropdown shows "kg" and "gm". Edit "Plates" (unit=pieces, no smallUnit) → read-only span.

---

### E3 — `InventorySetupPanel.jsx` — `startEdit()` L189 (respect stored value)

**Current (~L188-189):**
```js
minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.smallUnit || ing.minUnitAlert || '',
```

**Replace with:**
```js
minQtyAlert: ing.minQtyAlert || '', minUnitAlert: ing.minUnitAlert || ing.smallUnit || '', // CR-388: stored value wins
```

**Why:** Flips priority so an ingredient that was previously saved with `minUnitAlert='kg'` loads correctly as "kg" on edit start, instead of being overwritten with the `smallUnit`.

**Verification:** Save an ingredient with minUnitAlert='tin' (base unit). Re-open edit → min unit shows "tin", not "gm" (the smallUnit).

---

### E4 — `IngredientBulkEditor.jsx` — bulk edit MIN UNIT column (~L478-481)

**Current:**
```jsx
{/* BUG-309: minUnitAlert is a unit string — read-only span locked to smallUnit */}
<span className="text-xs text-slate-500 select-none" data-testid={`bulk-minunit-${row._key}`}>
  {row.minUnitAlert || row.smallUnit || row.unit || '—'}
</span>
```

**Replace with:**
```jsx
{/* CR-388: Min alert unit — base or small only (OD-388-01) */}
{row.smallUnit ? (
  <select className="h-7 text-xs border border-slate-200 rounded px-1 outline-none w-full"
    value={row.minUnitAlert || row.smallUnit || ''}
    onChange={e => updateRow(row._key, 'minUnitAlert', e.target.value)}
    data-testid={`bulk-minunit-${row._key}`}>
    {[row.unit, row.smallUnit].filter(Boolean).map((u, i) => (
      <option key={i} value={u}>{u}</option>
    ))}
  </select>
) : (
  <span className="text-xs text-slate-500 select-none" data-testid={`bulk-minunit-${row._key}`}>
    {row.unit || '—'}
  </span>
)}
```

**Note:** `units` prop NOT used here — options derived from `row.unit` + `row.smallUnit` directly. Changing selection calls `updateRow` which marks the row as dirty (amber "edited" badge), same as any other column.

**Verification:** Bulk Edit row for "Rice" (unit=kg, smallUnit=gm) → dropdown shows "kg | gm". Row for "Plates" (no smallUnit) → read-only span.

---

## Checkpoints

```
☐ E1 — InventorySetupPanel.jsx — add form min unit: span → conditional dropdown
☐ E2 — InventorySetupPanel.jsx — edit form min unit: span → conditional dropdown
☐ E3 — InventorySetupPanel.jsx — startEdit(): stored minUnitAlert respected
☐ E4 — IngredientBulkEditor.jsx — bulk edit MIN UNIT column: span → conditional dropdown
☐ FINAL — webpack compiled with 0 new warnings
```

---

## Verification Matrix

| V# | Edit | File | How to verify | Mode |
|---|---|---|---|---|
| V1 | E1 | `InventorySetupPanel.jsx` | Add form: ingredient with smallUnit → MIN UNIT is dropdown showing [base, small] | Browser |
| V2 | E1 | `InventorySetupPanel.jsx` | Add form: ingredient without smallUnit → MIN UNIT is read-only span | Browser |
| V3 | E2 | `InventorySetupPanel.jsx` | Edit form: ingredient with smallUnit → MIN UNIT dropdown shows [base, small] | Browser |
| V4 | E3 | `InventorySetupPanel.jsx` | Edit start: ingredient with stored minUnitAlert=base loads base (not smallUnit) | Browser |
| V5 | E1–E2 | `InventorySetupPanel.jsx` | Save with non-default minUnitAlert → API payload `min_unit_alert` = chosen value | Network tab |
| V6 | E4 | `IngredientBulkEditor.jsx` | Bulk Edit: row with smallUnit → MIN UNIT column shows dropdown | Browser |
| V7 | E4 | `IngredientBulkEditor.jsx` | Bulk Edit: row without smallUnit → MIN UNIT column shows read-only span | Browser |
| V8 | E4 | `IngredientBulkEditor.jsx` | Changing MIN UNIT in bulk marks row as "edited" (amber badge) | Browser |
| V9 | ALL | Both | OD-388-02: changing smallUnit field still auto-updates minUnitAlert via existing onChange | Browser |
| V10 | ALL | Both | webpack: 0 new warnings | build log |

---

## Post-Code Registry Checklist

```
☐ 1. registry.json: CR-388 → status: IMPLEMENTED, sprint_key: sep_bug_closure
☐ 2. CR_REGISTRY.md: CR-388 row → Gate 5a IMPLEMENTED
☐ 3. FILE_OWNERSHIP.md: Add entries for InventorySetupPanel.jsx + IngredientBulkEditor.jsx
☐ 4. Code markers: // CR-388 in every modified site (E1–E4)
☐ 5. Compile: webpack with 0 new warnings
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Ingredient with no smallUnit: dropdown shows 1 item (no real choice) | RESOLVED — read-only span shown instead | OD-388-01 decision |
| startEdit E3 flip breaks existing behaviour | LOW — only changes priority order, both values still available | V4 browser test |
| BulkEditor `updateRow('minUnitAlert', value)` marks row dirty unnecessarily | NONE — this is correct behaviour; user changed the field | V8 |
| Auto-default (OD-388-02) broken after E3 flip | LOW — onChange handlers for unit/smallUnit still fire and overwrite minUnitAlert when user changes those fields | V9 |

---

**Planning complete: CR-388**
Stage: Implementation Plan (Gate 3)
Code reality: NONE
Risk: MEDIUM
Files WILL change: `InventorySetupPanel.jsx` (E1–E3) · `IngredientBulkEditor.jsx` (E4)
Files WILL NOT touch: `inventoryTransform.js` · `inventoryService.js` · any other file
Owner decisions: ALL LOCKED (OD-388-01 updated 2026-09-25 — base/small only)
Verification matrix: 10 checks (all browser/grep)
Next: Owner says "CR-388 Gate 4 GO" → IMPLEMENTATION agent.
