# CR-416 — Impact Analysis (Gate 2)

**Item:** CR-416 — AGENT_PROMPT_ALPHA: Add SHEET PUSH + SHEET DRIFT Roles
**Date:** 2026-10-14
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Stage:** GATE_2_IMPACT_ANALYSIS
**Author:** PLANNING agent

---

## Code Reality

**NONE** — confirmed at HEAD 2026-10-14.

```bash
grep -c "SHEET PUSH\|SHEET DRIFT\|ROLE 13\|ROLE 14\|### R27" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Returns: 0
```

Neither ROLE 13 nor ROLE 14 nor R27 exist anywhere in the file. All 4 insertion points
are additive — zero existing lines will be modified or deleted.

---

## Conflict Pre-Check

| Item | File | Status | Conflict? |
|---|---|---|---|
| CR-369 | `control/AGENT_PROMPT_ALPHA_v0.8.md` (NEW file — does not exist yet) | INTAKE | **NONE** — different file entirely. CR-416 edits existing `AGENT_PROMPT_ALPHA.md`. |
| CR-047 | `AGENT_PROMPT_ALPHA.md` | CLOSED | **NONE** — closed, v0.6 hardening. |
| CR-408 | `CollectPaymentPanel.jsx` | GATE_5A | **NONE** — app code, different file entirely. |
| FILE_OWNERSHIP check | `AGENT_PROMPT_ALPHA.md` | No active entry | **NONE** — no other CR currently owns this file. |

**Verdict: No blocking conflicts. CR-416 may proceed independently.**

---

## 1. Summary

`memory/control/AGENT_PROMPT_ALPHA.md` needs two new on-demand roles added (ROLE 13 + ROLE 14)
plus one new shared rule (R27), across 4 additive insertion points:

| Role | Trigger | Command | Hard Gate |
|---|---|---|---|
| **SHEET PUSH** (Role 13) | "push to sheet" / "sync registry" / "sheet push" | `sheets_sync.py --push` | MUST NOT touch `frontend/src/`, `backend/`, `*.jsx/.js/.py`, `.env`, `*.json` |
| **SHEET DRIFT** (Role 14) | "show drift" / "check the sheet" / "what did CTO change" | `sheets_sync.py --pull --dry-run` | Same as above + MUST NOT write `registry.json` under any circumstance |

Script (`memory/reports/sheets_sync.py`) is already implemented — CR-406 GATE_5A. **No script changes needed.**
All 6 Owner Decisions locked. Zero open ODs.

---

## 2. Affected File

| File | Path | Type | Change type |
|---|---|---|---|
| `AGENT_PROMPT_ALPHA.md` | `memory/control/AGENT_PROMPT_ALPHA.md` | Control doc | 4 additive inserts — zero deletions, zero existing line modifications |

**Total scope:** 1 file · ~45 additive lines · zero deletions · zero existing lines modified.

---

## 3. Four Insertion Points — Verified at HEAD 2026-10-14

### I1 — Role Decision Tree: add 2 rows  (line 47)

**Anchor — current last row (line 47):**
```
| Owner approved freeze and production release is needed | **RELEASE** |
```
**Followed by (line 49):**
```
If the owner request maps to more than one role, choose the earliest role in the gate sequence and state why.
```

**Insert between them:**
```
| Owner wants to push registry.json to the CTO Google Sheet | **SHEET PUSH** |
| Owner wants to see what CTO changed in the Google Sheet | **SHEET DRIFT** |
```

---

### I2 — Step 1 role table: add rows 13 + 14  (line 249)

**Anchor — current last row (line 249):**
```
| **12** | **RELEASE** | Owner approves freeze | Tag branch, clean repo, deploy to production, post-deploy smoke. |
```
**Followed by (line 251):**
```
**After picking your role, jump to the matching section below. Follow ONLY that boot sequence.**
```

**Insert between them:**
```
| **13** | **SHEET PUSH** | Owner wants to push registry to Sheet | Run --push. Report result. No code files touched. |
| **14** | **SHEET DRIFT** | Owner wants to see CTO Sheet changes | Run --pull --dry-run. Show diff only. No registry writes. |
```

---

### I3 — New ROLE 13 + ROLE 14 sections  (after line 1437)

**Anchor — closing `---` of ROLE 12 Skip section (lines 1434–1439):**
```
### Skip
- Everything except deployment and verification

---

## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)
```

**Insert the two full role sections between the `---` and `## DISTRIBUTED ARTIFACT OWNERSHIP`:**

See §4 Role Text below for exact content (~38 additive lines).

---

### I4 — New R27 shared rule  (after line 1634)

**Anchor — closing `---` of R26 (lines 1630–1636):**
```
**Applies to:** ALL roles that touch `package.json` (IMPLEMENTATION, BUG FIX, DEPLOYMENT, PRE-RELEASE AUDIT).

---

## ENVIRONMENT
```

**Insert R27 section between the `---` and `## ENVIRONMENT`:**

See §5 Rule Text below for exact content (~8 additive lines).

---

## 4. Role Text (exact — seeds Implementation Plan)

### ROLE 13: SHEET PUSH AGENT

```markdown
## ROLE 13: SHEET PUSH AGENT
**When to call:** Owner says "push to sheet" / "sync registry to sheet" / "update the sheet" / "sheet push"

### Boot
None — no file reading required.

### Do
1. Run: `cd /app && python3 memory/reports/sheets_sync.py --push`
2. Check exit code AND scan stdout for any `⚠ Write failed` line.

### Hard Gate — NO CODE FILE TOUCHES (MANDATORY)
This role MUST NOT modify any file under `frontend/src/` or `backend/`, any `*.jsx/.js/.py` application file, any `.env` file, or any `*.json` file. Violation is a CRITICAL protocol error.

### Output
**Success:** `"SHEET PUSH COMPLETE — <N> items, 9 tabs updated."`
**Exit non-zero:** `"SHEET PUSH FAILED: <error text>. Sheet is out of sync. Owner action needed."`
**`⚠ Write failed` in stdout:** `"SHEET PUSH PARTIAL: tab '<name>' write failed. Verify Sheet tab."`
**Missing `.env`:** `"SHEET PUSH UNAVAILABLE — memory/reports/.env not present. Restore credentials per SESSION_HANDOVER_2026_10_05_CR406_SHEETS_SYNC_IMPL.md §3."`
Agent MUST flag any failure. Agent MUST NOT silently skip or proceed as if push succeeded.

### Skip
Everything else — no planning, no investigation, no code review.
```

---

### ROLE 14: SHEET DRIFT AGENT

```markdown
## ROLE 14: SHEET DRIFT AGENT
**When to call:** Owner says "show drift" / "check the sheet" / "what did CTO change" / "sheet drift"

### Boot
None — no file reading required.

### Do
1. Run: `cd /app && python3 memory/reports/sheets_sync.py --pull --dry-run`
2. Print the output as-is. STOP.

### Hard Gate — NO CODE FILE TOUCHES AND NO REGISTRY WRITES (MANDATORY)
This role MUST NOT modify any file under `frontend/src/` or `backend/`, any `*.jsx/.js/.py` app file, any `.env` file, or write to `registry.json` under any circumstance. The diff is read-only output only. Violation is a CRITICAL protocol error.

### Output
Read-only diff printed as-is. Owner decides what to do next.
If no changes: `"No drift detected — registry.json matches the Sheet."`
If credentials missing: `"SHEET DRIFT UNAVAILABLE — memory/reports/.env not present."`

### Skip
Everything else — no planning, no code, no registry writes of any kind.
```

---

## 5. R27 Rule Text (exact — seeds Implementation Plan)

```markdown
### R27: SHEET PUSH and SHEET DRIFT carry a hard code-file gate
SHEET PUSH MUST NOT modify any file under `frontend/src/`, `backend/`, any `*.jsx/.js/.py` application file, any `.env`, or any `*.json`.
SHEET DRIFT additionally MUST NOT write to `registry.json` or any other file under any circumstance — its only output is printing the diff to the console.
Both roles are owner-triggered only. No other role calls or depends on them.
Violation of either gate is a CRITICAL protocol error.

**Applies to:** SHEET PUSH (Role 13), SHEET DRIFT (Role 14).
```

---

## 6. Risk Classification

| Field | Value |
|---|---|
| **Risk** | LOW |
| **Reason** | Doc-only, additive. No application code. No existing role behaviour modified. New roles are passive and owner-triggered only. |
| **Fast Lane** | NO — critical control document, 4 sections, not ≤10 lines |
| **Compile check** | N/A — no webpack, no `frontend/src/` changes |

---

## 7. Non-Regression Analysis

| Item | Impact |
|---|---|
| All 12 existing roles (INTAKE → RELEASE) | **ZERO** — no existing line in any role section is modified. Purely additive. |
| Role Decision Tree | 2 rows added at end of table. No existing row touched. |
| Step 1 role table | 2 rows added at end of table (rows 13 + 14). No existing row touched. |
| R26 | Unchanged. R27 inserted after R26 in its own section. |
| DISTRIBUTED ARTIFACT OWNERSHIP section | Unchanged — roles 13 + 14 insert BEFORE this section, not inside it. |
| CR-369 (v0.8 new file) | Parallel-safe — different file entirely. |

---

## 8. Owner Decisions

All 6 locked (OD-INV-SHEETS-01 through OD-INV-SHEETS-06, session 2026-10-11). **Zero open decisions.**

---

## 9. Files WILL change

```
memory/control/AGENT_PROMPT_ALPHA.md  (1 file, 4 additive insertions, ~45 lines)
```

## Files WILL NOT touch

```
memory/reports/sheets_sync.py          (script correct as-is — CR-406 GATE_5A)
memory/control/registry.json           (EXIT GATE only — status update after implementation)
memory/control/CR_REGISTRY.md          (EXIT GATE only — row update)
memory/control/FILE_OWNERSHIP.md       (EXIT GATE only)
Any frontend/src/ file
Any backend/ file
Any *.jsx / *.js / *.py application file
Any .env file
```

---

## 10. Gate Status (updated)

| Gate | Status |
|---|---|
| Gate 1 (Intake) | **COMPLETE** — `change_requests/CR-416_AGENT_PROMPT_ALPHA_SHEET_PUSH_SHEET_DRIFT_ROLES_INTAKE.md` |
| Gate 2 (Impact Analysis) | **COMPLETE** (this document) |
| Gate 3 (Implementation Plan) | PENDING — awaiting owner "Gate 3 GO CR-416" |
| Gate 4 GO | NOT given |
