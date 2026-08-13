# CR-059 Phase 2 — Expense Reporting: Discovery Report

**Date:** 2026-07-06
**Scope:** Phase 2 — two reporting surfaces
**Agent Role:** DISCOVERY

---

## Existing Insights Report Pattern (MUST follow)

Every Insights report page follows this exact structure:

### Page Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [Collapsed Sidebar] │                                        │
│                     │  Header: ← Back + Title + Presets      │
│                     │  Date Range: From [___] To [___] Apply │
│                     │                                        │
│                     │  ReportLoadingShield wrapper:           │
│                     │    KPI Cards (grid row)                │
│                     │    Chart(s) (recharts)                 │
│                     │    Data Table (sortable, searchable)   │
│                     │    Export Menu (Excel/PDF/Email)        │
│                     │                                        │
└─────────────────────────────────────────────────────────────┘
```

### Shared Infrastructure
| Component | Source | Usage |
|---|---|---|
| `InsightsCacheContext` | `contexts/InsightsCacheContext.jsx` | Shared date range (from/to) across all Insights pages |
| `useReportFetch` | `components/reports/useReportFetch.js` | Canonical fetch lifecycle: AbortController, debounce, error handling, loading states |
| `ReportLoadingShield` | `components/reports/ReportLoadingShield.jsx` | Loading overlay: first-load splash, re-fetch ghosting, error banner with retry |
| `exportReportAsExcel` | `utils/reportExporter.js` | Excel download from formatted data |
| `exportReportAsPDF` | `utils/reportExporter.js` | PDF download via print window |
| `recharts` | `BarChart, LineChart, PieChart, ResponsiveContainer` | Chart components |
| Date presets | Pattern from DailySalesMockup | Today, 7D, 30D, MTD buttons |
| Download menu | Pattern from all reports | Excel, PDF, Email (disabled), WhatsApp (disabled), SMS (disabled) |

### Standard KPI Card Pattern
```jsx
<div className="grid grid-cols-X gap-4">
  <div className="bg-white rounded-xl p-4 border">
    <div className="text-xs text-zinc-500 mb-1">Label</div>
    <div className="text-xl font-bold">₹Value</div>
    <div className="text-xs text-emerald-600">+X% vs prev</div>
  </div>
</div>
```

### Sidebar Placement
Insights sidebar has groups. Expense Report goes under a new **"Expenses"** group:
```
Insights sidebar:
  ...
  Discounts group
  Cancellations group
  Locations group
  Staff group
  Audit group
  Customers group
  Operations group
  ── Expenses group ──    ← NEW
    Expense Report        ← NEW /reports-module/expense-report
```

---

## APIs for Reporting (from Phase 1 Discovery)

| # | Endpoint | Method | Returns | Usage |
|---|---|---|---|---|
| 1 | `/expense/expenses-report?from=DD/MM/YYYY&to=DD/MM/YYYY&payment_method=All` | GET | Transaction list + `total_amount` | Main data source. Client-side aggregation for KPIs, charts. |
| 2 | `/expense/expenses-export-report` | POST `{from: "YYYY-MM-DD", to: "YYYY-MM-DD"}` | Detailed transaction list (has `exp_master_id`, `exp_name`, `category_id`, `e_dates` in ISO) | Excel/PDF export. Richer fields than endpoint #1. |
| 3 | `/expense/category-list` | GET | Category list `[{id, category_name}]` | Category filter dropdown. |
| 4 | `/expense/payment-method` | GET | Payment methods `["Cash", "UPI", ...]` | Payment filter dropdown. |

**No P&L / summary endpoint exists.** All aggregations computed client-side:
- Total spend → `sum(amounts)`
- By category → `groupBy(category).sum(amount)`
- By date/month → `groupBy(date).sum(amount)`
- By payment → `groupBy(payment_method).sum(amount)`
- Avg daily → `total / unique_days_count`

---

## Phase 2 Scope — Two Surfaces

### Surface A: Insights → Expense Report (NEW page)

**Route:** `/reports-module/expense-report`
**Pattern:** Follows `DailySalesMockup.jsx` / `SettlementReportMockup.jsx` exactly

**KPI Strip (4-6 cards):**
| KPI | Computation |
|-----|-------------|
| Total Spend | `sum(all amounts)` |
| Average Daily | `total / unique_active_days` |
| Transactions | `count(report)` |
| Top Category | `groupBy(category).maxBy(sum)` |
| Highest Day | `groupBy(date).maxBy(sum)` — date + amount |
| Cash vs Digital | `sum(Cash + Cash Draw)` vs `sum(UPI + Bank Transfer)` |

**Charts (recharts):**
1. **Daily Expense Trend** — Bar chart: X=date, Y=amount. Similar to DailySalesMockup bar chart.
2. **Category Breakdown** — Pie chart: slices = categories, values = total per category.
3. **Payment Method Split** — Horizontal bar or donut: Cash / UPI / Bank Transfer / Cash Draw.

**Transaction Table:**
| Column | Source | Sortable? |
|--------|--------|:---------:|
| Date | `Date & Time` | YES |
| Expense Item | `EXPENSE` | YES |
| Category | `Category` | YES |
| Amount (₹) | `Amount` | YES |
| Payment Method | `Payment Method` | YES |
| Quantity | `quantity` | NO |
| Unit | `unit` | NO |

**Filters:**
- Date range (shared from InsightsCache + presets: Today/7D/30D/MTD)
- Category dropdown (from `/expense/category-list`)
- Payment Method dropdown (from `/expense/payment-method`)
- Search text (filters by item name)

**Export:**
- Download menu: Excel, PDF (same pattern as all reports)
- Uses `expenses-export-report` endpoint for data

### Surface B: Daily Report → Expense Summary Line

**Route:** Existing `/reports/summary` (OrderSummaryPage)
**Change:** Add an "Expenses" section card showing today's expense total

**Component:** Small card/section within the existing summary page:
```
┌─────────────────────────────┐
│ Today's Expenses    ₹4,230  │
│ Cash: ₹2,800 · UPI: ₹430   │
│ Cash Draw: ₹1,000           │
│ [View Full Report →]        │
└─────────────────────────────┘
```

**Data:** Calls `expenses-report?from=today&to=today&payment_method=All`
**Link:** Navigates to `/reports-module/expense-report` with today's date pre-set

---

## Real Data Stats (for chart design reference)

| Metric | Value |
|---|---|
| Total (Jan–Jul) | ₹4,83,067 |
| Monthly range | ₹60 (Jun) to ₹1,12,797 (Mar) |
| Daily range | ₹0 to ₹19,549 |
| Avg daily | ~₹2,600 |
| Avg transaction | ₹631 |
| Categories | 1 (misc — 100%) |
| Payment split | Cash 54%, Cash Draw 45%, Bank <1% |
| Highest spend day | 29/Mar/2026 (₹19,549, 9 txns) |

---

## Evidence

All saved to `/app/memory/evidence/CR-059/`:
- `expenses_report_full.json` — 765 transactions (Jan–Jul 2026)
- `export_report_detail.json` — detailed export response
- `category_list.json`, `payment_methods.json` — reference data

---

## Next

Discovery complete for Phase 2. Ready for Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan).
