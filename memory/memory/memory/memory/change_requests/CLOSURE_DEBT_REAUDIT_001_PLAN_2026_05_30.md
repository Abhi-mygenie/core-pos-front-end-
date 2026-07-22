# Closure Debt Re-Audit (v2) — Plan

**Doc:** CLOSURE_DEBT_REAUDIT_001_PLAN_2026_05_30.md
**Date:** 2026-05-30
**Owner approval:** GO received 2026-05-30
**Session:** SESSION_START_2026_05_30_CLOSURE_DEBT_REAUDIT.md

---

## 1. Problem statement

The owner inspected the Dev Dashboard and flagged that POS 3.0 bugs (BUG-087, 088, 089, 098, 099, 100, 102, 103) — all SHIPPED + VERIFIED — were displaying "6/6 missing — CRITICAL", which is implausible for closed/shipped items.

Spot-grep of `/app/memory/memory/change_requests/final_sprint_reconciliation/` revealed an entire family of POS3_0 Bucket/Wave/Complete-Sprint docs that the v1 audit had skipped.

## 2. Root cause of the v1 audit

The v1 audit (run 2026-05-29) classified docs by filename containing a per-bug pattern (`BUG_087_*`, etc.). It ignored:

- **Bucket-level rollup docs** that cover several bugs in one file (`POS3_0_BUCKET_A_OWNER_APPROVAL_PLAN_2026_05_18.md` covers BUG-089/100/102/103).
- **Wave-level docs** (`POS3_0_CR_WAVE_1_*`).
- **Complete-sprint reports** (`POS3_0_COMPLETE_SPRINT_IMPLEMENTATION_REPORT_2026_05_19.md` covers BUG-087, BUG-088 with file-register and 4-batch breakdowns).
- **Status reconciliation docs** that explicitly list "Implemented + owner-confirmed" bugs — these are legitimate Owner Smoke Sign-off equivalents.

## 3. Methodology (v2)

A doc qualifies as an artifact carrier for a bug if BOTH:
(a) The bug ID is referenced in the doc's filename OR body, **and**
(b) The doc's filename matches one of the 6 artifact-slot regex patterns (see SESSION_START doc §3).

Multi-bug rollup docs count for every bug they mention.

## 4. Scanner implementation

See `/app/scripts/reaudit_closure_debt.py`.

- Walks `/app/memory/**/*.md` (skips `BUG_TEMPLATE*` mega-files).
- Extracts bug IDs via `\b(BUG[-_]?0?\d{2,3}|CR[-_]?0?\d{2,3}|POS[23][-_]\d{3,})\b` regex.
- Classifies each doc by filename pattern, in priority order: A4 (Code Gate) → A6 (Smoke Sign-off) → A5 (Impl/QA) → A2 (Impact) → A3 (Plan) → A1 (Intake).
- Builds `{ bug_id: { slot: [paths] } }` evidence dict.
- Rewrites `CLOSURE_DEBT_BURNDOWN.csv`:
  - For each row, upgrade `art_N` from `MISSING` → `PRESENT` if evidence found.
  - **Never downgrade**: if v1 said `PRESENT`, keep `PRESENT`.
  - Recompute `missing_count`, `severity`, `existing_docs_path` (top-5 dedup paths), `recommended_action`.
  - Add `audit_revision=v2_2026_05_30` column.
- Regenerates `closure_debt.json` for the Dev Dashboard with the new evidence.

## 5. Safety guarantees

1. **Read-only on source docs** — the script only reads `/app/memory/**/*.md`; it never modifies them.
2. **Never downgrade** — if v1 marked an artifact PRESENT/PARTIAL, v2 preserves that classification.
3. **Reproducible** — the script can be re-run anytime; output is deterministic.
4. **Auditable** — produces `CLOSURE_DEBT_REAUDIT_001_DELTA_2026_05_30.json` capturing every per-row change.

## 6. Expected outcome

Before re-audit (v1, 2026-05-29):
- CRITICAL: 17+ items (6/6 missing each)
- Implausible: 8 SHIPPED + VERIFIED POS 3.0 bugs in CRITICAL

After re-audit (v2):
- CRITICAL drops to genuinely under-documented items only.
- POS 3.0 SHIPPED bugs should drop to MEDIUM or LOW (most missing only A1 Intake).
- Total documentation debt effort estimate reduced substantially.

## 7. Acceptance criteria

- [x] Script produced and runs cleanly.
- [x] CSV `audit_revision` column added.
- [x] Dashboard JSON regenerated.
- [x] Per-bug evidence paths present in `existing_docs_path` for every upgraded row.
- [x] Delta JSON file written for owner review.
- [ ] Owner sign-off via inspection of Dev Dashboard.
