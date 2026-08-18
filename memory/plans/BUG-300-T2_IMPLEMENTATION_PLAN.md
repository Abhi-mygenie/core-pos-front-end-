# BUG-300 — Implementation Plan (Gate 3) — Tier 2: Silent CRM Token Refresh

**ID:** BUG-300 (Tier 2)
**Title:** Silent CRM Token Refresh via `restaurant-crm-token` Endpoint
**Date:** 2026-08-06
**Role:** PLANNING AGENT (Gate 3 — Implementation Plan)
**Risk:** MEDIUM (auth-adjacent, crmAxios.js only, not financial, not R5)
**Sprint:** pos_5_1
**Gate 2 ref:** `impact/BUG-300_IMPACT_ANALYSIS.md` — CLOSED ✅ All ODs resolved.

---

## Entry Verification

| Plan says | Actual in file | Match? |
|---|---|---|
| `crmAxios.js:7` imports only `axios` (library) | `import axios from 'axios';` — confirmed | ✅ |
| `crmAxios.js:L80` — response interceptor, synchronous `(error) =>` | Confirmed L80 `(error) => {` | ✅ |
| `axios.js` — no import from `crmAxios.js` | Verified — only imports `axios` library | ✅ No circular dep |
| `let currentCrmToken` and `let currentRestaurantId` at L17-18 | Confirmed | ✅ |

**Plan is NOT stale. Proceed.**

---

## Scope Lock

**Files WILL change:**
- `api/crmAxios.js` — 3 edits (import, module flag, 401 branch in interceptor)

**Files will NOT touch:**
- `api/axios.js` — no changes needed
- `api/services/authService.js` — no changes needed
- `api/services/customerService.js` — no changes needed (silent refresh means callers never see the 401)
- Any R5 hotspot file

---

## Execution Sequence

Execute **in order**, compile after all 3.

---

### Edit 1 — `crmAxios.js` L7: Add POS api import

**Current (L7):**
```js
import axios from 'axios';
```

**New:**
```js
import axios from 'axios';
import api from './axios'; // BUG-300 T2: POS api instance for silent crm_token refresh on 401
```

**Why safe:** `axios.js` does not import from `crmAxios.js`. No circular dependency.

---

### Edit 2 — `crmAxios.js` L18: Add `_crmTokenRefreshing` guard flag

**Current (L17-18):**
```js
let currentCrmToken = localStorage.getItem('crm_token') || null;
let currentRestaurantId = null;
```

**New:**
```js
let currentCrmToken = localStorage.getItem('crm_token') || null;
let currentRestaurantId = null;
let _crmTokenRefreshing = false; // BUG-300 T2: prevents concurrent 401 retries
```

**Why:** If 3 CRM requests fire at once and all get 401, only one refresh call should go out.

---

### Edit 3 — `crmAxios.js` L80: Change interceptor to async + add 401 branch

**Current (L80-117):**
```js
crmApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Laravel default 422 object shape ...
```

**New:**
```js
crmApi.interceptors.response.use(
  (response) => response,
  async (error) => { // BUG-300 T2: async to support silent token refresh
    // BUG-300 T2: Silent CRM token refresh — call restaurant-crm-token endpoint on 401
    if (
      error.response?.status === 401 &&
      !error.config?._crmRetry &&
      !_crmTokenRefreshing
    ) {
      _crmTokenRefreshing = true;
      try {
        const res = await api.get('/api/v2/vendoremployee/restaurant-crm-token');
        if (res.data?.crm_token) {
          const newToken = res.data.crm_token;
          setCrmToken(newToken);
          localStorage.setItem('crm_token', newToken);
          // Retry the original failed CRM request once with the new token
          error.config._crmRetry = true;
          error.config.headers['X-API-Key'] = newToken;
          return crmApi.request(error.config);
        }
      } catch (_refreshErr) {
        // POS session expired → api.get() triggers axios.js 401 handler → auto-logout
        // OR endpoint temporarily unavailable — fall through to error handling below
      } finally {
        _crmTokenRefreshing = false;
      }
    }

    // Existing error shape extraction (unchanged) ...
    let validationLine = '';
```

**Note on `_crmRetry` flag:** Set on `error.config` before the retry call. If the retry also returns 401 (new token immediately invalid), the condition `!error.config?._crmRetry` is false — no second refresh attempt. Falls through to existing error handling.

---

## Verification Matrix

| Edit # | File | Expected | How to Verify |
|--------|------|----------|---------------|
| E1 | `crmAxios.js:8` | `import api from './axios'` with `// BUG-300 T2` | `grep -n "BUG-300 T2" src/api/crmAxios.js` → 4+ hits |
| E2 | `crmAxios.js:~20` | `let _crmTokenRefreshing = false` | grep confirms |
| E3 | `crmAxios.js:~80` | `async (error) =>` + 401 branch present | Code inspection |
| C1 | Compile | 0 new warnings | `tail frontend.out.log` → `webpack compiled with 1 warning` |
| R1 | Normal CRM flow unaffected | Customer search works when token is valid | No 401 → interceptor skips new branch entirely |
| R2 | Silent refresh works | Owner regenerates key → customer search auto-recovers within 1 request cycle | Network: 2 calls to status-food (1 fail 401, 1 retry success) |
| R3 | Logout clears token | Logout → localStorage crm_token gone | Already verified in BUG-300 Tier 1 QA |
| R4 | POS session expiry → auto-logout | POS token expired during refresh attempt → login page | `api.get()` → axios.js 401 handler → auto-logout |

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|------|-----------|-----------|
| R1 | Infinite retry loop | NONE — `_crmRetry` flag on config prevents it | |
| R2 | Multiple concurrent 401s — N refresh calls | LOW — `_crmTokenRefreshing` flag prevents concurrent refreshes | |
| R3 | Refresh adds latency to failed CRM call | LOW — only fires on actual 401, not on normal calls | |
| R4 | `api.get()` circular import | NONE — `axios.js` confirmed not importing from `crmAxios.js` | |
| R5 | Async interceptor breaks Axios chain | NONE — Axios handles Promise-returning interceptors natively | |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-300 → status: "IMPLEMENTED Tier 2 — Gate 5a", gate: 5
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add crmAxios.js entry under BUG-300 T2
- [ ] Code markers: // BUG-300 T2 in all 3 edit locations
- [ ] Compile: webpack 0 new warnings
```

---

## Summary

- **1 file:** `api/crmAxios.js`
- **3 edits:** import + flag + async 401 branch
- **~20 lines added**
- **Zero UX disruption** — cashier never sees anything when refresh succeeds
- **Correct fallback** — if refresh fails, existing error handling runs; POS session expiry → auto-logout
- **Gate 4 GO required** before implementation
