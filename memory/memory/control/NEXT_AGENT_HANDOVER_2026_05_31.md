# Next-Agent Handover — Control / Baseline State

**Date:** 2026-05-31
**From:** POS4-QA-001 (QA backfill) + dashboard-derivation + baseline-readiness review
**Source of truth:** `control/registry.json` → regenerate with `node scripts/gen_dashboard_data.js` → verify with `--check`
**Dashboard:** `/__dev/index.html` (read-only, env-gated via `REACT_APP_SHOW_DEV_DASHBOARD`)
**Deploy:** frontend on branch `30-may-qa`, build/run verified (`memory/DEPLOYMENT_HANDOVER.md`)

---

## 1. Current state — all green
| Signal | Value |
|---|---|
| Closure debt `active_count` | **0** (all 19 POS4-QA-001 items `art5: PRESENT`) |
| `gen_dashboard_data.js --check` | **clean** (cr_registry / bug_tracker / closure_debt all match) |
| `completeness` (x/7) + `missing_count` | now **DERIVED** from the `art0–art6` ledger, consistent across all 3 tabs |
| CR Registry | 29 tracked → **2 active** (POS2-001, POS2-008 Phase 2), 18 shipped, 8 subsumed |

What changed this session:
- Backfilled QA (artifact #5) for the 19 closure-debt items → `active_count` 19→0.
- Made `gen_dashboard_data.js` derive `art5`, `completeness`, and `missing_count` from
  `registry.json` / the artifact ledger (no more stale hand-typed numbers). `max(static, derived)`
  rule means legacy rows never regress (BUG-087/050, CR-002 stay 7/7).

---

## 2. Baseline readiness (verified against registry)

### ✅ READY — 4 fully-closed sprints (promote to `memory/final/`)
| Sprint | State |
|---|---|
| **POS 2.0** | 11 CRs + 36 bugs all SHIPPED / CLOSED-VERIFIED; only explicit DEFERRED carve-outs (POS2-006, BUG-064/069/084). QA debt 0. |
| **POS 3.0** | Roster CLEAN — 14 items all closed/verified/subsumed (BUG-087/088/089/095/097/098/099/100/102/103/104/106/107/108). All undone/blocked work was re-tagged to POS 4.0; it does NOT block POS 3.0 closure. |
| **POS 3.1** | BUG-109/110/111 + BUG-111 P1+P2 all closed/verified; backlog empty; QA backfilled. |
| **CRM 2.0** | CR-002 SHIPPED+VERIFIED (7/7); CR-001/003/004/005/006/007/008/009 + BUG-107/108 SUBSUMED (owner-attested). No open items. |

### Separate track (NOT a sprint gap)
- **12 unfrozen business rules** (POS 3.0 era) ride their own 5-step promotion gate:
  code fix (TIP-003, ROUND-001) → verify → owner reconfirm → close bug → dated diff.
  Ref: `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`. Independent of sprint promotion.

### Active / not for baseline
- **POS 4.0** (ACTIVE): 2 CRs (POS2-001 not-started, POS2-008 Phase 2 planning) + intake BUG-040/041
  + the consolidated blocked backlog (BUG-090/091/092/093/094/101/096/105/085, owner-scope, etc.).

---

## 3. Recommended next actions (priority order)

**P0 — Promote the 4 ready sprints into the frozen baseline.**
- Fold POS 2.0 / POS 3.0 / POS 3.1 / CRM 2.0 into `memory/final/` baseline docs.
- Add a dated diff entry to `control/BASELINE_CONSOLIDATION_REPORT_2026_05_31.md`.
- Mark them frozen in `control/BASELINE_INDEX.md`. Owner sign-offs are already linked via
  registry `artifact_refs`.

**P1 — (Optional) Reconcile the art0–art6 ledger for ~5 items** whose docs exist but were
bulk-imported as all-MISSING (so they read low even though work is done):
`DEV-DASHBOARD-001`, `BUG-111 P1+P2`, `Audit Report Optimization`, `Order Activity Log`,
`UX-LOADING-02`. Verify each referenced doc, then mark ONLY the artifacts that genuinely exist as
PRESENT in the closure `art*` fields → they will read 6–7/7. Do NOT fabricate.

**P2 — Advance the business rules** on their separate gate. ✅ TIP-003, ROUND-001 + 10 Part B rules promoted 2026-05-31 (code-verified + owner-reconfirmed); **12 rules remain** (5 Part B parked/blocked + Part C/D).

**P3 — Work the POS 4.0 backlog.** Reminder: **Code-Gate is MANDATORY & non-waivable from POS 4.0
onward** (`CODE_GATE_POLICY.md`) — artifacts 0–4 must exist before any code, no retro waiver.

---

## 4. Hard rules (do not violate)
1. **Never hand-edit** `closure_debt.json` / `bug_tracker.json` / `cr_registry.json`. Edit
   `registry.json` (and, where needed, the closure `art*` fields), then **regenerate**.
2. Always finish a change with:
   `node scripts/gen_dashboard_data.js && node scripts/gen_dashboard_data.js --check`
3. New work from POS 4.0 onward requires a real Code-Gate (no waiver).

---

## 5. Key references
- `control/POS4_QA_001_QA_BACKFILL_EVIDENCE_2026_05_31.md` — 19-item QA evidence (artifact #5).
- `control/POS4_QA_001_QA_BACKFILL_CLOSURE_REPORT_2026_05_31.md` — QA-backfill closure report.
- `control/POS4_QA_001_QA_BACKFILL_BRIEF_2026_05_31.md` — original brief.
- `control/CODE_GATE_POLICY.md` — Code-Gate waiver rules.
- `control/BASELINE_CONSOLIDATION_REPORT_2026_05_31.md` / `control/BASELINE_INDEX.md` — baseline docs.
- `control/SPRINT_STATUS.md` — sprint board (POS 3.0 clean; rules on separate track).
- `change_requests/PHASE_4_CONSOLIDATED_BACKLOG_2026_05_31.md` — full POS 4.0 backlog.
- `memory/DEPLOYMENT_HANDOVER.md` — frontend deploy (branch `30-may-qa`).
