# QA HANDOVER — 2026-11-23 — CR-562 (re-open) + BUG-747 (FCM reload race + autoplay re-unlock)

**Items:** CR-562 (messaging-ready race fix), BUG-747 (autoplay re-unlock) — shipped together.
**Plan:** `plans/CR-562-FU_BUG-747_IMPLEMENTATION_PLAN.md` · **Risk:** HIGH · **Sprint:** nov_cr_batch
**Branch:** notification-fix · **EXIT GATE:** 5/5 PASS.

## 1. Inherited from Plan (Verification Matrix results)
| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| A1 | config/firebase.js | `whenMessagingReady` always settles (supported/unsupported/app-null) | PASS ✅ (firebase.cr562race) |
| A2 | config/firebase.js | `requestFCMToken` awaits readiness (no premature null) | PASS ✅ (code + suite) |
| A3 | config/firebase.js | `onForegroundMessage` async, awaits readiness, returns unsub | PASS ✅ (firebase.cr562race) |
| B1 | NotificationContext.jsx | async-safe foreground attach on reload | ⏳ PENDING browser QA (needs preprod login + live order) |
| B1r | NotificationContext.jsx | **no regression** on login→ring | ⏳ PENDING browser QA |
| B2 | soundManager.js | `onBlocked` fires on blocked play; detach works | PASS ✅ (soundManager.bug747) |
| B3 | NotificationContext.jsx | gesture + visibilitychange unlock | ⏳ PENDING browser QA |
| B4 | SoundUnlockBanner.jsx | shows only when blocked+locked; `data-testid=sound-unlock-banner` | ⏳ PENDING browser QA (absent on fresh load — verified via screenshot) |

Automated: 4/4 tests pass. Webpack: compiled successfully, 0 new warnings. Fresh-load screenshot: login renders, banner correctly absent.

## 2. Additional test cases (browser — require authenticated preprod session)
| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Reload-ring (core) | Login → grant notification permission → **reload** dashboard → push a test order | Buzzer rings; console shows foreground FCM handler firing after `[Firebase] Messaging initialized` |
| T2 | Login-ring (regression) | Fresh login → push order (no reload) | Rings exactly as before |
| T3 | Gesture unlock | After reload before any click, if a ring is blocked → banner appears → click once | Banner clears; next order rings |
| T4 | Visibility re-assert | Background the tab, return to foreground | Audio re-unlocks silently (no banner needed) |
| T5 | Banner lifecycle | Observe banner | Hidden normally; appears only after a blocked ring; `data-testid=sound-unlock-banner` |

## 3. Regression tests
| # | What to verify | Why |
|---|----------------|-----|
| R1 | Login → dashboard loads, no console errors | new async listener + circular import (NotificationContext⇄SoundUnlockBanner) |
| R2 | Existing login→ring unchanged | OD-748-03 hard constraint |
| R3 | Unsupported-browser path still no-ops cleanly | BUG-560 safety preserved via `.finally` |
| R4 | No duplicate rings (dedup intact) | effect teardown/re-subscribe guard |

## 4. Registry Sync Confirmation
Registry synced: YES · Items: CR-562 (IMPLEMENTED), BUG-747 (IMPLEMENTED) · Sprint: nov_cr_batch · EXIT GATE: ALL 5 PASSED.

## 5. Credentials + Environment
Account: pms@macha.com / Qplazm@10 (The Goan Kitchen, rid 69) — see `memory/test_credentials.md`.
Frontend: preview serves against REAL preprod backend `https://preprod.mygenie.online/`. QA is on live data — **read-only smoke only; do NOT place/settle real orders.** Core T1/T2 need a real inbound order+FCM push (coordinate with owner).
