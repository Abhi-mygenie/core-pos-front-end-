# BUG-378 — Gate 3: Implementation Plan
## PMS In-House Guests: Room/Phone/Dates/Balance all show "—"

**Doc:** `memory/plans/BUG-378_IMPLEMENTATION_PLAN.md`
**Date:** 2026-09-03
**Agent Role:** PLANNING — Gate 3 (Implementation Plan only. No code written.)
**Gate 2 IA:** `memory/impact/BUG-378_IMPACT_ANALYSIS.md` — VERIFIED still accurate (see §0)
**Risk:** MEDIUM
**Scope:** 4 modified files. ~52 new/changed lines total.

---

## §0 — Entry Verification (Pre-Code State Confirmed)

| Claim in IA | Verified Now | Match? |
|---|---|---|
| `roomListTransform.js` = 61 lines, push block at lines 41-55 | ✅ 60 lines (trailing newline diff), push block confirmed at lines 41-55 | PASS |
| `aiosellService.js` last function = `fetchReservations`, ends at line 105, no `getLocalReservations` | ✅ 106 lines, fetchReservations ends line 105, `getLocalReservations` = 0 grep hits | PASS |
| `pmsService.js` = 29 lines, `getInHouseGuests` at lines 12-14 (single call) | ✅ 29 lines, confirmed single-call implementation | PASS |
| `InHouseGuestsPage.jsx` = 168 lines, `tableNo` at lines 38/136, `orderNo` at lines 39/139 | ✅ 167 lines (trailing newline diff), all 4 occurrences confirmed | PASS |
| No `getLocalReservations` in pmsService or InHouseGuestsPage | ✅ 0 grep hits | PASS |
| `AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS` defined in constants.js | ✅ line 583 | PASS |

**IA is current. Implementation may proceed on Gate 4 GO.**

---

## §1 — Execution Order

```
Step 1  api/transforms/roomListTransform.js     MODIFY — add phone field (no deps)
Step 2  api/services/aiosellService.js           MODIFY — add getLocalReservations (no deps)
Step 3  api/services/pmsService.js               MODIFY — rewrite getInHouseGuests (needs Step 2)
Step 4  pages/pms/InHouseGuestsPage.jsx          MODIFY — 4 field renames (no new deps)
────────────────────────────────────────────────
Compile check after all 4 steps.
```

Steps 1, 2, and 4 are independent and can be executed in parallel.
Step 3 depends on Step 2 (imports `getLocalReservations`). Execute Step 3 after Step 2.

---

## §2 — Exact Edits

---

### STEP 1 — `api/transforms/roomListTransform.js` (MODIFY — add phone field)

**Find** (lines 47–48, exact):
```js
      guestName,
      checkInDateTime: null, // detail fetch fills via roomInfo.checkInDate
```

**Replace with:**
```js
      guestName,
      phone: u.phone ?? null,       // BUG-378: phone from user.phone (confirmed in GET_ROOM_LIST response)
      checkInDateTime: null, // detail fetch fills via roomInfo.checkInDate
```

**Risk note:** Additive field only. Existing consumers (`reportService.js` lines 678/709, `RoomOrdersReportPage.jsx`, `RoomRowCard.jsx`) do not read `phone` from this transform — zero regression risk.

---

### STEP 2 — `api/services/aiosellService.js` (MODIFY — append getLocalReservations)

**Find** (lines 98–106, the end of the file):
```js
export const fetchReservations = async ({ startDate, endDate, importToLocal = false }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RESERVATIONS, {
    start_date: startDate,
    end_date:   endDate,
    import:     importToLocal,
  });
  return res.data;
};
```

**Replace with:**
```js
export const fetchReservations = async ({ startDate, endDate, importToLocal = false }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RESERVATIONS, {
    start_date: startDate,
    end_date:   endDate,
    import:     importToLocal,
  });
  return res.data;
};

/**
 * GET /aiosell/local-reservations — fetch locally-stored AIOSELL reservations
 * BUG-378: used by pmsService.getInHouseGuests() to enrich in-house rows with
 * checkinDate, checkoutDate, balance, channel via order_id join.
 * ⚠ Do NOT use view=in_house — returns 0 for early check-ins (date-range filter, not op_status).
 *   Always fetch without view param and filter op_status='in_house' client-side.
 * @param {{ startDate: string, endDate: string }} dateRange  (YYYY-MM-DD)
 */
export const getLocalReservations = async ({ startDate, endDate }) => {
  const res = await api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, {
    params: { start_date: startDate, end_date: endDate },
  });
  return res.data;
};
```

---

### STEP 3 — `api/services/pmsService.js` (MODIFY — two targeted edits)

#### E1 — Update header comment + add import (lines 1–5)

**Find:**
```js
// CR-358-P1: PMS aggregation service
// Wraps existing roomService + roomListTransform for the new PMS module.
// roomService.getRoomList() and roomListTransform are NOT modified — only called.
import { getRoomList } from './roomService';
import roomListTransform from '../transforms/roomListTransform';
```

**Replace with:**
```js
// CR-358-P1 | BUG-378: PMS aggregation service
// getInHouseGuests: two-call join — GET_ROOM_LIST + local-reservations enriched on order_id.
// roomService.getRoomList() and roomListTransform are NOT modified — only called.
import { getRoomList } from './roomService';
import roomListTransform from '../transforms/roomListTransform';
import { getLocalReservations } from './aiosellService'; // BUG-378
```

#### E2 — Rewrite getInHouseGuests (lines 7–15)

**Find:**
```js
/**
 * S6 — In-House Guests
 * Wraps existing GET_ROOM_LIST endpoint.
 * Returns array of currently occupied rooms (same shape as roomListTransform).
 */
export const getInHouseGuests = async () => {
  const raw = await getRoomList();
  return roomListTransform.transformRoomListToRows(raw);
};
```

**Replace with:**
```js
// Date helper — offset from today (YYYY-MM-DD)
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * S6 — In-House Guests (BUG-378: enriched with phone, checkinDate, checkoutDate, balance)
 *
 * Step 1: GET_ROOM_LIST → roomListTransform (roomNumber, guestName, phone)
 * Step 2: local-reservations ?start_date=today-60&end_date=today+60
 *         Filter: operational_status === 'in_house'
 *         Join:   rooms[0].order_id === row.parentOrderId
 *         Enrich: checkinDate (checked_in_at), checkoutDate, balance (amount_after_tax), channel
 * Walk-in guests (no AIOSELL reservation): phone from Step 1, dates/balance stay null → "—"
 * Graceful degradation: if Step 2 fails, Step 1 data is still returned (no crash).
 */
export const getInHouseGuests = async () => {
  // Step 1 — GET_ROOM_LIST (room number, guest name, phone)
  const raw  = await getRoomList();
  const rows = roomListTransform.transformRoomListToRows(raw);

  // Step 2 — local-reservations enrichment
  try {
    const lrData       = await getLocalReservations({ startDate: dateOffset(-60), endDate: dateOffset(60) });
    const reservations = lrData?.data?.reservations ?? lrData?.reservations ?? [];
    const inHouse      = reservations.filter(r => r.operational_status === 'in_house');

    // Build order_id lookup: { [order_id]: { res, room } }
    const lookup = {};
    inHouse.forEach(res => {
      (res.rooms ?? []).forEach(room => {
        if (room.order_id) lookup[room.order_id] = { res, room };
      });
    });

    // Enrich rows with dates, balance, channel
    rows.forEach(row => {
      const match = lookup[row.parentOrderId];
      if (match) {
        row.checkinDate  = match.room.checked_in_at            ?? null;
        row.checkoutDate = match.res.checkout                  ?? null;
        row.balance      = match.res.amount_after_tax != null
                           ? Number(match.res.amount_after_tax) : null;
        row.channel      = match.res.channel                   ?? null;
      }
    });
  } catch {
    // Degraded mode: local-reservations failed (network/auth error).
    // rows still contain roomNumber, guestName, phone from Step 1.
    // checkinDate/checkoutDate/balance will be undefined → page renders "—".
  }

  return rows;
};
```

---

### STEP 4 — `pages/pms/InHouseGuestsPage.jsx` (MODIFY — 4 field renames)

#### E1 — Search filter line 38

**Find:**
```jsx
      String(r.tableNo    ?? '').toLowerCase().includes(q) ||
```
**Replace with:**
```jsx
      String(r.roomNumber ?? '').toLowerCase().includes(q) || // BUG-378
```

#### E2 — Search filter line 39

**Find:**
```jsx
      String(r.orderNo    ?? '').toLowerCase().includes(q)
```
**Replace with:**
```jsx
      String(r.parentOrderId ?? '').toLowerCase().includes(q) // BUG-378
```

#### E3 — Room column cell line 136

**Find:**
```jsx
                      <td className="px-4 py-3 font-medium">{row.tableNo ?? '—'}</td>
```
**Replace with:**
```jsx
                      <td className="px-4 py-3 font-medium">{row.roomNumber ?? '—'}</td> {/* BUG-378 */}
```

#### E4 — Order sub-label line 139

**Find:**
```jsx
                        {row.orderNo && <div className="text-[11px] text-gray-400">#{row.orderNo}</div>}
```
**Replace with:**
```jsx
                        {row.parentOrderId && <div className="text-[11px] text-gray-400">#{row.parentOrderId}</div>} {/* BUG-378 */}
```

---

## §3 — Verification Matrix

| # | Step | File | Change | Self-Test | Auto? |
|---|---|---|---|---|---|
| V1 | 1 | `roomListTransform.js` | `phone` field added | `grep "phone: u.phone" roomListTransform.js` → 1 hit | NO |
| V2 | 2 | `aiosellService.js` | `getLocalReservations` exported | `grep "export const getLocalReservations" aiosellService.js` → 1 hit | NO |
| V3 | 3-E1 | `pmsService.js` | `getLocalReservations` imported | `grep "import.*getLocalReservations" pmsService.js` → 1 hit | NO |
| V4 | 3-E2 | `pmsService.js` | `dateOffset` helper present | `grep "dateOffset" pmsService.js` → 2 hits (def + calls) | NO |
| V5 | 3-E2 | `pmsService.js` | `lookup[row.parentOrderId]` join present | `grep "lookup\[row.parentOrderId\]" pmsService.js` → 1 hit | NO |
| V6 | 3-E2 | `pmsService.js` | graceful degradation try-catch present | `grep "Degraded mode" pmsService.js` → 1 hit | NO |
| V7 | 4 | `InHouseGuestsPage.jsx` | `row.roomNumber` in Room cell | `grep "row.roomNumber" InHouseGuestsPage.jsx` → 2 hits (table + search) | NO |
| V8 | 4 | `InHouseGuestsPage.jsx` | `row.tableNo` GONE | `grep "row.tableNo" InHouseGuestsPage.jsx` → 0 hits | NO |
| V9 | All | Webpack | 0 new errors | `tail /var/log/supervisor/frontend.out.log` → `compiled with 1 warning` (pre-existing) | NO |
| V10 | 3 | pmsService + preprod | `getLocalReservations` returns data | curl `GET /aiosell/local-reservations?start_date=X&end_date=Y` → 200, reservations[] | YES (curl) |
| V11 | Browser | InHouseGuestsPage | Room column shows "r1"–"r5" | Navigate `/pms/in-house` → Room column populated | NO |
| V12 | Browser | InHouseGuestsPage | Phone column populated for all 3 guests | All 3 rows show phone numbers | NO |
| V13 | Browser | InHouseGuestsPage | Dates + balance for OTA/Direct guests | Test Guest + Future Guest show checkin/checkout/balance | NO |
| V14 | Browser | InHouseGuestsPage | Walk-in guest: phone ✅, dates "—" | WalkIn Probe Test: phone=9000111222, checkinDate=— | NO |
| V15 | Browser | RoomOrdersReportPage | Unaffected by phone field addition | Existing room orders report still renders correctly | NO |

---

## §4 — Post-Code Registry Checklist

```
After completing Steps 1-4 and all V1-V15 pass:

□ 1. registry.json: BUG-378 → status: "IMPLEMENTED", sprint_key: "pos_pms_1"
□ 2. BUG_TRACKER.md: BUG-378 row → IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: all 4 files listed under "BUG-378 (2026-09-03)"
□ 4. Code markers: // BUG-378 in every modified file ✅ (already in each edit above)
□ 5. Compile: webpack 0 new warnings
```

---

## §5 — Scope Lock

**WILL change (4 files):**
`api/transforms/roomListTransform.js` · `api/services/aiosellService.js` ·
`api/services/pmsService.js` · `pages/pms/InHouseGuestsPage.jsx`

**WILL NOT touch:**
`api/services/roomService.js` · `pages/reports-module/RoomOrdersReportPage.jsx` ·
`components/reports/RoomRowCard.jsx` · `api/services/reportService.js` ·
`components/modals/RoomCheckInModal.jsx` · `pages/DashboardPage.jsx` ·
`components/order-entry/CollectPaymentPanel.jsx` · `App.js` · `Sidebar.jsx`

---

*Planning agent | BUG-378 Gate 3 | 2026-09-03 | Implementation Plan COMPLETE | Awaiting Gate 4 GO*
