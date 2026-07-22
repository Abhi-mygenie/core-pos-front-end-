# BUG-218 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-23 (revised after curl verification)
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-218 |
| Title | Delete Ingredient — No Blocking Error When Used in Recipe |
| Priority | P1 |
| Risk | **MEDIUM → LOW after fix** |
| Code Reality | **CONFIRMED** — `InventorySetupPanel.jsx:86-93` calls `deleteIngredient(id)` with only `window.confirm()` guard. Backend returns HTTP 400 with structured recipe list (curl-verified 2026-07-23) but FE only shows generic `toast.error('Failed to delete')`. **No new backend endpoint needed.** |
| Conflict Pre-Check | `InventorySetupPanel.jsx` also targeted by BUG-219 (labels/inputs), BUG-220 (category dup check), CR-090 (category edit/delete). **Execution order: BUG-218 FIRST** — touches only `deleteIngredient()` function. Other bugs touch `addCategory()`, form inputs, category sidebar — different scopes. Parallel-safe within a single implementation session. |

---

## Q1 & Q2 — Both Resolved via Curl Verification (2026-07-23)

### Q2 — Does backend block delete or silently delete?

**CONFIRMED: Backend blocks with HTTP 400 + full recipe list.**

```bash
DELETE /api/v2/vendoremployee/inventory/ingredient/10741
Authorization: Bearer <token>
→ HTTP 400
```

```json
{
  "success": false,
  "message": "Cannot delete. This ingredient is used in recipes.",
  "data": {
    "ingredient_name": "Base Cream",
    "used_in_recipes": [
      "Blueberry Shab-E-jamun",
      "Aam-E-Bahaar Kunafa",
      "50-50 Bluebeery",
      "Heart Shape kunafa",
      "50-50 Aam -E -Bahar"
    ],
    "recipe_count": 5,
    "reason": "ingredient_used_in_main_recipes"
  }
}
```

Evidence saved: `/app/memory/evidence/BUG-218/delete_in_use_response.json`

### Q1 — Block or allow force-delete?

**Owner decision (2026-07-23): BLOCK.** Backend already hard-blocks (HTTP 400, no force-delete option in API). Owner confirmed: same pattern as expenses. Fix scope: FE must parse the 400 error and surface the recipe list properly — no "Delete Anyway" button.

---

## Data Flow Trace

```
User clicks Trash icon on ingredient row
  → deleteIngredient(id, name) called  [InventorySetupPanel.jsx:86]
      → window.confirm(`Delete "${name}"?`)          ← basic confirm only
          IF confirmed:
          → inventoryService.deleteIngredient(id)
              → api.delete(`/api/v2/vendoremployee/inventory/ingredient/${id}`)

          PATH A — ingredient NOT in any recipe:
          → HTTP 200 {"success":true}
          → toast.success(`"${name}" deleted`)  ← WORKS CORRECTLY

          PATH B — ingredient IS in a recipe:
          → HTTP 400 {
              success: false,
              message: "Cannot delete. This ingredient is used in recipes.",
              data: { used_in_recipes: [...], recipe_count: N, ... }
            }
          → catch(err) → toast.error('Failed to delete')  ← BUG ROOT
            ↑ err.response.data.data.used_in_recipes never read
            ↑ owner sees "Failed to delete" with no explanation
```

---

## Exact Change Required

### File: `components/inventory/InventorySetupPanel.jsx`

**Current `deleteIngredient()` (lines ~86-93):**
```js
const deleteIngredient = async (id, name) => {
  if (!window.confirm(`Delete "${name}"?`)) return;
  try {
    await inventoryService.deleteIngredient(id);
    toast.success(`"${name}" deleted`);
    await fetchData();
  } catch (err) {
    toast.error(err?.readableMessage || 'Failed to delete');
  }
};
```

**Required change:**
1. Add state: `const [deleteBlocker, setDeleteBlocker] = useState(null);`
   - `deleteBlocker` = `null` (closed) or `{ name, recipes: [], count: N }` (open)
2. In catch block: check `err?.response?.data?.data?.used_in_recipes` before generic toast
3. Add a `<Dialog>` that renders when `deleteBlocker !== null`:
   - Title: `Cannot Delete "${deleteBlocker?.name}"`
   - Body: "This ingredient is used in **N recipe(s)**:" + bulleted list of recipe names
   - Footer: "Remove this ingredient from those recipes first." + single **Close** button

**New catch block:**
```js
} catch (err) {
  const apiData = err?.response?.data?.data;
  if (apiData?.used_in_recipes?.length) {
    setDeleteBlocker({
      name,
      recipes: apiData.used_in_recipes,
      count: apiData.recipe_count,
    });
  } else {
    toast.error(err?.readableMessage || 'Failed to delete');
  }
}
```

**New Dialog JSX (added to IngredientsTab return):**
```jsx
<Dialog open={!!deleteBlocker} onOpenChange={() => setDeleteBlocker(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cannot Delete "{deleteBlocker?.name}"</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-gray-600">
      This ingredient is used in <strong>{deleteBlocker?.count}</strong> recipe(s):
    </p>
    <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-gray-700">
      {deleteBlocker?.recipes.map((r, i) => <li key={i}>{r}</li>)}
    </ul>
    <p className="mt-3 text-xs text-gray-500">
      Remove this ingredient from those recipes before deleting.
    </p>
    <DialogFooter>
      <Button onClick={() => setDeleteBlocker(null)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Files WILL Change

| File | Change |
|---|---|
| `components/inventory/InventorySetupPanel.jsx` | +`deleteBlocker` state + catch-block parse + Dialog JSX (~30 lines) |

## Files WILL NOT Touch

| File | Reason |
|---|---|
| `api/services/inventoryService.js` | `deleteIngredient(id)` function unchanged |
| `api/transforms/inventoryTransform.js` | No transform change |
| `api/constants.js` | No new endpoint needed |
| `api/services/recipeService.js` | Not needed — backend returns recipe list in delete error |
| Backend | Already implemented — no backend brief needed |

---

## Risk Classification: **LOW** (after fix)

| Factor | Assessment |
|---|---|
| Blast radius | 1 file, ~30 lines |
| API contract change | NONE — same delete call, new catch handler only |
| Financial risk | NONE |
| Hotspot (R5) | NO |
| Data integrity risk | RESOLVED — backend blocks delete; FE just shows proper UI |
| Regression risk | NONE — success path unchanged |

---

## Owner Decision Queue

**No open decisions.** Both Q1 and Q2 resolved via curl verification:
- Q1: **BLOCK** (no force-delete — owner confirmed + backend enforces)
- Q2: **Backend returns HTTP 400 + `data.used_in_recipes[]`** (confirmed on preprod 2026-07-23)

---

## Backend Blockers Brief

**Not required.** Backend already implements the impact check correctly.
Impact analysis for BUG-218 confirmed as **FE-only fix.**

---

## Effort Estimate

| Item | Value |
|---|---|
| Files | 1 (`InventorySetupPanel.jsx`) |
| Lines | ~30 added |
| New import | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog` |
| Test | Delete "Base Cream" (in 5 recipes) → Dialog shows "Cannot Delete... used in 5 recipe(s): [list]". Delete an unused ingredient → normal confirm + success. |
| Risk | LOW |
