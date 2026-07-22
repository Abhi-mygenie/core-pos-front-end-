# Subsumed Backlog Owner Attestation 001 — Report

**Doc:** SUBSUMED_BACKLOG_001_REPORT_2026_05_30.md
**Date:** 2026-05-30
**Audit revision:** v2.9_2026_05_30
**Status:** DELIVERED

---

## 1. Aggregate outcome

| Metric | Before | After |
|---|---:|---:|
| Bug Tracker rows with status `INTAKE` (excl. 040/041/044/085) | 8 | **0** |
| Bugs in `true_intake_or_blocked` section | 10 | **4** (040, 041, 044, 085 — out of scope) |
| Bugs in `production_hotfixes` with INTAKE | 1 | **0** |
| Bugs in `intake_only_bugs` (duplicates of target 8) | 7 | **0** |
| Bugs in `older_closed_or_partial` | 28 | **36** (+8 newly-subsumed) |
| Unique bug IDs tracked | 118 | **118** (no change — only section + status moved) |
| Subsumed-owner-attested docs detected by scanner | 0 | **17** (1 master + 16 per-bug × 2 stubs) |

## 2. What was delivered

### NEW files
```
SESSION_START_2026_05_30_SUBSUMED_BACKLOG_ATTESTATION.md
SUBSUMED_BACKLOG_OWNER_ATTESTATION_2026_05_30.md          (master registry, /app/memory/control/)
SUBSUMED_BACKLOG_001_PLAN_2026_05_30.md
SUBSUMED_BACKLOG_001_REPORT_2026_05_30.md                  (this file)
SUBSUMED_BACKLOG_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md
/app/memory/memory/bugs/intake/<BUG_ID>_INTAKE_2026_05_30.md × 8
/app/memory/memory/bugs/subsumed/<BUG_ID>_SUBSUMED_OWNER_ATTESTATION_2026_05_30.md × 8
/app/scripts/move_subsumed_bugs.py                         (one-shot mover; idempotent)
```

### MODIFIED
```
/app/scripts/reaudit_closure_debt.py                       (scanner v2.9 — SUBSUMED_RX + subsumed_paths set + subsumed_owner_attested flag on refs; first-match SLOT_RULES entry for SUBSUMED → smoke_signoff)
/app/frontend/public/__dev/dashboard.js                    (amber SUBSUMED pill on bug-row STATUS cell + Subsumption Attestation card in detail view + "subsumed · owner-attested" label on artifact rows)
/app/memory/control/CONTROL_DASHBOARD.md                   (v2.9 row)
/app/memory/PRD.md                                         (v2.9 changelog entry)
```

### REGENERATED
```
/app/frontend/public/__dev/data/bug_tracker.json           (8 bugs moved, new subsumed_meta + artifact_refs; 7 duplicate rows removed from intake_only_bugs)
/app/frontend/public/__dev/data/closure_debt.json          (audit_revision=v2.9; data unchanged — these 8 bugs were never in CSV)
/app/frontend/public/__dev/data/cr_registry.json           (regenerated; CR side unchanged in this batch)
```

## 3. Per-bug result table

| ID | Old section | Old status | New section | New status | Completeness | Subsumed pill | Refs incl. SUBSUMED |
|---|---|---|---|---|---|---|---|
| BUG-014 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |
| BUG-015 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 4/7 | ✅ | impact, intake, plan, smoke_signoff |
| BUG-020 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |
| BUG-021 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 5/7 | ✅ | impact, impl_summary, intake, plan, smoke_signoff |
| BUG-022 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |
| BUG-026 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |
| BUG-027 | true_intake_or_blocked + intake_only_bugs | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |
| PROD-006 | production_hotfixes | INTAKE | older_closed_or_partial | CLOSED — SUBSUMED (owner-attested) | 2/7 | ✅ | intake, smoke_signoff |

> Note: BUG-015 and BUG-021 land at 4/7 and 5/7 because earlier sessions had already filed Impact / Plan / Impl Summary docs against those IDs. The scanner picked them up automatically — no extra work.

## 4. Visual semantics

| Surface | Pre-rule WAIVED | Premature WAIVED | Subsumed |
|---|---|---|---|
| Status pill | `CLOSED — IMPLEMENTED` / etc. | `IMPLEMENTED` / etc. | `CLOSED — SUBSUMED (owner-attested)` (green) |
| Adjacent badge | none | none | **amber `SUBSUMED` badge with tooltip** |
| Artifact-row label | `WAIVED` | `WAIVED · PREMATURE` | `SUBSUMED · OWNER-ATTESTED` |
| Artifact-row dot | green-W | green-W | green-W |
| Artifact-row tooltip | "WAIVED — owner exception (pre-rule)" | "WAIVED — premature (Code Gate granted before implementation; …)" | "SUBSUMED — owner attestation (subsuming CR unidentified; code grep waived)" |
| Row detail panel | none | none | **dedicated amber Subsumption Attestation card** with attested date, subsuming CR field, registry path |

This deliberately keeps **one visual class** (green-W dot) for "evidence-credited-but-not-implemented" cases — consistent with owner directive on the v2.8 premature batch — but each variant is honest about its provenance via labels + tooltips + the registry doc link.

## 5. Scope adherence (Session Start verification)

Files actually modified vs. Session Start scope-lock declaration → ✅ **MATCH**, zero scope creep.

- ✅ `reaudit_closure_debt.py` (declared)
- ✅ `move_subsumed_bugs.py` (declared as NEW)
- ✅ `dashboard.js` (declared)
- ✅ `bug_tracker.json` (declared as regenerated)
- ✅ `closure_debt.json`, `cr_registry.json` (declared as regenerated)
- ✅ 8 intake + 8 subsumed stubs (declared)
- ✅ master registry doc (declared)
- ✅ Plan / Report / Owner Smoke Sign-off (declared)
- ✅ CONTROL_DASHBOARD.md + PRD.md (declared)

Files NOT touched (also verified):
- ✅ `/app/frontend/src/**`
- ✅ `/app/memory/final/**`
- ✅ `/app/memory/control/BUG_TRACKER.md` (markdown twin left for separate sync if owner asks)
- ✅ CR Registry rows (Q1=a — bug-side only)
- ✅ BUG-040, BUG-041 (explicitly preserved as still-open INTAKE)

## 6. Regression checks

| Check | Result |
|---|---|
| Scanner exit 0 | ✅ |
| Pre-rule WAIVED rendering (BUG-088 control row) | ✅ unchanged — still pre-rule tooltip, no premature suffix |
| Premature WAIVED rendering (POS 2.0 CR control row) | ✅ unchanged — still premature tooltip + suffix |
| Bug Tracker total unique IDs | 118 → 118 (✅ no leak/loss) |
| `intake_only_bugs` section duplicates of target 8 | 7 → 0 (✅ cleanup applied) |
| Frontend supervisor status | ✅ RUNNING |
| Lint dashboard.js | ✅ no issues |

## 7. Open items left behind (intentionally)

- 🔴 BUG-040, BUG-041 — genuinely still open in pos_final_1.0. Out of scope.
- 🟡 Pre-existing duplicate rows for BUG-040/041/044/085 across `true_intake_or_blocked` and `intake_only_bugs` (separate cleanup batch).
- 🟡 25 active CR Registry rows — owner deferred (Q1=a). Available for a future "Subsumed Backlog 002" batch.
- 🟡 6-slot CSV vs 7-slot JSON discrepancy (tracked but not fixed).

---
*Closed by: Implementation Agent (E1 fork), 2026-05-30.*
