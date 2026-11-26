# BATCH-D · BUG-669 (Block saving add-on with empty price, allow ₹0) — Implementation Plan (Gate 3) — 2026-11-15

> Status: GATE_3_PLAN_DRAFT
> HEAD commit: 66ffe518
> Risk: MEDIUM (menu master data validation; prices feed billing)
> Conflicts: AddonManagementPanel.jsx — BUG-608 (5A) edited same price input (onChange/onBlur). Keep BUG-392 (onWheel), BUG-394 (special chars), BUG-608 (select on focus) behaviour. ProductForm.jsx — BUG-608 (5A). No line overlap with L628.
> Scope: **Add-on part ONLY.** Variation part waits for owner's exact repro steps (OD-669-C open).

## 1. What changes
Fix the add-on save guard so ₹0 is allowed but empty price is blocked with a toast message "Enter a price (0 is allowed)". Two sites: AddonManagementPanel (S1) and ProductForm new add-on (S2).

## 2. Files changed

| # | File | Line at HEAD | What changes |
|---|------|-------------|--------------|
| E1 | `src/components/panels/menu/AddonManagementPanel.jsx` | L48 (`handleAdd` guard) | Change `!addForm.price` to `addForm.price === '' \|\| addForm.price == null` + toast |
| E2 | `src/components/panels/menu/AddonManagementPanel.jsx` | L156 (price input `onChange`/`onBlur`) | Allow empty state: remove onBlur auto-fill of 0 for the ADD row (OD-669-A) |
| E3 | `src/components/panels/menu/ProductForm.jsx` | L628 (`!newAddonPrice` guard) | Change to `newAddonPrice === ''` + toast |

## 3. Exact edits

### E1 — AddonManagementPanel.jsx L48

**Before:**
```js
    if (!addForm.name.trim() || !addForm.price) return;
```
**After:**
```js
    if (!addForm.name.trim()) return;
    if (addForm.price === '' || addForm.price == null) { // BUG-669: allow 0, block empty
      toast({ title: 'Price required', description: 'Enter a price (0 is allowed)', variant: 'destructive' });
      return;
    }
```

### E2 — AddonManagementPanel.jsx L156 (price input)

**Before (single line, reformatted for readability):**
```jsx
<input type="number" value={addForm.price} onWheel={e => e.target.blur()} onFocus={e => e.target.select()} onChange={e => { if (e.target.value === '') return; const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0) setAddForm(p => ({ ...p, price: n })); }} onBlur={e => { if (e.target.value === '') setAddForm(p => ({ ...p, price: 0 })); }} // BUG-392 // BUG-394 // BUG-608
```

**After:**
```jsx
<input type="number" value={addForm.price} onWheel={e => e.target.blur()} onFocus={e => e.target.select()} onChange={e => { const v = e.target.value; if (v === '') { setAddForm(p => ({ ...p, price: '' })); return; } const n = parseFloat(v); if (!isNaN(n) && n >= 0) setAddForm(p => ({ ...p, price: n })); }} onBlur={e => { /* BUG-669: keep empty — save guard shows toast */ }} // BUG-392 // BUG-394 // BUG-608 // BUG-669
```

Key change: `onChange` now allows setting price to `''` (empty string) when the user clears the box. `onBlur` no longer auto-fills 0 — the save guard (E1) will catch the empty state with a toast.

### E3 — ProductForm.jsx L628

**Before:**
```js
                if (!newAddonName.trim() || !newAddonPrice) return;
```
**After:**
```js
                if (!newAddonName.trim()) return;
                if (newAddonPrice === '') { toast({ title: 'Price required', description: 'Enter a price (0 is allowed)', variant: 'destructive' }); return; } // BUG-669
```

## 4. Test steps
| # | Steps | Expected |
|---|-------|----------|
| V1 | Menu Mgmt → Add-ons → name + price 0 → save | Saved, shows ₹0 in list |
| V2 | Name + empty price → save | Blocked, toast "Enter a price (0 is allowed)" |
| V3 | Name + price 50 → save | Saved normally |
| V4 | Product form → new add-on → price 0 → save | Saved |
| V5 | Product form → new add-on → empty price → save | Blocked, toast |
| V6 | Add-on edit (inline) → change to 0 | Saved (edit path has no price check — unchanged, L65-79) |
| V7 | Regression: BUG-392 onWheel, BUG-394 special chars, BUG-608 select-on-focus | All still work |
| V8 | Webpack compile | 0 new warnings |

## 5. Rebase note
- BUG-608 (5A) changed the same `onChange`/`onBlur` handlers. Verify the exact code at implementation time matches the "Before" shown above. If BUG-608 landed differently, adjust accordingly — the intent (allow empty, catch at save) stays the same.

## 6. Scope lock
**WILL change:** AddonManagementPanel.jsx (L48, L156), ProductForm.jsx (L628)
**WILL NOT touch:** VariationExpandPanel, BulkEditor, AddonExpandPanel, any transform/API, ProductCard price inputs
