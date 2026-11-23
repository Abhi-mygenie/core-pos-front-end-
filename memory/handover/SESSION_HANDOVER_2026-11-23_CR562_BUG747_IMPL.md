# SESSION HANDOVER — 2026-11-23 — CR-562 (re-open) + BUG-747 IMPLEMENTED (Gate 4 GO)

**Branch:** notification-fix · **Repo:** github.com/Abhi-mygenie/core-pos-front-end-
**Client:** The Goan Kitchen (rid 69) · **Sprint:** nov_cr_batch · **Role this session:** IMPLEMENTATION

## What shipped (Gate 4 GO given by owner)
The Firebase **messaging-init race** (primary cause of "no buzzer after reload") + **BUG-747 autoplay
re-unlock**, planned and shipped together (OD-748-04). CR-562 was **re-opened** (OD-748-01) to carry the race fix.

### Code changes (3 files + 1 new component + 2 tests)
- `src/config/firebase.js` — `// CR-562`: added `whenMessagingReady` promise that ALWAYS settles (resolved in the
  `isSupported().then(...).finally(...)`, and on app-init failure) → resolves to `messaging` or `null`.
  `requestFCMToken` and `onForegroundMessage` now `await whenMessagingReady` before touching `messaging`.
  `onForegroundMessage` is now **async** (returns `Promise<unsubscribe>`). BUG-560 unsupported-browser safety kept.
- `src/contexts/NotificationContext.jsx` — `// CR-562`: the one-shot auth-gated effect now attaches the (async)
  foreground listener once messaging is ready, with a `cancelled` teardown guard → **fixes the reload race, ring
  restored**; CR-562 token refresh (LoadingPage:374) is no longer a no-op. `// BUG-747`: NEW ungated effect —
  silent `soundManager.unlock()` on first gesture (OD-747-01), `visibilitychange` re-assert (OD-747-02),
  `soundManager.setBlockedHandler` → `audioUnlocked`/`audioBlockedAt` state + `unlockAudioNow`; renders
  `<SoundUnlockBanner/>` inside the provider (App.js untouched, OD-747-03 = NotificationContext).
- `src/utils/soundManager.js` — `// BUG-747`: `this.onBlocked` + `setBlockedHandler(fn)`; `play().catch` invokes it.
- NEW `src/components/notifications/SoundUnlockBanner.jsx` — `// BUG-747`: tap-to-enable banner,
  `data-testid=sound-unlock-banner`.
- NEW tests: `src/__tests__/config/firebase.cr562race.test.js`, `src/__tests__/utils/soundManager.bug747.test.js`.

### Verification
- Automated: **4/4** unit tests pass. Webpack **compiled successfully, 0 new warnings**, HTTP 200.
- Fresh-load screenshot: login renders; `SoundUnlockBanner` correctly absent.
- **NOT yet verified (needs QA):** core reload-ring (T1), login-ring no-regression (T2), gesture unlock (T3),
  visibility re-assert (T4) — all require an authenticated preprod session + a real inbound order/FCM push.

### Registry / bookkeeping (EXIT GATE 5/5 PASS)
- registry.json: CR-562 → IMPLEMENTED, BUG-747 → IMPLEMENTED (sprint nov_cr_batch). JSON validated.
- CR_REGISTRY.md (BUG-747 + CR-562 rows), BUG_TRACKER.md (top CURRENT entry), FILE_OWNERSHIP.md (top block) updated.
- test_credentials.md updated with pms@macha.com / Qplazm@10.

## Known notes / risks
- Circular import NotificationContext ⇄ SoundUnlockBanner — safe (refs inside function bodies); confirmed by clean
  compile + HTTP 200.
- Secret env keys (FIREBASE_API_KEY, VAPID_KEY, CRM_API_KEYS, GOOGLE_MAPS_KEY) were entered this session; FCM needs
  a valid VAPID + API key to actually receive pushes in QA.

## Next
→ **QA role** per `handover/QA_HANDOVER_2026-11-23_CR562_BUG747.md`. QA runs on LIVE preprod data — read-only
smoke; coordinate with owner for a real test order to validate T1/T2. Plan:
`plans/CR-562-FU_BUG-747_IMPLEMENTATION_PLAN.md`.
