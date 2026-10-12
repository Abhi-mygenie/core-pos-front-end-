# BACKEND_BRIEF_BUG408_2026-09-15

## Summary
- **Issue:** `daily-sales-revenue-report` returns `room_revenue.Room Cash`, `Room Card`, `Room UPI` all as `"0"` even on days with over ₹84,000 in room settlements.
- **Classification:** BACKEND_BUG — data computed but payment-method split not being populated
- **Frontend impact:** Daily Report → Room section → "Settled" breakdown shows ₹0 for Cash, Card, UPI despite a non-zero Room Total. Owners cannot see how room bills were actually paid.
- **Priority/Risk:** P1 / HIGH — financial reporting incorrectly shows ₹0 across all room payment methods

---

## Endpoint
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/daily-sales-revenue-report`
- **Auth/context:** vendor-employee token (owner role)
- **Request payload:** `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`

---

## Reproduction
1. Log in as owner (goankitchen_owner)
2. POST `daily-sales-revenue-report` with `from` and `to` set to a date that had room checkouts (e.g. `2026-09-03`)
3. Inspect `room_revenue` in the response
4. Observe `Room Cash = "0"`, `Room Card = "0"`, `Room UPI = "0"` while `Room Total = "84610.04"`

---

## Payload / Response

**Request payload:**
```json
{ "from": "2026-09-03", "to": "2026-09-03" }
```

**Actual API response (relevant section):**
```json
"room_revenue": {
  "Room Cash":     "0",          ← WRONG — should be non-zero
  "Room Card":     "0",          ← WRONG — should be non-zero
  "Room UPI":      "0",          ← WRONG — should be non-zero
  "Room Total":    "84610.04",   ← correct total
  "Room advance":  "24488.38",   ← correct
  "Room Checkout": "36822.28"    ← correct
}
```

**Expected response:**
```json
"room_revenue": {
  "Room Cash":     "<actual cash collected at room checkout>",
  "Room Card":     "<actual card collected at room checkout>",
  "Room UPI":      "<actual UPI collected at room checkout>",
  "Room Total":    "84610.04",
  "Room advance":  "24488.38",
  "Room Checkout": "36822.28"
}
```

**Reference — `room_checkin_revenue` is correctly populated (same date):**
```json
"room_checkin_revenue": {
  "Room Cash": 28222,   ← correctly populated ✅
  "Room Card": 0,
  "Room UPI":  6000,    ← correctly populated ✅
  "Room TAB":  0
}
```
The check-in revenue split works correctly, so the plumbing exists — the room *settlement/checkout* split is the gap.

---

## Evidence
- Full probe response: `/app/memory/evidence/BUG-408/evidence_bug408_bug409.json`
- Source probe: `/app/memory/evidence/INV-PMS-ENH/probe_13_daily_sales.json`
- Investigation: `/app/memory/investigations/INV_DAILY_REPORT_PMS_GAPS_2026_09_15.md` §A GAP-DR-03 G1

---

## Frontend Workaround
- **Available:** NO
- **Details:** FE correctly reads `data.room_revenue['Room Cash/Card/UPI']`. The values returned by the backend are `"0"`. No FE workaround is possible — the data must come from the backend.

---

## Ask for Backend Team

> On dates with room checkout payments, please populate `room_revenue.Room Cash`, `room_revenue.Room Card`, and `room_revenue.Room UPI` with the actual payment amounts collected at checkout (same pattern as `room_checkin_revenue` which is already correct).

*Filed 2026-09-15 · INTAKE agent (ALPHA v0.7)*
