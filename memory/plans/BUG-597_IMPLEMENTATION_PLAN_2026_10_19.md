# BUG-597 — Implementation Plan (Gate 3)
## PWA White Screen on Deploy — Service Worker Update Flow + ChunkLoadError Recovery

**Date:** 2026-10-19
**Stage:** Gate 3 — Implementation Plan
**Author:** Planning Agent (AGENT_PROMPT_ALPHA v0.7 Role 2)
**IA reference:** `impact/BUG-597_IMPACT_ANALYSIS_2026_10_19.md`
**Risk:** MEDIUM
**Sprint:** oct_cr_batch

---

## Decisions Locked (from Gate 2)

| OD | Value |
|----|-------|
| OD-597-01 | Toast banner + auto-reload after 10 s |
| OD-597-02 | Auto-reload once with `?retry=1` guard (no infinite loop) |

---

## Scope Lock

**Files WILL change (4 total):**
1. `public/firebase-messaging-sw.js`
2. `src/contexts/NotificationContext.jsx`
3. `src/App.js`
4. `src/components/guards/ErrorBoundary.jsx`

**Files WILL NOT touch:**
`orderTransform.js` · `CollectPaymentPanel.jsx` · `OrderEntry.jsx` · `DashboardPage.jsx` ·
`firebase.js` (SW registration code untouched) · any service · any transform · any financial logic

---

## Execution Order

E1 → E2 → E3 → E4 (each independent — may be applied in parallel if desired)

---

## Edit 1 — `public/firebase-messaging-sw.js`

**Anchor:** End of file, after the closing `});` of the `notificationclick` handler (line 77).

**Why:** Tells the browser to activate a newly downloaded version of this file
immediately (no waiting) and take control of all open tabs at once.

**Current (lines 76-78):**
```js
  );
});

```

**New (insert after line 77 — the closing `});`):**
```js
  );
});

// BUG-597: skip the waiting phase so a new SW version activates immediately
// on the next page open, instead of sitting idle until all tabs are closed.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// BUG-597: claim all already-open tabs so the newly-activated SW controls
// them right away, allowing the controllerchange event to fire in the app.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

**Lines added:** +9 (all new, zero existing lines changed)

---

## Edit 2 — `src/contexts/NotificationContext.jsx` (3 parts)

### Part A — New state declaration

**Anchor:** After `const lastNotifTimeRef = useRef(0);` (line 68).

**Current (line 68):**
```js
  const lastNotifTimeRef = useRef(0);
```

**New (insert after line 68):**
```js
  const lastNotifTimeRef = useRef(0);
  const [swUpdatePending, setSwUpdatePending] = useState(false); // BUG-597: true when a new SW version is waiting to activate
```

---

### Part B — SW update detection inside existing init effect

**Anchor:** Inside the init `useEffect` (L178-206), after the
`navigator.serviceWorker?.addEventListener('message', handleSWMessage);` line (line 199),
before the `return () => {` cleanup block (line 201).

**Current (lines 199-205):**
```js
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
```

**New (replace lines 199-206):**
```js
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // BUG-597: detect a waiting SW (already installed before this mount)
    // and watch for one arriving while the app is running.
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.waiting) setSwUpdatePending(true);
        reg.addEventListener('updatefound', () => {
          if (reg.waiting) setSwUpdatePending(true);
        });
      });
      // BUG-597: when the new SW takes over, reload to load the fresh build.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    return () => {
      if (foregroundUnsubRef.current) foregroundUnsubRef.current();
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
```

**Lines added:** +10 inside existing effect

---

### Part C — Export `swUpdatePending` from context value

**Anchor:** The `value` useMemo object (lines 250-272).

**Current (line 260 area — `simulateNotification` is last key):**
```js
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,       // CR-440
    setNotificationsEnabled,    // CR-440
    dismissNotification,
    clearAll,
    markRead,
    simulateNotification: processNotification,
  }), [
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    clearAll,
    markRead,
    processNotification,
  ]);
```

**New:**
```js
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,       // CR-440
    setNotificationsEnabled,    // CR-440
    dismissNotification,
    clearAll,
    markRead,
    simulateNotification: processNotification,
    swUpdatePending,            // BUG-597
  }), [
    notifications,
    unreadCount,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    dismissNotification,
    clearAll,
    markRead,
    processNotification,
    swUpdatePending,            // BUG-597
  ]);
```

**Lines added:** +2 (one in object, one in deps array)

---

## Edit 3 — `src/App.js` (2 parts)

### Part A — Add `useNotifications` import

**Anchor:** Line 93 — `import { AppProviders } from "./contexts";`

**Current (line 93):**
```js
import { AppProviders } from "./contexts";
```

**New:**
```js
import { AppProviders, useNotifications } from "./contexts"; // BUG-597: +useNotifications for SwUpdateBanner
```

---

### Part B — Add `SwUpdateBanner` component + render it

**Anchor:** After the `AppTitleSync` function definition (ends around line 122).
Insert new function there. Then inside `App()`, add `<SwUpdateBanner />` after `<AppTitleSync />`.

**Current (lines 114-129):**
```jsx
function AppTitleSync() {
  const { restaurant } = useRestaurant();
  useEffect(() => {
    document.title = restaurant?.name
      ? `${restaurant.name} · MyGenie POS`
      : "MyGenie POS";
  }, [restaurant?.name]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppTitleSync />
        <div className="App">
```

**New:**
```jsx
function AppTitleSync() {
  const { restaurant } = useRestaurant();
  useEffect(() => {
    document.title = restaurant?.name
      ? `${restaurant.name} · MyGenie POS`
      : "MyGenie POS";
  }, [restaurant?.name]);
  return null;
}

// BUG-597: shows when a new SW version is ready; auto-reloads after 10 s.
// Rendered inside AppProviders so it can read NotificationContext.
function SwUpdateBanner() {
  const { swUpdatePending } = useNotifications();
  useEffect(() => {
    if (!swUpdatePending) return;
    const timer = setTimeout(() => window.location.reload(), 10000);
    return () => clearTimeout(timer);
  }, [swUpdatePending]);
  if (!swUpdatePending) return null;
  return (
    <div
      data-testid="sw-update-banner"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#18181b', color: '#fff', borderRadius: 8,
        padding: '10px 18px', display: 'flex', alignItems: 'center',
        gap: 12, zIndex: 9999, fontSize: 13, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        whiteSpace: 'nowrap',
      }}
    >
      App updated — reloading shortly
      <button
        data-testid="sw-update-reload-btn"
        onClick={() => window.location.reload()}
        style={{
          background: '#329937', color: '#fff', border: 'none',
          borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
          fontSize: 12, fontWeight: 600,
        }}
      >
        Reload now
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppTitleSync />
        <SwUpdateBanner /> {/* BUG-597 */}
        <div className="App">
```

**Lines added:** +28 (new function + one JSX line inside App)

---

## Edit 4 — `src/components/guards/ErrorBoundary.jsx`

**Anchor:** `getDerivedStateFromError` method (lines 13-15).

**Why:** When a JS chunk file 404s after a deploy, React throws a `ChunkLoadError`.
The boundary currently shows the red error screen. New behaviour: auto-reload
once (adding `?retry=1`) so the browser fetches the fresh build silently.
If it still fails after the retry, the existing red screen is shown — no loop.

**Current (lines 13-15):**
```js
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
```

**New:**
```js
  static getDerivedStateFromError(error) {
    // BUG-597: ChunkLoadError = a hashed JS chunk 404'd after a new deploy.
    // Auto-reload once. The ?retry=1 guard prevents an infinite reload loop.
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk');
    if (isChunkError && !window.location.search.includes('retry=1')) {
      const sep = window.location.search ? '&' : '?';
      window.location.replace(window.location.href + sep + 'retry=1');
      return { hasError: false, error: null }; // reload in progress — suppress red screen
    }
    return { hasError: true, error };
  }
```

**Lines added:** +10 (replaces the 1-line return with a conditional block)

---

## Full Scope at a Glance

| Edit | File | Anchor | Lines |
|------|------|--------|:-----:|
| E1 | `firebase-messaging-sw.js` | After L77 (end of notificationclick) | +9 |
| E2a | `NotificationContext.jsx` | After L68 (`lastNotifTimeRef`) | +1 |
| E2b | `NotificationContext.jsx` | After L199 (inside init effect) | +10 |
| E2c | `NotificationContext.jsx` | L250-272 (value useMemo) | +2 |
| E3a | `App.js` | L93 (import line) | +1 word |
| E3b | `App.js` | After L122 (AppTitleSync) + L128 (render) | +29 |
| E4 | `ErrorBoundary.jsx` | L13-15 (getDerivedStateFromError) | +10 |
| **Total** | | | **~62 lines** |

---

## Verification Matrix

| # | Edit | What to verify | How | Auto? |
|---|------|---------------|-----|:---:|
| V1 | E1 | `install` and `activate` events present in SW file | grep | YES |
| V2 | E1 | `skipWaiting()` and `clients.claim()` called | grep | YES |
| V3 | E2a | `swUpdatePending` state declared | grep | YES |
| V4 | E2b | SW ready + updatefound + controllerchange listeners inside init effect | grep | YES |
| V5 | E2c | `swUpdatePending` in context value + deps | grep | YES |
| V6 | E3a | `useNotifications` in contexts import | grep | YES |
| V7 | E3b | `SwUpdateBanner` function defined + rendered in JSX | grep | YES |
| V8 | E3b | `data-testid="sw-update-banner"` present | grep | YES |
| V9 | E3b | Auto-reload `setTimeout(10000)` present | grep | YES |
| V10 | E4 | `ChunkLoadError` check in getDerivedStateFromError | grep | YES |
| V11 | E4 | `retry=1` guard present (no infinite loop) | grep | YES |
| V12 | ALL | `yarn build` exit 0, 0 new errors | Build | YES |
| V13 | E3b | Banner invisible on normal load (swUpdatePending=false) | Browser | NO |
| V14 | E3b | Banner visible + countdown when SW update simulated | Browser | NO |
| V15 | E4 | Normal errors still show red screen (non-ChunkLoad) | Browser | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-597 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 4 files listed with BUG-597 IMPL + date
- [ ] Code markers: // BUG-597 comment in every modified file (included in all edits above)
- [ ] Compile check: yarn build exit 0, 0 new warnings from these changes
```

---

## Implementation Notes for Coding Agent

1. **E1 anchor:** Search for the last `});` in `firebase-messaging-sw.js` — it closes
   the `notificationclick` handler. Append after it. Do NOT touch the Firebase
   `onBackgroundMessage` or `notificationclick` blocks.

2. **E2b timing:** The `navigator.serviceWorker.ready` promise resolves asynchronously.
   There is no `await` inside the `useEffect` — the `.then()` callback runs
   asynchronously but that is correct and intentional. The `controllerchange`
   listener is registered synchronously on `navigator.serviceWorker` (not inside
   the `.ready` promise) to catch the reload event reliably.

3. **E3b — `SwUpdateBanner` uses `useNotifications`:** This works because it is
   rendered inside `<AppProviders>` (which wraps `NotificationProvider`). Do NOT
   move `<SwUpdateBanner />` outside `<AppProviders>`.

4. **E4 — `window.location.replace`:** Use `replace` not `href =` so the retry
   URL does not create a browser history entry. The user pressing Back would go
   to the page before the app, not to a loop.

5. **No new packages:** All browser APIs (`navigator.serviceWorker`, `window.location`,
   `setTimeout`) are already available. Zero new npm dependencies.

---

Planning complete: BUG-597
Stage: Gate 2 + Gate 3 COMPLETE
Code reality: NONE
Files WILL change: 4
Lines total: ~62
Owner decisions: ALL LOCKED
Next: Gate 4 GO → Implementation
