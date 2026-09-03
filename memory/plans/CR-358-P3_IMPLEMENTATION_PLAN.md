# CR-358-P3 — Gate 3: Implementation Plan
## PMS Phase 3 — Front Desk (S1) + Arrivals (S9) + Departures (S10) with in-page Checkout Slider

**Doc:** `memory/plans/CR-358-P3_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-03
**Role:** PLANNING — Gate 3 (Implementation Plan only; NO code written)
**Sprint:** pos_pms_1 | **Parent:** CR-358 | **Risk:** **HIGH** (financial `CollectPaymentPanel` rendered from a new PMS host — R6; no hotspot file edited)
**Inputs:** `impact/CR-358-P3_IMPACT_ANALYSIS.md` (Gate 2 CLOSED 2026-09-03, OD-P3-01..12 locked), approved v2.1 design `frontend/public/cr358-p3-design-comparison.html` (re-skinned, owner-approved), tokens `control/PMS_DESIGN_TOKENS.md`, 25 probes `evidence/CR-358-P3/`
**Status:** PLAN WRITTEN — **SC-P3-01 ACCEPTED + OD-P3-14 = (b) by owner (2026-09-03)**. Awaiting explicit **Gate 4 GO**.

---

## 0. Gate 3 entry re-verification (R11/R12 — executed 2026-09-03, alias OWNER_PREPROD, restaurant 69)

| Check | Result |
|---|---|
| Code reality | **NONE** — `find src -name "FrontDeskPage*\|ArrivalsPage*\|DeparturesPage*\|PmsCheckoutDrawer*"` → 0; `grep -rn "CR-358-P3" src` → 0 |
| `App.js` L256-258 | `/pms/front-desk`, `/pms/arrivals`, `/pms/departures` → `<PmsPlaceholderPage phase={3}>` — **SC-P3-01 re-point required (declared in IA)** |
| `pmsService.js` | 152 lines. Exports `getInHouseGuests`, `getBookableRooms`, `getPmsReservations`, `createDirectReservation`, `pmsCheckIn`. `dateOffset()` L13-17 uses `toISOString()` (UTC date — IST off-by-one 00:00-05:29; **not modified**, new local-date helper added instead, see R2) |
| `aiosellTransform.js` | 167 lines. `fromAPI: { status, rooms, inventory, directReservation, pendingArrival }` L156-162. `fromPendingArrival` L123-152 (reused as base) |
| `aiosellService.js` | `getLocalReservations({startDate,endDate})` L115, `fetchReservations({startDate,endDate,importToLocal})` L98, `pushInventory({startDate,endDate})` L86, `getAiosellStatus()` L10 — all reusable, **unchanged** |
| `constants.js` | `AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS` L583, `DASHBOARD_KPIS` L584 (unused until P3), `API_ENDPOINTS.SINGLE_ORDER_NEW` L134, `BILL_PAYMENT` L84 — present, **unchanged** |
| Shell precedent | `components/reports/CollectBillPanelDrawer.jsx` (308 lines, CR-003): fetch `SINGLE_ORDER_NEW` → `orderFromAPI.order(raw)` → `<CollectPaymentPanel>` → `orderToAPI.collectBillExisting` → `BILL_PAYMENT`. **Copied (not generalised)** → Audit drawer untouched, zero Audit regression |
| `orderTransform.fromAPI.order` | L167-171: `isRoom = restaurantTable.rtype === 'RM' \|\| order_in === 'RM'`; L391 `roomInfo{roomPrice, advancePayment, balancePayment, …}`; L445 `rawOrderDetails` (needed by `printOrder`) |
| `printOrder` | `orderService.js` L134 `printOrder(orderId, 'bill', null, orderData, scPct, overrides, printerAgents)` — `orderData.rawOrderDetails` required ✓ provided by transform |
| **Probe 23** `local-reservations` today-60…today+30 (no view) | 200, 7 reservations: 4 `pending`, **3 `departed`**, 0 `in_house` (owner checked all rooms out). `pah` present 7/7. Every departed line: `table_no`, `order_id`, `order_payment_status:'paid'`, `line_status:'checked_out'`. Pending lines: `table_no/order_id` null. **Contract unchanged vs IA §Frozen contract** |
| **Probe 24** `dashboard-kpis` today→today | 200 `today{arrivals_count:1, departures_count:0, in_house_count:0, occupancy_percent_physical:40}`, `physical.days[0].totals{capacity:5, available:3, occupied:2}`. Note: occupancy 40% counts 2 walk-in rooms while `in_house_count` (AIOSELL-linked) = 0 — tiles are server-truth, not derived |
| **Probe 25** `get-single-order-new {order_id:1232205}` (r3, departed) | 200, `orders[0]` = order. `restaurantTable.rtype:'RM'` → `isRoom=true` ✓; `room_info{room_price:1000, advance_payment:200, balance_payment:800}` ✓; `orderDetails` 1; `associated_order_list` []; `payment_status:'paid'`, `f_order_status:6`. **Slider host contract confirmed** — unwrap path `Array.isArray(data.orders) ? data.orders[0]` (same as CR-003 drawer L137) |
| `aiosell/status` | 200, `last_sync_at` present (Channel Sync card source) |
| Conflict pre-check (registry active items) | `CollectBillPanelDrawer.jsx`: no active item → and we do not touch it. `CollectPaymentPanel.jsx`: BUG-360 IMPLEMENTED (awaiting QA), CR-058 PARKED, CR-137/CR-170 IMPLEMENTED — **we do not modify the panel; we only mount it**. `pmsService.js`/`aiosellTransform.js`: last CR-358-P2 (QA PASS) — additive only. `App.js`: CR-117 GATE_5_PENDING_QA touches App.js (report route) — parallel-safe, different lines; CR-358-P2 SC-01 precedent. **CR-357** (room-advance deduction, INTAKE, blocked) is RELATED: it will change checkout maths inside `CollectPaymentPanel`/`orderTransform`; P3 only hosts the panel → automatically inherits. Flag for P3 QA: verify advance line shows on slider bill (V-M1). **CLEAN — no blocking conflict.** |
| Design contract vs IA drift | Comparison page annotations say "Prepaid badge REMOVED" (written before backend shipped `pah`); IA round 5 + owner OD-P3-12 approval **restores** the badge from `pah`. **Plan follows IA/owner: badge rendered from `pah`** (A-01). |

---

## 1. Scope corrections surfaced at Gate 3 (owner ack with Gate 4 GO)

**SC-P3-01 — `App.js` 3-route re-point** (declared in IA, same pattern as P2 SC-01): +3 imports, 3 element swaps, 1 comment. No new routes, no order change, Sidebar untouched.

```
OWNER APPROVAL REQUIRED
Reason: App.js is P1-frozen; 3 existing PMS routes must swap PmsPlaceholderPage → real pages (6 lines).
Risk: HIGH (item) / LOW (this edit)
Proposed next step: Owner says "GO Gate 4" accepting SC-P3-01 → Implementation executes Edit 9.
I will not proceed until owner approves.
```
✅ **SC-P3-01 ACCEPTED by owner 2026-09-03** ("2 ok").

**OD-P3-14 (NEW — payment methods inside the slider, R3: not guessing)**
`CollectPaymentPanel` behaves differently by `allowedMethods`:
- **(a)** `allowedMethods={['cash','card','upi']}` — identical to the Audit "Collect" drawer (BUG-042-A, proven in production). Hides Split / Credit / "More". Lowest risk.
- **(b)** no `allowedMethods` prop — **identical to Dashboard room checkout** (all configured methods incl. Credit + "More"; Split hidden because `onOpenSplitBill={null}`; "To Room" auto-hidden for rooms). Matches the owner's screenshot ("+ More payment methods") and "all the payment is there".
**Agent recommendation: (b)**. **OWNER DECISION 2026-09-03: (b) LOCKED** — no `allowedMethods` prop; slider = Dashboard room-checkout parity (Split hidden via `onOpenSplitBill={null}`, To Room auto-hidden by `isRoom`).

---

## 2. Scope lock (R14)

### Files WILL change

| # | File | Type | Est. lines | Risk |
|---|---|---|---|---|
| F1 | `src/api/transforms/aiosellTransform.js` | EXTEND (+2 fns, +2 registry keys) | +70 | LOW |
| F2 | `src/api/services/pmsService.js` | EXTEND (+4 fns, +1 helper, +2 imports) | +95 | MEDIUM |
| F3 | `src/components/pms/PmsCheckoutDrawer.jsx` | **NEW** (shell hosting `CollectPaymentPanel`) | ~260 | **HIGH** (R6 host) |
| F4 | `src/pages/pms/DeparturesPage.jsx` | **NEW** (S10 + slider mount) | ~300 | MEDIUM |
| F5 | `src/pages/pms/ArrivalsPage.jsx` | **NEW** (S9) | ~260 | LOW |
| F6 | `src/pages/pms/FrontDeskPage.jsx` | **NEW** (S1 + slider mount) | ~340 | MEDIUM |
| F7 | `src/App.js` | 6-line route re-point (SC-P3-01) | +3 / ~3 | LOW (edit) |

Estimated new LOC ≈ 1,330 (IA said ~900 before the slider was added by OD-P3-01(d)).

### Files WILL NOT touch

`components/order-entry/CollectPaymentPanel.jsx` · `components/order-entry/OrderEntry.jsx` · `components/reports/CollectBillPanelDrawer.jsx` · `pages/DashboardPage.jsx` · `api/transforms/orderTransform.js` · `api/services/orderService.js` · `api/services/aiosellService.js` · `api/services/roomService.js` · `api/constants.js` · `components/layout/Sidebar.jsx` · `pages/pms/CheckInPage.jsx` · `pages/pms/NewBookingPage.jsx` · `pages/pms/InHouseGuestsPage.jsx` · `pages/pms/ChannelManagerPage.jsx` · `pages/pms/PmsPlaceholderPage.jsx` (still mounted by P4 routes) · `pages/RoomOrdersReportPage.jsx` · `AppProviders.jsx` · `api/socket/*` · any localStorage key · `public/pms/*.html` · `public/cr358-p3-design-comparison.html`.

If any of these must change → STOP, re-declare, get owner confirmation (R14).

---

## 3. Decisions applied (frozen — do not re-open) + assumptions

| ID | Applied as |
|---|---|
| OD-P3-01 (d) | S10 row **Check Out** + S1 mini-list **Check Out** → `<PmsCheckoutDrawer orderId roomNo guestName open onClose onSuccess>` hosting unmodified `CollectPaymentPanel` (room mode). Same POST as Dashboard: `collectBillExisting` → `BILL_PAYMENT`. Backend flips reservation → `departed` (verified r5, probe 21) |
| OD-P3-02 | S9 tabs **Today · Upcoming · Late · Checked In**, default Today. Today ↔ KPI `arrivals_count` definition (`checkin === today`) |
| OD-P3-03 | Badge: `pah === true` → amber "PAY AT HOTEL"; `pah === false` → green "Prepaid"; `null` → none. Folio: `order_payment_status === 'paid'` → "Clear", `'unpaid'` → "Open", null → "—" |
| OD-P3-04 | ONE fetch `getLocalReservations({startDate: today−60, endDate: today+30})` (no `view`) + client buckets |
| OD-P3-05 | S1 KPI strip from `dashboard-kpis?start_date=today&end_date=today` → `today{}`; "Available tonight N / capacity" from `physical.days[0].totals`; any error/422 → every tile "—" (no client derivation) |
| OD-P3-06 | Channel Sync card: single line "AIOSELL · synced X min ago" (`status.last_sync_at`) + **Sync Now** |
| OD-P3-07 | Client pagination 20/page (S9, S10) |
| OD-P3-08 | No "Send link" anywhere (grep guard V-G4) |
| OD-P3-09 | Today-only occupancy tile |
| OD-P3-10 | S10 tabs **Overdue · Due Today · Upcoming · Checked Out**, default Due Today. Checked Out = `operational_status === 'departed'` |
| OD-P3-11 (c) | Sync Now = `fetchReservations({today, today+30, importToLocal:true})` **then** `pushInventory({today, today+30})`, one spinner, `toast.success('Bookings refreshed · inventory pushed')`; if one fails → `toast.warning('Bookings refreshed · inventory push failed')` / `toast.error('Sync failed')`; then refetch list + status |
| OD-P3-12 | Layout/copy per v2.1 comparison page (right column) and frozen `public/pms/*.html`; colours strictly `PMS_DESIGN_TOKENS.md` |

### Assumptions (presentation defaults — owner may override at Gate 4, else they apply)

| ID | Assumption | Default |
|---|---|---|
| A-01 | Prepaid/PAH badge | Rendered from `pah` (IA r5) even though comparison-page pin text still says "removed" — pin text was pre-`pah`. |
| A-02 | S9 "Checked In" tab | `operationalStatus === 'in_house'` AND (`checkin === today` OR `checkedInAt?.slice(0,10) === today`) — i.e. guests who arrived today. Full in-house list already lives at `/pms/in-house` (link "View in-house"). |
| A-03 | S10 row granularity | **One row per room line** (`rooms[]` entry) — matches mockup "Room" first column and gives one `order_id` per Check Out button. Multi-room booking → N rows, same guest, chip "Room 2 of 3". Lines without `order_id` → Check Out disabled, tooltip "No room order linked". |
| A-04 | S9/S1 arrivals granularity | One row per **booking** (first room + "+N rooms" chip, per phased plan R9) — pending lines have no order/room yet. |
| A-05 | "Today" | Local browser date `YYYY-MM-DD` via new `localDate(offsetDays)` helper (`new Date()` → `en-CA` format). `dateOffset()` (UTC) left as-is for BUG-378 code. |
| A-06 | Fetch window | today−60 … today+30 (Upcoming tabs need future; ≤31 aligns with `dashboard-kpis` rule; ChannelManager uses +30) |
| A-07 | Sorting | S9: `checkin` asc then guest; S10 Overdue/Due/Upcoming: `checkout` asc, Checked Out: `checkedOutAt` desc |
| A-08 | Slider payment payload | Mirrors **Dashboard** room checkout (`autoBill: settings?.autoBill`, `waiterId`, `restaurantName`; **no** `paymentType` — the Audit drawer's `'postpaid'` is BUG-058-specific to hold orders) |
| A-09 | Post-success | `toast.success('Checked out · Room r3')` → drawer closes → parent refetches reservations (+ KPIs on S1). No optimistic row removal (server is truth; `departed` verified) |
| A-10 | Refresh | Manual **Refresh** icon + refetch on `document.visibilitychange === 'visible'` (GAP-10 no sockets) |
| A-11 | S1 "Today's Arrivals" preview | first 6 of (arrivalsToday ∪ checkedInToday) sorted A-07; "View all N" → `/pms/arrivals`. "Departures Today" mini-list: first 3 of (overdue ∪ dueToday); "View all N" → `/pms/departures` |
| A-12 | Row actions S1/S9 | pending → **Check In** → `navigate('/pms/check-in?booking_id=' + encodeURIComponent(bookingId))` (P2 entry path); in_house → **View** → `/pms/in-house` |
| A-13 | S10 Checked Out row action | **Receipt** → `navigate('/reports/room-orders')` (existing report; same as CR-360 View Bill) |
| A-14 | Empty/error states | Loading: `Loader2` spinner; error: `AlertCircle` + message + Retry; empty tab: "No arrivals today" / "No departures due today" etc. |

---

## 4. API contracts (frozen for IMPL; re-probe if >7 days elapse before coding — R12)

### 4.1 `GET AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS?start_date&end_date` — 200 (probe 23)
`data.reservations[] = { id, booking_id, cm_booking_id, channel, hotel_code, checkin, checkout, status, operational_status ('pending'|'in_house'|'departed'), pah (bool), booked_on, amount_before_tax, amount_after_tax (string), currency, special_requests, guest{first_name,last_name,email,phone,…}, rooms[{ id, room_code, rateplan_code, guest_name, adults, children, line_status ('pending'|'checked_in'|'checked_out'), restaurant_table_id, table_no, table_title, order_id, order_f_order_status, order_payment_status ('paid'|'unpaid'|null), checked_in_at, checked_out_at }] }`
No pagination meta; `view`/`checkin_date`/`page` ignored → client-side only.

### 4.2 `GET AIOSELL_ENDPOINTS.DASHBOARD_KPIS?start_date=Y-m-d&end_date=Y-m-d` — 200 (probe 24); 422 if params missing / range > 31 days / rooms unmapped
`data.today{ arrivals_count, departures_count, in_house_count, occupancy_percent_physical }`, `data.physical{ total_rooms, days[0].totals{ capacity, available, occupied, occupancy_percent } }`.

### 4.3 `POST API_ENDPOINTS.SINGLE_ORDER_NEW {order_id}` — 200 (probe 25)
`data.orders[0]` = raw order (`restaurantTable.rtype:'RM'`, `room_info{room_price,advance_payment,balance_payment}`, `orderDetails[]`, `associated_order_list[]`, `payment_status`, `f_order_status`). Unwrap exactly as CR-003 drawer L134-140. Transform: `orderFromAPI.order(raw)`.

### 4.4 `POST API_ENDPOINTS.BILL_PAYMENT` — payload = `orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, { autoBill, waiterId, restaurantName })` — **byte-identical builder to Dashboard room checkout** (OrderEntry L2243). Emits `paid_room:'yes'` and `order_amount` (food + associated + room balance) when `roomBalance > 0`. Verified side effects (probe 21): reservation `operational_status → departed`, `line_status → checked_out`, `order_payment_status → paid`, `order_f_order_status → 6`, board → `available`.

### 4.5 `GET AIOSELL_ENDPOINTS.STATUS` — 200 → `last_sync_at`. `POST FETCH_RESERVATIONS {start_date,end_date,import:true}`, `POST PUSH_INVENTORY {start_date,end_date}` — existing P1 services.

---

## 5. Exact edits

### Edit 1 — `aiosellTransform.js` — add `fromReservationOps` (after `fromPendingArrival`, before `// ─── PUBLIC API` L154)
```js
// ─── RESERVATION OPS (CR-358-P3) ─────────────────────────────────────────────
// Superset of fromPendingArrival for S1/S9/S10. fromPendingArrival is NOT modified (CheckInPage depends on it).
// Adds room-line ops fields + pah. `roomLines[]` carries one entry per rooms[] element (S10 rows = room lines).
const fromReservationOps = (res) => {
  const base  = fromPendingArrival(res);
  const r     = res ?? {};
  const rooms = Array.isArray(r.rooms) ? r.rooms : [];
  const first = rooms[0] ?? {};
  return {
    ...base,
    pah:            typeof r.pah === 'boolean' ? r.pah : null,        // true → PAY AT HOTEL, false → Prepaid, null → no badge
    cmBookingId:    r.cm_booking_id ?? null,
    roomCount:      rooms.length,
    orderId:        first.order_id ?? null,
    paymentStatus:  first.order_payment_status ?? null,                 // 'paid' | 'unpaid' | null
    lineStatus:     first.line_status ?? null,
    checkedInAt:    first.checked_in_at ?? null,
    checkedOutAt:   first.checked_out_at ?? null,
    roomLines: rooms.map((rm, i) => ({
      lineId:            rm.id ?? i,
      roomCode:          rm.room_code ?? null,
      tableNo:           rm.table_no ?? null,
      restaurantTableId: rm.restaurant_table_id ?? null,
      orderId:           rm.order_id ?? null,
      paymentStatus:     rm.order_payment_status ?? null,
      lineStatus:        rm.line_status ?? null,
      checkedInAt:       rm.checked_in_at ?? null,
      checkedOutAt:      rm.checked_out_at ?? null,
      adults:            rm.adults ?? 1,
      children:          rm.children ?? 0,
      guestName:         rm.guest_name ?? base.guestName,
    })),
  };
};

// ─── DASHBOARD KPIS (CR-358-P3) ──────────────────────────────────────────────
// Source: GET /aiosell/dashboard-kpis?start_date&end_date → res.data.data (probe 24). Guards every field; null → tile renders "—".
const fromDashboardKpis = (data) => {
  const d = data?.data ?? data ?? {};
  const t = d.today ?? {};
  const day0 = Array.isArray(d.physical?.days) ? d.physical.days[0] : null;
  const tot = day0?.totals ?? {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    asOfDate:        d.as_of_date ?? null,
    arrivalsCount:   num(t.arrivals_count),
    departuresCount: num(t.departures_count),
    inHouseCount:    num(t.in_house_count),
    occupancyPct:    num(t.occupancy_percent_physical),
    totalRooms:      num(d.physical?.total_rooms) ?? num(tot.capacity),
    availableTonight:num(tot.available),
    occupiedTonight: num(tot.occupied),
  };
};
```

### Edit 2 — `aiosellTransform.js` — register in public API (L156-162)
```js
    reservationOps:    fromReservationOps,     // CR-358-P3
    dashboardKpis:     fromDashboardKpis,      // CR-358-P3
```
Header L1 → `// CR-358-P1 | CR-358-P2 | CR-358-P3: AIOSELL API response transforms + meal plan decoder`.

### Edit 3 — `pmsService.js` — imports + local-date helper (after L10)
```js
import { getAiosellStatus, fetchReservations, pushInventory } from './aiosellService'; // CR-358-P3
// CR-358-P3: LOCAL calendar date (not UTC) — restaurant clock. dateOffset() above is UTC and left untouched (BUG-378 consumer).
export const localDate = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
};
```
Header L1 → `// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3: PMS aggregation + booking/check-in + reservation-ops service`.

### Edit 4 — `pmsService.js` — append Phase 3 block (EOF)
```js
// ─── Phase 3 (CR-358-P3) ─────────────────────────────────────────────────────
const RES_WINDOW = { back: 60, ahead: 30 }; // A-06

/** Pure bucketing — exported for unit tests (V-U1..U4). `today` = 'YYYY-MM-DD'. */
export const bucketReservationOps = (list, today) => {
  const pending  = list.filter(r => r.operationalStatus === 'pending');
  const inHouse  = list.filter(r => r.operationalStatus === 'in_house');
  const departed = list.filter(r => r.operationalStatus === 'departed');
  const byCheckin  = (a, b) => String(a.checkin).localeCompare(String(b.checkin)) || a.guestName.localeCompare(b.guestName);
  const dayOf = (ts) => (ts ? String(ts).slice(0, 10) : null);
  // S10 rows = room lines that have an order (A-03)
  const lines = (src) => src.flatMap(r => r.roomLines.map(l => ({ ...r, line: l, orderId: l.orderId, tableNo: l.tableNo, paymentStatus: l.paymentStatus })));
  const byCheckout = (a, b) => String(a.checkout).localeCompare(String(b.checkout));
  return {
    arrivalsToday:    pending.filter(r => r.checkin === today).sort(byCheckin),
    arrivalsUpcoming: pending.filter(r => r.checkin >  today).sort(byCheckin),
    arrivalsLate:     pending.filter(r => r.checkin <  today).sort(byCheckin),
    checkedInToday:   inHouse.filter(r => r.checkin === today || dayOf(r.checkedInAt) === today).sort(byCheckin), // A-02
    inHouse,
    depOverdue:       lines(inHouse).filter(x => x.checkout <  today).sort(byCheckout),
    depDueToday:      lines(inHouse).filter(x => x.checkout === today).sort(byCheckout),
    depUpcoming:      lines(inHouse).filter(x => x.checkout >  today).sort(byCheckout),
    depCheckedOut:    lines(departed).sort((a, b) => String(b.line.checkedOutAt ?? '').localeCompare(String(a.line.checkedOutAt ?? ''))),
    withSpecialRequests: pending.filter(r => (r.specialRequests ?? '').trim() !== '').length,
  };
};

/** S1/S9/S10: single fetch (OD-P3-04) → ops models → buckets */
export const getReservationOps = async () => {
  const today = localDate(0);
  const data  = await getLocalReservations({ startDate: localDate(-RES_WINDOW.back), endDate: localDate(RES_WINDOW.ahead) });
  const list  = (data?.data?.reservations ?? data?.reservations ?? []).map(aiosellTransform.fromAPI.reservationOps);
  return { today, all: list, ...bucketReservationOps(list, today) };
};

/** S1: server KPIs (OD-P3-05). Throws on error → page renders "—" tiles. */
export const getFrontDeskKpis = async () => {
  const today = localDate(0);
  const res = await api.get(AIOSELL_ENDPOINTS.DASHBOARD_KPIS, { params: { start_date: today, end_date: today } });
  return aiosellTransform.fromAPI.dashboardKpis(res.data);
};

/** S1: Channel Sync card source (OD-P3-06) */
export const getChannelSyncStatus = async () => aiosellTransform.fromAPI.status((await getAiosellStatus())?.data ?? {});

/** S1 Sync Now (OD-P3-11 c): pull bookings IN, then push inventory OUT. Never throws — returns per-step result. */
export const syncNow = async () => {
  const range = { startDate: localDate(0), endDate: localDate(RES_WINDOW.ahead) };
  const out = { fetched: false, pushed: false, error: null };
  try { await fetchReservations({ ...range, importToLocal: true }); out.fetched = true; }
  catch (e) { out.error = e?.response?.data?.message ?? e?.message ?? 'fetch-reservations failed'; return out; }
  try { await pushInventory(range); out.pushed = true; }
  catch (e) { out.error = e?.response?.data?.message ?? e?.message ?? 'push-inventory failed'; }
  return out;
};
```
Exports after edit: previous 5 + `localDate`, `bucketReservationOps`, `getReservationOps`, `getFrontDeskKpis`, `getChannelSyncStatus`, `syncNow`. `getPmsReservations`/`getInHouseGuests` untouched (V-G6).

### Edit 5 — NEW `components/pms/PmsCheckoutDrawer.jsx` (~260 lines) — **the HIGH-risk file**
Header: `// CR-358-P3: PMS Checkout Drawer — right-side slider hosting the EXISTING CollectPaymentPanel (room mode). Shell copied from components/reports/CollectBillPanelDrawer.jsx (CR-003); that file is NOT modified. CollectPaymentPanel is NOT modified (R6).`

Props: `{ open, orderId, roomNo, guestName, onClose, onSuccess }`.

Body = CR-003 shell with these **exact deltas** (everything else copied verbatim incl. `stampPlacedItems`, `buildEffectiveTable`, `buildCustomer`, unwrap logic, cancelled-flag effect, `if (!open) return null`):

| # | CR-003 drawer | PmsCheckoutDrawer |
|---|---|---|
| D1 | `order.id` | `orderId` prop (numeric from `rooms[].order_id`) |
| D2 | header "Collect Bill · #n" | `Checkout · Room {roomNo}` + sub `{guestName}` (Poppins, `#1A1A1A`, border `#E5E5E5`) |
| D3 | `paymentType: 'postpaid'` (BUG-058) | **omitted** — A-08 Dashboard parity |
| D4 | `allowedMethods={['cash','card','upi']}` | **OD-P3-14 = (b) LOCKED**: prop **omitted** (Dashboard parity) |
| D5 | `onPrintBill={null}` | `onPrintBill={handlePrintBill}` → `printOrder(orderId, 'bill', null, detail, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])` (same call as OrderEntry L1912); `toast.success('Bill request sent')` / `toast.error(err.readableMessage)` — `printerAgents` from `useRestaurant()` |
| D6 | callbacks `onCollectStart/Success/Error(order)` | `onSuccess({ orderId })` after 200 (parent toasts + refetches); on error → `toast.error(err?.readableMessage ?? err?.response?.data?.message ?? 'Checkout failed')`, drawer stays open |
| D7 | `isRoom={detail.isRoom === true}` | same, **plus guard**: if `detail.isRoom !== true` → render error state "This order is not a room order" (never post) |
| D8 | width `w-[480px]`, `bg-black/20` | same (mockup 450-480 px, 20 % backdrop); `z-40/50` same; ESC key closes when `!isPaying` |
| D9 | data-testids `collect-bill-drawer*` | `pms-checkout-drawer`, `pms-checkout-drawer-backdrop`, `pms-checkout-drawer-close`, `pms-checkout-drawer-loading`, `pms-checkout-drawer-error`, `pms-checkout-drawer-title` |

Unchanged from CR-003 (do NOT "improve"): `orderToAPI.collectBillExisting(effectiveTable, stampPlacedItems(detail.items), buildCustomer(detail), paymentData, { autoBill: settings?.autoBill || false, waiterId: user?.employeeId || '', restaurantName: restaurant?.name || '' })` → `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)`; `CollectPaymentPanel` props `cartItems, total={detail.amount||0}, onBack, onPaymentComplete, onOpenSplitBill={null}, onToggleComplimentary={null}, customer, isRoom, associatedOrders, roomInfo, orderFinancials{subtotalBeforeTax, subtotalAmount, serviceTax, tipAmount}, hasPlacedItems={true}, isProcessingPayment, orderType, orderNumber`.
Imports: `useEffect,useState,useCallback`; lucide `Loader2, AlertTriangle, X`; `api`; `API_ENDPOINTS`; `fromAPI as orderFromAPI, toAPI as orderToAPI` from `orderTransform`; `printOrder` from `orderService`; `useRestaurant, useSettings` from contexts; `useAuth`; `toast` from sonner; `CollectPaymentPanel`.

### Edit 6 — NEW `pages/pms/DeparturesPage.jsx` (~300 lines)
Header: `// CR-358-P3: S10 — Departures (tabs Overdue/Due Today/Upcoming/Checked Out, client pagination 20, in-page checkout slider OD-P3-01 d)`
Shell = `InHouseGuestsPage.jsx` pattern: `flex h-screen bg-[#F7F7F7]`, `<Sidebar>` with `mygenie_sidebar_expanded`, white header bar, `p-6` body. Fonts/colours only from tokens.

| Block | Spec | data-testid |
|---|---|---|
| Header | title "Today's Departures"; sub `<long date> · Check-out by 11:00 AM`; right: Refresh icon btn (A-10) | `departures-page`, `dep-refresh-btn` |
| KPI strip | Total Due (overdue+dueToday), Overdue (red `#EF4444`), Due Today (orange `#F26B33`), Checked Out (green `#329937`) | `dep-kpi-strip`, `dep-kpi-total`, `dep-kpi-overdue`, `dep-kpi-due`, `dep-kpi-checked-out` |
| Tabs | `Overdue (n) · Due Today (n) · Upcoming (n) · Checked Out (n)`; default **Due Today**; active = `#F26B33` underline; resets page to 1 | `dep-tab-overdue`, `dep-tab-due`, `dep-tab-upcoming`, `dep-tab-checked-out` |
| Table cols | Room (`tableNo` bold + `roomCode` sub) · Guest (name + masked-in-UI? **no — phone shown as in P2** `+91 …`) · Source (channel pill: Direct green / OTA neutral) · Guests (`2A · 1C`) · Check-out (date; Overdue rows red "OVERDUE", Checked Out rows `checkedOutAt` time) · Balance (`₹amount` en-IN; + badge from `pah` OD-P3-03) · Folio (`Open` amber / `Clear` green / `—`) · Status pill (Overdue red / Due orange / Upcoming grey / Done green) · Action | `dep-table`, `dep-row-<orderId|bookingId-lineId>` |
| Action | Overdue/Due/Upcoming: **Check Out** solid `#329937` (disabled + title "No room order linked" if `!orderId`) → `setCheckout({ orderId, roomNo: tableNo, guestName })`; Checked Out: **Receipt** outline → `/reports/room-orders` (A-13) | `dep-checkout-btn-<orderId>`, `dep-receipt-btn-<orderId>` |
| Pagination | footer "Showing a–b of N" + Prev / numbered / Next, 20/page (OD-P3-07) | `dep-pagination`, `dep-page-prev`, `dep-page-next` |
| Slider | `<PmsCheckoutDrawer open={!!checkout} {...checkout} onClose={() => setCheckout(null)} onSuccess={handleCheckoutSuccess} />` | (drawer ids) |
| States | loading / error+retry / empty per tab (A-14) | `dep-loading`, `dep-error`, `dep-empty` |

Logic: `load()` → `getReservationOps()`; refetch on `visibilitychange`. `handleCheckoutSuccess({orderId})` → `toast.success(\`Checked out · Room ${checkout.roomNo}\`)` → `setCheckout(null)` → `load()`. Imports: `getReservationOps` from `@/api/services/pmsService`; `PmsCheckoutDrawer` from `@/components/pms/PmsCheckoutDrawer`; lucide `RefreshCw, Loader2, AlertCircle, LogOut, Receipt, BedDouble`; `toast` (sonner); `useNavigate`.

### Edit 7 — NEW `pages/pms/ArrivalsPage.jsx` (~260 lines)
Header: `// CR-358-P3: S9 — Arrivals (tabs Today/Upcoming/Late/Checked In, client pagination 20)`

| Block | Spec | data-testid |
|---|---|---|
| Header | "Today's Arrivals" · `<long date> · <restaurant name>`; right: **New Booking** (`#329937`) → `/pms/new-booking`; Refresh | `arrivals-page`, `arr-new-booking-btn`, `arr-refresh-btn` |
| KPI strip | Today · Upcoming · Late (red) · Checked In (green) · With SR (amber) | `arr-kpi-strip` + `arr-kpi-*` |
| Tabs | `Today (n) · Upcoming (n) · Late (n) · Checked In (n)`, default Today | `arr-tab-today`, `arr-tab-upcoming`, `arr-tab-late`, `arr-tab-checked-in` |
| Table cols | Source · Guest (name, phone) · Room Type (`roomCode` + `mealPlan` badge if non-null + "+N rooms" chip A-04) · Guests · Nights · Balance (`₹amount` + PAH/Prepaid badge) · SR (dot + tooltip `specialRequests`) · Status (Pending amber / Late red / Checked In green) · Action | `arr-table`, `arr-row-<bookingId>` |
| Action | pending → **Check In** → `/pms/check-in?booking_id=…` (A-12); in_house → **View** → `/pms/in-house` | `arr-checkin-btn-<bookingId>`, `arr-view-btn-<bookingId>` |
| Pagination / states | as S10 | `arr-pagination`, `arr-loading`, `arr-error`, `arr-empty` |

No "Send link" (OD-P3-08). Imports: `getReservationOps`; lucide `Plus, RefreshCw, Loader2, AlertCircle, MessageSquare`.

### Edit 8 — NEW `pages/pms/FrontDeskPage.jsx` (~340 lines)
Header: `// CR-358-P3: S1 — Front Desk (server KPIs OD-P3-05, arrivals preview, departures mini-list → checkout slider, Channel Sync + Sync Now OD-P3-11 c)`
Layout per mockup: header (greeting by hour · long date · restaurant name · **New Booking**) → KPI strip (4 tiles) → 2-col body `grid grid-cols-[1fr_320px] gap-5`: left "Today's Arrivals" card; right column = Channel Sync card + "Departures Today" card.

| Block | Spec | data-testid |
|---|---|---|
| KPI tiles | Occupancy `occupancyPct%` sub `occupiedTonight of totalRooms rooms`; Arrivals Today `arrivalsCount` sub `${checkedInToday.length} checked in · ${arrivalsToday.length} pending` + "View all" → `/pms/arrivals`; Departures `departuresCount` sub `${depOverdue.length} overdue` + "View all" → `/pms/departures`; In-House `inHouseCount` sub "Currently staying" → `/pms/in-house`. Any KPI fetch error → all four values "—" (OD-P3-05), buckets still render | `fd-kpi-occupancy`, `fd-kpi-arrivals`, `fd-kpi-departures`, `fd-kpi-inhouse` |
| Today's Arrivals card | "Showing k of N" · rows (first 6, A-11): Source · Guest (name/phone) · Room·Guests (`roomCode · N nights`, `2A · 0C`, SR dot) · Balance (+ PAH/Prepaid badge) · Status · Check In / View (A-12); footer "View all N arrivals" → `/pms/arrivals` | `fd-arrivals-card`, `fd-arrival-row-<bookingId>`, `fd-view-all-arrivals` |
| Channel Sync card | "Channel Sync" + **Sync Now** (`RefreshCw`, spinner while running); line `AIOSELL · synced X min ago` (relative from `lastSyncAt`, "never" if null); "Available tonight `availableTonight / totalRooms`" ("—" on KPI error); Sync → `syncNow()` → toast per §3 OD-P3-11 → reload status + ops + KPIs | `fd-sync-card`, `fd-sync-now-btn`, `fd-sync-status`, `fd-available-tonight` |
| Departures Today card | header "Departures Today" + count (overdue+dueToday); rows (first 3): guest · `Rm {tableNo} · OVERDUE|due today` · `₹amount` · **Check Out** → `setCheckout({orderId, roomNo, guestName})` (disabled if `!orderId`); footer "View all N departures" → `/pms/departures` | `fd-departures-card`, `fd-departure-row-<orderId>`, `fd-checkout-btn-<orderId>`, `fd-view-all-departures` |
| Slider | same `<PmsCheckoutDrawer>` mount + success handler as S10 (reload ops + KPIs) | (drawer ids) |
| Header CTA | **New Booking** → `/pms/new-booking` | `front-desk-page`, `fd-new-booking-btn` |

Logic: `Promise.allSettled([getReservationOps(), getFrontDeskKpis(), getChannelSyncStatus()])` — ops failure → page error state; KPI/status failure → "—" only. `useRestaurant().restaurant?.name` for header.

### Edit 9 — `App.js` (SC-P3-01) — 6 lines
After L102: 
```js
import FrontDeskPage       from './pages/pms/FrontDeskPage';   // CR-358-P3
import ArrivalsPage        from './pages/pms/ArrivalsPage';    // CR-358-P3
import DeparturesPage      from './pages/pms/DeparturesPage';  // CR-358-P3
```
L256-258 element swap only (path/order unchanged):
```jsx
<Route path="/pms/front-desk"      element={<ProtectedRoute><FrontDeskPage /></ProtectedRoute>} />  {/* CR-358-P3 */}
<Route path="/pms/arrivals"        element={<ProtectedRoute><ArrivalsPage /></ProtectedRoute>} />   {/* CR-358-P3 */}
<Route path="/pms/departures"      element={<ProtectedRoute><DeparturesPage /></ProtectedRoute>} /> {/* CR-358-P3 */}
```
Comment L97 → `// CR-358-P1 (+P2 +P3 route re-point): PMS Module pages`. `/pms/reservations`, `/pms/room-status` keep `PmsPlaceholderPage phase={4}`.

---

## 6. Execution sequence (IMPL agent)

1. Entry verification (Step 0): confirm L-refs in §0 still hold; if >7 days since 2026-09-03 → re-run probes 23-25.
2. Edit 1-2 (transform) → compile → V-U5, V-U6.
3. Edit 3-4 (service) → compile → V-U1..U4 (bucketing unit tests with fixture built from `probe_23` masked JSON) → `/pms/in-house`, `/pms/check-in` still load (downstream).
4. Edit 5 (`PmsCheckoutDrawer`) → compile only (no host yet).
5. Edit 6 + Edit 9 departures line → V-B1, V-B3, **V-M1..M4 money tests** (needs one AIOSELL-linked in-house room — owner/IMPL creates via S3→S4 with advance ₹200 + adds one food item from Dashboard).
6. Edit 7 + Edit 9 arrivals line → V-B4..B6.
7. Edit 8 + Edit 9 front-desk line → V-B7..B10.
8. Self-test matrix §7 → EXIT GATE 5/5 → QA handover → session handover.

---

## 7. Verification Matrix (seeds IMPL self-test + QA handover)

| # | Edit | File | Check | How | Auto? |
|---|---|---|---|---|:---:|
| V-G1 | 2 | aiosellTransform.js | `reservationOps:` and `dashboardKpis:` in `fromAPI` | grep | YES |
| V-G2 | 4 | pmsService.js | exports `getReservationOps`, `getFrontDeskKpis`, `getChannelSyncStatus`, `syncNow`, `bucketReservationOps`, `localDate` | grep | YES |
| V-G3 | 5 | PmsCheckoutDrawer.jsx | imports `CollectPaymentPanel`, `collectBillExisting`, `BILL_PAYMENT`, `printOrder`; **no** `paymentType` string; `isRoom` guard present | grep | YES |
| V-G4 | 6-8 | 3 pages | `grep -i "send link"` → 0; `grep DashboardPage` → 0 | grep | YES |
| V-G5 | — | CollectPaymentPanel.jsx, CollectBillPanelDrawer.jsx, OrderEntry.jsx, DashboardPage.jsx, orderTransform.js | `git diff --stat` shows **no change** | git | YES |
| V-G6 | 4 | pmsService.js | `getPmsReservations`, `getInHouseGuests`, `dateOffset` bodies unchanged (diff) | git diff | YES |
| V-G7 | 9 | App.js | diff = +3 imports, 3 element swaps, 1 comment | git diff | YES |
| V-G8 | all | 7 files | `grep -l "CR-358-P3"` → 7 | grep | YES |
| V-G9 | 5-8 | 4 new files | colour audit: no `#22C55E #3B82F6 #2563EB` / slate hex / `bg-blue-` `text-blue-` `bg-slate-` `text-slate-` classes (`blue-50/600` allowed only if pre-existing pattern from CheckInPage channel pill) | grep | YES |
| V-U1 | 4 | bucketReservationOps | fixture probe_23: pending with `checkin===today` → arrivalsToday; `>` → upcoming; `<` → late | unit (craco test) | YES |
| V-U2 | 4 | bucketReservationOps | in_house lines: `checkout<today` → depOverdue, `===` → depDueToday, `>` → depUpcoming | unit | YES |
| V-U3 | 4 | bucketReservationOps | `departed` → depCheckedOut only; never in arrivals/dep buckets; sorted by checkedOutAt desc | unit | YES |
| V-U4 | 4 | bucketReservationOps | multi-room booking with 2 lines → 2 departure rows, same bookingId | unit | YES |
| V-U5 | 1 | fromReservationOps | `pah:true→true`, `false→false`, missing→`null`; `fromPendingArrival` snapshot unchanged (V9 of IA) | unit snapshot | YES |
| V-U6 | 1 | fromDashboardKpis | probe_24 fixture → `{arrivalsCount:1, departuresCount:0, inHouseCount:0, occupancyPct:40, availableTonight:3, totalRooms:5}`; `{}` → all null | unit | YES |
| V-B1 | 6,9 | Browser | `/pms/departures` renders real page (`departures-page`), default tab Due Today, KPI numbers match tab counts | navigate | NO |
| V-B2 | 9 | Browser | `/pms/reservations`, `/pms/room-status` still placeholder phase 4 | navigate | NO |
| V-B3 | 6 | Browser | Checked Out tab lists r1/r3/r5 departed lines with Folio "Clear", **Receipt** → `/reports/room-orders` | navigate | NO |
| V-B4 | 7,9 | Browser | `/pms/arrivals` default Today; Upcoming shows 09-07/09-10 bookings; Late empty (or as data); pagination hidden when ≤20 rows | navigate | NO |
| V-B5 | 7 | Browser | pending row **Check In** → `/pms/check-in?booking_id=…` → CheckInPage selects that card (P2 entry path) | e2e | NO |
| V-B6 | 7 | Browser | PAH badge on `San1ce92d141430` (pah true) = "PAY AT HOTEL"; Prepaid on pah false rows | visual | NO |
| V-B7 | 8,9 | Browser | `/pms/front-desk` KPI tiles = `dashboard-kpis` values (Network tab); Available tonight `3 / 5` | navigate + Network | NO |
| V-B8 | 8 | Browser | Block `dashboard-kpis` (DevTools offline for that URL) → tiles "—", lists still render, no console error | DevTools | NO |
| V-B9 | 8 | Browser | **Sync Now** → Network: `fetch-reservations {import:true}` THEN `push-inventory`; single toast; status line refreshes | Network | NO |
| V-B10 | 8 | Browser | Departures mini-list **Check Out** opens the same slider as S10 | click | NO |
| **V-M1** | 5 | Browser (money) | Precondition: AIOSELL Direct booking → S4 check-in with advance ₹200, room ₹1000, then 1 food item placed from Dashboard. Open slider from S10: Bill shows Room ₹1000 − Advance ₹200 = balance ₹800, food line, taxes, Grand Total = food + ₹800; header "Checkout · Room rN" | e2e preprod | NO |
| **V-M2** | 5 | Browser (money) | Pay Cash → `BILL_PAYMENT` payload has `paid_room:'yes'`, `order_amount` = grand total, `payment_method` cash; 200 → toast → slider closes → row moves to Checked Out (Folio Clear); `local-reservations` shows `departed`; `room-status-board` room `available` | Network + curl | NO |
| **V-M3** | 5 | Browser | **Print Bill** from slider → `printOrder` fires bill payload with `rtype:'RM'`, room advance/balance lines (AD-302A) | Network | NO |
| **V-M4** | 5 | Browser | Payload parity: diff slider `BILL_PAYMENT` payload vs Dashboard room-checkout payload for the same order state → identical keys (only `waiter_id`/timestamps may differ) | Network compare | NO |
| V-M5 | 5 | Browser | Payment API failure (simulate 500) → error toast, slider stays open, no double POST on retry (`isPaying` guard) | DevTools | NO |
| V-M6 | 5 | Browser | Open slider for a `paid`/departed order (edge) → panel shows ₹0 balance; Check Out button hidden on Checked Out tab anyway | visual | NO |
| V-R1 | — | Regression | Audit report → Hold tab → **Collect** drawer still works (file untouched, sanity) | manual | NO |
| V-R2 | — | Regression | Dashboard room card → OrderEntry → Checkout still works (panel untouched) | manual | NO |
| V-R3 | — | Regression | `/pms/in-house`, `/pms/check-in`, `/pms/new-booking`, `/pms/channel-manager` load unchanged | navigate | NO |
| V-R4 | all | webpack | 0 new warnings vs baseline | logs | YES |
| V-S1 | all | R20 | no phone/email in console logs or evidence files | grep | YES |

Totals: 36 checks — 16 automated, 20 manual (6 money/financial).

---

## 8. Risk register (plan-level)

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | Financial panel in new host renders wrong totals (missing `roomInfo`/`associatedOrders`) | **HIGH** | Same transform + same props as CR-003 drawer & Dashboard (§5 Edit 5 table); probe 25 confirms `room_info` + `rtype:'RM'`; V-M1/V-M4 mandatory before QA hand-off |
| R2 | Wrong payload vs Dashboard (e.g. `paymentType`) | HIGH | A-08 omits `paymentType`; builder + options identical to OrderEntry L2243; V-M4 payload diff |
| R3 | Local-vs-UTC "today" mismatch with backend `arrivals_count` | MEDIUM | `localDate()` local calendar; V-B7 compares tile vs Today tab count; documented A-05 |
| R4 | Stale list after payment (no sockets) | LOW | Refetch on success + visibilitychange; server `departed` verified |
| R5 | Multi-room bookings duplicate guest rows in S10 | LOW | A-03 chip "Room i of N"; V-U4 |
| R6 | `dashboard-kpis` 422 when rooms unmapped | LOW | "—" tiles, link to Channel Manager mapping tab in tile tooltip |
| R7 | `printerAgents` empty on preprod → Print Bill toast "sent" but nothing prints | LOW | Same behaviour as Dashboard; not P3 scope |
| R8 | CR-357 later changes advance-deduction maths | MEDIUM | Slider inherits automatically (panel untouched); add S10 slider to CR-357 regression list (note in CR-357 intake at closure) |
| R9 | App.js hotspot | LOW | 6 lines, V-G7 diff guard, SC-P3-01 ack |
| R10 | Three unsmoked phases stack on `pmsService` | MEDIUM | Recommend P1/P2 Gate 6 smoke before/alongside P3 QA (IA R7) |

---

## 9. Post-Code Registry Checklist (IMPL agent MUST execute — R17/R18)

```
- [ ] registry.json: CR-358-P3 → status "IMPLEMENTED — Gate 5a", gate 5, sprint_key pos_pms_1,
      files: "pages/pms/FrontDeskPage.jsx, pages/pms/ArrivalsPage.jsx, pages/pms/DeparturesPage.jsx, components/pms/PmsCheckoutDrawer.jsx, api/services/pmsService.js, api/transforms/aiosellTransform.js, App.js (6 lines)"
- [ ] CR_REGISTRY.md: CR-358-P3 row → IMPLEMENTED — Gate 5a
- [ ] FILE_OWNERSHIP.md: add 7 rows (F1-F7) tagged CR-358-P3; add PmsCheckoutDrawer.jsx to CollectPaymentPanel consumers list (L349)
- [ ] Code markers: "// CR-358-P3" in every new/modified file — grep -l → 7
- [ ] OPEN_GAPS_REGISTER.md: OG-PMS-003 → RESOLVED (checkout via slider); OG-PMS-008 stays SUPERSEDED; OG-PMS-002 stays OPEN (walk-in rows have no reservation → not in S10; note "S10 covers AIOSELL-linked rooms only")
- [ ] CR-357 intake: append "Regression: CR-358-P3 Departures slider" line
- [ ] Evidence: memory/evidence/CR-358-P3/ (V-M2 payload + responses, secrets masked)
- [ ] QA handover: memory/handover/QA_HANDOVER_CR358_P3_<DATE>.md (inherits §7, registry sync confirmation, EXIT GATE 5/5, precondition room setup steps for V-M1)
- [ ] Session handover: memory/handover/SESSION_HANDOVER_<DATE>_CR358P3_IMPL.md
```

---

## 10. Owner decisions needed

| # | Item | Blocking? |
|---|---|---|
| **Gate 4 GO** | Approve this plan for Implementation | **YES** |
| **SC-P3-01** | Accept 6-line `App.js` route re-point | ✅ **ACCEPTED by owner 2026-09-03** |
| **OD-P3-14** | Slider payment methods | ✅ **(b) Dashboard parity — LOCKED by owner 2026-09-03** |
| A-01..A-14 | Presentation defaults §3 | No — override any at Gate 4 |
| Sequencing | Agent recommends owner Gate 6 smoke of P1/P2 in parallel with P3 implementation (R10) | No |

---

*Planning agent | CR-358-P3 Gate 3 — Implementation Plan COMPLETE | 2026-09-03*
*STOP — no code written. SC-P3-01 accepted, OD-P3-14=(b) locked (2026-09-03). Awaiting owner's explicit **Gate 4 GO**.*
