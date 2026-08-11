# POS3.0 CR Wave 1 — Code Diff Preview (BUG-098) — 2026-05-18

## 1. Purpose

This is the exact code-change preview for BUG-098 before source files are modified. No source files have been edited.

## 2. Approved Bug For Diff Preview

| Bug | Title | Owner Approach Approval |
|---|---|---|
| BUG-098 | Use Login Response `crm_token` Instead of Env Keys | Approved |

---

## 3. BUG-098 — Use Login Response `crm_token` Instead of Env Keys

### Design Decision: Threading Approach

**Chosen: authService-level initialization (simplest, no context changes)**

The `crm_token` is set during `authService.login()` — immediately when the login response arrives. This means:
- No AuthContext changes needed (no new state, no new memoized value)
- CRM token is ready before LoadingPage even mounts
- `setCrmRestaurantId()` in LoadingPage remains for restaurant ID context/logging only

Flow: Login API → `authTransform` extracts `crm_token` → `authService.login()` calls `setCrmToken()` → crmAxios module stores token → all CRM API calls use it via interceptor

---

### File 1: `api/transforms/authTransform.js`

#### Component / Function / Constant
`fromAPI.loginResponse()`

#### Current Code Snippet (L14-21)

```js
  loginResponse: (api) => ({
    token: api.token,
    roleName: api.role_name,
    permissions: api.role || [],
    firebaseToken: api.firebase_token,
    isFirstLogin: api.first_login === 'true',
    zoneWiseTopic: api.zone_wise_topic,
  }),
```

#### Proposed Code Snippet

```js
  loginResponse: (api) => ({
    token: api.token,
    roleName: api.role_name,
    permissions: api.role || [],
    firebaseToken: api.firebase_token,
    isFirstLogin: api.first_login === 'true',
    zoneWiseTopic: api.zone_wise_topic,
    crmToken: api.crm_token || null,
  }),
```

#### Change Summary
- **Added 1 line:** `crmToken: api.crm_token || null` — extracts `crm_token` from login API response. Defaults to `null` if field is missing (graceful for backends that haven't deployed this field yet).

---

### File 2: `api/crmAxios.js` (full rewrite — 82 → ~60 lines)

#### Component / Function / Constant
Entire module: `setCrmRestaurantId`, `getCrmApiKey`, `setCrmToken`, `clearCrmToken`, request interceptor

#### Current Code (full file, L1-82)

```js
// CRM Axios instance — all customer/address/loyalty calls go through this
// Auth: X-API-Key header (per restaurant, resolved dynamically)
// Base URL: REACT_APP_CRM_BASE_URL from .env
// Keys: REACT_APP_CRM_API_KEYS — JSON map { restaurantId: apiKey }

import axios from 'axios';

const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;

// Parse the API keys map from env
let CRM_API_KEYS = {};
try {
  CRM_API_KEYS = JSON.parse(process.env.REACT_APP_CRM_API_KEYS || '{}');
} catch (e) {
  console.error('[CRM Config] Failed to parse REACT_APP_CRM_API_KEYS:', e);
}

if (!CRM_BASE_URL) {
  console.warn('[CRM Config] REACT_APP_CRM_BASE_URL is not set. CRM features will not work.');
}

// Holds the current restaurant ID — set after login via setRestaurantId()
let currentRestaurantId = null;

/**
 * Set the active restaurant ID for CRM API key resolution
 * Called once after login/profile load from RestaurantContext or LoadingPage
 */
export const setCrmRestaurantId = (restaurantId) => {
  currentRestaurantId = String(restaurantId);
  const hasKey = !!CRM_API_KEYS[currentRestaurantId];
  console.log(`[CRM Config] Restaurant ${currentRestaurantId} — API key ${hasKey ? 'found' : 'NOT FOUND'}`);
};

/**
 * Get the CRM API key for the current restaurant
 */
export const getCrmApiKey = () => {
  if (!currentRestaurantId) return null;
  return CRM_API_KEYS[currentRestaurantId] || null;
};

const crmApi = axios.create({
  baseURL: CRM_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach X-API-Key dynamically per restaurant
crmApi.interceptors.request.use(
  (config) => {
    const apiKey = getCrmApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    } else {
      console.warn('[CRM] No API key for restaurant:', currentRestaurantId);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — extract readable error
crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'CRM request failed';

    error.readableMessage = errorMessage;
    return Promise.reject(error);
  }
);

export default crmApi;
```

#### Proposed Code (full file)

```js
// CRM Axios instance — all customer/address/loyalty calls go through this
// Auth: X-API-Key header (token from login API response)
// Base URL: REACT_APP_CRM_BASE_URL from .env
// BUG-098: CRM token sourced from login response `crm_token` field.
//          Env-based REACT_APP_CRM_API_KEYS mapping removed per owner directive.

import axios from 'axios';

const CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL;

if (!CRM_BASE_URL) {
  console.warn('[CRM Config] REACT_APP_CRM_BASE_URL is not set. CRM features will not work.');
}

// BUG-098: Single CRM token from login response (replaces per-restaurant env map)
let currentCrmToken = null;
let currentRestaurantId = null;

/**
 * Set the CRM API token from the login response
 * Called once from authService.login() after successful authentication
 */
export const setCrmToken = (token) => {
  currentCrmToken = token || null;
  console.log(`[CRM Config] Token ${currentCrmToken ? 'set from login response' : 'NOT FOUND in login response'}`);
};

/**
 * Clear the CRM token (called on logout)
 */
export const clearCrmToken = () => {
  currentCrmToken = null;
  currentRestaurantId = null;
};

/**
 * Set the active restaurant ID for CRM context/logging
 * Called once after profile load from LoadingPage
 */
export const setCrmRestaurantId = (restaurantId) => {
  currentRestaurantId = String(restaurantId);
  console.log(`[CRM Config] Restaurant ${currentRestaurantId} — Token ${currentCrmToken ? 'available' : 'NOT SET'}`);
};

/**
 * Get the CRM API key (now returns the login-provided token)
 */
export const getCrmApiKey = () => {
  return currentCrmToken;
};

const crmApi = axios.create({
  baseURL: CRM_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor — attach X-API-Key from login token
crmApi.interceptors.request.use(
  (config) => {
    const apiKey = getCrmApiKey();
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    } else {
      console.warn('[CRM] No API key — crm_token missing from login response. Restaurant:', currentRestaurantId);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — extract readable error
crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'CRM request failed';

    error.readableMessage = errorMessage;
    return Promise.reject(error);
  }
);

export default crmApi;
```

#### Change Summary
- **Deleted:** `CRM_API_KEYS` parsing from `REACT_APP_CRM_API_KEYS` env variable (L10-16)
- **Deleted:** `CRM_API_KEYS[currentRestaurantId]` lookup in `setCrmRestaurantId` (L31)
- **Deleted:** `CRM_API_KEYS[currentRestaurantId]` lookup in `getCrmApiKey` (L40)
- **Added:** `setCrmToken(token)` — stores token from login response
- **Added:** `clearCrmToken()` — clears token on logout
- **Modified:** `setCrmRestaurantId` — now just sets restaurant ID + logs token status (no key lookup)
- **Modified:** `getCrmApiKey` — now returns `currentCrmToken` directly
- **Modified:** Interceptor warning message — now mentions `crm_token` for debugging
- **Preserved:** `CRM_BASE_URL` from env (separate concern — stays)
- **Preserved:** Response interceptor (unchanged)
- **Preserved:** Timeout, headers, axios instance creation (unchanged)

---

### File 3: `api/services/authService.js`

#### Component / Function / Constant
`login()`, `logout()`

#### Current Code — login() (L1-5, L13-31)

```js
// Auth Service - Login API calls

import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI, toAPI } from '../transforms/authTransform';
```

```js
export const login = async (credentials, rememberMe = false) => {
  const payload = toAPI.loginRequest(credentials);
  
  const response = await api.post(API_ENDPOINTS.LOGIN, payload);
  const authData = fromAPI.loginResponse(response.data);
  
  // Store token
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  
  // Store remember me preference
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, credentials.email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  
  return authData;
};
```

#### Proposed Code — login()

```js
// Auth Service - Login API calls

import api from '../axios';
import { API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import { fromAPI, toAPI } from '../transforms/authTransform';
import { setCrmToken, clearCrmToken } from '../crmAxios';
```

```js
export const login = async (credentials, rememberMe = false) => {
  const payload = toAPI.loginRequest(credentials);
  
  const response = await api.post(API_ENDPOINTS.LOGIN, payload);
  const authData = fromAPI.loginResponse(response.data);
  
  // Store token
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, authData.token);
  
  // BUG-098: Set CRM token from login response
  setCrmToken(authData.crmToken);
  
  // Store remember me preference
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, credentials.email);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
  
  return authData;
};
```

#### Current Code — logout() (L37-43)

```js
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // Keep remember me email if set
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};
```

#### Proposed Code — logout()

```js
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  // BUG-098: Clear CRM token on logout
  clearCrmToken();
  // Keep remember me email if set
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};
```

#### Change Summary
- **Added import:** `import { setCrmToken, clearCrmToken } from '../crmAxios'`
- **Added 1 line in login():** `setCrmToken(authData.crmToken)` — sets CRM token immediately after login
- **Added 1 line in logout():** `clearCrmToken()` — clears CRM token on logout

---

### File 4: `pages/LoadingPage.jsx`

#### Component / Function / Constant
`loadProfile()` function, import statement

#### Current Code — import (L9)

```js
import { setCrmRestaurantId } from "../api/crmAxios";
```

#### Proposed Code — import (L9)

```js
import { setCrmRestaurantId } from "../api/crmAxios";
```

**(No change — import stays. `setCrmRestaurantId` is still used for restaurant context logging.)**

#### Current Code — profile loader (L378-381)

```js
      // Set CRM API key based on restaurant ID
      if (data.profile.restaurant?.id) {
        setCrmRestaurantId(data.profile.restaurant.id);
      }
```

#### Proposed Code — profile loader (L378-381)

```js
      // BUG-098: CRM token already set from login response (authService.login → setCrmToken).
      // setCrmRestaurantId now only sets restaurant context for logging.
      if (data.profile.restaurant?.id) {
        setCrmRestaurantId(data.profile.restaurant.id);
      }
```

#### Change Summary
- **Comment updated only** — the function call remains identical. CRM token is already set from `authService.login()` before LoadingPage mounts.
- **No functional change** to LoadingPage — `setCrmRestaurantId` still called for restaurant context.

---

## 4. Files NOT Changed

| File | Why unchanged |
|---|---|
| `api/services/customerService.js` | Uses `crmApi` instance — interceptor handles key automatically |
| `api/transforms/customerTransform.js` | Data transforms — no key logic |
| `contexts/AuthContext.jsx` | No change needed — crmToken set at authService level |
| `contexts/RestaurantContext.jsx` | No CRM key logic |
| `pages/LoginPage.jsx` | Calls `login()` which handles token internally |
| `components/modals/RoomCheckInModal.jsx` | Uses `customerService` — no direct CRM key access |
| `components/order-entry/OrderEntry.jsx` | Uses `customerService` — no direct CRM key access |
| All other files | No CRM key references |

---

## 5. Total Change Size

| Metric | Value |
|---|---|
| Files modified | 4 |
| Lines added | ~8 |
| Lines deleted | ~10 |
| Lines modified | ~12 |
| Net | Slightly smaller file (removed env parsing) |
| New exports | `setCrmToken`, `clearCrmToken` |
| Removed exports | None (getCrmApiKey, setCrmRestaurantId preserved for backward compatibility) |
| New dependencies | None |
| Env variables removed from usage | `REACT_APP_CRM_API_KEYS` (code no longer reads it) |
| Env variables preserved | `REACT_APP_CRM_BASE_URL` (still used) |

---

## 6. Regression Risk

| Area | Risk | Mitigation |
|---|---|---|
| CRM customer search (Order Entry) | Low | Interceptor still attaches `X-API-Key`; just from different source |
| CRM customer lookup | Low | Same interceptor path |
| CRM address operations | Low | Same interceptor path |
| Room check-in CRM flow | Low | Same `customerService` → `crmApi` path |
| Login/logout cycle | Low | Token set on login, cleared on logout |
| Backend missing `crm_token` | Medium | If login response has no `crm_token`, CRM calls will log warning but not crash. Customer search returns `[]`, lookup returns `null`. Matches existing graceful degradation. |

---

## 7. Final Status

**code_diff_preview_created_pending_owner_approval**

---

*— POS3.0 CR Wave 1 Code Diff Preview (BUG-098) — 2026-05-18 —*
