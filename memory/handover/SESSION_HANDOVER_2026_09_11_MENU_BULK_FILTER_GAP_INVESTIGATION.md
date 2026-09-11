# Session Handover — Menu Bulk Edit Gap Investigation

**Date:** 2026-09-11  
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)  
**Branch:** main (no code changes this session)  
**Preprod API:** https://preprod.mygenie.online/  
**Account used:** owner@thegoankitchen.com (credentials masked per Rule R20)  
**Sprint:** pos_7_0 (suggested for new items)

---

## Session Summary

Owner requested a UX investigation into two gaps in Menu Management:
1. Normal menu bulk edit has no filter capability (status, type, category)
2. Aggregator menu bulk edit has no bulk delete

**No source code was changed this session.** All work was investigation + artifact generation.

---

## Investigation Findings

### GAP-1 Confirmed: BulkEditor Has No Filter Panel (Both menu types)

**Evidence:** `BulkEditor.jsx:425–471` — `groupedRows` useMemo only filters by text search.

Vs. `ProductList.jsx:12–66` — `STATUS_FILTERS` (All/Active/Inactive) and `FOOD_FILTERS` (All/Veg/Non-Veg/Egg/Jain) are fully implemented in the card view but were never ported to BulkEditor.

**Additionally found:** The sidebar `selectedCategoryId` is passed to `ProductList` but NOT to `BulkEditor`. When a user selects "Starters" in the left sidebar and then opens Bulk Edit, the grid shows ALL categories — the selection is ignored.

### GAP-2 Confirmed: "Select All Inactive" Not Possible

`Select All` checkbox (`BulkEditor.jsx:981–984`) selects all visible rows. Since no status filter exists, there is no way to pre-filter to inactive rows and then select all of them. Direct consequence of GAP-1.

### GAP-3 Confirmed: Aggregator Bulk Delete Entirely Absent

`BulkEditor.jsx:396` — hard guard: `const showBulkDelete = menuType !== 'Aggregator'`

`menuManagementService.js:106–112` — service comment + payload spec explicitly state `/delete-bulk` accepts only `food_for: Normal|Party|Premium`. Not Aggregator.

**Two unblock paths identified (both need backend input):**
- Path A: Backend extends `/delete-bulk` to accept `food_for: 'Aggregator'`
- Path B: FE uses `deleteFood()` single-item loop — unverified for aggregator IDs

---

## Artifacts Created

| Artifact | Path |
|---------|------|
| Investigation Report | `/app/memory/investigations/INV-MENU-BULK-FILTER-GAP_INVESTIGATION_REPORT_2026_09_11.md` |
| CR-374 Intake | `/app/memory/change_requests/CR-374_BULKEDITOR_FILTER_PANEL_STATUS_TYPE_CATEGORY_INTAKE.md` |
| CR-375 Intake | `/app/memory/change_requests/CR-375_AGGREGATOR_BULK_DELETE_CAPABILITY_INTAKE.md` |
| Backend Brief (CR-375) | `/app/memory/backend_briefs/BACKEND_BRIEF_CR375_2026_09_11.md` |
| Session Handover | `/app/memory/handover/SESSION_HANDOVER_2026_09_11_MENU_BULK_FILTER_GAP_INVESTIGATION.md` |

---

## Registry Updates Needed (for next agent)

The following items need to be added to `registry.json`, `CR_REGISTRY.md`:

| ID | Title | Status | Gate |
|----|-------|--------|------|
| CR-374 | BulkEditor Filter Panel (Status + Type + Category) | INTAKE | 0→1 |
| CR-375 | Aggregator Bulk Delete Capability | INTAKE — BLOCKED | 0→1 |

---

## Owner Decisions — Status Update (2026-09-11)

**CR-374 ODs LOCKED:**
- OD-374-01: **Option A — Always-visible filter strip** (permanently between toolbar and grid, no toggle)
- OD-374-02: **Searchable dropdown** for category (owner confirmed 20+ categories, chips impractical)
- OD-374-03: Reset filters on menu type change — agent default YES

**CR-374 is ready for Gate 3 (Implementation Plan) → Gate 4 GO → Implementation.**

---

## Previous Pending Items (unchanged status)

| ID | Status | Note |
|----|--------|------|
| BUG-390 | NOT STARTED | Fix: remove Aggregator gate from main image upload in ProductForm.jsx. Fast Lane eligible. Owner Fast Lane approval pending. |
| CR-373 | NOT STARTED | "Use item image for Swiggy" toggle in ProductForm.jsx. Depends on BUG-390. |
| BUG-374 | TESTING PENDING | Cart variation qty bug. Previous session status unchanged. |
| BUG-268 | BLOCKED | Inventory edit fails — backend SQL schema issue. |
| CR-372-B | INTAKE | Add ProtectedRoute to 23 routes (App.js). |

---

## Recommended Next Steps

1. **Owner decision on CR-374 OD-374-01/02/03** → Gate 4 GO → Implementation of filter panel
2. **Backend team: file/act on Backend Brief CR-375** → confirm Path A or B → unblock CR-375
3. **BUG-390 Fast Lane** → 4-line fix, owner approval pending from previous session
4. **CR-373** → implement after BUG-390 is resolved

---

*Investigation complete. 7/10 steps used. HIGH confidence on all 3 gaps. No code changes this session.*
