# BUG-642 — Installed PWA (standalone) has no way to go back — no browser back button

**ID:** BUG-642  **Type:** BUG  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Area:** Other  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-416, CR-386

## Description
Owner: "there is no option to go back in pwa app in browser we use brio". manifest.json display=standalone hides browser chrome (no back arrow); app shell has no in-app Back control, so drawers/sub-pages cannot be exited by back navigation.

## Evidence
- Screenshot: not provided
- Browser named by owner: "brio" (to confirm exact browser)
- Curl output: not captured (no test credentials in memory/test_credentials.md)
- Confidence: REPORTED + code-confirmed

## Duplicate Check
RELATED — related: BUG-416, CR-386

## Code Reality
CONFIRMED gap — public/manifest.json L11 `"display": "standalone"`; no global Back button in layout (Sidebar.jsx has none). BUG-416 added Back only on Night Audit / Revenue Dashboard.

## Blast Radius
SMALL–MEDIUM (manifest or header component; non-hotspot)

## Open Owner Decisions
- OD-642-01 Fix: (A) in-app Back button in top header for all pages, (B) manifest display "minimal-ui" (shows browser back where supported), (C) both — OPEN
- OD-642-02 Confirm browser "brio" (Brave?) and device — OPEN

## Next
Planning Gate 2.

## Owner Decision (2026-11-05)
- OD-642-01 **LOCKED: in-app Back button**, works in both browser and installed PWA. OD-642-02 browser question no longer needed.

## (2026-11-05) INTAKE FROZEN.
