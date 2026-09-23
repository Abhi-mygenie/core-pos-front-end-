# BUG-447 — Arrivals/In-House row badge shows "PAY AT HOTEL" and hides the "₹ advance" chip when a Direct booking with an advance carries `pah=true`

**ID:** BUG-447 · **Date:** 2026-09-22 · **Status:** INTAKE · **Source:** AGENT-FOUND during CR-385 P3 QA round 2 (`evidence/CR-385/phase3_qa/p3_mutating_run.json`, res 237 / booking MG-69-A2B7E79A…)
**Confidence:** CONFIRMED (booking created with advance ₹1,000 UPI → 201 `charge.advance_payment 1000`; Arrivals row `fd-row-237-badge` = "PAY AT HOTEL"; P2 QA it.18 saw the ₹1,000 chip on a row where `pah` was false)
**Priority:** P3 · **Risk:** LOW / MINOR (display priority only; money figures correct) · Fast Lane: candidate (one-line rule in `frontDeskTransform.badgeFor` / `GuestTable.Badge`)

## Description
`badgeFor(row)` (CR-385 P0, D-rule "PAH chip") gives `pah` precedence over the advance chip. A Direct booking that has paid an advance AND still has a balance due is flagged `pah=true` by the server, so the operator sees only "PAY AT HOTEL" and not the "₹1,000 advance" chip the P2 acceptance text expects (companion §4 M1 "row with advance chip").

## Options for the owner
(a) show both (advance chip + PAH) · (b) advance chip wins when `charge.advance_payment > 0` · (c) leave as is (PAH is the operational hint). Routing: Phase 3.5 Fast Lane or FU-385-C. **Not** blocking Gate 5B (P3).


## Routing + fix (2026-09-22)
Owner: **(a) show both** — Phase 3.5 Fast Lane before the smoke. Fix: `frontDeskTransform.badgesFor()` (prepaid alone; else PAH + advance) · `GuestTable.Badge` list (`fd-row-<id>-badge` primary, `fd-row-<id>-badge-advance`). Tests `tests/cr385/bug447.cr385.test.jsx` (4: both / PAH only / prepaid only / departed). jest cr385 93 → 97. QA it.20: 100% live (rows 165/197/174/155 both; 15/17/86/208 PAH only; PREPAID alone; X-10 clean; 1366 wraps, no overflow). **FIXED + QA-VERIFIED.**
