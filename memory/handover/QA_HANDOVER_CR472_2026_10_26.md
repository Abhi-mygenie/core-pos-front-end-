# CR-472 — QA Handover

**Item:** CR-472 — Item Consumption Report
**Date:** 2026-10-26
**Status:** GATE_5A_IMPLEMENTED
**Risk:** MEDIUM

---

## 1. Inherited from Plan (Verification Matrix results)

| Edit | File | Verification | Self-Test Result |
|------|------|-------------|:---:|
| E1 | constants.js L240 | ITEM_CONSUMPTION_REPORT constant exists | ✅ grep confirmed |
| E2 | inventoryService.js L184-188 | getItemConsumptionReport() exists | ✅ grep confirmed |
| E3 | Sidebar.jsx L100 | "Item Consumption" below "Consumption Report" | ✅ Screenshot |
| E4 | App.js L53+L246 | Route /reports-module/item-consumption loads | ✅ Screenshot |
| E5 | ItemConsumptionReportPage.jsx | Full page with real data | ✅ 3M data: 279 items, 17088 sold, 744 cancelled |

Self-test: 5/5 edits verified. webpack compiled successfully.

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T1 | Page loads with 3M default | Navigate to /reports-module/item-consumption | 3M preset active, data loads, 5 KPI cards show totals |
| T2 | Sidebar entry | Expand "Daily Report" in sidebar | "Item Consumption" visible below "Consumption Report" |
| T3 | Date apply | Change from/to dates, click Apply | Table reloads with new date range |
| T4 | Preset Today | Click "Today" pill | Dates set to today, table reloads |
| T5 | Preset 7D | Click "7D" pill | Dates set to 7 days, table reloads |
| T6 | Preset 30D | Click "30D" pill | Dates set to 30 days, table reloads |
| T7 | Preset MTD | Click "MTD" pill | Dates set to month start, table reloads |
| T8 | Expand row with ingredients | Click "Americano (Long Black)" | 3 sub-tables: Consumed (Blue Tokai 11.34 kg), Returned (Blue Tokai 252 gm), Wastage (none) |
| T9 | Expand row without ingredients | Click "Avocado and Feta Toast" | 3 sub-tables all showing "No consumed/returned/wastage ingredients" |
| T10 | Collapse row | Click expanded row again | Sub-tables hide |
| T11 | Search filter | Type "Americano" in search | Only matching rows visible |
| T12 | Clear search | Click Reset button | All rows visible again |
| T13 | Excel export | Click "Excel" button | CSV file downloads with correct headers and data |
| T14 | PDF export | Click "PDF" button | New window opens with printable table |
| T15 | KPI totals correct | Load 3M data | Total Items=279, Sold=17088, Cancelled=744, Consumed=16643, Revenue Loss=₹62,620 |
| T16 | Revenue Loss column | Check items with cancellations | ₹ values in red (e.g., Americano ₹420, Avocado and Feta Toast ₹2,100) |
| T17 | Revenue Loss zero | Check items without cancellations | Shows ₹0 in grey |
| T18 | Empty date range | Apply with future dates (2027-01-01 to 2027-01-02) | "No data for selected filters" empty state |
| T19 | Color badges | Check cancelled/returned/wastage columns | Red badge for cancelled > 0, blue for returned > 0, amber for wastage > 0, plain "0" for zero |
| T20 | Back button | Click ← back arrow | Navigates to previous page |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|------|------|
| R1 | Existing Consumption Report (/reports-module/consumption-report) still loads correctly | Shared sidebar + service file modified |
| R2 | Other Daily Report entries (P&L, Sales Summary, Order Report) still navigate correctly | Sidebar children array modified |
| R3 | App.js routes — dashboard, reports, inventory all load | App.js import + route added |

---

## 4. Registry Sync Confirmation

Registry synced: YES
Items: CR-472
Sprint: nov_cr_batch
EXIT GATE: ALL 5 PASSED
- [x] registry.json: CR-472 → GATE_5A_IMPLEMENTED
- [x] CR_REGISTRY.md: row updated
- [x] FILE_OWNERSHIP.md: 5 files listed
- [x] Code markers: 24 `// CR-472` markers across 4 files
- [x] Compile check: webpack compiled successfully, 0 new warnings

---

## 5. Credentials + Environment

- Account: owner@palmhouse.com / Qplazm@10
- Restaurant: The Palm House (RID 541)
- Preview URL: https://pos-frontend-8.preview.emergentagent.com
- Route: /reports-module/item-consumption
- API: POST https://preprod.mygenie.online/api/v2/vendoremployee/report/item-consumption-report
