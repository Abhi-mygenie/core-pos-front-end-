# CR-136 — Item Sales Ledger (Backend-Aggregated Item Performance Report)

**ID:** CR-136
**Type:** CR (New Feature)
**Priority:** P2 — MEDIUM
**Risk:** MEDIUM (new screen, new service, no financial order logic, no hotspot files)
**Status:** INTAKE — Gate 0→1
**Sprint:** pos_5_1
**Registered:** 2026-08-12
**Source:** OWNER-REQUESTED

---

## Description

Create a new report screen — **"Item Sales Ledger"** — that shows **food-item level performance data** powered by the backend-aggregated `top-food-sales-report` endpoint.

This is **NOT a replacement** for:
- Order Ledger (`OrderLedgerMockup.jsx`) — which shows per-order audit trail
- Existing Item Ledger / Items Hybrid (`ItemSalesHybridMockup.jsx`, CR-011 S5) — which uses FE-side aggregation from `order-logs-report`

This is a **new companion report** with a different data source, different grain (item × station), and different tab anatomy (By Category / By Station / Complementary instead of Settled/Cancelled/Running).

---

## Owner Request Summary

> "Create a separate report similar to Order Ledger but from backend aggregation point (top-food-sales-report endpoint). Include PDF and Excel download."

**PDF/Excel clarification (owner-confirmed):**
- Data source: `top-food-sales-report` (1 backend API call, backend aggregated)
- File generation: **client-side** using existing `exportReportAsExcel` / `exportReportAsPDF` from `reportExporter.js`
- No additional backend export endpoint required
- Same pattern as Food Court, Order Ledger, Settlement Report

---

## Duplicate Check

| Item | Relationship | Verdict |
|---|---|---|
| **CR-011 S5** (`ItemSalesHybridMockup.jsx`) | Same report domain (Item Sales), but uses `ORDER_LOGS_REPORT` with FE aggregation. Different data source + different tabs. | **DISTINCT** — different data pipeline |
| **CR-013** (Food Court) | Same backend endpoint (`top-food-sales-report`), but different screen (station-filtered order rows, not item-level aggregated) | **RELATED** — shares endpoint, different view |
| All other report CRs | No overlap | DISTINCT |

**Duplicate check: DISTINCT**
**Code Reality: NONE** — no existing `topFoodSalesService.js`, no `ItemSalesLedgerMockup.jsx`, `TOP_FOOD_SALES_REPORT` not in `constants.js`

---

## Feature Scope

### New Route
`/reports-module/item-sales` → `ItemSalesLedgerMockup.jsx`

### Data Source
```
POST /api/v1/vendoremployee/top-food%20sales-report
Payload: { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
No date range limit (single API call for any range — no batching needed)
```

### UI Anatomy

**Header:** Same S5/S6/S7 pattern — back button, title, date range (From–To), Apply, presets (Today / 7D / 30D / MTD / 1Y / FY), Column chooser, Download.

**KPI Strip (5 cards):**
- Unique Items (count of rows)
- Total Units Sold (`Σ total_quantity`)
- Gross Revenue (`Σ item_price + variation_price + addon_price`)
- Total Discount (`Σ discount`)
- Net Sales (`Σ total_sales`)

**Tabs (4):**

| Tab | Filter | View |
|---|---|---|
| **All Items** | All rows | Flat ranked table, sorted by Net Sales desc |
| **By Category** | Group by `category_name` | Accordion rows per category + subtotal |
| **By Station** | Group by `station_name` | Accordion rows per station + subtotal |
| **Complementary** | `complementary_status === 'Yes'` | Flat table, cost-of-complements view |

**Table Columns — All Items tab (10 columns):**

| # | Column | Source Field | Default Visible |
|---|---|---|---|
| 1 | Rank | FE computed (position) | ✅ |
| 2 | Food Item | `food_item` | ✅ |
| 3 | Category | `category_name` | ✅ |
| 4 | Station | `station_name` | ✅ |
| 5 | Qty Sold | `total_quantity` (parseFloat) | ✅ |
| 6 | Base Price | `item_price` (parseFloat) | ✅ |
| 7 | Variation | `variation_price` (parseFloat) | hidden (chooser) |
| 8 | Addon | `addon_price` (parseFloat) | hidden (chooser) |
| 9 | Discount | `discount` (parseFloat) | ✅ |
| 10 | GST | `gst` (parseFloat) | hidden (chooser) |
| 11 | Net Sales | `total_sales` (parseFloat) | ✅ |
| 12 | % of Total | FE computed: `(row.total_sales / grand_total) × 100` | hidden (chooser) |

**NOTE: All row-level numeric fields from the API are strings — must `parseFloat()` in service transform.**

**Sticky TOTALS row at top** (same as Order Ledger / Food Court pattern).

**Search:** Filter by `food_item` or `category_name` (FE-side, instant, no re-fetch).

**Sort:** FE-side sort on any column. Backend pre-sorts by `total_sales` DESC.

### Export (PDF / Excel)
- Uses existing `exportReportAsExcel()` and `exportReportAsPDF()` from `reportExporter.js`
- Data already in memory from the single API call — no additional backend call
- Excel: multi-sheet (All Items, By Category, By Station)
- PDF: single sheet with KPI strip + table

---

## Risk Classification

| Field | Value |
|---|---|
| **Risk** | MEDIUM |
| **Trigger** | New report screen + new service file. Touches `constants.js` (1 line), `Sidebar.jsx` (1 line), `App.js` (1 route). No financial order logic. No hotspot files (R5 list). |
| **Fast Lane eligible** | NO — multi-file, new screen |
| **Financial logic** | NO — display-only aggregated data |
| **Hotspot files touched** | NONE |

---

## Blast Radius

```bash
grep -rn "top-food\|TOP_FOOD_SALES\|topFoodSales\|ItemSalesLedger" \
  /app/frontend/src/ --include="*.js" --include="*.jsx"
# Result: 0 references — clean slate, zero blast radius on existing code
```

- **Files WILL change:** `constants.js` (+1 line), `App.js` (+1 route), `Sidebar.jsx` (+1 nav entry)
- **Files WILL NOT touch:** `OrderLedgerMockup.jsx`, `orderLedgerService.js`, `ItemSalesHybridMockup.jsx`, `insightsService.js`, `foodCourtService.js`, `reportTransform.js`, any order/payment/financial screen

Blast radius: **SMALL** (3 new files + 3 one-line edits)

---

## Evidence

- Investigation report: `/app/memory/investigation/ORDER-LEDGER-BE-AGG_INVESTIGATION_REPORT_2026_08_12.md`
- API response samples:
  - `/app/memory/evidence/FC-BACKEND-AGG/api_response_cafe103.json` (Aug 3, 64 rows)
  - `/app/memory/evidence/FC-BACKEND-AGG/api_response_shimla_july.json` (July, 282 rows, 4 stations)
- Endpoint confirmed live: `POST https://preprod.mygenie.online/api/v1/vendoremployee/top-food%20sales-report`
- Authentication: same Bearer token as all other vendoremployee endpoints

---

## Open Questions

| # | Question | Owner Decision Needed |
|---|---|---|
| OQ-1 | Route: `/reports-module/item-sales` or keep under `/reports-module/items` (currently ItemSalesHybrid)? | YES — route naming |
| OQ-2 | Sidebar label: "Item Sales", "Item Performance", "Top Sellers", or something else? | YES |
| OQ-3 | Should this eventually REPLACE `ItemSalesHybridMockup.jsx` (CR-011 S5) or live alongside it? | YES — architecture decision |
| OQ-4 | Column chooser scope: 12 columns (keep minimal) or match Order Ledger's 51-column approach? | NO — 12 columns recommended, can change later |
| OQ-5 | Presets: include `1Y` and `FY` (Order Ledger only goes Today/7D/30D/MTD/FY-disabled)? Backend supports unlimited range | YES — confirm if 1Y/FY wanted |

---

## Next Step

Planning Gate 2 — Impact Analysis.

Handover to Planning agent when owner gives Gate 2 GO.

---

**Intake complete: CR-136**
**Classification: CR, P2, Risk: MEDIUM**
**Duplicate check: DISTINCT (related: CR-011 S5 concept-only, CR-013 shares endpoint)**
**Evidence: API probed, shape confirmed**
**Blast radius: SMALL (~3 new + 3 one-line edits, 0 existing screen changes)**
**Docs updated:** `change_requests/CR-136_ITEM_SALES_LEDGER_INTAKE.md`
**Next: Planning Gate 2**
