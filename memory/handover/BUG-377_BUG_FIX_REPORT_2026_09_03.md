# BUG-377 — Fix Report
## PMS Room Mapping: Dropdown shows "— Unassigned —" despite "Mapped" status

**Date:** 2026-09-03
**Role:** BUG FIX agent
**Status:** FIXED — QA PASS (testing agent verified 2026-09-03)

---

## Fix Summary

| # | Test | Severity | RCA Classification | Root Cause | Fix | Files Changed | Verified |
|---|---|---|---|---|---|---|---|
| T1 | Room Mapping dropdown shows saved code when aiosellRooms empty | MAJOR | CODE_ERROR | `<select>` options built only from `aiosellRooms`; when empty, no `<option>` matches `pendingMappings[room.id]` — browser renders first option ("Unassigned") | Added fallback `<option>` rendering saved mapping code when it's absent from `aiosellRooms` catalogue | `ChannelManagerPage.jsx` | ✅ PASS — 5/5 rooms show "executive" / "suite" |
| T2 | Save Mapping button works after fix | MINOR | — | — | No change needed — seeding and save logic unaffected | — | ✅ PASS |
| T3 | All 4 tabs render without errors | MINOR | — | — | — | — | ✅ PASS |

**Root cause classification:** CODE_ERROR — plan intent was correct (mapped rooms show their room type), implementation missed the edge case where `aiosellRooms` catalogue is empty.

---

## Code Change

**File:** `pages/pms/ChannelManagerPage.jsx`
**Lines:** 424–433 (+4 lines)

```jsx
// BEFORE (lines 424–429)
<option value="">— Unassigned —</option>
{rooms.aiosellRooms.map(ar => (
  <option key={ar.roomCode} value={ar.roomCode}>
    {ar.roomName ?? ar.roomCode}
  </option>
))}

// AFTER
<option value="">— Unassigned —</option>
{/* BUG-377: fallback — show saved mapping code when aiosellRooms catalogue
    is empty or doesn't yet include the already-mapped room code */}
{pendingMappings[room.id] &&
  !rooms.aiosellRooms.some(ar => ar.roomCode === pendingMappings[room.id]) && (
  <option value={pendingMappings[room.id]}>{pendingMappings[room.id]}</option>
)}
{rooms.aiosellRooms.map(ar => (
  <option key={ar.roomCode} value={ar.roomCode}>
    {ar.roomName ?? ar.roomCode}
  </option>
))}
```

---

## Testing Agent Results

- **Success rate:** Frontend 100%
- **BUG-377 verified:** 5/5 rooms show correct mapping codes (4× executive, 1× suite)
- **Regression:** All 4 tabs render without errors; Save Mapping works; zero console errors
- **Test report:** `/app/test_reports/iteration_1.json`

## Cosmetic NOTE (separate from BUG-377)

Testing agent observed: some dropdown entries show empty text/value from `aiosellRooms.map()` when AIOSELL returns items with null `roomCode`. This is pre-existing and unrelated to BUG-377. Low priority — consider filtering in `aiosellTransform.fromAPI.rooms()` (`aiosellRooms: [...].filter(r => r.roomCode)`).

---

## EXIT GATE — 5/5 PASS

| # | Check | Result |
|---|---|---|
| □1 | registry.json: BUG-377 → IMPLEMENTED | ✅ |
| □2 | BUG_TRACKER.md: row updated | ✅ |
| □3 | FILE_OWNERSHIP.md: file listed | ✅ |
| □4 | Code marker `// BUG-377` in ChannelManagerPage.jsx | ✅ |
| □5 | Compile: `webpack compiled with 1 warning` (pre-existing) | ✅ |

---

## Scope Expansion: NONE

Fix touches exactly 1 file, 4 lines. No hotspot files. No financial logic. No adjacent code changed.

---

*Fix report: 2026-09-03 | BUG-377 | FIXED + QA PASS | EXIT GATE 5/5*
