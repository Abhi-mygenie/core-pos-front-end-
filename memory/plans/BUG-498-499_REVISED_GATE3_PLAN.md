# BUG-498 + BUG-499 — Revised Gate 2 + Gate 3 (PLANNING Agent)

**Date:** 2026-10-06
**Author:** PLANNING Agent (v2 — revised per owner direction 2026-10-06)
**Role:** PLANNING (Gate 2 Impact Analysis + Gate 3 Implementation Plan)
**Risk:** CRITICAL (financial — wrong discount amounts sent to backend)
**Files WILL change:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` ONLY
**Files WILL NOT touch:** `CollectPaymentPanel.jsx` (R5) · `CheckInForm.jsx` · `CheckInPage.jsx` · `orderTransform.js` (R5) · any test files
**Supersedes:** `plans/BUG-498-499_PROPER_PLAN.md` (over-engineered UX restructure — discarded per owner direction)

---

## Code Reality Check

```
grep -n "BUG-498\|BUG-499" /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
→ 0 hits (file reverted to pre-BUG-498 state)
```

**Code Reality: NONE** — proceed with full plan.

---

## Conflict Pre-Check

| Open item | Touches FolioCheckoutPanel? | Lines | Safe? |
|-----------|----------------------------|-------|-------|
| BUG-494 (GATE_5A) | YES — L16, L40, L165-169, L257-275 | `baseBalance` useMemo at L257-275 is source of truth — READ ONLY in this plan | ✅ |
| BUG-495 (GATE_5A) | YES — L54-62 (maxPct), L232-242 (discountOverMax) | Both are REPLACED by BUG-498 edits | ✅ intentional |
| BUG-492 (GATE_5A) | YES — L232-242 (discountOverMax guard) | Also REPLACED; BUG-498 formula is correct successor | ✅ intentional |
| BUG-491 (GATE_5A) | YES — L222-230 (roomDiscountInfoRs) | Also REPLACED — BUG-498 E4 removes old, E5 adds corrected | ✅ intentional |
| BUG-496 (GATE_3) | CheckInForm + CheckInPage only | Does NOT touch FolioCheckoutPanel | ✅ no conflict |
| BUG-497 (GATE_3) | CheckInForm L225 only | Does NOT touch FolioCheckoutPanel | ✅ no conflict |

---

## GATE 2 — IMPACT ANALYSIS

### Owner Direction (2026-10-06)

> "bug 498 is not that big just additive how we control the recent order discount — we just add few properties for the room no need whole ux change — the left panel will show all info as shows today only the operation shifts"

**Scope:** Formula fixes + data wiring only. Left panel UI stays exactly as-is. No restructure. No component moves.

### Root Causes

| # | Bug | Root cause | Current code | Correct |
|---|-----|-----------|-------------|---------|
| P1 | Check-in discount line missing | No JSX `<Line>` for `order.roomInfo.discountAmount` | — | Add read-only line after "Booking amount" |
| P2 | `roomDiscountRs` wrong base in RoomSection | Uses `c.booking_charge` (stale LR) + caps at `c.balance_due` (stale LR) | L45-53 | Use `baseBalance` prop (folio bp already passed in) |
| P3 | `maxPct` wrong formula in RoomSection | BUG-495 GST-aware formula — measures remaining balance, not advance | L54-62 | `floor(min(baseBalance, bc) / bc × 100)` per OD-498-01/02 |
| P4 | Amount input `max` + clamp uses stale `c.balance_due` | L104, L107 | Use `baseBalance ?? c.balance_due` |
| P5 | `handlePaid` sends `room_discount = 0` for bp=0 rooms | `balanceDue=order.roomInfo?.balancePayment=0` → `Math.min(X, 0)=0` | L296-300 | Use `baseBalance` as cap (folio balance already in scope at L275) |
| P6 | `room_gst_tax` = 0 (folio `gst_tax=null`) | `order.roomInfo?.gstTax ?? 0` is always 0 | L291-292 | Use `displaySgst + displayCgst` (from BUG-494 useMemo, in scope) |
| P7 | `roomDiscountInfoRs` (parent) uses stale LR | Same wrong base as P2 | L222-230 | Rewrite using `baseBalance` — BUT must be AFTER L275 |
| P8 | `discountOverMax` (parent) uses BUG-495 formula | Same wrong formula as P3 | L232-242 | Rewrite using `baseBalance` — BUT must be AFTER L275 |
| P9 | Both: full % sent as `room_discount`; F&B not deducted | L294-305 | 50/50 split: room half to `room_discount`, food half deducted from `payment_amount` |
| P10 | `CollectPaymentPanel total` doesn't reflect food discount | L363 | Deduct `foodDiscountRs` for Both/F&B-only |

### ⚠️ CRITICAL ORDERING CONSTRAINT

`baseBalance` is declared at **L257** via `const { baseBalance, ... } = useMemo(...)`.

- `roomDiscountInfoRs` (L222) and `discountOverMax` (L232) are BEFORE L257.
- If these useMemos reference `baseBalance`, JS throws `ReferenceError: can't access lexical declaration 'baseBalance' before initialization` — **this was the exact crash in the failed implementation**.

**Plan solution:** Remove the old `roomDiscountInfoRs` + `discountOverMax` useMemos at L222–242, and add the corrected versions AFTER L275 (after `baseBalance` is declared).

### Data Flow (current → after fix)

```
CURRENT (broken):
  User enters 50% discount on order #000326 (bp=0, room=₹6,700, checkin-discount=₹5,325)
  RoomSection.roomDiscountRs = floor(6700 × 50%) = ₹3,350  ← wrong base (full room)
  handlePaid: room_discount = Math.min(floor(6700×50%), balanceDue=0) = ₹0  ← silent ₹0 sent

AFTER FIX (OD-498-01):
  User enters 50% discount
  RoomSection.roomDiscountRs = floor(0 × 50%) = ₹0 (baseBalance=0, maxPct=0, no input allowed)
  handlePaid: room_discount = 0 (correct — no discount on fully-paid room)
  Display: "Check-in discount (80%) −₹5,325" shown as read-only line ✓

  Different example — room ₹1,500, advance ₹300, check-in-advance ₹600 → bp=₹600:
  maxPct = floor(600/1500 × 100) = 40%
  User enters 20% → roomDiscountRs = floor(600 × 20%) = ₹120
  handlePaid: room_discount = ₹120  ← correct
```

---

## GATE 3 — IMPLEMENTATION PLAN

### Execution Order (MANDATORY — must follow exactly)

```
E-498-1  → RoomSection props (add checkInDiscountAmt)
E-498-2  → RoomSection roomDiscountRs useMemo
E-498-3  → RoomSection maxPct useMemo
E-498-4  → RoomSection check-in discount display line
E-498-5  → RoomSection input max + onChange
E-498-6  → RoomSection over-max alert text
E-498-7  → Statement props (add checkInDiscountAmt + foodDiscountRs)
E-498-8  → Statement: pass checkInDiscountAmt to RoomSection + F&B preview
E-498-9  → Parent: DELETE old roomDiscountInfoRs useMemo (L222-230)
E-498-10 → Parent: DELETE old discountOverMax useMemo (L232-242)
E-498-11 → Parent: ADD corrected useMemos AFTER L275 (baseBalance already declared)
E-498-12 → Parent: fix handlePaid room_gst_tax (L291-292)
E-498-13 → Parent: fix handlePaid room_discount block + Both split (L294-305)
E-498-14 → Parent: update handlePaid deps (L323)
E-498-15 → Parent JSX: pass checkInDiscountAmt + foodDiscountRs to Statement (L343-351)
E-499-1  → Parent JSX: fix CollectPaymentPanel total prop (L363)
E-499-2  → Parent JSX: fix roomInfo balance_due override (L374)
```

---

### E-498-1 — RoomSection: add `checkInDiscountAmt` prop (L40)

**Current:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C · BUG-494
```

**After:**
```javascript
const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C · BUG-494 · BUG-498
```

**Note:** `checkInDiscountAmt` is a number (₹). Default 0. Safe to add — no breaking change.

---

### E-498-2 — RoomSection: fix `roomDiscountRs` useMemo (L45-53)

**Current:**
```javascript
  // BUG-491 Sub-C: compute discount ₹ for badge + balance display
  // OD-INV-PCT-01 Option B: base = booking_charge (room rate), capped at balance_due
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food') return 0;
    const balanceDue    = Number(c.balance_due    || 0);
    const bookingCharge = Number(c.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(bookingCharge * roomDiscount / 100), balanceDue);
    }
    return Math.min(Math.floor(Number(roomDiscount)), balanceDue);
  }, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due, c.booking_charge]);
```

**After:**
```javascript
  // BUG-498: roomDiscountRs — base = folio baseBalance (OD-498-01); fixes stale LR base
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
```

**Note:** `baseBalance` is a PROP here (not a const) — no temporal dead zone. Safe.

---

### E-498-3 — RoomSection: fix `maxPct` useMemo (L54-62)

**Current:**
```javascript
  // BUG-495: maxPct = floor((bc − adv×(1+gstRate)) / bc × 100) — reserves GST implied in advance
  const maxPct = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return 100;
    const gstRate      = (Number(c.sgst||0) + Number(c.cgst||0)) / bc;
    const gstOnAdvance = advance * gstRate;
    return Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
  }, [c.booking_charge, c.advance_payment, c.sgst, c.cgst]);
```

**After:**
```javascript
  // BUG-498: maxPct = floor(min(baseBalance, bc) / bc × 100) per OD-498-01/02
  const maxPct = useMemo(() => {
    if (baseBalance === null) return 0;
    const bc = Number(c.booking_charge || 0);
    if (!bc || baseBalance <= 0) return 0;
    return Math.floor(Math.min(baseBalance, bc) / bc * 100);
  }, [baseBalance, c.booking_charge]);
```

---

### E-498-4 — RoomSection: add check-in discount display line (after L72)

**Current (L72-73):**
```jsx
          <Line label="Booking amount" value={fmtINR(c.booking_charge)} testId="bill-room-booking" />
          {Number(c.upgrade_amount) > 0 && <Line label={upgrade?.reason ? `Room upgrade: ${upgrade.reason}` : 'Room upgrade'} value={fmtINR(c.upgrade_amount)} testId="bill-room-upgrade" />}
```

**After:**
```jsx
          <Line label="Booking amount" value={fmtINR(c.booking_charge)} testId="bill-room-booking" />
          {checkInDiscountAmt > 0 && (
            <Line label="Check-in discount" value={`−${fmtINR(checkInDiscountAmt)}`} testId="bill-room-checkin-discount" muted />
          )}{/* BUG-498: check-in discount read-only line */}
          {Number(c.upgrade_amount) > 0 && <Line label={upgrade?.reason ? `Room upgrade: ${upgrade.reason}` : 'Room upgrade'} value={fmtINR(c.upgrade_amount)} testId="bill-room-upgrade" />}
```

---

### E-498-5 — RoomSection: fix input `max` + `onChange` clamp (L104, L107)

**Current (L102-110):**
```jsx
                {/* BUG-490: Amount input — max capped at balance_due; onChange clamped at balance_due */}
                <input
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
                  placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                  value={roomDiscount || ''}
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), c.balance_due != null ? Number(c.balance_due) : Infinity))}
                  className="w-20 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-input"
                />
```

**After:**
```jsx
                {/* BUG-498: max + onChange clamp use baseBalance (folio bp) not stale LR balance_due */}
                <input
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0)) || undefined}
                  placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                  value={roomDiscount || ''}
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0))))}
                  className="w-20 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-input"
                />
```

---

### E-498-6 — RoomSection: fix over-max alert ₹ display (L122)

**Current:**
```jsx
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
```

**After:**
```jsx
                  Maximum discount: {maxPct}% (₹{Math.floor((baseBalance ?? 0) * maxPct / 100)}). Entering above {maxPct}% has no additional effect.{/* BUG-498 */}
```

---

### E-498-7 — Statement: add `checkInDiscountAmt` + `foodDiscountRs` props (L176)

**Current:**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst }) => {
```

**After:**
```javascript
const Statement = ({ row, folio, checkInDiscountAmt = 0, foodDiscountRs = 0, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst }) => { // BUG-498 +checkInDiscountAmt; BUG-499 +foodDiscountRs
```

---

### E-498-8 — Statement: pass `checkInDiscountAmt` to RoomSection + add F&B preview (L184-199)

**Current (L184-192):**
```jsx
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

**After:**
```jsx
      <RoomSection row={row} checkInDiscountAmt={checkInDiscountAmt} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
        roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
        roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
      />{/* BUG-498: checkInDiscountAmt passed */}
```

Note: F&B preview lines (BUG-499 OD-499-02) are added after Room orders/Transferred sections — see below in the Statement JSX. This is purely additive (no existing lines removed):

After `folio.associatedOrders.map(...)` block (L197-198), add:
```jsx
      {/* BUG-499: F&B discount preview when Both/food selected */}
      {foodDiscountRs > 0 && (
        <div className="text-[11px] text-[#329937] mt-1" data-testid="bill-fnb-discount-preview">
          {roomApplyTo === 'both' ? 'F&B (50% split)' : 'F&B'} discount: −{fmtINR(foodDiscountRs)}
        </div>
      )}
```

---

### E-498-9 — Parent: DELETE old `roomDiscountInfoRs` useMemo (L220-230)

**Current (L220-230):**
```javascript
  // BUG-491 Sub-D: compute room discount ₹ for info note in right panel (OD-491-D-01 Option B)
  // OD-INV-PCT-01 Option B: base = booking_charge (room rate), capped at balance_due
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food') return 0;
    const bd = Number(row.charge?.balance_due    || 0);
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bd && !bc) return 0;
    return roomDiscountType === 'Percent'
      ? Math.min(Math.floor(bc * roomDiscount / 100), bd)
      : Math.min(Math.floor(Number(roomDiscount)), bd);
  }, [roomDiscount, roomDiscountType, roomApplyTo, row.charge?.balance_due, row.charge?.booking_charge]);
```

**After:** *(delete entirely — replaced by corrected version AFTER baseBalance in E-498-11)*
```javascript
```

---

### E-498-10 — Parent: DELETE old `discountOverMax` useMemo (L231-242)

**Current (L231-242):**
```javascript
  // BUG-492 Sub-B + BUG-495: discountOverMax uses same GST-aware maxPct formula as RoomSection
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    const bc      = Number(row.charge?.booking_charge  || 0);
    const advance = Number(row.charge?.advance_payment || 0);
    if (!bc) return false;
    const gstRate      = (Number(row.charge?.sgst||0) + Number(row.charge?.cgst||0)) / bc;
    const gstOnAdvance = advance * gstRate;
    const maxPctParent = Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, row.charge?.booking_charge, row.charge?.advance_payment,
      row.charge?.sgst, row.charge?.cgst]);
```

**After:** *(delete entirely — replaced AFTER baseBalance in E-498-11)*
```javascript
```

---

### E-498-11 — Parent: ADD corrected useMemos AFTER `baseBalance` declaration (after L275)

⚠️ **MUST be placed AFTER the `baseBalance` const at L257-275 — this is the fix for the crash.**

**Current (L276, immediately after baseBalance useMemo):**
```javascript
  const printBill = useCallback(async () => {
```

**After:**
```javascript
  // BUG-498: roomDiscountInfoRs — MOVED here (after baseBalance) to avoid temporal dead zone
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
  // BUG-498: discountOverMax — MOVED here (after baseBalance); replaces BUG-495/492 formula
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    if (baseBalance === null) return false;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || baseBalance <= 0) return false;
    const maxPctParent = Math.floor(Math.min(baseBalance, bc) / bc * 100);
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, baseBalance, row.charge?.booking_charge]);
  // BUG-499: foodDiscountRs — F&B half for Both/food apply_to (OD-499-01, handover_5 §4.4)
  const foodDiscountRs = useMemo(() => {
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.floor(fnbTotal * roomDiscount / 100)
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': 50/50 split per OD-499-01
    return roomDiscountType === 'Percent'
      ? Math.floor(fnbTotal * (roomDiscount / 2) / 100)
      : Math.floor(Number(roomDiscount) / 2);
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);

  const printBill = useCallback(async () => {
```

---

### E-498-12 — handlePaid: fix `room_gst_tax` (L291-292)

**Current:**
```javascript
      const roomGstTax = order.roomInfo?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-386 (server value passthrough)
```

**After:**
```javascript
      // BUG-498: room_gst_tax = displaySgst+displayCgst (folio GST on discounted price, BUG-494 computed)
      const roomGstTax = (displaySgst !== null && displayCgst !== null)
        ? Number(displaySgst) + Number(displayCgst)
        : (order.roomInfo?.gstTax ?? 0);
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-498
```

---

### E-498-13 — handlePaid: fix room_discount block + BUG-499 Both split (L294-306)

**Current (L293-306):**
```javascript
      // CR-405-A + CR-407-B: room discount at checkout — apply_to + Percent type expansion
      if (roomDiscount > 0 && roomApplyTo !== 'food') {
        // OD-407-01 + OD-INV-PCT-01 Option B: base = booking_charge (room rate), capped at balance_due
        const balanceDue    = order.roomInfo?.balancePayment ?? 0;
        const bookingCharge = order.roomInfo?.roomPrice      ?? 0;
        const roomDiscountRs = roomDiscountType === 'Percent'
          ? Math.min(Math.floor(bookingCharge * roomDiscount / 100), balanceDue)
          : roomDiscount; // Amount already capped at balance_due by BUG-490 onChange
        payload.room_discount          = roomDiscountRs;
        payload.room_discount_apply_to = roomApplyTo;           // 'room' | 'both'
        payload.room_discount_type     = roomDiscountType;       // 'Amount' | 'Percent'
        payload.room_discount_value    = roomDiscount;           // raw input for audit
        payload.room_discount_reason   = roomDiscountReason || null;
      }
```

**After:**
```javascript
      // BUG-498 + BUG-499: room + food discount — correct base (OD-498-01) + Both split (OD-499-01)
      if (roomDiscount > 0 && roomApplyTo !== 'food' && baseBalance !== null) {
        // BUG-498: room half = baseBalance-based; for Both = floor(baseBalance × pct/2/100)
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.floor(baseBalance * (roomDiscount / 2) / 100)
              : Math.floor(Number(roomDiscount) / 2))
          : roomDiscountInfoRs; // 'room' only — full roomDiscountInfoRs (already correct base)
        payload.room_discount          = roomHalfRs;
        payload.room_discount_apply_to = roomApplyTo;
        payload.room_discount_type     = roomDiscountType;
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
      // BUG-499: food half — deduct from F&B payment_amount for Both + F&B-only (OD-499-01)
      if (foodDiscountRs > 0) {
        payload.payment_amount = Math.max(0, (payload.payment_amount || 0) - foodDiscountRs);
        payload.grant_amount   = payload.payment_amount;
        payload.order_amount   = payload.payment_amount;
        payload.order_discount      = foodDiscountRs;
        payload.order_discount_type = roomDiscountType;
      }
```

---

### E-498-14 — handlePaid: update deps array (L323)

**Current:**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs]);
```

**After:**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs, baseBalance, displaySgst, displayCgst, foodDiscountRs, roomDiscountInfoRs, discountOverMax]); // BUG-498 + BUG-499
```

---

### E-498-15 — Parent JSX: pass `checkInDiscountAmt` + `foodDiscountRs` to Statement (L343-351)

**Current (L343-351):**
```jsx
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

**After:**
```jsx
            <Statement row={row} folio={state.data.folio}
              checkInDiscountAmt={Number(order?.roomInfo?.discountAmount || 0)}
              foodDiscountRs={foodDiscountRs}
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
              roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
              roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
              roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
              roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
              baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
            />{/* BUG-498: checkInDiscountAmt; BUG-499: foodDiscountRs */}
```

---

### E-499-1 — CollectPaymentPanel `total` prop (L363)

**Current:**
```jsx
              total={order.amount || 0}
```

**After:**
```jsx
              total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))}
```

---

### E-499-2 — `roomInfo balance_due` override (L374)

**Current:**
```jsx
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs)
```

**After:**
```jsx
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs) // BUG-498: roomDiscountInfoRs now baseBalance-based
```

*(Comment-only change — the value is already correct since `roomDiscountInfoRs` is now based on `baseBalance`)*

---

## Verification Matrix

| # | Edit | How to verify | Automated? |
|---|------|--------------|:-----------:|
| V1 | E-498-2: roomDiscountRs uses baseBalance | Code: dep array has only `baseBalance`, no `c.booking_charge` | Code review |
| V2 | E-498-3: maxPct = 0 when baseBalance=0 (order #000326) | Code: `floor(min(0,6700)/6700×100) = 0` | Code review |
| V3 | E-498-3: maxPct = 40% for bp=₹600, bc=₹1,500 | Code: `floor(min(600,1500)/1500×100) = 40` | Code review |
| V4 | E-498-4: Check-in discount line shows for order #000326 | Browser: Bill panel shows "Check-in discount −₹5,325" | Browser |
| V5 | E-498-5: input `max` = baseBalance in Amount mode | Browser: input max attr = 0 for order #000326 (bp=0) | Browser |
| V6 | E-498-11: ordering — roomDiscountInfoRs AFTER baseBalance | Code: `roomDiscountInfoRs` declared after line ~275 | Code review |
| V7 | E-498-11: no ReferenceError on bill open | Browser: bill panel opens without crash | Browser |
| V8 | E-498-12: room_gst_tax = displaySgst+displayCgst | Network tab: `room_gst_tax` field present in checkout payload | Browser |
| V9 | E-498-13: room_discount = correct for room-only 20% | Network: `room_discount = floor(bp × 20%)` not `floor(6700 × 20%)` | Browser |
| V10 | E-498-13: Both 30% → room_discount = floor(bp×15%) | Network: both split correctly | Browser |
| V11 | E-499-1: Both 30% → payment_amount reduced by food half | Network: `payment_amount` = F&B_total − floor(F&B×15%) | Browser |
| V12 | compile | 0 new webpack warnings | `tail frontend.out.log` |

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Temporal dead zone (the crash that happened) | E-498-9+10 DELETE old useMemos; E-498-11 adds corrected ones AFTER `baseBalance` — eliminates root cause |
| `baseBalance=null` on folio load | Guards: `baseBalance === null) return 0` in useMemos + JSX gated on `baseBalance !== null` |
| `foodDiscountRs` references `order` before available | `order` declared at L253, `foodDiscountRs` useMemo added at ~L280 (after L253+L275) — safe |
| CollectPaymentPanel R5 — only `total` prop changes | ✅ CollectPaymentPanel internals NOT touched |
| BUG-494 baseBalance useMemo (L257-275) must stay intact | ✅ Not touched; new useMemos added AFTER it |
| handlePaid guard: `baseBalance !== null` in room_discount block | Prevents sending room_discount when folio not loaded |
| F&B-only: `room_discount_apply_to` NOT sent (backend 422 if apply_to with room_discount=0) | Guard `roomApplyTo !== 'food'` in block — food-only never enters room_discount block |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-498 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] registry.json: BUG-499 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-498 + BUG-499 rows updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-498 + BUG-499 2026-10-06
- [ ] Code markers: // BUG-498 and // BUG-499 in each modified block
- [ ] Compile: 0 new webpack warnings
```

---

## Scope Summary

| Item | Files WILL change | Files WILL NOT touch |
|------|------------------|---------------------|
| BUG-498 | `FolioCheckoutPanel.jsx` | CollectPaymentPanel.jsx · CheckInForm.jsx · CheckInPage.jsx · orderTransform.js |
| BUG-499 | `FolioCheckoutPanel.jsx` | All above + all test files |

**Total edits: 17 (15 BUG-498 + 2 BUG-499), all in 1 file.**
