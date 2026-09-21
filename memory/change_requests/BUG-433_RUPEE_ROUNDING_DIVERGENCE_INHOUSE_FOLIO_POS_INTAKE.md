# BUG-433 — ₹1 rounding divergence between In-House balance, Guest Folio and POS

**ID:** BUG-433 · **Date:** 2026-09-21 · **Status:** INTAKE
**Source:** QA-FOUND — CR-385 B-7 smoke S-421/426 (2026-09-20)
**Confidence:** CONFIRMED (three figures read on the same order 1232632: In-House ₹2,212.35 · Folio ₹2,212 · POS ₹2,213)
**Duplicate check:** RELATED to BUG-421/426/429/430 (room-orders GST paths in `pmsService.getInHouseGuests` / `folioTransform` / `orderTransform`) — DISTINCT symptom (rounding, not GST base)
**Priority:** P3 · **Risk:** HIGH (report/balance consistency; ₹1) · Fast Lane: NO

## Description
The same stay shows three different totals: In-House list 2,212.35 (`pmsService.getInHouseGuests`, unrounded), Guest Folio 2,212 (`folioTransform`, floor/round), POS checkout 2,213 (`orderTransform` round-off). Three code paths round at different points.

## Evidence
- Probe report: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/PROBE_REPORT.md` (row S-421/426)
- Folio: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/folio_1232629.json`, `c3_folio.json`; LR: `lr_smoke411.json`
- Steps to reproduce: sandbox stay with a room-service order carrying add-ons → compare `/pms/in-house` balance, `/pms/folio/<orderId>` grand total, POS checkout panel grand total.

## Blast radius
- Files: `api/services/pmsService.js`, `api/transforms/folioTransform.js`, `api/transforms/orderTransform.js` (hotspot) — 3 files, MEDIUM
- CR-385 note: M5 `getRowBalance` reuses the in-house path; M6 feeds the panel from `charge.*`. A single rounding rule should be decided before M5 (plan §4 M5 / AC-02).

## Open questions
- Which figure is authoritative (server ledger)? Backend to confirm rounding rule → possible BACKEND_BRIEF.
