# SESSION HANDOVER — QA Batch Plan for Post-Oct-23 Items

**Date:** 2026-10-26
**From:** Planning/Implementation Agent
**To:** QA Agent
**Status:** 7 items at GATE_5A_IMPLEMENTED, ready for Gate 5b QA

---

## WHAT WAS DONE THIS SESSION

### New Features Implemented
1. **CR-472** — Item Consumption Report (`/reports-module/item-consumption`): Menu-item-level consumption report with 8 columns (Item Name, Punched, Cancelled, Returned to Inv., Inv. Consumed, Inv. Loss, Revenue Loss), expandable ingredient drill-down, 5 KPI cards, column sorting, search, CSV+PDF export. Default MTD.
2. **CR-473** — Recipe Mapping by Menu Master (`/recipes` → Food Mapping tab): Enhanced existing Aggregator Inventory tab with mode selector pills (Aggregator/Normal/Party/Premium from menu-master API). Per-menu food-to-recipe mapping, save/unlink/export per mode. Tab renamed "Food Mapping".
3. **CR-474** — Date-Wise Sales Revenue Report (`/reports-module/sales-audit`): Day-by-day financial summary with dynamic restaurant title, 4 KPI cards, Recharts bar chart, daily table with footer totals, ₹ INR 2dp formatting, CSV+PDF export. Labels read dynamically from `data.columns[]`. Default MTD.

### Bugs Fixed
4. **BUG-614** — Preset discount category Apply fails: `handleApplyDiscount` in CPP now handles preset path (computes ₹ amount from category %, sends to API).
5. **BUG-615** — Flat discount exceeds order total: Input hard-caps flat at `discountableTotal`. Apply function clamps before API call.
6. **BUG-616** — Pie chart tooltip shows ₹0: Fixed `d.revenue` → `d.value || d.revenue` in ChannelPivotMockup tooltip.
7. **BUG-617** — 6 Insights reports empty data: Applied BUG-194 pattern (`salesData.data?.X || salesData.X`) to ChannelPivotMockup, SalesMockup, DailySalesMockup, HourlySalesMockup, DayOfWeekMockup, RoundOffMockup.

### Also Registered (NOT implemented — out of QA scope)
- **CR-473 backend brief** — `food_for` on recipe mapping endpoints (RESOLVED — backend deployed)
- **CR-472 backend brief** — `revenue_loss` field contract questions
- **CR-474 backend brief** — Label swap (Total Sales → Total Paid Revenue, Total Paid Revenue → Revenue Loss)
- **BUG-606** — Role-based discount socket data (BACKEND_BLOCKED — no FE change needed)

---

## TEST CREDENTIALS

| Restaurant | Email | Password | Role | RID |
|---|---|---|---|---|
| **Palm House** | owner@palmhouse.com | Qplazm@10 | Owner | 541 |
| **Ruby ZAP** | owner@ruby.com | Qplazm@10 | Owner | 672 |
| **Mantri** | owner@mantri.com | Qplazm@10 | Owner | — |
| **Kunafa Mahal** | owner@kunafamahal.com | Qplazm@10 | Owner | 689 |
| **Kunafa Mahal** | cashier@kunafamahal.com | Qplazm@10 | Cashier | 689 |

**Login endpoint:** `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
**Preview URL:** `https://pos-frontend-8.preview.emergentagent.com`
**Credentials file:** `/app/memory/test_credentials.md`

---

## QA BATCH PLAN — 4 Batches, 53 test cases

### Execution Order: BATCH-3 → BATCH-1 → BATCH-2 → BATCH-4
(Financial/HIGH risk first, LOW risk last)

---

### BATCH-3: Discount Bugs — BUG-614 + BUG-615 (HIGH RISK — financial logic)
**Restaurant:** Mantri (owner@mantri.com) — has `roleBaseDiscount=Yes` + preset discount categories
**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Route:** Dashboard → open/create order → Collect Payment panel

**Precondition:** Mantri restaurant must have:
- `roleBaseDiscount` enabled (confirmed by investigation)
- Preset discount categories (e.g., "Family — 50%") configured
- At least 1 active order or ability to create a new one (add any item, e.g., দহী ₹20)

| # | Test | Steps | Expected | Bug |
|---|---|---|---|---|
| D1 | Preset Apply works | Select "Family — 50%" from dropdown → click Apply | Discount applied, ₹ amount shown, Unapply button appears. No "Please enter discount amount" toast. | BUG-614 |
| D2 | Preset Unapply | After D1, click Unapply | Discount removed, Apply button returns | BUG-614 |
| D3 | Preset on zero-total | Open order with 0 items or ₹0 total → select preset → Apply | "Discount amount is zero" toast | BUG-614 |
| D4 | Manual % regression | Select "%", type 10, Apply on any order | ₹ discount applied correctly | BUG-614 |
| D5 | Manual ₹ regression | Select "₹", type 5, Apply | ₹5 discount applied | BUG-614 |
| D6 | Flat input hard-cap | Select "₹", type 40 on ₹20 order | Input auto-clamps to 20 | BUG-615 |
| D7 | Flat Apply cap | If somehow 40 in input, click Apply | API receives capped value (≤ order total) — check Network tab | BUG-615 |
| D8 | Percent 100 cap | Select "%", type 150 | Input auto-clamps to 100 (existing behavior preserved) | BUG-615 |
| D9 | Switch preset → manual | Select "Family 50%" → then select "₹" | Preset cleared, manual input appears | BUG-614 |

**Evidence required:** Screenshot of Apply working with preset + Network tab showing API payload for D7.

---

### BATCH-1: Reports — CR-472 + CR-474 (new report pages)
**Restaurant:** Palm House (owner@palmhouse.com)
**Routes:** `/reports-module/item-consumption` + `/reports-module/sales-audit`

#### CR-472 — Item Consumption Report

| # | Test | Steps | Expected |
|---|---|---|---|
| IC1 | Page loads MTD | Navigate to /reports-module/item-consumption | Page renders, MTD preset active, data loads |
| IC2 | Sidebar entry | Expand Daily Report in sidebar | "Item Consumption" visible below "Consumption Report" |
| IC3 | 5 KPI cards | Load MTD data | Total Items, Total Punched, Total Cancelled, Total Inv. Consumed, Revenue Loss — all with values |
| IC4 | Column headers | Check table | Columns: Item Name, Punched, Cancelled, Returned to Inv., Inv. Consumed, Inv. Loss, Revenue Loss |
| IC5 | Sorting | Click "Punched" header | Rows sort by punched qty. Click again → reverse. Sort icon changes. |
| IC6 | Expand row | Click any row with cancelled > 0 | 3 ingredient sub-tables appear (Consumed/Returned/Wastage) |
| IC7 | Collapse row | Click expanded row again | Sub-tables collapse |
| IC8 | Search filter | Type "Americano" | Only matching rows visible |
| IC9 | Clear search | Click Reset | All rows visible |
| IC10 | Preset 7D | Click 7D pill | Dates update, table reloads |
| IC11 | Preset 3M | Click 3M pill | Large dataset loads (~279 items for Palm House) |
| IC12 | Revenue Loss column | Check items with cancellations | ₹ values in red. Items without cancellations show ₹0 in grey. |
| IC13 | Revenue Loss KPI | Check 5th KPI card | Shows "—" if field absent OR ₹ sum if present |
| IC14 | Excel export | Click Excel button | CSV file downloads with correct headers and data |
| IC15 | PDF export | Click PDF button | Print dialog opens with formatted table |

#### CR-474 — Sales Audit Report

| # | Test | Steps | Expected |
|---|---|---|---|
| SA1 | Page loads MTD | Navigate to /reports-module/sales-audit | Dynamic title "The Palm House Report", MTD data, 4 KPIs, chart, table |
| SA2 | Sidebar entry | Expand Daily Report | "Sales Audit" below "Item Consumption" |
| SA3 | Dynamic title | Check header | Shows restaurant name from API (`data.header`), NOT hardcoded |
| SA4 | 4 KPI cards | Check values | Total Sales (blue), Total Cancelled (red), Total Discount (amber), Total Paid Revenue (green). Values match `data.summary`. |
| SA5 | Bar chart | Visual check | 4-color bars for each day. Hover tooltip shows all 4 amounts. |
| SA6 | Table daily rows | Count rows for Oct 1-26 | 26 rows, including zero-value days |
| SA7 | Footer totals | Check last row | Bold totals matching summary. Each column sum = footer value. |
| SA8 | Decimal precision | Check Total Discount | ₹44,818.80 preserved (not rounded) |
| SA9 | Preset 7D | Click 7D | 7 daily rows |
| SA10 | Custom range | Set Oct 1-26, Apply | 26 rows, known totals |
| SA11 | Excel export | Click Excel | CSV with all rows + totals row |
| SA12 | PDF export | Click PDF | Print dialog with table |
| SA13 | Error state | Enter reversed dates (to < from), Apply | Error message shown, NOT zero totals |

**Evidence required:** Screenshots of both pages with real data loaded.

---

### BATCH-2: Recipe Mapping — CR-473 (enhanced tab)
**Restaurants:** Ruby ZAP (owner@ruby.com) for 4 menus + Palm House for Normal menu
**Route:** `/recipes` → click "Food Mapping" tab (5th tab, was "Aggregator Inventory")

| # | Test | Steps | Expected |
|---|---|---|---|
| FM1 | Tab label | Navigate to /recipes | 5th tab reads "Food Mapping" (not "Aggregator Inventory") |
| FM2 | Mode pills | Click Food Mapping tab | Mode pills: Aggregator + Normal + Party + Premium (Ruby). NO duplicate "Aggregator". |
| FM3 | Aggregator mode | Click Aggregator pill | Aggregator foods load. Brand/client selector visible. Stats: "Total Aggregator Foods". |
| FM4 | Normal mode | Click Normal pill | Normal foods load (88 for Ruby, 284 for Palm House). Brand selector hidden. Stats: "Total Normal Foods". |
| FM5 | Premium mode | Click Premium pill | 1 food ("premi") loads for Ruby. |
| FM6 | Party mode (empty) | Click Party pill | 0 foods. Empty state message. |
| FM7 | Brand selector visibility | Switch Aggregator → Normal → Aggregator | Brand selector: visible → hidden → visible |
| FM8 | Search in menu mode | Select Normal, type search term | Filters Normal foods |
| FM9 | Map recipe | Select Normal, assign recipe to a food, Save All | Mapping saved, stats update (mapped count +1) |
| FM10 | Unlink recipe | Unlink a mapped Normal food | Recipe removed, stats update |
| FM11 | Export | Click Export XLSX with Normal selected | xlsx downloads for Normal menu |
| FM12 | Table header label | Select Premium | Header reads "Premium Food" (not "Aggregator Food") |

**Evidence required:** Screenshots of mode switching (Normal vs Aggregator), table header label change.

---

### BATCH-4: Insights Chart Fixes — BUG-616 + BUG-617 (LOW RISK)
**Restaurant:** Palm House (owner@palmhouse.com)
**Routes:** 6 pages under `/reports-module/`

| # | Test | Steps | Expected | Page |
|---|---|---|---|---|
| CH1 | Tooltip ₹ value | Channel Pivot → hover Dine-In pie slice | Tooltip shows real ₹ amount (e.g., ₹19,39,064), NOT ₹0 | ChannelPivotMockup |
| CH2 | Channel data | Channel Pivot → check KPI cards + pie slices | Revenue values populated (not zero/empty) | ChannelPivotMockup |
| CH3 | Sales Overview | Navigate to Sales Overview | Daily bars + channel pie + payment pie + KPIs all populated | SalesMockup |
| CH4 | Daily Sales | Navigate to Daily Sales | Daily trend bars render with revenue | DailySalesMockup |
| CH5 | Hourly Sales | Navigate to Hourly Sales | Hourly bars render with revenue | HourlySalesMockup |
| CH6 | Day of Week | Navigate to Day of Week | Day-of-week bars render | DayOfWeekMockup |
| CH7 | Round-Off | Navigate to Round-Off | Total Revenue + Total Orders KPIs show values (not 0) | RoundOffMockup |

**Evidence required:** Screenshot of Channel Pivot tooltip showing real ₹ value.

---

## REGRESSION TESTS (cross-batch)

| # | What | Why |
|---|---|---|
| R1 | Existing Consumption Report (/reports-module/consumption-report) loads | Sidebar + service file modified by CR-472 |
| R2 | P&L Report (/reports-module/profit-loss) loads | Same sidebar section |
| R3 | PaymentsMockup (/reports-module/payments) still works | BUG-617 didn't touch it (BUG-194 fix preserved) |
| R4 | Aggregator mode in Food Mapping still works end-to-end | CR-473 must not break existing CR-119 flow |
| R5 | Order flow — place order, collect payment without discount | BUG-614/615 modified handleApplyDiscount; non-discount payment must be unaffected |

---

## FILES CHANGED (for coverage audit)

| File | Items | Type |
|---|---|---|
| `src/api/constants.js` | CR-472, CR-474 | +2 endpoint constants |
| `src/api/services/inventoryService.js` | CR-472, CR-474 | +2 service functions |
| `src/api/services/recipeService.js` | CR-473 | +5 service functions |
| `src/components/layout/Sidebar.jsx` | CR-472, CR-474 | +2 nav entries |
| `src/App.js` | CR-472, CR-474 | +2 imports, +2 routes |
| `src/pages/reports-module/ItemConsumptionReportPage.jsx` | CR-472 | NEW file |
| `src/pages/reports-module/SalesAuditPage.jsx` | CR-474 | NEW file |
| `src/components/inventory/AggregatorInventoryTab.jsx` | CR-473 | Mode switching, menu dropdown |
| `src/components/inventory/RecipeManagementPanel.jsx` | CR-473 | Tab label rename |
| `src/components/order-entry/CollectPaymentPanel.jsx` | BUG-614, BUG-615 | handleApplyDiscount + input cap |
| `src/pages/reports-module/ChannelPivotMockup.jsx` | BUG-616, BUG-617 | Tooltip + data path |
| `src/pages/reports-module/SalesMockup.jsx` | BUG-617 | Data path |
| `src/pages/reports-module/DailySalesMockup.jsx` | BUG-617 | Data path |
| `src/pages/reports-module/HourlySalesMockup.jsx` | BUG-617 | Data path |
| `src/pages/reports-module/DayOfWeekMockup.jsx` | BUG-617 | Data path |
| `src/pages/reports-module/RoundOffMockup.jsx` | BUG-617 | Data path |

**Total: 16 files changed, 7 items.**

---

## KNOWN ISSUES / CAVEATS FOR QA AGENT

1. **App boot takes ~35 seconds** — after login, the loading screen (Profile, Categories, Products, Tables, Settings, Running Orders, Popular Items, Aggregator Orders, Kitchen Stations) takes ~35s before redirecting to dashboard. Playwright scripts must wait accordingly.
2. **Session timeout** — browser sessions expire if idle. Login fresh for each batch.
3. **Revenue Loss field (CR-472)** — `revenue_loss` IS present in the API response (confirmed via curl probe). If the field appears as "—" it means the data was null for that item.
4. **CR-474 dynamic labels** — KPI card labels, chart legends, and table headers all read from `data.columns[].label`. They show whatever the backend sends. Currently: "Total Sales", "Total Cancelled", "Total Discount", "Total Paid Revenue".
5. **webpack warning** — `KPI_CONFIG` lint warning in SalesAuditPage is cosmetic, not functional. Ignore.
6. **CR-473 Aggregator duplicate** — Fixed: menus with name "Aggregator" are filtered from the pills. But if a restaurant has NO menu named "Aggregator" in menu-master, this filter is a no-op (safe).
7. **BUG-614/615 requires roleBaseDiscount=Yes** — Only Mantri (owner@mantri.com) is confirmed to have this setting. Palm House / Ruby may not show the Apply button.

---

## HANDOVER ARTIFACTS

| Artifact | Path |
|---|---|
| CR-472 QA Handover | `memory/handover/QA_HANDOVER_CR472_2026_10_26.md` |
| CR-472 Impact Analysis | `memory/impact/CR-472_IMPACT_ANALYSIS.md` |
| CR-472 Implementation Plan | `memory/plans/CR-472_IMPLEMENTATION_PLAN.md` |
| CR-473 Impact Analysis | `memory/impact/CR-473_IMPACT_ANALYSIS.md` |
| CR-473 Implementation Plan | `memory/plans/CR-473_IMPLEMENTATION_PLAN.md` |
| CR-474 Impact Analysis | `memory/impact/CR-474_IMPACT_ANALYSIS.md` |
| CR-474 Implementation Plan | `memory/plans/CR-474_IMPLEMENTATION_PLAN.md` |
| BUG-614+615 Impact Analysis | `memory/impact/BUG-614_615_IMPACT_ANALYSIS.md` |
| BUG-614+615 Implementation Plan | `memory/plans/BUG-614_615_IMPLEMENTATION_PLAN.md` |
| BUG-616+617 Impact Analysis | `memory/impact/BUG-616_617_IMPACT_ANALYSIS.md` |
| BUG-616+617 Implementation Plan | `memory/plans/BUG-616_617_IMPLEMENTATION_PLAN.md` |
| Backend Brief CR-472 | `memory/backend_briefs/BACKEND_BRIEF_CR-472_REVENUE_LOSS_FIELD_2026_10_26.md` |
| Backend Brief CR-473 | `memory/backend_briefs/BACKEND_BRIEF_CR-473_FOOD_FOR_NOT_ACTIVE_2026_10_26.md` |
| Backend Brief CR-474 | `memory/backend_briefs/BACKEND_BRIEF_CR-474_LABEL_SWAP_2026_10_26.md` |
| Test Credentials | `memory/test_credentials.md` |
| Registry | `memory/control/registry.json` (971 items) |

---

## NEXT AGENT INSTRUCTIONS

1. **Pick QA role** from AGENT_PROMPT_ALPHA.md
2. **Read this handover** + test credentials
3. **Execute BATCH-3 first** (financial risk — Mantri restaurant)
4. **Then BATCH-1** → **BATCH-2** → **BATCH-4**
5. For each batch: execute all test cases, record PASS/FAIL with severity, capture screenshots as evidence
6. **Do NOT fix code** — QA agent reports only
7. File findings as bugs if BLOCKER/MAJOR
8. Write QA Report at `memory/test_reports/QA_REPORT_POST_OCT23_BATCH_2026_10_26.md`
