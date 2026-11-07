# INTAKE: BUG-381 — Walk-in Check-In Guest Data Missing on In-House + PMS Pages

**ID:** BUG-381
**Type:** BUG
**Reported by:** Owner (2026-09-03)
**Priority:** P1 (HIGH) — walk-in guests invisible on key PMS pages, staff cannot manage them
**Risk:** HIGH — data gap affects operational visibility (check-out date, balance unknown)
**Related:** CR-358-P2 (Check-In walk-in flow), CR-358-P3 (Front Desk / Arrivals / Departures), BUG-378 (local-res join)
**Duplicate check:** DISTINCT — PROD-004 is about cart clearing, not data enrichment. No prior bug addresses walk-in reservation data gap.

---

## Description
Walk-in check-ins (non-AIOSELL bookings created via `/pms/check-in` Walk-in flow) do not write a `local-reservation` record. After a walk-in check-in:

1. **In-House Guests page**: Guest appears (from GET_ROOM_LIST) but `checkinDate`, `checkoutDate`, `balance`, `channel` all show "—" because the enrichment Step 2 (BUG-378 local-res join) finds no matching AIOSELL reservation.

2. **Front Desk / Arrivals / Departures (P3 pages)**: Walk-in guests are **completely invisible**. These pages use `getReservationOps()` which reads `local-reservations` only — walk-ins don't exist in this dataset.

## Steps to Reproduce
1. Log in as owner1@thegoankitchen.com
2. Go to `/pms/new-booking` → Fill guest details → Select "Walk-in" → Complete check-in
3. Navigate to `/pms/in-house` → Walk-in guest shows but dates/balance are "—"
4. Navigate to `/pms/front-desk` → Walk-in guest is NOT visible in any section
5. Navigate to `/pms/departures` → Walk-in guest is NOT visible (no checkout handling possible)

**Expected:** Walk-in guests should display full info (dates, balance) on In-House page AND appear on Front Desk / Departures pages for checkout.
**Actual:** Partial info on In-House; invisible on P3 pages.

## Evidence
- Source: OWNER-REPORTED ("walk in - check in not showing info, these are non aiosell booking")
- Confidence: CONFIRMED (owner identified r1, r2 as checked in; walk-in data gap is structural)

## Data Availability Matrix

| Data Point | GET_ROOM_LIST | local-reservations | In-House Page | P3 Pages |
|---|---|---|---|---|
| Room number | Yes | No | Yes | No |
| Guest name | Yes | No | Yes | No |
| Phone | Yes | No | Yes | No |
| Check-in date | No | No | Shows "—" | Invisible |
| Check-out date | No | No | Shows "—" | Invisible |
| Balance / Amount | No | No | Shows "—" | Invisible |
| Channel | No | No | Shows "—" | Invisible |

## Root Cause
The `pmsCheckIn` backend endpoint creates a room-service order but does **not** create a synthetic `local-reservation` record. Walk-in data lives only in the order/room system (GET_ROOM_LIST), not in the AIOSELL reservation model that `local-reservations` API returns.

## Blast Radius
- ~16 references to walk-in/pmsCheckIn in PMS pages
- Hotspot files: pmsService.js, InHouseGuestsPage.jsx, FrontDeskPage.jsx, ArrivalsPage.jsx, DeparturesPage.jsx
- Estimated scope: MEDIUM (1 service + 4 page files, or backend change)
- Process required: FAST LANE eligible? NO (multi-file + API contract + data model gap)

## Fix Approaches

### Option A — Backend Fix (Recommended)
`pmsCheckIn` endpoint for walk-ins should also create a synthetic `local-reservation` with `operational_status=in_house`. All existing frontend code would then work automatically.

**Pros:** Single change, all pages benefit, consistent data model.
**Cons:** Requires backend team coordination.

### Option B — Frontend Workaround
On InHouseGuestsPage and FrontDeskPage, supplement `local-reservations` data with GET_ROOM_LIST occupied rooms that have **no matching reservation** (orphan-order enrichment). Build synthetic reservation objects for walk-ins.

**Pros:** No backend dependency.
**Cons:** Multiple files, fragile (data source mismatch), dates/balance still unavailable from GET_ROOM_LIST.

### Option C — Hybrid (Frontend enrichment from order detail)
For orphan rooms (in GET_ROOM_LIST but not in local-reservations), fetch order detail via `SINGLE_ORDER_NEW` to get dates and amount. Build synthetic row.

**Pros:** Gets balance data. Frontend-only.
**Cons:** N+1 API calls (1 per walk-in room), complex, slower.

## Owner Decisions
- **OQ-381-01:** Owner confirms Option A — backend team to add synthetic `local-reservation` for walk-ins. LOCKED (2026-09-03).
- **OQ-381-02:** RESOLVED — Option A selected, frontend workaround not needed.

## Backend Brief Required
A backend brief must be filed for the backend team to implement the synthetic `local-reservation` creation on walk-in `pmsCheckIn`. Once backend ships, all existing frontend code (In-House, P3 pages) will work automatically — no frontend changes needed for this bug.
