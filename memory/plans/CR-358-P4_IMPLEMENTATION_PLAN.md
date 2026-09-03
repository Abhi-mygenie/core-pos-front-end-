# CR-358-P4 — Gate 3: Implementation Plan
## PMS Phase 4 — Tape Chart (S2) + Room Status Board (S7)

**Doc:** `memory/plans/CR-358-P4_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-04
**Role:** PLANNING — Gate 3 (Implementation Plan only; NO code written)
**Sprint:** pos_pms_1 | **Parent:** CR-358 | **Risk:** **MEDIUM** (hotspot `pmsService.js` append-only + first PATCH integration in codebase; no financial logic; no R5 hotspot file)
**Inputs:** `impact/CR-358-P4_IMPACT_ANALYSIS.md` (Gate 2 CLOSED 2026-09-04, OD-P4-01..10 locked, A-P4-01..10), approved mockup `frontend/public/cr358-p4-pms-mockup.html` (3 tabs, real probe data), tokens `control/PMS_DESIGN_TOKENS.md`, evidence `evidence/CR-358-P4/` (13 Gate-2 probes + 3 Gate-3 re-probes `P4_probe_G3_01..03`), `plans/CR-358_EXECUTION_PLAN_PHASED.md` §P4 + NS-B..NS-E
**Status:** PLAN WRITTEN — awaiting explicit **Gate 4 GO** (+ ack of SC-P4-01/02 and A-P4-11..16 defaults in §10).

---

## 0. Gate 3 entry re-verification (R11/R12 — executed 2026-09-04, alias OWNER_PREPROD, restaurant 69)

### 0.1 Baseline drift found and fixed (DEPLOYMENT action, owner-approved option (b))

| Finding | Detail |
|---|---|
| Local `/app/frontend/src` was **9 files behind remote `PMS1` head `0c3d3c0`** | P3 code (`FrontDeskPage/ArrivalsPage/DeparturesPage.jsx`, `components/pms/PmsCheckoutDrawer.jsx`, P3 blocks in `pmsService.js` + `aiosellTransform.js`, App.js P3 route re-point) and BUG-380 edits (`CheckInPage.jsx`, `NewBookingPage.jsx`) existed on remote only. Local git had **no remote configured**. |
| Cause | Previous session synced only `/memory` docs from the 2026-09-03 21:17 push ("no other action" per owner). |
| Fix | `git remote add origin` + `git fetch origin PMS1` + `git checkout origin/PMS1 -- <9 files>`. `git diff origin/PMS1 -- frontend/src` → **empty (in sync)**. Webpack compiled. `/pms/front-desk` renders real P3 page (`front-desk-page` testid present, live KPIs); `/pms/room-status` still `PmsPlaceholderPage phase=4`. |
| Local-only content preserved | Gate-2 P4 docs + 13 probe files (local is *ahead* on P4 docs; nothing lost). `.p4_token` kept per owner. |
| Residual (out of P4 scope — not touched) | `frontend/public/cr358-p3-design-comparison.html`: local = older skin (contains forbidden `#3B82F6`), remote = token-compliant v2.1. → OG-PMS-011 (closure item for P3). Platform junk on remote (`frontend/plugins/plugins/…`, `test_reports/iteration_*.json`, `.gitconfig`) ignored. |

### 0.2 Code reality + line references (post-sync)

| Check | Result |
|---|---|
| Code reality | **NONE** — `grep -rn "CR-358-P4\|RoomStatusPage\|ReservationsPage\|roomStatusTransform\|getRoomStatusBoard\|patchRoomStatus\|buildTapeChart" src` → 0 |
| `App.js` (274 L) | L97 comment `// CR-358-P1 (+P2 +P3 route re-point): PMS Module pages`; L100 `import PmsPlaceholderPage`; L103-105 P3 imports; **L262** `/pms/reservations` → `<PmsPlaceholderPage title="Tape Chart" phase={4} />`; **L263** `/pms/room-status` → `<PmsPlaceholderPage title="Room Status" phase={4} />` (IA said L259-260 pre-sync; corrected) |
| `pmsService.js` (223 L) | imports L4-9 (`getLocalReservations, getAiosellRooms, getAiosellStatus, fetchReservations, pushInventory` from aiosellService; `api`; `AIOSELL_ENDPOINTS`; `aiosellTransform`); `localDate` L20; `getBookableRooms` L79 (rooms/typeById pattern to mirror); `RES_WINDOW` L169; `bucketReservationOps` L172; `getReservationOps` L196 → `{ today, all, …buckets }`; `syncNow` L214-222; **EOF L223** (append point) |
| `aiosellTransform.js` (223 L) | `fromReservationOps` L157-187 → `roomLines[{ lineId, roomCode, tableNo, restaurantTableId, orderId, paymentStatus, lineStatus, checkedInAt, checkedOutAt, adults, children, guestName }]`; base fields `bookingId, channel, guestName, checkin, checkout, nights, operationalStatus, roomCode, mealPlan, amount, pah`. **NOT modified by P4.** |
| Join key (T6 + G3-02) | Raw API `reservations[].rooms[].restaurant_table_id` ⇒ transformed model **`roomLines[].restaurantTableId`** (the IA's "NOT roomLines" note referred to the *raw* response; in the transformed model the key IS `roomLines[].restaurantTableId`). Join target: `localRooms[].id` from `aiosellTransform.fromAPI.rooms()` (`getBookableRooms` precedent L84-92). |
| `aiosellService.js` | `getAiosellRooms()` L48 → `res.data` (raw); `getLocalReservations({startDate,endDate})` L115 — reused, unchanged |
| `constants.js` | `AIOSELL_ENDPOINTS.ROOM_STATUS` **L586** `/api/v2/vendoremployee/aiosell/room-status`; `ROOM_STATUS_BOARD` **L587** — present, unused until P4, **unchanged** |
| `api/axios.js` | `axios.create({ baseURL })` L11, Bearer from `localStorage.auth_token` L27, **no `withCredentials`** (matters for CORS wildcard, §0.3). `api.patch()` has **no precedent in src/** — P4 is the first PATCH consumer |
| Page shell precedent | `FrontDeskPage.jsx` L135-150: `<div className="flex h-screen bg-[#F7F7F7]" data-testid=…>` + `<Sidebar isExpanded setIsExpanded>` (persists `mygenie_sidebar_expanded`) + `<main className="flex-1 overflow-auto">` + white header `border-b border-[#E5E5E5] px-6 py-4`, Poppins h1 18px, `#329937` CTA. `Promise.allSettled` load pattern L62-75. Imports via `@/…` alias. `toast` from sonner; icons lucide-react |
| Deep-link precedents | `/pms/check-in?booking_id=` handled by `CheckInPage.jsx` L17/L67 (`useSearchParams`); `/reports/room-orders` route exists (App.js L153) |
| Tests precedent | `src/api/transforms/__tests__/*.test.js` (+ `fixtures/`), `yarn test` = `craco test` |
| Conflict pre-check (registry ACTIVE items) | `pmsService.js`: last CR-358-P3 (GATE 4 DONE, awaiting QA) → **append-only, parallel-safe**. `App.js`: CR-117 GATE_5_PENDING_QA (report route, different lines) + CR-358-P3 (L103-105, L259-261) → P4 touches only L100-105 region (+2 imports) and L262-263 → **parallel-safe**. New files: none registered by any other item. **CLEAR.** |

### 0.3 Fresh probes (G3-01..03, masked, `evidence/CR-358-P4/P4_probe_G3_*.json`)

| Probe | Result vs IA contract |
|---|---|
| G3-01 `GET room-status-board` | 200. `auto_hk_on_rm_checkout:true`. 5 RM rooms: r3 8524 suite **occupied** (guest, res null) · r4 8525 suite **booked** (res BDC7497606 09-07→09-09) · r2 8526 executive **occupied** with `manual_status:"hk"` (display wins — A-P4-07 confirmed again) · r5 8527 suite **booked** · r1 8528 executive **hk** (`op_at` set). **Shape unchanged.** |
| G3-02 `GET local-reservations` today−60…+30 | 200, 15 reservations: 7 departed / 6 pending / 2 in_house. Channels `Direct` 8, `booking.com` 5, **`WalkIn` 2** (A-P4-05 label source). Every reservation has exactly 1 `rooms[]` line. **5 pending reservations have no `restaurant_table_id`** (unassigned). `line_status` ∈ {checked_out, pending, checked_in}. **Shape unchanged.** |
| G3-03 `GET rooms` | `local_rooms` 8524 r3 · 8525 r4 · 8526 r2 · 8527 r5 · 8528 r1; `mappings` 8524/8525/8527 → `suite`, 8526/8528 → `executive`. |
| **CORS preflight** `OPTIONS room-status/8528` (Origin = preview URL, Request-Method PATCH) | 200 with **duplicated** headers `access-control-allow-methods: *` **and** `GET, POST, OPTIONS, PUT, DELETE` (PATCH not listed explicitly), `allow-origin: *`, `allow-headers: *` + explicit list. Per Fetch spec the `*` wildcard is honoured because the request is **not credentialed** (`withCredentials` unset) ⇒ PATCH expected to pass. **Unverified from a real browser → V-B0 is the first Gate-4 milestone** (see §6 step 2, §8 R1). Fallback = BACKEND_BRIEF (add `PATCH` to allow-methods); no safe FE workaround. |
| Semantic cross-check S2 vs S7 | Bookings BDC7497606 / BDC6263973 are **unassigned** in `local-reservations` (no table) yet the board shows r4/r5 as **booked** (server picks a room of the matching `room_code`). ⇒ S2 lists them under *Unassigned* while S7 shows Booked tiles — **matches the approved mockup** (Unassigned section + r4/r5 Booked). Documented as A-P4-12. |
| Server clock | Board `op_at` = 2026-09-04 while pod local date = 2026-09-03 → "today" must be **browser-local** (`localDate()`, P3 A-05), never derived from server timestamps. |

---

## 1. Scope corrections surfaced at Gate 3 (owner ack with Gate 4 GO)

**SC-P4-01 — `App.js` 2-route re-point + 2 imports (4 lines, same pattern as SC-P3-01).** IA §4 said "2 lines"; the two page imports make it 4. `PmsPlaceholderPage` import stays (still used? → **No**: after P4 no route uses it. Import becomes unused → ESLint `no-unused-vars` warning). Decision embedded: **remove the `PmsPlaceholderPage` import line (L100) as part of Edit 6** so webpack stays at 0 new warnings; the component file itself is NOT deleted (P5 may re-use; FILE_OWNERSHIP unchanged). Net App.js diff: +2 imports, −1 import, 2 element swaps, 1 comment tweak = **6 lines**.

```
OWNER APPROVAL REQUIRED
Reason: App.js is P1-frozen; 2 existing PMS routes must swap PmsPlaceholderPage → real pages; 1 now-unused import removed (6 lines total).
Risk: MEDIUM (item) / LOW (this edit)
Proposed next step: Owner says "Gate 4 GO" accepting SC-P4-01 → Implementation executes Edit 6.
I will not proceed until owner approves.
```

**SC-P4-02 — 2 NEW unit-test files** (owner picked unit tests at Gate-3 kickoff): `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` and `src/api/services/__tests__/pmsService.tapeChart.cr358p4.test.js` (+ 1 fixture JSON copied from masked probe G3-02). These are test-only files (not shipped in build); listed in scope lock for completeness.

**SC-P4-03 — pure tape-chart layout function lives in `pmsService.js`** (`buildTapeChart`, exported, unit-testable) rather than a 4th new transform file — mirrors P3's `bucketReservationOps` precedent and keeps the IA's 3-new-files count. `roomStatusTransform.js` remains the only new transform.

---

## 2. Scope lock (R14)

### Files WILL change

| # | File | Type | Est. lines | Risk |
|---|---|---|---|---|
| F1 | `src/api/transforms/roomStatusTransform.js` | **NEW** — `fromRoomStatusBoard`, `fromPatchResponse`, `patchErrorMessage`, `ROOM_MANUAL_STATUSES` | ~80 | LOW |
| F2 | `src/api/services/pmsService.js` | EXTEND (append Phase-4 block: +1 import, +5 exports) | +110 | MEDIUM (hotspot, append-only) |
| F3 | `src/pages/pms/ReservationsPage.jsx` | **NEW** — S2 Tape Chart | ~380 | MEDIUM |
| F4 | `src/pages/pms/RoomStatusPage.jsx` | **NEW** — S7 Room Status Board | ~340 | MEDIUM (PATCH mutations) |
| F5 | `src/App.js` | 6-line route re-point (SC-P4-01) | +2 / −1 / ~3 | LOW (edit) |
| T1 | `src/api/transforms/__tests__/roomStatusTransform.cr358p4.test.js` | **NEW** test | ~90 | — |
| T2 | `src/api/services/__tests__/pmsService.tapeChart.cr358p4.test.js` | **NEW** test | ~120 | — |
| T3 | `src/api/transforms/__tests__/fixtures/cr358p4_local_reservations.json` | **NEW** fixture (masked copy of `P4_probe_G3_02_lr.json` body) | data | — |

Estimated new LOC ≈ 910 app + 210 test (IA estimate 600-700 app; growth = popover, filters, bulk-clean state machine, unassigned section).

### Files WILL NOT touch

`api/transforms/aiosellTransform.js` · `api/services/aiosellService.js` · `api/services/roomService.js` · `api/constants.js` (endpoints already present) · `api/axios.js` · `components/order-entry/CollectPaymentPanel.jsx` · `components/pms/PmsCheckoutDrawer.jsx` · `pages/pms/FrontDeskPage.jsx` · `pages/pms/ArrivalsPage.jsx` · `pages/pms/DeparturesPage.jsx` · `pages/pms/NewBookingPage.jsx` · `pages/pms/CheckInPage.jsx` · `pages/pms/InHouseGuestsPage.jsx` · `pages/pms/ChannelManagerPage.jsx` · `pages/pms/PmsPlaceholderPage.jsx` (file kept; only its App.js import goes) · `components/layout/Sidebar.jsx` (links `/pms/reservations`, `/pms/room-status` already exist) · `pages/DashboardPage.jsx` · `AppProviders.jsx` · `api/socket/*` · any localStorage key · `public/cr358-p4-pms-mockup.html` · `public/cr358-p3-design-comparison.html` · anything under `memory/final/`.

If any of these must change → STOP, re-declare, get owner confirmation (R14).

---

## 3. Decisions applied (frozen — do not re-open) + assumptions

### 3.1 Owner decisions (IA, all locked)

| ID | Applied as |
|---|---|
| OD-P4-01 | `patchRoomStatus(tableId, status)` → `api.patch(`${ROOM_STATUS}/${id}`, { status })`, `status ∈ {'hk','ooo','available'}` (client-guarded, throws otherwise) |
| OD-P4-02 | S2 data = `getReservationOps().all` (existing 60/30 window, **0 new reservation calls**) + `getAiosellRooms()` (room catalog, already used by P2). No board call on S2 (see A-P4-14). |
| OD-P4-03 | Occupied tile: HK/OOO buttons rendered **disabled** with `title="Cannot change while occupied"`; `patchRoomStatus` never called for `display_status==='occupied'`. 422 from backend still handled (defensive). |
| OD-P4-04 | Block click → **popover** (guest, channel · bookingId, dates · nights, room, status, PAH/Prepaid). Actions: `kind==='pending'` → **Check In** → `/pms/check-in?booking_id=<encoded>`; `kind==='in_house' && line.orderId` → **View Folio** → `/reports/room-orders`; else info-only. |
| OD-P4-05 | Unassigned row: **Assign Room** button `disabled` + `title="Coming in Phase 5"` |
| OD-P4-06 | Available tile: **+ Book Room** → `/pms/new-booking` |
| OD-P4-07 | Booked tile: **Check In** (green) → `/pms/check-in?booking_id=<reservation.bookingId>`; secondary **Details** (popover info-only) |
| OD-P4-08 | Booked tiles: **no** HK/OOO toggles |
| OD-P4-09 | Mark All Clean: sequential PATCH per HK room, **continue on error**, single summary toast: `"N rooms marked clean"` / `"N cleaned, M failed"` (+ first failure message) |
| OD-P4-10 | OOO PATCH allowed; `inventory_push_warning` non-null → `toast.warning('Status saved. Inventory sync warning: <msg>')` (A-P4-10) |

### 3.2 IA presentation assumptions A-P4-01..10 (apply unchanged)

7-day default window starting today−2 (A-01) · step = ½ window (A-02) · departed = muted blocks (A-03) · one block per `roomLines[]` entry (A-04) · `channel==='WalkIn'` → label "Walk-in" (A-05) · blocks clipped at window edges (A-06) · UI state from `display_status` only (A-07) · refetch board after every PATCH, no optimistic update (A-08) · bulk toast copy (A-09) · warning toast on non-null `inventory_push_warning` (A-10).

### 3.3 New assumptions at Gate 3 (owner may override with Gate 4 GO; else they apply)

| ID | Assumption | Default |
|---|---|---|
| A-P4-11 | View toggle labels | **7d · 14d · 30d** (IA V7). Mockup's "Month" = 30d. Selected view persisted in component state only (no localStorage — R8). |
| A-P4-12 | Unassigned section membership | `operationalStatus === 'pending'` AND no `roomLines[]` entry with `restaurantTableId`, within window. Grouped label uses `roomCode` ("Suite (no room)"). Departed/in-house always have a table → never unassigned. A booking may show *Unassigned* in S2 while S7 shows a *Booked* tile for the same booking (server assigns by room code) — expected, per mockup. |
| A-P4-13 | Block span = **nights** | columns `checkin … checkout−1` (hotel convention; mockup Sep4-5 = 1 column). `span = max(1, days(checkout − checkin))`. Same-day walk-in → 1 column. |
| A-P4-14 | S2 room-row badge | Derived client-side (OD-P4-02 = 0 new calls): `in_house` line covering today → "Occupied"; pending block covering today → "Booked"; else none. **HK/OOO are S7-only** (not shown on S2). Override option: owner may allow `getRoomStatusBoard()` on S2 (+1 GET) to show server `display_status` badges — say so at Gate 4. |
| A-P4-15 | Block kind & colour | `line.lineStatus==='checked_in'` → in-house (`#329937` left bar, green tint); `'checked_out'` → departed (`#888`, opacity .65); else pending (`#F26B33`). Unassigned pending → dashed border, `#F26B33` bar for Direct/Walk-in, `#003580`-free: **use `#888` bar for OTA** (the mockup's booking.com brand blue `#003580` and legend indigo `#6366F1` are NOT in `PMS_DESIGN_TOKENS.md` → replaced by neutral `#888` + dashed border). No favicons from google.com (no external requests). |
| A-P4-16 | Auto-HK indicator (V17) | Toolbar pill "Auto-HK on checkout: ON/OFF" from `autoHkOnRmCheckout`; **info-only** (OG-PMS-010 backend behaviour unverified — not P4's to fix). |
| A-P4-17 | Refresh & staleness | Manual Refresh icon on both pages + refetch on `visibilitychange==='visible'` (P3 A-10 parity, no sockets). |
| A-P4-18 | Row grouping S2 | Group header per `roomType` (`aiosellRoomCode`, capitalised) → "Executive — r1, r2", "Suite — r3, r4, r5"; rooms with no mapping → group "Unmapped". Sort rooms by `tableNo` natural order. |
| A-P4-19 | Filter chips S7 | All · Occupied · Booked · HK · OOO · Available with live counts (from `display_status`); default All; selected chip = `#1A1A1A` fill (mockup). |
| A-P4-20 | Busy state | While any PATCH in flight: that tile's buttons disabled + `Loader2`; Mark All Clean disabled during bulk; Refresh disabled during load. |

---

## 4. API contracts (frozen for IMPL; re-probe if >7 days elapse before coding — R12)

### 4.1 `GET AIOSELL_ENDPOINTS.ROOM_STATUS_BOARD` — 200 (G3-01)
`{ status:true, message, data:{ auto_hk_on_rm_checkout:bool, rooms:[{ restaurant_table_id:int, table_no:str, title:str|null, aiosell_room_code:str|null, manual_status:'hk'|'ooo'|null, display_status:'available'|'occupied'|'booked'|'hk'|'ooo', room_operational_status_at:'YYYY-MM-DD HH:MM:SS'|null, guest:{ name, phone, email, booking_id, order_id }|null, reservation:{ booking_id, channel, checkin, checkout, guest_name, room_code, reservation_room_id }|null }] } }`. Server precedence `occupied > ooo > hk > booked > available`.

### 4.2 `PATCH AIOSELL_ENDPOINTS.ROOM_STATUS + '/' + restaurant_table_id` body `{ status:'hk'|'ooo'|'available' }`
- 200: `{ status:true, message, data:{ room:{ restaurant_table_id, table_no, title, manual_status, room_operational_status_at }, inventory_push_warning:null|string } }` — **no `display_status`** → refetch board (A-P4-08).
- 422 occupied: `{ status:false, message:"Cannot set HK/OOO while the room is occupied." }`
- 422 bad status: `{ status:false, errors:{ status:["The selected status is invalid."] } }`
- 422 bad id: `{ status:false, message:"Room not found for this restaurant (must be rtype=RM)." }`
- Error text resolver (F1 `patchErrorMessage`): `data.message ?? data.errors?.status?.[0] ?? err.readableMessage ?? err.message ?? 'Status update failed'`.

### 4.3 `GET LOCAL_RESERVATIONS` (via `getReservationOps()`) — 200 (G3-02) — unchanged P3 contract §4.1 of P3 plan; transformed by `fromReservationOps`.

### 4.4 `GET ROOMS` (via `getAiosellRooms()`) — 200 (G3-03) → `aiosellTransform.fromAPI.rooms()` → `localRooms[{id,tableNo,areaName}]`, `mappings[{restaurantTableId, aiosellRoomCode}]`.

---

## 5. Exact edits

### Edit 1 — NEW `src/api/transforms/roomStatusTransform.js` (F1)
```js
// CR-358-P4: Room Status Board transforms — GET /aiosell/room-status-board + PATCH /aiosell/room-status/{id}
// Single-endpoint design (phased plan NS-B). UI state MUST use displayStatus (server precedence), never manualStatus (A-P4-07).
export const ROOM_MANUAL_STATUSES = ['hk', 'ooo', 'available'];   // OD-P4-01
export const DISPLAY_STATUSES     = ['available', 'occupied', 'booked', 'hk', 'ooo'];

const fromBoardRoom = (r) => {
  const x = r ?? {};
  const g = x.guest ?? null;
  const v = x.reservation ?? null;
  return {
    id:            x.restaurant_table_id ?? null,
    tableNo:       x.table_no ?? String(x.restaurant_table_id ?? ''),
    title:         x.title ?? null,
    roomType:      x.aiosell_room_code ?? null,
    manualStatus:  x.manual_status ?? null,                 // 'hk' | 'ooo' | null (informational only)
    displayStatus: DISPLAY_STATUSES.includes(x.display_status) ? x.display_status : 'available',
    statusSince:   x.room_operational_status_at ?? null,    // 'YYYY-MM-DD HH:MM:SS' | null
    guest: g ? { name: g.name ?? '', bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null,  // phone/email intentionally dropped (R20 — not needed by S7)
    reservation: v ? { bookingId: v.booking_id ?? null, channel: v.channel ?? null, checkin: v.checkin ?? null,
                       checkout: v.checkout ?? null, guestName: v.guest_name ?? '', roomCode: v.room_code ?? null } : null,
    canToggle: x.display_status !== 'occupied' && x.display_status !== 'booked',   // OD-P4-03 + OD-P4-08
  };
};

export const fromRoomStatusBoard = (data) => {
  const d = data?.data ?? data ?? {};
  const rooms = Array.isArray(d.rooms) ? d.rooms.map(fromBoardRoom) : [];
  const counts = DISPLAY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: rooms.filter(r => r.displayStatus === s).length }), { all: rooms.length });
  return { autoHkOnRmCheckout: Boolean(d.auto_hk_on_rm_checkout), rooms, counts };
};

export const fromPatchResponse = (data) => {
  const d = data?.data ?? {};
  return {
    message:              data?.message ?? '',
    room:                 d.room ? { id: d.room.restaurant_table_id ?? null, manualStatus: d.room.manual_status ?? null, statusSince: d.room.room_operational_status_at ?? null } : null,
    inventoryPushWarning: d.inventory_push_warning ?? null,   // A-P4-10
  };
};

/** Resolve a human message from PATCH 422/5xx (T4: shapes differ per case). */
export const patchErrorMessage = (err) => {
  const data = err?.response?.data ?? {};
  return data.message ?? data.errors?.status?.[0] ?? err?.readableMessage ?? err?.message ?? 'Status update failed';
};

const roomStatusTransform = { fromRoomStatusBoard, fromPatchResponse, patchErrorMessage, ROOM_MANUAL_STATUSES, DISPLAY_STATUSES };
export default roomStatusTransform;
```
Note: `guest.phone/email` deliberately **not** carried into the model — S7 tile shows name + booking id only (mockup), so no PII reaches component state/logs (R20).

### Edit 2 — `pmsService.js` — import (after L9) + append Phase-4 block (EOF, after L222)
Header L1 → `// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3 | CR-358-P4: PMS aggregation + booking/check-in + reservation-ops + room-status/tape-chart service`.
After L9:
```js
import roomStatusTransform, { ROOM_MANUAL_STATUSES } from '../transforms/roomStatusTransform'; // CR-358-P4
```
Append at EOF:
```js
// ─── Phase 4 (CR-358-P4) ─────────────────────────────────────────────────────

/** S7: board → normalized tiles + counts + auto-HK flag (single endpoint, NS-B) */
export const getRoomStatusBoard = async () => {
  const res = await api.get(AIOSELL_ENDPOINTS.ROOM_STATUS_BOARD);
  return roomStatusTransform.fromRoomStatusBoard(res.data);
};

/** S7: PATCH manual status (OD-P4-01). Caller MUST refetch board afterwards (A-P4-08). Throws axios error on 422/5xx. */
export const patchRoomStatus = async (tableId, status) => {
  if (!ROOM_MANUAL_STATUSES.includes(status)) {
    throw new Error(`[CR-358-P4] patchRoomStatus: status must be one of ${ROOM_MANUAL_STATUSES.join('|')}`);
  }
  const res = await api.patch(`${AIOSELL_ENDPOINTS.ROOM_STATUS}/${Number(tableId)}`, { status });
  return roomStatusTransform.fromPatchResponse(res.data);
};

/** S7 bulk Mark All Clean (OD-P4-09): sequential, continue on error, never throws. */
export const bulkMarkClean = async (tableIds) => {
  const out = { ok: [], failed: [], warnings: [] };
  for (const id of tableIds) {
    try {
      const r = await patchRoomStatus(id, 'available');
      out.ok.push(id);
      if (r.inventoryPushWarning) out.warnings.push({ id, message: r.inventoryPushWarning });
    } catch (e) {
      out.failed.push({ id, message: roomStatusTransform.patchErrorMessage(e) });
    }
  }
  return out;
};

/** Date helpers for the tape chart (pure, local calendar, 'YYYY-MM-DD') */
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

const blockKind = (line) => (line.lineStatus === 'checked_in' ? 'in_house' : line.lineStatus === 'checked_out' ? 'departed' : 'pending'); // A-P4-15

/**
 * S2 pure layout (exported for unit tests V-U*). Join key: roomLines[].restaurantTableId ↔ rooms[].id (T6).
 * Blocks span nights (A-P4-13), clipped to window (A-P4-06). Unassigned = pending with no table (A-P4-12).
 */
export const buildTapeChart = ({ rooms, reservations, startDate, days, today }) => {
  const endExclusive = addDays(startDate, days);
  const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i));
  const byRoom = Object.fromEntries(rooms.map(r => [r.id, []]));
  const unassigned = [];
  reservations.forEach(res => {
    if (!res.checkin || !res.checkout) return;
    const ci = res.checkin, co = res.checkout <= res.checkin ? addDays(res.checkin, 1) : res.checkout;   // same-day → 1 night
    if (co <= startDate || ci >= endExclusive) return;                                                   // outside window
    const lines = (res.roomLines ?? []).filter(l => l.restaurantTableId != null);
    if (lines.length === 0) { if (res.operationalStatus === 'pending') unassigned.push(res); return; }
    lines.forEach(l => {
      if (!byRoom[l.restaurantTableId]) return;                     // not an RM room in catalog → skip
      const s = ci < startDate ? startDate : ci;
      const e = co > endExclusive ? endExclusive : co;
      byRoom[l.restaurantTableId].push({
        key: `${res.bookingId ?? res.id}-${l.lineId}`, res, line: l, kind: blockKind(l),
        startIdx: dayDiff(startDate, s), span: Math.max(1, dayDiff(s, e)),
        clippedStart: ci < startDate, clippedEnd: co > endExclusive,
      });
    });
  });
  // A-P4-14: derived row badge (S2 has no board call)
  const rowStatus = Object.fromEntries(rooms.map(r => {
    const blocks = byRoom[r.id] ?? [];
    const covers = (b) => b.res.checkin <= today && today < (b.res.checkout <= b.res.checkin ? addDays(b.res.checkin, 1) : b.res.checkout);
    if (blocks.some(b => b.kind === 'in_house')) return [r.id, 'occupied'];
    if (blocks.some(b => b.kind === 'pending' && covers(b))) return [r.id, 'booked'];
    return [r.id, null];
  }));
  const groups = Object.values(rooms.reduce((acc, r) => {
    const k = r.roomType ?? 'unmapped';
    (acc[k] ??= { type: k, rooms: [] }).rooms.push(r);
    return acc;
  }, {})).map(g => ({ ...g, rooms: g.rooms.sort((a, b) => String(a.tableNo).localeCompare(String(b.tableNo), undefined, { numeric: true })) }));  // A-P4-18
  return { dates, byRoom, unassigned, rowStatus, groups, todayIdx: dayDiff(startDate, today) };
};

/** S2 data: reuse P3 ops fetch (OD-P4-02) + room catalog (P2 pattern). 0 new reservation endpoints. */
export const getTapeChartData = async () => {
  const [ops, raw] = await Promise.all([getReservationOps(), getAiosellRooms()]);
  const catalog = aiosellTransform.fromAPI.rooms(raw?.data ?? raw);
  const typeById = Object.fromEntries(catalog.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  const rooms = catalog.localRooms.map(r => ({ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null }));
  return { today: ops.today, reservations: ops.all, rooms };
};
```
Exports after edit: previous 11 + `getRoomStatusBoard`, `patchRoomStatus`, `bulkMarkClean`, `buildTapeChart`, `getTapeChartData`. Bodies of all existing exports unchanged (V-G6).

### Edit 3 — NEW `src/pages/pms/ReservationsPage.jsx` (F3, S2 Tape Chart, ~380 lines)
Header: `// CR-358-P4: S2 — Tape Chart (rooms × dates Gantt; reuses getReservationOps via getTapeChartData — OD-P4-02; block popover OD-P4-04; unassigned OD-P4-05)`
Shell = `FrontDeskPage.jsx` L135-150 pattern (Sidebar + `<main>` + white header). Fonts/colours only from `PMS_DESIGN_TOKENS.md`.

State: `data` (`{today, reservations, rooms}`), `loading`, `error`, `days` (7|14|30, default 7 — A-P4-01/11), `startDate` (default `localDate(-2)`), `popover` (`{ block, anchorRect } | null`). `chart = useMemo(() => data && buildTapeChart({ ...data, startDate, days, today: data.today }), [data, startDate, days])`.

| Block | Spec | data-testid |
|---|---|---|
| Header | title "Reservations · Tape Chart"; sub `<long date> · <restaurant name>`; right: **New Booking** (`#329937`) → `/pms/new-booking`; Refresh icon (A-P4-17) | `reservations-page`, `tc-new-booking-btn`, `tc-refresh-btn` |
| Toolbar | view toggle `7d · 14d · 30d` (selected `#1A1A1A` fill); `‹ Prev` / **Today** / `Next ›` (step = `days/2` rounded — A-P4-02; Today → `startDate = localDate(-2)`); range label `"2 Sep – 8 Sep 2026"`; legend In-house / Pending / Departed / Unassigned (A-P4-15 colours) | `tc-view-7d`, `tc-view-14d`, `tc-view-30d`, `tc-prev-btn`, `tc-today-btn`, `tc-next-btn`, `tc-range-label`, `tc-legend` |
| Grid | `<table table-layout:fixed>`; col 1 room (160px sticky-left), N date cols (`108px` for 7d, `64px` 14d, `36px` 30d) with `DOW` + day number; today column header `TODAY` orange pill + `rgba(50,153,55,.03)` column tint; `thead` sticky top; horizontal scroll wrapper | `tc-grid`, `tc-day-col-<yyyy-mm-dd>`, `tc-today-col` |
| Unassigned section | first rows when `chart.unassigned.length > 0`: group header "Unassigned Bookings (N)"; one row per reservation: left cell `"<RoomCode> (no room)"` + **Assign Room** `disabled title="Coming in Phase 5"` (OD-P4-05); dashed block positioned by checkin/checkout with `channelLabel · <nights>N` + short bookingId | `tc-unassigned-header`, `tc-unassigned-row-<bookingId>`, `tc-assign-room-btn-<bookingId>` |
| Room groups | header row per `chart.groups` → "Executive — r1, r2"; room row: `tableNo` bold, sub `<Type> · id <id>`, derived badge Occupied/Booked (A-P4-14) | `tc-group-<type>`, `tc-room-row-<id>`, `tc-room-badge-<id>` |
| Blocks | absolutely positioned inside the row's date-cells strip: `left = startIdx*colW+2`, `width = span*colW-4`; kind colours A-P4-15; label `guestName · <nights>N` (in-house: `guestName ✓`), OTA/Direct/Walk-in glyph; clipped edges rendered square (no radius) | `tc-block-<bookingId>-<lineId>` |
| Popover (OD-P4-04) | anchored card (`#fff`, border `#E5E5E5`, shadow): guest name, `channelLabel · bookingId`, `checkin → checkout · N nights`, room `tableNo (roomCode)`, status pill (Pending / In-house / Departed), PAH/Prepaid badge (P3 rule), amount `₹`; actions: pending → **Check In**; in_house with `line.orderId` → **View Folio**; departed/no order → none (info only); close on outside click / ESC | `tc-popover`, `tc-popover-checkin-btn`, `tc-popover-folio-btn`, `tc-popover-close` |
| States | loading `Loader2`; error `AlertCircle` + Retry; empty grid (no rooms) "No RM rooms mapped — open Channel Manager" link | `tc-loading`, `tc-error`, `tc-empty` |

Helpers (local to file): `channelLabel = (c) => c === 'WalkIn' ? 'Walk-in' : (c ?? '—')` (A-P4-05); `fmtRange(dates)`; `nights(res)` = `res.nights ?? 1`. Imports: `getTapeChartData, buildTapeChart, localDate` from `@/api/services/pmsService`; `useRestaurant`; lucide `Plus, RefreshCw, ChevronLeft, ChevronRight, Loader2, AlertCircle, LogIn, FileText, X, Phone, Globe`; `toast`; `useNavigate`.

### Edit 4 — NEW `src/pages/pms/RoomStatusPage.jsx` (F4, S7 Room Status Board, ~340 lines)
Header: `// CR-358-P4: S7 — Room Status Board (GET room-status-board; PATCH hk/ooo/available OD-P4-01; occupied guard OD-P4-03; bulk Mark All Clean OD-P4-09; refetch after PATCH A-P4-08)`

State: `board` (`{autoHkOnRmCheckout, rooms, counts}`), `loading`, `error`, `filter` ('all'|displayStatus, default 'all' — A-P4-19), `busyId` (tile id with PATCH in flight), `bulkBusy`.

| Block | Spec | data-testid |
|---|---|---|
| Header | title "Room Status Board"; sub `<long date> · <restaurant name>`; right: Refresh | `room-status-page`, `rs-refresh-btn` |
| Toolbar | filter chips `All N · Occupied n · Booked n · HK n · OOO n · Available n` (counts from `board.counts`; OOO chip red text `#EF4444`, HK amber); divider; **Mark All Clean (n HK)** amber, `disabled` when `counts.hk===0 \|\| bulkBusy`; Auto-HK pill "Auto-HK on checkout: ON/OFF" (A-P4-16) | `rs-filter-all`, `rs-filter-occupied`, `rs-filter-booked`, `rs-filter-hk`, `rs-filter-ooo`, `rs-filter-available`, `rs-bulk-clean-btn`, `rs-auto-hk-pill` |
| Grid | `grid grid-cols-5 gap-3.5` (≥xl), `grid-cols-3` (lg), `grid-cols-2` (md); tiles = `board.rooms.filter(filter)` sorted by `tableNo` natural | `rs-grid` |
| Tile (all) | 4px top bar by status (`occupied #F26B33`, `booked #888` w/ dashed border, `hk #F59E0B`, `ooo #EF4444`, `available #329937`); `tableNo` 20px Poppins bold; sub `<Type> · id <id>`; status badge top-right | `rs-tile-<id>`, `rs-tile-badge-<id>` |
| Tile occupied | `guest.name`, `bookingId` short, "Checked in" (no dates on board → omit); actions: **HK** + **OOO** both `disabled title="Cannot change while occupied"` (OD-P4-03); **View Folio** (orange outline) → `/reports/room-orders` when `guest.orderId` | `rs-hk-btn-<id>`, `rs-ooo-btn-<id>`, `rs-folio-btn-<id>` |
| Tile booked | `reservation.guestName`, `channelLabel · bookingId`, `checkin – checkout (arriving)`; actions: **Check In** (green) → `/pms/check-in?booking_id=` (OD-P4-07); no HK/OOO (OD-P4-08) | `rs-checkin-btn-<id>` |
| Tile hk | "Needs housekeeping" + amber `Since <statusSince>`; actions: **Mark Clean** (green) → PATCH `available`; **Mark OOO** (red outline) → PATCH `ooo` | `rs-clean-btn-<id>`, `rs-ooo-btn-<id>` |
| Tile ooo | "Out of order" + red `Since <statusSince>`; actions: **Back in Service** (green) → PATCH `available`; **Needs HK** (amber) → PATCH `hk` | `rs-available-btn-<id>`, `rs-hk-btn-<id>` |
| Tile available | "Ready"; actions: **+ Book Room** (green) → `/pms/new-booking` (OD-P4-06); **Needs HK** (amber) → PATCH `hk`; **Mark OOO** (red outline) → PATCH `ooo` | `rs-book-btn-<id>`, `rs-hk-btn-<id>`, `rs-ooo-btn-<id>` |
| States | loading / error+retry / empty filter "No rooms in this state" | `rs-loading`, `rs-error`, `rs-empty` |

Mutation flow (single): `setBusyId(id)` → `patchRoomStatus(id, status)` → `toast.success(res.message || 'Room status updated')`; if `res.inventoryPushWarning` → `toast.warning(...)` (A-P4-10) → `await load()` (A-P4-08) → `setBusyId(null)`; catch → `toast.error(patchErrorMessage(err))` → `await load()` (board may have changed server-side). Bulk: `setBulkBusy(true)` → `bulkMarkClean(hkIds)` → toast per OD-P4-09 (`failed.length ? toast.warning(\`${ok.length} cleaned, ${failed.length} failed — ${failed[0].message}\`) : toast.success(\`${ok.length} rooms marked clean\`)`) → `load()`. No optimistic updates anywhere. Imports: `getRoomStatusBoard, patchRoomStatus, bulkMarkClean` from pmsService; `patchErrorMessage` from `@/api/transforms/roomStatusTransform`; lucide `RefreshCw, Loader2, AlertCircle, Brush, AlertTriangle, Check, Sparkles, Zap, LogIn, FileText, Plus, Clock, Info`.

### Edit 5 — tests (T1-T3, SC-P4-02)
**T1 `roomStatusTransform.cr358p4.test.js`:** (a) probe-G3-01-shaped fixture inline → 5 rooms, `counts {all:5, occupied:2, booked:2, hk:1, ooo:0, available:0}`, `autoHkOnRmCheckout:true`; (b) r2 `manual_status:'hk'` + `display_status:'occupied'` → `displayStatus:'occupied'`, `canToggle:false`; (c) booked → `canToggle:false`; hk/available/ooo → `true`; (d) guest phone/email absent from model; (e) `fromPatchResponse` 200 body → `inventoryPushWarning:null`, `room.manualStatus:'hk'`; (f) `patchErrorMessage` for the 3 T4 shapes + generic error; (g) `{}` → `rooms:[]`, counts all 0.
**T2 `pmsService.tapeChart.cr358p4.test.js`:** import `buildTapeChart` (pure; mock nothing). Fixture T3 mapped through `aiosellTransform.fromAPI.reservationOps`; rooms = G3-03 catalog. `startDate='2026-09-02', days=7, today='2026-09-04'`: (a) `dates.length===7`, `todayIdx===2`; (b) 5 pending-no-table reservations → `unassigned` contains BDC7497606 + BDC6263973 (+ others in window) and none appear in `byRoom`; (c) in_house line r2 → block `kind:'in_house'`, `rowStatus[8526]==='occupied'`; (d) departed lines → `kind:'departed'`; (e) reservation ending before window / starting after → excluded; (f) reservation crossing window start → `clippedStart:true`, `startIdx:0`; (g) same-day checkin=checkout → `span:1`; (h) groups → `executive:[r1,r2]`, `suite:[r3,r4,r5]` (natural sort); (i) unknown `restaurantTableId` (e.g. 999) → skipped silently.
**T3 fixture:** `cr358p4_local_reservations.json` = `body` of `P4_probe_G3_02_lr.json` (already masked `***`).

### Edit 6 — `App.js` (SC-P4-01) — 6 lines
L97 comment → `// CR-358-P1 (+P2 +P3 +P4 route re-point): PMS Module pages`.
**Remove** L100 `import PmsPlaceholderPage  from './pages/pms/PmsPlaceholderPage';` (unused after this edit).
After L105 add:
```js
import ReservationsPage    from './pages/pms/ReservationsPage'; // CR-358-P4
import RoomStatusPage      from './pages/pms/RoomStatusPage';   // CR-358-P4
```
L262-263 element swap only (path/order unchanged):
```jsx
<Route path="/pms/reservations"    element={<ProtectedRoute><ReservationsPage /></ProtectedRoute>} /> {/* CR-358-P4 */}
<Route path="/pms/room-status"     element={<ProtectedRoute><RoomStatusPage /></ProtectedRoute>} />   {/* CR-358-P4 */}
```
Guard: `grep -n "PmsPlaceholderPage" src/App.js` → 0 after edit; `grep -rn "PmsPlaceholderPage" src/ --include=*.jsx -l` → only the component file itself.

---

## 6. Execution sequence (IMPL agent)

1. **Entry verification (Step 0):** confirm §0.2 line refs (App.js L97/L100/L105/L262-263; pmsService EOF L223; constants L586-587). If >7 days since 2026-09-04 → re-run G3-01..03 + CORS preflight. Confirm `git diff origin/PMS1 -- frontend/src` is empty before starting.
2. **V-B0 CORS milestone (before any UI):** from the running app's browser console (logged in), run one `api.patch(ROOM_STATUS + '/8528', { status:'hk' })` equivalent via DevTools (or a 10-line temporary call inside Edit 2's `patchRoomStatus` smoke) → expect 200 and no CORS error. If blocked → STOP, write `backend_briefs/BACKEND_BRIEF_CR-358-P4_<date>.md` ("add PATCH to Access-Control-Allow-Methods"), inform owner. Revert r1 to its prior state (`hk`) after the smoke.
3. Edit 1 (transform) + T1 → `npx craco test --watchAll=false --testPathPattern=roomStatusTransform.cr358p4` → V-U1..U3.
4. Edit 2 (service) + T2/T3 → `--testPathPattern=pmsService.tapeChart.cr358p4` → V-U4..U8 → compile → `/pms/front-desk`, `/pms/in-house` still load (downstream V-R1).
5. Edit 4 (`RoomStatusPage`) + Edit 6 room-status line → V-B1..B9 (S7 first: smaller surface, exercises PATCH end-to-end). Restore r1 to `hk` after toggling tests so QA sees the mockup baseline.
6. Edit 3 (`ReservationsPage`) + Edit 6 reservations line (+ import removal) → V-B10..B18.
7. Colour audit V-G9, marker audit V-G8, diff guards V-G5..G7.
8. Self-test matrix §7 → EXIT GATE 5/5 → QA handover → session handover.

Checkpoint note (3+ files): keep `memory/handover/CR358P4_IMPL_CHECKPOINT.md` with ✅/⬜ per F1-F5/T1-T3.

---

## 7. Verification Matrix (seeds IMPL self-test + QA handover)

| # | Edit | File | Check | How | Auto? |
|---|---|---|---|---|:---:|
| V-G1 | 1 | roomStatusTransform.js | exports `fromRoomStatusBoard, fromPatchResponse, patchErrorMessage, ROOM_MANUAL_STATUSES` | grep | YES |
| V-G2 | 2 | pmsService.js | exports `getRoomStatusBoard, patchRoomStatus, bulkMarkClean, buildTapeChart, getTapeChartData`; `api.patch(` present exactly once | grep | YES |
| V-G3 | 3,4 | 2 pages | S2 imports `getTapeChartData`/`buildTapeChart` and **not** `getRoomStatusBoard` (OD-P4-02, unless A-P4-14 override); S7 never imports `getReservationOps` | grep | YES |
| V-G4 | 4 | RoomStatusPage.jsx | no optimistic state write after PATCH: `grep -n "setBoard(" ` occurs only inside `load()` | grep | YES |
| V-G5 | — | aiosellTransform.js, aiosellService.js, constants.js, PmsCheckoutDrawer.jsx, FrontDesk/Arrivals/DeparturesPage.jsx, Sidebar.jsx | `git diff --stat origin/PMS1 -- <files>` → no change | git | YES |
| V-G6 | 2 | pmsService.js | all 11 pre-existing export bodies unchanged (`git diff` hunk only after L222 + 1 import line + header) | git diff | YES |
| V-G7 | 6 | App.js | diff = +2 imports, −1 import, 2 element swaps, 1 comment; `PmsPlaceholderPage` 0 hits in App.js | git diff + grep | YES |
| V-G8 | all | 5 app files + 2 tests | `grep -l "CR-358-P4"` → 7 | grep | YES |
| V-G9 | 3,4 | 2 pages | colour audit: 0 hits for `#22C55E #3B82F6 #2563EB #6366F1 #003580`, `slate-`, `bg-blue-`, `text-blue-`; no `<img src="https://` | grep | YES |
| V-U1 | 1 | fromRoomStatusBoard | G3-01 fixture → 5 rooms, counts `{occupied:2,booked:2,hk:1,ooo:0,available:0}`, r2 `displayStatus:'occupied'` + `canToggle:false`, no `phone`/`email` keys | unit | YES |
| V-U2 | 1 | fromPatchResponse | 200 body → `inventoryPushWarning:null`, `room.manualStatus:'hk'`; `{}` safe | unit | YES |
| V-U3 | 1 | patchErrorMessage | 3 T4 shapes → exact strings; unknown → `'Status update failed'` | unit | YES |
| V-U4 | 2 | buildTapeChart | window/dates/todayIdx; out-of-window exclusion; clipping flags | unit | YES |
| V-U5 | 2 | buildTapeChart | unassigned = pending-no-table only; never in `byRoom` | unit | YES |
| V-U6 | 2 | buildTapeChart | kinds in_house/departed/pending from `lineStatus`; `rowStatus` occupied/booked/null | unit | YES |
| V-U7 | 2 | buildTapeChart | nights span (`span = max(1, co−ci)`), same-day → 1 | unit | YES |
| V-U8 | 2 | buildTapeChart | groups by type, natural sort; unknown table id skipped | unit | YES |
| **V-B0** | 2 | Browser | **PATCH from browser passes CORS preflight** (Network: OPTIONS 200 → PATCH 200) | DevTools | NO |
| V-B1 | 4,6 | Browser | `/pms/room-status` renders `room-status-page`; 5 tiles; badges match `room-status-board` (Network tab) — V9/V10 | navigate | NO |
| V-B2 | 4 | Browser | filter chips: counts match tiles; OOO filter with 0 → `rs-empty` — V11 | click | NO |
| V-B3 | 4 | Browser | available/hk tile → **Needs HK / Mark OOO / Mark Clean** → PATCH 200 → board refetched → badge changes; `toast.success` — V12/V13 | click + Network | NO |
| V-B4 | 4 | Browser | occupied tile (r3): HK/OOO `disabled` + tooltip; **View Folio** → `/reports/room-orders` — V14 | hover/click | NO |
| V-B5 | 4 | Browser | booked tile (r4): **Check In** → `/pms/check-in?booking_id=BDC7497606` → CheckInPage preselects; no HK/OOO buttons (OD-P4-08) | click | NO |
| V-B6 | 4 | Browser | Mark All Clean with ≥1 HK → sequential PATCHes in Network; summary toast; button disabled while running; disabled when 0 HK — V15 | click + Network | NO |
| V-B7 | 4 | Browser | 422 path: DevTools override `restaurant_table_id` of an available tile to an occupied id (or run `patchRoomStatus(8524,'hk')` from console) → red toast with backend message; board refetched — V16 | DevTools | NO |
| V-B8 | 4 | Browser | Auto-HK pill shows ON (`auto_hk_on_rm_checkout:true`) — V17 | visual | NO |
| V-B9 | 4 | Browser | Refresh + tab-return (`visibilitychange`) refetch board | Network | NO |
| V-B10 | 3,6 | Browser | `/pms/reservations` renders `reservations-page`; groups "Executive — r1, r2" / "Suite — r3, r4, r5"; 7 date columns; TODAY column highlighted — V1 | navigate | NO |
| V-B11 | 3 | Browser | blocks: r2 in-house green today; departed grey blocks; pending orange; positions match `local-reservations` dates — V2 | Network compare | NO |
| V-B12 | 3 | Browser | Unassigned section lists BDC7497606, BDC6263973 (+ other pending-no-table in window); **Assign Room** disabled + "Coming in Phase 5" tooltip — V6 | hover | NO |
| V-B13 | 3 | Browser | block click → popover; pending → **Check In** → `/pms/check-in?booking_id=…`; in-house with order → **View Folio**; departed → info only; ESC/outside closes — V3/V4/V5 | click | NO |
| V-B14 | 3 | Browser | 7d/14d/30d switch re-lays out columns; range label updates — V7 | click | NO |
| V-B15 | 3 | Browser | Prev/Next step = ½ window; **Today** resets to today−2; blocks crossing edges are clipped — V8 | click | NO |
| V-B16 | 3 | Browser | `WalkIn` reservations labelled "Walk-in" (A-P4-05) | visual | NO |
| V-B17 | 3 | Browser | Simulated `local-reservations` failure (DevTools block) → `tc-error` + Retry; no console crash | DevTools | NO |
| V-B18 | 3 | Browser | No request to `room-status-board` from S2 (OD-P4-02) — Network filter | Network | NO |
| V-R1 | — | Regression | `/pms/front-desk`, `/pms/arrivals`, `/pms/departures`, `/pms/in-house`, `/pms/check-in`, `/pms/new-booking`, `/pms/channel-manager` load unchanged | navigate | NO |
| V-R2 | — | Regression | Sidebar "Reservations" + "Room Status" links route to the new pages (no Sidebar change) | click | NO |
| V-R3 | — | Regression | Dashboard room card → OrderEntry → checkout unaffected (no shared file touched) — sanity | manual | NO |
| V-R4 | all | webpack | 0 new warnings vs baseline (incl. no unused `PmsPlaceholderPage` import) | logs | YES |
| V-S1 | all | R20 | no phone/email in console logs, component state (S7 model drops them), evidence files | grep | YES |

Totals: **43 checks — 18 automated, 25 manual (0 financial).** IA V1-V19 fully covered (V18 = V-R4, V19 = V-G9).

---

## 8. Risk register (plan-level)

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | **Browser blocks PATCH** (preflight lists `*` + explicit list without PATCH; first PATCH in codebase) | **MEDIUM** | V-B0 is step 2 of execution — fail fast before UI work; BACKEND_BRIEF template ready; wildcard valid because `withCredentials` unset |
| R2 | Optimistic UI drift (PATCH omits `display_status`; server precedence) | MEDIUM | A-P4-08 hard rule: every mutation path ends in `load()`; V-G4 grep guard |
| R3 | Bulk clean partially fails / slow with many HK rooms | LOW | Sequential + continue-on-error (OD-P4-09); button disabled while busy; 5 rooms on sandbox |
| R4 | S2/S7 disagree (unassigned vs booked tile) confuses owner | LOW | A-P4-12 documented; matches approved mockup; popover text "No room assigned" on unassigned blocks |
| R5 | "Today" mismatch (server 09-04 vs browser 09-03) | LOW | Browser-local `localDate()` only (P3 A-05); `todayIdx` from same source |
| R6 | 30d view density (36px columns) unreadable | LOW | Labels truncate with ellipsis + full text in `title`; horizontal scroll wrapper; owner may drop 30d at Gate 4 |
| R7 | `pmsService.js` hotspot stacking P2/P3/P4 unsmoked | MEDIUM | Append-only; V-G6 diff guard; recommend owner Gate-6 smoke of P3 alongside P4 QA |
| R8 | OG-PMS-010 (auto-HK didn't fire after checkout) surfaces as "wrong" tile | LOW | A-P4-16 info-only pill; QA to log as backend NOTE, not FE FAIL |
| R9 | Unknown `display_status` value in future | LOW | Transform defaults to `'available'` + `DISPLAY_STATUSES` guard |
| R10 | App.js hotspot | LOW | 6 lines, V-G7 diff guard, SC-P4-01 ack |
| R11 | Local/remote drift recurs (no auto-sync) | MEDIUM | `origin` now configured; IMPL step 1 requires `git diff origin/PMS1 -- frontend/src` empty; add to DEPLOYMENT boot checklist (OG-PMS-012) |

---

## 9. Post-Code Registry Checklist (IMPL agent MUST execute — R17/R18)

```
- [ ] registry.json: CR-358-P4 → status "IMPLEMENTED — Gate 5a", gate 5, sprint_key pos_pms_1,
      files: "api/transforms/roomStatusTransform.js (NEW), api/services/pmsService.js (append), pages/pms/ReservationsPage.jsx (NEW), pages/pms/RoomStatusPage.jsx (NEW), App.js (6 lines), 2 test files + 1 fixture"
- [ ] CR_REGISTRY.md: CR-358-P4 row → IMPLEMENTED — Gate 5a
- [ ] CONTROL_DASHBOARD.md: header line updated
- [ ] FILE_OWNERSHIP.md: add rows F1-F5 (+T1-T3) tagged CR-358-P4; note App.js PmsPlaceholderPage import removed (component file retained)
- [ ] Code markers: "// CR-358-P4" in every new/modified file — grep -l → 7
- [ ] OPEN_GAPS_REGISTER.md: OG-PMS-010 → add "observed at P4 IMPL: <yes/no>" note; OG-PMS-011/012 unchanged (closure items)
- [ ] Evidence: memory/evidence/CR-358-P4/ (V-B0 preflight + PATCH screenshots/Network export, secrets masked)
- [ ] QA handover: memory/handover/QA_HANDOVER_CR358_P4_<DATE>.md (inherits §7, registry sync confirmation, EXIT GATE 5/5, note to restore r1→hk baseline)
- [ ] Session handover: memory/handover/SESSION_HANDOVER_<DATE>_CR358P4_IMPL.md
```

---

## 10. Owner decisions needed

| # | Item | Blocking? |
|---|---|---|
| **Gate 4 GO** | Approve this plan for Implementation | **YES** |
| **SC-P4-01** | Accept 6-line `App.js` re-point incl. removal of now-unused `PmsPlaceholderPage` import | YES (with GO) |
| **SC-P4-02** | Accept 2 unit-test files + 1 fixture (owner chose tests at kickoff) | No — informational |
| **SC-P4-03** | `buildTapeChart` lives in `pmsService.js` (not a 4th file) | No — informational |
| A-P4-11..20 | Presentation defaults §3.3 — especially **A-P4-14** (S2 badges derived, HK/OOO only on S7) and **A-P4-15** (mockup's `#003580`/`#6366F1` replaced by token-compliant neutrals) | No — override any at Gate 4, else they apply |
| Sequencing | Agent recommends owner Gate-6 smoke of P3 in parallel with P4 implementation (R7) | No |

---

*Planning agent | CR-358-P4 Gate 3 — Implementation Plan COMPLETE | 2026-09-04*
*STOP — no code written. Awaiting owner's explicit **Gate 4 GO** (+ SC-P4-01 ack).*
