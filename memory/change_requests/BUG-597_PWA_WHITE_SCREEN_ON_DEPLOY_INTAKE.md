# BUG-597 — PWA White Screen / App Freeze on Every Production Deploy

**Registered:** 2026-10-19
**Type:** BUG
**Severity:** P1 — HIGH
**Risk:** HIGH
**Area:** PWA / Service Worker / Deployment
**Sprint:** oct_cr_batch
**Status:** GATE_1_INTAKE_COMPLETE
**Related:** CR-386 (PWA install — manifest/icons), BUG-560 (Firebase async unsupported-browser)

---

## Symptom

Every time a production build is deployed, ALL installed PWA clients simultaneously
show a white/blank screen and the app freezes completely. Users cannot recover
without manually closing and reopening the app (or clearing the browser cache).

**Expected behaviour:** Clients should see a "New version available — tap to update"
prompt. Tapping it reloads the app with the new version seamlessly.

**Actual behaviour:** App freezes with a white screen. No update prompt ever appears.

---

## Duplicate Check

**DISTINCT.**
- `CR-386` — PWA install support (manifest.json + icons). Scope: making the app
  installable. Does NOT touch service worker update lifecycle. Closed.
- `CR-054` — Training Sandbox (service worker mutation interception). Entirely
  different scope (offline mock mutations). Placeholder only.
- No prior bug for SW update flow / white screen on deploy found in BUG_TRACKER.md
  or registry.json.

---

## Code Reality Check

```bash
grep -rn "skipWaiting|controllerchange|waitingWorker|ChunkLoadError|update.*available" \
  /app/frontend/src/ /app/frontend/public/firebase-messaging-sw.js
```

**Code Reality: NONE.** No skipWaiting, no controllerchange listener, no update
banner, no ChunkLoadError recovery anywhere in the codebase.

---

## Root Cause (confirmed by investigation 2026-10-19)

Three compounding gaps:

### Gap A — Service worker has no update activation flow

`public/firebase-messaging-sw.js` is the only registered service worker (registered
via `firebase.js:68` at scope `/`). It handles background push notifications only.
It has:
- **No `skipWaiting()` call** — new SW version downloads, enters "waiting" state,
  and never activates. The old SW stays in control indefinitely (until all tabs
  are closed).
- **No `clients.claim()`** — even if skipWaiting fired, existing open tabs
  would not be immediately adopted.

### Gap B — No update detection in the React app

`index.js` has zero service worker registration. CRA generates a
`workbox`-based `service-worker.js` at build time (confirmed in
`react-scripts/config/webpack.config.js:709`) but it is **never registered**.
The app has no:
- `navigator.serviceWorker.ready` check for a `.waiting` worker
- `controllerchange` event listener → `window.location.reload()`
- "New version available" banner/toast in `NotificationContext.jsx` or `App.js`

### Gap C — No ChunkLoadError recovery

CRA produces content-hashed JS chunks (e.g. `main.abc123.js`). When a new build
is deployed, the production server replaces all chunks with new hash names.
If a PWA client has a cached (or navigation-cached) `index.html` pointing to old
chunk hashes, fetching those chunks returns 404 → React never mounts →
**white screen with no recovery**.

No global `ChunkLoadError` boundary exists anywhere in `src/`.

### Combined failure sequence

```
1. New build deployed → server replaces build/ with new hashed chunk files
2. PWA client opens → browser serves new index.html (Cache-Control: no-cache)
   OR stale index.html from PWA navigation cache (Chrome application cache)
3. index.html references new chunk hashes
4. Old chunk files are gone from server → 404
5. React never mounts → white screen
   — No ChunkLoadError handler → no auto-retry
   — No SW update prompt → user has no guided recovery path
   — New SW is waiting but never activates → next launch may repeat the issue
```

---

## Evidence

- **Source:** OWNER-REPORTED (2026-10-19) — "whenever we deploy production all clients
  start seeing white screen in PWA app, ideally they should be asked to update app,
  i mean app totally freeze"
- **Confidence:** CONFIRMED — code traced (no skipWaiting, no update flow, no error boundary)
- **Investigation report:** `investigations/INV-TRIPLE-OCT19_INVESTIGATION_REPORT_2026_10_19.md` §Issue 2

---

## Blast Radius

| File | Change needed | Risk |
|------|--------------|------|
| `public/firebase-messaging-sw.js` | Add `skipWaiting()` on `activate` + `clients.claim()` | LOW — additive |
| `src/contexts/NotificationContext.jsx` | Add SW update check + `controllerchange` reload | LOW — additive |
| `src/index.js` OR `src/App.js` | Add ChunkLoadError global handler (ErrorBoundary or `window.onerror`) | LOW — additive |

- **Files WILL change:** 3 files (none are R5 hotspots)
- **Files WILL NOT touch:** `orderTransform.js`, `CollectPaymentPanel.jsx`, any financial logic
- **Scope:** SMALL (3 files, ~20–30 lines total)
- **Hotspot:** NO
- **Fast Lane eligible:** NO (3 files; but could split into 2 Fast Lanes if owner prefers)

---

## Risk Classification

| Attribute | Value |
|-----------|-------|
| Risk | HIGH |
| Financial touch? | NO |
| R5? | NO |
| Regression risk | LOW — all changes are additive guards |
| Fast Lane eligible | NO (3 files) |

Risk is HIGH because every production deploy currently breaks ALL clients simultaneously.

---

## Open Decisions

**OD-597-01:** Update prompt UX — how should the "new version available" message appear?
- **(A — recommended):** Subtle toast at bottom: "App updated — tap to reload" with a
  Reload button. Auto-reloads after 10 s if ignored.
- **(B):** Full-screen overlay: "New version available. Please update to continue."
  Blocks use until user taps.
- **(C):** Silent auto-reload — no prompt, just reloads immediately when new SW activates.

**OD-597-02:** ChunkLoadError recovery — what should happen when a chunk 404s?
- **(A — recommended):** Auto-reload the page once (with a `?retry=1` guard to
  prevent infinite loops). Show a brief toast "Refreshing app…" before reload.
- **(B):** Show an error screen "Something went wrong. Please refresh." with a
  manual Refresh button.

---

## Gate Status

- Gate 1: **COMPLETE** (this document)
- Gate 2: Ready — awaiting "BUG-597 Gate 2 GO"
- Gate 3: Not started
- Gate 4 GO: Not given
