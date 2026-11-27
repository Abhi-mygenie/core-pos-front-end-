# CR-562 — INTAKE — FCM messaging-ready race + foreground-listener re-attach on reload

**Type:** CR (re-opened scope; clean build on `main`) · **Severity:** P1 · **Risk:** HIGH
**Sprint:** nov_cr_batch · **Client:** ALL (reproduced: The Goan Kitchen, rid 69) · **Assignee:** Abhishek
**Registered:** 2026-11-24 · **Source:** OWNER-REPORTED (no ring after reload) + AGENT-TRACED
**Intake role — no app code changed.**

## Classification
Enabler CR for the reload-ring fix family. On a browser reload the foreground FCM listener attaches while
`config/firebase.js` `messaging` is still `null` (async `isSupported().then(...)` init, BUG-560) and never
recovers, so no push can reach `soundManager.play()`.

## Code Reality — NONE (main @ HEAD)
- `config/firebase.js`: no `whenMessagingReady`; `requestFCMToken`/`onForegroundMessage` no-op on `!messaging`;
  `onForegroundMessage` is sync (L122-124).
- `contexts/NotificationContext.jsx`: one-shot auth effect (L213-246) guarded by `initializedRef` (L214-215)
  attaches the listener once → on reload subscribes to nothing, never re-runs.

## Duplicate check
**DISTINCT** (not in main registry). RELATED: BUG-747, BUG-749, BUG-750 (same reload-ring family). A prior
implementation exists only on branch `notification-fix` (not merged) — design source, not a port.

## Severity rationale
P1 — without this, the listener never attaches after reload; it is the precondition for BUG-749/BUG-747 to ring.
Not P0 itself because the dominant missed-order cause is BUG-749 (token registration).

## Evidence
- Root-cause trace + data flow: `impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` §2 (BREAK-2), §3.
- Prior branch investigation: `notification-fix` `investigations/INV-FCM-RELOAD-NO-SUBSCRIPTION-20261123.md`.
- Confidence: CONFIRMED (code-traced, main anchors verified).

## Blast radius
SMALL–MEDIUM — `config/firebase.js` + `contexts/NotificationContext.jsx` (2 files). `firebase.js` is a provider-init
hotspot under **OD-AUDIT-02 lock** (no edit without owner Gate 4 GO).

## Open decisions
- OD-562-01: confirm P1/HIGH.
- OD-GO-FIREBASE: owner Gate 4 GO to edit `firebase.js` (OD-AUDIT-02) — hard precondition.
- OD-562-02: promise named `whenMessagingReady`; hard acceptance = login→ring path byte-for-byte unchanged.

## Next
PLANNING Gate 3 (Phase 1 of the IA ladder). Combined IA already at
`impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md`.
