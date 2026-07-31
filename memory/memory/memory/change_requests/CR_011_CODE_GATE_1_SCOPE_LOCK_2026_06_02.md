# CR-011 Code Gate 1 — Scope Lock (Artifact 4a)

**CR:** CR-011 — Complete Reports Module
**Phase:** Phase 1 (S0–S4)
**Date:** 2026-06-02
**Author:** Main agent (E1)
**Status:** DRAFT — awaiting owner GO
**Companion:** `CR_011_CODE_GATE_1_IMPLEMENTATION_PLAN_2026_06_02.md` (Artifact 3a)

---

## 0. What is this?

The Code Gate (Artifact 4 in the 7-artifact closure model) is a **diff-preview / scope-lock** written BEFORE code is changed. It proves the change was scoped against the real code surface, not improvised.

Per `CODE_GATE_POLICY.md §3`: "No implementation may begin until artifacts 0–4 exist and the owner gives GO."

---

## 1. Code Gate 1 verdict: ZERO CODE CHANGES

After auditing all 5 Phase 1 screens against the 17-item acceptance checklist in `CR_011_LOADING_AND_INTERACTION_SPEC.md §5`, the conclusion is:

**All screens are already compliant. No code retrofit is needed.**

This is because:
- The `useReportFetch` hook and `ReportLoadingShield` component were built and integrated into S0 and S2 during the API wiring phase (pre-Code-Gate), satisfying the spec's §3 primitives requirement.
- The Apply button, 2-month max range, FY disabled, and calendar min/max constraints were added to S0 and S2 during the same session.
- S1 has no data fetch (sidebar/navigation shell) — trivially compliant.
- S3 is a presentation-only overlay (receives data from S2 props) — no own fetch, no date controls.
- S4 is a visual demo template — not a production report screen.

---

## 2. Scope lock — file-by-file

### Files that WILL be changed
None.

### Files that WILL NOT be changed (scope boundary)

| File | Reason for no-change |
|---|---|
| `/app/frontend/src/pages/reports-module/DashboardMockup.jsx` | ✅ FROZEN. Already uses useReportFetch + ReportLoadingShield + Apply + 2mo max. All 17 §5 items pass. |
| `/app/frontend/src/pages/reports-module/ItemSalesMockup.jsx` | ✅ FROZEN. Already uses useReportFetch + ReportLoadingShield + Apply + 2mo max + all controls disabled. All 17 §5 items pass. |
| `/app/frontend/src/pages/reports-module/ItemDrillSheet.jsx` | ✅ FROZEN. Presentation-only; data via props. §5 items N/A. Row-click gate via S2 shield. |
| `/app/frontend/src/pages/reports-module/EdgeStatesMockup.jsx` | ✅ FROZEN. Demo template. §5 items N/A. |
| `/app/frontend/src/components/reports/ReportLoadingShield.jsx` | Primitive. Working. No changes. |
| `/app/frontend/src/components/reports/useReportFetch.js` | Primitive. Working. No changes. |
| `/app/frontend/src/components/layout/Sidebar.jsx` | S1 shell. No data fetch. No changes. |
| `/app/frontend/src/api/services/insightsService.js` | Service layer. Working. No changes. |

---

## 3. Compliance matrix

| §5 Checklist Item | S0 | S1 | S2 | S3 | S4 |
|---|---|---|---|---|---|
| 1. useReportFetch | ✅ | N/A | ✅ | N/A | N/A |
| 2. ReportLoadingShield | ✅ | N/A | ✅ | N/A | N/A |
| 3. §2 controls disabled | ✅ | N/A | ✅ | N/A | N/A |
| 4. First-load splash | ✅ | N/A | ✅ | N/A | N/A |
| 5. Re-fetch ghost + bar | ✅ | N/A | ✅ | N/A | N/A |
| 6. AbortController | ✅ | N/A | ✅ | N/A | N/A |
| 7. Error retry CTA | ✅ | N/A | ✅ | N/A | N/A |
| 8. Empty ≠ loading | ✅ | N/A | ✅ | N/A | N/A |
| 9. No console warnings | ✅ | N/A | ✅ | N/A | N/A |
| 10. aria-busy | ✅ | N/A | ✅ | N/A | N/A |
| 11. Apply button | ✅ | N/A | ✅ | N/A | N/A |
| 12. Apply disabled rules | ✅ | N/A | ✅ | N/A | N/A |
| 13. Orange border on dirty | ✅ | N/A | ✅ | N/A | N/A |
| 14. Red + "Max 2 months" | ✅ | N/A | ✅ | N/A | N/A |
| 15. Presets auto-apply | ✅ | N/A | ✅ | N/A | N/A |
| 16. FY disabled | ✅ | N/A | ✅ | N/A | N/A |
| 17. Calendar min/max | ✅ | N/A | ✅ | N/A | N/A |

**Legend:** ✅ = passes | N/A = not applicable (no data fetch / not a report screen)

---

## 4. Risk assessment

| Risk | Mitigation |
|---|---|
| S3 opens while S2 is loading | Row click is inside ReportLoadingShield → pointer-events-none blocks the click. Verified in code (S2 L576 shield wraps the table, S3 rendered at L760 outside shield but can only be triggered from inside). |
| S4 doesn't use actual primitives | S4 is a demo template, not a production screen. It visually demonstrates the states that the real primitives implement. No production risk. |
| Sort headers lack explicit disabled attr | `<th>` elements don't support `disabled`. They sit inside ReportLoadingShield which applies `pointer-events-none`. This is the designed mechanism per §2/§3. |
| Filter chip X buttons lack disabled attr | Inside ReportLoadingShield → pointer-events-none. Same reasoning. |

---

## 5. What happens on owner GO

1. Code Gate 1 is marked **PASSED** (no code changes, compliance audit only).
2. Control layer docs updated:
   - `CR_011_SCREEN_FREEZE_LOG.md` — annotate Code Gate 1 compliance on all 5 screens
   - `SPRINT_STATUS.md` — "Code Gate 1: PASSED 2026-06-02"
   - `CONTROL_DASHBOARD.md` — update top blocker
3. Phase 2 Screen Freeze begins (S5–S10), starting with **S5 Item Sales Hybrid** mockup.

---

## 6. What happens if owner says NO

If any §5 item is disputed or a gap is found:
1. Specific screen is flagged.
2. If the screen is FROZEN, the re-open protocol (§8 of Screen Freeze Protocol) is triggered.
3. Implementation Plan is revised with the specific fixes.
4. A new Code Gate scope lock is produced.

---

*This scope lock is valid only for Phase 1 Code Gate 1. Phases 2–4 will have their own Code Gate scope locks.*
