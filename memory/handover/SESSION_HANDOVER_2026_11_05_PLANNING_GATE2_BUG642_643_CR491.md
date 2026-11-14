# SESSION HANDOVER — 2026-11-05 PLANNING Gate 2 (BUG-642, BUG-643, CR-491)

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Session:** IA for 3 items from nov_cr_batch
**Code changed:** NO
**Credentials provided:** owner@palmhouse.com / Qplazm@10

---

## Summary

Completed Gate 2 Impact Analysis for BUG-642, BUG-643, and CR-491. All three are ready for Gate 3 (Implementation Plan). No code changes made.

## Items Analysed

### BUG-642 — PWA no back navigation
- **Root cause:** `manifest.json` `display: standalone` + no global Back button in app shell
- **Fix:** Add Back button to `Sidebar.jsx` (top of sidebar, visible when not on Dashboard)
- **Files:** 1 (Sidebar.jsx) — ~8-10 new lines
- **Risk:** MEDIUM, no conflicts
- **IA:** `impact/BUG-642_IMPACT_ANALYSIS.md`

### BUG-643 — Credit SS3 sheet won't close on X
- **Root cause:** `createPortal(..., document.body)` places SS3 outside Radix Sheet → inherits `pointer-events: none` from body
- **Fix:** Wrap portal content in `<div style={{ pointerEvents: 'auto' }}>` (Option B — minimal, preserves z-stacking)
- **Files:** 1 (CreditCustomerDetailSheet.jsx L714) — ~2 lines
- **Risk:** MEDIUM, no conflicts. **Prerequisite for CR-488.**
- **IA:** `impact/BUG-643_IMPACT_ANALYSIS.md`

### CR-491 — Codebase cleanup
- **Full inventory completed:** 12 demo pages (unprotected routes!), 16 .bak files, 5 raw API paths to move, 2 hardcoded logo URLs, 2 duplicated Google Maps URLs, 38 Mockup files to rename (Wave 2)
- **Wave 1 scope (this sprint):** Delete 28 files (12 demo + 16 .bak) + move 5 API paths to constants.js + logo handling (OD-491-06)
- **Wave 2 scope (next sprint):** Rename 38 *Mockup.jsx, deduplicate Maps loader
- **Risk:** HIGH (many files, App.js routes), mitigated by wave approach + zero behaviour change
- **Screenshots captured:** All 4 demo page types — settings-preview, screen1-compare, aggregator-preview, printer-config-preview
- **IA:** `impact/CR-491_IMPACT_ANALYSIS.md`

## Registry Updates
- BUG-642: GATE_1_INTAKE_FROZEN → GATE_2_IMPACT_ANALYSIS
- BUG-643: GATE_1_INTAKE_FROZEN → GATE_2_IMPACT_ANALYSIS  
- CR-491: GATE_1_INTAKE_FROZEN → GATE_2_IMPACT_ANALYSIS

## Open Before Gate 3
- **OD-491-06:** Logo handling — (a) download to public/ vs (b) load from profile API. Owner provisionally accepted (a), needs re-confirm.

## Recommended Execution Order
1. **BUG-643** first — smallest (2 lines), unblocks CR-488, highest ROI
2. **BUG-642** second — small (8-10 lines), self-contained, high user impact
3. **CR-491 Wave 1** third — largest, needs careful testing per verification matrix

## Next
Owner answers OD-491-06 → Gate 3 GO → Implementation Plans for all three.
