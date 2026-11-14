# BUG-463 — Implementation Plan (Gate 3 — REVISED + CLEAN)
## Active Menu Type: Remove localStorage, Derive from Products, Remove All Dead Code

**Date:** 2026-10-18
**Stage:** Gate 3 — Implementation Plan
**Based on:** `/app/memory/impact/BUG-463_IMPACT_ANALYSIS.md` (revised)

---

## Scope Lock

**Files WILL change:**
1. `src/api/services/authService.js` — remove dead import + dead call (E-1, E-2)
2. `src/contexts/MenuContext.jsx` — fix import + replace activeMenuType derivation (E-3, E-4)
3. `src/utils/activeMenuPrefs.js` — remove all dead exports, keep only ACTIVE_MENU_TYPE_DEFAULT (E-5)

**Files WILL NOT touch:**
- `OrderEntry.jsx` (R5) · `CategoryPanel.jsx` · `LoadingPage.jsx`
- `authTransform.js` (assignFoodMenu field stays — harmless)
- `StatusConfigPage.jsx` (Active Menu picker already removed — correct)

---

## Entry Verification (Implementation agent must confirm before coding)

| # | File | Line | Must read |
|---|---|---|---|
| V-A | `authService.js` | L7 | `import { setActiveMenuType } from '../../utils/activeMenuPrefs'; // BUG-463` |
| V-B | `authService.js` | L30 | `setActiveMenuType(authData.assignFoodMenu); // BUG-463` |
| V-C | `MenuContext.jsx` | L2 | `import { getActiveMenuType, ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs'; // CR-376` |
| V-D | `MenuContext.jsx` | L101 | `const activeMenuType = useMemo(() => getActiveMenuType(), []);` |
| V-E | `activeMenuPrefs.js` | L13 | `export const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';` |
| V-F | `activeMenuPrefs.js` | L14 | `export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';` |
| V-G | `activeMenuPrefs.js` | L16 | `export const getActiveMenuType = () => {` |
| V-H | `activeMenuPrefs.js` | L24 | `export const setActiveMenuType = (value) => {` |

---

## Edit 1 — E-1: `authService.js` — Remove dead import (L7)

**BEFORE:**
```js
import { setCrmToken, clearCrmToken } from '../crmAxios';
import { setActiveMenuType } from '../../utils/activeMenuPrefs'; // BUG-463
```

**AFTER:**
```js
import { setCrmToken, clearCrmToken } from '../crmAxios';
```

**Delta:** −1 line

---

## Edit 2 — E-2: `authService.js` — Remove dead localStorage write (L30)

**BEFORE:**
```js
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
    setActiveMenuType(authData.assignFoodMenu); // BUG-463: set active menu from employee API on every login
    // BUG-098: Set CRM token from login response + persist to localStorage
```

**AFTER:**
```js
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
    // BUG-098: Set CRM token from login response + persist to localStorage
```

**Delta:** −1 line

---

## Edit 3 — E-3: `MenuContext.jsx` — Remove dead import of `getActiveMenuType` (L2)

**BEFORE:**
```js
import { getActiveMenuType, ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs'; // CR-376
```

**AFTER:**
```js
import { ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs'; // BUG-463: only default needed
```

**Delta:** 0 net (line changed)

---

## Edit 4 — E-4: `MenuContext.jsx` — Replace stale `activeMenuType` with products-derived version (L99-107)

**BEFORE (L99-107):**
```js
  // CR-376: Active menu type — read once from localStorage on context init.
  // Changes to localStorage (from StatusConfigPage save) take effect on next mount.
  const activeMenuType = useMemo(() => getActiveMenuType(), []);

  // CR-376: Products filtered to the active menu type — used by OrderEntry item grid.
  const activeMenuProducts = useMemo(
    () => products.filter(p => p.foodFor === activeMenuType),
    [products, activeMenuType]
  );
```

**AFTER:**
```js
  // BUG-463: activeMenuType derived from loaded products — backend already auto-filters
  // get-products-list by the authenticated employee's assign_food_menu, so all loaded
  // products share the same food_for. Deriving here is always live, never stale.
  const activeMenuType = useMemo(
    () => products.find(p => p.foodFor && p.foodFor !== 'Aggregator')?.foodFor
          || ACTIVE_MENU_TYPE_DEFAULT,
    [products]
  );

  // Products filtered to the active menu type — kept as safety net (effectively a no-op
  // since backend pre-filtered all products to the employee's assigned menu).
  const activeMenuProducts = useMemo(
    () => products.filter(p => p.foodFor === activeMenuType),
    [products, activeMenuType]
  );
```

**Delta:** +2 lines (comment + deps change)

---

## Edit 5 — E-5: `activeMenuPrefs.js` — Remove all dead exports, keep only default

**BEFORE (full file — 29 lines):**
```js
// CR-376: Active Menu Type preference — station-level local setting.
//
// Manager sets the active menu in StatusConfigPage (Local Settings).
// Order Entry reads it once on mount — no per-order switching.
// This is the Phase 3 multi-menu implementation; mirrors qsrModePrefs.js pattern.
//
// Storage scope: browser-local (per device/station).
// Default: 'Normal' — zero behaviour change for Normal-only restaurants.
//
// Write site: api/services/authService.js (on every normal employee login — BUG-463)
// Read sites: contexts/MenuContext.jsx (activeProducts memo)

export const ACTIVE_MENU_TYPE_KEY = 'mygenie_active_menu_type';
export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';

export const getActiveMenuType = () => {
  try {
    return localStorage.getItem(ACTIVE_MENU_TYPE_KEY) || ACTIVE_MENU_TYPE_DEFAULT;
  } catch (_) {
    return ACTIVE_MENU_TYPE_DEFAULT;
  }
};

export const setActiveMenuType = (value) => {
  try {
    localStorage.setItem(ACTIVE_MENU_TYPE_KEY, value || ACTIVE_MENU_TYPE_DEFAULT);
  } catch (_) {}
};
```

**AFTER (5 lines):**
```js
// BUG-463: localStorage-based active menu type removed.
// Backend auto-filters get-products-list by the authenticated employee's assign_food_menu.
// Default kept as fallback in MenuContext while products are loading.
export const ACTIVE_MENU_TYPE_DEFAULT = 'Normal';
```

**Dead exports removed:**
- `ACTIVE_MENU_TYPE_KEY` — was only used inside the two removed functions
- `getActiveMenuType` — was only used in MenuContext L101 (now replaced)
- `setActiveMenuType` — was only used in authService L30 (now removed)

**Delta:** −25 lines

---

## Full Diff Summary

```
authService.js:      −2 lines  (E-1 + E-2)
MenuContext.jsx:     ±4 lines  (E-3 changed + E-4 replaced)
activeMenuPrefs.js:  −25 lines (E-5 — full cleanup)
Net: ~29 lines removed, 4 lines changed
```

---

## Verification Matrix

| # | Edit | Verify | Method |
|---|---|---|---|
| V-1 | E-1+E-2 | `localStorage.mygenie_active_menu_type` NOT written on login | Browser DevTools → Application → localStorage: key absent after login |
| V-2 | E-4 | `activeMenuType` in MenuContext = 'GROK' after manager login | React DevTools → MenuProvider → activeMenuType value |
| V-3 | E-4 | Order Entry shows GROK products (not "All (0)") after manager login | Browser: open Order Entry, confirm products visible |
| V-4 | E-4 | Order Entry chip shows "GROK Menu" in header for manager | Browser: orange chip visible in Order Entry header |
| V-5 | E-4 | Owner login (Normal): chip hidden, Normal products shown | Browser: owner@cafe103.com — no chip, 398 products |
| V-6 | E-4 | Before products load: activeMenuType = 'Normal' (fallback) | React DevTools: value = 'Normal' on LoadingPage |
| V-7 | E-5 | No webpack errors for removed exports | Compile: 0 errors |
| REG-1 | All | CategoryPanel category counts still correct | Browser: category counts match product counts |
| REG-2 | All | Customer modal still scopes to active menu products | Browser: customer modal shows correct products |
| REG-3 | All | Compile: 0 new warnings | webpack output clean |

---

## Post-Code Registry Checklist (EXIT GATE)

```
- [ ] registry.json: BUG-463 → GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: entries for all 3 files
- [ ] Code markers: // BUG-463 on changed lines
- [ ] Compile: 0 new warnings
```

---

Planning complete: BUG-463
Stage: Gate 3 — Implementation Plan (REVISED + CLEAN)
Risk: LOW
Files WILL change: `authService.js` · `MenuContext.jsx` · `activeMenuPrefs.js`
Files WILL NOT touch: OrderEntry.jsx (R5) · CategoryPanel · LoadingPage · authTransform · StatusConfigPage
Dead code removed: ACTIVE_MENU_TYPE_KEY · getActiveMenuType · setActiveMenuType (all 3 + header comment)
Owner decisions: NONE
Awaiting Gate 4 GO
