# BUG-621 — Intake: PWA Update Banner Never Shows When New Version Releases

**Date:** 2026-10-26  
**Reported by:** Owner  
**Source:** OWNER-REPORTED  
**Duplicate check:** DISTINCT from BUG-597 (BUG-597 IMPLEMENTED the update mechanism — BUG-621 is a defect IN that implementation). Related: BUG-597 (GATE_5A_IMPLEMENTED, oct_cr_batch).  
**Code Reality:** FULL — `self.skipWaiting()` in SW install handler (firebase-messaging-sw.js L82) architecturally prevents `reg.waiting` from ever being set, so `setSwUpdatePending(true)` is never called and the banner never renders.

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

- **OD-621-01:** Should the 10-second auto-reload timer (`App.js L132`) be kept? (Recommendation: YES — users who ignore the banner still get updated automatically)
- **OD-621-02:** On iOS Safari PWA, `statechange` on `installing` may behave differently — should we add a `visibilitychange` check as fallback? (Recommendation: YES — add `document.addEventListener('visibilitychange', () => { if (reg?.waiting) setSwUpdatePending(true); })`)

## Gate Status

- Gate 0 (Intake): **COMPLETE** (this document)
- Gate 2 (Impact Analysis): Not started
- Gate 3 (Implementation Plan): Not started
- Gate 4 GO: Pending (owner approval)
