# BUG-621 Investigation Report: PWA Update Banner Never Shows

**Date:** 2026-11-09  
**Role:** INVESTIGATION  
**Steps used:** 4/10  
**Confidence:** HIGH (code trace + SW lifecycle analysis)

---

## 1. Summary

**Root cause:** FE_BUG — The SW update detection code in `NotificationContext.jsx` is inside a `useEffect` gated by `isAuthenticated`. It only runs AFTER login. PWA users land on the login page after a deploy → `isAuthenticated = false` → early return at line 214 → detection never runs → `swUpdatePending` stays `false` → `SwUpdateBanner` never renders.

**Secondary finding:** The service worker is only registered inside `requestNotificationPermission()` (`firebase.js:82`), which requires notification permission. If notifications were never granted, `navigator.serviceWorker.ready` (used in the detection code) will never resolve. For PWA users this is less of a concern since the SW persists from a prior session.

**Classification:** CODE_ERROR (BUG-597 implementation placed SW detection inside the wrong useEffect)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| 1 | `self.skipWaiting()` in SW install handler prevents `reg.waiting` from being set (original BUG-621 intake diagnosis) | Code trace `firebase-messaging-sw.js` | 1 | **ELIMINATED** — `skipWaiting()` was already removed from install handler; message-based skipWaiting pattern is correctly implemented (L80-83) |
| 2 | SW update detection gated behind `isAuthenticated` | Code trace `NotificationContext.jsx:214` | 1 | **CONFIRMED** — `if (!isAuthenticated \|\| initializedRef.current) return;` gates ALL code including SW detection (L247-269) |
| 3 | SW only registered inside `requestNotificationPermission()` | Code trace `firebase.js:82` | 1 | CONFIRMED (secondary) — for PWA users SW persists, but for browser-only users who never granted notifications there is no SW to detect updates from |
| 4 | `navigator.serviceWorker.ready` may hang without a registered SW | API analysis | 1 | CONFIRMED — `.ready` only resolves when an active SW controls the page; `getRegistration()` is safer (returns undefined) |

---

## 3. Data Flow Trace

```
CURRENT (BROKEN) FLOW:

App mount
  → NotificationProvider mount
    → useEffect([isAuthenticated]) at L213
      → L214: if (!isAuthenticated || initializedRef.current) return;  ← EARLY EXIT on login page
      → Lines 247-269 (SW detection) NEVER EXECUTE
      → reg.waiting never checked
      → swUpdatePending stays false
      → SwUpdateBanner (App.js:117) renders null

User logs in → isAuthenticated = true → useEffect re-runs
  → L248: navigator.serviceWorker.ready.then(...)
  → reg.waiting checked → BUT by now the update may have been missed
    (or user was already on a stale version with no prompt)
```

**BREAK POINT:** `NotificationContext.jsx` line 214 — `if (!isAuthenticated) return`

---

## 4. Affected Files

| File | Line(s) | Issue |
|------|---------|-------|
| `src/contexts/NotificationContext.jsx` | L213-278 | SW detection (L247-269) trapped inside auth-gated useEffect |
| `src/App.js` | L117-152 | `SwUpdateBanner` component — correct; depends on `swUpdatePending` which is never set to `true` |
| `public/firebase-messaging-sw.js` | L80-89 | Correct — `skipWaiting` via message, `clients.claim()` on activate |
| `src/config/firebase.js` | L82-84 | SW only registered inside `requestNotificationPermission()` — secondary issue |
| `src/index.js` | L1-12 | No SW registration at startup — secondary issue |

---

## 5. Recommended Fix

**Pattern: Extract SW update detection into an independent `useEffect([], [])`**

### Change 1 — `NotificationContext.jsx`

Add a NEW `useEffect` BEFORE the auth-gated one (around line 210):

```js
// NEW: runs on mount, INDEPENDENT of auth
useEffect(() => {
  if (!navigator.serviceWorker) return;

  const hadController = !!navigator.serviceWorker.controller;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration('/').then((reg) => {
        if (reg?.waiting) { regRef.current = reg; setSwUpdatePending(true); }
      });
    }
  };

  const handleControllerChange = () => {
    if (hadController) window.location.reload();
  };

  navigator.serviceWorker.getRegistration('/').then((reg) => {
    if (!reg) return;
    regRef.current = reg;
    if (reg.waiting) setSwUpdatePending(true);
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

  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

Then REMOVE lines 236-269 (visibilitychange, SW detection, controllerchange, visibilitychange listener) from the existing auth-gated useEffect. The auth-gated effect keeps only: sound preload, foreground message listener, SW message listener.

### Key design decisions in the fix:

| Decision | Rationale |
|----------|-----------|
| `getRegistration('/')` instead of `.ready` | `.ready` hangs forever if no SW registered; `getRegistration` returns `undefined` gracefully |
| `hadController` guard on `controllerchange` | Prevents spurious reload on first-ever SW install (activate → `clients.claim()` fires controllerchange even with no prior controller) |
| Named handlers + cleanup | `controllerchange` listener was previously anonymous with no cleanup; StrictMode double-mount caused duplicate listeners |

### Scope: 1 file, ~40 lines. No hotspot files. No financial logic. MEDIUM risk.

---

## 6. Planning Skip Eligibility

- Lines changed: ~40
- Files: 1 (`NotificationContext.jsx`)
- Hotspot (R5): NO
- Financial (R6): NO
- **Eligible for direct bug fix: YES — pending owner approval**

---

## 7. Open Questions for Next Agent

- **OD-661-01 (from original intake):** Keep the 10-second auto-reload timer? (Recommendation: YES)
- **OD-661-02 (from original intake):** Add `visibilitychange` fallback for iOS Safari? (Recommendation: YES — included in proposed fix)
- **NEW OD-661-03:** Should the SW be registered at startup in `index.js` (without Firebase params) as a safety net for users who never granted notification permission? (Recommendation: DEFERRED — PWA users always have a prior registration)
