# CR-047 — Flow Recheck: v0.6 End-to-End Interaction Verification

**Date:** 2026-06-15
**Purpose:** Walk through 3 realistic scenarios and verify the v0.6 additions create no dead ends, contradictions, or infinite loops.

---

## Scenario 1: Happy Path — New Bug, Fixed First Try

```
OWNER reports: "Discount amount showing wrong on print"

INTAKE (v0.6):
  1. Severity Rubric → P1 (money wrong, workflow not broken) ✅
  2. Duplicate Check → grep "discount.*print" in registry → no match → DISTINCT ✅
  3. Evidence → owner screenshot saved to /app/memory/evidence/BUG-XXX/ ✅
  4. Source: OWNER-REPORTED, Confidence: CONFIRMED ✅
  5. Blast Radius: grep "discount" → 8 files, 2 hotspots (orderTransform, CollectPaymentPanel) ✅
  → Intake doc created, registered in registry.json

PLANNING (unchanged):
  → Reads intake, notes blast radius (8 files, 2 hotspots) → scopes investigation
  → Impact Analysis + Implementation Plan
  → Verification Matrix: 4 checks (2 automated, 2 browser)

OWNER: Gate 4 GO

IMPLEMENTATION (unchanged):
  → Entry verification, code edits, self-test, EXIT GATE 5/5
  → QA Handover with severity hint from intake (P1)

QA (v0.6):
  1. Environment Check → frontend compiles, backend responds, login works ✅
  2. Precondition Check (v0.5) → registry synced, EXIT GATE confirmed ✅
  3. Execute 4 test cases → 4/4 PASS ✅
  4. Finding Severity → all PASS, no failures to classify ✅
  5. Coverage Check → 2 files changed, both have ≥1 test ✅
  6. Regression Scope → hotspot touched → +2 cross-flow tests → PASS ✅
  7. Registry Spot-Check (v0.5) ✅
  → QA Report: 6/6 PASS

SMOKE → PASS
CLOSURE → artifact audit 7/7 present ✅

FLOW CHECK: ✅ No gaps, no dead ends. v0.6 additions add value without blocking.
```

---

## Scenario 2: Bug Fix Fails, Escalates to Investigation

```
QA finds 3 failures: 1 BLOCKER, 1 MAJOR, 1 MINOR

QA (v0.6):
  Report: 3 findings with severity:
  | # | Test | Severity | Evidence |
  | 1 | Discount wrong on print | BLOCKER | screenshot + curl |
  | 2 | Discount label misaligned | MINOR | screenshot |
  | 3 | Wrong currency symbol | MAJOR | screenshot |
  → Routes: BLOCKER + MAJOR → Bug Fix mandatory. MINOR → owner decides.

BUG FIX (v0.6):
  Step 0 — Reproduce:
    #1 BLOCKER: reproduced ✅
    #2 MINOR: reproduced ✅ (owner said "fix it")
    #3 MAJOR: CANNOT REPRODUCE ❌ → follows protocol:
       "Cannot reproduce #3. Evidence: I see ₹ symbol correctly on my test account.
        Possible causes: restaurant-specific config, cached data.
        Need QA to re-verify or provide exact restaurant + order ID."
    → Returns #3 to QA with evidence ✅ (no dead end)

  Step 1 — RCA:
    #1 BLOCKER: trace symptom → orderTransform.js:603 → discount_amount hardcoded '0.00'
       Classification: PLAN_GAP — plan didn't cover this edge case
       "Root cause: PLAN_GAP — transform sends hardcoded discount, not computed value"
    #2 MINOR: trace → CSS margin wrong
       Classification: CODE_ERROR — plan said 8px, code has 4px
       "Root cause: CODE_ERROR — 1-line CSS fix"

  Step 2 — Fix:
    #1: Fix transform line → within scope ✅
    #2: Fix CSS → within scope ✅

  Step 3 — Verify:
    #1: re-run → PASS ✅
    #2: re-run → PASS ✅
    Adjacent tests: 2/2 PASS ✅

  Fix Report:
    | # | RCA | Classification | Fix | Files | Verified |
    | 1 | PLAN_GAP | discount hardcode | real value | orderTransform.js | ✅ |
    | 2 | CODE_ERROR | CSS margin | 8px | styles.css | ✅ |
    #3: returned to QA (cannot reproduce)

  EXIT GATE: 5/5 ✅

QA RE-TEST (v0.6):
  Re-test protocol:
    - Re-run #1 (was BLOCKER, now fixed) → PASS ✅
    - Re-run #2 (was MINOR, now fixed) → PASS ✅
    - Re-run #3 (was MAJOR, Bug Fix couldn't reproduce) → now FAILS again with different data
    → QA provides exact restaurant ID, order ID, timestamp

BUG FIX (v0.6) — second attempt on #3:
  Step 0 — Reproduce with QA's exact data → reproduced ✅
  Step 1 — RCA: trace → data shape differs for this restaurant (VAT not GST)
    Classification: DATA_EDGE — code works for GST restaurants, fails for VAT
  
  But wait — fix requires touching profileTransform.js (not in original plan scope).
  Step 2 — Scope expansion:
    "Fix for #3 requires modifying profileTransform.js (not in original plan scope).
     Reason: VAT currency symbol stored differently in profile.
     Risk: LOW. Approve?"
  → Owner approves ✅
  → Fix applied, verified ✅

FLOW CHECK: ✅ No infinite loops. "Cannot reproduce" has a clear path (back to QA with evidence).
             Scope expansion has a clear path (declare + owner approval).
             RCA classifications provide sprint retrospective data.
```

---

## Scenario 3: Investigation Escalation from Bug Fix

```
QA finds 2 failures. Bug Fix reproduces but can't find root cause.

BUG FIX (v0.6):
  Step 0 — Reproduce: both reproduced ✅
  Step 1 — RCA:
    #1: trace symptom → component renders correct data → but UI shows wrong value
        → inspect further → data in React DevTools is correct → CSS not the issue
        → 25 min spent, no root cause found
    → Triggers escalation path B-4:
      "Escalating #1 to Investigation. 
       Symptom: UI shows ₹500 but React state has ₹400.
       Attempted: traced transform (correct), traced state (correct), checked CSS (correct).
       Hypothesis: stale closure or race condition in useEffect."

INVESTIGATION (v0.6):
  Step 0 — Receives escalation with: symptom + attempted + hypothesis ✅
  
  Hypotheses:
    H1: stale closure in useEffect (Bug Fix agent's hypothesis)
    H2: another component overwrites the value via shared context
    H3: socket event pushes stale data after initial render
  
  10-step investigation:
    Step 1: grep for the state variable → found in 3 components ✅
    Step 2: trace shared context → OrderContext has setValue() ✅
    Step 3: check socket handler → handleOrderUpdate writes to same context ✅
    Step 4: curl socket-equivalent API → returns ₹500 (stale order data) ✅
    → H3 CONFIRMED at step 4 (6 steps remaining)
  
  Report:
    Summary: Socket event pushes stale order data after initial API fetch
    Classification: INTERACTION_BUG (socket handler + API race)
    Confidence: HIGH (reproduced + traced)
    
    Recommendation:
      Fix: add timestamp comparison in socket handler — ignore if older than API response
      Scope: 1 file (socketHandlers.js), ~8 lines
      Hotspot: NO
      Financial: NO
      → DIRECT_BUG_FIX eligible (≤10 lines, 1 file, not hotspot, not financial)
      → Owner approval needed for skip
  
  Evidence: saved to /app/memory/evidence/BUG-XXX/socket_trace.json ✅
  
  → Owner approves direct Bug Fix (skip full Planning gate cycle) ✅

BUG FIX:
  → Receives Investigation report with exact file + line + fix description
  → Implements 8-line fix
  → Verifies → PASS

FLOW CHECK: ✅ Bug Fix → Investigation escalation works.
             Investigation → direct Bug Fix skip path works (with owner approval).
             No orphaned items. Evidence persisted. 
             10-step budget prevented rabbit hole (found in 4 steps).
```

---

## Scenario 4: Edge Case — INTAKE Registers a DUPLICATE

```
OWNER: "The coupon BOGO doesn't work"

INTAKE (v0.6):
  Duplicate Check:
    Step 1: grep registry.json for "coupon\|BOGO" → BUG-118 found!
      BUG-118: "Nth-item coupon code and BOGO coupon code — some features not working"
      Status: INTAKE
    
    → Classification: DUPLICATE
    → "This matches existing BUG-118 (INTAKE status). 
       Do NOT register new item.
       Recommend: add your new details to BUG-118's intake doc.
       BUG-118 is in the current workflow queue (BATCH-2026-06-15-001)."

FLOW CHECK: ✅ Duplicate detected. No registry bloat. Owner directed to existing item.
```

---

## Scenario 5: Edge Case — QA Finds Issue But Environment Was Down

```
QA starts testing.

QA (v0.6):
  Step 0 — Environment Check:
    1. Frontend compiles → check log → "Compiled with warnings" ✅
    2. Backend responds → curl /api/ → connection refused ❌
    → STOP: "Cannot start QA — backend not responding.
       Evidence: curl -s https://preview.url/api/ → connection refused.
       Return to Implementation agent to verify environment."

FLOW CHECK: ✅ False negative prevented. QA doesn't report "all APIs fail" as 20 BLOCKERs.
```

---

## Identified Conflict: Severity Terminology

**INTAKE** uses: P0, P1, P2, P3 (item priority for sprint planning)
**QA** uses: BLOCKER, MAJOR, MINOR, NOTE (finding severity for bug fix routing)

These are DIFFERENT DIMENSIONS measuring DIFFERENT THINGS:
- P1 item can have a MINOR QA finding (e.g., label misalignment on a high-priority feature)
- P2 item can have a BLOCKER QA finding (e.g., data corruption on a low-priority feature)

**Resolution:** Add explicit note in both sections:
```
NOTE: INTAKE severity (P0-P3) = item priority for sprint planning.
      QA severity (BLOCKER-NOTE) = finding severity for bug fix routing.
      These are independent. A P2 item can have BLOCKER findings.
```
This is already flagged in Impact Analysis §3.3 row 1. ✅

---

## Summary

| Scenario | Flow Complete? | Dead Ends? | Loops? | v0.6 Value Added |
|----------|:-:|:-:|:-:|---|
| 1. Happy path | ✅ | 0 | 0 | Evidence flows downstream, coverage check catches gaps |
| 2. Bug Fix fails | ✅ | 0 | 0 | "Cannot reproduce" has clear return-to-QA path |
| 3. Investigation escalation | ✅ | 0 | 0 | Bug Fix → Investigation → direct Bug Fix skip works |
| 4. Duplicate intake | ✅ | 0 | 0 | Duplicate detection prevents registry bloat |
| 5. Environment down | ✅ | 0 | 0 | Environment check prevents false negative cascade |

**Verdict: v0.6 additions create no dead ends, contradictions, or infinite loops. All 5 scenarios complete cleanly.**

---

*CR-047 Flow Recheck complete. Ready for Gate 3 (Implementation Plan) → Gate 4 (Owner GO).*
