# CR-474 — Impact Analysis

**Item:** CR-474 — Date-Wise Sales Revenue Report (sidebar name: "Sales Audit")
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** NONE
**Risk:** MEDIUM
**Conflict Pre-Check:** No other item touches the same insertion points. All additive.

---

## Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| **OD-474-01** | Under Daily Report, below Item Consumption. Sidebar label: **"Sales Audit"** |
| **OD-474-02** | Default date range: **MTD** (month start to today) |
| **OD-474-03** | **Yes, include a chart** — design agent decides chart type/layout |
| **OD-474-04** | Excel CSV + PDF export (same as other reports) |

---

## Data Flow Trace

```
User clicks sidebar "Sales Audit" → navigates /reports-module/sales-audit
  → SalesAuditPage mounts (default MTD)
  → calls getDateWiseSalesRevenue({ from_date: appliedFrom, to_date: appliedTo })
    → api.post(REPORT_ENDPOINTS.DATEWISE_SALES_REVENUE, body)
      → POST /api/v2/vendoremployee/report/datewise-sales-revenue
  → response: { data: { header, columns[], daily[], summary{}, business_days[], definitions{} } }
  → header rendered as report title (dynamic restaurant name)
  → summary{} rendered in 4 KPI cards: Total Sales, Total Cancelled, Total Discount, Total Paid Revenue
  → daily[] rendered in table: Date | Total Sales | Total Cancelled | Total Discount | Total Paid Revenue
  → summary{} rendered as footer totals row
  → chart rendered above table (daily sales + paid revenue trend)
  → Excel → CSV blob download
  → PDF → window.open + print
```

---

## Affected Files

### Files WILL change (4 modified + 1 new)

| # | File | Change | Lines | Risk |
|---|---|---|---|---|
| **E1** | `src/api/constants.js` | Add `DATEWISE_SALES_REVENUE` to `REPORT_ENDPOINTS` (after L240 `ITEM_CONSUMPTION_REPORT`) | +1 | LOW |
| **E2** | `src/api/services/inventoryService.js` | Add `getDateWiseSalesRevenue()` function (after `getItemConsumptionReport`) | +5 | LOW |
| **E3** | `src/components/layout/Sidebar.jsx` | Add sidebar entry `{ id: "sales-audit", label: "Sales Audit", path: "/reports-module/sales-audit" }` after L100 (below Item Consumption) | +1 | LOW |
| **E4** | `src/App.js` | Add import + `<Route>` for `SalesAuditPage` (after L246 item-consumption route) | +2 | LOW |
| **E5** | `src/pages/reports-module/SalesAuditPage.jsx` | **NEW FILE** — Full page component | ~400-450 lines | MEDIUM |

### Files WILL NOT change

- `ItemConsumptionReportPage.jsx` — separate report, untouched
- `ConsumptionReportPage.jsx`, `PLReportPage.jsx` — untouched
- Any order-entry, dashboard, PMS, financial, recipe, or socket files

---

## E1: constants.js — New Endpoint

**Current L240:**
```js
  ITEM_CONSUMPTION_REPORT: '/api/v2/vendoremployee/report/item-consumption-report', // CR-472
```
**Insert after L240:**
```js
  DATEWISE_SALES_REVENUE: '/api/v2/vendoremployee/report/datewise-sales-revenue', // CR-474
```

---

## E2: inventoryService.js — New Service Function

**Insert after `getItemConsumptionReport` (after ~L188):**
```js
// CR-474: Date-Wise Sales Revenue Report (Sales Audit)
export async function getDateWiseSalesRevenue({ from_date, to_date }) {
  const res = await api.post(REPORT_ENDPOINTS.DATEWISE_SALES_REVENUE, { from_date, to_date });
  return res.data; // { success, data: { header, columns[], daily[], summary{}, business_days[], definitions{} } }
}
```

---

## E3: Sidebar.jsx — New Nav Entry

**Current L100:**
```js
      { id: "item-consumption", label: "Item Consumption", path: "/reports-module/item-consumption" }, // CR-472
```
**Insert after L100:**
```js
      { id: "sales-audit", label: "Sales Audit", path: "/reports-module/sales-audit" }, // CR-474
```

---

## E4: App.js — New Import + Route

**Import after ItemConsumptionReportPage:**
```js
import SalesAuditPage from "./pages/reports-module/SalesAuditPage"; // CR-474
```

**Route after item-consumption:**
```js
<Route path="sales-audit" element={<ProtectedRoute><SalesAuditPage /></ProtectedRoute>} /> {/* CR-474 */}
```

---

## E5: SalesAuditPage.jsx — NEW FILE

**Pattern:** Mirrors `ItemConsumptionReportPage.jsx` (CR-472) for layout/date pickers/presets/exports. Adds recharts bar chart (mirrors `PLReportPage.jsx` chart pattern).

**UI Structure:**
1. **Header:** Back button + dynamic title from `data.header` + date subtitle + Excel/PDF buttons
2. **Date bar:** From/To inputs + Apply + preset pills (Today, 7D, 30D, MTD) — same pattern as CR-472
3. **KPI strip:** 4 cards — Total Sales, Total Cancelled, Total Discount, Total Paid Revenue (from `data.summary`)
4. **Chart:** Recharts BarChart — daily `total_sales` + `total_paid_revenue` as bars, `total_cancelled` as line overlay. X-axis: dates. Design agent decides exact visualization.
5. **Table:** 5 columns: Date | Total Sales | Total Cancelled | Total Discount | Total Paid Revenue (from `data.daily[]`)
6. **Footer totals row:** From `data.summary{}` — must equal column sums
7. **Export:** Excel CSV + PDF (same patterns as CR-472)

**API Response Fields Used:**
- `data.header` — page title (dynamic per restaurant)
- `data.columns[]` — column keys + labels (render dynamically)
- `data.daily[]` — table rows (one per business day, ascending, including zero days)
- `data.summary{}` — KPI cards + footer totals
- `data.generated_at` — timestamp subtitle
- Amounts are ₹ (numbers). Format: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })`

**Critical rules from backend handoff:**
- Do NOT subtract discounts or cancellations from Total Sales (already net)
- Do NOT divide values by 100 (rupees, not paise)
- Treat `date` as a label, not a UTC timestamp to shift
- Preserve zero-value days
- Errors (403/401/404/5xx) are visible, never replaced by zero totals
- Loading, failed, and all-zero states must be distinct

---

## Verification Matrix

| # | Edit | File | How to Verify |
|---|---|---|---|
| V1 | E1 | constants.js | grep DATEWISE_SALES_REVENUE |
| V2 | E2 | inventoryService.js | grep getDateWiseSalesRevenue |
| V3 | E3 | Sidebar.jsx | Browser: "Sales Audit" below "Item Consumption" in Daily Report |
| V4 | E4 | App.js | Browser: /reports-module/sales-audit loads |
| V5 | E5 | SalesAuditPage.jsx | Browser: MTD data loads, 4 KPI cards, chart renders, 26+ daily rows |
| V6 | E5 | SalesAuditPage.jsx | Footer totals match column sums to 2 decimal places |
| V7 | E5 | SalesAuditPage.jsx | ₹44,818.80 discount total preserves decimals |
| V8 | E5 | SalesAuditPage.jsx | Excel + PDF export include all rows + totals |
| V9 | ALL | — | webpack compiles, 0 new warnings |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API contract change | LOW | HIGH | Backend handoff doc + probed live |
| Business day label shift | LOW | MEDIUM | Treat date as label, no timezone conversion |
| Decimal precision loss | LOW | LOW | Use `minimumFractionDigits: 2` in formatter |
| Chart rendering perf with large ranges | LOW | LOW | Max 366 days; recharts handles this |

---

## Gate Status

- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting "Gate 3 GO" → Implementation Plan
