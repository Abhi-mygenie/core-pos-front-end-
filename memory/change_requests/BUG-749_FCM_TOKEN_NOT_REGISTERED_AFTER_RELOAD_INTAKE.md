# BUG-749 — FCM Device Token Never Registered With Backend After Reload — INTAKE (Gate 1)

**Document:** change_requests/BUG-749_FCM_TOKEN_NOT_REGISTERED_AFTER_RELOAD_INTAKE.md
**Role:** INTAKE (Gate 1) — no app code touched
**Created:** 2026-11-24
**Type:** BUG · **Sprint:** nov_cr_batch
**Client:** The Goan Kitchen (rid 69)
**Assignee:** Abhishek (auto-routed — notifications/FCM frontend work, NOT blocked at backend)
**Branch:** notification-fix

---

## 1. Problem (operator-reported, CONFIRMED)

After a **browser reload** (no relogin), the order **buzzer does not ring** on the device the operator is
watching — even after CR-562 (messaging-ready race fix + profile-GET token refresh) and BUG-747 (autoplay
re-unlock) shipped. The order still appears (socket path). Relogin restores the ring.

Round-2 RCA (owner-supplied production backend logs for order **1579106 / rid 69**) shows the real break is
**token REGISTRATION**, not just listening: of 6 employees, **only employee 5843 has `has_firebase_token:true`**;
the other 5 — including **5840 "macha owner"**, the device logged in as `pms@macha.com` — have
`has_firebase_token:false`. The backend dispatches the buzzer only to the one registered token
(`fcm_accepted`, `delivery_confirmed:false`). The watched device has **no backend token at all**, so it can
never be rung.

## 2. Root Cause (CONFIRMED — backend logs + code trace, HIGH confidence)

The device token reaches the backend only via two paths, both of which fail on reload:

- **Login payload** — `authService.login({email,password,fcmToken})` sets `fcm_token` only if permission was
  granted at login. Denied/default → `fcmToken=null` → stored null → `has_firebase_token:false`.
- **Reload profile GET** — `LoadingPage.loadProfile` (CR-562) sends `getProfile(?fcm_token=)` only when
  `Notification.permission==='granted'` **AND** `requestFCMToken()` wins a **3-second `Promise.race`**
  (`LoadingPage.jsx:371-377`). On a cold reload, SW register + `getToken()` routinely take **>3s** → the race
  returns `null` → `getProfile(null)` sends nothing → **backend token never refreshed**. `requestFCMToken`
  finishes a moment later and writes the token to `localStorage['mygenie_fcm_token']` (`firebase.js:119`), but
  **nothing ever sends that late token to the backend.**
- When `Notification.permission==='default'`, the reload FCM block is **skipped entirely** → no SW, no getToken,
  no registration.

**=> Two coupled breaks, same origin:** (BREAK-1, PRIMARY) the resolved token is silently dropped by the 3s
race / never sent, and default-permission boots skip registration → backend has no token for the watched device;
(BREAK-2, SECONDARY = already largely addressed by CR-562 for granted devices) a stale token / no in-session
subscription. Classification: **FE_BUG (FCM lifecycle — token registration)**. NOT backend (CR-562 contract
confirmed, backend sends correctly), NOT a permission denial on the registered device, NOT data.

## 3. Why this is NOT covered by CR-562 / BUG-747 / BUG-748

- **CR-562** established the *mechanism* (profile GET upsert + boot `requestFCMToken` call) but by design
  **drops the token when the 3s race loses** and **only runs when already granted** — so the registration gap
  persists. This BUG is the limitation of CR-562's approach, not a re-run of it.
- **BUG-747** = audio autoplay re-unlock (a different layer: makes a *received* push audible).
- **BUG-748** = the Firebase messaging async-init race (`whenMessagingReady`), folded into CR-562 (OD-748-01).
  Already shipped; it makes the listener attach but does not send the token to the backend.

## Header — Code Reality + Duplicate Check

- **Code Reality: PARTIAL.** `grep -rn "requestFCMToken\|getProfile\|mygenie_fcm_token"` shows the CR-562
  scaffolding exists (`LoadingPage.jsx:374`, `profileService.getProfile`, `firebase.js:119` localStorage write)
  and the BUG-747 `SoundUnlockBanner`. The gap behaviours — (a) send the resolved token to the backend even
  after the 3s barrier, deduped against last-sent; (b) "process like login" full bring-up on every authenticated
  boot; (c) default-permission → banner/one-tap register instead of skip — **do NOT exist**.
- **Duplicate check: DISTINCT**, RELATED to **CR-562, BUG-747, BUG-748** (shared file family:
  `LoadingPage.jsx`, `NotificationContext.jsx`, `profileService.js`). Not a duplicate — distinct root cause
  (token registration drop) and distinct symptom (backend `has_firebase_token:false`).

## 4. Classification + Severity

- **Type:** BUG
- **Severity (agent-proposed): P0** — missed order buzzer = order-alert loss on the live counter device with no
  workaround except relogin; confirmed on production data. Sibling reload-silence item BUG-747 is owner-set P0.
  **Owner to confirm (OD-749-01).**
- **Source:** OWNER-REPORTED (production logs) + AGENT-DISCOVERED (code trace)
- **Confidence:** CONFIRMED (backend logs + code agree; owner reproduced on a real device)

## 4b. Risk Classification (MANDATORY)

- **Risk: HIGH** — FCM/notification lifecycle + API contract (token send) + notification hotspot
  (`NotificationContext.jsx`). Not financial/tax/settlement → not CRITICAL. Not copy/static → not LOW/MEDIUM.
- **Process required:** Full gate flow. **Fast Lane: NOT eligible** (multi-file, hotspot, >10 lines, API contract).
- Risk not downgradable without owner rationale.

## 4c. Client + Assignee

- **Client:** The Goan Kitchen (rid 69)
- **Assignee:** Abhishek (auto-routed | owner to confirm)
- **Routing reason:** Notifications/FCM is frontend work and the primary fix reuses the already-confirmed CR-562
  backend upsert (no new backend ask) → not blocked at backend → "everything else (frontend)" → Abhishek.
  (CR-562's backend portion was Gyan's; no backend change is required here unless OD-749-02 picks a new endpoint.)

## 5. Evidence

- **Backend logs (owner-supplied):** order 1579106 / rid 69 — `RECIPIENTS_RESOLVED` 6 employees, only 5843
  `has_firebase_token:true`; 5840 "macha owner" (watched device) `has_firebase_token:false`;
  `FIREBASE_DISPATCH_RESULT` dispatched only to 5843, `fcm_accepted` + `delivery_confirmed:false`.
  Quoted verbatim in `investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` §8.
- **Screenshot:** `evidence/BUG-747/BUG-747_reload_no_fcm_socket_only_2026-11-23.png` (reloaded order arrived on
  socket only, no FCM `received`, no ring).
- **Steps to reproduce:** (1) log in on the counter device (grant notifications); (2) reload `/dashboard`;
  (3) place a real inbound order from another device; (4) observe: order popup shows (socket), no buzzer; backend
  log shows the logged-in employee `has_firebase_token:false`.
- **Curl output:** not applicable (needs an authenticated preprod session + live FCM token; `test_credentials.md`
  currently missing per 2026-11-23 handover).

## 6. Blast Radius (quick estimate — not full impact analysis)

- **Estimated scope: MEDIUM (3-4 files).**
  - `src/pages/LoadingPage.jsx` — stop dropping the late token; send it when it resolves.
  - `src/contexts/NotificationContext.jsx` — "process like login" bring-up per permission state; default → banner.
  - `src/api/services/profileService.js` (or a NEW small token-send helper) — POST/GET the resolved token.
  - `src/components/notifications/SoundUnlockBanner.jsx` — reuse for the default-permission "enable alerts" tap.
- **Hotspot files touched:** YES — `NotificationContext.jsx` (notification hotspot).
- **`config/firebase.js`:** NOT touched (reuse existing `requestFCMToken`) → avoids the OD-AUDIT-02 lock.

## 7. Open Questions (owner decisions for Gate 2)

- **OD-749-01 (severity):** P0 (rec — order-alert loss, no workaround) vs P1.
- **OD-749-02 (token-send channel):** reuse `profileService.getProfile(token)` upsert for the late token (rec —
  no backend dependency, one extra GET) vs ask backend for a dedicated lightweight `POST /device-token`.
- **OD-749-03 (default-permission boot):** banner / one-tap register only, **no auto-prompt on reload** (rec —
  avoids unsolicited prompt + Safari/iOS gesture-policy failure) vs auto `requestPermission()` on boot.
- **OD-749-04 (dedupe):** send the late token only when it differs from `localStorage['mygenie_fcm_token']`
  last-sent marker (rec: yes) to avoid a POST on every reload.
- **OD-749-05 (admin/CS path):** also run the boot registration after `login-as-restaurant` (employee AUTH_TOKEN
  is set there, not at common-login)? (rec: yes.)

## 7b. Owner Decisions — RESOLVED (2026-11-24)

- **OD-749-01 → P0.** Fix this sprint, cannot defer (owner-confirmed; matches sibling BUG-747).
- **OD-749-02 → NEW dedicated "register token" endpoint.** Owner chose a dedicated endpoint (e.g.
  `POST /device-token`) over reusing the profile GET. **Consequence: this introduces a BACKEND dependency** —
  the token-send channel is now **backend-blocked** until the endpoint ships. Needs a `BACKEND_BRIEF` (backend
  owner: Gyan); FE wiring: Abhishek. The existing CR-562 profile-GET upsert may serve as an interim path only if
  owner later allows, but per this decision the FE will target the new endpoint.
- **OD-749-03 → One-tap "Enable alerts" banner.** On a `default`-permission device, show the banner (reuse
  BUG-747 `SoundUnlockBanner`); the staff tap drives permission + registration. No auto-prompt on reload.
- **OD-749-04 → Send the token on every reload (NO dedupe).** Owner override of the recommendation — register
  the current token on each authenticated boot regardless of whether it changed (simpler; accepts the extra
  backend call per reload).
- **OD-749-05 → YES, also register after `login-as-restaurant`.** Head-office / franchise / CS multi-restaurant
  sessions must also register the device token after the restaurant is picked.

**Routing update:** now split — **FE: Abhishek** (boot bring-up, banner, call the endpoint) · **Backend: Gyan**
(new register-token endpoint). Item is **partially backend-blocked** (OD-749-02).

## 8. Handover to Next (→ PLANNING, Gate 2)

Item **BUG-749** registered. Code reality: **PARTIAL**. Duplicate: **DISTINCT**, RELATED to CR-562/BUG-747/BUG-748.
Severity: **P0** (agent-proposed, owner to confirm — OD-749-01). Risk: **HIGH**, Fast Lane NOT eligible.
Blast radius: **MEDIUM** (~3-4 files; hotspot: `NotificationContext.jsx`; `firebase.js` NOT touched).
Evidence: captured (backend logs quoted in INV §8 + screenshot). Client: The Goan Kitchen (rid 69).
Assignee: Abhishek. Owner decisions: OD-749-01..05. Next: PLANNING Gate 2 Impact Analysis.
