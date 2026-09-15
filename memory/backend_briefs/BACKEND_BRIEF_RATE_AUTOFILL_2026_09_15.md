# BACKEND_BRIEF_RATE_AUTOFILL_2026-09-15

## Summary
- **Issue:** Room Amount field shows ₹0 when staff selects a room at New Booking or Check-In.
  The rating engine (`fetch-rates`) has live per-date rates per room type, but the FE cannot
  auto-fill the correct rate because no default rateplan is configured per room.
  The mapping table has an `aiosell_rateplan_code` column that is `null` for all 5 rooms.
- **Classification:** CONTRACT_MISMATCH — field exists in schema, FE sends it, but is never
  populated. Staff must manually type the room amount every single booking.
- **Frontend impact:** New Booking (`/pms/new-booking`) and Check-In (`/pms/check-in`) —
  Room Amount field always shows ₹0 on room selection. Staff must type the rate from memory.
  Risk of incorrect amounts, pricing inconsistency across bookings.
- **Priority/Risk:** P1 / MEDIUM — operational friction on every booking. Not financial corruption,
  but rate errors are possible when staff type manually.

---

## Context — How the FE Rate Auto-Fill Will Work (Once Unblocked)

This is the intended flow once the backend fix ships:

```
1. Staff opens New Booking
2. Staff sets Check-in date (e.g. 2026-09-20)
3. Staff selects room r4

FE already knows:  r4 (id=8525) → aiosell_room_code = 'suite'  [from GET /aiosell/rooms mapping]
FE will read:      r4 (id=8525) → aiosell_rateplan_code = 'suite-s-ep'  ← THIS IS THE MISSING PIECE

FE calls:  POST /aiosell/fetch-rates  { start_date: '2026-09-20', end_date: '2026-09-20' }
FE reads:  dateRateMap['2026-09-20']['suite-s-ep'] = 9000

FE auto-fills:  Room Amount = ₹9,000  (editable — staff can override)
```

The entire FE pipeline is already built. `aiosellTransform.fromAPI.rooms()` already maps
`aiosell_rateplan_code` from the response. `getRatesData()` already exists.
The only missing data is a non-null `aiosell_rateplan_code` per room.

---

## Endpoints

### 1. GET — Rooms + Mapping (read)
- **Method:** GET
- **URL:** `/api/v2/vendoremployee/aiosell/rooms`
- **Auth:** vendor-employee token (owner role)

### 2. POST — Save Room Mapping (write)
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/aiosell/room-mapping`
- **Auth:** vendor-employee token (owner role)

### 3. POST — Fetch Rates (already live, FE uses this)
- **Method:** POST
- **URL:** `/api/v2/vendoremployee/aiosell/fetch-rates`
- **Auth:** vendor-employee token (owner role)
- **Status:** ✅ Working correctly — returns rates per rateplan per date.

---

## Current State vs Required State

### GET /aiosell/rooms — `mappings[]` response (current)

```json
"mappings": [
  {
    "id": 3,
    "restaurant_table_id": 8524,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": null,       ← always null for all 5 rooms
    "table": { "id": 8524, "table_no": "r3", "rtype": "RM" }
  },
  {
    "id": 4,
    "restaurant_table_id": 8525,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": null,       ← always null
    "table": { "id": 8525, "table_no": "r4", "rtype": "RM" }
  },
  {
    "id": 2,
    "restaurant_table_id": 8526,
    "aiosell_room_code":     "executive",
    "aiosell_rateplan_code": null,       ← always null
    "table": { "id": 8526, "table_no": "r2", "rtype": "RM" }
  },
  {
    "id": 5,
    "restaurant_table_id": 8527,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": null,       ← always null
    "table": { "id": 8527, "table_no": "r5", "rtype": "RM" }
  },
  {
    "id": 6,
    "restaurant_table_id": 8528,
    "aiosell_room_code":     "executive",
    "aiosell_rateplan_code": null,       ← always null
    "table": { "id": 8528, "table_no": "r1", "rtype": "RM" }
  }
]
```

### GET /aiosell/rooms — `mappings[]` required state

```json
"mappings": [
  {
    "id": 3,
    "restaurant_table_id": 8524,
    "aiosell_room_code":     "suite",
    "aiosell_rateplan_code": "suite-s-ep",    ← populated with default rateplan
    "table": { "id": 8524, "table_no": "r3", "rtype": "RM" }
  },
  ...
]
```

`aiosell_rateplan_code` must be a valid rateplan_id that exists in the Aiosell property's
rateplans for that room_code (e.g. `"suite-s-ep"`, `"executive-s-ep"`).

---

## Available Rateplans Per Room Type (from live fetch-rates probe, 2026-09-08)

```
room_code = "suite"
  suite-s-ep    Room Only, Single    ₹9,000/night  (stable across all probed dates)
  suite-d-ep    Room Only, Double    ₹1,800/night
  suite-s-cp    Breakfast, Single    ₹2,688/night
  suite-d-cp    Breakfast, Double    ₹1,920/night

room_code = "executive"
  executive-s-ep    Room Only, Single    ₹5,400/night  (stable across all probed dates)
  executive-d-ep    Room Only, Double    ₹5,000/night
  executive-s-cp    Breakfast, Single    ₹2,040/night
  executive-d-cp    Breakfast, Double    ₹1,700/night
```

Note: the `-ep` (European Plan = Room Only) + `-s` (Single occupancy) rateplan
is the base rate and has been **stable across all 7 probed dates**. This is likely
the most appropriate default for new bookings.

---

## Two Questions for the Backend Team

### Q1 — Does POST /aiosell/room-mapping currently persist `aiosell_rateplan_code`?

The FE already sends `aiosell_rateplan_code` in every mapping save:

```json
POST /api/v2/vendoremployee/aiosell/room-mapping
{
  "mappings": [
    {
      "restaurant_table_id":   8525,
      "aiosell_room_code":     "suite",
      "aiosell_rateplan_code": null        ← FE currently hardcodes null
    }
  ]
}
```

The FE will change this to send a real rateplan code (e.g. `"suite-s-ep"`).
**Does the backend currently save and return a non-null value if we send one?
Or is the column ignored on write / always overridden to null?**

Please confirm:
- **A)** Backend already persists it — just send a non-null value from the FE ✅
- **B)** Backend ignores / overrides the field — needs a backend fix to persist it

### Q2 — Can we set the default rateplan per room_code at the property level?

As an alternative to per-room configuration, the backend could expose a simpler
per-room-code default:

```json
"room_code_defaults": {
  "suite":     "suite-s-ep",
  "executive": "executive-s-ep"
}
```

...returned anywhere in the `GET /aiosell/rooms` response. This would mean all suite rooms
use the same default rateplan, which is fine for most properties.

**Is this simpler to implement on the backend side?**

---

## What the FE Will Do Once This Is Answered

Once `aiosell_rateplan_code` is non-null in the rooms response:

```javascript
// In getBookableRooms() — pmsService.js
// Currently:
{ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null, ... }

// Will become:
{ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null,
  defaultRateplan: rateplanById[r.id] ?? null }   // ← reads aiosell_rateplan_code

// In NewBookingPage / CheckInPage — when room is selected + check-in date is set:
const rates = await getRatesData({ startDate: checkin, endDate: checkin });
const defaultRate = rates.dateRateMap[checkin]?.[selectedRoom.defaultRateplan] ?? null;
if (defaultRate) setAmount(defaultRate);   // editable — staff can still override
```

**FE changes needed after backend confirms:** 2 files (`pmsService.js` + `NewBookingPage.jsx` / `CheckInPage.jsx`).
No new endpoints needed. No schema changes on the FE side.

---

## What We Also Need in Channel Manager UI (FE Task — separate)

Once the backend confirms it will persist `aiosell_rateplan_code`, the Channel Manager page
(`/pms/channel-manager`) needs a **rateplan selector** per room so the owner can set/change
the default. Currently it saves `aiosellRateplanCode: null` hardcoded.

This is a separate FE task (not part of this brief) — registering as CR-384.

---

## Evidence

- Rooms probe (mappings + rateplans): `evidence/INV-PMS-ENH/probe_04_rooms.json`
- Rates probe (7 dates, all rateplans + rates): `evidence/INV-PMS-ENH/probe_09_fetch_rates.json`
- Compiled evidence: `evidence/BUG-2A/evidence_rate_autofill_2026_09_15.json`
- FE service contract: `src/api/services/aiosellService.js:57` (`saveRoomMapping`)
- FE transform: `src/api/transforms/aiosellTransform.js:56` (`aiosellRateplanCode` already mapped)

---

## Frontend Workaround
- **Available:** YES (fallback only)
- **Details:** FE can use a rule ("always pick the `-s-ep` rateplan for the room_code")
  without any backend change. This works but bypasses property-specific configuration.
  Recommended only if Q1 answer is B (backend cannot persist the field).

---

*Filed 2026-09-15 · INVESTIGATION agent (ALPHA v0.7)*
*Waiting on: Q1 answer (does backend persist aiosell_rateplan_code?) and Q2 answer (property-level default)*
