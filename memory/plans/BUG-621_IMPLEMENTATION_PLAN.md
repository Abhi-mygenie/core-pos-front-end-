# BUG-621 — Implementation Plan

**Item:** BUG-621 — PWA Update Banner Never Shows  
**Stage:** Gate 3 — Implementation Plan  
**Based on:** Impact Analysis `/app/memory/impact/BUG-621_IMPACT_ANALYSIS.md`  
**Risk:** MEDIUM  
**Files changing:** 3 (`firebase-messaging-sw.js` · `NotificationContext.jsx` · `App.js`)  
**Total lines changed:** ~25 (remove 5, add ~20)  
**Hotspots touched:** NONE

---

## Starting State Verification (run before touching any file)

```bash
grep -n "skipWaiting" /app/frontend/public/firebase-messaging-sw.js
# Expected: L82:   self.skipWaiting();

grep -n "swUpdatePending\|reg.waiting\|updatefound" /app/frontend/src/contexts/NotificationContext.jsx
# Expected: L85, L238, L239, L240

grep -n "swUpdatePending\|triggerSwUpdate" /app/frontend/src/App.js
# Expected: L129 swUpdatePending only — no triggerSwUpdate yet
```

---

## Edit 1 (E1) — `public/firebase-messaging-sw.js`

**What:** Remove automatic `skipWaiting()` from install handler. Replace with a `message` event listener that calls `skipWaiting()` only when triggered by the "Reload now" button.

**Why:** `self.skipWaiting()` on install means the new SW never enters `waiting` state → `reg.waiting` is always null → `swUpdatePending` never becomes `true` → banner never shows.

### E1 — Exact change

**Current L79-83 (REMOVE these 5 lines):**
```js
// BUG-597: skip the waiting phase so a new SW version activates immediately
// on the next page open, instead of sitting idle until all tabs are closed.
self.addEventListener('install', () => {
  self.skipWaiting();
});
```

**Replace with (ADD these 6 lines in their place):**
```js
// BUG-621: do NOT skipWaiting automatically — let SW enter 'waiting' state so
// reg.waiting is truthy and SwUpdateBanner can show. skipWaiting is triggered
// by the user clicking "Reload now" via postMessage from SwUpdateBanner.
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') self.skipWaiting();
});
```

**Leave unchanged (L85-89):**
```js
// BUG-597: claim all already-open tabs so the newly-activated SW controls
// them right away, allowing the controllerchange event to fire in the app.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

**Verification after E1:**
```bash
grep -n "skipWaiting\|message\|install" /app/frontend/public/firebase-messaging-sw.js
# Must have: message listener with skipWaiting inside it
# Must NOT have: self.addEventListener('install', ...) with skipWaiting
```

---

## Edit 2 (E2) — `src/contexts/NotificationContext.jsx`

Four sub-edits in order: E2a → E2b → E2c → E2d

### E2a — Add `regRef` after `swUpdatePending` state (line 85)

**Current L85:**
```js
  const [swUpdatePending, setSwUpdatePending] = useState(false); // BUG-597: true when a new SW version is waiting to activate
```

**After E2a (insert new line 86 immediately after):**
```js
  const [swUpdatePending, setSwUpdatePending] = useState(false); // BUG-597: true when a new SW version is waiting to activate
  const regRef = useRef(null); // BUG-621: stores SW registration so triggerSwUpdate can postMessage to reg.waiting
```

**Note:** `useRef` is already imported at L2 — no import change needed.

---

### E2b — Replace BUG-597 SW detection block (L235-247) with BUG-621 detection

**Current L235-247:**
```js
    // BUG-597: detect a new SW version waiting on load, and watch for one arriving
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) setSwUpdatePending(true);
        reg.addEventListener('updatefound', () => {
          if (reg.waiting) setSwUpdatePending(true);
        });
      });
      // BUG-597: when the new SW takes over, reload to get the fresh build
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
```

**Replace entire block with:**
```js
    // BUG-621 OD-621-02: visibilitychange handler — defined here so cleanup return() can reference it.
    // Covers iOS Safari PWA where the SW may update while the app is backgrounded/frozen;
    // when the user brings the app back to foreground, we re-check reg.waiting.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.ready.then((reg) => {
          if (reg.waiting) { regRef.current = reg; setSwUpdatePending(true); }
        });
      }
    };

    // BUG-621: detect SW waiting reliably via statechange on the installing worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => {
        regRef.current = reg; // BUG-621: store for triggerSwUpdate postMessage
        // Check on load — covers app reopened after a background SW update
        if (reg.waiting) setSwUpdatePending(true);
        // Watch for new SW installing and transitioning to 'installed/waiting'
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
      // BUG-597 (kept): when new SW takes over after skipWaiting, reload the page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      // BUG-621 OD-621-02: visibilitychange fallback for iOS Safari PWA
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
```

---

### E2c — Update cleanup `return` to remove `visibilitychange` listener (L249-252)

**Current L249-252:**
```js
    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
```

**After E2c (add 1 line):**
```js
    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      document.removeEventListener('visibilitychange', handleVisibilityChange); // BUG-621
    };
```

---

### E2d — Add `triggerSwUpdate` callback + expose in context value

**After the existing `markRead` useCallback (currently ending at L291), insert new callback:**
```js
  const triggerSwUpdate = useCallback(() => {
    // BUG-621: signal the waiting SW to skipWaiting — triggers controllerchange → reload
    if (regRef.current?.waiting) {
      regRef.current.waiting.postMessage({ action: 'skipWaiting' });
    }
  }, []); // no deps — regRef is a ref, reads .current at call time
```

**Then in the context `value` useMemo (currently L298-322), add `triggerSwUpdate`:**

Current L309-321 (partial):
```js
    swUpdatePending,            // BUG-597
  }), [
    ...
    swUpdatePending,            // BUG-597
  ]);
```

After E2d — add to both the object and the deps array:
```js
    swUpdatePending,            // BUG-597
    triggerSwUpdate,            // BUG-621
  }), [
    ...
    swUpdatePending,            // BUG-597
    triggerSwUpdate,            // BUG-621
  ]);
```

**Verification after E2:**
```bash
grep -n "regRef\|handleVisibilityChange\|triggerSwUpdate\|statechange\|BUG-621" \
  /app/frontend/src/contexts/NotificationContext.jsx
# Must show: regRef, handleVisibilityChange, statechange, triggerSwUpdate in value
```

---

## Edit 3 (E3) — `src/App.js`

Two sub-edits. Both inside `SwUpdateBanner` (L128-161).

### E3a — Destructure `triggerSwUpdate` from context (L129)

**Current L129:**
```js
  const { swUpdatePending } = useNotifications();
```

**After E3a:**
```js
  const { swUpdatePending, triggerSwUpdate } = useNotifications(); // BUG-621: +triggerSwUpdate
```

---

### E3b — Update "Reload now" onClick (L150)

**Current L150:**
```js
        onClick={() => window.location.reload()}
```

**After E3b:**
```js
        onClick={() => { triggerSwUpdate(); window.location.reload(); }} // BUG-621: signal SW before reload
```

**Why keep `window.location.reload()` here:** Belt-and-suspenders. `triggerSwUpdate()` posts a message → SW calls `skipWaiting()` → `controllerchange` fires → `window.location.reload()` in NotificationContext. The explicit reload here fires if the page hasn't reloaded within the next tick (edge case: SW already active, no controllerchange).

**Verification after E3:**
```bash
grep -n "triggerSwUpdate" /app/frontend/src/App.js
# Must show: L129 destructure + L150 onClick call
```

---

## Execution Sequence

Apply in this exact order — each edit is non-breaking before the next is applied:

```
E1  → firebase-messaging-sw.js  (standalone file, no JS imports)
E2a → NotificationContext.jsx   (add regRef state)
E2b → NotificationContext.jsx   (replace SW detection block — uses regRef from E2a)
E2c → NotificationContext.jsx   (update cleanup — references handleVisibilityChange from E2b)
E2d → NotificationContext.jsx   (add triggerSwUpdate + expose in context)
E3a → App.js                    (destructure triggerSwUpdate — available after E2d)
E3b → App.js                    (use triggerSwUpdate in onClick — available after E3a)
```

**Checkpoint after E2 + E3:** webpack must compile with 0 new warnings before proceeding to QA.

---

## Files WILL NOT change

- `src/components/layout/NotificationBanner.jsx` — push notification banners only
- `src/contexts/AuthContext.jsx`, `OrderContext.jsx` — unrelated
- `src/pages/LoadingPage.jsx` — no SW registration logic
- Any service, transform, test, or route file

---

## Scope Lock

| File | Lines removed | Lines added | Net |
|---|---|---|---|
| `firebase-messaging-sw.js` | 5 (install handler) | 4 (message listener) | −1 |
| `NotificationContext.jsx` | 13 (BUG-597 block) | ~28 (BUG-621 block + regRef + triggerSwUpdate + context) | +15 |
| `App.js` | 0 | 2 (destructure + onClick) | +2 |
| **Total** | **18** | **34** | **+16** |

---

## Verification Matrix (seeds QA handover)

| # | Edit | File | Verify | Automated? |
|---|---|---|---|---|
| V1 | E1 | firebase-messaging-sw.js | No `skipWaiting()` in install handler; `message` listener present with `event.data?.action === 'skipWaiting'` | YES — grep |
| V2 | E2a | NotificationContext.jsx | `regRef = useRef(null)` declared after `swUpdatePending` state | YES — grep |
| V3 | E2b | NotificationContext.jsx | `statechange` listener on `newWorker` inside `updatefound`; `regRef.current = reg` set; `handleVisibilityChange` defined | YES — grep |
| V4 | E2c | NotificationContext.jsx | `document.removeEventListener('visibilitychange', handleVisibilityChange)` in cleanup return | YES — grep |
| V5 | E2d | NotificationContext.jsx | `triggerSwUpdate` useCallback exported in context value + deps array | YES — grep |
| V6 | E3a | App.js | `triggerSwUpdate` destructured from `useNotifications()` | YES — grep |
| V7 | E3b | App.js | `triggerSwUpdate()` called inside onClick before `window.location.reload()` | YES — grep |
| V8 | ALL | — | `webpack compiled` with 0 new warnings | YES — terminal |
| V9 | E1+E2 | Browser | Deploy new version → `reg.waiting` truthy → `swUpdatePending=true` → banner appears | NO — manual |
| V10 | E3b | Browser | Click "Reload now" → page reloads to new version | NO — manual |
| V11 | E2b | PWA | Reopen app after background update → banner shows | NO — PWA install required |
| V12 | E1+E2 | Any | 10s auto-reload fires if user ignores banner | NO — manual |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-621 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: BUG-621 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 3 files listed with BUG-621 + date
- [ ] Code markers: // BUG-621 in every modified block
- [ ] Compile: webpack compiled, 0 new warnings
- [ ] SW version bump confirmed (dev server shows new SW on next hard refresh)
```

---

## Gate Status

- Gate 1 (Intake): COMPLETE
- Gate 2 (Impact Analysis): COMPLETE — `/app/memory/impact/BUG-621_IMPACT_ANALYSIS.md`
- Gate 3 (Implementation Plan): **COMPLETE** (this document)
- Gate 4 GO: **Awaiting owner approval** before implementation begins
