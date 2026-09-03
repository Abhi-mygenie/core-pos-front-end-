# CR-358-P2 — Gate 3: Implementation Plan
## PMS Phase 2 — New Booking (S3) + Check-In (S4): WalkIn / Direct / OTA

**Doc:** `memory/plans/CR-358-P2_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-03
**Role:** PLANNING — Gate 3 (Implementation Plan only; no code written)
**Sprint:** pos_pms_1 | **Parent:** CR-358 | **Risk:** HIGH
**Inputs:** `impact/CR-358-P2_IMPACT_ANALYSIS.md` (Gate 2 CLOSED), approved v3 mockup `frontend/public/cr358-p2-v3-mockup.html`, OD-P2-01..07
**Status:** PLAN WRITTEN — awaiting **Gate 4 GO**

---

## 0. Gate 3 entry re-verification (R12 — IA is same-day, re-checked anyway)

| Check | Result |
|---|---|
| Code reality | **NONE** — `find src -name "NewBookingPage*\|CheckInPage*"` → 0; `pmsService.js` L70-78 still stubs that `throw` |
| `App.js` L252-253 | `/pms/new-booking`, `/pms/check-in` → `<PmsPlaceholderPage phase={2}>` — **IA claim "zero changes needed" is STALE (see §1 SC-01)** |
| `pmsService.js` | 79 lines; exports `getInHouseGuests`, `getPmsReservations` (stub), `createDirectReservation` (stub). No consumer imports the stubs (grep → 0) |
| `aiosellTransform.js` | 117 lines; `fromAPI: { status, rooms, inventory }`, `decodeMealPlan`. Consumer: `ChannelManagerPage.jsx` only |
| `roomService.checkIn()` | L46-129 FormData, no `booking_id` — untouched baseline for V6 |
| `aiosellService.getLocalReservations({startDate,endDate})` | L108-113 — reusable as-is (no `view` param; filter client-side) |
| `AIOSELL_ENDPOINTS` | `DIRECT_RESERVATION` L580, `LOCAL_CHECKIN` L581, `LOCAL_RESERVATIONS` L583 present |
| `local-reservations` shape | Frozen from `evidence/BUG-378/probe_local_reservations_all.json` (2026-09-03) — see §4 |
| `aiosell/rooms` shape | Frozen from `evidence/BUG-378/probe_aiosell_rooms.json` — `local_rooms[{id,table_no,rtype,title}]`, `mappings[{restaurant_table_id,aiosell_room_code,aiosell_rateplan_code}]` |
| Toast lib | `sonner` (`import { toast } from 'sonner'`) — as in `ChannelManagerPage.jsx` |
| Conflict pre-check | `pmsService.js` last touched BUG-378 (2026-09-03, QA'd); `aiosellTransform.js` BUG-377 (2026-09-02, QA'd); `App.js` CR-358-P1 (frozen). No other ACTIVE item on these files. **CLEAN** |
| R11 curl re-probe | **NOT executed this session** — `memory/test_credentials.md` is an empty placeholder (owner login alias missing after redeploy). Payload contracts below come from owner-supplied curls (OD-P2-02, ques2_reply.md) + 2026-09-01 agent-verified probes. **IMPL agent MUST re-probe §4 contracts at Gate 4 entry before wiring (R11).** |

---

## 1. Scope correction surfaced at Gate 3 (owner ack needed with Gate 4 GO)

**SC-01 — `App.js` requires a minimal edit.** IA §"Files WILL NOT touch" lists `App.js` as "routes already exist, zero changes needed". Code reality: the routes exist but mount `PmsPlaceholderPage`. Without editing `App.js` the new pages can never render (V12/V13 would fail).

Proposed edit: **+2 import lines, 2 element swaps (4 lines total), nothing else.** No new routes, no ordering change, no Sidebar change.

```
OWNER APPROVAL REQUIRED
Reason: App.js is a P1-frozen hotspot; IA declared zero changes. Plan needs a 4-line route re-point.
Risk: HIGH (item) / LOW (this edit — element swap on 2 existing routes)
Proposed next step: Owner says "GO" (accepting SC-01) → Implementation proceeds with Edit 7.
I will not proceed until owner approves.
```

Alternative rejected: making `PmsPlaceholderPage` lazy-dispatch to real pages — still edits a P1 file, adds indirection, hides route truth from `App.js`.

---

## 2. Scope lock (R14)

### Files WILL change

| # | File | Type | Est. lines | Risk |
|---|---|---|---|---|
| F1 | `src/api/transforms/aiosellTransform.js` | EXTEND | +55 | MEDIUM |
| F2 | `src/api/services/pmsService.js` | EXTEND (replace 2 stubs, add 1 fn) | +75 / −10 | MEDIUM |
| F3 | `src/pages/pms/NewBookingPage.jsx` | **NEW** | ~330 | HIGH |
| F4 | `src/pages/pms/CheckInPage.jsx` | **NEW** | ~380 | HIGH |
| F5 | `src/App.js` | 4-line route re-point (SC-01) | +2 / ~2 | LOW (edit) |

### Files WILL NOT touch

`components/layout/Sidebar.jsx` · `api/services/roomService.js` · `components/modals/RoomCheckInModal.jsx` · `components/order-entry/CollectPaymentPanel.jsx` · `pages/pms/InHouseGuestsPage.jsx` · `pages/pms/ChannelManagerPage.jsx` · `pages/pms/PmsPlaceholderPage.jsx` · `api/services/aiosellService.js` · `api/constants.js` · `api/axios.js` · `AppProviders.jsx` · any localStorage key · any report/print/settlement file.

If any of these must change → STOP, re-declare, get owner confirmation (R14).

---

## 3. Decisions applied (frozen — do not re-open)

| ID | Applied as |
|---|---|
| OD-P2-01 | `pmsService.pmsCheckIn()` — new standalone fn, JSON body → `AIOSELL_ENDPOINTS.LOCAL_CHECKIN`. `roomService.checkIn()` untouched |
| OD-P2-02 | `direct-reservation` payload = §4.1 |
| OD-P2-03 | Room picker source = `getAiosellRooms()` → `fromAPI.rooms()` → `localRooms[]` joined with `mappings[]` for room-type label |
| OD-P2-04 | `checkin-comparison.html` reference → superseded visually by approved v3 mockup |
| OD-P2-05 (A) | S3 success card in right column: booking_id, summary, **Check In Now** → `/pms/check-in?booking_id=<id>`, **New Booking** resets form. Left form dimmed/locked while success card shown |
| OD-P2-06 (B) | S4 = KPI strip + Walk-in banner + arrivals card list (left) · check-in form panel (right). No tabs |
| OD-P2-07 (B) | S3 has **no** advance field; `direct-reservation` sent **without** `advance_payment`. Advance field lives only on S4 form |
| Mockup | S3 "Walk-in · Check In Now" CTA navigates to S4 pre-filled as walk-in (mockup `switchScreen('s4')`) — the check-in POST happens on S4 only, so advance can be collected (OD-P2-07 consistent). Single POST site = lower orphan-order risk (IA R1) |

### Assumptions declared (not business rules — presentation/defaults; owner may override at Gate 4)

| ID | Assumption | Default |
|---|---|---|
| A-01 | S4 arrivals window | Fetch `local-reservations` `start_date=today−1`, `end_date=today+60`; show `operational_status==='pending'` sorted by `checkin` asc; header count "Today's arrivals · N pending" counts `checkin===today`; list label "Arrivals · Today & Upcoming". (Mockup shows future-dated cards under "Today's Arrivals" — this makes that literal.) Wide window also guarantees a freshly created future booking (`?booking_id=`) is found without a second call |
| A-02 | Meal Plan select on S3 | No confirmed `rateplan` field on `direct-reservation`. Default: append `"Meal plan: <label>"` to `notes`. IMPL re-probe: if backend accepts `rateplan_code`, send it instead and drop the note suffix — record in QA handover |
| A-03 | S4 KPI strip | Derived client-side from the same `local-reservations` fetch (pattern = CR-360): Arriving Today = pending & checkin===today; In-House = op_status in_house; Checkout Today = in_house & checkout===today; Outstanding = Σ `amount_after_tax` of in_house. No extra API |
| A-04 | Phone | 10-digit input with static "+91" prefix (mockup); send digits only (matches existing check-in curl shape) |
| A-05 | Walk-in Room Amount default on S4 | Blank → required; Nights = derived read-only `(checkout−checkin)/86400000`, min 1 |
| A-06 | Post check-in navigation | `toast.success` → `navigate('/pms/in-house')` (IA data-flow) |
| A-07 | Room picker occupancy | Not shown (availability endpoint not built — OD-P2-04). Logged as OG-PMS-005; Phase 4 `room-status-board` resolves |

---

## 4. API contracts (frozen for IMPL; re-probe per R11 at Gate 4 entry)

### 4.1 `POST AIOSELL_ENDPOINTS.DIRECT_RESERVATION` (JSON) — expect **201**
```json
{
  "guest":   { "name": "<string>", "phone": "<10 digits>", "email": "<string|null>" },
  "checkin": "YYYY-MM-DD",
  "checkout":"YYYY-MM-DD",
  "rooms":   [ { "restaurant_table_id": 8526 } ],
  "order_amount": 5000,
  "adults":   2,
  "children": 0,
  "notes":    "<string|''>"
}
```
Rules: `rooms[]` uses **`restaurant_table_id`** (physical room chosen on pill grid — IA R3 explicit intent). Never send `advance_payment` (OD-P2-07). Response read path: `res.data.data.reservation` → fallback `res.data.reservation` → `res.data.data`. Fields used: `booking_id`, `channel`, `checkin`, `checkout`, `operational_status`, `status`.

### 4.2 `POST AIOSELL_ENDPOINTS.LOCAL_CHECKIN` (JSON, not FormData) — expect **200**
```json
{
  "booking_type":    "WalkIn" | "Direct" | "Online",
  "booking_id":      "<string>",          // ONLY when booking_type !== 'WalkIn' — key must be ABSENT for WalkIn
  "name":            "<string>",
  "phone":           "<10 digits>",
  "email":           "<string|''>",
  "room_id":         [ 8526 ],
  "checkin_date":    "YYYY-MM-DD",
  "checkout_date":   "YYYY-MM-DD",
  "order_amount":    5000,
  "room_price":      5000,
  "advance_payment": 0,
  "balance_payment": 5000,
  "total_adult":     2,
  "total_children":  0,
  "booking_for":     "Individual",
  "order_note":      "<string|''>"
}
```
Rules: `booking_type` is a **mandatory param with no default** (IA R1 mitigation) — `pmsCheckIn` throws synchronously if missing/invalid. Date format `Y-m-d` (IA R4). `balance_payment = order_amount − advance_payment` (2dp). Confirmed-by-curl core = first 11 keys; `total_adult/total_children/booking_for/order_note/email/room_price` mirror the FormData path and are additive — IMPL verifies backend does not 422 on them; if it does, drop the offending key and note in QA handover. Response: `{ message: "Group check-in completed", user_id, ... }`.

Channel → `booking_type` map (S4): `channel === 'Direct'` → `Direct`; walk-in card → `WalkIn`; any other channel (booking.com, gommt, …) → `Online`.

Backend FE note (handover_3): check-in `room_id` must map to the SAME aiosell `room_code` as the reservation line. S4 room select therefore **defaults to** a local room whose mapping `aiosellRoomCode === arrival.roomCode`, and shows a warning chip if staff picks a room of a different type (non-blocking).

### 4.3 `GET AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS?start_date&end_date` — 200
Frozen shape (probe 2026-09-03): `data.reservations[{ id, booking_id, channel, checkin, checkout, status, operational_status, amount_after_tax, special_requests, guest{first_name,last_name,email,phone}, rooms[{ id, room_code, rateplan_code, guest_name, adults, children, line_status, restaurant_table_id, table_no, order_id, checked_in_at }] }]`

### 4.4 `GET AIOSELL_ENDPOINTS.ROOMS` — 200 (existing `fromAPI.rooms`, unchanged)

---

## 5. Exact edits

### Edit 1 — `aiosellTransform.js` — add `fromDirectReservation` (after the MEAL PLAN block, L104, immediately before `// ─── PUBLIC API` — must follow `decodeMealPlan` declaration)
```js
// ─── DIRECT RESERVATION (CR-358-P2) ─────────────────────────────────────────
// Source: POST /aiosell/direct-reservation → res.data
// Shape: { data: { reservation: { booking_id, channel, checkin, checkout, operational_status, status } } }
const fromDirectReservation = (data) => {
  const r = data?.data?.reservation ?? data?.reservation ?? data?.data ?? data ?? {};
  return {
    bookingId: r.booking_id ?? null,
    channel:   r.channel ?? 'Direct',
    checkin:   r.checkin ?? null,
    checkout:  r.checkout ?? null,
    status:    r.operational_status ?? r.status ?? 'pending',
  };
};
```

### Edit 2 — `aiosellTransform.js` — add `fromPendingArrival` (directly after Edit 1)
```js
// ─── PENDING ARRIVAL (CR-358-P2) ─────────────────────────────────────────────
// Source: one element of GET /aiosell/local-reservations → data.reservations[]
// Used by CheckInPage arrivals list + form prefill. Guards every field.
const fromPendingArrival = (res) => {
  const r = res ?? {};
  const g = r.guest ?? {};
  const room = Array.isArray(r.rooms) && r.rooms.length ? r.rooms[0] : {};
  const guestName = [g.first_name, g.last_name].filter(Boolean).join(' ').trim() || room.guest_name || '';
  const nights = r.checkin && r.checkout
    ? Math.max(1, Math.round((new Date(r.checkout) - new Date(r.checkin)) / 86400000)) : null;
  return {
    id:                r.id ?? null,
    bookingId:         r.booking_id ?? null,
    channel:           r.channel ?? null,
    bookingType:       r.channel === 'Direct' ? 'Direct' : 'Online',   // CR-358-P2 §4.2 map
    guestName,
    phone:             g.phone ?? '',
    email:             g.email ?? '',
    checkin:           r.checkin ?? null,
    checkout:          r.checkout ?? null,
    nights,
    roomCode:          room.room_code ?? null,
    ratePlanCode:      room.rateplan_code ?? null,
    mealPlan:          decodeMealPlan(room.rateplan_code),               // OD-08 decoder reuse
    restaurantTableId: room.restaurant_table_id ?? null,
    tableNo:           room.table_no ?? null,
    adults:            room.adults ?? 1,
    children:          room.children ?? 0,
    amount:            r.amount_after_tax != null ? Number(r.amount_after_tax) : null,
    operationalStatus: r.operational_status ?? null,
    specialRequests:   r.special_requests ?? '',
  };
};
```

### Edit 3 — `aiosellTransform.js` — register in public API (L108-112)
```js
  fromAPI: {
    status:            fromStatus,
    rooms:             fromRooms,
    inventory:         fromInventory,
    directReservation: fromDirectReservation, // CR-358-P2
    pendingArrival:    fromPendingArrival,     // CR-358-P2
  },
```
Also update header comment L1: `// CR-358-P1 | CR-358-P2: AIOSELL API response transforms + meal plan decoder`.

### Edit 4 — `pmsService.js` — imports + helper (L1-13)
Add after L6: 
```js
import api from '../axios';                                        // CR-358-P2
import { AIOSELL_ENDPOINTS } from '../constants';                  // CR-358-P2
import { getAiosellRooms } from './aiosellService';                // CR-358-P2
import aiosellTransform from '../transforms/aiosellTransform';    // CR-358-P2
const to2dp = (v) => Number(Number(v ?? 0).toFixed(2));            // CR-358-P2
```
Update header L1: `// CR-358-P1 | BUG-378 | CR-358-P2: PMS aggregation + booking/check-in service`.

### Edit 5 — `pmsService.js` — replace stub block L66-78 with real implementations
```js
// ─── Phase 2 (CR-358-P2) ─────────────────────────────────────────────────────

/** S3: room picker source (OD-P2-03) — local rooms joined with room-type mapping */
export const getBookableRooms = async () => {
  const rooms = aiosellTransform.fromAPI.rooms(await getAiosellRooms());
  const typeById = Object.fromEntries(rooms.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  return rooms.localRooms.map(r => ({ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null }));
};

/** S4: reservations in window → arrival models (pending) + in-house list for KPIs */
export const getPmsReservations = async ({ startDate, endDate }) => {
  const data = await getLocalReservations({ startDate, endDate });
  const list = data?.data?.reservations ?? data?.reservations ?? [];
  const all  = list.map(aiosellTransform.fromAPI.pendingArrival);
  return {
    arrivals: all.filter(r => r.operationalStatus === 'pending')
                 .sort((a, b) => String(a.checkin).localeCompare(String(b.checkin))),
    inHouse:  all.filter(r => r.operationalStatus === 'in_house'),
  };
};

/** S3: Save as Booking → POST /aiosell/direct-reservation (JSON, 201). OD-P2-07: never sends advance. */
export const createDirectReservation = async (f) => {
  const payload = {
    guest:        { name: f.name, phone: f.phone, email: f.email || null },
    checkin:      f.checkin,
    checkout:     f.checkout,
    rooms:        [{ restaurant_table_id: Number(f.restaurantTableId) }],
    order_amount: to2dp(f.orderAmount),
    adults:       Number(f.adults ?? 1),
    children:     Number(f.children ?? 0),
    notes:        f.notes ?? '',
  };
  const res = await api.post(AIOSELL_ENDPOINTS.DIRECT_RESERVATION, payload);
  return aiosellTransform.fromAPI.directReservation(res.data);
};

const CHECKIN_TYPES = ['WalkIn', 'Direct', 'Online'];

/**
 * S4: PMS check-in → POST /pos/user-group-check-in as JSON (OD-P2-01 Option B).
 * Separate from roomService.checkIn() (FormData) — that function is NOT modified.
 * booking_type is mandatory (no default). booking_id sent only for Direct/Online.
 */
export const pmsCheckIn = async (p) => {
  if (!CHECKIN_TYPES.includes(p?.bookingType)) {
    throw new Error(`[CR-358-P2] pmsCheckIn: bookingType must be one of ${CHECKIN_TYPES.join('|')}`);
  }
  if (p.bookingType !== 'WalkIn' && !p.bookingId) {
    throw new Error('[CR-358-P2] pmsCheckIn: bookingId required for Direct/Online');
  }
  const orderAmount = to2dp(p.orderAmount);
  const advance     = to2dp(p.advancePayment);
  const payload = {
    booking_type:    p.bookingType,
    ...(p.bookingType !== 'WalkIn' ? { booking_id: p.bookingId } : {}),
    name:            p.name,
    phone:           p.phone,
    email:           p.email ?? '',
    room_id:         [Number(p.restaurantTableId)],
    checkin_date:    p.checkin,
    checkout_date:   p.checkout,
    order_amount:    orderAmount,
    room_price:      orderAmount,
    advance_payment: advance,
    balance_payment: to2dp(orderAmount - advance),
    total_adult:     Number(p.adults ?? 1),
    total_children:  Number(p.children ?? 0),
    booking_for:     'Individual',
    order_note:      p.note ?? '',
  };
  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, payload, { headers: { 'X-localization': 'en' } });
  return res.data;
};
```
Exports after edit: `getInHouseGuests`, `getBookableRooms`, `getPmsReservations`, `createDirectReservation`, `pmsCheckIn`. `throw new Error('… not yet implemented …')` → 0 (V2).

### Edit 6 — NEW `pages/pms/NewBookingPage.jsx` (~330 lines)
Header comment: `// CR-358-P2: S3 — New Booking Page (Save as Booking → direct-reservation | Walk-in → /pms/check-in prefill)`

Structure (mirror `InHouseGuestsPage.jsx` shell: `flex h-screen bg-[#F7F7F7]`, `<Sidebar>` with BUG-361 `mygenie_sidebar_expanded` pattern, white header bar, `p-6` body):

| Block | Spec (from approved mockup) | data-testid |
|---|---|---|
| Header | back `ArrowLeft` → `navigate(-1)`; title "New Booking"; sub "Reserve a room · Walk-in or Save as Booking" | `new-booking-page`, `nb-back-btn` |
| Body grid | `grid grid-cols-[1fr_320px] gap-5` — left form column, right summary column | — |
| Card: Guest Details | Name* (`User` icon), Phone* (+91 prefix, 10-digit, `inputMode=numeric`), Email (optional); row 2: Adults* (min 1, default 1), Children (min 0, default 0) | `nb-name`, `nb-phone`, `nb-email`, `nb-adults`, `nb-children` |
| Card: Room Selection | pill grid `grid grid-cols-3 gap-2.5`; each pill = `Home` icon, `tableNo` bold, sub `"<RoomType> · ID <id>"`, check badge when selected. Data: `getBookableRooms()`. Loading → 5 skeleton pills; error → inline retry; empty → "No rooms mapped — configure in Channel Manager" link `/pms/channel-manager` | `nb-room-grid`, `nb-room-pill-<id>` |
| Card: Stay & Amount | Check-in* (date, default today), Nights (read-only derived, centered bold), Check-out* (date, min = checkin+1); Room Amount* (₹ prefix, number ≥ 1); Meal Plan select (No preference / Room Only (EP) / Breakfast Included (CP) / Half Board (MAP) / Full Board (AP)); Notes textarea | `nb-checkin`, `nb-nights`, `nb-checkout`, `nb-amount`, `nb-meal-plan`, `nb-notes` |
| CTAs | 2-col grid: **Save as Booking** (outline green, `Bookmark` icon) · **Walk-in · Check In Now** (solid `#329937`, `Check` icon). Both disabled until form valid; Save shows `Loader2` while posting | `nb-save-booking-btn`, `nb-walkin-btn` |
| Right: Booking Summary card | header "Booking Summary"; rows Guest / Phone (+91 …) / Room (`r2 (Suite)` green) / Check-in / Check-out (dd MMM yyyy) / Duration (`N nights`) / Adults / Children; divider; total "Room Amount ₹x,xxx" green | `nb-summary` |
| Right: Booking Type card | two static rows: "Direct Reservation — Save now · Check in later" (highlighted when Save hovered/focused or default) · "Walk-in — Check in immediately" (muted). Purely informative | — |
| **Success state** (OD-P2-05 A) | after 201: left column `pointer-events-none opacity-50`; right column replaces both cards with success card: green check circle, "Booking Saved!", "Direct reservation created successfully", monospace `bookingId` box, mini rows Guest/Room/Check-in/Check-out/Status (amber dot "Pending"), **Check In Now** (primary, full width) → `navigate('/pms/check-in?booking_id=' + encodeURIComponent(bookingId))`, **New Booking** (ghost) → reset form + clear success | `nb-success-card`, `nb-success-booking-id`, `nb-checkin-now-btn`, `nb-new-booking-btn` |

Logic:
- `isValid = name.trim() && /^\d{10}$/.test(phone) && roomId && checkin && checkout > checkin && Number(amount) > 0 && adults >= 1`
- `nights = max(1, round((checkout − checkin)/86400000))`; changing checkin keeps nights by shifting checkout.
- **Save as Booking** → `createDirectReservation({ name, phone, email, checkin, checkout, restaurantTableId: roomId, orderAmount: amount, adults, children, notes: notesWithMealPlan })` where `notesWithMealPlan = mealPlan ? \`${notes}${notes ? ' · ' : ''}Meal plan: ${label}\` : notes` (A-02). Success → `toast.success('Booking saved')`, set `success` model. Error → `toast.error(err?.response?.data?.message ?? 'Failed to save booking')`, form stays editable.
- **Walk-in · Check In Now** → **no API call**; `navigate('/pms/check-in', { state: { walkin: { name, phone, email, restaurantTableId: roomId, checkin, checkout, orderAmount: amount, adults, children, note: notesWithMealPlan } } })`.
- No advance field anywhere on this page (OD-P2-07). Grep guard V8b: `advance` → 0 hits in this file.
- All money display `toLocaleString('en-IN')`; dates via `toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })`.
- Imports: `useState, useEffect, useMemo`; `useNavigate`; lucide `ArrowLeft, User, Phone, Mail, Users, Home, Calendar, Bookmark, Check, Loader2, Plus, AlertCircle`; `Sidebar`; `toast` from sonner; `getBookableRooms, createDirectReservation` from `@/api/services/pmsService`. **Must NOT import `roomService`** (V5).

### Edit 7 — NEW `pages/pms/CheckInPage.jsx` (~380 lines)
Header comment: `// CR-358-P2: S4 — Check-In Page (arrivals list + Walk-in → pmsService.pmsCheckIn JSON; roomService.checkIn NOT used)`

Same page shell as Edit 6. Reads `useSearchParams().get('booking_id')` and `useLocation().state?.walkin`.

| Block | Spec | data-testid |
|---|---|---|
| Header | title "Check-In"; sub "Today's arrivals · N pending" (N = arrivals with `checkin === today`); search input "Search guest or booking ID…" (filters by guestName / bookingId / phone); **New Booking** outline btn → `/pms/new-booking`; **Walk-in** primary btn → `selectWalkin()` | `check-in-page`, `ci-search`, `ci-new-booking-btn`, `ci-walkin-btn` |
| Body grid | `grid grid-cols-[1fr_400px] gap-5` | — |
| KPI strip (A-03) | 4 tiles, same markup as InHouse KPI tiles: Arriving Today · In-House (green) · Checkout Today (amber) · Outstanding (red, ₹) | `ci-kpi-strip` |
| Walk-in banner | amber-tinted clickable card: `UserPlus` icon, "Guest arriving without a booking?" / "Tap here for instant walk-in check-in →" → `selectWalkin()` | `ci-walkin-banner` |
| Arrivals list | section label "Arrivals · Today & Upcoming" (A-01); cards from `getPmsReservations({ startDate: today−1, endDate: today+60 }).arrivals`; card = room badge (`tableNo` ?? `roomCode` initial), guest name, channel pill (Direct green / OTA blue / label = channel), dates `07 Sep → 09 Sep`, meal pill (`mealPlan`, only if non-null — OD-08 wiring), right: `N nights` badge + "Selected" chip when active. Click → `selectArrival(a)`. States: loading spinner, error+retry, empty "No pending arrivals" | `ci-arrivals-list`, `ci-arrival-card-<bookingId>` |
| Walk-in pseudo-card | shown at top of list only when walk-in mode active (amber border): "Walk-in Guest · No booking ID" | `ci-walkin-card` |
| Right panel header | green/amber dot, guest name (or "Walk-in Guest"), channel pill (Direct / `<channel>` / Walk-in), booking id line (or "No booking ID — Walk-in") | `ci-panel-header` |
| Right panel form | Guest Name*, Phone* (+91, 10 digits); Room Assignment* `<select>` of `getBookableRooms()` → `"r2 (Suite)"`, default = `arrival.restaurantTableId` if set, else first room whose `roomType === arrival.roomCode`; amber hint chip "Room type differs from booking (<roomCode>)" when mismatch (§4.2 note); Check-in*, Nights (read-only), Check-out*; Room Amount* (₹; prefilled `arrival.amount`), **Advance Payment** (₹, optional, default 0, max = amount); Note (optional; prefilled `specialRequests`); read-only info strip "Booking type: **Direct** · ID: `MG-…`"; **Confirm Check-In** primary full-width | `ci-name`, `ci-phone`, `ci-room`, `ci-room-type-warning`, `ci-checkin`, `ci-nights`, `ci-checkout`, `ci-amount`, `ci-advance`, `ci-note`, `ci-type-label`, `ci-booking-id-label`, `ci-confirm-btn` |
| Empty right panel | when nothing selected: illustration + "Select an arrival or start a Walk-in" | `ci-panel-empty` |

Logic:
- On mount: `Promise.all([getPmsReservations(...), getBookableRooms()])`. Then: if `location.state?.walkin` → `selectWalkin(prefill)`; else if `?booking_id` → find in `arrivals` → `selectArrival`; if not found → `toast.error('Booking not found in pending arrivals')` (stay on page, list visible). Else auto-select first arrival with `checkin === today` (mockup shows first card selected) — if none, panel empty state.
- `selectArrival(a)` → form = `{ bookingType: a.bookingType, bookingId: a.bookingId, name: a.guestName, phone: a.phone, email: a.email, restaurantTableId: a.restaurantTableId ?? defaultRoomForType(a.roomCode), checkin: a.checkin, checkout: a.checkout, orderAmount: a.amount ?? '', advancePayment: 0, adults: a.adults, children: a.children, note: a.specialRequests }`.
- `selectWalkin(prefill?)` → form = `{ bookingType: 'WalkIn', bookingId: null, name:'', phone:'', restaurantTableId: rooms[0]?.id, checkin: today, checkout: today+1, orderAmount:'', advancePayment:0, adults:1, children:0, note:'', ...prefill }`.
- `isValid` = same as S3 rules + `0 <= advance <= orderAmount`.
- **Confirm Check-In** → `pmsCheckIn(form)`; success → `toast.success(res?.message ?? 'Guest checked in')` → `navigate('/pms/in-house')` (A-06); error → `toast.error(err?.response?.data?.message ?? 'Check-in failed')`; button shows `Loader2` while pending; double-submit guarded.
- Imports: `useState, useEffect, useCallback, useMemo`; `useNavigate, useSearchParams, useLocation`; lucide `Search, Plus, UserPlus, Loader2, AlertCircle, Check, Home, Calendar, User, Phone, Info, BedDouble`; `Sidebar`; `toast`; `getPmsReservations, getBookableRooms, pmsCheckIn` from `@/api/services/pmsService`. **Must NOT import `roomService` or `RoomCheckInModal`**.

### Edit 8 — `App.js` (SC-01, owner-acked at Gate 4) — 4 lines
L100 area, after `PmsPlaceholderPage` import:
```js
import NewBookingPage      from './pages/pms/NewBookingPage'; // CR-358-P2
import CheckInPage         from './pages/pms/CheckInPage';    // CR-358-P2
```
L252-253 — element swap only, path/order unchanged:
```jsx
<Route path="/pms/new-booking"     element={<ProtectedRoute><NewBookingPage /></ProtectedRoute>} /> {/* CR-358-P2 */}
<Route path="/pms/check-in"        element={<ProtectedRoute><CheckInPage /></ProtectedRoute>} />    {/* CR-358-P2 */}
```
Update comment L97: `// CR-358-P1 (+P2 route re-point): PMS Module pages`. Line count 269 → 271.

---

## 6. Execution sequence

1. **R11 re-probe** (Gate 4 entry, owner login alias required in `test_credentials.md`): `GET local-reservations` (shape §4.3), `GET aiosell/rooms`, `POST direct-reservation` with §4.1 (expect 201; note returned `booking_id`), `POST user-group-check-in` JSON §4.2 with `booking_type=Direct` + that `booking_id` (expect 200, reservation flips `in_house`). Save to `memory/evidence/CR-358-P2/`. **If any contract deviates → STOP, update §4, re-confirm with owner.**
2. Edit 1-3 (transform) → `yarn` compile clean → V3, V4.
3. Edit 4-5 (service) → V1, V2, V7 → `InHouseGuestsPage` still loads (downstream check).
4. Edit 6 (`NewBookingPage.jsx`) → Edit 8 line for new-booking only → V12 browser.
5. Edit 7 (`CheckInPage.jsx`) → Edit 8 line for check-in → V13 browser.
6. Self-test matrix §7 → EXIT GATE (registry sync) → QA handover → session handover.

---

## 7. Verification Matrix (seeds Implementation self-test + QA handover)

| # | Edit | File | Check | How to verify | Auto? |
|---|---|---|---|---|:---:|
| V1 | 5 | pmsService.js | `export const pmsCheckIn` present | grep | YES |
| V2 | 5 | pmsService.js | no `not yet implemented` throws remain | grep → 0 | YES |
| V3 | 3 | aiosellTransform.js | `directReservation:` in `fromAPI` | grep | YES |
| V4 | 3 | aiosellTransform.js | `pendingArrival:` in `fromAPI` | grep | YES |
| V5 | 6 | NewBookingPage.jsx | imports `@/api/services/pmsService`, **not** `roomService` | grep `roomService` → 0 | YES |
| V6 | — | roomService.js | unchanged: `grep booking_id` → 0, `git diff --stat` shows no change | grep/git | YES |
| V7 | 5 | pmsService.js | `pmsCheckIn` uses JSON: `grep FormData pmsService.js` → 0 | grep | YES |
| V8 | 7 | CheckInPage.jsx / pmsService.js | WalkIn payload has `booking_type:'WalkIn'` and **no** `booking_id` key | DevTools Network body on walk-in submit | NO |
| V8b | 6 | NewBookingPage.jsx | no advance field: `grep -i advance` → 0 | grep | YES |
| V9 | 7 | CheckInPage.jsx | Direct/OTA payload has `booking_type` + `booking_id` | Network body on arrival check-in | NO |
| V10 | all | webpack | compiles, 0 new errors/warnings vs baseline | `tail /var/log/supervisor/frontend.out.log` | YES |
| V11 | — | RoomCheckInModal.jsx | still imports `roomService` (not pmsService) | grep | YES |
| V12 | 6,8 | Browser | `/pms/new-booking` renders NewBookingPage (`data-testid=new-booking-page`), 5 room pills from `/aiosell/rooms` | navigate | NO |
| V13 | 7,8 | Browser | `/pms/check-in` renders CheckInPage, arrivals list populated, KPI strip numeric | navigate | NO |
| V14 | 6 | Browser | Save as Booking → 201 → success card shows `booking_id`; left form dimmed; **New Booking** resets | e2e preprod | NO |
| V15 | 6→7 | Browser | **Check In Now** → `/pms/check-in?booking_id=…` → matching card selected + form prefilled | e2e | NO |
| V16 | 7 | Browser | Confirm Check-In (Direct) → 200 → toast → `/pms/in-house` shows guest row | e2e | NO |
| V17 | 7 | Browser | OTA arrival (booking.com) → payload `booking_type:'Online'` → 200 → in-house | e2e | NO |
| V18 | 6→7 | Browser | S3 Walk-in CTA → S4 opens in walk-in mode with fields prefilled, no API call fired from S3 | Network tab | NO |
| V19 | 7 | Browser | Walk-in Confirm with advance 500 → payload `advance_payment:500, balance_payment: amount−500` → 200 | Network | NO |
| V20 | 7 | Unit-ish | `pmsCheckIn({})` throws `bookingType must be…`; `pmsCheckIn({bookingType:'Direct'})` throws `bookingId required` | node/console | YES |
| V21 | — | Regression | Dashboard → room card → `RoomCheckInModal` walk-in check-in still works (FormData path) | manual | NO |
| V22 | — | Regression | `/pms/in-house` + `/pms/channel-manager` load unchanged (pmsService/transform additive) | navigate | NO |
| V23 | 8 | App.js | `git diff App.js` = exactly +2 imports, 2 element swaps, 1 comment | git diff | YES |
| V24 | 7 | Browser | Room select default = room mapped to arrival `roomCode`; picking other type shows `ci-room-type-warning` | manual | NO |
| V25 | 6 | Browser | Meal plan selected → `notes` contains `Meal plan: <label>` (A-02) | Network body | NO |

Totals: 26 checks — 12 automated, 14 manual.

---

## 8. Risk register (plan-level)

| # | Risk | Sev | Mitigation in plan |
|---|---|---|---|
| R1 | Wrong `booking_type` → orphan order on shared endpoint | HIGH | `pmsCheckIn` throws without valid type; `booking_id` key omitted for WalkIn (spread guard); single POST site (S4 only) |
| R2 | Additive JSON keys (`total_adult` etc.) 422 on backend | MEDIUM | Step 1 re-probe; drop key if rejected; core 11 keys curl-confirmed |
| R3 | Room-type mismatch on check-in (backend requires same `room_code`) | HIGH | Default room = mapped type; warning chip; QA V24 |
| R4 | Date format | HIGH | Both pages emit `YYYY-MM-DD` from `<input type=date>`; no time component |
| R5 | `?booking_id` not in fetched window | LOW | 61-day window (A-01); explicit toast if absent |
| R6 | App.js hotspot edit | LOW/HIGH-file | 4 lines, element swap only; V23 diff guard; owner ack SC-01 |
| R7 | `getPmsReservations` signature change vs stub (now takes `{startDate,endDate}`) | NONE | 0 consumers of stub (grep verified) |
| R8 | Walk-in from S3 loses data on refresh (router state) | LOW | Acceptable — staff re-enters; walk-in banner on S4 is 1 click |

---

## 9. Post-Code Registry Checklist (Implementation agent MUST execute — R17/R18)

```
- [ ] registry.json: CR-358-P2 → status "IMPLEMENTED — Gate 5a", gate 5, completeness "5a/7", sprint_key pos_pms_1,
      files: "pages/pms/NewBookingPage.jsx, pages/pms/CheckInPage.jsx, api/services/pmsService.js, api/transforms/aiosellTransform.js, App.js (4 lines)"
- [ ] CR_REGISTRY.md: CR-358-P2 row → IMPLEMENTED — Gate 5a
- [ ] FILE_OWNERSHIP.md: add 5 rows (F1-F5) tagged CR-358-P2 with edit summaries
- [ ] Code markers: "// CR-358-P2" in every modified/new file (F1-F5) — grep -l "CR-358-P2" → 5 files
- [ ] OPEN_GAPS_REGISTER.md: OG-PMS-005 (room picker occupancy) remains OPEN → Phase 4; OG-PMS-006 (IA stale App.js claim) → CLOSED by this plan
- [ ] Evidence: memory/evidence/CR-358-P2/ (re-probe JSONs, secrets masked)
- [ ] QA handover: memory/handover/QA_HANDOVER_CR358_P2_<DATE>.md (inherits §7 matrix, §4 registry sync confirmation, EXIT GATE 5/5)
- [ ] Session handover: memory/handover/SESSION_HANDOVER_<DATE>_CR358P2_IMPL.md
```

---

## 10. Owner decisions needed

| # | Item | Blocking? |
|---|---|---|
| SC-01 | Accept 4-line `App.js` route re-point (deviation from IA "zero changes") | **YES — must accompany Gate 4 GO** |
| A-01..A-07 | Presentation defaults listed in §3 | No — override any at Gate 4, else defaults apply |

---

*Planning agent | CR-358-P2 Gate 3 — Implementation Plan COMPLETE | 2026-09-03*
*STOP — no code written. Awaiting owner **Gate 4 GO** (+ SC-01 ack).*
