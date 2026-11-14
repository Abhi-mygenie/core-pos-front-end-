# QA Handover — BUG-597 — 2026-10-19

**Implementation agent:** IMPLEMENTATION (Role 3)
**Date:** 2026-10-19
**Status:** GATE_5A_IMPLEMENTED — yarn build exit 0, EXIT GATE 5/5 PASS

---

## §1 — Self-Verification (all PASS)

| # | Edit | File | Check | Result |
|---|------|------|-------|:---:|
| V1 | E1 | `firebase-messaging-sw.js` | `install` event + `skipWaiting()` present | ✅ |
| V2 | E1 | `firebase-messaging-sw.js` | `activate` event + `clients.claim()` present | ✅ |
| V3 | E2a | `NotificationContext.jsx` | `swUpdatePending` state declared (L69) | ✅ |
| V4 | E2b | `NotificationContext.jsx` | SW ready + updatefound + controllerchange listeners in init effect | ✅ |
| V5 | E2c | `NotificationContext.jsx` | `swUpdatePending` in context value + deps | ✅ |
| V6 | E3a | `App.js` | `useNotifications` in contexts import (L93) | ✅ |
| V7 | E3b | `App.js` | `SwUpdateBanner` function defined (L124) | ✅ |
| V8 | E3b | `App.js` | `data-testid="sw-update-banner"` present | ✅ |
| V9 | E3b | `App.js` | `setTimeout(reload, 10000)` present | ✅ |
| V10 | E4 | `ErrorBoundary.jsx` | `ChunkLoadError` / `Loading chunk` check present | ✅ |
| V11 | E4 | `ErrorBoundary.jsx` | `retry=1` infinite-loop guard present | ✅ |
| V12 | ALL | — | `yarn build` exit 0, 0 new errors | ✅ |

---

## §2 — Test Cases

### Scenario A — Update banner (requires simulating SW update)

Because the real SW update lifecycle requires a live deploy, these cases are
verified by **simulating** `swUpdatePending = true` in browser DevTools:

| TC | Steps | Expected |
|----|-------|----------|
| TC-1 | Open preview. Open DevTools Console. Run: `window.__testSwUpdate = true` then in React DevTools find `NotificationProvider` and set `swUpdatePending = true` | Dark banner slides up from bottom. Text: "App updated — reloading shortly" |
| TC-2 | With banner visible — wait 10 seconds | Page auto-reloads. Banner gone. App loads fresh. |
| TC-3 | With banner visible — click "Reload now" | Page reloads immediately. |
| TC-4 | Normal load with no SW update pending | Banner not visible anywhere on screen. Zero impact on normal usage. |
| TC-5 | `data-testid="sw-update-banner"` exists in DOM when pending | Element found in DevTools. |
| TC-6 | `data-testid="sw-update-reload-btn"` exists when pending | Button found in DevTools. |

### Scenario B — ChunkLoadError auto-reload

| TC | Steps | Expected |
|----|-------|----------|
| TC-7 | Open DevTools Console. Run: `throw Object.assign(new Error('Loading chunk 123 failed'), {name:'ChunkLoadError'})` (simulates chunk 404) | Page reloads with `?retry=1` appended to URL. |
| TC-8 | With `?retry=1` in URL — trigger same error again | Red "Something went wrong" screen shown. No reload loop. |
| TC-9 | Trigger a NON-chunk error (e.g. `throw new Error('generic error')`) | Existing red error screen shows (unchanged behaviour). |

### Regression Tests

| TC | Check | Why |
|----|-------|-----|
| TC-R1 | App loads normally on fresh visit (no banner, no error) | Banner must be invisible when `swUpdatePending = false` |
| TC-R2 | Push notifications still work (foreground + background) | SW changes must not break existing notification handlers |
| TC-R3 | `firebase-messaging-sw.js` still initialises Firebase messaging | `install`/`activate` additions must not affect the existing Firebase block |

---

## §3 — EXIT GATE

```
✅ 1. REGISTRY SYNC:     BUG-597 → GATE_5A_IMPLEMENTED in registry.json
✅ 2. BUG_TRACKER.MD:    row updated to GATE_5A_IMPLEMENTED
✅ 3. FILE_OWNERSHIP.MD: 4 files listed with BUG-597 IMPL + 2026-10-19
✅ 4. CODE MARKERS:      // BUG-597 in every modified file
✅ 5. COMPILE CHECK:     yarn build exit 0, 0 new errors or warnings from these changes
EXIT GATE: 5/5 PASS
```

---

## §4 — Credentials + Environment

- Preview: `https://pos-react-preview-4.preview.emergentagent.com`
- Login: `cashier@kunafamahal.com` / `Qplazm@10` or `owner@kunafamahal.com` / `Qplazm@10`

## §5 — Known Limitation

The Scenario A banner (SW update detection) requires a **real SW lifecycle event**
which only happens in production when you deploy a new build. Browser DevTools
simulation or a real deploy to `pos.mygenie.online` is needed to fully smoke
Scenario A in the browser. Scenario B (ChunkLoadError) can be tested via
the Console throw technique in TC-7 and TC-8.
