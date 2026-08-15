# Impact Analysis — BUG-311 Layer 5: Bulk Edit Save Button Not Blocked on Duplicate Names

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-15
**Role:** PLANNING
**Sprint:** pos_5_1
**Triggered by:** Owner screenshot — Bulk Edit "Save N Changes" active with 3 rows all named "test-qa-1786782593"

---

## Header

| Field | Value |
|---|---|
| Code Reality | NONE — no `hasDuplicateInDirty` derived state exists; both Save buttons only check `saving \|\| dirtyCount === 0` |
| Conflict Pre-Check | NO CONFLICTS — IngredientBulkEditor.jsx last touched by BUG-311 Layer 4 (2026-08-15, this session). Different lines. |
| Risk | LOW — 1 file, UI-only, no API contract change, no financial logic |
| Fast Lane eligible | NOT RECOMMENDED — useMemo logic has multi-case complexity; standard Gate flow preferred |

---

## §1 — Root Cause (Code Trace)

### Current Save button disabled logic (BOTH buttons):

**Top toolbar — L322–323:**
```jsx
<Button ... disabled={saving || dirtyCount === 0} data-testid="bulk-save">
```

**Bottom footer — L495–496:**
```jsx
<Button ... disabled={saving || dirtyCount === 0} data-testid="bulk-save-footer">
```

`dirtyCount` (L98) = number of rows that are changed or pending delete.
It counts NOTHING about duplicate names. Both buttons are enabled as soon as `dirtyCount > 0`.

### Layer 3 guard in `handleSave` (L192–202) — post-click, not pre-click:
```js
if (r._isNew) {
  const dup = allItems.some(i => (i.name || '').trim().toLowerCase() === dupName);
  if (dup) { ... fail++; continue; }   // ← fires AFTER user clicks Save
  await inventoryService.addIngredient(r);
} else {
  await inventoryService.updateIngredient(r._id, r);  // ← NO duplicate guard for EDITED rows
}
```

**Two gaps found:**
1. **Save button not disabled** when dirty rows contain duplicate names (user can click Save)
2. **EDITED rows have NO Layer 3 guard** — renaming an existing ingredient to a duplicate name bypasses all protection and calls `updateIngredient` silently

---

## §2 — Duplicate Cases That Must Block Save

All 3 cases visible in screenshot 2:

| Case | Row type | Match against | Block Save? |
|---|---|---|---|
| **A** | NEW row, name = existing item in DB | `allItems` | ✅ Block |
| **B** | EDITED row, name = different existing item in DB | `allItems` (excluding self by `_id`) | ✅ Block |
| **C** | Two NEW rows, same name as each other | cross-dirty comparison | ✅ Block |
| **D** | NEW row + EDITED row with same name, neither in DB | cross-dirty comparison | ✅ Block |

---

## §3 — Proposed Derived State: `hasDuplicateInDirty`

```js
const hasDuplicateInDirty = useMemo(() => {
  const dirtyRows = rows.filter(r => !r._deleted && isDirty(r));
  if (dirtyRows.length === 0) return false;

  for (const r of dirtyRows) {
    const name = (r.name || '').trim().toLowerCase();
    if (!name) continue; // empty name — blocked by save validation, not here

    // Case A: new row matches an existing DB ingredient
    if (r._isNew && allItems.some(i => i.name.trim().toLowerCase() === name)) return true;

    // Case B: edited row matches a DIFFERENT existing DB ingredient
    if (!r._isNew && allItems.some(i => i.name.trim().toLowerCase() === name && i.id !== r._id)) return true;

    // Cases C + D: any other dirty row has the same name
    if (dirtyRows.some(o => o._key !== r._key && (o.name || '').trim().toLowerCase() === name)) return true;
  }
  return false;
}, [rows, allItems]);
```

**Dependencies:** `[rows, allItems]` — recomputes whenever any row's name changes.

---

## §4 — Defense-in-Depth: Layer 3 Guard for EDITED Rows

Currently `handleSave` only guards NEW rows (L192 `if (r._isNew)`). Edited rows that are renamed to a duplicate name bypass this guard and call `updateIngredient` directly. With the proactive Save disable this path should never be reached, but defense-in-depth requires a guard here too.

**Current (L192–205):**
```js
if (r._isNew) {
  // BUG-311: Layer 3 — global duplicate guard for new bulk-edit rows
  const dupName = (r.name || '').trim().toLowerCase();
  const dup = allItems.some(i => (i.name || '').trim().toLowerCase() === dupName);
  if (dup) { ... fail++; continue; }
  await inventoryService.addIngredient(r);
} else {
  await inventoryService.updateIngredient(r._id, r);
}
```

**Fix (extend guard to EDITED rows):**
```js
if (r._isNew) {
  // BUG-311 L3: duplicate guard — new rows
  const dupName = (r.name || '').trim().toLowerCase();
  const dup = allItems.some(i => (i.name || '').trim().toLowerCase() === dupName);
  if (dup) { ... fail++; continue; }
  await inventoryService.addIngredient(r);
} else {
  // BUG-311 L5: duplicate guard — edited rows (defence-in-depth: button disable is primary guard)
  const dupName = (r.name || '').trim().toLowerCase();
  const dup = allItems.some(i => i.name.trim().toLowerCase() === dupName && i.id !== r._id);
  if (dup) {
    setRows(prev => prev.map(x => x._key === r._key
      ? { ...x, _saving: false, _saveError: `"${r.name}" already exists` } : x));
    fail++; continue;
  }
  await inventoryService.updateIngredient(r._id, r);
}
```

---

## §5 — Affected Files

| File | Change | Risk |
|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | +`hasDuplicateInDirty` useMemo + 2 Save button disabled updates + extend Layer 3 guard | LOW |

**Files NOT touched:** all other files. No hotspot files (R5). No API contract change.

---

## §6 — Conflict Pre-Check

| File | Last Modifier | Conflict |
|---|---|---|
| `IngredientBulkEditor.jsx` | BUG-311 L4 (2026-08-15, this session) | NO — L4 touched L406 (name cell). This plan touches L98 area (derived state) + L323 + L496 + L204. Different lines. |

---

## §7 — Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `hasDuplicateInDirty` recomputes on every row change | `useMemo` with `[rows, allItems]` deps — React only recomputes on actual change. Negligible perf. |
| R2 | Case C/D cross-dirty check is O(n²) | Ingredient lists are small (typically <500). Acceptable. |
| R3 | Empty name rows | `if (!name) continue` skips empty names — save validation handles those separately. |
| R4 | Defense-in-depth guard for EDITED rows changes error path | Same pattern as existing L3 guard (sets `_saveError` badge). No new API calls. |

---

## §8 — Verification Matrix

| # | What | How |
|---|---|---|
| V1 | NEW row with duplicate name → Save disabled | Add Item, type existing name → "Save N Changes" greyed out |
| V2 | EDITED row renamed to duplicate → Save disabled | Rename existing ingredient to another's name → "Save N Changes" greyed out |
| V3 | Two NEW rows same name → Save disabled | Add Item twice, type same name → "Save N Changes" greyed out |
| V4 | EDITED row renamed to UNIQUE name → Save enabled | Rename to a unique name → "Save N Changes" active |
| V5 | NEW row with unique name → Save enabled | Add Item, type unique name → "Save N Changes" active |
| V6 | Regression: delete row still allows Save | Mark a row for delete → "Save N Changes" active (dirtyCount > 0) |
| V7 | Layer 3 defence-in-depth for EDITED rows | Manually bypass disable (if possible) → toast error fires |
| V8 | Both toolbar AND footer buttons disabled together | Both buttons greyed simultaneously when duplicate present |

---

## §9 — Owner Decisions

None. Behaviour fully confirmed by screenshots and prior layer decisions.

---

## §10 — Code Reality Summary

| Layer | Guard | Location | Status |
|---|---|---|---|
| L1 | Add form typeahead | InventorySetupPanel L397 | ✅ |
| L2 | addIngredient pre-save | InventorySetupPanel L221 | ✅ |
| L3 | Bulk handleSave guard (NEW rows) | IngredientBulkEditor L192 | ✅ (NEW only) |
| L1B | Edit form typeahead + Save disable | InventorySetupPanel L412, L470 | ✅ |
| L4 | Bulk name cell typeahead (visual) | IngredientBulkEditor L406 | ✅ (visual only) |
| **L5** | **Bulk Save button blocked on duplicate** | **IngredientBulkEditor L323, L496** | ❌ **MISSING — this plan** |
| **L5b** | **handleSave guard for EDITED rows** | **IngredientBulkEditor L204** | ❌ **MISSING — this plan** |
