# Intake Backfill + Code Gate Waiver — Plan

**Doc:** INTAKE_BACKFILL_AND_CG_WAIVER_PLAN_2026_05_30.md
**Date:** 2026-05-30
**Owner choices:** Q1=A (auto-gen) · Q2=C (master + symbolic refs) · Q3=C (green W overlay) · Q4=B (cutoff 2026-05-18) · Q5=A (single shot)

---

## 1. Target population (38 closed bugs)

### Set A — Only Intake missing (28 bugs)
POS 3.0 → BUG-089, 098, 099, 100, 102, 103
POS 2.0 → BUG-050, 051, 052, 054, 055, 056, 062, 066, 067, 072, 073, 075, 078, 079, 080
pos_final_1.0 → BUG-045, 046
(— legacy) → BUG-006, 009, 013, 019, 023

### Set B — Intake + Code Gate missing (10 bugs)
POS 3.0 → BUG-087, 088
pos_final_1.0 → BUG-038
(— legacy) → BUG-001, 003, 028, 029, 032, 034, 035

## 2. Code Gate Waiver — eligibility rule

A bug qualifies for Code Gate waiver iff **closure date ≤ 2026-05-18** AND a Code Diff Preview / Pre-Implementation Code Gate doc was not produced in its closure flow. All 10 bugs in Set B satisfy this (closed in POS 2.0 wave or earlier prod-hotfix sweeps).

## 3. Intake stub auto-generation (Q1=A)

Generator at `/app/scripts/generate_intake_stubs.py`:
1. Reads `bug_tracker.json` to get title/sprint/status per bug ID.
2. For each target bug, scans all docs flagged as `impact`, `plan`, or `qa_report` by the v2.1 reaudit scanner.
3. Extracts:
   - **Symptom** — first non-trivial paragraph mentioning the bug ID or its title keywords.
   - **Acceptance criteria** — first bulleted list following keywords like "QA check", "Acceptance", "Verification", "Smoke".
   - **Affected modules** — files-touched column from the CSV.
4. Writes uniform 6-section stub at `/app/memory/memory/bugs/intake/BUG_<NNN>_INTAKE_2026_05_30.md`.
5. Filename matches the scanner's `intake` slot regex → auto-picked-up on next audit run.

Template (per stub):
```
# BUG-<NNN> — Intake (Backfill) — 2026-05-30
**Bug:** <title>
**Sprint:** <sprint>
**Status:** <status>
**Backfill rationale:** Intake artifact was not produced at original closure (pre-rule or sprint-rollup-style closure). Reconstructed from existing impact/plan/QA evidence.

## Symptom (extracted)
<auto-extracted first paragraph>

## Affected modules
<files_touched from CSV>

## Acceptance criteria (extracted)
<auto-extracted bullets>

## Provenance — existing artifacts on record
<list of impact/plan/qa/smoke doc paths discovered>

## Code Gate status
<PRESENT path> | WAIVED — see CODE_GATE_WAIVER_REGISTRY_2026_05_30.md (for Set B only)
```

## 4. Code Gate Waiver Registry (Q2=C)

### Master doc
`/app/memory/control/CODE_GATE_WAIVER_REGISTRY_2026_05_30.md` — authoritative list with closure dates, original artifacts, and waiver authority.

### Per-bug symbolic stubs (10)
`/app/memory/memory/bugs/code_gate_waivers/BUG_<NNN>_CG_WAIVER.md` — 3-line file pointing to master registry. Required so the scanner's `code_gate` regex matches and the bug attains 7/7.

Scanner enhancement: detect files matching `*_CG_WAIVER*.md` → classify slot=`code_gate`, mark `waived: true` in artifact_refs output.

## 5. Dashboard UI changes (Q3=C — green-W overlay)

### styles.css additions
```css
.dot-WAIVED {
  background: rgb(16,185,129);                /* same green as PRESENT */
  position: relative;
}
.dot-WAIVED::after {
  content: 'W';
  position: absolute;
  inset: 0;
  font-size: 8px;
  font-weight: 800;
  color: #052e1a;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
```

### dashboard.js changes (`ArtifactRefsSection`)
```js
const isWaived = items.some(r => r.waived);
const dotClass = isWaived ? "dot-WAIVED" : "dot-PRESENT";
// title attribute for tooltip
title={isWaived ? "WAIVED — owner exception (pre-rule)" : "Artifact present"}
```

## 6. Scanner upgrade — v2.2

`/app/scripts/reaudit_closure_debt.py` learns:
- A new filename rule: `r"_CG_WAIVER"` → slot=`code_gate`, but tag emitted ref with `waived: true`.
- A new CSV value `WAIVED` for `art4_code_gate`. Treated as not-missing in severity scoring.
- Cross-link the master registry path in `existing_docs_path` for waived bugs.

## 7. Execution order (single shot — Q5=A)

```
1. Write Session Start + Plan (this doc) ✅
2. Build generator script
3. Build CG Waiver Registry master + 10 stubs
4. Run generator → 38 intake stubs created
5. Upgrade scanner (v2.2 — WAIVED handling)
6. Update dashboard.js + styles.css
7. Run scanner → CSV + closure_debt.json + bug_tracker.json regenerated
8. Screenshot verify BUG-098 (7/7) + BUG-088 (7/7 with W on Code Gate)
9. Write Report + Owner Smoke Sign-off
10. Update CONTROL_DASHBOARD.md + PRD.md
```

## 8. Risk / Rollback

| Risk | Mitigation |
|---|---|
| Auto-generator extracts wrong paragraph | Provenance section names all source docs — owner can audit any stub |
| Waiver concept rejected later | Delete waiver folder + revert dashboard.js (one commit) → state returns to 5/7 for those 10 bugs |
| Scanner regression | Existing PRESENT flags are never downgraded |
| UI regression | CSS + JS changes are additive; existing PRESENT path unaffected |

## 9. Acceptance criteria for THIS task
- All 38 stubs exist on disk and are non-empty.
- All 10 waiver stubs exist and link to master registry.
- Re-run of scanner yields 38 bugs with `completeness: "7/7"`.
- Dashboard renders W-overlay green dots on Code Gate row for the 10 waived bugs.
- Closure Debt CSV `severity` for all 38 bugs = `RESOLVED`.
