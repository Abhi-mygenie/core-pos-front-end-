# Phase 3 Change Requests — Registry

**Folder purpose:** Hold all Phase 3 CR planning, impact analysis, implementation, and QA artefacts.

**Phase 3 scope:** UX / quality-of-life improvements + small targeted enhancements discovered *after* the 2026-05-04 sprint closure. Phase 3 CRs are **new-feature / behavior-change work**, distinct from the hygiene backlog which covers doc drift, lint warnings, and cosmetic parity.

**Differentiators from earlier phases:**
| Phase | Focus | Gated by |
|---|---|---|
| Sprint (Apr-May 2026) | CR-001 through CR-008 + A0a/A0b | Owner acceptance + runtime addenda |
| Hygiene 9-item (Batch 1/2/3) | Doc drift, lint, cosmetic A0a siblings, CR-001 exports alignment, test-infra wiring | Non-blocking backlog |
| **Phase 3 (this folder)** | **New UX / QoL CRs opened post-sprint** | **Owner prioritisation per CR** |

---

## Active Phase 3 CRs

| CR ID | Title | Status | Doc path |
|---|---|---|---|
| **UX-LOADING-02** | **Parallel API loading + Visible station-load progress** on LoadingPage (both concerns: sequential→parallel main APIs, and silent Phase 2 → visible progress) | `needs_owner_decision` — plan ready; awaiting Concern A pick (A1/A2/A3) + Concern B pick (B1/B2/B3) + go | `UX_LOADING_02_VISIBLE_STATION_PROGRESS.md` |

---

## Phase 3 working rules

1. **One CR = one folder-level doc minimum** (plan / impact-analysis). QA report + implementation summary added as they land.
2. **Do not unpark** any Phase 1/2 parked item (A3, A4, B3, B4, B2 Phase 2, CR-002, CR-008 Sub-CR #3 / Phase B, CR-009..CR-013) under Phase 3 guise.
3. **Do not touch** any backend contract (BE-1..BE-F). Phase 3 is frontend-only unless an explicit BE ask is raised and parked.
4. **Do not modify** `/app/memory/final/*` unless the Phase 3 CR was explicitly scoped for a baseline-doc update and owner signed off.
5. **Each Phase 3 CR needs its own owner go/no-go** before planning, before implementation, and before QA. Mirror the Batch 1/2/3A approval-gated pattern.
6. **Cross-phase impact:** if a Phase 3 CR touches a Phase 1/2 accepted sprint behaviour (e.g. CR-001 status derivation, CR-007 A2 merge/shift), flag it in the plan's `baseline impact` section and require explicit owner waiver.

---

## Tracker pointers

- Sprint exit: `../FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- Baseline: `../../final/*.md` (never edit without owner approval)
- Hygiene 9-item plan: `../impact_analysis/COMBINED_HYGIENE_9_ITEMS_IMPLEMENTATION_PLAN.md`
- Pending task register: `../PENDING_TASK_REGISTER_2026_05_04.md`
- QA index (shared across phases): `../qa_reports/QA_REPORT_INDEX.md`

---

**Folder created:** 2026-05-04 alongside Batch 3A kickoff.
**Owner:** — to be assigned per CR.
