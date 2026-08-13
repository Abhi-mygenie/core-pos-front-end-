# CR-117 — Implementation Plan (Gate 3)

**ID:** CR-117  
**Title:** Order Report Beta — Combined Backend-Aggregated Daily Order Report  
**Gate:** 3 (Implementation Plan)  
**Date:** 2026-07-31  
**Risk:** LOW  
**Code Reality:** NONE  
**Impact Analysis:** `impact/CR-117_IMPACT_ANALYSIS.md` (Gate 2 closed 2026-07-31)  
**Design Mockup:** `/cr117-mockup.html`

---

## Scope Lock

**Files WILL change:**
1. `src/api/constants.js` — +2 constants (line 110)
2. `src/api/services/reportService.js` — +2 functions (line 739)
3. `src/App.js` — +1 import (line 48) + 1 route (line 157)
4. `src/components/layout/Sidebar.jsx` — +1 nav item (line 99)
5. `src/pages/reports-module/OrderReportBetaPage.jsx` — **NEW FILE** (~550 lines)

**Files will NOT touch:**
- `orderTransform.js`, `reportTransform.js`, `AllOrdersReportPage.jsx`, `OrderTable.jsx`
- `InsightsCacheContext.jsx`, `FilterBar.jsx`, `ExportButtons.jsx`
- Any financial/billing/settlement logic, any hotspot files (R5)

---

## Execution Sequence

### Edit 1: `src/api/constants.js` (line 110)

**Insert after line 109** (`ORDER_LOGS_REPORT`):

```
Current (line 109):
  ORDER_LOGS_REPORT: '/api/v2/vendoremployee/report/order-logs-report',

Insert after line 109:
  // CR-117: Order Report Beta — backend-aggregated combined endpoint
  ORDER_REPORT_BETA_COMBINED: '/api/v1/vendoremployee/daily-order-report-details-combined',
  ORDER_REPORT_BETA_EXCEL: '/api/v1/vendoremployee/daily-order-report-excel-export-combined',
```

**Verification:** `grep "ORDER_REPORT_BETA" src/api/constants.js` → 2 hits.

---

### Edit 2: `src/api/services/reportService.js` (line 739)

**Insert before line 740** (before `export default {`):

```javascript
// CR-117: Order Report Beta — combined backend-aggregated daily report
export const getOrderReportBetaCombined = async (fromDate, toDate) => {
  const { data } = await api.post(API_ENDPOINTS.ORDER_REPORT_BETA_COMBINED, {
    from: fromDate,   // YYYY-MM-DD
    to: toDate,       // YYYY-MM-DD
  });
  return data;
};

// CR-117: Order Report Beta — Excel export
export const exportOrderReportBetaExcel = async (fromDate, toDate) => {
  const response = await api.post(API_ENDPOINTS.ORDER_REPORT_BETA_EXCEL, {
    from: fromDate,
    to: toDate,
  }, { responseType: 'blob' });
  // Handle blob download or JSON { download_url }
  if (response.headers?.['content-type']?.includes('application/json')) {
    // JSON response with download URL
    const text = await response.data.text();
    const json = JSON.parse(text);
    if (json.download_url) {
      window.open(json.download_url, '_blank');
      return json;
    }
  }
  // Direct blob download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `order-report-beta-${fromDate}-to-${toDate}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};
```

Also add to `export default {` block (line 740+):

```
  getOrderReportBetaCombined,
  exportOrderReportBetaExcel,
```

**Verification:** `grep "OrderReportBeta" src/api/services/reportService.js` → 4 hits.

---

### Edit 3: `src/App.js` — Import (line 48)

**Insert after line 48** (after `ConsumptionReportPage` import):

```javascript
import OrderReportBetaPage from "./pages/reports-module/OrderReportBetaPage"; // CR-117
```

**Verification:** `grep "OrderReportBetaPage" src/App.js` → 2 hits (import + route).

---

### Edit 4: `src/App.js` — Route (line 157)

**Insert after line 157** (after consumption-report route, before `preview` route):

```jsx
              {/* CR-117: Order Report Beta */}
              <Route path="order-report-beta" element={<ProtectedRoute><OrderReportBetaPage /></ProtectedRoute>} />
```

**Verification:** Navigate to `/reports-module/order-report-beta` → page renders.

---

### Edit 5: `src/components/layout/Sidebar.jsx` (line 99)

**Insert after line 99** (after `{ id: "item-report", label: "Item Report", comingSoon: true },`):

```javascript
      { id: "order-report-beta", label: "Orders (Beta)", path: "/reports-module/order-report-beta" }, // CR-117
```

**Verification:** Sidebar → Daily Report → "Orders (Beta)" link visible and navigates correctly.

---

### Edit 6: `src/pages/reports-module/OrderReportBetaPage.jsx` — NEW FILE

**~550 lines.** Structure follows DailySalesMockup pattern + AllOrdersReportPage layout.

**Component Structure:**
```
OrderReportBetaPage
├─ State: fromDate, toDate, appliedFrom, appliedTo (InsightsCache shared dates)
├─ State: data (API response), isLoading, error
├─ State: activeTab ('all'|'aggregator'), filters (payType, channel, platform, punchedBy, collectedBy)
├─ State: isSidebarExpanded, expandedDays (Set of date strings)
│
├─ Layout:
│  ├─ Sidebar (collapsed)
│  ├─ Header: back btn + "Orders (Beta)" title + From/To date range + Apply + Export Excel btn
│  ├─ Tabs bar: "All Orders" (active) + "Aggregator" + 6 blocked tabs (disabled, 🔒)
│  ├─ KPI strip: 4 cards from order_stats
│  ├─ Filter bar: 8 dropdowns (2 disabled) + summary stats
│  ├─ Per-day collapsible sections (map daily_reports[])
│  │   ├─ Day header: date + weekday + stats (orders count, paid_revenue, total_sales, total_discount)
│  │   └─ Order table: 11 columns from report[] rows
│  └─ Grand total footer: 5 sections from grand_total
│
├─ Data fetch: useEffect on appliedFrom/appliedTo → getOrderReportBetaCombined(from, to)
├─ Client-side filtering: filter report rows by activeTab + filters
├─ Export handler: exportOrderReportBetaExcel(appliedFrom, appliedTo)
```

**Key Transform Logic (inline, no transform file):**
```javascript
// Platform badge
const getPlatformBadge = (p) => {
  if (!p) return { label: 'POS', style: 'bg-emerald-100 text-emerald-800' };
  if (p.toLowerCase().includes('swiggy')) return { label: 'Swiggy', style: 'bg-orange-100 text-orange-800' };
  if (p.toLowerCase().includes('zomato')) return { label: 'Zomato', style: 'bg-red-100 text-red-800' };
  return { label: p, style: 'bg-zinc-100 text-zinc-800' };
};

// Payment badge
const getPaymentBadge = (pm) => {
  const map = {
    cash: { label: 'Cash', style: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'Pending', style: 'bg-zinc-100 text-zinc-600' },
    cancel: { label: 'Cancel', style: 'bg-red-100 text-red-800' },
    tab: { label: 'TAB', style: 'bg-amber-100 text-amber-800' },
    aggregator: { label: 'Aggregator', style: 'bg-orange-100 text-orange-800' },
    payment_gateway: { label: 'PG', style: 'bg-cyan-100 text-cyan-800' },
    partial: { label: 'Partial', style: 'bg-blue-100 text-blue-800' },
    cash_on_delivery: { label: 'COD', style: 'bg-emerald-100 text-emerald-800' },
  };
  return map[pm?.toLowerCase()] || { label: pm || '—', style: 'bg-zinc-100 text-zinc-600' };
};

// Status badge
const getStatusBadge = (pt) => {
  const map = {
    Cash: { label: 'Paid', style: 'bg-blue-100 text-blue-800' },
    Unpaid: { label: 'Unpaid', style: 'bg-yellow-100 text-yellow-800' },
    Cancel: { label: 'Cancel', style: 'bg-red-100 text-red-800' },
    Partial: { label: 'Partial', style: 'bg-blue-100 text-blue-800' },
  };
  return map[pt] || { label: pt || '—', style: 'bg-zinc-100 text-zinc-600' };
};

// Currency format
const fmtINR = (v) => {
  const n = parseFloat(String(v).replace(/,/g, '')) || 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

// Tab filter
const filterByTab = (rows, tab) => {
  if (tab === 'all') return rows;
  if (tab === 'aggregator') return rows.filter(r => r.order_plateform != null);
  return rows;
};

// Client-side filter
const applyFilters = (rows, filters) => {
  let result = rows;
  if (filters.payType) result = result.filter(r => r.payment_for === filters.payType);
  if (filters.channel) result = result.filter(r => r.order_type === filters.channel);
  if (filters.platform) {
    if (filters.platform === 'pos') result = result.filter(r => r.order_plateform == null);
    else result = result.filter(r => r.order_plateform?.toLowerCase() === filters.platform);
  }
  if (filters.payment) result = result.filter(r => r.payment_method_raw === filters.payment);
  if (filters.punchedBy) result = result.filter(r => r.waiter === filters.punchedBy);
  if (filters.collectedBy) result = result.filter(r => r.collected_by === filters.collectedBy);
  return result;
};
```

**Verification:** Full page renders with all sections. See Verification Matrix below.

---

## Risk Register

| # | Risk | Mitigation | Severity |
|---|------|-----------|----------|
| 1 | Excel export endpoint returns unexpected format | Handle both blob and JSON `{download_url}` patterns | LOW |
| 2 | `grand_total` currency strings have commas ("4,703.00") | Strip commas before parseFloat | LOW |
| 3 | `order_plateform` is null for POS (not string "null") | Use `== null` check not `=== 'null'` | LOW |
| 4 | Route inside InsightsCacheProvider — shared dates may conflict | Use local state with InsightsCache sync (same as DailySalesMockup) | LOW |
| 5 | Large date ranges → many orders → performance | Backend is pre-aggregated per day. Collapsible sections limit DOM. | LOW |

---

## Verification Matrix (Seeds QA)

| Edit # | File | Change Description | How to Verify | Automated? |
|--------|------|--------------------|---------------|:---:|
| 1 | `constants.js:110` | +2 endpoint constants | `grep ORDER_REPORT_BETA constants.js` → 2 hits | YES |
| 2 | `reportService.js:739` | +2 exported functions | `grep OrderReportBeta reportService.js` → 4 hits | YES |
| 3 | `App.js:48` | +1 import | `grep OrderReportBetaPage App.js` → 2 hits | YES |
| 4 | `App.js:157` | +1 route | Navigate `/reports-module/order-report-beta` → page renders | NO |
| 5 | `Sidebar.jsx:99` | +1 nav item "Orders (Beta)" | Sidebar → Daily Report → link visible | NO |
| 6 | `OrderReportBetaPage.jsx` | NEW — page component | Navigate → renders KPI + table + footer | NO |
| 7 | — | KPI strip values | Network tab: compare `order_stats` → KPI card numbers | NO |
| 8 | — | Day sections render | Collapsible headers with correct date + stats | NO |
| 9 | — | Order table columns | 11 columns with correct field mapping | NO |
| 10 | — | Platform badges | Swiggy=orange, Zomato=red, POS=green (from `order_plateform`) | NO |
| 11 | — | Grand total footer | Compare `grand_total` API response → footer values | NO |
| 12 | — | Date range From/To | Change dates → Apply → API re-fetched with new from/to | NO |
| 13 | — | Export Excel | Click → POST to excel-combined endpoint → file downloads | NO |
| 14 | — | Aggregator tab | Click → only rows with `order_plateform != null` shown | NO |
| 15 | — | Filters (Pay Type) | Select Prepaid → only `payment_for=prepaid` rows shown | NO |
| 16 | — | Empty state | Set future date range → "No orders" message | NO |
| 17 | — | Webpack compiles | `yarn start` → 0 new errors | YES |

---

## Post-Code Registry Checklist

The Implementation agent MUST execute after coding:

- [ ] `registry.json`: CR-117 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `CR_REGISTRY.md`: row updated to GATE 5 / IMPLEMENTED
- [ ] `FILE_OWNERSHIP.md`: add 5 files with CR-117 + date
- [ ] Code markers: `// CR-117` comment in every modified file
- [ ] Compile check: webpack 0 new errors

---

## Summary

**7 edits across 5 files** (1 new + 4 modified). ~575 net new lines. All LOW risk. No hotspot files. No financial logic. No transform files.

Execution order: Edit 1 (constants) → Edit 2 (service) → Edit 5 (sidebar) → Edit 3+4 (App.js import+route) → Edit 6 (new page). Compile verify after each batch.
