# POS4-QA-001 — QA Backfill Closure Report

**Date:** 2026-05-31
**Phase:** POS4-QA-001 (QA Backfill)
**Result:** ✅ DONE — `closure_debt.json.active_count` 19 → **0**; `gen_dashboard_data.js --check` clean.

## What was done
1. **Generator change (`scripts/gen_dashboard_data.js`):** `art5_impl_summary_qa` is now **derived
   from `registry.json`** — an item's QA is PRESENT when its registry entry carries a non-waived
   `qa_report` artifact_ref (legacy PRESENT rows preserved → no regressions). This makes
   `registry.json` the single source of truth for QA status (approach 1a).
2. **QA evidence (approach 2b):** one consolidated artifact
   `control/POS4_QA_001_QA_BACKFILL_EVIDENCE_2026_05_31.md` with a per-item Impl-Summary + QA-Report
   section (anchored) for all 19 items.
3. **`registry.json` edits (source of truth):**
   - Added `impl_summary` + `qa_report` refs (→ the evidence doc anchors) to the 17 existing items.
   - Added 2 new `production_hotfixes` entries (`PROD-HOTFIX-004`, `PROD-HOTFIX-005`) which had no
     registry record (distinct from existing `PROD-004/005`).
4. **Regenerated** all 3 derived JSONs and ran `--check`.

## Verification
- `--check`: `OK: cr_registry.json` / `OK: bug_tracker.json` / `OK: closure_debt.json` — no drift.
- `closure_debt.json`: `active_count = 0`, `qa_satisfied = 30`, `pos4_excluded = 2`.
- All 19 brief items: `art5_impl_summary_qa = "PRESENT"`, `active_debt = false`.
- Only non-PRESENT rows are the 2 POS 4.0 deferred items (`POS2-001`, `POS2-008 Phase 2`) — excluded by design.
- `/__dev` dashboard confirms Closure Debt badge = 0 / ACTIVE DEBT 0 / "No rows match".

## Notes / no hand-editing
- Derived data files (`closure_debt.json`, `bug_tracker.json`, `cr_registry.json`) were **never
  hand-edited** — only generated. All content changes were made in `registry.json` + the evidence doc.
- Side effect of adding 2 registry items: Bug Tracker total moved to 121 (110 closed); CR Registry
  active = 2. Consistent and `--check`-clean.
- To re-verify at any time: `node scripts/gen_dashboard_data.js --check`.
