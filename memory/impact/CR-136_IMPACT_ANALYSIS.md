# CR-136 — Impact Analysis
# Item Sales Ledger (Backend-Aggregated Item Performance Report)

**Gate:** 2 — Impact Analysis
**Date:** 2026-08-12
**Planning agent role:** PLANNING
**Code Reality:** NONE — clean slate, no existing code for this screen

---

## Code Reality Check

```bash
grep -rn "TOP_FOOD_SALES\|topFoodSalesService\|ItemSalesLedger\|item-sales" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
# 0 results → Code Reality: NONE — full implementation scope
```

---

## Conflict Pre-Check

| Target File | Last Modified By | Date | Conflict? |
|---|---|---|---|
| `src/api/constants.js` | CR-135 IMPL agent | 2026-08-10 | **PARALLEL-SAFE** — our change is additive (+1 constant) |
| `src/components/layout/Sidebar.jsx` | CR-135 IMPL agent | 2026-08-10 | **PARALLEL-SAFE** — additive (+1 nav item under existing group) |
| `src/App.js` | CR-135 IMPL agent | 2026-08-10 | **PARALLEL-SAFE** — additive (+1 import + route) |
| `src/api/services/topFoodSalesService.js` | — | — | NEW FILE — no conflict |
| `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | — | — | NEW FILE — no conflict |

No conflicts with any active CR. Parallel-safe on all 3 modified files.

---

## Risk Classification

| Field | Value |
|---|---|
| **Risk** | MEDIUM |
| **Trigger** | New service + new page component. Additive only — no existing file deletions, no logic changes. |
| **Hotspot files** | NONE (R5: OrderEntry.jsx / CollectPaymentPanel.jsx / orderTransform.js / DashboardPage.jsx / LoadingPage.jsx — none touched) |
| **Financial logic** | NONE — display-only aggregated data, no order transforms, no payment logic |
| **Fast Lane** | NO — multi-file |
| **Process required** | Full gate cycle (Impact Analysis → Implementation Plan → Owner GO → Impl → QA) |

---

## Data Flow Trace (API → Transform → State → UI)

```
API
  POST /api/v1/vendoremployee/top-food%20sales-report
  Payload: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
  Auth: Bearer token from localStorage.auth_token (same as all other endpoints)
  No range limit — 1 call for any date span (unlike Order Ledger's 60-day max)

  Response shape (confirmed via live probe):
  {
    food_sales_report: [
      { food_item, station_name, category_name, complementary_status,
        total_quantity*, item_price*, variation_price*, addon_price*,
        gst*, vat*, service_charge*, discount*, complementary_price*, total_sales* }
    ],        (* = STRING — all row-level numerics are strings — must parseFloat)
    total_sales: number,   (root level = NUMBER, inconsistency vs rows)
    from: "YYYY-MM-DD HH:MM:SS",
    to:   "YYYY-MM-DD HH:MM:SS"
  }

TRANSFORM  →  topFoodSalesService.js (NEW FILE)
  parseRow(r) → {
    foodItem:          r.food_item,
    stationName:       r.station_name,
    categoryName:      r.category_name,
    isComplementary:   r.complementary_status === 'Yes',
    totalQuantity:     parseFloat(r.total_quantity)    || 0,
    basePrice:         parseFloat(r.item_price)        || 0,
    variationPrice:    parseFloat(r.variation_price)   || 0,
    addonPrice:        parseFloat(r.addon_price)       || 0,
    grossRevenue:      (base + variation + addon),           // derived
    gst:               parseFloat(r.gst)               || 0,
    vat:               parseFloat(r.vat)               || 0,
    serviceCharge:     parseFloat(r.service_charge)    || 0,
    discount:          parseFloat(r.discount)          || 0,
    complementaryPrice:parseFloat(r.complementary_price) || 0,
    netSales:          parseFloat(r.total_sales)       || 0,
    subTotal:          grossRevenue - discount,              // derived
  }

  getTopFoodSalesForRange(fromDate, toDate, restaurantId = 0):
    → fetchOrReuse(buildCacheKey(rid, 'top-food-sales', '', fromDate, toDate), fetchFn)
    → api.post(API_ENDPOINTS.TOP_FOOD_SALES_REPORT, { from: fromDate, to: toDate })
    → rows = data.food_sales_report.map(parseRow)
    → return { rows, grandTotal: parseFloat(data.total_sales)||0, from: data.from, to: data.to }

STATE  →  ItemSalesLedgerMockup.jsx (NEW FILE)
  data.rows        = all parsed rows
  FE computes:
    KPIs:           Σ(totalQuantity), Σ(grossRevenue), Σ(discount), Σ(gst), Σ(netSales)
    Ranked table:   all rows sorted by netSales DESC (backend pre-sorts, FE can re-sort)
    By Category:    group rows by categoryName → accordion
    By Station:     group rows by stationName → accordion
    Complementary:  rows.filter(r => r.isComplementary)
    % of Total:     (row.netSales / grandTotal) * 100

UI  →  Same S7/S6 pattern:
  Header: back button, title, date range, Apply, presets (Today/7D/30D/MTD/1Y/FY), Column chooser, Download
  KPI strip: 5 cards
  Tabs: All Items | By Category | By Station | Complementary
  Table (All Items): sticky totals row, 12 configurable columns, search, sort, export

EXPORT (no additional API call):
  exportReportAsExcel({ title, dateRange, kpis, sheets: [allItems, byCategory, byStation] })
  exportReportAsPDF(window, { title, dateRange, kpis, sheets: [allItems] })
  Both from existing reportExporter.js — takes in-memory rows, generates file client-side.
```

---

## Affected Files

### Files WILL change (5 total)

| # | File | Action | Scope | Lines changed |
|---|---|---|---|---|
| 1 | `src/api/constants.js` | EDIT — add `TOP_FOOD_SALES_REPORT` endpoint | +1 line after ORDER_LOGS_REPORT | ~1 |
| 2 | `src/api/services/topFoodSalesService.js` | CREATE NEW | Full service file | ~80 |
| 3 | `src/pages/reports-module/ItemSalesLedgerMockup.jsx` | CREATE NEW | Full component | ~500 |
| 4 | `src/App.js` | EDIT — add import + protected route | +2 lines | ~2 |
| 5 | `src/components/layout/Sidebar.jsx` | EDIT — add nav entry | +1 item under "Sales Ledger" group | ~3 |

### Files WILL NOT touch

`OrderLedgerMockup.jsx`, `orderLedgerService.js`, `ItemSalesHybridMockup.jsx`, `insightsService.js`, `foodCourtService.js`, `reportTransform.js`, `reportExporter.js`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `LoadingPage.jsx`, any financial/order screens.

---

## Implementation Notes (for Planning agent Gate 3)

### constants.js edit (Edit 1)

Add after `ORDER_LOGS_REPORT`:
```javascript
TOP_FOOD_SALES_REPORT: '/api/v1/vendoremployee/top-food%20sales-report', // CR-136
```

### topFoodSalesService.js (New File)

Key decisions:
- **Use `fetchOrReuse` from `insightsCache.js`** for caching (consistent with all other services)
- **No `getBusinessDayRange` needed** — backend already applies business-day timezone in its `from`/`to` response. No FE filtering required (unlike `order-logs-report` which returns raw timestamps needing FE filtering)
- **All row numerics must `parseFloat()`** — API returns all row-level numbers as strings (confirmed: `"total_quantity": "7"`, `"item_price": "1330.00"`, etc.)
- **Root `total_sales` is a number** (inconsistency with row-level strings — use directly)

### Sidebar.jsx edit (Edit 5)

Current structure (lines 150-151):
```javascript
{ id: "insights-items-group", label: "Sales Ledger", isGroup: true },
{ id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },
```

After edit:
```javascript
{ id: "insights-items-group", label: "Sales Ledger", isGroup: true },
{ id: "insights-items", label: "Items Ledger", path: "/reports-module/items" },
{ id: "insights-item-sales", label: "Item Sales", path: "/reports-module/item-sales" }, // CR-136
```

### ItemSalesLedgerMockup.jsx — Tab structure

```
Tab: ALL ITEMS
  → Flat table, 12 cols, sticky TOTALS row, sorted by netSales DESC
  → Search by foodItem / categoryName (FE instant filter)
  → Sort by any column

Tab: BY CATEGORY
  → Accordion rows: [▼ Indian Mains (Veg) — 23 items — ₹54,483]
  → Expanded: item rows + subtotal per category
  → sorted by category netSales DESC

Tab: BY STATION
  → Same accordion pattern, grouped by stationName
  → Only show if multiple stations (otherwise hide tab)

Tab: COMPLEMENTARY
  → Flat table, same columns as All Items, filter: isComplementary === true
  → Show "No complementary items" empty state if none
```

### Export payload structure (column-chooser-aware — OWNER CONFIRMED)

```javascript
// Export uses visibleColList (same as table render) — NOT full COLUMNS array
// Both PDF and Excel respect column chooser selection
const buildExportPayload = () => {
  const exportCols = visibleColList.map((c) => ({
    key: c.key, label: c.label,
    format: c.align === 'right' ? 'inr' : 'text',
    align: c.align, width: 100,
  }));
  const computeTotals = (rows) => {
    const t = { label: `TOTAL (${rows.length})` };
    visibleColList.forEach((c) => {
      if (c.align === 'right') t[c.key] = rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
    });
    return t;
  };
  return {
    title: 'Item Sales',
    dateRange: { from: appliedFrom, to: appliedTo },
    kpis: [ /* 5 KPI cards */ ],
    sheets: [
      { name: 'All Items',   columns: exportCols, rows: sortedRows,    totals: computeTotals(sortedRows) },
      { name: 'By Category', columns: exportCols, rows: categoryRows,  totals: computeTotals(categoryRows) },
      { name: 'By Station',  columns: exportCols, rows: stationRows,   totals: computeTotals(stationRows) },
    ],
  };
};
// Rank column: always included in export regardless of chooser (OD resolved: keep rank)
// Variation/Addon columns: DEFERRED — no implementation in this CR
```

---

## Owner Decisions Required (Gate 3 blocker)

| # | Decision | Options | Impact on plan |
|---|---|---|---|
| **OD-1** | Sidebar label | "Item Sales" / "Top Sellers" / "Item Performance" | Label in Sidebar.jsx line change |
| **OD-2** | Route | `/reports-module/item-sales` OR reuse `/reports-module/items` (replacing ItemSalesHybrid) | Route in App.js |
| **OD-3** | Relationship to CR-011 S5 (ItemSalesHybrid) | Keep both running / Replace ItemSalesHybrid with this | Scope of App.js + Sidebar changes |
| **OD-4** | Presets: include `1Y` and `FY`? | Yes (no limit) / Only Today/7D/30D/MTD | Preset array in component |

**OD-2 and OD-3 are gate-blockers** — determines whether this is a new route alongside existing or a replacement.

---

## Downstream Risk

| Risk | Assessment |
|---|---|
| Regression on Order Ledger | ZERO — zero shared files |
| Regression on ItemSalesHybrid | ZERO — zero shared files |
| Regression on Food Court | ZERO — `foodCourtService.js` uses same endpoint but separate service |
| Cache collision with Food Court | LOW — cache key includes endpoint name (`'top-food-sales'` vs `'order-logs'`), distinct |
| Export failure | LOW — `reportExporter.js` is battle-tested across 5+ screens |

---

---

## FROZEN — Gate 2 Complete (2026-08-12)

### All Owner Decisions Resolved

| OD | Decision | Source |
|---|---|---|
| OD-1 Sidebar label | **"Item Sales"** | Mockup approved |
| OD-2 Route | **`/reports-module/item-sales`** | Owner: separate report |
| OD-3 ItemSalesHybrid | **Keep both** — no replacement | Owner: separate report |
| OD-4 Presets | **Today / 7D / 30D / MTD / 1Y / FY** (all enabled) | Owner confirmed |
| Export columns | **visibleColList only** — column chooser controls both PDF + Excel | Owner confirmed |
| Rank column | **Keep, sorted highest Net Sales first** (`index + 1`, FE-computed) | Owner: "this highest first" |
| Variation/Addon breakdown | **DEFERRED** — separate CR, filed later | Owner confirmed |

### Design Status: FROZEN ✅
Mockup URL: https://core-pos-preview-13.preview.emergentagent.com/cr136-item-sales-ledger-mockup.html
Design file: `/app/frontend/public/cr136-item-sales-ledger-mockup.html`

### Impact Analysis Status: FROZEN ✅
Path: `/app/memory/impact/CR-136_IMPACT_ANALYSIS.md`

**Zero open questions. Ready for Gate 4 GO → Implementation.**
