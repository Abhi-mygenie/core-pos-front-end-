# SESSION HANDOVER — 2026-11-24 — BUG-749 (FCM token not registered after reload): Deploy → Investigation → Intake → Gate 2

**Branch:** `notification-fix` · **Repo:** github.com/Abhi-mygenie/core-pos-front-end-
**Client:** The Goan Kitchen (rid 69) · **Sprint:** nov_cr_batch
**Roles this session:** DEPLOYMENT → INVESTIGATION (read-only) → INTAKE (BUG-749) → PLANNING Gate 2 (IA).
**No app code (`frontend/src`, `backend/`) changed at any point this session.** Memory docs + registry only.

---

## 0. TL;DR for the next agent
Operator complaint: after a **browser reload** (no relogin) the order **buzzer does not ring**; the order still
shows (socket). CR-562 (messaging-ready race + profile-GET token refresh) and BUG-747 (autoplay re-unlock) already
shipped on this branch but did NOT fix it. Round-2 RCA (owner production logs + code trace) found the real
PRIMARY break: **the device's FCM token is never registered with the backend on reload** → backend has no token
for the watched employee → it can never push the buzzer. Registered as **BUG-749**; owner decisions taken;
backend shipped a dedicated register endpoint; **Gate 2 Impact Analysis is complete.** Next = PLANNING Gate 3
(Implementation Plan) after owner answers OD-749-06..09.

## 1. Environment / deploy (this session, start)
- Repo `notification-fix` is deployed into `/app` (frontend via supervisor, craco, `0.0.0.0:3000`). Preview
  healthy (HTTP 200, webpack compiles). App hits REAL preprod backend (`REACT_APP_API_BASE_URL=https://preprod.mygenie.online/`).
- Secret keys (Firebase API/VAPID, CRM, Maps) set in `frontend/.env` (gitignored).
- ⚠ `memory/test_credentials.md` is a stub (no live Goan Kitchen account) → `testing_agent` cannot run a
  login-based E2E here. Provide a test account to enable the register+ring E2E.
- `config/firebase.js` is under **OD-AUDIT-02** ("no edit without owner Gate 4 GO"). BUG-749 does NOT touch it.

## 2. Investigation findings (read-only) — the full RCA
Two coupled breaks, same origin (FCM lifecycle on reload):

- **BREAK-1 (PRIMARY — token registration):** the token reaches the backend only via (a) login payload
  `fcm_token` (set only if permission granted at login) or (b) the CR-562 reload profile GET `?fcm_token=`, which
  fires only when `Notification.permission==='granted'` AND `requestFCMToken()` wins a **3s `Promise.race`**
  (`LoadingPage.jsx:371-377`). On a cold reload SW-register + `getToken()` routinely exceed 3s → race returns
  `null` → `getProfile(null)` sends nothing → backend token never refreshed. The resolved token is written to
  `localStorage['mygenie_fcm_token']` (`firebase.js:119`) but **never POSTed**. `default`-permission boots skip
  the whole block. **Production logs (order 1579106/rid69):** 5 of 6 employees incl the watched device **5840**
  "macha owner" (`pms@macha.com`) have `has_firebase_token:false`; only 5843 registered; its push
  `fcm_accepted` + `delivery_confirmed:false`.
- **BREAK-2 (SECONDARY — foreground subscription):** foreground `onMessage` only receives if `getToken()`/SW ran
  this session. On a granted reload `requestFCMToken()` still runs (fire-and-forget past the race) and re-arms the
  subscription, so BREAK-2 is largely self-healing for granted devices after CR-562; the dominant defect is BREAK-1.
- Order still renders because the **socket** path is independent (never calls `soundManager.play`). The ring is
  FCM-only.

**Fix direction (owner-endorsed): "process like login" on every authenticated boot** — when permission is
`granted`, run the full bring-up (SW register + `getToken`) automatically (silent; no prompt for already-granted),
and **send the resolved token to the backend even after the 3s barrier — never drop it**; when permission is
`default`, drive a one-tap "enable alerts" banner (no auto-prompt — Safari/iOS gesture policy); when `denied`,
guidance only. Entry-point coverage CONFIRMED: `LoginPage.jsx:34`, `RestaurantPickerPage.jsx:47` (after
`loginAsRestaurant`), `DashboardPage.jsx:223` all `navigate('/loading')` → `LoadingPage` → a single boot hook
covers normal login, admin/CS login-as-restaurant, and reload.

Investigation artifacts on this branch:
- `investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` (§8 = backend-log correlation, the BREAK-1 proof)
- `investigations/INV-CR562-FCMRACE-20261123.md` (messaging-init race = BUG-748, folded into CR-562)
- `impact/BUG-748_FCM_RACE_IMPACT_ANALYSIS.md`, `impact/BUG-747_IMPACT_ANALYSIS.md`
- earlier handover `handover/SESSION_HANDOVER_2026-11-24_FCM_RELOAD_RCA_NEXT.md`

## 3. INTAKE — BUG-749 (registered this session)
- **Duplicate check: DISTINCT**, RELATED to **CR-562** (established the drop-on-race mechanism — insufficient),
  **BUG-747** (autoplay), **BUG-748** (messaging-init race IA, folded into CR-562). `BUG-748` was never a
  standalone ID → used **BUG-749**.
- Severity **P0** (owner-confirmed) · Risk **HIGH** · Fast Lane NOT eligible · Code reality **PARTIAL**.
- Assignee: **FE Abhishek + backend Gyan**.
- Intake doc: `change_requests/BUG-749_FCM_TOKEN_NOT_REGISTERED_AFTER_RELOAD_INTAKE.md`.

### Owner decisions (OD-749-01..05) — RESOLVED
- **01 Severity → P0** (cannot defer).
- **02 Token channel → NEW dedicated `POST /device-token`** (not reuse of the profile GET). Introduced a backend
  dependency; brief sent; backend shipped it (see §4).
- **03 Default permission → one-tap "Enable alerts" banner** (no auto-prompt on reload).
- **04 Dedupe → NONE** — send the token on every reload (owner override).
- **05 Admin/CS → YES** — also register after `login-as-restaurant`.

## 4. BACKEND — brief sent + reply (endpoint SHIPPED)
- Brief: `backend_briefs/BACKEND_BRIEF_BUG-749_2026-11-24.md` (decisions D1-D8).
- Reply (verbatim): `backend_briefs/BACKEND_REPLY_BUG-749_2026-11-24.md`. Contract LOCKED:
  - `POST /api/v1/vendoremployee/device-token` · bearer `AUTH_TOKEN` · body `{ "fcm_token": "<token>" }`.
  - `200 { "status":"ok", "fcm_token":"<stored>" }`; `403 + errors` on missing/empty.
  - Writes `vendor_employees.firebase_token` (same column as login) · single/last-write-wins · keyed per
    employee+restaurant · idempotent, no rate limit, **no client dedupe** · echoes stored token · logout
    (`employee-logout`) clears same column (D7) · no `fcm_token_updated_at` (D8).
  - Guidance: **prefer this POST for boot registration**; CR-562 profile `?fcm_token=` stays useful for diagnostics.

## 5. PLANNING Gate 2 — Impact Analysis COMPLETE
- Doc: `impact/BUG-749_IMPACT_ANALYSIS.md`. **No Implementation Plan written** (Gate 2 only). **No app code.**
- Conflict pre-check: builds on CR-562 + BUG-747 (implemented, same `NotificationContext.jsx`) — must preserve
  their effects; ⚠ **open overlap with BUG-676** (scan-order no-ringer, GATE_1_INTAKE, also targets
  `NotificationContext.jsx`) → sequence BUG-749 first. `firebase.js` NOT touched → **OD-AUDIT-02 not triggered**.
- Scope (sizing, ~6 files): NEW `src/api/services/deviceTokenService.js`; `src/api/constants.js` (+`DEVICE_TOKEN`
  key, additive); `src/contexts/NotificationContext.jsx` (NEW boot effect — HIGH); `src/pages/LoadingPage.jsx`
  (adjust CR-562 boot block L370-386); `src/components/notifications/SoundUnlockBanner.jsx` extend OR new
  `EnableAlertsBanner.jsx`; NEW unit tests. WILL NOT touch: `config/firebase.js`, `firebase-messaging-sw.js`,
  `profileService.js`/`profileTransform.js`, `authService.js`, `api/axios.js`, socket/order/payment/transform.
- Risk **HIGH**; planning-skip / Fast Lane NOT eligible.

### Open owner decisions for Gate 3 (OD-749-06..09)
- **06 Boot register channel:** NEW POST as the sole boot register + keep CR-562 `?fcm_token=` for diagnostics
  only *(rec)* · vs remove CR-562 boot param · vs keep both writing.
- **07 Bring-up home:** auth-gated effect in `NotificationContext` *(rec — persists, hosts listener+unlock+banner)*
  vs `LoadingPage.loadProfile` (unmounts after boot).
- **08 Banner:** extend `SoundUnlockBanner` for `permission==='default'` vs new `EnableAlertsBanner` (either low-risk).
- **09 BUG-676 coordination:** confirm BUG-749 lands first; BUG-676 rebases on BUG-749's effect *(rec yes)*.

## 6. Exact fix anchor for Gate 3 (so the plan writer doesn't re-derive it)
On every authenticated boot (via the chosen home), when `Notification.permission==='granted'`: call
`requestFCMToken()`; attach a continuation so that **whenever it resolves a token — even after the 3s boot
barrier — POST it** via `deviceTokenService.registerDeviceToken(token)` (every boot, no dedupe, fire-and-forget,
non-blocking to the boot barrier). When `default`: render the one-tap enable-alerts banner → on tap
`requestFCMToken()` (gesture-backed prompt) → same POST. When `denied`: keep the existing guidance. Do NOT gate the
POST on the 3s race; that race may remain only to decide whether CR-562's profile `?fcm_token=` diag param is
attached (OD-749-06).

## 7. Registry / status
- `control/registry.json`: BUG-749 → **GATE_2_IA_CLOSED**; meta.last_action updated; totals bumped (+1).
- `control/BUG_TRACKER.md` (top) + `control/CR_REGISTRY.md` (row) updated to Gate 2 complete.
- Status line: `BUG-749 · GATE_2_IA_CLOSED · P0 · HIGH · FE Abhishek + BE Gyan · next: Gate 3 plan (OD-749-06..09)`.

## 8. What NOT to do
- Do NOT edit `config/firebase.js` (OD-AUDIT-02) — the fix reuses `requestFCMToken`.
- Do NOT add a socket-driven ring fallback (owner: FCM stays the sole ring source, OD-747-04=A).
- Do NOT enter Gate 3 / write code until owner answers OD-749-06..09 and gives Gate 4 GO for implementation.
