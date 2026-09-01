# BACKEND_BRIEF_CR353_2026_08_28
## PMS Module — AIOSELL Integration: All Backend Gaps & Questions

**Date:** 2026-08-28
**CR:** CR-353 — PMS Module + Channel Manager Integration
**Raised by:** Planning agent (Gate 2 Impact Analysis)
**Priority summary:** 4 missing endpoints (P1 blockers) · 2 clarifications needed · 2 design decisions

---

## Section 1 — Missing API: Local Reservations GET

### Summary
- **Issue:** There is no endpoint to read local `aiosell_reservations` records. The existing `fetch-reservations` reads AIOSELL CM (not local DB) and returns empty in sandbox.
- **Classification:** DATA_ISSUE / MISSING_ENDPOINT
- **Frontend impact:** Tape Chart (S2), Arrivals page (S9), Departures page (S10), Front Desk (S1) — ALL four screens have no data source for reservation records. These screens cannot be built without this endpoint.
- **Priority:** P1 · CRITICAL

### Required Endpoint
- **Method:** GET
- **URL:** `/api/v2/vendoremployee/aiosell/local-reservations`
- **Auth:** Bearer {TOKEN}
- **Query params:** `start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` (required), `checkin_date=YYYY-MM-DD` (optional, for today's arrivals)

### Expected Response Shape
```json
[
  {
    "id": 1,
    "booking_id": "TEST-BOOK-001",
    "cm_booking_id": "CM-TEST-001",
    "channel": "booking.com",
    "action": "book",
    "status": "confirmed",
    "checkin": "2026-09-10",
    "checkout": "2026-09-12",
    "special_requests": "Airport taxi required",
    "pah": false,
    "booked_on": "2026-08-31 06:06:27",
    "guest": {
      "first_name": "Rahul",
      "last_name": "Sharma",
      "phone": "9876543210",
      "email": "rahul@email.com"
    },
    "rooms": [
      {
        "room_code": "executive",
        "rateplan_code": "executive-s-ep",
        "occupancy": { "adults": 2, "children": 0 },
        "prices": [
          { "date": "2026-09-10", "sell_rate": 2500 },
          { "date": "2026-09-11", "sell_rate": 2500 }
        ]
      }
    ],
    "amount": {
      "amount_after_tax": 5000,
      "amount_before_tax": 5000,
      "tax": 0,
      "currency": "INR"
    },
    "assigned_room_id": null
  }
]
```

### Notes
- `assigned_room_id` = `restaurant_table.id` of physical room assigned at check-in (null if not yet assigned). FE uses this to show UNASSIGNED vs assigned blocks on tape chart.
- Must include both OTA bookings (from webhook) and direct/walk-in bookings
- `status` values expected: `confirmed`, `checked_in`, `checked_out`, `cancelled`, `modified`

### Frontend Workaround
- **Available:** NO — screens cannot render without this data

---

## Section 2 — Clarification: Does ROOM_CHECK_IN link Online bookings to aiosell_reservations?

### Summary
- **Issue:** When OTA guest arrives and staff checks them in via `POST /api/v1/vendoremployee/pos/user-group-check-in` with `booking_type="Online"`, does the backend automatically link the created `user_id_documents` record to the `aiosell_reservations` record?
- **Classification:** CONTRACT_MISMATCH / CLARIFICATION NEEDED
- **Frontend impact:** If NO — FE must pass `aiosell_reservation_id` in the check-in payload so the tape chart can update from "UNASSIGNED" to "Checked In". If YES — no FE change needed.
- **Priority:** P1 · HIGH

### Current FE Payload (roomService.js)
```
booking_type: "Online"
room_id[0]: <restaurant_table_id>
name: "Rahul Sharma"
phone: "9876543210"
checkin_date: "2026-09-10 00:00:00"
checkout_date: "2026-09-12 00:00:00"
... (no aiosell_reservation_id field currently)
```

### Question for Backend
1. When `booking_type=Online`, does backend look up `aiosell_reservations` by guest phone or `cm_booking_id` and link automatically?
2. Or does FE need to pass a new field, e.g., `aiosell_reservation_id: <integer>`?
3. After a successful check-in with `booking_type=Online`, what is the expected `status` field on the `aiosell_reservations` row?

### To Verify
```bash
# 1. Create an OTA reservation via webhook
curl -X POST {HOST}/api/v2/aiosell/reservations \
  -u "aiosell:AIOsell@123" \
  -H "Content-Type: application/json" \
  -d '{"action":"book","hotelCode":"sandbox-pms","channel":"booking.com",
       "bookingId":"LINK-TEST-001","guest":{"firstName":"Test","lastName":"Link","phone":"9111222333"},
       "checkin":"2026-09-10","checkout":"2026-09-12",
       "rooms":[{"roomCode":"executive","occupancy":{"adults":1,"children":0},
       "prices":[{"date":"2026-09-10","sellRate":2500}]}]}'

# 2. Check aiosell_reservations — note the id
# 3. Check in via user-group-check-in with booking_type=Online
# 4. Check aiosell_reservations again — does status change to "checked_in"?
```

### Frontend Workaround
- **Available:** PARTIAL — FE can pass `aiosell_reservation_id` if backend exposes it on the local-reservations response, but only if backend tells us to

---

## Section 3 — Missing APIs: Self Check-In Public Endpoints

### Summary
- **Issue:** The self check-in flow (guest checks in from their phone via WhatsApp/SMS link) requires 2 public endpoints that do NOT need a vendor Bearer token. No such endpoints exist.
- **Classification:** MISSING_ENDPOINT
- **Frontend impact:** The entire Self Check-In screen (S5) cannot be built without these.
- **Priority:** P1 · HIGH (pending owner decision OD-05 on whether this is MVP scope)

### Required Endpoint 1 — Retrieve Booking (Guest-Facing, Public)
- **Method:** GET
- **URL:** `/api/v2/public/aiosell/reservation/{token}`
- **Auth:** NO Bearer token. Token is HMAC-signed `{booking_id}:{restaurant_id}:{timestamp}` in URL path.
- **Expected response:**
```json
{
  "guest_name": "Rahul Sharma",
  "room_number": "103",
  "room_type": "Standard Double",
  "floor": 1,
  "checkin": "2026-09-10",
  "checkout": "2026-09-12",
  "nights": 2,
  "balance_due": 5000,
  "pah": true,
  "special_requests": "Late check-in after 10 PM",
  "hotel_name": "The Palm House",
  "wifi_ssid": "PalmHouse_Guest",
  "wifi_password": "welcome2026",
  "reception_number": "0"
}
```
- **Errors:** 404 if token invalid / expired; 409 if already checked in

### Required Endpoint 2 — Complete Self Check-In (Guest-Facing, Public)
- **Method:** POST
- **URL:** `/api/v2/public/aiosell/reservation/{token}/checkin`
- **Auth:** NO Bearer token.
- **Request body:**
```json
{
  "id_type": "Aadhaar",
  "id_number": "XXXX-XXXX-4821",
  "id_image_base64": "..." 
}
```
- **Expected response:**
```json
{
  "success": true,
  "message": "Checked in successfully",
  "room_number": "103"
}
```
- **Side effects:** Mark `aiosell_reservations.status = "checked_in"`. Send notification to front desk (existing socket or push).

### Token Requirements
- Token must be HMAC-signed with a server secret
- Token must expire (suggest 24h after check-in date)
- Token must be single-use (once checked-in, token becomes invalid)
- Token generation must happen when staff clicks "Send link" — need an endpoint: `POST /api/v2/vendoremployee/aiosell/reservation/{id}/generate-token`

### Frontend Workaround
- **Available:** NO — entirely blocked on backend

---

## Section 4 — Missing API: Advance Direct Booking (Save as Booking)

### Summary
- **Issue:** When staff creates an advance booking for a guest arriving in future days (phone booking, not walk-in), there is no API to create a "pending reservation" for direct bookings. The existing `ROOM_CHECK_IN` endpoint immediately creates an occupied room order — wrong for advance bookings.
- **Classification:** MISSING_ENDPOINT
- **Frontend impact:** The "Save as Booking (Check-in later)" button on New Booking form (S3) has nothing to call.
- **Priority:** P1 · HIGH (conditional on owner OD-06 decision)

### Required Endpoint
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/aiosell/direct-reservation`
- **Auth:** Bearer {TOKEN}
- **Request body:**
```json
{
  "channel": "direct",
  "guest": {
    "first_name": "Rahul",
    "last_name": "Sharma",
    "phone": "9876543210",
    "email": "rahul@email.com"
  },
  "checkin": "2026-09-10",
  "checkout": "2026-09-12",
  "room_code": "executive",
  "occupancy": { "adults": 2, "children": 0 },
  "sell_rate": 2500,
  "special_requests": "",
  "pah": true,
  "booking_for": "individual",
  "advance_payment": 1000,
  "payment_method": "cash"
}
```
- **Expected:** Creates row in `aiosell_reservations` with `channel="direct"`, `status="confirmed"`. Does NOT occupy a physical room yet.
- **Expected response:**
```json
{
  "success": true,
  "booking_id": "DIR-2026-001",
  "id": 42
}
```

### Alternative (if backend prefers)
Backend could extend the existing `ROOM_CHECK_IN` to support a `checkin_status: "advance"` flag that creates a pending reservation without immediately occupying the room.

### Frontend Workaround
- **Available:** PARTIAL — "Save as Booking" button can be hidden (walk-in only = immediate check-in). Owner decision pending (OD-06).

---

## Section 5 — Clarification: Does Checkout Trigger AIOSELL Inventory Release?

### Summary
- **Issue:** Walk-in check-in automatically pushes inventory to AIOSELL (room count decreases). When a guest checks out via `CollectPaymentPanel.jsx`, inventory should be released (room count increases). The frontend checkout code was audited — NO AIOSELL call found in `CollectPaymentPanel.jsx`. If checkout doesn't trigger inventory release, AIOSELL will show rooms as perpetually occupied.
- **Classification:** CLARIFICATION NEEDED / POSSIBLE CONFIG_ISSUE
- **Frontend impact:** AIOSELL inventory will be permanently wrong after every checkout if this is not handled.
- **Priority:** P2 · HIGH

### To Verify
```bash
# 1. Check in a walk-in guest (creates aiosell_sync_logs outbound inventory entry)
# 2. Note available count before checkout via fetch-inventory
# 3. Check out the guest via CollectPaymentPanel (collect payment button)
# 4. Check fetch-inventory again — does available count go UP by 1?
# 5. Check aiosell_sync_logs — is there an outbound inventory entry for the checkout?

curl -X POST {HOST}/api/v2/vendoremployee/aiosell/fetch-inventory \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"start_date":"2026-09-01","end_date":"2026-09-03"}'
```

### Expected Outcome
After checkout, `aiosell_sync_logs` should have a new `direction=outbound`, `sync_type=inventory` row with `available` incremented by 1.

### If NOT Currently Happening
Backend must trigger inventory push after room order is marked completed/settled. The trigger point is when `CollectPaymentPanel` calls the settle/checkout API — backend should fire AIOSELL inventory push non-blocking (same pattern as WalkIn check-in).

### Frontend Workaround
- **Available:** NO — FE does not call AIOSELL directly; this must be backend-triggered

---

## Section 6 — Missing Dashboard KPI Endpoint

### Summary
- **Issue:** Front Desk (S1) needs 4 numbers in real-time: Occupancy %, Arrivals Today count, Departures Today count, In-House count. These require querying multiple tables. No aggregation endpoint exists.
- **Classification:** MISSING_ENDPOINT
- **Frontend impact:** KPI strip on Front Desk shows hardcoded mock data without this. Not a blocker for other screens.
- **Priority:** P2 · MEDIUM

### Required Endpoint
- **Method:** GET
- **URL:** `/api/v2/vendoremployee/aiosell/dashboard-kpis`
- **Auth:** Bearer {TOKEN}
- **Query params:** `date=YYYY-MM-DD` (defaults to today)

### Expected Response
```json
{
  "occupancy_pct": 70,
  "occupied_rooms": 14,
  "total_rooms": 20,
  "arrivals_today": {
    "total": 40,
    "checked_in": 6,
    "pending": 34
  },
  "departures_today": {
    "total": 30,
    "checked_out": 15,
    "overdue": 3,
    "due": 12
  },
  "in_house_count": 11,
  "with_special_requests": 12
}
```

### Frontend Workaround
- **Available:** PARTIAL — can approximate from `GET_ROOM_LIST` + `local-reservations` client-side, but expensive and inaccurate for totals

---

## Section 7 — Clarification: HK and OOO Room State Storage

### Summary
- **Issue:** The Room Status Board (S7) shows 5 room states: Available, Booked, Occupied, Housekeeping, Out-of-Order. The first 3 come from `GET_ROOM_LIST` and `aiosell_reservations`. But Housekeeping (after checkout, not yet cleaned) and Out-of-Order (maintenance) have no backend storage. Currently these would only be FE-side localStorage — meaning they reset on page refresh.
- **Classification:** DESIGN DECISION / DATA_ISSUE
- **Frontend impact:** If HK/OOO are localStorage-only, any page refresh loses the state. In a hotel, housekeeping staff need this to persist across devices and sessions.
- **Priority:** P2 · MEDIUM (owner decision OD-07 pending)

### Question for Backend
1. Does `restaurant_table` have a `status` or `room_status` field that can store `available | housekeeping | out_of_order`?
2. If not, can a lightweight `room_status_log` table be added: `{ restaurant_table_id, status, note, updated_at, updated_by }`?
3. Endpoint needed: `PATCH /api/v2/vendoremployee/aiosell/room-status/{table_id}` with `{ status: "housekeeping" | "out_of_order" | "available", note: "Plumbing issue" }`

### Frontend Workaround
- **Available:** YES (localStorage) — but state resets on refresh and is not shared across devices. Acceptable only if owner explicitly accepts.

---

## Section 8 — Clarification: Socket Event for New OTA Reservations

### Summary
- **Issue:** When AIOSELL sends a new OTA booking webhook, the Front Desk arrivals list and Tape Chart don't update live. Staff must manually refresh. The existing socket system handles order events but has no reservation event.
- **Classification:** MISSING_FEATURE (real-time update)
- **Frontend impact:** Staff may miss arrivals until they manually refresh. Low risk for MVP.
- **Priority:** P2 · LOW (acceptable to defer to Phase 2)

### Proposed Socket Event
- **Event name:** `new_reservation` (or `aiosell_reservation_update`)
- **Payload:**
```json
{
  "action": "book | modify | cancel",
  "reservation_id": 42,
  "booking_id": "TEST-BOOK-001",
  "channel": "booking.com",
  "checkin": "2026-09-10",
  "guest_name": "Rahul Sharma"
}
```
- **Trigger:** After webhook successfully processed and `aiosell_reservations` row created/updated
- **FE handling:** Invalidate arrivals cache, show toast "New booking: Rahul Sharma arriving 10 Sep"

### Frontend Workaround
- **Available:** YES — poll every 60s as fallback. Acceptable for MVP.

---

## Section 9 — OD Questions Requiring Backend Confirmation

These are owner decisions that have backend implications. Backend team must confirm feasibility before owner decides.

| OD | Question | Backend implication |
|---|---|---|
| **OD-02** | Does `ROOM_CHECK_IN` auto-link Online check-ins to `aiosell_reservations`? | See Section 2 above |
| **OD-05** | Self check-in in MVP? | Requires Sections 3 backend work |
| **OD-06** | Save as Booking for direct advance bookings? | Requires Section 4 backend work |
| **OD-07** | HK/OOO state: backend or localStorage? | See Section 7 above |

---

## Summary — Backend Action Items

| # | Item | Priority | Type | Endpoint/Change |
|---|---|---|---|---|
| B-01 | Local reservations GET | **P1 BLOCKER** | NEW ENDPOINT | `GET /aiosell/local-reservations` |
| B-02 | OTA check-in linkage | **P1 BLOCKER** | CLARIFICATION | Does `ROOM_CHECK_IN` link to `aiosell_reservations`? |
| B-03 | Self check-in public GET | **P1** (if OD-05=YES) | NEW ENDPOINT | `GET /public/aiosell/reservation/{token}` |
| B-04 | Self check-in public POST | **P1** (if OD-05=YES) | NEW ENDPOINT | `POST /public/aiosell/reservation/{token}/checkin` |
| B-05 | Self check-in token generation | **P1** (if OD-05=YES) | NEW ENDPOINT | `POST /vendoremployee/aiosell/reservation/{id}/generate-token` |
| B-06 | Direct advance reservation | **P1** (if OD-06=YES) | NEW ENDPOINT | `POST /aiosell/direct-reservation` |
| B-07 | Checkout inventory release | **P2** | VERIFY/FIX | Confirm checkout triggers AIOSELL push |
| B-08 | Dashboard KPIs | **P2** | NEW ENDPOINT | `GET /aiosell/dashboard-kpis` |
| B-09 | HK/OOO state storage | **P2** (if OD-07=backend) | NEW ENDPOINT + TABLE | `PATCH /aiosell/room-status/{table_id}` |
| B-10 | Socket event for reservations | **P2** (deferrable) | NEW SOCKET EVENT | `new_reservation` event on webhook success |

---

## Evidence Artifacts

All curl probes and API responses to be saved at:
`/app/memory/evidence/CR-353/`

Pending verification:
- `gap02_local_reservations_probe.json` — verify endpoint exists or get 404
- `gap03_online_checkin_link_probe.json` — verify aiosell_reservations.status after ROOM_CHECK_IN Online
- `gap09_checkout_inventory_probe.json` — verify aiosell_sync_logs after checkout

---

*Backend brief: 2026-08-28 | CR-353 | Impact Analysis Gate 2 | 10 action items*
