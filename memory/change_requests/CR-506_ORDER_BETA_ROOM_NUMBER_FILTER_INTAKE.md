# CR-506 — Order Beta Report: Room Number Filter

**Registered:** 2026-11-06
**Classification:** CR
**Severity:** P2 — MEDIUM (filtering convenience for room-service operations)
**Risk:** MEDIUM (new filter, no billing/payment logic)
**Process required:** Full gate flow. FAST LANE eligible? **NO**
**Sprint:** TBD
**Source:** Order Beta Report Enhancement Requirements Excel (Item #5)

---

## Description

Add a **Room Number** dropdown filter to the Order Beta report. Populated with available room numbers. Selecting a room shows only orders associated with that room. Should work alongside existing report filters.

**Expected behavior:**
- New "Room" dropdown in the filter bar
- Populated with rooms that have orders in the selected date range (or all configured rooms)
- Selecting a room filters to orders linked to that room
- Works alongside all other filters

**Current behavior:** No room filter exists in the Order Beta report.

---

## Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** CONFIRMED

---

## Code Reality Check

**Code reality: NONE** — No room filter in `FilterBar.jsx` or `OrderReportBetaPage.jsx`. Room data exists in order records (room orders have room info). `RoomOrdersMockup.jsx:120` has `roomNumber` useMemo but that's a different report page.

## Duplicate Check

**DISTINCT.**

## Blast Radius

- `FilterBar.jsx` — add Room dropdown
- `OrderReportBetaPage.jsx` — filter state + room list extraction from orders
- Estimated scope: SMALL (2 files, ~20-25 lines)

## Open Questions

- **OD-506-01:** Should the room list be populated from the orders in the current date range, or from all configured rooms?
- **OD-506-02:** Should this filter appear only when room-service orders exist, or always?
