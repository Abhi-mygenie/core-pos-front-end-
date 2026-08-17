# Implementation Plan — BUG-311 Amendment: Layer 1B + Layer 4

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-15
**Based on:** `memory/impact/BUG-311-LAYER1B-L4_AMENDMENT_IMPACT_ANALYSIS.md`
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Pre-Plan Verification

| Target | IA Claim | Live Code | Match? |
|---|---|---|---|
| Add form — already done | `<IngredientNameCombobox>` at L397 | Confirmed L397-402 ✅ | ✅ |
| Edit form name input | `<Input value={editIng.name}...>` at L471 | Confirmed L471-472 ✅ | ✅ |
| Edit form Save button | `<Button onClick={saveEdit}...>` at L523, no disabled | Confirmed L523 ✅ | ✅ |
| isExactDuplicate anchor | `}, [ingredients, selectedCat, search]);` then `const isExactDuplicate` | Confirmed L156-163 ✅ | ✅ |
| Bulk Edit name input | Native `<input>` at L402-405 in IngredientBulkEditor | Confirmed L402-405 ✅ | ✅ |
| IngredientNameCombobox | Local function in InventorySetupPanel.jsx L23-91 | Confirmed L23-91 ✅ | ✅ |

---

## Scope Lock

| File | Change | Touch? |
|---|---|---|
| `components/inventory/IngredientNameCombobox.jsx` | **NEW FILE** — extracted component + `excludeId` prop | ✅ NEW |
| `components/inventory/InventorySetupPanel.jsx` | 5 changes: remove local def + add import + isEditDuplicate + edit input swap + edit Save disable | ✅ YES |
| `components/inventory/IngredientBulkEditor.jsx` | 2 changes: add import + name input swap | ✅ YES |
| All other files | — | ❌ NO |

---

## Execution Order

```
Edit 1 → Create IngredientNameCombobox.jsx (new shared component, excludeId added)
Edit 2 → InventorySetupPanel.jsx: remove local component definition (L23-91)
Edit 3 → InventorySetupPanel.jsx: add import for new shared component
Edit 4 → InventorySetupPanel.jsx: add isEditDuplicate useMemo (after isExactDuplicate)
Edit 5 → InventorySetupPanel.jsx: swap Edit form <Input> with <IngredientNameCombobox>
Edit 6 → InventorySetupPanel.jsx: add disabled to Edit form Save button
Edit 7 → IngredientBulkEditor.jsx: add import for shared component
Edit 8 → IngredientBulkEditor.jsx: swap bulk name <input> with <IngredientNameCombobox>
```

---

## Edit 1 — NEW FILE: `IngredientNameCombobox.jsx`

**Path:** `components/inventory/IngredientNameCombobox.jsx`

**Content:** Extract the existing component from `InventorySetupPanel.jsx` lines 23–91, make two changes:
1. Add `excludeId = null` prop
2. Update `exactMatch` and `filtered` to use self-exclusion when `excludeId` is provided

```jsx
// BUG-311 Layer 1B / Layer 4: shared typeahead warning combobox for ingredient name inputs
// Uses position:fixed + getBoundingClientRect to escape overflow-hidden/overflow-x-auto ancestors
import React, { useState, useMemo, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function IngredientNameCombobox({ value, onChange, existingIngredients, testId, excludeId = null }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });

  const trimmed = (value || '').trim().toLowerCase();

  // Filter candidates — exclude self when editing an existing item
  const filtered = useMemo(() =>
    trimmed.length > 0
      ? existingIngredients.filter(i =>
          i.name.toLowerCase().includes(trimmed) &&
          (excludeId === null || i.id !== excludeId)
        )
      : [],
    [existingIngredients, trimmed, excludeId]
  );

  // Exact match — used to drive amber border + "Already exists" badge + Save disabled
  const exactMatch = trimmed.length > 0 &&
    existingIngredients.some(i =>
      i.name.trim().toLowerCase() === trimmed &&
      (excludeId === null || i.id !== excludeId)
    );

  const openDrop = () => {
    if (!inputRef.current || trimmed.length === 0) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setOpen(true);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => { onChange(e.target.value); if (e.target.value.trim()) openDrop(); else setOpen(false); }}
        onFocus={openDrop}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Ingredient name..."
        className={`h-8 text-sm ${exactMatch ? 'border-amber-400 bg-amber-50' : ''}`}
        autoFocus
        data-testid={testId}
      />
      {open && filtered.length > 0 && (
        <div
          className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden"
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999, maxHeight: 192, overflowY: 'auto' }}>
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
            Existing ingredients
          </div>
          {filtered.map(ing => {
            const isExact = ing.name.trim().toLowerCase() === trimmed;
            return (
              <div key={ing.id}
                className={`px-3 py-2 text-sm flex items-center justify-between cursor-default
                  ${isExact ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'}`}
                data-testid={`ingredient-suggestion-${ing.id}`}>
                <span className="font-medium">{ing.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {ing.categoryName && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{ing.categoryName}</span>
                  )}
                  {isExact && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Already exists</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Edit 2 — InventorySetupPanel.jsx: Remove local IngredientNameCombobox (L23–91)

**Remove** the entire local function from line 23 to line 91 (inclusive):
```js
// FROM: "// BUG-311 Layer 1: typeahead warning combobox..."  (L23)
// TO:   closing "}" of the function                          (L91)
```

---

## Edit 3 — InventorySetupPanel.jsx: Add import

**Anchor:** The existing import block at the top of the file (around lines 1–10).

**Add after the last existing import line:**
```js
import IngredientNameCombobox from './IngredientNameCombobox'; // BUG-311 Layer 1B/L4: shared component
```

Note: The existing Add form usage (`<IngredientNameCombobox value={newIng.name} ...>`) requires no change — `excludeId` defaults to `null`, behaviour unchanged.

---

## Edit 4 — InventorySetupPanel.jsx: Add `isEditDuplicate` useMemo

**Anchor (unique in file):**
```js
  ), [newIng.name, ingredients]
  );
```
*(This is the closing of `isExactDuplicate` useMemo)*

**Insert AFTER that block:**
```js
  // BUG-311 Layer 1B: exact duplicate check for Edit form — self-exclusion via editingId
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

## Edit 5 — InventorySetupPanel.jsx: Swap Edit form `<Input>` (L471–472)

**Current:**
```jsx
                      <Input value={editIng.name} onChange={e => setEditIng(p => ({ ...p, name: e.target.value }))}
                        className="h-8 text-sm" autoFocus data-testid="edit-ingredient-name" />
```

**New:**
```jsx
                      {/* BUG-311 Layer 1B: typeahead combobox for edit form — excludes self via editingId */}
                      <IngredientNameCombobox
                        value={editIng.name}
                        onChange={v => setEditIng(p => ({ ...p, name: v }))}
                        existingIngredients={ingredients}
                        excludeId={editingId}
                        testId="edit-ingredient-name"
                      />
```

---

## Edit 6 — InventorySetupPanel.jsx: Add `disabled` to Edit Save button (L523)

**Current:**
```jsx
                          <Button size="sm" variant="outline" onClick={saveEdit} className="h-7 px-2 text-xs text-blue-700 border-blue-300" data-testid="save-edit-ingredient">Save</Button>
```

**New:**
```jsx
                          <Button size="sm" variant="outline" onClick={saveEdit}
                            disabled={isEditDuplicate}
                            className={`h-7 px-2 text-xs text-blue-700 border-blue-300 ${isEditDuplicate ? 'opacity-50 cursor-not-allowed' : ''}`}
                            data-testid="save-edit-ingredient">Save</Button>{/* BUG-311 Layer 1B: disabled on exact duplicate */}
```

---

## Edit 7 — IngredientBulkEditor.jsx: Add import

**Anchor:** Top of file, after the existing imports (after line 12 approximately).

**Add:**
```js
import IngredientNameCombobox from './IngredientNameCombobox'; // BUG-311 Layer 4: bulk edit name typeahead
```

---

## Edit 8 — IngredientBulkEditor.jsx: Swap bulk name `<input>` (L401–405)

**Current (entire name `<td>` block):**
```jsx
                      <td className={cellCls}>
                        <input ref={isNew && !row.name ? newNameRef : undefined}
                          className={isNew ? newInputCls : inputCls(row.name !== row._originalName)}
                          value={row.name} onChange={e => updateRow(row._key, 'name', e.target.value)}
                          placeholder={isNew ? 'New ingredient name...' : ''} data-testid={`bulk-name-${row._key}`} />
                      </td>
```

**New:**
```jsx
                      <td className={cellCls}>
                        {/* BUG-311 Layer 4: typeahead combobox — position:fixed escapes overflow containers */}
                        {/* excludeId: null for new rows (no self-match), row._id for existing (avoid self-match on rename) */}
                        {/* autoFocus on inner <Input> replaces newNameRef.focus() for new row auto-focus */}
                        <IngredientNameCombobox
                          value={row.name}
                          onChange={v => updateRow(row._key, 'name', v)}
                          existingIngredients={allItems}
                          excludeId={row._isNew ? null : row._id}
                          testId={`bulk-name-${row._key}`}
                        />
                      </td>
```

**Notes:**
- `ref={isNew && !row.name ? newNameRef : undefined}` is removed — `autoFocus` on inner `<Input>` handles new row focus
- `newInputCls` / `inputCls(...)` styling is replaced by the combobox component's internal amber border (exactMatch) and default styling. The green border for new rows (`newInputCls`) is gone — the combobox does not replicate the green-border style.

**Scope question — green border on new rows:**  
The current `newInputCls = "h-8 w-full text-sm border border-green-300 rounded-md px-2 outline-none focus:border-green-500 bg-white"` gives new rows a green border. The `IngredientNameCombobox` uses the default `<Input>` style (grey) with amber override on exact match. The green-border new-row signal is lost.  
**Owner decision:** Accept this — the row itself already has the `bg-green-50/40 border-l-[3px] border-l-green-500` visual (the green left border on the `<tr>`). The name cell doesn't need to also be green.  
**If owner prefers to keep the green input border on new rows:** add a `isNew` prop to the combobox and pass `className="border-green-300 focus:border-green-500"` conditionally. Document as a follow-up.

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Extraction breaks Add form | LOW | `excludeId` defaults `null` — no API change for existing callers |
| R2 | Edit form: exact self-name triggers amber | LOW | `excludeId={editingId}` — self filtered from both `filtered` list and `exactMatch` |
| R3 | Bulk Edit: new row auto-focus regression | LOW | `autoFocus` on inner Input handles this. `newNameRef.focus()` is silent no-op. |
| R4 | Green border lost on new bulk rows | MINOR | Row `<tr>` already has green left border. Acceptable per plan. |
| R5 | categoryName missing in allItems | MEDIUM | Verify `allItems` has `categoryName` field. It comes from `InventorySetupPanel.jsx` L298: `allItems={ingredients}` where `ingredients` is from `inventoryService.getIngredients()` → `inventoryTransform.fromAPI.ingredientList()`. **Must verify categoryName is present in transform.** |

---

## R5 Verification Required — categoryName in allItems

Before implementation: verify the transform includes `categoryName`.

```bash
grep -n "categoryName" /app/frontend/src/api/transforms/inventoryTransform.js | head -10
```

If `categoryName` is present → green (badge will render).
If absent → category badge in dropdown will be hidden (no error, just blank). Acceptable.

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-311 artifact_refs updated with Layer 1B + Layer 4 plan paths
□ 2. BUG_TRACKER.md: BUG-311 row updated with Layer 1B + Layer 4 IMPLEMENTED note
□ 3. FILE_OWNERSHIP.md: IngredientNameCombobox.jsx NEW; InventorySetupPanel.jsx + IngredientBulkEditor.jsx updated
□ 4. Code markers: // BUG-311 Layer 1B on edit input + edit Save; // BUG-311 Layer 4 on bulk name td
□ 5. Compile check: webpack 0 new warnings
```

---

## Verification Matrix (for QA handover)

| # | Edit | How to Verify | Automated? |
|---|---|---|:---:|
| V1 | Edit 5 — edit combobox opens | Pencil edit → type "tom" → dropdown appears | NO |
| V2 | Edit 5 — self-name no amber | Edit "Tomato" → type "Tomato" → no amber border, Save enabled | NO |
| V3 | Edit 5+6 — other name amber + disabled | Edit "Tomato" → type "Butter" (exists) → amber, Save disabled | NO |
| V4 | Edit 8 — bulk new row combobox | Add Item → type existing name → dropdown appears | NO |
| V5 | Edit 8 — bulk existing row self-exclusion | Edit "Tomato" row → type "Tomato" → no amber | NO |
| V6 | Edit 8 — bulk existing row duplicate | Edit "Tomato" row → type "Butter" (exists) → amber | NO |
| V7 | Regression — Add form unchanged | + Add Ingredient → type → still works | NO |
| V8 | Regression — Bulk new row auto-focus | Add Item → name field auto-focused | NO |
| V9 | Regression — Bulk save with duplicate | Add row "Tomato" → Save → Layer 3 toast still fires | NO |

---

## Awaiting Gate 4 GO

Owner must approve before implementation proceeds.
