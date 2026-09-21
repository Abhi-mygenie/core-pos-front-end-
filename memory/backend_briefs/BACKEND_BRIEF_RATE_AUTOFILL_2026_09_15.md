# BACKEND_BRIEF — Room Amount Auto-Fill from Rating Engine

**ID:** BACKEND_BRIEF_RATE_AUTOFILL
**Date:** 2026-09-15
**Filed by:** INVESTIGATION agent (ALPHA v0.7)
**Priority:** P1 / MEDIUM
**Classification:** BACKEND_CHANGE_NEEDED (two separate asks — both confirmed backend tasks)
**Status:** BACKEND-BLOCKED — FE work cannot proceed until both changes are shipped
**Evidence:**
- `evidence/INV-PMS-ENH/probe_04_rooms.json` — GET /aiosell/rooms live response
- `evidence/INV-PMS-ENH/probe_09_fetch_rates.json` — POST /fetch-rates live response (7 dates)
- `evidence/BUG-2A/evidence_rate_autofill_2026_09_15.json` — compiled summary

---

## 1. Problem Statement

When a hotel staff member selects a room on the **New Booking** page (`/pms/new-booking`) or
the **Check-In** page (`/pms/check-in`), the Room Amount field shows **₹0**. Staff must type
the room rate from memory every single time.

The Aiosell rating engine already has live per-date rates for every room type. The FE
already calls `fetch-rates` successfully and gets rates back. The only missing piece is a
**link from physical room → its default rateplan**, so the FE knows which rate to show.

This brief asks for **two backend changes** that together unblock automatic rate population.

---

## 2. Current System State

### 2.1 Property Configuration (Goan Kitchen preprod)

```
restaurant_id : 69
hotel_code    : sandbox-pms
service_status: running
5 physical rooms: r1(id=8528), r2(id=8526), r3(id=8524), r4(id=8525), r5(id=8527)
2 Aiosell room types: suite (r3, r4, r5) · executive (r1, r2)
```

### 2.2 Room Mapping Table — Current State

Endpoint: `GET /api/v2/vendoremployee/aiosell/rooms`
Relevant section: `data.mappings[]`

```json
[
  { "id": 3, "restaurant_table_id": 8524, "aiosell_room_code": "suite",     "aiosell_rateplan_code": null },
  { "id": 4, "restaurant_table_id": 8525, "aiosell_room_code": "suite",     "aiosell_rateplan_code": null },
  { "id": 2, "restaurant_table_id": 8526, "aiosell_room_code": "executive", "aiosell_rateplan_code": null },
  { "id": 5, "restaurant_table_id": 8527, "aiosell_room_code": "suite",     "aiosell_rateplan_code": null },
  { "id": 6, "restaurant_table_id": 8528, "aiosell_room_code": "executive", "aiosell_rateplan_code": null }
]
```

**`aiosell_rateplan_code` is `null` for all 5 rooms.** This is the root gap.

### 2.3 Rating Engine — Available Rates (confirmed live, 7-day probe)

Endpoint: `POST /api/v2/vendoremployee/aiosell/fetch-rates`
Payload: `{ "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" }`

Response structure:
```json
{
  "data": {
    "aiosell": {
      "body": {
        "updates": [
          {
            "startDate": "2026-09-08",
            "endDate":   "2026-09-08",
            "rates": [
              { "roomCode": "suite",     "rateplanCode": "suite-s-ep",     "rate": 9000 },
              { "roomCode": "suite",     "rateplanCode": "suite-d-ep",     "rate": 1800 },
              { "roomCode": "suite",     "rateplanCode": "suite-s-cp",     "rate": 2688 },
              { "roomCode": "suite",     "rateplanCode": "suite-d-cp",     "rate": 1920 },
              { "roomCode": "executive", "rateplanCode": "executive-s-ep", "rate": 5400 },
              { "roomCode": "executive", "rateplanCode": "executive-d-ep", "rate": 5000 },
              { "roomCode": "executive", "rateplanCode": "executive-s-cp", "rate": 2040 },
              { "roomCode": "executive", "rateplanCode": "executive-d-cp", "rate": 1700 }
            ]
          }
        ]
      }
    }
  }
}
```

All 8 rateplans across both room types appear on every probed date.

### 2.4 Rateplan Naming Convention (decoded from probe)

```
Pattern:  {room_code}-{occupancy}-{meal_plan}

Occupancy suffix:
  s = single
  d = double

Meal plan suffix:
  ep = European Plan (Room Only — no meals)
  cp = Continental Plan (Breakfast included)

Full list:
  suite-s-ep       Suite · Single · Room Only        ₹9,000  (stable across all dates)
  suite-d-ep       Suite · Double · Room Only        ₹1,800  (varies)
  suite-s-cp       Suite · Single · Breakfast        ₹2,688  (stable)
  suite-d-cp       Suite · Double · Breakfast        ₹1,920  (varies)
  executive-s-ep   Executive · Single · Room Only    ₹5,400  (stable across all dates)
  executive-d-ep   Executive · Double · Room Only    ₹5,000  (varies)
  executive-s-cp   Executive · Single · Breakfast    ₹2,040  (varies)
  executive-d-cp   Executive · Double · Breakfast    ₹1,700  (stable)
```

### 2.5 FE Contract — What the FE Currently Sends When Saving a Room Mapping

File: `src/api/services/aiosellService.js:57`

```javascript
export const saveRoomMapping = async (mappings) => {
  const payload = {
    mappings: mappings.map(m => ({
      restaurant_table_id:   m.restaurantTableId,
      aiosell_room_code:     m.aiosellRoomCode,
      aiosell_rateplan_code: m.aiosellRateplanCode ?? null,  // ← FE sends this
    })),
  };
  const res = await api.post('/api/v2/vendoremployee/aiosell/room-mapping', payload);
  return res.data;
};
```

Channel Manager page (`ChannelManagerPage.jsx:168`) currently hardcodes
`aiosellRateplanCode: null` — no UI exists yet to pick a rateplan.
The field IS in the POST body but always `null`.

### 2.6 FE Transform — What the FE Already Reads Back

File: `src/api/transforms/aiosellTransform.js:56`

```javascript
mappings: Array.isArray(d.mappings) ? d.mappings.map(m => ({
  restaurantTableId:   m.restaurant_table_id   ?? null,
  aiosellRoomCode:     m.aiosell_room_code     ?? null,
  aiosellRateplanCode: m.aiosell_rateplan_code ?? null,  // ← FE reads this — just always null
})) : [],
```

The FE transform is **already wired**. The moment the backend returns a non-null
`aiosell_rateplan_code`, the FE will have it in `rooms.mappings[n].aiosellRateplanCode`.

---

## 3. Two Backend Changes Needed

---

### CHANGE 1 — Persist `aiosell_rateplan_code` in the Room Mapping Table

**What:** When `POST /aiosell/room-mapping` is called with a non-null `aiosell_rateplan_code`,
the backend must **save that value to the DB** and **return it in `GET /aiosell/rooms`**.

**Current behaviour (confirmed by probe):**
The field is `null` for all rows despite being in the schema. Either:
- The column exists but the POST endpoint ignores the field entirely, OR
- The column exists and is saved, but nothing has ever sent a non-null value

In either case, we need confirmation that a non-null value sent in POST is:
1. Validated against the Aiosell rateplan list for that room_code
2. Persisted to the DB
3. Returned in `GET /aiosell/rooms` → `data.mappings[].aiosell_rateplan_code`

**POST payload shape (no change to endpoint, just stop ignoring the field):**

```
POST /api/v2/vendoremployee/aiosell/room-mapping
Content-Type: application/json
Authorization: Bearer <token>

{
  "mappings": [
    {
      "restaurant_table_id":   8524,
      "aiosell_room_code":     "suite",
      "aiosell_rateplan_code": "suite-s-ep"     ← persist this
    },
    {
      "restaurant_table_id":   8525,
      "aiosell_room_code":     "suite",
      "aiosell_rateplan_code": "suite-s-ep"     ← persist this
    },
    {
      "restaurant_table_id":   8526,
      "aiosell_room_code":     "executive",
      "aiosell_rateplan_code": "executive-s-ep" ← persist this
    },
    {
      "restaurant_table_id":   8527,
      "aiosell_room_code":     "suite",
      "aiosell_rateplan_code": "suite-s-ep"     ← persist this
    },
    {
      "restaurant_table_id":   8528,
      "aiosell_room_code":     "executive",
      "aiosell_rateplan_code": "executive-s-ep" ← persist this
    }
  ]
}
```

**Expected GET /aiosell/rooms response AFTER the fix:**

```json
"mappings": [
  {
    "id": 3,
    "restaurant_table_id": 8524,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": "suite-s-ep",    ← non-null after fix
    "table": { "id": 8524, "table_no": "r3", "rtype": "RM" }
  },
  {
    "id": 4,
    "restaurant_table_id": 8525,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": "suite-s-ep",    ← non-null after fix
    "table": { "id": 8525, "table_no": "r4", "rtype": "RM" }
  },
  {
    "id": 2,
    "restaurant_table_id": 8526,
    "aiosell_room_code":     "executive",
    "aiosell_rateplan_code": "executive-s-ep", ← non-null after fix
    "table": { "id": 8526, "table_no": "r2", "rtype": "RM" }
  },
  {
    "id": 5,
    "restaurant_table_id": 8527,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": "suite-s-ep",    ← non-null after fix
    "table": { "id": 8527, "table_no": "r5", "rtype": "RM" }
  },
  {
    "id": 6,
    "restaurant_table_id": 8528,
    "aiosell_room_code":     "executive",
    "aiosell_rateplan_code": "executive-s-ep", ← non-null after fix
    "table": { "id": 8528, "table_no": "r1", "rtype": "RM" }
  }
]
```

**Validation rule (recommended):**
`aiosell_rateplan_code` must be a valid `rateplan_id` from the Aiosell property's room
configuration for the given `aiosell_room_code`. If an invalid code is sent, return 422.

---

### CHANGE 2 — Add `room_code_defaults` to GET /aiosell/rooms Response

**What:** Add a new top-level object to `GET /aiosell/rooms` → `data` that gives
the default rateplan per Aiosell room_code for this property.

**Why separate from Change 1:**
Change 1 is per-room (one room can have a different default than another room of the
same type). Change 2 is per-room-type (all suite rooms share the same default). The
property-level default from Change 2 is what the FE uses as a **fallback** when
a specific room has no `aiosell_rateplan_code` set (e.g. newly added rooms).

**Expected new field in GET /aiosell/rooms response:**

```json
{
  "status": true,
  "message": "Aiosell rooms fetched successfully",
  "data": {
    "property":    { ... },
    "mapping":     { ... },
    "mappings":    [ ... ],
    "local_rooms": [ ... ],
    "aiosell":     { ... },
    "availability": { ... },

    "room_code_defaults": {           ← NEW FIELD
      "suite":     "suite-s-ep",
      "executive": "executive-s-ep"
    }
  }
}
```

**How the FE will use this:**

```
Priority order when room is selected:
  1. rooms.mappings[room.id].aiosellRateplanCode   ← per-room override (Change 1)
  2. rooms.roomCodeDefaults[room.roomType]          ← property-level default (Change 2)
  3. null → no auto-fill, staff types manually     ← fallback (current behaviour)
```

**How to populate `room_code_defaults`:**
- Backend team sets this in the property/configuration table
- Suggested defaults for sandbox-pms (Goan Kitchen):
  - `suite` → `suite-s-ep` (Room Only, Single — ₹9,000 base rate, stable)
  - `executive` → `executive-s-ep` (Room Only, Single — ₹5,400 base rate, stable)
- Owner can override per-room via the Channel Manager UI (Change 1) once that is built

---

## 4. How the FE Will Use These Changes (End-to-End Flow)

Once both backend changes are shipped, this is the full auto-fill flow:

```
Staff opens /pms/new-booking

[Page load]
  getBookableRooms()                               ← already called today
    → GET /aiosell/rooms
    → reads mappings[].aiosell_rateplan_code        ← non-null after Change 1
    → reads room_code_defaults                      ← new after Change 2
    → builds rateplanByRoomId = { 8524: 'suite-s-ep', 8525: 'suite-s-ep', ... }

[Staff selects check-in date: 2026-09-20]
  checkin = '2026-09-20'

[Staff clicks room r4 (id=8525)]
  setRoomId(8525)
  selectedRoom.defaultRateplan = rateplanByRoomId[8525] = 'suite-s-ep'

  → call getRatesData({ startDate: '2026-09-20', endDate: '2026-09-20' })
      POST /aiosell/fetch-rates { start_date: '2026-09-20', end_date: '2026-09-20' }
      → dateRateMap['2026-09-20']['suite-s-ep'] = 9000  (or whatever rate on that date)

  → setAmount(9000)    ← Room Amount auto-fills ₹9,000  (staff can override)

Staff can see: Room r4 · Suite · ₹9,000/night
Staff can change the amount if the rate is different (e.g. special price)
```

**Same flow applies to `/pms/check-in` when staff selects a room.**

---

## 5. FE Changes That Follow (Blocked Until Backend Ships)

After the backend ships both changes, the FE needs:

| File | Change | Scope |
|---|---|---|
| `src/api/services/pmsService.js` | `getBookableRooms()` — read `aiosellRateplanCode` from mappings + `roomCodeDefaults` from new field | ~5 lines |
| `src/pages/pms/NewBookingPage.jsx` | `useEffect` on `[roomId, checkin]` → fetch rate → `setAmount` | ~10 lines |
| `src/pages/pms/CheckInPage.jsx` | Same `useEffect` pattern on room selection | ~10 lines |
| `src/pages/pms/ChannelManagerPage.jsx` | Add rateplan dropdown per room so owner can set/change default | ~30 lines (CR-384) |
| `src/api/transforms/aiosellTransform.js` | Add `roomCodeDefaults` to `fromRooms()` transform | ~3 lines |

Total FE scope after backend fix: **~5 files, ~60 lines, LOW risk.**

---

## 6. Edge Cases for Backend to Handle

| Case | Expected behaviour |
|---|---|
| `aiosell_rateplan_code` sent as `null` in POST | Clear the field (set to null) — owner is removing the default |
| `aiosell_rateplan_code` sent with an invalid code | Return 422 with message: `"aiosell_rateplan_code 'xyz' is not a valid rateplan for room_code 'suite'"` |
| Room mapping updated (room re-assigned to different room_code) | `aiosell_rateplan_code` should reset to null (old rateplan belongs to old room_code) |
| Hotel has no Aiosell (non-CM hotel) | `room_code_defaults` should be an empty object `{}` — no error |
| `fetch-rates` returns no rate for requested date | FE falls back: shows ₹0, staff types manually |

---

## 7. Summary of Asks

| Ask | Endpoint | Type | FE blocked until? |
|---|---|---|---|
| **Change 1** | `POST /aiosell/room-mapping` — persist `aiosell_rateplan_code` when non-null | DB + validation | Yes |
| **Change 1** | `GET /aiosell/rooms` — return non-null `aiosell_rateplan_code` per mapping row | Response shape | Yes |
| **Change 2** | `GET /aiosell/rooms` — add `data.room_code_defaults: { room_code → rateplan_code }` | Response shape (new field) | Yes |

**Both changes are to existing endpoints.** No new endpoints needed.
**No changes to `fetch-rates`** — that endpoint already works correctly.

---

## 8. Testing the Fix

Once shipped, verify with:

```
# Step 1: Save a mapping with a rateplan
POST /api/v2/vendoremployee/aiosell/room-mapping
{ "mappings": [{ "restaurant_table_id": 8525, "aiosell_room_code": "suite", "aiosell_rateplan_code": "suite-s-ep" }] }
→ expect 200

# Step 2: Read it back
GET /api/v2/vendoremployee/aiosell/rooms
→ data.mappings[].aiosell_rateplan_code = "suite-s-ep"  ✅ (was null before)
→ data.room_code_defaults = { "suite": "suite-s-ep", "executive": "executive-s-ep" }  ✅ (new field)

# Step 3: Rate lookup
POST /api/v2/vendoremployee/aiosell/fetch-rates { start_date: TODAY, end_date: TODAY }
→ data.aiosell.body.updates[0].rates includes { roomCode: 'suite', rateplanCode: 'suite-s-ep', rate: 9000 }  ✅
```

---

*Filed: 2026-09-15 · INVESTIGATION agent (ALPHA v0.7)*
*Linked CR: CR-384 (FE Channel Manager rateplan picker + auto-fill wiring)*
*Evidence: `evidence/INV-PMS-ENH/probe_04_rooms.json` · `evidence/INV-PMS-ENH/probe_09_fetch_rates.json`*
