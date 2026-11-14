# BUG-674 — Order Cancel Dialog Missing Notes — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: PARTIAL — `cancellation_note` already in payload and stored by backend; UI box only in refund mode.
Conflict pre-check: CancelOrderModal.jsx no open owner. DashboardPage.jsx / OrderEntry.jsx / orderTransform.js (R5) have open GATE_5A items.
Risk: HIGH (cancel flow + R5 hotspots). Not financial.
Backend-blocked: PARTIAL (store/read OK; Order Beta + Cancellation report fields missing).

## Owner decision (locked)
Notes box in order-level cancel dialog, all modes. Notes must show in Cancellation report + Order Beta.

## Data flow trace
`CancelOrderModal.jsx` L11 `cancellationNote`, textarea only `isRefund` (L104-119); `onCancel(selectedReason, cancellationNote)` L22.
Callers: `DashboardPage.jsx` L1375 `handleCancelOrderConfirm(reason, note)` → `orderToAPI.cancelOrder(..., reason)` L1383 — **note not passed** (used only for Razorpay refund L1395). `OrderEntry.jsx` L1565 `handleCancelOrder(reason, note)` → L1572 same — note not passed.
`orderTransform.js` L1027-1028: `cancellation_reason: reasonText`, `cancellation_note: reason.reasonNote || reason.reasonText` → today note = reason text duplicate.
Backend (probe 23/24): custom `cancellation_note` stored; returned in `cancel-order-list` order row. **Quirk:** backend copies the note into remaining lines' `reason`.
Insights cancellations (probe 25): order-scope rows `notes` = `food_level_notes`, not `cancellation_note` → Cancellation report shows wrong notes.
Order Beta (probe 26): no cancellation fields.

## Files (estimate)
| File | Change | R5 |
|---|---|---|
| CancelOrderModal.jsx | show notes box in cancel mode too | no |
| DashboardPage.jsx L1375-1395 | pass note into payload | YES |
| OrderEntry.jsx L1565-1576 | pass note into payload | YES |
| orderTransform.js L1016-1032 | `cancellation_note` = note (empty when blank — OD-674-A) | YES |
| insightsService.js / CancellationsMockup.jsx | show order note | no |
| OrderReportBetaPage.jsx | show reason + note (needs API fields) | no |

## Open owner decision
- OD-674-A: when notes left blank, send empty `cancellation_note` (recommended: empty — today it duplicates the reason) or keep reason text? OPEN.

## Backend asks
- B-674-1: insights-cancellations order rows return `cancellation_note` as notes (not `food_level_notes`).
- B-674-2: Order Beta combined returns `cancellation_reason` + `cancellation_note`.
- B-674-3: confirm the line `reason` overwrite on full-order cancel is intended.

## Owner review 2026-11-14 (round 2)
- Owner confirmed: no UI to capture order-level notes (screenshot: Cancel Order dialog = reason only).
- Owner: when an order is cancelled, each item must get the cancel reason/note; if backend does not, backend must add it. Probe: backend copies the note into line `reason` (overwrites reason) → ask backend to store reason and note separately per line.
- Owner: Order Beta must show cancel reason/note → backend must add fields (B-674-2).

- Owner 2026-11-14 round 4: **OD-674-A = save note EMPTY when box left blank** (stop copying reason into note).

## Regression
Razorpay cancel & refund path (CR-165) must keep refund note; scan-order red-cross cancel; dashboard card cancel; walk-in.
