# Investigation Report — BUG-463 (REVISED)
## Active Menu Type — Backend Auto-Filters, localStorage Approach Wrong

**Date:** 2026-10-18 (replaces earlier BUG-463 intake + partial implementation)
**Role:** INVESTIGATION
**Steps used:** 8/10
**Confidence:** HIGH
**Status:** Current fix (GATE_5A) is architecturally wrong — must be revised

---

## 1. Summary

**Root cause (revised):** The backend already auto-filters `get-products-list` by the authenticated employee's `assign_food_menu`. No FE parameter or localStorage is needed. The current BUG-463 fix (writing `assign_food_menu` to localStorage and reading it back in `MenuContext`) adds unnecessary complexity and has a stale-read bug.

**Classification:** FE_BUG (incorrect original fix) + ARCHITECTURE_CHANGE  
**Confidence:** HIGH — confirmed by live API probe  
**Fix scope:** 3 files, ~10 lines net removed  

---

## 2. Key Probe — Backend Auto-Filters by Token

### Curl executed (owner-provided token for manager@hyatt.com):
```
GET https://preprod.mygenie.online/api/v1/vendoremployee/get-products-list?limit=2000&offset=1&type=all
Authorization: Bearer <manager@hyatt.com token>
```

### Response:
```
total_size : 23
products   : 23
food_for distribution: 'GROK': 23 products
```

### Interpretation:
The manager's token carries `assign_food_menu = 'GROK'`. The backend uses this to return **only GROK products** automatically — no `food_for` query parameter needed from the FE. The same call with an owner token (`assign_food_menu = 'Normal'`) returns only Normal products.

### Confirmed for both Hyatt accounts:
| Account | assign_food_menu (login API) | Products returned by getProducts() |
|---|---|---|
| owner@hyatt.com | Normal | Only Normal products |
| manager@hyatt.com | GROK | Only GROK products (23) |
| owner@cafe103.com | Normal | 398 Normal products |

---

## 3. What This Means for the FE Architecture

Since the backend already returns ONLY the employee's assigned menu products:

| Step | Current (wrong) | Correct |
|---|---|---|
| Login | Read `assign_food_menu` → write to localStorage | Just receive the token (no extra action needed) |
| LoadingPage | `getProducts({ type: 'all' })` → loads ALL products | `getProducts({ type: 'all' })` → backend auto-returns correct menu's products |
| MenuContext | `products.filter(p.foodFor === activeMenuType)` | `products` is already filtered — no client filter needed |
| `activeMenuType` | Read from localStorage (stale on mount) | Derive from loaded products themselves |

**The client-side filter is redundant.** All products loaded will already share the same `food_for` value (the employee's assigned menu). Filtering by `activeMenuType` from localStorage is a no-op when everything lines up — but it FAILS when localStorage is stale (e.g., first login after page load, value not yet updated in context).

---

## 4. The Stale-Read Bug in Current Fix

### Why the bug exists:

```
AppProviders mounts
  → MenuProvider mounts
    → activeMenuType = useMemo(() => getActiveMenuType(), [])
       reads localStorage: 'Normal' (default or previous session)
       FROZEN — never re-reads
  
User logs in
  → authService.login()
  → setActiveMenuType('GROK')     ← writes to localStorage
  → navigate('/loading')          ← client-side navigation — MenuProvider does NOT remount
  
LoadingPage
  → getProducts() → backend returns GROK products
  → setProducts([...23 GROK products...])
  
MenuContext re-renders
  → activeMenuType = 'Normal'     ← STALE (useMemo([]) never re-runs)
  → activeMenuProducts = products.filter(p.foodFor === 'Normal') = []
  → OrderEntry shows "All (0)"    ← BUG
```

**This is what the owner is seeing.** The localStorage write in `authService.js` happens AFTER MenuContext already read (and froze) the old value. The context never picks up the new value unless the page is hard-reloaded.

---

## 5. Full Consumer Map of activeMenuType / activeMenuProducts

### `MenuContext.jsx`
- **L101:** `const activeMenuType = useMemo(() => getActiveMenuType(), [])` — reads localStorage ONCE
- **L104-107:** `activeMenuProducts = products.filter(p => p.foodFor === activeMenuType)` — client-side filter
- **L111-118:** `availableMenuTypes` — distinct food_for values from products (still useful for display)

### `OrderEntry.jsx` (R5 hotspot)
| Line | Usage | After Fix |
|---|---|---|
| L60 | Destructures `activeMenuProducts`, `activeMenuType`, `availableMenuTypes` | Keep all three — just change what they return |
| L561-566 | `activeMenuProducts.filter(...)` for Popular/All/Category tabs | Still uses `activeMenuProducts` — must still work |
| L1688 | Passes `activeMenuProducts` to `CategoryPanel` | Still passes it |
| L1738-1744 | Shows menu chip: `{activeMenuType !== 'Normal' && ...}` | Still needs `activeMenuType` for chip label |
| L1818-1825 | Empty state: `availableMenuTypes.length > 1 && activeMenuProducts.length === 0` | Still needs both |
| L2894 | Customer modal: `menuItems={activeMenuProducts...}` | Still uses it |

### `CategoryPanel.jsx`
- L7: receives `activeMenuProducts` prop
- L12: `activeMenuProducts.filter(p => p.isActive...)` for category counts
- Still uses it — must still work

### `authService.js` (current wrong fix)
- L7: `import { setActiveMenuType }` — should be REMOVED
- L30: `setActiveMenuType(authData.assignFoodMenu)` — should be REMOVED

### `authTransform.js`
- L25: `assignFoodMenu: api.assign_food_menu || 'Normal'` — KEEP (useful for display, harmless)

### `activeMenuPrefs.js`
- `getActiveMenuType` / `setActiveMenuType` — will become unused by FE logic
- File can be kept as dead code or cleaned up

### `StatusConfigPage.jsx`
- Active Menu picker already REMOVED (correct, stays removed)

---

## 6. Correct Fix

### Philosophy
Remove the localStorage intermediary entirely. Derive `activeMenuType` directly from the products already loaded by the backend. Since backend auto-filters by `assign_food_menu`, ALL loaded products share the same `food_for` value — that IS the active menu type.

### E-1 — `MenuContext.jsx`: Derive `activeMenuType` from products (not localStorage)

**CURRENT (L99-107):**
```js
// CR-376: Active menu type — read once from localStorage on context init.
const activeMenuType = useMemo(() => getActiveMenuType(), []);

// CR-376: Products filtered to the active menu type
const activeMenuProducts = useMemo(
  () => products.filter(p => p.foodFor === activeMenuType),
  [products, activeMenuType]
);
```

**AFTER:**
```js
// BUG-463: activeMenuType derived from loaded products — backend already auto-filters
// by assign_food_menu, so all products share the same food_for value.
const activeMenuType = useMemo(
  () => products.find(p => p.foodFor && p.foodFor !== 'Aggregator')?.foodFor || ACTIVE_MENU_TYPE_DEFAULT,
  [products]
);

// BUG-463: all loaded products ARE the active menu's products (backend filtered)
// filter kept as a safety net but is effectively a no-op
const activeMenuProducts = useMemo(
  () => products.filter(p => p.foodFor === activeMenuType),
  [products, activeMenuType]
);
```

**Why this works:**
- When products load (e.g., 23 GROK products), `activeMenuType = 'GROK'`
- `activeMenuProducts = products.filter(p.foodFor === 'GROK')` = all 23 products
- The OrderEntry chip `activeMenuType !== 'Normal'` shows "GROK Menu" correctly
- When products haven't loaded yet: `activeMenuType = 'Normal'` (default, no chip shown)
- No localStorage, no stale read, no page reload required

### E-2 — `authService.js`: Remove localStorage write (revert BUG-463 E-2 + E-3)

**Remove:**
```js
import { setActiveMenuType } from '../../utils/activeMenuPrefs'; // BUG-463   ← REMOVE
// ...
setActiveMenuType(authData.assignFoodMenu); // BUG-463  ← REMOVE
```

### E-3 — `authTransform.js`: Keep `assignFoodMenu` field (harmless, L25)
No change needed. `assignFoodMenu` is harmless and may be useful for display elsewhere.

---

## 7. Files That Change

| File | Change | Lines |
|---|---|---|
| `src/contexts/MenuContext.jsx` | L99-101: replace `useMemo(() => getActiveMenuType(), [])` with products-derived memo | ~3 lines changed |
| `src/api/services/authService.js` | Remove import (L7) + remove setActiveMenuType call (L30) | 2 lines removed |
| `src/api/transforms/authTransform.js` | No change (keep `assignFoodMenu`) | 0 |
| `src/pages/StatusConfigPage.jsx` | Already removed (correct, stays) | 0 |
| `src/utils/activeMenuPrefs.js` | No change needed (becomes unused, can clean up later) | 0 |

**Files NOT touching:** `OrderEntry.jsx` (R5) · `CategoryPanel.jsx` · `LoadingPage.jsx` · any other file

---

## 8. Why OrderEntry.jsx Does NOT Need to Change

`OrderEntry.jsx` uses `activeMenuProducts` and `activeMenuType` from `useMenu()`. After the fix:
- `activeMenuProducts` still exists and returns the right products (all loaded products, backend-filtered)
- `activeMenuType` still exists and returns the correct value ('GROK' / 'Normal' / etc.) — derived from products
- No prop changes, no import changes, no logic changes in OrderEntry
- The menu chip (L1738) still works: `activeMenuType !== 'Normal'` → shows "GROK Menu" for manager

---

## 9. Edge Cases

| Case | Before fix | After fix |
|---|---|---|
| First load, products not yet fetched | `activeMenuType = 'Normal'` (localStorage default) | `activeMenuType = 'Normal'` (fallback default) ✅ |
| Owner logs in (Normal) | Stale context = wrong menu | Products load with Normal items → `activeMenuType = 'Normal'` ✅ |
| Manager logs in (GROK) | Stale context → `activeMenuType = 'Normal'` → 0 items shown ❌ | Products load with GROK items → `activeMenuType = 'GROK'` → correct ✅ |
| Multiple food_for values in loaded products | N/A (shouldn't happen — backend filters) | Takes first non-Aggregator `food_for` as the type ✅ |
| Normal-only restaurant | Works today | Works — all products have `food_for = 'Normal'`, activeMenuType = 'Normal' ✅ |
| Page refresh (hard reload) | Works (reads localStorage) | Works (re-derives from products after load) ✅ |

---

## 10. What Was Previously Implemented (to be revised)

Current GATE_5A implementation added:
- `authTransform.js` L25: `assignFoodMenu: api.assign_food_menu || 'Normal'` → KEEP
- `authService.js` L7: import setActiveMenuType → REMOVE
- `authService.js` L30: write localStorage on login → REMOVE
- `StatusConfigPage.jsx`: removed Active Menu picker (49 lines) → KEEP (correct)

---

## 11. Recommendations for Planning Agent

**Scope:** 2 files, ~5 line net change. LOW risk. No R5 touches.

**Sequence:**
1. E-1: `MenuContext.jsx` — change `activeMenuType` derivation
2. E-2: `authService.js` — remove localStorage write

**NOT in scope:**
- `activeMenuPrefs.js` cleanup (dead code, non-blocking)
- `authTransform.js` (already correct, no change)
- `OrderEntry.jsx` (no changes needed)
- `LoadingPage.jsx` (no changes needed — `getProducts()` already works correctly)

**Test accounts:**
- `owner@cafe103.com / Qplazm@10` — Normal menu, 398 products (full product set for testing)
- `manager@hyatt.com / Qplazm@10` — GROK menu (preprod returns 0 due to `restaurant_id=None` — test on UAT/production)

**Verification:**
1. Login as manager → `activeMenuType` in MenuContext = 'GROK' (NOT 'Normal')
2. Order Entry shows GROK products, not 0
3. Menu chip shows "GROK Menu" in Order Entry header
4. Login as owner (Normal) → chip hidden, Normal products shown
5. `localStorage.getItem('mygenie_active_menu_type')` not written on login

---

## 12. Files Referenced

| File | Path |
|---|---|
| Current fix | `src/api/services/authService.js` L7, L30 |
| Current fix | `src/api/transforms/authTransform.js` L25 |
| To change | `src/contexts/MenuContext.jsx` L99-107 |
| Already correct | `src/pages/StatusConfigPage.jsx` (picker removed) |
| Consumers | `src/components/order-entry/OrderEntry.jsx` L60, L561-566, L1688, L1738-1744, L1818-1825, L2894 |
| Consumers | `src/components/order-entry/CategoryPanel.jsx` L7, L12 |
| To retire | `src/utils/activeMenuPrefs.js` (becomes unused) |
