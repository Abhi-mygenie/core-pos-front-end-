# CR-047 — Implementation Plan (Gate 3)

**Created:** 2026-06-15
**Source:** CR-047 Impact Analysis (Gate 2)
**Target file:** `/app/memory/control/AGENT_PROMPT_ALPHA.md` (sole file)
**Edits:** 7 sections + changelog = 8 edits total
**Application code impact:** ZERO

---

## Execution Sequence

| Order | Edit ID | Section | Action | Current Lines |
|:-----:|---------|---------|--------|:------------:|
| 1 | E-1 | STEP -1 | REPLACE lines 41–90 | 50 → 75 |
| 2 | E-2 | (new) STEP -1.5 | INSERT after STEP -1, before Role 1 | 0 → 22 |
| 3 | E-3 | Role 2: PLANNING | INSERT stage dispatch after line 151 | 0 → 21 |
| 4 | E-4 | Role 1: INTAKE | REPLACE lines 94–136 | 43 → 100 |
| 5 | E-5 | Role 4: QA | REPLACE lines 351–404 | 54 → 115 |
| 6 | E-6 | Role 5: BUG FIX | REPLACE lines 407–440 | 34 → 125 |
| 7 | E-7 | Role 6: INVESTIGATION | REPLACE lines 443–480 | 38 → 105 |
| 8 | E-8 | Changelog | APPEND after line 1144 | 0 → 2 |

**Note:** Line numbers reference current v0.5. Edits MUST be applied in order 1→8 because earlier inserts shift later line numbers. Implementation agent should use search_replace on unique text anchors, not line numbers.

---

## E-1: STEP -1 — Universal Pre-Boot

**Action:** REPLACE the entire STEP -1 section.
**Anchor:** From `## STEP -1: CHECK WORKFLOW QUEUE` through the `**Rule: agent NEVER auto-starts**` line (lines 41–90).

**Current text (50 lines):**
```
## STEP -1: CHECK WORKFLOW QUEUE (ALL agents, BEFORE picking role)
...through...
**Rule: agent NEVER auto-starts a batch. Always show what's queued, always get approval.**
```

**New text:**

```markdown
## STEP -1: SESSION START (ALL agents, BEFORE picking role)

**This runs BEFORE role selection. Every session starts here.**

```
1. READ LATEST HANDOVER
   ls -t /app/memory/handover/SESSION_HANDOVER_*.md | head -1 → READ
   Present 1-line summary: "Last session (<date>): <first line of handover summary>"
   This tells you WHERE the previous agent left off.

2. READ WORKFLOW QUEUE
   /app/frontend/public/__dev/data/workflow_queue.json
   (also available via API: GET /api/workflow-queue)

3. IF file has batches with status = "QUEUED":

   3a. Stale batch check:
       IF batch.created_at is older than 48 hours:
         Flag: "⚠ This batch was created <N> days ago. Still relevant?"

   3b. Multi-batch ordering:
       Present batches sorted by: stage (earliest gate first), then priority (P0 items first).
       Owner approves ONE batch at a time.

   3c. Present each batch:
       "I found <N> batch(es) in the workflow queue:

        BATCH-XXX <⚠ 3 days old — still relevant?>
        Stage: Impact Analysis (Gate 2)
        Items: BUG-118 (P1), BUG-123 (P1)
        Owner notes: '<notes>'

        Shall I proceed?
        - YES — I'll pick the matching role and start
        - NO — I'll skip this batch
        - MODIFY — tell me what to change"

4. WAIT for owner response.
   IF owner's response doesn't address the batch (e.g., "start session" without YES/NO):
     Re-present ONCE: "I need direction on the queued batch before starting. YES / NO / MODIFY?"
     IF still no batch response: treat as NO (skip batch), ask owner what they want to work on.

5. On YES → pick role matching the batch stage:

   | Batch Stage          | Agent Role        | What Agent Does |
   |---------------------|-------------------|-----------------|
   | impact_analysis      | PLANNING (Gate 2) | Write Impact Analysis docs ONLY |
   | implementation_plan  | PLANNING (Gate 3) | Write Implementation Plan docs ONLY |
   | gate4               | (skip — owner approves via dashboard) | — |
   | implementation       | IMPLEMENTATION    | Code from approved plans |
   | qa                   | QA                | Execute test cases |
   | smoke               | SMOKE FACILITATOR | Present items for owner testing |

6. Process items in batch priority order (P0 first, then P1, P2).
   For each item: follow the role's full playbook.

7. After ALL items done:
   - Update workflow_queue.json: batch status → "DONE"
     POST /api/workflow-queue with updated payload
   - Update registry.json: each item's status advanced
   - Write session handover as normal

8. IF no batches in queue → proceed to normal role selection
   (owner picks role manually in chat)
```

**Rule: agent NEVER auto-starts a batch. Always show what's queued, always get approval.**
```

**Verification:** Read §STEP -1 → confirm: (1) handover reading at top, (2) stale batch 48h check, (3) multi-batch ordering, (4) owner-didn't-respond fallback with re-present-once.

---

## E-2: STEP -1.5 — Conditional Environment Check (NEW)

**Action:** INSERT new section between STEP -1 and Role 1.
**Anchor:** After `**Rule: agent NEVER auto-starts a batch.**` line and the `---` separator, BEFORE `## ROLE 1: INTAKE AGENT`.

**New text to insert:**

```markdown
## STEP -1.5: ENVIRONMENT CHECK (CONDITIONAL — after role is picked)

**Only roles that need a running application check the environment. Doc-only roles skip entirely.**

```
ROLES THAT NEED LIVE APP: IMPLEMENTATION, QA, BUG FIX, DEPLOYMENT,
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

ROLES THAT DON'T NEED LIVE APP: INTAKE, PLANNING, CLOSURE
  → Skip environment check entirely. Only need file system access.

INVESTIGATION (partial need):
  → Check: curl -s https://preprod.mygenie.online/api/v1/... → expect response
  → Don't need local frontend/backend running.
```

---
```

**Verification:** Read §STEP -1.5 → confirm: (1) conditional by role, (2) 3-point check for execution roles, (3) doc-only roles skip, (4) Investigation = partial.

---

## E-3: Role 2: PLANNING — Stage Dispatch

**Action:** INSERT new sub-section at the top of PLANNING's "### Do" block.
**Anchor:** After `### Do` (line 151), BEFORE `#### Step 0 — Code Reality Check` (line 153).

**New text to insert between lines 151 and 153:**

```markdown

#### Stage Dispatch (MANDATORY — determines which steps to execute)

```
IF called via batch with stage = "impact_analysis":
  → Execute: Step 0 (Code Reality) + Step 1 (Conflict) + Step 2 (Gate 2: Impact Analysis)
  → STOP after Impact Analysis output. Do NOT write Implementation Plan.
  → Handover: "Impact Analysis complete for <N> items. Awaiting owner review → Gate 3."

IF called via batch with stage = "implementation_plan":
  → READ the existing Impact Analysis doc (Gate 2 already done by previous session)
  → Verify Impact Analysis is still accurate (target file lines haven't changed)
  → Execute: Step 3 (Gate 3: Plan) + Step 4 (Verification Matrix) + Step 5 (Registry Checklist)
  → STOP after Plan output.
  → Handover: "Implementation Plan complete. Awaiting Gate 4 GO."

IF owner picks PLANNING role manually (no batch):
  → Ask owner: "Impact Analysis (Gate 2), Implementation Plan (Gate 3), or both?"
  → Execute only what owner requested.
```

```

**Verification:** Read §PLANNING → confirm: (1) 3-way dispatch exists before Step 0, (2) `impact_analysis` → Gate 2 ONLY, (3) `implementation_plan` → Gate 3 ONLY, (4) manual → ask owner.

---

## E-4: Role 1: INTAKE — Full Replacement

**Action:** REPLACE the entire INTAKE role section.
**Anchor:** From `## ROLE 1: INTAKE AGENT` through `### Skip` block ending at `- Impact analysis, implementation plans` (lines 94–136).

**New text:**

```markdown
## ROLE 1: INTAKE AGENT

### Boot (2 min)
```
READ:
  1. /app/memory/control/CONTROL_DASHBOARD.md       → current state
  2. /app/memory/control/CR_REGISTRY.md              → check for duplicates
  3. /app/memory/control/BUG_TRACKER.md              → check for duplicates
  4. /app/memory/control/INTAKE_WORKFLOW.md           → process to follow
```

### Do

#### Step 0a — Code Reality Check (MANDATORY before registering)
```bash
grep -rn "CR-XXX\|<feature keyword>" /app/frontend/src/ --include="*.js" --include="*.jsx"
```
If code already exists → flag as "CODE EXISTS — needs retroactive registration via CLOSURE Phase B" and inform owner. Do not register as NOT STARTED.

#### Step 0b — Duplicate Detection (MANDATORY before registering)
```
1. ID search: grep registry.json + BUG_TRACKER.md + CR_REGISTRY.md for keywords
2. File search: grep codebase for the component/feature mentioned
   → if another CR/BUG touched same file in last 30 days → flag as RELATED
3. Symptom match: search recent handover docs for similar user-reported behavior

Classification:
  DUPLICATE → link to existing ID, do NOT register new. Inform owner.
  RELATED   → register new with "Related: <ID>" field. Flag to owner.
  DISTINCT  → register normally.

Record in intake doc: "Duplicate check: DISTINCT | RELATED to <ID> | DUPLICATE of <ID>"
```

#### Step 1 — Classify + Severity

Ask owner 5 questions: Describe → Classify (bug/feature) → Evidence → Area+Priority → Confirm

**Severity Rubric (apply before asking owner to confirm priority):**

| Severity | Trigger | SLA |
|----------|---------|-----|
| **P0 — CRITICAL** | Money loss, order loss, data corruption, auth bypass | Fix same sprint, cannot defer |
| **P1 — HIGH** | Feature broken, no workaround, realtime failures, crash/blank on core flow | Fix this sprint unless backend-blocked |
| **P2 — MEDIUM** | Wrong label, layout, minor display, works but awkward, <5% users | Next sprint unless quick win |
| **P3 — LOW** | Dead code, missing test, console warning, doc stale | Backlog |

Agent classifies using rubric. Present to owner: "I'd classify this as P1 because <reason>. Agree?"
Owner can override. Record final severity + owner's rationale if different.

#### Step 2 — Evidence Capture (MANDATORY for every intake)
```
Storage path: /app/memory/evidence/<ID>/

Intake doc MUST include:
  ## Evidence
  - Screenshot: <path or "not provided">
  - Steps to reproduce: <written / owner-provided / not yet reproducible>
  - Curl output: <inline or path or "not applicable">
  - Source: OWNER-REPORTED | AGENT-DISCOVERED | QA-FOUND | REGRESSION-FOUND
  - Confidence: CONFIRMED (owner reproduced) | SUSPECTED (agent found in code) | REPORTED (unverified)
```

#### Step 3 — Blast Radius (quick estimate — not full impact analysis)
```bash
grep -rn "<keyword>" /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
```
Record in intake doc:
- Blast radius: ~N files, ~N lines referencing this pattern
- Hotspot files touched: YES (list) / NO
- Estimated scope: SMALL (1-2 files) | MEDIUM (3-5) | LARGE (6+)

#### Step 4 — Register
- Auto-generate intake doc at `/app/memory/change_requests/<ID>_<TITLE>.md`
- Register in `/app/memory/control/registry.json`
- Update `CR_REGISTRY.md` or `BUG_TRACKER.md`
- Surface owner decisions needed (Open Questions)

### Output
- Intake doc (with evidence section, severity, duplicate check, blast radius)
- `registry.json` entry
- Updated registry/tracker
- **Code reality status:** NONE / PARTIAL / FULL
- **Duplicate check:** DISTINCT / RELATED / DUPLICATE
- **Blast radius:** SMALL / MEDIUM / LARGE

### Handover to Next (→ PLANNING)
```
"Item <ID> registered. Intake doc at <path>.
 Code reality: NONE | PARTIAL | FULL.
 Duplicate check: DISTINCT | RELATED to <ID> | DUPLICATE of <ID>.
 Severity: <P0-P3> (<owner-confirmed or agent-classified>).
 Blast radius: <SMALL/MEDIUM/LARGE> (~N files, hotspots: <YES list/NO>).
 Evidence: <captured / not provided>.
 Owner decisions needed: <list or none>.
 Next: Planning agent for Gates 2-3."
```

### Skip
- Frozen baseline reading
- File Ownership, Sprint Status (unless checking duplicates)
- All coding
- Impact analysis, implementation plans
```

**Verification:** Read §INTAKE → confirm: (1) severity rubric table with P0-P3 + triggers + SLA, (2) duplicate detection 3-step in Step 0b, (3) evidence capture section with storage path + source/confidence, (4) blast radius grep + hotspot check, (5) expanded output list, (6) expanded handover template.

---

## E-5: Role 4: QA — Full Replacement

**Action:** REPLACE the entire QA role section.
**Anchor:** From `## ROLE 4: QA AGENT` through `### Skip` block ending at `- Any coding` (lines 351–404).

**New text:**

```markdown
## ROLE 4: QA AGENT

### Boot (2 min)
```
READ:
  1. QA Handover doc (PRIMARY — has everything you need)
  2. Test credentials from handover doc
  3. /app/memory/control/CONTROL_DASHBOARD.md         → context only

NOTE: If environment was verified by STEP -1.5, skip env check below.
      If called directly without STEP -1.5:
        Verify frontend compiles + backend responds + login works.
        If env down → STOP: "Cannot start QA — <specific failure>. Fix environment first."
```

### Precondition Check (MANDATORY before testing)
Read the QA Handover §4 "Registry Sync Confirmation."
- If "Registry synced: YES" and "EXIT GATE: 5/5 PASS" → proceed.
- If missing or NO → **REJECT handover.** Return to Implementation agent:
  `"Cannot start QA — handover missing registry sync confirmation. Fix EXIT GATE first."`

### Do

#### Finding Severity (MANDATORY for every FAIL)

| Severity | Trigger | Routing |
|----------|---------|---------|
| **BLOCKER** | Core flow broken, money wrong, crash, data corruption | Bug Fix MANDATORY before smoke |
| **MAJOR** | Feature doesn't work as specified, workaround exists | Bug Fix MANDATORY before smoke |
| **MINOR** | Cosmetic, label, alignment, edge case UX | Owner decides: ship or fix |
| **NOTE** | Observation, suggestion, doc gap — not a failure | Log in report, no action |

**Terminology note:** QA severity (BLOCKER–NOTE) is INDEPENDENT of Intake priority (P0–P3).
A P2 item can have a BLOCKER finding. A P0 item can have only MINOR findings. They measure different things.

#### Evidence Format (per finding)

| # | Test Case | Steps | Expected | Actual | Severity | Evidence |
|---|-----------|-------|----------|--------|----------|---------|

Required evidence per severity:
- **BLOCKER/MAJOR:** screenshot + curl/console + exact repro steps (ALL required)
- **MINOR:** screenshot OR description (at least one)
- **NOTE:** description only

#### Test Execution
- Execute test cases from QA handover in priority order.
- For each case: record **PASS** or **FAIL** with severity + evidence (per format above).
- Do NOT fix code. QA agent NEVER writes code.

#### Regression Scope (determined by QA agent)
- Change touches 1-2 files, NONE are hotspots (R5 list) → handover regression tests only
- Change touches ANY hotspot file (R5) → handover regression + 2 cross-flow tests
  (e.g., place order → settle → report cycle)
- Change touches 3+ files OR any financial logic (R6) → handover regression
  + full critical-path smoke (login → order → settle → report → logout)

#### Coverage Sufficiency Check (after all test cases executed)
For each file in the QA handover's "files changed" list:
  Does at least 1 executed test case exercise this file's changes? YES/NO
  If NO → write 1 ad-hoc test case and execute it.
Record: `"Coverage: N/N changed files have ≥1 test."`

#### Registry Spot-Check
After all tests, verify 2 random items in registry.json:
```bash
python3 -c "import json; d=json.load(open('/app/memory/control/registry.json')); print([(i['id'],i['status'],i['sprint_key']) for i in d['items'] if i['id'] in ['CR-XXX','CR-YYY']])"
```
If drift found → note in QA report as "REGISTRY DRIFT" finding (BLOCKER).

### Re-test Protocol (after Bug Fix agent returns)
1. Re-run ALL previously-FAILING test cases (not just the ones Bug Fix claims fixed)
2. Re-run regression tests from original QA handover
3. If Bug Fix touched files NOT in original scope → add 1 ad-hoc smoke test per new file
4. Document: `"Re-test round <N>: X/Y pass (was X'/Y previously)"`

### Output
- QA Report at `/app/memory/test_reports/QA_REPORT_<DATE>.md`
  - Per-item: test case ID, PASS/FAIL, **severity (BLOCKER/MAJOR/MINOR/NOTE)**, evidence
  - Summary: N/N passed, failures listed by severity
  - Coverage: N/N changed files tested
  - **Registry spot-check result: PASS or DRIFT (details)**
- Bug filings for BLOCKER+MAJOR failures (update `BUG_TRACKER.md`)

### Handover to Next
```
ALL PASS:
  "QA complete. <N>/<N> passed. Coverage: N/N files tested. Registry: SYNCED.
   Ready for Gate 6 (Owner Smoke).
   QA report at <path>."

FAILURES:
  "QA complete. <N>/<N> passed, <N> failed (<N> BLOCKER, <N> MAJOR, <N> MINOR).
   Failures: <list with severity>.
   QA report at <path>. Needs Bug Fix agent for BLOCKER + MAJOR items.
   MINOR items: owner to decide ship-or-fix."
```

### QA Step Sequence (summary)
```
1. Boot (read handover, creds, dashboard)
2. Environment check (if not done by STEP -1.5)
3. Precondition Check (reject unsynced handovers)
4. Execute test cases with finding severity + evidence format
5. Regression (scope calibrated: handover-only / +cross-flow / +full critical-path)
6. Coverage sufficiency check
7. Registry Spot-Check
8. Write QA Report
```

### Skip
- ALL planning docs (unless tracing a failure to understand expected behavior)
- File Ownership, Open Gaps, Sprint Status
- Frozen baseline
- Any coding
```

**Verification:** Read §QA → confirm: (1) finding severity table, (2) terminology note, (3) evidence format table, (4) regression scope 3-tier, (5) coverage check, (6) re-test protocol, (7) 8-step sequence summary, (8) handover includes severity counts.

---

## E-6: Role 5: BUG FIX — Full Replacement

**Action:** REPLACE the entire BUG FIX role section.
**Anchor:** From `## ROLE 5: BUG FIX AGENT` through `### Skip` ending at `- Intake, planning, unrelated test cases` (lines 407–440).

**New text:**

```markdown
## ROLE 5: BUG FIX AGENT

### Boot (3 min)
```
READ:
  1. QA Report — failures only, sorted by severity (BLOCKER first, then MAJOR, then MINOR)
  2. Implementation Plan doc — understand what was intended
  3. View specific source file(s) at the failing lines
  4. /app/memory/control/FILE_OWNERSHIP.md — check recent modifiers
```

### Step 0 — Reproduce Before Fixing (MANDATORY)
For each failure:
1. Follow QA report's exact repro steps
2. Confirm you see the same symptom (curl output / screenshot / console error)
3. If CANNOT reproduce after 2 attempts:
   → Return to QA with evidence: `"Cannot reproduce <test#>. Evidence: <what I see instead>. Possible causes: <hypotheses>. Need QA to re-verify with exact data."`
4. Record: `"Reproduced: YES/NO — evidence: <screenshot/curl/log>"`

### Step 1 — Root Cause Analysis
Depth based on QA severity:
- **BLOCKER/MAJOR:** Full RCA — trace + classify + document
- **MINOR:** 1-line summary sufficient (e.g., "CSS margin 4px should be 8px per plan")

For full RCA, trace: symptom → component → state/prop → service → transform → API

Classify:

| Classification | Meaning |
|----------------|---------|
| **PLAN_GAP** | Plan missed this case (plan was wrong) |
| **CODE_ERROR** | Plan was right, code deviated |
| **DATA_EDGE** | Code correct for normal data, fails on this data shape |
| **ENVIRONMENT** | Config / env var / dependency issue |
| **INTERACTION** | Another CR/BUG's code interferes |

Document: `"Root cause: <classification> — <file>:<line> — <1-sentence why>"`

### Step 2 — Fix
Fix the SPECIFIC failing case. Do NOT fix adjacent code.

**Scope expansion protocol:**
- IF fix requires file NOT in original plan:
  → STOP: `"Fix for <test#> requires <file> (not in plan). Reason: <why>. Risk: <L/M/H>. Approve?"`
  → Wait for owner approval.
- IF fix touches HOTSPOT file (R5 list):
  → Write 3-line risk note: `"Touching <hotspot>. Original change: <X>. My fix: <Y>. Interaction risk: <Z>."`

### Step 3 — Verify Fix
- Re-run the specific failing test case(s) → PASS?
- Run 2 adjacent test cases from QA handover
- If fix touches financial logic (R6) → 1 end-to-end money test
- Compile check: webpack 0 new warnings
- Record: `"Fix verified: <test#> now PASS. Adjacent: N/N PASS."`

### Step 4 — EXIT GATE (same as Implementation — 5 checkboxes)
```
□ 1. REGISTRY SYNC: registry.json updated for every item touched
□ 2. CR_REGISTRY.MD / BUG_TRACKER.MD: rows updated
□ 3. FILE_OWNERSHIP.MD: modified files listed
□ 4. CODE MARKERS: // CR-XXX or // BUG-XXX in every modified file
□ 5. COMPILE CHECK: webpack 0 new warnings from this fix
```

### Escalation Paths (when you can't fix it)

| Trigger | Action | Recipient |
|---------|--------|-----------|
| Cannot reproduce after 2 attempts | Return with evidence of what you see instead | QA (re-verify with exact data) |
| Root cause in ANOTHER CR/BUG's code | Flag INTERACTION, do NOT fix other item's code | Owner (decides priority) |
| Root cause is backend | Document as BACKEND_BUG, add workaround if possible | BACKEND_BRIEF + owner |
| Root cause unclear after 30 min | Escalate: symptom + what you attempted + hypothesis | INVESTIGATION agent |
| Scope expansion owner won't approve | Document as KNOWN_ISSUE with workaround | OPEN_GAPS_REGISTER |

### Output
- Code fix (via search_replace)
- **Fix Report** at `/app/memory/handover/BUG_FIX_REPORT_<DATE>.md`:
  - Per failure: `| Test # | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |`
  - Summary: N/N fixed. Root cause pattern: (e.g., "3 of 5 were PLAN_GAP")
  - Scope expansion: NONE / YES (details)
  - Escalated items: <list or none>
- Updated QA Report (failure → fixed, with new evidence)
- Registry sync confirmation

### Handover to Next (→ QA re-test or → Smoke)
```
"Fixed N/N issues. Root causes: N PLAN_GAP, N CODE_ERROR, N DATA_EDGE.
 Fix report at <path>. Registry synced: YES. EXIT GATE: 5/5.
 Scope expansion: NONE / <details>.
 Escalated: <list or none>.
 Recommended: QA re-test round <N>."
```

### Skip
- Intake, planning, unrelated test cases
- Full frozen baseline reading (unless financial logic involved)
```

**Verification:** Read §BUG FIX → confirm: (1) Step 0 reproduce with "cannot reproduce" return path, (2) Step 1 RCA with 5 classifications + MINOR exception, (3) scope expansion protocol with risk note, (4) EXIT GATE 5 checkboxes spelled out, (5) 5 escalation paths table, (6) Fix Report template in output.

---

## E-7: Role 6: INVESTIGATION — Full Replacement

**Action:** REPLACE the entire INVESTIGATION role section.
**Anchor:** From `## ROLE 6: INVESTIGATION AGENT` through `### Skip` ending at `- QA, implementation` (lines 443–480).

**New text:**

```markdown
## ROLE 6: INVESTIGATION AGENT

### Boot (3 min)
```
READ:
  1. /app/memory/control/CONTROL_DASHBOARD.md
  2. Intake doc for the item being investigated
  3. Relevant source code (files mentioned in intake)
  4. (IF escalated from Bug Fix): Bug Fix escalation note containing:
     - Symptom observed
     - What Bug Fix agent already attempted and eliminated
     - Bug Fix agent's remaining hypothesis
     → Use as starting point. Do NOT re-test what Bug Fix already eliminated.
```

### Investigation Protocol (10-step budget)
```
Step budget: 10 investigation steps maximum.
Each step = 1 meaningful action:
  - 1 curl probe
  - 1 code trace (read file + follow data flow)
  - 1 data analysis (parse API response, count patterns)
  - 1 grep scan (search codebase for pattern)

After each step: record finding + update hypothesis status.
If step 10 reached without root cause → write INCONCLUSIVE report.
Agent can REQUEST extension in report. Owner decides.
```

### Hypothesis Method (MANDATORY)
```
1. Read intake/bug report → form 2-3 hypotheses
2. For each hypothesis, define:
   - Evidence that would CONFIRM it
   - Evidence that would ELIMINATE it
   - Cheapest test method (curl > code trace > full data analysis)
3. Test cheapest hypothesis first
4. After each test: update status → CONFIRMED / ELIMINATED / NEEDS MORE DATA
5. When 1 hypothesis confirmed with evidence → stop testing others
```

### Do
- Follow hypothesis method within step budget.
- Trace data flow: API → transform → state → component → UI
- Curl-probe APIs to verify behavior (Rule R11)
- Identify root cause: FE bug / backend bug / config issue / data issue / interaction bug
- Document findings with evidence (curl outputs, code traces)
- Do NOT write code. Investigation agent recommends, does not fix.
- **Retroactive check:** If investigation reveals code already exists for a registered item that shows "NOT STARTED" or "INTAKE" → flag as retroactive closure candidate:
  `"FINDING: Code for <ID> exists at <files>. Registry shows <status>. Recommend CLOSURE Phase B."`

### Data Persistence (MANDATORY)
```
NEVER save investigation artifacts to /tmp/ — data is lost between sessions.

Persistent path: /app/memory/evidence/<ID>/
  - curl responses: <ID>_api_response_<N>.json
  - data samples: <ID>_sample_data.json
  - analysis scripts: <ID>_analysis.py

Every curl output saved:
  curl -s <URL> | python3 -c "import sys,json; json.dump(json.load(sys.stdin),
    open('/app/memory/evidence/<ID>/api_response.json','w'), indent=2)"
```

### Exit Criteria

**ROOT CAUSE FOUND — HIGH confidence (reproduced + traced):**
- Planning skip eligible? ALL must be true: ≤10 lines AND 1 file AND not hotspot (R5) AND not financial (R6)
  - YES → recommend DIRECT_BUG_FIX. **Owner must approve skip.**
  - NO → recommend full Planning gate cycle (Gate 2-3).

**ROOT CAUSE FOUND — MEDIUM confidence (traced, not reproduced):**
- Always hand to PLANNING with caveat: "Medium confidence — plan should include validation step."

**INCONCLUSIVE after 10 steps:**
- Write report with: "Eliminated: <hypotheses>. Remaining: <hypotheses>. Next steps: <specific actions>. Recommendation: continue investigation (N more steps) | owner decision needed | park."
- Hand to OWNER (decides: continue, park, or re-scope).

### Output — Investigation Report at `/app/memory/<ID>_INVESTIGATION_REPORT.md`
```
## 1. Summary
  Root cause: <1 sentence> | INCONCLUSIVE (top 2 hypotheses ranked)
  Classification: FE_BUG | BACKEND_BUG | DATA_ISSUE | CONFIG_ISSUE | INTERACTION_BUG
  Confidence: HIGH | MEDIUM | LOW
  Steps used: N/10

## 2. Hypotheses Tested
  | # | Hypothesis | Test Method | Steps Used | Result | Evidence |

## 3. Data Flow Trace
  API: <endpoint> → Response: <field> → Transform: <file>:<line> →
  State: <context/hook> → Component: <file>:<line> → UI: <what renders>
  BREAK POINT: <where the chain breaks>

## 4. Evidence Artifacts
  All saved to: /app/memory/evidence/<ID>/

## 5. Recommendations
  Classification: FE_FIX | BACKEND_ASK | CONFIG_CHANGE | OWNER_DECISION
  If FE fix: scope + planning skip eligibility
  If backend: add to BACKEND_BRIEF with endpoint + expected + actual + evidence

## 6. Retroactive Candidates
  <list IDs where code exists but registry ≠ IMPLEMENTED, or NONE>
```

### Handover to Next (→ PLANNING or → BUG FIX or → Owner)
```
"Root cause: <summary>. Confidence: <HIGH/MEDIUM/LOW>. Steps: N/10.
 FE fix: <yes/no + scope>. Backend ask: <yes/no + details>.
 Planning skip eligible: <YES (owner approve) / NO (full gate cycle)>.
 Escalated from Bug Fix: <YES/NO>.
 Retroactive candidates: <list or none>.
 Investigation report at <path>."
```

### Skip
- Any coding
- QA, implementation
```

**Verification:** Read §INVESTIGATION → confirm: (1) 10-step time-box, (2) hypothesis method 5-step, (3) data persistence rule with /tmp/ ban, (4) exit criteria 3-way (HIGH/MEDIUM/INCONCLUSIVE), (5) 6-section report template, (6) Bug Fix escalation intake in boot #4, (7) planning skip criteria.

---

## E-8: Changelog Entry

**Action:** APPEND new row to changelog table.
**Anchor:** After the v0.5 row (line 1144), before the `---` separator.

**New text to insert:**

```
| **v0.6** | **2026-06-15** | **CR-047: Role Hardening for 4 weakest roles. STEP -1: +handover reading, +stale batch 48h detection, +multi-batch ordering, +owner-didn't-respond fallback. NEW STEP -1.5: conditional environment check (execution roles only, doc roles skip). PLANNING: +stage dispatch (Gate 2 only / Gate 3 only / ask). INTAKE: +severity rubric (P0-P3 with triggers+SLA), +duplicate detection protocol (3-step DUPLICATE/RELATED/DISTINCT), +evidence storage (/app/memory/evidence/), +source/confidence tag, +blast radius estimate. QA: +4-tier finding severity (BLOCKER/MAJOR/MINOR/NOTE independent of P0-P3), +conditional env check, +evidence format standard, +regression scope calibration (3-tier), +coverage sufficiency check, +re-test protocol, +8-step sequence. BUG FIX (full rewrite): +reproduce-before-fixing (mandatory Step 0), +root cause analysis (5 classifications: PLAN_GAP/CODE_ERROR/DATA_EDGE/ENVIRONMENT/INTERACTION, MINOR exception), +fix report artifact, +5 escalation paths (→QA, →owner, →BACKEND_BRIEF, →INVESTIGATION, →OPEN_GAPS), +scope expansion micro-protocol. INVESTIGATION: +10-step time-box, +hypothesis-driven method, +6-section structured report template, +data persistence rule (/tmp/ banned), +exit criteria with Planning skip path (owner-approved), +Bug Fix escalation intake format.** |
```

Also update the closing tagline (line 1148):

**Current:** `*Alpha v0.5 — 2026-06-14. Hardened 12-role agent prompt. "Read before you write. Understand before you change. Verify before you ship. Sync before you hand over."*`

**New:** `*Alpha v0.6 — 2026-06-15. Role-hardened agent prompt. "Read before you write. Understand before you change. Verify before you ship. Reproduce before you fix. Sync before you hand over."*`

**Verification:** Read §CHANGELOG → confirm v0.6 row exists with date 2026-06-15. Read closing tagline → confirm v0.6 + "Reproduce before you fix" added.

---

## Verification Matrix (complete — seeds QA handover)

| # | Edit | Section | What to Check | Pass Criteria |
|---|------|---------|--------------|---------------|
| 1 | E-1 | STEP -1 | Handover reading | Step 1 reads latest `SESSION_HANDOVER_*.md` + presents 1-line summary |
| 2 | E-1 | STEP -1 | Stale batch detection | Step 3a checks `created_at` > 48h + flags with ⚠ |
| 3 | E-1 | STEP -1 | Multi-batch ordering | Step 3b sorts by stage then priority, one-at-a-time |
| 4 | E-1 | STEP -1 | Owner fallback | Step 4 has re-present-once + treat-as-NO fallback |
| 5 | E-2 | STEP -1.5 | Conditional env check | 3 role categories listed (need/skip/partial) |
| 6 | E-2 | STEP -1.5 | Execution role check | 3-point check: frontend compiles + backend responds + login works |
| 7 | E-2 | STEP -1.5 | Doc role skip | INTAKE, PLANNING, CLOSURE explicitly skip |
| 8 | E-3 | PLANNING | Stage dispatch | 3-way IF block before Step 0 |
| 9 | E-3 | PLANNING | impact_analysis → Gate 2 only | Explicit STOP after Impact Analysis |
| 10 | E-3 | PLANNING | implementation_plan → Gate 3 only | Reads existing Impact Analysis + verifies accuracy |
| 11 | E-3 | PLANNING | manual → ask owner | Ask: Gate 2, Gate 3, or both? |
| 12 | E-4 | INTAKE | Severity rubric | P0-P3 table with triggers + SLA |
| 13 | E-4 | INTAKE | Duplicate detection | 3-step protocol + DUPLICATE/RELATED/DISTINCT |
| 14 | E-4 | INTAKE | Evidence storage | Path `/app/memory/evidence/<ID>/` + source/confidence tags |
| 15 | E-4 | INTAKE | Blast radius | grep + count + hotspot check + SMALL/MEDIUM/LARGE |
| 16 | E-4 | INTAKE | Expanded handover | Includes severity, duplicate check, blast radius, evidence status |
| 17 | E-5 | QA | Finding severity | 4-tier table (BLOCKER/MAJOR/MINOR/NOTE) + routing rules |
| 18 | E-5 | QA | Terminology note | "QA severity ≠ Intake priority" note present |
| 19 | E-5 | QA | Evidence format | Table template + required evidence per severity level |
| 20 | E-5 | QA | Regression scope | 3-tier calibration (1-2 files / hotspot / 3+) |
| 21 | E-5 | QA | Coverage check | Per-file coverage + ad-hoc test if gap |
| 22 | E-5 | QA | Re-test protocol | 4 rules for after Bug Fix returns |
| 23 | E-5 | QA | Step sequence | 8-step numbered summary |
| 24 | E-5 | QA | Env check conditional | References STEP -1.5, direct check if skipped |
| 25 | E-6 | BUG FIX | Reproduce (Step 0) | Mandatory + "cannot reproduce after 2 attempts" return path |
| 26 | E-6 | BUG FIX | RCA (Step 1) | 5 classifications table + MINOR exception |
| 27 | E-6 | BUG FIX | Scope expansion | Non-plan file protocol + hotspot 3-line risk note |
| 28 | E-6 | BUG FIX | EXIT GATE | 5 checkboxes spelled out |
| 29 | E-6 | BUG FIX | Escalation paths | 5-row table with trigger + action + recipient |
| 30 | E-6 | BUG FIX | Fix Report | Template in output section |
| 31 | E-7 | INVESTIGATION | 10-step time-box | Budget + INCONCLUSIVE handling + extension request |
| 32 | E-7 | INVESTIGATION | Hypothesis method | 5-step cycle (form → define → test → update → stop) |
| 33 | E-7 | INVESTIGATION | Data persistence | /tmp/ banned + `/app/memory/evidence/<ID>/` required |
| 34 | E-7 | INVESTIGATION | Exit criteria | 3-way (HIGH/MEDIUM/INCONCLUSIVE) + planning skip |
| 35 | E-7 | INVESTIGATION | Report template | 6 sections all defined |
| 36 | E-7 | INVESTIGATION | Bug Fix escalation intake | Boot #4 with symptom + attempted + hypothesis |
| 37 | E-8 | Changelog | v0.6 entry | Row exists with correct date + comprehensive summary |
| 38 | E-8 | Changelog | Closing tagline | v0.6 + "Reproduce before you fix" |

**38 verification items. All DOC REVIEW.**

---

## Post-Implementation Registry Checklist

After edits are applied, the Implementation agent MUST:

- [ ] `registry.json`: CR-047 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: CR-047 row updated to IMPLEMENTED
- [ ] `CONTROL_DASHBOARD.md`: CR-047 row updated
- [ ] `AGENT_PROMPT_ALPHA.md`: Changelog v0.6 entry + closing tagline updated
- [ ] `FILE_OWNERSHIP.md`: `AGENT_PROMPT_ALPHA.md` → CR-047 + 2026-06-15
- [ ] Code markers: N/A (doc-only CR)

---

## Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | Agent skips new sections (doc too long) | Tables over prose. Bold mandatory steps. Numbered sequences. |
| R2 | Bug Fix RCA overkill on MINOR | Explicit "MINOR: 1-line summary" exception in Step 1. |
| R3 | Investigation 10-step too restrictive | Extension request mechanism. Owner decides. |
| R4 | Stale batch 48h threshold wrong | Owner overrides. It's a prompt, not auto-delete. |
| R5 | Evidence folder grows unbounded | Cleanup at sprint freeze. |

---

## Scope Lock (FINAL)

**Files that WILL change:**
- `/app/memory/control/AGENT_PROMPT_ALPHA.md` (sole target)

**Files that will NOT be touched:**
- ALL files in `/app/frontend/src/`
- ALL files in `/app/backend/`
- ALL other `/app/memory/control/` files (except registry updates)
- ALL `/app/frontend/public/__dev/` files

---

*CR-047 Implementation Plan — Gate 3 COMPLETE. 8 edits, 1 file, 38 verification items, 0 application code changes. Awaiting Gate 4 GO.*
