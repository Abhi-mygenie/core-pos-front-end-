# BUG-378 — Gate 2: Impact Analysis
## PMS In-House Guests: Room/Phone/Dates/Balance all show "—"

**Doc:** `memory/impact/BUG-378_IMPACT_ANALYSIS.md`
**Date:** 2026-09-03
**Agent Role:** PLANNING — Gate 2 (Impact Analysis only. Gate 3 / Implementation Plan NOT written.)
**Intake:** `memory/change_requests/BUG-378_IN_HOUSE_GUESTS_INCOMPLETE_DATA_INTAKE.md`
**Risk:** MEDIUM
**Probe evidence:** `memory/evidence/BUG-378/` (GET_ROOM_LIST + local-reservations probes 2026-09-03)

---

## §0 — Code Reality Check

```bash
grep -rn "checkinDate\|checkoutDate\|balance.*local\|op_status.*in_house\|order_id.*join" \
  src/api/services/pmsService.js src/pages/pms/InHouseGuestsPage.jsx
# → 0 results — no fix code exists yet
```

**Code Reality: PARTIAL**
- `InHouseGuestsPage.jsx` exists (168 lines) — reads wrong field names (`tableNo`, `orderNo`)
- `pmsService.getInHouseGuests()` exists (30 lines) — single GET_ROOM_LIST call only, no join logic
- `roomListTransform.transformRoomListToRows()` exists (61 lines) — does NOT map `phone`
- Fix code: NONE — full scope is new work

---

## §1 — Conflict Pre-Check

| File | Last Modified By | Date | Conflict? |
|---|---|---|---|
| `api/transforms/roomListTransform.js` | CR-004 Phase 2 (original) | 2026-04-xx | **NONE** — additive field |
| `api/services/aiosellService.js` | CR-358-P1 | 2026-09-02 | **NONE** — additive function |
| `api/services/pmsService.js` | CR-358-P1 | 2026-09-02 | **NONE** — rewrite of buggy function only |
| `pages/pms/InHouseGuestsPage.jsx` | CR-358-P1 | 2026-09-02 | **NONE** — field name fix only |

**Conflict pre-check: CLEAN.** No other open items touch any of these files.

**Downstream consumers of `roomListTransform.transformRoomListToRows()` — impact of adding `phone` field:**

| Consumer | Reads `phone` from result? | Impact |
|---|---|---|
| `reportService.js` (lines 678, 709) | NO | NONE — additive field ignored |
| `RoomOrdersReportPage.jsx` | NO | NONE |
| `RoomRowCard.jsx` | NO | NONE |
| `RoomOrdersMockup.jsx` | NO | NONE |
| `pmsService.js` → `InHouseGuestsPage.jsx` | YES — this is the fix | ✅ intended |

---

## §2 — Risk Classification

**Risk: MEDIUM**

| Trigger | Risk |
|---|---|
| `pmsService.js` logic change — two async calls, join, graceful degradation | MEDIUM |
| `roomListTransform.js` — additive field only, no logic change | LOW |
| `aiosellService.js` — additive function only | LOW |
| `InHouseGuestsPage.jsx` — 4 field name renames, display only | LOW |
| No financial logic, no hotspot files (R5), no auth | — |

**Fast Lane:** NOT eligible — 4 files, async join logic, API integration.

---

## §3 — Data Flow Trace

### Current (broken)
```
user opens /pms/in-house
  → InHouseGuestsPage calls pmsService.getInHouseGuests()
  → pmsService calls roomService.getRoomList()
  → roomListTransform.transformRoomListToRows(raw)
      returns: { roomNumber, parentOrderId, guestName, [no phone, no dates, no balance] }
  → InHouseGuestsPage reads:
      row.tableNo       → undefined → "—"   (transform has roomNumber)
      row.orderNo       → undefined → "—"   (transform has parentOrderId)
      row.phone         → undefined → "—"   (not in transform)
      row.checkinDate   → undefined → "—"   (not in transform)
      row.checkoutDate  → undefined → "—"   (not in transform)
      row.balance       → undefined → "—"   (not in transform)
```

### Fixed (target)
```
user opens /pms/in-house
  → InHouseGuestsPage calls pmsService.getInHouseGuests()

  CALL 1: roomService.getRoomList()
    → roomListTransform.transformRoomListToRows(raw)
        now also maps: phone: u.phone ?? null
        returns: { roomNumber:"r2", parentOrderId:1232176, guestName:"WalkIn Probe Test",
                   phone:"9000111222", ... }

  CALL 2: aiosellService.getLocalReservations({ startDate: today-60, endDate: today+60 })
    → GET /api/v2/vendoremployee/aiosell/local-reservations?view=all&start_date=X&end_date=Y
    → filter: operational_status === 'in_house'
    → build lookup: { [rooms[0].order_id]: { res: reservation, room: room_line } }
    
    Confirmed from probe (2/2 matched):
      order_id 1232179 → "Future Guest"  : checked_in_at="2026-09-01 14:00", checkout="2026-09-09", amount=5000
      order_id 1232181 → "Test Guest"    : checked_in_at="2026-09-01 15:03", checkout="2026-09-10", amount=13922.28

  MERGE: for each room row
    match = lookup[row.parentOrderId]
    if match:
      row.checkinDate   = match.room.checked_in_at   → "2026-09-01"
      row.checkoutDate  = match.res.checkout          → "2026-09-09"
      row.balance       = match.res.amount_after_tax  → 5000
      row.channel       = match.res.channel           → "Direct"
    // walk-in (no match): phone from CALL 1, rest stay undefined → "—"

  GRACEFUL DEGRADATION: if CALL 2 fails (network/auth error)
    → catch silently → return rows from CALL 1 only
    → phone populated, dates/balance show "—"
    → no crash, no error state

  → InHouseGuestsPage reads:
      row.roomNumber    → "r2"           ✅
      row.parentOrderId → 1232176        ✅ (sub-label under guest name)
      row.phone         → "9000111222"   ✅ (all guests, incl. walk-in)
      row.checkinDate   → "2026-09-01"   ✅ (OTA/Direct) or "—" (walk-in)
      row.checkoutDate  → "2026-09-09"   ✅ (OTA/Direct) or "—" (walk-in)
      row.balance       → ₹5,000         ✅ (OTA/Direct) or "—" (walk-in)
```

---

## §4 — Affected Files (4 files — all MODIFY, no new files)

| # | File | Type | Change | Risk |
|---|---|---|---|---|
| 1 | `api/transforms/roomListTransform.js` | MODIFY | Add `phone: u.phone ?? null` after `guestName` in `rows.push({...})` | LOW |
| 2 | `api/services/aiosellService.js` | MODIFY | Add `getLocalReservations({ startDate, endDate })` function — calls `AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS` with POST or GET + query params | LOW |
| 3 | `api/services/pmsService.js` | MODIFY | (a) Add import of `getLocalReservations` from `./aiosellService`. (b) Rewrite `getInHouseGuests()`: two-call pattern (CALL 1 = GET_ROOM_LIST, CALL 2 = local-res), join on order_id, enrich rows, graceful degradation | MEDIUM |
| 4 | `pages/pms/InHouseGuestsPage.jsx` | MODIFY | 4 field renames: lines 38, 39, 136, 139 — `tableNo`→`roomNumber`, `orderNo`→`parentOrderId` | LOW |

### File 1 Detail — `roomListTransform.js`

Current `rows.push({...})` (lines 41–55):
```js
rows.push({
  _source: 'live',
  parentOrderId: r.order_id,
  restaurantOrderId: null,
  roomNumber: t.table_no || null,
  tableId: t.id || null,
  guestName,
  checkInDateTime: null,
  transferCount: null,
  food: null, total: null, paid: null, outstanding: null,
  _raw: r,
});
```
Add after `guestName`:
```js
  phone: u.phone ?? null,       // BUG-378: mapped from user.phone (confirmed in GET_ROOM_LIST response)
```

**⚠ Downstream impact check:** `reportService.js` (lines 678, 709), `RoomOrdersReportPage.jsx`, `RoomRowCard.jsx`, `RoomOrdersMockup.jsx` all use this transform — NONE reads a `phone` field from the result. Adding it is safe.

### File 2 Detail — `aiosellService.js`

Add after `fetchReservations()`:
```js
/**
 * GET /aiosell/local-reservations — fetch locally-stored reservations
 * Used by pmsService to join in-house guest enrichment data.
 * @param {{ startDate: string, endDate: string }} dateRange (YYYY-MM-DD)
 */
export const getLocalReservations = async ({ startDate, endDate }) => {
  const res = await api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, {
    params: { start_date: startDate, end_date: endDate },
  });
  return res.data;
};
```

**Note on `view` param:** Per probe findings, `view=in_house` is unreliable (returns 0 for early check-ins). Always fetch without `view` param or with `view=all` and filter `operational_status='in_house'` client-side.

### File 3 Detail — `pmsService.js`

Full rewrite of `getInHouseGuests()`. New logic:
1. Call `getRoomList()` → `roomListTransform.transformRoomListToRows(raw)` → rows with phone
2. Build date range: today − 60 days → today + 60 days
3. Call `getLocalReservations({ startDate, endDate })`
4. Filter result: `operational_status === 'in_house'`
5. Build `orderLookup`: `{ [rooms[0].order_id]: { res, room } }`
6. Enrich each room row with `checkinDate`, `checkoutDate`, `balance`, `channel` from lookup
7. Graceful degradation: wrap CALL 2 in try-catch — if it fails, rows from CALL 1 are still returned

Fields mapped from local-res per probe:
- `checkinDate` ← `match.room.checked_in_at` (e.g., "2026-09-01 14:00:04")
- `checkoutDate` ← `match.res.checkout` (e.g., "2026-09-09")
- `balance` ← `match.res.amount_after_tax` (e.g., 5000.00)
- `channel` ← `match.res.channel` (e.g., "Direct", "booking.com")

### File 4 Detail — `InHouseGuestsPage.jsx`

4 occurrences to change:

| Line | Current | Fixed |
|---|---|---|
| 38 | `r.tableNo` (search filter) | `r.roomNumber` |
| 39 | `r.orderNo` (search filter) | `r.parentOrderId` |
| 136 | `row.tableNo` (Room column cell) | `row.roomNumber` |
| 139 | `row.orderNo` (order sub-label) | `row.parentOrderId` |

Phone/checkinDate/checkoutDate/balance field names in the page are ALREADY CORRECT (lines 141–149) — they match what pmsService will return after fix.

---

## §5 — Files WILL NOT Touch (scope lock)

| File | Reason |
|---|---|
| `roomService.js` | Wrapped by pmsService — signature NOT changed |
| `RoomOrdersReportPage.jsx` | Downstream consumer of transform — unaffected by phone field addition |
| `RoomRowCard.jsx` | Same — unaffected |
| `reportService.js` | Same — unaffected |
| `RoomCheckInModal.jsx` | OD-01 co-exist |
| `DashboardPage.jsx` | OD-01 co-exist |
| `CollectPaymentPanel.jsx` | Checkout flow — unrelated |
| `App.js`, `Sidebar.jsx` | Frozen after CR-358-P1 |

---

## §6 — Owner Decisions

All decisions resolved. No open ODs.

| ID | Question | Answer |
|---|---|---|
| OD-1 | Data source for phone/dates/balance? | ✅ RESOLVED 2026-09-03 — local-reservations view=all + order_id join |
| — | view=in_house usable? | ❌ NO — returns 0 for early check-ins. Use view=all + client-side filter |
| — | Walk-in guest dates/balance? | "—" acceptable for Phase 1 (no AIOSELL reservation record exists) |

---

## §7 — Verification Matrix (seeds Gate 5 QA)

| # | Test | File | Expected | Automated? |
|---|---|---|---|---|
| V1 | Room column shows room number | `InHouseGuestsPage.jsx` | "r1", "r2", "r5" etc. (not "—") | NO |
| V2 | Phone shows for ALL guests (incl. walk-in) | `pmsService.js` + `roomListTransform.js` | "9000111222", "9876543210", "9888888888" | NO |
| V3 | Check-in date shows for OTA/Direct | `pmsService.js` | "2026-09-01" for matched guests | NO |
| V4 | Check-out date shows for OTA/Direct | `pmsService.js` | "2026-09-09", "2026-09-10" | NO |
| V5 | Balance shows for OTA/Direct | `pmsService.js` | ₹5,000 / ₹13,922 | NO |
| V6 | Walk-in guest: phone ✅, dates/balance "—" | `pmsService.js` | WalkIn Probe Test: phone=9000111222, checkinDate="—" | NO |
| V7 | local-res call fails → graceful degradation | `pmsService.js` | Page still loads, phone shows, dates/balance "—" | NO |
| V8 | Search by room number "r2" finds guest | `InHouseGuestsPage.jsx` | WalkIn Probe Test row returned | NO |
| V9 | KPI strip "In-House" count correct | `InHouseGuestsPage.jsx` | 3 | NO |
| V10 | `RoomOrdersReportPage` unaffected | `roomListTransform.js` | Existing report renders identically | NO |
| V11 | `getLocalReservations()` endpoint correct | `aiosellService.js` | GET to LOCAL_RESERVATIONS with start_date/end_date params | YES (curl) |

---

## §8 — Post-Code Registry Checklist (for Implementation agent)

```
□ 1. registry.json: BUG-378 → status: IMPLEMENTED, sprint_key: pos_pms_1
□ 2. BUG_TRACKER.md: BUG-378 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: all 4 files listed with BUG-378 + date
□ 4. Code markers: // BUG-378 in every modified file
□ 5. Compile check: webpack 0 new warnings
```

---

## §9 — Impact Analysis Summary

```
Planning complete: BUG-378
Stage: Impact Analysis (Gate 2 only)
Code reality: PARTIAL (page + service exist with bugs; no fix code written)
Risk: MEDIUM (pmsService two-call join with graceful degradation)
Conflict pre-check: CLEAN — no other items touching these 4 files

Files WILL change: roomListTransform.js (+1 line) · aiosellService.js (+~10 lines)
                   pmsService.js (rewrite getInHouseGuests, ~35 lines)
                   InHouseGuestsPage.jsx (4 field renames)
Files WILL NOT touch: roomService.js · RoomOrdersReportPage.jsx · RoomRowCard.jsx
                      reportService.js · RoomCheckInModal.jsx · DashboardPage.jsx
                      CollectPaymentPanel.jsx · App.js · Sidebar.jsx

Owner decisions: ALL RESOLVED (OD-1 confirmed via probe 2026-09-03)
Docs: impact/BUG-378_IMPACT_ANALYSIS.md (this doc)
Next: Gate 4 GO → Implementation
```

---

*Planning agent | BUG-378 Gate 2 | 2026-09-03 | Code reality: PARTIAL | Conflict: CLEAN | Risk: MEDIUM | All ODs resolved*
