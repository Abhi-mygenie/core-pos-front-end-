# Implementation Plan — BUG-311 Layer 5: Bulk Edit Save Button Blocked on Duplicate Names

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-15
**Based on:** `memory/impact/BUG-311-LAYER5_BULK_SAVE_DISABLE_IMPACT_ANALYSIS.md`
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Pre-Plan Verification

| Target | IA Claim | Live Code | Match? |
|---|---|---|---|
| `dirtyCount` anchor | `const dirtyCount = useMemo(...)` at L98 | Confirmed L98 ✅ | ✅ |
| `catMap` after dirtyCount | `const catMap = useMemo(...)` at L99 | Confirmed L99 ✅ | ✅ |
| Top Save button disabled | `disabled={saving \|\| dirtyCount === 0}` at L323 | Confirmed L323 ✅ | ✅ |
| Bottom Save button disabled | `disabled={saving \|\| dirtyCount === 0}` at L496 | Confirmed L496 ✅ | ✅ |
| handleSave EDITED path | `} else { await inventoryService.updateIngredient(r._id, r); }` at L204–205 | Confirmed L204-205 ✅ | ✅ |

---

## Scope Lock

| File | Change | Touch? |
|---|---|---|
| `components/inventory/IngredientBulkEditor.jsx` | 4 edits: +`hasDuplicateInDirty` useMemo + top Save disabled + bottom Save disabled + handleSave EDITED guard | ✅ YES |
| All other files | — | ❌ NO |

---

## Execution Order

```
Edit 1 → Add hasDuplicateInDirty useMemo after catMap (L99)
Edit 2 → Top Save button: add || hasDuplicateInDirty to disabled (L323)
Edit 3 → Bottom Save button: add || hasDuplicateInDirty to disabled (L496)
Edit 4 → handleSave: add duplicate guard for EDITED rows before updateIngredient (L204)
```

---

## Edit 1 — Add `hasDuplicateInDirty` useMemo

**Location:** After line 99 (after `catMap` useMemo).

**Anchor (unique):**
```js
  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);
```

**Insert AFTER:**
```js
  // BUG-311 Layer 5: proactive duplicate check — disables Save before user clicks
  // Covers: new row vs DB, edited row vs DB (excl. self), cross-row same-name within dirty set
  const hasDuplicateInDirty = useMemo(() => {
    const dirtyRows = rows.filter(r => !r._deleted && isDirty(r));
    if (dirtyRows.length === 0) return false;
    for (const r of dirtyRows) {
      const name = (r.name || '').trim().toLowerCase();
      if (!name) continue;
      if (r._isNew && allItems.some(i => i.name.trim().toLowerCase() === name)) return true;
      if (!r._isNew && allItems.some(i => i.name.trim().toLowerCase() === name && i.id !== r._id)) return true;
      if (dirtyRows.some(o => o._key !== r._key && (o.name || '').trim().toLowerCase() === name)) return true;
    }
    return false;
  }, [rows, allItems]);
```

---

## Edit 2 — Top Save button: add `hasDuplicateInDirty` to disabled

**Current (L322–323):**
```jsx
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save">
```

**New:**
```jsx
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave} disabled={saving || dirtyCount === 0 || hasDuplicateInDirty} data-testid="bulk-save">{/* BUG-311 L5: block on duplicate */}
```

---

## Edit 3 — Bottom Save button: add `hasDuplicateInDirty` to disabled

**Current (L495–496):**
```jsx
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave} disabled={saving || dirtyCount === 0} data-testid="bulk-save-footer">
```

**New:**
```jsx
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSave} disabled={saving || dirtyCount === 0 || hasDuplicateInDirty} data-testid="bulk-save-footer">{/* BUG-311 L5: block on duplicate */}
```

---

## Edit 4 — `handleSave`: duplicate guard for EDITED rows (defense-in-depth)

**Current (L204–205):**
```js
        } else {
          await inventoryService.updateIngredient(r._id, r);
        }
```

**New:**
```js
        } else {
          // BUG-311 L5b: defence-in-depth guard for edited rows (primary guard is hasDuplicateInDirty)
          const editDupName = (r.name || '').trim().toLowerCase();
          const editDup = allItems.some(i => i.name.trim().toLowerCase() === editDupName && i.id !== r._id);
          if (editDup) {
            setRows(prev => prev.map(x => x._key === r._key
              ? { ...x, _saving: false, _saveError: `"${r.name}" already exists` } : x));
            fail++; continue;
          }
          await inventoryService.updateIngredient(r._id, r);
        }
```

---

## Risk Register

| # | Risk | Mitigation |
|---|---|---|
| R1 | `hasDuplicateInDirty` blocks save on pending delete rows | Filter: `rows.filter(r => !r._deleted && isDirty(r))` — deleted rows excluded. ✅ |
| R2 | Empty name row causes infinite false positive | `if (!name) continue` skips empty name rows. ✅ |
| R3 | Edit 4 guard fires for rows the user didn't intend to rename | Only applies to `dirty` rows (`r._id` present + `name !== _originalName`). ✅ |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-311 → status: IMPLEMENTED — QA pending (Gate 5a), Layer 5 added
□ 2. BUG_TRACKER.md: BUG-311 row updated with Layer 5 + 5b note
□ 3. FILE_OWNERSHIP.md: IngredientBulkEditor.jsx row updated with BUG-311 Layer 5
□ 4. Code markers: // BUG-311 Layer 5 on hasDuplicateInDirty + both Save buttons; // BUG-311 L5b on handleSave else branch
□ 5. Compile check: webpack 0 new warnings
```

---

## Verification Matrix (for QA handover)

| # | Edit | How to Verify | Automated? |
|---|---|---|:---:|
| V1 | Edit 1+2+3 — NEW row duplicate blocks toolbar Save | Add Item → type existing name → top "Save N Changes" greyed | NO |
| V2 | Edit 1+2+3 — NEW row duplicate blocks footer Save | Same as V1 → bottom "Save N Changes" greyed | NO |
| V3 | Edit 1+2+3 — EDITED row renamed duplicate blocks Save | Rename row to existing name → both Save buttons greyed | NO |
| V4 | Edit 1+2+3 — two NEW same name blocks Save | Add Item twice, type same name → both Save buttons greyed | NO |
| V5 | Edit 1+2+3 — unique name doesn't block Save | Add Item, type unique name → Save active | NO |
| V6 | Edit 4 — defence-in-depth EDITED guard | (Theoretical) Edited row duplicate → `_saveError` badge fires | NO |
| V7 | Regression — delete rows don't trigger false block | Mark row for delete → Save active as before | NO |
| V8 | Regression — Layer 3 NEW row guard still fires | Add row "existing-name" → Save → error badge appears | NO |

---

## Awaiting Gate 4 GO
