# BUG-218 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-23
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-218 |
| Title | Delete Ingredient — No Blocking Error When Used in Recipe |
| Priority | P1 |
| Risk | **MEDIUM** |
| Code Reality | **CONFIRMED** — `InventorySetupPanel.jsx:86-93` calls `deleteIngredient(id)` immediately after `window.confirm()`. Zero recipe-usage pre-check. No impact endpoint in `constants.js`. Pattern exists: BUG-201 (expense deletion safety) solved the same problem in the expense module. |
| Conflict Pre-Check | `InventorySetupPanel.jsx` was last modified by BUG-212 (2026-07-21). BUG-219 and BUG-220 also target this same file. CR-090 (Inventory Categories Edit/Delete) targets the category sidebar section of this same file. **Execution order: BUG-218 BEFORE BUG-219, BUG-220, CR-090.** All four touch different functions within `InventorySetupPanel.jsx` — parallel-safe within a single implementation session if each touches a distinct function scope. |

---

## Data Flow Trace

```
User clicks Trash icon on ingredient row
  → InventorySetupPanel.jsx:86 — deleteIngredient(id, name) called
      → window.confirm(`Delete "${name}"?`)   ← sole guard, no recipe check
          IF confirmed:
          → inventoryService.deleteIngredient(id)
              → api.delete(`${INVENTORY_ENDPOINTS.DELETE_INGREDIENT}/${id}`)
              → DELETE /api/v2/vendoremployee/inventory/ingredient/{id}
              → If API allows: ingredient deleted from backend
              → All recipe rows referencing this ingredient_id now reference
                a deleted record → recipe ingredient list shows stale/broken data

NO pre-delete check at any layer:
  - No GET /ingredient/{id}/impact endpoint in constants.js
  - No frontend cross-reference to recipeService
  - No backend 422 guard confirmed (unknown — see Owner Decision Queue)
```

---

## Exact Lines Involved

### Current code — `InventorySetupPanel.jsx:86-93`
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

### Current code — `inventoryService.js:18-19`
```js
export async function deleteIngredient(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_INGREDIENT}/${id}`);
}
```

**No impact-check function exists.** No `GET_INGREDIENT_IMPACT` constant exists in `constants.js:147-183`.

---

## Fix Design

### Option A — Frontend cross-reference (Recommended — no backend change needed)
On trash-icon click, before showing any confirm:
1. Fetch recipes that reference this ingredient by calling `recipeService.getRecipes()`, `recipeService.getSubRecipes()`, `recipeService.getAddonRecipes()` (all already wired).
2. Filter: find all recipes where `recipe.ingredients.some(i => i.id === targetId)`.
3. **If recipes found** → show a Dialog (Radix/shadcn) listing:
   - "This ingredient is used in N recipe(s): [Recipe A, Recipe B…]"
   - Buttons: **Cancel** (safe default) + **Delete Anyway** (destructive, only if owner approves)
4. **If no recipes found** → proceed with existing confirm + delete flow.

### Option B — Backend impact endpoint (Requires owner confirmation)
Call `GET /api/v2/vendoremployee/inventory/ingredient/{id}/impact` before delete.
Returns count + names of recipes using this ingredient.
**Blocked on:** Owner confirming this endpoint exists on preprod.

### Recommended: Option A
- Zero backend dependency.
- Recipe data is small (pre-fetched in same module section).
- Matches BUG-201 pattern (expense deletion safety) already approved and shipped.
- `recipeService.js` is already imported in the same src directory.

---

## Files WILL Change

| File | Change |
|---|---|
| `components/inventory/InventorySetupPanel.jsx` | Replace `deleteIngredient()` with impact-check version; add `confirmDelete` / `recipeUsageList` state; add `<Dialog>` JSX for blocking modal |

## Files WILL NOT Touch

| File | Reason |
|---|---|
| `api/services/inventoryService.js` | `deleteIngredient(id)` API call unchanged |
| `api/transforms/inventoryTransform.js` | No transform change |
| `api/constants.js` | No new endpoint needed (Option A uses existing recipe endpoints) |
| `api/services/recipeService.js` | Called read-only via import; no modification |
| `RecipeManagementPanel.jsx` | Reads recipe data; not involved in delete flow |

---

## Risk Classification: **MEDIUM**

| Factor | Assessment |
|---|---|
| Blast radius | 1 file (`InventorySetupPanel.jsx`) |
| API contract change | NONE (read-only recipe fetch added; delete endpoint unchanged) |
| Financial risk | NONE |
| Hotspot (R5) | NO |
| Regression risk | LOW — delete flow only gains a pre-check step; existing delete path preserved |
| Data risk | MEDIUM → HIGH if NOT fixed (deleting in-use ingredient corrupts recipe data) |

---

## Owner Decision Queue

**Q1 (BUG-218):** If an ingredient IS used in recipes, should the owner be allowed to force-delete anyway, or should delete be fully blocked?

- **Option A (Recommended):** Show warning + allow "Delete Anyway" with destructive styling — matches BUG-201 expense pattern. Owner retains control.
- **Option B:** Fully block delete — owner must remove ingredient from all recipes first. Safer, but requires extra steps.
- If Option B chosen: add a helper message: "To delete, remove this ingredient from: [Recipe A, Recipe B…]."

**Q2 (BUG-218):** Does the backend (`DELETE /api/v2/vendoremployee/inventory/ingredient/{id}`) currently block deletion when the ingredient is in a recipe (returns 409/422), or does it silently allow it?

- Confirmation would determine whether a frontend guard is the *only* line of defence or a redundant layer.
- **Agent recommendation:** Add frontend guard regardless — user experience must never rely solely on backend error messages.

---

## Downstream Consumers (affected by ingredient deletion if no guard)

| Consumer | Impact if ingredient deleted |
|---|---|
| `RecipeFormPanel.jsx` — recipe ingredient rows | `ingredient_name` field becomes stale/orphaned |
| `RecipeBulkEditor.jsx` — bulk editor ingredient column | Orphaned ingredient rows in bulk editor |
| `purchasePlanner.js` — DCR cross-join | Ingredient removed from smart purchase plan silently |
| `IngredientBulkEditor.jsx` — bulk editor list | Ingredient disappears from bulk editor (correct) |

---

## Effort Estimate

| Item | Value |
|---|---|
| Files | 1 (`InventorySetupPanel.jsx`) |
| Lines | ~35-45 added/changed (state vars + impact fetch + Dialog JSX) |
| New import | `import * as recipeService from '@/api/services/recipeService'` |
| New component | `<Dialog>` (already installed via shadcn — `/app/frontend/src/components/ui/dialog.jsx`) |
| Test | Click delete on in-use ingredient → modal lists recipes. Click delete on unused ingredient → window.confirm → deletes. |
| Risk | MEDIUM |
