# FEATURE — FCM & Sound Diagnostics Panel (self-serve, no live order needed)

**ID:** FEAT-FCM-SOUND-DIAG-2026-11-22
**Built:** 2026-11-22 · verified by testing agent (frontend 100%, iteration_16) + main-agent live self-test (login pms@macha.com → Settings → Test Notifications).
**Purpose:** Let staff determine, WITHOUT placing a test order, whether a "no ring / no popup" incident is (a) FCM not working on this device, or (b) the FCM payload never arrived for that order at that time, or (c) it arrived but sound was blocked/off.

## Where
Settings → **Test Notifications** tile (`settings-tile-notification-test`). Component: `frontend/src/components/layout/NotificationTester.jsx` (`data-testid="fcm-sound-diagnostics"`).

## What it shows
1. **FCM Health** — notification permission, FCM token present (cached, masked preview), VAPID key configured, messaging supported, audio unlocked. Refresh button.
2. **Sound Test** — Enable Audio (autoplay unlock), Sound On/Muted toggle, per-sound play tiles with ✓/blocked result for every tone in `SOUND_FILES`.
3. **Simulate Notification** — runs the real `processNotification` pipeline (dedup → mute → sound → banner) and writes to the log.
4. **Event Log** — persistent (localStorage `mygenie_fcm_diag_log`, 200-entry ring buffer), survives reload. Filter by order id / event / sound / source. Copy JSON (with HTTP fallback), Clear.

## Event vocabulary (how to read the log)
- `received` — an FCM payload reached this device (source: foreground | sw | simulate | test). **Absence of `received` for an order = payload never arrived → FCM/backend delivery issue.**
- `played` / `sound_ok` — ring fired. `sound_blocked` — browser autoplay blocked it. `suppressed_sound_off` — device was on Mute. `suppressed_dedup` — duplicate within 2s. `suppressed_muted` — per-order mute (BUG-453).
- `banner_shown` / `banner_suppressed_kill_switch` — in-app banner outcome (CR-440 kill switch).

## Files (all additive; order/payment flows untouched)
- NEW `frontend/src/utils/fcmDiagLog.js` — persistent ring buffer + pub/sub.
- `frontend/src/config/firebase.js` — `getFCMDiagnostics()` + token caching to localStorage.
- `frontend/src/utils/soundManager.js` — `playTest()`, `unlock()`, `getState()`, `_record()`; `play()` now records outcome. Fully try/catch-guarded.
- `frontend/src/contexts/NotificationContext.jsx` — logs received/suppressed_*/played/banner_* with `__source`; foreground/sw/simulate tagged.
- `frontend/src/components/layout/NotificationTester.jsx` — rewritten into the 4-section panel.

## Deliberately NOT done (governance)
- No pop-out ("popup_opened") logging inside `ScanOrderPopOut.jsx` — its owner-locked header forbids localStorage writes / NotificationContext import ("silent layer"). Pop-out behaviour is covered by INV-POPOUT-SOUND-2026-11-22 (data-predicate + reload-timing, not an FCM issue). If pop-out logging is wanted later, do it in a contract-safe location (DashboardPage) under a new CR.

## Limitation
Notifications delivered while NO POS tab is open are handled only by the service worker and will not appear in the in-page log. (Noted in the panel UI.)

---

## BACKEND BRIEF — to make "payload not received" diagnosable end-to-end
The panel proves the CLIENT side. To correlate with the server side when `received` is missing:
1. **Emit an FCM data message for every new web order AND every web edit** (new unconfirmed item) to the restaurant's device tokens — not only a notification message. Include stable fields: `orderid` (canonical; the FE dedup/mute key reads `data.orderid`), `type` (e.g. `new_order` / `item_added` / `confirm_order`), `sound`, and a unique `message_id`.
2. **Log server-side send result per order**: timestamp, order id, target token(s), FCM `message_id`, and FCM response (success / `UNREGISTERED` / `InvalidRegistration` / quota). Expose a lookup (admin) so an order id → "was a push sent, to which tokens, did FCM accept it".
3. **Token freshness**: on login the FE sends `fcm_token`; ensure stale/rotated tokens are pruned server-side (FCM `UNREGISTERED` responses) so pushes aren't sent to dead tokens (a cause of silent "random" misses).
4. Confirm `REACT_APP_FIREBASE_VAPID_KEY` is the key matching this Firebase project's Web Push certificate (FE health shows VAPID=yes; mismatch would still break foreground tokens on real devices).

With client log (`received?`) + server send log (`sent? message_id? accepted?`) for the same order id, any future report resolves to exactly one of: not sent · sent-but-rejected-by-FCM · delivered-but-blocked/off · delivered-and-rang.
