# BUG-378 — INTAKE
## PMS In-House Guests: Room, Phone, Check-In, Check-Out, Balance all show "—"

**ID:** BUG-378
**Date:** 2026-09-02
**Registered by:** Intake agent
**Source:** OWNER-REPORTED
**Confidence:** CONFIRMED (owner screenshot provided, root cause traced in code and transform)
**Related:** CR-358-P1 (Phase 1 implementation — bug introduced in InHouseGuestsPage.jsx + pmsService.js)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | PMS → In-House Guests |
| Priority | **P1** |
| Risk | **MEDIUM** |
| Severity (QA) | MAJOR |
| Sprint | pos_pms_1 |
| Fast Lane eligible | NO — 2 files, 2 API calls, join logic |
| Duplicate check | **DISTINCT** — no prior registration |
| Code reality | **PARTIAL** — page exists, field mapping wrong |
| Blast radius | SMALL-MEDIUM — 2 files |
| Probe status | ✅ OD-1 RESOLVED 2026-09-03 — approach confirmed via curl probe |

---

## Symptom

On the In-House Guests page (`/pms/in-house`), the table shows 3 in-house guests with their **names visible**, but every other column shows **"—"**:

| Room | Guest | Phone | Check-In | Check-Out | Balance |
|---|---|---|---|---|---|
| — | WalkIn Probe Test | — | — | — | — |
| — | Test Guest | — | — | — | — |
| — | Future Guest | — | — | — | — |

The KPI strip correctly shows **3 In-House** guests. Guest names display correctly. All other data is missing.

**Owner screenshot:** SS2 (provided 2026-09-02).

---

## Root Cause (Two Stacked Problems)

### Part A — Field Name Mismatch (code bug, ~5 lines)

`roomListTransform.transformRoomListToRows()` outputs:
```js
roomNumber: t.table_no    // "roomNumber"
parentOrderId: r.order_id  // "parentOrderId"
```

`InHouseGuestsPage.jsx` reads:
```jsx
row.tableNo    // ❌ wrong — transform uses "roomNumber"
row.orderNo    // ❌ wrong — transform uses "parentOrderId"
```

`guestName` works because it matches exactly. All other named fields are undefined → rendered as "—".

**Fix:** Change `row.tableNo` → `row.roomNumber` and `row.orderNo` → `row.parentOrderId` in the page.

### Part B — Phone/Dates/Balance missing (design gap — RESOLVED by probe 2026-09-03)

**Original assumption:** `GET /get-room-list` doesn't return phone, check-in date, check-out date, or balance.

**Probe finding (2026-09-03):** Two corrections:

1. **Phone IS in GET_ROOM_LIST** — `user.phone` is present in the response for ALL 3 guests (including walk-in). It was simply never mapped in `roomListTransform`. Fix: add `phone: u.phone ?? null` to the transform output.

2. **Dates + Balance from `local-reservations`** — `GET /aiosell/local-reservations?view=all` with `start/end_date` returns full guest detail for OTA and Direct bookings. Filter `operational_status='in_house'` client-side, join to GET_ROOM_LIST rows via `order_id` (2/2 matches confirmed live on preprod).

   - `rooms[0].checked_in_at` → Check-In column
   - `reservation.checkout` → Check-Out column
   - `amount_after_tax` → Balance column
   - `channel` → bonus: source (booking.com / Direct)

**⚠ `view=in_house` does NOT work** — returns 0 records when guests are checked in early (today < booking checkin date). Always use `view=all` + client-side filter.

**Walk-in guest edge case:** No AIOSELL reservation → no local-res match. Phone filled from `user.phone`. Dates/balance show "—" (acceptable for Phase 1).

**Confirmed data matrix from live probe:**

| Column | Walk-in guest | OTA / Direct guest |
|---|---|---|
| Room (table_no) | ✅ GET_ROOM_LIST | ✅ GET_ROOM_LIST |
| Phone | ✅ user.phone (unmapped — fix in transform) | ✅ user.phone + guest.phone (match) |
| Check-in date | ❌ "—" Phase 1 | ✅ rooms[0].checked_in_at |
| Check-out date | ❌ "—" Phase 1 | ✅ reservation.checkout |
| Balance | ❌ "—" Phase 1 | ✅ amount_after_tax |
| Channel | ❌ | ✅ channel |

---

## Evidence

| # | Item | Detail |
|---|---|---|
| E1 | Owner screenshot SS2 | Provided 2026-09-02 — 3 guests, all non-name fields show "—" |
| E2 | Transform audit | `roomListTransform.js` lines 32-58 — `roomNumber`, `parentOrderId` only; `checkInDateTime/paid/outstanding: null` |
| E3 | Page code | `InHouseGuestsPage.jsx` lines 136-152 — reads `tableNo`, `orderNo`, `phone`, `checkinDate`, `checkoutDate`, `balance` |
| E4 | Probe: GET_ROOM_LIST | Saved: `evidence/BUG-378/probe_get_room_list.json` — 3 rooms, user.phone present for all |
| E5 | Probe: local-reservations view=all | Saved: `evidence/BUG-378/probe_local_reservations_all.json` — 6 records, 2 op=in_house, join confirmed |
| E6 | Probe: local-reservations view=in_house | Saved: `evidence/BUG-378/probe_local_reservations_in_house.json` — returns 0 (date-range filter, not op_status) |
| E7 | Probe summary | `evidence/BUG-378/PROBE_SUMMARY.json` |

---

## Expected Behavior

The In-House Guests table should show:
- **Room** column: the room/table number (e.g. "r1", "r3")
- **Guest** column: guest name ✅ (already works)
- **Phone**: guest phone number
- **Check-In / Check-Out**: dates
- **Balance**: outstanding amount

At minimum, Part A (room number) must be fixed. Part B (phone/dates/balance) depends on owner decision on data source.

---

## Files to Fix

| File | Change | Part | Lines est. |
|---|---|---|---|
| `pages/pms/InHouseGuestsPage.jsx` | `row.tableNo` → `row.roomNumber`, `row.orderNo` → `row.parentOrderId` | A | ~5 |
| `api/services/pmsService.js` | Rewrite `getInHouseGuests()`: (1) call `getRoomList()`, (2) call `local-reservations?view=all` with ±60 day range, filter `op_status='in_house'`, build order_id lookup, (3) merge: enrich each room row with phone (`user.phone`), check-in (`rooms[0].checked_in_at`), check-out (`checkout`), balance (`amount_after_tax`), channel | B | ~35 |
| `api/transforms/roomListTransform.js` | Add `phone: u.phone ?? null` to the transform output (so Part A fix also benefits walk-in guests) | B | ~1 |

---

## Severity Rationale

**P1** — The In-House Guests page is effectively unusable: hotel staff can see names but have no room numbers to identify which guest is in which room. No workaround. This is a Phase 1 screen that shipped broken.

---

## OD-1 — RESOLVED BY PROBE (2026-09-03)

**Answer: Option C confirmed — use `local-reservations view=all` filtered client-side on `operational_status=in_house`, joined to GET_ROOM_LIST via `order_id`.**

Probe evidence: `/app/memory/evidence/BUG-378/`

### Key findings from probe:
- `view=in_house` **returns 0** — endpoint filters by `today IN [checkin, checkout]` booking dates, not `operational_status`. Early check-ins (checked_in_at before booking checkin date) are invisible. **Do not use `view=in_house`.**
- `view=all` with date range returns all 6 reservations. Filter `op_status='in_house'` client-side → 2 in-house records.
- **Join key:** `GET_ROOM_LIST order_id` == `local-reservations rooms[0].order_id` — confirmed 2/2 matches.
- **Phone for ALL guests:** `user.phone` is in GET_ROOM_LIST response but NOT mapped in `roomListTransform` — fix there too.
- **Walk-in guest** ("WalkIn Probe Test"): has NO local-res entry (walk-in = no AIOSELL reservation). Phone available from `user.phone`. Dates/balance unavailable without detail fetch — acceptable "—" for Phase 1.

### Confirmed available per guest via join:
| Column | Walk-in | OTA / Direct |
|---|---|---|
| Room (table_no) | ✅ GET_ROOM_LIST | ✅ GET_ROOM_LIST |
| Phone | ✅ user.phone (unmapped) | ✅ guest.phone via local-res |
| Check-in date | ❌ (detail fetch needed) | ✅ rooms[0].checked_in_at |
| Check-out date | ❌ | ✅ reservation.checkout |
| Balance | ❌ | ✅ amount_after_tax |
| Channel | ❌ | ✅ channel (booking.com / Direct) |

---

## Duplicate Check
- `grep "tableNo\|roomNumber\|in-house\|InHouseGuest"` in BUG_TRACKER.md → **0 matches**
- **DISTINCT**

---

*Intake: 2026-09-02 | Probe: 2026-09-03 | INTAKE agent | Code reality: PARTIAL | Risk: MEDIUM | OD-1 RESOLVED — ready for Gate 2 (Planning)*
