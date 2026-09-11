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

## Backend Dependency (optional — not blocking)

| # | Ask | Type |
|---|---|---|
| B-363-01 (optional) | `GET /aiosell/night-audit?date=` server aggregation returning sections A–F in one call (needed for properties > ~20 rooms to avoid N `get-single-order-new` calls) | NEW ENDPOINT (v2) |
| B-363-02 | Confirm semantic definitions of `room_revenue.Room Total` vs `Room Checkout` vs `Room advance` vs `room_checkin_revenue` in `daily-sales-revenue-report` | CLARIFICATION (R6) |
| B-363-03 | Confirm business-day boundary used by `daily-sales-revenue-report` (`from` 00:30Z→23:30Z observed) matches `restaurant.schedules` used by `businessDay.js` | CLARIFICATION |

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

## Gate status
- [x] Gate 0/1 — Intake
- [ ] Gate 2 — Impact Analysis (**can start now**; needs OD-363-01/02 answered)
- [ ] Gate 3 / 4

*Intake: 2026-09-04 | Intake agent | Code reality: NONE | Duplicate: DISTINCT | Blast radius: MEDIUM | Risk: HIGH | UNBLOCKED (FE-only)*
