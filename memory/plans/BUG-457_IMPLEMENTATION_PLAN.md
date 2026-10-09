# BUG-457 — Implementation Plan (Gate 3)
**S1: Addon recipe delete needs `reason` body · S2: deleted row stays listed (missing onRefresh)**

**Date:** 2026-09-24 · **Based on:** `impact/BUG-457_IMPACT_ANALYSIS.md` (Gate 2 CLOSED)
**Code reality re-verified:** NONE. Line numbers confirmed at HEAD.
**OD-457-02 LOCKED:** Addon tab only · **OD-457-03 LOCKED:** YES useMemo

---

## Scope Lock

**Files WILL change (3):**
1. `src/api/services/recipeService.js`
2. `src/components/inventory/RecipeBulkEditor.jsx`
3. `src/components/inventory/RecipeManagementPanel.jsx`

**Files will NOT touch:** all hotspot files · `recipeTransform.js` · any PMS/order file

---

## Edits

### E1 — `src/api/services/recipeService.js`

**E1 — L83–84: add `reason` parameter and body to `deleteAddonRecipe`**
```js
// BEFORE (L83–84):
export async function deleteAddonRecipe(id) {
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_ADDON_RECIPE}/${id}`);
}

// AFTER:
export async function deleteAddonRecipe(id, reason) { // BUG-457
  return api.delete(`${RECIPE_ENDPOINTS.DELETE_ADDON_RECIPE}/${id}`, { data: { reason } }); // BUG-457
}
```

---

### E2 — `src/components/inventory/RecipeBulkEditor.jsx`

> `menuManagementService` already imported at L13. `useMemo` already imported at L6. No new service imports needed.

**E2a — L7: add `AlertDialog` imports**
```js
// BEFORE (L7–9):
import { Search, Plus, Save, ChevronRight, ChevronDown, Trash2, FileDown, Upload, Loader2, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// AFTER:
import { Search, Plus, Save, ChevronRight, ChevronDown, Trash2, FileDown, Upload, Loader2, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'; // BUG-457
```

**E2b — after L68 (`const [rows, setRows] = useState([]);`): add 3 state vars**
```js
// BEFORE (L68):
  const [rows, setRows] = useState([]);

// AFTER:
  const [rows, setRows] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null); // BUG-457: {row} pending confirm
  const [deleteReason, setDeleteReason] = useState('');   // BUG-457
  const [deleteReasons, setDeleteReasons] = useState([]); // BUG-457: from getDeleteReasons()
```

**E2c — after L94 (`const dispatch = DISPATCH[recipeType] || DISPATCH.standard;`): fetch reasons when addon tab active**
```js
// BEFORE (L94):
  const dispatch = DISPATCH[recipeType] || DISPATCH.standard;

// AFTER:
  const dispatch = DISPATCH[recipeType] || DISPATCH.standard;
  useEffect(() => { // BUG-457: pre-load delete reasons for addon tab
    if (recipeType === 'addon' && deleteReasons.length === 0) {
      menuManagementService.getDeleteReasons()
        .then(res => setDeleteReasons(res?.reason || res || []))
        .catch(() => setDeleteReasons(['Item not in menu any more', 'Duplicate item']));
    }
  }, [recipeType]); // eslint-disable-line react-hooks/exhaustive-deps
```

**E2d — L209–221: replace `deleteRow` — open dialog instead of window.confirm**
```js
// BEFORE (L209–221):
  const deleteRow = async (row) => {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r._key !== row._key));
      return;
    }
    if (!window.confirm(`Delete recipe "${row.name}"?`)) return;
    try {
      await dispatch.del(row.id);
      toast.success(`Recipe "${row.name}" deleted`);
      setRows((prev) => prev.filter((r) => r._key !== row._key));
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to delete recipe');
    }
  };

// AFTER:
  const deleteRow = (row) => { // BUG-457: open dialog; actual delete in confirmDelete
    if (row.isNew) { setRows((prev) => prev.filter((r) => r._key !== row._key)); return; }
    setDeleteReason('');
    setDeleteTarget(row);
  };

  const confirmDelete = async () => { // BUG-457
    const row = deleteTarget;
    if (!row) return;
    setDeleteTarget(null);
    try {
      if (recipeType === 'addon') {
        await dispatch.del(row.id, deleteReason);
      } else {
        await dispatch.del(row.id);
      }
      toast.success(`Recipe "${row.name}" deleted`);
      setRows((prev) => prev.filter((r) => r._key !== row._key));
      onRefresh?.(); // BUG-457: S2 fix — re-fetch parent list so stale row doesn't reappear
    } catch (e) {
      toast.error(e?.readableMessage || 'Failed to delete recipe');
    }
  };
```

**E2e — just before the final `return (` of the component: add AlertDialog JSX**
```jsx
{/* BUG-457: delete confirm dialog — reason required for addon tab */}
<AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete recipe "{deleteTarget?.name}"?</AlertDialogTitle>
      <AlertDialogDescription>
        {recipeType === 'addon'
          ? 'Select a reason. This action cannot be undone.'
          : 'This action cannot be undone.'}
      </AlertDialogDescription>
    </AlertDialogHeader>
    {recipeType === 'addon' && (
      <select
        className="w-full h-9 text-sm border border-slate-200 rounded-md px-3 mt-1 outline-none"
        value={deleteReason}
        onChange={e => setDeleteReason(e.target.value)}
        data-testid="delete-reason-select"
      >
        <option value="">Select reason...</option>
        {(deleteReasons.length > 0
          ? deleteReasons
          : ['Item not in menu any more', 'Duplicate item']
        ).map((r, i) => <option key={i} value={r}>{r}</option>)}
      </select>
    )}
    <AlertDialogFooter>
      <AlertDialogCancel data-testid="delete-cancel-btn">Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={confirmDelete}
        disabled={recipeType === 'addon' && !deleteReason}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
        data-testid="delete-confirm-btn"
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### E3 — `src/components/inventory/RecipeManagementPanel.jsx`

**E3 — L583: stabilise `recipes` prop with `useMemo` (OD-457-03)**

`useMemo` is already imported at L3 in this file.

```jsx
// BEFORE (L582–585):
          <RecipeBulkEditor
            recipes={sortRecipes({ standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab])}
            recipeType={activeTab}
            onRefresh={fetchData}

// AFTER:
          <RecipeBulkEditor
            recipes={useMemo(() => sortRecipes({ standard: standardRecipes, sub: subRecipes, addon: addonRecipes }[activeTab]), [activeTab, standardRecipes, subRecipes, addonRecipes, sortRecipes])} // BUG-457 OD-457-03
            recipeType={activeTab}
            onRefresh={fetchData}
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V1 | E1: `deleteAddonRecipe` has `reason` param + body | `grep -A2 "deleteAddonRecipe" recipeService.js` | YES |
| V2 | S1 fix: addon delete with reason → green toast, row removed | Browser: Addon tab → trash → pick reason → Delete → success | NO |
| V3 | S1 fix: addon delete without reason → Delete button disabled | Browser: Addon tab → trash → dialog opens → Delete greyed until reason picked | NO |
| V4 | Standard delete: plain Confirm dialog, no reason field | Browser: Standard tab → trash → dialog has no reason dropdown | NO |
| V5 | Sub delete: plain Confirm dialog, no reason field | Browser: Sub tab → trash → same | NO |
| V6 | S2 fix: deleted recipe gone immediately (no stale row) | Browser: Standard tab → delete → switch tab + back → row absent | NO |
| V7 | S2 fix: `onRefresh?.()` present in `confirmDelete` | `grep onRefresh RecipeBulkEditor.jsx` → ≥2 hits (delete + save) | YES |
| V8 | E3: `useMemo` wraps recipes prop | `grep useMemo RecipeManagementPanel.jsx` → hit on L583 | YES |
| V9 | Cancel closes dialog, no delete | Browser: open dialog → Cancel → recipe still in list | NO |
| V10 | No change to Batch Save onRefresh | `grep onRefresh RecipeBulkEditor.jsx` → L272/277 still present | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-457 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: recipeService.js + RecipeBulkEditor.jsx + RecipeManagementPanel.jsx with BUG-457 + date
- [ ] Code markers: // BUG-457 on every modified line
- [ ] Compile: yarn build exit 0, 0 new warnings
```
