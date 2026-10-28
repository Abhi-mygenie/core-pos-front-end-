# CR-472 — Implementation Plan

**Item:** CR-472 — Item Consumption Report (Sales Consumption)
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** NONE
**Risk:** MEDIUM
**Prerequisite:** Gate 2 Impact Analysis complete, all 7 ODs locked.
**Scope Lock:** Files WILL change: `constants.js`, `inventoryService.js`, `Sidebar.jsx`, `App.js`, NEW `ItemConsumptionReportPage.jsx`. Files WILL NOT touch: `ConsumptionReportPage.jsx`, `inventoryTransform.js`, any order-entry/dashboard/PMS/financial/recipe/socket file.

---

## Execution Sequence

**Order: E1 → E2 → E3 → E4 → E5 → compile check**

E1–E4 are independent additive lines (can be done in parallel). E5 depends on E1+E2 (needs the constant + service function). All 5 are safe to batch.

---

## E1: constants.js — Add Endpoint Constant

**File:** `src/api/constants.js`
**Action:** Insert 1 line after L239
**Current L239:**
```js
  DAILY_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/daily-consumption-report',
```
**Insert after L239:**
```js
  ITEM_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/item-consumption-report', // CR-472
```
**Lines changed:** +1
**Risk:** LOW — additive, inside `REPORT_ENDPOINTS` object

---

## E2: inventoryService.js — Add Service Function

**File:** `src/api/services/inventoryService.js`
**Action:** Insert 5 lines after L181 (after the closing `}` of `getDailyConsumptionReport`)
**Current L179–181:**
```js
export async function getDailyConsumptionReport({ from_date, to_date, ...rest }) {
  const res = await api.post(REPORT_ENDPOINTS.DAILY_CONSUMPTION_REPORT, { from_date, to_date, ...rest });
  return res.data;
}
```
**Insert after L182 (blank line after `}`):**
```js
// CR-472: Item Consumption Report — menu-item-level sold/cancelled/returned/wastage/consumed + revenue_loss
export async function getItemConsumptionReport({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.ITEM_CONSUMPTION_REPORT, { from_date, to_date });
  return res.data;
}
```
**Lines changed:** +5 (including blank line separator)
**Risk:** LOW — additive, mirrors existing function exactly

---

## E3: Sidebar.jsx — Add Nav Entry

**File:** `src/components/layout/Sidebar.jsx`
**Action:** Insert 1 line after L99
**Current L99:**
```js
      { id: "consumption-report", label: "Consumption Report", path: "/reports-module/consumption-report" }, // CR-093
```
**Insert after L99:**
```js
      { id: "item-consumption", label: "Item Consumption", path: "/reports-module/item-consumption" }, // CR-472
```
**Lines changed:** +1
**Risk:** LOW — additive, inside `children` array of "Daily Report" group. Permission inherited from parent group (`permission: 'report'` at L93, gated via `permissionMap` at L47).

---

## E4: App.js — Add Import + Route

**File:** `src/App.js`
**Action A — Import:** Insert 1 line after L52
**Current L52:**
```js
import ConsumptionReportPage from "./pages/reports-module/ConsumptionReportPage"; // CR-093
```
**Insert after L52:**
```js
import ItemConsumptionReportPage from "./pages/reports-module/ItemConsumptionReportPage"; // CR-472
```

**Action B — Route:** Insert 1 line after L244
**Current L244:**
```js
              <Route path="consumption-report" element={<ProtectedRoute><ConsumptionReportPage /></ProtectedRoute>} />
```
**Insert after L244:**
```js
              <Route path="item-consumption" element={<ProtectedRoute><ItemConsumptionReportPage /></ProtectedRoute>} /> {/* CR-472 */}
```
**Lines changed:** +2 (1 import + 1 route)
**Risk:** LOW — additive, inside existing `reports-module/*` Routes block wrapped by `InsightsCacheProvider`

---

## E5: ItemConsumptionReportPage.jsx — NEW FILE

**File:** `src/pages/reports-module/ItemConsumptionReportPage.jsx`
**Action:** Create new file (~350–400 lines)
**Pattern:** Mirrors `ConsumptionReportPage.jsx` (CR-093) structure. Reference: `PLReportPage.jsx` for PDF pattern.

### Component Structure

```
export default function ItemConsumptionReportPage() {
  // ── State ──
  // Sidebar: isSidebarExpanded (localStorage persist, BUG-361 pattern)
  // Dates: fromDate, toDate, appliedFrom, appliedTo, activePreset (BUG-261 pattern)
  // Data: items[], loading, hasFetched
  // UI: expandedRows {}, itemSearch ''
  
  // ── Date helpers ──
  // toISO, today, monthStart — same as ConsumptionReportPage
  
  // ── Preset handler ──
  // applyPreset(preset) — Today/7D/30D/MTD — same pattern as ConsumptionReportPage
  // handleDateApply() — sets appliedFrom/appliedTo
  // draftDirty, draftValid, canApply — same logic
  
  // ── Fetch ──
  // fetchReport() — calls getItemConsumptionReport({ from_date: appliedFrom, to_date: appliedTo })
  //   → setItems(data.items || [])
  //   → setHasFetched(true), setExpandedRows({})
  // useEffect on [appliedFrom, appliedTo] triggers fetchReport + initial load
  
  // ── Client-side filter ──
  // filteredItems = items.filter(item_name includes itemSearch)
  
  // ── KPIs (useMemo on filteredItems) ──
  // totalItems: filteredItems.length
  // totalSold: sum(sold_qty)
  // totalCancelled: sum(canceled_qty)
  // totalConsumed: sum(consumed_qty)
  // totalRevenueLoss: sum(revenue_loss || 0)  ← graceful fallback if field absent
  
  // ── Toggle drill-down ──
  // toggleRow(food_id) — same pattern as ConsumptionReportPage
  
  // ── Export Excel (CSV) ──
  // handleExportExcel() — same blob pattern as ConsumptionReportPage L142-154
  // Headers: Item Name, Sold, Cancelled, Returned, Wastage, Consumed, Revenue Loss
  // Rows: filteredItems mapped to CSV
  // Filename: item-consumption-{appliedFrom}-{appliedTo}.csv
  
  // ── Export PDF ──
  // handleExportPDF() — same window.open+print pattern as ConsumptionReportPage L157-183
  // Title: "Item Consumption Report"
  // Columns: Item Name, Sold, Cancelled, Returned, Wastage, Consumed, Revenue Loss
  
  // ── Render ──
  return (
    <div className="flex min-h-screen bg-slate-50" data-testid="item-consumption-report-page">
      <Sidebar ... /> {/* BUG-361 pattern */}
      <div className="flex-1 flex flex-col overflow-hidden"> {/* BUG-539 pattern */}
        <div className="px-6 py-6">
          
          {/* HEADER: back btn + title + subtitle + Excel/PDF buttons */}
          
          {/* DATE BAR: from/to inputs + Apply + preset pills + search input */}
          {/* Pattern: identical to ConsumptionReportPage L196-230 */}
          
          {/* KPI STRIP: 5 cards */}
          {/* grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5 */}
          {/* Cards: Total Items (orange), Total Sold (blue), Total Cancelled (red), 
                     Total Consumed (green), Revenue Loss (dark red) */}
          {/* Revenue Loss card: value formatted as ₹ with Intl.NumberFormat('en-IN') */}
          
          {/* TABLE */}
          {/* Columns: [chevron] Item Name | Sold | Cancelled | Returned | Wastage | Consumed | Revenue Loss */}
          {/* Row hover: hover:bg-orange-50 cursor-pointer */}
          {/* Cancelled/Returned/Wastage: colored badges (red/blue/amber) when > 0, plain "0" when 0 */}
          {/* Consumed: font-bold text-emerald-600 */}
          {/* Revenue Loss: font-semibold text-red-600 for > 0, text-slate-400 for 0 */}
          {/* Formatted: fmtINR(item.revenue_loss) or "—" if field absent */}
          
          {/* EXPANDED ROW (when expandedRows[food_id]) */}
          {/* colspan=8, bg-orange-50/20 */}
          {/* ml-10 grid grid-cols-1 md:grid-cols-3 gap-3 */}
          {/* 3 sub-table cards: */}
          {/*   Consumed Ingredients — emerald header, emerald qty color */}
          {/*   Returned Ingredients — blue header, blue qty color */}
          {/*   Wastage Ingredients — amber header, amber qty color */}
          {/* Each sub-table: Ingredient Name | Quantity | Unit */}
          {/* Empty state: "No [consumed/returned/wastage] ingredients" centered */}
          
          {/* EMPTY STATES */}
          {/* !hasFetched: "Select a date range and click Apply" */}
          {/* hasFetched && filteredItems.length === 0: "No data for selected filters" */}
          {/* loading: Loader2 spinner + "Loading item consumption data…" */}
          
        </div>
      </div>
    </div>
  );
}
```

### Imports Required
```js
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Download, FileText, Loader2, Layers, Calendar as CalendarIcon, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getItemConsumptionReport } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';
```

### INR Formatter
```js
const fmtINR = (v) => {
  const n = parseFloat(v) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};
```

### data-testid Mapping
```
page:                  item-consumption-report-page
back button:           item-consumption-back-btn
export excel:          item-consumption-export-excel
export pdf:            item-consumption-export-pdf
from date input:       item-consumption-from-date
to date input:         item-consumption-to-date
apply button:          item-consumption-apply-btn
preset pills:          item-consumption-preset-{today|7d|30d|mtd}
search input:          item-consumption-search-input
kpi cards:             item-consumption-kpi-{total-items|total-sold|total-cancelled|total-consumed|revenue-loss}
table wrapper:         item-consumption-table-wrap
item row:              item-consumption-row-{food_id}
drill-down row:        item-consumption-drill-{food_id}
sub-table consumed:    item-consumption-subtable-consumed-{food_id}
sub-table returned:    item-consumption-subtable-returned-{food_id}
sub-table wastage:     item-consumption-subtable-wastage-{food_id}
```

### Revenue Loss Graceful Fallback
```js
// If backend hasn't deployed revenue_loss yet, show "—"
const revLoss = item.revenue_loss != null ? fmtINR(item.revenue_loss) : '—';
```

---

## Verification Matrix

| # | Edit | File | Verification | Method | Self-test |
|---|---|---|---|---|---|
| V1 | E1 | constants.js | `grep ITEM_CONSUMPTION_REPORT src/api/constants.js` returns 1 hit | CLI | — |
| V2 | E2 | inventoryService.js | `grep getItemConsumptionReport src/api/services/inventoryService.js` returns 1 hit | CLI | — |
| V3 | E3 | Sidebar.jsx | Browser: sidebar "Daily Report" shows "Item Consumption" below "Consumption Report" | Browser | Screenshot |
| V4 | E4 | App.js | Browser: navigate to `/reports-module/item-consumption` → page loads (no 404) | Browser | Screenshot |
| V5 | E5 | ItemConsumptionReportPage.jsx | Browser: select dates → Apply → table populates with 7 items | Browser | Screenshot |
| V6 | E5 | ItemConsumptionReportPage.jsx | Click Americano row → 3 ingredient sub-tables expand | Browser | Screenshot |
| V7 | E5 | ItemConsumptionReportPage.jsx | KPI cards show correct totals (sum of visible items) | Browser | Visual |
| V8 | E5 | ItemConsumptionReportPage.jsx | Revenue Loss column shows ₹ values or "—" if field absent | Browser | Visual |
| V9 | E5 | ItemConsumptionReportPage.jsx | Search filter narrows table rows by item name | Browser | Visual |
| V10 | E5 | ItemConsumptionReportPage.jsx | Excel button downloads CSV file | Browser | File check |
| V11 | E5 | ItemConsumptionReportPage.jsx | PDF button opens print dialog | Browser | Visual |
| V12 | ALL | — | `yarn build` exits 0, no new warnings from CR-472 files | CLI | — |

---

## Post-Code Registry Checklist

After coding, the Implementation agent MUST execute:

```
- [ ] registry.json: CR-472 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-472 row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add files — constants.js (E1), inventoryService.js (E2), 
      Sidebar.jsx (E3), App.js (E4), ItemConsumptionReportPage.jsx (E5)
- [ ] Code markers: // CR-472 comment in every modified file (E1–E4) and new file header (E5)
- [ ] Compile check: webpack 0 new warnings from CR-472 changes
```

---

## QA Handover Seeds (for Implementation agent to inherit)

| # | Test Case | Steps | Expected |
|---|---|---|---|
| T1 | Page loads | Navigate to /reports-module/item-consumption | Page renders with empty state "Select a date range" |
| T2 | Sidebar entry | Expand Daily Report in sidebar | "Item Consumption" visible below "Consumption Report" |
| T3 | Date apply | Set from=2026-10-20, to=2026-10-25, click Apply | Table populates with items, KPIs update |
| T4 | Preset 7D | Click "7D" preset pill | Dates auto-set, table reloads |
| T5 | Expand row | Click any row with canceled_qty > 0 | 3 ingredient sub-tables appear |
| T6 | Collapse row | Click expanded row again | Sub-tables collapse |
| T7 | Search filter | Type "Americano" in search | Only matching rows visible |
| T8 | Excel export | Click Excel button with data loaded | CSV file downloads |
| T9 | PDF export | Click PDF button with data loaded | Print dialog opens |
| T10 | Revenue Loss KPI | Load data | 5th KPI card shows sum of revenue_loss (or "—" if field absent) |
| T11 | Revenue Loss column | Load data with cancellations | ₹ values in red for items with loss, ₹0 in grey for items without |
| T12 | Empty date range | Apply with future dates where no data exists | "No data for selected filters" empty state |

---

## Gate Status

- Gate 2: COMPLETE (Impact Analysis)
- Gate 3: **COMPLETE** (this document)
- Gate 4: Awaiting owner "Gate 4 GO" → Implementation
