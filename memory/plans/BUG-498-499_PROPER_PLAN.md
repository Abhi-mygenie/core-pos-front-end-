# BUG-498 + BUG-499 — Proper Gate 2 (IA) + Gate 3 (Plan)

**Date:** 2026-10-06
**Author:** PLANNING agent (redone with full file read)
**Risk:** CRITICAL (financial settlement)
**File WILL change:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` only
**File WILL NOT touch:** `CollectPaymentPanel.jsx` (R5 — only its `total` and `roomInfo` props change via caller), `orderTransform.js` (R5), `pmsService.js`, `frontDeskService.js`, `CheckInForm.jsx`, `CheckInPage.jsx`

---

## GATE 2 — IMPACT ANALYSIS

### Code Reality: NONE
```
grep "RoomDiscountSection\|floor.*baseBalance.*bc\|foodDiscountRs" FolioCheckoutPanel.jsx → 0 hits
```

### Conflict Pre-Check

| Open item | Touches FolioCheckoutPanel? | Lines | Safe? |
|-----------|----------------------------|-------|-------|
| BUG-494 (GATE_5A_IMPLEMENTED) | YES — L16, L40, L165-169, L254-275 | baseBalance useMemo preserved | ✅ Keep untouched |
| BUG-495 (GATE_5A_IMPLEMENTED) | YES — L54-62 (RoomSection maxPct), L231-242 (parent discountOverMax) | Both REPLACED by this plan | ✅ Intentional revision |
| BUG-492 (GATE_5A_IMPLEMENTED) | YES — L286 (discountOverMax guard), L374 (roomInfo override) | Updated to use new formulas | ✅ |
| BUG-496 (GATE_3_PLAN_COMPLETE) | **SCOPE EXCLUDES** FolioCheckoutPanel | — | ✅ No conflict |
| BUG-497 (GATE_3_PLAN_COMPLETE) | NO | — | ✅ No conflict |

### Data Flow — Current (WRONG)

```
User types 50% in RoomSection discount input (L104-110, LEFT panel)
  └─ RoomSection.roomDiscountRs (L45-53):
       base = c.booking_charge = ₹6,700 (stale LR)     ← WRONG
       Percent: floor(6700 × 50%) = ₹3,350

handlePaid (L294-305):
  bookingCharge = order.roomInfo?.roomPrice = ₹6,700     ← WRONG (full price)
  balanceDue    = order.roomInfo?.balancePayment = ₹0    (folio, correct)
  roomDiscountRs = Math.min(floor(6700×50%), 0) = ₹0    ← SILENT ₹0 sent!
  payload.room_discount = ₹0

For "Both":
  room_discount = floor(6700 × 50%) = ₹3,350  (full room price, wrong)
  payment_amount = order.amount = ₹112.35      (no food discount deducted)
  ← both wrong per handover_5 §4.4

room_gst_tax (L291-292):
  order.roomInfo?.gstTax = null → roomGstTax = 0 → not sent ← WRONG
```

### Data Flow — After Fix (CORRECT per OD-498-01 + handover_5 §4.4)

```
User types 50% in RoomDiscountSection (RIGHT panel, new)
  └─ parent.roomDiscountRs useMemo:
       base = baseBalance (folio bp, from BUG-494 L257-275)
       Percent: floor(bp × 50%) = correct room amount

handlePaid:
  room_discount = floor(bp × roomPct%)           ← correct
  For "Both": room_discount = floor(bp × 25%)    ← room half only
              payment_amount -= floor(F&B × 25%) ← food half deducted
  room_gst_tax = displaySgst + displayCgst        ← from BUG-494 useMemo
```

### Exact Lines Affected

| Lines | What exists | What changes |
|-------|-------------|-------------|
| L40 | RoomSection signature (18 props) | Remove 12 discount props, keep 6 |
| L45-53 | `roomDiscountRs` useMemo in RoomSection (wrong base) | REMOVE entirely |
| L54-62 | `maxPct` useMemo in RoomSection (BUG-495 formula) | REMOVE entirely |
| L63 | `discountOverMax` in RoomSection | REMOVE |
| L74-127 | Discount input UI in RoomSection JSX | REMOVE (moves to RIGHT panel) |
| L128-163 | Split payment UI in RoomSection JSX | REMOVE (moves to RIGHT panel) |
| L165 | `displaySgst ?? c.sgst` SGST line | KEEP + add check-in discount line before it |
| L176 | Statement signature (18 props) | Remove 12 discount props, add `order` |
| L184-192 | RoomSection call in Statement | Remove 12 props, add `order={order}` |
| L220-230 | `roomDiscountInfoRs` useMemo (wrong base) | REPLACE → `roomDiscountRs` with correct `baseBalance` base |
| L231-242 | `discountOverMax` useMemo (BUG-495 formula) | REPLACE → uses `maxPct` derived from `baseBalance` |
| After L275 | After `baseBalance` useMemo | ADD: `maxPct`, `foodDiscountRs` useMemos |
| L291-292 | `room_gst_tax = order.roomInfo?.gstTax ?? 0` | FIX → use `displaySgst + displayCgst` |
| L294-305 | handlePaid room_discount block | REPLACE → correct base + Both split |
| After L305 | — | ADD: food discount deduction for Both/food |
| L323 | handlePaid deps array | ADD: `baseBalance, displaySgst, displayCgst, foodDiscountRs` |
| L343-351 | Statement call in JSX | Remove 12 props, add `order={order}` |
| L354-358 | Info note (roomDiscountInfoRs > 0) | REPLACE → full RoomDiscountSection |
| L363 | `total={order.amount || 0}` | FIX → subtract foodDiscountRs |
| L374 | roomInfo balance_due override | FIX → use `roomDiscountRs` (not `roomDiscountInfoRs`) |

### R11 API Probe — Both discount contract + B0 validation

From handover_5 §4.4 (already probed and verified in session, order 1232889):
- Both at 30% → send `room_discount = room_half` + reduce `payment_amount` by food_half
- `room_discount_apply_to = 'both'` with `room_discount > 0` → valid (no 422)
- F&B only: omit `room_discount*` entirely, reduce `payment_amount`, send `order_discount`
- Confirmed: `payment_amount = 89.25` (food after 15%) + `room cut = ₹112.50` (15% of ₹750)

**B0 Probe COMPLETE (2026-10-06) — Evidence:** `evidence/BUG-498-499-B0/B0_PROBE_2026_10_06.md`

| Scenario | order | bp | room_discount | HTTP | Result |
|----------|-------|----|--------------|------|--------|
| A: already-paid | 1232973 | 0 | 100 | 200 | `already_paid` — payload accepted |
| B: unpaid, no discount | 1232976 | 0 | 0 (absent) | 500 | SQL error on unrelated column (past validation) |
| C: unpaid, with discount | 1232976 | 0 | 100 | 500 | Same SQL error — identical path |

**B0 VERDICT: PASS — Backend does NOT 422 for room_discount > 0 when bp=0. Backend makes no room_discount ≤ balance_payment validation. Safe to implement.**

**Classification:** FE_BUG (CODE_ERROR — wrong base in roomDiscountRs + wrong Both split)
**Confidence:** HIGH

---

## GATE 3 — IMPLEMENTATION PLAN

### Execution Order
E-498-1 through E-498-6 (simplify RoomSection + Statement) → E-498-7 through E-498-9 (parent useMemos) → E-498-10 through E-499-3 (handlePaid + JSX) → compile check.

---

### E-498-1 — RoomSection signature (L40): remove 12 discount props

**Current (L40):**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C · BUG-494
```

**After:**
```javascript
const RoomSection = ({ row, order, upgrade, baseBalance = null, displaySgst = null, displayCgst = null }) => { // CR-385 M6 · BUG-418 · BUG-498
```

Added: `order` (for check-in discount line). Removed: 12 discount/split props.

---

### E-498-2 — RoomSection: remove roomDiscountRs + maxPct + discountOverMax useMemos (L45-63)

**Current (L45-63):**
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
  // BUG-495: maxPct = floor((bc − adv×(1+gstRate)) / bc × 100) — reserves GST implied in advance
  const maxPct = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return 100;
    const gstRate      = (Number(c.sgst||0) + Number(c.cgst||0)) / bc;
    const gstOnAdvance = advance * gstRate;
    return Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
  }, [c.booking_charge, c.advance_payment, c.sgst, c.cgst]);
  const discountOverMax = roomDiscountType === 'Percent' && Number(roomDiscount) > maxPct;
```

**After:** *(delete entirely — these all move to parent)*
```javascript
```

---

### E-498-3 — RoomSection JSX: remove discount input UI + split UI, add check-in discount line (L74-164)

**Current (L74-164):** *(the entire discount + split block)*
```javascript
          {/* CR-405-A: room discount at checkout — enabled (BQ-385-07 answered by handover_5 §4.4) */}
          {/* CR-407 Sub-scope B: apply_to selector + Amount/Percent toggle */}
          <div className="py-0.5">
            <div className="flex justify-between text-[#767676] mb-0.5">
              <span>Room discount</span>
              {roomDiscountRs > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscountRs : 0)}</span>}
            </div>
            <div className="flex gap-1 mb-0.5">
              {['room', 'both', 'food'].map(v => (
                <button key={v} type="button" data-testid={`bill-apply-to-${v}`}
                  onClick={() => { setRoomApplyTo(v); if (v === 'food') setRoomDiscount(0); }}
                  className={`px-1.5 py-0.5 rounded text-[10px] border ${roomApplyTo === v ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                  {v === 'room' ? 'Room' : v === 'both' ? 'Both' : 'F&B only'}
                </button>
              ))}
            </div>
            {roomApplyTo !== 'food' && (
              <>
              <div className="flex gap-1">
                <div className="flex rounded border border-[#E5E5E5] overflow-hidden text-[10px]">
                  {['Amount','Percent'].map(t => (
                    <button key={t} type="button" data-testid={`bill-discount-type-${t.toLowerCase()}`}
                      onClick={() => { setRoomDiscountType(t); setRoomDiscount(0); }}
                      className={`px-1.5 py-0.5 ${roomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}>
                      {t === 'Amount' ? '₹' : '%'}
                    </button>
                  ))}
                </div>
                {/* BUG-490: Amount input — max capped at balance_due; onChange clamped at balance_due */}
                <input
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
                  placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                  value={roomDiscount || ''}
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), c.balance_due != null ? Number(c.balance_due) : Infinity))}
                  className="w-20 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-input"
                />
                <input
                  type="text" placeholder="Reason (optional)"
                  value={roomDiscountReason}
                  onChange={e => setRoomDiscountReason(e.target.value)}
                  className="flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                  data-testid="bill-room-discount-reason"
                />
              </div>
              {/* BUG-492 Sub-B: red alert when % > maxPct */}
              {discountOverMax && (
                <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mt-1" data-testid="bill-discount-over-max-alert">
                  Maximum discount: {maxPct}% (₹{Math.floor(Number(c.booking_charge||0)*maxPct/100)}). Entering above {maxPct}% has no additional effect.
                </div>
              )}
              </>
            )}
          </div>
          {/* CR-407 Sub-scope C: partial_payments_room — room-rent split */}
          <div className="py-0.5 mt-1">
            <div className="flex items-center justify-between text-[#767676]">
              <span>Split room payment</span>
              <button type="button" data-testid="bill-room-split-toggle"
                onClick={() => setRoomSplitEnabled(v => !v)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${roomSplitEnabled ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                {roomSplitEnabled ? 'On' : 'Off'}
              </button>
            </div>
            {roomSplitEnabled && (
              <div className="mt-1 space-y-1">
                {roomSplitLegs.map((leg, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <select value={leg.mode}
                      onChange={e => setRoomSplitLegs(prev => prev.map((l, j) => j===i ? {...l, mode: e.target.value} : l))}
                      data-testid={`bill-room-split-mode-${i}`}
                      className="h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]">
                      {['cash','upi','card'].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="relative flex-1">
                      <span className="absolute left-1.5 top-1 text-[11px] text-[#888]">₹</span>
                      <input type="number" min="0" placeholder="0"
                        value={leg.amount}
                        onChange={e => setRoomSplitLegs(prev => prev.map((l,j) => j===i ? {...l, amount: e.target.value} : l))}
                        data-testid={`bill-room-split-amount-${i}`}
                        className="w-full pl-5 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setRoomSplitLegs(prev => [...prev, {mode:'cash', amount:''}])}
                  data-testid="bill-room-split-add-leg"
                  className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
              </div>
            )}
          </div>
```

**After:** *(BUG-498: add check-in discount read-only line; remove all UI controls — moved to right panel)*
```javascript
          {/* BUG-498: check-in discount read-only line */}
          {Number(order?.roomInfo?.discountAmount || 0) > 0 && (
            <Line
              label={`Check-in discount${order.roomInfo.discountType === 'Percent' ? ` (${order.roomInfo.discountDetail?.check_in?.value ?? ''}%)` : ''}`}
              value={`−${fmtINR(order.roomInfo.discountAmount)}`}
              testId="bill-room-checkin-discount"
              muted
            />
          )}
```

---

### E-498-4 — Statement signature (L176): remove 12 discount props, add `order`

**Current (L176):**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst }) => {
```

**After:**
```javascript
const Statement = ({ row, folio, order, baseBalance, displaySgst, displayCgst }) => { // BUG-498: simplified — discount UI moved to right panel
```

---

### E-498-5 — RoomSection call in Statement (L184-192): remove 12 props, add order

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
      <RoomSection row={row} order={order} upgrade={upgrade}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
      /> {/* BUG-498 */}
```

---

### E-498-6 — Parent: replace roomDiscountInfoRs useMemo (L220-230) → correct roomDiscountRs

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

**After:**
```javascript
  // BUG-498: roomDiscountRs — base = folio balancePayment (OD-498-01); replaces stale-LR roomDiscountInfoRs
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
```

**Note:** All previous `roomDiscountInfoRs` references in JSX/handlePaid are replaced with `roomDiscountRs` in subsequent edits.

---

### E-498-7 — Parent: replace discountOverMax useMemo (L231-242) → baseBalance-based

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

**After:**
```javascript
  // BUG-498: maxPct uses folio balancePayment (OD-498-01) — replaces BUG-495/492 formula for checkout surface
  const maxPct = useMemo(() => {
    if (baseBalance === null) return 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || baseBalance <= 0) return 0;
    return Math.floor(Math.min(baseBalance, bc) / bc * 100);
  }, [baseBalance, row.charge?.booking_charge]);
  const discountOverMax = roomDiscountType === 'Percent' && roomApplyTo !== 'food' && Number(roomDiscount) > maxPct; // BUG-498
```

---

### E-498-8 — Parent: add foodDiscountRs useMemo (after L275, after baseBalance useMemo)

**Current (L276, first line after baseBalance useMemo):**
```javascript
  const printBill = useCallback(async () => {
```

**After:**
```javascript
  // BUG-499: food discount for Both/F&B-only apply_to — handover_5 §4.4 split contract
  const foodDiscountRs = useMemo(() => {
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.floor(fnbTotal * roomDiscount / 100)
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': 50/50 split per handover_5 §4.4
    return roomDiscountType === 'Percent'
      ? Math.floor(fnbTotal * (roomDiscount / 2) / 100)
      : Math.floor(Number(roomDiscount) / 2);
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);

  const printBill = useCallback(async () => {
```

---

### E-498-9 — handlePaid: fix room_gst_tax (L291-292)

**Current (L291-292):**
```javascript
      const roomGstTax = order.roomInfo?.gstTax ?? 0;
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-386 (server value passthrough)
```

**After:**
```javascript
      // BUG-498: room_gst_tax = GST on discounted price (displaySgst+displayCgst from BUG-494 useMemo)
      const roomGstTax = (displaySgst !== null && displayCgst !== null)
        ? Number(displaySgst) + Number(displayCgst)
        : (order.roomInfo?.gstTax ?? 0);
      if (roomGstTax > 0) payload.room_gst_tax = roomGstTax; // BUG-498
```

---

### E-498-10 — handlePaid: fix room discount block (L294-305) + add Both/food split (BUG-499)

**Current (L294-305):**
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
      // BUG-498 + BUG-499: room + food discount — correct base + Both split per handover_5 §4.4
      if (roomDiscount > 0 && roomApplyTo !== 'food' && baseBalance !== null) {
        // BUG-498: room half = baseBalance-based (OD-498-01); for Both = 50% of that
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.floor(baseBalance * (roomDiscount / 2) / 100)
              : Math.floor(Number(roomDiscount) / 2))
          : roomDiscountRs; // 'room' only — full roomDiscountRs
        payload.room_discount          = roomHalfRs;
        payload.room_discount_apply_to = roomApplyTo;
        payload.room_discount_type     = roomDiscountType;
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
      // BUG-499: food half — deduct from F&B payment_amount for Both + F&B-only
      if (foodDiscountRs > 0) {
        payload.payment_amount = Math.max(0, (payload.payment_amount || 0) - foodDiscountRs);
        payload.grant_amount   = payload.payment_amount;
        payload.order_amount   = payload.payment_amount;
        payload.order_discount      = foodDiscountRs;
        payload.order_discount_type = roomDiscountType;
      }
```

---

### E-498-11 — handlePaid deps array (L323): add baseBalance, displaySgst, displayCgst, foodDiscountRs

**Current (L323):**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs]);
```

**After:**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs, baseBalance, displaySgst, displayCgst, foodDiscountRs, roomDiscountRs]); // BUG-498 + BUG-499
```

---

### E-498-12 — Statement call in parent JSX (L343-351): remove 12 discount props, add order

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
            <Statement row={row} folio={state.data.folio} order={order}
              baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
            /> {/* BUG-498: discount props removed — moved to RoomDiscountSection in bill-right */}
```

---

### E-498-13 — bill-right: replace info note with RoomDiscountSection (L354-358)

**Current (L354-358):**
```jsx
            {/* BUG-491 Sub-D: room discount info note (OD-491-D-01 Option B — total prop unchanged) */}
            {roomDiscountInfoRs > 0 && (
              <div className="text-[11px] text-[#329937] px-3 pt-2 pb-1 border-b border-[#E5E5E5]" data-testid="bill-room-discount-info">
                Room discount applied: −{fmtINR(roomDiscountInfoRs)}
              </div>
            )}
```

**After:**
```jsx
            {/* BUG-498 + BUG-499: Room Discount section — moved from left panel to right panel (UX: all controls on right) */}
            {baseBalance !== null && (
              <div className="px-3 pt-3 pb-2 border-b border-[#E5E5E5] text-[12px]" data-testid="room-discount-section">
                <div className="font-semibold text-[#1A1A1A] mb-1.5 text-[12px]">Room Discount · optional</div>
                <div className="flex gap-1 mb-1.5">
                  {['room', 'both', 'food'].map(v => (
                    <button key={v} type="button" data-testid={`bill-apply-to-${v}`}
                      onClick={() => { setRoomApplyTo(v); if (v === 'food') setRoomDiscount(0); }}
                      className={`px-1.5 py-0.5 rounded text-[10px] border ${roomApplyTo === v ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                      {v === 'room' ? 'Room' : v === 'both' ? 'Both' : 'F&B only'}
                    </button>
                  ))}
                </div>
                {roomApplyTo !== 'food' && (
                  <div className="flex gap-1 mb-1">
                    <div className="flex rounded border border-[#E5E5E5] overflow-hidden text-[10px]">
                      {['Amount','Percent'].map(t => (
                        <button key={t} type="button" data-testid={`bill-discount-type-${t.toLowerCase()}`}
                          onClick={() => { setRoomDiscountType(t); setRoomDiscount(0); }}
                          className={`px-1.5 py-0.5 ${roomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}>
                          {t === 'Amount' ? '₹' : '%'}
                        </button>
                      ))}
                    </div>
                    <input type="number" min="0"
                      max={roomDiscountType === 'Percent' ? maxPct : baseBalance}
                      placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                      value={roomDiscount || ''}
                      onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value)||0), roomDiscountType==='Percent' ? maxPct : baseBalance))}
                      className="w-20 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
                      data-testid="bill-room-discount-input"
                    />
                    <input type="text" placeholder="Reason (optional)"
                      value={roomDiscountReason}
                      onChange={e => setRoomDiscountReason(e.target.value)}
                      className="flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
                      data-testid="bill-room-discount-reason"
                    />
                  </div>
                )}
                {discountOverMax && (
                  <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mb-1" data-testid="bill-discount-over-max-alert">
                    Maximum: {maxPct}% (₹{Math.floor(baseBalance * maxPct / 100)})
                  </div>
                )}
                {/* BUG-499: discount preview — room + food halves */}
                {roomDiscountRs > 0 && roomApplyTo === 'room' && (
                  <div className="text-[11px] text-[#329937]" data-testid="bill-room-discount-preview">
                    Room discount: −{fmtINR(roomDiscountRs)}
                  </div>
                )}
                {Number(roomDiscount) > 0 && roomApplyTo === 'both' && (
                  <div className="text-[11px] text-[#329937]" data-testid="bill-both-discount-preview">
                    Room −{fmtINR(roomDiscountType==='Percent' ? Math.floor(baseBalance*(roomDiscount/2)/100) : Math.floor(roomDiscount/2))} · F&B −{fmtINR(foodDiscountRs)}
                  </div>
                )}
                {Number(roomDiscount) > 0 && roomApplyTo === 'food' && (
                  <div className="text-[11px] text-[#329937]" data-testid="bill-food-discount-preview">
                    F&B discount: −{fmtINR(foodDiscountRs)}
                  </div>
                )}
                {/* Split room payment */}
                <div className="mt-1.5 flex items-center justify-between text-[#767676]">
                  <span>Split room payment</span>
                  <button type="button" data-testid="bill-room-split-toggle"
                    onClick={() => setRoomSplitEnabled(v => !v)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${roomSplitEnabled ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
                    {roomSplitEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                {roomSplitEnabled && (
                  <div className="mt-1 space-y-1">
                    {roomSplitLegs.map((leg, i) => (
                      <div key={i} className="flex gap-1 items-center">
                        <select value={leg.mode}
                          onChange={e => setRoomSplitLegs(prev => prev.map((l,j) => j===i?{...l,mode:e.target.value}:l))}
                          data-testid={`bill-room-split-mode-${i}`}
                          className="h-6 border border-[#E5E5E5] rounded px-1 text-[11px]">
                          {['cash','upi','card'].map(m=><option key={m} value={m}>{m}</option>)}
                        </select>
                        <input type="number" min="0" placeholder="0"
                          value={leg.amount}
                          onChange={e => setRoomSplitLegs(prev => prev.map((l,j)=>j===i?{...l,amount:e.target.value}:l))}
                          data-testid={`bill-room-split-amount-${i}`}
                          className="flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
                        />
                      </div>
                    ))}
                    <button type="button" onClick={() => setRoomSplitLegs(prev=>[...prev,{mode:'cash',amount:''}])}
                      data-testid="bill-room-split-add-leg"
                      className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
                  </div>
                )}
              </div>
            )}
```

---

### E-499-1 — CollectPaymentPanel `total` prop (L363): deduct food discount

**Current (L363):**
```jsx
              total={order.amount || 0}
```

**After:**
```jsx
              total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))} {/* BUG-499: food half deducted for Both/food */}
```

---

### E-499-2 — roomInfo balance_due override (L374): use roomDiscountRs (not roomDiscountInfoRs)

**Current (L374):**
```jsx
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountInfoRs)
```

**After:**
```jsx
                balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountRs) // BUG-498: roomDiscountInfoRs → roomDiscountRs
```

---

## Verification Matrix

| # | Edit | Verify | How |
|---|------|--------|-----|
| V1 | E-498-1/3 | LEFT: no discount inputs visible | Visual: bill-left shows only read-only lines |
| V2 | E-498-3 | LEFT: check-in discount line for #000326 | Visual: "Check-in discount (80%) −₹5,325" |
| V3 | E-498-13 | RIGHT: Room Discount section above CollectPaymentPanel | Visual: bill-right has Room Discount section |
| V4 | E-498-7 | maxPct = 0 when baseBalance = 0 | DOM: max attr on % input = 0 |
| V5 | E-498-7 | maxPct = 40% for bp=₹600, bc=₹1,500 | Code: floor(600/1500×100)=40 |
| V6 | E-498-6 | roomDiscountRs uses baseBalance not booking_charge | Code: base=baseBalance |
| V7 | E-498-9 | room_gst_tax = displaySgst+displayCgst | Network tab on checkout |
| V8 | E-498-10 | payload.room_discount = floor(bp×pct%) | Network tab: correct ₹ value |
| V9 | E-499-1/E-498-10 | Both 50%: room_discount=room_half, payment_amount reduced by food_half | Network tab + handover_5 §4.4 proof |
| V10 | E-499-1 | CollectPaymentPanel total = F&B − foodDiscountRs | Visual: CollectPaymentPanel shows updated total |
| V11 | E-499-2 | roomInfo balance_due uses roomDiscountRs | Code review |
| V12 | All | 0 new compile warnings | webpack |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-498 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] registry.json: BUG-499 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: both rows updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-498 + BUG-499 2026-10-06
- [ ] Code markers: // BUG-498 and // BUG-499 on each section
- [ ] Compile: 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `baseBalance = null` (folio loading) | `{baseBalance !== null && ...}` gates the RoomDiscountSection |
| `baseBalance = 0` → maxPct = 0, inputs show nothing useful | Correct — no room discount when fully paid |
| `order?.amount` absent or 0 → foodDiscountRs = 0 | `Math.floor(0 × x%) = 0` safe |
| CollectPaymentPanel R5 — only `total` prop value changes | ✅ No CollectPaymentPanel internals changed |
| BUG-494 baseBalance useMemo (L257-275) must stay intact | ✅ Not touching it; new useMemos added AFTER |
| `roomDiscountInfoRs` renamed to `roomDiscountRs` — all old references | E-499-2 updates the only remaining JSX use (L374) |
| F&B-only discount: must NOT send `room_discount_apply_to` (backend 422 if apply_to with room_discount=0) | E-498-10: `if (roomDiscount > 0 && roomApplyTo !== 'food')` guard — food-only never enters this block |
