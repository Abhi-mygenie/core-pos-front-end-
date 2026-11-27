# BUG-688: `join_restaurant` emitted twice after socket reconnect (double ack)

**ID:** BUG-688
**Type:** BUG
**Area:** Aggregator / Sockets
**Priority:** P3
**Risk:** LOW (duplicate socket join; no observed data loss)
**Severity:** P3 — LOW (minor; double ack on reconnect)
**QA Severity:** MINOR (was tracked as MINOR-1 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE socket wiring, not backend-blocked)
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
After a socket reconnect, the client emits `join_restaurant` twice, producing a duplicate acknowledgement.

## Classification
- **Bug** — minor socket lifecycle duplication
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18, noted during BUG-677 PASS)
- **Confidence:** SUSPECTED/CONFIRMED (observed during reconnect test)

## Root Cause
Not yet traced. Likely a reconnect handler firing the join alongside an existing subscribe path. Needs investigation of the socket reconnect flow.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §Batch 3 (BUG-677 note)
- Handover: §B MINOR-1.

## Blast Radius
- Socket connection layer. Low — duplicate join, no functional break observed.

## Proposed Fix (NOT YET APPROVED)
Investigate reconnect handler; ensure `join_restaurant` is emitted once per (re)connection.

## Open Questions
None.

## Duplicate Check
- **BUG-677:** RELATED — observed while verifying BUG-677 (socket/PWA disconnect).
- **Verdict:** DISTINCT.
