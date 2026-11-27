# BUG-598 — Impact Analysis (Gate 2)
## assign_food_menu from login response not used — frontend derives menu type from product data instead

**ID:** BUG-598
**Date:** 2026-10-21
**Code Reality:** NONE — `assignFoodMenu` mapped in `authTransform.js:25` but never consumed downstream
**Conflict Pre-Check:** CLEAN — no open item touches AuthContext + MenuContext in the same scope
**Risk:** HIGH — affects product visibility for multi-menu restaurants
**Risk Reason:** Touches AuthContext (state management) + MenuContext (product filtering) + login flow

---

## 1. The Facts

1. **Backend sends `assign_food_menu` correctly.** Confirmed via curl — `common-login` returns `"assign_food_menu": "Normal"` for owner@palmhouse.com. Backend has done its job.
2. **`authTransform.js:25` maps it correctly:** `assignFoodMenu: api.assign_food_menu || 'Normal'`
3. **The frontend doesn't use it.** BUG-463 (2026-10-18) replaced the original `assignFoodMenu` → localStorage → MenuContext chain with a "derive from first product" approach. The field is mapped but never stored, never read, never passed to MenuContext.
4. **The design intent is additive:** `assign_food_menu` is optional. If present → use it. If absent → default to `'Normal'`. Normal behavior should always work regardless.

---

## 2. What BUG-463 Changed (the regression)

| Before BUG-463 | After BUG-463 (current) |
|---|---|
| `authService.js` stored `assignFoodMenu` via `setActiveMenuType()` | **Removed** — called "dead import" |
| `MenuContext.jsx` read from `getActiveMenuType()` | **Replaced** with `products.find(...)?.foodFor` |
| Menu type came from the **employee's assignment** | Menu type comes from the **first product's food_for** |

BUG-463's rationale was: *"backend auto-filters products, so deriving from products is equivalent."* That assumption holds when the backend filters — but fails when products are mixed (e.g. production where backend returns both Normal + Premium).

---

## 3. Data Flow — Current (Broken)

```
Login API → assign_food_menu: "Normal"  ✅ Backend sends it
  ↓
authTransform.js:25 → assignFoodMenu: "Normal"  ✅ Mapped
  ↓
authService.js → NEVER STORED  ❌
  ↓
AuthContext.jsx → NO FIELD  ❌
  ↓
MenuContext.jsx:102 → derives from products[0].foodFor  ❌ Wrong source
```

## 4. Data Flow — Proposed Fix

```
Login API → assign_food_menu: "Normal"  ✅
  ↓
authTransform.js:25 → assignFoodMenu: "Normal"  ✅ (unchanged)
  ↓
authService.js → sessionStorage.setItem('assign_food_menu', value)  ✅ NEW
  ↓
AuthContext.jsx → assignFoodMenu state from sessionStorage  ✅ NEW
               → set on login, clear on logout  ✅ NEW
               → exposed via context  ✅ NEW
  ↓
MenuContext.jsx → reads assignFoodMenu from useAuth()  ✅ NEW
               → activeMenuType = assignFoodMenu || 'Normal'  ✅ NEW
```

---

## 5. Affected Files — Exact Edit Sites

### E-1: `authService.js` — Store assignFoodMenu on login

**Location:** L28, inside the `else` (normal employee login) branch, after AUTH_TOKEN store.

**Add 1 line:**
```js
sessionStorage.setItem('assign_food_menu', authData.assignFoodMenu || 'Normal');
```

Logout cleanup: `sessionStorage.clear()` at L37 already handles this.

**Lines:** +1

---

### E-2: `AuthContext.jsx` — Add assignFoodMenu state + expose

**E-2a** — New state after L15:
```js
const [assignFoodMenu, setAssignFoodMenu] = useState(
    () => sessionStorage.getItem('assign_food_menu') || 'Normal'
);
```

**E-2b** — Set on login (inside login callback, after setPermissions):
```js
setAssignFoodMenu(authData.assignFoodMenu || 'Normal');
```

**E-2c** — Clear on logout (after setPermissions([])):
```js
setAssignFoodMenu('Normal');
```

**E-2d** — Add to context value object + deps array.

**Lines:** +5

---

### E-3: `MenuContext.jsx` — Read from auth instead of deriving from products

**E-3a** — Add import:
```js
import { useAuth } from './AuthContext';
```

**E-3b** — Read inside MenuProvider:
```js
const { assignFoodMenu } = useAuth();
```

**E-3c** — Replace L99-106:

**Current:**
```js
const activeMenuType = useMemo(
    () => products.find(p => p.foodFor && p.foodFor !== 'Aggregator')?.foodFor
          || ACTIVE_MENU_TYPE_DEFAULT,
    [products]
);
```

**New:**
```js
// BUG-598: Use employee's assign_food_menu from login (authoritative).
// Default to 'Normal' when not assigned. The field is additive — if backend
// sends it, use it; if not, Normal behavior works as default.
const activeMenuType = assignFoodMenu || ACTIVE_MENU_TYPE_DEFAULT;
```

**Lines:** +4, −4

---

## 6. Files Summary

**Files WILL change:**

| # | File | Change | Lines | Risk |
|---|------|--------|-------|------|
| 1 | `src/api/services/authService.js` | +1 line: store in sessionStorage | +1 | LOW |
| 2 | `src/contexts/AuthContext.jsx` | State + setter + context expose | +5 | MEDIUM |
| 3 | `src/contexts/MenuContext.jsx` | Read from auth instead of products | +4/−4 | MEDIUM |

**Total:** 3 files, ~10 net lines

**Files WILL NOT touch:**
- `authTransform.js` — already maps correctly
- `LoginPage.jsx` — AuthContext.login() handles internally
- `activeMenuPrefs.js` — `ACTIVE_MENU_TYPE_DEFAULT` still used as fallback
- `OrderEntry.jsx`, `CategoryPanel.jsx` — read from MenuContext, unchanged
- `LoadingPage.jsx` — loads products, unchanged
- No R5 hotspots

---

## 7. Downstream Consumers (no changes needed)

| Consumer | Reads | Change? |
|---|---|---|
| `OrderEntry.jsx:60` | `activeMenuType`, `activeMenuProducts` from useMenu() | NO |
| `OrderEntry.jsx:1738` | `activeMenuType !== 'Normal'` → chip | NO |
| `CategoryPanel.jsx:12` | `activeMenuProducts` for counts | NO |

---

## 8. Risk Register

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | AuthContext re-renders on assignFoodMenu set | Only set once at login, same pattern as token/permissions |
| R-2 | MenuContext depends on AuthContext (new) | AuthProvider already wraps MenuProvider in AppProviders.jsx — safe |
| R-3 | Page refresh loses value | sessionStorage persists within tab, cleared on logout |
| R-4 | Backend doesn't send the field | `authData.assignFoodMenu || 'Normal'` — defaults safely |

---

## 9. Owner Decisions

**None required.** OD-598-01 locked: `assign_food_menu` is source of truth when present, default to `'Normal'` when absent.
