# BUG-576 — Intake (Gate 1)
## Room number search not working — only tables are found

**ID:** BUG-576 · **Type:** BUG · **Date:** 2026-10-16
**Severity:** P1 · **Risk:** LOW · **Sprint:** nov_cr_batch
**Area:** PMS / Rooms
**Duplicate check:** RELATED to BUG-332 (searchOptions). DISTINCT — BUG-332 fixed searchable fields for orders; BUG-576 is the room NUMBER field not included.
**Source:** OWNER-REPORTED + screenshot room "106" (smoke test 2026-10-16)
**Fast Lane eligible:** YES — 1 field addition to room search

## Description
Searching for a room number (e.g., "106") in the dashboard search bar returns "No orders" even when Room 106 exists and has active orders. Tables search works correctly. Only guest name searches work for rooms.

## Code Reality: CONFIRMED GAP
`DashboardPage.jsx:L1257-1259`:
```js
results.rooms = searchItems(enrichedRooms, query, item => ({
  id: item.id,
  all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest)].filter(Boolean)
}))
```
`item.id` is the INTERNAL DB ID — not the room label/number like "106". The room number field (e.g., `item.name`, `item.roomNo`, `item.label`) is not in the search fields.

## Fix
Add room name/number field to the search `all` array for rooms.

## Blast Radius: SMALL
- `DashboardPage.jsx:L1259` — 1 field addition. Need to confirm correct field name from `allRoomsList` data shape.

## Open Decisions
**OD-576-01:** What field holds the room display number ("106") on `allRoomsList` items? Candidate: `item.name`, `item.roomNo`, `item.label`. Needs quick data probe.
