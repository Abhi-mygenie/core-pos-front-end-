# BUG-463 — Impact Analysis (Gate 2 — REVISED)
## Active Menu Type: Remove localStorage, Derive from Loaded Products

**Date:** 2026-10-18
**Stage:** Gate 2 — Impact Analysis
**Agent role:** PLANNING
**Supersedes:** Previous BUG-463 IA (2026-10-18 first version — wrong architecture)
**Investigation source:** `/app/memory/investigations/BUG-463_REVISED_INVESTIGATION_2026_10_18.md`

---

## Code Reality

| File | Current state | Action |
|---|---|---|
| `authService.js` L7, L30 | BUG-463 import + localStorage write — **already in code (wrong)** | REMOVE both lines |
| `MenuContext.jsx` L101 | `useMemo(() => getActiveMenuType(), [])` — reads localStorage once, never updates | CHANGE |
| `authTransform.js` L25 | `assignFoodMenu: api.assign_food_menu \|\| 'Normal'` — already in code | KEEP (harmless) |
| `StatusConfigPage.jsx` | Active Menu picker removed (49 lines) — already done | KEEP (correct) |

**Code Reality: PARTIAL (wrong fix in place — must revert + replace)**

---

## Conflict Pre-Check

| Item | File overlap | Status | Impact |
|---|---|---|---|
| **CR-376** | `MenuContext.jsx` (introduced `activeMenuType`) | GATE_5B_QA_PASS | This IA supersedes CR-376's localStorage approach. Execution order: BUG-463 replaces CR-376 implementation only for `activeMenuType` derivation. `activeMenuProducts` shape unchanged — no regression on CR-376 QA. |
| **CR-376-FU-C** | Related concept (server-side menu default) | GATE_1 BLOCKED | BUG-463 revised fix implements what FU-C aimed for. FU-C can be marked SUPERSEDED by BUG-463 after this ships. |
| **CR-124 / BUG-300** | `authService.js` | GATE_5B_QA_PASS | Our change removes 2 lines in the `else` branch. CR-124 (logout) and BUG-300 (CRM token) are in separate functions — zero conflict. |

**No blocking conflicts.**

---

## Root Cause (from investigation)

### Key API Proof
```
Manager token (assign_food_menu = GROK) calls:
GET /api/v1/vendoremployee/get-products-list?limit=2000&offset=1&type=all

Response: total_size=23, all food_for='GROK'
```

The backend **auto-filters products by the authenticated employee's `assign_food_menu`**. When `getProducts()` is called, the backend reads the token, finds `assign_food_menu`, and returns only that menu's products. No FE parameter needed.

### The Stale-Read Bug (why "All (0)" appears)

```
1. AppProviders mounts before login
   → MenuProvider mounts
   → activeMenuType = useMemo(() => getActiveMenuType(), [])
   → reads localStorage → 'Normal' (old value or default)
   → FROZEN — useMemo([]) never re-evaluates

2. User logs in as manager (GROK)
   → authService writes localStorage → 'GROK'
   → navigate('/loading') — client-side, MenuProvider STAYS mounted

3. LoadingPage calls getProducts()
   → backend returns 23 GROK products
   → setProducts([...23 GROK products...])

4. MenuContext re-renders
   → activeMenuType = 'Normal' (STALE — useMemo never re-ran)
   → activeMenuProducts = products.filter(p.foodFor === 'Normal') = [] ← BUG
   → OrderEntry shows "All (0)"
```

---

## What Needs to Change

### 1. `MenuContext.jsx` — Derive `activeMenuType` from loaded products

**Current (L99-107):**
```js
// reads localStorage ONCE on mount — never updates
const activeMenuType = useMemo(() => getActiveMenuType(), []);

const activeMenuProducts = useMemo(
  () => products.filter(p => p.foodFor === activeMenuType),
  [products, activeMenuType]
);
```

**Required:**
```js
// BUG-463: derive from loaded products — backend already auto-filters by assign_food_menu
// so all products share the same food_for; this is always live, never stale
const activeMenuType = useMemo(
  () => products.find(p => p.foodFor && p.foodFor !== 'Aggregator')?.foodFor
        || ACTIVE_MENU_TYPE_DEFAULT,
  [products]
);

// safety-net filter — effectively a no-op since backend pre-filtered
const activeMenuProducts = useMemo(
  () => products.filter(p => p.foodFor === activeMenuType),
  [products, activeMenuType]
);
```

**Why this is correct:**
- When products haven't loaded yet: `activeMenuType = 'Normal'` (fallback) — chip hidden ✅
- When GROK products load: `activeMenuType = 'GROK'` — chip shows "GROK Menu" ✅
- When Normal products load: `activeMenuType = 'Normal'` — chip hidden ✅
- Shape of `activeMenuType` and `activeMenuProducts` is **identical** to before — zero impact on all consumers (OrderEntry, CategoryPanel)
- `useMemo([products])` re-runs every time products update — never stale ✅

**Also remove the import** of `getActiveMenuType` (no longer used):
```js
// REMOVE: import { getActiveMenuType, ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs';
// KEEP:   import { ACTIVE_MENU_TYPE_DEFAULT } from '../utils/activeMenuPrefs';
```

### 2. `authService.js` — Remove localStorage write (revert wrong fix)

```js
// REMOVE line 7:
import { setActiveMenuType } from '../../utils/activeMenuPrefs'; // BUG-463

// REMOVE line 30:
setActiveMenuType(authData.assignFoodMenu); // BUG-463
```

---

## Consumer Impact Analysis

All consumers of `activeMenuType` and `activeMenuProducts` are unaffected because:
- **Shape unchanged:** both values exist and have the same types
- **Values correct:** `activeMenuType` = the right food_for value (derived from products, not stale localStorage)
- **`activeMenuProducts`** = correct subset (all loaded products match, since backend pre-filtered)

| Consumer | What it uses | Impact of change |
|---|---|---|
| `OrderEntry.jsx` L564-566 | `activeMenuProducts.filter(...)` for item grid | ✅ Same products, correct menu |
| `OrderEntry.jsx` L1738-1744 | `activeMenuType !== 'Normal'` chip | ✅ Correct — 'GROK' for manager, 'Normal' for owner |
| `OrderEntry.jsx` L1818-1821 | Empty state guard + `{activeMenuType} menu has no items` | ✅ Only fires when real products empty |
| `OrderEntry.jsx` L2894 | Customer modal `menuItems` | ✅ Same products |
| `CategoryPanel.jsx` L12 | `activeMenuProducts.filter(...)` for counts | ✅ Same products |

---

## Risk Classification

| Criterion | Assessment |
|---|---|
| Financial logic? | NO |
| Order flow? | NO — product display only |
| API contract change? | NO — no new params to `getProducts()` |
| Hotspot file (R5)? | `MenuContext.jsx` not R5. `authService.js` not R5. |
| Downstream consumers broken? | NO — shape unchanged, values become MORE correct |
| Lines changed | ~5 across 2 files |

**Risk: LOW**

---

## Files WILL Change
- `src/contexts/MenuContext.jsx` — L2 (import), L99-107 (activeMenuType memo)
- `src/api/services/authService.js` — L7 (import), L30 (call)

## Files WILL NOT Touch
- `OrderEntry.jsx` (R5) — zero changes needed
- `CategoryPanel.jsx` — zero changes needed
- `LoadingPage.jsx` — zero changes needed
- `authTransform.js` — keep as-is
- `activeMenuPrefs.js` — keep as-is (becomes partially unused — cleanup can follow later)
- `StatusConfigPage.jsx` — already correct

---

## Owner Decisions Needed

**None.** Fix is fully determined by the investigation.
- Derivation from `products` is the only correct approach
- `ACTIVE_MENU_TYPE_DEFAULT = 'Normal'` as fallback is correct (existing constant)
- No new params, no new endpoints, no new state

---

## Verification Matrix (seeds Gate 3 plan)

| # | What to verify | Method |
|---|---|---|
| V-1 | After manager login, `activeMenuType` in MenuContext = 'GROK' (not 'Normal') | Browser DevTools → React DevTools → MenuContext value |
| V-2 | After manager login, Order Entry shows GROK products (not "All (0)") | Browser: open Order Entry, see products |
| V-3 | Order Entry chip shows "GROK Menu" for manager | Browser: chip visible in header |
| V-4 | After owner login, chip hidden, Normal products shown | Browser: no chip, products visible |
| V-5 | `localStorage.mygenie_active_menu_type` NOT written on login | Browser DevTools → Application → localStorage |
| V-6 | Normal-only restaurant (cafe103) unaffected — 398 products, no chip | Browser: owner@cafe103.com Order Entry |
| REG-1 | `activeMenuProducts` still passes to CategoryPanel correctly | Browser: category counts correct |
| REG-2 | Compile: 0 new warnings | webpack output |

---

Planning complete: BUG-463
Stage: Gate 2 — Impact Analysis (REVISED)
Code reality: PARTIAL (wrong fix in place — revert + replace)
Risk: LOW
Files WILL change: `src/contexts/MenuContext.jsx` · `src/api/services/authService.js`
Files WILL NOT touch: OrderEntry.jsx · CategoryPanel.jsx · LoadingPage.jsx · authTransform.js
Owner decisions: NONE
Conflicts: CR-376 (execution order safe) · CR-376-FU-C (can mark superseded after ship)
Next: Gate 3 GO → Implementation Plan
