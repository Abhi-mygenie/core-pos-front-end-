# BUG-598 — Implementation Plan (Gate 3)
## Restore assign_food_menu from login response as the source of truth for menu type

**ID:** BUG-598
**Date:** 2026-10-21
**Code Reality:** NONE
**Risk:** HIGH
**Files WILL change:** `authService.js`, `AuthContext.jsx`, `MenuContext.jsx` (3 files)
**Files WILL NOT touch:** authTransform.js, LoginPage.jsx, activeMenuPrefs.js, OrderEntry.jsx, CategoryPanel.jsx, LoadingPage.jsx, any R5 hotspot

---

## 1. Scope Lock

3 files, 3 edit groups (E-1, E-2, E-3). No downstream consumer changes needed.

---

## 2. Edits

### E-1: `src/api/services/authService.js` — Store assignFoodMenu in sessionStorage

**File:** `authService.js`
**Location:** L28, inside the `else` branch (normal employee login), after the AUTH_TOKEN store.

**Current (L26-35):**
```js
  } else {
    // Store token (normal employee login)
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
    // BUG-098: Set CRM token from login response + persist to localStorage
    // BUG-300: changed from sessionStorage (cleared on tab close) to localStorage (survives tab close like auth_token)
    setCrmToken(authData.crmToken);
    if (authData.crmToken) {
      localStorage.setItem('crm_token', authData.crmToken);
    }
  }
```

**New (L26-36):**
```js
  } else {
    // Store token (normal employee login)
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
    // BUG-598: Store assign_food_menu — source of truth for menu type. Default 'Normal' when not assigned.
    sessionStorage.setItem('assign_food_menu', authData.assignFoodMenu || 'Normal');
    // BUG-098: Set CRM token from login response + persist to localStorage
    // BUG-300: changed from sessionStorage (cleared on tab close) to localStorage (survives tab close like auth_token)
    setCrmToken(authData.crmToken);
    if (authData.crmToken) {
      localStorage.setItem('crm_token', authData.crmToken);
    }
  }
```

**Change:** +1 line after L28. Stores `assignFoodMenu` (or `'Normal'` if missing) in sessionStorage.
**Logout cleanup:** Already handled — `AuthContext.logout()` calls `sessionStorage.clear()` at L37.

---

### E-2: `src/contexts/AuthContext.jsx` — Add assignFoodMenu state, set on login, clear on logout, expose

**E-2a: New state — insert after L15 (`const [isLoading, setIsLoading] = useState(false);`)**

**Current (L15):**
```js
  const [isLoading, setIsLoading] = useState(false);
```

**New (L15-18):**
```js
  const [isLoading, setIsLoading] = useState(false);
  // BUG-598: assign_food_menu from login — source of truth for active menu type
  const [assignFoodMenu, setAssignFoodMenu] = useState(
    () => sessionStorage.getItem('assign_food_menu') || 'Normal'
  );
```

---

**E-2b: Set on login — insert after L26 (`setPermissions(authData.permissions || []);`)**

**Current (L24-27):**
```js
      const authData = await authService.login(credentials, rememberMe);
      setToken(authData.token);
      setPermissions(authData.permissions || []);
      return authData;
```

**New (L24-28):**
```js
      const authData = await authService.login(credentials, rememberMe);
      setToken(authData.token);
      setPermissions(authData.permissions || []);
      setAssignFoodMenu(authData.assignFoodMenu || 'Normal'); // BUG-598
      return authData;
```

---

**E-2c: Clear on logout — insert after L40 (`setPermissions([]);`)**

**Current (L37-41):**
```js
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setPermissions([]);
  }, []);
```

**New (L37-42):**
```js
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    setPermissions([]);
    setAssignFoodMenu('Normal'); // BUG-598
  }, []);
```

---

**E-2d: Add to context value — in the `useMemo` at L68**

**Current value object (L68-84):**
```js
  const value = useMemo(() => ({
    // State
    token,
    user,
    permissions,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    logout,
    setUserData,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }), [
```

**New value object:**
```js
  const value = useMemo(() => ({
    // State
    token,
    user,
    permissions,
    isAuthenticated,
    isLoading,
    assignFoodMenu, // BUG-598
    
    // Actions
    login,
    logout,
    setUserData,
    
    // Helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }), [
```

---

**E-2e: Add to deps array — in the `useMemo` at L85**

**Current deps (L85-97):**
```js
  ]), [
    token, 
    user, 
    permissions, 
    isAuthenticated, 
    isLoading, 
    login, 
    logout, 
    setUserData,
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions
  ]);
```

**New deps:**
```js
  }), [
    token, 
    user, 
    permissions, 
    isAuthenticated, 
    isLoading, 
    assignFoodMenu, // BUG-598
    login, 
    logout, 
    setUserData,
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions
  ]);
```

---

### E-3: `src/contexts/MenuContext.jsx` — Read assignFoodMenu from AuthContext

**E-3a: Add import — L1**

**Current (L1):**
```js
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
```

**New (L1-2):**
```js
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext'; // BUG-598
```

---

**E-3b: Read from auth — insert after L8 (`export const MenuProvider = ({ children }) => {`)**

**Current (L8-9):**
```js
export const MenuProvider = ({ children }) => {
  const [categories, setCategoriesData] = useState([]);
```

**New (L8-10):**
```js
export const MenuProvider = ({ children }) => {
  const { assignFoodMenu } = useAuth(); // BUG-598
  const [categories, setCategoriesData] = useState([]);
```

---

**E-3c: Replace activeMenuType derivation — L99-106**

**Current (L99-106):**
```js
  // BUG-463: activeMenuType derived from loaded products — backend already auto-filters
  // get-products-list by the authenticated employee's assign_food_menu, so all loaded
  // products share the same food_for. Deriving here is always live, never stale.
  const activeMenuType = useMemo(
    () => products.find(p => p.foodFor && p.foodFor !== 'Aggregator')?.foodFor
          || ACTIVE_MENU_TYPE_DEFAULT,
    [products]
  );
```

**New (L99-103):**
```js
  // BUG-598: activeMenuType from employee's assign_food_menu (login response).
  // If assigned → use it. If not assigned or missing → default to 'Normal'.
  // Replaces BUG-463's "derive from first product" which broke on mixed-menu responses.
  const activeMenuType = assignFoodMenu || ACTIVE_MENU_TYPE_DEFAULT;
```

---

## 3. Execution Sequence

1. E-1 — authService.js: add sessionStorage store
2. E-2a — AuthContext.jsx: add state
3. E-2b — AuthContext.jsx: set on login
4. E-2c — AuthContext.jsx: clear on logout
5. E-2d+e — AuthContext.jsx: expose in context value + deps
6. E-3a — MenuContext.jsx: add import
7. E-3b — MenuContext.jsx: read from auth
8. E-3c — MenuContext.jsx: replace derivation
9. Verify webpack compiles with 0 new warnings

---

## 4. Verification Matrix

| # | Check | How to Verify | Auto? |
|---|-------|---------------|:---:|
| V-1 | `sessionStorage` write on login | grep `assign_food_menu` in authService.js | YES |
| V-2 | AuthContext exposes `assignFoodMenu` | grep `assignFoodMenu` in AuthContext.jsx — state + value + deps | YES |
| V-3 | MenuContext reads from `useAuth()` | grep `useAuth` in MenuContext.jsx | YES |
| V-4 | Old "derive from products" removed | grep `products.find.*foodFor` in MenuContext.jsx → 0 hits | YES |
| V-5 | `// BUG-598` markers in all 3 files | grep `BUG-598` in all 3 files | YES |
| V-6 | Webpack compiles 0 new warnings | `yarn build` or hot reload log | YES |
| V-7 | Login as Normal user → no Premium chip | Browser: login owner@palmhouse.com → no "Premium Menu" chip | NO |
| V-8 | Page refresh preserves menu type | Refresh → chip state same (sessionStorage) | NO |
| V-9 | Logout + re-login → clean state | Logout → login → starts fresh from login response | NO |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-598 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add authService.js + AuthContext.jsx + MenuContext.jsx with BUG-598 + date
- [ ] Code markers: // BUG-598 comment in every modified file
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | Extra AuthContext re-render | Set once at login — same pattern as token/permissions |
| R-2 | MenuContext now depends on AuthContext | AuthProvider wraps MenuProvider in AppProviders.jsx — safe |
| R-3 | Tab refresh loses value | sessionStorage persists within tab |
| R-4 | Backend doesn't send field | `|| 'Normal'` fallback at every layer |
