# SESSION HANDOVER — 2026-11-24 — FCM reload-ring (CR-562 Phase 1 SHIPPED; BUG-749/747/750 planned) + push

**Branch:** `main` · **State:** 4 local commits **ahead of origin/main**, **not yet pushed** (push pending PAT) + this handover and ported reference docs.
**Context:** Clean rebuild of the FCM reload-ring fix family on `main` (the older impl on `notification-fix` is design source only — NOT merged). Owner directive: longer route / smaller parts / clean build on `main`.
**Role trail this session:** INVESTIGATION → PLANNING(IA) → INTAKE → PLANNING(Gate 3) → IMPLEMENTATION (Phase 1) → handover.

---

## TL;DR — status of every item

| ID | Title | Gate / status | Phase | Code on main |
|----|-------|---------------|:---:|---|
| **CR-562** | FCM messaging-ready race + listener re-attach on reload | **GATE_5A_IMPLEMENTED** (code shipped, unit-tested; browser E2E pending) | 1 ✅ | YES |
| **BUG-749** | Device FCM token never registered after reload (PRIMARY) | GATE_1_INTAKE (Gate-2 IA done in combined doc) | 2 + 4 | none |
| **BUG-747** | Buzzer silent after reload: autoplay unlock + Sidebar tri-state | GATE_1_INTAKE | 3 | none |
| **BUG-750** | Ringer doesn't stop on Update Order when order has `food_status=7` | GATE_1_INTAKE | 5 (independent) | none |

**Operator symptom:** after a browser **reload** (no relogin) an incoming order **does not ring**; relogin fixes it. Secondary: long web-edit buzzer keeps ringing after **Update Order**.

---

## What was IMPLEMENTED this session — CR-562 Phase 1 (commit 9e2c37b4)

**Goal:** make the foreground FCM listener actually (re)attach after a reload instead of subscribing to a `null` messaging instance.

### Files changed (exact)
1. **`frontend/src/config/firebase.js`**
   - **E1 (L18-48):** added `export const whenMessagingReady` — a promise resolved inside the existing `isSupported().then().catch().finally()` chain (→ messaging instance when supported, else `null`), plus an `else { _resolveMessagingReady(null); }` for the app-init-failed path. **BUG-560 unsupported-browser safety preserved** (always settles).
   - **E2 (L55):** `requestFCMToken` now `await whenMessagingReady` before the `!messaging` guard.
   - **E3 (L130-134):** `onForegroundMessage` is now **async**, awaits readiness, then `onMessage`.
2. **`frontend/src/contexts/NotificationContext.jsx`**
   - **E4 (L213-249):** attach effect now **drops the one-shot `initializedRef` gate** (kept as a marker only), attaches the foreground listener **async** via `onForegroundMessage(...).then(unsub => ...)` with a `cancelled` teardown guard so a reload re-attaches **without double-subscribing**. Logout reset (L276-282) unchanged.
3. **`frontend/src/__tests__/config/firebase.whenready.test.js`** — NEW unit test.

### Verification done (by me)
- Unit `firebase.whenready.test.js` **2/2 PASS** (whenMessagingReady settles; onForegroundMessage async returns unsub).
- Webpack **Compiled successfully**, 0 new warnings. Login page renders (NotificationProvider mounts, no crash).
- **Caller-safety (grep):** `onForegroundMessage` sole app caller = `NotificationContext:223` (now `.then`); `requestFCMToken` sole caller = `LoginPage:56` (already `await`). Since login happens after messaging is ready, `await whenMessagingReady` resolves immediately → **login→ring path code-unchanged (V6)**.

### NOT verified — needs owner device (BLOCKING for sign-off)
- **V5** (granted notification permission → reload `/dashboard` → push a test order → **buzzer rings**) and **V7** (exactly one "Foreground message" log per push). Requires a session where **browser Notification permission is granted** + a real inbound order on live preprod. Could not be done from the agent sandbox (can't grant browser push permission / trigger a live FCM push safely).
- **Important:** Phase 1 alone only re-attaches the listener. The watched device **still won't receive a push until BUG-749 (Phase 2) registers its token** with the backend. So an isolated Phase-1-only reload test may still appear silent — that is expected until Phase 2 ships.

### Registry / tracker updates (committed)
- `registry.json`: CR-562 → `GATE_5A_IMPLEMENTED`, current_gate 4. BUG-747/749/750 → `GATE_1_INTAKE`.
- `CR_REGISTRY.md`, `BUG_TRACKER.md`, `FILE_OWNERSHIP.md` all updated.

---

## Planning artifacts already written (committed)
- **Combined Gate-2 IA:** `memory/impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` (commit 50e882ad) — covers all 4 items, re-anchored to `main`, with the 5-phase ladder, §8 owner decisions, §9 verification matrix.
- **Gate-3 plan (Phase 1):** `memory/plans/CR-562_PHASE1_IMPLEMENTATION_PLAN.md` (commit 33f87dd9).
- **Intake docs (commit b5cb13a1):** `memory/change_requests/CR-562_…`, `BUG-747_…`, `BUG-749_…`, `BUG-750_…`.

## Reference docs ported from `notification-fix` into `main` this session (for next agent)
- **`memory/backend_briefs/BACKEND_REPLY_BUG-749_2026-11-24.md`** — VERBATIM backend reply (endpoint SHIPPED; see summary below).
- `memory/backend_briefs/BACKEND_BRIEF_BUG-749_2026-11-24.md` — the FE→BE ask for BUG-749.
- `memory/backend_briefs/BACKEND_BRIEF_CR-562_2026-11-23.md` — CR-562 backend brief.
- `memory/investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md` — Round-2 RCA (prod-log correlation: watched device `has_firebase_token:false`).
- `memory/investigations/INV-CR562-FCMRACE-20261123.md` — CR-562 race investigation.

### Backend reply summary — BUG-749 endpoint (LOCKED, live on preprod)
- `POST /api/v1/vendoremployee/device-token` · employee bearer `AUTH_TOKEN` · body `{ "fcm_token": "<token>" }` → `200 { status:"ok", fcm_token:"<stored>" }`; `403` on missing/empty.
- Writes `vendor_employees.firebase_token` (same column as login). Single token/employee, last-write-wins. **Idempotent — POST on every reload, NO client dedupe, no rate limit.** Logout (`POST /api/v2/vendoremployee/employee-logout`) clears the column.
- FE pattern: on every authenticated boot/reload (incl. after login-as-restaurant), if permission granted + token present → POST. If denied/default/no token → don't call. Prefer this POST over profile `?fcm_token=` for boot register (profile field kept for diagnostics).

---

## NEXT AGENT — pick up here

**Recommended order:** Phase 2 (makes the device actually ring) → Phase 5 (independent, low-risk, immediate relief) → Phase 3 → Phase 4.

### Phase 2 — BUG-749 (PRIMARY, P0) — do first
- **Role:** PLANNING Gate 3 → then owner Gate-4 GO → IMPLEMENTATION.
- **Build (per IA §4 edits 3-5 + backend reply):** NEW `api/services/deviceTokenService.js` (`registerDeviceToken(fcmToken)` → POST `DEVICE_TOKEN`); `api/constants.js` `+ DEVICE_TOKEN:'/api/v1/vendoremployee/device-token'`; NEW auth-gated boot effect in `NotificationContext.jsx` "process like login": permission granted → `requestFCMToken()` → `registerDeviceToken()` → then attach (depends on CR-562 Phase 1, already in). No client dedupe.
- **Open decisions:** OD-REG-01 (POST sole register — rec), OD-REG-02 (bring-up home = NotificationContext effect — rec), OD-749-01 (confirm P0).

### Phase 5 — BUG-750 (independent, can ship anytime)
- `OrderEntry.jsx`: on **successful Update Order**, call `soundManager.stop()` **only if** the order has any `food_status=7` / `isNotConfirmed` item (owner-refined scope). Stop-only import (ScanOrderPopOut precedent L56/L275). No `firebase.js` lock involved. OD-750-02 = trigger on any fos=7 cart item at update (rec).

### Phase 3 — BUG-747 (depends on Phase 1)
- `soundManager.js` add `unlock()`/`getState()`/`setBlockedHandler`; `NotificationContext` ungated unlock effect (gesture + `visibilitychange`) + banner; NEW `SoundUnlockBanner.jsx`; `Sidebar.jsx` tri-state Ringer On / Silent / **Tap to enable**.

### Phase 4 — BUG-749 default/denied one-tap (depends on 2+3)
- Extend `SoundUnlockBanner` (OD-DEFAULT-01 rec) so `Notification.permission==='default'` → one-tap prompt → `requestFCMToken` → `registerDeviceToken`.

### Outstanding owner decisions (none block Phase 2/5 planning)
- CR-562 OD-562-02 acceptance (login→ring unchanged) — code-satisfied, needs browser V6 sign-off.
- OD-AUDIT-02 (firebase.js lock) — **GO already granted** 2026-11-24 for the `whenMessagingReady` edit; any further firebase.js edit needs a fresh GO.

### Test credentials (`memory/test_credentials.md`)
- The Goan Kitchen (rid 69): `pms@macha.com` / `Qplazm@10`. **LIVE preprod data — read-only smoke unless owner-coordinated.** Needed for all browser/E2E phases (grant notification permission to prove register→ring).

---

## Git / push state
- Branch `main`, **4 commits ahead of origin/main** (50e882ad IA · b5cb13a1 intake · 33f87dd9 plan · 9e2c37b4 Phase-1 code) **+ this handover + ported reference docs** (to be committed).
- **Push pending:** owner to supply a GitHub PAT via the secrets panel; agent will push `HEAD:main`.
- `.emergent/cron/webhook-crons` shows as modified (platform artifact) — leave unstaged, not part of this work.
