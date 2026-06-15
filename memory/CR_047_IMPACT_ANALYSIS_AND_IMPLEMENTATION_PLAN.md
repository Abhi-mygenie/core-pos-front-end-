# CR-047 — Impact Analysis (Gate 2) — REVISED

**Created:** 2026-06-15
**Revised:** 2026-06-15 (scope expanded: +STEP -1 fixes, +PLANNING stage routing, +env check conditional)
**Author:** Planning Agent
**Code Reality:** FULL — editing existing v0.5 (1149 lines)
**Conflict Pre-Check:** NONE — no other open item touches AGENT_PROMPT_ALPHA.md

**Target file:** `/app/memory/control/AGENT_PROMPT_ALPHA.md`
**Application code impact:** ZERO — doc-only CR

---

## 1. Full Scope (7 change areas)

| # | Area | Current Lines | What Changes | Est. Lines Added |
|---|------|:---:|---|:---:|
| S-1 | STEP -1: Universal Pre-Boot | 41–90 | +Handover reading, +stale batch (48h), +multi-batch ordering, +owner-didn't-respond fallback | ~25 |
| S-2 | STEP -1: Environment Check | (new sub-section) | NEW conditional check — only for roles that need live app | ~20 |
| S-3 | Role 2: PLANNING — Stage Routing | 139–224 | +Stage dispatch (impact_analysis → Gate 2 ONLY; implementation_plan → Gate 3 ONLY; manual → ask) | ~20 |
| S-4 | Role 1: INTAKE | 94–136 | +Severity rubric, +duplicate detection, +evidence storage, +source/confidence tag, +blast radius | ~55 |
| S-5 | Role 4: QA | 351–404 | +Finding severity (4-tier), +environment check, +re-test protocol, +evidence format, +coverage check, +regression calibration | ~60 |
| S-6 | Role 5: BUG FIX | 407–440 | Full rewrite: +reproduce-first, +RCA (5 classifications), +fix report, +5 escalation paths, +scope expansion protocol | ~90 |
| S-7 | Role 6: INVESTIGATION | 443–480 | +10-step time-box, +hypothesis method, +structured report template (6 sections), +data persistence, +exit criteria, +Bug Fix escalation intake | ~65 |
| — | Changelog | 1136–1144 | +v0.6 entry | ~3 |
| **TOTAL** | | | | **~338** |

**File grows from ~1149 → ~1487 lines.**

---

## 2. S-1 — STEP -1: Universal Pre-Boot (lines 41–90)

### Current State (v0.5)
```
1. Read workflow_queue.json
2. IF batches → present to owner
3. WAIT for YES/NO/MODIFY
4. On YES → pick role from stage mapping
5. Process items in priority order
6. After done → update queue + registry + handover
7. IF no batches → owner picks role
```

### Gaps Found

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G-1 | **No handover reading.** Queue says WHAT to work on but not WHERE previous agent left off. Only some roles (IMPLEMENTATION, QA) read handover in their boot. | Line 46 only reads `workflow_queue.json`. No mention of `/app/memory/handover/`. | Agent starts blind — might redo work the previous agent already completed, or miss context. |
| G-2 | **No stale batch detection.** If a batch was created 3 days ago and is still QUEUED, agent presents it as fresh. | Line 49: no timestamp validation. | Agent works on an abandoned batch that owner forgot to cancel. |
| G-3 | **No multi-batch ordering.** If 5 batches exist, no guidance on presentation order or one-at-a-time approval. | Line 49–62: singular batch presentation ("BATCH-XXX"). | Agent dumps 5 batches at once — owner overwhelmed, unclear which to approve first. |
| G-4 | **No "owner didn't respond" fallback.** Owner might say "start session" without addressing the batch. Agent stalls per "WAIT for approval." | Line 64: "Do NOT proceed without explicit YES." No fallback path. | Session deadlocks — agent presents batch, owner ignores it, nobody moves. |

### Proposed Additions

```
STEP -1 ADDITIONS:

1a. (NEW) Read latest handover:
    ls -t /app/memory/handover/SESSION_HANDOVER_*.md | head -1 → READ
    Present 1-line summary: "Last session (<date>): <summary from handover header>"

2a. (NEW) Stale batch detection:
    IF batch.created_at is older than 48 hours:
      Flag: "⚠ This batch was created <N> days ago. Still relevant? YES/NO/REMOVE"

2b. (NEW) Multi-batch ordering:
    Present batches in order: by stage (earliest gate first), then by priority (P0 items first)
    Owner approves ONE batch at a time.
    After batch complete → present next batch.

3a. (NEW) Owner-didn't-respond fallback:
    IF owner's response doesn't address the presented batch:
      Re-present ONCE: "I need direction on the queued batch. YES to proceed / NO to skip / or tell me what you'd like to work on instead."
      IF still no batch response: treat as NO (skip batch), ask owner what they want.
```

### Downstream Impact
- **All roles:** Get handover context for free at session start (no per-role change needed)
- **Batch stages:** No change to the stage→role mapping table — stays the same
- **Dashboard (CR-046):** No change — queue format unchanged, just agent reads it more carefully

### Risk: LOW
- Stale batch 48h threshold is arbitrary — owner can override
- Handover reading adds ~30 seconds to boot — negligible
- Fallback path prevents deadlock — strictly positive

---

## 3. S-2 — STEP -1: Environment Check (NEW sub-section after line ~88)

### Current State (v0.5)
No environment verification anywhere in STEP -1. Each role either assumes env is running or checks ad-hoc.

### Gap Found

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G-5 | **No environment check, and it was proposed as universal but should be conditional.** PLANNING, INTAKE, CLOSURE never need a running app. Only execution/testing roles do. | Roles 1, 2, 11 only read files. Roles 3, 4, 5, 7, 8, 9, 10, 12 need live app or APIs. Role 6 needs external API only. | Universal check wastes time for doc-only roles. Missing check for execution roles causes false failures. |

### Proposed Addition

```
STEP -1.5 — ENVIRONMENT CHECK (CONDITIONAL):

  Roles that NEED live app: IMPLEMENTATION, QA, BUG FIX, DEPLOYMENT, 
                            SMOKE, REGRESSION, PRE-RELEASE AUDIT, RELEASE
    → Check:
      1. Frontend compiles: tail -5 /var/log/supervisor/frontend.out.log → "Compiled"
      2. Backend responds: curl -s <PREVIEW_URL>/api/ → expect 200
      3. Login works: curl -s -X POST <LOGIN_API> with test creds → expect token
    → If ANY fail:
      "Environment not ready. <specific failure>. 
       Option A: I switch to DEPLOYMENT role to fix it
       Option B: Owner fixes manually
       I cannot proceed with <ROLE> until environment is running."

  Roles that DON'T need live app: INTAKE, PLANNING, CLOSURE
    → Skip entirely. Only need file system access.

  INVESTIGATION (partial need):
    → Check: curl -s https://preprod.mygenie.online/api/v1/... → expect response
    → Don't need: local frontend/backend
```

### Downstream Impact
- **QA role (S-5):** The QA-specific environment check proposed earlier now moves UP to STEP -1.5. QA boot sequence no longer needs its own env check — it's already done.
- **IMPLEMENTATION/BUG FIX:** Already have "verify webpack compiles" in their playbooks. STEP -1.5 catches earlier (before boot), so their existing checks become redundant-but-harmless safety nets.

### Risk: ZERO
- Conditional check — only runs when needed. Doc-only roles unaffected.

---

## 4. S-3 — Role 2: PLANNING — Stage Routing (lines 139–224)

### Current State (v0.5)
PLANNING role lists Steps 0→1→2→3→4→5 as a sequential flow. No instruction on which steps to execute based on batch stage.

### Gap Found

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G-6 | **Both `impact_analysis` and `implementation_plan` stages map to PLANNING role, but agent has no instruction to do only the relevant gate.** | Lines 70–71 map both stages to PLANNING. Lines 151–200 list all steps sequentially. | Agent called for Gate 3 might redo Gate 2 work. Agent called for Gate 2 might write a full Implementation Plan when only Impact Analysis was requested. |

### Proposed Addition

Insert at the top of the PLANNING "### Do" section (after line 151), before Step 0:

```
#### Stage Dispatch (MANDATORY — before Step 0)

  IF called via batch with stage = "impact_analysis":
    → Execute: Step 0 (Code Reality) + Step 1 (Conflict) + Step 2 (Gate 2: Impact Analysis)
    → STOP after Impact Analysis output. Do NOT write Implementation Plan.
    → Handover: "Impact Analysis complete for <N> items. Awaiting owner review → Gate 3."

  IF called via batch with stage = "implementation_plan":
    → READ the existing Impact Analysis doc (Gate 2 already done by previous session)
    → Verify Impact Analysis is still accurate (code hasn't changed since it was written)
    → Execute: Step 3 (Gate 3: Plan) + Step 4 (Verification Matrix) + Step 5 (Registry Checklist)
    → STOP after Plan output. 
    → Handover: "Implementation Plan complete. Awaiting Gate 4 GO."

  IF owner picks PLANNING role manually (no batch):
    → Ask owner: "Impact Analysis (Gate 2), Implementation Plan (Gate 3), or both?"
    → Execute only what owner requested.
```

### Downstream Impact
- **Impact on TYPICAL SPRINT SEQUENCE (line 886–912):** No change — the sequence already shows Gate 2 and Gate 3 as separate agent calls. This addition makes the PLANNING role text match the sequence.
- **Impact on IMPLEMENTATION role:** None — Implementation still reads the plan, regardless of how Planning was called.
- **Impact on Distributed Artifact Ownership table (line 864–877):** No change — artifacts 2 and 3 are already separate rows.

### Risk: LOW
- Agent might have an Impact Analysis that's stale when called for Gate 3. Mitigation: "Verify Impact Analysis is still accurate" step included.

---

## 5. S-4 — Role 1: INTAKE (lines 94–136)

### Current State (v0.5)
```
Boot: Read CONTROL_DASHBOARD, CR_REGISTRY, BUG_TRACKER, INTAKE_WORKFLOW
Do: Code Reality Check → 5 questions → auto-generate intake doc → register → update registries
Output: Intake doc, registry entry, updated tracker, code reality status
```
42 lines. No severity criteria, no duplicate protocol, no evidence handling.

### Gaps Found

| # | Gap | Current Text | Impact |
|---|-----|-------------|--------|
| G-7 | **No severity rubric.** Agent picks P0/P1/P2/P3 with no criteria. | Line 111: "Ask owner 5 questions: Describe → Classify → Attachments → Area+Priority → Confirm" — Priority is asked but agent has no guidance on what makes something P0 vs P2 | Inconsistent severity across sessions. Planning agent can't trust intake priorities. |
| G-8 | **No duplicate detection protocol.** Says "check for duplicates" but no definition. | Line 102: "check for duplicates" (in Boot reading list) — that's it | Re-registers existing work. Registry bloats. |
| G-9 | **No evidence storage.** Says "Attachments" in the 5 questions but no storage path or format. | Line 111: "Attachments" as question 3 — no follow-through | Evidence lost. QA and Investigation agents have to rediscover. |
| G-10 | **No source/confidence distinction.** Owner-reported vs agent-discovered treated the same. | Not mentioned anywhere in INTAKE | Bug Fix agent doesn't know if repro steps are verified or hypothetical. |
| G-11 | **No blast radius estimate.** Planning agent discovers scope from scratch. | Not mentioned in INTAKE output | Owner can't prioritize at intake stage (doesn't know if it's 1 file or 20). |

### Proposed Additions

**I-1: Severity Rubric** — Insert after "### Do" heading, before the 5 questions:
```
#### Severity Rubric (MANDATORY — apply before asking owner to confirm priority)

| Severity | Trigger | SLA |
|----------|---------|-----|
| P0 — CRITICAL | Money loss, order loss, data corruption, auth bypass | Fix same sprint, cannot defer |
| P1 — HIGH | Feature broken, no workaround, realtime failures, crash/blank on core flow | Fix this sprint unless backend-blocked |
| P2 — MEDIUM | Wrong label, layout, minor display, works but awkward, <5% users | Next sprint unless quick win |
| P3 — LOW | Dead code, missing test, console warning, doc stale | Backlog |

Agent classifies using rubric. Present to owner: "I'd classify this as P1 because <reason>. Agree?"
Owner can override. Record final severity with owner's rationale if different.
```

**I-2: Duplicate Detection Protocol** — Insert after Code Reality Check:
```
#### Step 0b — Duplicate Detection (MANDATORY before registering)

  1. ID search: grep registry.json + BUG_TRACKER.md + CR_REGISTRY.md for keywords from issue
  2. File search: grep codebase for the component/feature mentioned
     → if another CR/BUG touched same file in last 30 days → flag as RELATED
  3. Symptom match: search recent handover docs for similar user-reported behavior

  Classification:
    DUPLICATE → link to existing ID, do NOT register new. Inform owner.
    RELATED   → register new with "Related: <ID>" field. Flag to owner.
    DISTINCT  → register normally.

  Record in intake doc: "Duplicate check: DISTINCT | RELATED to <ID> | DUPLICATE of <ID>"
```

**I-3: Evidence Storage** — Add to "### Do" section:
```
#### Evidence Capture (MANDATORY for every intake)

  Storage path: /app/memory/evidence/<ID>/
  
  Intake doc MUST include:
    ## Evidence
    - Screenshot: <path or "not provided">
    - Steps to reproduce: <written / owner-provided / not yet reproducible>
    - Curl output: <inline or path or "not applicable">
    - Source: OWNER-REPORTED | AGENT-DISCOVERED | QA-FOUND | REGRESSION-FOUND
    - Confidence: CONFIRMED (owner reproduced) | SUSPECTED (agent found in code) | REPORTED (unverified)
```

**I-4: Blast Radius Estimate** — Add to "### Do" section:
```
#### Blast Radius (quick estimate — not full impact analysis)

  grep -rn "<keyword>" /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
  
  Record in intake doc:
    Blast radius: ~N files, ~N lines referencing this pattern
    Hotspot files touched: YES (list) / NO
    Estimated scope: SMALL (1-2 files) | MEDIUM (3-5) | LARGE (6+)
```

**I-5: Update Output section** — Add to outputs list:
```
  - Duplicate check result: DISTINCT / RELATED / DUPLICATE
  - Evidence section with source + confidence
  - Blast radius estimate
```

### Downstream Impact

| Consumer Role | What They Gain |
|---|---|
| **PLANNING** | Blast radius = effort signal before deep analysis. Severity rubric = trusted priority. |
| **QA** | Evidence section = can reference original repro steps from intake. |
| **BUG FIX** | Source/confidence tag = knows if repro steps are verified or hypothetical. |
| **INVESTIGATION** | Evidence artifacts available at known path `/app/memory/evidence/<ID>/`. |
| **SMOKE** | Severity rubric = can prioritize which items to present first. |
| **CLOSURE** | More complete intake doc = fewer "missing artifact" findings at closure. |

### Interactions with Existing INTAKE Features

| Existing Feature | Impact |
|---|---|
| Code Reality Check (v0.5) | UNCHANGED — stays as Step 0a. New duplicate check becomes Step 0b (after code reality, before registering). |
| 5-question intake flow | MODIFIED — severity rubric slots into question 5 (Priority). Agent now has criteria to suggest a severity before asking owner to confirm. |
| Registry update | UNCHANGED — same process, but intake doc now has more fields. |

### Risk: LOW
- Adds ~3 minutes to intake process (duplicate check + evidence capture + blast radius)
- Worst case: agent flags a false RELATED (harmless — owner corrects)
- Severity rubric is advisory — owner always has final say

---

## 6. S-5 — Role 4: QA (lines 351–404)

### Current State (v0.5)
```
Boot: Read QA Handover, test creds, CONTROL_DASHBOARD
Precondition Check: Verify registry sync confirmation in handover
Do: Execute tests → PASS/FAIL with evidence → regression → Registry Spot-Check
Output: QA Report
```
54 lines. Binary PASS/FAIL, no failure severity, no environment check, no re-test protocol, no coverage check.

### Gaps Found

| # | Gap | Current Text | Impact |
|---|-----|-------------|--------|
| G-12 | **Binary PASS/FAIL with no severity.** | Line 369: "record PASS or FAIL with evidence" | Owner doesn't know if failure is cosmetic or data corruption. Bug Fix agent has no priority guidance. |
| G-13 | **No environment verification.** | Not in QA boot sequence. | QA reports 20 failures when the real issue is "frontend didn't compile." False negative cascade. |
| G-14 | **No re-test protocol after Bug Fix.** | Not mentioned. | After Bug Fix returns, QA might re-run only 2 of 5 failures, or re-run all 20 tests unnecessarily. |
| G-15 | **No evidence format standard.** | Line 369: "screenshot, curl output, console log" — no required format | Inconsistent reports. Bug Fix agent gets vague repro steps. |
| G-16 | **No coverage sufficiency check.** | Not mentioned. | Changed file with no test coverage ships unverified. |
| G-17 | **No regression scope calibration.** | Line 370: "Run regression tests from handover doc" — no guidance if handover has too few | Under-regression on hotspot changes. Over-regression on trivial changes. |

### Proposed Additions

**Q-1: Finding Severity** — Add after "### Do" heading:
```
#### Finding Severity (MANDATORY for every FAIL)

| Severity | Trigger | Routing |
|----------|---------|---------|
| BLOCKER | Core flow broken, money wrong, crash, data corruption | Bug Fix MANDATORY before smoke |
| MAJOR | Feature doesn't work as specified, workaround exists | Bug Fix MANDATORY before smoke |
| MINOR | Cosmetic, label, alignment, edge case UX | Owner decides: ship with known issue OR fix |
| NOTE | Observation, suggestion, doc gap — not a failure | Log in report, no action |

NOTE on terminology: QA severity (BLOCKER–NOTE) ≠ Intake priority (P0–P3).
  - P0 item can have MINOR finding (label wrong on critical feature)
  - P2 item can have BLOCKER finding (data corruption on low-priority feature)
  These are independent dimensions.
```

**Q-2: Environment Check** — Replace Boot section:
```
### Boot (2 min)
  READ:
    1. QA Handover doc (PRIMARY)
    2. Test credentials from handover doc
    3. /app/memory/control/CONTROL_DASHBOARD.md → context only

  NOTE: If you reached QA via STEP -1.5, environment is already verified.
  If called directly (no STEP -1.5): verify frontend compiles + backend responds + login works.
  If env down → STOP: "Cannot start QA — <specific failure>. Fix environment first."
```

**Q-3: Re-test Protocol** — Add new section:
```
### Re-test Protocol (after Bug Fix agent returns)
  1. Re-run ALL previously-FAILING test cases (not just the ones Bug Fix claims to have fixed)
  2. Re-run regression tests from original QA handover
  3. If Bug Fix touched files NOT in original scope → add 1 ad-hoc smoke test per new file
  4. Document: "Re-test round <N>: X/Y pass (was X'/Y previously)"
```

**Q-4: Evidence Format** — Replace "record PASS or FAIL with evidence":
```
#### Evidence Format (per finding)

  | # | Test Case | Steps | Expected | Actual | Severity | Evidence |

  Required evidence per severity:
    BLOCKER/MAJOR: screenshot + curl/console + exact repro steps (ALL required)
    MINOR: screenshot OR description (at least one)
    NOTE: description only
```

**Q-5: Coverage Check** — Add before Registry Spot-Check:
```
### Coverage Sufficiency Check (after all test cases executed)
  For each file in the QA handover's "files changed" list:
    Does at least 1 executed test case exercise this file's changes? YES/NO
    If NO → write 1 ad-hoc test case and execute it.
  Record: "Coverage: N/N changed files have ≥1 test."
```

**Q-6: Regression Scope Calibration** — Replace "Run regression tests from handover doc":
```
### Regression Scope (determined by QA agent)
  - Change touches 1-2 files, NONE are hotspots (R5 list) → handover regression only
  - Change touches ANY hotspot file (R5) → handover regression + 2 cross-flow tests
    (e.g., place order → settle → report)
  - Change touches 3+ files OR any financial logic (R6) → handover regression
    + full critical-path smoke (login → order → settle → report → logout)
```

### Downstream Impact

| Consumer Role | What They Gain |
|---|---|
| **BUG FIX** | Finding severity = prioritize BLOCKER first. Evidence format = clear repro steps. |
| **SMOKE** | QA report severity = owner knows what's cosmetic vs critical. |
| **CLOSURE** | More complete QA reports = fewer "missing evidence" findings. |

### Interactions with Existing QA Features (v0.5)

| Existing Feature | Impact |
|---|---|
| Precondition Check (reject unsynced handovers) | UNCHANGED. Still runs first. |
| Registry Spot-Check | UNCHANGED. Still runs last. Coverage Check slots before it. |
| "Do NOT fix code" boundary | UNCHANGED and REINFORCED. |
| Evidence rule (line 369) | REPLACED with structured format (Q-4). More specific, not less. |

### Ordering of QA Steps After v0.6

```
1. Boot (read handover, creds, dashboard)
2. Environment check (if not already verified by STEP -1.5)
3. Precondition Check (v0.5 — reject unsynced handovers)
4. Execute test cases with finding severity (Q-1) + evidence format (Q-4)
5. Regression scope calibration (Q-6) → run appropriate regression
6. Coverage sufficiency check (Q-5)
7. Registry Spot-Check (v0.5)
8. Write QA Report
```

### Risk: LOW
- Finding severity adds ~1 min per failure (classification + evidence). Net positive — Bug Fix gets better input.
- Coverage check might add 1-2 ad-hoc tests per session. Catches untested files.
- Re-test protocol clarifies scope — prevents both under-testing and over-testing.

---

## 7. S-6 — Role 5: BUG FIX (lines 407–440) ⚠️ BIGGEST CHANGE

### Current State (v0.5)
```
Boot: Read QA Report, Implementation Plan, view source files
Do: Fix failing tests, stay minimal, re-run, verify no regressions, scope expansion → STOP
     EXIT GATE (same as Implementation)
Output: Code fix, re-test results, updated QA Report, registry sync
```
33 lines. Thinnest playbook. No reproduce step, no RCA, no escalation paths, no fix report.

### Gaps Found

| # | Gap | Current Text | Impact |
|---|-----|-------------|--------|
| G-18 | **No reproduce-before-fixing step.** | Jump straight to "Fix the specific failing test case(s)" (line 418) | Agent fixes wrong thing. Or fixes a symptom of env being down. |
| G-19 | **No root cause documentation.** | Not mentioned. | Same bug patterns recur sprint after sprint. No retrospective data. |
| G-20 | **No fix report artifact.** | Output is just "Code fix" + "Re-test results" (lines 424-428) | Closure agent has no artifact from Bug Fix. No audit trail of what was fixed and why. |
| G-21 | **No escalation paths.** Agent either fixes or gets stuck. | Line 421: "scope expansion → STOP, declare, get confirmation" — only path. | Cannot reproduce → stuck. Backend issue → stuck. Root cause unclear → stuck. Doom loops. |
| G-22 | **No scope expansion protocol details.** | Line 421: "STOP, declare, get confirmation" — no format or risk assessment. | Uncontrolled scope creep or agent too cautious to touch adjacent file. |
| G-23 | **Missing: RCA depth varies by severity.** | No severity awareness. | Agent does full 10-min RCA trace on a 1-line CSS fix. |

### Proposed: Full Rewrite

Replace entire Role 5 section (lines 407–440) with expanded version:

```
## ROLE 5: BUG FIX AGENT

### Boot (3 min)
  READ:
    1. QA Report — failures only, sorted by severity (BLOCKER first, then MAJOR, then MINOR)
    2. Implementation Plan doc — understand what was intended
    3. View specific source file(s) at the failing lines
    4. /app/memory/control/FILE_OWNERSHIP.md — check recent modifiers

### Step 0 — Reproduce Before Fixing (MANDATORY)
  For each failure:
    1. Follow QA report's exact repro steps
    2. Confirm you see the same symptom (curl output / screenshot / console error)
    3. If CANNOT reproduce after 2 attempts:
       → Return to QA: "Cannot reproduce <test#>. Evidence: <what I see instead>.
          Possible causes: <hypotheses>. Need QA to re-verify with exact data."
    4. Record: "Reproduced: YES/NO — evidence: <screenshot/curl/log>"

### Step 1 — Root Cause Analysis
  Depth based on QA severity:
    BLOCKER/MAJOR: Full RCA (trace + classify + document)
    MINOR: 1-line summary sufficient ("CSS margin 4px → 8px per plan")

  For full RCA, trace: symptom → component → state/prop → service → transform → API
  Classify:
    PLAN_GAP     — plan missed this case
    CODE_ERROR   — plan was right, code deviated
    DATA_EDGE    — code correct for normal data, fails on this data shape
    ENVIRONMENT  — config / env var / dependency issue
    INTERACTION  — another CR/BUG's code interferes

  Document: "Root cause: <classification> — <file>:<line> — <1-sentence why>"

### Step 2 — Fix
  Fix the SPECIFIC failing case. Do NOT fix adjacent code.
  
  Scope expansion protocol:
    IF fix requires file NOT in original plan:
      STOP → "Fix for <test#> requires <file> (not in plan). Reason: <why>. Risk: <L/M/H>. Approve?"
      → Wait for owner approval.
    IF fix requires HOTSPOT file (R5 list):
      Write 3-line risk note: "Touching <hotspot>. Original change: <X>. My fix: <Y>. Interaction risk: <Z>."

### Step 3 — Verify Fix
  - Re-run the specific failing test case(s) → PASS?
  - Run 2 adjacent test cases from QA handover
  - If fix touches financial logic (R6) → 1 end-to-end money test
  - Compile check: webpack 0 new warnings
  - Record: "Fix verified: <test#> now PASS. Adjacent: N/N PASS."

### Step 4 — EXIT GATE (same as Implementation — 5 checkboxes)

### Escalation Paths (when you can't fix it)
  
  | Trigger | Action | Recipient |
  |---------|--------|-----------|
  | Cannot reproduce after 2 attempts | Return with evidence of what you see instead | QA agent (re-verify) |
  | Root cause is in ANOTHER CR/BUG's code | Flag INTERACTION, do NOT fix other item's code | Owner (decides priority) |
  | Root cause is backend | Document as BACKEND_BUG, add workaround if possible | BACKEND_BRIEF + owner |
  | Root cause unclear after 30 min | Escalate with: symptom + attempted + hypothesis | INVESTIGATION agent |
  | Scope expansion owner won't approve | Document as KNOWN_ISSUE with workaround | OPEN_GAPS_REGISTER |

### Output
  - Code fix (via search_replace)
  - Fix Report at /app/memory/handover/BUG_FIX_REPORT_<DATE>.md:
      Per failure: | Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
      Summary: N/N fixed. Root cause pattern: (e.g., "3 of 5 were PLAN_GAP")
      Scope expansion: NONE / YES (details)
  - Updated QA Report (failure → fixed, with new evidence)
  - Registry sync confirmation

### Handover to Next (→ QA re-test or → Smoke)
  "Fixed N/N issues. Root causes: N PLAN_GAP, N CODE_ERROR, N DATA_EDGE.
   Fix report at <path>. Registry synced: YES. EXIT GATE: 5/5.
   Scope expansion: NONE / <details>.
   Escalated: <list or none>.
   Recommended: QA re-test round <N>."

### Skip
  - Intake, planning, unrelated test cases
  - Full frozen baseline reading (unless financial logic)
```

### Downstream Impact

| Consumer Role | What They Gain |
|---|---|
| **QA** | Re-test protocol (S-5 Q-3) aligns with Bug Fix output. Fix Report tells QA exactly what changed. |
| **INVESTIGATION** | Receives escalations with structured format (symptom + attempted + hypothesis). Not a cold start. |
| **CLOSURE** | Fix Report = new artifact in the audit trail. No more "Bug Fix left no documentation." |
| **Sprint retrospective** | RCA classifications enable pattern analysis: "60% of sprint bugs were PLAN_GAP" → plans need better edge case coverage. |

### Interactions with Existing Bug Fix Features (v0.5)

| Existing Feature | Impact |
|---|---|
| EXIT GATE (5 checkboxes) | UNCHANGED. Still mandatory. Now in Step 4. |
| "Stay minimal — fix the bug, not adjacent code" | UNCHANGED and REINFORCED. Scope expansion protocol makes it concrete. |
| "scope expansion → STOP, declare" | EXPANDED into detailed protocol with format + risk assessment. |

### Risk: MEDIUM (mitigated)
- Reproduce step could bounce back to QA, adding 1 round-trip. **MITIGATED** by QA's new evidence format (S-5 Q-4) — QA provides reproducible steps.
- Full RCA on every BLOCKER/MAJOR adds 5-10 min. **MITIGATED** by MINOR exception (1-line summary).
- 5 escalation paths are new — agent needs to learn which to use. **MITIGATED** by trigger-based table (unambiguous triggers).

---

## 8. S-7 — Role 6: INVESTIGATION (lines 443–480)

### Current State (v0.5)
```
Boot: Read CONTROL_DASHBOARD, intake doc, relevant source code
Do: Trace data flow, curl-probe APIs, identify root cause, document findings, 
    do NOT write code, retroactive check for unregistered code
Output: Investigation Report (root cause, classification, next steps, curl evidence, retroactive candidates)
```
37 lines. No time-box, no structured method, no persistent data, no exit criteria.

### Gaps Found

| # | Gap | Current Text | Impact |
|---|-----|-------------|--------|
| G-24 | **No time-box.** | No step limit or budget. | Agent rabbit-holes for entire session. Expensive with no conclusion. |
| G-25 | **No structured investigation method.** | Line 454: "Trace data flow: API → transform → state → component → UI" — correct direction but no hypothesis-test cycle. | Meandering traces. Agent follows every branch instead of testing specific hypotheses. |
| G-26 | **No structured report template.** | Lines 462-468: free-form output spec. | Inconsistent reports. Planning agent can't extract actionable information. |
| G-27 | **Investigation data lost between sessions.** | POS 4.0 evidence: "sample data at `/tmp/orders_created.json` (ephemeral)" — this was explicitly noted as temporary in multiple handovers. | Next-session agent re-fetches 38MB API responses because previous evidence was in /tmp/. |
| G-28 | **No exit criteria.** | No guidance on when to stop investigating or what happens after. | Agent doesn't know: hand to Planning? Direct to Bug Fix? Keep investigating? |
| G-29 | **No formal intake from Bug Fix escalation.** | Bug Fix has no escalation path to Investigation (v0.5). | Investigation starts cold — no context from Bug Fix's failed attempt. |

### Proposed Additions

**V-1: 10-Step Time-Box** — Insert at top of "### Do":
```
#### Investigation Protocol (10-step budget)

  Step budget: 10 investigation steps maximum.
  Each step = 1 meaningful action:
    - 1 curl probe
    - 1 code trace (read file + follow data flow)
    - 1 data analysis (parse API response, count patterns)
    - 1 grep scan (search codebase for pattern)
  
  After each step: record finding + update hypothesis status.
  If step 10 reached without root cause → write INCONCLUSIVE report.
  Agent can REQUEST extension (justify in report). Owner decides.
```

**V-2: Hypothesis-Driven Method** — Insert after time-box:
```
#### Hypothesis Method (MANDATORY)

  1. Read intake/bug report → form 2-3 hypotheses
  2. For each hypothesis, define:
     - Evidence that would CONFIRM it
     - Evidence that would ELIMINATE it
     - Cheapest test (curl > code trace > full data analysis)
  3. Test cheapest hypothesis first
  4. After each test: CONFIRMED / ELIMINATED / NEEDS MORE DATA
  5. When 1 hypothesis confirmed with evidence → stop testing others
```

**V-3: Structured Report Template** — Replace current Output section:
```
### Output — Investigation Report at /app/memory/<ID>_INVESTIGATION_REPORT.md

  ## 1. Summary
    Root cause: <1 sentence> | INCONCLUSIVE (top 2 hypotheses ranked by likelihood)
    Classification: FE_BUG | BACKEND_BUG | DATA_ISSUE | CONFIG_ISSUE | INTERACTION_BUG
    Confidence: HIGH (reproduced + traced) | MEDIUM (traced, not reproduced) | LOW (hypothesis only)

  ## 2. Hypotheses Tested
    | # | Hypothesis | Test Method | Steps Used | Result | Evidence |

  ## 3. Data Flow Trace
    API: <endpoint> → Response: <field path> → Transform: <file>:<line> → 
    State: <context/hook> → Component: <file>:<line> → UI: <what renders>
    BREAK POINT: <where the chain breaks>

  ## 4. Evidence Artifacts
    All saved to: /app/memory/evidence/<ID>/
    - curl outputs, data samples, screenshots

  ## 5. Recommendations
    Classification: FE_FIX | BACKEND_ASK | CONFIG_CHANGE | OWNER_DECISION
    If FE fix:
      Scope: N files, ~N lines
      Planning skip eligible? (all must be true):
        ≤10 lines AND 1 file AND not hotspot (R5) AND not financial (R6)
        → YES: recommend DIRECT_BUG_FIX (owner must approve skip)
        → NO: recommend full Planning gate cycle (Gate 2-3)

  ## 6. Retroactive Candidates
    <list IDs where code exists but registry shows NOT STARTED, or NONE>
```

**V-4: Data Persistence Rule** — Add to "### Do":
```
#### Data Persistence (MANDATORY)
  NEVER save investigation artifacts to /tmp/ — data is lost between sessions.
  
  Persistent path: /app/memory/evidence/<ID>/
    - curl responses: <ID>_api_response_<N>.json
    - data samples: <ID>_sample_data.json
    - analysis scripts: <ID>_analysis.py
  
  Every curl output saved:
    curl -s <URL> | python3 -c "import sys,json; json.dump(json.load(sys.stdin),
      open('/app/memory/evidence/<ID>/api_response.json','w'), indent=2)"
```

**V-5: Exit Criteria** — Add new section:
```
### Exit Criteria

  ROOT CAUSE FOUND (HIGH confidence):
    Planning skip eligible? → recommend DIRECT_BUG_FIX (owner approves) or full gate cycle
    Hand to: PLANNING or BUG FIX

  ROOT CAUSE FOUND (MEDIUM confidence):
    Always hand to PLANNING with caveat: "Medium confidence — plan should include validation step"

  INCONCLUSIVE after 10 steps:
    Write report with:
      "Eliminated: <hypotheses>. Remaining: <hypotheses>.
       Next steps to resolve: <specific actions>.
       Recommendation: continue investigation (N more steps) | owner decision needed | park"
    Hand to: OWNER (decides whether to continue, park, or re-scope)
```

**V-6: Bug Fix Escalation Intake** — Add to Boot:
```
### Boot (3 min)
  READ:
    1. /app/memory/control/CONTROL_DASHBOARD.md
    2. Intake doc for the item being investigated
    3. Relevant source code (files mentioned in intake)
    4. (IF escalated from Bug Fix): Bug Fix escalation note containing:
       - Symptom
       - What Bug Fix agent already attempted
       - Bug Fix agent's hypothesis
       → Use this as starting point. Do NOT re-test what Bug Fix already eliminated.
```

### Downstream Impact

| Consumer Role | What They Gain |
|---|---|
| **PLANNING** | Structured recommendations with scope estimate + skip eligibility. Actionable. |
| **BUG FIX** | Escalation path defined (S-6 B-4). Investigation receives context, doesn't start cold. |
| **CLOSURE** | Investigation Report is now a formal artifact with standard sections. |
| **Owner** | INCONCLUSIVE reports have clear next-step options. No more "we investigated but idk." |

### Interactions with Existing Investigation Features (v0.5)

| Existing Feature | Impact |
|---|---|
| Retroactive check (unregistered code) | UNCHANGED — now §6 of structured report template. |
| Curl-probe methodology | UNCHANGED — now formalized as "investigation step" within 10-step budget. |
| "Do NOT write code" boundary | UNCHANGED and REINFORCED. |
| Classification (FE fix / backend ask / config / owner decision) | EXPANDED to 5 types + confidence level. |

### Risk: LOW
- 10-step limit is a DEFAULT not a hard ceiling — agent can request extension.
- Hypothesis method adds structure — doesn't constrain what agent investigates, constrains how.
- Data persistence is pure upside — no downside to saving to `/app/memory/evidence/` instead of `/tmp/`.

---

## 9. Cross-Role Interaction Analysis (Complete)

### 9.1 New Interaction Chains

```
Chain 1: Evidence Flow
  INTAKE (I-3 evidence) → QA (Q-4 evidence format) → BUG FIX (B-1 reproduce from evidence)
  ↪ Intake captures, QA standardizes format, Bug Fix consumes

Chain 2: Severity Flow  
  INTAKE (I-1 P0-P3) → PLANNING (inherits priority) → QA (Q-1 BLOCKER-NOTE) → BUG FIX (B-2 RCA depth)
  ↪ Two independent severity dimensions, both flow downstream

Chain 3: Escalation Chain
  BUG FIX (B-4) → INVESTIGATION (V-6) → PLANNING or BUG FIX (V-5)
  ↪ Fix→Investigate→route. No dead end.

Chain 4: Environment Gate
  STEP -1.5 → roles that need live app skip per-role env checks
  ↪ Single check, not repeated per role
```

### 9.2 Interactions with UNCHANGED Roles

| Role | Interaction | Impact |
|---|---|---|
| **IMPLEMENTATION (3)** | Gains: Bug Fix now has structured report → Implementation context preserved if bug was PLAN_GAP | POSITIVE — plan quality feedback loop |
| **SMOKE (8)** | Gains: QA severity labels in report → can tell owner which failures matter | POSITIVE |
| **REGRESSION (9)** | No direct interaction | NONE |
| **PRE-RELEASE (10)** | No direct interaction. §F unchanged. | NONE |
| **CLOSURE (11)** | Gains: Bug Fix Report + Investigation Report = 2 new artifact types | POSITIVE — fewer missing artifacts |
| **RELEASE (12)** | No direct interaction | NONE |

### 9.3 Potential Conflicts

| # | Risk | Between | Resolution |
|---|------|---------|------------|
| 1 | **Severity terminology confusion** | INTAKE P0-P3 vs QA BLOCKER-NOTE | Explicit note in both sections: "These are independent dimensions." |
| 2 | **Evidence format mismatch** | INTAKE (I-3) vs QA (Q-4) | Same base format. INTAKE captures, QA adds test-specific columns. Compatible. |
| 3 | **Planning skip abuse** | INVESTIGATION (V-5) | Strict criteria + owner approval gate. Cannot skip for hotspot/financial. |
| 4 | **Re-test scope ambiguity** | QA (Q-3) | Clarified: "all previously-FAILING" not "all test cases." |
| 5 | **Environment check overlap** | STEP -1.5 vs QA boot vs IMPLEMENTATION boot | STEP -1.5 is primary. Role-specific checks become safety nets — redundant but harmless. |
| 6 | **Bug Fix RCA overkill on MINOR** | BUG FIX (B-2) | Explicit exception: "MINOR severity: 1-line summary sufficient." |

**All 6 conflicts resolved in design. No unresolved contradictions.**

---

## 10. Verification Matrix (seeds QA handover)

| # | Section | Change | How to Verify |
|---|---------|--------|--------------|
| 1 | STEP -1 | Handover reading added | §STEP -1 mentions latest handover + 1-line summary |
| 2 | STEP -1 | Stale batch detection (48h) | §STEP -1 has timestamp check + "Still relevant?" prompt |
| 3 | STEP -1 | Multi-batch ordering | §STEP -1 has ordering rule (stage first, priority second) + one-at-a-time |
| 4 | STEP -1 | Owner-didn't-respond fallback | §STEP -1 has re-present-once + treat-as-NO fallback |
| 5 | STEP -1.5 | Conditional environment check | §STEP -1.5 lists which roles need/skip env check |
| 6 | PLANNING | Stage dispatch (Gate 2 only / Gate 3 only / ask) | §PLANNING has 3-way IF block at top of Do section |
| 7 | INTAKE | Severity rubric (P0-P3 table with triggers + SLA) | §INTAKE has rubric table before 5 questions |
| 8 | INTAKE | Duplicate detection (3-step + DUPLICATE/RELATED/DISTINCT) | §INTAKE has Step 0b protocol |
| 9 | INTAKE | Evidence storage (path + mandatory section + source/confidence) | §INTAKE has evidence capture section |
| 10 | INTAKE | Blast radius estimate (grep + count + hotspot) | §INTAKE has blast radius section |
| 11 | QA | Finding severity (4-tier BLOCKER-NOTE + routing rules) | §QA has severity table + terminology note |
| 12 | QA | Environment check (conditional via STEP -1.5) | §QA boot references STEP -1.5 |
| 13 | QA | Re-test protocol (after Bug Fix) | §QA has re-test section with 4 rules |
| 14 | QA | Evidence format (table template + required evidence per severity) | §QA has evidence format section |
| 15 | QA | Coverage sufficiency check | §QA has per-file coverage check |
| 16 | QA | Regression scope calibration (3-tier) | §QA has regression scope section |
| 17 | QA | Step ordering (8 steps listed) | §QA has numbered step sequence |
| 18 | BUG FIX | Reproduce before fixing (Step 0 mandatory) | §BUG FIX has Step 0 with "cannot reproduce" path |
| 19 | BUG FIX | Root cause analysis (5 classifications + depth by severity) | §BUG FIX has Step 1 with classification table |
| 20 | BUG FIX | Fix report template | §BUG FIX output has report format |
| 21 | BUG FIX | 5 escalation paths (table with trigger + action + recipient) | §BUG FIX has escalation table |
| 22 | BUG FIX | Scope expansion protocol (non-plan file + hotspot) | §BUG FIX Step 2 has protocol |
| 23 | BUG FIX | MINOR RCA exception | §BUG FIX Step 1 has "MINOR: 1-line summary" |
| 24 | INVESTIGATION | 10-step time-box | §INVESTIGATION has step budget + INCONCLUSIVE handling |
| 25 | INVESTIGATION | Hypothesis method (form → define → test → update) | §INVESTIGATION has 5-step hypothesis cycle |
| 26 | INVESTIGATION | Structured report template (6 sections) | §INVESTIGATION output has all 6 sections |
| 27 | INVESTIGATION | Data persistence (/tmp/ banned, /app/memory/evidence/ required) | §INVESTIGATION has persistence rule |
| 28 | INVESTIGATION | Exit criteria (HIGH/MEDIUM/INCONCLUSIVE + skip path) | §INVESTIGATION has exit criteria section |
| 29 | INVESTIGATION | Bug Fix escalation intake format | §INVESTIGATION boot #4 has escalation format |
| 30 | Cross-role | Severity terminology note (P0-P3 ≠ BLOCKER-NOTE) | Appears in both INTAKE + QA sections |
| 31 | Changelog | v0.6 entry | §CHANGELOG has new row |

**31 verification items. All DOC REVIEW type (no browser/curl testing needed — doc-only CR).**

---

## 11. What's NOT Changing (Scope Lock — FINAL)

| Item | Why Excluded |
|------|-------------|
| Role 3: IMPLEMENTATION | Already 4/5. EXIT GATE is strong. No changes needed. |
| Role 7: DEPLOYMENT (2/5) | Infrastructure scope. Separate CR. |
| Role 8: SMOKE (3/5) | Smaller gap. Lower priority. Separate CR if needed. |
| Role 9: REGRESSION (4/5) | Already strong. Meta-regression working. |
| Role 10: PRE-RELEASE (5/5) | Gold standard. No changes. |
| Role 11: CLOSURE (4/5) | Phase B working. No changes. |
| Role 12: RELEASE (2/5) | Production deployment scope. Separate CR. |
| Shared Rules R1-R18 | Already strong. No changes. |
| Environment, Test Credentials, Dashboard Data Contract | Not affected. |
| Distributed Artifact Ownership table | May need update post-implementation to add Bug Fix Report + Investigation Report. Deferred to Implementation session. |

---

## 12. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Agent doesn't read new sections (doc too long) | MEDIUM | HIGH | Keep additions concise. Use tables. Bold mandatory steps. |
| R2 | Severity rubric becomes stale | LOW | MEDIUM | Review at sprint closure. Add to PRE-RELEASE checklist. |
| R3 | Bug Fix over-does RCA on trivial MINOR fixes | LOW | LOW | Explicit "MINOR: 1-line summary" exception. |
| R4 | Investigation 10-step limit too restrictive | LOW | MEDIUM | Extension request in report. Owner decides. Default, not hard ceiling. |
| R5 | Evidence folder grows unbounded | LOW | LOW | Cleanup rule: archive after sprint freeze. |
| R6 | STEP -1 handover reading adds latency | LOW | LOW | 30 seconds. 1-line summary only. |
| R7 | 48h stale batch threshold wrong for some workflows | LOW | LOW | Owner can override. Threshold is a prompt, not auto-delete. |

---

## 13. Execution Recommendation

**Single atomic edit session.** Order:
1. STEP -1 (upstream — defines session flow + env check)
2. Role 2: PLANNING (stage routing)
3. Role 1: INTAKE (defines severity + evidence format consumed downstream)
4. Role 4: QA (consumes INTAKE output, defines finding severity)
5. Role 5: BUG FIX (consumes QA severity, defines escalation)
6. Role 6: INVESTIGATION (receives Bug Fix escalation, defines exit criteria)
7. Changelog
8. Registry updates

**Estimated size:** ~338 lines added, ~50 lines modified. File: ~1149 → ~1487 lines.

---

*CR-047 Impact Analysis — Gate 2 COMPLETE. 7 change areas, 31 verification items, 6 potential conflicts (all resolved), 7 risks (all mitigated). Awaiting owner review → Gate 3 (Implementation Plan) → Gate 4 (Owner GO).*
