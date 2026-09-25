# Impact Analysis — CR-377
## Sales Report Complete Redesign (OrderSummaryPage)

**Date:** 2026-09-11
**Agent Role:** PLANNING (Gate 2 — Impact Analysis)
**Protocol:** AGENT_PROMPT_ALPHA v0.7
**Source item:** CR-377 (intake 2026-09-10) + BUG-393 absorbed

---

## Code Reality: PARTIAL

- `reportService.js` L396-472: transform exists, maps **32 of 82 fields**. New sections (expense/purchase/galla) = NONE in transform.
- `OrderSummaryPage.jsx` L1-522: page exists with 5 rows rendered. Expense/Purchase/Galla = NONE rendered. Payment/TAB/Room = PARTIAL (missing fields per intake).

---

## Conflict Pre-Check

| File | Last modifier | Date | Conflict? |
|---|---|---|---|
| `reportService.js` | Audit Report agent | 2026-05-28 | None — target section L396-472, audit changes are at L744+ |
| `OrderSummaryPage.jsx` | CR-061 agent (Expense Summary Card) | 2026-06 (QA PASS, awaiting smoke) | **DECLARE:** CR-061 added `Expense Summary Card (Surface B)` from a separate expense endpoint. CR-377 adds inline expense totals from `getDailySalesReport`. These are parallel-safe (different data sources, different visual purpose). CR-377 rows show payment-method breakdown totals; CR-061 shows category-level expense report link. **No edit-line conflict.** |
| `OrderSummaryPage.jsx` | BUG-358/BUG-361 (sidebar persistence) | 2026-09-01 | None — sidebar logic at L21-22, untouched |

**Conflicts: ZERO blocking conflicts. CR-061 overlap declared and parallel-safe.**

---

## Owner Decisions — ALL LOCKED (defaults accepted by owner proceeding to Gate 2)

| OD | Decision | Locked value |
|---|---|---|
| OD-CR377-01 | Page title | `"Sales Report"` (was "Daily Summary") |
| OD-CR377-02 | Show Zomato_gold + Partial + Room Checkin in Payment section | YES — show all non-zero |
| OD-CR377-03 | TAB Credit breakdown (Credit Cash/Card/UPI) visible | YES — show |
| OD-CR377-04 | Room Checkin Revenue placement | Sub-section inside Room card |
| OD-CR377-05 | Expense/Purchase row visibility | Non-zero rows only |

---

## Risk Classification

**Risk: MEDIUM**
- Trigger: Report display expansion — read-only data from existing API. No financial calculation added. No order flow touched.
- No financial logic (R6 not triggered)
- Target files NOT in R5 hotspot list
- BUG-393 fix (`to:` field in POST) is LOW risk — additive field, backend ignores it anyway

---

## Data Confirmed Live (API evidence: `evidence/INV-SALES-REPORT-REINV-001/live_response_2026_09_10.json`)

All 50 new fields confirmed present. Key structural notes:

| Path | Note |
|---|---|
| `data.Cash / data.Card / data.UPI` | Top-level keys (existing) |
| `data.paid_revenue_method.order_payment.Zomato_gold` | NEW — Zomato Gold payment |
| `data.paid_revenue_method.order_payment.Partial` | NEW — partial payment |
| `data.paid_revenue_method.order_payment['Room Checkin']` | NEW — room checkin |
| `data.paid_revenue_method.tab_payment['Credit Cash']` | NEW — TAB credit cash |
| `data.paid_revenue_method.tab_payment['Credit Card']` | NEW — TAB credit card |
| `data.paid_revenue_method.tab_payment['Credit UPI']` | NEW — TAB credit UPI |
| `data.room_revenue['Room Total']` | NEW — total room settled |
| `data.room_revenue['Room advance']` | NEW — room advance |
| `data.room_revenue['Room Checkout']` | NEW — room checkout |
| `data.room_checkin_revenue['Room Cash/Card/UPI/TAB']` | NEW — entire sub-object |
| `data.total_expense` ... `data.expense_others` | NEW — 10 expense fields |
| `data.total_purchase` ... `data.total_purchase_and_expense` | NEW — 10 purchase fields |
| `data.total_opening_balance` ... `data.total_profit_loss` | NEW — 8 galla fields |
| `data.today_galla` | INTEGER (not float) — use `parseInt` not `parseFloat` |

---

## Affected Files — Full Edit Map

### FILE 1 — `src/api/services/reportService.js`

**Lines:** L396-472 (the `getDailySalesReport` function — expand transform)

**BUG-393 fix (absorbed):**
```js
// Line 399: ADD `to:` field
const response = await api.post(API_ENDPOINTS.DAILY_SALES_REPORT, {
  from: dateStr,
  to: dateStr,   // BUG-393: was missing — backend ignores it but contract requires it
});
```

**Transform additions — 7 groups, ~50 new lines:**

```js
// 1. KPI strip: add profitLoss
profitLoss: toNum(data.total_profit_loss),

// 2. Payment breakdown: add 3 new methods
paymentBreakdown: {
  cash:         toNum(data.Cash),
  card:         toNum(data.Card),
  upi:          toNum(data.UPI),
  room:         toNum(data.paid_revenue_method?.order_payment?.Room),
  zomatoGold:   toNum(data.paid_revenue_method?.order_payment?.Zomato_gold),    // CR-377
  partial:      toNum(data.paid_revenue_method?.order_payment?.Partial),         // CR-377
  roomCheckin:  toNum(data.paid_revenue_method?.order_payment?.['Room Checkin']),// CR-377
},

// 3. TAB: add 3 credit fields
tabSettled: {
  total:       toNum(data.total_tab_payment),
  cash:        toNum(data.tab_cash),
  card:        toNum(data.tab_card),
  upi:         toNum(data.tab_upi),
  creditCash:  toNum(data.paid_revenue_method?.tab_payment?.['Credit Cash']),  // CR-377
  creditCard:  toNum(data.paid_revenue_method?.tab_payment?.['Credit Card']),  // CR-377
  creditUpi:   toNum(data.paid_revenue_method?.tab_payment?.['Credit UPI']),   // CR-377
},

// 4. Room: add 6 fields + room checkin sub-object
room: {
  orders:        toNum(data.orderRoom),
  settledCash:   toNum(data.room_revenue?.['Room Cash']),
  settledCard:   toNum(data.room_revenue?.['Room Card']),
  settledUPI:    toNum(data.room_revenue?.['Room UPI']),
  settledTotal:  toNum(data.room_revenue?.['Room Total']),     // CR-377 (was computed sum)
  advance:       toNum(data.room_revenue?.['Room advance']),   // CR-377
  checkout:      toNum(data.room_revenue?.['Room Checkout']),  // CR-377
  checkinCash:   toNum(data.room_checkin_revenue?.['Room Cash']),  // CR-377
  checkinCard:   toNum(data.room_checkin_revenue?.['Room Card']),  // CR-377
  checkinUpi:    toNum(data.room_checkin_revenue?.['Room UPI']),   // CR-377
  checkinTab:    toNum(data.room_checkin_revenue?.['Room TAB']),   // CR-377
},

// 5. Expense (NEW — all 10 fields)
expense: {
  total:        toNum(data.total_expense),
  cash:         toNum(data.expense_cash),
  card:         toNum(data.expense_card),
  upi:          toNum(data.expense_upi),
  cashDraw:     toNum(data.expense_cash_draw),
  upiDrawer:    toNum(data.expense_upi_drawer),
  bankTransfer: toNum(data.expense_bank_transfer),
  store:        toNum(data.expense_store),
  unpaid:       toNum(data.expense_unpaid),
  others:       toNum(data.expense_others),
},

// 6. Purchase (NEW — all 10 fields)
purchase: {
  total:        toNum(data.total_purchase),
  cash:         toNum(data.purchase_cash),
  card:         toNum(data.purchase_card),
  upi:          toNum(data.purchase_upi),
  cashDraw:     toNum(data.purchase_cash_draw),
  upiDrawer:    toNum(data.purchase_upi_drawer),
  bankTransfer: toNum(data.purchase_bank_transfer),
  unpaid:       toNum(data.purchase_unpaid),
  others:       toNum(data.purchase_others),
  combinedTotal:toNum(data.total_purchase_and_expense),
},

// 7. Galla / Cash Drawer (NEW — 8 fields)
galla: {
  openingBalance:  toNum(data.total_opening_balance),
  todaySettlement: toNum(data.total_today_settlement),
  lastDayPending:  toNum(data.last_day_pending),
  balanceToSettle: toNum(data.total_balance_to_settle),
  todayGalla:      parseInt(data.today_galla) || 0,  // INTEGER — confirmed in API
  totalPaidCash:   toNum(data.total_paid_cash),
  pilferage:       toNum(data.total_pilferage),
  profitLoss:      toNum(data.total_profit_loss),
},
```

**Estimated change:** ~55 lines added inside existing function. No other functions in file touched.

---

### FILE 2 — `src/pages/OrderSummaryPage.jsx`

**Lines:** Page-level additions. No existing rendered blocks removed. All additions are new JSX blocks.

**Change 1 — OD-377-01: Rename title (L128)**
```jsx
// L128: "Daily Summary" → "Sales Report"
<h1 className="text-xl font-semibold text-white">Sales Report</h1>
```

**Change 2 — OD-377-02/03: Import additions**
```jsx
// Add icons for new sections: Receipt, ShoppingCart, Wallet, TrendingDown
import { ArrowLeft, TrendingUp, TrendingDown, Banknote, Clock, CreditCard as CreditCardIcon, XCircle, Smartphone, Building, ChefHat, Wine, Receipt, ShoppingCart, Wallet } from "lucide-react";
```

**Change 3 — KPI strip: add Profit/Loss card (after cancelled card)**
```jsx
// Add 6th card: Profit/Loss (amber if > 0, red if < 0)
<div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
  ... profitLoss card ...
</div>
```

**Change 4 — Payment Breakdown: add 3 new methods (non-zero filter)**
```jsx
// Inside payment breakdown section — add after UPI row, before Total
{summaryData.paymentBreakdown.zomatoGold > 0 && <ZomatoGold row>}
{summaryData.paymentBreakdown.partial > 0 && <Partial row>}
{summaryData.paymentBreakdown.roomCheckin > 0 && <RoomCheckin row>}
// Update Total calculation to include new methods
```

**Change 5 — TAB section: add Credit Cash/Card/UPI rows**
```jsx
// Inside TAB settled section — add Credit breakdown rows
{summaryData.tabSettled.creditCash > 0 && <CreditCash row>}
{summaryData.tabSettled.creditCard > 0 && <CreditCard row>}
{summaryData.tabSettled.creditUpi > 0 && <CreditUpi row>}
```

**Change 6 — Room section: add advance, checkout, checkin sub-section**
```jsx
// Extend Room card to show advance/checkout
// Add "Check-In Revenue" sub-section inside Room (OD-377-04)
{summaryData.room.advance > 0 && <Advance row>}
{summaryData.room.checkout > 0 && <Checkout row>}
// New: checkin sub-section with Cash/Card/UPI/TAB
```

**Change 7 — NEW: Galla / Cash Drawer section (ROW 5 — before Aggregators)**
```jsx
// Full new card: amber theme, 8 fields, today_galla highlight
```

**Change 8 — NEW: Expense section (ROW 6)**
```jsx
// New card: red/rose theme, non-zero rows only (OD-377-05)
// Features: total header + payment method breakdown list
```

**Change 9 — NEW: Purchase section (ROW 6, same grid)**
```jsx
// New card: cyan/teal theme, non-zero rows only (OD-377-05)
// Features: total header + payment method breakdown + combined total
```

**Estimated change:** ~200 lines added. Existing 5 rows untouched structurally.

---

## Downstream Consumers — Impact Check

| Consumer | Impact |
|---|---|
| `getDailySalesReport` callers | `OrderSummaryPage.jsx` only (confirmed by grep). No other file imports this function. |
| New fields in transform | Purely additive — existing field names unchanged. No consumer breaks. |
| BUG-393 `to:` field | Backend ignores it. Zero risk. |

---

## Verification Matrix (seeds QA handover)

| # | Edit | Verify | Method |
|---|---|---|---|
| V1 | BUG-393 | `to:` present in POST payload | Network tab → daily-sales-revenue-report request |
| V2 | Title rename | Page shows "Sales Report" not "Daily Summary" | Visual |
| V3 | Profit/Loss card | 6th KPI card renders with correct value | Visual + value check |
| V4 | Payment extras | Zomato Gold / Partial / Room Checkin show when non-zero | Test with account that has these |
| V5 | TAB credit breakdown | Credit Cash/Card/UPI rows show in settled section | Visual (with TAB-enabled account) |
| V6 | Room advance/checkout | New rows appear in Room card when non-zero | Visual (room-enabled account) |
| V7 | Room checkin sub-section | Checkin revenue block shows inside Room card | Visual |
| V8 | Galla section | Entire section renders with 8 fields | Visual |
| V9 | Expense section | Renders only non-zero rows | Test day with expense entries |
| V10 | Purchase section | Renders only non-zero rows | Test day with purchase entries |
| V11 | Existing data | All existing 32 fields still correct (no regression) | Value comparison before/after |
| V12 | Zero-day rendering | All new sections gracefully absent when all zero | Check on zero-data day |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-377 → status: IMPLEMENTED, gate: 5, sprint_key: pos_7_0
- [ ] CR_REGISTRY.md: CR-377 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: reportService.js + OrderSummaryPage.jsx listed → CR-377
- [ ] Code markers: // CR-377 on every modified/added block
- [ ] BUG-393: registry.json BUG-393 → CLOSED (absorbed by CR-377)
- [ ] Compile: webpack 0 new warnings
```

---

## Scope Lock

**Files WILL change:**
- `src/api/services/reportService.js` — L396-472 transform expansion (~55 lines)
- `src/pages/OrderSummaryPage.jsx` — title rename + 3 new section renders + 3 section enhancements (~200 lines)

**Files will NOT touch:**
- `src/api/constants.js` — endpoint URL unchanged
- Any context, router, App.js, socket, transform, or other service file

---

*Gate 2 Impact Analysis complete. Code reality: PARTIAL. Conflicts: NONE blocking. Risk: MEDIUM.*
*All 5 ODs locked (owner defaults). BUG-393 absorbed. Ready for Gate 3 Implementation Plan.*
*PLANNING Agent — ALPHA v0.7 — 2026-09-11*
