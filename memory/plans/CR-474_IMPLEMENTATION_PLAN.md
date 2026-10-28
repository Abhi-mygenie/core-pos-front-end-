# CR-474 — Implementation Plan

**Item:** CR-474 — Date-Wise Sales Revenue Report (sidebar name: "Sales Audit")
**Stage:** Gate 3 — Implementation Plan
**Code Reality:** NONE
**Risk:** MEDIUM
**Scope Lock:** Files WILL change: `constants.js`, `inventoryService.js`, `Sidebar.jsx`, `App.js`, NEW `SalesAuditPage.jsx`. Files WILL NOT touch: any existing report page, order-entry, dashboard, PMS, financial, recipe, or socket file.

---

## Execution Sequence

**Order: E1 → E2 → E3 → E4 → E5 → compile check**

E1–E4 are independent additive lines (batch in parallel). E5 depends on E1+E2. All 5 safe to batch.

---

## E1: constants.js — Add Endpoint

**File:** `src/api/constants.js`
**Action:** Insert 1 line after L240 (after ITEM_CONSUMPTION_REPORT, before closing `}`)
**Current L240-241:**
```js
  ITEM_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/item-consumption-report', // CR-472
};
```
**New:**
```js
  ITEM_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/item-consumption-report', // CR-472
  DATEWISE_SALES_REVENUE: '/api/v2/vendoremployee/report/datewise-sales-revenue', // CR-474
};
```

---

## E2: inventoryService.js — Add Service Function

**File:** `src/api/services/inventoryService.js`
**Action:** Insert after `getItemConsumptionReport` (after L188)
```js
// CR-474: Date-Wise Sales Revenue Report (Sales Audit)
export async function getDateWiseSalesRevenue({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.DATEWISE_SALES_REVENUE, { from_date, to_date });
  return res.data;
}
```

---

## E3: Sidebar.jsx — Add Nav Entry

**File:** `src/components/layout/Sidebar.jsx`
**Action:** Insert after L100 (below Item Consumption)
**Current L100:**
```js
      { id: "item-consumption", label: "Item Consumption", path: "/reports-module/item-consumption" }, // CR-472
```
**Insert after:**
```js
      { id: "sales-audit", label: "Sales Audit", path: "/reports-module/sales-audit" }, // CR-474
```

---

## E4: App.js — Add Import + Route

**Import — insert after L53:**
```js
import SalesAuditPage from "./pages/reports-module/SalesAuditPage"; // CR-474
```

**Route — insert after L246:**
```js
              <Route path="sales-audit" element={<ProtectedRoute><SalesAuditPage /></ProtectedRoute>} /> {/* CR-474 */}
```

---

## E5: SalesAuditPage.jsx — NEW FILE (~400 lines)

**File:** `src/pages/reports-module/SalesAuditPage.jsx`
**Pattern:** Mirrors `ItemConsumptionReportPage.jsx` (CR-472) for layout/dates/presets/exports. Adds Recharts bar chart (mirrors `PLReportPage.jsx` chart pattern).

### Imports
```js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, Layers, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { getDateWiseSalesRevenue } from '@/api/services/inventoryService';
import Sidebar from '@/components/layout/Sidebar';
```

### State
```
- Sidebar: isSidebarExpanded (BUG-361 localStorage pattern)
- Dates: fromDate, toDate, appliedFrom, appliedTo, activePreset='MTD' (BUG-261 pattern)
- Data: reportData (full response.data), loading, hasFetched, error
```

### Fetch
```
fetchReport() → getDateWiseSalesRevenue({ from_date, to_date })
  → setReportData(res.data) — stores full data object
  → error handling: toast.error with API message, set error state
  → useEffect on [appliedFrom, appliedTo]
```

### Computed values (useMemo)
```
- daily = reportData?.daily || []
- summary = reportData?.summary || {}
- header = reportData?.header || 'Sales Audit'
- fmtINR = Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', minimumFractionDigits:2, maximumFractionDigits:2 })
- chartData = daily.map(d => ({ ...d, label: formatDateLabel(d.date) }))
```

### INR Formatter
```js
const fmtINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(v) || 0);
const fmtDateLabel = (d) => { const [,m,day] = d.split('-'); const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${parseInt(day)} ${months[parseInt(m)]}`; };
```

### Render Structure
```jsx
<div data-testid="sales-audit-report-page">
  <Sidebar />
  <div>
    {/* HEADER: dynamic title from data.header + date subtitle + Excel/PDF */}
    {/* DATE BAR: From/To + Apply + presets (Today, 7D, 30D, MTD) */}
    {/* KPI STRIP: 4 cards from summary{} */}
    {/*   Total Sales (blue #3B82F6) */}
    {/*   Total Cancelled (red #EF4444) — value in red text */}
    {/*   Total Discount (amber #F59E0B) — value in amber text */}
    {/*   Total Paid Revenue (green #329937) — value in green text */}
    {/* CHART: Recharts BarChart, height 300 */}
    {/*   Bars: total_sales (blue), total_paid_revenue (green) */}
    {/*   Bars: total_cancelled (red), total_discount (amber) */}
    {/*   XAxis: date labels (e.g., "1 Oct"), YAxis: INR abbreviations (k/L) */}
    {/*   Custom tooltip with full 4-column ₹ breakdown */}
    {/* TABLE: 5 columns from data.columns[] */}
    {/*   Date | Total Sales | Total Cancelled | Total Discount | Total Paid Revenue */}
    {/*   Rows from data.daily[] — all amounts ₹ formatted with 2 decimals */}
    {/*   Cancelled in red, Discount in amber, Paid Revenue in green */}
    {/*   Footer totals from data.summary{} — bold, border-top-2 */}
    {/* EMPTY/LOADING/ERROR states */}
  </div>
</div>
```

### Export (same patterns as CR-472)
```
handleExportExcel():
  Headers from data.columns[].label
  Rows from daily[] — amounts as numbers for CSV
  Totals row from summary{}
  Filename: sales-audit-{from}-{to}.csv

handleExportPDF():
  window.open + document.write + print
  Title: data.header
  Subtitle: date range + "Sales Audit"
  Table: all daily rows + totals
```

### data-testid Mapping
```
page:           sales-audit-report-page
header:         sales-audit-header
back button:    sales-audit-back-btn
title:          sales-audit-title
from date:      sales-audit-date-from
to date:        sales-audit-date-to
apply:          sales-audit-apply-btn
presets:        sales-audit-preset-{today|7d|30d|mtd}
kpi cards:      sales-audit-kpi-{total-sales|total-cancelled|total-discount|total-paid}
chart:          sales-audit-trend-chart
table:          sales-audit-table
export excel:   sales-audit-export-excel
export pdf:     sales-audit-export-pdf
daily row:      sales-audit-row-{date}
```

---

## Verification Matrix

| # | Edit | Verification | Method |
|---|---|---|---|
| V1 | E1 | `grep DATEWISE_SALES_REVENUE constants.js` | CLI |
| V2 | E2 | `grep getDateWiseSalesRevenue inventoryService.js` | CLI |
| V3 | E3 | Sidebar: "Sales Audit" below "Item Consumption" | Browser |
| V4 | E4 | Navigate to /reports-module/sales-audit → page loads | Browser |
| V5 | E5 | MTD data loads: dynamic title "The Palm House Report" | Browser |
| V6 | E5 | 4 KPI cards with correct totals from summary{} | Browser |
| V7 | E5 | Bar chart renders 26 daily bars | Browser |
| V8 | E5 | Table: 26 rows + footer totals, ₹44,818.80 preserves decimals | Browser |
| V9 | E5 | Excel export downloads CSV with all rows + totals | Browser |
| V10 | E5 | PDF export opens print dialog | Browser |
| V11 | ALL | webpack compiles, 0 new warnings | CLI |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-474 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] CR_REGISTRY.md: CR-474 row updated
- [ ] FILE_OWNERSHIP.md: 5 files listed
- [ ] Code markers: // CR-474 in every modified file
- [ ] Compile check: webpack 0 new warnings
```

---

## QA Handover Seeds

| # | Test | Steps | Expected |
|---|---|---|---|
| T1 | Page loads MTD | Navigate to /reports-module/sales-audit | Dynamic title, MTD data, 4 KPIs, chart, table |
| T2 | Sidebar entry | Expand Daily Report | "Sales Audit" below "Item Consumption" |
| T3 | Preset Today | Click Today pill | Single-day data |
| T4 | Preset 7D | Click 7D pill | 7 daily rows |
| T5 | Preset 30D | Click 30D pill | 30 daily rows |
| T6 | Custom range | Set Oct 1-26, Apply | 26 rows, totals match ₹11,52,590 / ₹49,130 / ₹44,818.80 / ₹11,02,870 |
| T7 | Zero-value day | Check a low-activity day | Row present with ₹0.00 values, not omitted |
| T8 | Decimal precision | Check Total Discount in KPI + footer | ₹44,818.80 (not rounded to ₹44,819) |
| T9 | Chart hover | Hover over a bar | Tooltip shows all 4 amounts for that date |
| T10 | Excel export | Click Excel | CSV downloads with all rows + totals |
| T11 | PDF export | Click PDF | Print dialog with formatted table |
| T12 | Error state | Apply reversed dates (to < from) | Error message shown, not zero totals |
| T13 | Back button | Click ← | Navigates back |

---

## Gate Status

- Gate 2: COMPLETE (Impact Analysis)
- Gate 3: **COMPLETE** (this document)
- Gate 4: Awaiting owner "Gate 4 GO" → Implementation
