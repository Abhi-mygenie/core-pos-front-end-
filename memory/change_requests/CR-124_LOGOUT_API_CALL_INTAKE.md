# CR-124 Intake — Call PaaS Logout API on User Logout

**ID:** CR-124
**Date:** 2026-07-31
**Registered by:** INTAKE Agent
**Status:** GATE 2 COMPLETE — ALL DECISIONS LOCKED — Gate 3 ready
**Type:** CR (new behaviour added to existing function)
**Sprint:** pos_6_0
**Priority:** P1
**Risk:** MEDIUM-HIGH
**Source:** Owner-reported + prior INVESTIGATION_LOG.md:152 + SECURITY_AUDIT_REPORT.md:634
**Confidence:** CONFIRMED (code traced; investigation already documented)

---

## Owner Decisions (Locked 2026-07-31)

| Q# | Question | Answer | Status |
|---|---|---|---|
| Q-124-1 | Backend logout endpoint path? | **`POST /api/v2/vendoremployee/employee-logout`** — tested with fresh token, HTTP 200 `{"message":"success"}` confirmed on preprod 2026-07-31. No request body needed. | ✅ Locked |
| Q-124-2 | Does same endpoint handle FCM deregistration? | **Yes — backend handles FCM in same logout endpoint. No separate FE call needed.** | ✅ Locked |
| Q-124-3 | Fail silently or show error if API fails? | **Show error to user.** | ✅ Locked |
| Q-124-4 | API call first or local storage first? | **API call FIRST. Local storage cleared only on success. If API fails → show error, user stays logged in.** | ✅ Locked |
| GAP-2 | Fix `axios.js` 401 auto-logout missing `crm_token` + `channel_visibility`? | **IN SCOPE — included as CR-124 extension.** | ✅ Locked |

---

## 0. Code Reality Check

```bash
grep -n "api\." /app/frontend/src/api/services/authService.js
# Result: api.post() appears ONLY at line 17 (LOGIN)
# logout() at line 49 contains zero api.* calls — confirmed local-only
```

```bash
grep -n "LOGOUT\|logout" /app/frontend/src/api/constants.js
# Result: 0 hits in API_ENDPOINTS — no LOGOUT endpoint defined
```

**Code Reality: NONE** — No backend logout call exists anywhere in the codebase.

---

## 0b. Duplicate Detection

| Check | Finding |
|---|---|
| `registry.json` — keyword `logout`, `token invalidat`, `revoke`, `deregister` | No match |
| BUG-131 | Sidebar sticky issue — UI only. DISTINCT. |
| Security Audit SECURITY_AUDIT_REPORT.md:634 | Recommends "Add server-side logout endpoint to invalidate/blacklist the token" — **RELATED** (this CR is the FE implementation of that recommendation) |
| INVESTIGATION_LOG.md:152 | `Logout — no POS API call | Investigated — DOCUMENTED` — **RELATED** (prior investigation, same issue) |

**Duplicate check: DISTINCT**
**Related:** Security Audit recommendation (backend-owned), INVESTIGATION_LOG.md:152 (prior investigation)

---

## 1. One-Line Summary

When a user logs out of the POS, only localStorage is cleared. No API call is made to the PaaS backend — the session token remains valid server-side and the FCM device token is never deregistered.

---

## 2. Observed Behaviour

`authService.logout()` (line 49) does the following and nothing more:
```js
export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);  // token cleared locally
  clearCrmToken();                                    // BUG-098: CRM token
  localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY); // BUG-130
  if (!localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)) {
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
  }
};
```

No API endpoint is called. After logout:
- The PaaS/backend session token is still valid — anyone with the token can still make authenticated API calls
- The FCM device token registered at login is never deregistered — push notifications can continue to arrive on the device

---

## 3. Expected Behaviour

On logout, the frontend should call the PaaS backend logout endpoint (to be confirmed) so that:
1. **Token invalidation** — the server-side session/token is invalidated; the old token cannot be reused
2. **FCM deregistration** — the device's FCM push token is removed from the server; no further push notifications arrive on this device

The local cleanup (localStorage clear) already works and must continue to function even if the API call fails.

---

## 4. Evidence

### 4a. FCM Token Registration Flow (login path — confirmed)

```
LoginPage.jsx:56   → requestFCMToken()           ← FCM token obtained
LoginPage.jsx:83   → login({ email, password, fcmToken })
authTransform.js:37 → { fcm_token: form.fcmToken }  ← sent to backend at login
authService.js:17  → api.post(API_ENDPOINTS.LOGIN, payload)
```

**FCM token IS sent to the backend at login.** It is never deregistered on logout.

### 4b. Logout Caller Chain

```
User clicks logout button (Sidebar)
    ↓
AuthContext.jsx:34  logout = useCallback(() => {
                      authService.logout();     ← sync, no await
                      sessionStorage.clear();
                      setToken(null);
                      setUser(null);
                      setPermissions([]);
                    }, [])
    ↓
authService.js:49  export const logout = () => { ... }  ← local-only
```

Single caller: `AuthContext.logout()`. No other callers found.

### 4c. Prior Investigation

```
INVESTIGATION_LOG.md:152
  "Logout — no POS API call | Investigated — DOCUMENTED |
   No LOGOUT endpoint exists. Token not invalidated server-side.
   FCM not deregistered. Backend team to confirm logout endpoint path before fix."
```

### 4d. Security Audit Recommendation

```
SECURITY_AUDIT_REPORT.md:634
  "Add server-side logout endpoint to invalidate/blacklist the token
   Fix Owner: Backend | Blocks Production: No (standard JWT limitation)"
```

---

## 5. Root Cause — 2 Gaps

### GAP-C1 — Token Not Invalidated Server-Side

`authService.logout()` only removes `STORAGE_KEYS.AUTH_TOKEN` from localStorage. The backend token is still valid. A stolen or cached token can continue to be used for API calls after the user has logged out.

**Code:** `authService.js:49` — synchronous, no `api.post()` call.
**Fix:** Call `POST <LOGOUT_ENDPOINT>` (path TBC from backend) on logout. Best-effort / fire-and-forget so logout always succeeds even if API is unreachable.

### GAP-C2 — FCM Device Token Not Deregistered

At login, `fcm_token` is sent to the backend (`authTransform.js:37`). On logout, it is never removed. This means push notifications (new orders, alerts) can continue arriving on the device after logout — including on shared POS hardware used by multiple staff members.

**Fix:** Either (a) include FCM deregistration in the same logout endpoint, or (b) call a separate endpoint. Backend team to confirm.

---

## 6. Files to Change (Blast Radius — FINAL, all decisions locked)

| File | Change | Reason | Scope |
|---|---|---|---|
| `src/api/constants.js` | Add `LOGOUT:` to `API_ENDPOINTS` | New endpoint constant | 1 line |
| `src/api/services/authService.js` | Make `logout()` async; `await api.post(LOGOUT)`; clear local only on success; add `removeItem(REMEMBER_ME)` | GAP-C1 + IMP-124-GAP-1 + Q-124-4 | ~8 lines |
| `src/contexts/AuthContext.jsx` | Make `logout` callback async; `await authService.logout()`; catch + show error toast | Q-124-3 + async chain | ~6 lines |
| `src/components/layout/Sidebar.jsx` | Remove duplicate `localStorage.removeItem` lines 410-411 | IMP-124-GAP-3 cleanup | −2 lines |
| `src/api/axios.js` | Add `clearCrmToken()` + `removeItem(CHANNEL_VISIBILITY)` to 401 auto-logout block | GAP-2 — IN SCOPE (owner locked) | ~2 lines |

**Files NOT touched:** `firebase.js`, `LoginPage.jsx`
**Estimated scope:** SMALL (~15 lines net across 5 files)
**Hotspot files:** NONE

---

## 7. Risk Classification

| Field | Value |
|---|---|
| **Risk** | **MEDIUM-HIGH** |
| Reason | Touches authentication flow — most sensitive area. However, change is additive (fire-and-forget API call). Existing local logout continues to work regardless of API response. No destructive change. |
| Financial/billing change? | NO |
| Fast Lane eligible? | NO — auth flow, P1, security implication; full gate process required |
| Process | Full gate flow (Gate 2 → Gate 3 → Gate 4 GO → Implementation → QA) |

---

## 8. Severity Classification

| Rule | Verdict |
|---|---|
| P0 — Money loss, order loss, data corruption | NO |
| P1 — Security gap, feature broken, no workaround | **YES** — token remains valid after logout; FCM continues post-logout on shared devices |
| P2 — Minor, workaround exists | NO — no workaround for token invalidation |

**Severity: P1**

---

## 9. Owner Decisions (All Locked 2026-07-31)

| Q# | Question | Answer | Status |
|---|---|---|---|
| Q-124-1 | Logout endpoint path | ✅ **LOCKED** — `POST /api/v2/vendoremployee/employee-logout` |
| Q-124-2 | Same endpoint handles FCM deregistration? | **Yes — backend takes care of it. No separate FE call needed.** | ✅ Locked |
| Q-124-3 | Fail silently or show error if API fails? | **Show error to user** | ✅ Locked |

**Implication of Q-124-2:** Only ONE `api.post(LOGOUT)` call needed in `authService.js`. Backend deregisters FCM token automatically. No FCM SDK `deleteToken()` required on FE.

**Implication of Q-124-3:** `logout()` must become `async`. Caller `AuthContext.jsx:34` must `await` it and surface error toast if API fails. Blast radius expands slightly to include `AuthContext.jsx`.

---

## 10. Completeness Checklist

- [x] Art 1 — Intake (this doc)
- [ ] Art 2 — Impact Analysis (Gate 2)
- [ ] Art 3 — Implementation Plan (Gate 3)
- [ ] Art 4 — Gate 4 GO (owner approval)
- [ ] Art 5 — Implementation + Self-Test
- [ ] Art 6 — QA Report
- [ ] Art 7 — Owner Smoke Sign-off

---

## 11. References

- Prior investigation: `INVESTIGATION_LOG.md:152`
- Security audit recommendation: `SECURITY_AUDIT_REPORT.md:634`
- Current logout: `src/api/services/authService.js:49`
- Logout caller: `src/contexts/AuthContext.jsx:34`
- FCM token registration at login: `src/pages/LoginPage.jsx:56–83`, `src/api/transforms/authTransform.js:37`
- Constants (LOGOUT endpoint not yet defined): `src/api/constants.js`
