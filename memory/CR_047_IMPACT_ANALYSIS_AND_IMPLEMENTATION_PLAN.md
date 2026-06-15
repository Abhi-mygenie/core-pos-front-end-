# CR-047 — Impact Analysis (Gate 2)

**Created:** 2026-06-15
**Author:** Planning Agent
**Code Reality:** FULL — editing existing v0.5 (1149 lines)
**Conflict Pre-Check:** NONE — no other open item touches AGENT_PROMPT_ALPHA.md
**File:** `/app/memory/control/AGENT_PROMPT_ALPHA.md`

---

## 1. Scope

Edit 4 role sections within AGENT_PROMPT_ALPHA.md:
- Role 1: INTAKE (lines ~94–136)
- Role 4: QA (lines ~351–405)
- Role 5: BUG FIX (lines ~407–440)
- Role 6: INVESTIGATION (lines ~442–477)

**Will NOT touch:** Roles 2, 3, 7–12, Shared Rules, Environment, Test Credentials, Dashboard Data Contract, Changelog, any other file.

---

## 2. Change-by-Change Impact Analysis

### 2.1 ROLE 1: INTAKE (currently ~42 lines → ~95 lines)

| # | Addition | What It Does | Risk | Downstream Impact |
|---|----------|-------------|------|-------------------|
| I-1 | **Severity Rubric** (P0/P1/P2/P3 table with triggers + SLA) | Gives agent concrete criteria instead of guessing. Owner can override. | LOW — rubric is advisory, owner has final say | PLANNING agent inherits severity → can auto-prioritize batch order |
| I-2 | **Duplicate Detection Protocol** (3-step: ID search → file search → symptom match → classify DUPLICATE/RELATED/DISTINCT) | Prevents re-registering existing work. Catches "related but distinct" pattern. | LOW — worst case is agent flags false RELATED (harmless) | Prevents registry bloat. Reduces "why do we have 2 CRs for the same thing?" confusion |
| I-3 | **Evidence Storage** (mandatory section in intake doc: screenshot path, repro steps, curl output) + persistence at `/app/memory/evidence/<ID>/` | Ensures every intake has reproducible evidence. No more "what exactly was the bug?" | LOW — adds ~2 min to intake process | QA agent + Investigation agent can reference original evidence instead of re-discovering |
| I-4 | **Source + Confidence** tag (OWNER-REPORTED/AGENT-DISCOVERED/QA-FOUND + CONFIRMED/SUSPECTED/REPORTED) | Distinguishes verified behavior from hypothesis | ZERO — metadata tag only | Bug Fix agent knows whether to trust repro steps or re-verify |
| I-5 | **Blast Radius estimate** (quick grep + count files + flag hotspots) | Planning agent gets effort signal before deep analysis | LOW — 1 min extra work | Helps owner prioritize at intake stage rather than waiting for full impact analysis |

**Conflict check:** No other open item modifies INTAKE role text. Last edit: v0.4 (2026-06-13) for role-based rewrite.

---

### 2.2 ROLE 4: QA (currently ~54 lines → ~110 lines)

| # | Addition | What It Does | Risk | Downstream Impact |
|---|----------|-------------|------|-------------------|
| Q-1 | **Finding Severity** (4-tier: BLOCKER/MAJOR/MINOR/NOTE + routing rules) | Replaces binary PASS/FAIL with actionable severity. BLOCKER+MAJOR → Bug Fix mandatory. MINOR → owner decides. NOTE → log only. | LOW — additive, doesn't change what QA does, changes how it reports | Bug Fix agent prioritizes BLOCKER first. Owner smoke is more informed. |
| Q-2 | **Environment Check** (Step 0 — verify frontend compiles, backend responds, login works before testing) | Catches "test failed because env is down" false negatives | ZERO — 30 second check | Eliminates wasted Bug Fix cycles on phantom failures |
| Q-3 | **Re-test Protocol** (after Bug Fix: re-run ALL previous failures + regression from handover + 1 smoke per new file touched) | Currently undefined → QA might only re-run 2 of 5 failures | LOW — adds thoroughness, might add 10 min to re-test cycle | Higher confidence in Bug Fix completeness |
| Q-4 | **Evidence Format Standard** (table format per finding + required evidence type per severity) | Currently "screenshot/curl" with no standard → inconsistent reports | ZERO — template only | Bug Fix agent gets unambiguous repro steps. Investigation agent can reference. |
| Q-5 | **Coverage Sufficiency Check** (after all tests: does every changed file have ≥1 test? if NO → write ad-hoc test) | Currently possible to miss testing a changed file entirely | LOW — might add 1-2 ad-hoc tests per session | Catches "untested file shipped" gap |
| Q-6 | **Regression Scope Calibration** (1-2 files → handover only; hotspot → +2 cross-flow; 3+ files → full critical path) | Currently vague "run regression tests from handover doc" | LOW — gives concrete guidance vs vague instruction | Right-sizes regression effort — not too little, not too much |

**Conflict check:** No other open item modifies QA role text. Last edit: v0.5 (2026-06-14) for Precondition Check + Registry Spot-Check.

**Interaction with existing QA features (v0.5):**
- Precondition Check (reject unsynced handovers) → UNCHANGED, stays as Step 0 precondition
- Registry Spot-Check → UNCHANGED, stays at end of QA
- New additions slot AROUND these: Environment Check (new Step 0a, before Precondition) + Finding Severity (overlays on existing "record PASS/FAIL") + Coverage Check (before Registry Spot-Check)

---

### 2.3 ROLE 5: BUG FIX (currently ~33 lines → ~120 lines) ⚠️ BIGGEST CHANGE

| # | Addition | What It Does | Risk | Downstream Impact |
|---|----------|-------------|------|-------------------|
| B-1 | **Reproduce Before Fixing** (mandatory Step 0: follow QA repro steps, confirm same symptom, if cannot reproduce → return to QA) | Prevents fixing the wrong thing | MEDIUM — could slow Bug Fix if QA report has poor repro steps. MITIGATED by Q-4 (evidence format) | Eliminates "I fixed something but QA still fails" loops |
| B-2 | **Root Cause Analysis** (mandatory per failure: trace symptom → component → state → service → transform → API; classify as PLAN_GAP/CODE_ERROR/DATA_EDGE/ENVIRONMENT/INTERACTION) | Currently no RCA → same patterns recur | LOW — adds 5-10 min per failure | Sprint retrospective can identify patterns (e.g., "60% of bugs were PLAN_GAP → plans need more edge cases") |
| B-3 | **Fix Report Template** (structured output per failure: test#, RCA classification, detail, fix type, files, verified) | Currently no artifact from Bug Fix agent | ZERO — doc template | QA re-test knows exactly what changed. Closure agent has artifact trail. |
| B-4 | **5 Escalation Paths** (cannot reproduce → QA; root cause in another CR → flag INTERACTION; backend bug → BACKEND_BRIEF; unclear after 30 min → INVESTIGATION; scope expansion refused → KNOWN_ISSUE) | Currently no escalation → agent either fixes or gets stuck | LOW — gives agent permission to STOP and route correctly | Breaks doom loops. Each escalation has a defined recipient and artifact. |
| B-5 | **Scope expansion micro-protocol** (touching non-plan file → declare + get owner approval; touching hotspot → write 3-line risk note) | Currently "STOP, re-declare" but no format | LOW — makes existing rule concrete | Prevents uncontrolled scope creep during fixes |

**Conflict check:** No other open item modifies Bug Fix role text. Last edit: v0.4 (2026-06-13).

**Risk assessment for B-1 (Reproduce Before Fixing):**
- Worst case: QA report has vague repro steps → Bug Fix agent bounces back → adds 1 round-trip
- Mitigation: Q-4 (Evidence Format Standard) ensures QA provides reproducible steps
- Net effect: +1 round-trip occasionally vs. fewer "fix didn't work" multi-round-trips. Net positive.

**Risk assessment for B-2 (Root Cause Analysis):**
- Could be over-engineering for 1-line cosmetic fixes
- Mitigation: Add "for MINOR severity: RCA optional, 1-line summary sufficient" exception
- Net effect: Deep RCA for BLOCKER/MAJOR (where it matters), light touch for MINOR

---

### 2.4 ROLE 6: INVESTIGATION (currently ~35 lines → ~100 lines)

| # | Addition | What It Does | Risk | Downstream Impact |
|---|----------|-------------|------|-------------------|
| V-1 | **10-Step Time-Box** (max 10 investigation steps; each = 1 curl/trace/analysis; if step 10 → write INCONCLUSIVE report) | Prevents infinite rabbit holes | LOW — agent can request extension if justified, but default is bounded | Predictable session cost. Owner knows worst-case is ~30 min investigation. |
| V-2 | **Hypothesis-Driven Method** (form 2-3 hypotheses → define confirm/eliminate evidence → test cheapest first → update status after each test) | Currently free-form investigation → meandering traces | LOW — structured thinking, doesn't constrain what agent investigates | Higher quality investigations. Each step has purpose. |
| V-3 | **Structured Report Template** (6 sections: Summary, Hypotheses Tested, Data Flow Trace, Evidence Artifacts, Recommendations, Retroactive Candidates) | Currently free-form → inconsistent reports | ZERO — template only | Planning agent + Bug Fix agent get actionable output. Recommendations include effort estimate. |
| V-4 | **Data Persistence Rule** (NEVER use /tmp/ → use `/app/memory/evidence/<ID>/` for curl outputs, data samples) | Currently investigation data lost between sessions (e.g., "/tmp/orders_created.json (ephemeral)") | ZERO — storage path change | Next-session agent can reference previous investigation data. No re-fetching 38MB API responses. |
| V-5 | **Exit Criteria + Planning Skip Path** (root cause found → hand to Planning OR direct Bug Fix if ≤10 lines + 1 file + not hotspot + not financial) | Currently no guidance on "what happens after investigation" | LOW — Planning skip path is gated by strict criteria | Saves full gate cycle for trivial fixes discovered during investigation |
| V-6 | **Escalation from Bug Fix** (Investigation receives escalations from Bug Fix agent with specific format: symptom + attempted + hypothesis) | Currently Bug Fix has nowhere to escalate | ZERO — defines intake interface | Completes the Bug Fix ↔ Investigation handshake |

**Conflict check:** No other open item modifies Investigation role text. Last edit: v0.4 (2026-06-13).

**Interaction with existing Investigation features (v0.5):**
- Retroactive check (code exists but unregistered) → UNCHANGED, now part of report template §6
- Curl-probe methodology → UNCHANGED, now formalized as "investigation step" within the 10-step budget
- "Do NOT write code" boundary → UNCHANGED and REINFORCED

---

## 3. Cross-Role Interaction Analysis

The 4 roles being hardened interact with each other and with unchanged roles. Key interactions:

### 3.1 New Interaction Chains Created

```
INTAKE (I-3 evidence) → QA (Q-4 evidence format) → BUG FIX (B-1 reproduce from evidence)
  ↪ Evidence flows downstream — intake captures it, QA standardizes format, Bug Fix consumes it
  
QA (Q-1 severity) → BUG FIX (B-2 RCA depth based on severity)
  ↪ BLOCKER/MAJOR get full RCA; MINOR gets light RCA; NOTE skipped
  
BUG FIX (B-4 escalation) → INVESTIGATION (V-6 receives escalation)
  ↪ Bug Fix can now formally hand off to Investigation instead of getting stuck
  
INVESTIGATION (V-5 exit criteria) → PLANNING or BUG FIX
  ↪ Skip path avoids unnecessary full gate cycle for trivial findings
```

### 3.2 Interactions with UNCHANGED Roles

| Unchanged Role | Interaction | Impact |
|---------------|-------------|--------|
| **PLANNING (Role 2)** | Receives: Intake blast radius (I-5) → less discovery needed. Receives: Investigation recommendations (V-3/V-5) → may get "direct to Bug Fix" suggestion | POSITIVE — Planning gets more context from upstream |
| **IMPLEMENTATION (Role 3)** | No direct interaction with changed roles | NONE |
| **SMOKE (Role 8)** | Receives: QA severity (Q-1) → can tell owner which failures are BLOCKER vs MINOR | POSITIVE — more informed smoke sessions |
| **PRE-RELEASE AUDIT (Role 10)** | No direct interaction. §F Registry Integrity Audit is unchanged. | NONE |
| **CLOSURE (Role 11)** | Receives: Bug Fix reports (B-3) → better artifact trail for closure audit | POSITIVE — fewer missing artifacts at closure |

### 3.3 Potential Conflicts

| Risk | Between | Description | Mitigation |
|------|---------|-------------|------------|
| **Severity disagreement** | INTAKE (I-1) vs QA (Q-1) | Intake assigns P1 (high). QA finds it MINOR severity at test time. Which wins? | RULE: Intake severity = item priority (for sprint planning). QA severity = finding severity (for bug fix routing). They measure different things. Add note to both sections. |
| **Evidence format mismatch** | INTAKE (I-3) vs QA (Q-4) | Intake stores evidence in one format, QA expects another | RULE: Both use same base format (screenshot path + curl + repro steps). QA adds test-specific columns. Intake format is QA-compatible. |
| **Planning skip abuse** | INVESTIGATION (V-5) | Agent recommends "direct to Bug Fix" too aggressively to avoid full gate cycle | RULE: Skip criteria are strict (≤10 lines, 1 file, not hotspot, not financial). Owner must approve the skip. Add owner approval gate. |
| **Re-test overhead** | QA (Q-3) | Re-run ALL previous failures after Bug Fix → could be expensive if original QA had 20 test cases | RULE: "ALL previously-FAILING test cases" not "ALL test cases." If Bug Fix only addresses 3 of 5 failures, re-run those 5 (not all 20). Clarify language. |

---

## 4. Downstream Document Updates Required

These files need minor sync edits AFTER AGENT_PROMPT_ALPHA.md is updated:

| File | What to Update | Why |
|------|---------------|-----|
| `CONTROL_DASHBOARD.md` | Add CR-047 row | Standard for all active CRs |
| `CR_REGISTRY.md` | Add CR-047 row in Standalone CRs section | Standard for all CRs |
| `SPRINT_STATUS.md` | Add CR-047 under POS 5.0 section if applicable | Sprint tracking |
| `AGENT_PROMPT_ALPHA.md` Changelog | Add v0.6 entry at bottom | Version history |

---

## 5. What's NOT Changing (Scope Lock)

Explicitly NOT in scope (defer to separate CRs if needed):

| Item | Why Deferred |
|------|-------------|
| Role 7: DEPLOYMENT (rated 2/5) | Different scope — infrastructure, not process. Separate CR. |
| Role 8: SMOKE FACILITATOR (rated 3/5) | Smaller gap — "how to present" guidance. Lower priority. |
| Role 12: RELEASE (rated 2/5) | Different scope — production deployment, rollback. Separate CR. |
| Shared Rules (R1-R18) | Already strong. v0.5 additions (R17, R18) working well. |
| Cross-role escalation framework (systemic) | This CR adds point-to-point escalation (Bug Fix → Investigation). Full mesh escalation is a larger design effort → future CR. |
| Persistent regression suite (systemic) | Requires tooling (test runner, result storage). Beyond doc scope → future CR. |
| Performance baselines persistence (systemic) | Requires build artifact storage. Beyond doc scope → future CR. |

---

## 6. Verification Matrix (seeds QA handover)

| # | Section | Change | How to Verify | Type |
|---|---------|--------|--------------|------|
| 1 | Role 1: INTAKE | Severity Rubric added | Read §INTAKE → rubric table exists with P0-P3 + triggers + SLA | DOC REVIEW |
| 2 | Role 1: INTAKE | Duplicate Detection Protocol | Read §INTAKE → 3-step protocol exists (ID search → file search → symptom match) | DOC REVIEW |
| 3 | Role 1: INTAKE | Evidence Storage | Read §INTAKE → evidence path + mandatory section template exists | DOC REVIEW |
| 4 | Role 1: INTAKE | Source + Confidence tag | Read §INTAKE → tag definition exists | DOC REVIEW |
| 5 | Role 1: INTAKE | Blast Radius estimate | Read §INTAKE → grep + count + hotspot check exists | DOC REVIEW |
| 6 | Role 4: QA | Finding Severity (4-tier) | Read §QA → BLOCKER/MAJOR/MINOR/NOTE table + routing rules exist | DOC REVIEW |
| 7 | Role 4: QA | Environment Check (Step 0) | Read §QA → 3-step environment verification before testing | DOC REVIEW |
| 8 | Role 4: QA | Re-test Protocol | Read §QA → explicit re-test rules after Bug Fix | DOC REVIEW |
| 9 | Role 4: QA | Evidence Format Standard | Read §QA → table format + required evidence type defined | DOC REVIEW |
| 10 | Role 4: QA | Coverage Sufficiency Check | Read §QA → per-file coverage check + ad-hoc test instruction | DOC REVIEW |
| 11 | Role 4: QA | Regression Scope Calibration | Read §QA → 3-tier scope guidance (1-2 files / hotspot / 3+) | DOC REVIEW |
| 12 | Role 5: BUG FIX | Reproduce Before Fixing (Step 0) | Read §BUG FIX → mandatory reproduce step with "cannot reproduce" escalation | DOC REVIEW |
| 13 | Role 5: BUG FIX | Root Cause Analysis (mandatory) | Read §BUG FIX → 5 RCA classifications + trace methodology | DOC REVIEW |
| 14 | Role 5: BUG FIX | Fix Report Template | Read §BUG FIX → structured output format exists | DOC REVIEW |
| 15 | Role 5: BUG FIX | 5 Escalation Paths | Read §BUG FIX → all 5 paths defined with recipient + artifact | DOC REVIEW |
| 16 | Role 5: BUG FIX | Scope expansion micro-protocol | Read §BUG FIX → non-plan file + hotspot protocols exist | DOC REVIEW |
| 17 | Role 6: INVESTIGATION | 10-Step Time-Box | Read §INVESTIGATION → step budget + INCONCLUSIVE handling | DOC REVIEW |
| 18 | Role 6: INVESTIGATION | Hypothesis-Driven Method | Read §INVESTIGATION → hypothesis → evidence → test cycle | DOC REVIEW |
| 19 | Role 6: INVESTIGATION | Structured Report Template (6 sections) | Read §INVESTIGATION → all 6 sections defined | DOC REVIEW |
| 20 | Role 6: INVESTIGATION | Data Persistence Rule | Read §INVESTIGATION → /tmp/ banned, /app/memory/evidence/ required | DOC REVIEW |
| 21 | Role 6: INVESTIGATION | Exit Criteria + Planning Skip | Read §INVESTIGATION → skip criteria (≤10 lines, 1 file, not hotspot, not financial) + owner approval | DOC REVIEW |
| 22 | Role 6: INVESTIGATION | Escalation from Bug Fix intake | Read §INVESTIGATION → intake format defined (symptom + attempted + hypothesis) | DOC REVIEW |
| 23 | Cross-role | Severity terminology consistent | INTAKE P0-P3 ≠ QA BLOCKER-NOTE — both defined, no conflict, explanatory note exists | DOC REVIEW |
| 24 | Cross-role | Evidence format compatible | INTAKE evidence storage format readable by QA evidence format | DOC REVIEW |
| 25 | Changelog | v0.6 entry exists | Read §CHANGELOG → v0.6 row with date + summary of all changes | DOC REVIEW |

---

## 7. Post-Implementation Registry Checklist

After the doc edits are applied, the Implementation agent MUST:

- [ ] `registry.json`: CR-047 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: CR-047 row updated
- [ ] `AGENT_PROMPT_ALPHA.md`: Changelog v0.6 entry added
- [ ] Code markers: N/A (doc-only CR — no source code files)
- [ ] `FILE_OWNERSHIP.md`: `AGENT_PROMPT_ALPHA.md` → CR-047 + date

---

## 8. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Agent doesn't read new sections (too long) | MEDIUM | HIGH — changes are useless if skipped | Keep each addition concise. Use tables over prose. Bold the mandatory steps. |
| R2 | Severity rubric becomes stale | LOW | MEDIUM — criteria drift from reality | Review rubric at each sprint closure. Add to PRE-RELEASE AUDIT checklist. |
| R3 | Bug Fix agent over-does RCA on trivial fixes | LOW | LOW — wasted 10 min | Add "MINOR severity: 1-line RCA summary sufficient" exception |
| R4 | Investigation 10-step limit is too restrictive | LOW | MEDIUM — premature INCONCLUSIVE | Agent can request extension in report. Owner decides. Not a hard ceiling, but default. |
| R5 | Evidence folder grows unbounded | LOW | LOW — disk space | Add cleanup rule: evidence for CLOSED items can be archived after sprint freeze |

---

## 9. Execution Recommendation

**Single atomic edit session.** All 4 roles updated in one pass to ensure cross-role references are consistent (especially severity terminology and evidence format).

**Order of edits:**
1. Role 1: INTAKE (upstream — defines severity + evidence format)
2. Role 4: QA (consumes INTAKE severity + evidence; defines finding severity)
3. Role 5: BUG FIX (consumes QA severity + evidence; defines escalation)
4. Role 6: INVESTIGATION (receives Bug Fix escalation; defines exit criteria)
5. Changelog entry
6. Registry updates

**Estimated size:** ~350 lines added, ~50 lines modified. Total file grows from ~1149 to ~1450 lines.

---

*CR-047 Impact Analysis — Gate 2 complete. Awaiting owner review → Gate 3 (Implementation Plan) → Gate 4 (Owner GO).*
