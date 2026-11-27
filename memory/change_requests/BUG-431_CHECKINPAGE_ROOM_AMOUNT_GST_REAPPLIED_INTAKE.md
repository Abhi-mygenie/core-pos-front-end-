# BUG-431 — CheckInPage pre-fills Room Amount with base+GST and re-applies GST

**ID:** BUG-431 · **Date:** 2026-09-21 · **Status:** INTAKE · **DEFERRED-TO-P2** (owner-approved 2026-09-21 — becomes an ENTRY CONDITION of P2: fixed inside P2, not after)
**Source:** QA-FOUND — CR-385 B-7 smoke (§S, 2026-09-20), testing_agent + FE triage
**Confidence:** REPORTED (observed in UI during smoke; not yet reproduced on its own item)
**Duplicate check:** RELATED to CR-385 (M3 `CheckInForm` shows server `charge` only — D50; the legacy page keeps the defect until FU-385-C) · RELATED to BUG-410 (old modal GST)
**Priority:** P2 · **Risk:** CRITICAL (money display at check-in) · Fast Lane: NO

## Description
Legacy `pages/pms/CheckInPage.jsx` pre-fills the "Room Amount" input with the GST-inclusive booking figure (₹2,100 = base + GST) and then applies GST on that figure again, so the screen shows ₹2,205 while the server stores ₹2,100.

## Evidence
- Probe report: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/PROBE_REPORT.md` (line "Other observations")
- Check-in payload/response: `memory/evidence/CR-385/probes_2026_09_20_b7smoke/c2_checkin_adv500_card.json`, folio `c3_folio.json`
- QA agent runs: `test_reports/iteration_1.json … iteration_3.json` (2026-09-20 B-7 smoke)
- Screenshot: not captured
- Steps to reproduce: sandbox-pms (OWNER_TGK) → `/pms/check-in` for a Direct booking with a known `charge.total_with_gst` → observe Room Amount pre-fill and the GST line below it.

## Blast radius
- Files: `pages/pms/CheckInPage.jsx` (hotspot-adjacent, BUG-411/419/420 recently) — 1 file, SMALL
- Not CR-385 scope: CR-385 M3 renders `charge.*` (D50) and does not copy the amount input logic.

## Open questions
- Retire with FU-385-C (legacy pages) or fix now? Owner decision at planning.
