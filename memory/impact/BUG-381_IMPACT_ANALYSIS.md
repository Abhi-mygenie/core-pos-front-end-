# Impact Analysis — BUG-381: Walk-in Check-In Guest Data Missing

**ID:** BUG-381
**Gate:** 2 (Impact Analysis)
**Date:** 2026-09-03
**Code Reality:** NONE — no BUG-381 markers exist in frontend code
**Conflict Pre-Check:** CLEAR — no open items conflict with target files. pmsService.js last modified by BUG-380 (same session). All safe.
**Backend Status:** Owner confirms backend has shipped Option A (synthetic `local-reservation` for walk-ins).

---

## 1. Owner Decision (Locked)

| ID | Decision | Value | Date |
|---|---|---|---|
| OQ-381-01 | Fix approach | **(A) Backend synthetic local-reservation** | 2026-09-03 |
| OQ-381-02 | Resolved | Option A selected → no frontend workaround needed | 2026-09-03 |

---

## 2. Data Flow Trace — With Backend Fix

### InHouseGuestsPage (`getInHouseGuests()` — pmsService.js L36-73)

| Step | Source | Walk-in Before Backend Fix | Walk-in After Backend Fix |
|---|---|---|---|
| Step 1 | GET_ROOM_LIST | ✅ Room shows (has order_id) | ✅ Same |
| Step 2 join | local-reservations (by order_id) | ❌ No match → dates/balance = null | ✅ Match found → enriched |
| Result | | Partial: room + name, "—" for dates/balance | Full: room + name + dates + balance + channel |

**Frontend change needed: NONE** — the join at L56-65 (`lookup[row.parentOrderId]`) will automatically find the synthetic reservation.

### P3 Pages — FrontDeskPage / ArrivalsPage / DeparturesPage (`getReservationOps()`)

| Flow | Walk-in Before Backend Fix | Walk-in After Backend Fix |
|---|---|---|
| `local-reservations` fetch | ❌ Walk-in absent | ✅ Walk-in present with `operational_status` |
| `fromReservationOps` transform | N/A | ✅ Processes normally (all fields null-guarded) |
| Bucketing | N/A | ✅ `in_house` → appears in inHouse list |
| Departures | N/A | ✅ If checkout = today → `depDueToday` bucket |
| Checkout slider | N/A | ✅ `orderId` populated → drawer opens |

**Frontend change needed: NONE** — transforms and buckets handle walk-in data transparently.

### Channel Badge Display

The source/channel badge on P3 pages renders: `row.channel ?? row.bookingType ?? '—'`

The transform maps: `bookingType = r.channel === 'Direct' ? 'Direct' : 'Online'`

| Backend sets `channel` to | Badge displays | Badge color | Acceptable? |
|---|---|---|---|
| `"Direct"` | "Direct" | Green | ✅ |
| `"Walk-in"` | "Walk-in" | Grey | ✅ Best |
| `null` | "Online" | Grey | ⚠️ Misleading but not broken |

**Note:** This is a display quality concern, not a functional issue. If the backend sets `channel = "Walk-in"` or `channel = "Direct"`, it renders correctly. No frontend fix needed.

---

## 3. Assessment: Frontend Changes Required

### **VERDICT: ZERO frontend code changes required.**

The backend fix (Option A) enables all existing frontend data flows:

| Page | Data Source | Join/Transform | Result |
|---|---|---|---|
| InHouseGuestsPage | GET_ROOM_LIST + local-reservations | order_id join (L56-65) | ✅ Auto-enriched |
| FrontDeskPage | local-reservations → fromReservationOps | bucket by operational_status | ✅ Auto-visible |
| ArrivalsPage | local-reservations → fromReservationOps | bucket by status + checkin | ✅ Auto-visible |
| DeparturesPage | local-reservations → fromReservationOps | bucket by checkout + room lines | ✅ Auto-visible |

### Verification Needed

Since no frontend code changes are required, this bug needs **verification testing only** — confirm that walk-in data now flows through correctly on all 4 pages.

---

## 4. Verification Matrix

| # | Check | Page | Method |
|---|---|---|---|
| V1 | Walk-in guest shows on In-House page with dates + balance (not "—") | InHouseGuestsPage | Browser |
| V2 | Walk-in guest visible on Front Desk arrivals preview or departures mini-list | FrontDeskPage | Browser |
| V3 | Walk-in guest appears in correct Arrivals tab (Checked In) | ArrivalsPage | Browser |
| V4 | Walk-in guest appears in correct Departures tab (Due Today / Upcoming) | DeparturesPage | Browser |
| V5 | Checkout slider opens for walk-in room (orderId populated) | DeparturesPage | Browser |
| V6 | Channel badge shows recognizable value (not blank/null) | Any P3 page | Browser |

**All 6 checks are manual browser verification. No automated checks needed (no code changed).**

---

## 5. Risk Assessment

| Risk | Level | Rationale |
|---|---|---|
| Frontend regression | ZERO | No frontend code modified |
| Backend contract mismatch | LOW | If synthetic reservation omits fields (e.g. `rooms[]`, `guest`), transforms null-guard gracefully → "—" instead of crash |
| Walk-in checkout | MEDIUM | Depends on synthetic reservation carrying `order_id` in `rooms[0]` — if missing, checkout slider won't open. Needs V5 verification. |

**Overall Risk: LOW** (no frontend changes, backend contract is the only variable)

---

## 6. Scope

- **Frontend edits:** 0
- **Files changed:** 0
- **Action required:** Verification testing only (V1-V6)
- **Prerequisite:** A walk-in check-in must exist on preprod to test. Owner should create one or confirm one exists.
