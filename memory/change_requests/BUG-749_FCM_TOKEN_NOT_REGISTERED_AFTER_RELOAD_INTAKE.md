# BUG-749 — INTAKE — FCM device token never registered with backend after reload (PRIMARY)

**Type:** BUG · **Severity:** P0 · **Risk:** HIGH
**Sprint:** nov_cr_batch · **Client:** ALL (reproduced: The Goan Kitchen, rid 69) · **Assignee:** Abhishek (FE) · Backend Gyan (endpoint SHIPPED)
**Registered:** 2026-11-24 · **Source:** OWNER-REPORTED + PROD-LOG CONFIRMED + AGENT-TRACED
**Intake role — no app code changed.**

## Classification — PRIMARY root cause of "no buzzer after reload"
The watched device/employee has **no FCM token on the backend** (`has_firebase_token:false`), so the backend can
never push to it. Prod logs (order 1579106 / rid 69): 5 of 6 employees incl. the watched `pms@macha` device have
`has_firebase_token:false`; only 1 is registered and its push is `delivery_confirmed:false`.

## Code Reality — NONE (main @ HEAD)
- Token reaches backend **only at login** (`LoginPage.jsx:56` → `login({...fcmToken})`).
- `pages/LoadingPage.jsx` `loadProfile` calls `getProfile()` with **no token** (L365); no `requestFCMToken` anywhere
  in LoadingPage (grep=0). Reload never (re)registers.
- No `POST /device-token` client, no `DEVICE_TOKEN` constant, no boot register effect.

## Backend contract (LOCKED — shipped on preprod)
`POST /api/v1/vendoremployee/device-token` · bearer `AUTH_TOKEN` · body `{ "fcm_token": "<token>" }` →
`200 { status:"ok", fcm_token:"<stored>" }` · writes `vendor_employees.firebase_token` · idempotent,
last-write-wins, no rate limit, no client dedupe · logout clears the column.

## Duplicate check
**DISTINCT** (not in main registry). RELATED: CR-562 (listener attach), BUG-747 (autoplay). Implementation exists
only on `notification-fix` (not merged) — design source.

## Severity rationale
P0 — operator misses incoming orders after a reload (order/revenue risk); the dominant casualty of the reload-ring
defect. SLA: this sprint.

## Evidence
- `impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` §2 (BREAK-1), §3, §4 (edits 3-5, 10).
- Prior branch: `notification-fix` `investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` §8 (backend-log
  correlation), `impact/BUG-749_IMPACT_ANALYSIS.md`, `backend_briefs/BACKEND_BRIEF_BUG-749_2026-11-24.md`.
- Confidence: CONFIRMED (prod logs + code).

## Blast radius
MEDIUM — NEW `deviceTokenService.js`, `constants.js` (+DEVICE_TOKEN), `NotificationContext.jsx` (boot register
effect), + Phase-4 default-permission one-tap banner. Depends on CR-562 (Phase 1).

## Open decisions
- OD-749-01: confirm P0.
- OD-REG-01: POST `/device-token` as sole boot register (rec) vs also profile `?fcm_token=`.
- OD-REG-02: bring-up home = `NotificationContext` auth-gated effect (rec) vs `LoadingPage`.
- OD-DEFAULT-01 (Phase 4): `permission==='default'` one-tap register = extend `SoundUnlockBanner` (rec) vs new
  `EnableAlertsBanner`.

## Next
PLANNING Gate 3 — Phase 2 (granted-path register) then Phase 4 (default/denied one-tap). Needs a Goan Kitchen
preprod test account + granted-notification device for the register+ring E2E (`test_credentials.md` is a stub).
