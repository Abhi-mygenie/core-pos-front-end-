# CR-090 — Implementation Plan (Gate 3) — DELETE ONLY

**ID:** CR-090
**Title:** Inventory Categories — Delete
**Date:** 2026-07-25
**Risk:** MEDIUM
**Scope:** DELETE only. Edit (rename) deferred — backend PUT endpoint does not exist yet (OQ-1 = B).
**Impact Analysis:** `/app/memory/impact/CR-090_IMPACT_ANALYSIS.md`

---

## Owner Decisions Applied

- **OQ-1 = B:** Ship DELETE only. Edit deferred until backend ships PUT endpoint.
- **OQ-2 = B (default):** Show trash icon on all categories; display error on click for franchise-locked or non-empty categories.

---

## Scope Lock

### Files WILL change:
1. `api/constants.js` — +1 line
2. `api/services/inventoryService.js` — +4 lines
3. `components/inventory/InventorySetupPanel.jsx` — ~25 lines (handler + sidebar JSX)

### Files will NOT touch:
- `inventoryTransform.js`, `IngredientBulkEditor.jsx`, any report/financial/hotspot files

---

## Edit Sequence

### Edit 1: `api/constants.js` — Add DELETE endpoint constant

**Location:** Line 158, after `STORE_CATEGORY`

**Current (L157-158):**
```js
  STOCK_CATEGORIES: '/api/v2/vendoremployee/inventory/stock-item-categories',
  STORE_CATEGORY: '/api/v2/vendoremployee/inventory/stock-item-categories/store',
```

**New (L157-159):**
```js
  STOCK_CATEGORIES: '/api/v2/vendoremployee/inventory/stock-item-categories',
  STORE_CATEGORY: '/api/v2/vendoremployee/inventory/stock-item-categories/store',
  DELETE_STOCK_CATEGORY: '/api/v2/vendoremployee/inventory/stock-item-categories/delete', // CR-090
```

---

### Edit 2: `api/services/inventoryService.js` — Add deleteCategory function

**Location:** After line 60 (end of `storeCategory`), before the `// ── Stock` section comment.

**Insert after L60:**
```js
// CR-090: Delete inventory category
export async function deleteCategory(id) {
  return api.delete(`${INVENTORY_ENDPOINTS.DELETE_STOCK_CATEGORY}/${id}`);
}
```

---

### Edit 3: `components/inventory/InventorySetupPanel.jsx` — Delete handler + trash icon

**3a — Add deleteCategory handler inside IngredientsTab (after addCategory function, ~L92)**

```js
// CR-090: Delete category handler (DELETE only — edit deferred)
const deleteCategory = async (cat) => {
  if (!window.confirm(`Delete category "${cat.name}"?`)) return;
  try {
    const res = await inventoryService.deleteCategory(cat.id);
    if (res?.data?.success === false) {
      toast.error(res.data.message || 'Cannot delete category');
      return;
    }
    toast.success(`Category "${cat.name}" deleted`);
    if (selectedCat === cat.id) setSelectedCat(null);
    await fetchData();
  } catch (err) {
    // 403 PUSHED_CATALOG_LOCKED or other backend errors
    const msg = err?.response?.data?.message || err?.readableMessage || 'Failed to delete category';
    toast.error(msg);
  }
};
```

**3b — Modify category sidebar rows (L209-216) to add Trash icon**

**Current (L209-216):**
```jsx
{categories.map(cat => (
  <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedCat === cat.id ? 'bg-orange-50 text-orange-700 font-medium border-l-2 border-orange-500' : 'text-slate-600 hover:bg-slate-50'}`}
    data-testid={`cat-${cat.id}`}>
    <span className="truncate">{cat.name}</span>
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedCat === cat.id ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{catCounts[cat.id] || 0}</span>
  </button>
))}
```

**New:**
```jsx
{categories.map(cat => (
  <div key={cat.id} className="group flex items-center gap-0.5" data-testid={`cat-${cat.id}`}>
    <button onClick={() => setSelectedCat(cat.id)}
      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedCat === cat.id ? 'bg-orange-50 text-orange-700 font-medium border-l-2 border-orange-500' : 'text-slate-600 hover:bg-slate-50'}`}>
      <span className="truncate">{cat.name}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedCat === cat.id ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>{catCounts[cat.id] || 0}</span>
    </button>
    <button onClick={() => deleteCategory(cat)}
      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all flex-shrink-0"
      data-testid={`cat-delete-${cat.id}`}
      title={`Delete ${cat.name}`}>
      <Trash2 className="w-3 h-3" />
    </button>
  </div>
))}
```

**Key UX details:**
- Trash icon is hidden by default, appears on hover (`group` + `opacity-0 group-hover:opacity-100`)
- `window.confirm` before API call
- Three error paths handled: `success: false` (has ingredients), `403` (franchise-locked), generic error
- If deleting the currently-selected category, filter resets to "All"

---

## Verification Matrix

| # | File | Change | How to Verify | Automated? |
|---|------|--------|---------------|:---:|
| V1 | `constants.js` | DELETE_STOCK_CATEGORY constant | `grep DELETE_STOCK_CATEGORY constants.js` | YES |
| V2 | `inventoryService.js` | deleteCategory function | `grep -n deleteCategory inventoryService.js` | YES |
| V3 | `InventorySetupPanel.jsx` | Trash icon visible on hover | Browser: hover category row → trash appears | NO |
| V4 | `InventorySetupPanel.jsx` | Delete empty category | Browser: click trash on empty category → confirm → category removed | NO |
| V5 | `InventorySetupPanel.jsx` | Delete blocked (has ingredients) | Browser: click trash on category with ingredients → toast error "Unable to delete..." | NO |
| V6 | `InventorySetupPanel.jsx` | Delete blocked (franchise-locked) | Browser: click trash on pushed category → toast error "This catalogue item is managed..." | NO |
| V7 | `InventorySetupPanel.jsx` | Delete selected category resets filter | Browser: select cat → delete it → filter resets to All | NO |

---

## Post-Code Registry Checklist

- [ ] registry.json: CR-090 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add 3 files with CR-090 + date
- [ ] Code markers: `// CR-090` comment in every modified file

---

## Execution Order

1. Edit 1 (constants.js) — no dependency
2. Edit 2 (inventoryService.js) — imports constant from Edit 1
3. Edit 3a+3b (InventorySetupPanel.jsx) — imports function from Edit 2
4. Compile check
5. Self-verification (V1-V2 automated, V3-V7 browser)

**All 3 edits can be applied in parallel** (import resolution happens at runtime, not file creation time).

---

## Deferred

- **Edit (rename):** Blocked on backend PUT endpoint. When backend ships it, a new implementation cycle (Intake → Gate 2 → Gate 3 → Impl) will be needed for ~15 additional lines (inline input + renameCategory service function + PUT constant).
