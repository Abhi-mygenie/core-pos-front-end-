# QA Handover — CR-124 Call PaaS Logout API on User Logout

**Date:** 2026-07-31
**Written by:** IMPLEMENTATION AGENT
**Risk:** MEDIUM-HIGH
**Sprint:** pos_6_0

---

## 1. Inherited from Plan — Verification Matrix Results

| Edit # | File | Change | Self-Test Result |
|---|---|---|---|
| 1 | `src/api/constants.js:9` | `LOGOUT` key added to `API_ENDPOINTS` | ✅ PASS — grep confirmed |
| 2 | `src/api/services/authService.js:51` | `logout()` is `async`; `await api.post(LOGOUT)` first | ✅ PASS — grep confirmed |
| 2 | `authService.js` | localStorage cleared only after await succeeds | ✅ PASS — line order verified |
| 2 | `authService.js:67` | `REMEMBER_ME` now removed in authService (IMP-124-GAP-1) | ✅ PASS — grep confirmed |
| 3 | `src/contexts/AuthContext.jsx:34` | `logout` callback is `async`; `await authService.logout()` | ✅ PASS — grep confirmed |
| 4 | `src/components/layout/Sidebar.jsx:234` | `isLoggingOut` state declared | ✅ PASS — grep confirmed |
| 4 | `Sidebar.jsx:401` | `handleLogout` async + try/catch + toast on error | ✅ PASS — code read |
| 4 | `Sidebar.jsx` | Duplicate `removeItem('auth_token'/'remember_me')` REMOVED | ✅ PASS — grep 0 results |
| 4 | `Sidebar.jsx:767` | `disabled={isLoggingOut}` on logout button | ✅ PASS — grep confirmed |
| 5 | `src/api/axios.js:47-48` | `crm_token` + `channel_visibility` cleared on 401 | ✅ PASS — grep confirmed |
| ALL | webpack | `Compiled successfully!` — 0 new warnings | ✅ PASS |

**Self-test: 11/11 automated checks PASS**

---

## 2. Test Cases for QA Agent

### TC-124-01 — Happy Path: Successful Logout
**Pre-condition:** User is logged in and on the Dashboard.
**Steps:**
1. Click the Logout button in the Sidebar.
2. Observe the Network tab in DevTools.
**Expected:**
- A POST request fires to `/api/v2/vendoremployee/employee-logout` with `Authorization: Bearer <token>`.
- Request returns HTTP 200 `{"message":"success"}`.
- App redirects to login page (`/`).
- `localStorage.getItem('auth_token')` === `null`.
- `localStorage.getItem('mygenie_channel_visibility')` === `null`.
- `localStorage.getItem('remember_me')` === `null`.
- `sessionStorage.getItem('crm_token')` === `null`.

### TC-124-02 — Logout Button Disabled During API Call
**Pre-condition:** User is logged in.
**Steps:**
1. In DevTools Network, throttle to Slow 3G or use `Request Blocking` to delay the logout endpoint.
2. Click the Logout button.
**Expected:**
- Button becomes disabled (opacity-60) immediately after click.
- Button text changes to "Logging out..." (expanded sidebar) or tooltip shows "Logging out..." (collapsed).
- Button cannot be clicked again while in flight.

### TC-124-03 — Failed Logout Shows Toast, User Stays Logged In
**Pre-condition:** User is logged in.
**Steps:**
1. In DevTools Network, block the URL pattern `*employee-logout*`.
2. Click Logout.
3. Wait for the network request to fail.
**Expected:**
- A destructive (red) toast appears: title "Logout Failed", description "Could not reach the server. Please try again."
- User remains on the Dashboard — NOT redirected.
- `localStorage.getItem('auth_token')` is still set (not cleared).
- Logout button re-enables after the error (not stuck disabled).
- User can click Logout again to retry.

### TC-124-04 — 401 Auto-Logout Clears All Keys (IMP-124-GAP-2)
**Pre-condition:** User is logged in and a CRM token is present.
**Steps:**
1. Manually expire or corrupt the auth token in localStorage.
2. Trigger any API call that would return 401 (e.g., refresh the page or call a data endpoint).
**Expected:**
- App redirects to login page (`/`).
- `localStorage.getItem('auth_token')` === `null`.
- `localStorage.getItem('remember_me')` === `null`.
- `localStorage.getItem('mygenie_channel_visibility')` === `null`.
- `sessionStorage.getItem('crm_token')` === `null`.

### TC-124-05 — Regression: Login Still Works After CR-124
**Pre-condition:** Logged out.
**Steps:**
1. Enter valid credentials on the login page.
2. Click Login.
**Expected:**
- Login succeeds normally — no regression from async logout changes.
- App loads Dashboard, token present in localStorage.

### TC-124-06 — Regression: remember_me Pre-Fill Behaviour
**Pre-condition:** Login with "Remember Me" checked.
**Steps:**
1. Login with "Remember Me" checked.
2. Logout (success path).
3. Return to login page.
**Expected:**
- `remember_me` is cleared after logout.
- `user_email` is preserved in localStorage (pre-fill still works for UX).
  *(The check `if (!getItem(REMEMBER_ME))` runs before REMEMBER_ME is removed — so user_email survives if remember_me was set.)*

---

## 3. Regression Tests

| # | What to Verify | Why |
|---|---|---|
| R1 | Login flow end-to-end | async logout changes touched `AuthContext`; login uses same context |
| R2 | Multiple rapid API calls still work after login | `axios.js` 401 handler logic adjusted |
| R3 | Page refresh while logged in does not trigger logout | `auth_redirect` sessionStorage key handling unchanged |
| R4 | Collapsed sidebar logout button still triggers logout | `handleLogout` wired via `onClick` — same mechanism |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: CR-124
Sprint: pos_6_0
Status: GATE 5a — IMPLEMENTED
EXIT GATE: ALL 5 PASSED
```

---

## 5. Files Changed

| File | Change Summary |
|---|---|
| `src/api/constants.js` | +1 line: `LOGOUT` endpoint constant |
| `src/api/services/authService.js` | logout() → async; await API first; clear storage on success; REMEMBER_ME added |
| `src/contexts/AuthContext.jsx` | logout callback → async; await authService.logout() |
| `src/components/layout/Sidebar.jsx` | handleLogout → async/try-catch/toast; isLoggingOut state; button disabled; dead code removed |
| `src/api/axios.js` | 401 block: +crm_token + channel_visibility cleanup |

---

## 6. Credentials + Environment

- **Pre-prod URL:** `https://preprod.mygenie.online`
- **Logout endpoint tested:** `POST /api/v2/vendoremployee/employee-logout` → HTTP 200 (confirmed 2026-07-31)
- **Test account:** Use any valid vendor employee credentials that can reach preprod.
- **Auth header:** `Authorization: Bearer <token from login>`
