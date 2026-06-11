# CR-016 — Code-Gate (Gate 4)

**Status:** COMPLETE
**Date:** 2026-06-09
**Pre-Requisite:** Gate 3 (Implementation Plan) COMPLETE

---

## 0. Scope Lock

This Code-Gate freezes the exact change surface for CR-016.
**No file may be created or modified beyond what is listed here.**

| Metric | Value |
|--------|-------|
| New files | 3 |
| Modified files | 2 |
| Deleted files | 0 |
| Total LOC added (est.) | ~530 |
| Total LOC modified | ~4 |
| Regression risk | LOW (new page, no shared state mutations) |

---

## 1. MODIFIED FILES — Exact Diffs

### M1. `src/components/layout/Sidebar.jsx`

**Change:** Insert 1 line — new Insights child entry after "Dashboard", before "Sales".

```diff
     children: [
       { id: "insights-dashboard", label: "Dashboard", path: "/reports-module/dashboard" },
+      { id: "insights-settlement", label: "Settlement", path: "/reports-module/settlement" },
       { id: "insights-sales", label: "Sales", path: "/reports-module/sales" },
```

**Line:** Insert after current line 72.
**Click handler:** No change needed — existing `parentId === 'insights'` handler (L320-328) auto-navigates non-`comingSoon` children.
**Risk:** LOW — additive-only, single array entry.

---

### M2. `src/App.js`

**Change 1:** Add import (1 line, after FoodCourtMockup import, line 18):

```diff
 import FoodCourtMockup from "./pages/reports-module/FoodCourtMockup";
+import SettlementReportMockup from "./pages/reports-module/SettlementReportMockup";
 import SettlementMockup from "./pages/SettlementMockup";
```

**Change 2:** Add route (2 lines, after food-court/preview route, line 80):

```diff
               <Route path="/reports-module/food-court/preview" element={<FoodCourtMockup />} />
+              {/* CR-016 — Settlement Report (Insights, date-range history) */}
+              <Route path="/reports-module/settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />
               <Route path="/reports-module/preview" element={<DashboardMockup />} />
```

**Risk:** LOW — additive-only, standard route pattern.

---

## 2. NEW FILES — Full Skeleton

### F1. `src/api/services/settlementReportService.js` (~20 lines)

```js
// Settlement Report Service — CR-016
// Date-range settlement history for Insights module.
// Thin wrapper over CR-015's settlementService.getSettlementReport.

import { getSettlementReport } from './settlementService';
import { fromAPI } from '../transforms/settlementReportTransform';

/**
 * Fetch settlement data for a date range.
 * @param {string} fromDate — "DD-MM-YYYY"
 * @param {string} toDate   — "DD-MM-YYYY"
 * @returns {Promise<{ aggregateTotals, days[] }>} — transformed UI shape
 */
export const getSettlementForRange = async (fromDate, toDate) => {
  const response = await getSettlementReport(fromDate, toDate);
  const raw = response.data || response;
  return fromAPI.settlementRange(raw);
};
```

**Dependencies:** `settlementService.js` (CR-015, existing), `settlementReportTransform.js` (new F3).
**No new API endpoints.** Reuses existing `POST /api/v1/vendoremployee/waiter/get-settlement-report`.

---

### F2. `src/api/transforms/settlementReportTransform.js` (~60 lines)

```js
// Settlement Report Transform — CR-016
// Maps multi-day settlement API response → UI shape.
// Reuses fromAPI.waiter() from CR-015 settlementTransform.

import { fromAPI as settlementFromAPI } from './settlementTransform';

const toNum = (v) => parseFloat(v) || 0;

/** Format "YYYY-MM-DD" → "DD MMM YYYY" */
const formatDisplayDate = (isoDate) => {
  // Parse as local date (not UTC) to avoid off-by-one
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fromAPI = {
  /**
   * Transform multi-day settlement response → UI shape.
   * Input: raw API response { success, totals, data[] }
   * Output: { aggregateTotals, days[] }
   */
  settlementRange: (response) => {
    const topTotals = response.totals || {};
    const days = (response.data || []).map((dayEntry) => {
      const dt = dayEntry.totals || {};
      const rawWaiters = dayEntry.waiters || [];
      const waiters = rawWaiters.map(settlementFromAPI.waiter);

      const totalFunds = toNum(dt.total_total_funds);
      const settled = toNum(dt.total_today_settlement);
      const pilferage = toNum(dt.total_pilferage);

      return {
        date: dayEntry.date,                              // "YYYY-MM-DD" (for sorting/keys)
        formattedDate: formatDisplayDate(dayEntry.date),   // "09 Jun 2026"
        totals: {
          openingBalance:  toNum(dt.total_opening_balance),
          cashCollected:   toNum(dt.total_today_collection),
          totalFunds,
          settled,
          expected:        totalFunds - settled - Math.abs(pilferage),
          pilferage:       pilferage,            // raw (negative from API); display uses Math.abs
          totalSale:       toNum(dt.total_sale),
          deliveryCharges: toNum(dt.total_today_delivery_charge),
          serviceCharges:  toNum(dt.total_today_service_charge),
          tips:            toNum(dt.total_today_tips),
        },
        waiters,
        activeWaiterCount: waiters.filter(
          (w) => w.cashCollected > 0 || w.openingBalance > 0
        ).length,
      };
    });

    // Sort descending by date (latest first)
    days.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

    // Aggregate totals from top-level response
    const aggFunds   = toNum(topTotals.total_total_funds);
    const aggSettled  = toNum(topTotals.total_today_settlement);
    const aggPilf     = toNum(topTotals.total_pilferage);

    return {
      aggregateTotals: {
        openingBalance: toNum(topTotals.total_opening_balance),
        cashCollected:  toNum(topTotals.total_today_collection),
        totalFunds:     aggFunds,
        settled:        aggSettled,
        expected:       aggFunds - aggSettled - Math.abs(aggPilf),
        pilferage:      aggPilf,
        totalSale:      toNum(topTotals.total_sale),
      },
      days,
    };
  },
};
```

**Key design decisions:**
- Reuses `settlementFromAPI.waiter()` from CR-015 — no duplication of waiter transform
- `expected` computed as `totalFunds − settled − |pilferage|` (CR-015 rule, owner-approved)
- Days sorted descending (latest first)
- Zero-activity days included (owner Q1: show all)

---

### F3. `src/pages/reports-module/SettlementReportMockup.jsx` (~450 lines)

**Structure (section by section):**

```
SettlementReportMockup
├── Constants
│   ├── MAX_RANGE_DAYS = 365
│   ├── PRESETS = [Today, Yesterday, 7D, 30D, 90D, 365D, MTD, YTD]
│   └── DOWNLOAD_MENU (clone S6 pattern: Excel/PDF enabled, Email/WhatsApp/SMS disabled)
│
├── Imports
│   ├── Sidebar (layout)
│   ├── ReportLoadingShield (shared)
│   ├── useReportFetch (shared)
│   ├── getSettlementForRange (F1)
│   ├── formatDateForAPI (CR-015 settlementTransform)
│   ├── exportReportAsExcel, exportReportAsPDF (reportExporter.js)
│   └── lucide-react icons
│
├── State
│   ├── fromDate / toDate (draft)
│   ├── appliedFrom / appliedTo (committed — triggers fetch)
│   ├── activePreset
│   ├── expandedDays (Set of YYYY-MM-DD)
│   ├── searchQuery (filters day table by date string)
│   ├── sortCol / sortDir
│   ├── showDownloadMenu
│   └── isSidebarExpanded / isSilentMode (app shell)
│
├── Data Fetch
│   └── useReportFetch(fetchFn, [appliedFrom, appliedTo])
│       └── fetchFn calls getSettlementForRange(apiFrom, apiTo)
│           where apiFrom/apiTo = formatDateForAPI(appliedFrom/appliedTo)
│
├── Derived
│   ├── filteredDays = days.filter(search match on formattedDate)
│   ├── sortedDays = filteredDays.sort(sortCol, sortDir)
│   ├── totalRow = sum of all filteredDays columns
│   └── KPI values from aggregateTotals
│
├── Render
│   ├── Sidebar
│   ├── Main Content
│   │   ├── Header (back, title, from-to inputs, Apply, presets, refresh, download)
│   │   ├── ReportLoadingShield
│   │   │   ├── KPI Strip (5 cards)
│   │   │   ├── Day Summary Table (8 columns, clickable rows)
│   │   │   │   └── Expanded: Waiter Detail Table (7 columns per waiter)
│   │   │   └── TOTAL row
│   │   └── Empty state if no days
│   └── Download dropdown (positioned relative)
│
├── Export Handlers
│   ├── handleExcel → exportReportAsExcel({sheets: [daySummary, waiterDetail]})
│   └── handlePDF → exportReportAsPDF({kpis, sheets: [daySummary, waiterDetail]})
│
└── data-testid coverage (per Gate 3 §3)
```

**Visual patterns cloned from S6 (Order Ledger):**
- Header layout (back arrow + title + date range + presets + download)
- From-To inline `<input type="date">` with Apply button
- Download dropdown (DOWNLOAD_MENU array + positioned div)
- ReportLoadingShield wrapper
- Table styling (Tailwind: `text-sm`, alternating row backgrounds, sticky header)
- Sort icons (ChevronUp/Down/ChevronsUpDown)

**New patterns (CR-016 specific):**
- Expandable day rows (click to toggle waiter detail)
- KPI strip (5 cards, inline — matches CR-015 KPI card pattern)
- Pilferage amber highlight on day rows
- TOTAL row at bottom of day table

---

## 3. Files NOT Touched (explicit exclusion list)

| Category | Files | Reason |
|----------|-------|--------|
| CR-015 Settlement Panel | `SettlementPanel.jsx`, `settlementService.js`, `settlementTransform.js` | Independent — different route, read-only reuse of `fromAPI.waiter()` only |
| Dashboard / Order-taking | `DashboardPage.jsx`, `OrderEntry.jsx`, all context files | Zero touch |
| Other Insights reports | `OrderLedgerMockup.jsx`, `ItemSalesHybridMockup.jsx`, `SalesMockup.jsx`, etc. | No shared state |
| Menu Management | `MenuManagementPanel.jsx`, `BulkEditor.jsx` | Zero touch |
| Shared report components | `ReportLoadingShield.jsx`, `useReportFetch.js`, `reportExporter.js` | Read-only usage |
| API constants | `constants.js` | No new endpoints (reuses existing settlement endpoint) |
| Sidebar click handler | Lines 320-328 of `Sidebar.jsx` | Already handles non-comingSoon Insights children |

---

## 4. Risk Assessment

| Change | Risk | Mitigation |
|--------|------|-----------|
| Sidebar entry (1 line) | LOW | Additive-only, no logic change |
| App.js route (2 lines) | LOW | Standard pattern, ProtectedRoute wrapped |
| Service (F1, 20 lines) | LOW | Thin wrapper, reuses existing CR-015 service |
| Transform (F2, 60 lines) | LOW | Reuses CR-015 `fromAPI.waiter()`, pure function |
| Page component (F3, ~450 lines) | MEDIUM | New file, but clones proven S6 pattern |
| Overall regression | **ZERO on existing features** | New page, new route, no shared state mutations |

---

## 5. Pre-Implementation Checklist

- [x] API response shape verified live (Impact Analysis §1)
- [x] API performance tested for 365-day range (5.2s, 2.6 MB)
- [x] Owner Q1-Q4 answered and documented
- [x] Reusable components identified (ReportLoadingShield, useReportFetch, reportExporter, fromAPI.waiter)
- [x] Inline patterns identified for cloning (S6 date picker, S6 download menu)
- [x] data-testid registry complete (Gate 3 §3)
- [x] Regression test plan complete (Gate 3 §4)
- [ ] **Owner GO** — awaiting approval to proceed to Gate 5 (Implementation)

---

*End of Code-Gate — Gate 4 Complete. Awaiting owner GO to begin Gate 5 (Implementation + QA).*
