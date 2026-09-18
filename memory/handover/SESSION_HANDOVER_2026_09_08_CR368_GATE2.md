# Session Handover — CR-368 Planning (Gate 2)

**Date:** 2026-09-08
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Item:** CR-368 — Test Suite Triage: Achieve Zero-Failure Baseline
**Risk:** MEDIUM
**Sprint:** pos_audit_1

---

## Summary
Owner asked for Gate 2 + Gate 3 "but stop if any doubt after Gate 2, do not assume anything". Gate 2 written; **Gate 3 deliberately NOT written** — 6 owner decisions (OD-CR368-02..07) determine the edit list. Live Jest run executed (read-only, no `src/` edits, nothing fixed): **54 failing tests / 11 suites + 2 fake `process.exit` scripts that hang the runner** (no summary line; `timeout 900` → EXIT 124). Intake numbers (56/15/3) are stale — BUG-382 already fixed 1 script and the axios `moduleNameMapper`, which means **Phase 2 of the owner-approved 2026-09-08 execution plan is already done**.

## Triage result (provisional until ODs answered)
| Bucket | Count | Items |
|---|---|---|
| STALE — HIGH confidence, superseding item registered | 46 | BUG-122/CR-018 (22, ScanOrderPopOut) · CR-130 (10, placeOrderPayload + REOPEN-A) · BUG-363/BUG-316 (3 of 4 printerAgentConfig) · owner-2026-08-21 (3, BulkEditor Sold By) · BUG-270 (1) · BUG-253 (1) · CR-133 rawField T3 (1) · "BUG-147" marker (3, BulkEditor cr027p3 — marker unregistered) |
| STALE — needs owner ack (R6 financial / hard-gate) | 7 | CR-170 round-off (3) · BUG-168 v3 bill-print fallback (2) · printerAgentConfig V3 HARD GATE (1) · counted above in S5/S7 nuance — see IA §2 |
| POLICY | 2 | barrelExports T-12/T-14 (34 files unexported) |
| CANDIDATE REAL BUG | 1 | `reportService.js:671` ungated `_raw: o` (P3, non-financial) |
| UNDETERMINED | 1 | BulkEditor.cr036 G-Toast — typed name absent from `rows` at save; reproduced in isolation; needs ≤5-step investigation |

## Owner decisions — state at session end (2026-09-08)
| ID | Decision | Status |
|---|---|---|
| OD-CR368-02 | (c) HYBRID — update where rule survives in new form, retire where rule is gone | **LOCKED** |
| OD-CR368-03 | (A) update 5 financial test expectations to CR-170 / BUG-168 v3; zero production edits | **LOCKED** |
| OD-CR368-04 | (c) FREEZE barrel test to pre-June allow-list; no `index.js` edits (App.js:4 imports the barrel → (a) would risk boot path) | **LOCKED** |
| OD-CR368-05 (i) | YES — register `reportService.js:671` ungated `_raw: o` as P3 BUG **intake only**; no fix; no gate-jump | **LOCKED** |
| OD-CR368-05 (ii) | `_raw` component-scan test T3 vs CR-133 printer-config by-design read | **OPEN — handed to Dev team** as Q2 in `backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md`. KEEPS → strict rule stays; DELETES → narrow. |
| OD-CR368-06 | printerAgentConfig V3 hard gate — flat font-size keys mirrored from windows | **OPEN — handed to Dev team** as Q1 in `backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md`. Q1-a NO + Q1-b YES → CONFIRM; Q1-a YES → BUG against BUG-363. |
| OD-CR368-07 | G-Toast — resolved by probe: test-infra (50 ms sleep vs `waitFor`); production code correct | **RESOLVED** |
| Phase 2 (craco mapper) | already done by BUG-382 | drops out |

**Owner instruction:** stop after recording decisions — Gate 3 NOT to be written yet.

Full option text for the two OPEN items: `impact/CR-368_IMPACT_ANALYSIS.md` §6. Both affect exactly 1 test edit each; every other Gate 3 edit is already determined.

## Original decision list (as asked)
- **OD-CR368-02** STALE policy: retire (intake) vs update-expectation vs hybrid (recommended hybrid — retiring drops the only ScanOrderPopOut coverage).
- **OD-CR368-03** R6: permission to edit 5 financial test expectations to CR-170 / BUG-168 v3 (no production math changes); confirm BUG-168 v3 is standing rule (tracker says v2 disputed).
- **OD-CR368-04** Barrel-export convention: enforce (separate item, 34 lines in two `index.js`) / retire dir-scan tests / allow-list.
- **OD-CR368-05** `_raw`: (i) register `reportService.js:671` as REAL BUG? (ii) narrow or retire T3.
- **OD-CR368-06** Confirm BUG-363 flat←windows font-size mirroring is intended (re-express V3 hard gate).
- **OD-CR368-07** G-Toast: investigate inside CR-368 / register BUG now / defer.
- Ack: Phase 2 (craco mapper) already done by BUG-382 → drop from plan.

## Files written / updated
| File | Change |
|---|---|
| `impact/CR-368_IMPACT_ANALYSIS.md` | NEW — Gate 2 |
| `evidence/CR-368/jest_full_run_2026_09_08.log` | NEW — raw run (1.7 MB) |
| `evidence/CR-368/failures_parsed.json`, `parse_jest_log.py` | NEW — structured failures + parser |
| `evidence/CR-368/test_triage_2026_09_08.md` | NEW — 54-row triage table |
| `control/CR_REGISTRY.md` | CR-368 row → Gate 2 |
| `control/registry.json` | CR-368 status/gate/artifacts/history |
| `control/OPEN_GAPS_REGISTER.md` | OG-AUDIT-002/003/004 filed |
| `control/CONTROL_DASHBOARD.md` | Last Updated + audit sprint row |
| `PRD.md` | Audit track progress line |
| `backend_briefs/BACKEND_BRIEF_CR-368_2026-09-08.md` | NEW — plain-language Q1/Q2 for Dev team (OD-06, OD-05ii) |

**Zero `src/` changes. Nothing fixed (owner instruction).**

## Retroactive / drift candidates surfaced (for CLOSURE Phase B, not CR-368 scope)
BUG-253 (code exists, registry INTAKE) · BUG-363 (already flagged) · BUG-168 (tracker v2/disputed vs code v3 marker) · "BUG-147" marker mismatch (OG-AUDIT-003).

## Next
Owner answers OD-CR368-02..07 → PLANNING agent writes `plans/CR-368_IMPLEMENTATION_PLAN.md` (Gate 3: Phase A rewrite of 2 scripts using `bucketReservationOps.test.js` as template; Phase B per-suite edits; clean full run; `control/REGRESSION_BASELINE.md`) → Gate 4 GO → IMPLEMENTATION.

Note for Gate 3 planner: pass count is unknown (runner hung) — baseline line can only be captured after Phase A. Run the suite in background to a log file (`CI=true timeout 900 yarn test --watchAll=false --forceExit > log 2>&1 &`); it exceeds the 2-minute tool limit.
