> **SUPERSEDED 2026-09-19 — tracked in `BACKEND_BRIEF_CR-385_MASTER.md`. Kept as history; do not update.**

# BACKEND_BRIEF_CR-385_2026-09-17

## Summary
- Issue: PMS Front Desk is being rebuilt as a single-screen workstation (`/pms/front-desk-v2`, beta). Frontend needs (1) confirmation of **PMS real-time events** and (2) **aggregation endpoints** to remove N+1 call patterns. One **data-quality defect** found during probing is included.
- Classification: **CONTRACT_MISMATCH** (BQ-385-01 sockets) · **FEATURE_ASK** (BQ-385-02 aggregation, Phase 2) · **DATA_ISSUE** (BQ-385-03 `balance_payment`)
- Frontend impact: without (1) the screen relies on refresh-on-focus / manual refresh / after-action refresh — owner's "never lose data (OTA bookings via webhook)" goal is not met. Without (2) In-House and Departures each fire **1 folio call per guest**; Mark All Clean fires **1 PATCH per room**.
- Priority/Risk: BQ-385-01 **P1 / HIGH** (answer needed before Gate 3) · BQ-385-02 **P2 / MEDIUM** (Phase 2, after Phase 1 ships) · BQ-385-03 **P2 / HIGH** (money display)
- Account used for probes: alias `goankitchen_owner_rid69` (RID 69, hotel_code `sandbox-pms`). Token masked `***`.

---

## BQ-385-01 — Do PMS changes reach the frontend via Socket.io? (ANSWER NEEDED)

### Endpoint / channel
- Socket server: `REACT_APP_SOCKET_URL` (presocket). Channels the FE subscribes to today (`src/api/socket/socketEvents.js`): `new_order_<rid>`, `update_table_<rid>`, `aggregator_order_<rid>`, `order-engage_<rid>`, `food_update_<rid>`.
- **No PMS channel exists on the FE.** Owner statement: *"we have a webhook… ideally everything is on webhook/sockets so we don't lose data; if not, highlight."*

### Questions
| # | Question | Why |
|---|---|---|
| Q1 | Does the backend emit **any** socket event when a reservation is created/updated via the **AIOSELL webhook** (new OTA booking, modification, cancellation)? Channel name + payload shape? | New OTA bookings must appear on Arrivals without a manual refresh |
| Q2 | Events on **local-checkin** (`aiosell/local-checkin`), **check-out** (`order-bill-payment` for room orders), **room-status PATCH**, **extend-stay / modify / cancel**? | Two front-desk terminals must stay in sync |
| Q3 | If none exist: can the backend emit a single **`pms_update_<rid>`** channel with `{ type: 'reservation'|'room_status'|'checkin'|'checkout'|'payment', booking_id?, restaurant_table_id?, order_id?, at }`? FE would simply re-fetch the affected slice on receipt (no payload-driven state). | Cheapest contract; FE never trusts payload for money |
| Q4 | Does `update_table_<rid>` already fire for **room** tables on check-in/check-out (rooms are `restaurant_tables` rows)? If yes, FE can piggy-back for room state. | Might be a zero-cost partial answer |

### Frontend Workaround
- Available: **YES (provisional, owner-approved Q10 option a)** — refresh on `visibilitychange`, header Refresh button, refetch after every action. Owner wants this revisited when Q1–Q4 are answered.

---

## BQ-385-02 — Aggregation endpoints (Phase 2 — after Phase 1 ships)

| # | Where FE calls today | Calls | Ask |
|---|---|---|---|
| A1 | Workstation mount | 4 parallel: `GET aiosell/local-reservations?start_date=T-60&end_date=T+30`, `GET aiosell/dashboard-kpis`, `GET aiosell/room-status-board`, `GET aiosell/status` | `GET aiosell/front-desk-snapshot` returning all four blocks (or keep 4 — low priority, they are parallel) |
| A2 | In-House list + Departures list (true balance) | `POST get-single-order-new` **× N guests** | Authoritative **`balance_due`** per room line on `local-reservations` (see BQ-385-03) — removes N calls on two panels |
| A3 | Mark All Clean | `PATCH aiosell/room-status/{id}` **× N rooms, sequential** | `PATCH aiosell/room-status/bulk` `{ ids:[], status:'available' }` → per-id result + `inventory_push_warning` |
| A4 | HK state of an occupied room on In-House rows | client-side join board ↔ reservations by `table_no` | `room_display_status` + `manual_status` on each `rooms[]` line of `local-reservations` |
| A5 | Cancelled bookings | `GET local-reservations?…status=cancelled` (separate call) | Confirm whether the main window call already returns `operational_status='cancelled'` rows (probe had 0 cancelled in 46 → undetermined) |

### Frontend Workaround
- Available: YES — all Phase 1 panels work with today's endpoints (client-side buckets, parallel folio calls, sequential PATCH). Phase 2 is performance/cleanliness only.

---

## BQ-385-03 — `balance_payment` on `local-reservations` is inconsistent (DATA_ISSUE)

### Endpoint
- Method: GET
- URL: `/api/v2/vendoremployee/aiosell/local-reservations?start_date=2026-07-19&end_date=2026-10-17`
- Auth/context: Bearer `***` · RID 69

### Reproduction
1. Login as `goankitchen_owner_rid69`.
2. GET the URL above → filter `operational_status = in_house`.
3. For each `rooms[].order_id` call `POST /api/v2/vendoremployee/get-single-order-new {order_id}` and compute `room_price + gst_tax − advance_payment − receive_balance`.

### Payload / Response
- Actual response path: `/app/memory/evidence/CR-385/CR-385_local_reservations.json` (phone/email redacted)
- Comparison: `/app/memory/evidence/CR-385/CR-385_balance_compare.json`

| order_id | LR `amount_after_tax` | LR `advance_payment` | LR `balance_payment` | folio room_price + gst − advance − received | F&B orders posted |
|---|---:|---:|---:|---:|---:|
| 1232408 | 1000 | 100 | **950** | 950 | 3 (not in LR figure) |
| 1232470 | 1000 | 100 | **900** ⚠ | 950 | 1 |
| 1232479 | 1000 | 100 | **950** | 950 | 1 |

- Expected: `balance_payment` = room charge + room GST + posted F&B/room orders − advance − all payments (i.e. the amount the guest owes now), consistent across identical inputs.
- Actual: differs by ₹50 between identical folios; excludes F&B/room orders entirely.

### Frontend Workaround
- Available: YES — FE ignores `balance_payment` and computes from the folio (N calls, BQ-385-02 A2). Ask: make `balance_payment` authoritative (or add `balance_due`) so FE can drop the folio calls.

---

## Dependency reminder — CR-364-PRINT (Print Folio)
The new Folio + Checkout screen (OD-385-15) shows a **Print Folio** button, disabled until `BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` questions Q-364P-01/08/09/10/13/15 are answered. Owner expects this button to work on the new screen — please prioritise alongside BQ-385-01.

---

## Evidence
- Probes 2026-09-17 (all HTTP 200): `evidence/CR-385/CR-385_{local_reservations,dashboard_kpis,room_status_board,aiosell_status}.json`
- New fields seen and **not yet read by FE** (FYI, no ask): `dashboard-kpis.today.no_show_count`, `room-status-board.rooms[].hk_assignee`, `local-reservations.rooms[].user_id_document_id`.
