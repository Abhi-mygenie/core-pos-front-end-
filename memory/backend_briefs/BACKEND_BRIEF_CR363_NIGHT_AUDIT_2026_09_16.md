# BACKEND_BRIEF_CR363_NIGHT_AUDIT_2026_09_16
## PMS — Night Audit: Server-Side End-of-Day Aggregation Endpoint

**Filed:** 2026-09-16 · **Filed by:** Planning agent (ALPHA v0.7) · **Owner-approved scope:** 2026-09-16
**Related items:** CR-363 (primary) · CR-366 `revenue-summary` (**shares definitions — must be built on the same code path**) · CR-015/016 Day Closure (`waiter/get-settlement-report`) · CR-364 Guest Folio · CR-357 OD-7 · BUG-385 (resolved: `today.no_show_count`)
**Companion brief:** `BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15.md` (§4 definitions, Q-366-11..13)

---

## 1. Summary
- **Issue:** Hotel needs one end-of-day sheet for a single business date `D`: rooms sold, **Sales (booked)** vs **Revenue (collected)** by tender, F&B posted to rooms, outstanding guest balances, no-shows, departures paid/unpaid, room-status close, and a **reconciliation line to Day Closure**. No server aggregation exists (`aiosell/night-audit` → 404).
- **Classification:** NEW ENDPOINT (v2) — CONTRACT_GAP
- **Frontend impact:** Without it, FE must compose 7 endpoints client-side incl. N× `get-single-order-new` (one per in-house room) and cannot split room vs F&B cash in Day Closure → audit totals that do not tie out (R6).
- **Priority/Risk:** P1 / HIGH

### Why existing APIs are not enough (verified)
| Source | Gap |
|---|---|
| `GET aiosell/dashboard-kpis?start_date=D&end_date=D` | Occupancy only; no revenue. |
| `POST report/daily-sales-revenue-report {from: D}` | Room collections, but semantics of `Room Total / Room Checkout / Room advance / room_checkin_revenue` unconfirmed (B-363-02); no booked value. |
| `POST waiter/get-settlement-report` | Per-waiter drawer. Room checkout (`PmsCheckoutDrawer` → `order/order-bill-payment` with cashier `waiter_id`) lands in `today_collection` **blended with F&B**, no split. |
| `getReservationOps` + `get-single-order-new` | Outstanding balances need N calls; `balance_payment` includes or excludes food? (CR-357 OD-7 open). |
| `local-reservations?status=no_show` | Available (BUG-385 Option A). |

---

## 2. Requested Endpoint

```
GET /api/v2/vendoremployee/aiosell/night-audit
Authorization: Bearer ***   (vendoremployee auth, restaurant scoped via token)

Query params
  date          YYYY-MM-DD   required   business day D (boundary per Q-366-08 — same as revenue-summary)
  include       csv          optional   sections filter, default all:
                                        occupancy,revenue,fnb,outstanding,no_shows,departures,room_status,reconciliation,audit_trail
```

### Validation / errors
- Future `date` → 200 with `is_forecast: true`, `revenue.collected = 0`, lists empty except arrivals expected.
- Any historical date allowed (owner OD-363-06: **unlimited**, whatever backend can serve). If you need a floor, state it (Q-363-05).

### Performance target
- ≤ 100 rooms, any single date: **≤ 1.5 s** p95. Suggest reading from the same nightly `pms_daily_revenue` materialisation proposed in CR-366 §6, plus live joins only for the list sections.

---

## 3. Response Shape

```jsonc
{
  "status": true,
  "data": {
    "date": "2026-09-15",
    "business_day": { "start": "2026-09-15T00:30:00Z", "end": "2026-09-16T00:29:59Z" },   // Q-366-08
    "is_forecast": false,

    // ── A. Occupancy (MUST equal revenue-summary?start_date=D&end_date=D totals) ──
    "occupancy": {
      "rooms_total": 20, "rooms_ooo": 1, "rooms_available": 19,
      "rooms_sold": 14, "rooms_complimentary": 1, "occupancy_percent": 73.68,
      "arrivals_expected": 5, "arrivals_actual": 4,
      "departures_expected": 3, "departures_actual": 3,
      "in_house": 15, "day_use": 0,
      "by_room_type": [ { "room_code": "suite", "capacity": 4, "available": 4, "sold": 3, "occupancy_percent": 75.00 } ]
    },

    // ── B. Sales vs Revenue (owner wording: Booked = SALES, Collected = REVENUE) ──
    "revenue": {
      "room_sales_booked":      52000.00,   // = revenue-summary.room_revenue_booked for D (nights consumed on D, ex-GST)
      "room_revenue_collected": 41500.00,   // = revenue-summary.room_revenue_collected for D (payments dated D, ex-GST)
      "room_gst_collected":      4980.00,
      "collected_by_tender": { "cash": 14500.00, "card": 12000.00, "upi": 9000.00, "tab": 0.00, "ota_remittance": 6000.00, "other": 0.00 },
      "collected_by_stage":  { "advance_at_booking": 6000.00, "advance_at_checkin": 10500.00, "mid_stay": 0.00, "checkout": 25000.00 },
      "refunds": 0.00,
      "adr_booked": 3714.29, "adr_collected": 2964.29, "revpar_booked": 2736.84, "revpar_collected": 2184.21,
      "other_revenue_posted": 0.00           // laundry / no-show fees / cancellation fees
    },

    // ── C. F&B posted to rooms — SEPARATE (OD-363-03 = a) ──
    "fnb_posted_to_rooms": { "orders": 9, "amount": 7200.00, "gst": 360.00, "collected": 7200.00, "outstanding": 0.00, "trevpar": 3115.79 },

    // ── D. Outstanding guest balances (in-house at end of D) ──
    "outstanding": {
      "total_room_balance": 13922.28, "total_fnb_balance": 850.00, "total_balance": 14772.28,
      "rows": [
        { "order_id": 1232218, "reservation_id": "AIO-9911", "room_no": "204", "room_code": "deluxe",
          "guest_name": "***", "checkin": "2026-09-13", "checkout": "2026-09-17", "nights": 4, "nights_consumed": 2,
          "channel": "booking.com", "booking_payment_type": "ota_pay_at_hotel",
          "room_booked": 16000.00, "room_collected": 2077.72, "room_balance": 13922.28,
          "fnb_posted": 850.00, "fnb_collected": 0.00, "fnb_balance": 850.00,
          "payment_status": "unpaid" }
      ]
    },

    // ── E. No-shows (BUG-385 Option A) ──
    "no_shows": { "count": 1, "fee_charged": 0.00,
      "rows": [ { "reservation_id": "AIO-9920", "guest_name": "***", "channel": "Direct", "checkin": "2026-09-15", "nights": 2, "booked_value": 8000.00, "advance_collected": 0.00, "retained": 0.00, "marked_by": "***", "marked_at": "2026-09-15T22:10:00Z" } ] },

    // ── F. Departures on D ──
    "departures": {
      "checked_out_paid":   [ { "order_id": 0, "room_no": "101", "guest_name": "***", "room_booked": 0, "room_collected": 0, "tender": "cash", "checked_out_at": "…" } ],
      "checked_out_unpaid": [],                 // checked out with balance > 0 (should be rare — flag)
      "overdue_in_house":   [ { "order_id": 0, "room_no": "305", "guest_name": "***", "checkout": "2026-09-14", "days_overdue": 1, "room_balance": 0 } ],
      "early_checkouts":    []                  // checkout < original checkout (CR-362 modify)
    },

    // ── G. Room status at close ──
    "room_status_close": { "available": 4, "occupied": 14, "occupied_hk": 1, "booked": 0, "hk": 1, "ooo": 1,
      "rows": [ { "room_no": "204", "room_code": "deluxe", "status": "occupied", "hk_status": "clean" } ] },

    // ── H. Reconciliation to Day Closure (waiter/get-settlement-report for D) ──
    "reconciliation": {
      "settlement_total_collection": 61300.00,        // Σ waiters.today_collection
      "settlement_room_share":       35500.00,        // portion from room orders (RM folios) — Q-366-12
      "settlement_fnb_share":        25800.00,
      "night_audit_room_cash_card_upi": 35500.00,     // collected_by_tender.cash+card+upi
      "delta": 0.00,                                  // must be 0; non-zero → FE shows red flag
      "by_waiter": [ { "waiter_id": 0, "name": "***", "today_collection": 0, "room_share": 0, "fnb_share": 0 } ]
    },

    // ── I. Audit trail for D (ties BUG-193 room-transfer trail) ──
    "audit_trail": [
      { "at": "2026-09-15T08:12:00Z", "type": "check_in",  "reservation_id": "…", "room_no": "204", "by": "***", "detail": {} },
      { "at": "…", "type": "check_out", "...": "" },
      { "at": "…", "type": "modify | extend | cancel | no_show | room_transfer | payment | fnb_post", "...": "" }
    ]
  }
}
```

---

## 4. Definitions
**Inherit CR-366 brief §4 verbatim** (night, rooms_available, rooms_sold, complimentary, booked ex-GST attributed to night consumed, collected attributed to collection date, OTA-prepaid on `booked_on`, refunds negative, ADR/RevPAR/TRevPAR, `null` when denominator 0).

Owner wording rule (2026-09-16): FE labels `room_sales_booked` as **"Sales"** and `room_revenue_collected` as **"Revenue"**. Booked includes OTA prepaid / partially paid / pay-at-hotel alike — it is what was sold, not what was received.

Additional for this endpoint:

| Term | Definition |
|---|---|
| `nights_consumed` | Nights from `checkin` up to and including `D` (D itself counts if guest is in-house at close). |
| `room_balance` | `room_booked − room_collected` (room component only; food shown separately — resolves CR-357 OD-7 for this view, confirm Q-366-06). |
| `checked_out_unpaid` | `payment_status ≠ paid` at checkout OR `room_balance > 0` after checkout. |
| `overdue_in_house` | In-house at close with `checkout < D`. |
| `settlement_room_share` | Sum of `order-bill-payment` amounts on room orders (RM / SRM folio orders) dated `D`, per waiter. |
| `delta` | `settlement_room_share − (cash+card+upi)` from `collected_by_tender`. Expected 0. |

---

## 5. Questions for Backend (answer inline)

| # | Question | Why |
|---|---|---|
| Q-363-01 | Confirm `night-audit?date=D` and `revenue-summary?start_date=D&end_date=D` are computed from the **same code/materialised table** so A and B match exactly. | R6 single source of truth. Same as Q-366-13. |
| Q-363-02 | Can the settlement report's `today_collection` be split into room-order vs F&B-order share per waiter (`settlement_room_share`)? If not on this endpoint, can you add it to `get-settlement-report` itself? | Section H reconciliation to Day Closure. Same as Q-366-12. |
| Q-363-03 | For a combined checkout payment (room + F&B in one `order-bill-payment`), how do you allocate tender to room vs F&B? Proportional or line-based? | `collected_by_tender` correctness. Same as Q-366-02. |
| Q-363-04 | Does `room_info.balance_payment` in `get-single-order-new` include posted F&B? | `room_balance` vs `fnb_balance` split. Same as CR-357 OD-7 / Q-366-06. |
| Q-363-05 | Historical depth: owner wants **any past date**. Is there a floor (e.g. data before PMS go-live)? State it. | OD-363-06 = unlimited/whatever backend provides. |
| Q-363-06 | Room status history: can you return `room_status_close` for a **past** date, or only current status? If only current, say so and FE will show "current" with a label for past dates. | Section G. Same as Q-366-07. |
| Q-363-07 | Audit trail: do you log check-in/out, modify/extend/cancel, no-show, room-transfer, payment events with actor + timestamp? Which events are available? | Section I; also BUG-193 room-transfer trail. |
| Q-363-08 | Key names above are **proposals**. Use any names — just return the mapping in your reply. | Owner note 2026-09-16. |

---

## 6. Owner Decisions Frozen (2026-09-16)

| OD | Decision |
|---|---|
| OD-363-01 | Business-day boundary — **follow backend answer to Q-366-08**; FE sends calendar `date`, backend applies the cutoff and returns `business_day{}`. |
| OD-363-02 | **Both** — Sales (booked) and Revenue (collected). Owner: "sales and revenue are two different things". |
| OD-363-03 | F&B posted to rooms **separate** (a). |
| OD-363-04 | **Read-only** v1, no Close-Day lock (a). Lock/stamp = v2. |
| OD-363-05 | Sidebar: child under **Rooms & Reservations** (a) — same as OD-366-04. Sidebar frozen post-P1 → SC ack at Gate 3. |
| OD-363-06 | Replay depth **unlimited / whatever backend provides** (d). |

---

## 7. Evidence
- `/app/memory/evidence/INV-PMS-ENH/probe_13_daily_sales.json` — room collection buckets for 2026-09-03
- `/app/memory/evidence/INV-PMS-CRs-363-364-366/probe_single_order_v2.json` — `room_info {room_price, advance_payment, balance_payment}`
- `aiosell/night-audit` → 404 (intake 2026-09-04)
- Code trace 2026-09-16: `components/pms/PmsCheckoutDrawer.jsx` L138–160 → `orderToAPI.collectBillExisting(..., {waiterId: user.employeeId})` → `POST API_ENDPOINTS.BILL_PAYMENT` (same as F&B). `api/services/settlementService.js` L9 `get-settlement-report`; `api/transforms/settlementTransform.js` — no room/F&B split fields (only `tips_by_mode.ROOM`).

## 8. Frontend Workaround
- Available: **PARTIAL / NOT RECOMMENDED** — compose sections A, D–G client-side from 7 endpoints (N× `get-single-order-new`); sections B (by tender), C and H **cannot** be produced client-side. Would ship a P1 financial report with "provisional" revenue tiles. Owner-approved path: wait for endpoint.

---

## Status
- [ ] Backend acknowledged
- [ ] Q-363-01…08 answered (Q-363-01/02/03/04/06 duplicate Q-366-13/12/02/06/07 — answer once)
- [ ] Endpoint on preprod → FE curl-probe (R11) → joint CR-363/CR-366 Gate 2 Impact Analysis
