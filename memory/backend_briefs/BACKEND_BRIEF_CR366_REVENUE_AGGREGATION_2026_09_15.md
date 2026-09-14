# BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15
## PMS — Revenue Dashboard: Server-Side Aggregation Endpoint (Occupancy · ADR · RevPAR · Channel · Payment Mode)

**From:** MyGenie POS frontend team (Planning agent, ALPHA v0.7)
**To:** Backend / Dev team
**Date:** 2026-09-15
**Related items:** CR-366 (primary) · CR-363 Night Audit (shares definitions) · BUG-385 (`no_show` missing) · CR-362 (cancel/modify/extend) · CR-357 (advance overflow, OD-7)
**Classification:** NEW ENDPOINT + CONTRACT ENHANCEMENT
**Priority / Risk:** P2 · **HIGH** (report totals — R6 "financial logic is sacred"; every formula below must be a single server-side source of truth)
**Frontend impact:** CR-366 `/pms/revenue` page cannot be built to spec without this. Current sources force N chunked calls, client-side money math, and cannot distinguish OTA-prepaid vs pay-at-hotel vs no-show.

---

## 1. Summary

Owner wants a PMS Revenue Dashboard with:

- **From / To date picker with NO range ceiling** (any historical range), plus **Today · 7D · 30D** quick pills (same pattern as `DailySalesMockup` / Insights reports — `s11-presets`).
- Daily trend of **Occupancy %, Rooms Sold / Available, Room Revenue, ADR, RevPAR**, plus **channel split** and **payment-mode split**.
- Revenue shown on **two bases side by side**: `room_revenue_booked` (primary) and `room_revenue_collected` (secondary). Owner decision 2026-09-15 (OD-366-01 = option c).
- F&B posted to rooms returned **separately** (`fnb_revenue_posted`) so RevPAR stays rooms-only (industry standard) and TRevPAR can be shown optionally (OD-366-02 — see §7).

### Why the current API set is not enough (verified by probes)

| Existing source | Limitation (evidence) |
|---|---|
| `GET aiosell/dashboard-kpis?start_date&end_date` | **HTTP 422 `"Date range cannot exceed 31 days"`** for >31 days (68-day probe). Occupancy only — no revenue. `channel` block is always `null`. No `no_show`. |
| `POST daily-sales-revenue-report {from}` | **Single day only** (`probe_13_daily_sales.json`). 365 days = 365 calls. Room fields (`Room Total`, `Room advance`, `Room Checkout`, `Room Checkin`) are collection-date buckets with undocumented semantics — cannot derive booked revenue. |
| `GET aiosell/local-reservations` | Has `channel`, `amount_after_tax`, `pah`, `booked_on`, `checkin/checkout`, but `amount_before_tax` is **null**, no per-night rate, no `collected_amount`, no `no_show`, no cancel rows (`view=cancelled` → 422). |
| `POST report/order-logs-report` | Orders with `room_info {room_price, advance_payment, balance_payment}` — order-level, not per-night; mixes F&B and room; no channel. |

Doing ADR/RevPAR math on the client from four half-fitting sources violates R6 and will diverge from whatever backend reports show. **We need one aggregation endpoint.**

---

## 2. Requested Endpoint

```
GET /api/v2/vendoremployee/aiosell/revenue-summary
Authorization: Bearer ***   (same vendoremployee auth as dashboard-kpis; restaurant scoped via token)

Query params
  start_date   YYYY-MM-DD   required   (inclusive, business day)
  end_date     YYYY-MM-DD   required   (inclusive)  — NO 31-day ceiling
  group_by     day | week | month      optional, default: day
                                        (FE will send day for ≤92 days, week for ≤366, month above — but server must accept any)
  room_code    string                  optional filter (e.g. suite)
  channel      string                  optional filter (Direct | booking.com | WalkIn | …)
  compare      previous_period         optional — if present, also return `previous` block for the same length window immediately before start_date
```

### Validation / errors
- `start_date > end_date` → 422 `{ message: "start_date must be <= end_date" }`
- `end_date` in future → allowed (forward-looking occupancy from confirmed bookings, revenue fields = booked only, collected = 0). Return `is_forecast: true` on those buckets.
- Unknown `room_code` / `channel` → 200 with empty series (not 422).

### Performance target
- 365 days, `group_by=day`, ≤ 100 rooms: **≤ 2 s** p95. Use nightly materialised table `pms_daily_revenue` (see §6) rather than joining orders live.

---

## 3. Response Shape

```jsonc
{
  "status": true,
  "message": "Revenue summary fetched successfully",
  "data": {
    "generated_at": "2026-09-15T10:22:31+05:30",
    "currency": "INR",
    "range": { "start_date": "2026-08-16", "end_date": "2026-09-14", "days": 30, "group_by": "day" },

    // ── Headline KPIs for the whole range ────────────────────────────────
    "totals": {
      "rooms_available":        150,        // Σ (capacity − ooo) over nights
      "rooms_sold":             97,         // Σ occupied room-nights (excl. complimentary, house-use, OOO)
      "rooms_complimentary":    2,
      "occupancy_percent":      64.67,      // rooms_sold / rooms_available × 100
      "room_revenue_booked":    485000.00,  // ex-GST, rooms component only
      "room_revenue_collected": 402500.00,  // ex-GST, rooms component only, by collection date
      "fnb_revenue_posted":     38200.00,   // F&B/other charges posted to room folios (ex-GST)
      "other_revenue_posted":   4500.00,    // laundry, extras, no-show fees, cancellation fees
      "tax_collected":          58200.00,   // GST on room component (informational)
      "adr_booked":             5000.00,    // room_revenue_booked / rooms_sold
      "adr_collected":          4149.48,    // room_revenue_collected / rooms_sold
      "revpar_booked":          3233.33,    // room_revenue_booked / rooms_available
      "revpar_collected":       2683.33,
      "trevpar":                3518.00,    // (room_booked + fnb + other) / rooms_available
      "bookings_count":         41,         // reservations whose stay overlaps range
      "arrivals":               39,
      "departures":             37,
      "cancellations_count":    3,
      "no_show_count":          2,          // BUG-385 dependency
      "avg_los_nights":         2.37,       // Σ nights / bookings
      "avg_lead_time_days":     6.8,        // avg(checkin − booked_on)
      "outstanding_balance":    82500.00    // booked − collected for stays that have departed (receivable)
    },

    // ── Time series (one bucket per group_by unit) ───────────────────────
    "series": [
      {
        "bucket_start": "2026-08-16",
        "bucket_end":   "2026-08-16",
        "is_forecast":  false,
        "rooms_capacity": 5, "rooms_ooo": 0, "rooms_available": 5,
        "rooms_sold": 3, "rooms_complimentary": 0, "occupancy_percent": 60.0,
        "arrivals": 2, "departures": 1, "in_house": 3, "no_shows": 0, "cancellations": 0,
        "room_revenue_booked": 15000.00,
        "room_revenue_collected": 9000.00,
        "fnb_revenue_posted": 1200.00,
        "other_revenue_posted": 0.00,
        "tax_collected": 1800.00,
        "adr_booked": 5000.00, "adr_collected": 3000.00,
        "revpar_booked": 3000.00, "revpar_collected": 1800.00,
        "by_room_type": [
          { "room_code": "suite", "capacity": 3, "ooo": 0, "available": 3, "sold": 2,
            "occupancy_percent": 66.67, "room_revenue_booked": 11000.00, "room_revenue_collected": 6000.00, "adr_booked": 5500.00 },
          { "room_code": "executive", "capacity": 2, "ooo": 0, "available": 2, "sold": 1,
            "occupancy_percent": 50.0, "room_revenue_booked": 4000.00, "room_revenue_collected": 3000.00, "adr_booked": 4000.00 }
        ],
        "by_channel": [
          { "channel": "booking.com", "room_nights": 2, "room_revenue_booked": 11000.00, "room_revenue_collected": 6000.00 },
          { "channel": "Direct",      "room_nights": 1, "room_revenue_booked": 4000.00,  "room_revenue_collected": 3000.00 }
        ]
      }
    ],

    // ── Range-level breakdowns ───────────────────────────────────────────
    "by_channel": [
      { "channel": "booking.com", "bookings": 18, "room_nights": 44, "room_revenue_booked": 220000.00,
        "room_revenue_collected": 150000.00, "adr_booked": 5000.00, "cancellations": 2, "no_shows": 1,
        "avg_lead_time_days": 9.1, "avg_los_nights": 2.4, "share_of_revenue_percent": 45.36 }
    ],

    "by_payment_mode": [                              // see §5 for enum
      { "payment_mode": "ota_prepaid",   "bookings": 12, "room_nights": 30, "room_revenue_booked": 150000.00, "room_revenue_collected": 150000.00, "outstanding": 0.00 },
      { "payment_mode": "pay_at_hotel",  "bookings": 9,  "room_nights": 20, "room_revenue_booked": 100000.00, "room_revenue_collected": 82000.00,  "outstanding": 18000.00 },
      { "payment_mode": "direct_advance","bookings": 11, "room_nights": 27, "room_revenue_booked": 135000.00, "room_revenue_collected": 110500.00, "outstanding": 24500.00 },
      { "payment_mode": "walkin_postpaid","bookings": 7, "room_nights": 15, "room_revenue_booked": 75000.00,  "room_revenue_collected": 60000.00,  "outstanding": 15000.00 },
      { "payment_mode": "complimentary", "bookings": 2,  "room_nights": 5,  "room_revenue_booked": 0.00,      "room_revenue_collected": 0.00,      "outstanding": 0.00 }
    ],

    "by_room_type": [
      { "room_code": "suite", "capacity_nights": 90, "available_nights": 88, "sold_nights": 61, "occupancy_percent": 69.32,
        "room_revenue_booked": 335500.00, "room_revenue_collected": 280000.00, "adr_booked": 5500.00, "revpar_booked": 3812.50 }
    ],

    "by_booking_status": {                            // reservation lifecycle counts in range
      "confirmed_pending_arrival": 6, "checked_in": 4, "checked_out": 33,
      "cancelled": 3, "no_show": 2, "modified": 5
    },

    // ── Only when compare=previous_period ────────────────────────────────
    "previous": { "range": { "start_date": "2026-07-17", "end_date": "2026-08-15", "days": 30 }, "totals": { /* same keys as totals */ } }
  }
}
```

All money values: **decimal string or number with 2 dp, ex-GST, INR.** FE will not re-derive any ratio — `adr_*`, `revpar_*`, `trevpar`, `occupancy_percent`, `share_of_revenue_percent` must come from the server (R6).

---

## 4. Definitions the Backend Must Implement (single source of truth)

| Term | Definition | Notes / edge cases |
|---|---|---|
| **Night** | Business day `D` = stay-night from check-in date `D` to `D+1`. A booking `checkin=01`, `checkout=04` = nights 01, 02, 03. | Checkout day itself is **not** a night. Day-use (checkin = checkout) counts as **1 night** on `checkin` date — confirm Q-366-03. |
| **rooms_capacity** | Physical rooms configured for the property on that date. | Same as `dashboard-kpis physical.totals.capacity`. |
| **rooms_ooo** | Rooms with status `ooo` (out of order) on that night. HK / dirty rooms are **not** OOO. | Comes from room status history — needs per-night snapshot (see §6). |
| **rooms_available** | `capacity − ooo` | Denominator for occupancy and RevPAR. |
| **rooms_sold** | Occupied room-nights with `room_revenue_booked > 0`. | Excludes complimentary / house-use, OOO, cancelled, no-show. |
| **rooms_complimentary** | Occupied nights with room rate 0 (comp / house use). | Counted in `in_house`, **not** in `rooms_sold` (standard — inflating ADR denominator is wrong). |
| **room_revenue_booked** | Nightly room rate **ex-GST** for the room component only, attributed to the **night it was consumed**. Source priority: (1) per-night rate from rateplan on `aiosell_reservations` / order `room_info.room_price ÷ nights`; (2) after CR-362 modify/extend, use the **updated** price. | For OTA: `amount_after_tax` must be de-taxed using the GST slab actually applied (BUG-389 boundary rule: ≤7500 → 5%, >7500 → 18% — backend is the authority). Spread evenly per night unless per-night rates exist. |
| **room_revenue_collected** | Payments actually received that are tagged to the **room component**, attributed to the **collection date** (payment `created_at` business day), ex-GST. | Includes: advance at booking, advance at check-in, mid-stay deposits (CR-162), checkout settlement room portion. **Excludes** F&B/other portions of a combined settlement — split proportionally or by line if the payment is not itemised (state the rule you use in reply). OTA-prepaid (`pah=false`): count as collected on `booked_on` date at OTA gross ex-tax (commission handling → Q-366-05). Refunds: negative on refund date. |
| **fnb_revenue_posted** | Food/beverage order value (ex-GST) posted to a room folio (orders whose `table_id` is a room table / `room_info` present / CR-163 transferred items), attributed to order date. | Excluded from ADR/RevPAR. Used only for TRevPAR + display. |
| **other_revenue_posted** | Laundry (CR-381), extras, **no-show fees, cancellation fees**. | No-show/cancellation fee is revenue but the night is **not** a sold night. |
| **tax_collected** | GST on the room component actually collected. Informational. | — |
| **adr_booked** | `room_revenue_booked / rooms_sold`; `null` when `rooms_sold = 0` (not 0). | FE renders `—` for null. |
| **revpar_booked** | `room_revenue_booked / rooms_available`; `null` when `rooms_available = 0`. | — |
| **trevpar** | `(room_revenue_booked + fnb_revenue_posted + other_revenue_posted) / rooms_available` | — |
| **occupancy_percent** | `rooms_sold / rooms_available × 100`, 2 dp. | Complimentary excluded (confirm Q-366-04; some properties want them included as "physical occupancy" — if so return both `occupancy_percent` and `occupancy_percent_physical`). |
| **arrivals / departures / in_house** | Reservations with checkin = D / checkout = D / occupying night D. Same as `dashboard-kpis.today` semantics. | — |
| **no_shows** | Reservations with `checkin = D`, never checked in, marked no-show (CR-358-P5 mark-no-show) **or** auto-flagged at night audit. | Depends on BUG-385 resolution (Option A/B). |
| **cancellations** | Reservations cancelled on business day D (`cancelled_at`), regardless of stay dates. | CR-362 cancel endpoint. |
| **bookings_count** | Distinct reservations whose stay overlaps the range (not cancelled). Multi-room booking = 1 booking, N room-nights. | — |
| **avg_los_nights** | `Σ nights / bookings_count` | — |
| **avg_lead_time_days** | `avg(checkin − date(booked_on))` in days; WalkIn = 0. | — |
| **outstanding_balance** | For departed stays in range: `booked − collected` for room component. | Ties to CR-357 `remaining_room_balance` semantics — see Q-366-06. |

---

## 5. Payment-Mode / Booking-Status Classification (owner ask 2026-09-15)

Owner explicitly asked: *"re-evaluate all cases like advance booking from OTA, left check-in — so a payment type or some key should be there so we get this info."* Each reservation must carry **two** independent keys, and the aggregation groups by them.

### 5a. `payment_mode` (how the money arrives) — enum

| Value | Rule | Booked vs Collected behaviour |
|---|---|---|
| `ota_prepaid` | OTA channel (`channel ≠ Direct/WalkIn`) and `pah = false` — guest paid the OTA. | Collected = full ex-tax value on `booked_on` (or on OTA remittance date if you track it — Q-366-05). |
| `ota_pay_at_hotel` | OTA channel and `pah = true`. | Collected only as hotel takes payments (check-in advance, checkout). Risk bucket for no-shows. |
| `direct_prepaid` | Direct/website/phone booking, full amount paid before arrival. | Collected on payment date. |
| `direct_advance` | Direct booking with partial advance before or at check-in (`room_info.advance_payment > 0` and `< room_price`). | Collected = advance on its date + balance at checkout. |
| `walkin_postpaid` | WalkIn / Direct with **no** advance; settled at checkout (`payment_type: postpaid`). | Collected fully at checkout date. |
| `complimentary` | Room rate 0 / house use. | Booked = 0, Collected = 0, not in `rooms_sold`. |
| `credit_tab` | Settled to company/corporate tab (`tab_payment`) — receivable. | Booked yes; Collected **no** until tab is paid (`outstanding`). |

### 5b. `booking_status` (lifecycle) — enum

| Value | Rule | Revenue treatment |
|---|---|---|
| `confirmed_pending_arrival` | Future/today checkin, not yet checked in. | Forecast booked revenue; collected only if prepaid/advance. |
| `checked_in` | In house. | Nights consumed so far → booked; rest forecast. |
| `checked_out` | Departed normally. | Full booked + collected. |
| `early_checkout` | Departed before original checkout (CR-362 shorten). | Booked = consumed nights only; unconsumed nights **not** revenue unless a fee posted → `other_revenue_posted`. |
| `extended` | Checkout pushed later (CR-362 extend). | Extra nights at new rate. Flag `modified: true`. |
| `cancelled` | Cancelled before arrival. | Zero nights. Cancellation fee (if any) → `other_revenue_posted` on cancel date. OTA-prepaid refunds → negative `room_revenue_collected` on refund date. |
| `no_show` | Arrival date passed, never checked in ("left check-in"). | Zero nights sold. Fee/forfeited advance → `other_revenue_posted`. Counted in `no_show_count` and in `by_channel.no_shows`. |

### 5c. Also expose these on `local-reservations` rows (contract enhancement)

```
payment_mode          enum §5a
booking_status        enum §5b            (supersedes operational_status for reporting)
amount_before_tax     non-null            (currently null)
nightly_rate_ex_tax   decimal             (per room line)
collected_amount      decimal             (room component, ex-tax, to date)
outstanding_amount    decimal
no_show               bool                (BUG-385 Option B) + no_show_at
cancelled_at          datetime|null       (CR-362)
modified_at           datetime|null       (CR-362)
```
This lets the CR-364 Guest Folio and CR-363 Night Audit show the same numbers as the dashboard.

---

## 6. Implementation Suggestion (non-binding)

1. **Materialised table `pms_daily_revenue`** — one row per `(restaurant_id, date, room_code, channel, payment_mode)` with the §4 measures. Rebuilt by the night-audit job (23:59 business day) and incrementally updated on: check-in, check-out, room payment, room-order settle, cancel, no-show, extend/modify.
2. **Room status history table** (if not present) — needed for `rooms_ooo` per night; today's status is not enough for historical ranges.
3. `revenue-summary` = `GROUP BY` over that table + join to reservation counts. Any range is then O(days × room_types) — no 31-day ceiling needed.
4. Keep `dashboard-kpis` untouched for Front Desk today tiles (CR-358-P3). Optionally lift its 31-day limit (B-366-01) as a fallback, but FE will prefer `revenue-summary`.

---

## 7. F&B in RevPAR — why separate field (OD-366-02 explanation for owner)

- **Industry standard:** RevPAR = *rooms* revenue ÷ available rooms. It measures how well the property sells its rooms (price × occupancy). Adding restaurant revenue hides pricing problems (a hotel selling rooms cheap but with a busy restaurant would look healthy).
- **TRevPAR** (Total RevPAR) = (rooms + F&B + other) ÷ available rooms — measures total guest spend per room. Useful for MyGenie properties because the POS already captures F&B posted to rooms (CR-163 transfers, room-table orders).
- **Decision:** backend returns `room_revenue_*` and `fnb_revenue_posted` **separately**; RevPAR/ADR computed rooms-only; `trevpar` returned as an extra KPI. FE shows RevPAR as primary tile and TRevPAR as secondary. Zero extra cost to backend, no ambiguity, both views available. Owner can hide TRevPAR later without a contract change.
- What counts as F&B posted to room: orders whose `table_id` is a room table **or** items transferred into a room order (CR-163), **or** room-service orders billed to the folio. Outside-restaurant dine-in by the same guest paid separately is **not** F&B-to-room.

---

## 8. Questions for Backend (please answer inline)

| # | Question | Why it matters |
|---|---|---|
| Q-366-01 | Is a per-night rate stored per reservation line, or only `amount_after_tax` total? If total only, confirm even spread per night is acceptable. | ADR accuracy on multi-night / rate-change stays. |
| Q-366-02 | How is the room component separated from F&B in a combined checkout payment (`order-bill-payment`)? Is `room_gst_tax` / `room_price` itemised in the payment row? | `room_revenue_collected` correctness. |
| Q-366-03 | Day-use bookings (checkin = checkout): 1 night or 0? | Occupancy denominator/numerator. |
| Q-366-04 | Should complimentary rooms be in `occupancy_percent`? (We propose: no; expose `occupancy_percent_physical` if you want both.) | Owner may want physical occupancy for housekeeping planning. |
| Q-366-05 | OTA prepaid: is `amount_after_tax` gross (before commission)? Do you store commission / net remittance? Collected = gross or net? | Booked vs collected gap for OTA. |
| Q-366-06 | CR-357 OD-7: does `remaining_room_balance` include food? Answer here too so `outstanding_balance` uses the same rule. | Cross-CR consistency. |
| Q-366-07 | Room status history — do you keep per-day OOO/HK snapshots, or only current status? | `rooms_ooo` for historical dates. |
| Q-366-08 | Business-day cutoff for "collection date" — midnight or POS day-close time? | Aligns with `daily-sales-revenue-report`. |
| Q-366-09 | BUG-385: which option (A/B) are you implementing for `no_show`? This endpoint needs it. | `no_show_count`. |
| Q-366-10 | Max range you can serve at `group_by=day` within 2 s? If unbounded is not feasible, state the ceiling so FE auto-switches to `week`/`month`. | FE picker has no hard ceiling per owner. |

---

## 9. Frontend Usage (for context)

- Page `/pms/revenue` (CR-366). Picker: **Today · 7D · 30D pills + From/To custom** (no ceiling). One call → `revenue-summary` with `group_by` chosen by span. Optional `compare=previous_period` toggle (OD-366-06).
- `insightsCache` 15-min TTL, restaurant-keyed, logout-cleared (OG-FE-CACHE-002).
- **No client-side money math.** FE renders server ratios only. Export (Excel/PDF) reuses Insights export with the same numbers.
- Until this endpoint ships, CR-366 stays **BACKEND-BLOCKED** for the owner-approved scope (unbounded range + dual revenue basis + payment-mode split). A degraded v0 (occupancy-only, ≤31d chunked `dashboard-kpis`) is possible but **not** what owner approved.

---

## 10. Evidence

- `/app/memory/evidence/INV-PMS-CRs-363-364-366/probe_kpis_multiday.json` — `physical.days[]` shape, `channel: null`
- `/app/memory/evidence/INV-PMS-CRs-363-364-366/probe_reservations.json` — `pah`, `amount_before_tax: null`, `booked_on`, `rooms[]` line fields
- `/app/memory/evidence/INV-PMS-CRs-363-364-366/probe_single_order_v2.json` — `room_info {room_price, advance_payment, balance_payment}`
- `/app/memory/evidence/INV-PMS-ENH/probe_13_daily_sales.json` — `room_revenue` collection buckets
- `/app/memory/INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` — 68-day probe → 422 "Date range cannot exceed 31 days"
- Owner decisions 2026-09-15: OD-366-01 = **c** (both booked + collected, booked primary); OD-366-03 = **no ceiling, backend aggregation, 7D/30D pills + custom From/To**; payment-mode/lifecycle key required.

## 11. Frontend Workaround
- Available: **PARTIAL** — occupancy-only trend ≤31d chunks; revenue basis cannot be met client-side. Not recommended (R6).

---

## Status
- [ ] Backend acknowledged
- [ ] Q-366-01…10 answered
- [ ] Endpoint available on preprod → FE curl-probe (R11) → CR-366 Gate 2 Impact Analysis
