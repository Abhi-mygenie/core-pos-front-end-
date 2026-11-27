# BUG-750 — INTAKE — Buzzer does not stop on Update Order when order has food_status=7 items

**Type:** BUG · **Severity:** P2 · **Risk:** MEDIUM
**Sprint:** nov_cr_batch · **Client:** ALL (reproduced: The Goan Kitchen, rid 69) · **Assignee:** Abhishek
**Registered:** 2026-11-24 · **Source:** OWNER-REPORTED (2026-11-24)
**Intake role — no app code changed.**

## Classification
On the web-edit flow, when an operator opens a Scan&Order (web) order from the banner and presses **Update Order**,
the long buzzer keeps ringing. Accept / Reject / item-cancel / Mute all call `soundManager.stop()` (via
`ScanOrderPopOut.stopBuzzer`), but the Update-Order path in `OrderEntry.jsx` does not.

## Owner-refined scope (2026-11-24)
On a successful **Update Order**, stop the ringer **if the order has any `food_status=7` (Not-Confirm / `isNotConfirmed`)
item** — i.e. the web-edit unconfirmed case that drives the buzzer. If no fos=7 item is present, no behaviour change.

## Code Reality — NONE (main @ HEAD)
- `components/order-entry/OrderEntry.jsx` does **not** import `soundManager` (grep=0). The Update branch ends at
  `await engagePromise` → log → `navigateAfterOrderAction()` (L1385-1388, L1474-1475) with no `stop()`.
- Precedent: `ScanOrderPopOut.jsx` imports `soundManager` for **`stop()` only** (owner-sanctioned narrow use,
  L56/L275) — BUG-750 follows the same stop-only pattern.

## Duplicate check
**DISTINCT** (not in main registry). RELATED: CR-552 (web-edit fos=7 flow, the items this targets), BUG-747/CR-562
(same buzzer family). Independent of the FCM reload chain — can ship on its own.

## Severity rationale
P2 — annoyance / wrong UX (buzzer persists); workaround exists (Mute or Accept). Not P0/P1 (no money/order loss).

## Evidence
- `impact/FCM_RING_REBUILD_MAIN_IMPACT_ANALYSIS.md` §2 (GAP-4), §3, §4 (edit 11), §7 (Phase 5).
- `food_status=7` / `isNotConfirmed` semantics: `orderTransform.js` L162-163; `ScanOrderPopOut.hasUnconfirmedWebEditItems`
  L65-68.
- Confidence: CONFIRMED (owner-reported + code-traced).

## Blast radius
SMALL — 1 file `OrderEntry.jsx` (+ stop-only `soundManager` import). Edit site line-disjoint from OrderEntry hotspot
history (CR-411/409/482, BUG-746/662/538/567).

## Open decisions
- OD-750-01: confirm P2/MEDIUM.
- OD-750-02: trigger = any cart item with `isNotConfirmed` (fos=7) at the moment of successful Update (rec) —
  confirm vs always-stop-on-update.

## Next
PLANNING Gate 3 — Phase 5 (independent; recommended to ship first — lowest risk, no `firebase.js` lock).
