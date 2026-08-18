# CR-085 — Inventory Module Completion (Phase 2 Consolidation)

**ID:** CR-085
**Type:** CR (Change Request)
**Created:** 2026-07-20
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory
**Duplicate Check:** RELATED to CR-081, CR-075, CR-076, CR-077, CR-073-FU-01
**Code Reality:** PARTIAL (Phase 1 shipped, Phase 2 gaps remain)

---

## Summary

Consolidates ALL remaining inventory module work into a single CR. The inventory module (CR-072 + descendants) shipped Phase 1 CRUD successfully but has 6 categories of remaining work identified through QA iterations 18-21 and owner feedback.

---

## Consolidated Feedback (6 Categories)

### Category A: CR-081 Design Gaps (HALTED — Owner Feedback)
**Source:** Owner flagged during CR-081 implementation (2026-07-20)
**Status:** Screens 1-3 shipped, Phase D NOT STARTED

| # | Gap | Screen | Details |
|---|-----|--------|---------|
| A1 | Missing table grid borders | Current Stock, Ingredients, Stock Audit | Tables lack visible grid lines/borders per V5 mockup |
| A2 | Missing DAYS LEFT column badges | Current Stock | Colored badges (red ≤3d, amber ≤7d, green >7d) — partially done, needs refinement |
| A3 | Missing COST/SERVE + SALE ₹ columns | Recipe tables | Recipe list/bulk editor missing cost and sale price columns |
| A4 | Missing sparkline trend indicators | Cost Trend widget | Trend column shows placeholder, needs mini chart |
| A5 | Missing row status icons refinement | Current Stock | ⚠/⊗ icons for Low Stock/Out of Stock — partially done |
| A6 | Dashboard skeleton loading | Inventory Dashboard | 5-10s full-panel spinner → replace with per-widget skeleton placeholders |

### Category B: Recipe Create Backend Blockers
**Source:** QA iteration 20-21 (2026-07-20), curl-verified
**Status:** Frontend payloads CORRECT, backend crashes

| # | Endpoint | Error | Details |
|---|----------|-------|---------|
| B1 | POST /store-recipe | 500 "Undefined array key 'id'" RecipeController.php:3319 | Standard recipe create |
| B2 | POST /store-sub-recipe | 500 "Undefined array key 'id'" RecipeController.php:678 | Sub-recipe create (after fixing ingredient key to singular) |
| B3 | POST /store-addon-recipe | 500 "Undefined array key 'id'" RecipeController.php:3319 | Addon recipe create |

**Backend Brief:** `/app/memory/backend_briefs/BACKEND_BRIEF_B2_RECIPE_500_2026_07_20.md`
**Frontend workaround:** NONE — requires backend fix.

### Category C: Frontend Bug Fixes Applied (This Session)
**Source:** QA iteration 20-21 (2026-07-20)
**Status:** FIXED + VERIFIED — needs registry sync

| # | Fix | File | Details |
|---|-----|------|---------|
| C1 | min_unit_alert → String() | inventoryTransform.js | Ingredient Add was sending number, backend requires string |
| C2 | preparation_time default '0' | recipeTransform.js | Recipe create rejected empty prep time |
| C3 | serve_time default '0' | recipeTransform.js | Same pattern as C2 |
| C4 | Sub-recipe key: ingredients → ingredient | recipeTransform.js | Backend expects singular key for sub-recipes |
| C5 | Addon dropdown: foods → addons | RecipeFormPanel.jsx + recipeService.js + recipeTransform.js + constants.js | Addon dropdown was populated from food list, now uses /product/addon-list |

### Category D: Unstarted Features (Carried from Prior CRs)
**Source:** CR-076, CR-077, CR-073-FU-01

| # | Feature | Prior CR | Priority | Est. Scope |
|---|---------|----------|----------|------------|
| D1 | S3 File Upload (invoice attachments for Purchase/Receive) | CR-076 | P2 | PARKED — awaiting backend presigned URL endpoint |
| D2 | Hierarchy Stock Transfer Phase 2 (Dispatch + Dispute + Return) | CR-077 | P1 | ~600-900 lines, 8-12 files. Master creds needed |
| D3 | Recipe Bulk Editor Column Visibility Toggle | CR-073-FU-01 | P2 | ~50-80 lines in RecipeBulkEditor.jsx |

### Category E: Code Quality (Identified During QA)
**Source:** QA iterations 18-21

| # | Item | File | Details |
|---|------|------|---------|
| E1 | Extract tab components | InventorySetupPanel.jsx (580+ LOC) | Split into VendorsTab, IngredientsTab, WastageTab |
| E2 | Extract menu config | Sidebar.jsx (767 LOC) | Move sidebarMenuItems into separate constants file |

### Category F: Registry Housekeeping
**Source:** This session's QA verified items not yet synced

| # | Item | Action |
|---|------|--------|
| F1 | BUG-210 | Update registry: IMPLEMENTED → QA PASS (verified iteration_18) |
| F2 | CR-084 | Update registry: IMPLEMENTED → QA PASS (verified iteration_18) |
| F3 | CR-081 | Update registry: note Screens 1-3 shipped, Absorbed into CR-085 |
| F4 | CR-075 | Confirm ABSORBED into CR-085 |
| F5 | CR-076 | Mark ABSORBED into CR-085 (D1) |
| F6 | CR-077 | Note Phase 1 DONE, Phase 2 → CR-085 (D2) |
| F7 | CR-073-FU-01 | Mark ABSORBED into CR-085 (D3) |

---

## Open Questions (Owner Decisions Needed)

| # | Question | Options |
|---|----------|---------|
| Q1 | Should Category B (backend 500) block this CR or be tracked separately as a backend brief? | A: Block CR-085 / B: Separate backend ticket |
| Q2 | Priority order for Category D features? | D1 (S3 upload) vs D2 (Dispatch/Return) vs D3 (Column toggle) |
| Q3 | Is the master restaurant account available for CR-077 Phase 2 (Dispatch)? | Needed for testing |
| Q4 | Should Category E (code quality) be done as part of CR-085 or deferred? | A: Include / B: Defer to tech-debt sprint |

---

## Files WILL Change (estimated)

**Category A (Design):** CurrentStockPanel.jsx, InventorySetupPanel.jsx, StockAuditPanel.jsx, RecipeManagementPanel.jsx, widgets/*.jsx
**Category C (Already changed):** inventoryTransform.js, recipeTransform.js, RecipeFormPanel.jsx, recipeService.js, constants.js
**Category D:** New files for Dispatch/Dispute/Return + RecipeBulkEditor.jsx + S3 upload service
**Category E:** InventorySetupPanel.jsx (split), Sidebar.jsx (extract)

---

## Evidence Artifacts

- QA Reports: `/app/test_reports/iteration_18.json` through `iteration_21.json`
- QA Summary: `/app/memory/test_reports/QA_REPORT_2026_07_20.md`
- Backend Brief: `/app/memory/backend_briefs/BACKEND_BRIEF_B2_RECIPE_500_2026_07_20.md`
- B2 curl reproduction commands documented in session

---

## Next

Planning agent for Gates 2-3. Recommend splitting into phases:
- **Phase 1:** Category C registry sync + Category F housekeeping (immediate)
- **Phase 2:** Category A design fixes (CR-081 completion)
- **Phase 3:** Category D features (prioritized per owner Q2)
- **Phase 4:** Category E code quality (if approved)
- **Backend track:** Category B (separate backend brief, not blocking frontend phases)
