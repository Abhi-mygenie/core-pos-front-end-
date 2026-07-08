# CR Registry Refs Sync 001 — Report

**Doc:** CR_REFS_SYNC_001_REPORT_2026_05_30.md
**Date:** 2026-05-30
**Audit revision:** v2.7_2026_05_30

---

## 1. Aggregate outcome

| Metric | Before | After |
|---|---:|---:|
| CRs with `artifact_refs` populated | 3/54 | **54/54** |
| CRs with `completeness` field | 3 | **54** |
| CRs with `category` field | 0 | **54** |
| CR Registry tab — rich linkable panel | 3 CRs | **all 54** |
| CR Registry tab badge | `54` | **`27 / 54`** (active / total) |
| CRs auto-promoted to `SHIPPED + VERIFIED` | 0 | **0** (conservative rule — IMPLEMENTED-family CRs lack smoke today) |
| Closure Debt CSV rows | 63 | **98** (+35 new CR rows) |
| Closure Debt Active count | 18 | **49** (newly-tracked CRs surface as needing artifacts) |
| Closure Debt Archived | 45 | **49** (some CRs already 7/7) |
| Closure Debt RESOLVED severity | 26 | **49** |

## 2. UI mapping (Q5=a accepted)

| Category | Statuses included | Active count |
|---|---|---:|
| NOT_STARTED | NOT STARTED, INTAKE, REGISTERED, REGISTERED-NOT STARTED, NOT_FORMALIZED | 8 |
| IN_PROGRESS | PLANNING COMPLETE, INVESTIGATION COMPLETE, CODE-COMPLETE, PARTIAL, PARTIALLY IMPLEMENTED, NEEDS_OWNER_DECISION, OWNER SCOPE NEEDED | 11 |
| BLOCKED | BACKEND-BLOCKED, CRM-BLOCKED | 8 |
| SHIPPED | SHIPPED, SHIPPED + VERIFIED, IMPLEMENTED (and QA-passed variants), CLOSED — IMPLEMENTED, CLOSED — OWNER VERIFIED | 23 |
| SUBSUMED | SUBSUMED into CR-002 | 3 |
| PARKED | PARKED | 1 |

## 3. Auto-promotion (Q1=a Conservative) — no promotions this run

The conservative rule only promotes CRs whose current status is in
`{IMPLEMENTED, IMPLEMENTED + QA PASSED, CODE-COMPLETE, PLANNING COMPLETE, CLOSED — IMPLEMENTED, SHIPPED, SMOKE PENDING}` AND that reach 7/7 with smoke present.

Today, the IMPLEMENTED-family CRs (e.g., POS2-003 at 4/7, POS2-005 at 5/7) all
have Smoke Sign-off MISSING. So no CR meets both gates yet. They surface as
Active Closure Debt awaiting smoke verification — exactly the right behavior.

## 4. Dashboard changes

| Tab | Change |
|---|---|
| **CR Registry** | New headline strip (Active/Shipped/All-time); clickable category stat cards (NOT_STARTED, IN_PROGRESS, BLOCKED, SHIPPED, SUBSUMED, PARKED); sprint summary kept below; tab badge shows `active/total`; row-detail already renders `<ArtifactRefsSection refs={cr.artifact_refs}/>` (wire was already there, just had no data) |
| **Closure Debt** | 35 new rows for previously-untracked CRs → Active jumped 18 → 49 (expected — surface unverified CRs honestly). Cross-references widget now links CRs to their closure-debt entry. |
| **Bug Tracker** | No regression — same as before |

## 5. Files

### NEW
```
/app/memory/control/sessions/SESSION_START_2026_05_30_CR_REGISTRY_REFS_SYNC.md
/app/memory/memory/change_requests/CR_REFS_SYNC_001_PLAN_2026_05_30.md
/app/memory/memory/change_requests/CR_REFS_SYNC_001_REPORT_2026_05_30.md
/app/memory/memory/CR_REFS_SYNC_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md
/app/scripts/cleanup_cr_to_csv_2026_05_30.py
```

### MODIFIED
```
/app/scripts/reaudit_closure_debt.py          (+ patch_cr_registry, CR status mapping, CR auto-promote rule, wired into main)
/app/frontend/public/__dev/dashboard.js       (CR tab headline + 6 category stat cards + tab badge math)
/app/memory/control/CLOSURE_DEBT_BURNDOWN.csv (+35 new CR rows; total 98)
/app/memory/control/CONTROL_DASHBOARD.md
/app/memory/PRD.md
```

### AUTO-REGENERATED
```
/app/frontend/public/__dev/data/cr_registry.json     (schema_version=2.7; 54/54 CRs with artifact_refs)
/app/frontend/public/__dev/data/closure_debt.json    (98 items; 49 active / 49 archived)
/app/frontend/public/__dev/data/bug_tracker.json     (no changes intended — verified no regression)
```

## 6. Verification — sample CR (POS2-003)

Screenshot taken 2026-05-30 showing:
- POS2-003 detail panel
- Closure Debt MEDIUM · 3/6 missing · 1.0h to close
- ARTIFACT REFERENCES (4/7): Impact Analysis ✓ (3 docs), Implementation Plan ✓ (1 doc), Implementation Summary ✓ — Intake/CodeGate/Smoke missing
- Action: Write Intake + Code Gate + Owner Smoke Sign-off

Identical UX to Bug Tracker → goal achieved.

---
*— End of CR Refs Sync Report —*
