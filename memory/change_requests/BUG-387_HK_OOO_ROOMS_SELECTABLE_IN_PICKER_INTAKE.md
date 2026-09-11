# BUG-387 — Intake Document
## PMS Picker: HK and OOO Rooms Appear Selectable in Check-In / New Booking

**ID:** BUG-387
**Type:** BUG
**Registered:** 2026-09-09
**Sprint:** pos_pms_1
**Area:** PMS — Room Picker (Check-In S4 + New Booking S3)
**Priority:** P1 — HIGH
**Risk:** HIGH (room booking correctness — guest placed in unclean or out-of-service room)
**Source:** AGENT-DISCOVERED (owner observation + code trace + live probe 2026-09-09)

---

## Duplicate Check

- **Result: DISTINCT** — with one RELATED item
- **Related: BUG-380** — "Occupied Rooms Shown in New Booking Room Picker" (Gate 5b — QA Pass, awaiting smoke).
  BUG-380 added `isOccupied` by cross-referencing `getRoomList()` (rooms with active orders). **This bug is orthogonal:** `getRoomList()` only returns rooms with active check-in orders. Rooms in HK or OOO state have no active order → not in `getRoomList` → `isOccupied = false` → appear fully selectable.
- No other bug or CR addresses HK/OOO room picker filtering.

---

## Problem Description

`getBookableRooms()` in `pmsService.js` marks rooms as unavailable only if they have an **active room order** (i.e., a guest is currently checked in). It does this by calling `getRoomList()` which returns rooms with active orders.

Two room states are not covered:

### Gap 1 — OOO (Out of Order / Maintenance)
A room with `display_status: 'ooo'` has no active order. It is **not** returned by `getRoomList()`. `isOccupied` = `false`. The room appears as fully selectable in both the New Booking grid and the Check-In dropdown.

**Live evidence (2026-09-09 probe):**
```
GET /api/v2/vendoremployee/aiosell/room-status-board →
  r5 (id:8527): display_status='ooo', manual_status='ooo', order_id=null

GET /api/v2/vendoremployee/get-room-list →
  r5 NOT present (no active order)

getBookableRooms() result →
  r5: isOccupied = false → selectable in picker ❌
```

A receptionist can currently select r5 (maintenance) and check a guest in.

### Gap 2 — HK-only (Post-checkout, being cleaned)
A room that was checked out and flagged for housekeeping has no active order until the next check-in. `getRoomList()` will not include it. `isOccupied = false`. The room appears selectable even though it is being cleaned.

**Note:** On current preprod all HK rooms happen to also be occupied (active orders haven't closed yet), so this gap is masked. It will surface on any checkout that leaves the room in HK state before the next booking.

---

## Evidence

| Type | Detail |
|---|---|
| Live probe | Room-status-board: r5 `display_status='ooo'`, `order_id=null` (2026-09-09) |
| Live probe | get-room-list: r5 absent (no active order) |
| Code trace | `pmsService.js:88` — `occIds` built from `getRoomList()` only; no HK/OOO signal |
| Code trace | `CheckInPage.jsx:348` — `disabled={r.isOccupied}` only; no HK/OOO check |
| Code trace | `NewBookingPage.jsx:185` — `disabled={r.isOccupied}` only; no HK/OOO check |
| Source | AGENT-DISCOVERED + owner observation |
| Confidence | CONFIRMED — code trace + live probe |

---

## Risk Classification

| Axis | Value |
|---|---|
| Risk level | **HIGH** |
| Trigger | Room booking correctness — guest placed in OOO or unclean room |
| Financial? | YES — room order created for unusable room |
| Fast Lane eligible | NO (3 files, API call added) |
| Process required | Full gate flow + owner decisions on UI behaviour |

---

## Blast Radius

| File | Action | Role |
|---|---|---|
| `src/api/services/pmsService.js` | MOD — `getBookableRooms()`: add HK/OOO status from room-status-board | Service layer |
| `src/pages/pms/NewBookingPage.jsx` | MOD — render HK/OOO badges on room tiles | UI |
| `src/pages/pms/CheckInPage.jsx` | MOD — disable/label HK and OOO options in dropdown | UI |

- Hotspot files: `pmsService.js` (high-traffic — BUG-380, BUG-378, CR-358 series)
- Estimated scope: SMALL–MEDIUM (3 files, ~20–30 lines total)
- BUG-380 fix already introduced the pattern (`isOccupied`) — this extends it

---

## Sub-Gaps

| Gap | Severity | Description |
|---|---|---|
| GAP-1 | HIGH | OOO rooms selectable in picker — confirmed live |
| GAP-2 | HIGH | Pure-HK rooms (post-checkout) selectable in picker — confirmed by code trace |

---

## Owner Decisions Required

| OD | Question |
|---|---|
| OD-387-01 | **HK rooms in picker:** (a) Show greyed with "Needs Cleaning" badge (receptionist sees room is being cleaned, cannot select) — OR — (b) Hide entirely from picker? |
| OD-387-02 | **OOO rooms in picker:** (a) Show greyed with "Out of Order" badge (visible but cannot select) — OR — (b) Hide entirely from picker? |

**Recommended defaults** (consistent with BUG-380 OD decision of "greyed with badge"):
- OD-387-01 → (a) Show with "Needs Cleaning" badge
- OD-387-02 → (a) Show with "Out of Order" badge

---

## Proposed Fix Approach

Extend `getBookableRooms()` to also call the room-status-board (already called by RoomStatusPage). Build a status map of `{ roomId → displayStatus }`. Expose two new flags per room:

```js
isHk:  statusById[r.id] === 'hk',   // being cleaned
isOoo: statusById[r.id] === 'ooo',  // out of order / maintenance
```

Both `NewBookingPage` and `CheckInPage` already gate on `isOccupied` — adding `isHk` and `isOoo` checks follows the same pattern with no structural change.

**Note:** Adding a third parallel call in `getBookableRooms()` means 3 concurrent API calls on page load. This is acceptable at current scale.

---

## Next Steps

Owner answers OD-387-01 + OD-387-02 → Gate 2 Planning (Impact Analysis + Implementation Plan).

---

*Intake: 2026-09-09 | INTAKE agent | Code reality: PARTIAL | Risk: HIGH | P1 | Blast radius: SMALL–MEDIUM*
