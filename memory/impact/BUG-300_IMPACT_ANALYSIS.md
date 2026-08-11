# BUG-300 — Impact Analysis (Gate 2)

**ID:** BUG-300
**Title:** Customer Name/Phone Search Stops Working After Long Session (CRM Token)
**Date:** 2026-08-05 · **AMENDED:** 2026-08-06 — backend delivered dedicated `restaurant-crm-token` endpoint; OD-2 reversed; Gate 3 plan follows.
**Role:** PLANNING AGENT (Gate 2 — Impact Analysis · CLOSED ✅)
**Risk:** MEDIUM (auth-adjacent, silent refresh — no financial logic, no R5 hotspot)

---

## Code Reality

**FULL** — CRM auth flow fully implemented. `crmAxios.js` L80 response interceptor has NO 401 branch. Backend has now delivered `GET /api/v2/vendoremployee/restaurant-crm-token` enabling silent refresh.

---

## Conflict Pre-Check

| File | Last Modified By | Risk |
|---|---|---|
| `crmAxios.js` | BUG-098 agent + CR-027 Phase 1 agent | LOW — last substantive change was CR-027 Phase 1 (error shape extraction). No conflicts. |
| `authService.js` | BUG-198 agent (2026-07-17) | LOW — login flow is stable. No conflicts. |

**No active conflicts.** Non-hotspot files.

---

## Root Cause — Confirmed (2026-08-05, CRM team answer)

**`dp_live_` keys are PERMANENT. They have no TTL and do not expire automatically.**

The ONLY time a 401 occurs is when the **restaurant owner manually clicks "Regenerate"** in CRM Settings → POS Integration. This immediately invalidates the old key.

```
Owner clicks "Regenerate" in CRM Settings:
  → Old dp_live_ key instantly becomes invalid
  → POS still holds old key in sessionStorage (set at last login)
  → All subsequent CRM requests → HTTP 401 { detail: "Invalid API key" }
  → crmAxios response interceptor: NO 401 branch → silent failure
  → customerService.searchCustomers() returns [] silently
  → Cashier sees empty customer results, no error, no guidance
  → Re-login: new login response contains the NEW dp_live_ key → works again

There is NO token refresh endpoint (keys are static).
The ONLY recovery path is re-login.
```

**Mode B (secondary) — sessionStorage cleared:**
```
Browser tab closed and reopened OR hard-refresh on some browsers
→ sessionStorage cleared → crm_token = null → 401 on all CRM calls → same silent failure
```

---

## Data Flow Trace

```
crmAxios.js request interceptor:
  → getCrmApiKey() → currentCrmToken (from sessionStorage at module load)
  → IF null: console.warn only — request still sent without key
  → IF expired/rotated: request sent with invalid key

CRM API response: HTTP 401 { detail: 'Invalid API key' }

crmAxios.js response interceptor L80-116:
  → error.readableMessage = 'CRM request failed'
  → returns Promise.reject(error)
  → NO 401 branch, NO clearCrmToken(), NO user notification

customerService.searchCustomers() L28:
  → catch (err) → console.warn → return []

UI result: customer search field shows nothing, cashier unaware

Fix path:
  crmAxios.js response interceptor:
    IF error.response?.status === 401:
      → clearCrmToken()  // prevent repeated failed calls
      → set crmTokenExpired = true flag  // suppress multiple toasts
      → (optional) toast: 'Customer lookup unavailable — please re-login'
```

---

## Affected Files

| File | Change Type | Risk | Hotspot? |
|---|---|---|---|
| `api/crmAxios.js` | MODIFY — add 401 branch in response interceptor: clearCrmToken + `crmTokenExpired` flag + toast (optional) | MEDIUM | NO |
| `api/services/customerService.js` | POSSIBLY MODIFY — searchCustomers catch: if `crmTokenExpired` flag set, surface error vs silent `[]` | LOW | NO |

**Files WILL change:** `crmAxios.js` (minimum) + optionally `customerService.js`  
**Files will NOT touch:** `authService.js` (login flow untouched), any R5 hotspot, any order flow

---

## Owner Decisions — ALL RESOLVED ✅ (OD-2 REVERSED 2026-08-06)

| # | Decision | Answer |
|---|---|---|
| OD-1 | **Show toast on CRM 401?** | **YES** — but only as fallback if refresh FAILS. Normal flow: silent refresh, zero UX disruption. |
| OD-2 | **Token refresh endpoint?** | **YES — REVERSED.** Backend shipped `GET /api/v2/vendoremployee/restaurant-crm-token` → `{ success, restaurant_id, crm_token }`. Silent refresh IS now possible. No toast needed on success. |
| OD-3 | **Use static env keys as fallback?** | **NO** — removed per BUG-098, do not reactivate |

---

## New Data Flow — Silent Refresh (OD-2 endpoint confirmed live)

```
Trigger: Owner regenerates CRM key → old dp_live_ key invalid → CRM returns 401

crmAxios.js response interceptor (NEW 401 branch):
  1. error.response.status === 401 AND !error.config._crmRetry:
     → call api.get('/api/v2/vendoremployee/restaurant-crm-token')
         (api = POS instance — uses valid auth_token from localStorage)
     → response: { success: true, crm_token: "dp_live_new_xxx" }
     → setCrmToken(newToken) + localStorage.setItem('crm_token', newToken)
     → error.config._crmRetry = true
     → error.config.headers['X-API-Key'] = newToken
     → return crmApi.request(error.config)  ← retries original request
     → Cashier sees NOTHING — fully transparent

  If refresh fails (POS session also expired → 401 → axios.js auto-logout):
     → _crmTokenRefreshing = false
     → fall through to existing error handling (readableMessage set)
     → Optional toast: 'Customer lookup unavailable — please re-login'
```

**Circular import check:** `axios.js` does NOT import from `crmAxios.js` → safe to add `import api from './axios'` at top of `crmAxios.js`. No circular dependency.

---

## Risk Classification

- **Risk: HIGH**
- Trigger: Auth/session management, customer data flow
- Scope is SMALL (~15 lines in `crmAxios.js`)
- No financial logic touched
- No R5 hotspot files
- Toast notification: verify with owner before implementing (OD-1)
- **Fast lane NOT eligible** — auth-adjacent, sessionStorage involved

---

## Downstream Impact

- All CRM features (customer search, loyalty, coupon, wallet) will degrade gracefully with a visible warning instead of silent failure
- Order flow continues normally — CRM is optional feature
- No impact on POS token auth or any non-CRM flow
