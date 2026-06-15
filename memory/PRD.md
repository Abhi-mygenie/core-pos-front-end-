# MyGenie POS Frontend — PRD

## Current Session: 2026-06-15

### Completed This Session
1. **CR-047 AGENT_PROMPT_ALPHA v0.6** — Full gate cycle (Intake → Planning → Implementation) for role hardening:
   - STEP -1: Session start rewrite (+handover reading, +stale batch 48h, +multi-batch, +owner fallback)
   - STEP -1.5: NEW conditional environment check (execution roles only, doc roles skip)
   - PLANNING: +Stage dispatch (Gate 2 only / Gate 3 only / ask owner)
   - INTAKE: +Severity rubric P0-P3, +duplicate detection, +evidence storage, +blast radius
   - QA: +4-tier finding severity, +evidence format, +regression calibration, +coverage check, +re-test protocol
   - BUG FIX: Full rewrite — +reproduce-first, +5 RCA classifications, +fix report, +5 escalation paths
   - INVESTIGATION: +10-step time-box, +hypothesis method, +6-section report, +data persistence, +exit criteria

### POS 5.0 Sprint
- 3 CRs active: CR-041 (Navigation), CR-043 (Credit), CR-047 (Agent Prompt v0.6 — IMPLEMENTED)
- 16 bugs deferred from POS 4.0
- Workflow queue: BATCH-2026-06-15-001 (6 items for impact analysis — pending owner direction)

### Next Steps
- CR-047 Owner Smoke → CLOSE
- Workflow queue BATCH-2026-06-15-001: BUG-096, BUG-118, BUG-123, BUG-040, BUG-041, BUG-085
- POS 5.0 sprint execution per `POS5_0_SPRINT_PLANNING_2026_06_13.md`
