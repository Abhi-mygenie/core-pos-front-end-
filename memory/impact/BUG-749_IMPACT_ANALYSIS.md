# BUG-749 — Impact Analysis (Gate 2) — FCM Device Token Never Registered After Reload

**Document:** impact/BUG-749_IMPACT_ANALYSIS.md
**Stage:** Impact Analysis (Gate 2) — PLANNING role (NO code, NO Implementation Plan)
**Created:** 2026-11-24
**Type:** BUG · **Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69)
**Assignee:** FE Abhishek · Backend Gyan (endpoint SHIPPED)
**Severity:** P0 (owner-confirmed OD-749-01) · **Risk:** HIGH (notification lifecycle + API contract + hotspot)
**Intake:** change_requests/BUG-749_FCM_TOKEN_NOT_REGISTERED_AFTER_RELOAD_INTAKE.md
**Backend brief + reply:** backend_briefs/BACKEND_BRIEF_BUG-749_2026-11-24.md (endpoint live on preprod)

---

## Header — Code Reality + Conflict Pre-Check

- **Code Reality: PARTIAL.**
  - EXISTS: CR-562 boot scaffolding in `LoadingPage.loadProfile` (L370-386) — calls `requestFCMToken()` gated on
    `Notification.permission==='granted'` inside a **3s `Promise.race`** and passes the token to `getProfile()`;
    `firebase.js:119` writes the resolved token to `localStorage['mygenie_fcm_token']`. BUG-747 `SoundUnlockBanner`
    + `unlockAudioNow`/`audioUnlocked`/`audioBlockedAt` in `NotificationContext`. CR-562 messaging-ready race fix
    (`whenMessagingReady`) in `firebase.js`.
  - DOES NOT EXIST: the new `POST /device-token` client, a boot effect that registers the token on **every**
    authenticated boot "like login" (decoupled from the 3s race, never dropped), and the default-permission
    one-tap register path. `grep -rn "device-token\|registerDeviceToken\|DEVICE_TOKEN"` → 0 hits.

- **Conflict Pre-Check.**
  - `src/contexts/NotificationContext.jsx` — last modifiers **CR-562 + BUG-747 (both IMPLEMENTED 2026-11-23, not
    CLOSED)**. BUG-749 adds a new boot effect here → **must preserve** the CR-562 async listener re-attach
    (foreground `onForegroundMessage`) and the BUG-747 ungated autoplay-unlock effect (L310-324) + logout reset
    (L327-333). ⚠ **OPEN-ITEM OVERLAP: BUG-676** (scan-order no-ringer, GATE_1_INTAKE) also lists
    `NotificationContext.jsx` as a target — not yet planned → coordinate execution order (see §7, OD-749-09).
  - `src/pages/LoadingPage.jsx` — last modifiers CR-562 (2026-11-23) + BUG-599. BUG-749 may adjust the CR-562 boot
    block (L370-386). No OTHER open item targets it. Same-family as CR-562 → BUG-749 supersedes/extends that block.
  - `src/api/constants.js` — purely additive (new endpoint key); dozens of additive precedents, no open conflict.
  - `src/api/services/profileService.js` — CR-562 (IMPLEMENTED). BUG-749 **does not need to touch it** (new
    dedicated service). `getProfile` callers (StationMappingTab:77, RestaurantSettingsPage:304) unaffected.
  - `src/config/firebase.js` — under **OD-AUDIT-02 lock** ("no edit without owner Gate 4 GO"). **BUG-749 does NOT
    touch `firebase.js`** (reuses existing `requestFCMToken`/`whenMessagingReady`) → **OD-AUDIT-02 NOT triggered.**
  - OPEN_GAPS: OG-AUDIT-F4 CLOSED (BUG-560). No open FCM gap other than the OD-AUDIT-02 lock (not triggered here).

---

## 1. Problem (operator-reported, CONFIRMED)

After a browser **reload** (no relogin), the watched device's buzzer never rings because the device's FCM token
is **not registered with the backend** for the logged-in employee. Backend logs (order 1579106/rid69) show the
watched employee **5840** `has_firebase_token:false`; only 5843 is registered, and even that push is
`delivery_confirmed:false`. The order still renders via the independent socket path.

## 2. Root Cause (CONFIRMED — backend logs + code trace, HIGH confidence)

The device token reaches the backend only via (a) the login payload `fcm_token` (set only if permission was
granted at login) or (b) the CR-562 reload profile GET `?fcm_token=`, which fires only when permission is
`granted` **AND** `requestFCMToken()` wins a **3s `Promise.race`** (`LoadingPage.jsx:371-377`). On a cold reload
SW-register + `getToken()` routinely exceed 3s → race returns `null` → `getProfile(null)` sends nothing → backend
token never refreshed. The resolved token is written to `localStorage` (`firebase.js:119`) but **never sent to the
backend**. `default`-permission boots skip the whole block. Classification: **FE_BUG (FCM lifecycle — token
registration)**. NOT backend (contract confirmed + endpoint shipped), NOT permission-on-registered-device, NOT data.

## 3. Data Flow Trace (break point → fix anchor)

```
REGISTER PATH (today, broken on reload):
  reload → /loading → LoadingPage.loadProfile (L370-386)
         → IF permission==='granted': Promise.race([ requestFCMToken(), 3000ms ])
             → cold reload: 3000ms wins → currentFcmToken = null
         → getProfile(null)  → GET /profile with NO ?fcm_token=  → backend token NOT refreshed
  ...requestFCMToken resolves ~later → token saved to localStorage (firebase.js:119)
     → BREAK POINT: nothing POSTs that token anywhere → backend stays has_firebase_token:false

FIX ANCHOR (Gate 3): on every authenticated boot, when requestFCMToken() RESOLVES a token
  (even after the boot barrier), POST it to the NEW endpoint — decoupled from the 3s race,
  never dropped; default-permission → one-tap banner → requestFCMToken → POST.
```

**Entry-point coverage (OD-749-05 CONFIRMED):** `LoginPage.jsx:34`, `RestaurantPickerPage.jsx:47`
(after `loginAsRestaurant`), and `DashboardPage.jsx:223` all `navigate('/loading')` → `LoadingPage` runs. A single
boot hook (LoadingPage or an `isAuthenticated` effect in NotificationContext) therefore covers normal employee
login, admin/CS login-as-restaurant, AND reload — no per-entry wiring needed.

## 4. Backend Contract (LOCKED — shipped on preprod)

- `POST /api/v1/vendoremployee/device-token` · bearer `AUTH_TOKEN` · body `{ "fcm_token": "<token>" }`.
- `200 { "status":"ok", "fcm_token":"<stored>" }`; `403 + errors` on missing/empty token.
- Writes `vendor_employees.firebase_token` (same column as login) · single token/employee, last-write-wins ·
  idempotent, no rate limit, **no client dedupe needed** (OD-749-04) · echoes stored token (drift) ·
  logout (`employee-logout`) clears the same column to null (D7) · no `fcm_token_updated_at` (D8).
- Backend guidance: **prefer this POST for boot registration** (OD-749-02); CR-562 profile `?fcm_token=` upsert +
  response field still exist and remain useful for diagnostics.

## 5. Affected Files, Lines, Risks (scope for sizing — NOT a plan)

| # | File | Change (direction) | Risk |
|---|------|--------------------|------|
| 1 | `src/api/services/deviceTokenService.js` **(NEW)** | `registerDeviceToken(fcmToken)` → `POST DEVICE_TOKEN {fcm_token}`; returns stored token | LOW (new, additive) |
| 2 | `src/api/constants.js` | +`DEVICE_TOKEN: '/api/v1/vendoremployee/device-token'` (additive key) | LOW |
| 3 | `src/contexts/NotificationContext.jsx` | NEW auth-gated boot effect: "process like login" bring-up — granted → `requestFCMToken()` → on resolve POST via service (every boot, no dedupe); default → surface one-tap enable-alerts banner. MUST preserve CR-562 listener re-attach + BUG-747 unlock + logout reset | **HIGH** (notification hotspot; CR-562/BUG-747 overlap; BUG-676 open overlap) |
| 4 | `src/pages/LoadingPage.jsx` | Adjust CR-562 boot block (L370-386): registration no longer depends on the 3s-race token (OD-749-06). May shrink to diagnostics-only, or be removed if bring-up moves fully to #3 | MEDIUM |
| 5 | `src/components/notifications/SoundUnlockBanner.jsx` *(extend)* or NEW `EnableAlertsBanner.jsx` | One-tap "Enable alerts" for `permission==='default'` (OD-749-03/-08) | MEDIUM |
| 6 | `src/**/__tests__/*` **(NEW)** | Unit tests: `deviceTokenService` POST shape; bring-up registers on resolve + skips when denied/default | LOW |

**Scope lock (to finalize Gate 3):** WILL change → #1-#6 above. WILL NOT touch → `config/firebase.js`
(OD-AUDIT-02), `firebase-messaging-sw.js`, `profileService.js`/`profileTransform.js` (CR-562, untouched),
`authService.js`, `api/axios.js` (bearer interceptor already attaches AUTH_TOKEN), any socket/order/payment/
transform file.

## 6. Downstream Consumers (signature-impact)

- `requestFCMToken` — existing callers `LoginPage.jsx:56`, `LoadingPage.jsx:374`; BUG-749 ADDS a caller/effect.
  No signature change → no caller edit required.
- `getProfile` — NOT changed → StationMappingTab / RestaurantSettingsPage unaffected; CR-562 `?fcm_token=` path
  can remain (diagnostics) per OD-749-06.
- Axios interceptor (`api/axios.js:26-29`) auto-attaches `Bearer auth_token` → the new POST authenticates with no
  extra wiring. On `401` the interceptor already logs out.
- Logout already clears the backend column (D7) → no extra FE cleanup; next boot re-registers.

## 7. Conflict with open/implemented items — Execution Order

- **CR-562 + BUG-747 (IMPLEMENTED, same file `NotificationContext.jsx`):** BUG-749 builds ON TOP; its new effect
  must not disturb the async listener re-attach (CR-562) or the ungated autoplay-unlock effect (BUG-747, L310-324).
- **BUG-676 (OPEN, GATE_1_INTAKE — scan-order no-ringer; targets `NotificationContext.jsx`):** not yet planned.
  Recommend BUG-749 proceeds first (foundational FCM bring-up); flag for coordination so BUG-676's plan rebases on
  BUG-749's effect (OD-749-09).

## 8. Risk Classification

**HIGH.** Triggers: push-notification lifecycle + new API contract (device-token write) + notification hotspot
context. Not financial/tax/settlement → not CRITICAL. Not copy/static → not LOW/MEDIUM. Not downgradable without
owner rationale. **Fast Lane / planning-skip: NOT eligible** (multi-file, hotspot, new endpoint, >10 lines).

## 9. Owner Decisions (Gate 2 → resolve before Gate 3 plan)

- **OD-749-01..05:** RESOLVED (intake §7b) — P0; NEW POST endpoint; default→banner; no dedupe; cover
  login-as-restaurant.
- **OD-749-06 (boot register channel):** Use the NEW POST as the **sole** boot registration and keep CR-562
  profile `?fcm_token=` for **diagnostics only** *(recommended)*; OR remove the CR-562 boot `?fcm_token=` upsert
  entirely; OR keep both writing (double-write). Rec: POST-only register, profile param left as harmless/diag.
- **OD-749-07 (bring-up home):** `NotificationContext` auth-gated effect *(recommended — persists across the app,
  already hosts the listener + unlock + banner)* vs `LoadingPage.loadProfile` (unmounts after boot).
- **OD-749-08 (banner):** extend existing `SoundUnlockBanner` to also handle `permission==='default'` vs a new
  `EnableAlertsBanner` component. Rec: decide at Gate 3 (either is low-risk, additive).
- **OD-749-09 (BUG-676 coordination):** confirm BUG-749 lands before BUG-676 and BUG-676 rebases on it. Rec: yes.

## 10. Recommendation / Exit

- Root cause: **HIGH confidence, confirmed (backend logs + code).** Classification: **FE_FIX** (backend endpoint
  already shipped — no further backend ask). 
- **NOT planning-skip eligible** → full **Gate 3 Implementation Plan** required (Verification Matrix + Post-Code
  Registry Checklist).
- Next: owner answers OD-749-06..09 → PLANNING Gate 3 writes the Implementation Plan → Gate 4 GO → IMPLEMENTATION
  → testing_agent (needs a Goan Kitchen test account + granted-notification session for the E2E register+ring).

## 11. Retroactive Candidates

NONE. (CR-562 scaffolding is a different, insufficient mechanism — not an implementation of this fix.)

---
**Gate 2 (Impact Analysis) only — no Implementation Plan, no app code changed (PLANNING role).**
