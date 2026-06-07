# SESSION START — Closure Debt Re-Audit (v2)

**Created:** 2026-05-30
**Agent:** E1 (fork)
**Topic:** Closure Debt Re-Audit — fix incorrect "6/6 missing" classifications
**Owner GO:** Received ("Go" message, 2026-05-30)

---

## 1. Why this session exists

Owner inspected the Dev Dashboard and flagged that POS 3.0 bugs (BUG-087, 088, 089, 098, 100, 102, 103) showing "6/6 missing — CRITICAL" cannot be true because these were closed bugs and documents must exist.

Spot-grep confirmed the owner is correct:

- `final_sprint_reconciliation/POS3_0_BUCKET_A_*.md` (5 docs) covers BUG-089, 100, 102, 103 with Owner Approval Plan (=Impact), Code Diff Preview (=Code Gate), Implementation Report (=Impl Summary), QA Handoff (=QA Report), Master Implementation Plan (=Plan).
- `POS3_0_CR_WAVE_1_BUG_098_*.md` (3 docs) covers BUG-098 across plan/code-gate/impl-report.
- `POS3_0_COMPLETE_SPRINT_IMPLEMENTATION_REPORT_2026_05_19.md` covers BUG-087, BUG-088 in 4-batch detail with file register.
- `POS3_0_COMPLETE_SPRINT_STATUS_RECONCILIATION_2026_05_21.md` explicitly states *"Implemented + owner-confirmed: 8 — BUG-087, 088, 089, 098, 099, 100, 102, 103"* → that line is the Owner Smoke Sign-off equivalent.

Root cause of the bad audit: the v1 pass only matched per-bug filename patterns (`BUG_087_*`, `BUG_088_*`, …) and ignored sprint-rollup / bucket-level / wave-level docs that legitimately carry artifact content for multiple bugs.

---

## 2. Scope Lock (declared)

### IN-SCOPE files (this session may modify)
- `/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv` (add `audit_revision` column; correct artifact flags + paths)
- `/app/frontend/public/__dev/data/closure_debt.json` (regenerated snapshot from new CSV)
- `/app/memory/memory/change_requests/CLOSURE_DEBT_REAUDIT_001_PLAN_2026_05_30.md` (NEW)
- `/app/memory/memory/change_requests/CLOSURE_DEBT_REAUDIT_001_REPORT_2026_05_30.md` (NEW)
- `/app/memory/memory/CLOSURE_DEBT_REAUDIT_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md` (NEW)
- `/app/scripts/reaudit_closure_debt.py` (NEW — scanner + CSV rewriter)
- `/app/memory/control/CONTROL_DASHBOARD.md` (mention the v2 audit)
- `/app/memory/PRD.md` (changelog)

### OUT-OF-SCOPE (do NOT touch)
- React app source under `/app/frontend/src/`
- `BUG_TRACKER.md`, `CR_REGISTRY.md` (status strings already normalized last session)
- `bug_tracker.json`, `cr_registry.json` (statuses unchanged)
- `__dev/dashboard.js`, `__dev/styles.css`, `__dev/index.html` (UI logic untouched)
- Any production code under `/app/backend` (there is no backend)

---

## 3. Artifact classification rules (v2)

A doc maps to artifact slot if either (a) filename matches the pattern OR (b) the bug ID is mentioned **and** the doc title/content matches the artifact's role. Sprint-rollup and bucket-level docs count as artifact carriers when they explicitly cover the bug.

| Slot | Filename patterns (case-insensitive) |
|---|---|
| **A1 — Intake** | `_INTAKE_`, `_DISCOVERY_`, `_REGISTRATION_`, `_REQUIREMENT_`, `MASTER_IMPLEMENTATION_PLAN`, `_SCOPE_`, `_BACKLOG_`, `CR_REGISTERED`, `BUG_FIX_PLANNING` |
| **A2 — Impact Analysis** | `_IMPACT_ANALYSIS_`, `_OWNER_APPROVAL_PLAN_`, `_INVESTIGATION_`, `_ANALYSIS_`, `_DECISION_`, `_RECONCILIATION_NOTE`, `_GAP_`, `_BASELINE_RECONCILIATION` |
| **A3 — Implementation Plan** | `_IMPLEMENTATION_PLAN_`, `_FIX_PLAN_`, `_PLAN_`, `_DECISION_PLAN_`, `_BUCKETED_PLAN`, `_CORRECTIVE_PLAN_`, `_PLANNING_`, `_PHASE_*_PLAN` (excluded if matched A1/A2 above) |
| **A4 — Code Gate** | `_CODE_DIFF_PREVIEW_`, `_CODE_GATE_`, `PRE_IMPLEMENTATION_CODE_GATE`, `_DIFF_PREVIEW_`, `_CODE_CHANGE_PREVIEW_` |
| **A5 — Impl Summary / QA** | `_IMPLEMENTATION_REPORT_`, `_IMPLEMENTATION_SUMMARY_`, `_FIX_REPORT_`, `_QA_REPORT_`, `_QA_HANDOFF_`, `_QA_HANDOVER_`, `_CLOSURE_REPORT_`, `_FINAL_QA`, `_PATCH_`, `_RESMOKE_REPORT_` |
| **A6 — Owner Smoke Sign-off** | `_SMOKE_SIGNOFF`, `_OWNER_SMOKE_`, `_SMOKE_QA_CHECKLIST_`, `_SMOKE_PASS_REPORT_`, `_VERIFICATION_`, `_FINAL_SMOKE_REPORT_`, `_OWNER_VERIFICATION_`, `_STATUS_RECONCILIATION_` (only when explicitly states owner-confirmed for the bug) |

Priority order when one doc could fit multiple slots: A4 → A6 → A5 → A2 → A3 → A1 (most specific wins). A doc is only counted once per slot per bug.

---

## 4. Methodology

1. Build a Python scanner that walks `/app/memory/**/*.md`, extracts every bug-ID reference (regex `BUG[-_]?0?\d{2,3}|POS[23]_\d_BUG_\d{3}`), and classifies the doc by filename pattern (rules above).
2. Aggregate per-bug evidence dictionary: `{ bug_id: { A1:[paths], A2:[paths], …, A6:[paths] } }`.
3. Read existing `CLOSURE_DEBT_BURNDOWN.csv` and rewrite each row with new `art1…art6` values (`PRESENT` if ≥1 path matched, `MISSING` otherwise), new `missing_count`, new `severity`, new `existing_docs_path` (top-3 paths per row), and new `audit_revision=v2`.
4. Regenerate `closure_debt.json` snapshot from the updated CSV.
5. Write before/after delta report.
6. Take a screenshot of the Dev Dashboard to verify accurate display.
7. Write Owner Smoke Sign-off doc.

---

## 5. Self-Assessment Targets

- **Accuracy:** No bug should be wrongly demoted (i.e. if v1 said PRESENT, v2 must keep PRESENT unless a path was renamed/deleted). The script must only ever **upgrade** evidence, never silently downgrade.
- **Transparency:** Every PRESENT cell must have a concrete file-path in `existing_docs_path`.
- **Auditability:** The script itself is committed at `/app/scripts/reaudit_closure_debt.py` so the audit is reproducible.

---

## 6. Done definition

- [ ] Re-audit script created and runs cleanly
- [ ] `CLOSURE_DEBT_BURNDOWN.csv` rewritten with `audit_revision=v2`, accurate counts
- [ ] `closure_debt.json` regenerated, served by Dev Dashboard
- [ ] Screenshot of Dev Dashboard shows realistic counts (no more 6/6 for shipped POS 3.0 bugs)
- [ ] Plan + Report + Owner Smoke Sign-off docs written
- [ ] PRD.md changelog updated
