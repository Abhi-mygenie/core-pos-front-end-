# BUG-485 — Impact Analysis

**ID:** BUG-485
**Gate:** 2 — IMPACT ANALYSIS
**Date:** 2026-10-05
**Risk:** MEDIUM
**Code Reality:** NONE (onClick never wired)
**Conflict pre-check:** No in-flight items on DashboardMockup.jsx. CLEAN.

---

## 1. Data Flow

```
DashboardMockup
  → fetchInsightsDashboard(appliedFrom, appliedTo)  [line 86]
  → transformDashboardResponse(raw)                 [insightsService.js]
  → tiles{} → destructured at lines 149–157:
      sales       : { totalRevenue, paidOrderCount, sparkline }
      channels    : { mix[{name,value,revenue,count}], topChannel, topChannelPct }
      payments    : { mix[{name,value,revenue,count}], creditOutstanding }
      topItems    : { items[{name,qty,revenue}], totalItemsSold }
      cancellations: { orderCount, itemCount, totalRevenue, topReason, topReasonCount }
      discounts   : { directDiscount, couponDiscount, loyaltyDiscount, compItemTotal, totalLeakage }
      customers   : { repeatPct, newCustomers, totalOrders }
      kitchen     : { avgPrep, avgServe, slaBreachCount, hasPrepData }
      audits      : { madeUnpaid, paymentMethodChanged, total }

  → buttons (lines 292–309): NO onClick, NO export import → nothing happens on click

  Compare: SalesMockup.jsx (working reference)
  → imports exportReportAsExcel, exportReportAsPDF, openReportWindow (line 17)
  → buildExportPayload() returns { title, restaurant, dateRange, kpis[], sheets[] }
  → handleDownloadAction(action) dispatches pdf/excel
  → buttons have onClick={()=>setShowDownloadMenu(v=>!v)}
```

## 2. Affected Files

| File | Lines | Change type | Risk |
|------|-------|-------------|------|
| `pages/reports-module/DashboardMockup.jsx` | 1 (import), ~50 (new fns), 2 (onClick) | Add feature | MEDIUM |

No other files touched. `reportExporter.js` is used as-is (no changes). `insightsService.js` unchanged.

## 3. Export Shape Design (Gate 2 decision)

The dashboard export will use the same `{ title, restaurant, dateRange, kpis, sheets }` shape as SalesMockup.

**KPIs block:**
| Label | Value |
|-------|-------|
| Net Sales | `sales.totalRevenue` |
| Paid Orders | `sales.paidOrderCount` |
| Top Channel | `channels.topChannel` + pct |
| Repeat Customers | `customers.repeatPct`% |
| Direct Discount | `discounts.directDiscount` |
| Coupon Discount | `discounts.couponDiscount` |
| Loyalty Discount | `discounts.loyaltyDiscount` |
| Comp Items | `discounts.compItemTotal` |
| Total Leakage | `discounts.totalLeakage` |
| Credit Outstanding | `payments.creditOutstanding` |
| Avg Prep | `kitchen.avgPrep` |
| Avg Serve | `kitchen.avgServe` |
| Audit Flags | `audits.total` |

**Sheets:**
1. `By Channel` — `channels.mix` → `{name, value (%), revenue, count}`
2. `By Payment` — `payments.mix` → `{name, value (%), revenue, count}`
3. `Top Items` — `topItems.items` → `{name, qty, revenue}`
4. `Discounts` — flat row from `discounts` object
5. `Customers` — flat row from `customers` object

## 4. Risk Classification

**MEDIUM — display/export only.** No API write, no financial mutation, no order flow. Data already fetched and rendered on screen. Export reads from `tiles` (already in scope). 1 file only.

## 5. Owner decisions needed

None — export shape decided above, mirrors SalesMockup pattern exactly.
