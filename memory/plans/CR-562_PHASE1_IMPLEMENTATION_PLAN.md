# CR-562 — Implementation Plan (Gate 3) — Phase 1: messaging-ready race + listener re-attach on reload

**Document:** plans/CR-562_PHASE1_IMPLEMENTATION_PLAN.md
**Stage:** Implementation Plan (Gate 3) — PLANNING role (NO app code)
**Created:** 2026-11-24 · **Branch target:** `main` · **Sprint:** nov_cr_batch
**Client:** ALL (repro Goan Kitchen rid 69) · **Assignee:** Abhishek · **Risk:** HIGH
**Gate-2 basis:** `impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` (§2 BREAK-2, §3, §4 edits 1-2, §7 Phase 1)
**Governance:** OD-AUDIT-02 (firebase.js edit lock) — **owner Gate-4 GO granted 2026-11-24**.
**Hard acceptance (OD-562-02):** the existing **login→ring path must behave byte-for-byte as today**.

---

## Scope lock
- **WILL change:** `src/config/firebase.js`, `src/contexts/NotificationContext.jsx`.
- **NEW (tests):** `src/__tests__/config/firebase.whenready.test.js`.
- **WILL NOT touch:** `firebase-messaging-sw.js`, `LoadingPage.jsx`, `LoginPage.jsx`, `soundManager.js`, `App.js`,
  `Sidebar.jsx`, any socket/order/payment/transform/service/auth file. (Those belong to Phases 2-5.)

## Code Reality: NONE (re-verified @ HEAD dbaf93f2)
- `config/firebase.js`: `let messaging=null` (L19); async init `isSupported().then(...)` (L30-41); `requestFCMToken`
  guards `if(!messaging)` (L48-51); `onForegroundMessage` sync, guards `if(!messaging) return ()=>{}` (L122-124);
  `export { messaging }` L127. No `whenMessagingReady`.
- `contexts/NotificationContext.jsx`: attach effect L213-246 one-shot via `initializedRef` (L214-215), sync
  `onForegroundMessage` at L221; logout reset L273-279 reads `initializedRef.current`.

## Conflict Pre-Check
- `firebase.js` last modifier BUG-560 (CLOSED); no OPEN item. `NotificationContext.jsx` last modifiers BUG-661
  F5 / CR-440 (done); the only coming overlap is BUG-747/BUG-749 (later phases, same file) → this plan edits ONLY
  the attach effect + nothing in the unlock/boot regions those phases add → line-disjoint, parallel-safe.

---

## Entry Verification (must still match before coding)
- firebase.js L18-41 init block exactly as quoted in §Edit E1 "current".
- firebase.js L47-51 `requestFCMToken` head; L122-124 `onForegroundMessage`.
- NotificationContext.jsx L213-246 attach effect; L273-279 logout reset.
If any differs → STOP, return to Planning.

---

## PART A — `config/firebase.js`

### E1 — add always-settling `whenMessagingReady` promise  [REQUIRED]
**Current (L18-41):**
```js
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized');
} catch (error) {
  console.error('[Firebase] App init failed:', error.message);
}

// BUG-560: async guard — getMessaging() fires an async rejection on unsupported
// browsers that bypasses sync try/catch. isSupported() checks first, skips safely.
if (app) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log('[Firebase] Messaging initialized');
    } else {
      console.log('[Firebase] Messaging not supported in this browser');
    }
  }).catch((err) => {
    console.warn('[Firebase] isSupported check failed:', err.message);
  });
}
```
**New:**
```js
let app = null;
let messaging = null;

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

// BUG-560: async guard — getMessaging() fires an async rejection on unsupported
// browsers that bypasses sync try/catch. isSupported() checks first, skips safely.
if (app) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log('[Firebase] Messaging initialized');
    } else {
      console.log('[Firebase] Messaging not supported in this browser');
    }
  }).catch((err) => {
    console.warn('[Firebase] isSupported check failed:', err.message);
  }).finally(() => { _resolveMessagingReady(messaging); });   // CR-562: always settle
} else {
  _resolveMessagingReady(null);                                // CR-562: app init failed
}
```
*BUG-560 safety preserved: unsupported/failed browsers resolve to `null`.*

### E2 — `requestFCMToken` awaits readiness  [REQUIRED]
**Current (L47-51):**
```js
export const requestFCMToken = async () => {
  if (!messaging) {
    console.warn('[Firebase] Messaging not initialized');
    return null;
  }
```
**New:**
```js
export const requestFCMToken = async () => {
  await whenMessagingReady;                 // CR-562: wait out the reload init race
  if (!messaging) {
    console.warn('[Firebase] Messaging not initialized');
    return null;
  }
```
Return shape unchanged (`null` | `{error, token}`). Both callers already `await`; LoadingPage is untouched this
phase (it has no `requestFCMToken` call on main). On login, messaging is already ready → await resolves
immediately → **no regression** (R5).

### E3 — `onForegroundMessage` awaits readiness (becomes async)  [REQUIRED]
**Current (L122-124):**
```js
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
```
**New:**
```js
export const onForegroundMessage = async (callback) => {
  await whenMessagingReady;                 // CR-562: attach only once messaging is ready
  if (!messaging) return () => {};          // unsupported browser → no-op unsubscribe
  return onMessage(messaging, callback);
};
```
Return type now `Promise<unsubscribe>`. **Sole caller** is `NotificationContext.jsx:221` — updated in E4 (grep
confirms no other caller on main).

---

## PART B — `contexts/NotificationContext.jsx`

### E4 — async-safe foreground attach + re-attach on reload  [REQUIRED]
**Current (L213-246):**
```js
  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) return;
    initializedRef.current = true;

    // Preload sounds
    soundManager.preload();

    // Listen for foreground messages — pass full payload
    foregroundUnsubRef.current = onForegroundMessage((payload) => {
      console.log('[Notification] Foreground message:', payload);
      processNotificationRef.current?.(payload);
    });

    // Listen for background messages forwarded by service worker
    const handleSWMessage = (event) => {
      if (event.data?.type === 'BACKGROUND_NOTIFICATION') {
        console.log('[Notification] SW forwarded message:', event.data.payload);
        // Wrap SW data into same shape as foreground payload
        processNotificationRef.current?.({ data: event.data.payload });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // BUG-621 OD-621-02: visibilitychange handler defined here ... (comment block, unchanged)
    // BUG-661: moved to separate ungated effect below — removed from auth gate here.

    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
```
**New:**
```js
  useEffect(() => {
    if (!isAuthenticated) return undefined;   // CR-562: drop the initializedRef one-shot gate so a reload re-attaches
    initializedRef.current = true;            // CR-562: keep as "was initialized" marker (logout reset reads it)

    // Preload sounds
    soundManager.preload();

    let cancelled = false;                    // CR-562: async teardown guard (StrictMode-safe)
    // CR-562: onForegroundMessage now awaits messaging readiness (reload race) — store the
    // unsubscribe when it resolves; if the effect tore down first, immediately unsubscribe.
    onForegroundMessage((payload) => {
      console.log('[Notification] Foreground message:', payload);
      processNotificationRef.current?.(payload);
    }).then((unsub) => {
      if (cancelled) { unsub?.(); return; }
      foregroundUnsubRef.current = unsub;
    });

    // Listen for background messages forwarded by service worker
    const handleSWMessage = (event) => {
      if (event.data?.type === 'BACKGROUND_NOTIFICATION') {
        console.log('[Notification] SW forwarded message:', event.data.payload);
        processNotificationRef.current?.({ data: event.data.payload });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      cancelled = true;                       // CR-562
      if (foregroundUnsubRef.current) { foregroundUnsubRef.current(); foregroundUnsubRef.current = null; }
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
```
**Why this fixes reload:** the effect runs on reload while `messaging===null`, but `onForegroundMessage` now awaits
`whenMessagingReady` and attaches `onMessage` when init settles → foreground push reaches `processNotification` →
`soundManager.play()` → ring. The one-shot gate is dropped so the effect can re-run; `cancelled` + nulling the ref
prevent a double subscription. **Logout reset (L273-279) is unchanged** — still reads/clears `initializedRef`.

*(No change to the BUG-661 ungated SW effect L249-270, logout reset L273-279, context value, or render.)*

---

## Verification Matrix (seeds QA)
| # | File | Change | How to verify | Auto? |
|---|------|--------|---------------|:--:|
| V1 | firebase.js | `whenMessagingReady` settles to messaging (supported) | unit: mock `isSupported`→true → promise resolves truthy | YES |
| V2 | firebase.js | settles to `null` (unsupported) + app-init-null path | unit: mock `isSupported`→false / app null → resolves `null` | YES |
| V3 | firebase.js | `requestFCMToken` awaits readiness (no premature null) | unit: call before init settles → resolves after ready | YES |
| V4 | firebase.js | `onForegroundMessage` async; resolves to real unsub when ready, no-op on unsupported | unit | YES |
| V5 | NotificationContext | async-safe attach on **reload** | browser (granted perm): reload /dashboard → push a test order → **buzzer rings**; console shows "Foreground message" after "[Firebase] Messaging initialized" | NO |
| V6 | NotificationContext | **NO REGRESSION** login→ring (R5, OD-562-02) | browser: fresh login → order → rings exactly as today | NO |
| V7 | NotificationContext | no double-subscribe / StrictMode-safe | browser dev: one "Foreground message" log per push (not 2) | NO |

**Verification blocker:** V5-V7 need a Goan Kitchen preprod test account + a device where notification permission is
granted (`test_credentials.md` is a stub). V1-V4 run without it.

## Risk Register
- **R1 (HIGH):** editing `firebase.js` provider init — mitigated by `.finally()` settling on ALL paths
  (supported/unsupported/error) + `else` branch for app-null; V1/V2 cover every exit. Preserves BUG-560.
- **R2 (MED):** `onForegroundMessage` signature change → single caller (E4) updated; grep confirms no other.
- **R3 (MED):** dropping the one-shot gate could double-subscribe on re-run → `cancelled` guard + ref null on teardown.
- **R5 (REGRESSION, blocking):** login→ring must be unchanged → V6 is a blocking QA case (OD-562-02).

## Execution Sequence
1. E1 → E2 → E3 (firebase.js) → compile. 2. E4 (NotificationContext) → compile. 3. Self-test V1-V4 (unit).
4. Manual V5-V7 on preview (needs test account). 5. QA handover.

## Post-Code Registry Checklist (Implementation agent MUST run)
- [ ] registry.json: CR-562 → status IMPLEMENTED (Phase 1), current_gate 4, sprint nov_cr_batch
- [ ] CR_REGISTRY.md row updated
- [ ] FILE_OWNERSHIP.md: add `config/firebase.js` (CR-562 Phase 1), `contexts/NotificationContext.jsx`
- [ ] Code markers `// CR-562` in every modified block
- [ ] New unit test committed and green; webpack 0 new warnings

## Handover (→ Owner Gate-4 GO to implement → IMPLEMENTATION)
Plan ready. 3 edits in `firebase.js` + 1 effect rewrite in `NotificationContext.jsx` + 1 unit test. Code Reality NONE.
Scope: firebase.js / NotificationContext.jsx WILL change; LoadingPage/LoginPage/soundManager/App/Sidebar NOT touched.
Verification: 7 checks (4 automated, 3 manual). OD-AUDIT-02 GO granted. Hard gate = V6 login→ring no-regression.
**Awaiting owner Gate-4 GO to write code** (then Phase 2 / BUG-749 planning next).
