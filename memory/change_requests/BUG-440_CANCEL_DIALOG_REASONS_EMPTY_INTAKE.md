# BUG-440 — Cancel Booking dialog: cancellation-reason dropdown always empty (Confirm never enables)

**Registered:** 2026-09-21 · **Role:** IMPLEMENTATION (CR-385 Phase 1, owner-approved R14 scope expansion) · **Type:** BUG
**Priority:** P1 (feature broken, no workaround — a pending booking cannot be cancelled from any screen) · **Risk:** MEDIUM (inventory release; no money maths) · **QA severity:** MAJOR
**Duplicate check:** DISTINCT — RELATED CR-362 (owner of `CancelBookingDialog.jsx`) + CR-385 (M2 reuses the dialog inline)
**Source:** QA-FOUND 2026-09-21 (CR-385 Phase 1 live QA, M2-2 Cancel flow) · **Confidence:** CONFIRMED (reproduced on preprod + code read)
**Code reality:** EXISTS — defect in CR-362 code; fix NONE at registration.

## Symptom
`cancel-reason-select` renders only "Select reason…"; `cancel-booking-confirm-btn` stays disabled (`!reasonId`). Reproduced on the new Front Desk (Beta) Cancel expansion AND on legacy `/pms/arrivals` (and `/pms/reservations`, same component).

## Root cause (CODE_ERROR)
`components/pms/CancelBookingDialog.jsx`
- L19–21: `getCancellationReasons(...).then(r => setReasons(Array.isArray(r) ? r : []))` — `settingsService.getCancellationReasons` returns the transformed object `{ reasons, total, limit, page }` (settingsTransform `cancellationReasonsResponse`), never an array → `[]` always.
- L28 / L84: reads `r.id` / `r.name`; transformed items are `{ reasonId, reasonText, isActive, … }`.

## Evidence
- Preprod `GET /api/v1/vendoremployee/cancellation-reasons?limit=50&offset=1` → `{"total_size":1,"reasons":[{"id":411,"reason":"guest cancelled",…}]}` (sandbox has 1 active reason that never shows).
- Screenshot: Front Desk Cancel expansion with empty select (`/app/memory/evidence/CR-385/phase1_qa/` — Playwright run 2026-09-21 17:12).

## Blast radius
SMALL — 1 file (`CancelBookingDialog.jsx`, 3 lines), 3 consumers (ArrivalsPage, ReservationsPage, CR-385 ArrivalsPanel). No hotspots. `settingsService.js` NOT touched (other callers rely on the object shape). `NoShowDialog.jsx` NOT touched.

## Fix (owner-approved 2026-09-21, marker `// CR-385 M2 BUG-440`)
- L19–21 → `.then(r => setReasons(Array.isArray(r?.reasons) ? r.reasons : []))`
- L28 → `reasons.find(r => String(r.reasonId) === String(reasonId))?.reasonText`
- L84 → `<option key={r.reasonId} value={r.reasonId}>{r.reasonText}</option>`
- Unit test: `phase1.cr385.test.jsx` — feed `{ reasons: [{ reasonId, reasonText }] }` → option renders, Confirm enables after selection, `cancelReservation` called with `reason: reasonText`.

## Routing
Fixed inside CR-385 Phase 1 (`fixed_in: CR-385 P1`); QA via Phase 1 testing_agent run (new panel + legacy `/pms/arrivals`, both viewports).
