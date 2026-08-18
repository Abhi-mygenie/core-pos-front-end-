# Code Gate Premature Waiver Registry — 2026-05-30

**Document:** CODE_GATE_PREMATURE_WAIVER_REGISTRY_2026_05_30.md
**Created:** 2026-05-30
**Authority:** Owner directive — 2026-05-30 ("Active CR Compliance" GO)
**Scope:** Pre-Implementation Code Gate (Artifact #4) waiver for active CRs where code has NOT YET been written.

---

## 1. Rationale (distinct from pre-rule waiver)

The existing `CODE_GATE_WAIVER_REGISTRY_2026_05_30.md` covers bugs closed BEFORE 2026-05-18 (rule-introduction cutoff). This registry covers a different case: **active CRs after the rule was in place, but no code has been written yet** — so Code Gate is genuinely **premature**, not "missing".

A Code Gate doc captures the proposed code-diff BEFORE implementation. For:
- NOT_STARTED CRs → no implementation planned yet → premature
- BLOCKED CRs (BACKEND/CRM) → waiting on external party → premature
- IN_PROGRESS CRs at INVESTIGATION/PLANNING stage → impl not begun → premature
- IN_PROGRESS CRs at CODE-COMPLETE without dedicated CG doc → could backfill but owner accepts waiver

This waiver **auto-revokes** when real Code Gate doc appears (scanner detects `*_CODE_DIFF_PREVIEW_*.md` and prefers it over the premature stub).

## 2. Waived CRs (22)

| ID | Sprint | Status | Reason |
|---|---|---|---|
| POS2-001              | POS 2.0 | NOT STARTED              | Implementation not yet planned |
| POS2-005-FU §B        | POS 2.0 | INVESTIGATION COMPLETE   | Investigation phase, not yet coded |
| POS2-006              | POS 2.0 | INVESTIGATION COMPLETE   | Investigation phase |
| POS2-008 Phase 2      | POS 2.0 | PLANNING COMPLETE        | Planning phase, awaiting backend |
| BUG-096               | POS 3.0 | PARTIALLY IMPLEMENTED    | Partial — awaiting next iteration |
| BUG-104               | POS 3.0 | OWNER SCOPE NEEDED       | Scope not yet defined |
| BUG-105               | POS 3.0 | OWNER SCOPE NEEDED       | Scope not yet defined |
| BUG-108               | POS 3.0 | PARTIAL                  | Partial — awaiting next iteration |
| CR-005                | CRM 2.0 | NOT_STARTED              | Future-state CR |
| CR-009                | CRM 2.0 | NOT_FORMALIZED           | Not formalized yet |
| Order Activity Log    | STANDALONE | REGISTERED, NOT STARTED | Not yet started |
| PROD-HOTFIX-006       | STANDALONE | INTAKE                  | Intake phase |
| UX-LOADING-02         | PHASE 3 | NEEDS_OWNER_DECISION     | Decision pending |
| CR-002                | CRM 2.0 | CODE-COMPLETE            | Code complete pre-CG-rule for CRM 2.0 wave |
| BUG-090               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-091               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-092               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-093               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-094               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-101               | POS 3.0 | BACKEND-BLOCKED          | Blocked — backend dep |
| BUG-106               | POS 3.0 | CRM-BLOCKED              | Blocked — CRM dep |
| BUG-107               | POS 3.0 | CRM-BLOCKED              | Blocked — CRM dep |

## 3. UI representation

The Dev Dashboard renders waived Code Gate artifacts with the **green dot + white "W" overlay** (same as pre-rule waivers per owner directive Q=a). Tooltip text distinguishes them:
- Pre-rule: *"WAIVED — owner exception (pre-rule)"*
- Premature: *"WAIVED — premature (active work — Code Gate not yet applicable)"*

## 4. Per-CR symbolic stubs

Each waived CR has a 3-line symbolic stub at:
`/app/memory/memory/crs/code_gate_premature/<CR_ID>_CG_PREMATURE.md`

Scanner regex: `*_CG_PREMATURE.md` → classified as `code_gate` slot with `waived: true` and `waived_premature: true`.

## 5. Auto-revoke condition

This waiver is **automatic** — scanner re-runs evaluate all docs on disk. If a real `*_CODE_DIFF_PREVIEW_*.md` for the CR appears, it takes precedence (CSV column `art4_code_gate` flips from `WAIVED` to `PRESENT`).

## 6. Signature

| Field | Value |
|---|---|
| Authority | Owner verbal GO 2026-05-30 ("Active CR Compliance") |
| Registry author | E1 (fork agent) |
| Audit revision | v2.8_2026_05_30 |
| Effective | 2026-05-30 onwards |
| Auto-revoke | YES — on real CG doc appearance |
