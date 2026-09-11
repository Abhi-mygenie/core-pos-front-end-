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

## Backend Dependency (optional — not blocking)

| # | Ask | Type |
|---|---|---|
| B-366-01 (optional) | `dashboard-kpis`: lift 31-day limit or add `granularity=day` over 90d; populate `channel{}` block (bookings + revenue per channel) | CONTRACT ENHANCEMENT |
| B-366-02 (optional) | `GET /aiosell/revenue-summary?start_date&end_date` → per-day `{rooms_sold, rooms_available, room_revenue, adr, revpar, by_channel[]}` (server-side ADR/RevPAR = single source of truth for R6) | NEW ENDPOINT (v2) |
| B-366-03 | Confirm which daily-sales field(s) constitute "room revenue" for ADR (Room Total vs Room Checkout vs advance) | CLARIFICATION (shared with CR-363 B-363-02) |

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

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (**can start now**; OD-366-01 must be answered first — R6)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: NONE | Duplicate: DISTINCT (RELATED CR-363) | Blast radius: MEDIUM | Risk: MEDIUM | UNBLOCKED (FE-only)*
