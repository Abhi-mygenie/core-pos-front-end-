# INV-CR562-FCMRACE-20261123 — CR-562 boot token refresh is a no-op on reload (Firebase messaging init race)

**Role:** INVESTIGATION (no code edited, per owner 2026-11-23). **Severity:** HIGH — blocks CR-562's intended effect.
**Reporter:** owner (2 dashboard screenshots, device clock ~12:43–12:44 AM, 24-11-2026).
**Artifacts:** 1e3e47fb-53f9-4c67-9efe-5bfcfff9c50d (console: messaging init), 748b05ce-7a60-4bff-b703-fb1c01da3d15 (console: socket-only order 1579106).

## Symptom
After a reload the console shows Firebase messaging (re)starting, but the device **still does not get a fresh FCM
token**, so the backend keeps a stale token and the reloaded order arrives on the **socket only** (no FCM push, no
ring) — i.e. CR-562 did not actually refresh the token.

## Console evidence (screenshot 1, in order)
- `[Firebase] App initialized` (`firebase.js:24`)
- `[SoundManager] Preloaded 14 sounds`
- `[Firebase] Messaging not initialized` (`firebase.js:51`) ← stack: `firebase.js:51 → LoadingPage.jsx:373 → LoadingPage.jsx:611 → LoadingPage.jsx:90` (logged **twice**)
- `[Firebase] Messaging initialized` (`firebase.js:36`)  ← fires **AFTER** the "not initialized" warnings
- `[LoadingPage] User Profile:` … (boot continues)

Screenshot 2: new order `1579106` arrives via `new_order_69`/`update-order` (socket) with no FCM `received` — the
same M2 symptom from INV-BUZZER / evidence/BUG-747.

## Root cause (CONFIRMED by code)
`config/firebase.js` initializes messaging **asynchronously** (BUG-560 guard, L29-43):
```
if (app) {
  isSupported().then((supported) => {
    if (supported) { messaging = getMessaging(app); console.log('[Firebase] Messaging initialized'); } // L34-36
    ...
  });
}
```
`messaging` stays **null** from module-load until that promise resolves.

`requestFCMToken()` bails immediately when messaging isn't ready (L49-53):
```
export const requestFCMToken = async () => {
  if (!messaging) { console.warn('[Firebase] Messaging not initialized'); return null; }  // L50-52 — DOES NOT WAIT
  ...
```

CR-562 boot call runs **too early** (`LoadingPage.jsx:374`, inside `loadProfile`):
```
const r = await Promise.race([ requestFCMToken(), setTimeout(()=>res(null),3000) ]);
currentFcmToken = r?.token || null;   // r === null here → currentFcmToken = null
```

**Sequence on hard reload into /dashboard:** module load → `App initialized` → `isSupported().then` scheduled (not
yet resolved) → `loadProfile` fires within ms → `requestFCMToken()` sees `messaging === null` → logs "Messaging not
initialized", returns `null` → profile GET sent **without** `?fcm_token=` → backend keeps stale token → no FCM push
→ no ring. `isSupported()` resolves a beat later ("Messaging initialized") — too late for this boot.

## Why login works but reload doesn't
On LoginPage the operator spends seconds typing credentials, so by the time `requestFCMToken()` runs at submit
(`LoginPage.jsx:56`) `isSupported()` has resolved and `messaging` is ready → token obtained & sent. The reload path
calls it immediately and loses the race.

## Impact on CR-562 (shipped GATE_5A)
CR-562 E1/E2 (service param + transform) and E3 (boot wiring) are correct, but E3's token fetch returns null on
reload because of this race → **CR-562 is functionally a no-op on reload until the race is fixed.** Not a backend
issue (contract is fine); not a permission issue (permission is 'granted' in the screenshots).

## Fix direction (NOT implemented — owner said don't edit)
Make token acquisition **await messaging readiness** before the `!messaging` bail, in `config/firebase.js` only:
- Option A: export a `messagingReady` promise (resolve inside the `isSupported().then`); `requestFCMToken()` does
  `await messagingReady` (bounded) before checking `messaging`.
- Option B: inside `requestFCMToken()`, if `!messaging`, `await isSupported()` then `getMessaging(app)` once, then
  proceed (lazily initialize on first use).
Either keeps BUG-560's unsupported-browser safety. Single-file change; no change to CR-562 FE wiring or backend.
Would become a tiny CR-562 follow-up (or re-open) — needs owner GO.

## Scope note
`LoadingPage.jsx:374` is the CR-562 call; `LoginPage.jsx:56` is the original (unaffected). No other boot caller.

---

## CORRECTION (owner 2026-11-23): PRIMARY root cause of "took a test order but it did not ring"

The token-refresh no-op above is **secondary**. The reason the order does not RING on reload is a separate
(but same-family) race on the **foreground FCM subscription**:

`contexts/NotificationContext.jsx` attaches the foreground listener in a **one-shot, auth-gated effect** (L230-262):
```
useEffect(() => {
  if (!isAuthenticated || initializedRef.current) return;   // L231
  initializedRef.current = true;                            // L232 — runs EXACTLY once, never re-runs
  soundManager.preload();
  foregroundUnsubRef.current = onForegroundMessage((payload) => { ... processNotification ... }); // L238
  ...
}, [isAuthenticated]);
```
`onForegroundMessage` in `config/firebase.js` (L125-128): `if (!messaging) return () => {};` — when messaging is
not ready it **subscribes to nothing** and returns a no-op unsubscribe.

**Sequence on hard reload:** module load (`messaging=null`, `isSupported().then` scheduled) → auth restored from
storage → `isAuthenticated` true on first render → NotificationContext init effect fires → `onForegroundMessage()`
called while `messaging===null` → **no subscription**, `initializedRef` locked true → `isSupported()` resolves a
beat later (`[Firebase] Messaging initialized`) but the effect **never re-runs**, so the listener is **never
attached**. The test order's FCM push (foreground, tab visible) is delivered with **no `onMessage` listener** →
`processNotification` never runs → **no `received` logged, `soundManager.play()` never called → NO RING.** The
order still appears because that is the socket path (OrderContext), which is independent.

This matches the screenshots exactly: order `1579106` present via socket, zero FCM `received`, no ring.

**Both failures share one cause:** app code (foreground subscribe AND token fetch) touches Firebase messaging
before its async init (`isSupported().then`) completes, and the auth-gated subscribe is one-shot so it never
recovers.

**Fix direction (NOT implemented — owner said don't edit), `config/firebase.js` + minimal NotificationContext:**
- Expose a `messagingReady` promise from `firebase.js` (resolve inside `isSupported().then`).
- `onForegroundMessage`/`requestFCMToken` `await messagingReady` before using `messaging`; and/or have
  NotificationContext attach the listener after `messagingReady` resolves (or re-run the effect when ready).
This fixes BOTH the missing ring (primary) and the token refresh (secondary) with BUG-560 safety intact.
Becomes a CR-562 follow-up / re-open (and is the true fix for the BUG-747 M2 "no FCM after reload" case).
