# SESSION HANDOVER — 2026-11-23 — Notification/Buzzer-after-reload (BUG-747 + CR-562)

**Branch:** `notification-fix` · **Repo:** github.com/Abhi-mygenie/core-pos-front-end-
**Client:** The Goan Kitchen (rid 69) · **Sprint:** nov_cr_batch
**Pick-up state:** CR-562 code shipped (GATE_5A) but **functionally blocked by a Firebase messaging init race**;
BUG-747 NOT implemented. One small `firebase.js` fix unblocks the whole feature. Owner said **don't edit code**
until GO — so the race fix is pending owner GO.

## TL;DR of the problem
Operator complaint: after a **browser reload** (no relogin), order **buzzer does not ring** (order still shows on
the dashboard). Two distinct failure modes were separated during investigation:
- **M1 — audio autoplay blocked:** FCM arrives but `audio.play()` is rejected (fresh document has no user-gesture
  activation). → **BUG-747** (autoplay re-unlock).
- **M2 — FCM never reaches the page:** order comes via socket only, no FCM `received`, so the ringer is never even
  invoked. → originally scoped as **CR-562** (token refresh), but see "LATEST FINDING" below.

## What was done this session (chronological)
1. **Deploy:** repo `notification-fix` deployed into `/app` (frontend runs via supervisor; preview healthy).
2. **BUG-747 — Gate 2 Impact Analysis** (`memory/impact/BUG-747_IMPACT_ANALYSIS.md`): root cause = autoplay unlock
   only obtained via LOGIN click, lost on reload. §2b added M2 (no-FCM-after-reload) from owner evidence.
3. **OD-747-04 = A** (owner): fix M2 via token-refresh path (no socket-ring architecture change).
4. **CR-562 — backend brief** (`memory/backend_briefs/BACKEND_BRIEF_CR-562_2026-11-23.md`); backend replied with a
   confirmed contract.
5. **CR-562 — Gate 3 plan** (`memory/plans/CR-562_IMPLEMENTATION_PLAN.md`).
6. **CR-562 — IMPLEMENTED (Gate 4 GO), GATE_5A** — code below. Unit test 4/4 PASS; webpack compiles clean.
7. **Two investigations** (no code) after owner retested and it STILL didn't ring — see LATEST FINDING.

## CR-562 code shipped (markers `// CR-562`) — backend contract CONFIRMED
Backend: `GET /api/v1/vendoremployee/profile` stays GET; `?fcm_token=<t>` upserts `vendor_employees.firebase_token`
(empty = no-op, never clears); response returns top-level `fcm_token` + `firebase_token` (legacy alias); one token
per employee, last-write-wins.
- `src/api/services/profileService.js` — `getProfile(fcmToken=null)` attaches `?fcm_token=` only when present.
- `src/api/transforms/profileTransform.js:81` — `profileResponse` +`fcmToken: api.fcm_token ?? api.firebase_token ?? null`.
- `src/pages/LoadingPage.jsx` — L10 import `requestFCMToken`; `loadProfile` (L~371) fetches token on boot gated on
  `Notification.permission==='granted'`, 3s `Promise.race` cap (non-blocking), passes to getProfile, logs drift.
- `src/api/transforms/__tests__/profileTransform.cr562.test.js` — NEW, 4/4 PASS.
- NOT touched: `config/firebase.js`, `api/axios.js`, `api/constants.js`, BUG-747 files.

## ⚠ LATEST FINDING (THE REAL BLOCKER) — `memory/investigations/INV-CR562-FCMRACE-20261123.md`
Owner retested: unlocked audio, took a test order after reload → **still no ring**, console showed
`[Firebase] Messaging not initialized` (firebase.js:51) BEFORE `[Firebase] Messaging initialized` (firebase.js:36).

**Primary root cause — foreground FCM listener never attached on reload:**
- `contexts/NotificationContext.jsx` L230-262: ONE-SHOT auth-gated effect (`initializedRef`) calls
  `onForegroundMessage(cb)` at L238.
- `config/firebase.js` L125-128: `onForegroundMessage = (cb) => { if (!messaging) return () => {}; ... }`.
- `config/firebase.js` L31-43 (BUG-560): `messaging` is initialized **async** inside `isSupported().then(...)`, so
  it is `null` for a short window after module load.
- On reload, auth restores before that promise resolves → the effect runs with `messaging===null` → subscribes to
  NOTHING → `initializedRef` locked true → never re-subscribes → **no foreground `onMessage` handler** → the test
  order's FCM push is dropped by the page → `processNotification` never runs → no `received`, `soundManager.play()`
  never called → **NO RING**. Order still shows via the independent socket path.
- The CR-562 token-refresh (LoadingPage L374) is the SAME race (also gets `messaging===null`) → returns null →
  profile GET sent without `?fcm_token=` → **CR-562 is a no-op on reload**. Secondary, but same cause.
- NOT a backend issue, NOT a permission issue (granted in screenshots).

## THE FIX (NOT implemented — needs owner GO), single concern, `config/firebase.js` (+ tiny NotificationContext)
Make messaging consumers wait for async init:
- Export a `messagingReady` promise from `firebase.js` (resolve it inside the `isSupported().then`).
- `onForegroundMessage` and `requestFCMToken` `await messagingReady` before using `messaging`; AND/OR have
  `NotificationContext` attach the foreground listener once `messagingReady` resolves (or re-run the effect when
  ready). Keep BUG-560 unsupported-browser safety.
This fixes BOTH the missing ring (primary) and CR-562 token refresh (secondary). Then BUG-747 (autoplay re-unlock)
is still needed so a received push can actually PLAY.

## Open items / decisions
- **CR-562:** GATE_5A_IMPLEMENTED but inert on reload until the race fix lands. Re-open or spin a follow-up for the
  `firebase.js` race fix.
- **BUG-747:** GATE_2_IA_COMPLETE (autoplay re-unlock) — NOT planned/implemented. Pending OD-747-01 (silent unlock
  vs "tap to enable" prompt vs both; rec. both), OD-747-02 (visibilitychange re-assert; rec. yes), OD-747-03
  (listener home; rec. ungated effect in NotificationContext).
- **Full fix order:** (1) `firebase.js` messagingReady race fix → ring + token refresh work; (2) BUG-747 autoplay
  unlock → audio can play. Both needed to fully close "silent after reload".

## Verification / environment gaps
- `memory/test_credentials.md` is MISSING (repo clone omitted it) and the app uses the REAL preprod backend, so
  `testing_agent` cannot run a login-based E2E here. Provide a Goan Kitchen test account to enable it.
- Only confirmed so far: CR-562 unit test (V1) PASS + clean webpack compile + login-page smoke.

## Key files
- Impact: `memory/impact/BUG-747_IMPACT_ANALYSIS.md`
- Backend brief: `memory/backend_briefs/BACKEND_BRIEF_CR-562_2026-11-23.md`
- Plan: `memory/plans/CR-562_IMPLEMENTATION_PLAN.md`
- Investigations: `memory/investigations/INV-CR562-FCMRACE-20261123.md` (+ older INV-BUZZER-20261123)
- Evidence: `memory/evidence/BUG-747/` (screenshot) · registry `memory/control/registry.json` (BUG-747, CR-562)
- Running log: `memory/control/BUG_TRACKER.md` (newest entries at top)
