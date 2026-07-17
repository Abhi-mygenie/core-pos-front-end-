# BUG-193: Room Transfer Trail — FROM ROOM = 0 + Table Transfers

**Registered:** 2026-07-11
**Updated:** 2026-07-11 (Investigation complete — API verified with palmhouse)
**Source:** OWNER-REPORTED
**Confidence:** HIGH
**Duplicate check:** DISTINCT
**Risk:** MEDIUM
**Severity:** P1
**Classification:** FE_BUG (data access) + BACKEND_DATA (from_room null)

## Description
Room Transfer Trail shows FROM ROOM = 0 for many entries, and table transfers may be leaking into the report.

## Investigation Findings

**API structure (verified with palmhouse, May 2026):**
The API returns 4 separate arrays:
```json
{
  "data": {
    "by_table": [...],
    "delivery_charges": {...},
    "room_transfers": [...],   // type="rm" — has from_room/to_room fields
    "table_transfers": [...]   // type="tb" — has from_table/to_table fields
  }
}
```
Backend ALREADY classifies room vs table using `type` field: `"rm"` = room, `"tb"` = table.

**Issue 1 — FE data access bug (SAME as BUG-194):**
`fetchInsightsLocations` returns `{ data: resp.data?.data, orderCount: 0 }`.
`RoomTransfersMockup.jsx:56` reads `rawData.room_transfers` → **undefined** (data is at `rawData.data.room_transfers`).
This is the SAME `.data` wrapper pattern as BUG-194 (Payments report).

**Issue 2 — Backend `from_room` always null (verified palmhouse):**
ALL 50 room transfers have:
```
from_room: null, from_room_id: null, from_room_name: null
to_room: "107", to_room_id: 4682, to_room_name: "107"   ← populated correctly
```
100% of room transfers have `from_room = null`. The FE displays this as "0".

**Issue 3 — Table transfers NOT leaking:**
The screenshot showed `from_room = 0` which is actually `null` from `room_transfers[]`. The backend correctly separates room and table transfers. Table transfers are NOT leaking — the FE just shows null as 0.

## Fix Required
- **FE** — Fix data access: read `rawData.data.room_transfers` instead of `rawData.room_transfers` (~1 line)
- **BACKEND** — Populate `from_room`, `from_room_id`, `from_room_name` in room_transfers (currently ALL null)
- **FE** — Display `from_room_name || from_room || '—'` instead of raw `from_room` to handle null gracefully

## Files
- `RoomTransfersMockup.jsx` L56, L58, L98
