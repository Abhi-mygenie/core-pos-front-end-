# CR-016 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-09
**Depends on:** CR-016 Impact Analysis (Gate 2) + Owner Answers (Q1-Q4)

---

## 0. Owner Decisions (binding)

| # | Decision |
|---|----------|
| Q1 | Show ALL days including zero-activity |
| Q2 | Skip Day Status column (no per-day `stattlement_status` from API) |
| Q3 | Max range = **365 days** (1 year). API tested: 5.2s / 2.6 MB for 366 days |
| Q4 | Sidebar position: **Before Sales** (after Dashboard) |

---

## 1. File Plan

### 1.1 New Files (3)

| # | File | Purpose | Est. Lines |
|---|------|---------|-----------|
| F1 | `src/pages/reports-module/SettlementReportMockup.jsx` | Main page component | ~450 |
| F2 | `src/api/services/settlementReportService.js` | API wrapper for range fetch | ~20 |
| F3 | `src/api/transforms/settlementReportTransform.js` | Multi-day response → UI shape | ~60 |

### 1.2 Modified Files (2)

| # | File | Change | Risk |
|---|------|--------|------|
| M1 | `src/components/layout/Sidebar.jsx` | Add `{ id: "insights-settlement", label: "Settlement", path: "/reports-module/settlement" }` after Dashboard, before Sales (line 73) | LOW |
| M2 | `src/App.js` | Add `<Route path="/reports-module/settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />` | LOW |

### 1.3 Files NOT Touched

All order-taking, dashboard, CR-015 SettlementPanel, menu management, other Insights reports — **zero touch**.

---

## 2. Implementation Steps (ordered)

### Step 1 — Service Layer (F2)

**File:** `src/api/services/settlementReportService.js`

```js
import { getSettlementReport } from './settlementService';  // reuse CR-015

export const getSettlementForRange = async (fromDate, toDate) => {
  const response = await getSettlementReport(fromDate, toDate);
  return response.data || response;
};
```

- Thin wrapper — reuses existing `settlementService.getSettlementReport`
- Returns raw API response for transform layer
- Date format: `DD-MM-YYYY` (matches existing API contract)

### Step 2 — Transform Layer (F3)

**File:** `src/api/transforms/settlementReportTransform.js`

**Input:** Raw API response (multi-day shape from Impact Analysis §1)
**Output:** `{ aggregateTotals, days: [{ date, formattedDate, totals, waiters, activeWaiterCount }] }`

Key transforms:
- Reuse `fromAPI.waiter()` from `settlementTransform.js` for waiter-level data
- `parseFloat()` all string → number conversions (waiter fields are strings)
- `date` format: `YYYY-MM-DD` → `DD MMM YYYY` for display
- `activeWaiterCount`: count of waiters where `collection > 0 || opening_balance > 0`
- `expected` (computed): `totalFunds − settled − Math.abs(pilferage)` (CR-015 rule)
- `pilferage` display: always `Math.abs(value)`
- Sort days descending by date (latest first)

### Step 3 — Main Page Component (F1)

**File:** `src/pages/reports-module/SettlementReportMockup.jsx`

**Layout pattern:** Clone Order Ledger (S6) structure:
- `Sidebar` + main content area
- `ReportLoadingShield` wrapping report body
- `useReportFetch` for data lifecycle

**Sections (top to bottom):**

#### 3a — Header
- Back arrow → `navigate('/dashboard')`
- Title: "Settlement Report"
- From-To date inputs (inline `<input type="date">`, clone S6 pattern lines 208-209, 270-275)
- Apply button (enabled when draft dates differ from applied + valid range)
- Presets: Today, Yesterday, Last 7 Days, Last 30 Days, Last 90 Days, Last 365 Days, MTD, YTD
- Max range: 365 days
- Default: Last 7 days
- Refresh button (calls `refetch`)
- Download menu (inline, clone S6 pattern lines 114-120)

#### 3b — KPI Strip (5 cards across full range)

| Card | Source | Format |
|------|--------|--------|
| Total Opening Balance | `aggregateTotals.openingBalance` | ₹ currency |
| Total Cash Collected | `aggregateTotals.cashCollected` | ₹ currency |
| Total Settled | `aggregateTotals.settled` | ₹ currency |
| Total Expected | Computed: `totalFunds − settled − abs(pilferage)` | ₹ currency |
| Total Pilferage | `aggregateTotals.pilferage` | ₹ currency, `Math.abs()` |

Pilferage card: amber highlight if > 0.

#### 3c — Day Summary Table

| Column | Source | Sortable |
|--------|--------|----------|
| Date | `day.formattedDate` | ✅ (default: desc) |
| Opening Balance | `day.totals.openingBalance` | ✅ |
| Cash Collected | `day.totals.cashCollected` | ✅ |
| Total Funds | `day.totals.totalFunds` | ✅ |
| Settled | `day.totals.settled` | ✅ |
| Expected | Computed | ✅ |
| Pilferage | `day.totals.pilferage` (abs) | ✅ |
| Active Waiters | `day.activeWaiterCount` | ✅ |

- **ALL days shown** (including zero-activity) per Q1
- **No Day Status column** per Q2
- Clickable rows → expand/collapse per-waiter breakdown
- Highlight: pilferage > 0 rows in amber background
- Totals row at bottom (sum of all visible day rows)
- Search: filter by date string

#### 3d — Per-Waiter Drill-Down (expandable)

Same columns as CR-015 settlement panel waiter table (reuse `fromAPI.waiter()` transform):

| Column | Source |
|--------|--------|
| Name | `waiter.name` |
| Opening | `waiter.openingBalance` |
| Cash Collected | `waiter.cashCollected` |
| Total Funds | `waiter.totalFunds` |
| Settled | `waiter.settled` |
| Expected | Computed |
| Pilferage | `Math.abs(waiter.pilferage)` |

#### 3e — Export

- Excel: Sheet 1 = Day Summary, Sheet 2 = Waiter Detail (all days expanded)
- PDF: Day summary table + per-waiter breakdown
- Uses `reportExporter.js` (`exportReportAsExcel`, `exportReportAsPDF`)
- Email/WhatsApp/SMS: disabled placeholders (Phase 2B)

### Step 4 — Sidebar Entry (M1)

**File:** `src/components/layout/Sidebar.jsx`

Insert AFTER line 72 (`insights-dashboard`), BEFORE line 73 (`insights-sales`):
```js
{ id: "insights-settlement", label: "Settlement", path: "/reports-module/settlement" },
```

Also whitelist `insights-settlement` in the click handler (alongside other navigable children).

### Step 5 — Route (M2)

**File:** `src/App.js`

Add route inside the reports-module route group:
```jsx
<Route path="/reports-module/settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />
```

Import at top:
```js
import SettlementReportMockup from './pages/reports-module/SettlementReportMockup';
```

---

## 3. Data Test IDs

| Element | data-testid |
|---------|------------|
| Page container | `settlement-report-page` |
| Back button | `settlement-report-back-btn` |
| Title | `settlement-report-title` |
| From date input | `settlement-report-from-date` |
| To date input | `settlement-report-to-date` |
| Apply button | `settlement-report-apply-btn` |
| Refresh button | `settlement-report-refresh-btn` |
| Download button | `settlement-report-download-btn` |
| Download Excel | `settlement-report-download-excel-btn` |
| Download PDF | `settlement-report-download-pdf-btn` |
| KPI: Opening Balance | `settlement-report-kpi-opening` |
| KPI: Cash Collected | `settlement-report-kpi-collected` |
| KPI: Settled | `settlement-report-kpi-settled` |
| KPI: Expected | `settlement-report-kpi-expected` |
| KPI: Pilferage | `settlement-report-kpi-pilferage` |
| Day row | `settlement-report-day-row-{YYYY-MM-DD}` |
| Waiter row | `settlement-report-waiter-row-{waiterId}` |
| Preset button | `settlement-report-preset-{id}` |
| Search input | `settlement-report-search` |

---

## 4. Regression Test Plan

| Test | Expected | Priority |
|------|----------|----------|
| Page loads at `/reports-module/settlement` | ReportLoadingShield → data table | P0 |
| Default last 7 days loads data | KPI strip + day table populated | P0 |
| 365-day preset loads within 10s | Data renders without timeout | P0 |
| Zero-activity days shown | All days in range visible | P1 |
| Expand day row → waiter detail | Waiter rows appear with correct data | P0 |
| KPI strip matches aggregate totals | Numbers match API response | P0 |
| Pilferage > 0 highlighted amber | Visual highlight on day rows | P1 |
| Excel export | Downloads .xlsx with 2 sheets | P1 |
| PDF export | Downloads .pdf with summary + detail | P1 |
| Sidebar → Settlement navigates | Route works, sidebar highlights | P0 |
| Back arrow → dashboard | Navigation works | P1 |
| Date range validation | >365 days shows error, Apply disabled | P1 |
| Search by date | Filters day table | P2 |
| Sort columns | Toggle asc/desc | P2 |
| Dashboard/Order-taking unaffected | No regression | P0 |
| CR-015 Settlement Panel unaffected | Panel still works | P0 |
| Other Insights reports unaffected | All load correctly | P1 |

---

## 5. Dependencies

| Dependency | Status | Risk |
|-----------|--------|------|
| CR-015 Settlement Module | IMPLEMENTED (awaiting owner smoke) | LOW — CR-016 is read-only, no shared state |
| `settlementService.getSettlementReport` | EXISTS | ZERO — reusing |
| `fromAPI.waiter()` transform | EXISTS | ZERO — reusing |
| `ReportLoadingShield` | EXISTS | ZERO — using as-is |
| `useReportFetch` | EXISTS | ZERO — using as-is |
| `reportExporter.js` | EXISTS | ZERO — using as-is |

---

## 6. Estimated Effort

| Item | Estimate |
|------|----------|
| Service + Transform (F2 + F3) | 30 min |
| Main Page (F1) | 2 hours |
| Sidebar + Route (M1 + M2) | 15 min |
| Testing + QA | 1 hour |
| **Total** | **~3.5 hours** |

---

*End of Implementation Plan — Gate 3 Complete. Next: Gate 4 (Code-Gate / Pre-Implementation Diff Preview).*
