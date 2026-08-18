# BUG-214 — Impact Analysis
**Gate:** 2
**Produced:** 2026-07-22
**Agent Role:** PLANNING

---

## Header

| Field | Value |
|---|---|
| ID | BUG-214 |
| Title | Addon Recipe Dropdown Shows Menu Items Instead of Addon Items |
| Priority | P1 |
| Code Reality | **CONFIRMED** — `RecipeFormPanel.jsx:150`: `(addons.length > 0 ? addons : foods)` fallback to `foods` when addon list empty; `RecipeFormPanel.jsx:51`: silent `catch {}` swallows `getActiveAddons()` errors |
| Conflict Pre-Check | `RecipeFormPanel.jsx` — 0 other open items. **CLEAR.** BUG-215 in same batch modifies different sections (state + validation). Parallel-safe. |

---

## Data Flow Trace

```
RecipeFormPanel.jsx:50-51 (useEffect)
  if (recipeType === 'addon')
    addonList = await recipeService.getActiveAddons()
    ← calls GET /api/v2/vendoremployee/product/addon-list
    ← preprod returns [] (0 addon items on this account)
    catch { /* addon list optional — SILENT */ }   ← errors swallowed

RecipeFormPanel.jsx:55
  setAddons(addonList)   ← addonList = [] or whatever API returns

RecipeFormPanel.jsx:150
  {(addons.length > 0 ? addons : foods).map(...)}
  ← addons.length === 0 → falls back to foods (menu items)
  ← owner sees FOOD ITEMS (Aloo Paratha, waffles etc.) in the addon dropdown
```

**Confirmed via preprod API:** `GET /api/v2/vendoremployee/product/addon-list` returns `[]` → fallback to foods fires.

---

## Exact Lines to Change

**File:** `components/inventory/RecipeFormPanel.jsx`

### Fix A — Line 51: Remove silent catch
```js
// CURRENT:
try { addonList = await recipeService.getActiveAddons(); } catch { /* addon list optional */ }

// FIX:
try {
  addonList = await recipeService.getActiveAddons();
} catch {
  toast.error('Failed to load addon items');
}
```

### Fix B — Line 150: Remove foods fallback
```jsx
// CURRENT:
{(addons.length > 0 ? addons : foods).map(a => <option key={a.id} value={a.id}>...)}

// FIX:
{addons.length === 0
  ? <option value="" disabled>No addon items found — add in Menu first</option>
  : addons.map(a => <option key={a.id} value={a.id}>{a.name}{a.price ? ` (₹${a.price})` : ''}</option>)
}
```

### Fix C — Line 64-68: Also fix edit-mode reverse-lookup (uses same fallback)
```js
// CURRENT (line 65-67):
const match = addonList.length > 0
  ? addonList.find(a => a.name.toLowerCase() === recipe.addonName.toLowerCase())
  : foodList.find(f => f.name.toLowerCase() === recipe.addonName.toLowerCase()); // ← wrong fallback

// FIX:
const match = addonList.find(a => a.name.toLowerCase() === recipe.addonName.toLowerCase());
```

---

## Risk Classification: **MEDIUM → LOW after fix**
- Blast radius: 1 file (`RecipeFormPanel.jsx`), ~8 lines
- Regression risk: LOW — only affects `recipeType === 'addon'` path
- Fix C changes edit-mode lookup — test edit of existing addon recipe (if any exist)
- No API changes, no data model changes

---

## Owner Decision Queue

**No owner decisions required.**
- Empty dropdown placeholder text is standard UX ("No addon items found — add in Menu first")
- Error surfacing on `getActiveAddons()` failure is standard UX

---

## Effort Estimate
- Files: 1 (`RecipeFormPanel.jsx`)
- Lines: ~8 changed
- Test: Create addon recipe → verify dropdown shows only addon items (not menu items); verify empty state shows placeholder
- Risk: LOW
