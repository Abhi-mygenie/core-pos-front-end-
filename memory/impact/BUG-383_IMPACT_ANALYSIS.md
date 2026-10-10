# Impact Analysis — BUG-383
## RoomStatusPage: HK Filter Count Always 0 (manual_status vs displayStatus)

**ID:** BUG-383
**Gate:** 2 — Impact Analysis
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-09
**Sprint:** pos_pms_1
**Risk:** MEDIUM
**Code Reality:** PARTIAL (code exists with confirmed bug; all 4 edit targets located)

---

## §1. Conflict Pre-Check

| File | Last modifier | Open conflict? |
|---|---|---|
| `roomStatusTransform.js` | CR-358-P4 (2026-09-03) | ✅ Safe — CR-365 touches NEW `HousekeepingPage.jsx` only; not this file |
| `RoomStatusPage.jsx` | CR-358-P4 (2026-09-03) | ✅ Safe — no other open item touches this file |
| `roomStatusTransform.cr358p4.test.js` | CR-358-P4 (2026-09-03) | ⚠️ CR-368 lists this as a "fake test" (inline code) — edit is additive/corrective, no new CR-368 conflict |

**Ruling:** No blocking conflicts. All changes are contained within 2 source files + 1 test file.

---

## §2. Root Cause Trace

### Why counts.hk is always 0

```
GET /api/v2/vendoremployee/aiosell/room-status-board
  → rooms[]: each room has both display_status + manual_status fields
           r1/8528: display_status='hk',       manual_status='hk'   ← pure HK room
           r2/8526: display_status='occupied',  manual_status='hk'   ← occupied + needs HK
             ↓
roomStatusTransform.js:fromBoardRoom()
  manualStatus = x.manual_status   ✅ correctly mapped
  displayStatus = x.display_status  ✅ correctly mapped
             ↓
roomStatusTransform.js:fromRoomStatusBoard() L28
  counts = DISPLAY_STATUSES.reduce(
    (acc, s) => ({ [s]: rooms.filter(r => r.displayStatus === s).length })
  )
  → counts.hk = rooms where displayStatus === 'hk'
  → r1: displayStatus='hk'      → counted   (1)
  → r2: displayStatus='occupied' → NOT counted ✕
  → counts.hk = 1 (should be 2)
  → counts.hk = 0 in real preprod (r1 re-occupied after auto-HK)
             ↓
RoomStatusPage.jsx:
  FILTER CHIP L127:   board.counts.hk → shows 0   ✕
  BUTTON DISABLED L147: (board.counts.hk ?? 0) === 0 → always disabled ✕
  BUTTON LABEL L150:  Mark All Clean (0 HK) ✕
  handleBulkClean L78: hkIds = rooms.filter(r => r.displayStatus === 'hk') → [] ✕
  filter view L92:    rooms.filter(r => r.displayStatus === filter) → shows 0 for HK tab ✕
```

**Break points: roomStatusTransform.js:28 (counts) and RoomStatusPage.jsx:78+92 (handler+filter)**

---

## §3. All Affected Edits

| # | File | Line | Current (wrong) | Fixed | Why |
|---|---|---|---|---|---|
| E1 | `roomStatusTransform.js` | L28 | `rooms.filter(r => r.displayStatus === s).length` for hk | `rooms.filter(r => r.manualStatus === 'hk').length` for hk separately | Backend sets `manual_status: hk` even on occupied rooms; `display_status` stays `occupied` |
| E2 | `RoomStatusPage.jsx` | L78–90 | `hkIds = rooms.filter(r => r.displayStatus === 'hk')` + no warning | Separate into `cleanableIds` (non-occupied HK) + `occupiedHk` (occupied HK); show warning for occupied; only clean `cleanableIds` | OD-383-01: show warning for occupied-HK rooms; avoid 422 on PATCH |
| E3 | `RoomStatusPage.jsx` | L92 | `rooms.filter(r => r.displayStatus === filter)` for all chips | Special-case `filter === 'hk'` → `rooms.filter(r => r.manualStatus === 'hk')` | Without this: HK chip says "HK 2" but click shows 0 tiles — confusing |
| E4 | `roomStatusTransform.cr358p4.test.js` | L27+L64 | Inline copy has old count logic; asserts `counts.hk === 1` | Fix inline copy at L27 + update assertion L64: `=== 1` → `=== 2` | Keeps test file in sync with source; prevents false-positive pass |

**Files will NOT touch:** `pmsService.js` (bulkMarkClean stays unchanged), `App.js`, `Sidebar.jsx`, any other PMS pages.

---

## §4. Downstream Consumers of `counts.hk`

All consumers are within `RoomStatusPage.jsx` itself:

| Location | Uses | Impact of fix |
|---|---|---|
| L127 | `board.counts[c.key]` (chip badge) | ✅ Shows correct HK count |
| L147 | `(board.counts.hk ?? 0) === 0` (button disabled) | ✅ Button enabled when HK rooms exist |
| L150 | `Mark All Clean ({board.counts.hk ?? 0} HK)` (label) | ✅ Shows correct count |

No external consumer of `counts.hk` found outside `RoomStatusPage.jsx`.

---

## §5. OD-383-01 Design (Warning Behaviour)

**Decision:** “Show a warning” (locked 2026-09-09)

**Scenario:** User clicks “Mark All Clean” when some HK rooms have `displayStatus = 'occupied'`.

**Behaviour after fix:**
```
1. Compute hkRooms = rooms.filter(r => r.manualStatus === 'hk')
2. occupiedHk = hkRooms.filter(r => r.displayStatus === 'occupied')
3. cleanableIds = hkRooms.filter(r => r.displayStatus !== 'occupied').map(r => r.id)
4. IF occupiedHk.length > 0:
     toast.warning("{N} occupied room(s) with HK flag will be skipped — cannot mark clean while occupied.
     {M} room(s) will be marked clean.")
     IF cleanableIds.length === 0: return (all HK rooms are occupied, nothing to do)
5. bulkMarkClean(cleanableIds) → existing success/fail/warning handling unchanged
```

**Toast pattern:** uses `sonner` (`toast.warning()`) — consistent with existing inventory-sync warnings at L83+L87.

---

## §6. Note on transform comment A-P4-07

`roomStatusTransform.js` line 2 says: “UI state MUST use `displayStatus` (server precedence), never `manualStatus` (A-P4-07)”.

This rule applies to **tile rendering** (what colour/badge/actions to show on a room card). It does NOT apply to **counting** or **filtering** HK rooms for housekeeping workflow. The fix:
- Tile rendering: **unchanged** — `RoomTile` still reads `room.displayStatus` (L182)
- `canToggle`: **unchanged** — still `display_status !== 'occupied'` (correctly prevents PATCH on occupied)
- Only `counts.hk`, `hkIds`, and the `filter==='hk'` view change to use `manualStatus`

**A-P4-07 is NOT violated.**

---

## §7. Regression Risk

| Area | Risk | Reason |
|---|---|---|
| Other filter chips (occupied/booked/available/ooo) | ✅ NONE | E3 only special-cases `filter === 'hk'`; all other chips continue using `displayStatus` |
| `canToggle` (per-room disable logic) | ✅ NONE | Not touched |
| Per-room “Mark Clean” button (S7 action) | ✅ NONE | `handlePatch` not touched |
| `bulkMarkClean` service function | ✅ NONE | Called with correct ids; function signature unchanged |
| CR-358-P4 QA tests (unit + browser) | ⚠️ E4 updates inline copy + assertion | `counts.hk` now correctly 2 in fixture; test stays green |

---

## §8. Verification Matrix

| V# | Edit | File | Verify | Auto? |
|---|---|---|---|---|
| V1 | E1+E4 | roomStatusTransform + test | Run test file: `counts.hk === 2` for fixture with 2 manualStatus:hk rooms | YES |
| V2 | E1 | roomStatusTransform | `counts.occupied` still 2, `counts.booked` still 2 (non-HK counts unchanged) | YES |
| V3 | E3 | RoomStatusPage | Click HK filter chip → see occupied-HK rooms in grid | Browser |
| V4 | E2+OD-383-01 | RoomStatusPage | Click Mark All Clean with occupied-HK rooms → warning toast appears, rooms skipped | Browser |
| V5 | E2 | RoomStatusPage | Mark All Clean with pure-HK rooms (non-occupied) → no warning, cleans normally | Browser |
| V6 | E1 | RoomStatusPage | HK filter chip badge shows correct count (> 0) | Browser |
| V7 | E2 | RoomStatusPage | Mark All Clean button enabled when HK count > 0 | Browser |

---

## §9. Post-Code Registry Checklist

```
□ registry.json: BUG-383 → status: IMPLEMENTED, gate: 5a, sprint_key: pos_pms_1
□ BUG_TRACKER.md: row updated IMPLEMENTED Gate 5a
□ FILE_OWNERSHIP.md: 3 files listed with BUG-383 + date
□ Code markers: // BUG-383 in every modified file
□ webpack: 0 new errors
```

---

*Gate 2 CLOSED. 2026-09-09. 4 edits (0 NEW + 3 MOD + 1 TEST). 7 verification checks.*
*OD-383-01 locked: show a warning for occupied-HK rooms in Mark All Clean.*
*Awaiting Gate 4 GO → Implementation.*
