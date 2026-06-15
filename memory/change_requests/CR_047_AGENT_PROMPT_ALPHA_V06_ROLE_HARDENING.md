# CR-047 — AGENT_PROMPT_ALPHA v0.6: Role Hardening (Intake, QA, Bug Fix, Investigation)

**Created:** 2026-06-15
**Status:** INTAKE COMPLETE — IMPACT ANALYSIS IN PROGRESS
**Priority:** P1
**Area:** Agent Control Layer / Process
**Sprint:** POS 5.0
**Type:** Doc-only CR (no application code changes — only `/app/memory/control/AGENT_PROMPT_ALPHA.md`)

---

## 1. Problem Statement

POS 4.0 retrospective revealed 7 lost CRs due to registry drift. v0.5 addressed registry sync (EXIT GATE, §F Registry Integrity Audit, Phase B Reconciliation) — these are the strongest parts of the prompt.

However, 4 roles remain under-specified:
- **INTAKE (Role 1):** No severity rubric, no duplicate detection protocol, no evidence storage, no blast radius estimate
- **QA (Role 4):** Binary PASS/FAIL with no severity, no environment verification, no re-test protocol, no coverage check
- **BUG FIX (Role 5):** Thinnest playbook (15 lines). No reproduce-first step, no root cause documentation, no escalation paths
- **INVESTIGATION (Role 6):** No time-box, no structured hypothesis method, no data persistence, no exit criteria

These gaps mean:
- Intake agent assigns severity inconsistently → Planning agent can't prioritize
- QA agent can't distinguish cosmetic from critical failures → owner doesn't know what to care about
- Bug Fix agent fixes symptoms not causes → same bug patterns recur
- Investigation agent rabbit-holes → expensive sessions with no conclusions

## 2. Source

Owner-directed session 2026-06-15. Verbatim: "we will working on correcting AGENT_PROMPT_ALPHA v0.5 in this session"

## 3. Classification

- **Type:** CR (process improvement, not bug)
- **Scope:** Single file — `/app/memory/control/AGENT_PROMPT_ALPHA.md`
- **Code Reality:** FULL — v0.5 exists and is current. This is an EDIT, not a greenfield write.
- **Application code impact:** ZERO — no changes to `/app/frontend/src/` or `/app/backend/`
- **Sprint:** POS 5.0

## 4. Owner Decisions Needed

None — owner directed the session and approved the gap analysis. Specific wording of additions to be confirmed at Gate 4.

---

## 5. Evidence

### Gaps identified by systematic review of all 12 roles (rated 1-5):

| Role | Rating | Key Gap |
|------|--------|---------|
| 1. INTAKE | 3/5 | No severity rubric, no duplicate protocol |
| 2. PLANNING | 4/5 | (Not in scope — already strong) |
| 3. IMPLEMENTATION | 4/5 | (Not in scope — EXIT GATE is strong) |
| 4. QA | 3/5 | Binary PASS/FAIL, no environment check, no coverage check |
| 5. BUG FIX | 2/5 | Thinnest playbook, no RCA, no escalation |
| 6. INVESTIGATION | 3/5 | No time-box, no structured template, no data persistence |
| 7. DEPLOYMENT | 2/5 | (Not in scope this CR — separate CR if needed) |
| 8. SMOKE | 3/5 | (Not in scope this CR) |
| 9. REGRESSION | 4/5 | (Not in scope — already strong) |
| 10. PRE-RELEASE | 5/5 | (Not in scope — gold standard) |
| 11. CLOSURE | 4/5 | (Not in scope — Phase B is strong) |
| 12. RELEASE | 2/5 | (Not in scope this CR — separate CR if needed) |

### Blast Radius

```
Target file: /app/memory/control/AGENT_PROMPT_ALPHA.md (1149 lines)
Sections modified: 4 of 12 roles
Lines added: ~350 (estimate)
Lines modified: ~50 (existing role text adjusted)
No other files touched.
```

---
