# CR-013 Implementation Plan — Food Court Report (Gate ③)

**Created:** 2026-06-06
**CR:** CR-013 — Food Court Report (Station-wise Order Breakdown)
**Status:** IMPLEMENTATION PLAN

---

## 1. Approach

Clone the Order Ledger (S6) pattern into a new standalone screen. The only new logic is **station-level item filtering** — everything else (header, table, KPI strip, tabs, export, drill) is a simplified copy of S6.

**Build in 2 passes:**
- **Pass 1 (Gate ①):** Mockup with seed data — static station dropdown, hardcoded sample orders, all UI rendered. No API call.
- **Pass 2 (Gate ④):** Wire to live API — replace seed data with real `order-logs-report` call + station re-aggregation.

---

## 2. File-level Change Plan

### NEW files:

| # | File | Purpose | Size estimate |
|---|---|---|---|
| 1 | `frontend/src/api/services/foodCourtService.js` | Service: POST order-logs-report → transform → station re-aggregate → return `{ orders, stations }` | ~120 lines |
| 2 | `frontend/src/pages/reports-module/FoodCourtMockup.jsx` | Page component: S7 header + station dropdown + KPI strip + flat table + TOTAL row + tabs (All/Settled) + export + drill | ~500 lines |

### MODIFIED files:

| # | File | Change | Exact location |
|---|---|---|---|
| 3 | `frontend/src/components/layout/Sidebar.jsx` | Add entry: `{ id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" }` | After line 85 (Room Orders entry) |
| 4 | `frontend/src/App.js` | Add routes: `<Route path="/reports-module/food-court" ...>` + preview route | After room-orders routes (~line 75) |

### NOT TOUCHED (scope lock):

- `reportTransform.js`
- `orderLedgerService.js`
- `OrderLedgerMockup.jsx`
- All FROZEN screens (S0–S9, S-ROOM)
- `auditManifest.js`
- `reportExporter.js`
- `ReportLoadingShield.jsx`
- `useReportFetch.js`

---

## 3. Service Design (`foodCourtService.js`)

```
getFoodCourtForRange(fromDate, toDate, schedules, selectedStation)
  │
  ├─ POST order-logs-report (from_date, to_date)
  ├─ Transform: reportListFromAPI.orderLogsReport(raw, null)
  ├─ Business-day filter (same as S6)
  ├─ Extract station list: Set(allOrders.flatMap(o => o.items.map(i => i.station)))
  │
  ├─ If selectedStation:
  │   For each order:
  │     stationItems = order.items.filter(i => i.station === selectedStation)
  │     if stationItems.length === 0 → skip order
  │     else → build station-scoped row:
  │       orderNumber, date, time from parent
  │       orderDetails = stationItems names
  │       itemCount = stationItems.length
  │       itemTotal = Σ stationItems.price
  │       gstAmount = Σ stationItems.gstAmount
  │       vatAmount = Σ stationItems.vatAmount
  │       total = itemTotal + gstAmount + vatAmount
  │
  └─ Return { orders: [...stationRows], stations: [...stationList] }
```

---

## 4. Page Design (`FoodCourtMockup.jsx`)

### Header (S7 pattern — identical to S-ROOM/Sales/Order Ledger):
- Back button → `/reports-module/dashboard`
- Title: "Food Court" (Cabinet Grotesk)
- **Station dropdown** (new) — left of date range
- Bordered date range (FROM/TO)
- Green Apply + grouped presets (Today/7D/30D/MTD)
- Outlined orange Download + chevron

### KPI Strip (4 pills):
- Orders (count of station-filtered orders)
- Item Total (Σ station items price)
- Tax (Σ station GST + VAT)
- Total (Σ station total)

### Tabs:
- All Orders / Settled (simple, 2 tabs only)

### Table columns (default visible):
| Column | Source | Align |
|---|---|---|
| Order ID | orderNumber | left |
| Date | orderDate | left |
| Time | orderTime | left |
| Items | station-filtered item names with (qty) × ₹price | left |
| Item Count | count of station items | center |
| Item Total | Σ station item prices | right |
| GST | Σ station item GST | right |
| Total | itemTotal + GST | right |

### TOTAL row:
- Sticky below header, sums all numeric columns

### Row click → OrderDetailSheet:
- Opens side-sheet drill with FULL order (all stations) — same component as S6

### Export:
- Excel/PDF with station-filtered data
- Title includes station name: "Food Court — Main Kitchen · 2026-06-01 to 2026-06-07"

### Empty states:
- No orders for date range
- No orders for selected station

---

## 5. Tabs Logic

```
TAB_FILTERS = {
  all: () => true,
  settled: (o) => o.fOrderStatus === 6,
}
```

Simple. No audit/credit/hold/merged complexity.

---

## 6. Diff Preview

### Sidebar.jsx (~line 85):
```diff
+ { id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" },
  { id: "insights-room-orders", label: "Room Orders", path: "/reports-module/room-orders" },
```

### App.js (~line 75):
```diff
+ import FoodCourtMockup from './pages/reports-module/FoodCourtMockup';
  ...
+ <Route path="/reports-module/food-court" element={<ProtectedRoute><FoodCourtMockup /></ProtectedRoute>} />
+ <Route path="/reports-module/food-court/preview" element={<FoodCourtMockup />} />
```

---

## 7. Test Strategy

| Phase | Method |
|---|---|
| Gate ① (Mockup) | Screenshot verification — UI renders with seed data, station dropdown works, table/KPI/tabs visible |
| Gate ④ (Live API) | Testing agent — login with test accounts, verify station filter populates from real data, financials match, export works |
| Regression | Verify Order Ledger (S6) still loads unchanged |

---

*Gate ③ complete. Next: Gate ④ (Code Gate) — owner gives GO, then Gate ① mockup build.*
