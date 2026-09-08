# CR-369 — Write AGENT_PROMPT_ALPHA_v0.8.md

**ID:** CR-369  
**Type:** CR  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

Write the new agent rulebook `control/AGENT_PROMPT_ALPHA_v0.8.md` based on the 10-gap analysis and all 6 owner decisions (D1–D6) captured in `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`. v0.7 stays untouched. v0.8 is a NEW file (~350 additive lines). Goes **live only after CR-368 is CLOSED** (D3-b).

---

## 2. Scope

Write `control/AGENT_PROMPT_ALPHA_v0.8.md` with the following additions over v0.7:

| Section | Covers | Gap |
|---|---|---|
| § MODE STATE MACHINE | Mode list + declaration format + transition table + `TRANSITION: X→Y APPROVED` token | GAP-01, D5 |
| § SCOPE LOCK | First-response scope declaration + mid-session change protocol | GAP-09 |
| § BOOT PREFLIGHT (STEP -0.5) | 6 required checks before role work; BLOCKED-INPUT protocol | GAP-03 |
| § MISSING-INPUT PROTOCOL (MIP) | REQUIRED/OPTIONAL tags; HALT/ASK/ASSUME-AND-FLAG options | GAP-03 |
| § CONFIDENCE LABELS | HIGH/MEDIUM/LOW + generalisation sample-statement rule | GAP-02 |
| § GATE 5c REGRESSION | Full baseline run; applies to MEDIUM+ risk or R5/R6 files only (D2-b) | GAP-04 |
| § REGRESSION_BASELINE contract | Canonical Jest command + expected summary + known-failure allow-list | GAP-04 |
| Role deltas — INVESTIGATION | Confidence labels; no-register rule for MEDIUM/LOW findings | GAP-02 |
| Role deltas — IMPLEMENTATION | Exit Gate item 6 (baseline run); forbidden IMPLEMENT→QA same session (D1-a) | GAP-04, D1 |
| Role deltas — QA | Machine-evidence rule; import-from-src rule; independence enforcement (D1-a) | GAP-05 |
| Rule R26 Production Surface | `public/` allow-list; `.bak` ban; `PUBLIC_ROUTES.md` justification | GAP-07 |
| Rule R27 Canonical enums | `sync_registry.py` as only permitted registry update method (D4-a) | GAP-06 |
| Rule R28 Confidence labels | Mirrors § CONFIDENCE LABELS for inline reference | GAP-02 |
| § UNIVERSAL FINAL-RESPONSE FOOTER | `MODE · ITEM · GATE · REGRESSION · BLOCKED-INPUTS · ASSUMPTIONS · SCOPE DELTA · NEXT MODE` | GAP-10 |
| § ENV & CREDENTIALS | Points to `ENV_REGISTRY.md` + `test_credentials.md`; Boot Preflight fails if missing | GAP-08 |
| § REMEDIATION QUEUE | Baseline remediation order from `PROJECT_BASELINE_2026_09.md` §9 baked in (D6-yes) | D6 |
| § CHANGELOG v0.8 | Summary of all changes from v0.7 | — |

---

## 3. Classification

- **Type:** CR
- **Area:** Control Layer / Agent Process
- **Priority:** P1
- **Risk:** LOW
- **Risk reason:** Doc-only CR. No `frontend/src/` changes.
- **Fast Lane eligible:** NO (new file, not a 1-file ≤10-line change)

---

## 4. Evidence

- **Source:** AUDIT-DISCOVERED — decisions captured 2026-09-08
- **Gap analysis:** `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md` (all 6 decisions §5)
- **Confidence:** CONFIRMED — all owner decisions locked
- **Prerequisite:** CR-368 CLOSED (D3-b)

---

## 5. Duplicate Check

- CR-047 = v0.6 prompt hardening (CLOSED). v0.8 is its successor, not a duplicate.
- **Result: DISTINCT** — no open CR for v0.8 prompt.

---

## 6. Code Reality Check

```
ls /app/memory/control/AGENT_PROMPT_ALPHA_v0.8.md → NOT EXISTS
```

- **Code reality: NONE**

---

## 7. Blast Radius

- Files: `control/AGENT_PROMPT_ALPHA_v0.8.md` (NEW, ~350 lines)
- Hotspot files: NO
- Scope: SMALL (1 new file)
- Downstream: activates new agent behaviour for all future sessions

---

## 8. Owner Decisions

All 6 already answered (D1–D6). No open questions.

---

## 9. Related

- **Blocked by:** CR-368 (must be CLOSED first — D3-b)
- **Input:** `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`
- **Does NOT touch:** `control/AGENT_PROMPT_ALPHA.md` (v0.7 — untouched)
- **Related CR:** CR-047 (v0.6, CLOSED — predecessor)
