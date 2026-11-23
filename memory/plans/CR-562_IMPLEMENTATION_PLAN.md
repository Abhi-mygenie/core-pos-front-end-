# CR-562 — Implementation Plan (Gate 3)

**Document:** plans/CR-562_IMPLEMENTATION_PLAN.md
**Stage:** Implementation Plan (Gate 3) — PLANNING role (no code)
**Created:** 2026-11-23
**Type:** CR · **Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69) · **FE Assignee:** Abhishek · Backend: Gyan
**Risk:** HIGH (API contract + device-token persistence) · **Code Reality:** NONE
**Gate 2 basis:** `impact/BUG-747_IMPACT_ANALYSIS.md` §2b (M2 failure mode) + `change_requests/CR-562_...INTAKE.md`
+ backend reply (below). **Backend is DONE** (contract confirmed), so FE is now unblocked.

## Backend contract (confirmed 2026-11-23 — frozen for this plan)
- Endpoint unchanged: `GET /api/v1/vendoremployee/profile`, employee bearer token.
- **Refresh:** when a fresh FCM token exists → `GET /profile?fcm_token=<token>`; backend upserts into
  `vendor_employees.firebase_token` (same store login sets). Omit/empty `fcm_token` → **no-op, never clears**.
- **Response:** top-level **`fcm_token`** (string|null) = stored token; top-level **`firebase_token`** = same
  value (legacy alias — read either). Not the CRM token, not the auth token.
- **Scope:** one token per employee row, last-write-wins.

## Entry Verification (anchors re-checked at HEAD — must still match before coding)
- `api/services/profileService.js` — `getProfile = async () => { const response = await api.get(API_ENDPOINTS.PROFILE); return fromAPI.profileResponse(response.data); }` (no arg today).
- `api/transforms/profileTransform.js:71-81` — `profileResponse: (api) => ({ user, restaurant, permissions: api.role || [] })`.
- `pages/LoadingPage.jsx:365` — `data.profile = await profileService.getProfile();` inside `loadProfile` (Tier-1 barrier).
- `config/firebase.js:49` — `requestFCMToken()` returns `{ error, token }`, caches `localStorage.mygenie_fcm_token`; prompts only when permission is `default`, returns `{error:'denied'}` when denied.
- `api/axios.js` — shared `api` instance; `api.get(url, { params })` supported; auth header auto-attached.
- **Other `getProfile()` callers (backward-compat):** `StationMappingTab.jsx:77`, `RestaurantSettingsPage.jsx:304` — call with no arg → `fcmToken` undefined → no query param → backend no-op. **Unchanged, verify-only.**

## Conflict Pre-Check — CLEAN (parallel-safe)
- `profileTransform.js` (BUG-683/BUG-386, closed), `LoadingPage.jsx` (BUG-451/BUG-599/station, closed),
  `profileService.js` (quiet) — no OPEN item on any. BUG-747 touches `soundManager.js`/`NotificationContext.jsx`/`App.js`
  → **file-disjoint from CR-562** → the two ship in parallel safely.

---

## Edits (exact)

### E1 — `src/api/services/profileService.js` — attach optional `fcm_token` query param  [REQUIRED]
**Current:**
```js
export const getProfile = async () => {
  const response = await api.get(API_ENDPOINTS.PROFILE);
  return fromAPI.profileResponse(response.data);
};
```
**New:**
```js
export const getProfile = async (fcmToken = null) => {
  // CR-562: when a fresh FCM device token is available, pass it so the backend
  // upserts vendor_employees.firebase_token on this GET (endpoint stays GET).
  // Omitted when absent → backend no-op (never clears). Other callers (Settings
  // re-fetch) pass nothing and are unaffected.
  const config = fcmToken ? { params: { fcm_token: fcmToken } } : undefined;
  const response = await api.get(API_ENDPOINTS.PROFILE, config);
  return fromAPI.profileResponse(response.data);
};
```

### E2 — `src/api/transforms/profileTransform.js:71-81` — surface the returned token  [REQUIRED]
Add one field to `fromAPI.profileResponse` (after `permissions`):
```js
    permissions: api.role || [],
    // CR-562: backend echoes the stored FCM device token at the TOP LEVEL as
    // `fcm_token`, with `firebase_token` as a legacy alias. Read either. Used
    // ONLY for drift/diagnostics on boot — no dashboard consumer. Null when none.
    fcmToken: api.fcm_token ?? api.firebase_token ?? null,
```

### E3 — `src/pages/LoadingPage.jsx` — get token on boot + pass it + drift log  [REQUIRED]
**E3a** add import (next to the firebase/service imports near L8-9):
```js
import { requestFCMToken } from "../config/firebase"; // CR-562
```
**E3b** in `loadProfile` (L365) replace `data.profile = await profileService.getProfile();` with:
```js
    // CR-562: refresh the backend's stored FCM token on every boot/reload (no
    // relogin). Only when permission is already granted (no boot-time prompt);
    // time-boxed (3s) so a slow getToken never delays the Tier-1 boot barrier;
    // any failure is non-blocking. Backend upserts the token on this GET.
    let currentFcmToken = null;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const r = await Promise.race([
          requestFCMToken(),
          new Promise((res) => setTimeout(() => res(null), 3000)),
        ]);
        currentFcmToken = r?.token || null;
      } catch { /* non-blocking — proceed without the param */ }
    }
    data.profile = await profileService.getProfile(currentFcmToken);
    // CR-562: drift diagnostics — did the backend hold a stale token?
    const storedFcmToken = data.profile.fcmToken;
    if (currentFcmToken && storedFcmToken && currentFcmToken !== storedFcmToken) {
      console.warn('[CR-562] FCM token drift — backend had a stale token; refreshed on this profile GET');
    }
```
(No other line in `loadProfile` changes; `setUserData`/`setRestaurant`/CRM lines stay.)

### E4 — NEW `src/api/transforms/__tests__/profileTransform.cr562.test.js`  [REQUIRED]
Unit test for the transform field only (pure, no network):
- `fcm_token:"abc"` → `fcmToken === "abc"`.
- only `firebase_token:"xyz"` (no `fcm_token`) → `fcmToken === "xyz"` (legacy alias).
- neither present → `fcmToken === null`.
- `fcm_token` wins when both present and differ (document precedence).

---

## Verification Matrix (Step 4 — seeds QA)
| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:---:|
| V1 | profileTransform.js | `fcmToken` mapped from `fcm_token`/`firebase_token`/null | `npx craco test --watchAll=false --testPathPattern=profileTransform.cr562` | YES |
| V2 | profileService.js | param attached only when token present | Boot with granted perms → Network tab: profile request URL has `?fcm_token=…`; Settings re-fetch has none | NO |
| V3 | LoadingPage.jsx | no boot-time permission prompt; boot not delayed if getToken slow | Reload on granted session → no prompt, loading screen completes normally (≤ existing time + ≤3s cap) | NO |
| V4 | end-to-end (M2) | after reload, backend holds current token → **FCM push arrives → buzzer rings** | Reload `/dashboard`, place test order → Event Log shows `received` (FCM) + `played`/`sound_ok` (needs BUG-747 unlock for audio) | NO |
| V5 | regression | denied/unsupported → no crash, no param, no cleared token | Deny notifications → reload → profile loads, no `fcm_token` param, dashboard normal | NO |
| V6 | regression | other callers unaffected | Open Settings → StationMapping / RestaurantSettings re-fetch still works (no param) | NO |

**Note:** V4's *audible* ring also depends on BUG-747 (autoplay unlock). CR-562 alone guarantees the **FCM
payload is delivered** after reload (the `received` event); BUG-747 guarantees it can **play**.

## Post-Code Registry Checklist (Step 5 — Implementation agent runs after coding)
- [ ] registry.json: CR-562 → status `GATE_5A_IMPLEMENTED`, sprint_key `nov_cr_batch`
- [ ] CR_REGISTRY.md / BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add `profileService.js`, `profileTransform.js`, `LoadingPage.jsx`, new test — CR-562 + date
- [ ] Code markers: `// CR-562` in every modified file
- [ ] webpack compiles, 0 new warnings; `profileTransform.cr562` test PASS

## Risk Register
| Risk | Likelihood | Mitigation |
|------|:---:|-----------|
| Boot-time permission prompt annoys operator | Low | Gated on `Notification.permission === 'granted'` — never calls `requestPermission()` on boot |
| `requestFCMToken()` (SW register + getToken) slows the Tier-1 boot barrier | Low–Med | `Promise.race` 3s cap; on timeout proceed with no param (backend keeps existing token) |
| Backend misreads empty param as "clear" | Low | Backend confirmed empty = no-op; FE omits the param entirely when no token (sends `undefined`, not `""`) |
| Transform field name mismatch | Low | Reads BOTH `fcm_token` and `firebase_token` (alias) per contract |
| Breaking other `getProfile()` callers | Very low | Param optional, defaults null; callers pass nothing → identical behavior |

## Execution Sequence
1. E2 (transform) + E4 (test) → run unit test (V1).
2. E1 (service signature).
3. E3 (LoadingPage wiring).
4. webpack compile check → browser verify V2/V3/V5/V6 → E2E V4 (with BUG-747 build for audio).

## Scope Lock
- **Files WILL change:** `src/api/services/profileService.js`, `src/api/transforms/profileTransform.js`,
  `src/pages/LoadingPage.jsx`, NEW `src/api/transforms/__tests__/profileTransform.cr562.test.js`.
- **Files WILL NOT touch:** `config/firebase.js` (reuse `requestFCMToken()` as-is), `api/axios.js`,
  `api/constants.js` (PROFILE path unchanged), any dashboard/order/billing/socket/auth file, BUG-747's files
  (`soundManager.js`/`NotificationContext.jsx`/`App.js`).

---
**Gate 3 stop.** No app code changed (PLANNING role). HIGH risk + API-contract change → **Gate 4 GO (owner
approval) required before implementation.** Then IMPLEMENTATION role, then `testing_agent` for V1-V6 (E2E V4
jointly with BUG-747).
