# CR-562 (re-opened) + BUG-747 — Combined Implementation Plan (Gate 3)

**Document:** plans/CR-562-FU_BUG-747_IMPLEMENTATION_PLAN.md
**Stage:** Implementation Plan (Gate 3) — PLANNING role (no code)
**Created:** 2026-11-23
**Sprint:** nov_cr_batch · **Client:** The Goan Kitchen (rid 69) · **FE Assignee:** Abhishek
**Risk:** HIGH (Firebase provider-init + notification lifecycle hotspot) · **Code Reality:** NONE (race fix); NONE (BUG-747)
**Gate 2 basis:** `impact/BUG-748_FCM_RACE_IMPACT_ANALYSIS.md` (race) + `impact/BUG-747_IMPACT_ANALYSIS.md` (autoplay)
**Why combined:** both edit `contexts/NotificationContext.jsx` for the *same post-reload failure*; OD-748-04 = plan together.

## Owner Decisions adopted (confirmed/recommended)
- **OD-748-01 = re-open CR-562** — race fix ships under CR-562 (not a new BUG id). This plan supersedes/extends
  `plans/CR-562_IMPLEMENTATION_PLAN.md` (E1–E3 token param already GATE_5A-implemented; untouched here).
- **OD-748-02 = GO** to edit `config/firebase.js` (OD-AUDIT-02 lock lifted at Gate 4 on owner approval of this plan).
- **OD-748-03 = YES** — readiness promise named **`whenMessagingReady`** (distinct from the `getFCMDiagnostics`
  `messagingReady` field). **Hard constraint: existing login→ring path must be byte-for-byte unaffected.**
- **OD-748-04 = together.**
- **OD-747-01 = both** (silent auto-unlock + "tap to enable" banner safety net).
- **OD-747-02 = yes** (re-assert unlock on `visibilitychange`).
- **OD-747-03 = NotificationContext** ungated effect is the listener home (no `AudioUnlockGate`/`App.js`).
- **OD-747-04 = A** (pre-decided) — FCM is the sole ring source; NO socket-ring fallback; `socketHandlers.js` out of scope.

## Scope lock
- **WILL change:** `src/config/firebase.js`, `src/contexts/NotificationContext.jsx`, `src/utils/soundManager.js`.
- **NEW:** `src/components/notifications/SoundUnlockBanner.jsx`; test files (§Verification Matrix).
- **WILL NOT touch:** `LoadingPage.jsx`, `LoginPage.jsx`, `firebase-messaging-sw.js`, `App.js`, any
  socket/order/payment/billing/tax/print/auth/permission/transform/service file, `DashboardPage.jsx`,
  `ScanOrderPopOut.jsx`. No API contract change (CR-562 backend already frozen & confirmed).

## Conflict Pre-Check
- `firebase.js` — last modifier BUG-560 (CLOSED); no OPEN item. `NotificationContext.jsx` — BUG-621/661/453/CR-440
  (all done); the only OPEN overlap is **BUG-747 itself**, now co-planned here. `soundManager.js` — BUG-453 (CLOSED).
  → parallel-safe with everything else; the two intra-plan edits to NotificationContext are line-disjoint (attach
  effect L230-263 vs a new ungated unlock effect + provider render).

## Entry Verification (anchors re-checked at HEAD — must still match before coding)
- `config/firebase.js:17-43` async init block; L49 `requestFCMToken = async () => { if(!messaging){warn;return null} ...}`;
  L125-128 `onForegroundMessage = (cb) => { if(!messaging) return ()=>{}; return onMessage(messaging,cb); }`;
  L141 diag field `messagingReady: !!messaging`.
- `contexts/NotificationContext.jsx:230-263` one-shot auth-gated effect; L258-261 cleanup; L289-296 logout reset
  (`initializedRef=false`); L266-287 existing ungated SW effect (pattern to mirror); L338-364 context value.
- `utils/soundManager.js:84-91` play() `.catch` records blocked; L118-124 `unlock()`; L126-128 `getState()`.
- Consumers of changed exports: `requestFCMToken` → `LoadingPage.jsx:374` (await, 3s race cap) + `LoginPage.jsx:56`
  (null-safe `if (fcmResult && typeof === 'object')`); `onForegroundMessage` → `NotificationContext.jsx:238` only.

---

## PART A — CR-562 messaging-ready race fix (`config/firebase.js`)

### E-A1 — add an always-settling `whenMessagingReady` promise  [REQUIRED]
In the init region (L17-43), add a module promise resolved from EVERY async-init exit (supported, unsupported,
isSupported failure, and app-init failure) so consumers never hang:
```js
let app = null;
let messaging = null;
let messagingSupported = null;

// CR-562: resolves once the async messaging init (BUG-560) settles — to the messaging
// instance when supported, else null. Consumers await this instead of racing it on reload.
let _resolveMessagingReady;
export const whenMessagingReady = new Promise((r) => { _resolveMessagingReady = r; });

try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized');
} catch (error) {
  console.error('[Firebase] App init failed:', error.message);
}

if (app) {
  isSupported().then((supported) => {
    messagingSupported = supported;
    if (supported) { messaging = getMessaging(app); console.log('[Firebase] Messaging initialized'); }
    else { console.log('[Firebase] Messaging not supported in this browser'); }
  }).catch((err) => {
    console.warn('[Firebase] isSupported check failed:', err.message);
  }).finally(() => { _resolveMessagingReady(messaging); });   // CR-562: always settle
} else {
  _resolveMessagingReady(null);                                // CR-562: app init failed
}
```
*(BUG-560 safety preserved: unsupported/failed browsers resolve to `null`; no behavioural change for them.)*

### E-A2 — `requestFCMToken` awaits readiness  [REQUIRED]
```js
export const requestFCMToken = async () => {
  await whenMessagingReady;                 // CR-562: wait out the reload init race
  if (!messaging) { console.warn('[Firebase] Messaging not initialized'); return null; }
  // ...rest UNCHANGED...
```
Return shape unchanged (`null` | `{error, token}`). Both callers already `await`; LoadingPage's 3s `Promise.race`
cap still bounds boot. On login (messaging already ready) the await resolves immediately → **no regression**.

### E-A3 — `onForegroundMessage` awaits readiness (becomes async)  [REQUIRED]
```js
export const onForegroundMessage = async (callback) => {
  await whenMessagingReady;                 // CR-562: attach only once messaging is ready
  if (!messaging) return () => {};          // unsupported browser → no-op unsubscribe
  return onMessage(messaging, callback);
};
```
Return type is now `Promise<unsubscribe>` → its sole caller is updated in E-B1. `getFCMDiagnostics` field
`messagingReady: !!messaging` (L141) is left as-is (distinct from `whenMessagingReady`).

---

## PART B — NotificationContext re-attach (CR-562) + autoplay re-unlock (BUG-747)

### E-B1 — make the foreground-listener effect async-safe  [CR-562, REQUIRED]
Replace the one-shot effect body (L230-263) so the (now async) `onForegroundMessage` attaches once ready, with a
teardown guard:
```js
useEffect(() => {
  if (!isAuthenticated || initializedRef.current) return;
  initializedRef.current = true;
  soundManager.preload();

  let cancelled = false;
  // CR-562: onForegroundMessage now awaits messaging readiness (reload race) — store the
  // unsubscribe when it resolves; if the effect tore down first, immediately unsubscribe.
  onForegroundMessage((payload) => {
    console.log('[Notification] Foreground message:', payload);
    processNotificationRef.current?.({ ...payload, __source: 'foreground' });
  }).then((unsub) => {
    if (cancelled) { unsub?.(); return; }
    foregroundUnsubRef.current = unsub;
  });

  const handleSWMessage = (event) => { /* UNCHANGED */ };
  navigator.serviceWorker?.addEventListener('message', handleSWMessage);

  return () => {
    cancelled = true;
    if (foregroundUnsubRef.current) { foregroundUnsubRef.current(); foregroundUnsubRef.current = null; }
    navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated]);
```
This is the core reload fix: even though the effect runs while `messaging===null`, the listener now attaches when
init settles → foreground FCM push reaches `processNotification` → `soundManager.play()` → **ring restored**.
Logout reset (L289-296) and dedup remain untouched.

### E-B2 — soundManager: surface unlock/blocked state  [BUG-747, REQUIRED]
Add a lightweight observer so React can show the banner (OD-747-01 "both"), without changing playback:
```js
// constructor: this.onBlocked = null;
// in play().catch (after _record): if (this.currentAudio === audio) this.currentAudio = null;
//   try { this.onBlocked?.(soundKey, err.message); } catch { /* ignore */ }
setBlockedHandler(fn) { this.onBlocked = fn; }   // BUG-747
```
`unlock()` already sets `isUnlocked = true`; no change there.

### E-B3 — NotificationContext: ungated unlock effect + banner state  [BUG-747, REQUIRED]
Add a NEW ungated effect (mirrors the BUG-661 SW effect at L266 — runs regardless of auth):
```js
const [audioUnlocked, setAudioUnlocked] = useState(() => soundManager.getState().isUnlocked);
const [audioBlockedAt, setAudioBlockedAt] = useState(0);

const unlockAudioNow = useCallback(async () => {   // BUG-747: used by banner + gesture
  const ok = await soundManager.unlock();
  if (ok) { setAudioUnlocked(true); setAudioBlockedAt(0); }
  return ok;
}, []);

useEffect(() => {                                   // BUG-747: ungated (no auth gate)
  soundManager.setBlockedHandler(() => { setAudioUnlocked(false); setAudioBlockedAt(Date.now()); });

  const onGesture = () => { unlockAudioNow(); };    // OD-747-01 silent auto-unlock on first gesture
  const gestures = ['pointerdown', 'keydown', 'touchstart'];
  gestures.forEach((g) => window.addEventListener(g, onGesture, { once: false, passive: true }));

  const onVisible = () => {                          // OD-747-02 re-assert on foreground
    if (document.visibilityState === 'visible' && !soundManager.getState().isUnlocked) unlockAudioNow();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    gestures.forEach((g) => window.removeEventListener(g, onGesture));
    document.removeEventListener('visibilitychange', onVisible);
    soundManager.setBlockedHandler(null);
  };
}, [unlockAudioNow]);
```
Expose `audioUnlocked`, `audioBlockedAt`, `unlockAudioNow` in the context `value` (and deps) at L338-364, and
render the banner inside the provider so it is global WITHOUT touching `App.js`:
```jsx
return (
  <NotificationContext.Provider value={value}>
    {children}
    <SoundUnlockBanner />           {/* BUG-747 */}
  </NotificationContext.Provider>
);
```

### E-B4 — NEW `src/components/notifications/SoundUnlockBanner.jsx`  [BUG-747, REQUIRED]
Tiny fixed-position banner; shows only when a ring was blocked and audio is still locked:
```jsx
import { useNotifications } from '../../contexts/NotificationContext';
export default function SoundUnlockBanner() {
  const { audioUnlocked, audioBlockedAt, unlockAudioNow } = useNotifications();
  if (audioUnlocked || !audioBlockedAt) return null;
  return (
    <button data-testid="sound-unlock-banner" onClick={() => unlockAudioNow()}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] ...">
      🔇 Sound is off — tap to enable order alerts
    </button>
  );
}
```
Copy/placement adjustable at owner smoke; no business logic.

---

## Verification Matrix (seeds QA)
| # | File | Change | How to verify | Automated? |
|---|------|--------|---------------|:---:|
| A1 | firebase.js | `whenMessagingReady` always settles | Unit: mock `isSupported` resolve true/false + app-null → promise resolves to messaging/null | YES |
| A2 | firebase.js | `requestFCMToken` awaits readiness | Unit: call before init resolves → returns token after ready, not null | YES |
| A3 | firebase.js | `onForegroundMessage` awaits + async | Unit: returns a Promise; resolves to real unsub once ready; no-op on unsupported | YES |
| B1 | NotificationContext | async-safe attach on reload | Browser: granted perm, reload dashboard, push test order → **buzzer rings**; console shows foreground handler attached after `Messaging initialized` | NO |
| B1r | NotificationContext | **no regression** login→ring | Browser: fresh login → order → rings exactly as today | NO |
| B2 | soundManager | blocked handler fires | Unit: stub `audio.play` reject → `onBlocked` called | YES |
| B3 | NotificationContext | gesture + visibility unlock | Browser: reload (blocked), click once → banner clears, next order rings; background→foreground re-asserts | NO |
| B4 | SoundUnlockBanner | shows only when blocked+locked | Browser: appears after a blocked ring, hidden after unlock; `data-testid=sound-unlock-banner` | NO |

## Risk Register
- **R1 (HIGH):** editing `firebase.js` provider init — mitigate: `.finally()` guarantees the promise settles on all
  paths (supported/unsupported/error); preserves BUG-560. Verify A1 covers all exits.
- **R2 (MED):** `onForegroundMessage` signature change — single caller (E-B1) updated; grep confirms no other.
- **R3 (MED):** double-subscribe if effect re-runs — guarded by `initializedRef` + `cancelled` teardown.
- **R4 (LOW):** global gesture listeners — passive, self-removing on unmount; unlock is idempotent.
- **R5 (regression):** login→ring must be unchanged — B1r is a blocking QA case (OD-748-03).

## Execution Sequence
1. E-A1 → E-A2 → E-A3 (firebase.js) 2. E-B2 (soundManager) 3. E-B1 + E-B3 + E-B4 (NotificationContext + banner)
4. Self-test (A1–A3, B2 unit) 5. Manual B1/B1r/B3/B4 on preview (needs test account) 6. QA handover.

## Post-Code Registry Checklist (Implementation agent MUST run)
- [ ] registry.json: CR-562 → status IMPLEMENTED (race-fix scope), BUG-747 → IMPLEMENTED; sprint_key nov_cr_batch
- [ ] CR_REGISTRY.md (CR-562 re-open row) + BUG_TRACKER.md (BUG-747 row) updated
- [ ] FILE_OWNERSHIP.md: add `config/firebase.js` (CR-562 race), `contexts/NotificationContext.jsx`,
      `utils/soundManager.js`, NEW `components/notifications/SoundUnlockBanner.jsx`
- [ ] Code markers: `// CR-562` (firebase.js, NotificationContext attach) and `// BUG-747` (soundManager,
      unlock effect, banner) in every modified block
- [ ] New tests committed and green

## Handover (→ Owner Gate 4 GO → IMPLEMENTATION)
Plan ready. ~7 edits across 3 files + 1 new component + tests. Code reality NONE. Scope: firebase.js /
NotificationContext.jsx / soundManager.js + SoundUnlockBanner.jsx WILL change; LoadingPage/LoginPage/App.js/SW/
sockets/order/payment NOT touched. Verification: 8 checks (4 automated, 4 manual). Owner decisions: none open
(OD-748-02 GO assumed from "go gate 3" — **Gate 4 GO formally lifts the OD-AUDIT-02 firebase.js lock**). Manual QA
needs a Goan Kitchen preprod test account (none in `memory/test_credentials.md`). Awaiting **Gate 4 GO**.
