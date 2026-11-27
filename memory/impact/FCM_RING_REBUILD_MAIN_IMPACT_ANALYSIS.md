# FCM Reload-Ring — Combined Impact Analysis (Gate 2) — MAIN clean-build

**Document:** impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md
**Stage:** Impact Analysis (Gate 2) — PLANNING role (NO code, NO Implementation Plan)
**Created:** 2026-11-24
**Branch target:** `main` (clean build in small phased slices — owner directive 2026-11-24)
**Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69) · **Assignee:** FE Abhishek
**Covers (one symptom family — "buzzer rings/stops when it should"):**
- **CR-562** — messaging-ready race fix + async foreground-listener re-attach on reload.
- **BUG-749** — device FCM token never registered with backend after reload (PRIMARY break).
- **BUG-747** — autoplay not re-unlocked after reload (ring blocked even when a push arrives).
- **BUG-750 (proposed)** — ringer does not stop on Update Order (parity with Accept/Reject/cancel/Mute).

**Design source (proven, do NOT copy verbatim):** the same fixes already live on branch `notification-fix`
(`impact/BUG-748_FCM_RACE_IMPACT_ANALYSIS.md`, `impact/BUG-747_IMPACT_ANALYSIS.md`,
`impact/BUG-749_IMPACT_ANALYSIS.md`, `plans/CR-562-FU_BUG-747_IMPLEMENTATION_PLAN.md`,
`investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md`). This IA re-anchors all of it to **main** line numbers
and slices it into independently shippable parts.

---

## 0. Header — Code Reality + Conflict Pre-Check (main @ HEAD dbaf93f2)

### Code Reality: **NONE** on main for all four items (verified by grep + file read, 2026-11-24)
| Area | main state (proof) |
|---|---|
| messaging-ready promise | `config/firebase.js` has async init `isSupported().then(()=>messaging=getMessaging(app))` (L30-41); `messaging` is `null` until it resolves. **No `whenMessagingReady`.** `requestFCMToken` no-ops on `!messaging` (L48-51); `onForegroundMessage` is **sync** and no-ops on `!messaging` (L122-124). |
| listener re-attach | `contexts/NotificationContext.jsx` one-shot auth effect (L213-246) guarded by `initializedRef` (L214-215) attaches `onForegroundMessage` once; on reload `messaging===null` at that instant → subscribes to nothing, never recovers. |
| reload token refresh/register | `pages/LoadingPage.jsx` `loadProfile` calls `profileService.getProfile()` **with no fcm token** (L365). **No `requestFCMToken` call anywhere in LoadingPage** (grep=0). Token reaches backend **only** via login (`LoginPage.jsx:56` → `login({...fcmToken})`). **No `POST /device-token`; no `DEVICE_TOKEN` constant.** |
| autoplay unlock | `utils/soundManager.js` has `play/stop/setEnabled/mute` only. **No `unlock()`, `isUnlocked`, `getState()`, `setBlockedHandler`/`onBlocked`.** No `SoundUnlockBanner`. Sidebar ringer is binary Silent/On (`Sidebar.jsx:816-834`, `setSoundEnabled(!soundEnabled)`) — **no "Tap to enable"** state. |
| ringer-stop on Update | `OrderEntry.jsx` does **not** import `soundManager` (grep=0). Update path ends at `await engagePromise` → log → redirect (L1385-1388, L1474-1475) with no `stop()`. |

### Conflict Pre-Check
- **Registry:** CR-562 / BUG-747 / BUG-748 / BUG-749 are **NOT in main `registry.json`** → must be registered (INTAKE) before/with Gate 3. BUG-750 is new (propose at intake). CR-552/CR-559 already IMPLEMENTED on main (CR-559 = `scanOrderAutoPrint` gate — a dependency for KOT gating, present).
- **FILE_OWNERSHIP last modifiers (main), no OPEN item on any target file:**
  - `config/firebase.js` → **BUG-560** (CLOSED). ⚠ **OD-AUDIT-02 LOCK (OPEN_GAPS L508): "No edit to `firebase.js` without owner Gate 4 GO."** Hard precondition for Phase 1.
  - `contexts/NotificationContext.jsx` → BUG-661 F5 / CR-440 (done). Multiple intra-plan edits here (Phases 1-4) → sequence below.
  - `utils/soundManager.js` → BUG-453 (done).
  - `components/layout/Sidebar.jsx` → CR-415/435/555/568 (done).
  - `pages/LoadingPage.jsx` → BUG-599 (done).
  - `api/constants.js` → additive key only (dozens of precedents).
  - `components/order-entry/OrderEntry.jsx` → **hotspot** (CR-411/409/482, BUG-746/662/538/567, all IMPLEMENTED) — B2 edit site (L1385-1388) is line-disjoint from those.
- **`firebase-messaging-sw.js`:** present + identical on main/nf → **WILL NOT touch**.
- **No open FCM gap** other than the OD-AUDIT-02 lock (OG-AUDIT-F4 already CLOSED via BUG-560).

---

## 1. Problem (operator-reported, CONFIRMED on live preprod + prod logs)

After a **browser reload** (no relogin), an incoming order **does not ring the buzzer**, although the order still
appears on the dashboard (socket path is independent). Relogin restores the ring. Secondary: on the edited-web-order
path the long buzzer keeps ringing after the operator presses **Update Order** (no stop), unlike Accept/Reject/cancel.

---

## 2. Root Cause — three coupled FCM breaks + one buzzer-stop gap

**RING-after-reload fails because ALL THREE preconditions are absent on main:**

- **BREAK-1 (PRIMARY — registration → BUG-749):** the watched device/employee has **no FCM token on the backend**
  (prod logs order 1579106/rid69: 5 of 6 employees incl. watched `pms@macha` device `has_firebase_token:false`).
  On main the token is sent to the backend **only at login**; reload never re-sends it → backend can never push to
  that device.
- **BREAK-2 (listener attach → CR-562):** even with a token, the foreground `onMessage` listener attaches inside a
  one-shot effect while `messaging===null` on reload → subscribes to nothing and never recovers.
- **BREAK-3 (autoplay → BUG-747):** even if a push arrives, `audio.play()` after a reload with no user gesture is
  blocked by the browser autoplay policy and nothing re-unlocks it → silent.
- **GAP-4 (ringer-stop → BUG-750):** `OrderEntry` Update path never calls `soundManager.stop()`.

Classification: **FE_BUG** (client FCM lifecycle) for 1-3; **FE_BUG** (missing stop) for 4. Backend endpoint for
BUG-749 is already SHIPPED on preprod (`POST /api/v1/vendoremployee/device-token`, bearer, `{fcm_token}` → 200
`{status, fcm_token}`; writes `vendor_employees.firebase_token`; idempotent, last-write-wins; logout clears it).

---

## 3. Data-Flow Trace (break points → fix anchors, main line numbers)

```
RING PATH (fails on reload):
  FCM push → firebase onMessage → NotificationContext cb (L221-224) → processNotificationRef(payload)
           → processNotification (L93) → soundManager.play(resolvedSound) (L182)  ← the ring

ATTACH PATH (BREAK-2): reload → AuthContext restores isAuthenticated (sync from storage)
  → NotificationContext effect L213: initializedRef guard locks one-shot (L214-215)
  → onForegroundMessage(cb) at L221 runs while firebase.js messaging===null → returns ()=>{} (no sub)
  → messaging assigned ~later (firebase.js L33) but effect never re-runs → NO listener.   FIX: Phase 1.

REGISTER PATH (BREAK-1): reload → LoadingPage.loadProfile L365 getProfile() (no token) → backend token NOT refreshed.
  Login is the only sender (LoginPage L56). On reload nothing POSTs the device token.      FIX: Phase 2.

AUTOPLAY (BREAK-3): soundManager.play → audio.play().catch 'blocked' (soundManager L81-84); nothing re-unlocks.  FIX: Phase 3.

DEFAULT-PERMISSION HOLE: register/bring-up only meaningful when Notification.permission==='granted';
  'default' devices never prompt→register→subscribe.                                        FIX: Phase 4.

UPDATE-ORDER RINGER (GAP-4): OrderEntry Update branch L1385-1388 → redirect; no soundManager.stop().  FIX: Phase 5.
```

---

## 4. Affected Files, Lines, Risks (scope for sizing — NOT a plan)

| # | File | Change (direction) | Phase | Risk |
|---|------|--------------------|:---:|---|
| 1 | `config/firebase.js` | add always-settling `whenMessagingReady` promise in the `isSupported().then/.catch/.finally`; `requestFCMToken` + `onForegroundMessage` await it; `onForegroundMessage` becomes **async** (returns `Promise<unsub>`) | 1 | **HIGH** — provider init; **OD-AUDIT-02 lock → owner Gate 4 GO required**; preserve BUG-560 unsupported-browser safety |
| 2 | `contexts/NotificationContext.jsx` | async-safe foreground attach on reload (await readiness; `cancelled` teardown guard); drop/relax `initializedRef` one-shot so reload re-attaches; keep logout reset L273-279 | 1 | **HIGH** — notification core; multi-phase edits here |
| 3 | `api/services/deviceTokenService.js` **(NEW)** | `registerDeviceToken(fcmToken)` → `POST DEVICE_TOKEN {fcm_token}` | 2 | LOW (new, additive) |
| 4 | `api/constants.js` | `+ DEVICE_TOKEN: '/api/v1/vendoremployee/device-token'` | 2 | LOW |
| 5 | `contexts/NotificationContext.jsx` | NEW auth-gated boot effect "process like login": granted → `requestFCMToken()` → on resolve `registerDeviceToken()` → then attach listener (order: token → register → onMessage); no client dedupe | 2 | **HIGH** — same file as #2; covers login/login-as-restaurant/reload via single hook |
| 6 | `utils/soundManager.js` | add `unlock()`, `getState().isUnlocked`, `setBlockedHandler(fn)`; call handler in `play().catch` | 3 | MEDIUM — playback core (BUG-453 owner) |
| 7 | `contexts/NotificationContext.jsx` | NEW **ungated** unlock effect (gesture + `visibilitychange`) + `audioUnlocked`/`audioBlockedAt`/`unlockAudioNow` in context value; render banner in provider | 3 | MEDIUM — additive, ungated like the BUG-661 SW effect |
| 8 | `components/notifications/SoundUnlockBanner.jsx` **(NEW)** | fixed banner shown only when a ring was blocked and audio still locked | 3 | LOW |
| 9 | `components/layout/Sidebar.jsx` | ringer tri-state: Ringer On / Silent Mode / **Tap to enable** (red pulse); click = unlock when locked, else toggle Silent↔On | 3 | MEDIUM — Sidebar hotspot; visual + state |
| 10 | `SoundUnlockBanner.jsx` *(extend)* **or** `EnableAlertsBanner.jsx` **(NEW)** | one-tap enable for `Notification.permission==='default'` → prompt → `requestFCMToken` → `registerDeviceToken` | 4 | MEDIUM — closes the default-permission hole (OD-749-08) |
| 11 | `components/order-entry/OrderEntry.jsx` | import `soundManager` (stop-only, ScanOrderPopOut precedent); call `soundManager.stop()` after successful Update (after L1386 `if(apiFailed)return`) | 5 | MEDIUM — OrderEntry hotspot; stop-only |
| 12 | `**/__tests__/*` **(NEW)** | unit: `whenMessagingReady` settles; `requestFCMToken`/`onForegroundMessage` await; `deviceTokenService` POST shape; blocked-handler fires | 1-5 | LOW |

**Scope lock (final at Gate 3): WILL NOT touch** → `firebase-messaging-sw.js`, `profileService.js`/`profileTransform.js`,
`authService.js`, `api/axios.js` (bearer interceptor already attaches `AUTH_TOKEN`), any socket/order/payment/tax/
print/transform file (except the single stop-only line in OrderEntry), `App.js`, `DashboardPage.jsx`,
`ScanOrderPopOut.jsx`, `orderTransform.js`.

---

## 5. Downstream Consumers (signature impact)

- `requestFCMToken` — callers `LoginPage.jsx:56` (await, null-safe). Awaiting `whenMessagingReady` internally is
  signature-compatible. Phases 2/4 ADD callers. **No existing caller edit needed.**
- `onForegroundMessage` — **sole caller** `NotificationContext.jsx:221`. Becomes async (`Promise<unsub>`) → **that
  caller MUST be updated** (Phase 1, edit #2). This is the only true breaking consumer (grep-confirmed single call site).
- `getProfile` — unchanged (not touched) → `StationMappingTab` / `RestaurantSettingsPage` unaffected.
- Axios bearer interceptor auto-attaches `Bearer AUTH_TOKEN` → the new POST authenticates with no extra wiring; `401`
  already triggers logout. Logout clears the backend token column → next boot re-registers.
- `setSoundEnabled` (Sidebar) — Phase 3 keeps it; adds a third visual state, no new public API.

---

## 6. Risk Classification

- Phases 1-4: **HIGH** (push-notification lifecycle + `firebase.js` provider init + new API contract + notification
  hotspot). Not financial/tax/settlement → not CRITICAL. Not downgradable without owner rationale.
- Phase 5: **MEDIUM** (OrderEntry hotspot, but a single stop-only call; no payload/state/money change).
- Fast-Lane / planning-skip: **NOT eligible** for any phase (multi-file, hotspots, >10 lines, provider init, new endpoint).

---

## 7. Phased Execution Ladder (owner directive: "smaller parts, clean build")

Each phase is an independently buildable, testable, shippable slice. Dependency order is strict for 1→2; 3 depends on
1; 4 depends on 2+3; 5 is fully independent (can ship first or last).

| Phase | Slice | Items | Dep | Ships value |
|:---:|---|---|---|---|
| **1** | Messaging-ready race + async re-attach | CR-562 | — (needs OD-AUDIT-02 Gate 4 GO) | Listener actually attaches after reload |
| **2** | Device-token register on every authenticated boot | BUG-749 (core, granted path) | Phase 1 | Watched device gets a backend token → can be pushed |
| **3** | Autoplay re-unlock + Sidebar tri-state + banner | BUG-747 | Phase 1 | Arriving push actually rings (gesture/visibility unlock) |
| **4** | Default/denied one-tap "Enable alerts" register | BUG-749 (A1 hole) | Phase 2+3 | Not-yet-granted devices can enable + register in one tap |
| **5** | Ringer stops on Update Order | BUG-750 | none | Long buzzer cut off on Update (parity) |

**Recommended ship cadence:** Phase 5 first (lowest risk, immediate relief, no firebase lock), then 1 → 2 → 3 → 4.
Each phase = its own Gate 3 plan + Gate 4 GO + QA (keeps builds clean and reviewable).

**Merge-guard note (A3, N/A on main):** the stale CR-552 FE `confirmOrder`/`updatePrintStatus` block does **not**
exist on main (grep=0) — nothing to remove. Flag only: if `notification-fix` is ever merged into `main`, that block
must be dropped (backend `updateOrderCommon` now owns promote + KOT).

---

## 8. Owner Decisions (resolve before Gate 3 plans)

- **OD-GO-FIREBASE (BLOCKER, Phase 1):** OD-AUDIT-02 locks `firebase.js`. Owner **Gate 4 GO** to edit it for the
  `whenMessagingReady` promise. *(No alternative — the race cannot be fixed without it.)*
- **OD-REG-01 (Phase 2):** boot-register channel = **POST `/device-token` as the sole register** *(recommended —
  main's profile GET doesn't send a token anyway)*; profile `?fcm_token=` NOT added.
- **OD-REG-02 (Phase 2):** bring-up home = **`NotificationContext` auth-gated effect** *(recommended — persists;
  already hosts listener/unlock/banner)* vs `LoadingPage.loadProfile` (unmounts after boot).
- **OD-UNLOCK-01 (Phase 3):** silent auto-unlock on first gesture **and** "Tap to enable" banner *(recommended: both)*;
  re-assert on `visibilitychange` *(recommended: yes)*.
- **OD-DEFAULT-01 (Phase 4):** extend `SoundUnlockBanner` to also handle `permission==='default'` *(recommended —
  fewer components)* vs new `EnableAlertsBanner`.
- **OD-RINGER-01 (Phase 5):** confirm BUG-750 in scope (owner flagged it, then said "park for FCM"; clean-build →
  recommend include as the independent Phase 5).
- **Naming constraint (Phase 1):** promise named `whenMessagingReady` (distinct from any diagnostics field); **hard
  acceptance: the existing login→ring path must behave byte-for-byte as today.**

---

## 9. Verification Matrix (seeds QA — per phase)

| Ph | Check | How | Auto? |
|:--:|---|---|:--:|
| 1 | `whenMessagingReady` always settles (supported/unsupported/app-null) | unit mock `isSupported` | YES |
| 1 | `requestFCMToken`/`onForegroundMessage` await readiness | unit: call pre-init → resolves after ready | YES |
| 1 | async-safe attach on reload | browser: granted, reload, push test order → **rings**; console "listener attached" after "Messaging initialized" | NO |
| 1 | **no regression** login→ring | browser: fresh login → order → rings as today | NO |
| 2 | `registerDeviceToken` POST shape | unit: `POST DEVICE_TOKEN {fcm_token}` | YES |
| 2 | boot register on reload | browser+backend logs: reload → `has_firebase_token:true` for logged-in employee | NO |
| 3 | blocked-handler fires; gesture/visibility unlock | unit (handler) + browser (reload→blocked→tap→next order rings) | MIX |
| 3 | Sidebar tri-state | browser: locked shows "Tap to enable"; tap unlocks; Silent↔On toggles | NO |
| 4 | default-permission one-tap | browser: `permission=default` → banner → tap → prompt → register → ring | NO |
| 5 | ringer stops on Update | browser: web-edit order ringing → Update Order → buzzer stops | NO |

**Verification blocker:** `memory/test_credentials.md` is a stub (no Goan Kitchen account) → browser/E2E phases need a
preprod test account + a device where notification permission can be granted. Unit phases run without it.

---

## 10. Recommendation / Exit

- Root cause: **HIGH confidence** (prod logs + code trace, re-anchored to main). Classification **FE_FIX**; backend
  endpoint already shipped (no backend ask).
- **NOT planning-skip eligible** → each phase needs a Gate 3 Implementation Plan + Gate 4 GO + QA.
- **Next:** (1) owner answers §8 decisions (esp. OD-GO-FIREBASE); (2) register CR-562/BUG-747/BUG-749/BUG-750 in main
  `registry.json` (INTAKE); (3) PLANNING writes **Gate 3 plan for the first chosen phase** (recommend Phase 5 or
  Phase 1). No app code is written until Gate 4 GO on that phase.

## 11. Retroactive Candidates
NONE on main (all code reality NONE; `notification-fix` holds a separate implementation, not merged).

---
**Gate 2 (Impact Analysis) only — no Implementation Plan, no app code changed (PLANNING role).**
