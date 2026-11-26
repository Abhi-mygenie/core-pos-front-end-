# BUG-398 Impact Analysis — Gate 2
## CR-163 Move Items: Path B hidden — missing roomNo fallback

**ID:** BUG-398
**Date:** 2026-09-13
**Planning agent:** ROLE 2 (AGENT_PROMPT_ALPHA v0.7)
**Risk:** HIGH (R5 hotspot — `OrderEntry.jsx`; change is 1 word, but file requires extra caution)
**Code Reality:** FULL — bug live at `OrderEntry.jsx:2798`

---

## §1 Owner Decisions

| OD | Decision |
|---|---|
| OD-398-S2 | Visual distinction for dynamic "Room r#" tables in picker — **NOT needed at this stage. Scoped out.** |

Zero open decisions. Proceed to Gate 3.

---

## §2 Data Flow Trace

```
CURRENT (broken):

  DashboardPage.setOrderEntryTable(tableEntry)   ← tableTransform shape
    table.tableNumber = api.table_no = "r5"      ← always populated

  OrderEntry:2798
    roomNo={orderData?.roomInfo?.roomNo}          ← api.room_info.room_no || null
    roomNo = undefined when room_info.room_no absent

  SplitRoomItemsModal:213
    {roomNo && ( <Create row /> )}                ← undefined → NEVER RENDERS

FIXED:

  OrderEntry:2798
    roomNo={orderData?.roomInfo?.roomNo || table?.tableNumber}
    roomNo = "r5" (always — from table.tableNumber as fallback)

  SplitRoomItemsModal:213
    {roomNo && ( <Create row /> )}                ← "r5" truthy → RENDERS ✅
    Create "Room r5" table row visible
```

---

## §3 Conflict Pre-Check

| File | Last modified by | Section | Conflict? |
|---|---|---|---|
| `OrderEntry.jsx` | CR-163 E2d (2026-09-13) | L2795–2802 (SplitRoomItemsModal mount) | **LOW** — BUG-398 edits L2798 inside the same block CR-163 touched. Verify exact current state before implementing (R4 from IA). |

**Verification (entry gate):** Confirm L2798 currently reads `roomNo={orderData?.roomInfo?.roomNo}` — if line has drifted, stop and re-identify.

---

## §4 Affected Files

| File | Change | Risk |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | L2798: add `\|\| table?.tableNumber` | HIGH (R5) |

**Files NOT touched:** `SplitRoomItemsModal.jsx`, `orderTransform.js`, `tableTransform.js`, `roomService.js`, `pmsService.js`, `DashboardPage.jsx`

---

## §5 Downstream Impact

| Area | Impact |
|---|---|
| Path B "Create Room r5" row | Now renders when `room_info.room_no` is absent — uses `table.tableNumber` ("r5") as fallback |
| Path B behaviour when `room_info.room_no` IS populated | Unchanged — `roomInfo.roomNo` takes precedence via `\|\|` short-circuit |
| "or" divider between Path A and Path B | Renders correctly — gated by same `roomNo &&` condition |
| Path A (free table cards) | Unaffected |
| `table.tableNumber` source | `tableTransform.js:54` `tableNumber: api.table_no` — always `"r5"`, `"r2"` etc. for room tables |
| Zero-regression risk | `\|\|` fallback is additive — when `roomInfo.roomNo` is set, behaviour is identical to today |

---

*Gate 2 closed. Proceeding to Gate 3.*
