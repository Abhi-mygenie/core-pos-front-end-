# BUG-560 — Implementation Plan (Gate 3)
## Firebase getMessaging() async unsupported-browser rejection escapes try/catch

**ID:** BUG-560
**Date:** 2026-10-19
**Code Reality:** NONE
**Risk:** LOW
**Files WILL change:** `src/config/firebase.js` (1 file)
**Files WILL NOT touch:** NotificationContext.jsx, LoginPage.jsx, firebase-messaging-sw.js, any transform/service/component

---

## 1. Scope Lock

This plan changes exactly 1 file with 2 edit sites. No downstream consumer changes needed.

---

## 2. Edits

### E-1: Add `isSupported` to import (L3)

**Current (L3):**
```js
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
```

**New:**
```js
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
```

### E-2: Replace sync init block with async guarded init (L17-27)

**Current (L17-27):**
```js
// Initialize Firebase
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  console.log('[Firebase] Initialized successfully');
} catch (error) {
  console.error('[Firebase] Init failed:', error.message);
}
```

**New:**
```js
// Initialize Firebase
let app = null;
let messaging = null;

try {
  app = initializeApp(firebaseConfig);
  console.log('[Firebase] App initialized');
} catch (error) {
  console.error('[Firebase] App init failed:', error.message);
}

// BUG-560: async guard — getMessaging() fires an async rejection on unsupported
// browsers that bypasses sync try/catch. isSupported() checks first, skips safely.
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

**Net change:** +8 lines, −2 lines = +6 lines net. 1 file.

---

## 3. Execution Sequence

1. E-1 — add `isSupported` to import
2. E-2 — replace init block
3. Verify webpack compiles with 0 new warnings
4. Run verification matrix

---

## 4. Verification Matrix

| # | Check | How to Verify | Automated? |
|---|-------|---------------|:---:|
| V-1 | `isSupported` imported | `grep "isSupported" src/config/firebase.js` | YES |
| V-2 | `getMessaging` no longer called at top level | `grep -n "getMessaging" src/config/firebase.js` — only inside `.then()` callback | YES |
| V-3 | `// BUG-560` code marker present | `grep "BUG-560" src/config/firebase.js` | YES |
| V-4 | Webpack compiles, 0 new warnings | `yarn build` exit 0 | YES |
| V-5 | Unsupported browser: no unhandled rejection | Node.js reproduction script (from investigation) | YES |
| V-6 | Supported browser: messaging initializes | Browser console shows `[Firebase] Messaging initialized` | NO (browser) |
| V-7 | `requestFCMToken` still works (returns null when messaging=null) | Code review: `if (!messaging)` guard at L34 unchanged | YES |
| V-8 | `onForegroundMessage` still works (returns noop when messaging=null) | Code review: `if (!messaging)` guard at L109 unchanged | YES |
| V-9 | OG-AUDIT-F4 closeable | Fix eliminates the `messaging/unsupported-browser` unhandled rejection | YES |

---

## 5. Post-Code Registry Checklist

```
- [ ] registry.json: BUG-560 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add src/config/firebase.js with BUG-560 + date
- [ ] Code markers: // BUG-560 comment in firebase.js
- [ ] OPEN_GAPS_REGISTER.md: OG-AUDIT-F4 → CLOSED
```

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R-1 | `messaging` is null briefly on supported browsers until `isSupported()` resolves | `isSupported()` resolves in <1ms (sync check wrapped in Promise). Consumers are lazy (user click / useEffect after auth). Window is negligible. |
| R-2 | `onForegroundMessage` called before `messaging` set | Returns `() => {}` (existing guard). Foreground messages during the <1ms window are lost — same as current crash-path behaviour, but clean. |
