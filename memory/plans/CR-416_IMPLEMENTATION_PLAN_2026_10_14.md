# CR-416 — Implementation Plan (Gate 3)

**Item:** CR-416 — AGENT_PROMPT_ALPHA: Add SHEET PUSH + SHEET DRIFT Roles
**Date:** 2026-10-14
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Stage:** GATE_3_PLAN_COMPLETE
**Author:** PLANNING agent
**Depends on:** CR-416 Impact Analysis (`impact/CR-416_IMPACT_ANALYSIS_2026_10_14.md`)

---

## Scope Lock

### Files WILL change
```
memory/control/AGENT_PROMPT_ALPHA.md   (4 edits — all additive inserts, zero deletions)
```

### Files WILL NOT touch
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

If scope expands beyond this list → **STOP, re-declare, get owner approval.**

---

## Entry Verification (Implementation agent runs BEFORE touching the file)

```bash
# EV-1: Confirm E1 anchor — last row of Role Decision Tree
grep -n "Owner approved freeze and production release is needed" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~47: | Owner approved freeze and production release is needed | **RELEASE** |

# EV-2: Confirm E2 anchor — last row of Step 1 table
grep -n '| \*\*12\*\* | \*\*RELEASE\*\*' /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~249: | **12** | **RELEASE** | Owner approves freeze | ...

# EV-3: Confirm E3 anchor — end of ROLE 12 Skip + DISTRIBUTED ARTIFACT heading
grep -n "Everything except deployment and verification" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~1435
grep -n "^## DISTRIBUTED ARTIFACT OWNERSHIP" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~1439

# EV-4: Confirm E4 anchor — end of R26 + ENVIRONMENT heading
grep -n "ALL roles that touch \`package.json\`" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~1632
grep -n "^## ENVIRONMENT" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: line ~1636

# EV-5: Confirm NONE — no existing SHEET PUSH / SHEET DRIFT content
grep -c "SHEET PUSH\|SHEET DRIFT\|ROLE 13\|ROLE 14\|### R27" /app/memory/control/AGENT_PROMPT_ALPHA.md
# Expected: 0
```

**If any anchor differs from expected → STOP. Return to Planning agent.**

---

## Edit E1 — Role Decision Tree: add 2 rows

**File:** `memory/control/AGENT_PROMPT_ALPHA.md`
**Where:** After the `| Owner approved freeze and production release is needed | **RELEASE** |` row (line ~47), before the blank line preceding "If the owner request maps..."

**search_replace old_str:**
```
| Owner approved freeze and production release is needed | **RELEASE** |

If the owner request maps to more than one role, choose the earliest role in the gate sequence and state why.
```

**search_replace new_str:**
```
| Owner approved freeze and production release is needed | **RELEASE** |
| Owner wants to push registry.json to the CTO Google Sheet | **SHEET PUSH** |
| Owner wants to see what CTO changed in the Google Sheet | **SHEET DRIFT** |

If the owner request maps to more than one role, choose the earliest role in the gate sequence and state why.
```

---

## Edit E2 — Step 1 role table: add rows 13 + 14

**File:** `memory/control/AGENT_PROMPT_ALPHA.md`
**Where:** After the `| **12** | **RELEASE** | ...` row (line ~249), before the blank line preceding "**After picking your role...**"

**search_replace old_str:**
```
| **12** | **RELEASE** | Owner approves freeze | Tag branch, clean repo, deploy to production, post-deploy smoke. |

**After picking your role, jump to the matching section below. Follow ONLY that boot sequence.**
```

**search_replace new_str:**
```
| **12** | **RELEASE** | Owner approves freeze | Tag branch, clean repo, deploy to production, post-deploy smoke. |
| **13** | **SHEET PUSH** | Owner wants to push registry to Sheet | Run --push. Report result. No code files touched. |
| **14** | **SHEET DRIFT** | Owner wants to see CTO Sheet changes | Run --pull --dry-run. Show diff only. No registry writes. |

**After picking your role, jump to the matching section below. Follow ONLY that boot sequence.**
```

---

## Edit E3 — Insert ROLE 13 + ROLE 14 sections after ROLE 12

**File:** `memory/control/AGENT_PROMPT_ALPHA.md`
**Where:** After the closing `---` of ROLE 12's Skip section (line ~1437), before `## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)` (line ~1439)

**search_replace old_str:**
```
### Skip
- Everything except deployment and verification

---

## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)
```

**search_replace new_str:**
```
### Skip
- Everything except deployment and verification

---

## ROLE 13: SHEET PUSH AGENT <!-- CR-416 -->

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

---

## ROLE 14: SHEET DRIFT AGENT <!-- CR-416 -->

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

---

## DISTRIBUTED ARTIFACT OWNERSHIP (v0.7)
```

---

## Edit E4 — Insert R27 after R26

**File:** `memory/control/AGENT_PROMPT_ALPHA.md`
**Where:** After the closing `---` of R26 (line ~1634), before `## ENVIRONMENT` (line ~1636)

**search_replace old_str:**
```
**Applies to:** ALL roles that touch `package.json` (IMPLEMENTATION, BUG FIX, DEPLOYMENT, PRE-RELEASE AUDIT).

---

## ENVIRONMENT
```

**search_replace new_str:**
```
**Applies to:** ALL roles that touch `package.json` (IMPLEMENTATION, BUG FIX, DEPLOYMENT, PRE-RELEASE AUDIT).

---

### R27: SHEET PUSH and SHEET DRIFT carry a hard code-file gate <!-- CR-416 -->
SHEET PUSH MUST NOT modify any file under `frontend/src/`, `backend/`, any `*.jsx/.js/.py` application file, any `.env`, or any `*.json`.
SHEET DRIFT additionally MUST NOT write to `registry.json` or any other file under any circumstance — its only output is printing the diff to the console.
Both roles are owner-triggered only. No other role calls or depends on them.
Violation of either gate is a CRITICAL protocol error.

**Applies to:** SHEET PUSH (Role 13), SHEET DRIFT (Role 14).

---

## ENVIRONMENT
```

---

## Execution Sequence

1. Run Entry Verification (EV-1 through EV-5) — confirm all 4 anchors present, SHEET PUSH/DRIFT count = 0
2. Apply **E1** — Role Decision Tree 2 rows (small insert, top of file)
3. Apply **E2** — Step 1 table rows 13 + 14 (small insert)
4. Apply **E3** — ROLE 13 + ROLE 14 sections (largest insert, ~38 lines)
5. Apply **E4** — R27 rule (small insert)
6. Run Self-Verification (V1–V5)
7. Execute EXIT GATE (4 checkboxes — compile N/A for doc-only CR)
8. Update `registry.json`, `CR_REGISTRY.md`, `FILE_OWNERSHIP.md`

**Note:** E1 and E2 are independent table row inserts. E3 is the main role content (single atomic search_replace). E4 is the shared rule. All 4 are independent of each other and may be applied in any order, but the sequence above (top-to-bottom through the file) is safest.

---

## Verification Matrix

| # | Edit | What to verify | Method | Automated? |
|---|---|---|---|---|
| V1 | E1 | SHEET PUSH + SHEET DRIFT appear in Role Decision Tree | `grep -n "SHEET PUSH\|SHEET DRIFT" AGENT_PROMPT_ALPHA.md` → ≥8 hits | YES |
| V2 | E2 | Rows 13 + 14 present in Step 1 role table | `grep -n "\*\*13\*\*.*SHEET PUSH\|\*\*14\*\*.*SHEET DRIFT" AGENT_PROMPT_ALPHA.md` → 2 hits | YES |
| V3 | E3 | `## ROLE 13` and `## ROLE 14` sections exist | `grep -n "^## ROLE 13\|^## ROLE 14" AGENT_PROMPT_ALPHA.md` → 2 hits | YES |
| V4 | E4 | `### R27` section exists after R26 | `grep -n "^### R27" AGENT_PROMPT_ALPHA.md` → 1 hit | YES |
| V5 | E3+E4 | Hard gate text present in both roles and R27 | `grep -c "CRITICAL protocol error" AGENT_PROMPT_ALPHA.md` → 3 hits | YES |

All 5 verifications are grep-based and fully automated.

---

## Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | E3 old_str not unique | LOW — anchor includes 3 distinct consecutive lines across a section boundary | EV-3 confirms exact lines before editing; uniqueness verified (grep -c = 1) |
| R2 | Line drift between Gate 2 and Gate 3 sessions | LOW — file has no active modifier (no open CR on this file) | Entry Verification re-checks all anchors at current HEAD |
| R3 | E3 large insert (~52 lines) — partial write | None — search_replace is atomic | Verify with V3 grep immediately after applying |
| R4 | CR-369 (v0.8 new file) conflict | None — different file entirely | Confirmed in conflict pre-check |

---

## EXIT GATE (doc-only CR — 4 checkboxes, compile check N/A)

```
□ 1. VERIFICATION GREPS: all V1–V5 pass (grep counts correct)
     V1: grep -c "SHEET PUSH\|SHEET DRIFT" → ≥8
     V2: grep -n "**13**.*SHEET PUSH|**14**.*SHEET DRIFT" → 2 hits
     V3: grep -n "^## ROLE 13|^## ROLE 14" → 2 hits
     V4: grep -n "^### R27" → 1 hit
     V5: grep -c "CRITICAL protocol error" → 3 hits

□ 2. REGISTRY SYNC:
     python3 -c "import json; d=json.load(open('/app/memory/control/registry.json'));
     items={i['id']:i for i in d['items']};
     assert 'IMPLEMENTED' in items['CR-416']['status'], 'CR-416 not IMPLEMENTED';
     print('Registry PASS')"

□ 3. CR_REGISTRY.MD: CR-416 row updated to GATE_5A_IMPLEMENTED

□ 4. FILE_OWNERSHIP.MD: AGENT_PROMPT_ALPHA.md — CR-416 IMPL row added

□ 5. COMPILE CHECK: N/A — doc-only CR, no webpack
```

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-416 → status: GATE_5A_IMPLEMENTED, sprint_key: tooling_oct1
- [ ] CR_REGISTRY.md: row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: AGENT_PROMPT_ALPHA.md CR-416 IMPL 2026-10-14 row added
- [ ] Code markers: <!-- CR-416 --> comment added near ROLE 13 heading + ROLE 14 heading + R27 heading
```

---

## QA Handover Seed

**What to verify after implementation:**
1. Open `memory/control/AGENT_PROMPT_ALPHA.md` — confirm `## ROLE 13: SHEET PUSH AGENT` section exists
2. Confirm `## ROLE 14: SHEET DRIFT AGENT` section exists
3. Confirm both Hard Gate paragraphs contain the words "CRITICAL protocol error"
4. Confirm `### R27` section exists between R26 and `## ENVIRONMENT`
5. Confirm Role Decision Tree has SHEET PUSH + SHEET DRIFT rows (after RELEASE row)
6. Confirm Step 1 table has rows `| **13** |` and `| **14** |`
7. Confirm no existing role section (Roles 1–12) was modified
