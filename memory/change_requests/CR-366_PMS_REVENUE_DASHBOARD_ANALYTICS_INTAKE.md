# CR-366 — INTAKE
## PMS — Revenue Dashboard / Analytics (Occupancy %, ADR, RevPAR, channel split, trends)

**ID:** CR-366
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list) — owner-selected 2026-09-04
**Related:** CR-358-P3 (`dashboard-kpis` transform `fromDashboardKpis` — today-only subset; backend reply OD-P3-09 "7-day mini-bar does not need a new API"), CR-044/CR-045 (`insightsCache` — restaurant-keyed, logout-cleared), CR-011-ROOM (`getRoomOrdersForRange` room revenue rows), CR-363 (Night Audit — shares data sources), Insights report module (`pages/reports-module/*` chart components)
**Type:** CR (new report page)
**Scope decision (owner 2026-09-04):** FULL feature

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Reports / Insights (new `/pms/revenue` or under Insights) |
| Priority | **P2** (owner-confirmed 2026-09-04) |
| Risk | **MEDIUM** — analytics display; not billing; caching (localStorage/memory) → data-isolation rule OG-FE-CACHE-002 applies |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **DISTINCT** — Insights Dashboard/Sales are F&B order analytics; Room Orders report is per-order; no occupancy/ADR/RevPAR view exists. RELATED to CR-363 (shared sources, different purpose: trend vs daily reconciliation) |
| Code reality | **NONE** — 0 hits for RevPAR/ADR/occupancy trend; `fromDashboardKpis` maps only `today{}` + `days[0]` |
| Blast radius | MEDIUM — 3 NEW files + App.js route + Sidebar child. `aiosellTransform.js` +1 transform (additive). Hotspots: NO |
| Backend blocked | **NO** for 7d/30d; 90d = 3 sequential KPI calls (≤31-day limit); channel split computed client-side |

---

## Description

Owners/managers need hotel KPIs over time — not just today's tiles on Front Desk.

### Expected behaviour — `/pms/revenue`
| Widget | Definition (to be frozen — OD-366-01) | Source (verified) |
|---|---|---|
| Range picker | 7d / 30d / 90d + custom (≤ 90d) | FE |
| Occupancy % trend | daily `totals.occupied / capacity`; by room type stacked | `dashboard-kpis?start_date&end_date` → `physical.days[].room_types[]` (≤31 days per call → chunk) |
| Rooms sold / available | daily sums | same |
| Room revenue trend | daily room revenue | a) `daily-sales-revenue-report {from}` per day (N calls, cached) **or** b) single `getRoomOrdersForRange(from,to)` RM rows `amount`/`roomInfo.roomPrice` |
| ADR | room revenue ÷ rooms sold | derived |
| RevPAR | room revenue ÷ rooms available | derived |
| Channel split | bookings + booking value by `channel` (Direct / booking.com / WalkIn / …) | `local-reservations` (`channel`, `amount_after_tax`, stays overlapping range) — `dashboard-kpis.channel` is **null** server-side |
| Lead time / LOS | `booked_on`→`checkin` days; avg nights | `local-reservations` |
| Rate realised vs published (v2) | ADR vs `fetch-rates` for same dates | `POST aiosell/fetch-rates` (live, verified) |
| Export | Excel/PDF (reuse Insights export) | FE |

### Current behaviour
Front Desk shows today's 4 KPIs only.

---

## Evidence

- Curl: `probe_03_kpis.json` — 29-day range 200, `physical.days[]` per-day per-room-type `capacity/available/occupied/occupancy_percent`; `dashboard-kpis…&channel=booking.com` → 200 but `channel: null` (no server split); `probe_13_daily_sales.json` room revenue fields; `probe_09_fetch_rates.json` (8 rateplans live); `probe_01_local_reservations.json` (channels Direct 8 / booking.com 5 / WalkIn 2, `amount_after_tax`, `booked_on`)
- `aiosell/revenue`, `aiosell/analytics` → **404**
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E6
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED

---

## Backend Dependency — RESOLVED 2026-09-14

| # | Ask | Status |
|---|---|---|
| B-366-01 | Lift 31-day limit on `dashboard-kpis` or populate `channel{}` | ✅ **SUPERSEDED** — `revenue-summary` endpoint solves this entirely. `dashboard-kpis` unchanged by design. |
| B-366-02 | `GET /aiosell/revenue-summary` server-side aggregation | ✅ **SHIPPED 2026-09-14** — `AiosellController@revenueSummary` + `PmsRevenueMetricsService`. No range ceiling. |
| B-366-03 | Confirm which daily-sales fields = room revenue for ADR | ✅ **RESOLVED (Q-366-01/02)** — `restaurant_room_payments` table for collected; per-night `sell_rate` or even-spread for booked. |

### BE reply answers — 2026-09-14

| Q | Answer |
|---|---|
| Q-366-01 | Per-night `sell_rate` when present; else even spread of de-taxed stay total / nights |
| Q-366-02 | Room collected from `restaurant_room_payments`; combined checkout: proportional `room_price / (room_price + folio_fnb)` |
| Q-366-03 | Day-use (checkin=checkout) = **1 night** |
| Q-366-04 | `occupancy_percent` excludes comp; `occupancy_percent_physical` includes comp — both returned |
| Q-366-05 | OTA prepaid = gross ex-tax on `booked_on`; commission not stored |
| Q-366-06 | **Outstanding room balance = room component ONLY (excl F&B)** — answers CR-357 OD-7 |
| Q-366-07 | No historical OOO snapshots — current board only (**LIMITATION**) |
| Q-366-08 | Business day = IST calendar date midnight→midnight |
| Q-366-09 | BUG-385 Option A — `status=no_show`, count by checkin date |
| Q-366-10 | No hard range ceiling — live compute (long `group_by=day` spans cost CPU) |
| Q-366-11 | `room_revenue_collected_by_tender {cash,card,upi,tab,ota_remittance,other}`; booking classification key = `booking_payment_type` (NOT `payment_mode`) |
| Q-366-12 | `reconciliation.settlement_room_share` from room payment ledger |
| Q-366-13 | Same `PmsRevenueMetricsService` — R6 single source of truth ✅ |

**Compute note:** Live (no materialised cache). FE should auto-switch `group_by`: ≤92d→`day`, ≤366d→`week`, >366d→`month` to manage CPU cost.

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-366-01 | Revenue basis for ADR/RevPAR | a) Collected room revenue (daily-sales) · b) Booked value (`amount_after_tax` spread per night) · c) Room charge on orders (`roomInfo.roomPrice`) |
| OD-366-02 | Include F&B posted to rooms in RevPAR? (industry standard: no — rooms revenue only) | no / yes / separate TRevPAR |
| OD-366-03 | Range ceiling (90d = 3 KPI calls + up to 90 daily-sales calls if option a) | 30d / 90d / 365d (needs B-366-02) |
| OD-366-04 | Placement: under Rooms & Reservations or under Insights sidebar? | PMS / Insights |
| OD-366-05 | Cache TTL (insightsCache pattern) | 5 min / 15 min / session |
| OD-366-06 | Compare-to-previous-period deltas? | yes / no |

---

## Files (expected)

| File | Change |
|---|---|
| `pages/pms/RevenueDashboardPage.jsx` (NEW) | page + charts (reuse Insights chart components) |
| `api/services/pmsService.js` | +`getRevenueAnalytics({from,to})` — chunked KPI calls + LR + revenue source; `insightsCache` |
| `api/transforms/revenueTransform.js` (NEW) | pure series/ADR/RevPAR builders (unit-testable) |
| `api/transforms/aiosellTransform.js` | +`fromDashboardKpisRange` (additive; `fromDashboardKpis` untouched) |
| `App.js`, `Sidebar.jsx` | +route, +child (SC ack) |

Files NOT touched: Insights pages, reportService.js, roomOrdersService.js (only called), CollectPaymentPanel.jsx.

---

## Status Confirmation — 2026-09-11

**CR-366 was never backend-blocked.** Confirmed by investigation (2026-09-06) and reconfirmed 2026-09-11.

All required data sources are live and verified:
- `GET aiosell/dashboard-kpis?start_date&end_date` → `physical.days[]` (occupancy, rooms sold/available per day per room type) ✅
- `GET aiosell/local-reservations` → channel, `amount_after_tax`, `booked_on`, `checkin` for channel split + lead time ✅
- `POST daily-sales-revenue-report {from: D}` → room revenue fields per day ✅
- `POST aiosell/fetch-rates` → published rates for comparison ✅

**No backend changes needed for v1 scope.** Optional enhancements (B-366-01/02) can be added in v2.

---

## Open Owner Decisions (MUST be answered before Gate 2 Impact Analysis can begin)

| OD | Question | Blocking Gate 2? |
|---|---|:---:|
| OD-366-01 | Revenue basis for ADR/RevPAR: a) Collected room revenue (daily-sales) · b) Booked value (`amount_after_tax`) · c) Room charge (`roomInfo.roomPrice`) | ✅ YES — R6, mandatory before any revenue formula is written |
| OD-366-02 | Include F&B posted to rooms in RevPAR? (industry standard: no — rooms only) | YES |
| OD-366-03 | Range ceiling: 30d / 90d / 365d? (affects N of API calls or B-366-02 need) | YES |
| OD-366-04 | Placement: under Rooms & Reservations sidebar, or under Insights? | YES |
| OD-366-05 | Cache TTL (insightsCache pattern): 5 min / 15 min / session? | NO (can default to 15 min, owner overrides) |
| OD-366-06 | Compare-to-previous-period deltas? | NO (can default to off for v1) |

**Gate 2 cannot proceed until OD-366-01 through OD-366-04 are answered by owner.** OD-366-05 and OD-366-06 can be defaulted if owner wants to move fast.

---

## Owner Decisions — 2026-09-15 (Planning session)

| OD | Decision | Effect |
|---|---|---|
| OD-366-01 | **c** — backend returns BOTH `room_revenue_booked` (primary) and `room_revenue_collected` per bucket. Plus mandatory `payment_mode` + `booking_status` keys per reservation (OTA prepaid / pay-at-hotel / advance / walk-in / no-show "left check-in" / cancelled). | Server-side formulas only (R6). |
| OD-366-02 | F&B posted to rooms **excluded** from ADR/RevPAR, returned separately as `fnb_revenue_posted`; `trevpar` returned as extra KPI. | RevPAR rooms-only (industry standard), TRevPAR optional tile. |
| OD-366-03 | **No range ceiling.** From/To custom + Today/7D/30D pills (same as other reports). Requires backend aggregation — `dashboard-kpis` 31-day limit and single-day daily-sales are not acceptable. | B-366-02 promoted from optional to **REQUIRED**. |
| OD-366-04 | Open (placement PMS vs Insights). | Not blocking backend. |

**Backend brief filed:** `/app/memory/backend_briefs/BACKEND_BRIEF_CR366_REVENUE_AGGREGATION_2026_09_15.md` (`GET aiosell/revenue-summary`, Q-366-01…10). Listed on `frontend/public/backend-briefs.html`.

**Status change:** UNBLOCKED → BACKEND-BLOCKED for owner-approved scope. Gate 2 starts once the endpoint is probe-able on preprod (R11). → **BACKEND-UNBLOCKED 2026-09-14**: `aiosell/revenue-summary` shipped (BE reply `sep_14_be_reply.md`). All Q-366-01..13 answered. No range ceiling confirmed. `booking_payment_type` key (not `payment_mode`). Live compute — no cache. Gate 2 ready after R11 curl-probe.

---

## Gate status
- [x] Gate 0/1 — Intake ✅ CLOSED
- [x] Owner decisions OD-366-01/02/03 frozen 2026-09-15 · OD-366-04 open (placement — not blocking backend)
- [x] Backend: `revenue-summary` endpoint ✅ **SHIPPED 2026-09-14** — all Q-366-01..13 answered
- [ ] **FE curl-probe on preprod (R11) — NEXT STEP** before Gate 2
- [ ] Gate 2 — Joint Impact Analysis with CR-363 (unblocked — awaiting R11 probe)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Confirmed unblocked: 2026-09-11 | Code reality: NONE | Duplicate: DISTINCT (RELATED CR-363) | Blast radius: MEDIUM | Risk: MEDIUM | Updated: 2026-09-14 — `aiosell/revenue-summary` SHIPPED, all Q-366-01..13 answered, BACKEND-UNBLOCKED. Limitation: live compute (no cache), room_status current-only, no OTA commission. OD-366-04 placement still open (non-blocking). Gate 2 unblocked pending R11 probe.*
