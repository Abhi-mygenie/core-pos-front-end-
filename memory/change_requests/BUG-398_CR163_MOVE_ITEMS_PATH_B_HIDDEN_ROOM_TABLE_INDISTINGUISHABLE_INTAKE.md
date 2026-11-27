# BUG-398 Intake — CR-163 Move Items: Path B "Create Room" row hidden (missing roomNo fallback)

**ID:** BUG-398
**Date:** 2026-09-13
**Sprint:** pos_pms_1
**Registered by:** INTAKE agent (ALPHA v0.7)
**Source:** OWNER-REPORTED (screenshot 2026-09-13) + AGENT-INVESTIGATED (code trace confirmed)
**Related:** CR-163 (Gate 5b QA PASS — issue not caught due to stale test data)

---

## Classification

| Field | Value |
|---|---|
| **Type** | BUG |
| **Severity** | **P1 — HIGH** |
| **Risk** | **HIGH** — CR-163 Path B completely non-functional when `room_info.room_no` absent |
| **Area** | PMS → Room Order → Move Items modal (`SplitRoomItemsModal.jsx`) |
| **Source** | OWNER-REPORTED + CONFIRMED via code trace |
| **Confidence** | CONFIRMED |
| **Duplicate check** | **DISTINCT** |
| **Fast Lane** | NO — R5 hotspot file (`OrderEntry.jsx`) |

---

## Description

CR-163 Path B ("Create Room r5 table" row) is invisible in the Move Items modal. The orange dashed row with PlusCircle icon and "Dynamic" badge — fully implemented in `SplitRoomItemsModal.jsx` — never renders.

**Owner screenshot:** Move Items modal shows only 4 identical free table cards (Room r2, 1, 2, 3). No Create row. No "or" divider. Staff cannot use Path B.

---

## Root Cause — `CODE_ERROR`

```js
// OrderEntry.jsx:2798  ← CURRENT (wrong)
roomNo={orderData?.roomInfo?.roomNo}

// SplitRoomItemsModal.jsx:213
{roomNo && (          ← roomNo undefined → Create row never renders
  <Create "Room {roomNo}" table row />
)}
```

`roomNo` is sourced ONLY from `api.room_info.room_no`. When this field is absent (e.g. orders checked in via older path, probe session, or backend omits it), the prop becomes `undefined`.

**`table.tableNumber` is always available** (`table.table_no` = `"r5"`, `"r2"`, etc. — present on every room table from the order context) but is never used as a fallback.

**Fix — 1 line in `OrderEntry.jsx`:**
```js
roomNo={orderData?.roomInfo?.roomNo || table?.tableNumber}
```

---

## Evidence

- **Screenshot:** Modal shows 4 cards, no "or" divider, no Create row. Both gated by `{roomNo && ...}` → confirms `roomNo` = undefined at runtime.
- **Code trace:** `OrderEntry.jsx:2798` — `roomNo={orderData?.roomInfo?.roomNo}` — no fallback
- **Code trace:** `orderTransform.js:405` — `roomNo: api.room_info.room_no || null`
- **Code trace:** `table.tableNumber` always available via `tableTransform.js:54` — `tableNumber: api.table_no`

---

## Blast Radius

| File | Change | Lines |
|---|---|---|
| `src/components/order-entry/OrderEntry.jsx` | Add `|| table?.tableNumber` fallback on `roomNo` prop | 1 |

- **Blast radius:** TINY (1 file, 1 line)
- **Hotspot files (R5):** `OrderEntry.jsx` is R5 hotspot — verify no line drift before implementing
- **Conflict:** None

---

## Owner Decision

S2 (visual distinction for dynamic "Room r#" tables in free table list) — **NOT needed at this stage.** Scoped out.

---

## Gate Status

- [x] Gate 0/1 — Intake **CLOSED**
- [ ] Gate 2 — Impact Analysis (ready for GO)

*Intake: 2026-09-13 | Code reality: FULL | Duplicate: DISTINCT | Blast radius: TINY (1 file, 1 line) | Risk: HIGH (R5 hotspot)*
