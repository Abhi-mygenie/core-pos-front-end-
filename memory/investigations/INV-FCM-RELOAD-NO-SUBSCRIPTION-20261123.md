# INV — 2026-11-23 — Still no FCM / no ring after reload (M2 confirmed): subscription not re-established on reload

**Role:** INVESTIGATION (no code edited) · **Confidence:** HIGH (mechanism) / MEDIUM (which branch — needs 1 console check)
**Trigger:** After the CR-562 (messaging-ready) + BUG-747 fixes, owner reloaded /dashboard; a web order arrived and
the "New Web Order — Awaiting Confirmation" popup showed, but there was **no `[Firebase]`/`[Notification]` log and
no buzzer**. Console shows the order came in purely via SOCKET (`new_order_69`, `update-order 1579106`).

## 1. Summary
Root cause (M2): **foreground FCM delivery is never set up on reload.** Browser foreground pushes arrive via
Firebase `onMessage`, which only works if **`getToken()` ran during the current page session** (it registers
`firebase-messaging-sw.js` and establishes the push subscription on the messaging instance). In this app,
`getToken()` + `serviceWorker.register()` exist **only inside `requestFCMToken()`**. LOGIN always calls it; RELOAD
calls it **only when `Notification.permission === 'granted'`** (LoadingPage.jsx:371). So on reload the push pipe is
not (re)established → `onMessage` has nothing to receive → no FCM log, no ring. The order still appears because the
socket path is independent. Classification: **FE_BUG (FCM lifecycle)**. Confirms the handover's M2.

## 2. Code trace (evidence)
- `grep getToken|serviceWorker.register` → **only** `config/firebase.js` inside `requestFCMToken` (L95 SW register,
  L112 getToken). No other boot-time subscription setup anywhere.
- Callers of `requestFCMToken`:
  - `LoginPage.jsx:56` — **unconditional** on login (prompts if needed) → establishes the subscription → foreground
    rings work for the rest of that document's life.
  - `LoadingPage.jsx:374` (CR-562) — **gated**: `if (Notification.permission === 'granted') { requestFCMToken() }`
    (L371), inside a 3s `Promise.race`. If permission is not `granted` at reload → **skipped entirely** → no
    getToken → no subscription → no foreground push.
- `public/firebase-messaging-sw.js`: `onBackgroundMessage` (L29) + its `postMessage({type:'BACKGROUND_NOTIFICATION'})`
  forward (L50-57) fire **only when the app is backgrounded**. With the dashboard focused, the SW path is NOT used;
  the push must hit foreground `onMessage`. So the SW-forward fallback in NotificationContext (L244-251) cannot
  cover a foreground reload.
- Our shipped fixes are correct but insufficient alone: CR-562 (`whenMessagingReady`) + BUG-747 only guarantee the
  listener *attaches* and audio can unlock — they do **not** make the browser *receive* a push, because nothing
  re-runs getToken/SW on reload unless permission is already granted.

## 3. Why "process like login" (owner's instinct) is correct
Login's FCM bring-up = `requestFCMToken()` → `Notification.requestPermission()` → `serviceWorker.register()` →
wait active → `getToken(messaging,{vapidKey,serviceWorkerRegistration})`. That chain is what wires `onMessage`.
Reload must perform the SAME bring-up (not just the token-refresh GET) for the ring to work without relogin.

## 4. Hypotheses
| # | Hypothesis | Status | Note |
|---|-----------|--------|------|
| H1 | Reload doesn't re-establish the getToken/SW subscription → no foreground push | **CONFIRMED (code)** | Primary. getToken only in requestFCMToken; reload gates it on permission===granted |
| H2 | Backend holds a stale FCM token (not refreshed on reload) | Collapses into H1 | If requestFCMToken is skipped, no token refresh either |
| H3 | VAPID/API key invalid → getToken throws | Unlikely | Keys set 2026-11-23; login obtains a token with them. Confirm no getToken error in console |

## 5. One console check to pick the exact branch (owner, no code)
On reload of /dashboard, filter console for `[Firebase]`:
- If you DON'T see `[Firebase] Current notification permission:` / `[Firebase] FCM Token obtained` →
  **requestFCMToken is not running on reload** (permission gate / not invoked) → H1 confirmed.
- If you DO see them but still no ring → getToken ran; then check for a getToken error or a backend push-send gap.

## 6. Recommendation (for Planning/Gate — NOT implemented here)
- **Primary (reopen CR-562 / BUG-748 follow-up):** on every authenticated boot/reload, run the FULL FCM bring-up
  (SW register + getToken) — i.e. "process like login" — when `Notification.permission === 'granted'`, decoupled
  from the 3s token-refresh race; if permission is `default`, surface a one-tap "enable alerts" prompt (ties to
  BUG-747 banner). This is the real reload-ring fix.
- **Strongly consider reopening OD-747-04 → option B (socket-driven ring fallback):** the order ALREADY arrives
  reliably on the socket (proven by this screenshot). A dedup-guarded `soundManager.play()` on the `new_order`/
  `update-order` socket handler would make the ring robust regardless of FCM reload state. OD-747-04 was A
  (FCM-only); this evidence argues A is fragile on reload.

## 7. Retroactive candidates
NONE.
