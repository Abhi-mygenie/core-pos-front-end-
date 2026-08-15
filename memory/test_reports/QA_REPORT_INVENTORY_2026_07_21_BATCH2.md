# QA REPORT — Inventory Batch 2026-07-21

**Date:** 2026-07-21
**QA Agent role**
**Scope:** BUG-211, BUG-212, CR-086 (F1–F4), CR-085 Phase 1, BUG-213
**Test environment:** https://pos-front-deploy-7.preview.emergentagent.com
**Backend:** https://preprod.mygenie.online
**Account:** owner@kunafamahal.com (RID 689, Kunafa Mahal)
**Tool:** Playwright automation (testing_agent_v3)
**Test report:** `/app/test_reports/iteration_1.json`

---

## Result: 27/27 PASS — ZERO FAILURES

| Group | Item | Tests | Result |
|-------|------|-------|--------|
| GROUP 1 | BUG-211: Current Stock Sort + KPI Filters | T1-1 → T1-5 (5 tests) | ✅ ALL PASS |
| GROUP 2 | BUG-212: Ingredients Edit + Add + Export | T2-1 → T2-5 (5 tests) | ✅ ALL PASS |
| GROUP 3 | CR-086: Exports + IngredientBulkEditor | T3-1 → T3-10 (10 tests) | ✅ ALL PASS |
| GROUP 4 | CR-085 Phase 1: Dashboard Design | T4-1 → T4-4 (4 tests) | ✅ ALL PASS |
| GROUP 5 | BUG-213: BulkEditor Title | T5-1 (part of T3-4) | ✅ PASS |

---

## Key Verifications

### BUG-211
- Row sort confirmed: first 20 rows all `status-out`, then `status-low`, then `status-ok`
- kpi-out click → 50 Out of Stock rows only, card shows `ring-2 ring-red-100` highlight
- Second click → filter cleared, all 106 rows visible
- kpi-low click → Low Stock rows only
- No chip row below KPI cards confirmed

### BUG-212
- 106 ingredient rows load in `ingredient-table`
- Pencil icon click → `ingredient-edit-row-{id}` with `border-b-2 border-blue-300 bg-blue-50/40` confirmed
- Edit row pre-filled, `save-edit-ingredient` present
- Add form: all 7 fields confirmed present (`new-ingredient-name`, `new-ingredient-unit`, `new-ingredient-small-unit`, `new-ingredient-conversion`, `new-ingredient-min-qty`, `new-ingredient-min-unit`, `new-ingredient-category`)
- Export: downloads `ingredients.xlsx` — no "coming soon" toast

### CR-086
- Excel: downloads `Stock_2026-07-21.xlsx`
- PDF: downloads `Stock_2026-07-21.pdf`
- Bulk Edit: loads IngredientBulkEditor (replaces list)
- BulkEditor: 15 categories, 106 ingredient rows grouped
- Dirty highlight: `bg-amber-50/40 border-l-[3px] border-l-amber-500` on edited cells
- Save button: `disabled=null` (enabled) after edit
- Add Item: new row with `bg-green-50/40 border-l-[3px] border-l-green-500`
- Excel: downloads `Ingredients_2026-07-21.xlsx`
- Close: returns to `ingredient-table` view

### CR-085 Phase 1
- `reorder-forecast-table`: visible grid borders, data rows present
- `recipe-margin-table`: 5 columns (RECIPE, COST/SERVE, SALE ₹, MARGIN, Δ VS PREV)
- Real recipe values: 50-50 Ras Royal ₹46.39/₹50, Nebulsi Kunafa ₹128.25/₹299
- KPI cards: 49 REORDER ALERTS, WASTAGE VALUE (P2), ↑15.4% COST CHANGE, 75 RECIPES AT RISK

### BUG-213
- `bulk-editor-title` element present, text = "Bulk Edit Ingredients"

---

## Blockers: NONE
## Open Issues: NONE
## Registry drift fixed: CR-077 (Phase 1 QA PASS text added to registry.json)

---

## Registry Updates Made
All 5 items updated to QA PASS in registry.json:
- BUG-211 → QA PASS (2026-07-21, iteration_1)
- BUG-212 → QA PASS (2026-07-21, iteration_1)
- CR-086 → QA PASS (2026-07-21, iteration_1)
- CR-085 Phase 1 → QA PASS (2026-07-21, iteration_1)
- BUG-213 → QA PASS (2026-07-21, iteration_1)
- CR-077 → registry drift corrected (QA PASS text added)

## BUG_TRACKER.md Updated
BUG-211, BUG-212, BUG-213 rows updated to QA PASS.

---

## Next Step
→ Items are ready for **OWNER SMOKE** batch
→ Recommend scheduling SMOKE FACILITATOR session for: BUG-211, BUG-212, CR-086, CR-085 Phase 1
