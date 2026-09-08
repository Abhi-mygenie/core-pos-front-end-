# QA HANDOVER — BUG-378
## PMS In-House Guests: Room/Phone/Dates/Balance all show "—"
**Date:** 2026-09-03
**Implementation → QA**
**Sprint:** pos_pms_1
**Test on:** preprod.mygenie.online — Restaurant 69 (`owner@thegoankitchen.com` / `Qplazm@10`)

---

## 1. Self-Test Results (Implementation agent)

| # | Check | Result |
|---|---|---|
| V1 | `phone: u.phone` added to roomListTransform | ✅ line 48 |
| V2 | `getLocalReservations` exported from aiosellService | ✅ line 115 |
| V3 | `getLocalReservations` imported in pmsService | ✅ line 6 |
| V4 | `dateOffset` helper + both calls present | ✅ lines 9, 33 |
| V5 | `lookup[row.parentOrderId]` join present | ✅ line 47 |
| V6 | Graceful degradation try-catch present | ✅ line 57 |
| V7 | `row.roomNumber` in Room column + search filter | ✅ lines 38, 136 |
| V8 | `row.tableNo` GONE from InHouseGuestsPage | ✅ 0 hits |
| V9 | webpack 0 new errors | ✅ `compiled with 1 warning` (pre-existing) |
| BUG-378 markers | All 4 files | ✅ confirmed |

---

## 2. Test Cases

### TC-1: Room column populated
- Navigate to `/pms/in-house` (login as `owner@thegoankitchen.com`)
- **Expected:** Room column shows "r1", "r2", "r5" etc. — NOT "—"
- data-testid: `in-house-table`

### TC-2: Phone column populated for ALL guests (including walk-in)
- **Expected:** All 3 rows show phone numbers
  - WalkIn Probe Test → 9000111222
  - Test Guest → 9876543210
  - Future Guest → 9888888888

### TC-3: Check-In date for OTA/Direct guests
- **Expected:** Test Guest and Future Guest show check-in date (e.g. "2026-09-01")
- Walk-in guest → "—" (no AIOSELL reservation)

### TC-4: Check-Out date for OTA/Direct guests
- **Expected:** Test Guest → "2026-09-10", Future Guest → "2026-09-09"

### TC-5: Balance for OTA/Direct guests
- **Expected:** Test Guest → ₹13,922, Future Guest → ₹5,000

### TC-6: Walk-in guest — phone ✅, dates/balance "—"
- **Expected:** "WalkIn Probe Test": phone=9000111222, checkinDate="—", balance="—"

### TC-7: Search by room number
- Type "r2" in search box
- **Expected:** Only "WalkIn Probe Test" row (table r2) visible
- data-testid: `in-house-search`

### TC-8: KPI strip count correct
- **Expected:** "In-House" KPI shows 3

### TC-9: Graceful degradation (if local-res unavailable)
- If network call to local-reservations fails: page should still load, phone visible, dates/balance "—"

### TC-10: Regression — RoomOrdersReportPage unaffected
- Navigate to room orders report — should render identically to before (phone field addition to transform is invisible to this page)

---

## 3. Regression Tests

| # | Verify | Why |
|---|---|---|
| R1 | Existing channel manager (room mapping, OTA sync) still works | aiosellService.js modified (additive) |
| R2 | RoomOrdersReportPage renders correctly | roomListTransform modified (additive phone field) |
| R3 | In-house guest count KPI correct | pmsService logic change |

---

## 4. Registry Sync Confirmation

- Registry: BUG-378 → IMPLEMENTED, pos_pms_1
- EXIT GATE: ALL 5 PASSED

## 5. EXIT GATE

| □ | Check | Result |
|---|---|---|
| 1 | registry.json: IMPLEMENTED | ✅ |
| 2 | BUG_TRACKER.md: row updated | ✅ |
| 3 | FILE_OWNERSHIP.md: 4 files listed | ✅ |
| 4 | BUG-378 markers in all 4 files | ✅ |
| 5 | webpack 0 new warnings | ✅ |

## 6. Credentials + Environment

- Account: `owner@thegoankitchen.com` / `Qplazm@10`
- URL: https://preprod.mygenie.online (app at https://core-pos-react-2.preview.emergentagent.com)
- Restaurant 69 — hotel account, `features.room = true`
- 3 in-house guests on preprod: WalkIn Probe Test (r2, walk-in), Test Guest (r5, booking.com), Future Guest (r1, Direct)
