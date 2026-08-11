# CR-085 — Impact Analysis (Gate 2)

**ID:** CR-085
**Stage:** Impact Analysis (Gate 2)
**Date:** 2026-07-21
**Code Reality:** PARTIAL — Category C FULL (FE fixes shipped), Category B BACKEND-BLOCKED, rest NONE/PARTIAL
**Risk:** HIGH (multi-phase, touches many files, backend dependencies)
**Conflict Pre-Check:**
- CR-081 (HALTED) → ABSORBED into CR-085 Cat A. No conflict.
- CR-075 (PARTIALLY SHIPPED) → ABSORBED. No conflict.
- CR-077 (Phase 1 DONE) → Phase 2 tracked under CR-085 Cat D2. No conflict.
- CR-073-FU-01 → ABSORBED into Cat D3. No conflict.
- BUG-211/BUG-212 (just implemented) → No overlap with CR-085 scope.

---

## Category-by-Category Analysis

### Category A: CR-081 Design Gaps

**Code Reality: NONE**

| # | Gap | Current State (code-verified) | Scope |
|---|-----|-------------------------------|-------|
| A1 | Missing table grid borders | Tables use `border-slate-200` on rows only. No cell borders / grid lines. | CSS-only: ~20 lines across 3-4 table files |
| A2 | Days Left badges refinement | CurrentStockPanel.jsx L289-300 has colored round badges (red/amber/green) — partially done but plain `text-[10px]` chips. Needs larger badges / icon treatment per V5 mockup | ~10 lines in CurrentStockPanel.jsx |
| A3 | Recipe Cost/Sale columns | RecipeBulkEditor.jsx has `costMarginFor` but RecipeManagementPanel card view lacks cost/sale price display | ~15 lines in RecipeManagementPanel.jsx |
| A4 | Sparkline trend indicators | Inventory Dashboard cost trend widget shows placeholder text, no mini chart | ~40-60 lines. Needs `recharts` (already in package.json) Sparkline component |
| A5 | Row status icon refinement | CurrentStockPanel.jsx L277-281 has XCircle/AlertTriangle icons inline — partially done. May need column-level icon treatment | ~5 lines |
| A6 | Dashboard skeleton loading | InventoryIntelligencePage.jsx uses single loading spinner, no per-widget skeleton | ~30-40 lines. Follow existing skeleton pattern from report pages |

**Total estimated: ~120-150 lines across 5-6 files**
**Risk: LOW** — pure UI/CSS, no API/transform changes
**Blocker: NONE** — all purely cosmetic

---

### Category B: Recipe Create Backend Blockers

**Code Reality: BACKEND-BLOCKED**

| # | Endpoint | Error | Status |
|---|----------|-------|--------|
| B1 | POST /store-recipe | 500 RecipeController.php:3319 | Backend brief filed |
| B2 | POST /store-sub-recipe | 500 RecipeController.php:678 | Backend brief filed |
| B3 | POST /store-addon-recipe | 500 RecipeController.php:3319 | Backend brief filed |

**Backend Brief:** `/app/memory/backend_briefs/BACKEND_BRIEF_B2_RECIPE_500_2026_07_20.md`
**Frontend workaround:** NONE possible — server-side crash.
**FE payloads verified CORRECT** (curl-tested in prior session).

**Recommendation:** Track separately as backend ticket. Do NOT block CR-085 frontend phases.

**Owner Decision Required: OD-085-Q1**

---

### Category C: Frontend Bug Fixes (Already Applied)

**Code Reality: FULL** — All 5 fixes confirmed in source code.

| # | Fix | File | Verified |
|---|-----|------|----------|
| C1 | min_unit_alert → String() | inventoryTransform.js L134-135 | ✅ `String(data.minQtyAlert \|\| 0)` |
| C2 | preparation_time default '0' | recipeTransform.js L119 | ✅ `data.preparationTime \|\| '0'` |
| C3 | serve_time default '0' | recipeTransform.js L120 | ✅ `data.serveTime \|\| '0'` |
| C4 | Sub-recipe key: ingredients → ingredient | recipeTransform.js | ✅ verified prior session |
| C5 | Addon dropdown: foods → addons | RecipeFormPanel.jsx + 3 files | ✅ verified prior session |

**Action needed:** Registry sync only (Category F). No code changes.

---

### Category D: Unstarted Features

**D1: S3 File Upload (Invoice Attachments)**

**Code Reality: NONE**
**Blocker: BACKEND-BLOCKED** — needs presigned URL endpoint from backend. No backend endpoint for file upload to S3 exists.
**Scope:** ~100-150 lines (file input + presigned URL flow + attachment display)
**Recommendation: PARKED** until backend delivers presigned URL endpoint.

**D2: Hierarchy Stock Transfer Phase 2 (Dispatch + Dispute + Return)**

**Code Reality: PARTIAL**
- Phase 1 (Receive) DONE: `ReceiveStockPanel.jsx`, `ReceiveDrawer.jsx`, `inventoryTransferService.js` (4 endpoints)
- Phase 2 needs: Dispatch tab, Dispute flow, Return flow
- **Blocker:** Needs master restaurant account credentials for testing dispatch FROM master TO branch.

**Scope:** ~600-900 lines across 8-12 files (new Dispatch panel + Dispute drawer + Return drawer + 4-6 API functions + transforms)

**Owner Decision Required: OD-085-Q3** — master account credentials

**D3: Recipe Bulk Editor Column Visibility Toggle**

**Code Reality: NONE** — `RecipeBulkEditor.jsx` (607 lines) has no column toggle mechanism.
**Scope:** ~50-80 lines in RecipeBulkEditor.jsx (dropdown with checkboxes, filter visible columns)
**Blocker: NONE**

---

### Category E: Code Quality

**Code Reality: NONE**

| # | Item | Current | Proposed |
|---|------|---------|----------|
| E1 | InventorySetupPanel.jsx | 711 lines, 3 tab components + VendorFormRow in one file | Extract IngredientsTab.jsx, VendorsTab.jsx, WastageTab.jsx |
| E2 | Sidebar.jsx | 766 lines, sidebarMenuItems[] inline | Extract to sidebarConfig.js constants file |

**Risk: MEDIUM** — refactoring large files, potential merge conflicts with any parallel work.
**Scope:** ~0 new lines (just file splitting), but touches high-change-frequency files.

**Owner Decision Required: OD-085-Q4**

---

### Category F: Registry Housekeeping

**Code Reality: ADMINISTRATIVE** — no code changes, just registry updates.

| # | Item | Action |
|---|------|--------|
| F1 | BUG-210 | registry.json: IMPLEMENTED → QA PASS |
| F2 | CR-084 | registry.json: IMPLEMENTED → QA PASS |
| F3 | CR-081 | registry.json: note HALTED, absorbed into CR-085 |
| F4 | CR-075 | registry.json: ABSORBED into CR-085 |
| F5 | CR-076 | registry.json: ABSORBED into CR-085 (D1) |
| F6 | CR-077 | registry.json: Phase 1 DONE, Phase 2 → CR-085 (D2) |
| F7 | CR-073-FU-01 | registry.json: ABSORBED into CR-085 (D3) |

Can be done immediately — no owner decision needed.

---

## Recommended Phasing

| Phase | Categories | Priority | Blockers |
|-------|-----------|----------|----------|
| **Phase 0** (immediate) | F (Registry sync) + C (already done — just sync) | P0 | NONE |
| **Phase 1** | A (Design polish) + D3 (Column toggle) | P2 | NONE |
| **Phase 2** | D2 (Dispatch/Return) | P1 | Master account creds (OD-085-Q3) |
| **Phase 3** | E (Code quality) | P3 | Owner approval (OD-085-Q4) |
| **Backend track** | B (Recipe 500) | P1 | Backend team fix |
| **Parked** | D1 (S3 upload) | P2 | Backend presigned URL endpoint |

---

## Owner Decision Queue

| # | Question | Options | Impact |
|---|----------|---------|--------|
| **OD-085-Q1** | Should Category B (backend 500 on recipe create) block CR-085 or be tracked separately? | **A:** Block CR-085 (all phases wait) / **B:** Separate backend ticket (FE phases proceed independently) | Blocks entire CR if A |
| **OD-085-Q2** | Priority order for Category D features? | **D2** (Dispatch/Return, P1, ~900 lines) vs **D3** (Column toggle, P2, ~80 lines) vs **D1** (PARKED) | Determines phase order |
| **OD-085-Q3** | Is the master restaurant account available for CR-077 Phase 2 (Dispatch testing)? | Owner provides credentials or defers D2 | Blocks D2 |
| **OD-085-Q4** | Should Category E (code quality / file splitting) be done in CR-085 or deferred? | **A:** Include in Phase 3 / **B:** Defer to separate tech-debt CR | Scope of CR-085 |

---

## Next
Impact Analysis complete. Awaiting owner decisions on OD-085-Q1 through Q4 before Gate 3 (Implementation Plan).
