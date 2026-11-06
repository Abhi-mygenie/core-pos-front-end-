# BUG-494 — Implementation Plan (Gate 3)

**ID:** BUG-494
**Date:** 2026-10-06
**Author:** Planning agent
**Risk:** CRITICAL
**Files WILL change:**
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` only
**Files WILL NOT touch:** CollectPaymentPanel.jsx (R5), orderTransform.js (R5), frontDeskService.js, pmsService.js, CheckInPage.jsx, CheckInForm.jsx

---

## Scope Lock — 1 file, 8 edit sites

**Execution order dependency:** Run BUG-495 edits on FolioCheckoutPanel (E-495-3, E-495-4) BEFORE BUG-494 to avoid touching the same regions twice.

---

## E-494-1 — Add `computeRoomGst` import (after L15)

**Current (L15):**
```javascript
import { getFolio, payBill, roomInfoFromCharge, splitUpgradeLine } from '@/api/services/frontDeskService';
```
**After:**
```javascript
import { getFolio, payBill, roomInfoFromCharge, splitUpgradeLine } from '@/api/services/frontDeskService';
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-494: GST on discounted price
```

---

## E-494-2 — RoomSection signature: add 3 new props (L39)

**Current:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C
```
**After:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C · BUG-494
```
Defaults of `null` → fallback to `c.sgst/cgst/balance_due` in lines below.

---

## E-494-3 — RoomSection: SGST / CGST / Room balance display (L161-165)

**Current:**
```javascript
          <Line label="SGST" value={fmtINR(c.sgst)} testId="bill-room-sgst" /> {/* BUG-418: two lines, never merged */}
          <Line label="CGST" value={fmtINR(c.cgst)} testId="bill-room-cgst" />
          <Line label="Already paid" value={fmtINR(c.advance_payment)} testId="bill-room-paid" muted />
          {/* BUG-491 Sub-B: balance line uses live roomDiscountRs */}
          <Line label="Room balance" value={fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))} testId="bill-room-balance" bold />
```
**After:**
```javascript
          <Line label="SGST" value={fmtINR(displaySgst ?? c.sgst)} testId="bill-room-sgst" /> {/* BUG-494 Sub-B: GST on discounted price */}
          <Line label="CGST" value={fmtINR(displayCgst ?? c.cgst)} testId="bill-room-cgst" /> {/* BUG-494 Sub-B */}
          <Line label="Already paid" value={fmtINR(c.advance_payment)} testId="bill-room-paid" muted />
          {/* BUG-491 Sub-B + BUG-494 Sub-A: balance uses folio baseBalance (fallback: c.balance_due) */}
          <Line label="Room balance" value={fmtINR(Math.max(0, (baseBalance ?? Number(c.balance_due || 0)) - roomDiscountRs))} testId="bill-room-balance" bold />
```
`??` null-coalescing: when `baseBalance = null` (folio not loaded), falls back to `c.balance_due`.

---

## E-494-4 — Statement signature: add 3 new props (L172)

**Current:**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs }) => {
```
**After:**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst }) => {
```

---

## E-494-5 — Statement: pass 3 new props to RoomSection (L180-187)

**Current:**
```javascript
      <RoomSection row={row} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
        roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
        roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
      />
```
**After:**
```javascript
      <RoomSection row={row} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
        roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
        roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
      />
```

---

## E-494-6 — Parent: add `baseBalance / displaySgst / displayCgst` useMemo (after L244)

**Placement:** After `const order = state.data?.order;` (L244), before `const printBill = ...`.

**Insert:**
```javascript
  // BUG-494: folio-based balance + GST on discounted price
  // OD-INV492B-01 Option B: balancePayment=0 → ₹0 (advance covers GST)
  // OD-494-01 Option B: displaySgst/Cgst=0 when baseBalance=0 (mathematical consistency)
  const { baseBalance, displaySgst, displayCgst } = useMemo(() => {
    const bp          = order?.roomInfo?.balancePayment ?? null;
    const discountAmt = Number(order?.roomInfo?.discountAmount || 0);
    const bc          = Number(row.charge?.booking_charge || 0);
    const nights      = Number(row.charge?.nights || 1);
    const { roomGstApplicable = false, roomGstSlabs = null } = restaurant?.checkInFlags || {};
    if (bp === null) return { baseBalance: null, displaySgst: null, displayCgst: null };
    const discountedPrice = Math.max(0, bc - discountAmt);
    const gst = (roomGstApplicable && discountedPrice > 0)
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
      : { gstTotal: 0, sgst: 0, cgst: 0 };
    const base = bp === 0 ? 0 : Math.max(0, bp + gst.gstTotal);
    return {
      baseBalance: base,
      displaySgst: base === 0 ? 0 : gst.sgst,
      displayCgst: base === 0 ? 0 : gst.cgst,
    };
  }, [order?.roomInfo?.balancePayment, order?.roomInfo?.discountAmount,
      row.charge?.booking_charge, row.charge?.nights, restaurant?.checkInFlags]);
```

**Why after `order`:** useMemo references `order?.roomInfo` — `order` is a const derived from `state.data` (L244). React rules allow this; hooks are always called unconditionally.

---

## E-494-7 — Parent: pass 3 props to Statement in JSX (L313-320)

**Current:**
```javascript
            <Statement row={row} folio={state.data.folio}
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
              roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
              roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
              roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
              roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
            />
```
**After:**
```javascript
            <Statement row={row} folio={state.data.folio}
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
              roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
              roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
              roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
              roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
              baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
            />
```

---

## E-494-8 — Parent: roomInfo override — use `baseBalance` (L341-344)

**Current (BUG-492 Sub-A):**
```javascript
              roomInfo={roomInfoFromCharge(order.roomInfo, { // BUG-492 Sub-A: reflect discount in Checkout total
                ...row.charge,
                balance_due: Math.max(0, Number(row.charge?.balance_due || 0) - roomDiscountInfoRs)
              })}
```
**After:**
```javascript
              roomInfo={roomInfoFromCharge(order.roomInfo, { // BUG-494 Sub-C: folio-based balance
                ...row.charge,
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs)
              })}
```
`baseBalance ?? charge.balance_due` — safe fallback to LR value while folio is loading (bp=null).

---

## Verification Matrix

| Edit | File | Change | Verify |
|------|------|--------|--------|
| E-494-1 | L15 | computeRoomGst import | grep `computeRoomGst` → 2 hits (import + useMemo) |
| E-494-2 | L39 | RoomSection +3 props | grep `baseBalance = null` in RoomSection signature |
| E-494-3 | L161-165 | SGST/CGST/balance display | Order #000325: SGST=₹0, CGST=₹0, Room balance=₹0 |
| E-494-4 | L172 | Statement +3 props signature | grep `baseBalance, displaySgst, displayCgst` in Statement |
| E-494-5 | L180-187 | Statement→RoomSection prop pass | RoomSection call has `baseBalance={baseBalance}` |
| E-494-6 | after L244 | baseBalance useMemo | grep `BUG-494: folio-based balance` |
| E-494-7 | L313-320 | Statement call +3 props | JSX has `baseBalance={baseBalance}` |
| E-494-8 | L341-344 | roomInfo override base | Checkout button ₹0 for order #000325 |
| V-494-A | Browser | No discount order | SGST/CGST same as before (displaySgst ?? c.sgst fallback) |
| V-494-B | Browser | Partial discount (bp>0) | SGST/CGST computed on discounted price, not full price |
| V-494-R1 | Browser | BUG-492 Sub-B maxPct alert | Still fires at correct threshold (unaffected) |
| V-494-R2 | Browser | BUG-490 Amount cap | onChange clamp unchanged — no regression |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-494 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-494 row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-494 2026-10-06
- [ ] Code markers: // BUG-494 in each modified block
- [ ] Compile: 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `order.roomInfo` null after getFolio | `balancePayment ?? null` → returns `null` → E-494-3/8 null-coalescing fallback to `c.balance_due` |
| `row.charge?.nights` absent | `|| 1` default — 1 night is safe fallback |
| `restaurant?.checkInFlags` absent | `|| {}` destructure default — gstApplicable=false → gst={gstTotal:0} |
| Statement/RoomSection props threading | 3 new optional props with defaults — backward-compatible |
| Hooks order — useMemo after `const order` | React hooks permit deriving from non-hook consts; order is maintained every render |

---

## Execution Sequence

**CRITICAL: Run BUG-495 on FolioCheckoutPanel (E-495-3, E-495-4) FIRST, then BUG-494 (E-494-1 through E-494-8).**

Within BUG-494:
1. E-494-1 (import, L15 area)
2. E-494-2 + E-494-3 (RoomSection, L39 + L161-165)
3. E-494-4 + E-494-5 (Statement, L172 + L180-187)
4. E-494-6 (parent useMemo, after L244)
5. E-494-7 + E-494-8 (parent JSX, L313-344)
6. Compile check

Gate 4 GO → IMPLEMENTATION.
