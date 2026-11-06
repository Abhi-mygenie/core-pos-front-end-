# BUG-560 — Impact Analysis (Gate 2)
## Firebase getMessaging() async unsupported-browser rejection escapes try/catch

**ID:** BUG-560
**Date:** 2026-10-19
**Code Reality:** NONE
**Conflict Pre-Check:** CLEAN — no other open item touches `src/config/firebase.js`
**Risk:** LOW
**Risk Reason:** 1 file, no API/financial/state/localStorage/socket change, not R5 hotspot

---

## 1. Root Cause (from Investigation, HIGH confidence)

`getMessaging(app)` at `firebase.js:23` internally calls `isWindowSupported()` which returns a Promise. On unsupported browsers, that Promise rejects with `messaging/unsupported-browser` on the next microtask — bypassing the synchronous try/catch at L21-27.

**Two errors fire:**
1. **Sync** — `"navigator is not defined"` or similar → caught by try/catch ✅
2. **Async** — `FirebaseError: messaging/unsupported-browser` → unhandled ❌

**Impact:**
- Dev/preview: CRA red error overlay blocks login page
- Production: `console.error` only, no user-visible impact (push was never going to work anyway)

---

## 2. Data Flow

```
firebase.js (module load, L17-27)
  ├── initializeApp(config) → app (sync, always succeeds with valid config)
  └── getMessaging(app) → messaging OR throws
        ├── SYNC throw → caught, messaging = null
        └── ASYNC rejection → unhandled (THE BUG)

Consumers (all lazy, not at import time):
  ├── requestFCMToken() [LoginPage.jsx:56, on button press]
  │     └── if (!messaging) return null  ← SAFE
  ├── onForegroundMessage() [NotificationContext.jsx:187, in useEffect after auth]
  │     └── if (!messaging) return () => {} ← SAFE
  └── export { messaging } [nobody imports directly] ← SAFE
```

---

## 3. Fix Approach

Import `isSupported` from `firebase/messaging`. Replace sync init block with:
1. `initializeApp()` stays synchronous (always works)
2. `isSupported().then(...)` — async guard before `getMessaging()`
3. `messaging` remains `null` until the Promise resolves (on supported browsers, resolves in <1ms)

**Why async is safe:** All 3 consumers read `messaging` inside function bodies at call time (user click / useEffect), never at import time. They already handle `null` with early returns.

---

## 4. Affected Files

| # | File | Lines | Change | Risk |
|---|------|-------|--------|------|
| 1 | `src/config/firebase.js` | L3, L17-27 | Add `isSupported` import + async init guard | LOW |

**Files WILL NOT touch:**
- `NotificationContext.jsx` (no change needed — already handles null)
- `LoginPage.jsx` (no change needed — already handles null)
- `firebase-messaging-sw.js` (service worker, separate file)
- Any transform, service, component, or R5 hotspot

---

## 5. Owner Decisions

**None required.** All decisions locked at intake (OD-555-07, E-3=b). Fix shape confirmed by investigation.

---

## 6. Open Gaps Resolved

- **OG-AUDIT-F4** → will be CLOSED by this fix (pre-audit blocker removed)
