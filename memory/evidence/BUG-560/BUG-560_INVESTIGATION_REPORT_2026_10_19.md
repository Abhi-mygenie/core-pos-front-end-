# BUG-560 Investigation Report
## Firebase getMessaging() async unsupported-browser rejection escapes try/catch

**ID:** BUG-560
**Date:** 2026-10-19
**Steps used:** 8/10
**Confidence:** HIGH — reproduced + fix verified

---

## 1. Summary
**Root cause:** `getMessaging(app)` internally calls `isWindowSupported()` which returns a Promise. On unsupported browsers, that Promise rejects with `messaging/unsupported-browser` on the next microtask — completely bypassing the synchronous try/catch at `firebase.js:21-27`.

**Classification:** FE_BUG (wrong error-handling pattern)

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| 1 | `getMessaging()` fires an async rejection that bypasses sync try/catch | Node.js reproduction: call getMessaging in unsupported env, listen for unhandledRejection | 2 | **CONFIRMED** | Sync catch gets `"navigator is not defined"`, async rejection fires `messaging/unsupported-browser` separately |
| 2 | `isSupported()` guard before `getMessaging()` eliminates the rejection | Node.js: async init with `await isSupported()` check | 1 | **CONFIRMED** | Zero unhandled rejections after 2s wait |
| 3 | Consumers tolerate `messaging = null` (no race on async init) | Code trace: all 3 consumers (requestFCMToken, onForegroundMessage, export) | 2 | **CONFIRMED** | All have `if (!messaging)` guards; nobody imports `messaging` directly; no import-time reads |

---

## 3. Data Flow Trace

```
Module load (firebase.js:21-27)
  → initializeApp(config)                    → OK, returns app
  → getMessaging(app)                        → TWO things happen:
      SYNC:  throws "navigator is not defined"  → CAUGHT by try/catch ✅
      ASYNC: internal isWindowSupported().then(ok => { if (!ok) throw })
             → Promise rejects with "messaging/unsupported-browser"
             → NOBODY catches this                                    ❌ ← THE BUG
             → Browser fires unhandledrejection event
             → CRA dev: red error overlay on login page
             → Production: console.error only, no user impact
```

**BREAK POINT:** Line 23 `messaging = getMessaging(app)` — sync try/catch cannot catch an internal async rejection.

---

## 4. Evidence Artifacts

All saved to: `/app/memory/evidence/BUG-560/`

- **Reproduction (Node.js):**
  - `initializeApp`: OK
  - `getMessaging`: SYNC catch fires ("navigator is not defined")
  - 1 microtask later: `UNHANDLED REJECTION: FirebaseError: messaging/unsupported-browser`

- **Fix verification (Node.js):**
  - `isSupported()` → `false`
  - `getMessaging()` never called
  - 2s wait: zero unhandled rejections

- **Firebase version:** 13.0.0
- **`isSupported` available:** YES (exported from `firebase/messaging`, returns Promise)

---

## 5. Recommendations

**Classification:** FE_FIX

**Fix (1 file, ~8 lines):**
```js
// firebase.js — replace sync init block (L17-27) with:
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('[Firebase] App init failed:', error.message);
}

if (app) {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      console.log('[Firebase] Messaging initialized');
    } else {
      console.log('[Firebase] Messaging not supported in this browser');
    }
  }).catch((err) => {
    console.warn('[Firebase] isSupported check failed:', err.message);
  });
}
```

**Why this works:**
- `isSupported()` resolves `false` on unsupported browsers → `getMessaging()` never called → no async rejection
- `isSupported()` resolves `true` on supported browsers → `getMessaging()` called safely
- All 3 consumers already handle `messaging = null` with early returns — zero downstream changes needed

**Planning skip eligible:** YES
- ≤10 lines changed
- 1 file only (`src/config/firebase.js`)
- NOT a hotspot file (R5 list)
- NOT financial logic (R6)
- No API, transform, state management, localStorage, provider order, socket, or env change

**Owner must approve skip:** `DIRECT_BUG_FIX` path.

---

## 6. Retroactive Candidates
NONE.
