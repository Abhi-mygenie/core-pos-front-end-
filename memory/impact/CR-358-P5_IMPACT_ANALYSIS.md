# CR-358-P5 — Gate 2 Impact Analysis (v2 — Full Scope)
## PMS Phase 5: Rate Grid (S8-C) + Inventory Restrictions + Rate Restrictions + Mark No-Show (S8-D)

**ID:** CR-358-P5
**Written by:** PLANNING agent (ALPHA v0.7)
**Date:** 2026-09-08 (v2 — full scope; v1 was scope-B split, now un-split per owner decision)
**Stage:** Gate 2 — Impact Analysis only. Gate 3 plan follows Gate 4 GO.
**Sprint:** pos_pms_1

---

## IA Header

| Field | Value |
|---|---|
| **Code Reality** | **PARTIAL** — 5 endpoint constants declared in `constants.js` L589-593 (inert). Tab 3 placeholder at `ChannelManagerPage.jsx` L466-475. No P5 service functions, no P5 transforms, no P5 UI beyond the placeholder. |
| **Conflict Pre-Check** | **NONE** — see §3. All items on target files are CLOSED (Gate 5b) or BACKEND-BLOCKED INTAKE (CR-361, CR-362). |
| **Risk** | **HIGH** — `push-rates`, `push-inventory-restrictions`, `push-rate-restrictions` write live OTA data (revenue-affecting). `mark-no-show` is irreversible. No financial math in FE but wrong data pushed = direct revenue impact. |
| **Scope** | **FULL P5** — Rates view + push, Inventory Restrictions, Rate Restrictions, Mark No-Show. CR-358-P5.1 retired (B-P5-01 resolved, owner un-split). |
| **Backend blockers** | **NONE** — all 5 endpoints confirmed live. push-rates HTTP 200 verified. restrictions schema confirmed (object, not array). mark-no-show channel confirmed. room-payment 403 resolved (FE code was correct). |

---

## 1. Full Scope

### S8-C — Rates & Restrictions tab (3 sub-tabs)

| Sub-tab | Feature | Endpoints |
|---|---|---|
| **Rates** | Fetch rate grid → display → stage changes → push to OTAs | `POST /aiosell/fetch-rates`, `POST /aiosell/push-rates` |
| **Inventory Restrictions** | Set stop-sell / min-stay / CTA / CTD per room type → push | `POST /aiosell/push-inventory-restrictions` |
| **Rate Restrictions** | Set min-stay / CTA / CTD per rate plan → push | `POST /aiosell/push-rate-restrictions` |

### S8-D — Mark No-Show (both surfaces)

| Surface | Feature | Endpoint |
|---|---|---|
| ArrivalsPage Late + Today tab | Row-level No-Show button for booking.com / gommt pending rows | `POST /aiosell/mark-no-show` |
| ReservationsPage BlockPopover | Same action for pending OTA blocks with past check-in date | `POST /aiosell/mark-no-show` |

---

## 2. Data Flow Trace

### 2.1 — S8-C Rates: fetch → display → stage → push

```
User opens Tab 3 → Rates sub-tab mounts
  → useEffect calls pmsService.getRatesData({ startDate, endDate })
    → aiosellService.getRates({ startDate, endDate })
      → POST /aiosell/fetch-rates { start_date, end_date }
      → Response: data.aiosell.body.updates[]
          each: { startDate, endDate, rates: [{roomCode, rateplanCode, rate}] }
    → aiosellTransform.fromAPI.rates(raw)
      → fromRates() flattens to:
          { dateRateMap: { date → { rateplanCode → rate } }, rateplans: [...], dates: [...] }
  → RatesTab renders matrix: rows=rateplans × columns=dates

User clicks cell → CellEditPopover
  → shows current live rate, ±₹100/₹500 chips, input
  → "Stage Change" → stagedChanges Map updated: { "plan|date" → newRate }
  → cell turns orange, StagedReviewBar appears

User clicks "Review & Push"
  → DiffModal: Date / Room / Rate Plan / Live Rate / New Rate / Delta
  → "Confirm & Push Live Rates"
    → pmsService.pushRatesData(stagedChanges, rateplans)
      → builds rates array: [{ room_code, rateplan_code, rate }]  ← snake_case
      → aiosellService.pushRates({ start_date, end_date, rates })
        → POST /aiosell/push-rates
        → HTTP 200 confirmed ✅
      → toast.success, clear staged, refetch

camelCase/snake_case note (A-P5-01):
  fetch-rates returns: roomCode, rateplanCode (camelCase)
  push-rates expects:  room_code, rateplan_code (snake_case)
  fromRates normalises to camelCase internally; pushRatesData converts to snake_case before POST.
```

### 2.2 — S8-C Inventory Restrictions: form → push

```
No fetch endpoint — restrictions tab is push-only.
User sees form per room type (executive, suite):
  toggles: stop_sell, close_on_arrival, close_on_departure
  number:  minimum_stay

User clicks "Push Restrictions"
  → pmsService.pushInvRestrictionsData({ startDate, endDate, toChannels, rooms })
    → rooms: [{ room_code, restrictions: { stop_sell, minimum_stay, close_on_arrival, close_on_departure } }]
    → aiosellService.pushInventoryRestrictions({ startDate, endDate, toChannels, rooms })
      → POST /aiosell/push-inventory-restrictions
      → Body: { start_date, end_date, to_channels, rooms }
      → restrictions is an OBJECT not array (confirmed by backend)
      → HTTP 422 confirmed for missing fields; valid call → 200

restrictions object confirmed schema (from backend reply):
  stop_sell, minimum_stay, maximum_stay, close_on_arrival,
  close_on_departure, minimum_stay_arrival, maximum_stay_arrival,
  exact_stay_arrival, minimum_advance_reservation, maximum_advance_reservation
  (snake_case; camelCase also accepted by BE)

FE uses snake_case consistently (matches push-rates pattern).
```

### 2.3 — S8-C Rate Restrictions: form → push

```
Same push-only pattern.
User sees form per rate plan (executive-s-ep, etc.):
  toggles: stop_sell, close_on_arrival, close_on_departure
  number:  minimum_stay

User clicks "Push Rate Restrictions"
  → pmsService.pushRateRestrictionsData({ startDate, endDate, toChannels, rates })
    → rates: [{ room_code, rateplan_code, restrictions: { minimum_stay, close_on_arrival, ... } }]
    → aiosellService.pushRateRestrictions({ startDate, endDate, toChannels, rates })
      → POST /aiosell/push-rate-restrictions
      → Body: { start_date, end_date, to_channels, rates }
```

### 2.4 — S8-D Mark No-Show: Arrivals surface

```
ArrivalsPage Late or Today tab:
  eligibility per row:
    channel ∈ ['booking.com', 'gommt']  (row.channel from fromReservationOps)
    operationalStatus === 'pending'      (row.operationalStatus)
    activeTab ∈ ['late', 'today']

  eligible rows: action cell shows "Check In" (green) + "No-Show" (red outline)
  non-eligible: "Check In" only (unchanged)

User clicks "No-Show":
  → setNoShowTarget({ bookingId, guestName, channel, checkin, roomCode })
  → NoShowDialog opens
  → user confirms → pmsService.markNoShowBooking(bookingId, channel)
    → aiosellService.markNoShow({ booking_id: bookingId, channel })
      → POST /aiosell/mark-no-show { booking_id, channel }
      → channel field included per backend Q2-c advice
    → on success: sets operational_status=no_show + best-effort inv push (backend)
    → toast.success("No-Show recorded. Inventory released."), load()
    → on 422: toast.error(message)
```

### 2.5 — S8-D Mark No-Show: Tape Chart surface

```
ReservationsPage BlockPopover:
  eligibility:
    kind === 'pending'
    OTA_CHANNELS.includes((res.channel ?? '').toLowerCase())
    res.checkin <= localDate(0)   (localDate already imported at L4)

  eligible blocks: popover shows "Check In" AND "No-Show"
  non-eligible: "Check In" (in_house: "View Folio") as before

User clicks "No-Show":
  → setPopover(null)
  → setNoShowTarget({ bookingId: res.bookingId, guestName: res.guestName, channel: res.channel, checkin: res.checkin, roomCode: res.roomCode })
  → NoShowDialog (shared component) opens in parent
  → Same pmsService.markNoShowBooking flow
  → on success: load() + toast.success
```

---

## 3. Conflict Pre-Check

| File | Last modifier | Status | Conflict? |
|---|---|---|---|
| `ChannelManagerPage.jsx` | CR-358-P1 + BUG-377 | Gate 5b CLOSED | ✅ None — Tab 3 L466-475 owned by P5 |
| `aiosellService.js` | CR-358-P1 | Gate 5b CLOSED | ✅ None — appending after L120 |
| `aiosellTransform.js` | CR-358-P1/P2 | Gate 5b CLOSED | ✅ None — adding `fromRates`, registering |
| `pmsService.js` | CR-358-P4 | Gate 5b CLOSED | ✅ None — appending Phase 5 section after L312 |
| `ArrivalsPage.jsx` | CR-358-P3 | Gate 5b CLOSED | ✅ None — CR-362 BACKEND-BLOCKED INTAKE |
| `ReservationsPage.jsx` | CR-358-P4 | Gate 5b CLOSED | ✅ None — CR-361 BACKEND-BLOCKED INTAKE |

**No conflicts.**

---

## 4. Affected Files

### NEW files

| File | What | Est. lines |
|---|---|---|
| `src/pages/pms/RatesTab.jsx` | Full S8-C tab: Rates sub-tab (grid + popover + staged bar + diff modal) + Inventory Restrictions sub-tab (form per room type) + Rate Restrictions sub-tab (form per rate plan) + Bulk Editor trigger | ~500 |
| `src/components/pms/NoShowDialog.jsx` | Shared destructive confirmation dialog used by both ArrivalsPage and ReservationsPage. Calls `markNoShowBooking`. Handles loading + error state. | ~90 |

**Extraction rationale:** ChannelManagerPage.jsx is 482 lines with 3 existing tabs. Adding all S8-C content inline would push it to ~1,000 lines. Extracting to `RatesTab.jsx` keeps each file single-responsibility.

### MODIFIED files

| # | File | Current lines | Change | Estimated final lines |
|---|---|---|---|---|
| 1 | `src/api/services/aiosellService.js` | 120 | ADD 5 new async functions after L120: `getRates`, `pushRates`, `pushInventoryRestrictions`, `pushRateRestrictions`, `markNoShow` | ~185 |
| 2 | `src/api/transforms/aiosellTransform.js` | 224 | ADD `fromRates` function after L152; register `rates: fromRates` in `fromAPI` object (L211-219) | ~275 |
| 3 | `src/api/services/pmsService.js` | 312 | ADD Phase 5 section after L312: `getRatesData`, `pushRatesData`, `pushInvRestrictionsData`, `pushRateRestrictionsData`, `markNoShowBooking` | ~410 |
| 4 | `src/pages/pms/ChannelManagerPage.jsx` | 482 | REPLACE L466-475 (placeholder) with `{activeTab === 3 && <RatesTab />}`. Add 1 import line. | ~484 |
| 5 | `src/pages/pms/ArrivalsPage.jsx` | 273 | ADD: `noShowTarget` state, `OTA_NO_SHOW_CHANNELS` const, No-Show button in action cell (L226-240), `UserX` + `markNoShowBooking` + `toast` imports | ~345 |
| 6 | `src/pages/pms/ReservationsPage.jsx` | 343 | ADD: `noShowTarget` + `noShowBusy` state, No-Show button in `BlockPopover` L324-338, `onNoShow` prop on BlockPopover, `UserX` + `markNoShowBooking` imports | ~415 |

### Files that will NOT touch

```
src/api/constants.js          — all 5 constants already at L589-593 (inert, no change)
src/App.js                    — no new routes (all /pms/* already registered)
src/components/layout/Sidebar.jsx  — no new nav items
src/pages/pms/ChannelManagerPage.jsx L1-465  — ONLY L466-475 replaced
All other P1-P4 source files
```

---

## 5. API Contracts (confirmed by probes + backend reply)

### `POST /aiosell/fetch-rates`
```
Request:  { start_date, end_date }
Response: data.aiosell.body.updates[{ startDate, endDate, rates[{ roomCode, rateplanCode, rate }] }]
Status:   200 ✅ confirmed
```

### `POST /aiosell/push-rates`
```
Request:  { start_date, end_date, rates[{ room_code, rateplan_code, rate }] }  ← snake_case
Response: { status: true, message: "Rates pushed successfully" }
Status:   200 ✅ confirmed (probe P5-11b)
```

### `POST /aiosell/push-inventory-restrictions`
```
Request:  {
  start_date, end_date,
  to_channels: ["booking.com"],
  rooms: [{
    room_code: "executive",
    restrictions: {          ← OBJECT not array (confirmed)
      stop_sell: true,
      minimum_stay: 2,
      close_on_arrival: false,
      close_on_departure: false
    }
  }]
}
Status: 200 on valid request ✅ (422 confirmed when restrictions:{})
```

### `POST /aiosell/push-rate-restrictions`
```
Request:  {
  start_date, end_date,
  to_channels: ["booking.com"],
  rates: [{
    room_code: "executive",
    rateplan_code: "executive-s-ep",
    restrictions: {          ← OBJECT not array
      minimum_stay: 2,
      close_on_arrival: true
    }
  }]
}
Status: 200 on valid request ✅
```

### `POST /aiosell/mark-no-show`
```
Request:  { booking_id: "BDC...", channel: "booking.com" }  ← channel field added per Q2-c
Response: { status: true } + sets operational_status=no_show + best-effort inventory push
Status: 200 for valid eligible bookings ✅
         422 if: already cancelled/no_show; room checked in (has order_id); wrong channel
         422 if Aiosell CM rejects (stale sandbox bookings — not a code issue)
```

---

## 6. New Service Functions — full set

### aiosellService.js (append after L120)

```js
// CR-358-P5: S8-C fetch current rates
export const getRates = async ({ startDate, endDate }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RATES, {
    start_date: startDate, end_date: endDate,
  });
  return res.data;
};

// CR-358-P5: S8-C push rate changes to OTAs
export const pushRates = async ({ startDate, endDate, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATES, {
    start_date: startDate, end_date: endDate, rates,  // [{room_code, rateplan_code, rate}]
  });
  return res.data;
};

// CR-358-P5: S8-C push inventory restrictions per room type
export const pushInventoryRestrictions = async ({ startDate, endDate, toChannels, rooms }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_INVENTORY_RESTRICT, {
    start_date: startDate, end_date: endDate,
    to_channels: toChannels,
    rooms,  // [{ room_code, restrictions: {stop_sell, minimum_stay, close_on_arrival, close_on_departure} }]
  });
  return res.data;
};

// CR-358-P5: S8-C push rate restrictions per rate plan
export const pushRateRestrictions = async ({ startDate, endDate, toChannels, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATE_RESTRICT, {
    start_date: startDate, end_date: endDate,
    to_channels: toChannels,
    rates,  // [{ room_code, rateplan_code, restrictions: {minimum_stay, close_on_arrival, ...} }]
  });
  return res.data;
};

// CR-358-P5: S8-D mark no-show (booking.com / gommt only)
export const markNoShow = async ({ bookingId, channel }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.MARK_NO_SHOW, {
    booking_id: bookingId,
    channel,
  });
  return res.data;
};
```

### pmsService.js Phase 5 section (append after L312)

```js
// ─── Phase 5 (CR-358-P5) ─────────────────────────────────────────────────────

/** S8-C: fetch and normalise rates for the rate grid */
export const getRatesData = async ({ startDate, endDate }) => {
  const raw = await getRates({ startDate, endDate });
  return aiosellTransform.fromAPI.rates(raw);
};

/** S8-C: push staged rate changes.
 * stagedChanges: Map<"rateplanCode|date", newRate>
 * rateplans:     [{ roomCode, rateplanCode }]
 */
export const pushRatesData = async (stagedChanges, rateplans) => {
  const entries = [...stagedChanges.entries()];
  if (!entries.length) throw new Error('No staged changes');
  const dates = entries.map(([k]) => k.split('|')[1]).sort();
  const planToRoom = Object.fromEntries(rateplans.map(p => [p.rateplanCode, p.roomCode]));
  const rates = entries.map(([key, rate]) => {
    const [rateplanCode] = key.split('|');
    return { room_code: planToRoom[rateplanCode], rateplan_code: rateplanCode, rate };
  });
  return pushRates({ startDate: dates[0], endDate: dates[dates.length - 1], rates });
};

/** S8-C: push inventory restrictions for all room types in the form */
export const pushInvRestrictionsData = async ({ startDate, endDate, toChannels, rooms }) =>
  pushInventoryRestrictions({ startDate, endDate, toChannels, rooms });

/** S8-C: push rate restrictions for all rate plans in the form */
export const pushRateRestrictionsData = async ({ startDate, endDate, toChannels, rates }) =>
  pushRateRestrictions({ startDate, endDate, toChannels, rates });

/** S8-D: mark a booking as no-show. channel required for Aiosell routing. */
export const markNoShowBooking = async (bookingId, channel) =>
  markNoShow({ bookingId, channel });
```

---

## 7. `fromRates` Transform

### Input (raw fetch-rates response)
```js
data.data.aiosell.body.updates = [
  {
    startDate: "2026-09-10",  // camelCase from Aiosell
    endDate:   "2026-09-10",
    rates: [
      { roomCode: "executive", rateplanCode: "executive-s-ep", rate: 7400 },
      { roomCode: "suite",     rateplanCode: "suite-s-ep",     rate: 31500 },
      // ... 8 rateplans
    ]
  },
  // one entry per date (or same-rate date range)
]
```

### Output `fromRates(data)` → registered as `aiosellTransform.fromAPI.rates`
```js
{
  dateRateMap: {                              // O(1) cell lookup
    "2026-09-10": {
      "executive-s-ep": 7400,
      "suite-s-ep":     31500,
      ...
    },
    ...
  },
  rateplans: [                                // ordered for row rendering
    { roomCode: "executive", rateplanCode: "executive-s-ep" },
    { roomCode: "executive", rateplanCode: "executive-s-cp" },
    { roomCode: "executive", rateplanCode: "executive-d-cp" },
    { roomCode: "executive", rateplanCode: "executive-d-ep" },
    { roomCode: "suite",     rateplanCode: "suite-s-ep" },
    { roomCode: "suite",     rateplanCode: "suite-s-cp" },
    { roomCode: "suite",     rateplanCode: "suite-d-cp" },
    { roomCode: "suite",     rateplanCode: "suite-d-ep" },
  ],
  dates: ["2026-09-10", "2026-09-11", ..., "2026-09-16"],
}
```

**Duplicate date handling:** if same date appears in multiple updates[], last entry wins per rateplan. `fromRates` iterates updates in order and overwrites — safe for Aiosell's format.

---

## 8. RatesTab.jsx — state model

| State | Type | Purpose |
|---|---|---|
| `ratesData` | `{dateRateMap, rateplans, dates}` | Fetched rate grid |
| `stagedChanges` | `Map<string,number>` | `{plan\|date → newRate}` |
| `dateRange` | `{start, end}` | Selected date window |
| `subTab` | `'rates'` \| `'inv'` \| `'raterestrict'` | Active sub-tab |
| `popoverCell` | `{key, liveRate, plan, date}` \| null | Open cell edit popover |
| `showDiffModal` | boolean | Before/After push diff |
| `showBulkDrawer` | boolean | Bulk editor drawer |
| `invForm` | `{ executive: { stop_sell, minimum_stay, close_on_arrival, close_on_departure }, suite: {...} }` | Inventory restrictions form state |
| `rrForm` | `{ [rateplanCode]: { minimum_stay, stop_sell, close_on_arrival, close_on_departure } }` | Rate restrictions form state |
| `loading` / `error` | boolean / string | Async states |

**Channels for restrictions push:** hardcoded initial default `["booking.com"]` with a multi-select to add others. The to_channels value is pass-through to Aiosell (backend reply Q1 confirmed).

---

## 9. ArrivalsPage.jsx — change spec

**State (add near top of component):**
```js
const [noShowTarget, setNoShowTarget] = useState(null);
```

**Constant (add near TABS declaration):**
```js
const OTA_NO_SHOW_CHANNELS = ['booking.com', 'gommt']; // CR-358-P5
```

**Action cell L226-240 — replace:**
```jsx
<td className="px-4 py-3">
  <div className="flex gap-2 flex-wrap">
    {isCheckedIn ? (
      <button data-testid={`arr-view-btn-${row.bookingId}`} ...>View</button>
    ) : (
      <button data-testid={`arr-checkin-btn-${row.bookingId}`} ...>Check In</button>
    )}
    {!isCheckedIn && (activeTab === 'late' || activeTab === 'today') &&
      OTA_NO_SHOW_CHANNELS.includes((row.channel ?? '').toLowerCase()) &&
      row.operationalStatus === 'pending' && (
        <button
          data-testid={`arr-noshow-btn-${row.bookingId}`}
          onClick={() => setNoShowTarget({ bookingId: row.bookingId, guestName: row.guestName,
            channel: row.channel, checkin: row.checkin, roomCode: row.roomCode })}
          className="px-2.5 py-1.5 rounded text-[12px] font-medium border border-[#EF4444]
            text-[#EF4444] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1">
          <UserX className="w-3 h-3" /> No-Show
        </button>
    )}
  </div>
</td>
```

**New imports:** `UserX` (lucide-react), `{ markNoShowBooking }` (pmsService), `{ toast }` (sonner), `{ useState }` already imported.

**NoShowDialog rendered below the table (or near EOF of JSX):**
```jsx
<NoShowDialog target={noShowTarget} onClose={() => setNoShowTarget(null)}
  onSuccess={() => { load(); toast.success('No-Show recorded. Inventory released.'); }} />
```

---

## 10. ReservationsPage.jsx — change spec

**State (add near L43):**
```js
const [noShowTarget, setNoShowTarget] = useState(null);
```

**BlockPopover function signature update (L290):**
```js
// Before:
function BlockPopover({ popover, popRef, setPopover, navigate })
// After:
function BlockPopover({ popover, popRef, setPopover, navigate, onNoShow })
```

**BlockPopover caller update (L223):**
```jsx
{popover && <BlockPopover popover={popover} popRef={popRef} setPopover={setPopover}
  navigate={navigate} onNoShow={(t) => setNoShowTarget(t)} />}
```

**Inside BlockPopover — add eligibility check + button (insert after L323, within action buttons div):**
```jsx
{/* CR-358-P5: No-Show — pending OTA blocks with past check-in */}
{kind === 'pending' &&
  ['booking.com', 'gommt'].includes((res.channel ?? '').toLowerCase()) &&
  res.checkin <= localDate(0) && (
    <button data-testid="tc-popover-noshow-btn"
      onClick={() => { setPopover(null); onNoShow({ bookingId: res.bookingId,
        guestName: res.guestName, channel: res.channel, checkin: res.checkin,
        roomCode: res.roomCode }); }}
      className="px-3 py-1.5 rounded-md text-[11px] font-medium border border-[#EF4444]
        text-[#EF4444] hover:bg-[#FEE2E2] transition-colors flex items-center gap-1">
      <UserX className="w-3 h-3" />No-Show
    </button>
)}
```

**NoShowDialog in parent (after tape chart div):**
```jsx
<NoShowDialog target={noShowTarget} onClose={() => setNoShowTarget(null)}
  onSuccess={() => { load(); toast.success('No-Show recorded. Inventory released.'); }} />
```

**New imports:** `UserX` (lucide-react), `{ markNoShowBooking }` (pmsService — `localDate` already imported at L4).

---

## 11. NoShowDialog.jsx — interface

```jsx
// src/components/pms/NoShowDialog.jsx  (NEW — CR-358-P5)
// Props:
//   target:    { bookingId, guestName, channel, checkin, roomCode } | null
//   onClose:   () => void
//   onSuccess: () => void

// Renders: null when target is null (not mounted until needed)
// Shows: booking detail card + red warning + optional remark input
// On confirm: calls markNoShowBooking(target.bookingId, target.channel)
// Loading state on confirm button; error via toast.error on 422
```

---

## 12. Risk Register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-P5-01 | Wrong rate pushed to live OTA (typo = instant revenue loss) | HIGH | Diff modal required before any push. Staged state prevents accidental push. No direct cell editing. |
| R-P5-02 | mark-no-show irreversible | HIGH | Two-step destructive confirm with booking details + red warning. |
| R-P5-03 | camelCase/snake_case mismatch on push-rates | MEDIUM | `pushRatesData` converts before POST. Verified in V-G2. |
| R-P5-04 | Restrictions must be OBJECT not array | HIGH | `pushInventoryRestrictions` / `pushRateRestrictions` always build object shape. Empty form state = all fields at default (not empty object). |
| R-P5-05 | mark-no-show 422 on Aiosell CM rejection | MEDIUM | UI shows toast.error(message). UX note in form. Sandbox may reject stale bookings — not a code issue. |
| R-P5-06 | to_channels[] for restrictions — wrong values | LOW | Default to `["booking.com"]`, allow user multi-select. Pass-through to Aiosell. |
| R-P5-07 | Inventory restrictions form sends empty object `{}` | HIGH | Gate at service layer: only include fields the user has set (non-default). Do not send `{}` — Aiosell rejects. |
| R-P5-08 | RatesTab size (~500 lines) | LOW | Acceptable for a complex multi-sub-tab component. Extraction from ChannelManagerPage keeps parent manageable. |

---

## 13. Verification Matrix

| V# | Feature | File | Verify | Auto? |
|---|---|---|---|---|
| V-G1 | getRates 200 + shape | aiosellService.js | curl POST /fetch-rates → HTTP 200, has updates[] | YES |
| V-G2 | pushRates snake_case | aiosellService.js | curl POST /push-rates with room_code/rateplan_code/rate → HTTP 200 | YES |
| V-G3 | pushInventoryRestrictions object format | aiosellService.js | curl POST /push-inventory-restrictions with restrictions:{stop_sell:true} → HTTP 200 | YES |
| V-G4 | pushRateRestrictions object format | aiosellService.js | curl POST /push-rate-restrictions with restrictions:{minimum_stay:2} → HTTP 200 | YES |
| V-G5 | markNoShow with channel | aiosellService.js | curl POST /mark-no-show {booking_id, channel} → note: sandbox may 422 (Aiosell state) | YES |
| V-U1 | fromRates flatten | aiosellTransform.js | Unit: 2 dates × 2 plans → dateRateMap correct values, rateplans length=2 | YES |
| V-U2 | fromRates duplicate date | aiosellTransform.js | Unit: same date in 2 updates → last entry wins | YES |
| V-U3 | pushRatesData snake_case conversion | pmsService.js | Unit: stagedChanges with camelCase keys → rates array has room_code/rateplan_code | YES |
| V-B1 | Rate grid 8 rows × 7 columns | RatesTab.jsx | Browser: count matrix cells | NO |
| V-B2 | SAT/SUN columns amber background | RatesTab.jsx | Browser: check weekend column tint | NO |
| V-B3 | Cell click → popover with correct rate | RatesTab.jsx | Browser: click cell → popover shows matching ₹ | NO |
| V-B4 | Stage → orange cell + review bar | RatesTab.jsx | Browser: stage 1 change → cell orange, bar shows "1 change" | NO |
| V-B5 | Diff modal before/after | RatesTab.jsx | Browser: stage 2 cells → review → verify Date/Room/Plan/Before/After/Delta | NO |
| V-B6 | Push confirm → toast + staged cleared | RatesTab.jsx | Browser: confirm push → success toast, cells clean | NO |
| V-B7 | Inv Restrictions sub-tab visible | RatesTab.jsx | Browser: click "Inventory Restrictions" tab → form renders per room type | NO |
| V-B8 | stop_sell ON → push succeeds | RatesTab.jsx | Browser: toggle stop_sell ON → push → HTTP 200 | NO |
| V-B9 | Rate Restrictions sub-tab visible | RatesTab.jsx | Browser: click "Rate Restrictions" tab → form renders per rate plan | NO |
| V-B10 | No-Show on Late tab (booking.com row) | ArrivalsPage.jsx | Browser: Late tab booking.com pending row → "No-Show" button present | NO |
| V-B11 | No-Show NOT on Direct channel row | ArrivalsPage.jsx | Browser: Direct booking → no "No-Show" button | NO |
| V-B12 | No-Show NOT on Upcoming tab | ArrivalsPage.jsx | Browser: Upcoming tab rows → no "No-Show" buttons | NO |
| V-B13 | NoShowDialog shows booking details | NoShowDialog.jsx | Browser: click No-Show → dialog shows guestName, bookingId, channel, checkin | NO |
| V-B14 | Tape Chart pending OTA block → No-Show in popover | ReservationsPage.jsx | Browser: click eligible pending booking.com block → popover has No-Show button | NO |
| V-B15 | No-Show NOT on in_house block | ReservationsPage.jsx | Browser: click occupied block → no No-Show button | NO |
| V-R1 | ChannelManagerPage Tabs 0-2 regression | ChannelManagerPage.jsx | Browser: switch OTA/Setup/Mapping → all render | NO |
| V-R2 | ArrivalsPage Today/Upcoming/CheckedIn unchanged | ArrivalsPage.jsx | Browser: other tabs → no No-Show buttons | NO |
| V-R3 | ReservationsPage tape chart regression | ReservationsPage.jsx | Browser: tape chart renders rooms + blocks | NO |
| V-M1 | Rate push live on OTA | preprod | After push confirm, re-fetch → new rates match staged | NO |
| V-M2 | No-Show on Arrivals (fresh eligible booking) | preprod | Use booking.com/gommt pending + past checkin → confirm → toast success | NO |
| V-M3 | Inv Restrictions push | preprod | Push stop_sell:true for executive → verify on Aiosell CM dashboard | NO |

**Total: 28 checks (5 curl, 3 unit, 17 browser, 3 manual)**

---

## 14. Post-Code Registry Checklist (for Implementation agent)

```
□ registry.json: CR-358-P5 → status "IMPLEMENTED", sprint_key "pos_pms_1", gate 5a
□ CR_REGISTRY.md: row → IMPLEMENTED (Gate 5a)
□ FILE_OWNERSHIP.md: add new + modified files with CR-358-P5 + date
□ Code marker // CR-358-P5 in header of every modified file
□ New files created: RatesTab.jsx, NoShowDialog.jsx
□ PRD.md: P5 status line updated
□ Verify webpack compiles with 0 errors after all changes
```

---

## 15. Scope Lock Declaration

```
Files WILL change (8 total — 2 NEW, 6 MODIFIED):

NEW:
  src/pages/pms/RatesTab.jsx                    (~500 lines)
  src/components/pms/NoShowDialog.jsx            (~90 lines)

MODIFIED:
  src/api/services/aiosellService.js             (L120 append: +5 functions, ~65 lines)
  src/api/transforms/aiosellTransform.js         (L152 add fromRates, L219 register, ~50 lines)
  src/api/services/pmsService.js                 (L312 append: Phase 5 section, ~100 lines)
  src/pages/pms/ChannelManagerPage.jsx           (L466-475 replace: 10 lines → 1 line + import)
  src/pages/pms/ArrivalsPage.jsx                 (L226-240 extend + state + imports, ~70 lines)
  src/pages/pms/ReservationsPage.jsx             (BlockPopover + state + imports, ~70 lines)

Files will NOT touch:
  src/api/constants.js    (all 5 constants already declared)
  src/App.js              (no new routes)
  src/components/layout/Sidebar.jsx
  src/pages/pms/ChannelManagerPage.jsx L1-465
  All P1-P4 source files not listed above
```

---

*Gate 2 v2 complete. Full scope. Zero backend blockers. 8 files (2 NEW). 28 verification checks.*
*Awaiting Gate 4 GO → then Gate 3 Implementation Plan → Implementation.*
