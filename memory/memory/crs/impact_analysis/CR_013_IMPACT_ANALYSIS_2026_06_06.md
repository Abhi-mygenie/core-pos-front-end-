# CR-013 Impact Analysis — Food Court Report (Gate ②)

**Created:** 2026-06-06
**CR:** CR-013 — Food Court Report (Station-wise Order Breakdown)
**Status:** IMPACT ANALYSIS COMPLETE

---

## 1. Summary

New standalone screen `/reports-module/food-court` that clones the Order Ledger (S6) layout and adds a **Station dropdown filter**. When a station is selected, each order row shows only that station's items — name, qty, price, subtotal, GST. The KPI strip, TOTAL row, and export reflect the selected station's slice.

---

## 2. Data Source

**Same API:** `POST /order-logs-report` (already used by S5, S6, S7, S8, S9, S-ROOM).

**Item-level station field:** `order_details_table[].station` → parsed as `item.station` by `parseOrderItem()` at `reportTransform.js:738`.

**Verified:** S5 (ItemSalesHybridMockup) already uses `item.station` for per-station filtering, station summary table, "By Station" Excel sheet. Field is populated from live API (tested on cafe103, palmhouse, welcomeresort).

**No new API calls needed.** Same single `order-logs-report` POST.

---

## 3. Module Mapping

| Layer | Component | Action | Risk |
|---|---|---|---|
| **Service** | `foodCourtService.js` (NEW) | New service file. Calls `order-logs-report`, transforms with `reportListFromAPI.orderLogsReport`, filters to date range, then **re-aggregates per station** from the `items[]` array on each transformed row. Returns: `{ orders, stations, meta }`. | LOW — new file, no existing code modified |
| **Page** | `FoodCourtMockup.jsx` (NEW) | New page component. Clones S6 structure: header, station dropdown, KPI strip, search, table, TOTAL row, export, side-sheet. | LOW — new file |
| **Sidebar** | `Sidebar.jsx` | Add 1 entry: `{ id: "insights-food-court", label: "Food Court", path: "/reports-module/food-court" }` | LOW — 1 line insert |
| **Routes** | `App.js` | Add 2 routes: `/reports-module/food-court` (protected) + `/reports-module/food-court/preview` | LOW — 2 line insert |
| **Transforms** | `reportTransform.js` | **NO CHANGE.** `parseOrderItem()` already extracts `station` at line 738. The `orderLogsReportRow()` already includes `items[]` with station on each item. | ZERO |
| **Existing services** | `orderLedgerService.js` | **NO CHANGE.** Food Court uses its own service for the station re-aggregation logic. | ZERO |
| **Export** | Uses existing `reportExporter.js` | Excel/PDF export with station-filtered data. No changes to exporter itself. | ZERO |
| **Components** | `ReportLoadingShield`, `useReportFetch`, `OrderDetailSheet`, `Sidebar` | Reuse only — no modifications. | ZERO |

---

## 4. Files Affected

### NEW files (3):
| File | Purpose |
|---|---|
| `frontend/src/api/services/foodCourtService.js` | Service: fetch + station-level re-aggregation |
| `frontend/src/pages/reports-module/FoodCourtMockup.jsx` | Page component (S6 clone + station filter) |

### MODIFIED files (2):
| File | Change | Lines |
|---|---|---|
| `frontend/src/components/layout/Sidebar.jsx` | Add sidebar entry | +1 line |
| `frontend/src/App.js` | Add routes | +2-3 lines |

### NOT TOUCHED (explicit):
- `reportTransform.js` — station already parsed
- `orderLedgerService.js` — separate service for Food Court
- `OrderLedgerMockup.jsx` — no changes to existing S6
- Any FROZEN screen (S0–S9, S-ROOM)
- `auditManifest.js`
- `reportExporter.js`

---

## 5. Station Re-aggregation Logic (core new logic)

```
Input: transformed rows from orderLogsReport, each with items[] array
       + selected station name

For each order row:
  1. Filter items[] to only items where item.station === selectedStation
  2. If no items match → skip this order (not shown in table)
  3. If items match → create a station-scoped row:
     - orderNumber, orderDate, orderTime from parent order
     - orderDetails = matched items only (name, qty, price)
     - itemCount = count of matched items
     - itemTotal = Σ matched items price
     - gstAmount = Σ matched items gstAmount
     - vatAmount = Σ matched items vatAmount
     - total = itemTotal + gstAmount + vatAmount
     - All other order-level fields preserved for drill/export
```

**Station list:** Extracted from all items across all orders: `Set(allItems.map(i => i.station))`.

---

## 6. Regression Risk

| Area | Risk | Mitigation |
|---|---|---|
| Existing Order Ledger (S6) | ZERO | Separate service + page, no shared state |
| Other FROZEN screens | ZERO | No files touched |
| Sidebar ordering | LOW | Insert after existing entries, no reorder |
| API load | ZERO | Same API call, no additional requests |

**Overall regression risk: VERY LOW** — all new files, 2 minor inserts.

---

## 7. Test Plan

| Test | Account | Validates |
|---|---|---|
| Station dropdown populated | cafe103 / palmhouse | All stations from API appear in dropdown |
| Station filter works | cafe103 | Selecting "Main Kitchen" shows only Main Kitchen items per order |
| Financials correct | palmhouse | Station subtotal + GST matches sum of visible items |
| KPI strip updates | Any | KPI pills reflect selected station totals |
| TOTAL row updates | Any | TOTAL row sums match filtered data |
| Tab switching | Any | All / Settled filters correct on station-filtered data |
| Empty station | Any | Station with 0 orders in range shows empty state |
| Export | Any | Excel/PDF contains only selected station data |
| Side-sheet drill | Any | Click row opens OrderDetailSheet with full order |
| No regression on S6 | Any | Order Ledger unchanged, loads separately |

---

*Gate ② complete. Next: Gate ③ (Implementation Plan).*
