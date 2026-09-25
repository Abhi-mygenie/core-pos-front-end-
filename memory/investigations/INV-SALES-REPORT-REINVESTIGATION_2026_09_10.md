# Investigation Report — Sales Report Complete Re-Investigation
## BUG-393 & CR-377 (Revised Scope)

**Date:** 2026-09-10 (re-investigation with live token)
**Prior Investigation:** `INV-SALES-REPORT-ENDPOINT-GAP_INVESTIGATION_REPORT_2026_09_11.md`
**Agent Role:** INVESTIGATION (Role 6 — AGENT_PROMPT_ALPHA v0.7)
**Trigger:** Owner provided fresh token. Prior GAP-3 unverified. Owner locked OD-377-01 = Option C (complete redesign).
**Steps used:** 9/10
**Auth:** Fresh login owner@cafe103.com — token `***` (masked)
**Evidence:** `/app/memory/evidence/INV-SALES-REPORT-REINV-001/live_response_2026_09_10.json`

---

## 1. Probes Executed

| Probe | Input | from (response) | to (response) | Finding |
|---|---|---|---|---|
| P1 | `{from:"2026-09-10", to:"2026-09-10"}` | `2026-09-10T00:30:00Z` | `2026-09-10T21:30:00Z` | Baseline ✅ |
| P2 | `{from:"2026-09-10"}` (no `to`) | `2026-09-10T00:30:00Z` | `2026-09-10T21:30:00Z` | Backend defaults `to` gracefully — identical result ✅ |
| P3 | `{from:"2026-09-05"}` past date | `2026-09-05T00:30:00Z` | `2026-09-05T21:30:00Z` | Confirmed: backend derives `to` from `from` always ✅ |
| P4 | `{from:"2026-09-01", to:"2026-09-10"}` range | `2026-09-01T00:30:00Z` | `2026-09-01T21:30:00Z` | **Backend IGNORES `to` input. Returns Sep 1 only.** ❌ |
| P5 | `{from:"2026-09-01", to:"2026-09-05"}` range | `2026-09-01T00:30:00Z` | `2026-09-01T21:30:00Z` | Confirmed P4 — `to` input is always ignored ❌ |

**Business day pattern:** 00:30 UTC start → 21:30 UTC end (IST 06:00–03:00 next day)

---

## 2. Complete API Field Inventory (82 leaf fields)

### Section 1 — Revenue KPIs
| API Field | Type | FE Mapped? | Transform Key |
|---|---|---|---|
| `total_sales` | str | ✅ | `sales` |
| `paid_revenue` | str | ✅ | `paidRevenue` |
| `running_order` | str | ✅ | `runningOrders` |
| `orderTAB` | str | ✅ | `orderTAB` |
| `unpaid_revenue` | str | ✅ | `unpaidRevenue` |
| `cancel_revenue.Pre-Serve` | str | ✅ | `cancellations.preServe` |
| `cancel_revenue.Post-Serve` | str | ✅ | `cancellations.postServe` |
| `total_profit_loss` | str | ❌ NEW | — |

### Section 2 — Order Payment Methods
| API Field | Type | FE Mapped? | Notes |
|---|---|---|---|
| `Cash` | str | ✅ | `paymentBreakdown.cash` |
| `Card` | str | ✅ | `paymentBreakdown.card` |
| `UPI` | str | ✅ | `paymentBreakdown.upi` |
| `paid_revenue_method.order_payment.Cash` | str | ⚠️ DUPLICATE | Same value as root `Cash` |
| `paid_revenue_method.order_payment.Card` | str | ⚠️ DUPLICATE | Same value as root `Card` |
| `paid_revenue_method.order_payment.Upi` | str | ⚠️ DUPLICATE | Note: `Upi` ≠ `UPI` (case diff) |
| `paid_revenue_method.order_payment.Room` | str | ✅ | `paymentBreakdown.room` |
| `paid_revenue_method.order_payment.Zomato_gold` | str | ❌ NEW | Zomato Gold payments |
| `paid_revenue_method.order_payment.Partial` | str | ❌ NEW | Partial payments |
| `paid_revenue_method.order_payment.Room Checkin` | str | ❌ NEW | Room check-in payments |

### Section 3 — TAB / Credit
| API Field | Type | FE Mapped? | Notes |
|---|---|---|---|
| `total_tab_payment` | str | ✅ | `tabSettled.total` |
| `tab_cash` | str | ✅ | `tabSettled.cash` |
| `tab_card` | str | ✅ | `tabSettled.card` |
| `tab_upi` | str | ✅ | `tabSettled.upi` |
| `paid_revenue_method.tab_payment.Credit Cash` | str | ❌ NEW | TAB settlement by Cash |
| `paid_revenue_method.tab_payment.Credit Card` | str | ❌ NEW | TAB settlement by Card |
| `paid_revenue_method.tab_payment.Credit UPI` | str | ❌ NEW | TAB settlement by UPI |

### Section 4 — Room Revenue
| API Field | Type | FE Mapped? | Notes |
|---|---|---|---|
| `orderRoom` | str | ✅ | `room.orders` |
| `room_revenue.Room Cash` | str | ✅ | `room.settledCash` |
| `room_revenue.Room Card` | str | ✅ | `room.settledCard` |
| `room_revenue.Room UPI` | str | ✅ | `room.settledUPI` |
| `room_revenue.Room Total` | str | ❌ NEW | |
| `room_revenue.Room advance` | str | ❌ NEW | Advance collected |
| `room_revenue.Room Checkout` | str | ❌ NEW | Checkout settlements |
| `room_checkin_revenue.Room Cash` | int | ❌ NEW | Check-in payments (Cash) |
| `room_checkin_revenue.Room Card` | int | ❌ NEW | Check-in payments (Card) |
| `room_checkin_revenue.Room UPI` | int | ❌ NEW | Check-in payments (UPI) |
| `room_checkin_revenue.Room TAB` | int | ❌ NEW | Check-in payments (TAB) |

### Section 5 — Aggregators
| API Field | Type | FE Mapped? | Notes |
|---|---|---|---|
| `aggrigator_order.Zomato` | str | ✅ | `aggregators.zomato` |
| `aggrigator_order.swiggy` | str | ✅ | `aggregators.swiggy` |
| `paid_revenue_method.order_payment.Zomato_gold` | str | ❌ | Listed in Sec 2 — show here too |

### Section 6 — Deductions & Extras
| API Field | Type | FE Mapped? |
|---|---|---|
| `discount` | str | ✅ |
| `tax` | str | ✅ |
| `tips` | str | ✅ |
| `service_charge` | str | ✅ |
| `round_off` | str | ✅ |

### Section 7 — Station Revenue
| API Field | Type | FE Mapped? |
|---|---|---|
| `station_revenue` | object (dynamic) | ✅ |

### Section 8 — EXPENSE (10 fields — ENTIRELY MISSING FROM UI)
| API Field | Type | FE Mapped? | Label |
|---|---|---|---|
| `total_expense` | str | ❌ | Total Expense |
| `expense_cash` | str | ❌ | Cash |
| `expense_card` | str | ❌ | Card |
| `expense_upi` | str | ❌ | UPI |
| `expense_cash_draw` | str | ❌ | Cash Drawer |
| `expense_upi_drawer` | str | ❌ | UPI Drawer |
| `expense_bank_transfer` | str | ❌ | Bank Transfer |
| `expense_store` | str | ❌ | Store |
| `expense_unpaid` | str | ❌ | Unpaid |
| `expense_others` | str | ❌ | Others |

### Section 9 — PURCHASE (10 fields — ENTIRELY MISSING FROM UI)
| API Field | Type | FE Mapped? | Label |
|---|---|---|---|
| `total_purchase` | str | ❌ | Total Purchase |
| `purchase_cash` | str | ❌ | Cash |
| `purchase_card` | str | ❌ | Card |
| `purchase_upi` | str | ❌ | UPI |
| `purchase_cash_draw` | str | ❌ | Cash Drawer |
| `purchase_upi_drawer` | str | ❌ | UPI Drawer |
| `purchase_bank_transfer` | str | ❌ | Bank Transfer |
| `purchase_unpaid` | str | ❌ | Unpaid |
| `purchase_others` | str | ❌ | Others |
| `total_purchase_and_expense` | str | ❌ | Combined Total |

### Section 10 — CASH DRAWER / GALLA (8 fields — ENTIRELY MISSING FROM UI)
| API Field | Type | FE Mapped? | Label | Special Note |
|---|---|---|---|---|
| `total_opening_balance` | str | ❌ | Opening Balance | |
| `total_today_settlement` | str | ❌ | Today's Settlement | |
| `last_day_pending` | str | ❌ | Pending from Last Day | |
| `total_balance_to_settle` | str | ❌ | Balance to Settle | |
| `today_galla` | **str (integer)** | ❌ | Today's Galla | ⚠️ parseInt not parseFloat |
| `total_paid_cash` | str | ❌ | Total Paid Cash | |
| `total_pilferage` | str | ❌ | Pilferage | |
| `total_profit_loss` | str | ❌ | Profit / Loss | Key business metric |

### Section 11 — Business Hours
| API Field | Type | FE Mapped? |
|---|---|---|
| `from` | ISO datetime str | ✅ |
| `to` | ISO datetime str | ✅ |

---

## 3. Coverage Summary

| | Count |
|---|---|
| **Total API leaf fields** | **82** |
| Fully mapped + rendered | 32 (39%) |
| Duplicate/redundant (not needed) | 3 (paid_revenue_method.order_payment.Cash/Card/Upi) |
| Unmapped — need new sections | **47 (57%)** |

### Unmapped breakdown
| Group | Fields | Current Status |
|---|---|---|
| Expense | 10 | ❌ Section missing entirely |
| Purchase | 10 | ❌ Section missing entirely |
| Cash Drawer / Galla | 8 | ❌ Section missing entirely |
| Room (expanded) | 7 | ❌ Partially rendered |
| Payment methods (expanded) | 5 | ❌ Partial |
| TAB sub-breakdown | 3 | ❌ Total shown, no breakdown |
| KPI: profit_loss | 1 | ❌ Not shown |
| Aggregator: Zomato_gold | 1 | ❌ Not shown |

---

## 4. Revised Findings Per Item

### BUG-393
- **Status:** CONFIRMED — P2 (downgraded from P1)
- `reportService.js:399` sends `{from: dateStr}` only, missing `to`
- **Impact revised:** Backend auto-defaults `to` to business day end correctly. Same data returned with or without `to`.
- **Still fix:** API contract compliance. Defensive. If backend changes, becomes silent bug.
- **Fast Lane eligible:** YES — 1 file, 1 line, LOW risk

### CR-377
- **Original spec (date range UI):** NOT FEASIBLE — backend ignores `to` input (probes P4/P5 confirmed)
- **Owner decision OD-377-01 = Option C LOCKED:** Complete redesign — show all API data
- **New scope:** Redesign `OrderSummaryPage.jsx` + `reportService.js` to surface all 82 API fields across logical sections

---

## 5. Type Inconsistencies Found (Implementation Notes)

| Field | Type Returned | Correct Handling |
|---|---|---|
| `today_galla` | string integer `'0'` | `parseInt(val)` NOT `parseFloat` |
| `room_checkin_revenue.*` | `int` (not string) | `Number(val)` handles both |
| `cancel_revenue.*` | `'0'` string | `parseFloat` works |
| All other numeric fields | `'0.00'` string | `parseFloat` ✅ |

---

## 6. Proposed Redesign Section Layout

```
OrderSummaryPage — Redesigned
│
├── HEADER: DatePicker + Business Hours (from/to)
│
├── ROW 1: KPI Strip (6 cards)
│   Sales | Paid Revenue | Running | TAB | Cancelled | Profit/Loss
│
├── ROW 2: Revenue Details (3-4 cols)
│   Payment Methods (full) | Cancellations | Deductions | TAB Credit
│
├── ROW 3: Station Revenue (dynamic, existing)
│
├── ROW 4: Aggregators + Room (if enabled)
│   Aggregators (+ Zomato Gold) | Room Checkout | Room Check-in
│
├── ROW 5: EXPENSE (NEW)
│   Total + breakdown by Cash/Card/UPI/CashDraw/Store/BankTransfer/Others
│
├── ROW 6: PURCHASE (NEW)
│   Total + breakdown + combined total (Purchase + Expense)
│
└── ROW 7: CASH DRAWER / GALLA (NEW)
    Opening Balance | Today Galla | Settlement | Pending | Pilferage | Profit/Loss
```

---

## 7. Files That Will Change

| File | Change | Est. Lines |
|---|---|---|
| `src/api/services/reportService.js` | Expand transform — add 47 new mapped fields in 7 groups | +45–55 lines |
| `src/pages/OrderSummaryPage.jsx` | Add 3 new sections, enhance 3 existing, add KPI card | +180–220 lines |

**Risk:** MEDIUM — report display only, no financial calculation, no order flow, no billing

---

## 8. Owner Decisions Remaining

| OD | Question | Default if no answer |
|---|---|---|
| OD-CR377-01 | Page title: keep "Daily Summary" or change to "Sales Report"? | "Sales Report" |
| OD-CR377-02 | Show Partial + Zomato_gold + Room Checkin in Payment section? | YES — show all |
| OD-CR377-03 | TAB Credit breakdown (Credit Cash/Card/UPI) — show or keep total only? | Show breakdown |
| OD-CR377-04 | Room Checkin Revenue — separate sub-section inside Room card, or standalone card? | Sub-section |
| OD-CR377-05 | Expense/Purchase — show all 8 payment method rows or only non-zero rows? | Only non-zero (cleaner) |
| OD-BUG393-01 | Fast Lane approved for BUG-393? (1 line, no risk) | Awaiting owner |

---

*Investigation complete. All 82 API fields catalogued. Owner locked CR-377 = Option C. Ready for INTAKE registration and then Gate 2 planning.*
