# PMS Post-CR-358 Enhancements — Feasibility Investigation Report

**Role:** INVESTIGATION (AGENT_PROMPT_ALPHA v0.7 — no code written)
**Date:** 2026-09-04 (preprod server clock)
**Scope:** 7 enhancements selected by owner from `SESSION_HANDOVER_2026_09_04_CR358_P3QA_P4IMPL_REGRESSION.md`
**Environment probed:** `preprod.mygenie.online`, restaurant 69 (sandbox-pms), owner account (creds masked `***`)
**Evidence:** `/app/memory/evidence/INV-PMS-ENH/` (15 probe files, PII masked)
**Steps used:** 10/10 (6 curl-probe batches, 4 code traces)
**Registry note (R0):** None of these 7 items has a registered CR ID yet. This report is pre-intake input; each item must go through INTAKE before planning.

---

## 0. Executive Summary

| # | Enhancement | Feasibility | Backend support today | New backend needed? | Risk | FE effort (est.) |
|---|---|---|---|---|---|---|
| E1 | Room Assignment on Tape Chart | **PARTIAL** — full feature blocked | Assignment only happens *at check-in* (`user-group-check-in room_id[]`) or *at direct-booking creation* (`direct-reservation rooms[].restaurant_table_id`). No pre-arrival assign endpoint for OTA bookings. | **YES** — `assign-room` endpoint (1 new route) | MEDIUM (HIGH if it pushes inventory) | S: 1 file w/ workaround · M: 3 files w/ new API |
| E2 | Booking Modification / Cancellation | **BLOCKED** (except no-show) | Only `mark-no-show` exists (booking.com + gommt only, verified). No cancel / modify / extend-stay / change-room-for-pending endpoint. OTA modify/cancel arrive via inbound webhook only. | **YES** — 2–3 new routes (cancel, modify dates/room, extend stay for in-house) | **CRITICAL** (money + inventory + OTA contract) | L: 4–5 files |
| E3 | Night Audit Report | **FEASIBLE (FE-only composition)** | `daily-sales-revenue-report` (room revenue/advance/checkout/pay-mode) + `dashboard-kpis` (occupancy) + `local-reservations` (no-shows, outstanding) + `get-single-order-new` (balances) all exist. No dedicated endpoint. | NO for v1 · OPTIONAL `night-audit` aggregation for v2 | HIGH (report totals — R6) | M: 3 new files, 0 hotspot |
| E4 | Guest Folio Detail Page | **FEASIBLE (FE-only)** | `get-single-order-new` returns `room_info{room_price, advance_payment, balance_payment, receive_balance, payment_status}` + `orderDetails[]` + `associated_order_list[]` (F&B posted to room). `pos/room-payment` records mid-stay payments. Missing: payment *history* list. | NO for v1 · OPTIONAL `room-payment-history` | HIGH (money display, R6) — no logic change | M: 2–3 new files, reuse PmsCheckoutDrawer pattern |
| E5 | Housekeeping Workflow | **PARTIAL** | Status board + `PATCH room-status` (hk/ooo/available) + `auto_hk_on_rm_checkout` exist (P4). No HK task/checklist/assignment/time-tracking/notification model. FCM exists for *staff* push but no HK-role targeting. | **YES** for checklist/queue/time/push · NO for "HK-only board view" | MEDIUM | S: 1–2 files (HK view) · L: with backend tasks |
| E6 | Revenue Dashboard / Analytics | **FEASIBLE (FE-only, ≤31d per call)** | `dashboard-kpis` returns per-day per-room-type occupancy for ≤31 days; `channel` key returns `null` (no channel split). `local-reservations` carries `channel` + `amount_after_tax` → ADR/RevPAR/channel-split computable client-side. `daily-sales-revenue-report` per-day room revenue. | NO for 7d/30d · OPTIONAL for 90d server aggregation + channel split | MEDIUM (analytics, not billing) | M: 3 new files, reuse insightsCache |
| E7 | WhatsApp / SMS Guest Notifications | **BLOCKED** (backend messaging) | Only `razor-pay/payment-link` (Razorpay template, order-bound) exists. No generic guest-message endpoint; self-check-in token APIs explicitly declined by backend (OD-P3-08 "Omit"). | **YES** — templated notification endpoint + trigger hooks | HIGH (customer data, external provider cost) | S: `wa.me` manual-share fallback (0 backend) · L: full automation |

**Recommended order:** E4 → E3 → E6 (all FE-only, unblocked, reuse P3/P4 data layer) in parallel with backend briefs for E1, E2, E5, E7.

---

## 1. What Phases 1–4 Already Give Us (Reusable Inventory)

### 1.1 Service layer (`api/services/pmsService.js`, 312 L) — all reusable read-only
| Export | Returns | Reuse in |
|---|---|---|
| `getReservationOps()` | `{today, all[], arrivalsToday, arrivalsLate, inHouse, depOverdue, depDueToday, depCheckedOut, ...}` (60d back / 30d ahead) | E1, E2, E3, E4, E6 |
| `getTapeChartData()` / `buildTapeChart()` | rooms catalog + reservations + pure layout with `unassigned[]` | E1 |
| `getBookableRooms()` | `{id, tableNo, roomType, isOccupied}` (BUG-380) | E1 room picker |
| `getFrontDeskKpis()` | today occupancy/arrivals/departures/in-house | E3, E6 |
| `getRoomStatusBoard()` / `patchRoomStatus()` / `bulkMarkClean()` | 5-state board, PATCH hk/ooo/available | E5 |
| `pmsCheckIn()` | POST user-group-check-in JSON (booking_type + booking_id + room_id[]) | E1 (assign-at-check-in workaround) |
| `createDirectReservation()` | POST direct-reservation with `rooms[].restaurant_table_id` | E1 (direct bookings only) |
| `syncNow()` | fetch-reservations(import) + push-inventory | E1/E2 post-mutation inventory refresh |

### 1.2 Transforms
- `aiosellTransform.fromAPI.reservationOps` → `roomLines[{orderId, paymentStatus, lineStatus, restaurantTableId, tableNo, checkedInAt, checkedOutAt}]`, `pah`, `amount`, `channel`, `nights`
- `roomStatusTransform.fromRoomStatusBoard` → tiles with `displayStatus`, `manualStatus`, `guest`, `reservation`
- `orderTransform.fromAPI.order` → `roomInfo{roomPrice, advancePayment, balancePayment, receiveBalance, paymentStatus, balancePaymentMode, roomNo, checkInDate, checkOutDate}` (lines 391–405) — **the folio core already exists**

### 1.3 Components / pages
- `PmsCheckoutDrawer.jsx` — loads `get-single-order-new`, hosts `CollectPaymentPanel` (unchanged, R6). Folio page can reuse its fetch + unwrap (L89–101) verbatim.
- `RoomOrdersMockup.jsx` + `roomOrdersService.js` — single-call `order-logs-report` pre-scan producing RM parent + SRM associated orders + `room_info`. **Night-audit revenue rows and folio history can reuse `getRoomOrdersForRange`.**
- `ReservationsPage.jsx` L195 — `Assign Room` button disabled `title="Coming in Phase 5"`; popover already deep-links `/pms/check-in?booking_id=` (CheckInPage L67 reads it).
- `ChannelManagerPage.jsx` L466 — Tab 3 "Rates & Restrictions" Phase-5 placeholder (rates endpoints now verified live, see §2.8).
- `insightsCache.js` (`buildCacheKey`, `fetchOrReuse`) — restaurant-keyed cache, logout-cleared (OG-FE-CACHE-002) → reuse for E6.
- `paymentLinkService.sendPaymentLink()` + `WhatsAppPaymentModal.jsx` — only existing WhatsApp send path.

### 1.4 Verified backend contracts (this session, all HTTP 200)
`local-reservations` (15 rows: 8 pending / 1 in_house / 6 departed; channels Direct 8, booking.com 5, WalkIn 2), `room-status-board` (5 rooms), `dashboard-kpis` (29-day range OK, `channel: null`), `aiosell/rooms` (availability by room code), `get-room-list`, `get-single-order-new`, `daily-sales-revenue-report`, `fetch-rates` (live sandbox rates for 8 rateplans).

---

## 2. Per-Enhancement Findings

### E1 — Room Assignment on Tape Chart

**Current state**
- Tape chart shows 7 *unassigned* pending reservations (all `rooms[].restaurant_table_id = null`): 5 Direct/sandbox, 2 booking.com (`BDC7497606`, `BDC6263973`).
- Locked decision **Q5** (intake): "Room Type only — staff assigns specific room number at check-in". Today this is honoured: `CheckInPage` room dropdown → `user-group-check-in room_id[]` sets `restaurant_table_id` + creates order.
- Direct bookings *can* be pre-assigned at creation (`direct-reservation rooms[{restaurant_table_id}]`) — 1 pending row already has `r3` pre-assigned (`MG-69-24CCA187…`).

**Backend probe results (evidence `probe_07_discovery_routes.txt`)**
| Route tried | Result |
|---|---|
| `POST/GET aiosell/assign-room`, `reservation-assign-room`, `local-reservations/{id}/assign-room`, `local-reservations/{id}`, `reservations/{id}`, `reservation/{id}` | **404 — route does not exist** |

**Data-model inconsistency found (new finding → OPEN GAP candidate)**
`room-status-board` soft-allocates unassigned bookings to physical rooms by room type: r4 → `BDC7497606`, r5 → `BDC6263973`, r1 → `MG-69-8859D21E…` all show `display_status: booked` with `reservation.reservation_room_id` while `local-reservations` has `restaurant_table_id: null` for the same lines. Tape chart (truth = LR) shows them *Unassigned*; Status Board shows them *Booked on a specific room*. Any assign-room feature must define which is authoritative, else staff will see contradictory screens. Evidence: `probe_01` vs `probe_02`.

**Feasibility**
- **Workaround (0 backend, LOW risk, 1 file):** enable the button as *"Assign at Check-In"* → navigate `/pms/check-in?booking_id=…` (deep link already works). Satisfies "map OTA booking to physical room" only on arrival day. Consistent with Q5.
- **Full feature (pre-arrival assignment, block appears on the room row):** requires new backend route, e.g. `PATCH /aiosell/local-reservations/{reservation_id}/rooms/{room_line_id}` `{restaurant_table_id}` with validation: room type matches mapping, no date overlap with other assigned/in-house lines, 422 on conflict; optional `push_inventory` flag. Then FE: `pmsService.assignRoom()` + a picker (reuse `getBookableRooms` filtered by `roomType === res.roomCode`) + tape refetch. Also needs `user-group-check-in` to *respect* a pre-assigned table (prefill, already does via `restaurantTableId` in `fromPendingArrival`).

**Owner decisions needed:** OD-E1-01 revisit Q5 (assign-at-check-in vs pre-arrival)? OD-E1-02 board soft-allocation vs LR truth. OD-E1-03 should assignment push inventory (no — type-level inventory unchanged).

**Dependencies:** E5 (Drag & Drop room move — not in owner's selected 7 but referenced) depends on E1's endpoint; in-house room move can reuse existing `order-table-room-switch {order_id, old_table_id, new_table_id}` (exists, 405/403 probe) — unverified for RM tables (write-probe deferred to planning).

**Risk:** MEDIUM (reservation data, sockets none). CRITICAL if assignment triggers inventory/rate pushes.

---

### E2 — Booking Modification / Cancellation

**Backend probe results**
| Capability | Route | Result |
|---|---|---|
| Mark no-show | `POST aiosell/mark-no-show {booking_id | aiosell_reservation_id}` | **EXISTS** (405 on GET, 422 validation). Rule confirmed live: `"Mark no-show only supports booking.com and gommt. Got: direct"` (probe_15). |
| Cancel reservation (Direct/OTA) | `cancel-reservation`, `local-reservations/{id}/cancel`, `reservation/{id}/cancel`, `aiosell/cancel`, `reservations/cancel` | **404** |
| Modify dates / rooms | `modify-reservation`, `update-reservation`, `reservation-update`, `local-reservations/update` | **404** |
| Extend stay (in-house) | `pos/extend-stay`, `pos/room-extend`, `pos/update-room-checkin`, `pos/user-group-check-in-update`, `pos/room-checkout-date-update` | **404** |
| Change room (in-house) | `order/order-table-room-switch` | **EXISTS** (POS shift-table; RM support unverified) |
| Refund | `order/cancel-and-refund-order` (CR-165 Razorpay) | EXISTS — order-bound, online payments only |
| LR `view=cancelled` | — | 422 "selected view is invalid" → no cancelled bucket exposed; all 15 rows `status: confirmed` |

**Data observations**
- `local-reservations.status` currently only ever `confirmed`. OTA `action: modify|cancel` webhooks are documented (brief §1 expected `cancelled`, `modified`) but no sample exists in sandbox — FE cannot verify cancelled rendering.
- In-house stay dates live in two places: `aiosell_reservations.checkout` and `user_id_documents.checkout_date` (+ `orders.room_info`). An extend-stay must update both **and** re-price `room_info.room_price` → this is money logic (R6).

**Feasibility:** **BLOCKED on backend** for everything except no-show.
- **v1 (unblocked now):** "Mark No-Show" action on Arrivals/Late tab + tape popover, gated to `channel ∈ {booking.com, gommt}` (else hidden). Reuses `getReservationOps`. 2 files, MEDIUM risk. **Note:** this was already scoped as Phase-5 S8-D — should be registered as CR-358-P5 sub-item, not a new CR.
- **v2 (needs backend, 3 routes):** (a) `POST /aiosell/reservations/{id}/cancel {reason, notify_cm:bool}` → status cancelled, release soft-allocation, push inventory; (b) `PATCH /aiosell/reservations/{id} {checkin, checkout, rooms[]}` for pending; (c) `POST /pos/room-extend-stay {order_id, new_checkout_date, new_room_price?}` for in-house (updates user_id_documents + room_info + inventory). Backend must also state whether Direct-channel modifications are pushed to AIOSELL (intake §rate table says direct → YES).
- Refunds on cancel: cash/UPI refunds have no API; only Razorpay online refund exists → owner policy decision.

**Owner decisions:** OD-E2-01 cancellation refund policy; OD-E2-02 who may cancel OTA bookings locally (OTA is source of truth — local cancel may desync); OD-E2-03 extend-stay pricing rule (rate × extra nights from `fetch-rates`? manual?).

**Risk:** CRITICAL (money, inventory, OTA contract). Full gate flow + owner approval + E2E regression.

---

### E3 — Night Audit Report

**Data availability (all verified 200)**
| Night-audit line | Source | Field(s) | Evidence |
|---|---|---|---|
| Rooms sold / occupied / available (by type) | `dashboard-kpis?start_date=D&end_date=D` | `physical.days[0].room_types[].{capacity,available,occupied}`, `today.occupancy_percent_physical` | probe_03 |
| Arrivals / departures / in-house counts | same | `today.{arrivals_count,departures_count,in_house_count}` | probe_03 |
| Room revenue by pay mode, advances, checkout collections | `POST daily-sales-revenue-report {from}` | `paid_revenue_method.room_revenue{Room Cash/Card/UPI/Total/advance/Checkout}`, `room_checkin_revenue{…}`, `orderRoom`, `today_galla`, `total_today_settlement` | probe_13 (2026-09-03: Room Total 84,610.04 / advance 24,488.38 / checkout 36,822.28) |
| Outstanding balances (in-house) | `local-reservations` in_house + `get-single-order-new` per order | `rooms[].order_payment_status`, `room_info.balance_payment` | probe_01, probe_11 (order 1232218: balance 13,922.28 unpaid) |
| No-shows | `local-reservations` | `operational_status=pending && checkin < today` (= existing `arrivalsLate` bucket) | probe_01 |
| Expected vs actual checkouts | existing `depOverdue`, `depCheckedOut` buckets | — | pmsService L188–191 |
| Room-level order rows (audit trail) | `getRoomOrdersForRange(from,to)` | RM + SRM rows with `roomInfo` | roomOrdersService |

**Gaps**
- No server-side `night-audit` endpoint (404). Balances require N `get-single-order-new` calls (N = in-house rooms; ≤ room count — acceptable for small properties, 5 rooms in sandbox; flag for 50+ room hotels).
- `daily-sales-revenue-report` is business-day based (`from` 00:30→23:30 UTC) — must reuse `utils/businessDay.js` for consistency with Day Closure.
- "Room Total" vs "Room Checkout" vs "advance" semantics undefined in FE docs — **R6: "Total" means different things**; needs owner definition before KPI labels are frozen.
- Historic audits (past dates): `dashboard-kpis` supports any date; `daily-sales` supports `from`; LR uses date window → fully replayable.

**Feasibility:** FEASIBLE FE-only. New `NightAuditPage.jsx` + `pmsService.getNightAudit(date)` (parallel 3–4 calls) + `nightAuditTransform.js`. Export to PDF/Excel can reuse report export utilities used by `RoomOrdersMockup`. **0 hotspot files.**

**Owner decisions:** OD-E3-01 audit-day boundary (business day vs calendar); OD-E3-02 KPI definitions (Room Total / Checkout / advance); OD-E3-03 "close day" lock action? (no backend → display-only v1).

**Risk:** HIGH (report totals) — not CRITICAL because read-only, no settlement mutation.

---

### E4 — Guest Folio Detail Page

**Data availability**
- `POST get-single-order-new {order_id}` (probe_11) → `room_info {room_price 13922.28, advance_payment 0.00, balance_payment 13922.28}` (+ `receive_balance`, `payment_status`, `balance_payment_mode`, `room_no`, `checkin_date`, `checkout_date`, `name3` per orderTransform L391–405), `orderDetails[]` ("check in" line = room charge), `associated_order_list[]` (F&B orders transferred via `order-shifted-room`; empty for this guest), `user{}`, `restaurantTable{}`, `payment_status`, `payment_method`.
- Reservation context (channel, PAH, nights, meal plan, booking id, special requests) from `getReservationOps().all` by `roomLines[].orderId` join (same join BUG-378 uses).
- Mid-stay payments: `POST pos/room-payment {room_order_id, payment_amount, payment_mode}` exists (CR-162 `recordPartialPayment`). Effect visible as `receive_balance` / `advance_payment` deltas.
- Checkout: `PmsCheckoutDrawer` already usable from any page.

**Gaps**
- **No payment history endpoint** (`pos/room-payment-history`, `pos/room-payments` → 404). Folio v1 can show *totals* (room charge, F&B sum, advance/received, balance) but not a dated ledger of each payment. Backend ask: `GET /pos/room-payments?order_id=` or embed `payments[]` in `get-single-order-new`.
- Walk-in guests without AIOSELL row: reservation block renders "—" (OG-PMS-002 already open) — folio still works from order alone.
- Tax breakdown on room charge: `orderDetails[0].food_details.tax = 0` in sandbox; GST on lodging (12%/18% slabs) not modelled → **R6 do not compute tax in FE**; display backend fields only.
- Route: `/pms/folio/:orderId` — link targets already exist (tape popover "Folio" → currently `/reports/rooms`, In-House "View Bill" → `/reports/room-orders`, Departures). Re-pointing them touches 3 P3/P4 pages (non-hotspot).

**Feasibility:** FEASIBLE FE-only. `GuestFolioPage.jsx` + `pmsService.getGuestFolio(orderId)` (single-order + ops join) + `folioTransform.js`; embed `PmsCheckoutDrawer` for "Check Out" and a small "Record Payment" dialog reusing `recordPartialPayment`. Reuse `PmsCheckoutDrawer` L89–101 unwrap. **0 hotspot files** (CollectPaymentPanel not modified).

**Owner decisions:** OD-E4-01 folio v1 without per-payment history acceptable? OD-E4-02 folio print (reuse `printOrder(orderId,'bill')` — print semantics R6, no change) — yes/no.

**Risk:** HIGH (money display) — no calculation changes → not CRITICAL if FE only renders backend numbers.

---

### E5 — Housekeeping Workflow

**Exists (P4):** `room-status-board` (`manual_status hk/ooo`, `display_status`, `room_operational_status_at`, `auto_hk_on_rm_checkout=true`), `PATCH room-status/{id}` (422 if occupied, `inventory_push_warning`), bulk Mark All Clean, filter chips, Auto-HK pill. `get-room-list` also exposes `room_operational_status_by` (who changed it) — **not yet surfaced in FE** (roomStatusTransform ignores it).

**Missing backend (all 404):** `aiosell/housekeeping`, `hk-tasks` — no task/checklist/assignment/priority/time-tracking model; no employee list endpoint under probed names (needed for "assign to housekeeper"); no HK-role push channel (FCM exists for logged-in staff devices; targeting a housekeeper role requires backend topic/role fan-out).

**Open defect to resolve first:** OG-PMS-010 — auto-HK not firing / overridden by `booked` precedence on RM checkout (reproduced twice, still visible: r2 `manual_status: hk` but `display_status: occupied`). Any HK workflow built on top inherits this.

**Feasibility**
- **v1 (FE-only, LOW-MEDIUM):** "Housekeeping view" = `RoomStatusPage` filtered to hk/ooo, large-tile tablet layout, "dirty since" from `room_operational_status_at`, "changed by" from `room_operational_status_by` (needs transform +1 field), 30–60s polling. 1–2 files.
- **v2 (backend):** `hk_tasks` table + CRUD (`GET/POST /aiosell/hk-tasks`, `PATCH /hk-tasks/{id}` start/complete with checklist JSON), employee list API, push notification to HK role on `hk` transition. Socket event for board changes (brief B-10 analogue) to replace polling.

**Owner decisions:** OD-E5-01 v1 board-only view acceptable? OD-E5-02 HK checklist template content; OD-E5-03 does HK staff get separate login/role (permission key)?

**Risk:** MEDIUM (room status, sockets if added).

---

### E6 — Revenue Dashboard / Analytics

**Data availability**
| Metric | Source | Notes |
|---|---|---|
| Occupancy % trend (daily, by room type) | `dashboard-kpis?start_date&end_date` | ≤31 days per call (29-day probe OK); 90d = 3 sequential calls |
| Rooms available/occupied | same `physical.days[]` | |
| Room revenue per day | `daily-sales-revenue-report {from}` per day | 1 call/day → 30d = 30 calls (cacheable via insightsCache); or `order-logs-report` range single call via `getRoomOrdersForRange` (RM rows `amount` + `roomInfo`) |
| Booking value by channel | `local-reservations` `channel`, `amount_after_tax`, `checkin/checkout` | Client-side split: Direct / booking.com / WalkIn present in sandbox |
| ADR = room revenue ÷ rooms sold; RevPAR = room revenue ÷ rooms available | derived | Definition must be owner-frozen (revenue basis: booking `amount_after_tax` vs collected `room_revenue`) |
| Channel split from server | `dashboard-kpis` `channel` | **returns `null`** — passing `&channel=booking.com` accepted (200) but no channel block populated |
| Rates | `fetch-rates` | live, 8 rateplans — for rate-vs-realised comparison (v2) |

**Gaps:** no >31-day aggregation, no server channel split, no ADR/RevPAR fields. All computable client-side; performance acceptable for boutique properties (5–50 rooms); flag N-calls pattern for larger.

**Feasibility:** FEASIBLE FE-only. `RevenueDashboardPage.jsx` + `pmsService.getRevenueAnalytics(range)` + `revenueTransform.js`; reuse `insightsCache` and existing Insights chart components (`pages/reports-module/*`). **0 hotspot files.**

**Owner decisions:** OD-E6-01 revenue basis (booked vs collected); OD-E6-02 ranges (7/30/90); OD-E6-03 include F&B posted to rooms in RevPAR? (industry: no).

**Risk:** MEDIUM (analytics display; not billing).

---

### E7 — WhatsApp / SMS Notifications

**Exists:** `POST /api/v1/razor-pay/payment-link {order_id, payment_amount, customer_phone, customer_name, restaurant_name}` → backend creates Razorpay link + sends WhatsApp template `razoar_payment_with_url`. Requires an **existing order** (probe: 404 "No query results for model Order" without one). Usable only for "pay balance" messages to in-house guests, not for booking confirmations (pending bookings have no order).

**Missing (all 404):** `send-whatsapp`, `whatsapp/send`, `send-sms`, `notification/send`, `guest-notification`, `aiosell/send-notification`, `aiosell/notify-guest`. Self-check-in token endpoints (B-03/04/05) explicitly declined by backend (`ques3_reply` OD-P3-08 "Omit … Phase 2").

**Data availability for message content:** guest phone/email present on LR (`guest.phone`, masked in evidence; null for some sandbox rows), booking dates, room type, `amount_after_tax`, `pah` → templates in intake §9 are fully renderable client-side.

**Feasibility**
- **v1 (0 backend, LOW risk):** "Share via WhatsApp" button on Arrivals/Tape popover/Folio that opens `https://wa.me/<phone>?text=<encoded template>` — staff sends from their own device (same pattern as CreditCustomerList Phase-2B placeholder). No automation, no delivery tracking. Requires phone normalisation to E.164 (BUG-092 precedent: 10-digit + `91`).
- **v2 (backend):** `POST /aiosell/notifications {reservation_id, template: booking_confirmation|checkin_instructions|checkout_reminder, channel: whatsapp|sms}` + provider config + scheduler for reminders + delivery log. Provider cost/consent (DLT for Indian SMS, WhatsApp Business template approval) are owner/vendor decisions.

**Owner decisions:** OD-E7-01 manual share v1 acceptable? OD-E7-02 provider (existing Razorpay/WhatsApp vendor vs new); OD-E7-03 opt-in/consent capture at booking.

**Risk:** HIGH (customer data leaves system; provider cost) — v1 manual share is LOW.

---

## 3. Cross-Cutting Technical Dependencies & Blockers

| ID | Item | Affects | Type |
|---|---|---|---|
| X-01 | **Board soft-allocation vs LR `restaurant_table_id=null`** — two screens disagree on whether an OTA booking has a room | E1, E5, E3 | DATA_ISSUE — new open gap (recommend OG-PMS-013) |
| X-02 | OG-PMS-010 auto-HK not firing / `booked` precedence | E5, E3 (room status counts) | BACKEND_BUG (open) |
| X-03 | Sandbox has **no** `cancelled`/`modified`/`no_show` reservation samples | E2, E3 | DATA — request backend to seed via webhook `action=cancel` |
| X-04 | `get-single-order-new` N+1 for balances | E3, E4 | PERF — fine ≤ 20 rooms; backend `night-audit`/`balances` endpoint for scale |
| X-05 | `dashboard-kpis` ≤31-day window, `channel: null` | E6 | CONTRACT LIMIT |
| X-06 | Business-day boundary (`businessDay.js`) vs calendar dates in LR/KPIs | E3, E6 | DESIGN — must be owner-frozen |
| X-07 | No employee list API under probed paths (CR-133 G3b said "employee list API confirmed" — path not in constants) | E5 assignment | Needs path from backend/CR-354 artefacts |
| X-08 | `REACT_APP_CRM_API_KEYS` truncated | E7 if CRM guest profiles are used | CONFIG (owner) |
| X-09 | Gate 6 owner smoke for P3/P4 still pending | all (build on unsigned code) | PROCESS |
| X-10 | Registry: none of E1–E7 have IDs; mark-no-show + rates tab are already Phase-5 scope (CR-358-P5) | E1, E2 | R0 — INTAKE first |

---

## 4. Recommended Approach

### Track A — FE-only, start now (after Gate 6 sign-off of P3/P4)
1. **E4 Guest Folio** (CR-new, HIGH): `GuestFolioPage` + `getGuestFolio()`; re-point 3 existing links; embed `PmsCheckoutDrawer`; "Record Payment" via `recordPartialPayment`. Backend brief (non-blocking): `room-payment-history`.
2. **E3 Night Audit** (CR-new, HIGH): compose `dashboard-kpis` + `daily-sales-revenue-report` + `getReservationOps` + balances; freeze KPI definitions with owner first (R6).
3. **E6 Revenue Dashboard** (CR-new, MEDIUM): `dashboard-kpis` daily series + LR channel split + `getRoomOrdersForRange` revenue; insightsCache.

### Track B — Backend briefs to send now (parallel)
- **BACKEND_BRIEF_PMS-E1**: `PATCH /aiosell/local-reservations/{id}/rooms/{line}` assign + clarify board soft-allocation (X-01).
- **BACKEND_BRIEF_PMS-E2**: cancel / modify / extend-stay routes + seeded cancelled samples (X-03) + Direct-channel push policy.
- **BACKEND_BRIEF_PMS-E5**: `hk_tasks` CRUD + employee list path + HK push; fix OG-PMS-010 first.
- **BACKEND_BRIEF_PMS-E7**: templated guest notification endpoint + scheduler.
- **BACKEND_BRIEF_PMS-E4/E3 (optional)**: `room-payment-history`, `night-audit` aggregation.

### Track C — Quick wins inside existing Phase-5 scope (register under CR-358-P5, not new CRs)
- Mark No-Show action (booking.com/gommt only) — endpoint verified.
- Rates & Restrictions tab — all 4 endpoints verified live (422 validation shapes captured in `probe_08`).
- Enable "Assign Room" as *Assign at Check-In* deep link (E1 workaround) — 1 line, LOW.
- WhatsApp manual share (`wa.me`) — E7 v1, LOW.

### Sequencing
```
Gate 6 (P3+P4) ─► INTAKE E3/E4/E6 + CR-358-P5 quick wins ─► Planning ─► Impl ─► QA
                └► Backend briefs E1/E2/E5/E7 ─► (backend delivery) ─► INTAKE full E1/E2/E5/E7
```

---

## 5. Hypotheses Tested (investigation protocol)

| # | Hypothesis | Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Backend already has assign/cancel/modify reservation routes (undocumented) | 26 route probes GET+POST | ELIMINATED — all 404 except `mark-no-show`, 4 rate/restriction routes | probe_07, probe_14 |
| H2 | Night audit & folio can be composed from existing endpoints | code trace + 4 live calls | CONFIRMED | probe_03, 11, 13; orderTransform L391–405 |
| H3 | `dashboard-kpis` provides channel split & multi-month series | live call with `channel=` and 29-day window | PARTIAL — series yes (≤31d), channel `null` | probe_03 |
| H4 | Guest messaging endpoint exists beyond payment link | 7 route probes | ELIMINATED | probe_10 |
| H5 | Board and tape chart agree on assignment state | data diff | **ELIMINATED — inconsistency found (X-01)** | probe_01 vs probe_02 |

---

## 6. Retroactive / Registry Candidates
- Rates & Restrictions endpoints + `mark-no-show`: endpoints live, FE placeholder exists (`ChannelManagerPage` L466) → CR-358-P5 can start Gate 2 without backend wait.
- New open gap to file: **OG-PMS-013** (X-01 board soft-allocation vs LR).
- `room_operational_status_by` returned by `get-room-list` but dropped by transforms — low-value enrichment for E5 v1.

---

## 7. Evidence Artifacts (`/app/memory/evidence/INV-PMS-ENH/`)
`probe_01_local_reservations.json` · `probe_02_board.json` · `probe_03_kpis.json` · `probe_04_rooms.json` · `probe_05_status.json` · `probe_06_room_list.json` · `probe_07_discovery_routes.txt` · `probe_08_validation_shapes.txt` · `probe_09_fetch_rates.json` · `probe_10_pos_side_routes.txt` · `probe_11_single_order_inhouse.json` · `probe_12_lr_view_values.json` · `probe_13_daily_sales.json` · `probe_14_discovery_pos_side.txt` · `probe_15_mark_no_show_direct.json`
All phone/email fields masked `***`. No credentials stored.

---

**Handover:**
```
Investigation complete: PMS Enhancements E1–E7 feasibility
Classification: E3/E4/E6 FE_FEASIBLE · E1/E5 PARTIAL (backend for full) · E2/E7 BACKEND_BLOCKED
Confidence: HIGH (live-probed, code-traced)
Steps used: 10/10
Backend asks: 4 briefs (E1, E2, E5, E7) + 2 optional (E3, E4)
New gap: OG-PMS-013 (board soft-allocation vs LR unassigned)
Planning skip eligible: NO — every item needs INTAKE (R0) then Gate 2
Next: Owner decides Track A order → INTAKE role
```
