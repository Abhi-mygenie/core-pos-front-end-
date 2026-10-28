# BUG-621 — Impact Analysis

**Item:** BUG-621 — PWA Update Banner Never Shows When New Version Releases  
**Stage:** Gate 2 — Impact Analysis  
**Code Reality:** FULL — `self.skipWaiting()` in SW install (L82) prevents `reg.waiting` from ever being set; `swUpdatePending` never becomes `true`; `SwUpdateBanner` never renders  
**Risk:** MEDIUM — 3 files; SW lifecycle change requires end-to-end update flow testing  
**Conflict Pre-Check:** `firebase-messaging-sw.js` — NO CONFLICTS. `NotificationContext.jsx` — BUG-453 touched `notificationsEnabled` state and `processNotification` callback (completely different lines). `App.js` — multiple open items but all touch routes/providers, not `SwUpdateBanner`. **All parallel-safe.**

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-621-01** | Keep 10-second auto-reload timer in `SwUpdateBanner` (`App.js L132`) — YES, preserve existing UX for users who dismiss banner |
| **OD-621-02** | Add `visibilitychange` fallback for iOS Safari PWA where `statechange` may be unreliable — YES (recommended) |

---

## Root Cause Deep Trace

```
CURRENT ARCHITECTURE (broken):
  SW install → self.skipWaiting() immediately
  SW never enters 'waiting' state
  NotificationContext:
    reg.waiting → always null → setSwUpdatePending(true) NEVER fires
    updatefound → installing SW.statechange → by the time we check reg.waiting,
                  SW has already skip-waited to 'active' (race condition)
    controllerchange → window.location.reload() (fires without banner in browser;
                       missed entirely in PWA if app is backgrounded/frozen)
  SwUpdateBanner: swUpdatePending always false → never renders

TARGET ARCHITECTURE (correct PWA pattern):
  SW install → NO skipWaiting (SW enters 'waiting' state naturally)
  SW message listener → self.skipWaiting() on { action: 'skipWaiting' }
  NotificationContext:
    reg.waiting → truthy → setSwUpdatePending(true) → banner shows ✅
    reg.installing.statechange → 'installed' → reg.waiting truthy → banner shows ✅
    visibilitychange (OD-621-02) → on app-open after background update → reg.waiting check ✅
    controllerchange → window.location.reload() (still present for backup)
  SwUpdateBanner: swUpdatePending=true → renders ✅
    "Reload now" click → reg.waiting.postMessage({action:'skipWaiting'}) → controllerchange → reload ✅
```

---

## Affected Files

### Files WILL change (3 files)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `public/firebase-messaging-sw.js` | (a) Remove `skipWaiting()` from install handler. (b) Add `message` event listener that calls `self.skipWaiting()` on `{action:'skipWaiting'}` | Remove L81-83; +4 lines for message listener | MEDIUM — SW change; must test full update cycle |
| **E2** | `src/contexts/NotificationContext.jsx` | (a) Change `reg.waiting` check to also listen to `installing.statechange`. (b) Store `reg` reference accessible to trigger function. (c) Expose `triggerSwUpdate` function via context value. (d) Add `visibilitychange` listener (OD-621-02) | ~L236-247 refactored + ~10 lines added | MEDIUM — NotificationContext touches all auth flows |
| **E3** | `src/App.js` | (a) Import `triggerSwUpdate` from context. (b) Update "Reload now" `onClick` to call `triggerSwUpdate()` before `window.location.reload()` | L150: onClick change; +import | LOW — SwUpdateBanner is isolated component |

### Files WILL NOT change
- `src/components/layout/NotificationBanner.jsx` — this is for push notification banners, not SW update
- `src/contexts/AuthContext.jsx`, `OrderContext.jsx` — unrelated
- Any service, transform, or other component file

---

## E1: firebase-messaging-sw.js — Remove skipWaiting, Add Message Listener

**Current L79-89:**
```js
// BUG-597: skip the waiting phase so a new SW version activates immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// BUG-597: claim all already-open tabs so the newly-activated SW controls
// them right away, allowing the controllerchange event to fire in the app.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

**After E1:**
```js
// BUG-621: do NOT skipWaiting automatically — wait for user action via message
// so the SwUpdateBanner can show and user can choose when to reload.
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting(); // triggered by "Reload now" button in SwUpdateBanner
  }
});

// BUG-621: keep clients.claim() so the newly-activated SW controls tabs immediately
// after user-triggered skipWaiting.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
// NOTE: install handler with skipWaiting() removed — SW now waits normally
```

---

## E2: NotificationContext.jsx — Detect Waiting SW Reliably

**Current L235-246:**
```js
if (navigator.serviceWorker) {
  navigator.serviceWorker.ready.then((reg) => {
    if (reg.waiting) setSwUpdatePending(true);
    reg.addEventListener('updatefound', () => {
      if (reg.waiting) setSwUpdatePending(true);
    });
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
```

**After E2:**
```js
if (navigator.serviceWorker) {
  navigator.serviceWorker.ready.then((reg) => {
    regRef.current = reg; // BUG-621: store for triggerSwUpdate

    // BUG-621: check if SW already waiting on load (e.g. app opened after background update)
    if (reg.waiting) setSwUpdatePending(true);

    // BUG-621: watch for new SW arriving and entering 'installed/waiting' state
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && reg.waiting) {
          setSwUpdatePending(true);
        }
      });
    });
  });

  // BUG-621: controllerchange still present as backup (fires after skipWaiting)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // BUG-621 OD-621-02: visibilitychange fallback for iOS Safari PWA
  // where statechange may be missed when app is backgrounded
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) setSwUpdatePending(true);
      });
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // (cleanup in existing return() below)
}
```

Plus: add `regRef = useRef(null)` near top of component; expose `triggerSwUpdate` in context value.

`triggerSwUpdate`:
```js
const triggerSwUpdate = useCallback(() => {
  if (regRef.current?.waiting) {
    regRef.current.waiting.postMessage({ action: 'skipWaiting' });
  }
}, []);
```

---

## E3: App.js SwUpdateBanner — Use triggerSwUpdate on Click

**Current L148-158:**
```js
<button
  data-testid="sw-update-reload-btn"
  onClick={() => window.location.reload()}
  ...
>
  Reload now
</button>
```

**After E3:**
```js
const { swUpdatePending, triggerSwUpdate } = useNotifications();
// ...
<button
  data-testid="sw-update-reload-btn"
  onClick={() => { triggerSwUpdate(); window.location.reload(); }} // BUG-621
  ...
>
  Reload now
</button>
```

*Note: `window.location.reload()` is kept as a backup in case `controllerchange` hasn't fired yet. `triggerSwUpdate` sends `postMessage` which triggers `skipWaiting()` in SW → `controllerchange` → `window.location.reload()` in NotificationContext. The explicit reload in onClick is a belt-and-suspenders fallback.*

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SW update never applies (stuck waiting) | LOW | HIGH | 10s auto-reload in SwUpdateBanner (OD-621-01) fires regardless → user always gets update |
| iOS Safari doesn't fire `statechange` reliably | MEDIUM | MEDIUM | `visibilitychange` fallback (OD-621-02) covers this |
| `controllerchange` double-reload (triggerSwUpdate + existing controllerchange listener) | LOW | LOW | Both call `window.location.reload()` — harmless double-call; browser ignores second |
| NotificationContext BUG-453 conflict | NONE | — | BUG-453 touched L85-108 (state + processNotification); E2 touches L235-247 (SW block) — different lines |
| regRef leaked across logout | LOW | LOW | `initializedRef.current` guard at L213 prevents re-init; regRef is module-level component state |

---

## Verification Matrix

| # | Edit | File | How to Verify | Automated? |
|---|---|---|---|---|
| V1 | E1 | firebase-messaging-sw.js | Code: no `self.skipWaiting()` in install handler; message listener present | YES (grep) |
| V2 | E2 | NotificationContext.jsx | Code: `statechange` listener in `updatefound`; `regRef`; `triggerSwUpdate` exported | YES (grep) |
| V3 | E3 | App.js | Code: `triggerSwUpdate()` called in "Reload now" onClick | YES (grep) |
| V4 | E1+E2 | Browser: deploy new version → `reg.waiting` becomes truthy → `swUpdatePending=true` → banner renders | NO (manual deploy test) |
| V5 | E3 | Browser: click "Reload now" → SW activates → page reloads to new version | NO |
| V6 | E2 | PWA: close app → new version deployed → open app → banner shows (via `reg.waiting` or `visibilitychange`) | NO (PWA install required) |
| V7 | E1+E2 | 10s auto-reload fires if user ignores banner | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-621 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: all 3 files listed with BUG-621 date
- [ ] Code markers: // BUG-621 in all 3 files
- [ ] Compile: webpack 0 new warnings
- [ ] SW version: confirm new SW registers on next deploy (dev server cache clear)
```

## Gate Status
- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting Implementation Plan → Gate 4 GO
