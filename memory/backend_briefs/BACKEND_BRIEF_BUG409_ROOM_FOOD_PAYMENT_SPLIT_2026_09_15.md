# BACKEND_BRIEF_BUG409_2026-09-15

## Summary
- **Issue:** `daily-sales-revenue-report` returns `orderRoom` as a single total (e.g. ₹16,888) with no Cash/Card/UPI breakdown. There is no field in the response for how in-room food orders were settled by payment method.
- **Classification:** CONTRACT_MISMATCH — new field needed in API response
- **Frontend impact:** Daily Report → Room section → "Room Orders" shows only a total. Owners cannot see whether room food was settled by cash, card, or UPI.
- **Priority/Risk:** P2 / MEDIUM — missing data (reporting gap, not data corruption)

---

## Endpoint
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/daily-sales-revenue-report`
- **Auth/context:** vendor-employee token (owner role)
- **Request payload:** `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`

---

## Reproduction
1. POST `daily-sales-revenue-report` with a date that had room food orders
2. Inspect the response — `orderRoom` is a scalar number
3. Search the entire response for any cash/UPI/card breakdown of food charged to rooms — **no such field exists**

---

## Current API Response (relevant section)
```json
"orderRoom": 16888.38    ← single scalar total only, no sub-fields
```

For comparison, **check-in revenue already has the correct shape** (use this as the model):
```json
"room_checkin_revenue": {
  "Room Cash": 28222,
  "Room Card": 0,
  "Room UPI":  6000,
  "Room TAB":  0
}
```

---

## Requested Change

Add a new `room_food_revenue` object to the `daily-sales-revenue-report` response using the same shape as `room_checkin_revenue`:

```json
"room_food_revenue": {
  "Room Cash": <amount of food-on-room settled by cash>,
  "Room Card": <amount of food-on-room settled by card>,
  "Room UPI":  <amount of food-on-room settled by UPI>,
  "Room TAB":  <amount charged to TAB/credit>
}
```

`room_food_revenue` = payment breakdown for **food orders attached to room reservations** (the orders that make up the `orderRoom` total).

> If the naming convention should differ (e.g. `order_room_revenue` or nested under `paid_revenue_method`), please confirm the key name so the FE can be updated accordingly.

---

## Evidence
- Full probe response: `/app/memory/evidence/BUG-408/evidence_bug408_bug409.json`
- Source probe: `/app/memory/evidence/INV-PMS-ENH/probe_13_daily_sales.json`
- Investigation: `/app/memory/investigations/INV_DAILY_REPORT_PMS_GAPS_2026_09_15.md` §A GAP-DR-03 G2

---

## Frontend Workaround
- **Available:** NO
- **Details:** The field does not exist in the API response. Once backend ships `room_food_revenue`, FE will wire it into the Room section Cash/Card/UPI breakdown in `reportService.js` (low complexity, ~3 lines).

*Filed 2026-09-15 · INTAKE agent (ALPHA v0.7)*
