# BUG-300 Investigation Report

**ID:** BUG-300  
**Date:** 2026-08-05  
**Investigator:** INVESTIGATION AGENT  
**Steps used:** 4/10

---

## 1. Summary

**Root cause:** `crmAxios.js` response interceptor does NOT handle HTTP 401 from the CRM API. The CRM token is set once at login (`sessionStorage.setItem('crm_token', ...)`) and never refreshed. When the CRM token expires, all CRM requests silently fail with a readable error (not surfaced to cashier). Re-login forces a new `setCrmToken()` call from `authService.login()` — which is why re-login fixes the problem.

- **Classification:** FE_BUG (missing token expiry + refresh mechanism)
- **Confidence:** HIGH — full auth flow traced, no refresh code exists
- **Steps used:** 4/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | CRM token stored once, no refresh mechanism | Code trace: crmAxios.js full file read | **CONFIRMED** | L17 sessionStorage read. setCrmToken called once at login. Zero refresh code. |
| H2 | CRM response interceptor catches 401 and retries | Code trace: crmAxios.js L76-116 | **CONFIRMED (gap)** | Interceptor adds readableMessage but NO 401 branch, NO retry, NO token refresh |
| H3 | POS auth 401 also clears CRM token as side effect | Code trace: axios.js L46-47 | **ELIMINATED** | POS 401 DOES clear CRM token: `sessionStorage.removeItem('crm_token')` — but this only happens when POS token expires, not CRM token |

---

## 3. Data Flow Trace

```
Login:
  authService.login() → POST /auth/login → sets localStorage auth_token
                      → setCrmToken(authData.crmToken) → currentCrmToken set in memory
                      → sessionStorage.setItem('crm_token', ...) → persisted

After long session (CRM token expires, POS token still valid):
  crmAxios request → X-API-Key: <expired crm_token>
  CRM API returns HTTP 401
  crmAxios interceptor (L80-116):
    → adds error.readableMessage = 'CRM request failed' (or API error message)
    → returns Promise.reject(error)
    → NO refresh, NO re-auth, NO UI notification
  Caller catches error → empty customer results / no data
  Cashier sees: customer search returns nothing (no error toast in most callers)

Re-login:
  authService.login() again → new crm_token in response → setCrmToken() called
  → new token in memory + sessionStorage → CRM calls work again

BREAK POINT: crmAxios.js — response interceptor L80. No 401 handling, no refresh.
```

---

## 4. Evidence Artifacts

- Code trace: `/app/memory/evidence/BUG-300/code_trace.md`

---

## 5. Recommendations

**Classification:** FE_FIX

**Approach options:**

**Option A (recommended — surface error to user):**
- `crmAxios.js`: Add 401 branch in response interceptor → `clearCrmToken()` + toast warning 'Customer data unavailable. Please re-login to refresh.'
- `crmAxios.js`: Set a flag `crmTokenExpired = true` to suppress repeated toasts
- Non-blocking: order flow continues, CRM features degrade gracefully

**Option B (aggressive — auto re-login):**
- Trigger POS re-login flow on CRM 401
- Risk: forces cashier out of current order flow
- NOT recommended — too disruptive

**Scope:** `crmAxios.js` only, ~15 lines

**Planning skip eligibility:** NO
- Auth/session change, sessionStorage involved
- Needs owner decision on UX (Option A vs B)
- Not a hotspot file but auth-adjacent — full planning safer

**Owner decision needed:**
- OD-1: Should CRM token expiry show a toast, or silently degrade?
- OD-2: Is there a CRM token refresh endpoint available, or must the owner re-login?

**Recommended next step:** PLANNING (Gate 2) — small scope, can be fast if OD-1/2 answered.

---

## 6. Retroactive Candidates

NONE — no drift found.
