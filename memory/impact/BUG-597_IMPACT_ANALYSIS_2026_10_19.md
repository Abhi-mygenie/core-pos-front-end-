# BUG-597 — Impact Analysis (Gate 2)
## PWA White Screen on Deploy — Service Worker Update Flow + ChunkLoadError Recovery

**Date:** 2026-10-19
**Stage:** Gate 2 — Impact Analysis
**Author:** Planning Agent (AGENT_PROMPT_ALPHA v0.7 Role 2)

---

## Code Reality Check

```bash
grep -rn "skipWaiting|controllerchange|ChunkLoadError|waitingWorker|update.*available" \
  /app/frontend/src/ /app/frontend/public/firebase-messaging-sw.js
```

**Code Reality: NONE.** No skipWaiting, no controllerchange listener, no ChunkLoadError
handling, no update banner anywhere.

**Bonus finding:** An `ErrorBoundary` already wraps the whole app
(`App.js:126 → components/guards/ErrorBoundary.jsx`) — but it does NOT handle
`ChunkLoadError` specially; it just shows a static red error screen with a
manual "Try Again" button. No auto-reload, no retry guard.

---

## Conflict Pre-Check

| File | Last modifier | Date | Conflict? |
|------|--------------|------|-----------|
| `public/firebase-messaging-sw.js` | CR-386 (manifest icons) | 2026-09-24 | NONE |
| `src/contexts/NotificationContext.jsx` | CR-440 (notificationsEnabled) | 2026-10-19 | NONE — CR-440 touched L56-170; our changes are in L178-206 (init effect) |
| `src/components/guards/ErrorBoundary.jsx` | CRIT-003 (creation) | pre-2026 | NONE — no open items on this file |

---

## What Exactly Is Added Where

### File 1 — `public/firebase-messaging-sw.js`

**Where:** Bottom of the file (after the `notificationclick` handler, line 78+)

**What:** Two new event listeners — `install` and `activate` — that make the new
version of the service worker take over immediately when a fresh deploy happens.

```
// BUG-597: skip the waiting phase so a new SW version activates immediately
//          on next page open, instead of waiting for all tabs to close.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// BUG-597: claim all open tabs so the newly-activated SW controls them at once.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

**Why these two lines matter:**
- `skipWaiting()` — Without this, the new SW downloads silently but sits in a
  "waiting" state until every single browser tab is closed. On a restaurant POS
  that runs all day, that means the update NEVER activates until the owner
  manually closes everything. With it, the new SW activates the moment a tab
  reopens after a deploy.
- `clients.claim()` — Without this, even after the new SW activates it does NOT
  control already-open tabs. With it, all open tabs switch to the new SW
  immediately, so the update notification can fire consistently.

**Regression risk:** NONE. These are standard PWA best-practice additions.
The existing `notificationclick` and `onBackgroundMessage` handlers are
completely untouched.

---

### File 2 — `src/contexts/NotificationContext.jsx`

**Where:** Inside the existing init `useEffect` at L178-206 (the one that already
runs `navigator.serviceWorker?.addEventListener('message', handleSWMessage)`)

**What:** Three small additions inside that one effect:

**A — Detect a waiting SW worker on page load:**
```
// BUG-597: check if a new SW is already waiting when the app loads
const reg = await navigator.serviceWorker?.ready;
if (reg?.waiting) {
  setSwUpdatePending(true);
}
```

**B — Listen for a new SW entering the waiting state while the app is running:**
```
// BUG-597: listen for new SW installing after the app is already open
const handleSWUpdate = (event) => {
  if (event.target.waiting) setSwUpdatePending(true);
};
navigator.serviceWorker?.addEventListener('updatefound', handleSWUpdate); // removed in cleanup
```

**C — Reload when the SW controller changes (new SW took over):**
```
// BUG-597: when the new SW activates, reload to get the fresh build
navigator.serviceWorker?.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

**New state (above the effect):**
```
const [swUpdatePending, setSwUpdatePending] = useState(false);
```

**Exported from context:**
```
swUpdatePending
```

**Where the toast renders — `src/App.js`:**
A small fixed banner (below the existing `<SonnerToaster />`) reads
`swUpdatePending` from the context and shows:

```jsx
{swUpdatePending && (
  <div data-testid="sw-update-banner" className="fixed bottom-4 left-1/2 -translate-x-1/2 ...">
    App updated — reloading in a moment…
    <button onClick={() => window.location.reload()}>Reload now</button>
  </div>
)}
```

Auto-reloads after 10 seconds via a `useEffect` + `setTimeout` inside the same
banner component. Clicking "Reload now" reloads immediately.

**Why NotificationContext.jsx?** It already has `navigator.serviceWorker` usage
at L199. It already runs on auth init. It already follows the
`useRef` + cleanup pattern we need. Zero new infrastructure required.

**Lines added inside the effect:** ~15.
**Lines added for state + export:** ~3.
**Lines added in App.js (banner):** ~12.

---

### File 3 — `src/components/guards/ErrorBoundary.jsx`

**Where:** Inside `getDerivedStateFromError` (L13-15) and `render()` (L26-86).

**What:** Detect when the error is a `ChunkLoadError` (happens when a chunk file
returns 404 after a deploy) and auto-reload once instead of showing the red screen.

**Current `getDerivedStateFromError`:**
```js
static getDerivedStateFromError(error) {
  return { hasError: true, error };
}
```

**After fix:**
```js
static getDerivedStateFromError(error) {
  // BUG-597: ChunkLoadError = a hashed JS chunk file 404'd after a new deploy.
  // Auto-reload once (retry=1 guard prevents infinite loop).
  const isChunkError = error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Loading CSS chunk');
  if (isChunkError) {
    const alreadyRetried = window.location.search.includes('retry=1');
    if (!alreadyRetried) {
      window.location.replace(window.location.href + (window.location.search ? '&' : '?') + 'retry=1');
      return { hasError: false, error: null }; // suppress red screen — reload is coming
    }
  }
  return { hasError: true, error };
}
```

**What this does in plain language:**
- When a chunk file fails to load (404), React throws a `ChunkLoadError`
- If this is the FIRST failure (no `?retry=1` in the URL), silently reload the page
  with `?retry=1` appended to the URL
- On reload, the browser fetches the fresh `index.html` and the correct new chunks
- If it fails again after the retry (user is truly offline), show the existing
  red "Something went wrong" screen — no infinite loop

**Lines added:** ~12 inside the existing class. No new imports.

---

## Full Scope Summary

| # | File | What's added | Lines | Touches existing logic? |
|---|------|-------------|:-----:|:---:|
| E1 | `public/firebase-messaging-sw.js` | `install` + `activate` event handlers | +8 | NO |
| E2 | `src/contexts/NotificationContext.jsx` | `swUpdatePending` state + 3 SW listeners + export | +18 | NO — added inside existing init effect |
| E3 | `src/App.js` | Update banner component reading `swUpdatePending` | +12 | NO — additive after `<SonnerToaster />` |
| E4 | `src/components/guards/ErrorBoundary.jsx` | ChunkLoadError → auto-reload-once in `getDerivedStateFromError` | +12 | MINIMAL — replaces 1 line with a conditional block |

**Total:** ~50 lines across 4 files. Zero financial logic. Zero R5 hotspots.

---

## Data Flow After Fix

```
SCENARIO A — Fresh Deploy, App Running
───────────────────────────────────────
1. New build deployed → new firebase-messaging-sw.js served
2. Browser detects new SW → starts installing
3. NEW: skipWaiting() fires → new SW skips waiting, activates immediately
4. NEW: clients.claim() fires → all open tabs now controlled by new SW
5. NEW: controllerchange event fires in app → window.location.reload()
6. NEW: "App updated — reloading in a moment…" toast shows for ~1s
7. Page reloads → fresh index.html served → new chunks load → app runs ✅

SCENARIO B — Stale index.html (PWA navigation cache hits old chunks)
────────────────────────────────────────────────────────────────────
1. PWA opens from home screen → stale index.html references old chunk hash
2. Old chunk file not on server → 404 → React throws ChunkLoadError
3. NEW: ErrorBoundary.getDerivedStateFromError detects ChunkLoadError
4. NEW: No ?retry=1 in URL → auto-reload with ?retry=1
5. Browser fetches fresh index.html (no-cache) → correct chunks load → app runs ✅
6. If still fails after retry → red "Something went wrong" screen (existing) — no loop
```

---

## Owner Decisions — ALL LOCKED

| OD | Value |
|----|-------|
| OD-597-01 | Toast + auto-reload after 10s |
| OD-597-02 | Auto-reload once with `?retry=1` guard |

---

## Risk Classification

| Criterion | Assessment |
|-----------|-----------|
| Financial logic? | NO |
| R5 hotspot? | NO |
| Regression risk | LOW — E1-E3 fully additive; E4 adds 1 conditional branch to existing error handler |
| Service worker scope | MEDIUM — touches the only registered SW; any SW bug could affect push notifications |
| Risk | **MEDIUM** (SW changes affect all clients; but both additions are isolated and reversible) |

---

## Files WILL NOT Touch

`orderTransform.js` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx` · `DashboardPage.jsx` ·
`firebase.js` (registration code untouched) · any service · any transform · any financial logic

---

Gate 2: **COMPLETE**
Gate 3: Awaiting "BUG-597 Gate 3 GO" → Implementation Plan
