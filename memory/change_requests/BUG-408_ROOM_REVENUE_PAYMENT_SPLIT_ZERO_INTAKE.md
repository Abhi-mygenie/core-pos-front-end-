# BUG-408 — Room Settlement Cash/Card/UPI always ₹0 (backend not populating split)

**ID:** BUG-408  
**Registered:** 2026-09-15  
**Status:** GATE 1 — INTAKE COMPLETE — BACKEND-BLOCKED  
**Type:** BUG — Backend data accuracy  
**Priority:** P1  
**Risk:** HIGH (financial display — room settlement reporting incorrect)  
**Sprint:** pos_pms_1  

---

## What the issue is (plain English)

In the Daily Report Room section, "Settled" shows a total (e.g. ₹84,610) but the Cash / Card / UPI breakdown below it always reads ₹0 for all three. Staff and owners cannot see how room bills were actually paid.

## Evidence (probe_13_daily_sales.json — Sept 3, 2026)

```json
room_revenue: {
  "Room Cash":     "0",        ← always ₹0
  "Room Card":     "0",        ← always ₹0
  "Room UPI":      "0",        ← always ₹0
  "Room Total":    "84610.04" ← correct total
  "Room advance":  "24488.38"
  "Room Checkout": "36822.28"
}
```

Room Total = ₹84,610 but Cash + Card + UPI all = 0. The split is not being computed by the backend.

## Root cause

**Backend data gap.** The `room_revenue` object is populated by the backend's daily-sales-revenue-report. The total (`Room Total`) is calculated correctly, but the per-payment-method sub-fields (`Room Cash`, `Room Card`, `Room UPI`) are not being populated — they are always sent as `"0"`.

The FE wiring is correct (`data.room_revenue['Room Cash/Card/UPI']`). The data simply is not there.

## FE impact

Room section "Settled" breakdown shows ₹0 for all three payment methods, even on days with ₹80k+ in room settlements.

## Code reality: FE wiring EXISTS, backend sends wrong values

## Action needed: Backend brief to fix `room_revenue` Cash/Card/UPI population

*Intake written 2026-09-15 · INTAKE agent (ALPHA v0.7)*
