# Agent Prompt Gap Analysis — v0.7 → v0.8

**Document:** AGENT_PROMPT_GAP_ANALYSIS_v0.8.md
**Date:** 2026-09-06
**Input:** `AGENT_PROMPT_ALPHA.md` v0.7 (1 762 lines) · 66 session handovers · 13 QA reports · `PROJECT_BASELINE_2026_09.md` §7
**Status:** DRAFT — awaiting owner approval before `AGENT_PROMPT_ALPHA_v0.8.md` is written
**Rule:** v0.8 is additive (v0.7 compatibility rule). v0.7 file stays untouched; v0.8 is a new file.

---

## 1. What v0.7 already does well (keep)

- 12 explicit roles with Boot / Do / Output / Skip sections and a fast router.
- Gate sequence 1→6 with owner approval matrix and Fast Lane guardrails.
- Risk classification (LOW…CRITICAL) driving depth of QA.
- Shared rules R0–R25 (registration gate, code-is-truth, hotspot list, financial sanctity, Laravel PUT quirk…).
- Evidence persistence to `/app/memory/evidence/<ID>/`, secret masking, artifact naming standard.
- Investigation hypothesis method with 10-step budget.

The gaps below are about **state control between roles**, **failure handling**, and **regression as a first-class stage** — not about adding more roles.

---

## 2. Gap Register

Each gap: what v0.7 says · what actually happened · proposed v0.8 control.

### GAP-01 — No explicit mode/state machine; roles bleed within a session
| | |
|---|---|
| v0.7 | Router says "pick exactly one role"; "if more than one, choose the earliest". Nothing forbids changing role mid-session, and nothing requires an owner checkpoint to do so. |
| Evidence | `SESSION_HANDOVER_2026_09_04_CR358_P3QA_P4IMPL_REGRESSION.md`: one session ran QA → IMPLEMENTATION → QA → REGRESSION, self-QA'd its own code, and fixed a MAJOR regression bug without a BUG ID (F-PROC-01). Investigation Sep 6 slid from "find" to "register gap" on an over-generalised finding (F-PROC-02). |
| Proposed v0.8 | **§MODE STATE MACHINE.** Every session has exactly one `MODE ∈ {INVESTIGATE, INTAKE, PLAN, IMPLEMENT, QA, BUGFIX, REGRESSION, SMOKE, AUDIT, CLOSE, RELEASE, DEPLOY}` declared in the first response as `MODE: <X> · ITEM: <ID> · GATE: <n>`. Allowed transitions are a table (e.g. INVESTIGATE→PLAN, PLAN→IMPLEMENT only after Gate 4 GO, IMPLEMENT→QA **only by a new session/agent**, QA→BUGFIX). Any transition requires the literal owner token `TRANSITION: <from>→<to> APPROVED`. Forbidden: IMPLEMENT→QA same session (no self-QA); INVESTIGATE→IMPLEMENT/BUGFIX (must pass through owner). Every response footer restates current MODE. |

### GAP-02 — Investigation has no "hand-off boundary" and no confidence contract on findings
| | |
|---|---|
| v0.7 | "Do NOT write code. Investigation agent recommends." Exit criteria exist but a finding can be registered as a gap/CR in the same breath. |
| Evidence | F-PROC-02: "v1 endpoints defunct" written into OG-PMS-016 from 3 probes; baseline probe shows 12/14 v1 routes live. |
| Proposed v0.8 | Findings carry `confidence: HIGH (reproduced ≥2 ways) / MEDIUM (traced once) / LOW (inferred)`. Only HIGH may be written to `OPEN_GAPS_REGISTER` / `registry.json` by the Investigation role; MEDIUM/LOW go to the report's "Candidates" section for INTAKE to confirm. Generalisations ("all X", "every Y") require an explicit sample statement (`n=… of …`). |

### GAP-03 — Missing inputs are worked around instead of halting
| | |
|---|---|
| v0.7 | "If context is missing, ask or mark the assumption clearly" (one line, §Session scope). Boot lists say READ file X but not what to do if X is absent. |
| Evidence | F-PROC-03: no git remote → planning continued 2 sessions; `ENV_REGISTRY.md` referenced as credential truth but does not exist; `test_credentials.md` empty → credentials lifted from chat; `/api/workflow-queue` referenced but backend has no such route. |
| Proposed v0.8 | **§MISSING-INPUT PROTOCOL (MIP).** Every Boot item is tagged `[REQUIRED]` or `[OPTIONAL]`. On a `[REQUIRED]` miss: **HALT** → emit `BLOCKED-INPUT: <path/what> · impact: <which step cannot run> · options: (a) owner provides (b) proceed with stated assumption (c) park`. Agent may not pick (b) itself. `[OPTIONAL]` miss → continue and list under `ASSUMPTIONS` in the final response. A standing **Boot Preflight** (new STEP -0.5) checks: git remote reachable + diff vs source branch, `.env` keys present (names only), credentials file non-empty, referenced control files exist, Jest runner exits. Any red item = BLOCKED-INPUT before role work starts. |

### GAP-04 — Regression is a late, optional role, not a per-item stage
| | |
|---|---|
| v0.7 | Role 9 REGRESSION runs "after multiple items passed smoke". QA role's "Regression Scope" = handover tests + 0–2 cross-flow tests. No definition of a baseline suite; no requirement that the whole Jest run is green. |
| Evidence | F-PROC-04 / F-QA-02: 56 failing tests accumulated since June; every QA report ran only item tests. F-QA-01: node scripts posing as tests passed QA. |
| Proposed v0.8 | **§REGRESSION BASELINE (RB).** Define `REGRESSION_BASELINE.md`: the canonical Jest command, expected `Test Suites: N passed, N total`, the financial/hotspot suites that are always-run, and the known-failure allow-list (each with an ID + retire-by date). New **Gate 5c – Regression** inserted between QA (5b) and Smoke (6) for every item with risk ≥ MEDIUM or touching R5/R6 files: run full baseline, attach the runner summary line verbatim, diff against allow-list; any new failure → BUGFIX (registered) before Gate 6. Role 9 remains for cross-item interaction tests. Implementation Exit Gate gains checkbox 6: "full baseline run, summary pasted, no new failures". |

### GAP-05 — QA accepts counts instead of runner evidence; self-QA allowed
| | |
|---|---|
| v0.7 | QA Exit: "Verification Matrix results", numbers in handover. No requirement to paste runner output; nothing prevents the implementing agent from performing QA. |
| Evidence | F-PROC-05 ("34/34 pass" from scripts that hang Jest), F-PROC-01 (self-QA). |
| Proposed v0.8 | QA evidence must be **machine output**: Jest summary block, `curl -w %{http_code}` lines, screenshot paths — saved under `evidence/<ID>/qa/`. QA of an item may not be performed by the session that implemented it (enforced via MODE transition table). Test files must `import` from `src/` (no inlined copies) — QA rejects otherwise. |

### GAP-06 — Registry sync is a manual multi-file ritual → partial updates
| | |
|---|---|
| v0.7 | R17 "Registry Sync Gate" lists files to update; Implementation Exit Gate has a Python one-liner for `registry.json` only. |
| Evidence | F-PROC-06 (G9 MAJOR: `registry.json` updated, markdown not); F-DRIFT-02 (4 spellings of `type`, 497 null categories, 25 status variants); F-DRIFT-03 (SPRINT_STATUS 3 months stale). |
| Proposed v0.8 | Canonical enums for `type` and `status` (closed set, listed in prompt). One sync script `control/sync_registry.py --id CR-xxx --status … --gate …` is the **only** permitted way to change status; it updates `registry.json` and regenerates the markdown tables + dashboard JSON. Exit Gates check `git diff --stat memory/control` shows all four files touched. |

### GAP-07 — Nobody owns "what ships" (production surface hygiene)
| | |
|---|---|
| v0.7 | Pre-Release Audit checks performance/security/a11y generally; no allow-list for `public/`, no rule on `.bak`, no rule on unauthenticated preview routes. |
| Evidence | F-SEC-01/02/03, F-ARCH-06. |
| Proposed v0.8 | New rule **R26 Production Surface**: `frontend/public/` allow-list (`index.html, favicon, manifest, fonts, logo, robots`); anything else → BLOCKED at Pre-Release Audit. `src/` may not contain `*.bak*`. Any `<Route>` without `ProtectedRoute` must be listed in `PUBLIC_ROUTES.md` with a justification. Deployment role runs this check on boot. |

### GAP-08 — Credentials/environment truth is undefined
| | |
|---|---|
| v0.7 | Points to `ENV_REGISTRY.md` (missing) and "owner-provided secure note". |
| Evidence | F-DRIFT-04. |
| Proposed v0.8 | Create `control/ENV_REGISTRY.md` (key **names** + purpose + owner, never values) and populate `/app/memory/test_credentials.md` with alias→account mapping (values held by owner/platform). Boot Preflight fails if either is missing/empty. |

### GAP-09 — Session scope creep has no hard stop
| | |
|---|---|
| v0.7 | R19 "Session scope control" exists (one line). |
| Evidence | Sep 4 session grew from one QA task to four roles; PDF/dummy-data sessions spawned extra screens on request without a scope note. |
| Proposed v0.8 | **Scope Lock**: first response states `SCOPE: <item(s)> · OUT-OF-SCOPE: anything else`. New asks mid-session → agent answers `SCOPE-CHANGE REQUEST: <what> — accept (new item via INTAKE) / defer / reject?` and waits. Final response includes `SCOPE DELTA: none | <list with owner approval refs>`. |

### GAP-10 — No standard "final response" fields for state hand-back
| | |
|---|---|
| v0.7 | Role-specific final formats exist but omit MODE, blockers, assumptions, regression result. |
| Proposed v0.8 | Universal footer appended to every role's final response: `MODE · ITEM · GATE reached · REGRESSION: <baseline summary or N/A> · BLOCKED-INPUTS · ASSUMPTIONS · SCOPE DELTA · NEXT MODE (requires owner token)`. |

---

## 3. Proposed structure of `AGENT_PROMPT_ALPHA_v0.8.md`

```
0. IDENTITY (unchanged)
1. v0.8 OPERATING LAYER — compatibility note, what REPLACES what (only: Exit Gate 5→6 items; QA independence)
2. MODE STATE MACHINE  ← GAP-01, GAP-09, GAP-10
   2.1 Mode list + declaration format
   2.2 Transition table (allowed / owner-token / forbidden)
   2.3 Scope Lock
3. BOOT PREFLIGHT (STEP -0.5) + MISSING-INPUT PROTOCOL ← GAP-03, GAP-08
4. ROLE DECISION TREE (unchanged, references modes)
5. RISK CLASSIFICATION (unchanged) + confidence labels for findings ← GAP-02
6. GATES — adds Gate 5c REGRESSION; REGRESSION_BASELINE contract ← GAP-04
7. ROLES 1–12 (v0.7 text retained) with deltas:
   INVESTIGATION: confidence + no-register rule
   IMPLEMENTATION: Exit Gate item 6 (baseline run), forbidden→QA
   QA: machine-evidence rule, import-from-src rule, independence
   REGRESSION: per-item (5c) + cross-item (Role 9) split
   PRE-RELEASE AUDIT / DEPLOYMENT: R26 production-surface check
   CLOSURE: registry sync via script only
8. SHARED RULES R0–R25 (unchanged) + R26 Production Surface, R27 Canonical enums/sync script, R28 Confidence labels
9. UNIVERSAL FINAL-RESPONSE FOOTER
10. ENVIRONMENT / CREDENTIALS (points to ENV_REGISTRY.md + test_credentials.md)
11. CHANGELOG v0.8
```

Estimated size: v0.7 + ~350 lines. No v0.7 role text deleted; two items marked `REPLACES` (Exit Gate list, QA independence).

---

## 4. Decisions needed from owner before writing v0.8

| # | Decision | Options |
|---|---|---|
| D1 | Self-QA prohibition | (a) hard forbid IMPLEMENT→QA in same session · (b) allow for LOW-risk items only |
| D2 | Gate 5c Regression applies to | (a) every item · (b) risk ≥ MEDIUM or R5/R6 files only *(recommended)* |
| D3 | Known-failure allow-list | (a) start with today's 56 failures, each with retire-by date · (b) require triage to green before v0.8 goes live |
| D4 | Registry changes | (a) only via `sync_registry.py` (script to be written as a separate CR) · (b) keep manual edits but add Exit-Gate diff check |
| D5 | Transition token wording | `TRANSITION: X→Y APPROVED` or owner's preferred phrase |
| D6 | Should v0.8 also absorb the Baseline remediation order (§9) as the sprint's opening queue? | yes / no |
