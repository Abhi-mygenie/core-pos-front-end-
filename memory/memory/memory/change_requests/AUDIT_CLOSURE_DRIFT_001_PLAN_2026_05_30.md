# AUDIT-CLOSURE-DRIFT-001 — Implementation Plan

**Document:** `AUDIT_CLOSURE_DRIFT_001_PLAN_2026_05_30.md`
**Date:** 2026-05-30
**Stage:** Stage 5 — Plan (Phase A read-only proceeds without gate; Phases B–D await Gate G-1)
**Trigger:** Owner spotted BUG-038..074 showing INTAKE in dashboard while many had shipped during POS 2.0 / pos_final_1.0 sprints.

---

## 1. Problem Statement

Two layers of closure-drift discovered:

**Layer 1 — Stale tracker:** `BUG_TEMPLATE.md` (the older intake-level bug log) was never updated when POS 2.0 / pos_final_1.0 sprints closed. It still shows BUG-038..074 as `Open — Intake Created · Not Started`. Reality (per `POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md` and `/memory/bugs/BUG_0XX_SMOKE_SIGNOFF.md` files): **at least 32 of these 37 bugs are properly closed with full 6-artifact paperwork**.

**Layer 2 — Inherited staleness:** On 2026-05-29, a new control-layer `BUG_TRACKER.md` was built by bulk-copying from the stale `BUG_TEMPLATE.md`. That staleness then propagated to the dashboard's `bug_tracker.json`.

**Layer 3 — Missing artifact provenance:** Even for items that ARE properly closed, the dashboard doesn't show *which doc proves the closure*. Owner has requested an "Artifact Reference" column so each closed row links to the artifact (smoke sign-off / impl report / etc.) that justifies its status.

---

## 2. Frozen Owner Decisions (this session)

| # | Decision |
|---|---|
| D1 | Phase A is read-only — produces a reconciliation table for review |
| D2 | Phases B-D are doc-only — no code changes to existing app |
| D3 | Add an "Artifact References" data field (per bug & per CR) showing the proof doc(s) for that item's status |
| D4 | Display Artifact References in the dashboard detail panel (already-open scope of `/__dev/dashboard.js`) |
| D5 | Stale `BUG_TEMPLATE.md` is NOT to be content-edited — only marked superseded for BUG-038..086 via a single header banner pointing to the canonical sprint summary docs |

---

## 3. Files in scope

### Phase A (read-only)
- READS: `BUG_TEMPLATE.md`, `BUG_TRACKER.md`, `POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md`, `BUG_CODE_VALIDATED_CONSOLIDATION_REPORT_2026_05_12.md`, `/memory/bugs/*.md`, `/memory/change_requests/final_sprint_reconciliation/*.md`
- WRITES: `/app/memory/memory/change_requests/AUDIT_CLOSURE_DRIFT_001_PHASE_A_RECONCILIATION_2026_05_30.md`

### Phases B-D (after Gate G-1)
- `/app/memory/control/BUG_TRACKER.md` (reconcile + add artifact_refs column)
- `/app/memory/memory/BUG_TEMPLATE.md` (single-banner addition only)
- `/app/frontend/public/__dev/data/bug_tracker.json` (regenerate from reconciled tracker)
- `/app/frontend/public/__dev/data/closure_debt.json` (refresh + add artifact_refs to existing items)
- `/app/frontend/public/__dev/dashboard.js` (render Artifact References section in detail panels)
- `/app/frontend/public/__dev/styles.css` (minimal additions if needed)
- `/app/frontend/public/__dev/README.md` (v1.2 note)

### Will NOT touch
- `/app/frontend/src/**`, `App.js`, `package.json`, `craco.config.js`, `.env`
- The actual implementation code behind any reconciled bug
- The per-bug content blocks inside `BUG_TEMPLATE.md`
- `/memory/final/**`, `/memory/crm/crm_1_0/**`

---

## 4. Phases

### Phase A — Reconciliation (read-only, ~30 min)
Produces a single reconciliation table covering every bug in `BUG_TEMPLATE.md` and every CR mentioned in the canonical sprint summaries, with columns:

| Col | Meaning |
|---|---|
| `id` | Bug/CR ID |
| `title` | From canonical doc |
| `sprint` | Original sprint (pos_final_1.0 / POS2.0 / POS3.0 / POS3.1 / CRM2.0 / Standalone) |
| `tracker_status` | What `BUG_TEMPLATE.md` / `BUG_TRACKER.md` claims today |
| `canonical_status` | What sprint final summary + smoke sign-offs say |
| `drift` | YES (tracker disagrees) / NO (tracker accurate) / N/A (no canonical doc) |
| `artifact_refs` | List of doc paths backing the canonical_status |
| `closure_completeness` | 1/6…6/6 based on which artifacts exist |
| `recommended_action` | UPDATE TRACKER / KEEP AS-IS / BACKFILL ARTIFACTS / OWNER REVIEW |

Output: `AUDIT_CLOSURE_DRIFT_001_PHASE_A_RECONCILIATION_2026_05_30.md`

**Gate G-1: Owner reviews Phase A output before any writes happen.**

### Phase B — Update Control Layer (doc-only, ~30 min, requires G-1 PASS)
1. Add new column `Artifact References` to all sections of `/app/memory/control/BUG_TRACKER.md`
2. Move BUG-038..074 (and any others found drifting) from "Intake Only" to a new section "POS 2.0 — Closed (consolidated 2026-05-18)" + "pos_final_1.0 — Closed (consolidated 2026-05-12)" with their true status and artifact references
3. Add a superseded-banner to top of `/app/memory/memory/BUG_TEMPLATE.md` for BUG-038..086 pointing to the canonical sprint summaries

### Phase C — Update Dashboard (doc + dashboard UI, ~45 min)
1. Regenerate `/__dev/data/bug_tracker.json` with new schema: each entry has `artifact_refs: [{ type, path }]`
2. Update `/__dev/data/closure_debt.json` to add `artifact_refs` field to each item (parsed from existing `existing_docs_path` + reconciled additions)
3. Update `/__dev/dashboard.js`:
   - Add a "📎 Artifact References" section in each detail panel (Closure Debt, Bug Tracker, CR Registry tabs)
   - Render each ref as a `DocPathItem` (copy-path button + short filename)
   - Group refs by type (Intake / Impact / Plan / Code Gate / Impl Summary / QA Report / Smoke Sign-off)

### Phase D — Owner Smoke + Close-out (~15 min)
1. Owner opens dashboard, spot-checks 3-5 reconciled bugs, confirms artifact refs render correctly
2. Owner sign-off doc written: `AUDIT_CLOSURE_DRIFT_001_OWNER_SMOKE_SIGNOFF_2026_05_30.md`
3. Update `CR_REGISTRY.md`, `CONTROL_DASHBOARD.md`, `SPRINT_STATUS.md`, `AGENT_HANDOVER_PROTOCOL.md` per playbook closure

---

## 5. New "Artifact References" Schema

### In each `bug_tracker.json` entry (new field):
```json
{
  "id": "BUG-050",
  "title": "Printed Bill Mismatch After Item Cancellation",
  "status": "CLOSED — IMPLEMENTED",
  "sprint": "POS2.0",
  "wave": "W4",
  "artifact_refs": [
    { "type": "intake",        "path": "memory/BUG_TEMPLATE.md#BUG-050" },
    { "type": "impact",        "path": "memory/change_requests/.../POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md" },
    { "type": "plan",          "path": "memory/change_requests/.../POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md" },
    { "type": "impl_summary",  "path": "memory/change_requests/.../POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md#bug-050" },
    { "type": "qa_report",     "path": "memory/change_requests/.../POS2_0_WAVE_4_QA_HANDOFF_BUG_050_2026_05_17.md" }
  ],
  "closure_completeness": "5/6",
  "missing_artifacts": ["owner_smoke_signoff"]
}
```

### In each `closure_debt.json` item (new field):
Same `artifact_refs` array. The `art1_intake`…`art6_owner_smoke_signoff` enum stays as-is (PRESENT/MISSING/PARTIAL/NA), but now each is backed by concrete doc paths.

### In dashboard UI (new section in each detail panel):
```
📎 Artifact References (5/6)
  ● Intake             →  memory/BUG_TEMPLATE.md#BUG-050        [copy]
  ● Impact             →  POS2_0_MASTER_PLAN_AUDIT_...md         [copy]
  ● Plan               →  POS2_0_MASTER_IMPLEMENTATION_PLAN.md   [copy]
  ○ Code Gate          →  (missing)
  ● Impl Summary       →  POS2_0_FINAL_IMPLEMENTATION_SUMMARY.md [copy]
  ● QA Report          →  POS2_0_WAVE_4_QA_HANDOFF_BUG_050.md    [copy]
  ○ Owner Smoke        →  (missing)
```

---

## 6. Acceptance Criteria

### AC-RC-* (Reconciliation)
| AC | Description |
|---|---|
| AC-RC-1 | Phase A output table contains a row for every bug ID in BUG_TEMPLATE.md (BUG-001..086) |
| AC-RC-2 | Each row has a verified `canonical_status` traceable to a sprint final summary doc OR an explanation when no canonical doc exists |
| AC-RC-3 | Drift detected = YES for BUG-050..074 set (per current investigation) |
| AC-RC-4 | Artifact refs collected for every "CLOSED" claim |

### AC-DB-* (Dashboard)
| AC | Description |
|---|---|
| AC-DB-1 | "📎 Artifact References" section appears in every detail panel where artifact_refs is non-empty |
| AC-DB-2 | Section groups refs by type with labels matching the 6-artifact rule |
| AC-DB-3 | Each ref has a copy-path button (no clickable links — server can't serve `.md` files) |
| AC-DB-4 | Closure Debt items already in dashboard now show real artifact paths instead of "(doc present — path attribution unclear)" |

### AC-REG-* (Regression)
| AC | Description |
|---|---|
| AC-REG-1 | Main app `/` returns HTTP 200 |
| AC-REG-2 | `git status` shows zero modifications to `/app/frontend/src/**` |
| AC-REG-3 | v1.0 + v1.1 features still work (filter / search / group / cross-ref / expand) |
| AC-REG-4 | BUG_TEMPLATE.md per-bug content blocks unchanged (only header banner added) |

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Misattributing a bug's status during reconciliation | M | M | Cross-check against ≥2 canonical docs before changing tracker status |
| Drift exists for items outside BUG-038..074 too | H | L | Phase A scans the full BUG-001..086 range, not just the visible-suspect set |
| Owner disagrees with reconciliation verdict for some items | M | L | Phase A output is REVIEWED before Phase B writes anything |
| Dashboard data schema change breaks v1.1 features | L | M | New `artifact_refs` field is purely additive; v1.1 code ignores unknown fields |
| `BUG_TEMPLATE.md` becomes confusing (two sources of truth) | M | L | Header banner explicitly declares it superseded for BUG-038..086, with pointer to canonical docs |

**Overall: LOW.** Phase A is read-only. Phases B-D are doc-only and additive. Zero code change to existing app.

---

## 8. Gate Ladder

```
PHASE A — Reconciliation (read-only)                     [PROCEEDS AUTO]
  Reads canonical docs, writes Phase A output             [auto]
  
Gate G-1 — OWNER APPROVES PHASE A OUTPUT                  [HOLD]
  Owner reviews drift verdict for each bug
  Owner approves: status mappings, artifact refs

PHASE B — Update Control Layer (doc-only)                 [HOLD until G-1]
PHASE C — Update Dashboard (data + UI)                    [HOLD until G-1]
PHASE D — Owner smoke + close-out                         [HOLD until B+C complete]

Gate G-2 — Owner smoke on dashboard                       [HOLD until Phase C done]
Gate G-3 — Close-out                                      [HOLD until G-2 PASS]
```

---

## 9. Estimated Effort

| Phase | Effort |
|---|---|
| Phase A — Reconciliation (read-only) | 30 min |
| Gate G-1 (owner review) | owner-dependent |
| Phase B — Tracker updates | 30 min |
| Phase C — Dashboard updates | 45 min |
| Phase D — Smoke + close-out | 15 min |
| **Total agent time** | **~2 hours** |

---

## 10. Confirmations

| # | Item | Status |
|---|---|---|
| 1 | Phase A is purely read-only | CONFIRMED |
| 2 | Writes gated by G-1 owner approval | CONFIRMED |
| 3 | Zero touch to `/app/frontend/src/**` | CONFIRMED |
| 4 | BUG_TEMPLATE.md per-bug content blocks untouched | CONFIRMED |
| 5 | Schema change to JSON is purely additive | CONFIRMED |
| 6 | Rulebook (AGENT_PROMPT_ALPHA.md R1–R16) honoured | CONFIRMED |

---

**Stage 5 complete. Proceeding to Phase A read-only execution.**
