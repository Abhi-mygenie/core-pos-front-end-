# BUG-515 — IMPACT ANALYSIS (Gate 2)

**ID:** BUG-515
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 2)
**Code Reality:** PARTIAL — `chargeGst` proxy formula and `RowExpansionStub` `row.charge.*` reads both exist and are actively wrong for discounted bookings
**Risk:** CRITICAL (R6 — financial display, balance column drives billing decisions)
**ODs locked:** OD-515-01 = a (roomGstSlabs parameter chain) · OD-515-02 = c (both sections, clearly labeled)

---

## Conflict Pre-Check

| File | Last modifier | Last date | Open items (excl. BUG-515) | Conflict? |
|---|---|---|---|---|
| `pmsService.js` | BUG-493 (L68+L114) | 2026-10-06 | None | NONE |
| `frontDeskService.js` | BUG-514 (L104) | 2026-10-08 | None (BUG-514 is GATE_5A) | NONE — parallel-safe (BUG-514 edits L104; BUG-515 edits L147-148) |
| `FrontDeskWorkstationPage.jsx` | CR-385 P0.5 | 2026-09-21 | None | NONE |
| `GuestTable.jsx` | BUG-439 | 2026-09-21 | None | NONE |

---

## 1. Problem Statement

When a room check-in applies a discount (e.g. ₹1,000 off ₹3,000 room), the In-House tab row balance and expanded row display show **rack-rate** values. Two independent break points:

- **Sub-A (row balance):** `pmsService.js L112` uses `chargeGst = rack sgst + rack cgst = 150` as a proxy. Correct value is `effectiveGst = computeRoomGst(slabs, 2000, 1) = 100`. Result: balance shows ₹650 instead of ₹600.
- **Sub-B (expanded row):** `RowExpansionStub` reads `row.charge.*` exclusively (booking-time snapshot). `charge.total_with_gst`, `charge.sgst`, `charge.cgst`, `charge.balance_due` never update for discounts. Shows ₹3,150 / ₹75 / ₹75 / ₹1,650 instead of correct post-discount values.

---

## 2. Data Flow Traces

### Sub-A — Row balance ₹650 (should be ₹600)

```
FrontDeskWorkstationPage.jsx L102:
  useRowBalances({ roomGstApplicable: true, totalRound })
    → frontDeskService.getRowBalances({ roomGstApplicable, totalRound })  [L147]
        → pmsService.getInHouseGuests({ roomGstApplicable })               [L38]
            Step 3 [L80-162]:
              ri = raw.room_info
              rp = 3000,  gt = 0 (ABSENT),  bp = 500
              chargeGst = row.charge.sgst + row.charge.cgst   [L112]
                        = 75 + 75 = 150   ← RACK — BREAK POINT A
              roomBalance = bp + chargeGst = 500 + 150 = 650  [L114]  ← WRONG
              row.balance = 650                                [L157]
        → joinRowBalances() → balances[orderId].display = 650
  → InHousePanel → balanceOf(balances)(r) → row balance cell ₹650

ROOT CAUSE: chargeGst uses rack values. effectiveGst needs roomGstSlabs (not currently passed).
KNOWN LIMITATION: ri.gst_tax CONFIRMED ABSENT from room_info API (live probe 2026-10-08).
SOLUTION: compute effectiveGst = computeRoomGst(roomGstSlabs, rp - discountRs, nights) when discountRs > 0.
nights available via row.charge.nights = 1 (confirmed in LR response).
```

### Sub-B — Expanded row all rack values

```
InHousePanel → GuestTable.renderExpansion(row)
  → RowExpansionStub({ row })  [GuestTable.jsx L156]
      row.charge.total_with_gst = 3150  [L167] ← RACK — BREAK POINT B
      row.charge.sgst           = 75    [L169] ← RACK
      row.charge.cgst           = 75    [L170] ← RACK
      row.charge.balance_due    = 1650  [L171] ← RACK (3150−1500)
      row.charge.advance_payment= 1500  [L168] ← CORRECT (backend updates)

ROOT CAUSE: Step 3 in getInHouseGuests() enriches row.balance but does NOT store
ri.room_discount_amount or computed effectiveGst/effectiveTotal/effectiveBalanceDue on row.
RowExpansionStub has no post-discount data to display.
```

---

## 3. OD-515-02 Option c — Expanded Row Layout

**"Both sections, clearly labeled"**

```
When roomDiscountAmount = 0 (no discount):
  Booking (incl. GST)  | ₹3,150       Paid so far  | ₹1,500
  SGST                 | ₹75          
  CGST                 | ₹75          
  Balance due          | ₹1,650

When roomDiscountAmount > 0 (discount applied):
  ── Booking rate ─────────────────────────────────────
  Booking (incl. GST)  | ₹3,150       Paid so far  | ₹1,500
  SGST                 | ₹75          
  CGST                 | ₹75          

  ── After check-in discount (−₹1,000) ────────────────
  Effective total      | ₹2,100      
  SGST                 | ₹50         
  CGST                 | ₹50         
  Balance due          | ₹600   ← from effective section
```

The two sections are visually separated with labels so the staff can see both the original booking rate AND what the guest actually owes.

---

## 4. Affected Files and Edit Description

| Edit | File | Change | Sub-issue |
|---|---|---|---|
| E-1a | `src/api/services/pmsService.js` | Add import `computeRoomGst` | A |
| E-1b | `src/api/services/pmsService.js` | Add `roomGstSlabs = null` to `getInHouseGuests` signature | A |
| E-1c | `src/api/services/pmsService.js` | Replace `chargeGst` with `effectiveGst`; enrich row with discount-aware fields | A + B |
| E-1d | `src/api/services/pmsService.js` | Add `roomGstSlabs = null` to `getRowBalances` + forward it | A |
| E-2 | `src/api/services/frontDeskService.js` L147-148 | Add `roomGstSlabs` to `getRowBalances` params + forward to `getInHouseGuests` | A |
| E-3 | `src/pages/pms/FrontDeskWorkstationPage.jsx` L102 | Add `roomGstSlabs: restaurant?.checkInFlags?.roomGstSlabs ?? null` to `useRowBalances` opts | A |
| E-4 | `src/components/pms/frontdesk/GuestTable.jsx` L156-177 | Rewrite `RowExpansionStub` — Option c layout (two labeled sections when discount > 0) | B |

**Files WILL change:** `pmsService.js` · `frontDeskService.js` · `FrontDeskWorkstationPage.jsx` · `GuestTable.jsx`
**Files will NOT touch:** `InHousePanel.jsx` · `ArrivalsPanel.jsx` · `DeparturesPanel.jsx` · `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5) · any other file

---

## 5. Detailed Edit Specs (for Gate 3 plan)

### E-1 — pmsService.js (Sub-A formula + Sub-B row enrichment)

**E-1a — import (new line, top of file):**
```js
import { computeRoomGst } from '../../utils/roomGstCalculator';  // BUG-515
```

**E-1b — getInHouseGuests signature (L38):**
```js
// CURRENT:
export const getInHouseGuests = async ({ roomGstApplicable = false } = {}) => {

// NEW:
export const getInHouseGuests = async ({ roomGstApplicable = false, roomGstSlabs = null } = {}) => {  // BUG-515
```

**E-1c — Step 3 balance formula + row enrichment (L112-114 area):**
```js
// CURRENT:
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const roomBalance = bp != null
    ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))
    : ...

// NEW (replace the chargeGst line and bp path):
const discountRs    = Number(ri.room_discount_amount ?? 0);
const effectiveRoom = Math.max(0, rp - discountRs);
const nights        = row.charge?.nights ?? 1;                    // BUG-515: available in LR charge
const chargeGst     = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
const effectiveGst  = discountRs > 0 && roomGstApplicable && roomGstSlabs  // BUG-515
    ? computeRoomGst(true, roomGstSlabs, effectiveRoom, nights, 1).gstTotal
    : chargeGst;  // no discount → rack values still correct; also fallback if slabs absent

const roomBalance = bp != null
    ? (bp === 0 ? 0 : Math.max(0, bp + effectiveGst))  // BUG-515: was chargeGst
    : Math.max(0, rp + gt - ap - rb - discountRs);

// Sub-B enrichment — after roomBalance computed, before F&B:
if (discountRs > 0) {                                            // BUG-515
    row.roomDiscountAmount    = discountRs;
    row.effectiveGst          = effectiveGst;
    row.effectiveSgst         = Math.round(effectiveGst / 2 * 100) / 100;
    row.effectiveCgst         = Math.round(effectiveGst / 2 * 100) / 100;
    row.effectiveTotal        = Math.round((effectiveRoom + effectiveGst) * 100) / 100;
    row.effectiveBalanceDue   = Math.round((effectiveRoom + effectiveGst - Number(row.charge?.advance_payment ?? 0)) * 100) / 100;
}
```

**E-1d — getRowBalances signature + forward (L147-148):**
```js
// CURRENT:
export const getRowBalances = async ({ roomGstApplicable = false, totalRound = true } = {}) =>
  joinRowBalances(await getInHouseGuests({ roomGstApplicable }), { totalRound });

// NEW:
export const getRowBalances = async ({ roomGstApplicable = false, roomGstSlabs = null, totalRound = true } = {}) =>  // BUG-515
  joinRowBalances(await getInHouseGuests({ roomGstApplicable, roomGstSlabs }), { totalRound });  // BUG-515
```

### E-2 — frontDeskService.js L147-148

```js
// CURRENT:
export const getRowBalances = async ({ roomGstApplicable = false, totalRound = true } = {}) =>
  joinRowBalances(await getInHouseGuests({ roomGstApplicable }), { totalRound });

// NEW:
export const getRowBalances = async ({ roomGstApplicable = false, roomGstSlabs = null, totalRound = true } = {}) =>  // BUG-515
  joinRowBalances(await getInHouseGuests({ roomGstApplicable, roomGstSlabs }), { totalRound });  // BUG-515
```

### E-3 — FrontDeskWorkstationPage.jsx L102

```js
// CURRENT:
const balances = useRowBalances(snap?.loadedAt, inHouseCount, { roomGstApplicable: Boolean(restaurant?.checkInFlags?.roomGstApplicable), totalRound: restaurant?.totalRound !== false });

// NEW:
const balances = useRowBalances(snap?.loadedAt, inHouseCount, { roomGstApplicable: Boolean(restaurant?.checkInFlags?.roomGstApplicable), roomGstSlabs: restaurant?.checkInFlags?.roomGstSlabs ?? null, totalRound: restaurant?.totalRound !== false }); // BUG-515
```

### E-4 — GuestTable.jsx RowExpansionStub (L156-177)

Replace the current `RowExpansionStub` with a discount-aware version:

```jsx
export const RowExpansionStub = ({ row, onClose, actions }) => {
  const hasDiscount = (row.roomDiscountAmount ?? 0) > 0;
  return (
    <div className="px-5 py-4" data-testid={`fd-row-${row.id}-detail`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
          <div className="text-[12px] text-[#767676] mt-1">
            {channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'}{row.roomType ? ` (${row.roomType})` : ''}
            {row.phone ? ` · ${maskPhone(row.phone)}` : ''}{row.email ? ` · ${row.email}` : ''}
          </div>
          {row.specialRequests && <div className="text-[12px] mt-1"><span className="text-[#767676]">Special requests:</span> {row.specialRequests}</div>}

          {/* Section 1 — Booking rate (always shown) */}
          <div className={`mt-3 text-[12px] ${hasDiscount ? 'pb-2 border-b border-[#E5E5E5]' : ''}`}>
            {hasDiscount && <div className="text-[10px] font-semibold uppercase tracking-wide text-[#767676] mb-1.5">Booking rate</div>}
            <div className="grid grid-cols-4 gap-x-6 gap-y-1">
              <span className="text-[#767676]">Booking (incl. GST)</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-total`}>{fmtINR(row.charge?.total_with_gst)}</span>
              <span className="text-[#767676]">Paid so far</span><span className="tabular-nums" data-testid={`fd-row-${row.id}-paid`}>{fmtINR(row.charge?.advance_payment)}</span>
              <span className="text-[#767676]">SGST</span><span className="tabular-nums">{fmtINR(row.charge?.sgst)}</span>
              <span className="text-[#767676]">CGST</span><span className="tabular-nums">{fmtINR(row.charge?.cgst)}</span>
              {!hasDiscount && <><span className="text-[#767676]">Balance due</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-due`}>{fmtINR(row.charge?.balance_due)}</span></>}
            </div>
          </div>

          {/* Section 2 — After discount (only when discount > 0) */}
          {hasDiscount && (
            <div className="mt-2 text-[12px]">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#329937] mb-1.5">After check-in discount (−{fmtINR(row.roomDiscountAmount)})</div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-1">
                <span className="text-[#767676]">Effective total</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-effective-total`}>{fmtINR(row.effectiveTotal)}</span>
                <span className="text-[#767676]">Balance due</span><span className="font-semibold tabular-nums text-[#329937]" data-testid={`fd-row-${row.id}-due`}>{fmtINR(row.effectiveBalanceDue)}</span>
                <span className="text-[#767676]">SGST</span><span className="tabular-nums">{fmtINR(row.effectiveSgst)}</span>
                <span className="text-[#767676]">CGST</span><span className="tabular-nums">{fmtINR(row.effectiveCgst)}</span>
              </div>
            </div>
          )}
        </div>
        <button type="button" data-testid={`fd-row-${row.id}-close`} onClick={(e) => { e.stopPropagation(); onClose(); }} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A] ml-4">✕ Close</button>
      </div>
      <div className="mt-3 flex justify-end">{actions}</div>
    </div>
  );
};
```

---

## 6. Risk Classification

- **Risk: CRITICAL** (R6 — financial display; balance column directly informs how much to collect at checkout; wrong value = overcharging risk)
- **Hotspot files touched:** NONE (none of the 4 files are in the R5 list)
- **Financial test required:** YES — verify row balance = 600 and expanded "Balance due" = 600 for bonk booking
- **No planning skip:** R6 + 4 files

---

## 7. Downstream Consumers

| Consumer | Impact |
|---|---|
| `balanceOf()` in `DeparturesPanel.jsx` | Reads `balances[orderId].display` → feeds Departures balance column too. Fix in pmsService/frontDeskService automatically improves Departures balance as well (shared `getInHouseGuests` call). |
| Sorting (`sortRows` in `GuestTable.jsx L132`) | Sorts by `r.charge?.balance_due ?? r.charge?.total_with_gst`. Sorting of discounted rows will STILL use rack value for sort key. — OD for Gate 3: should sort key use `effectiveBalanceDue`? Register as OD-515-03. |
| `phase3.cr385.test.jsx L47` | Tests `balanceOf(null)(r)` → `r.charge.balance_due`. This test is for the null fallback path, unaffected by BUG-515. |

### New open question for Gate 3:

**OD-515-03** — Should the sort key (column header sort) also use `effectiveBalanceDue` when discount > 0?
- Option a (recommended): YES — sort by actual balance owed (effectiveBalanceDue) when discount > 0, else rack balance_due. Requires updating `sortRows` `case 'amount'` (1 additional line in GuestTable.jsx).
- Option b: NO — keep rack for sort key. Simpler but inconsistent with displayed value.

---

## 8. Verification Matrix (seeds Gate 3 plan)

| # | Edit | How to verify | Automated? |
|---|---|---|---|
| V-1 | E-1a import | `grep "computeRoomGst" pmsService.js` | YES |
| V-2 | E-1b signature | `grep "roomGstSlabs" pmsService.js \| grep getInHouseGuests` | YES |
| V-3 | E-1c formula | `grep "effectiveGst\|discountRs\|effectiveRoom" pmsService.js` | YES |
| V-4 | E-1c enrichment | `grep "row.roomDiscountAmount\|row.effectiveTotal\|row.effectiveBalanceDue" pmsService.js` | YES |
| V-5 | E-1d getRowBalances | `grep "roomGstSlabs" pmsService.js \| grep getRowBalances` | YES |
| V-6 | E-2 frontDeskService | `grep "roomGstSlabs" frontDeskService.js` | YES |
| V-7 | E-3 Page | `grep "roomGstSlabs.*checkInFlags" FrontDeskWorkstationPage.jsx` | YES |
| V-8 | E-4 RowExpansionStub | `grep "hasDiscount\|effectiveTotal\|Booking rate\|After check-in" GuestTable.jsx` | YES |
| V-9 | compile | webpack 0 new warnings | YES |
| V-10 | bonk row balance | Row balance = ₹600 (was ₹650) | NO (browser) |
| V-11 | bonk expanded section 1 | "Booking rate" section shows ₹3,150 / ₹75 / ₹75 | NO (browser) |
| V-12 | bonk expanded section 2 | "After check-in discount (−₹1,000)" shows ₹2,100 / ₹50 / ₹50 / Balance ₹600 | NO (browser) |
| V-13 | no-discount row unchanged | Row with no discount shows old layout (no Section 2) | NO (browser) |
| V-14 | roomGstApplicable=false | No discount booking: effectiveGst = chargeGst (fallback path) | NO (browser) |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-515 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-515 row updated
- [ ] FILE_OWNERSHIP.md: all 4 files listed — BUG-515, 2026-10-xx
- [ ] Code markers: // BUG-515 on every modified line/block
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## 10. Open Question for Owner (Gate 3 blocker)

**OD-515-03** — Should the row sort key (Balance column sort) use `effectiveBalanceDue` for discounted rows?
- **Option a (recommended):** YES — sort by actual balance. +1 line in GuestTable.jsx `sortRows` `case 'amount'`.
- **Option b:** NO — keep rack value as sort key.

This is small but needs owner decision before the Gate 3 plan can lock the GuestTable edit scope.

