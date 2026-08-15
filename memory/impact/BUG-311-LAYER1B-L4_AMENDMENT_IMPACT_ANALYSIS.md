# Impact Analysis — BUG-311 Amendment: Layer 1B (Edit Form) + Layer 4 (Bulk Edit Add Row)

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-15
**Role:** PLANNING
**Sprint:** pos_5_1
**Triggered by:** Owner screenshot review — two locations where dropdown typeahead is absent

---

## Header

| Field | Value |
|---|---|
| Code Reality | PARTIAL — Layer 1 (Add form) IMPLEMENTED ✅. Two surfaces missing: Edit form row + Bulk Edit name cell. |
| Conflict Pre-Check | NO CONFLICTS — InventorySetupPanel.jsx last touched by BUG-311 L1 (2026-08-15). IngredientBulkEditor.jsx last touched by BUG-311 L3 / BUG-309 (2026-08-13). No in-flight CRs on either file. |
| Scope vs existing plan | Layer 1B = explicitly deferred in Layer 1 plan. Layer 4 = brand new, not in any prior plan. |
| Risk | LOW (Layer 1B — same file, same component) / MEDIUM (Layer 4 — new file, shared component extraction) |

---

## §1 — Three Surfaces: Current Code Reality

### Surface 1 — Add Ingredient form ✅ (DONE, NOT in scope)
**File:** `InventorySetupPanel.jsx` lines 396–402
**Status:** `<IngredientNameCombobox>` already wired. Working as per screenshot 2.
```jsx
// L397-402 — IMPLEMENTED ✅
<IngredientNameCombobox
  value={newIng.name}
  onChange={v => setNewIng(p => ({ ...p, name: v }))}
  existingIngredients={ingredients}
  testId="new-ingredient-name"
/>
```
**No change needed here.**

---

### Surface 2 — Edit Ingredient form (inline pencil row) ❌ GAP — Layer 1B
**File:** `InventorySetupPanel.jsx` lines 471–472 + line 523
**Current code (L471–472):**
```jsx
<Input value={editIng.name} onChange={e => setEditIng(p => ({ ...p, name: e.target.value }))}
  className="h-8 text-sm" autoFocus data-testid="edit-ingredient-name" />
```
**Current Save button (L523):**
```jsx
<Button size="sm" variant="outline" onClick={saveEdit}
  className="h-7 px-2 text-xs text-blue-700 border-blue-300"
  data-testid="save-edit-ingredient">Save</Button>
```
**Gap:** Plain `<Input>` — no typeahead, no amber warning, no Save disable.

**Key difference from Add form:** The user is renaming an existing ingredient. Typing the exact same name as itself is NOT a duplicate. The duplicate check must exclude the ingredient currently being edited.

- `editingId` (state, line 104) = the id of the ingredient being renamed
- Self-exclusion rule: `ingredients.some(i => i.name.trim().toLowerCase() === editIng.name.trim().toLowerCase() && i.id !== editingId)`
- `ingredients` state IS in scope (same function, line 93)

**New derived state needed:**
```js
// isEditDuplicate — same pattern as isExactDuplicate but for edit form + self-exclusion
const isEditDuplicate = useMemo(() =>
  editIng.name.trim().length > 0 && editingId !== null &&
  ingredients.some(i =>
    i.name.trim().toLowerCase() === editIng.name.trim().toLowerCase() &&
    i.id !== editingId
  ),
  [editIng.name, ingredients, editingId]
);
```

---

### Surface 3 — Bulk Edit "Add Item" row ❌ GAP — Layer 4
**File:** `IngredientBulkEditor.jsx` lines 401–405
**Current code:**
```jsx
<td className={cellCls}>
  <input ref={isNew && !row.name ? newNameRef : undefined}
    className={isNew ? newInputCls : inputCls(row.name !== row._originalName)}
    value={row.name} onChange={e => updateRow(row._key, 'name', e.target.value)}
    placeholder={isNew ? 'New ingredient name...' : ''} data-testid={`bulk-name-${row._key}`} />
</td>
```
**Gap:** Native HTML `<input>` — no typeahead, no amber warning. Applies to ALL rows (both new `_isNew: true` rows and existing rows being renamed).

**Data available:**
- `allItems` prop (line 55): the full ingredients list from API — this is the reference for duplicate detection
- `row._id`: `null` for new rows, real ingredient ID for existing rows
- Self-exclusion: `row._isNew ? null : row._id`

**Overflow context:**
- Container at L356: `overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]`
- A `position: absolute` dropdown inside the `<td>` WILL be clipped by this overflow container
- Requires `position: fixed` + `getBoundingClientRect()` — SAME approach as the existing `IngredientNameCombobox`
- ✅ The existing component already uses `position: fixed` — this is already solved

**Save button concern:**
- No per-row Save button in Bulk Edit (global "Save N Changes" button)
- Layer 3 guard at L192-197 already handles post-save duplicate rejection
- Combobox adds VISUAL WARNING only — no button-disabling needed in Bulk Edit
- The global Save button could add a count-level check — but this is DEFERRED (not in this plan)

**ref concern (`newNameRef`):**
- L127: `setTimeout(() => newNameRef.current?.focus(), 50)` — auto-focuses new row on add
- If we replace the native `<input>` with `<IngredientNameCombobox>`, `newNameRef` will point to the outer div wrapper (not focusable)
- Resolution: The inner `<Input>` in `IngredientNameCombobox` already has `autoFocus`. On mount of a new row, `autoFocus` fires. The `newNameRef.current?.focus()` call will silently no-op on the div. **Net behavior: same as before — input auto-focuses on new row add.**

---

## §2 — Shared Component: IngredientNameCombobox Enhancement

The `IngredientNameCombobox` function currently lives as a local component in `InventorySetupPanel.jsx` (lines 23–91). It needs to be used in two files:

1. `InventorySetupPanel.jsx` — Edit form (Layer 1B)
2. `IngredientBulkEditor.jsx` — Bulk Edit (Layer 4)

**Required enhancement:** Add `excludeId` prop for self-exclusion in edit contexts.

**Current (no self-exclusion):**
```js
const exactMatch = trimmed.length > 0 &&
  existingIngredients.some(i => i.name.trim().toLowerCase() === trimmed);
```

**Enhanced (with optional self-exclusion):**
```js
const exactMatch = trimmed.length > 0 &&
  existingIngredients.some(i =>
    i.name.trim().toLowerCase() === trimmed &&
    (excludeId === null || i.id !== excludeId)
  );
```

**Extraction approach:**
- Extract `IngredientNameCombobox` to a new shared file: `components/inventory/IngredientNameCombobox.jsx`
- Export as `default`
- In `InventorySetupPanel.jsx`: remove local definition, add import. Existing Add form usage: no `excludeId` → defaults to `null` → no behavior change.
- In `IngredientBulkEditor.jsx`: add import, use component.

**Alternative:** Duplicate the component locally in IngredientBulkEditor.jsx.
- Simpler (no new file), but violates DRY — future fixes need to be applied in two places.
- **Rejected: extraction is the better approach.**

---

## §3 — Affected Files

| File | Change | Touch? | Risk |
|---|---|---|---|
| `components/inventory/IngredientNameCombobox.jsx` | **NEW FILE** — extracted + `excludeId` prop added | ✅ NEW | LOW |
| `components/inventory/InventorySetupPanel.jsx` | Remove local IngredientNameCombobox + add import + add `isEditDuplicate` + wire Edit form + disable Edit Save button | ✅ CHANGE | LOW |
| `components/inventory/IngredientBulkEditor.jsx` | Add import + replace name `<input>` with `<IngredientNameCombobox>` (one replace) | ✅ CHANGE | MEDIUM |

**Files NOT touched:** all other files, all hotspot files (R5), no API/financial logic.

---

## §4 — Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | Extraction breaks existing Add form | The component API is additive (`excludeId` has `null` default). Existing call without `excludeId` works identically. |
| R2 | Bulk Edit row — existing row rename triggers false "Already exists" on self | `excludeId={row._isNew ? null : row._id}` prevents self-match. |
| R3 | `newNameRef` no longer points to focusable element | `autoFocus` on inner `<Input>` handles focus on new row mount. Silent no-op on ref.focus() call. Acceptable. |
| R4 | Bulk Edit overflow clipping | Existing component uses `position: fixed` + `getBoundingClientRect()` — already solves this. |
| R5 | Category badge missing in Bulk Edit (filtered list) | `allItems` passed as `existingIngredients` — these have `categoryName` field from the transform. Badge will render. Verify in §5. |

---

## §5 — Verification Matrix

| # | What | How |
|---|---|---|
| V1 | Edit form — typing existing name shows dropdown | Open pencil edit → type existing ingredient name → dropdown appears |
| V2 | Edit form — exact self-name is NOT marked duplicate | Edit ingredient "Tomato" → type "Tomato" → no amber, Save enabled |
| V3 | Edit form — exact OTHER name IS marked duplicate | Edit "Tomato" → type "Butter" (existing) → amber border, Save disabled |
| V4 | Edit form — Save button disabled on exact duplicate | Same as V3: Save button greyed/disabled |
| V5 | Bulk Edit new row — typing existing name shows dropdown | Click Add Item → type existing name → dropdown appears |
| V6 | Bulk Edit existing row — rename to duplicate shows warning | Edit existing ingredient name → type another ingredient's exact name → amber |
| V7 | Bulk Edit existing row — rename to own name shows NO warning | Edit "Tomato" in bulk → type "Tomato" → no amber (self-exclusion works) |
| V8 | Regression — Add form unaffected | + Add Ingredient → type → dropdown still works as before |
| V9 | Regression — auto-focus on new Bulk Edit row | Click "Add Item" → name field auto-focuses |

---

## §6 — Owner Decision Queue

None. All behaviour confirmed by screenshots and prior Layer 1 decision (deferred items now activated).

---

## §7 — Conflict Pre-Check Result

| File | Last Modifier | Conflict |
|---|---|---|
| `InventorySetupPanel.jsx` | BUG-311 Layer 1 (2026-08-15) | NO — different lines |
| `IngredientBulkEditor.jsx` | BUG-311 Layer 3 / BUG-309 (2026-08-13) | NO — L3 guard is at save-time, unrelated to UI |

---

## §8 — Code Reality Summary

| Layer | Surface | Status |
|---|---|---|
| L1 | Add Ingredient form typeahead | ✅ IMPLEMENTED |
| L2 | addIngredient() pre-save guard | ✅ IMPLEMENTED (L221-228) |
| L3 | Bulk Edit save-time duplicate guard | ✅ IMPLEMENTED (L192-197) |
| **L1B** | **Edit form typeahead + Save disable** | ❌ **MISSING — this plan** |
| **L4** | **Bulk Edit name cell typeahead** | ❌ **MISSING — this plan** |
