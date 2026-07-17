# CR-011 Phase 3 — Gate 2 Impact Analysis + Gate 3 Implementation Plan (Batches C–J)

**Role:** PLANNING agent
**Date:** 2026-06-16
**Items:** 20 screens (S19–S38 minus S28/S34/S35... actually: S19–S27, S28–S31, S32–S38)
**Code Reality:** NONE — no code exists for any of these 20 screens
**Conflict Pre-Check:** CLEAR — no open item touches the target files (all 20 are new .jsx files)

---

## GATE 2: IMPACT ANALYSIS

### Data Flow Trace (all 20 screens share this pattern)

```
API Endpoint (preprod.mygenie.online)
  → POST /api/v2/vendoremployee/report/insights-{endpoint}
  → Response: { success: true, data: { ... } }
  → fetchInsights{Endpoint}() in insightsService.js (cache-aware via fetchOrReuse)
  → Screen component calls fetch on mount + date change
  → useMemo transforms response → analytics shape
  → Renders: KPI cards + recharts visualizations + table + export
```

No transform layer, no raw data processing, no financial logic. Each screen receives pre-aggregated data and displays it.

### Affected Files (shared infrastructure)

| File | Change Type | Lines Affected | Risk |
|------|-------------|:---:|:---:|
| `api/constants.js` | ADD 5 endpoint URLs (lines ~107-111) | +5 | LOW |
| `api/services/insightsService.js` | ADD 5 fetch functions (after line 1110) | +50 | LOW |
| `App.js` | ADD 16 imports + 16 routes | +32 | LOW |
| `components/layout/Sidebar.jsx` | REMOVE 6 `comingSoon: true` flags | 6 lines changed | LOW |
| 16 NEW `.jsx` files in `pages/reports-module/` | CREATE | ~250-400 each | NONE (new files) |

### Downstream Consumers
- None. These are leaf screens — they render data, nothing depends on them.

### Owner Decisions Needed
- **NONE.** All screens follow the frozen S7 template pattern. No business logic decisions. Data comes from backend; FE renders as-is.

---

## GATE 3: IMPLEMENTATION PLAN

### §1. Service Layer (shared across all batches)

#### Edit 1: Add endpoint constants (`api/constants.js` ~line 107)

```javascript
// After line 106 (INSIGHTS_CANCELLATIONS):
  INSIGHTS_TAX:           '/api/v2/vendoremployee/report/insights-tax',
  INSIGHTS_DISCOUNTS:     '/api/v2/vendoremployee/report/insights-discounts',
  INSIGHTS_STAFF:         '/api/v2/vendoremployee/report/insights-staff',
  INSIGHTS_CUSTOMERS:     '/api/v2/vendoremployee/report/insights-customers',
  INSIGHTS_LOCATIONS:     '/api/v2/vendoremployee/report/insights-locations',
```

#### Edit 2: Add 5 fetch functions (`api/services/insightsService.js` after line 1110)

```javascript
export const fetchInsightsTax = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-tax', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_TAX, { from_date: fromDate, to_date: toDate });
    return resp.data?.data;
  });
};

export const fetchInsightsDiscounts = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-discounts', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_DISCOUNTS, { from_date: fromDate, to_date: toDate });
    return resp.data?.data;
  });
};

export const fetchInsightsStaff = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-staff', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_STAFF, { from_date: fromDate, to_date: toDate });
    return resp.data?.data;
  });
};

export const fetchInsightsCustomers = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-customers', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_CUSTOMERS, { from_date: fromDate, to_date: toDate });
    return resp.data?.data;
  });
};

export const fetchInsightsLocations = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-locations', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_LOCATIONS, { from_date: fromDate, to_date: toDate });
    return resp.data?.data;
  });
};
```

#### Edit 3: Remove `comingSoon` flags from Sidebar (`Sidebar.jsx` lines 77-83)

Remove `comingSoon: true` from: `insights-tax`, `insights-discounts`, `insights-locations`, `insights-staff`, `insights-audit-log`, `insights-customers`

#### Edit 4: Add routes to App.js

16 new routes inside the `<Route path="/reports-module/*">` block.

---

### §2. Per-Batch Screen Plans

---

### BATCH E: S28 + S34 + S35 (Cancel + Audit)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S28 | Item Cancellation Detail | `CancelDetailMockup.jsx` | `cancel-detail` | `insights-cancellations` | `fetchInsightsCancellations` (existing) |
| S34 | Order Edit Audit | `AuditLogMockup.jsx` | `audit-log` | `insights-dashboard` | `fetchInsightsDashboard` (existing) |
| S35 | Order Note Audit | `OrderNotesMockup.jsx` | `order-notes` | `insights-cancellations` | `fetchInsightsCancellations` (existing) |

**S28 — Item Cancellation Detail:**
- Data: `cancellations.items[]` — 12 fields: food_id, name, scope, qty, amount, stage, reason, cancel_date, cancel_time, cancelled_by, order_id, order_date
- KPIs: Total items cancelled, total loss, top reason, top stage
- Filters: by stage (dropdown), by reason (dropdown), by employee (dropdown)
- Table: full item-level with all 12 fields
- Export: 1 sheet

**S34 — Order Edit Audit:**
- Data: `dashboard.audits.orders[]` — 6 fields: order_id, type, amount, by, prev_method, curr_method
- KPIs: make_unpaid_count, payment_method_change_count, total
- Table: order_id, type, amount, actor, prev→curr method
- Export: 1 sheet

**S35 — Order Note Audit:**
- Data: `cancellations.items[]` filtered where `notes != null`
- KPIs: items with notes count
- Table: order_id, food name, notes, reason, cancel_date
- Export: 1 sheet

---

### BATCH D: S26 + S27 (Discounts)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S26 | Discount Report | `DiscountReportMockup.jsx` | `discounts` | `insights-discounts` | `fetchInsightsDiscounts` (NEW) |
| S27 | Coupon Usage | `CouponUsageMockup.jsx` | `coupons` | `insights-discounts` | `fetchInsightsDiscounts` (NEW) |

**S26 — Discount Report:**
- Data: `discounts.summary` + `discounts.daily[]` + `discounts.by_employee[]`
- KPIs: manual_discount, coupon_discount, loyalty_discount, comp_total, total
- Charts: daily area chart (manual + coupon + loyalty + comp stacked), by_employee bar chart
- Table: daily breakdown, employee breakdown
- Export: 2 sheets (Daily, By Employee)

**S27 — Coupon Usage:**
- Data: `discounts.coupons[]` — fields: code, type, uses, discount_total, orders
- KPIs: total coupons used, total discount from coupons
- Table: code, type, uses, discount_total, orders
- Empty state: "No coupons used in this period" (valid for restaurants without coupons)
- Export: 1 sheet

---

### BATCH F: S32 + S33 (Staff)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S32 | Server Performance | `StaffServersMockup.jsx` | `staff-servers` | `insights-staff` | `fetchInsightsStaff` (NEW) |
| S33 | Cashier Activity | `StaffCashiersMockup.jsx` | `staff-cashiers` | `insights-staff` | `fetchInsightsStaff` (NEW) |

**S32 — Server Performance:**
- Data: `staff.by_server[]` — 7 fields: name, employee_id, orders, revenue, avg_order_value, tips, cancel_count
- KPIs: top server (by revenue), total tips, total orders
- Chart: horizontal bar (revenue by server)
- Table: all 7 fields with sort
- Export: 1 sheet

**S33 — Cashier Activity:**
- Data: `staff.by_cashier[]` — 6 fields: name, employee_id, orders_processed, cash_collected, card_collected, upi_collected
- KPIs: total orders processed, cash %, card %, upi %
- Chart: stacked bar per cashier (cash/card/upi)
- Table: all 6 fields
- Note: 🟡 BE-1 caveat — partial payment legs may not be fully accurate
- Export: 1 sheet

---

### BATCH G: S36 + S37 (Customers)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S36 | RFM Customers | `CustomersRfmMockup.jsx` | `customers-rfm` | `insights-customers` | `fetchInsightsCustomers` (NEW) |
| S37 | Guest vs Registered | `CustomersMixMockup.jsx` | `customers-mix` | `insights-customers` | `fetchInsightsCustomers` (NEW) |

**S36 — RFM Customers:**
- Data: `customers.summary` + `customers.top_customers[]` (7 fields) + `customers.rfm_bands[]` (3 fields)
- KPIs: unique_customers, repeat_customers, repeat_pct
- Charts: RFM bands donut, top customers bar chart (by spend)
- Table: top_customers — name, phone, visits, total_spend, last_visit, avg_order
- Export: 2 sheets (Top Customers, RFM Bands)

**S37 — Guest vs Registered Mix:**
- Data: `customers.summary` + `customers.daily[]` (date, registered_orders, guest_orders)
- KPIs: registered %, guest %, total orders
- Charts: stacked bar (daily registered vs guest), donut (mix split)
- Table: daily breakdown
- Export: 1 sheet

---

### BATCH C: S23 + S24 + S25 (Tax)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S23 | GST/VAT Detail | `TaxDetailMockup.jsx` | `tax-detail` | `insights-tax` + `insights-items` | `fetchInsightsTax` + `fetchInsightsItems` (both) |
| S24 | Tax Slab Summary | `TaxSlabsMockup.jsx` | `tax-slabs` | `insights-tax` | `fetchInsightsTax` (NEW) |
| S25 | Inclusive/Exclusive Mix | `TaxCalcMockup.jsx` | `tax-calc` | `insights-tax` | `fetchInsightsTax` (NEW) |

**S23 — GST/VAT Detail (largest screen — combines 2 endpoints):**
- Data: `tax.summary` + `tax.daily[]` + `items.items[]` (per-item tax_rate, tax_type, tax_calc)
- KPIs: total_gst, total_vat, total_tax
- Charts: daily tax area chart, tax type donut (GST vs VAT)
- Table 1: daily tax breakdown (date, gst, vat, total)
- Table 2: per-item tax detail (item name, tax_rate, tax_type, tax_calc, sold.tax)
- Export: 2 sheets (Daily Tax, Item Tax Detail)
- Fetch: sequential — fetchInsightsTax then fetchInsightsItems (with loading states per section)

**S24 — Tax Slab Summary:**
- Data: `tax.by_slab[]` — 4 fields: rate, orders, revenue, tax
- KPIs: slab count, total tax collected
- Chart: bar chart (revenue by slab rate), pie chart (tax distribution by slab)
- Table: rate, orders, revenue, tax
- Export: 1 sheet

**S25 — Inclusive/Exclusive Mix:**
- Data: `tax.by_calc[]` — 3 fields: method, orders, revenue
- KPIs: exclusive %, inclusive %, total revenue
- Chart: donut (method split)
- Table: method, orders, revenue, percentage
- Export: 1 sheet

---

### BATCH H: S29 + S30 + S31 (Locations)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S29 | Table-wise Sales | `TableSalesMockup.jsx` | `locations-tables` | `insights-locations` | `fetchInsightsLocations` (NEW) |
| S30 | Delivery Charge Report | `DeliveryChargeMockup.jsx` | `locations-delivery` | `insights-locations` | `fetchInsightsLocations` (NEW) |
| S31 | Room Transfer Trail | `RoomTransfersMockup.jsx` | `locations-transfers` | `insights-locations` | `fetchInsightsLocations` (NEW) |

**S29 — Table-wise Sales:**
- Data: `locations.by_table[]` — 4 fields: table_id, table_name, orders, revenue
- KPIs: table count, busiest table, highest revenue table
- Chart: horizontal bar (top 15 tables by revenue)
- Table: table_name, orders, revenue (sortable)
- Export: 1 sheet

**S30 — Delivery Charge Report:**
- Data: `locations.delivery_charges` — {total, daily[]}
- KPIs: total charges, daily average, orders with delivery
- Chart: daily area chart
- Table: date, charge, orders
- Export: 1 sheet

**S31 — Room Transfer Trail:**
- Data: `locations.room_transfers[]` — 6 fields: order_id, from_room, to_room, items_count, transfer_date, transfer_time
- KPIs: total transfers, most-transferred-from room
- Table: all 6 fields (chronological)
- Export: 1 sheet

---

### BATCH I: S19 + S20 + S21 + S22 (Payments)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S19 | Cashier Settlement | `CashierSettlementMockup.jsx` | `cashier-settlement` | `insights-staff` | `fetchInsightsStaff` (NEW) |
| S20 | Gateway Reconciliation | `GatewayReconMockup.jsx` | `gateway-recon` | `insights-sales` | `fetchInsightsSales` (existing) |
| S21 | Tip Report | `TipReportMockup.jsx` | `tips` | `insights-staff` | `fetchInsightsStaff` (NEW) |
| S22 | Round-Off Report | `RoundOffMockup.jsx` | `round-off` | `insights-sales` | `fetchInsightsSales` (existing) |

**S19 — Cashier Settlement:**
- Data: `staff.by_cashier[]` — per-cashier cash/card/upi breakdown
- KPIs: total collected, per-method totals
- Chart: stacked bar per cashier
- Table: cashier name, orders, cash, card, upi, total
- 🟡 BE-1 caveat footnote: "Partial payment split approximate"
- Export: 1 sheet

**S20 — Gateway Reconciliation:**
- Data: `sales.payments[]` filtered to digital methods (Card, UPI)
- KPIs: total digital payments, card total, upi total, digital %
- Chart: donut (card vs upi vs other digital)
- Table: method, orders, revenue
- Export: 1 sheet

**S21 — Tip Report:**
- Data: `staff.by_server[].tips` — per-server tip amounts
- KPIs: total tips, avg tip per order, top tip earner
- Chart: bar chart (tips by server)
- Table: server name, orders, tips, avg tip/order
- Export: 1 sheet

**S22 — Round-Off Report:**
- Data: derive from `sales.daily[]` (revenue includes round-offs) — simplest screen
- Note: Backend doesn't have a dedicated round-off field in insights-sales. This screen shows order-level round_up data. May need `order-logs-report` for per-order detail.
- KPIs: data availability TBD — if insights-sales doesn't have round_up, show aggregate from daily revenue
- Fallback: label as "Revenue includes round-offs; per-order detail available in Order Ledger"
- Export: 1 sheet (if data available)

---

### BATCH J: S38 (KOT Variance)

| # | Screen | File | Route | Endpoint | Fetch Function |
|---|--------|------|-------|----------|----------------|
| S38 | KOT-vs-Bill Variance | `KotVarianceMockup.jsx` | `kot-variance` | `insights-items` + `insights-dashboard` | `fetchInsightsItems` + `fetchInsightsDashboard` (both existing) |

**S38 — KOT-vs-Bill Variance:**
- Data: `items.items[]` (group by station: sold vs cancelled) + `dashboard.kitchen` (prep/serve times)
- KPIs: total variance %, worst station, items with variance
- Table: station, KOT items (sold+cancelled+comp), billed items (sold), variance count, variance %
- Chart: bar chart per station (KOT vs Billed)
- Export: 1 sheet

---

## §3. VERIFICATION MATRIX

| Edit # | File | Change | How to Verify | Automated? |
|:------:|------|--------|---------------|:---:|
| 1 | `api/constants.js` | 5 new endpoint URLs | grep for INSIGHTS_TAX etc. | YES |
| 2 | `insightsService.js` | 5 new fetch functions | `curl` each endpoint → compare response keys | YES |
| 3 | `Sidebar.jsx` | Remove comingSoon flags | Visual — sidebar shows Tax, Discounts etc. without "Coming Soon" | NO |
| 4 | `App.js` | 16 new routes | Navigate to each route → page loads | NO |
| 5-20 | 16 new `.jsx` files | Screen renders with data | Screenshot each with 30D date range | NO |
| 21 | All screens | Excel export works | Click Download → Excel → file generates | NO |
| 22 | All screens | PDF export works | Click Download → PDF → print window opens | NO |
| 23 | webpack | Compiles clean | `tail frontend.out.log` → "compiled" with 0 new warnings | YES |

---

## §4. SCOPE LOCK

**Files WILL change:**
- `api/constants.js` — 5 new lines
- `api/services/insightsService.js` — ~50 new lines (5 fetch functions)
- `App.js` — ~32 new lines (16 imports + 16 routes)
- `components/layout/Sidebar.jsx` — 6 lines modified (remove comingSoon)
- 16 NEW `.jsx` files created in `pages/reports-module/`

**Files will NOT change:**
- ANY frozen Phase 1/2 screen (S0–S10, S-ROOM, S-FC)
- `ItemSalesHybridMockup.jsx` (Batch B already done)
- `orderTransform.js` (no financial logic)
- `CollectPaymentPanel.jsx` (no payment logic)
- `DashboardPage.jsx` (no order entry logic)
- Backend code

---

## §5. EXECUTION SEQUENCE

```
Step 1: Add 5 endpoint constants to api/constants.js
Step 2: Add 5 fetch functions to insightsService.js
Step 3: Build Batch E screens (S28, S34, S35) — 3 files
Step 4: Build Batch D screens (S26, S27) — 2 files
Step 5: Build Batch F screens (S32, S33) — 2 files
Step 6: Build Batch G screens (S36, S37) — 2 files
Step 7: Build Batch C screens (S23, S24, S25) — 3 files
Step 8: Build Batch H screens (S29, S30, S31) — 3 files
Step 9: Build Batch I screens (S19, S20, S21, S22) — 4 files (S22 may be placeholder)
Step 10: Build Batch J screen (S38) — 1 file
Step 11: Add all 16 imports + routes to App.js
Step 12: Remove comingSoon from Sidebar.jsx
Step 13: Verify webpack compiles clean
Step 14: Screenshot all 16 screens with cafe103 30D data
```

---

## §6. RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|:---:|:---:|------------|
| S22 Round-Off: no dedicated round_up field in insights-sales | HIGH | LOW | Show placeholder with note "detail in Order Ledger" |
| S33 Cashier: BE-1 partial payment accuracy | MEDIUM | LOW | Footnote in screen |
| S23 Tax Detail: dual-endpoint fetch slower | LOW | LOW | Sequential load with per-section loading state |
| A-4 Palm House discount: S26 may show different number than expected | LOW | LOW | FE renders what API returns — flagged for backend |
| Sidebar re-render on comingSoon removal | LOW | LOW | Cosmetic only — no logic change |

---

## §7. POST-CODE REGISTRY CHECKLIST (for IMPLEMENTATION agent)

```
- [ ] registry.json: CR-011 → status updated to reflect Phase 3 progress
- [ ] CR_REGISTRY.md: CR-011 row updated
- [ ] FILE_OWNERSHIP.md: add all 16 new files + modified files with date
- [ ] Code markers: // CR-011 S{XX} comment in every new file header
- [ ] Screen Freeze Log: all 16 screens → 🟠 Gate ①+④ done
```

---

## HANDOVER

Plan ready at `/app/memory/CR_011_PHASE3_GATE2_GATE3_BATCHES_C_TO_J.md`.
- 20 screens across 8 batches.
- 16 new .jsx files + 5 fetch functions + 5 endpoint constants + 16 routes + 6 sidebar fixes.
- Code reality: NONE. Conflict: CLEAR.
- Scope: 22 files changed (16 new + 6 existing). No frozen files touched.
- Verification matrix: 23 checks (3 automated, 20 manual/visual).
- Owner decisions needed: NONE.
- S22 Round-Off may be placeholder (no dedicated data field).
- **Awaiting Gate 4 GO.**

---

*Gate 2 + Gate 3 complete for CR-011 Phase 3 remaining screens. Planning agent role fulfilled.*
