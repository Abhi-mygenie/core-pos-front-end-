# CR-136 — Implementation Plan
# Item Sales Ledger (Backend-Aggregated Item Performance Report)

**Gate:** 3 — Implementation Plan
**Date:** 2026-08-12
**Depends on:** CR-136 Impact Analysis (Gate 2, FROZEN 2026-08-12)
**Awaiting:** Gate 4 GO

---

## Pre-Code Verification (Entry Check)

All starting states confirmed live 2026-08-12:

| File | Expected state | Verified |
|---|---|---|
| `constants.js:117` | `ORDER_LOGS_REPORT: '/api/v2/vendoremployee/report/order-logs-report',` | ✅ |
| `App.js:50` | `import ConsumptionReportPage from "./pages/reports-module/ConsumptionReportPage"; // CR-093` | ✅ |
| `App.js:138` | `<Route path="food-court/preview" element={<FoodCourtMockup />} />` | ✅ |
| `Sidebar.jsx:151` | `{ id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },` | ✅ |
| `item-sales` route | does NOT exist | ✅ |
| `topFoodSalesService.js` | does NOT exist | ✅ |
| `ItemSalesLedgerMockup.jsx` | does NOT exist | ✅ |

**API endpoint verified live:**
- URL: `POST https://preprod.mygenie.online/api/v1/vendoremployee/top-food%20sales-report`
- Auth: Bearer token (same `auth_token` from localStorage)
- All 14 response fields (root + row) are **strings** — `parseFloat()` mandatory on all

---

## Scope Lock

**Files WILL change:**
1. `src/api/constants.js` — +1 line
2. `src/api/services/topFoodSalesService.js` — NEW (~75 lines)
3. `src/pages/reports-module/ItemSalesLedgerMockup.jsx` — NEW (~580 lines)
4. `src/App.js` — +3 lines (import + 2 routes)
5. `src/components/layout/Sidebar.jsx` — +1 line

**Files WILL NOT touch:**
`OrderLedgerMockup.jsx`, `orderLedgerService.js`, `ItemSalesHybridMockup.jsx`,
`insightsService.js`, `foodCourtService.js`, `reportTransform.js`, `orderTransform.js`,
`CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `LoadingPage.jsx`

---

## Edit 1 — `src/api/constants.js` (+1 line)

**After line 117** (`ORDER_LOGS_REPORT: ...`):

```javascript
// current line 117:
ORDER_LOGS_REPORT: '/api/v2/vendoremployee/report/order-logs-report',
// INSERT after:
TOP_FOOD_SALES_REPORT: '/api/v1/vendoremployee/top-food%20sales-report', // CR-136
```

**Verify:** `grep "TOP_FOOD_SALES_REPORT" src/api/constants.js` → 1 match

---

## Edit 2 — `src/api/services/topFoodSalesService.js` (NEW FILE)

### Complete transform + fetch spec:

```javascript
// topFoodSalesService.js — CR-136
// Single-call backend-aggregated item sales report.
// Endpoint: POST /api/v1/vendoremployee/top-food%20sales-report
// Response: all numeric fields (both root and row-level) are STRINGS — parseFloat() mandatory.
// No business-day filtering needed — backend applies it (response includes adjusted from/to).
// No batching — backend handles any date range in a single call.

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { buildCacheKey, fetchOrReuse } from './insightsCache';

// ── Row transform ────────────────────────────────────────────────────────────
// ALL API numeric fields are strings. parseFloat() every one of them.
const parseRow = (r, index) => {
  const basePrice      = parseFloat(r.item_price)         || 0;
  const variationPrice = parseFloat(r.variation_price)    || 0;
  const addonPrice     = parseFloat(r.addon_price)        || 0;
  const gst            = parseFloat(r.gst)                || 0;
  const vat            = parseFloat(r.vat)                || 0;
  const serviceCharge  = parseFloat(r.service_charge)     || 0;
  const discount       = parseFloat(r.discount)           || 0;
  const compPrice      = parseFloat(r.complementary_price)|| 0;
  const netSales       = parseFloat(r.total_sales)        || 0;

  const grossRevenue   = basePrice + variationPrice + addonPrice;    // derived
  const subTotal       = grossRevenue - discount;                    // derived

  return {
    // Identity
    rank:              index + 1,                                    // 1-based, highest netSales first
    foodItem:          r.food_item         || '',
    stationName:       r.station_name      || '',
    categoryName:      r.category_name     || '',
    isComplementary:   r.complementary_status === 'Yes',
    // Quantities
    totalQuantity:     parseFloat(r.total_quantity) || 0,
    // Revenue components
    basePrice,
    variationPrice,
    addonPrice,
    grossRevenue,
    discount,
    subTotal,
    gst,
    vat,
    serviceCharge,
    compPrice,
    netSales,
  };
};

// ── Main export ──────────────────────────────────────────────────────────────
export const getTopFoodSalesForRange = async (fromDate, toDate, restaurantId = 0) => {
  if (!fromDate || !toDate) return { rows: [], grandTotal: 0, from: '', to: '' };

  const raw = await fetchOrReuse(
    buildCacheKey(restaurantId, 'top-food-sales', '', fromDate, toDate),
    async () => {
      const resp = await api.post(API_ENDPOINTS.TOP_FOOD_SALES_REPORT, {
        from: fromDate,
        to: toDate,
      });
      const data = resp.data?.food_sales_report || [];
      return { data, orderCount: data.length };
    }
  );

  // raw.data = food_sales_report array from API
  // Backend pre-sorts by total_sales DESC — preserve that order for rank assignment
  const rows = (raw.data || []).map(parseRow);

  // root total_sales is also a string
  const grandTotal = parseFloat(raw.grandTotal ?? 0) || rows.reduce((s, r) => s + r.netSales, 0);

  return { rows, grandTotal, from: raw.from || '', to: raw.to || '' };
};
```

**IMPORTANT NOTE on cache:** `fetchOrReuse` stores `{ data, orderCount }`. The root `total_sales` / `from` / `to` are NOT cached because `fetchOrReuse` only stores `resp.data.food_sales_report`. To access root fields, derive `grandTotal` from `rows.reduce(...)` as fallback. ✅

**Verify:** Import in component, call `getTopFoodSalesForRange('2026-07-01','2026-07-31')` → rows.length > 0, grandTotal > 0

---

## Edit 3 — `src/pages/reports-module/ItemSalesLedgerMockup.jsx` (NEW FILE)

### Component spec:

**Imports needed:**
```javascript
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import ReportLoadingShield from '../../components/reports/ReportLoadingShield';
import useReportFetch from '../../components/reports/useReportFetch';
import { useRestaurant } from '../../contexts';
import { useInsightsCache } from '../../contexts/InsightsCacheContext';
import { getTopFoodSalesForRange } from '../../api/services/topFoodSalesService';
import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter';
import { ArrowLeft, Search, Download, ChevronDown, ChevronUp, ChevronsUpDown,
         Check, Columns3, X, CalendarIcon, FileSpreadsheet, FileDown } from 'lucide-react';
```

**State variables:**
```
// Date range (shared with other reports via InsightsCacheContext)
fromDate, toDate, appliedFrom, appliedTo, activePreset
// NO MAX_RANGE_DAYS — this endpoint has no date limit

// Tabs: 'all' | 'byCategory' | 'byStation' | 'complementary'
activeTab

// Sort
sortCol = 'netSales', sortDir = 'desc'

// Search (FE-side, no re-fetch)
searchQuery

// Column chooser
visibleCols (Set) — localStorage key: 'cr136.columnVisibility.v1'
showColMenu (bool)

// Download
showDownloadMenu (bool)

// Sidebar
isSidebarExpanded, isSilentMode

// Accordion state (By Category + By Station tabs)
openAccordions (Set of category/station names)
```

**Default visible columns (6 of 12):**
`new Set(['rank','foodItem','categoryName','stationName','totalQuantity','netSales'])`

**Column definitions (12 total):**
```javascript
const COLUMNS = [
  { key: 'rank',          label: '#',            align: 'center', sortable: false },
  { key: 'foodItem',      label: 'Food Item',    align: 'left',   sortable: true  },
  { key: 'categoryName',  label: 'Category',     align: 'left',   sortable: true  },
  { key: 'stationName',   label: 'Station',      align: 'left',   sortable: true  },
  { key: 'totalQuantity', label: 'Qty Sold',     align: 'right',  sortable: true  },
  { key: 'basePrice',     label: 'Base Price',   align: 'right',  sortable: true  },
  { key: 'variationPrice',label: 'Variation',    align: 'right',  sortable: true  },
  { key: 'addonPrice',    label: 'Addon',        align: 'right',  sortable: true  },
  { key: 'discount',      label: 'Discount',     align: 'right',  sortable: true  },
  { key: 'gst',           label: 'GST',          align: 'right',  sortable: true  },
  { key: 'netSales',      label: 'Net Sales',    align: 'right',  sortable: true  },
  { key: 'pctOfTotal',    label: '% of Total',   align: 'right',  sortable: true  },
];
// NOTE: 'rank' is always rendered in table but excluded from export totals
// NOTE: 'pctOfTotal' is FE-computed: (row.netSales / grandTotal * 100).toFixed(1)
```

**Preset handler (presets: Today / 7D / 30D / MTD / 1Y / FY — all enabled):**
```javascript
// NO disabled presets — top-food-sales-report has no range limit
const PRESETS = ['Today', '7D', '30D', 'MTD', '1Y', 'FY'];
```

**Fetch function:**
```javascript
// NO schedules dependency — backend handles business day
const fetchFn = useCallback(
  () => datesValid
    ? getTopFoodSalesForRange(appliedFrom, appliedTo, restaurant?.id || 0)
    : Promise.resolve({ rows: [], grandTotal: 0 }),
  [appliedFrom, appliedTo, restaurant?.id, datesValid]
);
const { data, isLoading, error, hasLoadedOnce, refetch } = useReportFetch(
  fetchFn, [appliedFrom, appliedTo, restaurant?.id]
);
const allRows    = data?.rows || [];
const grandTotal = data?.grandTotal || 0;
```

**Tab filtering:**
```javascript
const TAB_ROWS = {
  all:           allRows,
  byCategory:    allRows,           // accordion — grouped by categoryName
  byStation:     allRows,           // accordion — grouped by stationName
  complementary: allRows.filter(r => r.isComplementary),
};
```

**pctOfTotal derivation (inject after fetch):**
```javascript
// Inject pctOfTotal into rows after grandTotal is known
const rowsWithPct = useMemo(() =>
  allRows.map(r => ({ ...r, pctOfTotal: grandTotal > 0 ? (r.netSales / grandTotal * 100) : 0 })),
  [allRows, grandTotal]
);
```

**KPI computation (from filteredRows for All tab, from allRows for others):**
```javascript
const kpis = useMemo(() => {
  const src = activeTab === 'all' ? sortedRows : allRows;
  return {
    uniqueItems: src.length,
    totalQty:    src.reduce((s,r) => s + r.totalQuantity, 0),
    gross:       src.reduce((s,r) => s + r.grossRevenue, 0),
    discount:    src.reduce((s,r) => s + r.discount, 0),
    netSales:    src.reduce((s,r) => s + r.netSales, 0),
  };
}, [activeTab, sortedRows, allRows]);
```

**Export (column-chooser-aware — OWNER CONFIRMED):**
```javascript
const buildExportPayload = () => {
  // Use visibleColList (excludes hidden columns) — both PDF and Excel
  const exportCols = visibleColList
    .filter(c => c.key !== 'pctOfTotal')   // % of Total is display-only, skip in export
    .map(c => ({ key: c.key, label: c.label,
      format: c.align === 'right' && c.key !== 'rank' && c.key !== 'totalQuantity' ? 'inr' : 'text',
      align: c.align, width: c.key === 'foodItem' ? 200 : 100 }));

  const sumCols = exportCols.filter(c => c.format === 'inr').map(c => c.key);
  const makeTotals = (rows) => {
    const t = { foodItem: `TOTAL (${rows.length} items)` };
    sumCols.forEach(k => { t[k] = rows.reduce((s,r) => s + (r[k]||0), 0); });
    return t;
  };

  // By Category rows: flatten accordion data (categoryName header + items)
  const byCategoryRows = [...new Set(allRows.map(r => r.categoryName))].flatMap(cat => {
    const items = allRows.filter(r => r.categoryName === cat);
    return [{ foodItem: `── ${cat} (${items.length} items)`, _isHeader: true },
            ...items];
  });

  // By Station rows: same pattern
  const byStationRows = [...new Set(allRows.map(r => r.stationName))].flatMap(st => {
    const items = allRows.filter(r => r.stationName === st);
    return [{ foodItem: `── ${st} (${items.length} items)`, _isHeader: true },
            ...items];
  });

  return {
    title: 'Item Sales',
    dateRange: { from: appliedFrom, to: appliedTo },
    kpis: [
      { label: 'Unique Items',  value: allRows.length,                          format: 'text' },
      { label: 'Total Qty',     value: allRows.reduce((s,r)=>s+r.totalQuantity,0), format: 'text' },
      { label: 'Gross Revenue', value: allRows.reduce((s,r)=>s+r.grossRevenue,0),  format: 'inr'  },
      { label: 'Discount',      value: allRows.reduce((s,r)=>s+r.discount,0),       format: 'inr'  },
      { label: 'Net Sales',     value: grandTotal,                              format: 'inr', tone: 'primary' },
    ],
    sheets: [
      { name: 'All Items',   columns: exportCols, rows: sortedRows,    totals: makeTotals(sortedRows) },
      { name: 'By Category', columns: exportCols, rows: byCategoryRows, totals: makeTotals(allRows) },
      { name: 'By Station',  columns: exportCols, rows: byStationRows,  totals: makeTotals(allRows) },
    ],
  };
};
```

**Navigation (back button):**
```javascript
// Route: /reports-module/item-sales
// Back navigates to: /reports-module/dashboard (same as Food Court, Order Ledger)
onClick={() => navigate('/reports-module/dashboard')
```

---

## Edit 4 — `src/App.js` (+3 lines)

### Edit 4a — Import (after line 50)

**Current line 50:**
```javascript
import ConsumptionReportPage from "./pages/reports-module/ConsumptionReportPage"; // CR-093
```

**Add after:**
```javascript
import ItemSalesLedgerMockup from "./pages/reports-module/ItemSalesLedgerMockup"; // CR-136
```

### Edit 4b — Routes (after line 138)

**Current lines 137-138:**
```jsx
<Route path="food-court" element={<ProtectedRoute><FoodCourtMockup /></ProtectedRoute>} />
<Route path="food-court/preview" element={<FoodCourtMockup />} />
```

**Add after line 138:**
```jsx
<Route path="item-sales" element={<ProtectedRoute><ItemSalesLedgerMockup /></ProtectedRoute>} /> {/* CR-136 */}
<Route path="item-sales/preview" element={<ItemSalesLedgerMockup />} /> {/* CR-136 */}
```

**Verify:** Navigate to `/reports-module/item-sales` → loads ItemSalesLedgerMockup, not 404

---

## Edit 5 — `src/components/layout/Sidebar.jsx` (+1 line)

**Current lines 151-152:**
```javascript
{ id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },
{ id: "insights-order-ledger", label: "Orders Ledger", path: "/reports-module/order-ledger" },
```

**Add between lines 151 and 152:**
```javascript
{ id: "insights-item-sales", label: "Item Sales", path: "/reports-module/item-sales" }, // CR-136
```

**Result (lines 150-154 after edit):**
```javascript
{ id: "insights-items-group", label: "Sales Ledger", isGroup: true },
{ id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },
{ id: "insights-item-sales", label: "Item Sales", path: "/reports-module/item-sales" }, // CR-136
{ id: "insights-order-ledger", label: "Orders Ledger", path: "/reports-module/order-ledger" },
```

**Verify:** Sidebar shows "Item Sales" under "Sales Ledger" group between Items Ledger and Orders Ledger

---

## Navigation & Routing — Complete Map

```
URL:       /reports-module/item-sales
Auth:      ProtectedRoute (requires auth_token in localStorage)
Preview:   /reports-module/item-sales/preview (no auth, for testing)
Back btn:  → /reports-module/dashboard
Sidebar:   Insights → Sales Ledger → Item Sales  (between Items Ledger and Orders Ledger)
```

---

## Verification Matrix (seeds QA handover)

| Edit | File | Change | How to Verify |
|---|---|---|---|
| 1 | `constants.js` | +TOP_FOOD_SALES_REPORT constant | `grep "TOP_FOOD_SALES_REPORT" constants.js` → 1 match |
| 2a | `topFoodSalesService.js` | parseRow: all numerics parseFloat | Unit: pass mock row with string `"5"` fields → output has number `5` |
| 2b | `topFoodSalesService.js` | grossRevenue = base+variation+addon | Unit: `{item_price:"100",variation_price:"20",addon_price:"10"}` → grossRevenue=130 |
| 2c | `topFoodSalesService.js` | subTotal = grossRevenue - discount | Unit: `{...discount:"15"}` → subTotal=115 |
| 2d | `topFoodSalesService.js` | rank = index + 1 | First row rank=1, second row rank=2 |
| 2e | `topFoodSalesService.js` | API call uses correct payload | Network tab: `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }` NOT `from_date` |
| 2f | `topFoodSalesService.js` | isComplementary correct | Row with `complementary_status:"Yes"` → `isComplementary:true` |
| 3a | `ItemSalesLedgerMockup.jsx` | Page loads at /item-sales | Browser: navigate to URL → no 404, no blank screen |
| 3b | `ItemSalesLedgerMockup.jsx` | KPI strip shows 5 cards | 5 KPI cards visible, Net Sales card in orange |
| 3c | `ItemSalesLedgerMockup.jsx` | 4 tabs render correctly | Tabs: All Items, By Category, By Station, Complementary |
| 3d | `ItemSalesLedgerMockup.jsx` | All Items table: Rank col highest first | Row 1 = highest netSales, Row N = lowest |
| 3e | `ItemSalesLedgerMockup.jsx` | Column chooser works | Toggle off "Category" → column disappears from table AND export |
| 3f | `ItemSalesLedgerMockup.jsx` | Export respects visibleColList | Download Excel with 4 visible cols → Excel has 4 data cols (not 12) |
| 3g | `ItemSalesLedgerMockup.jsx` | By Category accordion | Click category header → items expand, click again → collapse |
| 3h | `ItemSalesLedgerMockup.jsx` | By Station accordion | Same accordion behavior for stations |
| 3i | `ItemSalesLedgerMockup.jsx` | Complementary empty state | No comp items → empty state shown, not blank/crash |
| 3j | `ItemSalesLedgerMockup.jsx` | Search filters table | Type "Biryani" → only Biryani rows show |
| 3k | `ItemSalesLedgerMockup.jsx` | No date range limit | Set FY preset → loads without "Max days exceeded" error |
| 3l | `ItemSalesLedgerMockup.jsx` | pctOfTotal correct | Sum of all pctOfTotal ≈ 100% (float rounding tolerance) |
| 4a | `App.js` | Import added | `grep "ItemSalesLedgerMockup" App.js` → 1 import line |
| 4b | `App.js` | Route + preview route | `/reports-module/item-sales` loads, `/item-sales/preview` loads |
| 5 | `Sidebar.jsx` | Nav entry visible | Sidebar shows "Item Sales" under Sales Ledger group |
| ALL | webpack | 0 new warnings | `tail /var/log/supervisor/frontend.out.log` → "compiled with 1 warning" (pre-existing only) |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-136 → status: IMPLEMENTED, sprint_key: pos_5_1
□ 2. CR_REGISTRY.md: CR-136 row → status: IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: 5 files listed with CR-136 + date
□ 4. Code markers: // CR-136 comment in every modified file
□ 5. Compile: webpack 0 new warnings
```

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Cache key collision with foodCourtService (same endpoint) | LOW | Different endpoint string in buildCacheKey: `'top-food-sales'` vs `'order-logs'` |
| parseFloat on unexpected null/undefined | LOW | `|| 0` fallback on every parseFloat |
| grandTotal mismatch (root vs sum) | LOW | Derive from rows.reduce as fallback if cache drops root value |
| reportExporter crashes on empty sheet | LOW | `_isHeader` rows in byCategory/byStation have empty numeric fields — guard with `r[k]||0` |
| Complementary tab: all-empty crash | LOW | Empty state renders "No complementary items" — no crash |

---

**Implementation Plan complete: CR-136**
**Stage: Gate 3**
**Files WILL change: 5 (2 NEW, 3 EDIT)**
**Verification matrix: 18 checks (16 manual, 2 automated)**
**Awaiting Gate 4 GO → Implementation**
