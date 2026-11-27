# BUG-441 — Legacy Cancel / Modify send the public `booking_id` string as the local-reservation id → HTTP 500

**Registered:** 2026-09-21 · **Role:** IMPLEMENTATION (CR-385 Phase 1 QA finding; intake only — NOT fixed) · **Type:** BUG
**Priority:** P1 (feature broken on legacy pages, no workaround there) · **Risk:** MEDIUM (inventory release / booking mutation; no money maths) · **QA severity:** BLOCKER (legacy surfaces only)
**Duplicate check:** DISTINCT — RELATED CR-362 (owner of the wiring), BUG-440 (same dialog; masked this bug because Confirm could never be pressed), CR-385 (new Front Desk path is correct)
**Source:** QA-FOUND 2026-09-21 (`test_reports/iteration_12.json` case C-3) · **Confidence:** CONFIRMED (live 500 + code read)
**Code reality:** EXISTS — defect in CR-362 code; fix NONE.

## Symptom
Legacy `/pms/arrivals` → Cancel → reason → Confirm → `POST /api/v2/vendoremployee/aiosell/local-reservations/MG-69-CF3A95A8-…/cancel` → **500** `TypeError: Argument #2 ($id) must be of type int, string given`; dialog stays open, card never moves to Cancelled. Same wiring on Modify and on `/pms/reservations`.

## Root cause (CODE_ERROR)
- `pages/pms/ArrivalsPage.jsx` L272 (`onModify`) and L273 (`onCancel`): `reservationId: row.bookingId` — the public string id; the numeric LR id is `row.id` (pmsService arrivals transform L174).
- `pages/pms/ReservationsPage.jsx` L370 (`onModify`) and L375 (`onCancel`): `reservationId: res.bookingId` — same mistake.
- New CR-385 `ArrivalsPanel.cancelTargetOf` uses `row.id` → works (bookings 222/223/224 cancelled live, 200).

## Evidence
`evidence/CR-385/phase1_qa/c3_legacy_224.json` (request URL with the string id + 500 body, Authorization masked).

## Blast radius
SMALL — 2 files, 4 lines, no hotspots. Proposed fix: `reservationId: row.id` / `res.id` (+ check `res.id` exists on the Reservations tape-chart shape). Fast Lane NOT eligible (2 files, inventory mutation, MEDIUM).

## Backend note
`cancelLocalReservation` / `modify` should answer 4xx (404/422) with a clean body when `{id}` is not an int instead of a 500 stack trace — added as a note to BACKEND_BRIEF_CR-385_MASTER (BQ-385-24, P3).

## Routing (owner decision needed)
(a) owner-approved Bug Fix now (2 files, 4 lines, same session) → QA re-run of iteration_12 C-3 on both legacy pages; or (b) fold into CR-385 P1.5 with any other Phase 1 smoke findings; or (c) leave — legacy pages retire under FU-385-C. Until fixed, staff must cancel/modify from **Front Desk (Beta)**.
