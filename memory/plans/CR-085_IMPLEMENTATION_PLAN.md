# CR-085 — Implementation Plan (Gate 3)

**ID:** CR-085
**Stage:** Implementation Plan (Gate 3)
**Date:** 2026-07-21
**Risk:** MEDIUM (design-only + small feature + registry admin)
**Owner Decisions Resolved:**
- Q1: Backend recipe 500 tracked separately ✅
- Q2: D3 is only remaining D-category (D1 PARKED, D2 DEFERRED) ✅
- Q3: D2 (Dispatch/Return) DEFERRED ✅
- Q4: Category E (code quality) DEFERRED ✅

---

## Scope Lock

**In scope:**
- Phase 0: Category F (registry sync) + Category C (already-done FE fix sync)
- Phase 1: Category A (design polish) + D3 (recipe column toggle)

**Out of scope:** Category B (backend), D1 (PARKED), D2 (DEFERRED), Category E (DEFERRED)

**Files WILL change:**
- Phase 0: `registry.json`, `BUG_TRACKER.md`, `CR_REGISTRY.md` (admin only)
- Phase 1-A1: `CurrentStockPanel.jsx`, `InventorySetupPanel.jsx` (table border CSS)
- Phase 1-A2: `CurrentStockPanel.jsx` (Days Left badge refinement)
- Phase 1-A3: `RecipeManagementPanel.jsx` (cost/sale columns)
- Phase 1-A4: `InventoryIntelligencePanel.jsx` or `CostTrendWidget.jsx` (sparkline)
- Phase 1-A6: `InventoryIntelligencePanel.jsx` (skeleton loading)
- Phase 1-D3: `RecipeBulkEditor.jsx` (column visibility toggle)

**Files will NOT touch:** Sidebar.jsx, orderTransform.js, all financial/settlement files

---

## Edit Sequence

### Phase 0: Registry Sync (Category F + C)

Administrative updates only — no code changes:

| # | Item | Action |
|---|------|--------|
| F1 | BUG-210 | registry.json → QA PASS |
| F2 | CR-084 | registry.json → QA PASS |
| F3 | CR-081 | registry.json → HALTED, ABSORBED into CR-085 |
| F4 | CR-075 | registry.json → ABSORBED into CR-085 |
| F5 | CR-076 | registry.json → ABSORBED into CR-085 (D1 PARKED) |
| F6 | CR-077 | registry.json → Phase 1 DONE, Phase 2 DEFERRED |
| F7 | CR-073-FU-01 | registry.json → ABSORBED into CR-085 (D3) |

### Phase 1-A1: Table Grid Borders (~20 lines across 3 files)

Add visible cell borders to inventory tables for readability:

**CurrentStockPanel.jsx:** Add `border border-slate-200` to `<td>` elements (stock table)
**InventorySetupPanel.jsx:** Add `border border-slate-200` to `<td>` elements (ingredients + vendors tables)

Pattern: change `border-b border-slate-200` → `border border-slate-200` on `<td>` cells, add `border-collapse: collapse` to `<table>`.

### Phase 1-A2: Days Left Badge Refinement (~10 lines)

**CurrentStockPanel.jsx:** Current badges at L289-300 are small `text-[10px]` chips. Upgrade to:
- Larger size: `text-xs px-2.5 py-1`
- Icon: add small clock icon from lucide for ≤3d items
- Bold threshold text

### Phase 1-A3: Recipe Cost/Sale Columns (~15 lines)

**RecipeManagementPanel.jsx:** Add cost and sale price display to recipe cards. Source data from existing `costMarginFor` in RecipeBulkEditor pattern. If data not available in list view, show "—" placeholder.

### Phase 1-A4: Sparkline Trend Indicators (~40-60 lines)

**CostTrendWidget.jsx** (or InventoryIntelligencePanel.jsx): Replace placeholder text with `recharts` `<Sparkline>` or `<LineChart>` mini-chart. `recharts` 3.6.0 already in package.json.

### Phase 1-A6: Dashboard Skeleton Loading (~30-40 lines)

**InventoryIntelligencePanel.jsx:** Replace single `<Loader2>` spinner (L177-181) with per-widget skeleton placeholders. Pattern: 6 skeleton cards matching widget grid layout.

### Phase 1-D3: Recipe Bulk Editor Column Toggle (~50-80 lines)

**RecipeBulkEditor.jsx:** Add column visibility dropdown:
- State: `visibleColumns` Set with default all-visible
- Dropdown button in toolbar with checkboxes per column
- Columns toggle visibility in table head + body
- Persist preference in localStorage

---

## Verification Matrix

| # | File | Change | How to Verify |
|---|------|--------|---------------|
| F-sync | registry.json | 7 items updated | python3 verify script |
| A1 | CurrentStockPanel + InventorySetupPanel | Table cell borders | Visual: grid lines visible |
| A2 | CurrentStockPanel | Days Left badges larger | Visual: bigger colored badges |
| A3 | RecipeManagementPanel | Cost/Sale on cards | Visual: cost column on recipe cards |
| A4 | CostTrendWidget | Sparkline chart | Visual: mini line chart in widget |
| A6 | InventoryIntelligencePanel | Skeleton loading | Visual: skeleton cards during load |
| D3 | RecipeBulkEditor | Column toggle | Click dropdown → toggle column → column hides/shows |

## Post-Code Registry Checklist

- [ ] registry.json: CR-085 → IMPLEMENTED (per phase)
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: all modified files listed
- [ ] Code markers: // CR-085 in every modified file
