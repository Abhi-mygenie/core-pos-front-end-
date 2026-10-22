# BUG-515 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-515
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Based on:** `impact/BUG-515_IMPACT_ANALYSIS.md`
**Risk:** CRITICAL (R6)
**ODs locked:** OD-515-01=a · OD-515-02=c · OD-515-03=a
**Awaiting:** Owner **Gate 4 GO** before any code change

---

## Scope Lock

**Files WILL change:**
- `src/api/services/pmsService.js` — E-1a + E-1b + E-1c-formula + E-1c-enrich
- `src/api/services/frontDeskService.js` — E-2
- `src/pages/pms/FrontDeskWorkstationPage.jsx` — E-3
- `src/components/pms/frontdesk/GuestTable.jsx` — E-4a + E-4b

**Files will NOT touch:**
- `InHousePanel.jsx` · `ArrivalsPanel.jsx` · `DeparturesPanel.jsx`
- `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5)
- Any other file

**Total: 7 edits across 4 files, ~60 lines changed/added**

---

## Entry Verification (Implementation agent MUST run before writing any code)

```bash
# E-1b anchor
grep -n "getInHouseGuests.*roomGstApplicable = false" /app/frontend/src/api/services/pmsService.js
# Must: line 38  exact: { roomGstApplicable = false } = {}

# E-1c anchor
grep -n "const chargeGst" /app/frontend/src/api/services/pmsService.js
# Must: line 112

# E-2 anchor
grep -n "export const getRowBalances" /app/frontend/src/api/services/frontDeskService.js
# Must: line ~147  exact: { roomGstApplicable = false, totalRound = true }

# E-3 anchor
grep -n "useRowBalances.*roomGstApplicable" /app/frontend/src/pages/pms/FrontDeskWorkstationPage.jsx
# Must: line 102

# E-4b anchor
grep -n "charge\?\.balance_due.*charge\?\.total_with_gst" /app/frontend/src/components/pms/frontdesk/GuestTable.jsx
# Must: line 132  inside case 'amount'
```

If any anchor differs → **STOP. Return to Planning.**

---

## Edit E-1a — `pmsService.js`: Add `computeRoomGst` import

**File:** `src/api/services/pmsService.js`
**Location:** Before `const to2dp` (last declaration before the service functions)

**Current:**
```js
const to2dp = (v) => Number(Number(v ?? 0).toFixed(2));            // CR-358-P2
```

**New:**
```js
import { computeRoomGst } from '../../utils/roomGstCalculator';    // BUG-515
const to2dp = (v) => Number(Number(v ?? 0).toFixed(2));            // CR-358-P2
```

---

## Edit E-1b — `pmsService.js` L38: Add `roomGstSlabs` to `getInHouseGuests` signature

**File:** `src/api/services/pmsService.js`
**Line:** 38

**Current:**
```js
export const getInHouseGuests = async ({ roomGstApplicable = false } = {}) => {
```

**New:**
```js
export const getInHouseGuests = async ({ roomGstApplicable = false, roomGstSlabs = null } = {}) => { // BUG-515
```

---

## Edit E-1c-formula — `pmsService.js` L112-115: Replace `chargeGst` with `effectiveGst`

**File:** `src/api/services/pmsService.js`
**Lines:** 112-115

**Current:**
```js
        const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
        const roomBalance = bp != null
          ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))   // BUG-493 OD-493-01 Option B: bp=0 → GST waived
          : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

**New:**
```js
        const discountRs    = Number(ri.room_discount_amount ?? 0);                                     // BUG-515
        const effectiveRoom = Math.max(0, rp - discountRs);                                             // BUG-515
        const nights        = row.charge?.nights ?? 1;                                                  // BUG-515: available in LR charge snapshot
        const chargeGst     = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
        const effectiveGst  = discountRs > 0 && roomGstApplicable && roomGstSlabs                       // BUG-515
            ? computeRoomGst(roomGstApplicable, roomGstSlabs, effectiveRoom, nights, 1).gstTotal
            : chargeGst;                                                                                  // BUG-515: no discount → rack values still correct; also safe fallback if slabs absent
        const roomBalance = bp != null
          ? (bp === 0 ? 0 : Math.max(0, bp + effectiveGst))   // BUG-515: was chargeGst (rack GST); now effectiveGst
          : Math.max(0, rp + gt - ap - rb - discountRs);       // BUG-515: extracted discountRs
```

---

## Edit E-1c-enrich — `pmsService.js` L157: Add row enrichment after `row.balance`

**File:** `src/api/services/pmsService.js`
**Location:** Immediately after `row.balance = ...` (L157), before closing `});`

**Current:**
```js
        // BUG-426: store sub-totals separately (OD-426-03 — 2 different) + total balance
        row.transferredFnbBalance = Math.round(transferredFnb * 100) / 100;
        row.roomOrdersBalance     = Math.round(roomOrdersTotal * 100) / 100;
        row.balance               = Math.round((roomBalance + transferredFnb + roomOrdersTotal) * 100) / 100;
      });
```

**New:**
```js
        // BUG-426: store sub-totals separately (OD-426-03 — 2 different) + total balance
        row.transferredFnbBalance = Math.round(transferredFnb * 100) / 100;
        row.roomOrdersBalance     = Math.round(roomOrdersTotal * 100) / 100;
        row.balance               = Math.round((roomBalance + transferredFnb + roomOrdersTotal) * 100) / 100;
        // BUG-515: enrich row with post-discount display values for RowExpansionStub (OD-515-02=c)
        if (discountRs > 0) {
          row.roomDiscountAmount  = discountRs;
          row.effectiveGst        = effectiveGst;
          row.effectiveSgst       = Math.round(effectiveGst / 2 * 100) / 100;
          row.effectiveCgst       = Math.round(effectiveGst / 2 * 100) / 100;
          row.effectiveTotal      = Math.round((effectiveRoom + effectiveGst) * 100) / 100;
          row.effectiveBalanceDue = Math.round(roomBalance * 100) / 100; // BUG-515: = bp + effectiveGst
        }
      });
```

**Note on `effectiveBalanceDue`:** `roomBalance` (already computed above) equals `bp + effectiveGst` in the `bp != null` path, which is exactly the effective amount the guest owes for the room (net of all payments). Reusing it avoids duplication.

---

## Edit E-2 — `frontDeskService.js` L147-148: Forward `roomGstSlabs`

**File:** `src/api/services/frontDeskService.js`
**Lines:** 147-148

**Current:**
```js
export const getRowBalances = async ({ roomGstApplicable = false, totalRound = true } = {}) =>
  joinRowBalances(await getInHouseGuests({ roomGstApplicable }), { totalRound });
```

**New:**
```js
export const getRowBalances = async ({ roomGstApplicable = false, roomGstSlabs = null, totalRound = true } = {}) =>  // BUG-515
  joinRowBalances(await getInHouseGuests({ roomGstApplicable, roomGstSlabs }), { totalRound });  // BUG-515
```

---

## Edit E-3 — `FrontDeskWorkstationPage.jsx` L102: Pass `roomGstSlabs` to `useRowBalances`

**File:** `src/pages/pms/FrontDeskWorkstationPage.jsx`
**Line:** 102

**Current:**
```js
  const balances = useRowBalances(snap?.loadedAt, inHouseCount, { roomGstApplicable: Boolean(restaurant?.checkInFlags?.roomGstApplicable), totalRound: restaurant?.totalRound !== false }); // CR-385 M5 BUG-433
```

**New:**
```js
  const balances = useRowBalances(snap?.loadedAt, inHouseCount, { roomGstApplicable: Boolean(restaurant?.checkInFlags?.roomGstApplicable), roomGstSlabs: restaurant?.checkInFlags?.roomGstSlabs ?? null, totalRound: restaurant?.totalRound !== false }); // CR-385 M5 BUG-433 BUG-515
```

---

## Edit E-4a — `GuestTable.jsx` L156-178: Rewrite `RowExpansionStub` (OD-515-02=c)

**File:** `src/components/pms/frontdesk/GuestTable.jsx`
**Lines:** 156-178 (full RowExpansionStub replacement)

**Current:**
```jsx
export const RowExpansionStub = ({ row, onClose, actions }) => (
  <div className="px-5 py-4" data-testid={`fd-row-${row.id}-detail`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
        <div className="text-[12px] text-[#767676] mt-1">
          {channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'}{row.roomType ? ` (${row.roomType})` : ''}
          {row.phone ? ` · ${maskPhone(row.phone)}` : ''}{row.email ? ` · ${row.email}` : ''}
        </div>
        {row.specialRequests && <div className="text-[12px] mt-1"><span className="text-[#767676]">Special requests:</span> {row.specialRequests}</div>}
        <div className="grid grid-cols-4 gap-x-6 gap-y-1 mt-3 text-[12px]">
          <span className="text-[#767676]">Booking (incl. GST)</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-total`}>{fmtINR(row.charge?.total_with_gst)}</span>
          <span className="text-[#767676]">Paid so far</span><span className="tabular-nums" data-testid={`fd-row-${row.id}-paid`}>{fmtINR(row.charge?.advance_payment)}</span>
          <span className="text-[#767676]">SGST</span><span className="tabular-nums">{fmtINR(row.charge?.sgst)}</span>
          <span className="text-[#767676]">CGST</span><span className="tabular-nums">{fmtINR(row.charge?.cgst)}</span>
          <span className="text-[#767676]">Balance due</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-due`}>{fmtINR(row.charge?.balance_due)}</span>
        </div>
      </div>
      <button type="button" data-testid={`fd-row-${row.id}-close`} onClick={(e) => { e.stopPropagation(); onClose(); }} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
    </div>
    <div className="mt-3 flex justify-end">{actions}</div>
  </div>
);
```

**New:**
```jsx
// BUG-515: OD-515-02=c — two clearly labelled sections when check-in discount applied
export const RowExpansionStub = ({ row, onClose, actions }) => {
  const hasDiscount = (row.roomDiscountAmount ?? 0) > 0;
  return (
    <div className="px-5 py-4" data-testid={`fd-row-${row.id}-detail`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
          <div className="text-[12px] text-[#767676] mt-1">
            {channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'}{row.roomType ? ` (${row.roomType})` : ''}
            {row.phone ? ` · ${maskPhone(row.phone)}` : ''}{row.email ? ` · ${row.email}` : ''}
          </div>
          {row.specialRequests && <div className="text-[12px] mt-1"><span className="text-[#767676]">Special requests:</span> {row.specialRequests}</div>}
          {/* Section 1 — Booking rate (always shown) */}
          <div className={`mt-3 text-[12px]${hasDiscount ? ' pb-2 border-b border-[#E5E5E5]' : ''}`}>
            {hasDiscount && <div className="text-[10px] font-semibold uppercase tracking-wide text-[#767676] mb-1.5">Booking rate</div>}
            <div className="grid grid-cols-4 gap-x-6 gap-y-1">
              <span className="text-[#767676]">Booking (incl. GST)</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-total`}>{fmtINR(row.charge?.total_with_gst)}</span>
              <span className="text-[#767676]">Paid so far</span><span className="tabular-nums" data-testid={`fd-row-${row.id}-paid`}>{fmtINR(row.charge?.advance_payment)}</span>
              <span className="text-[#767676]">SGST</span><span className="tabular-nums">{fmtINR(row.charge?.sgst)}</span>
              <span className="text-[#767676]">CGST</span><span className="tabular-nums">{fmtINR(row.charge?.cgst)}</span>
              {!hasDiscount && <><span className="text-[#767676]">Balance due</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-due`}>{fmtINR(row.charge?.balance_due)}</span></>}
            </div>
          </div>
          {/* Section 2 — After check-in discount (only when discount > 0, OD-515-02=c) */}
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

## Edit E-4b — `GuestTable.jsx` L132: Update sort key (OD-515-03=a)

**File:** `src/components/pms/frontdesk/GuestTable.jsx`
**Line:** 132

**Current:**
```js
      case 'amount': return Number(r.charge?.balance_due ?? r.charge?.total_with_gst ?? 0);
```

**New:**
```js
      case 'amount': return (r.roomDiscountAmount ?? 0) > 0  // BUG-515 OD-515-03=a: sort by effective balance when discount
          ? Number(r.effectiveBalanceDue ?? r.charge?.balance_due ?? 0)
          : Number(r.charge?.balance_due ?? r.charge?.total_with_gst ?? 0);
```

---

## Execution Sequence

```
1. Entry verification (5 grep checks — see top)
2. E-1a: pmsService.js import
3. E-1b: pmsService.js signature
4. Compile check after E-1a+E-1b
5. E-1c-formula: pmsService.js formula replacement
6. E-1c-enrich: pmsService.js row enrichment block
7. Compile check after E-1c
8. E-2: frontDeskService.js getRowBalances
9. E-3: FrontDeskWorkstationPage.jsx useRowBalances
10. E-4a: GuestTable.jsx RowExpansionStub rewrite
11. E-4b: GuestTable.jsx sort key
12. Final compile check — MUST be 0 new warnings
13. EXIT GATE 5-checkbox pass
14. Write QA handover
```

---

## Verification Matrix (Step 4)

| # | Edit | Verification | Steps | Auto? |
|---|---|---|---|---|
| V-1 | E-1a import | `grep -n "computeRoomGst" pmsService.js` → L before to2dp | YES (grep) |
| V-2 | E-1b signature | `grep -n "roomGstSlabs = null.*getInHouseGuests" pmsService.js` | YES |
| V-3 | E-1c-formula | `grep -n "effectiveGst\|discountRs\|effectiveRoom" pmsService.js` | YES |
| V-4 | E-1c-enrich | `grep -n "row.roomDiscountAmount\|row.effectiveTotal\|row.effectiveBalanceDue" pmsService.js` | YES |
| V-5 | E-2 | `grep -n "roomGstSlabs" frontDeskService.js` → hits L147-148 | YES |
| V-6 | E-3 | `grep -n "roomGstSlabs.*checkInFlags" FrontDeskWorkstationPage.jsx` | YES |
| V-7 | E-4a | `grep -n "hasDiscount\|effectiveTotal\|Booking rate\|After check-in" GuestTable.jsx` | YES |
| V-8 | E-4b | `grep -n "effectiveBalanceDue.*charge.*balance_due" GuestTable.jsx` | YES |
| V-9 | compile | `tail -5 /var/log/supervisor/frontend.out.log` → "Compiled" / 0 new warnings | YES |
| V-10 | bonk row balance | Browser: In-House tab → bonk row balance = ₹600 (was ₹650) | NO (browser) |
| V-11 | bonk no-discount section | Browser: expand bonk → "Booking rate" section: ₹3,150 / ₹75 / ₹75 | NO (browser) |
| V-12 | bonk discount section | Browser: "After check-in discount (−₹1,000)" → ₹2,100 / ₹50 / ₹50 / Balance ₹600 | NO (browser) |
| V-13 | no-discount row (no section 2) | Browser: expand a booking with no discount → no "Booking rate" label, no Section 2 | NO (browser) |
| V-14 | sort correctness | Click Balance column sort → discounted rows ranked by ₹600 not ₹1,650 | NO (browser) |

---

## Post-Code Registry Checklist (Step 5)

```
- [ ] registry.json: BUG-515 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-515 row updated to GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: 4 files listed — BUG-515, 2026-10-08
- [ ] Code markers: // BUG-515 on every modified line/block (E-1a through E-4b)
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

## Risk Register

| Risk | Probability | Mitigation |
|---|---|---|
| `roomGstSlabs` null → `effectiveGst = chargeGst` (rack fallback) | LOW — handled by guard `discountRs > 0 && roomGstApplicable && roomGstSlabs` | V-3 covers this path |
| Slab-crossing discount (e.g., ₹8k room discounted to ₹6k) gives wrong GST | NONE — `computeRoomGst` handles slab selection correctly | See roomGstCalculator.js spec |
| `effectiveBalanceDue` = `roomBalance` only (excludes F&B) | By design — expanded row shows room charges; F&B in separate balance column | V-12 validates ₹600 correct for bonk |
| RowExpansionStub conversion from `() => (...)` to `() => { return ... }` | LOW — valid JS/JSX transformation | V-9 compile check |
| E-4a testid collision: `fd-row-${row.id}-due` appears in both sections | NONE — `!hasDiscount` guard means it only renders once: in Section 1 (no discount) or Section 2 (with discount) | Code logic: `{!hasDiscount && <Balance due...>}` in S1; Section 2 only when `hasDiscount` |
| E-3 long line causing lint warning | LOW — single-line opts is established pattern (same as current) | Compile check |

---

## QA Handover Seed

| TC | Scenario | Expected |
|---|---|---|
| TC-515-1 | bonk booking expanded (discount ₹1,000) | Row balance=₹600; Section 1 header "Booking rate"; Section 2 "After check-in discount (−₹1,000)": total=₹2,100, SGST=₹50, CGST=₹50, Balance=₹600 |
| TC-515-2 | Any booking with NO discount expanded | Single section (no labels), same layout as before, Balance due=`charge.balance_due` |
| TC-515-3 | Balance column sort (discount row) | Sorted by ₹600 not ₹1,650 |
| TC-515-4 | roomGstApplicable=false (GST disabled property) | effectiveGst = chargeGst (0), no GST lines shown, balance = bp = roomBalance |
