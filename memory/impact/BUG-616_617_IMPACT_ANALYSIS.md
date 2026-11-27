# BUG-616 + BUG-617 — Combined Impact Analysis

**Items:** BUG-616 (Pie Tooltip ₹0) + BUG-617 (6 Insights Pages Empty Data)
**Stage:** Gate 2 — Impact Analysis
**Code Reality:** PARTIAL (PaymentsMockup has BUG-194 fix; 6 other pages don't)
**Risk:** MEDIUM
**Conflict Pre-Check:** No active items touching these 7 files. BUG-194 on PaymentsMockup is CLOSED.

---

## BUG-616: Pie Chart Tooltip — `d.revenue` → `d.value`

### Root Cause
Pie data maps `revenue` → `value` for Recharts `dataKey="value"`. Tooltip reads `d.revenue` which doesn't exist → `fmtINR(undefined)` → `₹0`.

### Affected Files — 2 files, 3 tooltip edits

| # | File | Line | Current | Fix |
|---|---|---|---|---|
| **A1** | `ChannelPivotMockup.jsx` | L56 | `{fmtINR(d.revenue)}` | `{fmtINR(d.value)}` |
| **A2** | `SalesMockup.jsx` | L62 | `{fmtINR(d.revenue)}` | `{fmtINR(d.value)}` |
| **A3** | `SalesMockup.jsx` | L63 | `d.revenue / d.orders` | `d.value / d.orders` |

**Note:** SalesMockup L62-63 tooltip is for the daily BarChart — this uses `revenue` as a direct field in chart data (not mapped to `value`), so it's NOT affected by BUG-616. Only the pie chart tooltips are affected.

Let me re-check: SalesMockup L435 maps pie data as `value: ch.revenue`. The tooltip for the pie uses which component?

Checking SalesMockup tooltips:
- L60-64: `DailyTooltip` — for BarChart (daily data has `revenue` field directly) — NOT affected
- L84-88: `HourlyTooltip` — for hourly BarChart (data has `revenue` directly) — NOT affected
- Pie charts at L435/L457 use `<ReTooltip content={<PivotTooltip />} />` — but PivotTooltip is not defined in SalesMockup

Re-checking: SalesMockup uses its own inline tooltips for bar charts, and for pie charts it doesn't have a custom tooltip — it uses default Recharts tooltip which reads `value` automatically.

**Corrected scope for BUG-616:**

| # | File | Line | Fix |
|---|---|---|---|
| **A1** | `ChannelPivotMockup.jsx` | L56 | `{fmtINR(d.revenue)}` → `{fmtINR(d.value || d.revenue)}` |

Only 1 file confirmed affected. SalesMockup pie charts don't use PivotTooltip.

---

## BUG-617: Data Path Mismatch — `salesData.X` → `salesData.data?.X || salesData.X`

### Root Cause
`fetchInsightsSales` (insightsService.js L611) returns `{ data: resp.data?.data, orderCount: 0 }`. Components read `salesData.summary` but data is at `salesData.data.summary`. PaymentsMockup fixed via BUG-194. 6 pages never patched.

### Affected Files — 6 files, ~15 line edits

| # | File | Lines | Fields to fix |
|---|---|---|---|
| **B1** | `ChannelPivotMockup.jsx` | L129, L133, L141 | `.summary`, `.channels`, `.payments` |
| **B2** | `SalesMockup.jsx` | L177, L178, L191, L192, L193 | `.summary`, `.daily`, `.channels`, `.payments`, `.hourly` |
| **B3** | `DailySalesMockup.jsx` | L128, L129 | `.summary`, `.daily` |
| **B4** | `HourlySalesMockup.jsx` | L118, L120 | `.summary`, `.hourly` |
| **B5** | `DayOfWeekMockup.jsx` | L114, L117 | `.summary`, `.daily` |
| **B6** | `RoundOffMockup.jsx` | L69, L70 | `.summary` (×2 inline) |

### Fix pattern (proven by BUG-194 in PaymentsMockup):
```js
// Before:
const s = salesData.summary || {};
const channels = (salesData.channels || []).map(...)

// After:
const s = salesData.data?.summary || salesData.summary || {};
const channels = (salesData.data?.channels || salesData.channels || []).map(...)
```

### Exact edits per file:

**B1 — ChannelPivotMockup.jsx:**
- L129: `salesData.summary` → `salesData.data?.summary || salesData.summary`
- L133: `salesData.channels` → `salesData.data?.channels || salesData.channels`
- L141: `salesData.payments` → `salesData.data?.payments || salesData.payments`

**B2 — SalesMockup.jsx:**
- L177: `salesData.summary` → `salesData.data?.summary || salesData.summary`
- L178: `salesData.daily` → `salesData.data?.daily || salesData.daily`
- L191: `salesData.channels` → `salesData.data?.channels || salesData.channels`
- L192: `salesData.payments` → `salesData.data?.payments || salesData.payments`
- L193: `salesData.hourly` → `salesData.data?.hourly || salesData.hourly`

**B3 — DailySalesMockup.jsx:**
- L128: `salesData.summary` → `salesData.data?.summary || salesData.summary`
- L129: `salesData.daily` → `salesData.data?.daily || salesData.daily`

**B4 — HourlySalesMockup.jsx:**
- L118: `salesData.summary` → `salesData.data?.summary || salesData.summary`
- L120: `salesData.hourly` → `salesData.data?.hourly || salesData.hourly`

**B5 — DayOfWeekMockup.jsx:**
- L114: `salesData.summary` → `salesData.data?.summary || salesData.summary`
- L117: `salesData.daily` → `salesData.data?.daily || salesData.daily`

**B6 — RoundOffMockup.jsx:**
- L69: `salesData.summary?.total_revenue` → `(salesData.data?.summary || salesData.summary)?.total_revenue`
- L70: `salesData.summary?.total_orders` → `(salesData.data?.summary || salesData.summary)?.total_orders`

---

## Files WILL NOT change

- `PaymentsMockup.jsx` — already has BUG-194 fix
- `insightsService.js` — return shape stays as-is (dual fallback in consumers is safer than unwrapping)
- `InsightsCacheContext.jsx` — untouched
- Any non-Insights report page

---

## Verification Matrix

| # | Bug | Edit | Verification |
|---|---|---|---|
| V1 | 616 | A1 | ChannelPivot: hover pie slice → tooltip shows ₹ value (not ₹0) |
| V2 | 617 | B1 | ChannelPivot: pie slices render with revenue data, KPI cards show totals |
| V3 | 617 | B2 | SalesMockup: daily bars + channel/payment pies + KPIs all populated |
| V4 | 617 | B3 | DailySales: daily trend bars render with revenue data |
| V5 | 617 | B4 | HourlySales: hourly bars render |
| V6 | 617 | B5 | DayOfWeek: day-of-week bars render |
| V7 | 617 | B6 | RoundOff: total revenue + orders KPIs show values |
| V8 | ALL | — | webpack compiles, 0 new warnings |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dual fallback breaks if API shape changes | LOW | LOW | Same pattern proven by BUG-194 for 4+ months |
| Tooltip fix shows wrong value | LOW | LOW | `d.value` is the exact field Recharts puts in pie payload |
| Other pages with same issue missed | LOW | MEDIUM | Exhaustive grep confirmed — only these 7 files |

---

## Gate Status

- Gate 1: COMPLETE (Intake)
- Gate 2: **COMPLETE** (this document)
- Gate 3: Awaiting "Gate 3 GO" → Implementation Plan
