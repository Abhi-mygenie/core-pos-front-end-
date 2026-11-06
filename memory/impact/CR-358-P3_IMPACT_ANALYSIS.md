# CR-358-P3 — Gate 2: Impact Analysis
## PMS Phase 3 — Reservation Operations: Front Desk (S1) + Arrivals (S9) + Departures (S10)

**Doc:** `memory/impact/CR-358-P3_IMPACT_ANALYSIS.md`
**Date:** 2026-09-03
**Planning Agent Role:** Gate 2 — Impact Analysis ONLY (owner instruction: "planning role for impact analysis of phase 3"). No Implementation Plan written.
**Sprint:** pos_pms_1
**Risk:** **HIGH** (2026-09-03 — OD-P3-01 = (d): in-page checkout slider renders financial `CollectPaymentPanel` from new host; DashboardPage NOT touched)
**Parent:** CR-358 (phased plan `plans/CR-358_EXECUTION_PLAN_PHASED.md`, owner-approved 2026-09-01)
**Predecessors:** CR-358-P1 (Gate 5b PASS), CR-358-P2 (Gate 5b PASS, 13/13). Both awaiting Gate 6 owner smoke — P3 does not depend on their smoke verdict for planning, but Gate 4 GO for P3 should follow P2 smoke to avoid stacking three unsmoked phases.

---

## Code Reality: NONE

```bash
find /app/frontend/src -name "FrontDeskPage*" -o -name "ArrivalsPage*" -o -name "DeparturesPage*"  → 0 results
grep -rn "CR-358-P3" /app/frontend/src                                                             → 0 results
grep -n "front-desk\|arrivals\|departures" App.js  → lines 256-258 mount PmsPlaceholderPage title=… phase={3}
grep -n "DASHBOARD_KPIS\|LOCAL_RESERVATIONS" constants.js → both constants exist (lines 583-584), DASHBOARD_KPIS unused anywhere
```

**Partial foundations already shipped (reused, NOT re-planned):**
- `aiosellService.getLocalReservations({startDate,endDate})` — BUG-378 (no `view` param support; client-side filtering by design, see A-03 of P2 plan)
- `aiosellTransform.fromAPI.pendingArrival(res)` — CR-358-P2. Maps one local-reservation to a UI model (guest, channel, bookingType, room, mealPlan, occupancy, amount, operationalStatus, specialRequests). **Already covers ~90% of S1/S9 row needs.**
- `pmsService.getPmsReservations({startDate,endDate})` — CR-358-P2. Returns `{arrivals (pending), inHouse}`. Has no `departures` bucket and no date-scoped "today" filter.
- Sidebar entries + routes for `/pms/front-desk`, `/pms/arrivals`, `/pms/departures` — CR-358-P1 (frozen). Routes mount placeholders → **route re-point in App.js required (3 element swaps), same SC-01 pattern as P2.** Declared up-front this time (OG-PMS-006 lesson).

---

## Conflict Pre-Check

| File | Last modifier | Date | Conflict? |
|---|---|---|---|
| `api/services/pmsService.js` | CR-358-P2 | 2026-09-03 | ✅ NONE — P2 at Gate 5b, no open bug-fix on this file. Additive extension only. |
| `api/transforms/aiosellTransform.js` | CR-358-P2 | 2026-09-03 | ✅ NONE — additive only. |
| `api/services/aiosellService.js` | BUG-378 | 2026-09-03 | ✅ NONE — optional additive `view` param (see §Affected). |
| `App.js` | CR-358-P2 (SC-01) | 2026-09-03 | ⚠ FROZEN-BY-POLICY but 3-line element re-point required. Owner ack needed at Gate 4 (same as P2 SC-01). |
| `components/layout/Sidebar.jsx` | CR-358-P1 | 2026-09-02 | ✅ FROZEN — zero changes. Entries exist (lines 236-238). |
| `pages/pms/InHouseGuestsPage.jsx` | CR-360 | 2026-09-03 | ✅ NOT TOUCHED. CR-360 at Gate 5b. |
| `pages/pms/CheckInPage.jsx` | CR-358-P2 | 2026-09-03 | ✅ NOT TOUCHED. S1/S9 "Check In" buttons deep-link to `/pms/check-in?booking_id=…` (entry path already implemented in P2). |
| `pages/DashboardPage.jsx` | hotspot (R5) | — | ⚠ CONDITIONAL — only if OD-P3-01 = A. Default recommendation avoids it. |
| `components/order-entry/CollectPaymentPanel.jsx` | hotspot (R5/R6) | — | ✅ WILL NOT TOUCH under any OD-P3-01 option. |
| Related open item CR-357 (Room Advance Full-Bill Deduction, INTAKE) | — | 2026-09-02 | RELATED, not conflicting — touches checkout maths, P3 only links to checkout. Flag for P5 regression. |

**No blocking conflicts. One policy exception (App.js re-point) declared for Gate 4 ack.**

---

## Risk Classification

**Risk: MEDIUM**

Triggers present:
- New component state, filters/tabs, client-side pagination, navigation (MEDIUM tier)
- Reads customer data (guest name/phone) — display only, already displayed by P2 CheckInPage (same tier as P2 which was downgraded to MEDIUM at implementation)

Not HIGH/CRITICAL because:
- **Zero write endpoints in P3.** S1/S9/S10 are read-only list screens. Every action button navigates to an existing screen (`/pms/check-in`, `/pms/new-booking`, checkout target per OD-P3-01). No money, no settlement, no order mutation.
- No API contract change; `local-reservations` shape frozen from 2026-09-03 probes.

**Upgrade condition:** If owner picks OD-P3-01 option A (DashboardPage deep-link) → Risk becomes **HIGH** (hotspot file R5 + explicit regression checklist on Dashboard room cards).

---

## Owner Decisions Required (Gate 2 exit — R3: do not guess)

| # | Question | Options | Agent recommendation |
|---|---|---|---|
| **OD-P3-01** | **S10 Departures "Check Out" target.** No deep-link into `OrderEntry`/`CollectPaymentPanel` exists today — `DashboardPage.jsx` never reads `location.state`/`search` (verified grep: only `useLocation()` declared, never consumed). | **A)** Add ~10-line `location.state.openRoomTableId` handler in `DashboardPage.jsx` → auto-opens OrderEntry → Collect Bill for that room. Hotspot touch, Risk→HIGH. **B)** Navigate to `/reports/room-orders` (same as CR-360 View Bill) — staff completes checkout from the existing room-orders flow. Zero hotspot touch. **C)** Navigate to `/dashboard` with `?channel=room` and a toast "Select room N to check out". | **B for P3** (consistent with CR-360, keeps P3 read-only). Register option A as a separate P5/CR-361 "one-click checkout" enhancement once Dashboard regression budget exists. |
| **OD-P3-02** | **"Today" semantics for Arrivals/Departures.** Probe evidence (`probe_11_view_arrivals.json`): `view=arrivals` returns ALL `pending` reservations regardless of `checkin` (09-03, 09-07, 09-10). Backend does not filter to today. | **A)** Client-side: S9 default tab = "Today" (`checkin === today`), plus "Upcoming" tab (checkin > today) and "Late" (checkin < today && pending). **B)** Ask backend to add `checkin_date=` filter first. | **A** — no backend wait; matches mockup tabs (All / Pending / Checked In / Late). |
| **OD-P3-03** | **Prepaid vs Pay-At-Hotel badge.** Mockups show "Prepaid" / "PAY AT HOTEL" on S1/S9 Balance column; original IA mapped this to webhook `pah`. **`pah` is NOT present in `local-reservations` response** (verified: no `pah` key in any probe). | **A)** Omit badge; show `amount_after_tax` as "Balance" only. **B)** Derive: `channel === 'Direct'` → nothing; OTA with `amount_after_tax` → show amount. **C)** BACKEND_BRIEF asking to expose `pah` in local-reservations. | **A now + C filed as non-blocking backend ask** (badge appears when field lands; transform guards `pah ?? null`). |
| **OD-P3-04** | **Departures data source.** `view=departures` never probed (only `arrivals`, `all`, `in_house` behaviour known — `in_house` view is date-filtered and unreliable per BUG-378 note). Departures = `operational_status === 'in_house' && checkout <= today` (overdue when `< today`). | **A)** Client-side from the no-`view` fetch (window today-60…today+7) — consistent with BUG-378 pattern. **B)** Probe `view=departures` at Gate 3 and use if correct. | **A** (deterministic, one call feeds S1 KPIs + S9 + S10). Probe B at Gate 3 as informational only. |
| **OD-P3-05** | **S1 KPI strip while `dashboard-kpis` is 404 (MISSING-01).** NS-02 said "wait for backend". | **A)** Derive Occupancy/Arrivals/Departures/In-House client-side from the same reservations fetch + `GET /aiosell/rooms` (total local rooms) — real numbers day one. **B)** Render "—" skeleton until backend ships endpoint, then swap. | **A with adapter**: `pmsService.getFrontDeskKpis()` computes locally now; when `DASHBOARD_KPIS` returns 200 the function prefers server values. Zero UI change later. Requires owner to relax NS-02. |
| **OD-P3-06** | **Front Desk "Channel Sync" side panel** (mockup shows AIOSELL/Booking.com/Expedia last-sync times + "Available tonight 6/20"). Only `GET /aiosell/status.last_sync_at` exists; per-OTA sync times do not. | **A)** Show single AIOSELL `last_sync_at` + "Sync Now" (reuse P1 `fetchReservations`). **B)** Drop panel from S1 MVP. | **A** — cheap, reuses P1 code. |
| **OD-P3-07** | **Pagination** — mockups show server pages ("Page 1 of 4"); API returns a flat array with no meta. | **A)** Client-side pagination, 20 rows/page. | **A** (only option without backend work). |
| **OD-P3-08** | **"Send link" (self check-in) buttons in S1/S9 mockups.** S5 Self Check-In is out of CR-358 scope (GAP-06/OD-05 blocked). | **A)** Omit button. **B)** Render disabled with tooltip "Coming soon". | **A** — avoid dead UI. |

**Gate 2 cannot close until OD-P3-01..08 are answered (or owner accepts all recommendations).** Design review (Gate 2.5) follows: mockups `frontend/public/pms/front-desk.html`, `arrivals.html`, `departures.html` exist from design freeze 2026-08-31 — owner to confirm they remain the UX contract, or request a v2 mockup like P2 did.

---

## Data Flow Traces

### Single shared fetch (all three screens)
```
Page mount
  └─ pmsService.getReservationOps({ today })          ← NEW (extends getPmsReservations pattern)
       └─ aiosellService.getLocalReservations({ startDate: today-60, endDate: today+7 })   [EXISTING]
            → GET /api/v2/vendoremployee/aiosell/local-reservations?start_date&end_date
            → { status, message, data: { reservations: [ …shape frozen below… ] } }
       └─ list.map(aiosellTransform.fromAPI.reservationOps)   ← NEW superset of pendingArrival
       └─ buckets:
            arrivalsToday  = pending   && checkin === today
            arrivalsLate   = pending   && checkin <  today
            arrivalsFuture = pending   && checkin >  today
            checkedInToday = in_house  && rooms[].checked_in_at startsWith today
            departuresDue  = in_house  && checkout === today
            departuresLate = in_house  && checkout <  today
            departedToday  = checked_out && rooms[].checked_out_at startsWith today
```

### S1 Front Desk (`FrontDeskPage.jsx`)
```
KPI strip  ← getFrontDeskKpis(): try GET DASHBOARD_KPIS (currently 404 → catch) → fallback derive from buckets + GET /aiosell/rooms mapping.totalLocalRooms
Today's Arrivals (first 6 of arrivalsToday ∪ checkedInToday) → row: channel pill · guest+phone · roomCode·nights · 2A·1C · SR dot · balance · status pill
   [Check In] → navigate(`/pms/check-in?booking_id=${bookingId}`)   (P2 URL-param entry path)
   [View]     → navigate('/pms/in-house')
Departures Today (first 3 of departuresLate ∪ departuresDue) → [Check Out] → OD-P3-01 target
Channel Sync card ← getAiosellStatus() (P1) · [Sync] → fetchReservations({importToLocal:true}) (P1) then refetch
[New Booking] → navigate('/pms/new-booking')
```

### S9 Arrivals (`ArrivalsPage.jsx`)
```
Tabs: All | Pending | Checked In | Late  (client filter on buckets, OD-P3-02)
KPIs: total · pending · checkedIn · late · withSR (specialRequests non-empty)
Table (client-paginated 20/pg): Source · Guest · Room Type · Guests · Nights · Balance · SR · Status · [Check In]/[View]
```

### S10 Departures (`DeparturesPage.jsx`)
```
Tabs: All | Overdue | Due Now | Checked Out
Rows from in_house + checked_out reservations having rooms[].order_id (room assigned)
Cols: Room (rooms[].table_no) · Guest · Source · Guests · Check-out · Balance (amount_after_tax) · Folio (Open/Clear — see R4) · Status · [Check Out]/[Receipt]
[Check Out] → OD-P3-01 target; [Receipt] → /reports/room-orders
```

### Frozen contract — `GET /aiosell/local-reservations` (evidence `memory/evidence/CR-358-P2/probe_02`, `probe_11`, 2026-09-03 — within R12 7-day window)
```
data.reservations[] = {
  id, booking_id, cm_booking_id|null, channel ('Direct'|'booking.com'|…), hotel_code,
  checkin 'YYYY-MM-DD', checkout 'YYYY-MM-DD', status ('confirmed'), operational_status ('pending'|'in_house'|'checked_out'),
  booked_on, amount_before_tax|null, amount_after_tax (string), currency|null, special_requests|null, user_id_document_id,
  guest { first_name, last_name, email, phone, address_city, address_state, address_country },
  rooms[] { id, room_code, rateplan_code, guest_name, adults, children, line_status,
            restaurant_table_id|null, table_no|null, table_title|null, order_id|null,
            order_f_order_status|null, order_payment_status|null, checked_in_at|null, checked_out_at|null }
}
```
Fields **absent** (vs original IA §C mapping): `pah`, `rooms[].prices[]`, `amount.commission`. Pagination meta: none.
**Not yet probed:** `view=departures`, `operational_status='checked_out'` sample (no reservation has completed a checkout on sandbox yet), `dashboard-kpis` post-build shape. → Gate 3 entry probe list (needs OWNER_PREPROD alias; `test_credentials.md` is currently empty — owner must re-supply before Gate 3).

---

## Affected Files

### Files WILL change — P3 scope

| File | Type | Change | Risk |
|---|---|---|---|
| `pages/pms/FrontDeskPage.jsx` | **NEW** (S1) | KPI strip, arrivals preview, departures preview, channel-sync card | MEDIUM |
| `pages/pms/ArrivalsPage.jsx` | **NEW** (S9) | Tabs + KPIs + paginated table | LOW |
| `pages/pms/DeparturesPage.jsx` | **NEW** (S10) | Tabs + KPIs + paginated table + checkout link | LOW |
| `api/services/pmsService.js` | **EXTEND** | `getReservationOps()` (bucketing) + `getFrontDeskKpis()` (server-first, derive fallback). ~60 lines additive. `getPmsReservations` left untouched (CheckInPage depends on it). | MEDIUM |
| `api/transforms/aiosellTransform.js` | **EXTEND** | `fromReservationOps(res)` = `fromPendingArrival(res)` + `{ tableNo, orderId, checkedInAt, checkedOutAt, paymentStatus, cmBookingId, pah: r.pah ?? null }`; `fromDashboardKpis(data)` guarded. ~35 lines additive. `fromPendingArrival` unchanged. | LOW |
| `App.js` | **RE-POINT** | 3 imports + 3 element swaps (`/pms/front-desk`, `/pms/arrivals`, `/pms/departures`). Declared SC-P3-01 for Gate 4 ack. | LOW |
| `api/services/aiosellService.js` | **OPTIONAL EXTEND** | Add optional `view` param to `getLocalReservations` signature (backward-compatible default undefined). Only if OD-P3-04 = B. | LOW |

**Estimated new LOC:** ~900 (FrontDesk ~300, Arrivals ~220, Departures ~240, service ~60, transform ~35, App.js +6 net). Below the phased-plan estimate of ~1,200 because P2 already shipped the arrival transform.

### Files WILL NOT touch — P3 scope

| File | Reason |
|---|---|
| `components/layout/Sidebar.jsx` | FROZEN after P1 — entries exist |
| `pages/pms/CheckInPage.jsx`, `NewBookingPage.jsx` | P2 complete; P3 links in via existing `?booking_id=` entry path |
| `pages/pms/InHouseGuestsPage.jsx`, `ChannelManagerPage.jsx`, `PmsPlaceholderPage.jsx` | P1/CR-360 complete (placeholder still used by P4 routes) |
| `components/order-entry/CollectPaymentPanel.jsx`, `OrderEntry.jsx` | D3 decision — checkout untouched (R5/R6) |
| `pages/DashboardPage.jsx` | Untouched under OD-P3-01 = B/C. (Touched ONLY if owner selects A → re-plan as HIGH) |
| `pages/RoomOrdersReportPage.jsx` | Link target only |
| `api/services/roomService.js`, `components/modals/RoomCheckInModal.jsx` | OD-01 co-exist |
| `api/constants.js` | `LOCAL_RESERVATIONS` + `DASHBOARD_KPIS` already present |
| `api/socket/*` | GAP-10 deferred — no reservation socket events; manual Refresh + refetch-on-focus only |

---

## Downstream Consumer Check

| If we change… | Verify downstream… |
|---|---|
| `pmsService.js` (additive) | `InHouseGuestsPage.jsx` (getInHouseGuests), `NewBookingPage.jsx` (getBookableRooms, createDirectReservation), `CheckInPage.jsx` (getPmsReservations, pmsCheckIn) — no existing export signature changes |
| `aiosellTransform.js` (additive) | `ChannelManagerPage.jsx`, `pmsService.js` — `fromAPI` object gains keys only |
| `App.js` re-point | P4 routes (`/pms/reservations`, `/pms/room-status`) must still mount placeholder; P1/P2 routes unchanged |
| `aiosellService.getLocalReservations` (optional param) | `pmsService.getInHouseGuests` + `getPmsReservations` call with 2-key object — default must remain "no view" |

---

## Verification Matrix (seeds Gate 3 / QA)

| # | Check | Method | Automated? |
|---|---|---|---|
| V1 | `/pms/front-desk`, `/pms/arrivals`, `/pms/departures` render real pages, not placeholder | Browser | NO |
| V2 | `/pms/reservations`, `/pms/room-status` still render placeholder (phase 4) | Browser | NO |
| V3 | Arrivals "Today" tab shows only `pending && checkin === today`; "Late" shows `checkin < today` | Unit test on bucketing fn with fixture from `probe_11` | YES |
| V4 | Departures "Overdue" = `in_house && checkout < today` | Unit test | YES |
| V5 | KPI fallback: `DASHBOARD_KPIS` 404 → derived numbers rendered, no console error | Browser + Network tab | NO |
| V6 | `fromReservationOps` returns `pah: null` when field absent; badge hidden | Unit test | YES |
| V7 | S1 [Check In] on a pending Direct booking → CheckInPage prefilled with that booking_id | Browser (preprod, restaurant 69) | NO |
| V8 | S10 [Check Out] navigates to OD-P3-01 target | Browser | NO |
| V9 | `fromPendingArrival` output unchanged (snapshot) — CheckInPage regression | Unit snapshot | YES |
| V10 | Webpack 0 new warnings; `getInHouseGuests` still works (S6 regression) | Logs + browser | NO |
| V11 | Phone/email never logged; masked in any evidence (R20) | grep | YES |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | `local-reservations` shape drifts before Gate 3 (backend still iterating on AIOSELL) | MEDIUM | Gate 3 entry re-probe (R11/R12); transform guards every field |
| R2 | "Today" computed in browser local time vs backend Asia/Kolkata dates → off-by-one near midnight | MEDIUM | Use `YYYY-MM-DD` string compare against a date built in restaurant timezone (same helper as `dateOffset` in pmsService; align with existing report date utils) |
| R3 | Data volume: window today-60…today+7 grows with real usage → slow list | LOW | 20/pg client pagination; window param tunable; backend pagination ask logged as non-blocking |
| R4 | "Folio Open/Clear" column — no per-reservation balance source other than `amount_after_tax` (booking total, not outstanding). Could mislead cashier. | MEDIUM | Label column "Booking Amount" not "Balance Due" unless `rooms[].order_payment_status` gives paid state; surface in OD-P3-03 discussion. **Never compute settlement in P3** (R6). |
| R5 | Multi-room bookings (GAP-15) — `rooms[]` length > 1 | LOW | Render first room + "+N rooms" chip (per phased plan R9) |
| R6 | No socket → stale arrivals after webhook | LOW | Manual Refresh + refetch on `visibilitychange`; GAP-10 stays deferred |
| R7 | Three phases unsmoked (P1/P2/P3) stack on shared `pmsService` | MEDIUM | Recommend owner Gate 6 smoke of P1+P2 before P3 Gate 4 GO |
| R8 | `checked_out` operational_status value unverified (assumed) | MEDIUM | Gate 3 probe: complete one sandbox checkout, capture sample |

---

## Gate 2 Live Probe Results — 2026-09-03 (R11/R12, alias OWNER_PREPROD, restaurant 69)

Evidence: `memory/evidence/CR-358-P3/probe_01..14_*.json` (phones/emails masked). **Three findings change the analysis above:**

| # | Probe | Result | Impact on IA |
|---|---|---|---|
| P1 | `local-reservations` (no view, today-60…today+7) | 200, 7 reservations: 4 `pending`, 3 `in_house`. No `checked_out` sample exists yet on sandbox. | Baseline fetch works. R8 stands (checked_out value unverified). |
| P2 | `view=arrivals` | 200, 4 = all `pending` (dates 09-03, 09-07, 09-10) | Confirms: NOT date-filtered. OD-P3-02 stands. |
| P3 | `view=departures` | **200, 3 = all `in_house`** (checkouts 09-04, 09-09, 09-10) | Server view = "in-house, any checkout date". Today/Overdue must still be client-side. OD-P3-04 → A confirmed (no gain from view param). |
| P4 | `view=in_house` | 200, 1 (only the reservation whose date range spans today) | Confirms BUG-378 warning — unreliable. Do not use. |
| P5 | `checkin_date=today` | 200, 7 — param ignored | No server date filter exists. |
| P6 | `page=1&per_page=2` | 200, 7 — params ignored, no meta | Client-side pagination only. OD-P3-07 → A confirmed. |
| P7 | **`dashboard-kpis`** (no params) | **422** `start_date`/`end_date` required | **ENDPOINT NOW EXISTS (was 404 → MISSING-01 RESOLVED).** |
| P8 | `dashboard-kpis?start_date=today&end_date=today` | **200** — shape below | S1 KPI strip can be server-fed day one. **OD-P3-05 changes** (see revised question). |
| P9 | `dashboard-kpis` 68-day range | 422 "Date range cannot exceed 31 days" | Contract rule: ≤31 days. |
| P10 | `room-status-board` (P4 endpoint) | 200, 5 rooms with `display_status` occupied/booked + `guest{name,phone,booking_id,order_id}` | Available to S10 for Room→order mapping if needed; primary use is P4. |
| P11 | in_house reservation `rooms[0]` | `restaurant_table_id: 8524, table_no: 'r3', order_id: 1232205, order_f_order_status: 5, order_payment_status: 'unpaid', checked_in_at` set | **S10 has `order_payment_status`** (paid/unpaid) → Folio Open/Clear column IS derivable. R4 partially resolved. |

**Frozen `dashboard-kpis` contract (probe_12/13):**
```
GET /aiosell/dashboard-kpis?start_date=Y-m-d&end_date=Y-m-d   (range ≤ 31 days)
data: {
  as_of_date, range{start_date,end_date},
  today{ arrivals_count, departures_count, in_house_count, occupancy_percent_physical },
  physical{ total_rooms, by_room_code{ <code>:{mapped_rooms} },
            days[{ date, room_types[{room_code,capacity,available,occupied,occupancy_percent}],
                   totals{capacity,available,occupied,occupancy_percent} }] },
  channel: null            ← reserved, currently null
}
```
Note: `today.arrivals_count = 1` while local-reservations shows 1 pending with checkin=today → backend counts by date, consistent with OD-P3-02 option A client rule. `departures_count = 0` while one in-house has checkout 09-04 → backend "departures today" = checkout === today. **Adopt the same definitions client-side so list counts match KPI tiles.**

**Still absent:** `pah`, pagination meta, server date filter on lists, `checked_out` sample.

### Revised owner questions after probe

| # | Change | Revised question |
|---|---|---|
| OD-P3-05 | dashboard-kpis exists | **Use server KPIs (`today{}` block) for S1 strip; add "Available tonight" from `physical.days[0].totals.available`.** Fallback to "—" on error (no client derivation needed). Confirm? |
| OD-P3-04 | view=departures = all in_house | Confirmed A: single no-view fetch, client buckets. No question remains — informational. |
| OD-P3-03 | still no `pah` | Unchanged — but S10 Folio column can now use `rooms[].order_payment_status` ('unpaid' → "Open", 'paid' → "Clear"). Accept this as Folio source? |
| **OD-P3-09 (NEW)** | KPI window | S1 mockup shows an occupancy figure only for today. Should S1 also show the 7-day `physical.days[]` availability mini-bar (data is free from the same call), or today-only for MVP? Recommendation: today-only. |
| **OD-P3-10 (NEW)** | Departures scope | `view=departures` returns in-house guests with future checkouts too. Should S10 "All" tab include future departures (upcoming), or only `checkout <= today`? Mockup says "Today's Departures". Recommendation: tabs Overdue / Due Today / Upcoming / Checked Out; default = Due Today. |

---

## Backend Reply Round 3 (`backend_replies/ques3_reply_2026_09_03.md`) — reconciled 2026-09-03

Backend answered all Gate 2 questions and shipped two payload fixes. **Agent re-probed both live (probes 15-18, `evidence/CR-358-P3/`):**

| Item | Backend says | Agent verification | Status |
|---|---|---|---|
| `pah` field | Now returned on every reservation | ✅ `pah` present on 7/7 (one `true`, six `false`) | **UNBLOCKED** — Prepaid/PAH badge CAN be built. OG-PMS-007 → RESOLVED |
| `view=in_house` | Fixed — overlap window, no server-today | ✅ Returns 3/3 in-house (was 1/3) | **UNBLOCKED** — informational; P3 still uses single no-view fetch |
| `view=departures` | In-house AND checkout within window | ✅ Consistent; wide window includes future checkouts | Confirmed — client buckets Overdue/Due Today/Upcoming |
| `checked_out` state | Use `view=all` + `operational_status=departed` / `rooms[].checked_out_at` | ⚠ Value is **`departed`**, not `checked_out` (assumption corrected). No sandbox sample yet. | **STILL OPEN** — verify at Gate 3 by completing one sandbox checkout (R8) |
| `dashboard-kpis` `today{}` | as_of_date only; 422 if rooms unmapped | ✅ matches probe 12/13 | Confirmed |
| Pagination / `checkin_date` | Will NOT be added this sprint | — | Accepted — client-side (OG-PMS-009 stays, downgraded to P3/informational) |
| Checkout deep-link | No API; checkout = V2 `order-bill-payment` | — | OD-P3-01 = **(b)** `/reports/room-orders`. OG-PMS-008 stays open as future enhancement |
| Sync Now | = existing `push-inventory` (P1) | — | ⚠ Agent note: IA proposed `fetch-reservations {import:true}` (pull bookings). Backend says push-inventory. **Owner to pick** (OD-P3-11 below) |
| "Send link" | Omit — no public token APIs | — | OD-P3-08 = omit |

### Decisions now LOCKED (backend + agent aligned, owner ack pending)
| ID | Decision |
|---|---|
| OD-P3-01 | (b) `/reports/room-orders` — DashboardPage untouched, Risk stays MEDIUM |
| OD-P3-02 | Client tabs Today / Upcoming / Late / Checked In (Today ↔ KPI `arrivals_count`) |
| OD-P3-03 | Badge from `pah` (`true` → "PAY AT HOTEL", `false` → "Prepaid"); Folio from `rooms[].order_payment_status` |
| OD-P3-04 | Single no-view fetch + client buckets (resolved by probe) |
| OD-P3-05 | Server KPIs `today{}` + "Available tonight" from `physical.days[0].totals.available`; "—" on error/422 |
| OD-P3-06 | Keep card: `last_sync_at` + Sync Now |
| OD-P3-07 | Client pagination 20/page |
| OD-P3-08 | Omit Send link |
| OD-P3-09 | Today-only occupancy |
| OD-P3-10 | Tabs Overdue / Due Today / Upcoming / Checked Out, default Due Today; Checked Out via `operational_status === 'departed'` |

### Owner round 4 (2026-09-03) — resolutions
| Item | Owner | Agent action |
|---|---|---|
| Server paging / `checkin_date` | Client-side now, backend brief for later | ✅ Filed `backend_briefs/BACKEND_BRIEF_CR-358-P3_LIST_PARAMS_2026_09_03.md` (P3, non-blocking) |
| "Send link" self check-in | Out of scope | ✅ OD-P3-08 = omit — LOCKED |
| Checked-out sample | Owner checked out a room | ⚠ Probes 19-20: the room was **r2 = Walk-in (no AIOSELL booking_id)** → not in `local-reservations`; still 0 `departed` samples. Board correctly flipped r2 occupied→booked. **Ask:** check out an AIOSELL-linked room — r1 (`MG-69-69BCC4D3…`), r3 (`MG-69-A26BDA2F…`) or r5 (`BDC8899464`) — then agent re-probes for `operational_status='departed'`. Observation for P4: after checkout `manual_status` stayed `null` even though `auto_hk_on_rm_checkout=true` (expected `hk`) — logged OG-PMS-010. |
| Checkout deep-link | "not clear" | Explained in plain English in chat; decision unchanged: OD-P3-01 = (b) `/reports/room-orders`; one-click checkout = future CR (OG-PMS-008) |

### Remaining owner questions
| # | Question |
|---|---|
| **OD-P3-11** | "Sync Now" on Front Desk — (a) `push-inventory` (backend suggestion: pushes our availability OUT to OTAs) or (b) `fetch-reservations {import:true}` (pulls new OTA bookings IN so arrivals list refreshes)? Front-desk intent is (b); Channel Manager (P1) already exposes (a). Recommendation: **(b)**, label "Refresh bookings". |
| **OD-P3-12** | Design contract — approve the **v2 (right) column** of `cr358-p3-design-comparison.html` as Phase 3 UX contract, with one revision: the Prepaid/PAH badge is **restored** (OD-P3-03 now unblocked). Yes / request edits? |
| **OD-P3-13** | Gate sequencing — GO for Gate 3 (Implementation Plan) now, or wait for Gate 6 owner smoke of P1/P2 first (agent recommends smoke first, R7)? |

### Owner round 5 (2026-09-03) — FINAL Gate 2 decisions
| ID | Decision | Consequence |
|---|---|---|
| **OD-P3-01** | **(a) One-click checkout from Departures** — owner: "user experience is priority, he should be able to check out from there itself. Not b." | `pages/DashboardPage.jsx` moves to **WILL CHANGE** (hotspot R5). **Risk upgraded MEDIUM → HIGH.** Owner approval for hotspot touch = this message (approval matrix satisfied). Implementation shape (Gate 3 to finalise): Departures → `navigate('/dashboard', { state: { pmsCheckout: { tableId } } })`; DashboardPage adds one `useEffect` on `location.state?.pmsCheckout` that, once `allTablesList` is populated, finds the `isRoom` entry with that `tableId`, calls existing `handleTableClick(entry)`, sets existing `setInitialShowPayment(true)`, then clears history state. Reuses existing `initialShowPayment` state (L448) and `OrderEntry` prop — **no new checkout logic, CollectPaymentPanel untouched (R6).** ~12 lines. Regression checklist mandatory: normal room-card click, walk-in click, engaged-table guard, orderTakingEnabled=false guard, back-navigation does not re-open panel. |
| **OD-P3-11** | **(c) both** — Sync Now runs `fetch-reservations {import:true}` (pull new OTA bookings in) THEN `push-inventory` (send availability out), sequential, single spinner, toast "Bookings refreshed · inventory pushed". Either failing → partial-success toast. | Both service functions exist from P1; no new endpoint. |
| **OD-P3-12** | **Design v2 APPROVED** — right column of `frontend/public/cr358-p3-design-comparison.html` is the Phase 3 UX contract, with Prepaid/PAH badge restored (`pah`). | Gate 2.5 CLOSED |
| Checked-out sample | Owner checked out **r5** (Booking.com `BDC8899464`) | ✅ **Probe 21 verified:** `operational_status: 'departed'`, `rooms[0].line_status: 'checked_out'`, `checked_out_at` set, `order_payment_status: 'paid'`, `order_f_order_status: 6`. Excluded from `view=departures` and `view=in_house`; present in `view=all`. **Contract frozen: Checked-Out tab = `operational_status === 'departed'`.** R8 CLOSED. Board r5 → `available`, `manual_status: null` — auto-HK again not observed (OG-PMS-010 reinforced, P4 concern). |
| OD-P3-13 | Not answered — agent proceeds on owner instruction; Gate 3 GO remains an explicit owner call. | — |

**GATE 2 STATUS: ALL DECISIONS RESOLVED (OD-P3-01..12). Gate 2 CLOSED 2026-09-03. Next: owner says "Gate 3" → Implementation Plan.**

### Gate 2.5 re-open + re-close (2026-09-03, later session)
| Event | Detail |
|---|---|
| REOPENED | Owner: comparison mockup colours off-system ("looks like a patch") — `#22C55E ×7, #3B82F6 ×4, ~25 slate hexes, #2D3748/#4A5568`. Tokens frozen in `control/PMS_DESIGN_TOKENS.md`. |
| RE-SKINNED | `frontend/public/cr358-p3-design-comparison.html` colours + font only. Audit: 0 forbidden hexes. Colour-stripped diff vs `evidence/CR-358-P3/cr358-p3-design-comparison.v1.backup.html` = empty (layout/content/OD tables unchanged). |
| **OD-P3-12 (final)** | **Owner APPROVED re-skinned v2 (option a) as the Phase 3 UX contract.** |

**GATE 2 STATUS (FINAL): CLOSED 2026-09-03 (re-closed after design re-skin).**

### Gate 3 decisions (2026-09-03)
| ID | Decision |
|---|---|
| **SC-P3-01** | Owner ACCEPTED 6-line `App.js` route re-point (3 imports + 3 element swaps). |
| **OD-P3-14** | Slider payment methods = **(b) Dashboard room-checkout parity** (no `allowedMethods` prop; Split hidden, To Room auto-hidden). Owner-locked. |
| Gate 4 GO | PENDING — owner has not yet said GO. |

### Owner round 6 (2026-09-03) — OD-P3-01 AMENDED to (d): in-page checkout slider
Owner: "there should be a checkout button for the departure guys… a slider where all the payment is there… checkout button… Why navigate to the room dashboard? That dashboard might be maintained by somebody else… It should finish their checkout." Screenshot supplied = existing `CollectPaymentPanel` room mode ("Checkout ₹800").

| ID | Decision | Consequence |
|---|---|---|
| **OD-P3-01** | **(d)** Departures row "Check Out" → right-side slider ON the Departures page (and Front Desk "Departures Today" list) hosting the **existing `CollectPaymentPanel`** in room mode (`isRoom`, `roomInfo`). Panel is NOT redesigned. Pattern precedent: `components/reports/CollectBillPanelDrawer.jsx` (CR-003) — fetches order by `order_id` via `GET_SINGLE_ORDER`, transforms with `orderTransform.fromAPI.order`, mounts `CollectPaymentPanel`, posts `BILL_PAYMENT` (`/order/order-bill-payment` V2 — same call backend named as "checkout" in reply r3). | **`pages/DashboardPage.jsx` REMOVED from scope** (option a withdrawn). NEW `components/pms/PmsCheckoutDrawer.jsx` (thin wrapper; either generalise `CollectBillPanelDrawer` via props or copy its ~300-line shell — Gate 3 decides; `CollectPaymentPanel.jsx` itself untouched). Data key: every in-house/departing line has `rooms[].order_id` (probes 01/21). After 200 → toast, close, refetch list (backend flips reservation to `departed` server-side — verified r5). |
| Risk | **HIGH** stays — reason changes: no hotspot edit, but a financial component (R6) is rendered from a new host. Mandatory: 1 E2E money test (room w/ advance + food → settle → `departed`, room `available`) + consistency check with CR-357 (room advance deduction) + regression of Audit-report Collect drawer if the shell is generalised. |
| Design | Departures v2 mockup gets ONE addition: the checkout slider (480 px right panel = existing panel look). Front Desk mini-list "Check Out" opens the same slider. Owner to eyeball the added slider frame in the comparison page before Gate 3 (no other design change). |

**Gate 3 verification items added:** (i) `CollectPaymentPanel` in drawer host shows `roomInfo.balancePayment`/advance correctly for an AIOSELL-linked room order; (ii) print-bill from drawer works (AD-302A room rule); (iii) `order_f_order_status` after payment = 6 and `line_status = checked_out`.

### Scope lock — FINAL (supersedes earlier tables)
Files WILL change (r6 FINAL): `pages/pms/FrontDeskPage.jsx` (NEW), `pages/pms/ArrivalsPage.jsx` (NEW), `pages/pms/DeparturesPage.jsx` (NEW, hosts slider), **`components/pms/PmsCheckoutDrawer.jsx` (NEW — shell reusing `CollectPaymentPanel`)**, `api/services/pmsService.js` (+additive), `api/transforms/aiosellTransform.js` (+additive, incl. `pah`, `departed`), `App.js` (3-route re-point SC-P3-01). Conditional: `components/reports/CollectBillPanelDrawer.jsx` only if Gate 3 chooses to generalise it (else untouched).
Files WILL NOT touch: **`pages/DashboardPage.jsx` (withdrawn — owner: other team's surface)**, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `Sidebar.jsx`, `CheckInPage.jsx`, `NewBookingPage.jsx`, `InHouseGuestsPage.jsx`, `ChannelManagerPage.jsx`, `RoomOrdersReportPage.jsx`, `roomService.js`, `RoomCheckInModal.jsx`, `constants.js`, `socket/*`.

---

## Summary

| Field | Value |
|---|---|
| Code Reality | NONE (3 pages) — foundations PARTIAL via P1/P2 reuse |
| Conflict | CLEAN (App.js policy exception declared SC-P3-01) |
| Risk | **HIGH** (OD-P3-01 = d, financial panel hosted in PMS slider; no hotspot edit) |
| Files WILL change | 7 (3 new pages, PmsCheckoutDrawer, 2 additive extensions, App.js re-point) — DashboardPage removed |
| Files WILL NOT touch | 11 |
| Owner decisions open | **0** — OD-P3-01..12 all LOCKED (round 5). OD-P3-13 (Gate 3 GO timing) is the owner's next instruction, not a design decision. |
| Backend asks (non-blocking) | ~~dashboard-kpis~~ DELIVERED; ~~pah~~ DELIVERED (probe 15); server date filter + pagination declined this sprint (client-side) |
| Gate 2 probes | ✅ EXECUTED 2026-09-03 — 14 probes in `evidence/CR-358-P3/`. 22 probes total. `departed` sample captured (probe 21). Nothing outstanding for Gate 3 entry. |
| Design review (Gate 2.5) | Side-by-side gap comparison built: `frontend/public/cr358-p3-design-comparison.html` (31-Aug mockup vs proposed v2, every OD pinned on-screen). **Re-skinned 2026-09-03 (v2.1)** to `control/PMS_DESIGN_TOKENS.md` — colours/font only, zero layout/content diff (verified by colour-stripped diff vs `evidence/CR-358-P3/cr358-p3-design-comparison.v1.backup.html`). Hex audit: 0 forbidden hits (`#22C55E/#3B82F6/slate/#2D3748/#4A5568` all gone); palette now `#329937 ×16, #F26B33 ×10, #1A1A1A ×16, #888 ×14, #E5E5E5 ×18, #F7F7F7/#FAFAFA/#FFF, #EF4444 ×3`. **Owner APPROVED re-skinned v2 (2026-09-03) → Gate 2.5 CLOSED.** |
| Estimated new LOC | ~900 |

---

*Planning agent | CR-358-P3 Gate 2 — Impact Analysis COMPLETE | 2026-09-03*
*GATE 2 REOPENED 2026-09-03 — all decisions locked; design v2 structure approved but comparison mockup FAILS design-token audit (Tailwind green/blue/slate instead of #329937/#F26B33/#1A1A1A/#E5E5E5, see control/PMS_DESIGN_TOKENS.md). Next agent: re-skin → owner approval → close Gate 2 → await 'GO Gate 3'. Handover: handover/SESSION_HANDOVER_2026_09_03_CR358P3_GATE2_REOPENED.md Gate 3 (Implementation Plan) on owner instruction.*
*RE-SKIN DONE 2026-09-03 (same day, later session) — comparison page now token-compliant (0 forbidden hexes, layout/content byte-identical after colour strip). Owner APPROVED re-skinned v2 → **GATE 2 CLOSED (final)**. Next agent: do NOTHING on P3 until owner says "GO Gate 3", then write plans/CR-358-P3_IMPLEMENTATION_PLAN.md. Handover: handover/SESSION_HANDOVER_2026_09_03_CR358P3_RESKIN.md*
*GATE 3 DONE 2026-09-03 — owner instructed "detailed implementation planning". Plan: `plans/CR-358-P3_IMPLEMENTATION_PLAN.md` (9 edits / 7 files; PmsCheckoutDrawer = copy of CR-003 shell, CollectBillPanelDrawer untouched; probes 23-25 re-verified contracts incl. get-single-order-new room_info + rtype RM). New owner question OD-P3-14 (slider payment methods). Awaiting Gate 4 GO. Handover: handover/SESSION_HANDOVER_2026_09_03_CR358P3_GATE3.md*
