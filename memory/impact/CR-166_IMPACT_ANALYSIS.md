# CR-166 — Gate 2: Impact Analysis

**ID:** CR-166
**Title:** Franchise / CS Multi-Restaurant Login (Common Login + Restaurant Picker)
**Date:** 2026-08-20
**Planner:** PLANNING AGENT (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Risk:** CRITICAL (auth flow — token management, session routing, multi-tenant security)
**All OQs:** LOCKED (curl-verified 2026-08-20, owner Q&A confirmed same session)

---

## Code Reality Check

```bash
grep -n "COMMON_LOGIN\|ASSIGNED_RESTAURANTS\|LOGIN_AS_RESTAURANT\|login_type\|COMMON_TOKEN\|RestaurantPicker" src/ -r
# → 0 results — entirely new flow, no partial implementation
```

**Code Reality: NONE** — all files are new or contain additive-only changes.

---

## Conflict Pre-Check

| File | Open items | Conflict? |
|---|---|---|
| `api/constants.js` | None | SAFE |
| `api/transforms/authTransform.js` | None | SAFE |
| `api/services/authService.js` | None | SAFE |
| `pages/LoginPage.jsx` | None | SAFE |
| `App.js` | None | SAFE |
| `contexts/AuthContext.jsx` | None | SAFE |

**Pre-Check: CLEAN**

---

## Gate 2 — Impact Analysis

### Full Data Flow

```
── COMMON LOGIN FLOW ────────────────────────────────────────────────
LoginPage: user submits email + password
  → AuthContext.login() → authService.login()
  → POST /api/v1/auth/vendoremployee/common-login
  → authTransform.loginResponse reads login_type → loginType: "admin"
  → authService stores token as COMMON_TOKEN (separate localStorage key)
  → AuthContext.login() returns authData { loginType: "admin", token }
  → LoginPage checks: authData.loginType === 'admin'
      → YES: navigate('/restaurant-picker')    ← NEW BRANCH
      → NO:  navigate('/loading')              ← existing flow (unchanged)

── RESTAURANT PICKER FLOW ───────────────────────────────────────────
RestaurantPickerPage mounts
  → GET /api/v1/auth/adminemployee/assigned-restaurants
     Authorization: Bearer <COMMON_TOKEN>
  → filter restaurant_status === 1 (active only)
  → render restaurant cards (name + address + logo)
  User clicks a restaurant
  → POST /api/v1/auth/adminemployee/login-as-restaurant { restaurant_id }
     Authorization: Bearer <COMMON_TOKEN>
  → store response.restaurant_token → AUTH_TOKEN  ← key name mapping
  → store response.crm_token → 'crm_token'
  → navigate('/loading')  ← existing LoadingPage boot handles profile/permissions

── SWITCH RESTAURANT FLOW ───────────────────────────────────────────
User clicks "Switch Restaurant" (sidebar header, admin-only visible)
  → COMMON_TOKEN still in localStorage
  → navigate('/restaurant-picker')  ← re-uses common token, no re-login

── LOGOUT ───────────────────────────────────────────────────────────
User clicks Logout (admin session)
  → POST /api/v1/auth/adminemployee/logout  Authorization: Bearer <COMMON_TOKEN>
  → clear COMMON_TOKEN + AUTH_TOKEN + CRM + session data
```

### Critical Token Name Mismatch (OQ-5)

| Source | Response key | Maps to |
|---|---|---|
| Normal login | `response.token` | `AUTH_TOKEN` |
| common-login | `response.token` | `COMMON_TOKEN` ← stored separately |
| login-as-restaurant | `response.restaurant_token` | `AUTH_TOKEN` ← different key! |
| login-as-restaurant | `response.crm_token` | `'crm_token'` localStorage |

**`response.restaurant_token` ≠ `response.token`** — existing `authTransform.loginResponse` only reads `api.token`. A new `loginAsRestaurant` transform must read `api.restaurant_token`.

---

## Files to Change

### 1. `src/api/constants.js` — additive only (+8 lines)

**Additions:**
```js
// CR-166: Common Login / Franchise endpoints
COMMON_LOGIN:          '/api/v1/auth/vendoremployee/common-login',
ASSIGNED_RESTAURANTS:  '/api/v1/auth/adminemployee/assigned-restaurants',
LOGIN_AS_RESTAURANT:   '/api/v1/auth/adminemployee/login-as-restaurant',
COMMON_LOGOUT:         '/api/v1/auth/adminemployee/logout',
```

Add to `STORAGE_KEYS`:
```js
COMMON_TOKEN: 'common_auth_token',    // CR-166: CS/franchise common session token
```

### 2. `src/api/transforms/authTransform.js` — additive (+1 line to loginResponse, +1 new transform)

**Add `loginType` to `fromAPI.loginResponse`:**
```js
loginType: api.login_type || null,  // CR-166: 'admin' = CS/franchise, 'employee' = normal
```

**Add new transform `fromAPI.loginAsRestaurantResponse`:**
```js
loginAsRestaurantResponse: (api) => ({
  token:         api.restaurant_token,  // CR-166: maps to AUTH_TOKEN (different key from normal login)
  crmToken:      api.crm_token || null,
  restaurantId:  api.restaurant_id,
  restaurantName: api.restaurant_name,
  supportEmployeeId:   api.support_employee_id,
  supportEmployeeName: api.support_employee_name,
}),
```

### 3. `src/api/services/authService.js` — additive (+15 lines)

**Change to `login()` — store as COMMON_TOKEN when login_type === 'admin':**
```js
// CR-166: admin login_type = CS/franchise → store as COMMON_TOKEN (not AUTH_TOKEN)
if (authData.loginType === 'admin') {
  localStorage.setItem(STORAGE_KEYS.COMMON_TOKEN, authData.token);
  // do NOT store as AUTH_TOKEN (no restaurant context yet)
} else {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  setCrmToken(authData.crmToken); // existing CRM logic unchanged
  ...
}
```

**Add helpers:**
```js
export const getCommonToken = () => localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
export const clearCommonToken = () => localStorage.removeItem(STORAGE_KEYS.COMMON_TOKEN);
```

**Update `logout()` — also clear COMMON_TOKEN:**
```js
localStorage.removeItem(STORAGE_KEYS.COMMON_TOKEN); // CR-166
```

### 4. NEW: `src/api/services/commonAuthService.js` (~40 lines)

```js
// CR-166: CS/Franchise auth service — uses COMMON_TOKEN Bearer
import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI } from '../transforms/authTransform';
import { setCrmToken } from '../crmAxios';

// GET assigned restaurants (uses common token as Bearer)
export const getAssignedRestaurants = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.get(API_ENDPOINTS.ASSIGNED_RESTAURANTS, {
    headers: { Authorization: `Bearer ${commonToken}` },
  });
  const data = response.data.assigned_restaurants || [];
  return data.filter(r => r.restaurant_status === 1); // OQ-4: active only
};

// POST login-as-restaurant → stores restaurant_token as AUTH_TOKEN
export const loginAsRestaurant = async (restaurantId) => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  const response = await api.post(
    API_ENDPOINTS.LOGIN_AS_RESTAURANT,
    { restaurant_id: restaurantId },
    { headers: { Authorization: `Bearer ${commonToken}` } },
  );
  const authData = fromAPI.loginAsRestaurantResponse(response.data);
  // OQ-5: restaurant_token → AUTH_TOKEN; crm_token → CRM store
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  setCrmToken(authData.crmToken);
  if (authData.crmToken) localStorage.setItem('crm_token', authData.crmToken);
  return authData;
};

// POST common logout
export const commonLogout = async () => {
  const commonToken = localStorage.getItem(STORAGE_KEYS.COMMON_TOKEN);
  if (commonToken) {
    await api.post(API_ENDPOINTS.COMMON_LOGOUT, {}, {
      headers: { Authorization: `Bearer ${commonToken}` },
    });
  }
};
```

### 5. `src/pages/LoginPage.jsx` — 3 line change

**After `await login(...)` succeeds:**

Current (L83-86):
```js
await login({ email, password, fcmToken }, rememberMe);
navigate("/loading", { replace: true });
```

New:
```js
const authData = await login({ email, password, fcmToken }, rememberMe);
// CR-166: admin login_type = CS/franchise → restaurant picker
navigate(authData?.loginType === 'admin' ? '/restaurant-picker' : '/loading', { replace: true });
```

### 6. NEW: `src/pages/RestaurantPickerPage.jsx` (~120 lines)

**UI:**
- Header: "Select Restaurant" + user name + Logout button
- Search bar (if >10 restaurants)
- Grid of restaurant cards: logo (or initials fallback) + name + address
- Click card → `loginAsRestaurant(id)` → navigate('/loading')
- Loading and error states

**No ProtectedRoute** — this page requires COMMON_TOKEN (not AUTH_TOKEN). Guard: if no COMMON_TOKEN → redirect to '/'.

### 7. `src/App.js` — 3 lines

```js
import RestaurantPickerPage from './pages/RestaurantPickerPage'; // CR-166

// In Routes:
<Route path="/restaurant-picker" element={<RestaurantPickerPage />} />
```

### 8. `src/contexts/AuthContext.jsx` — 1 line

In `logout()`:
```js
clearCommonToken(); // CR-166: also clear CS/franchise common token on logout
```

### 9. Sidebar — "Switch Restaurant" button

**Visible only when `COMMON_TOKEN` exists.** Small addition to existing sidebar component — a "Switch Restaurant" item at the bottom of the nav that calls `navigate('/restaurant-picker')`.

File: find sidebar component — TBD at Gate 3.

---

## Downstream Consumers — NOT affected

| Component | Why safe |
|---|---|
| All existing API calls | Use `AUTH_TOKEN` (unchanged after `loginAsRestaurant` sets it) |
| LoadingPage boot | Fetches profile using `AUTH_TOKEN` → unchanged |
| CRM service | `crm_token` set as before — same key |
| Permissions | LoadingPage fetches via profile API using `AUTH_TOKEN` — unchanged |
| Logout (normal restaurant user) | Doesn't have COMMON_TOKEN → `clearCommonToken()` is a no-op |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Token key mismatch: `restaurant_token` vs `token` | CRITICAL | New `loginAsRestaurantResponse` transform maps it explicitly |
| `crm_token` not stored after login-as → CRM features broken | HIGH | `loginAsRestaurant()` explicitly stores both |
| CS user navigates directly to `/loading` without restaurant context | MEDIUM | LoadingPage will fail (no `AUTH_TOKEN`) — guard: `/restaurant-picker` shows with COMMON_TOKEN guard |
| Normal restaurant user accidentally gets picker | LOW | Branch is strictly `loginType === 'admin'` from API field |
| COMMON_TOKEN stale across sessions | LOW | Logout clears it; session expiry handled by API 401 |
| `integration_playbook_expert_v2` required | MANDATORY | Must call before Gate 4 — auth flow rule |

---

## Open Decisions for Gate 3

| # | Decision | Options |
|---|---|---|
| **D1** | "Switch Restaurant" entry point | (a) Sidebar bottom nav item · (b) User menu dropdown header |
| **D2** | Picker search bar | (a) Show always · (b) Show only if > 8 restaurants |
| **D3** | Logo base URL | Need to confirm CDN URL pattern for `restaurant_logo` filename |

---

## Summary

| | |
|---|---|
| New files | 2 (`RestaurantPickerPage.jsx`, `commonAuthService.js`) |
| Modified files | 6 (`constants.js`, `authTransform.js`, `authService.js`, `LoginPage.jsx`, `App.js`, `AuthContext.jsx`) + sidebar |
| Total files | ~8 |
| New lines (approx) | ~200 |
| Risk | CRITICAL |
| `integration_playbook_expert_v2` | MANDATORY before Gate 4 |

*Gate 2 complete. Awaiting owner review → Gate 3.*
