# BUG-560 — Intake (Gate 1)
## Firebase getMessaging() async unsupported-browser rejection escapes try/catch

**ID:** BUG-560
**Type:** BUG
**Date:** 2026-10-15
**Registered by:** INTAKE agent (owner session 2026-10-15)
**Sprint:** oct_cr_batch
**Area:** Auth / Notifications (Firebase init)
**Priority:** P2 — production + PWA support Push, so no overlay in prod; impact = console error + no FCM on unsupported browsers (OD-555-07)
**Risk:** MEDIUM — login page + notification init path
**Fast Lane eligible:** NO
**Process:** Full Gate 2–3 (E-3 = b, owner declined direct-fix skip)
**Related:** BUG-555 (discovered during its investigation, root cause #5)

---

## 1. Code Reality Check
**NONE.** `grep "BUG-560\|isSupported" frontend/src` → 0 hits. Current code `config/firebase.js:21-27`:
```js
try {
  app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  console.log('[Firebase] Initialized successfully');
} catch (error) {
  console.error('[Firebase] Init failed:', error.message);
}
```

## 2. Duplicate Check
**DISTINCT.**

| ID | Status | Relationship |
|---|---|---|
| BUG-069 | DEFERRED — FUTURE SPRINT | Firebase sound plays before socket order appears — different symptom and code path. |
| BUG-555 | GATE_1_INTAKE_COMPLETE | Parent investigation only; split out per E-3. |

## 3. Root Cause (investigation report §3.5, HIGH confidence)
`@firebase/messaging` `getMessaging()` runs `isWindowSupported().then(ok => { if (!ok) throw "unsupported-browser" })`. The throw happens inside a Promise, so it bypasses the synchronous try/catch → `unhandledrejection`.
- Preview/dev: CRA red "Uncaught runtime errors" overlay blocks the login page.
- Production: console error only; `requestFCMToken` logs noise on every login.

Proposed fix shape (for Planning to validate): `isSupported().then(ok => { if (ok) messaging = getMessaging(app); })` — exported SDK helper; consumers of `messaging` must tolerate `null` until resolved.

## 4. Evidence
- Screenshot: owner screenshot 5 (tablet browser without Push API)
- Steps to reproduce: open login page in a context without Push API (e.g. iframe emulation per BUG-555 repro) → red overlay on preview. Reproduced 3× in investigation session.
- Curl output: not applicable
- Source: OWNER-REPORTED
- Confidence: CONFIRMED

## 5. Blast Radius
- 1 file core (`src/config/firebase.js:21-27`); Planning to trace consumers of exported `messaging` / `requestFCMToken` / `onMessage`.
- Hotspot files touched: NO
- Estimated scope: SMALL

## 6. Owner Decisions
- OD-555-07: P2 — LOCKED
- E-3 = b: separate BUG, full Gate 2–3 — LOCKED
- Open: NONE

## 7. Next
PLANNING Gate 2 (Impact Analysis).
