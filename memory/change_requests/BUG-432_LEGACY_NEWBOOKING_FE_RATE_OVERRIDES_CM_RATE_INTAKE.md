# BUG-432 — Legacy NewBookingPage FE room amount honoured over the CM (rate-table) rate

**ID:** BUG-432 · **Date:** 2026-09-21 · **Status:** INTAKE · **DEFERRED-TO-P2** (owner-approved 2026-09-21 — becomes an ENTRY CONDITION of P2: fixed inside P2, not after)
**Source:** QA-FOUND — CR-385 B-7 smoke (§S, 2026-09-20)
**Confidence:** CONFIRMED (API-level: server honours FE `rate_per_night` when sent — BQ-385-16 says the server prices only when the FE omits it)
**Duplicate check:** RELATED to CR-385 (M1 `NewBookingForm` never sends `rate_per_night` — C5/BQ-16) · RELATED to BUG-404 (closed by decision O-4, superseded by server pricing)
**Priority:** P2 · **Risk:** CRITICAL (booking price) · Fast Lane: NO

## Description
Legacy `pages/pms/NewBookingPage.jsx` sends the room amount typed/derived in the FE (₹2,000 in the smoke) with `direct-reservation`; the server honours it over the Channel-Manager rate (₹3,500 for that date), so legacy bookings are priced by the browser, not the rate table.

## Evidence
- Probe report: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/PROBE_REPORT.md` (line "Other observations")
- Direct-reservation body/response: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/c1_direct.json`; rates for the window: `rates_0920_0922.json`
- BQ-385-16 contract: `memory/backend_briefs/BACKEND_BRIEF_CR-385_MASTER.md` (BQ-16) + `memory/evidence/CR-385/probes_2026_09_20_final/s1_bq16_omit_rate.json`
- Steps to reproduce: `/pms/new-booking` → pick a date where the rate table says ₹3,500 → the FE amount field shows/sends a different figure → LR `charge.rate_per_night` equals the FE figure.

## Blast radius
- Files: `pages/pms/NewBookingPage.jsx` (+ `pmsService.createDirectReservation` payload) — 1–2 files, SMALL
- Not CR-385 scope (M1 is a new form that omits the rate).

## Open questions
- FE fix (omit `rate_per_night` on the legacy page) vs backend "ignore FE rate" vs retire with FU-385-C — owner decision at planning.
