# CR-358-P2 — Gate 2: Impact Analysis
## PMS Phase 2 — New Booking (S3) + Check-In (S4)

**Doc:** `memory/impact/CR-358-P2_IMPACT_ANALYSIS.md`
**Date:** 2026-09-03
**Planning Agent Role:** Gate 2 — Impact Analysis only
**Sprint:** pos_pms_1
**Risk:** HIGH
**Parent:** CR-358 (phased plan, owner-approved 2026-09-01)

---

## Code Reality: NONE

```bash
find /app/frontend/src -name "NewBookingPage*"  → 0 results
find /app/frontend/src -name "CheckInPage*"     → 0 results
grep "pmsCheckIn\|createDirectReservation" pmsService.js → 0 (stubs throw errors)
```

Both target pages currently render `PmsPlaceholderPage`. Routes exist in `App.js` (frozen after P1). Two stub functions exist in `pmsService.js` but are non-functional throws. **Full implementation required.**

---

## Conflict Pre-Check

| File | Last modifier | Date | Conflict? |
|---|---|---|---|
| `api/services/pmsService.js` | BUG-378 (this session) | 2026-09-03 | ✅ NONE — additive extension |
| `api/transforms/aiosellTransform.js` | BUG-377 | 2026-09-02 | ✅ NONE — additive extension |
| `App.js` | CR-358-P1 | 2026-09-02 | ✅ FROZEN — routes already added, zero changes needed |
| `components/layout/Sidebar.jsx` | CR-358-P1 | 2026-09-02 | ✅ FROZEN — zero changes needed |
| `api/services/roomService.js` | CR-129 | 2026-08-05 | ✅ WILL NOT TOUCH — OD-01 co-exist |
| `components/modals/RoomCheckInModal.jsx` | CR-129 | 2026-08-05 | ✅ WILL NOT TOUCH — OD-01 co-exist |

**No conflicts found. All target files either untouched by other active CRs or frozen.**

---

## Risk Classification

**Risk: HIGH**

Triggers:
- S3/S4 are booking and check-in screens — revenue-path entry points
- `pmsCheckIn()` calls `POST /pos/user-group-check-in` — same endpoint as existing RoomCheckInModal (different payload path, but shared backend handler)
- Incorrect `booking_type` / `booking_id` mismatch could create orphan orders on preprod
- Advance payment field present — any mis-send creates financial records

**Not CRITICAL because:** no tax/settlement/discount/billing logic in scope. Checkout (CollectPaymentPanel) is untouched.

---

## Owner Decisions Resolved (from ques2_reply.md — 2026-09-03)

| # | Decision | Resolution |
|---|---|---|
| OD-P2-01 | `booking_id` param — extend shared vs separate function | **Option B confirmed** — build `pmsService.pmsCheckIn()` as standalone PMS function. `roomService.checkIn()` untouched. |
| OD-P2-02 | `direct-reservation` payload shape | **Confirmed from curl** — `guest{name,phone,email}`, `checkin/checkout (Y-m-d)`, `rooms[{aiosell_room_code}]` or `rooms[{restaurant_table_id}]`, `order_amount`, `adults`, `children`, `notes` |
| OD-P2-03 | Room picker for New Booking | **Option A confirmed** — `GET /aiosell/rooms` → `data.aiosellRooms[]` (type-only) + `data.localRooms[]` (physical pre-assign). `get-room-list` returns occupied-only — wrong for booking. |
| OD-P2-04 | Design reference for CheckInPage | `checkin-comparison.html` (1057 lines, "Room Check-In — UX Design Comparison") is the repo design reference. `check-in-v2.html` was a shorthand alias. |

---

## Owner Decisions Resolved — Round 2 (owner accepted recommendations, 2026-09-03)

| # | Question | Decision | Effect |
|---|---|---|---|
| **OD-P2-05** | S3 post-booking flow | **(A)** Stay on New Booking; success card shows `booking_id` + "Check In Now" (→ `/pms/check-in?booking_id=…`) + "New Booking" reset. No auto-redirect. | `NewBookingPage.jsx` success state |
| **OD-P2-06** | `CheckInPage` layout | **(B)** Pending arrivals list (today) + Walk-In action banner; selecting an arrival prefills the check-in form. No tab switcher. | `CheckInPage.jsx` structure |
| **OD-P2-07** | Advance payment at booking time | **(B)** Collect advance at check-in only. New Booking form has NO advance field; `direct-reservation` sent without `advance_payment` (backend defaults 0). | `NewBookingPage.jsx` fields; R6 closed |

## Design Review (Gate 2.5) — APPROVED 2026-09-03

- Mockup: `frontend/public/cr358-p2-v3-mockup.html` (S3 New Booking, S3 success state, S4 Check-In)
- Reference: `frontend/public/checkin-comparison.html` (OD-P2-02)
- Owner verdict: **"design approved"** — mockup is the UX contract for Gate 3.

**All 7 owner decisions resolved (OD-P2-01..07). Gate 2 CLOSED. Gate 3 may open on owner instruction.**

---

## Data Flow Traces

### S3 — New Booking (NewBookingPage.jsx)

```
User fills form (guest, room, dates, amount)
        │
        ├─[Walk-in Immediate]──────────────────────────────────────────────────┐
        │                                                                       │
        │  pmsService.pmsCheckIn({                                             │
        │    booking_type: 'WalkIn', name, phone,                              │
        │    room_id: [restaurant_table_id],                                   │
        │    checkin_date, checkout_date,                                       │
        │    order_amount, advance_payment, balance_payment                    │
        │  })                                                                   │
        │  → POST LOCAL_CHECKIN (JSON body)                                    │
        │  → { message: "Group check-in completed", user_id, ... }            │
        │  → Success toast → navigate /pms/in-house                           │
        │                                                                       ▼
        └─[Save as Booking (Direct)]────────────────────────────────────────────
           pmsService.createDirectReservation({
             guest: { name, phone, email },
             checkin, checkout,
             rooms: [{ aiosell_room_code }] OR [{ restaurant_table_id }],
             order_amount, adults, children, notes
           })
           → POST DIRECT_RESERVATION (JSON)
           → { data.reservation.booking_id, channel:'Direct', operational_status:'pending' }
           → aiosellTransform.fromAPI.directReservation(res) → { bookingId, channel, checkin, checkout, status }
           → [OD-P2-05] success state: "Check In Now" button OR redirect to /pms/check-in

Room picker source:
           getAiosellRooms()
           → GET /aiosell/rooms
           → aiosellTransform.fromAPI.rooms() [EXISTING — no change]
           → data.aiosellRooms[] (room types: executive, suite) + data.localRooms[] (r1..r5)
```

### S4 — Check-In (CheckInPage.jsx)

```
Page loads
        │
        ├─[Arrivals list (pending today)]
        │  getLocalReservations({ startDate: today, endDate: today+7, view: 'arrivals' })
        │  [EXISTING aiosellService.getLocalReservations()]
        │  → GET LOCAL_RESERVATIONS?view=arrivals
        │  → filter: operational_status === 'pending'
        │  → aiosellTransform.fromAPI.pendingArrival(res) → arrival card model
        │     { bookingId, channel, guestName, phone, checkin, checkout,
        │       roomCode, ratePlanCode, mealPlan (via decodeMealPlan), adults, children }
        │
        ├─[Staff selects arrival card / searches by booking_id]
        │  → form pre-filled with guest + booking details
        │
        └─[Submit Check-In]
           pmsService.pmsCheckIn({
             booking_type: 'Direct' | 'Online' | 'WalkIn',
             booking_id: bookingId (for Direct/Online) | undefined (WalkIn),
             name, phone,
             room_id: [restaurant_table_id],
             checkin_date, checkout_date,
             order_amount, advance_payment, balance_payment
           })
           → POST LOCAL_CHECKIN (JSON body — confirmed from curl probes)
           → { message: "Group check-in completed", user_id }
           → navigate /pms/in-house (guest now in-house)
```

---

## Critical Technical Finding — JSON vs FormData

`roomService.checkIn()` sends **FormData** (`multipart/form-data`). The owner's curl probes (Decision 1) confirm Direct and OTA check-in work with **JSON body** (`application/json`).

**Implication:** `pmsService.pmsCheckIn()` (new function, Option B) will use `api.post(LOCAL_CHECKIN, payload)` with a plain JSON object — NOT FormData. This is safe because:
1. `roomService.checkIn()` is not modified — Dashboard WalkIn flow unchanged
2. The backend accepts both formats on the same endpoint (confirmed by both sets of working curls)
3. `LOCAL_CHECKIN` and `ROOM_CHECK_IN` constants point to identical endpoints — P2 reuses `LOCAL_CHECKIN`

---

## Affected Files

### Files WILL change — P2 scope

| File | Type | Change | Risk |
|---|---|---|---|
| `pages/pms/NewBookingPage.jsx` | **NEW** | Full page: room picker (aiosellRooms + localRooms), guest form, Walk-in + Save-as-Booking actions | HIGH |
| `pages/pms/CheckInPage.jsx` | **NEW** | Full page: pending arrivals list from local-reservations, check-in form (3 variants), `pmsCheckIn` submit | HIGH |
| `api/services/pmsService.js` | **EXTEND** | Replace 2 stubs: `createDirectReservation()` + `getPmsReservations()`. Add new: `pmsCheckIn()` (JSON body, Option B). ~50 lines additive. | MEDIUM |
| `api/transforms/aiosellTransform.js` | **EXTEND** | Add `fromAPI.directReservation()` + `fromAPI.pendingArrival()`. ~40 lines additive. Append to existing `fromAPI` block. | MEDIUM |

**Estimated total new lines:** ~640 (NewBookingPage ~250 + CheckInPage ~300 + service ~50 + transform ~40)

### Files WILL NOT touch — P2 scope

| File | Reason |
|---|---|
| `App.js` | FROZEN after P1 — routes `/pms/new-booking` and `/pms/check-in` already exist |
| `components/layout/Sidebar.jsx` | FROZEN after P1 — sidebar entries already exist |
| `api/services/roomService.js` | OD-01 co-exist — `roomService.checkIn()` untouched |
| `components/modals/RoomCheckInModal.jsx` | OD-01 co-exist — Dashboard check-in modal untouched |
| `components/order-entry/CollectPaymentPanel.jsx` | Checkout path unchanged — hotspot, not in P2 scope |
| `pages/pms/InHouseGuestsPage.jsx` | P1+CR-360 complete — untouched |
| `pages/pms/ChannelManagerPage.jsx` | P1 complete — untouched |
| `api/services/aiosellService.js` | Existing `getLocalReservations()` reused as-is — no changes |
| `api/constants.js` | All P2 endpoints already present (`DIRECT_RESERVATION`, `LOCAL_CHECKIN`, `LOCAL_RESERVATIONS`) |

---

## Downstream Consumer Check

| If we change... | Verify downstream... |
|---|---|
| `pmsService.js` (additive) | `InHouseGuestsPage.jsx` (existing import — must not break). Other PMS pages don't import pmsService yet. |
| `aiosellTransform.js` (additive) | `ChannelManagerPage.jsx` (imports `aiosellTransform` — additive change, no existing export changes, zero impact) |
| `NewBookingPage.jsx` (new file) | No downstream — newly standalone page |
| `CheckInPage.jsx` (new file) | No downstream — newly standalone page |

---

## Verification Matrix (seeds Gate 3 / QA)

| # | Check | File | Method |
|---|---|---|---|
| V1 | `pmsCheckIn()` exported from `pmsService.js` | `pmsService.js` | grep |
| V2 | `createDirectReservation()` no longer throws | `pmsService.js` | grep `throw` → 0 |
| V3 | `fromAPI.directReservation` exported from `aiosellTransform` | `aiosellTransform.js` | grep |
| V4 | `fromAPI.pendingArrival` exported from `aiosellTransform` | `aiosellTransform.js` | grep |
| V5 | `NewBookingPage` imports `pmsService` (not `roomService`) | `NewBookingPage.jsx` | grep |
| V6 | `roomService.checkIn()` unchanged — no `booking_id` param added | `roomService.js` | grep `booking_id` → 0 |
| V7 | `pmsCheckIn` sends JSON (`Content-Type: application/json`) not FormData | `pmsService.js` | grep `FormData` → 0 in pmsCheckIn |
| V8 | Walk-in submit → `booking_type: 'WalkIn'`, no `booking_id` field | `NewBookingPage.jsx` or `CheckInPage.jsx` | grep |
| V9 | Direct/OTA submit → `booking_type` + `booking_id` both present | `CheckInPage.jsx` | grep |
| V10 | Webpack compiles 0 new warnings | webpack | tail logs |
| V11 | `RoomCheckInModal` still imports from `roomService` (not pmsService) | `RoomCheckInModal.jsx` | grep |
| V12 | `/pms/new-booking` renders `NewBookingPage` (not placeholder) | Browser | navigate |
| V13 | `/pms/check-in` renders `CheckInPage` (not placeholder) | Browser | navigate |

---

## Risk Register

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | `pmsCheckIn()` sends to same endpoint as `roomService.checkIn()` — wrong `booking_type` could create orphan orders | HIGH | Use `booking_type` as mandatory param with no default; validation guard before call |
| R2 | `local-reservations` response shape changes between P1 (BUG-378) and P2 — `fromAPI.pendingArrival` may need re-probe | MEDIUM | Re-probe `GET /aiosell/local-reservations?view=arrivals` at Gate 3 entry (R12 applies — doc is 2 days old) |
| R3 | Room assignment: `aiosell_room_code` (type-only) vs `restaurant_table_id` (physical pre-assign) — wrong field causes silent wrong assignment | HIGH | New Booking form must make selection intent explicit; `fromAPI.directReservation` preserves both for UI confirmation |
| R4 | `checkin`/`checkout` date format: `direct-reservation` requires `Y-m-d` but `roomService.checkIn()` uses `YYYY-MM-DD HH:mm:ss` — mixing formats in `pmsCheckIn` could cause 422 | HIGH | `pmsCheckIn` uses `Y-m-d` format explicitly; `roomService.checkIn` date format unchanged |
| R5 | OD-01 co-exist: if backend ever changes `/user-group-check-in` signature, both flows break simultaneously | MEDIUM | Documented in OD-01; noted as architecture risk for P5 regression |
| R6 | Advance payment at booking time — financial record created at `direct-reservation` time | ~~HIGH~~ CLOSED | OD-P2-07 = B: no advance field on New Booking; advance collected at check-in only |

---

## Summary

| Field | Value |
|---|---|
| Code Reality | NONE |
| Conflict | CLEAN |
| Risk | HIGH |
| Files WILL change | 4 (2 new pages, 2 service/transform extensions) |
| Files WILL NOT touch | 9 (listed above — App.js, Sidebar, roomService, RoomCheckInModal, CollectPaymentPanel + 4 others) |
| Owner decisions resolved | 7 (OD-P2-01 through OD-P2-07) |
| Owner decisions still open | **0** |
| Design review (Gate 2.5) | **APPROVED 2026-09-03** — `frontend/public/cr358-p2-v3-mockup.html` |
| Estimated new LOC | ~640 |

---

*Planning agent | CR-358-P2 Gate 2 — Impact Analysis COMPLETE | 2026-09-03*
*GATE 2 CLOSED 2026-09-03 — all decisions resolved, design approved. Gate 3 (Implementation Plan) opens on owner instruction.*
