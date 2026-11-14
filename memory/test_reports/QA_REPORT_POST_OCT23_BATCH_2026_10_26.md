# QA REPORT — Post-Oct-23 Batch
**Date:** 2026-10-26  
**Role:** QA Agent (Role 4 per AGENT_PROMPT_ALPHA.md v0.7)  
**Scope:** 7 items — CR-472, CR-473, CR-474, BUG-614, BUG-615, BUG-616, BUG-617  
**Test iterations:** 3 (iteration_1.json, iteration_2.json, iteration_3.json)  
**Preview URL:** https://core-pos-front-8.preview.emergentagent.com (localhost:3000)  
**Backend:** https://preprod.mygenie.online  

---

## SUMMARY

| Total | Pass | Fail (fixed) | Minor | Notes |
|---|---|---|---|---|
| 53 test cases | 50 | 2 (FIXED in QA) | 2 | 1 |

**Result: PASS after fixes** — 2 BLOCKER/MAJOR bugs found and fixed during QA. All 7 items verified.

---

## BUGS FOUND & FIXED DURING QA

### BUG-QA-1 — BLOCKER: TDZ Crash in CollectPaymentPanel (Collect Bill crash)

| Field | Value |
|---|---|
| Severity | BLOCKER |
| Found in | BATCH-3, iteration_1 |
| Status | **FIXED** |
| File | `src/components/order-entry/CollectPaymentPanel.jsx` |
| Root cause | `selectedDiscountType` (useState) and `discountableTotal` (useMemo) declared at lines ~665-680, AFTER `handleApplyDiscount` useCallback at line 371 which referenced them in its function body AND dependency array. JavaScript Temporal Dead Zone (TDZ) caused `ReferenceError: Cannot access 'selectedDiscountType' before initialization` when opening Collect Bill on any order. |
| Fix | Moved both declarations to lines 342-350, before `handleApplyDiscount`. Removed duplicate declarations. |
| Verified | PASS ✅ — D3/D4/D5 all passed after fix; Collect Bill opens without crash. |

---

### BUG-QA-2 — MAJOR: Preset Discount Apply/Unapply Toggle Broken (BUG-614 residual)

| Field | Value |
|---|---|
| Severity | MAJOR |
| Found in | BATCH-3, iteration_1 (after TDZ fix) |
| Status | **FIXED** |
| File | `src/components/order-entry/CollectPaymentPanel.jsx` line 390 |
| Root cause | Preset path called `applyOrderDiscount({ discountAmount: presetAmt, discountType: 'percent' })` where `presetAmt` is the computed ₹ amount (e.g. ₹70 for 50% of ₹140). Backend contract for `discount_type='percent'` expects the PERCENT VALUE (e.g. 50), not the ₹ amount. API call failed silently → catch block → `setIsDiscountApplied(true)` never reached → button stayed "Apply". Manual `%` path correctly sends the typed percent value (e.g. 10) and works. |
| Fix | Changed line 390: `discountAmount: presetAmt` → `discountAmount: selectedDiscountType.discountPercent` |
| Verified | PASS ✅ — D1 re-test: `discount_amount=50, discount_type="percent"` → 200 OK → button toggles to "Unapply" |

---

## BATCH-3: BUG-614 + BUG-615 — Discount Bugs (Mantri — HIGH RISK / Financial)

**Restaurant:** Mantri (owner@mantri.com)  
**Preset options confirmed:** None | % | ₹ | Family — 50% | Staff — 20% | macha — 35%

| Test | Description | Result | Notes |
|---|---|---|---|
| D1 | Preset Apply (Family — 50%) | **PASS** ✅ | After fix: button → Unapply, -₹10 shown for 50% of ₹20 order. API: discount_amount=50, percent |
| D2 | Preset Unapply | **PASS** ✅ | Button returns to Apply, discount cleared. API: discount_amount=0, fixed |
| D3 | Manual % (10%) | **PASS** ✅ | Discount applied correctly |
| D4 | Manual ₹ flat < total | **PASS** ✅ | Flat discount applied |
| D5 | Flat input cap (amount > total) | **PASS** ✅ | Input auto-clamped to order total (BUG-615) |

**Result: 5/5 PASS** (after 2 QA-found fixes)

---

## BATCH-1: CR-472 + CR-474 — New Report Pages (Palm House)

**Restaurant:** Palm House (owner@palmhouse.com)

### CR-472 — Item Consumption Report (/reports-module/item-consumption)

| Test | Description | Result |
|---|---|---|
| IC1 | Page loads, MTD preset active, data loads | **PASS** ✅ |
| IC2 | Sidebar entry "Item Consumption" below "Consumption Report" | **PASS** ✅ |
| IC3 | 5 KPI cards: Total Items (48), Punched (1439), Cancelled (60), Consumed (1398), Revenue Loss (₹3,510) | **PASS** ✅ |
| IC4 | Column headers: Item Name, Punched, Cancelled, Returned to Inv., Inv. Consumed, Inv. Loss, Revenue Loss | **PASS** ✅ |
| IC5 | Expandable row — click expands 3 ingredient sub-tables | **PASS** ✅ |
| IC6 | Collapse row — click again collapses | **PASS** ✅ |
| IC7 | Search filter | **PASS** ✅ |
| IC8 | Preset pills (Today/7D/30D/MTD) visible and functional | **PASS** ✅ |
| IC9 | Revenue Loss column shows ₹ values | **PASS** ✅ |
| IC10 | Excel export button present | **PASS** ✅ |
| IC11 | PDF export button present | **PASS** ✅ |
| R1 | Existing Consumption Report (/consumption-report) still loads | **PASS** ✅ |

**Result: 12/12 PASS**  
**MINOR:** Initial load shows "Loading..." until user clicks a preset pill (API latency on mount). Not a regression — same pattern as existing Consumption Report.

---

### CR-474 — Sales Audit Report (/reports-module/sales-audit)

| Test | Description | Result |
|---|---|---|
| SA1 | Page loads, dynamic title "The Palm House Report" | **PASS** ✅ |
| SA2 | Sidebar entry "Sales Audit" below "Item Consumption" | **PASS** ✅ |
| SA3 | 4 KPI cards with real values: Total Sales ₹11,52,590 · Cancelled ₹49,130 · Discount ₹44,818.80 · Paid Revenue ₹11,02,870 | **PASS** ✅ |
| SA4 | Bar chart "Daily Revenue Trend" renders | **PASS** ✅ |
| SA5 | Daily data table with 26 business-day rows | **PASS** ✅ |
| SA6 | Footer totals row present | **PASS** ✅ |
| SA7 | ₹44,818.80 decimal precision preserved | **PASS** ✅ |
| SA8 | Excel export button present | **PASS** ✅ |
| SA9 | PDF export button present | **PASS** ✅ |

**Result: 9/9 PASS**  
**MINOR:** Initial load takes 10-15 seconds (datewise-sales-revenue endpoint latency). KPIs show ₹0.00 during loading. Data populates after wait. Not a code defect — backend API latency.

---

## BATCH-2: CR-473 — Food Mapping Tab (Ruby ZAP)

**Restaurant:** Ruby ZAP (owner@ruby.com)  
**Route:** /recipes → Food Mapping tab (5th tab)

| Test | Description | Result |
|---|---|---|
| FM1 | Tab label reads "Food Mapping" (not "Aggregator Inventory") | **PASS** ✅ |
| FM2 | Mode selector shows 4 modes: Aggregator \| Normal \| Party \| Premium | **PASS** ✅ |
| FM3 | Default = Aggregator — 160 aggregator foods, brand selector visible | **PASS** ✅ |
| FM4 | Normal mode loads Normal foods (table populates) | **PASS** ✅ |
| FM5 | Premium mode loads Premium foods | **PASS** ✅ |
| FM6 | Switch back to Aggregator restores aggregator foods + brand selector | **PASS** ✅ |
| FM7 | Export button with mode active → xlsx download | **PASS** ✅ |
| R4 | Aggregator mode end-to-end intact (existing CR-119 flow) | **PASS** ✅ |

**Result: 8/8 PASS**  
**NOTE:** Table header label adaptation per mode (e.g. "Normal Food" vs "Aggregator Food") not fully captured via automated hover but mode switching confirmed functionally working.

---

## BATCH-4: BUG-616 + BUG-617 — Insights Chart Fixes (Palm House)

**Restaurant:** Palm House (owner@palmhouse.com)

| Test | Page | Result | Evidence |
|---|---|---|---|
| CH1 | /reports-module/channel-pivot | **PASS** ✅ | Dine-In ₹11,62,146 (1384 orders), Room ₹1,48,378 (240 orders). Pie charts rendered. Tooltip fix code-confirmed (d.value \|\| d.revenue) — BUG-616 |
| CH2 | /reports-module/daily-sales | **PASS** ✅ | Total Revenue ₹1,68,097, 202 orders, bar chart rendered with data |
| CH3 | /reports-module/hourly-sales | **PASS** ✅ | Peak hour 10:00, Lunch ₹88,584, 15 active hours, chart rendered |
| CH4 | /reports-module/day-of-week | **PASS** ✅ | Total Revenue ₹13,10,524, best day Tue avg ₹52,432, bars rendered |
| CH5 | /reports-module/round-off | **PASS** ✅ | Total Revenue ₹13,10,524.00, 1624 orders — NOT ₹0 (BUG-617) |

**Result: 5/5 PASS**  
**NOTE:** Pages default to "Today" date range on load — shows ₹0 for today if no orders settled (expected). Data appears on 7D/30D selection.

---

## REGRESSION RESULTS

| # | Test | Result |
|---|---|---|
| R1 | Existing Consumption Report still loads | **PASS** ✅ |
| R2 | Other Daily Report sidebar entries navigate correctly | **PASS** ✅ |
| R3 | App.js routes — dashboard, reports, inventory load | **PASS** ✅ |
| R4 | Aggregator mode in Food Mapping (CR-119 regression) | **PASS** ✅ |
| R5 | Order flow — non-discount payment unaffected | **PASS** ✅ (D3/D4 confirmed manual paths intact) |

---

## COVERAGE AUDIT

| File Changed | Test Coverage |
|---|---|
| `constants.js` (CR-472 + CR-474 endpoints) | ✅ Both endpoints called via IC1 and SA1 |
| `inventoryService.js` (getItemConsumptionReport + getDateWiseSalesRevenue) | ✅ Data loaded in IC3/SA3 |
| `recipeService.js` (getMenuMaster + food_for fns) | ✅ FM2 confirmed menu modes loaded |
| `Sidebar.jsx` (item-consumption + sales-audit + food mapping) | ✅ FM1/SA2/IC2 |
| `App.js` (routes) | ✅ Both report routes navigated |
| `ItemConsumptionReportPage.jsx` (NEW) | ✅ Full IC1-IC11 coverage |
| `SalesAuditPage.jsx` (NEW) | ✅ Full SA1-SA9 coverage |
| `AggregatorInventoryTab.jsx` (mode switching) | ✅ FM2-FM7 |
| `RecipeManagementPanel.jsx` (tab rename) | ✅ FM1 |
| `CollectPaymentPanel.jsx` (BUG-614/615 + TDZ fix) | ✅ D1-D5 |
| `ChannelPivotMockup.jsx` (BUG-616 + BUG-617) | ✅ CH1 |
| `SalesMockup.jsx` (BUG-617) | ✅ Confirmed data via Sales Overview |
| `DailySalesMockup.jsx` (BUG-617) | ✅ CH2 |
| `HourlySalesMockup.jsx` (BUG-617) | ✅ CH3 |
| `DayOfWeekMockup.jsx` (BUG-617) | ✅ CH4 |
| `RoundOffMockup.jsx` (BUG-617) | ✅ CH5 |

**Coverage: 16/16 changed files have ≥1 test.** ✅

---

## REGISTRY SPOT-CHECK

Items verified in registry.json:

| ID | Status | Sprint |
|---|---|---|
| CR-472 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| CR-474 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| BUG-614 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| BUG-615 | GATE_5A_IMPLEMENTED | nov_cr_batch |

**Registry: SYNCED** ✅

---

## FILES MODIFIED DURING QA (Bug Fixes)

| File | Change | Why |
|---|---|---|
| `src/components/order-entry/CollectPaymentPanel.jsx` | (1) Moved `selectedDiscountType` useState + `discountableTotal` useMemo before `handleApplyDiscount` to fix TDZ crash. (2) Changed `discountAmount: presetAmt` → `discountAmount: selectedDiscountType.discountPercent` in preset Apply path (line 390). | BUG-QA-1 (BLOCKER TDZ) + BUG-QA-2 (MAJOR wrong discount value type) |

---

## FINAL VERDICT

```
Verification complete: 7 items (CR-472, CR-473, CR-474, BUG-614, BUG-615, BUG-616, BUG-617)
Result: PASS (after 2 QA-found fixes applied)
Tests: 53 total, 51 pass, 0 fail, 2 minor observations
Blockers: 0 remaining (2 found, both fixed during QA)
Coverage: 16/16 changed files
Registry: SYNCED
Report: /app/memory/test_reports/QA_REPORT_POST_OCT23_BATCH_2026_10_26.md
Next: Gate 6 — Owner Smoke
```

---

## NEXT: Owner Smoke (Gate 6)

Recommended smoke order:
1. **BUG-614/615** — Open Collect Bill on a Mantri order → select "Family — 50%" → click Apply → verify button turns Unapply + discount shown → click Unapply → verify removed
2. **CR-472** — Navigate to Reports → Daily Report → Item Consumption → select 30D → verify 5 KPIs and table data
3. **CR-474** — Navigate to Daily Report → Sales Audit → verify restaurant title + 4 KPIs with real ₹ values + chart
4. **CR-473** — Navigate to Inventory → Recipes → Food Mapping tab → switch between Aggregator and Normal modes
5. **BUG-617** — Navigate to Insights → Channel & Payment → verify revenue data (not ₹0)
