# CR-377 — Sales Report: Complete Redesign (OrderSummaryPage)

**ID:** CR-377
**Type:** Change Request
**Date registered:** 2026-09-10
**Source:** Investigation INV-SALES-REPORT-REINVESTIGATION_2026_09_10.md
**Agent role at registration:** INVESTIGATION → INTAKE
**Sprint (suggested):** pos_7_0

---

## Classification

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | MEDIUM |
| **Severity trigger** | Report display expansion — no financial calculation, read-only from API |
| **Fast Lane eligible** | NO — 2 files, ~250 lines |
| **Gate** | 1 — INTAKE |
| **Status** | INTAKE — Gate 1. 5 ODs open (owner to answer before Gate 2). |

---

## Description

The daily sales report API (`POST /api/v2/vendoremployee/daily-sales-revenue-report`) returns **82 leaf fields** across 11 logical sections. The current `OrderSummaryPage.jsx` renders only **32 fields (39%)** — three entire sections are missing from the UI:

1. **Expense** — 10 fields (total + 9 payment method breakdowns)
2. **Purchase** — 10 fields (total + 9 payment method breakdowns + combined total)
3. **Cash Drawer / Galla** — 8 fields including `today_galla` and `total_profit_loss`

Additionally, 3 existing sections are partially incomplete:
- **Payment Methods:** missing Zomato_gold, Partial, Room Checkin
- **Room:** missing Room Total, Room advance, Room Checkout + entire `room_checkin_revenue` sub-object
- **TAB:** missing Credit Cash/Card/UPI payment method breakdown

**Owner decision OD-377-01 locked (2026-09-10):** Option C — complete redesign to surface all API data.

---

## Original CR-377 Spec — SUPERSEDED

~~Replace single DatePicker with DateRangePicker~~

**Reason superseded:** Backend probe confirmed the `to` field is IGNORED by backend — endpoint is single-day only. Date range UI is not feasible without backend changes.
Reference probes: P4/P5 in `INV-SALES-REPORT-REINVESTIGATION_2026_09_10.md`

---

## Scope

### Files That Will Change

| File | What Changes |
|---|---|
| `src/api/services/reportService.js` | Expand `getDailySalesReport` transform (lines 406–472) — add 47 new fields in 7 groups. Approx +50 lines. |
| `src/pages/OrderSummaryPage.jsx` | Add 3 new section renders (Expense, Purchase, Galla). Enhance KPI strip (+1 card). Enhance Room/Payment/TAB sections. Approx +200 lines. |

### Files That Will NOT Change
- `src/api/constants.js` — endpoint URL unchanged
- Any other service file
- Router / App.js
- Context providers

---

## Full Field Map — What Gets Added

### Transform additions (`reportService.js`)

```js
// KPI addition
profitLoss: toNum(data.total_profit_loss),

// Payment methods — expanded
paymentBreakdown: {
  cash:          toNum(data.Cash),
  card:          toNum(data.Card),
  upi:           toNum(data.UPI),
  room:          toNum(data.paid_revenue_method?.order_payment?.Room),
  zomatoGold:    toNum(data.paid_revenue_method?.order_payment?.Zomato_gold),   // NEW
  partial:       toNum(data.paid_revenue_method?.order_payment?.Partial),        // NEW
  roomCheckin:   toNum(data.paid_revenue_method?.order_payment?.['Room Checkin']), // NEW
},

// TAB — expanded
tabSettled: {
  total:         toNum(data.total_tab_payment),
  cash:          toNum(data.tab_cash),
  card:          toNum(data.tab_card),
  upi:           toNum(data.tab_upi),
  creditCash:    toNum(data.paid_revenue_method?.tab_payment?.['Credit Cash']),  // NEW
  creditCard:    toNum(data.paid_revenue_method?.tab_payment?.['Credit Card']),  // NEW
  creditUpi:     toNum(data.paid_revenue_method?.tab_payment?.['Credit UPI']),   // NEW
},

// Room — expanded
room: {
  orders:         toNum(data.orderRoom),
  settledCash:    toNum(data.room_revenue?.['Room Cash']),
  settledCard:    toNum(data.room_revenue?.['Room Card']),
  settledUPI:     toNum(data.room_revenue?.['Room UPI']),
  settledTotal:   toNum(data.room_revenue?.['Room Total']),   // NEW
  advance:        toNum(data.room_revenue?.['Room advance']), // NEW
  checkout:       toNum(data.room_revenue?.['Room Checkout']),// NEW
  checkinCash:    toNum(data.room_checkin_revenue?.['Room Cash']),  // NEW
  checkinCard:    toNum(data.room_checkin_revenue?.['Room Card']),  // NEW
  checkinUpi:     toNum(data.room_checkin_revenue?.['Room UPI']),   // NEW
  checkinTab:     toNum(data.room_checkin_revenue?.['Room TAB']),   // NEW
},

// EXPENSE — entirely new
expense: {
  total:         toNum(data.total_expense),
  cash:          toNum(data.expense_cash),
  card:          toNum(data.expense_card),
  upi:           toNum(data.expense_upi),
  cashDraw:      toNum(data.expense_cash_draw),
  upiDrawer:     toNum(data.expense_upi_drawer),
  bankTransfer:  toNum(data.expense_bank_transfer),
  store:         toNum(data.expense_store),
  unpaid:        toNum(data.expense_unpaid),
  others:        toNum(data.expense_others),
},

// PURCHASE — entirely new
purchase: {
  total:         toNum(data.total_purchase),
  cash:          toNum(data.purchase_cash),
  card:          toNum(data.purchase_card),
  upi:           toNum(data.purchase_upi),
  cashDraw:      toNum(data.purchase_cash_draw),
  upiDrawer:     toNum(data.purchase_upi_drawer),
  bankTransfer:  toNum(data.purchase_bank_transfer),
  unpaid:        toNum(data.purchase_unpaid),
  others:        toNum(data.purchase_others),
  combinedTotal: toNum(data.total_purchase_and_expense),
},

// GALLA / CASH DRAWER — entirely new
galla: {
  openingBalance:   toNum(data.total_opening_balance),
  todaySettlement:  toNum(data.total_today_settlement),
  lastDayPending:   toNum(data.last_day_pending),
  balanceToSettle:  toNum(data.total_balance_to_settle),
  todayGalla:       parseInt(data.today_galla) || 0,  // NOTE: integer not float
  totalPaidCash:    toNum(data.total_paid_cash),
  pilferage:        toNum(data.total_pilferage),
  profitLoss:       toNum(data.total_profit_loss),
},
```

---

## Evidence
- Curl output: `/app/memory/evidence/INV-SALES-REPORT-REINV-001/live_response_2026_09_10.json`
- Investigation: `/app/memory/investigations/INV-SALES-REPORT-REINVESTIGATION_2026_09_10.md`
- Source: AGENT-DISCOVERED + owner curl provided
- Confidence: CONFIRMED (live API response verified)

---

## Absorbed Items

| ID | What it was | How absorbed |
|---|---|---|
| **BUG-393** | Missing `to` field in POST payload (`reportService.js:399`) | Implementing agent adds `to: dateStr` in the CR-377 transform rewrite. No separate work needed. |

---

## Duplicate Check

| Check | Result |
|---|---|
| CR-363 (Night Audit) | RELATED — consumes same endpoint. Distinct output/purpose. |
| CR-366 (Revenue Dashboard) | RELATED — adjacent report. Distinct page. |
| CR-026 (Report Sweep) | RELATED — earlier report audit. CLOSED. CR-377 adds what was not in scope then. |
| All other CRs | DISTINCT |

**Duplicate check: DISTINCT. Related: CR-363, CR-366, CR-026 (closed)**

---

## Blast Radius

- Files affected: 2 (`reportService.js`, `OrderSummaryPage.jsx`)
- Hotspot files: NO
- Consumers of `getDailySalesReport`: `OrderSummaryPage.jsx` only (confirmed by grep)
- Estimated scope: MEDIUM (~250 lines total across 2 files)

---

## Owner Decisions Open

| OD ID | Question | Default |
|---|---|---|
| OD-CR377-01 | Page title: keep "Daily Summary" or change to "Sales Report"? | "Sales Report" |
| OD-CR377-02 | Show Partial + Zomato_gold + Room Checkin in Payment section? | Show all |
| OD-CR377-03 | TAB Credit breakdown (Credit Cash/Card/UPI) visible? | Show |
| OD-CR377-04 | Room Checkin Revenue — sub-section inside Room card or separate card? | Sub-section |
| OD-CR377-05 | Expense/Purchase — show only non-zero rows or always all rows? | Non-zero only |

---

## Next Steps

1. Owner answers ODs above (or accepts defaults) → unlocks Gate 2
2. Gate 2 → Impact Analysis (`impact/CR-377_IMPACT_ANALYSIS.md`)
3. Gate 3 → Implementation Plan
4. Gate 4 GO from owner → Implementation

**Gate 1 is COMPLETE. Waiting at Gate 1 until owner answers OD-CR377-01 through OD-CR377-05.**

---

*Intake complete. BUG-393 absorbed. Code reality: NONE (new sections) | PARTIAL (enhanced sections). Do NOT proceed to Gate 2 until owner ODs answered.*
