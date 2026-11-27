# BUG-686: Dashboard drops ALL running orders right after login (~60–70% of logins)

**ID:** BUG-686
**Type:** BUG
**Area:** Aggregator / Sockets
**Priority:** P1
**Risk:** HIGH (order polling / reconciliation — running orders disappear from dashboard)
**Severity:** P1 — HIGH (core dashboard view wrong, no in-app recovery)
**QA Severity:** MAJOR (was tracked as MAJOR-2 in QA Nov Sprint)
**Client:** ALL
**Assignee:** Abhishek (FE code error, not backend-blocked)
**Routing reason:** FE reconciliation logic in a hook, not blocked at backend
**Sprint:** nov_cr_batch
**Created:** 2026-11-18

---

## Symptom
On ~60–70% of logins, the loading screen shows "Running Orders 53 loaded" then the dashboard renders POS 0 (all running orders gone). In-app Refresh does NOT recover; only a full browser reload restores them.

## Classification
- **Bug** — regression introduced by the BUG-677 F4 change
- **Source:** QA-FOUND (QA Nov Sprint, 2026-11-18)
- **Confidence:** CONFIRMED (console-traced: server=0, local=53 → 53 removals)

## Root Cause
**CODE_ERROR at `frontend/src/hooks/useOrderPollingReconciliation.js:275-281`.** Using `Promise.allSettled`, when the running-orders fetch is *rejected* the code treats the server result as 0 orders and removes every local order, instead of skipping reconciliation on a failed fetch.

## Evidence
- Source: `memory/test_reports/QA_REPORT_NOV_SPRINT_2026_11_18.md` §MAJOR-2
- Handover: `memory/handover/HANDOVER_QA_NOV_SPRINT_2026_11_18.md` §B
- Console observed: `server=0, local=53, 53 removals`.

## Blast Radius
- 1 file (useOrderPollingReconciliation.js), ~L275-281.
- Affects: dashboard running-orders view and any order-entry flow that reads running orders.

## Proposed Fix (NOT YET APPROVED)
Skip reconcile when `posResult.status === 'rejected'` (do not treat a rejected fetch as server=0).

## Open Questions
None — root cause confirmed. Awaiting owner approval to fix (owner chose HOLD during triage).

## Duplicate Check
- **BUG-250:** RELATED — "Polling Reconciliation Removes Aggregator Orders (~60s)"; same hook family, different trigger (rejected fetch vs aggregator-specific).
- **BUG-677:** RELATED — this is a regression from the BUG-677 F4 socket/polling change.
- **Verdict:** DISTINCT — new defect in the rejected-fetch branch.
