# Registration Gate Policy

**Status:** ACTIVE
**Created:** 2026-06-01
**Effective:** Immediately (all POS 4.0+ work)
**Enforces:** No work of any kind on unregistered items

---

## 1. The Rule (non-negotiable)

**NO analysis, discovery, planning, or implementation may begin on ANY bug, CR, or hotfix
unless the item has a registered ID in `registry.json`.**

This means:
- No impact analysis without a registered ID
- No implementation plan without a registered ID
- No code gate without a registered ID
- No code changes without a registered ID
- No "quick fix" without a registered ID
- No "let me just look at this" that turns into code without a registered ID

**Registration is Artifact #1 (Intake). It is the first gate. Everything else follows.**

---

## 2. Why This Rule Exists

Without registration:
- Work is invisible to the control layer (dashboard, closure debt, sprint tracking)
- No audit trail exists for what was done or why
- The 7-artifact closure model can't function (artifacts 2-6 have no parent ID)
- Scope creep goes untracked
- Regression risk is unassessed
- Multiple agents may work on the same issue without knowing

---

## 3. The Full Gate Sequence (POS 4.0+)

```
GATE 0: REGISTRATION (this policy)
  └─ Item MUST have an ID in registry.json before ANY work begins
  └─ Created via: conversational intake → create_intake.py
  └─ Output: BUG-{id} or CR-{id} in registry with completeness 1/7

GATE 1: INTAKE DOCUMENT (artifact #1)
  └─ Symptom/requirement, area, priority documented
  └─ Auto-created by create_intake.py during registration

GATE 2: IMPACT ANALYSIS (artifact #2)
  └─ Module mapping, affected files, API check, state impact, regression risk
  └─ Agent produces BEFORE any planning

GATE 3: IMPLEMENTATION PLAN (artifact #3)
  └─ File-level change plan, approach, test strategy
  └─ Agent produces BEFORE any code

GATE 4: CODE GATE (artifact #4) — MANDATORY, NON-WAIVABLE for POS 4.0+
  └─ Scope lock: exact files to change, exact files NOT to change
  └─ Diff preview of intended changes
  └─ Owner gives GO → code may begin

GATE 5: IMPLEMENTATION + QA (artifact #5)
  └─ Code written, tested, QA report produced

GATE 6: OWNER SMOKE SIGN-OFF (artifact #6)
  └─ Owner verifies the fix/feature works
  └─ Item may now be marked CLOSED
```

**Each gate is sequential. You cannot skip to a later gate without completing all prior gates.**

---

## 4. How Registration Works

### Option A: Conversational Intake (standard)
1. Owner describes the issue in chat
2. Agent follows the 5-step intake flow (`INTAKE_WORKFLOW.md`)
3. Agent runs `python3 scripts/create_intake.py` → ID assigned
4. Item is now registered → agent may proceed to Gate 2 (Impact Analysis)

### Option B: Emergency Fast-Track
For production-down / P0 situations ONLY:
1. Agent runs `create_intake.py` with minimal info (title + "P0" + area)
2. Proceeds immediately to analysis + fix
3. MUST backfill full intake doc within the same session
4. Emergency flag noted in the intake doc

### Option C: Batch Registration
When multiple bugs/CRs are reported at once:
1. Agent lists all items with titles
2. Owner confirms the batch
3. Agent runs `create_intake.py` once per item
4. All items registered before any analysis begins on any of them

---

## 5. What If an Agent Tries to Skip Registration?

The agent MUST self-check:

```
BEFORE doing ANY of these:          CHECK:
─────────────────────────────────   ──────────────────────────────
Reading code to understand a bug  → Does this bug have a registered ID?
Writing an impact analysis        → Does this item have a registered ID?
Creating an implementation plan   → Does this item have a registered ID?
Opening a file to make changes    → Does this item have a registered ID?
Running a test for a fix          → Does this item have a registered ID?
```

**If NO → STOP. Run the intake flow first. Get the ID. Then proceed.**

---

## 6. Verification (for auditors / owner)

To verify compliance, check:
1. Every item in the current git diff should trace back to a registered ID
2. `registry.json` should have an entry for every bug/CR being worked on
3. `gen_dashboard_data.js --check` should be clean
4. No orphan docs in `bugs/` or `crs/` folders without a matching registry entry

---

## 7. Exceptions

| Scenario | Exception | Registration Required? |
|---|---|---|
| Documentation-only cleanup (no code) | Exempt from Code Gate (#4) but still needs registration | YES |
| Control layer updates (dashboard, registry, policies) | Exempt from full gate sequence | NO (meta-work) |
| Business rule promotion (verify-and-freeze, no code) | Exempt from Code Gate (#4) | NO (baseline work) |
| Emergency P0 hotfix | Fast-track allowed (Option B above) | YES (backfill) |

---

## 8. Relationship to Other Policies

| Policy | What It Controls | This Policy Adds |
|---|---|---|
| `CODE_GATE_POLICY.md` | Gate 4 (Code Gate mandatory for POS 4.0+) | Gate 0 (Registration mandatory BEFORE everything) |
| `INTAKE_WORKFLOW.md` | How to collect info from owner | The conversational method for Gate 0 |
| `IMPLEMENTATION_AGENT_RULES.md` | Gates 2-6 (analysis → implementation → closure) | Gate 0 as a prerequisite to all of them |
| `AGENT_PROMPT_ALPHA.md` | Agent behavior rules | Adds the self-check in Section 5 |

---

*Registration Gate Policy — 2026-06-01. No work without an ID.*
