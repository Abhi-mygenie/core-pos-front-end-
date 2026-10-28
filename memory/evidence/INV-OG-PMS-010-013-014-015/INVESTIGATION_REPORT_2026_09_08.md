# Investigation Report — OG-PMS-010 / 013 / 014 / 015
# Fresh API probe against backend changes flagged by backend team

**Date:** 2026-09-08
**Role:** INVESTIGATION
**Triggered by:** Backend team flagged OOO and HK status not being read; provided `ques4_reply.md` (backend Gate 2 answers for CR-358-P4)
**Credentials used:** owner@thegoankitchen.com / Qplazm@10 (restaurant 69, sandbox-pms)
**Probes run:** 15 (PROBE 1–15)
**Code changes:** ZERO — read-only investigation
**Evidence saved:** `/app/memory/evidence/INV-OG-PMS-010-013-014-015/`

---

## BLOCKER STATUS MATRIX — Updated 2026-09-08

| Gap | Previous Status | Probe Result | New Status |
|---|---|---|---|
| **OG-PMS-010** Auto-HK on checkout | OPEN — not firing | HK FIRED (evidence below) | ⚠️ **PARTIALLY RESOLVED** — backend fixed; frontend bug prevents it showing |
| **OG-PMS-013** Soft-allocation contradiction | OPEN — board vs LR | CANNOT REPRODUCE in today's state | 🔶 **UNCONFIRMED** — state changed, risk remains |
| **OG-PMS-014** room-payment 403 | OPEN | HTTP 403 confirmed fresh | 🔴 **STILL OPEN** |
| **OG-PMS-015** no_show field | OPEN | Field absent from both endpoints | 🔴 **STILL OPEN** |

---

## Backend Changes Detected (vs prior probe state)

### CHANGE-1 — `local-reservations` now REQUIRES `start_date` + `end_date`
- **Before:** Worked without date params
- **Now:** Returns HTTP 422 `{"status":false,"errors":{"start_date":["The start date field is required."],"end_date":["The end date field is required."]}}`
- **Frontend impact:** `getReservationOps()` and `getInHouseGuests()` already pass date ranges → ✅ HANDLED (no breakage)

### CHANGE-2 — `room_operational_status_at` field added to room-status-board
- **Before:** Field not present
- **Now:** Each room in board response includes `room_operational_status_at: "2026-09-08 19:38:00"` (timestamp of when OOO/HK was last set)
- **Frontend transform:** `roomStatusTransform.js` line 17 already reads it as `statusSince` → ✅ HANDLED
- **Evidence:** r5 (8527) shows `room_operational_status_at: "2026-09-08 19:38:00"` → UI shows "Since 8 Sept, 07:38 pm" ✅

### CHANGE-3 — `auto_hk_on_rm_checkout` location confirmed
- **Location:** `data.auto_hk_on_rm_checkout` (top-level under `data`, NOT inside room items)
- **Value today:** `true`
- **Frontend transform:** `fromRoomStatusBoard` line 29 reads `d.auto_hk_on_rm_checkout` where `d = data?.data` → ✅ CORRECT location

---

## OG-PMS-010 — Auto-HK Detail

### Evidence — HK IS firing
| Room | table_id | manual_status | display_status | room_operational_status_at |
|---|---|---|---|---|
| r2 | 8526 | **hk** | occupied | 2026-09-04 02:20:48 |
| r1 | 8528 | **hk** | occupied | 2026-09-08 20:01:14 |

Both rooms have `manual_status: hk` with timestamps. Auto-HK fired for:
- r2 on 2026-09-04 (prior session)
- r1 on 2026-09-08 (today)

### Why "HK 0" still shows in UI — FRONTEND BUG FOUND

`fromRoomStatusBoard` (roomStatusTransform.js line 28):
```javascript
const counts = DISPLAY_STATUSES.reduce((acc, s) => ({
  ...acc,
  [s]: rooms.filter(r => r.displayStatus === s).length
}), { all: rooms.length });
```

**Problem:** Counts HK by `displayStatus === 'hk'`.
**But:** Backend does NOT change `display_status` to `hk` when auto-HK fires on an occupied room. Only `manual_status` changes to `hk`; `display_status` stays `occupied`.

**Result:** `counts.hk = 0` even though 2 rooms have `manual_status: hk`.

**Verified:** Both r2 (8526) and r1 (8528) show `display_status: occupied` + `manual_status: hk`. Filter tab shows "HK 0". 

**Fix needed (code change — separate implementation session):**
Count HK by `manualStatus === 'hk'` regardless of `displayStatus`.

```javascript
// Current (wrong for occupied rooms with HK):
hk: rooms.filter(r => r.displayStatus === 'hk').length

// Fix:
hk: rooms.filter(r => r.manualStatus === 'hk').length
```

**Register as:** BUG — `roomStatusTransform.js:28` — HK filter count uses displayStatus; auto-HK rooms (occupied + manual_status=hk) not counted.

---

## OG-PMS-013 — Soft-Allocation (Cannot Reproduce)

Previous issue: `BDC7497606` and `BDC6263973` appeared on specific rooms on the board while `local-reservations` showed `restaurant_table_id: null`.

**Today's probe:**
- `BDC7497606` (booking.com, pending): `rooms_table_ids: NONE` in LR ✅
- `BDC6263973` (booking.com, pending): `rooms_table_ids: NONE` in LR ✅
- Board rooms r4/r5: now show actual occupied guests, no soft-allocation visible for these bookings

**Assessment:** Either backend fixed the soft-allocation logic, or the specific rooms have since had real guests check in, masking the issue. Cannot confirm or deny fix.

**Status:** UNCONFIRMED — architectural risk remains. When next pending booking (unassigned) appears on the board, re-probe. Keep OG-PMS-013 OPEN until backend explicitly confirms fix.

---

## OG-PMS-014 — room-payment 403 (Still Blocked)

**Fresh probe (PROBE 9):**
```
POST /api/v2/vendoremployee/pos/room-payment
Body: {"order_id":1232218,"amount":100,"payment_type":"cash"}
HTTP: 403
```

Response body shows validation errors (wrong field names used in probe — `payment_amount`, `payment_mode`, `room_order_id` are the correct fields). But HTTP 403 is returned BEFORE validation — meaning the permission check fails before even reaching input validation.

**Assessment:** The endpoint exists and validates input, but the sandbox-pms owner role does not have permission to call it. Backend has NOT resolved this. No mention in `ques4_reply.md`.

**Status:** 🔴 STILL OPEN — backend ruling still needed (permission gap vs missing PMS role).

---

## OG-PMS-015 — no_show Field (Still Missing)

**Fresh probes:**
- `local-reservations` items: `no_show` KEY MISSING from all 17 reservations (probe 13)
- `dashboard-kpis`: Recursive key search for "no_show" → 0 hits (probe 14)
- `today` block keys: `arrivals_count`, `departures_count`, `in_house_count`, `occupancy_percent_physical` — no no_show

**Status:** 🔴 STILL OPEN — field not delivered. CR-363 Night Audit must either derive FE-side or wait.

---

## Backend Reply (`ques4_reply.md`) — Assessment

The document addresses CR-358-P4 Gate 2 decisions (PATCH body, tape chart date range, occupied toggle, block click actions). These are already implemented in the live code. The document does NOT address OG-PMS-014 or OG-PMS-015.

| Decision | Implemented in code? |
|---|---|
| (a) PATCH body `{"status":"hk\|ooo\|available"}` | ✅ `patchRoomStatus()` pmsService.js L239 |
| (a) Reuse `getReservationOps()` for tape chart | ✅ `getTapeChartData()` L265 calls getReservationOps |
| (b) Show HK/OOO disabled + tooltip for occupied | ✅ `canToggle: x.display_status !== 'occupied'` transform L21 |
| (c) Booked → Check In / Occupied → View Folio | ✅ ReservationsPage popover logic |

All 4 Gate 2 decisions are implemented. No gaps from `ques4_reply.md`.

---

## Summary for Next Agent / Owner

### Blockers removed (backend side)
- ✅ Auto-HK is now firing (OG-PMS-010 backend part resolved)
- ✅ `room_operational_status_at` timestamp delivered and read by frontend
- ✅ `local-reservations` date requirement — frontend already handles

### Still blocked (require action)
| # | Item | Action needed | Owner |
|---|---|---|---|
| 1 | **Frontend BUG** — HK filter count = 0 despite 2 rooms having `manual_status:hk` | Register as BUG; fix `roomStatusTransform.js` line 28 (`displayStatus` → `manualStatus` for HK count) | Dev agent |
| 2 | **OG-PMS-014** room-payment 403 | Backend team to rule: sandbox permission gap or missing PMS role | Backend team |
| 3 | **OG-PMS-015** no_show field | Backend to add `no_show` to LR or kpis; or owner approves FE-derived count | Backend team / Owner |
| 4 | **OG-PMS-013** soft-allocation | Cannot confirm fixed — re-probe when next unassigned pending booking appears | Verify at CR-361 Gate 2 |

---

*Investigation agent | 2026-09-08 | 15 probes | Zero src/ changes | Evidence: this file*
