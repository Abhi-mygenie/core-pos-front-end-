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

---

## 8. BACKEND LOG CORRELATION (2026-11-24) — the real break is TOKEN REGISTRATION, not just listening

Owner supplied production logs for order 1579106 / restaurant 69. Decisive facts:
- `RECIPIENTS_RESOLVED`: 6 employees; **only employee 5843 "poki owner" has `has_firebase_token:true`**. The other 5
  (5833 KDS, 5835 Manager, 5837 Owner, 5840 **macha owner**, 5844 printer) all have `has_firebase_token:false`.
- `FIREBASE_DISPATCH_RESULT` / `NOTIFICATION_SENT` / `Firebase notification sent`: backend dispatches ONLY to
  5843's token; FCM returns `http_code:200, send_status:fcm_accepted`, but **`delivery_confirmed:false`**.

**=> The backend works. It sends the buzzer, but only to the one employee that has a registered token.** The device
the owner is watching (logged in as `pms@macha.com`, almost certainly NOT 5843 — likely 5840 "macha owner", which
shows `has_firebase_token:false`) has **no FCM token on the backend at all**, so it can never be notified.
`fcm_accepted` ≠ delivered; `delivery_confirmed:false` + a likely stale 5843 token means even that device may not ring.

### Where it breaks (frontend), from code:
Token reaches the backend through exactly two paths:
1. **Login payload** — `authService.login({email,password,fcmToken})`; `fcmToken` set only if `requestFCMToken()`
   returned a token (**permission granted at login**). Denied/default → `fcmToken=null` → backend stores null →
   `has_firebase_token:false`. (QA earlier saw `[Login] FCM result: {error: denied, token: null}`.)
2. **Reload profile GET** — `profileService.getProfile(fcmToken)` sends `?fcm_token=` **only if** `fcmToken` is truthy,
   which needs BOTH `Notification.permission === 'granted'` (LoadingPage.jsx:371) AND `requestFCMToken()` winning a
   **3-second `Promise.race`** (LoadingPage.jsx:373-376). On a cold reload, SW register + `getToken()` routinely take
   >3s → race returns `null` → `getProfile(null)` sends nothing (backend no-op) → **backend token never refreshed**.
   `requestFCMToken` finishes later and writes the token to `localStorage`, but **nothing ever sends that late token
   to the backend.**

### Precise root cause (two coupled breaks, same origin):
- **BREAK-1 (registration, PRIMARY):** the watching device/employee has no backend FCM token
  (`has_firebase_token:false`) — registration only happens on a permission-granted login, or a reload that is both
  permission-granted and beats the 3s race. Neither held → no push to that device.
- **BREAK-2 (listening/freshness, SECONDARY = our M2):** 5843's token is likely stale (reload never refreshed it) and
  foreground `onMessage` needs an in-session `getToken` — so even the targeted device may not ring.

### Fix direction (frontend-only; reuses the EXISTING backend GET upsert — likely NO firebase.js edit):
1. **Decouple token registration from the 3s boot race.** Keep the boot barrier time-boxed, but when
   `requestFCMToken()` resolves (even after boot), if the token is present and differs from what was last sent, POST
   it to the backend (reuse `profileService.getProfile(token)` upsert or a dedicated refresh call). No token may be
   silently discarded by the race.
2. **"Process like login" on every authenticated boot** (owner's instinct): run the full bring-up and register the
   current device token for the current employee; if permission is `default`, drive the BUG-747 "enable alerts"
   banner (one tap → prompt → register) instead of silently skipping.
3. This also establishes the in-session `getToken` subscription → fixes foreground `onMessage` (BREAK-2).

Socket-ring fallback is OUT per owner. Keep FCM as the ring source; make registration reliable.

**Confidence: HIGH** — backend logs + frontend code agree. BREAK-1 (registration) is the dominant casualty source.
