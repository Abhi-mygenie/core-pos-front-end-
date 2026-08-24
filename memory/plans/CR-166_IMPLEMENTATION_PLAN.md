# CR-166 — Gate 3: Implementation Plan
# Franchise / CS Multi-Restaurant Login (Common Login + Restaurant Picker)

**ID:** CR-166
**Date:** 2026-08-21
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Risk:** CRITICAL (auth flow — token management, multi-tenant session, localStorage keys)
**Code Reality:** NONE (all changes are additive or new files)
**Conflict Pre-Check:** CLEAN (all target files last touched by IMPLEMENTED/CLOSED items)
**Gate 2 doc:** `/app/memory/impact/CR-166_IMPACT_ANALYSIS.md`

---

## Locked Decisions (from Gate 2 OQ_ANSWERS_2026_08_20.md)

| Decision | Answer |
|---|---|
| Login detection | `login_type === 'admin'` → picker; `'employee'` → normal `/loading` |
| Token storage | COMMON_TOKEN = common-login `response.token`; AUTH_TOKEN = login-as `response.restaurant_token`; CRM = `response.crm_token` |
| Switch Restaurant | Option Y — sidebar button → `/restaurant-picker` (reuses COMMON_TOKEN, no re-login) |
| Picker design | **Option A — Card Grid** (all admin types: CS + franchise) |
| Search bar | Always visible |
| Active-only filter | `restaurant_status === 1` only |
| Logo CDN URL | **OPEN (D3)** — use initials fallback when logo is null; CDN prefix TBD |
| Logout | POST `/adminemployee/logout` with COMMON_TOKEN — backend fixed ✅ |

---

## Scope Lock

**Files WILL change (9 total):**
1. `src/api/constants.js` — additive
2. `src/api/transforms/authTransform.js` — additive
3. `src/api/services/authService.js` — modify login() + logout() + add helpers
4. `src/api/services/commonAuthService.js` — **NEW FILE**
5. `src/pages/LoginPage.jsx` — 2-line change
6. `src/pages/RestaurantPickerPage.jsx` — **NEW FILE**
7. `src/App.js` — additive (import + 1 route)
8. `src/contexts/AuthContext.jsx` — 2-line change
9. `src/components/layout/Sidebar.jsx` — additive (1 button)

**Files will NOT touch:**
- `LoadingPage.jsx` — no changes needed; existing boot uses AUTH_TOKEN correctly
- `DashboardPage.jsx` — no changes needed
- `orderTransform.js` — no changes needed
- `CollectPaymentPanel.jsx` — no changes needed
- Any report files — no changes needed

---

## Execution Sequence

**CRITICAL: Execute in this order. Each edit depends on the previous.**

```
E1 → constants.js (defines keys/endpoints used by everything else)
E2 → authTransform.js (defines loginType/loginAsRestaurantResponse shapes)
E3 → authService.js (uses E1 keys + E2 transform)
E4 → commonAuthService.js NEW (uses E1 endpoints + E2 transforms)
E5 → LoginPage.jsx (uses AuthContext.login which now returns loginType)
E6 → RestaurantPickerPage.jsx NEW (uses E4 service + E1 storage key)
E7 → App.js (imports E6)
E8 → AuthContext.jsx (calls authService helpers from E3)
E9 → Sidebar.jsx (uses E3 getCommonToken helper)
```

---

## Edit-by-Edit Plan

---

### E1 — `src/api/constants.js`

**Nature:** Additive — zero existing lines change.

**E1a — Add to `API_ENDPOINTS` object, after the last entry (after L156 `ROLE_MASTER_LIST`):**

```js
  // CR-166: Common Login / Franchise / CS multi-restaurant auth endpoints
  COMMON_LOGIN:          '/api/v1/auth/vendoremployee/common-login',
  ASSIGNED_RESTAURANTS:  '/api/v1/auth/adminemployee/assigned-restaurants',
  LOGIN_AS_RESTAURANT:   '/api/v1/auth/adminemployee/login-as-restaurant',
  COMMON_LOGOUT:         '/api/v1/auth/adminemployee/logout',
```

**Insertion point:** After L156 (`ROLE_MASTER_LIST: '/api/v1/vendoremployee/employee/role-master-list',`) and before L157 (`};`)

**E1b — Add to `STORAGE_KEYS` object, after `CHANNEL_VISIBILITY` (currently last key at L449):**

```js
  // CR-166: CS/franchise common session token (separate from restaurant AUTH_TOKEN)
  COMMON_TOKEN: 'common_auth_token',
```

**Insertion point:** After L449 (`CHANNEL_VISIBILITY: 'mygenie_channel_visibility',`) and before L450 (`};`)

**Code marker required:** `// CR-166` on each addition.

---

### E2 — `src/api/transforms/authTransform.js`

**Nature:** Additive — zero existing lines change.

**E2a — Add `loginType` field to `fromAPI.loginResponse` (currently L14-22):**

Current L22:
```js
    crmToken: api.crm_token || null,
```

Change to:
```js
    crmToken: api.crm_token || null,
    loginType: api.login_type || null,  // CR-166: 'admin' = CS/franchise, null/'employee' = normal
```

**E2b — Add new transform `fromAPI.loginAsRestaurantResponse` after the closing `},` of `loginResponse` (after L22, before L23 `},`):**

```js
  // CR-166: Transform login-as-restaurant response
  // CRITICAL: uses response.restaurant_token (NOT response.token — different key from normal login)
  loginAsRestaurantResponse: (api) => ({
    token:               api.restaurant_token,       // CR-166: maps to AUTH_TOKEN
    crmToken:            api.crm_token || null,
    restaurantId:        api.restaurant_id,
    restaurantName:      api.restaurant_name,
    supportEmployeeId:   api.support_employee_id,
    supportEmployeeName: api.support_employee_name,
  }),
```

**Insertion point:** After the `loginResponse` closing `  }),` on L23, before the `};` that closes `fromAPI`.

**Code marker required:** `// CR-166` on the new transform.

---

### E3 — `src/api/services/authService.js`

**Nature:** Modify existing `login()` and `logout()` functions; add 2 helpers at end of file.

**E3a — Modify `login()` token storage (currently L21):**

Current L21:
```js
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
```

Replace with:
```js
  // CR-166: admin login_type = CS/franchise → store as COMMON_TOKEN, not AUTH_TOKEN
  // AUTH_TOKEN is set later by loginAsRestaurant() after user picks a restaurant
  if (authData.loginType === 'admin') {
    localStorage.setItem(STORAGE_KEYS.COMMON_TOKEN, authData.token);
  } else {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
    // BUG-098: Set CRM token (existing logic — unchanged for employee login)
    setCrmToken(authData.crmToken);
    if (authData.crmToken) {
      localStorage.setItem('crm_token', authData.crmToken);
    }
  }
```

**IMPORTANT:** Remove or skip the existing CRM token block (L24-28) that runs unconditionally — it must only run for non-admin logins. The replacement above handles both branches.

**E3b — Modify `logout()` to also clear COMMON_TOKEN and call COMMON_LOGOUT:**

Current `logout()` structure (L52-71):
```js
export const logout = async () => {
  await api.post(API_ENDPOINTS.LOGOUT);
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  clearCrmToken();
  localStorage.removeItem('crm_token');
  localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY);
  ...
};
```

After `await api.post(API_ENDPOINTS.LOGOUT);` (L54), add:
```js
  // CR-166: Also invalidate common token if this was an admin session
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  if (commonToken) {
    try {
      await api.post(API_ENDPOINTS.COMMON_LOGOUT, {}, {
        headers: { Authorization: `Bearer ${commonToken}` },
      });
    } catch (_) {
      // CR-166: best-effort — common logout failure should not block local cleanup
    }
    localStorage.removeItem(STORAGE_KEYS.COMMON_TOKEN);
  }
```

**E3c — Add 2 helper exports at end of file (after `isRememberMeEnabled`, currently L108):**

```js
// CR-166: Common token helpers (used by RestaurantPickerPage + Sidebar)
export const getCommonToken = () =>
  localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);

export const clearCommonToken = () =>
  localStorage.removeItem(STORAGE_KEYS.COMMON_TOKEN);
```

---

### E4 — NEW `src/api/services/commonAuthService.js`

**Nature:** New file. ~45 lines. Uses COMMON_TOKEN from localStorage directly (not via axios interceptor's AUTH_TOKEN header).

```js
// CR-166: CS/Franchise common-auth service
// Uses COMMON_TOKEN as Bearer (NOT AUTH_TOKEN — different session level)
import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI } from '../transforms/authTransform';
import { setCrmToken } from '../crmAxios';

// GET /assigned-restaurants — returns active restaurants only (restaurant_status === 1)
export const getAssignedRestaurants = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.get(API_ENDPOINTS.ASSIGNED_RESTAURANTS, {
    headers: { Authorization: `Bearer ${commonToken}` },
  });
  const data = response.data.assigned_restaurants || [];
  return data.filter(r => r.restaurant_status === 1); // OQ-4: active only
};

// POST /login-as-restaurant — picks one restaurant, stores its AUTH_TOKEN
export const loginAsRestaurant = async (restaurantId) => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.post(
    API_ENDPOINTS.LOGIN_AS_RESTAURANT,
    { restaurant_id: restaurantId },
    { headers: { Authorization: `Bearer ${commonToken}` } },
  );
  const authData = fromAPI.loginAsRestaurantResponse(response.data);
  // CR-166: restaurant_token → AUTH_TOKEN (not COMMON_TOKEN — different key in response)
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  // CR-166: crm_token → CRM store (same as normal login)
  if (authData.crmToken) {
    setCrmToken(authData.crmToken);
    localStorage.setItem('crm_token', authData.crmToken);
  }
  return authData;
};

// POST /adminemployee/logout — best-effort invalidation of COMMON_TOKEN
export const commonLogout = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  if (!commonToken) return;
  await api.post(API_ENDPOINTS.COMMON_LOGOUT, {}, {
    headers: { Authorization: `Bearer ${commonToken}` },
  });
};
```

---

### E5 — `src/pages/LoginPage.jsx`

**Nature:** 2-line change. High-precision target.

**Target lines (verified from live file):**
- L83: `await login({ email, password, fcmToken }, rememberMe);`
- L85: `// Navigate to loading screen on success`
- L86: `navigate("/loading", { replace: true });`

**Replace L83 + L85 + L86 with:**
```js
      const authData = await login({ email, password, fcmToken }, rememberMe);

      // CR-166: admin login_type (CS/franchise) → restaurant picker; employee → normal boot
      navigate(
        authData?.loginType === 'admin' ? '/restaurant-picker' : '/loading',
        { replace: true }
      );
```

**No other changes to LoginPage.jsx.**

---

### E6 — NEW `src/pages/RestaurantPickerPage.jsx`

**Nature:** New file. ~130 lines. Option A — Card Grid design.
**Guard:** COMMON_TOKEN required; no ProtectedRoute (AUTH_TOKEN not yet set at this point).

**Structure:**

```
RestaurantPickerPage
├── useEffect: guard (no COMMON_TOKEN → navigate('/'))
├── useEffect: fetchRestaurants() on mount
├── Header: Logo + "Select Restaurant" heading + Logout button
├── Search bar (always visible — D2 locked)
├── Loading state (spinner)
├── Error state (retry button)
└── Card Grid (responsive: 2-3 cols on desktop, 1-2 on mobile)
    └── RestaurantCard
        ├── Logo circle: initials fallback when restaurant_logo is null (D3 open)
        ├── Restaurant name (bold)
        ├── Address (truncated, 2 lines)
        └── "Enter POS" button with loading state while selecting
```

**Key behaviors:**
- `handleSelect(restaurantId)` → calls `loginAsRestaurant(restaurantId)` → sets AUTH_TOKEN → `navigate('/loading', { replace: true })`
- `handleLogout()` → calls `commonLogout()` (best-effort) → clears COMMON_TOKEN from localStorage → `navigate('/', { replace: true })`
- Search filters on `restaurant_name` + `restaurant_address` (client-side)
- While a restaurant is being selected (`selecting === restaurantId`), that card shows spinner + all other cards disabled
- `data-testid` required on: `restaurant-picker-page`, `restaurant-picker-search`, each card `restaurant-card-{restaurantId}`, logout button `restaurant-picker-logout`

**Imports needed:**
```js
import { getAssignedRestaurants, loginAsRestaurant, commonLogout } from '../api/services/commonAuthService';
import { getCommonToken } from '../api/services/authService';
import { COLORS, GENIE_LOGO_URL } from '../constants';
import { Building2, Search, LogOut, ArrowRight, Loader2 } from 'lucide-react';
```

---

### E7 — `src/App.js`

**Nature:** Additive — 1 import + 1 route.

**E7a — Add import after L90 (after `import { ProtectedRoute, ErrorBoundary }...`):**

```js
import RestaurantPickerPage from './pages/RestaurantPickerPage'; // CR-166
```

**E7b — Add route after L114 (`<Route path="/" element={<LoginPage />} />`):**

```jsx
<Route path="/restaurant-picker" element={<RestaurantPickerPage />} />  {/* CR-166 */}
```

**Note:** This route does NOT use `ProtectedRoute` — `RestaurantPickerPage` self-guards via COMMON_TOKEN check.

---

### E8 — `src/contexts/AuthContext.jsx`

**Nature:** Import + 1 call in logout.

**E8a — Add import at top of file (after L2 `import * as authService...`):**

```js
import { clearCommonToken } from '../api/services/authService'; // CR-166
```

**E8b — In `logout` callback (L34-40), add `clearCommonToken()` call after `await authService.logout()`:**

Current L34-36:
```js
  const logout = useCallback(async () => {
    await authService.logout(); // CR-124: awaits API + local storage clear
    sessionStorage.clear();
```

Change to:
```js
  const logout = useCallback(async () => {
    await authService.logout(); // CR-124: awaits API + local storage clear
    clearCommonToken();         // CR-166: belt-and-suspenders — clear common token on logout
    sessionStorage.clear();
```

**Rationale:** `authService.logout()` already clears COMMON_TOKEN in E3b. This call is belt-and-suspenders only — ensures React context logout path is covered if `authService.logout()` throws before completing cleanup.

---

### E9 — `src/components/layout/Sidebar.jsx`

**Nature:** Additive — 1 import + 1 button in bottom section. Hotspot file — additive only, zero logic changes.

**E9a — Add import to existing lucide-react import (L7):**

Current L7:
```js
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt, Link2
```

Add `ArrowLeftRight` to the list:
```js
  LayoutGrid, List, Columns, Rows, LineChart, Banknote, Store as StoreIcon, Receipt, Link2, ArrowLeftRight
```

**E9b — Add `getCommonToken` import to the auth import (L10):**

Current L10:
```js
import { useAuth, useRestaurant, useMenu, useTables, useSettings } from "../../contexts";
```

Add a separate line:
```js
import { getCommonToken } from '../../api/services/authService'; // CR-166
```

**E9c — Add "Switch Restaurant" button between Profile (ends ~L775) and Logout (starts L777):**

Insertion after the closing `</button>` of the Profile section (after L775), before `{/* Logout */}` comment (L777):

```jsx
        {/* CR-166: Switch Restaurant — visible only in admin/CS/franchise session */}
        {getCommonToken() && (
          <button
            data-testid="sidebar-switch-restaurant"
            onClick={() => {
              saveScroll();
              navigate('/restaurant-picker');
            }}
            className={`w-full flex items-center gap-3 px-2 py-2.5 mb-1 hover:bg-blue-50 rounded-lg transition-colors ${
              isExpanded ? "justify-start" : "justify-center"
            }`}
            style={{ color: '#3B82F6' }}
            title={!isExpanded ? "Switch Restaurant" : undefined}
          >
            <ArrowLeftRight className="w-5 h-5 flex-shrink-0" />
            {isExpanded && <span className="text-sm font-medium">Switch Restaurant</span>}
          </button>
        )}
```

---

## Verification Matrix (seeds QA handover)

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| E1a | `constants.js` | +4 COMMON_LOGIN/ASSIGNED_RESTAURANTS/LOGIN_AS_RESTAURANT/COMMON_LOGOUT | `grep -n COMMON_LOGIN src/api/constants.js` → found | YES (grep) |
| E1b | `constants.js` | +COMMON_TOKEN in STORAGE_KEYS | `grep -n COMMON_TOKEN src/api/constants.js` → found | YES (grep) |
| E2a | `authTransform.js` | +loginType field in loginResponse | Unit: `fromAPI.loginResponse({ login_type:'admin' }).loginType === 'admin'` | YES (unit) |
| E2b | `authTransform.js` | +loginAsRestaurantResponse transform | Unit: `fromAPI.loginAsRestaurantResponse({ restaurant_token:'tok' }).token === 'tok'` | YES (unit) |
| E3a | `authService.js` | login() branches on loginType | Browser: CS admin login → COMMON_TOKEN in localStorage, AUTH_TOKEN absent | NO (browser) |
| E3b | `authService.js` | logout() clears COMMON_TOKEN + calls COMMON_LOGOUT | Browser: logout → COMMON_TOKEN removed from localStorage | NO (browser) |
| E3c | `authService.js` | getCommonToken + clearCommonToken exported | `grep -n getCommonToken src/api/services/authService.js` → found | YES (grep) |
| E4 | `commonAuthService.js` (NEW) | getAssignedRestaurants/loginAsRestaurant/commonLogout | Browser: Network tab shows calls to correct endpoints | NO (browser) |
| E5 | `LoginPage.jsx` | navigate branches on loginType | Browser: CS admin login → redirects to /restaurant-picker | NO (browser) |
| E6 | `RestaurantPickerPage.jsx` (NEW) | Card grid renders assigned restaurants | Browser: /restaurant-picker shows restaurant cards | NO (browser) |
| E7a | `App.js` | +import RestaurantPickerPage | webpack: 0 new errors | YES (webpack) |
| E7b | `App.js` | +/restaurant-picker route | Browser: navigate to /restaurant-picker → page renders | NO (browser) |
| E8 | `AuthContext.jsx` | +clearCommonToken() in logout | Code review: import + call present | YES (grep) |
| E9a | `Sidebar.jsx` | +ArrowLeftRight import | webpack: 0 new errors | YES (webpack) |
| E9b | `Sidebar.jsx` | +getCommonToken import | `grep -n getCommonToken src/components/layout/Sidebar.jsx` → found | YES (grep) |
| E9c | `Sidebar.jsx` | +Switch Restaurant button, gated on getCommonToken() | Browser: admin session → button visible; employee session → button absent | NO (browser) |

---

## Post-Code Registry Checklist

Implementation agent MUST execute this after all edits:

```
□ 1. registry.json: CR-166 → status: IMPLEMENTED, sprint_key: pos_5_0
□ 2. CR_REGISTRY.md: CR-166 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: Add entries for all 9 files (7 modified + 2 new)
□ 4. Code markers: // CR-166 comment in every modified/created file
□ 5. Compile: webpack compiled with 0 NEW warnings (1 pre-existing SettlementReportMockup warning is OK)
```

---

## Risk Register

| Risk | Likelihood | Mitigation in Plan |
|---|---|---|
| Token key mismatch: `restaurant_token` vs `token` | HIGH | E2b explicitly maps `api.restaurant_token` → `token` in transform |
| `crm_token` missing after login-as → CRM features broken | HIGH | E4 `loginAsRestaurant` stores both AUTH_TOKEN and crm_token |
| CRM setCrmToken called in admin branch of login() | MEDIUM | E3a skips CRM block for admin; E4 handles it after restaurant selection |
| CS user lands on `/loading` without AUTH_TOKEN | MEDIUM | E6 `RestaurantPickerPage` self-guards; sets AUTH_TOKEN before navigate('/loading') |
| Normal employee accidentally gets picker | LOW | E5 branch is strictly `loginType === 'admin'` from API response |
| `getCommonToken()` returns stale value across sessions | LOW | E3b + E8 clear COMMON_TOKEN on logout; E6 guards on mount |
| Sidebar re-renders on every tick (getCommonToken() in render) | LOW | `getCommonToken()` is a cheap localStorage read; acceptable for sidebar |
| `ArrowLeftRight` not in installed lucide-react version | LOW | lucide-react@0.516.0 installed — verify before implementation |
| **MANDATORY** | — | `integration_playbook_expert_v2` MUST be called before any code is written — auth rule |

---

## Open Items (carry to Gate 4)

| # | Item | Status |
|---|---|---|
| D3 | Logo CDN base URL | OPEN — owner to confirm; use initials fallback until resolved |

---

## Test Credentials for QA

| Account | Credentials | Use |
|---|---|---|
| CS admin | `saurav.menon@mygenie.online` / `Qplazm@10` | Tests common login → picker → login-as flow |
| Regular owner | `owner@18march.com` / `Qplazm@10` (rid=478) | Confirms normal employee login unaffected |
| Preprod API | `https://preprod.mygenie.online` | — |

---

## QA Test Cases (for QA handover)

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | CS admin login → picker redirect | Login with `saurav.menon@mygenie.online` → submit | Redirected to `/restaurant-picker`, not `/loading` |
| T2 | Restaurant list renders | On `/restaurant-picker` | Grid of active restaurants visible (no inactive ones) |
| T3 | Search filters | Type partial name in search | Only matching restaurants shown |
| T4 | Select restaurant → POS boot | Click any restaurant card | AUTH_TOKEN set in localStorage, navigates to `/loading` → `/dashboard` |
| T5 | COMMON_TOKEN isolated | After step T4, check localStorage | `auth_token` = restaurant token; `common_auth_token` = still present |
| T6 | Switch Restaurant sidebar button | After login-as, go to dashboard | "Switch Restaurant" button visible in sidebar bottom section |
| T7 | Switch Restaurant flow | Click Switch Restaurant | Returns to `/restaurant-picker` without re-login |
| T8 | Logout clears both tokens | Logout from dashboard | Both `auth_token` and `common_auth_token` removed from localStorage |
| T9 | Normal employee unaffected | Login with `owner@18march.com` | Redirected to `/loading` (not picker); Switch Restaurant button absent |
| T10 | Guard: direct URL without COMMON_TOKEN | Navigate to `/restaurant-picker` with no tokens | Redirected to `/` |

---

## Regression Tests

| # | Test | Why |
|---|---|---|
| R1 | Normal login → dashboard → place order → settle | E3a change to login() must not break employee token storage |
| R2 | Logout → login again (employee) | E3b logout() change must clear all tokens correctly |
| R3 | Sidebar bottom section layout | E9c addition must not shift Profile or Logout buttons |
| R4 | LoadingPage boot after login-as | AUTH_TOKEN must be read correctly by axios interceptor |

---

*Plan complete. Awaiting Gate 4 GO (owner approval). integration_playbook_expert_v2 MUST be called before implementation starts.*
*Logo CDN URL (D3) is open — implementation agent uses initials fallback; wire full CDN URL when owner provides.*
