# CR-011 Phase 3 — Complete Implementation Plan

**Role:** PLANNING agent (Gate 3)
**Date:** 2026-06-15
**Status:** ALL 9 endpoints live. ALL previous blockers cleared. 28 screens plannable.
**Code Reality:** 4/28 built (S11–S14). 24 remaining.

---

## 1. BLOCKER STATUS UPDATE

**All blockers from the Phase 3 Endpoint Sufficiency Audit are CLEARED:**

| Previous Blocker | Status Now |
|-----------------|:----------:|
| `insights-tax` not built | ✅ LIVE — `by_slab`, `by_type`, `by_calc`, `daily` |
| `insights-discounts` not built | ✅ LIVE — `summary`, `daily`, `by_employee`, `coupons` |
| `insights-staff` not built | ✅ LIVE — `by_server` (7 fields), `by_cashier` (6 fields) |
| `insights-customers` not built | ✅ LIVE — `summary`, `daily`, `top_customers`, `rfm_bands` |
| `insights-locations` not built | ✅ LIVE — `by_table`, `delivery_charges`, `room_transfers` |
| `tax_rate`/`tax_type`/`tax_calc` on items | ✅ DELIVERED — all 3 fields present |
| `notes` field on cancellation items | ✅ DELIVERED — 41/343 items have notes |
| BE-1 partial payment legs (S33) | 🟡 FLAGGED — `by_cashier` returns `cash/card/upi_collected` but partial split TBD |

**Result: 27/28 screens fully unblocked. S33 (Cashier Activity) partially available — `by_cashier` exists but partial payment leg accuracy depends on BE-1.**

---

## 2. IMPLEMENTATION BATCHES

### Batch A — Sales Deep-Dives (4 screens) — ✅ DONE

| # | Screen | File | Endpoint | Status |
|---|--------|------|----------|:------:|
| S11 | Daily Sales Summary | `DailySalesMockup.jsx` | `insights-sales.daily[]` | ✅ Gate ①+④ |
| S12 | Hourly Sales Curve | `HourlySalesMockup.jsx` | `insights-sales.hourly[]` | ✅ Gate ①+④ |
| S13 | Day-of-Week Trend | `DayOfWeekMockup.jsx` | `insights-sales.daily[]` → weekday group | ✅ Gate ①+④ |
| S14 | Channel × Payment | `ChannelPivotMockup.jsx` | `insights-sales.channels[] + payments[]` | ✅ Gate ①+④ |

---

### Batch B — Items Sub-Tabs (4 screens)

**Template:** S5 `ItemSalesHybridMockup.jsx` (existing tabs pattern)
**Endpoint:** `insights-items` (already wired via CR-049)
**Approach:** These are NEW TABS within the existing S5 component, not separate pages.

| # | Screen | Tab ID | Data Source | Visualization |
|---|--------|--------|-------------|---------------|
| S15 | Variation Sales | `variations` | `items[].variations[]` — flatten across all items | Table: Variation Label, Item Count, Total Qty, Total Revenue. Bar chart: top 10 variations by revenue. |
| S16 | Addon Sales | `addons` | `items[].addons[]` — flatten across all items | Table: Addon Name, Attach Count, Attach Rate %. Bar chart: top 10 addons by count. |
| S17 | Complementary Items | `comp_detail` | `items[]` filtered where `complementary.qty > 0` | Table: Item Name, Comp Qty, Would-be Revenue, Category. KPIs: total comp count, total value. |
| S18 | Station Performance | `station` | `items[]` grouped by `station` field | Table: Station, Items, Sold Qty, Revenue, Avg Price. Pie chart: revenue by station. |

**Files to modify:** `ItemSalesHybridMockup.jsx` (add 4 tabs to existing TABS array)
**New files:** NONE (tabs are inline in existing component)
**Effort:** SMALL per tab (~40-60 lines each, reuses existing data/export infra)

---

### Batch C — Tax Reports (3 screens)

**Template:** Clone S7 Sales pattern (header + date picker + charts + table)
**Endpoint:** `insights-tax` (NEW)
**New service function needed:** `fetchInsightsTax(from, to)` in `insightsService.js`

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S23 | GST/VAT Detail | `/reports-module/tax-detail` | `insights-tax.summary` + `insights-tax.daily[]` + `insights-items` (per-item `tax_rate`, `tax_type`, `tax_calc`) | KPIs: Total GST, Total VAT. Daily tax table. Per-item tax detail table with rate/type/calc columns. |
| S24 | Tax Slab Summary | `/reports-module/tax-slabs` | `insights-tax.by_slab[]` | KPIs: slab count, total tax. Bar chart: revenue by slab rate. Table: Rate, Orders, Revenue, Tax. Pie chart: tax distribution by slab. |
| S25 | Inclusive vs Exclusive Mix | `/reports-module/tax-calc` | `insights-tax.by_calc[]` | KPIs: exclusive %, inclusive %. Donut chart. Table: Method, Orders, Revenue. |

**New files:** 3 JSX components
**Service addition:** 1 fetch function
**Effort:** MEDIUM (S23 is larger — combines tax + items endpoints)

---

### Batch D — Discounts & Coupons (2 screens)

**Template:** Clone S7 Sales pattern
**Endpoint:** `insights-discounts` (NEW)
**New service function:** `fetchInsightsDiscounts(from, to)`

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S26 | Discount Report | `/reports-module/discounts` | `insights-discounts.summary` + `daily[]` + `by_employee[]` | KPIs: manual, coupon, loyalty, comp, total. Daily discount area chart. By-employee bar chart. Table: daily breakdown + employee breakdown. |
| S27 | Coupon Usage | `/reports-module/coupons` | `insights-discounts.coupons[]` | Table: Code, Type, Uses, Discount Total, Orders. KPIs: total coupons, total savings. (May show empty state if restaurant has no coupons — valid.) |

**New files:** 2 JSX components
**Service addition:** 1 fetch function
**Effort:** SMALL-MEDIUM

---

### Batch E — Cancellations Detail (1 screen) + Audit (2 screens)

**Endpoint:** `insights-cancellations` (existing) + `insights-dashboard.audits` (existing)

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S28 | Item Cancellation Detail | `/reports-module/cancel-detail` | `insights-cancellations.items[]` | Full item-level cancellation table: Food, Qty, Amount, Stage, Reason, Date, Cancelled By, Order ID. Filterable by stage/reason. KPIs: total items cancelled, loss. Clone S9 Cancellations drill pattern. |
| S34 | Order Edit Audit | `/reports-module/audit-log` | `insights-dashboard.audits.orders[]` | Table: Order ID, Type (make_unpaid/payment_change), Amount, By, Prev Method, Curr Method. KPIs: total audits, make_unpaid count, payment_change count. |
| S35 | Order Note Audit | `/reports-module/order-notes` | `insights-cancellations.items[]` (filter `notes != null`) | Table: Order ID, Food, Notes, Reason, Cancel Date. KPIs: items with notes count. |

**New files:** 3 JSX components
**Service addition:** NONE (reuses existing fetch functions)
**Effort:** SMALL (data already flowing, just new views)

---

### Batch F — Staff Performance (2 screens)

**Endpoint:** `insights-staff` (NEW)
**New service function:** `fetchInsightsStaff(from, to)`

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S32 | Server/Captain Performance | `/reports-module/staff-servers` | `insights-staff.by_server[]` | Table: Name, Orders, Revenue, AOV, Tips, Cancels. Bar chart: revenue by server. KPI cards: top server, total tips. |
| S33 | Cashier Activity | `/reports-module/staff-cashiers` | `insights-staff.by_cashier[]` | Table: Name, Orders Processed, Cash, Card, UPI. Stacked bar: payment method per cashier. 🟡 Note: partial payment accuracy depends on BE-1. |

**New files:** 2 JSX components
**Service addition:** 1 fetch function
**Effort:** SMALL

---

### Batch G — Customers (2 screens)

**Endpoint:** `insights-customers` (NEW)
**New service function:** `fetchInsightsCustomers(from, to)`

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S36 | Repeat Customer (RFM) | `/reports-module/customers-rfm` | `insights-customers.summary` + `top_customers[]` + `rfm_bands[]` | KPIs: unique, repeat %, registered %. RFM band donut. Top customers table: Name, Phone, Visits, Total Spend, Last Visit, Avg Order. |
| S37 | Guest vs Registered Mix | `/reports-module/customers-mix` | `insights-customers.summary` + `daily[]` | KPIs: registered %, guest %. Daily stacked bar (registered vs guest orders). Donut: mix split. |

**New files:** 2 JSX components
**Service addition:** 1 fetch function
**Effort:** SMALL

---

### Batch H — Locations & Channels (3 screens)

**Endpoint:** `insights-locations` (NEW)
**New service function:** `fetchInsightsLocations(from, to)`

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S29 | Table-wise Sales | `/reports-module/locations-tables` | `insights-locations.by_table[]` | Table: Table Name, Orders, Revenue. Bar chart: top 10 tables by revenue. KPIs: table count, busiest table, revenue spread. |
| S30 | Delivery Charge Report | `/reports-module/locations-delivery` | `insights-locations.delivery_charges` | KPIs: total charges, daily avg. Daily area chart. Table: Date, Charges, Orders. |
| S31 | Room Transfer Trail | `/reports-module/locations-room-transfers` | `insights-locations.room_transfers[]` | Table: Order ID, From Room, To Room, Items, Date, Time. KPIs: total transfers, most-transferred-from room. |

**New files:** 3 JSX components
**Service addition:** 1 fetch function
**Effort:** SMALL-MEDIUM

---

### Batch I — Payments (4 screens)

**Endpoint:** `insights-sales` (existing) + `insights-staff.by_cashier` (for S19)
**Note:** S19/S20 have partial dependency on BE-1 (partial payment legs)

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S19 | Cashier Settlement | `/reports-module/cashier-settlement` | `insights-staff.by_cashier[]` + `insights-sales.payments[]` | Per-cashier settlement breakdown. 🟡 Partial payment accuracy depends on BE-1. |
| S20 | Gateway Reconciliation | `/reports-module/gateway-recon` | `insights-sales.payments[]` (Card + UPI detail) | Payment gateway summary. Card vs UPI vs other digital. KPIs. 🟡 Needs real payment gateway IDs for full recon — build what's available now. |
| S21 | Tip Report | `/reports-module/tips` | `insights-staff.by_server[].tips` + `insights-sales` | KPIs: total tips, avg tip per order. By-server tip table. Daily trend (if available). |
| S22 | Round-Off Report | `/reports-module/round-off` | `insights-sales.daily[]` (derive from revenue data) | KPIs: total round-off. Daily table. Simple — smallest screen. |

**New files:** 4 JSX components
**Effort:** SMALL (S22) to MEDIUM (S19, S20)

---

### Batch J — Operational (1 screen)

| # | Screen | Route | Data Source | Visualization |
|---|--------|-------|-------------|---------------|
| S38 | KOT-vs-Bill Variance | `/reports-module/kot-variance` | `insights-items` (sold vs cancelled by station) + `insights-dashboard.kitchen` | Cross-tab: Station × (KOT items vs Billed items vs Cancelled). Variance column. KPIs: total variance %, worst station. |

**New files:** 1 JSX component
**Effort:** SMALL

---

## 3. RECOMMENDED EXECUTION ORDER

Batches ordered by: (a) owner review dependency, (b) endpoint grouping, (c) complexity.

```
Session 1:  Batch B (S15–S18)  — Items sub-tabs         [4 screens, SMALL, same component]
Session 2:  Batch E (S28,S34,S35) — Cancel + Audit       [3 screens, SMALL, existing endpoints]
Session 3:  Batch D (S26–S27)  — Discounts               [2 screens, SMALL-MEDIUM]
Session 4:  Batch F (S32–S33)  — Staff                   [2 screens, SMALL]
Session 5:  Batch G (S36–S37)  — Customers               [2 screens, SMALL]
Session 6:  Batch C (S23–S25)  — Tax                     [3 screens, MEDIUM — S23 is largest]
Session 7:  Batch H (S29–S31)  — Locations               [3 screens, SMALL-MEDIUM]
Session 8:  Batch I (S19–S22)  — Payments                [4 screens, MIXED — S19/S20 partial BE-1]
Session 9:  Batch J (S38)      — KOT Variance            [1 screen, SMALL]
```

**Total: 24 screens across 9 sessions.**

**Owner review cadence:** After each batch, owner does Gate ②–③ (visual review + "lock it"). Batches are sized for 1 session build + 1 review cycle.

---

## 4. SERVICE LAYER ADDITIONS

New fetch functions needed in `insightsService.js`:

```javascript
// Already exist (CR-049):
fetchInsightsDashboard(from, to)
fetchInsightsSales(from, to)
fetchInsightsItems(from, to)
fetchInsightsCancellations(from, to)

// NEW — one per new endpoint:
fetchInsightsTax(from, to)           // Batch C
fetchInsightsDiscounts(from, to)     // Batch D
fetchInsightsStaff(from, to)         // Batch F
fetchInsightsCustomers(from, to)     // Batch G
fetchInsightsLocations(from, to)     // Batch H
```

**Pattern:** Same as existing — POST to endpoint, return `data` object. ~10 lines each.

---

## 5. ROUTING & SIDEBAR

**Routes to add in `App.js`:** 20 new routes (24 screens minus 4 already added for Batch A)
**Sidebar:** Update `Sidebar.jsx` — remove `comingSoon: true` from Tax, Discounts, Locations, Staff, Audit Log, Customers. Add sub-items for deep-dive screens.

---

## 6. SCOPE LOCK

**Files WILL change:**
- `insightsService.js` — 5 new fetch functions
- `App.js` — 20 new route imports + routes
- `Sidebar.jsx` — remove comingSoon flags, add sub-nav items
- `ItemSalesHybridMockup.jsx` — 4 new tabs (Batch B)
- 20 NEW `.jsx` files in `pages/reports-module/`

**Files will NOT change:**
- Any Phase 1/2 frozen screen (S0–S10, S-ROOM, S-FC)
- `orderTransform.js`, `orderLedgerService.js` (no raw data processing)
- Any financial logic, payment logic, or order entry code
- Backend code

---

## 7. RISK REGISTER

| Risk | Impact | Mitigation |
|------|--------|------------|
| S19/S20 partial payment accuracy (BE-1) | Cashier cash/card/upi split may be approximate | Build with available data, add footnote "partial payment split approximate" |
| S27 Coupon Usage empty for some restaurants | Empty state on coupon screen | Show "No coupons used in this period" — valid, not a bug |
| S23 combines two endpoints (tax + items) | Slower load, complexity | Sequential fetch with loading states per section |
| A-4 Palm House discount bug | S26 Discount Report may show inconsistent numbers on Palm House | Flagged for backend — FE renders what API returns |
| A-5 ESC-3 cancelled tax | S28 cancel amounts may include ₹757 phantom tax | Flagged for backend — FE renders what API returns |

---

*Plan version: 1.0 · 2026-06-15 · PLANNING agent. "9 endpoints, 9 batches, 24 screens, 0 blockers."*
