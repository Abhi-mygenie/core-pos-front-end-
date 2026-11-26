# BUG-749 — Phase 2 — Gate-3 Implementation Plan (device-token register on authenticated boot)

**Item:** BUG-749 (PRIMARY, P0, Risk HIGH) · **Sprint:** nov_cr_batch · **Assignee:** Abhishek
**Depends on:** CR-562 Phase 1 (listener re-attach — already IMPLEMENTED on main)
**Scope:** GRANTED-permission boot register only. Default/denied one-tap = Phase 4 (separate plan).
**Written:** 2026-11-24 · PLANNING role, no app code changed. **Awaiting Gate-4 GO.**

---

## 1. Code Reality (verified @ main HEAD)
- Token reaches backend **only at login** (`LoginPage.jsx:56` → `requestFCMToken()` → `login({...fcmToken})` → `authTransform.js:52` adds `fcm_token`).
- Reload never re-registers: `LoadingPage.loadProfile` sends no token; no `POST /device-token`, no `DEVICE_TOKEN` constant, no boot register effect. **Code reality: NONE.**
- `api/axios.js` request interceptor auto-attaches `Bearer <auth_token>` → a plain `api.post` from a service is authenticated.
- `requestFCMToken()` returns new shape `{ error, token }`; on `permission==='granted'` it resolves without a prompt.

## 2. Backend contract (LOCKED — live on preprod)
`POST /api/v1/vendoremployee/device-token` · bearer `AUTH_TOKEN` · body `{ "fcm_token": "<token>" }` → `200 { status:"ok", fcm_token:"<stored>" }`; `403` on missing/empty. Idempotent, last-write-wins, **no client dedupe**, no rate limit. Logout (`/api/v2/vendoremployee/employee-logout`) clears the same column.

## 3. Owner decisions carried in (recommended defaults)
- **OD-749-01:** P0 — confirm.
- **OD-REG-01:** POST `/device-token` as the **sole** boot register (do NOT also add profile `?fcm_token=`). ✅ rec
- **OD-REG-02:** bring-up home = **`NotificationContext` auth-gated effect** (persists; already hosts the listener). ✅ rec
- Phase 4 (default/denied one-tap via `SoundUnlockBanner`) is OUT of this plan.

## 4. Edits (scope lock)

### Edit 1 — NEW `frontend/src/api/services/deviceTokenService.js`
`registerDeviceToken(fcmToken)`:
- guard: if `!fcmToken` → return `null` (no call).
- `const res = await api.post(API_ENDPOINTS.DEVICE_TOKEN, { fcm_token: fcmToken });`
- return `res.data?.fcm_token ?? null`.
- Non-blocking by design: wrap in try/catch, `console.warn` on failure, return `null` (mirrors documentService "callers catch silently" convention). No client dedupe (D5).

### Edit 2 — `frontend/src/api/constants.js`
Add under the Auth block (after `LOGOUT`, L9):
```js
DEVICE_TOKEN: '/api/v1/vendoremployee/device-token',   // BUG-749: boot FCM register
```

### Edit 3 — `frontend/src/contexts/NotificationContext.jsx`
Add a **NEW separate** auth-gated effect (does NOT modify the Phase-1 attach effect at L213-252, which stays byte-stable):
```js
// BUG-749: register this device's FCM token with the backend on every
// authenticated boot/reload (incl. login-as-restaurant) so the backend can
// push to it. Granted-permission path only; default/denied = Phase 4.
useEffect(() => {
  if (!isAuthenticated) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  let cancelled = false;
  requestFCMToken().then((res) => {
    const token = res?.token || (typeof res === 'string' ? res : null); // {error,token} new shape / legacy
    if (cancelled || !token) return;
    registerDeviceToken(token); // idempotent, no dedupe (D5)
  });
  return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated]);
```
Imports: add `requestFCMToken` to the existing `../config/firebase` import (L4) and `import { registerDeviceToken } from '../api/services/deviceTokenService';`.

**Why a separate effect (refines IA Edit 5's "token→register→then attach" ordering):** registration and listener-attach are independent concerns; keeping them in separate effects leaves CR-562 Phase 1 untouched (zero regression surface) and still fires on every authenticated boot. Guarding on `permission==='granted'` prevents any permission prompt on reload.

### Edit 4 — NEW `frontend/src/__tests__/api/deviceTokenService.test.js`
Unit (mock `../axios` default export):
- posts `{ fcm_token }` to `API_ENDPOINTS.DEVICE_TOKEN`, returns stored token from `res.data.fcm_token`.
- `registerDeviceToken(null)` → returns `null`, makes **no** call.
- POST rejects → returns `null` (swallowed), no throw.

## 5. Files WILL NOT touch
`config/firebase.js` (Phase-1 locked; **no fresh OD-AUDIT-02 GO sought** — Phase 2 adds no firebase.js edit), `LoginPage.jsx` (login path unchanged), `authTransform.js`, `AuthContext.jsx`, `LoadingPage.jsx`, `soundManager.js`, `Sidebar.jsx`.

## 6. Verification Matrix (seeds QA)
| # | Check | How | Auto? |
|:--:|---|---|:--:|
| 1 | `registerDeviceToken` POST shape + return | unit `deviceTokenService.test.js` | YES |
| 2 | null/empty token → no call | unit | YES |
| 3 | POST failure swallowed → null | unit | YES |
| 4 | webpack compiles, 0 new warnings | build | YES |
| 5 | boot register on reload | browser+backend log: reload granted device → `has_firebase_token:true` for employee | NO (needs preprod acct rid69) |
| 6 | no regression: login→ring still works | browser: fresh login → order → rings | NO |
| 7 | no boot prompt when `permission!=='granted'` | browser: default-permission device reload → no popup | NO |

**Verification blocker (browser rows 5-7):** needs The Goan Kitchen preprod account + a granted-permission device. Unit rows 1-4 run in-sandbox.

## 7. Post-Code Registry Checklist (Implementation agent runs)
- [ ] registry.json: BUG-749 → status IMPLEMENTED (Phase 2), current_gate 4, sprint_key nov_cr_batch
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add deviceTokenService.js, constants.js, NotificationContext.jsx, test
- [ ] Code markers: `// BUG-749` in every modified/new file

## 8. Risk
HIGH — touches `NotificationContext.jsx` (hotspot) + auth-gated boot. Mitigation: additive separate effect, Phase-1 code untouched, granted-only guard, backend idempotent. **Needs Gate-4 GO before coding.**
