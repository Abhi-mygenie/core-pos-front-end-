# Investigation Report: CR-363, CR-364, CR-366 — API Impact Analysis

**Investigation ID:** INV-PMS-CRs-363-364-366  
**Date:** 2026-09-06  
**Investigator:** Agent (Investigation Role)  
**Scope:** Determine exact API availability, data shape, gaps, and blockers for three "unblocked" CRs  
**Environment:** preprod.mygenie.online (sandbox-pms)

---

## Executive Summary

All three CRs were previously marked **UNBLOCKED** (intake on Sep 4). This re-investigation reveals:

| CR | Previous Status | Revised Status | Key Finding |
|----|----------------|----------------|-------------|
| CR-363 Night Audit | UNBLOCKED | 🟡 **PARTIALLY UNBLOCKED** | No no-show field; outstanding balance needs client-side join |
| CR-364 Guest Folio | UNBLOCKED | 🟡 **PARTIALLY UNBLOCKED** | Read-only folio works; Record Payment returns 403; F&B transfer list empty |
| CR-366 Revenue Dashboard | UNBLOCKED | 🟢 **MOSTLY UNBLOCKED** | All key metrics derivable; daily-sales is single-day call (N calls for N days) |

**Critical Change Since Sep 4:** The backend team appears to have migrated endpoints from `/api/v1/` to `/api/v2/`. All v1 order endpoints now return 404. The frontend already uses v2 paths — so no breakage in the live app, but future investigations MUST use v2 URLs.

---

## Endpoint Availability Matrix (Live Sep 6)

| Endpoint | Method | v1 | v2 | Used By |
|----------|--------|-----|-----|---------|
| `vendoremployee/aiosell/dashboard-kpis` | GET | ✅ 200 | ✅ 200 | CR-363, CR-366 |
| `vendoremployee/daily-sales-revenue-report` | POST | ✅ 200 | ✅ 200 | CR-363, CR-366 |
| `vendoremployee/report/order-logs-report` | POST | ❌ 404 | ✅ 200 | CR-363, CR-364, CR-366 |
| `vendoremployee/aiosell/local-reservations` | GET | ❌ (needs dates) | ✅ 200 | CR-363, CR-364, CR-366 |
| `vendoremployee/aiosell/room-status-board` | GET | ✅ 200 | ✅ 200 | CR-363, CR-364 |
| `vendoremployee/get-single-order-new` | POST | ❌ **404** | ✅ 200 | CR-364 |
| `vendoremployee/pos/room-payment` | POST | ❌ 404 | ⚠️ **403** | CR-364 |
| `vendoremployee/aiosell/fetch-rates` | POST | — | ✅ 200 | CR-358-P5 |

---

## CR-363: Night Audit Report

### What It Needs
A single end-of-day page showing: rooms sold, revenue by payment mode, outstanding balances, no-shows, departures, and closing room statuses.

### What IS There (Confirmed Live)

| Data Point | Source Endpoint | Field Path | Status |
|------------|----------------|------------|--------|
| Rooms sold / Occupancy | `dashboard-kpis` | `data.today.occupancy_percent_physical` | ✅ |
| Occupied room count | `dashboard-kpis` | `data.physical.days[date].totals.occupied` | ✅ |
| Total capacity | `dashboard-kpis` | `data.physical.total_rooms` (=5) | ✅ |
| Per-room-type occupancy | `dashboard-kpis` | `data.physical.days[date].room_types[].occupied` | ✅ |
| Total revenue | `daily-sales-revenue-report` | `total_sales` | ✅ |
| Room revenue by mode | `daily-sales-revenue-report` | `room_checkin_revenue` → Cash/Card/UPI/TAB | ✅ |
| Room order amount | `daily-sales-revenue-report` | `orderRoom` | ✅ |
| Cash in drawer | `daily-sales-revenue-report` | `today_galla` | ✅ |
| Settlement total | `daily-sales-revenue-report` | `total_today_settlement` | ✅ |
| Balance to settle (aggregate) | `daily-sales-revenue-report` | `total_balance_to_settle` | ✅ |
| Room-level closing status | `room-status-board` | `rooms[].display_status` per room | ✅ |
| Arrivals count | `dashboard-kpis` | `data.today.arrivals_count` | ✅ |
| Departures count | `dashboard-kpis` | `data.today.departures_count` | ✅ |
| In-house count | `dashboard-kpis` | `data.today.in_house_count` | ✅ |
| Order-level breakdown | `order-logs-report` | `order[].orders_table` for room orders (order_in='RM') | ✅ |
| Payment method summary | `order-logs-report` | `payment_summary.by_payment_method` → cash/room/upi | ✅ |

### What is NOT There

| Data Point | Issue | Impact | Workaround |
|------------|-------|--------|------------|
| **No-show count/list** | No `no_show_count` field exists. `operational_status` values are: `pending`, `departed`, `in_house` — no `no_show` value. | Cannot show "No-Shows" line in audit | Derive: reservations where `operational_status='pending'` AND `checkin < today`. Imprecise — includes genuinely late arrivals. |
| **Outstanding balance per guest** | `total_balance_to_settle` is aggregate only. No per-room/per-guest breakdown in daily-sales. | Can't show line-item outstanding table | Cross-join: `order-logs-report` room orders where `payment_status='unpaid'` gives per-order outstanding. Requires client-side aggregation. |
| **Departure guest list** | `departures_count` exists but no named list of who departed today | Can't show "Guests Departed" section | Use `local-reservations` filtered by `checkout=today` AND `operational_status='departed'` |

### Verdict: 🟡 PARTIALLY UNBLOCKED
Can build ~80% of the page. No-show line item must be estimated or omitted in v1. Outstanding balance detail requires multi-endpoint join.

---

## CR-364: Guest Folio Detail Page

### What It Needs
Per-stay detail screen: room charges, F&B posted to room, advance paid, mid-stay payments, balance due. Actions: record payment, check out, print folio.

### What IS There (Confirmed Live)

| Data Point | Source Endpoint | Field Path | Status |
|------------|----------------|------------|--------|
| Room price | `get-single-order-new` | `orders[0].room_info.room_price` (e.g., "13922.28") | ✅ |
| Advance payment | `get-single-order-new` | `orders[0].room_info.advance_payment` (e.g., "0.00") | ✅ |
| Balance due | `get-single-order-new` | `orders[0].room_info.balance_payment` (e.g., "13922.28") | ✅ |
| Payment status | `get-single-order-new` | `orders[0].payment_status` (paid/unpaid) | ✅ |
| Payment method | `get-single-order-new` | `orders[0].payment_method` (cash/upi/card/cash_on_delivery) | ✅ |
| Line items | `get-single-order-new` | `orders[0].orderDetails[]` (food_name, quantity, price) | ✅ |
| Guest info | `get-single-order-new` | `orders[0].user` (name, phone, email) | ✅ |
| Room assignment | `get-single-order-new` | `orders[0].restaurantTable.table_no` | ✅ |
| Order ID linking | `room-status-board` | `rooms[].guest.order_id` → pass to get-single-order-new | ✅ |
| Reservation link | `local-reservations` | `rooms[].order_id` → links reservation to order | ✅ |

### What is NOT There

| Data Point | Issue | Impact | Workaround |
|------------|-------|--------|------------|
| **F&B transferred to room** | `associated_order_list` returns empty `[]` for all probed orders. Yet `payment_summary.by_payment_method.room = 120` shows transfers happened. | Folio won't show restaurant charges posted to room | Use `order-logs-report` filtered for orders with `payment_method='room'` — but can't link them to a specific room folio. **Backend gap**: the association isn't populated. |
| **Payment history/transactions** | Only `advance_payment` (single value). No `payment_transactions[]` array showing each payment event with timestamp. | Can't show "Payment received ₹X on Date" log | None — would need a new backend field. Show only current advance vs balance. |
| **Record Payment** | `POST /api/v2/vendoremployee/pos/room-payment` → **403 Forbidden** | "Record Payment" button will fail | May be a permissions/sandbox issue. Needs backend team confirmation. Endpoint EXISTS (not 404), so it's likely a role permission, not a missing route. |
| **Check Out** | Part of CR-362 (blocked — no modify/cancel endpoints) | "Check Out" button can't work | Omit from Folio v1, or show read-only folio without checkout action |
| **Print Folio** | No server-side PDF endpoint | Need client-side print | FE-only: `window.print()` or jsPDF/html2canvas. Not a backend blocker. |

### Response Shape: `get-single-order-new` (order 1232218)
```json
{
  "room_info": {
    "room_price": "13922.28",
    "advance_payment": "0.00",
    "balance_payment": "13922.28"
  },
  "payment_status": "unpaid",
  "payment_method": "cash_on_delivery",
  "orderDetails": [{ "food_name": "check in", "quantity": 1, "price": 13922.28 }],
  "associated_order_list": [],
  "user": { "name": null, "phone": "9876573210" },
  "restaurantTable": { "table_no": "r3" }
}
```

### Verdict: 🟡 PARTIALLY UNBLOCKED
Read-only folio is fully buildable. F&B transfers show empty (backend gap). Record Payment is 403 (permissions check needed). Print is FE-only.

---

## CR-366: Revenue Dashboard Analytics

### What It Needs
Trend analytics: Occupancy %, ADR, RevPAR, channel split, lead-time/LOS distributions over 7/30/90 days with charts and export.

### What IS There (Confirmed Live)

| Metric | Source | Derivation | Status |
|--------|--------|------------|--------|
| **Occupancy %** (daily trend) | `dashboard-kpis?start_date=X&end_date=X` | `physical.days[].totals.occupancy_percent` — one value per day, per room type | ✅ Multi-day in one call |
| **Rooms occupied** (daily) | `dashboard-kpis` | `physical.days[].totals.occupied` | ✅ |
| **Total capacity** | `dashboard-kpis` | `physical.total_rooms` (=5) | ✅ |
| **Per-room-type capacity** | `dashboard-kpis` | `physical.by_room_code` → executive: 2, suite: 3 | ✅ |
| **Revenue (daily)** | `daily-sales-revenue-report` | `total_sales`, `orderRoom`, `room_checkin_revenue` | ✅ (single day per call) |
| **Channel split** | `local-reservations` | `reservations[].channel` → Direct/booking.com/GoMMT | ✅ |
| **Booking amounts** | `local-reservations` | `reservations[].amount_after_tax` | ✅ |
| **Stay dates** | `local-reservations` | `checkin` / `checkout` | ✅ |
| **Booked-on date** | `local-reservations` | `booked_on` (for lead-time calc) | ✅ |
| **Revenue by payment method** | `order-logs-report` | `payment_summary.by_payment_method` → cash/room/upi | ✅ Multi-day in one call |
| **Order-level revenue** | `order-logs-report` | `order[].orders_table.order_amount`, `payment_status` | ✅ |

### Derived Metrics (FE computation)

| Metric | Formula | Feasibility |
|--------|---------|-------------|
| **ADR** | `Σ(amount_after_tax) / Σ(room-nights sold)` from reservations | ✅ Client-side |
| **RevPAR** | `ADR × Occupancy%` or `Total Revenue / Available Room-Nights` | ✅ Client-side |
| **Channel %** | Count reservations per channel / total | ✅ Client-side |
| **Lead Time** | `checkin - booked_on` (days) per reservation | ✅ Client-side |
| **LOS Distribution** | `checkout - checkin` per reservation | ✅ Client-side |
| **ADR per room type** | Cross-reference `reservations.rooms[].room_code` with `amount_after_tax` | ⚠️ Approximate (multi-room bookings split unclear) |

### What is NOT There

| Gap | Issue | Impact | Workaround |
|-----|-------|--------|------------|
| **Single-day revenue API** | `daily-sales-revenue-report` accepts only `{"from":"YYYY-MM-DD"}` — one day at a time | 90-day dashboard = 90 API calls | Use `order-logs-report` (multi-day: `from_date`/`to_date`) for payment summary. Use `dashboard-kpis` (multi-day) for occupancy. Only call `daily-sales` for today's summary card. |
| **Sandbox data sparsity** | Only 1 reservation and 17 orders on sandbox now | Dashboard will appear near-empty on preprod | Not a code blocker. Production will have real data. |
| **Revenue per room type** | No endpoint gives revenue broken down by room_code | Can't show "Suite Revenue vs Deluxe Revenue" precisely | Estimate from `local-reservations` amounts by `rooms[].room_code`. Multi-room bookings may not split cleanly. |
| **Export endpoint** | No server-side CSV/PDF export | Need client-side export | FE-only: papaparse for CSV, jsPDF/html2canvas for PDF. Not a backend blocker. |

### Verdict: 🟢 MOSTLY UNBLOCKED
All key metrics (Occupancy, ADR, RevPAR, Channel Split, LOS, Lead Time) are derivable from existing endpoints. Main optimization: minimize daily-sales calls by using multi-day order-logs-report. Export is FE-only.

---

## API Call Strategy Per CR

### CR-363 Night Audit (single business date)
```
1. GET  /api/v2/vendoremployee/aiosell/dashboard-kpis?start_date=DATE&end_date=DATE
   → Occupancy, arrivals, departures, in-house, room-type breakdown
2. POST /api/v1/vendoremployee/daily-sales-revenue-report  {"from":"DATE"}
   → Revenue totals, payment modes, cash drawer, settlement
3. POST /api/v2/vendoremployee/report/order-logs-report  {"from_date":"DATE","to_date":"DATE","sort_by":"created_at"}
   → Order-level breakdown, outstanding per order, payment summary
4. GET  /api/v2/vendoremployee/aiosell/room-status-board
   → Closing room statuses
5. GET  /api/v2/vendoremployee/aiosell/local-reservations?start_date=DATE&end_date=DATE
   → Departures list, no-show estimation
```
**Total: 5 API calls for one night audit**

### CR-364 Guest Folio (single room stay)
```
1. POST /api/v2/vendoremployee/get-single-order-new  {"order_id":"ORDER_ID"}
   → Room charges, advance, balance, line items, guest, payment status
   (order_id from room-status-board.guest.order_id or local-reservations.rooms[].order_id)
```
**Total: 1 API call per folio view** (plus the list view that already provides order_id)

### CR-366 Revenue Dashboard (date range)
```
1. GET  /api/v2/vendoremployee/aiosell/dashboard-kpis?start_date=START&end_date=END
   → Multi-day occupancy trend
2. POST /api/v2/vendoremployee/report/order-logs-report  {"from_date":"START","to_date":"END","sort_by":"created_at"}
   → Revenue, payment methods, order count
3. GET  /api/v2/vendoremployee/aiosell/local-reservations?start_date=START&end_date=END
   → Bookings for ADR, channel split, LOS, lead time
4. POST /api/v1/vendoremployee/daily-sales-revenue-report  {"from":"TODAY"}
   → Today's snapshot only (avoid N-day loop)
```
**Total: 4 API calls for any date range**

---

## Sandbox Data State (Sep 6 vs Sep 4)

| Entity | Sep 4 | Sep 6 | Change |
|--------|-------|-------|--------|
| Reservations | 15 | 1 | **Cleaned** — 14 removed |
| Room-status rooms | 5 | 2 | **Reduced** — 3 rooms unmapped |
| Orders | ~17 | 17 | Stable |
| Room orders | 13 | 13 | Stable |

**Impact:** Testing on preprod will show sparse data. Not a code blocker but affects visual QA.

---

## Recommendations

1. **CR-363 Night Audit** — Proceed with build. Accept that no-show line is estimated. Use `order-logs-report` for outstanding breakdown instead of daily-sales aggregate.
2. **CR-364 Guest Folio** — Build read-only folio first. Defer "Record Payment" action pending permissions clarification for v2/pos/room-payment (403). Defer checkout action (CR-362 dependency). Note: F&B transfers to room will appear empty until `associated_order_list` is populated by backend.
3. **CR-366 Revenue Dashboard** — Proceed with build. Use multi-day `dashboard-kpis` + `order-logs-report` to avoid N daily-sales calls. All charts computable client-side.
4. **Backend Team Ask:** Confirm whether `pos/room-payment` 403 is a role permission issue or intentional restriction. Clarify when `associated_order_list` will be populated.

---

*Evidence saved to: `/app/memory/evidence/INV-PMS-CRs-363-364-366/`*  
*No code edits made during this investigation.*
