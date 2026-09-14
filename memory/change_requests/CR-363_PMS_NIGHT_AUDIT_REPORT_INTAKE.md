# CR-363 — INTAKE
## PMS — Night Audit Report (end-of-day room reconciliation)

**ID:** CR-363
**Date:** 2026-09-04
**Registered by:** Intake agent (ALPHA v0.7)
**Source:** AGENT-DISCOVERED (post-CR-358 enhancement list) — owner-selected 2026-09-04
**Related:** CR-358-P3 (`getReservationOps` buckets, `getFrontDeskKpis`), CR-011-ROOM (Room Orders report — `getRoomOrdersForRange`), CR-015/CR-016 (Settlement / Day Closure — `daily-sales-revenue-report` consumer), CR-364 (Guest Folio — per-guest balance drill), BUG-133 ("check in" marker exclusion rule in reports)
**Type:** CR (new report)
**Scope decision (owner 2026-09-04):** FULL feature

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → Reports (new page under Rooms & Reservations) |
| Priority | **P1** (owner-confirmed 2026-09-04) |
| Risk | **HIGH** — report totals (R6 "Total means different things"); read-only, no settlement mutation → not CRITICAL |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO |
| Duplicate check | **DISTINCT** — Day Closure / Settlement (CR-015/016) are F&B cash-drawer focused; Room Orders report (CR-011-ROOM) is per-order history. No occupancy + revenue + outstanding + no-show reconciliation exists |
| Code reality | **NONE** — 0 hits for night-audit/NightAudit |
| Blast radius | MEDIUM — 3 NEW files + App.js route + Sidebar entry (Sidebar frozen after P1 → SC ack needed). Hotspots: NO |
| Backend blocked | **NO** — composable from 4 existing endpoints (all live-verified 200) |

---

## Description

Hotel front desk needs a single end-of-day sheet for a chosen business date answering: how many rooms were sold, what revenue was collected (by mode), what is still owed by in-house guests, who did not arrive, who left, and what room status the property closes with.

### Expected behaviour
Page `/pms/night-audit` with date picker (default = current business day, `utils/businessDay.js`):

| Section | Content | Source (verified) |
|---|---|---|
| A. Occupancy | Rooms available / sold / occupancy %, by room type; arrivals / departures / in-house counts | `GET aiosell/dashboard-kpis?start_date=D&end_date=D` → `physical.days[0]`, `today{}` |
| B. Room revenue collected | Room Cash / Card / UPI / Total, Room advance, Room Checkout, check-in collections | `POST daily-sales-revenue-report {from: D}` → `paid_revenue_method.room_revenue`, `room_checkin_revenue`, `orderRoom` |
| C. Outstanding balances | per in-house room: guest, room, nights, `balance_payment`, payment status; total outstanding | `getReservationOps().inHouse` + `POST get-single-order-new {order_id}` (N ≤ rooms) → `room_info.balance_payment` |
| D. No-shows / late arrivals | pending with checkin < D | `bucketReservationOps().arrivalsLate` (+ `status=no_show` once CR-362/P5 lands) |
| E. Departures | checked out on D (with paid/unpaid), overdue still in-house | `depCheckedOut`, `depOverdue` |
| F. Room status close | counts of available / occupied / booked / hk / ooo | `getRoomStatusBoard()` |
| G. Order-level audit trail | RM parent orders + associated F&B (SRM) for D | `getRoomOrdersForRange(D, D)` |
| Export | PDF / Excel (reuse report export utils from `RoomOrdersMockup`) | FE |

### Current behaviour
No page. Staff piece it together from Front Desk KPIs + Day Closure + Room Orders report.

---

## Evidence

- Curl (all 200): `probe_03_kpis.json` (29-day range, `physical.days[]`), `probe_13_daily_sales.json` (2026-09-03: Room Total 84,610.04 · advance 24,488.38 · checkout 36,822.28 · today_galla 14,500), `probe_11_single_order_inhouse.json` (order 1232218 `balance_payment 13922.28`, `payment_status unpaid`), `probe_01_local_reservations.json` (1 in_house, 6 departed, 3 late-pending)
- `aiosell/night-audit` → **404** (no server aggregation; FE composition confirmed)
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E3
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED (data availability live-verified)

---

## Backend Dependency — RESOLVED 2026-09-14

| # | Ask | Status |
|---|---|---|
| B-363-01 | `GET aiosell/night-audit?date=` server aggregation | ✅ **SHIPPED 2026-09-14** — `AiosellController@nightAudit` + `PmsNightAuditService`. All sections A–I available. Shared `PmsRevenueMetricsService` with CR-366 (R6 confirmed). |
| B-363-02 | Confirm semantic definitions of `room_revenue.*` fields | ✅ **RESOLVED (Q-366-02 / Q-363-03)** — Room collected from `restaurant_room_payments`. Combined checkout: proportional allocation `room_price / (room_price + folio_fnb)`. |
| B-363-03 | Business-day boundary | ✅ **RESOLVED (Q-366-08)** — IST calendar date midnight→midnight. FE sends `date`, backend returns `business_day{}`. |

### BE reply answers — 2026-09-14

| Q | Answer |
|---|---|
| Q-363-01 / Q-366-13 | Same `PmsRevenueMetricsService` — R6 single source of truth ✅ |
| Q-363-02 / Q-366-12 | `reconciliation.settlement_room_share` from room payment ledger by `received_by` / date |
| Q-363-03 / Q-366-02 | Combined checkout: proportional `room_price / (room_price + folio_fnb)` |
| Q-363-04 | Night-audit **splits** `room_balance` vs `fnb_balance` even if `balance_payment` blends — resolves CR-357 OD-7 for folio view |
| Q-363-05 | No artificial history floor — earliest reservation/order data for restaurant |
| Q-363-06 / Q-366-07 | **LIMITATION:** No historical OOO snapshots — current board only. `room_status_close` has `status_as_of: "current"`. FE must label "as of now" for past dates |
| Q-363-07 | `audit_trail` from `order_lifecycle_logs` — available operations only (not all event types) |
| Q-363-08 | Keys as defined in curl response shape |

---

## Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-363-01 | Audit day boundary | a) Business day (`businessDay.js`, same as Day Closure) · b) Calendar day (same as LR/KPIs) |
| OD-363-02 | Revenue basis for "Rooms sold revenue" | a) Collected (daily-sales) · b) Booked value (`amount_after_tax` of stays covering D) · c) Both columns |
| OD-363-03 | Should the audit include F&B posted to rooms (SRM orders) in totals or list separately? | include / separate |
| OD-363-04 | "Close Day" lock action (prevents edits after audit)? No backend exists → display-only in v1 | display-only / needs backend |
| OD-363-05 | Sidebar placement: new child "Night Audit" under Rooms & Reservations (Sidebar frozen after P1 — requires SC ack) or a button on Front Desk? | sidebar / front-desk button |
| OD-363-06 | Historic replay depth (how many days back)? | 7 / 30 / 90 |

---

## Files (expected)

| File | Change |
|---|---|
| `pages/pms/NightAuditPage.jsx` (NEW) | page |
| `api/services/pmsService.js` | +`getNightAudit(date)` — Promise.all of 4 calls + N balances |
| `api/transforms/nightAuditTransform.js` (NEW) | pure section builders (unit-testable) |
| `App.js` | +1 route (SC ack) |
| `components/layout/Sidebar.jsx` | +1 child under `pms` (SC ack — Sidebar frozen post-P1) |

Files NOT touched: SettlementPanel.jsx, DayClosurePage.jsx, reportService.js (only called), CollectPaymentPanel.jsx.

---

## Blocker Update — 2026-09-11

| Blocker | Was | Now |
|---|---|---|
| **BUG-385** (`no_show` field) | BLOCKED — field absent from `dashboard-kpis` and `local-reservations` | ✅ **RESOLVED** — Backend shipped Option A (2026-09-10): `today.no_show_count` now in `GET aiosell/dashboard-kpis`. Also: `?status=no_show` filter on local-reservations for full row access. Section D data source confirmed. |

**Section D updated:** Use `today.no_show_count` from `dashboard-kpis` for the no-show count. For the list of no-show bookings: `GET local-reservations?status=no_show&start_date=D&end_date=D`.

**All backend data sources are now confirmed available.** No remaining backend blockers.

---

## Open Owner Decisions (MUST be answered before Gate 2 Impact Analysis can begin)

| OD | Question | Blocking Gate 2? |
|---|---|:---:|
| OD-363-01 | Audit day boundary: a) Business day (`businessDay.js`) · b) Calendar day | ✅ YES (R6 — data composition depends on this) |
| OD-363-02 | Revenue basis for "Rooms sold revenue": a) Collected · b) Booked value · c) Both columns | ✅ YES (R6 — ADR/RevPAR calculation) |
| OD-363-03 | Include F&B posted to rooms in totals, or list separately? | YES |
| OD-363-04 | "Close Day" lock action: display-only v1 or needs backend lock endpoint? | YES |
| OD-363-05 | Sidebar placement: "Night Audit" child under Rooms & Reservations, or button on Front Desk? | YES |
| OD-363-06 | Historic replay depth: 7d / 30d / 90d? | YES |

**Gate 2 cannot proceed until OD-363-01 through OD-363-06 are answered by owner.**

---

## Planning Session — 2026-09-16 (Conflict Pre-Check vs CR-366 + owner decisions)

### Correction — Day Closure DOES contain room cash
The Duplicate-check line above ("Day Closure is F&B cash-drawer focused") is **incomplete**. Code trace 2026-09-16: `PmsCheckoutDrawer.jsx` L138–160 posts room checkout via `POST order/order-bill-payment` with `waiterId = user.employeeId` — the same path as F&B bills. `waiter/get-settlement-report` (Day Closure) therefore includes room checkout collections in `today_collection`, **blended per cashier, no room/F&B split** (`settlementTransform.js` has no room revenue field; only `tips_by_mode.ROOM`). Night Audit remains DISTINCT (occupancy / outstanding / no-show / room-status have no equivalent) but **must reconcile** to Day Closure: Night Audit room cash+card+upi = room share of settlement report. Only backend can produce the split.

### Conflicts with CR-366 (recorded)
| # | Conflict | Resolution |
|---|---|---|
| C1 | Revenue definitions frozen in CR-366 brief §4; CR-363 v1 planned client-side composition from `daily-sales-revenue-report` → 1-day numbers would differ | Night Audit consumes `revenue-summary?start_date=D&end_date=D` + new `night-audit?date=D` built on the same code path (Q-363-01 / Q-366-13) |
| C2 | Day Closure blending (above) | Section H reconciliation + `settlement_room_share` (Q-363-02 / Q-366-12) |
| C3 | Shared files `pmsService.js`, `App.js`, `Sidebar.jsx` with CR-366 and CR-364 | Additive edits, parallel-safe; **one combined Sidebar SC ack** at Gate 3; second item to ship rebases |
| C4 | FE money math (363 v1) vs server math (366) | Server-side for both; "no client-side money math" |
| C5 | Registry `backend_blocked: false` | Flipped to **true** 2026-09-16 |

### Owner decisions — FROZEN 2026-09-16
| OD | Decision | Note |
|---|---|---|
| OD-363-01 | Follow backend business-day cutoff (Q-366-08); FE sends calendar `date`, backend returns `business_day{}` | Inherited from CR-366 |
| OD-363-02 | **c — Both.** Booked = **"Sales"** (room-nights sold regardless of payment: OTA prepaid, 50 % advance, pay-at-hotel), Collected = **"Revenue"** (money actually received) | Owner: "sales and revenue are two different things. Both need to be shown." Same as OD-366-01 |
| OD-363-03 | **separate** — F&B posted to rooms as its own line; TRevPAR extra | Same as OD-366-02 |
| OD-363-04 | **display-only** v1, no Close-Day lock ("a for this phase") | Lock/stamp = v2 |
| OD-363-05 | **sidebar** child under Rooms & Reservations ("a for now") | Same as OD-366-04; SC ack required |
| OD-363-06 | **unlimited** — "whatever backend provides" (Q-363-05) | — |

### Backend dependency — UPGRADED
B-363-01 promoted from optional to **REQUIRED**: `GET aiosell/night-audit?date=` (sections A–I incl. reconciliation). Brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR363_NIGHT_AUDIT_2026_09_16.md`. Listed on `frontend/public/backend-briefs.html`. Also depends on CR-366 `revenue-summary` (Q-366-11..13 added 2026-09-16).

**Status change:** UNBLOCKED → BACKEND-BLOCKED (owner approved 2026-09-16). → **BACKEND-UNBLOCKED 2026-09-14**: `aiosell/night-audit` + `aiosell/revenue-summary` both shipped (BE reply `sep_14_be_reply.md`). All Q-363-01..08 answered. Files (expected) unchanged. `pmsService.js` gains `getNightAudit(date)` = 2 calls (`night-audit` + optional `revenue-summary?start_date=D&end_date=D`). **Limitation:** `room_status_close` = current board only.

---

## Gate status
- [x] Gate 0/1 — Intake ✅ CLOSED
- [x] Owner decisions OD-363-01..06 frozen 2026-09-16
- [x] Backend: `night-audit` endpoint ✅ **SHIPPED 2026-09-14** + `revenue-summary` (CR-366) ✅ **SHIPPED 2026-09-14**
- [ ] **FE curl-probe on preprod (R11) — NEXT STEP** before Gate 2 can open
- [ ] Gate 2 — Joint CR-363/CR-366 Impact Analysis (unblocked — awaiting R11 probe)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Updated: 2026-09-16 — ODs frozen, Day Closure correction, BACKEND-BLOCKED | Updated: 2026-09-14 — `aiosell/night-audit` SHIPPED, all Q-363-01..08 answered, BACKEND-UNBLOCKED. Limitation: room_status_close current-only. Gate 2 unblocked pending R11 probe. | Code reality: NONE | Duplicate: DISTINCT (RELATED CR-366, reconciles to CR-015/016) | Blast radius: MEDIUM | Risk: HIGH | **UNBLOCKED — awaiting R11 curl-probe***
