# CR-368 — Test Suite Triage: Achieve Zero-Failure Baseline

**ID:** CR-368  
**Type:** CR  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

The Jest test suite currently has **56 failing tests** and **3 fake "tests"** (plain Node scripts that call `process.exit()` and hang the runner). These have accumulated since June 2026 because QA was always run per-feature, never suite-wide. Per owner decision **D3-b**, the test baseline must be triaged to zero failures before `AGENT_PROMPT_ALPHA_v0.8.md` (CR-369) goes live.

---

## 2. Scope

### Phase A — Convert 3 node scripts to real Jest tests
The 3 CR-358-P3/P4 scripts import from inline copies of source instead of `src/` and call `process.exit()` — they hang Jest when the full suite runs. Each must be rewritten as a proper Jest test importing from `src/`.

### Phase B — Triage all 56 failing tests
For each failure, classify:
- **STALE** → test written for old behaviour that no longer applies → retire with marker comment `// RETIRED-<DATE>: <reason>`
- **REAL BUG** → something is genuinely broken → raise a new BUG intake (gets its own BUG-xxx ID)

### Phase C — Drive to zero
After retiring stale + fixing real bugs → full `yarn test --watchAll=false` run must show 0 failures. That run's summary line becomes the `REGRESSION_BASELINE.md` seed.

---

## 3. Classification

- **Type:** CR
- **Area:** Dev Tooling / Testing Infrastructure
- **Priority:** P1 — High
- **Risk:** MEDIUM
- **Risk reason:** Touches test files only. No production `src/` changes unless a REAL BUG surfaces; each REAL BUG spawns its own CR/BUG item and follows full gates.
- **Fast Lane eligible:** NO (>1 file, structural work)

---

## 4. Evidence

- **Screenshot:** not provided (test runner — no UI screenshot applicable)
- **Steps to reproduce:** `cd /app/frontend && CI=true yarn test --watchAll=false --forceExit` → runner outputs 591 pass / 56 fail / 647 total
- **Curl output:** not applicable (Jest test runner, not an API)
- **Source:** AGENT-DISCOVERED — `SESSION_HANDOVER_2026_09_06_AUDIT_BASELINE_PROMPT_V08.md` §2.1; confirmed 2026-09-08 via live test run
- **Confidence:** CONFIRMED — Jest run evidence at `evidence/BASELINE-2026-09/`; 3 fake scripts identified by name; 56 failures reproduced

---

## 5. Duplicate Check

- Registry keyword search: `DEV-DASHBOARD-001` matched but is unrelated (dashboard tooling, not testing).
- **Result: DISTINCT** — no existing CR covers test suite triage.

---

## 6. Code Reality Check

```
grep -rn "process.exit" /app/frontend/src/__tests__/ → 0 hits on current grep
Test files: 42 total in src/__tests__/
3 scripts identified by audit in handover (node scripts, not Jest)
```

- **Code reality: PARTIAL** — 42 test files exist; 3 are malformed node scripts; 56 produce failures.

---

## 7. Blast Radius

- Files affected: `src/__tests__/` (42 test files, 3 to be converted/replaced)
- Hotspot files touched: NO (test files only; production `src/` untouched unless REAL BUG)
- Estimated scope: MEDIUM (~3 files Phase A, up to 56 files Phase B)
- Downstream: unblocks CR-369 (v0.8 prompt), unblocks Gate 5c regression for all future items

---

## 8. Owner Decisions

- **D3-b already answered (2026-09-08):** Triage to green before v0.8 goes live.
- **OD-CR368-01:** For REAL BUG failures found during triage — owner to confirm each BUG intake before fixing (INTAKE agent raises them; owner approves).

---

## 9. Related

- **Blocks:** CR-369 (v0.8 cannot go live until this is CLOSED)
- **Source finding:** F-QA-01 + F-QA-02 from `control/PROJECT_BASELINE_2026_09.md`
- **Owner decision:** D3-b — `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` §5
---
## INTAKE HANDOVER

```
Item CR-368 registered. Intake doc at change_requests/CR-368_TEST_SUITE_TRIAGE_CLEAN_BASELINE_INTAKE.md.
Code reality: PARTIAL.
Duplicate check: DISTINCT.
Severity: P1 (agent-classified).
Blast radius: MEDIUM (~3 files Phase A, up to 56 files Phase B; NO hotspots).
Evidence: CONFIRMED — Jest run log at evidence/BASELINE-2026-09/.
Owner decisions needed: D3-b answered. OD-CR368-01: owner confirms each REAL BUG intake before fixing.
Next: Planning agent for Gates 2-3.
```
