# BUG-621 — Intake: PWA Update Banner Never Shows When New Version Releases

**Date:** 2026-10-26  
**Reported by:** Owner  
**Source:** OWNER-REPORTED  
**Duplicate check:** DISTINCT from BUG-597 (BUG-597 IMPLEMENTED the update mechanism — BUG-621 is a defect IN that implementation). Related: BUG-597 (GATE_5A_IMPLEMENTED, oct_cr_batch).  
**Code Reality:** FULL — `self.skipWaiting()` in SW install handler (firebase-messaging-sw.js L82) architecturally prevents `reg.waiting` from ever being set, so `setSwUpdatePending(true)` is never called and the banner never renders.

> **2026-11-09 — REOPENED.** Root cause in this intake (`skipWaiting` on install) is STALE (already fixed). Revised root cause + owner decisions (MANUAL update, persistent banner, app-version check) in `investigations/BUG-621_INVESTIGATION_REVIEW_2026_11_09.md` §7-9. Intake to be revised by INTAKE agent.

---

## Description

When a new version of the POS app is deployed, the "App updated — reloading shortly" banner (implemented in BUG-597) is never shown in the **PWA** (installed app). In a web browser, a silent reload may occur, but users get no warning. In the PWA specifically (iOS/Android installed), the update can happen silently in the background while the app is closed, and when reopened the user may see the old version or a broken state — no banner, no reload prompt.

**User:** "we are not getting update button in PWA app when new update is coming. we have done a CR on this to handle in web browser and pwa app when new version is releases"

---

## Severity & Risk

- **Severity:** P1 — HIGH (deployment safety; every production release is affected; PWA users may run stale versions indefinitely)
- **Risk:** MEDIUM — 3 files; SW change requires re-testing update flow end-to-end
- **Fast Lane eligible:** NO — 3 files, SW architecture change
- **SLA:** Fix this sprint

---

## Root Cause (from investigation INV-3ISSUES-2026-10-26.md)

**Architectural conflict between `skipWaiting()` and `reg.waiting` detection:**

```
BUG-597 implementation:
  SW install: self.skipWaiting()           ← SW never enters 'waiting' state
  SW activate: self.clients.claim()
  App: if (reg.waiting) setSwUpdatePending(true)   ← reg.waiting is always null
  App: controllerchange → window.location.reload()  ← fires without showing banner
```

**Why the banner never shows:**
1. New SW downloads → `install` fires → `self.skipWaiting()` called immediately
2. SW skips `waiting` phase entirely → activates immediately
3. In NotificationContext: `if (reg.waiting) setSwUpdatePending(true)` → `reg.waiting = null` → condition is ALWAYS false
4. `updatefound` event fires → `installing` SW transitions directly to `active` (race condition; by the time the callback checks `reg.waiting`, it's already null)
5. `swUpdatePending` remains `false` → `SwUpdateBanner` never renders

**Why PWA is worse than browser:**
- Browser: `controllerchange → window.location.reload()` fires while tab is open → silent reload (no banner but at least user gets new version)
- PWA (backgrounded/frozen): When app is suspended by OS, JS event listeners freeze. New SW updates silently. When user opens app:
  - New SW is already active, `controllerchange` has already fired (and been missed)
  - `reg.waiting = null` (SW already took over)
  - No banner, no reload → user sees old cached assets served by new SW → possible broken state

---

## Evidence

- `public/firebase-messaging-sw.js` L81-82: `self.addEventListener('install', () => { self.skipWaiting(); })` — confirmed
- `src/contexts/NotificationContext.jsx` L237-241: `if (reg.waiting) setSwUpdatePending(true)` — called but always false due to skipWaiting
- `src/App.js` L128-161: `SwUpdateBanner` — renders correctly when `swUpdatePending=true`, but that state never becomes true
- **Confidence:** CONFIRMED (code trace + SW lifecycle analysis)

---

## Blast Radius

- **File 1:** `public/firebase-messaging-sw.js` — remove `skipWaiting()` from install; add message listener
- **File 2:** `src/contexts/NotificationContext.jsx` — add `reg.waiting.postMessage` call when banner shows
- **File 3:** `src/App.js` (SwUpdateBanner component) — add onClick to "Reload now" that calls postMessage
- **Scope:** SMALL (3 files, ~10 lines total)
- **Hotspot files touched:** NO

---

## Proposed Fix (Gate 3 — pending Gate 4 GO)

**Pattern change: user-controlled skipWaiting (correct PWA pattern)**

```js
// firebase-messaging-sw.js — REMOVE install handler + ADD message listener:
// REMOVE: self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('message', (event) => {
  if (event.data?.action === 'skipWaiting') {
    self.skipWaiting(); // BUG-621: triggered by user via "Reload now" button
  }
});
// KEEP activate handler (clients.claim stays)
```

```js
// NotificationContext.jsx — trigger skipWaiting on user click:
// When reg.waiting is detected, store reference:
let pendingReg = null;
if (reg.waiting) { pendingReg = reg; setSwUpdatePending(true); }
reg.addEventListener('updatefound', () => {
  const newWorker = reg.installing;
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && reg.waiting) { pendingReg = reg; setSwUpdatePending(true); }
  });
});
// Expose triggerSwUpdate via context
```

```js
// App.js SwUpdateBanner — call postMessage on click:
<button onClick={() => {
  pendingReg?.waiting?.postMessage({ action: 'skipWaiting' });
  window.location.reload();
}}>Reload now</button>
```

**After fix:**
- SW waits in `installed/waiting` state (does NOT skip automatically)
- `reg.waiting` is non-null → `setSwUpdatePending(true)` → banner shows ✅
- In PWA: when user opens app after background update, `reg.waiting` detected → banner shows ✅
- User clicks "Reload now" → `postMessage({ action: 'skipWaiting' })` → SW activates → `controllerchange` → reload ✅

---

## Open Questions

- **OD-661-01:** Should the 10-second auto-reload timer (`App.js L132`) be kept? (Recommendation: YES — users who ignore the banner still get updated automatically)
- **OD-661-02:** On iOS Safari PWA, `statechange` on `installing` may behave differently — should we add a `visibilitychange` check as fallback? (Recommendation: YES — add `document.addEventListener('visibilitychange', () => { if (reg?.waiting) setSwUpdatePending(true); })`)

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 3 (Implementation Plan): Not started
- Gate 4 GO: Pending (owner approval)

---
---

# BUG-621 — Intake v2 (REOPENED) — Manual app update with always-visible banner + no white screen on release

**Date:** 2026-11-09 · **Registered by:** INTAKE agent · **Source:** OWNER-REPORTED (banner still never shows after BUG-621/622 QA pass; white screen on release)
**Type:** BUG · **Severity:** P0 — owner upgrade 2026-11-09 (was P1) · **Risk:** HIGH (every release, all clients) · **Sprint:** nov_cr_batch
**Fast Lane eligible:** NO (3-4 files + hosting ask, owner design decisions)
**Supersedes:** v1 root cause above (`skipWaiting` on install) — STALE, already fixed in code.
**Investigation:** `investigations/BUG-621_INVESTIGATION_REPORT_2026_11_09.md` (uploaded) + `investigations/BUG-621_INVESTIGATION_REVIEW_2026_11_09.md` (§7-9, CLOSED)

## Description
1. "Update available" banner never appears in PWA / browser when a new version is released.
2. After a release, installed PWA clients can show a white screen / frozen app until the app is fully closed or cache cleared.

**Expected (owner, 2026-11-09):** On every release the user sees a **persistent, non-dismissible "New version available — Update now" banner** and updates **manually** by tapping it. No forced/automatic reload. App must never white-screen on release.

## Root cause (review, CLOSED)
- **Banner:** detection depends on a new SW entering `waiting`. `public/firebase-messaging-sw.js` is static (no build stamp, constant URL) → identical bytes every release → no `updatefound` / `reg.waiting` → `swUpdatePending` never true. Secondary: detection gated by `isAuthenticated` (`NotificationContext.jsx` L214); SW registered only after notification permission (`firebase.js:82`).
- **White screen:** stale/cached `index.html` references hashed bundles deleted by the new release → 404 → React never boots. `ErrorBoundary` ChunkLoadError reload (BUG-597) is inside the failed bundle → cannot run. SW has no fetch/cache handler → not the cause.
- Side issue: `controllerchange` listener has no `hadController` guard / cleanup → unexpected reload on first notification grant; duplicate listeners on re-login.

## Owner decisions (2026-11-09)
| ID | Decision |
|---|---|
| OD-661-01 | NO 10 s auto-reload timer — remove |
| OD-661-02 | YES re-check on app foreground (`visibilitychange`) |
| OD-661-03 | NOT NEEDED — SW registration at startup |
| OD-661-04 | MANUAL update; banner always visible until "Update now" tapped |
| OD-661-05 | NOT NEEDED — keep previous release files on server |
| OD-661-06 | App-version check (`version.json` build id) on load + foreground + interval |

## Scope (locked for Planning)
1. Hosting ask (DevOps/backend): `index.html` → `Cache-Control: no-cache`; `static/*` → `max-age=31536000, immutable`.
2. `public/index.html`: inline boot fallback — main bundle load failure → reload once with cache-buster.
3. Build: emit `version.json` (build id) — `package.json` `build` script (`craco build`) / `craco.config.js`.
4. `src/contexts/NotificationContext.jsx`: version check (load / visibilitychange / interval) → pending flag; un-gate from `isAuthenticated`; `hadController` guard + named `controllerchange` handler with cleanup.
5. `src/App.js` `SwUpdateBanner` (L117+): remove auto-timer (BUG-621/622); persistent banner + "Update now" → reload (`triggerSwUpdate` if SW waiting).

## Duplicate check
REOPEN of BUG-621 (same symptom, same banner). Related: BUG-597 (white screen on deploy — GATE_5A_IMPLEMENTED; its ChunkLoadError mitigation insufficient), BUG-622 (loop fix — auto-timer to be removed). Not a new ID.

## Code reality
PARTIAL — banner component, `swUpdatePending`, `triggerSwUpdate`, SW message-based `skipWaiting`, ErrorBoundary ChunkLoadError reload exist (BUG-597/621/622). Missing: app-version check, persistent manual banner, inline boot fallback, un-gated detection, controllerchange guard.

## Blast radius
Files: `public/index.html`, `src/App.js`, `src/contexts/NotificationContext.jsx`, build config (`package.json`/`craco.config.js`); optional `public/firebase-messaging-sw.js` untouched. No R5 hotspot, no financial logic. Scope: MEDIUM.

## Evidence
Code traces in review doc §1-3, §7. Pending (non-blocking): prod `Cache-Control` headers on `index.html`; DevTools "waiting worker" check after an FE-only release.

## Next
PLANNING Gate 2 (Impact Analysis).
