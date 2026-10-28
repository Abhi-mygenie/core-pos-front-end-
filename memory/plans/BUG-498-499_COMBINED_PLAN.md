# BUG-498 + BUG-499 — Impact Analysis + Implementation Plan (Gate 2 + Gate 3)

**Date:** 2026-10-06
**Author:** PLANNING agent
**Items:** BUG-498 (checkout discount wrong base) + BUG-499 (Both discount wrong split)
**Risk:** CRITICAL (both financial settlement)
**Combined because:** Both live in `FolioCheckoutPanel.jsx` only; planning them separately would cause double-editing the same file.

---

## UX Direction (owner brief)

> "we already have discount for food orders on the right side panel — where room rent also comes the left side is brief — we dont need to confuse by keeping at both side — for inspiration: dashboard checkout shows all info and operation on right side scroll panel at one shot"

**Translation into change:**

| Panel | Before | After |
|-------|--------|-------|
| LEFT (Statement) | Room summary + Full discount UI (Apply-to, Amount/%, reason, split payment) | **Brief, read-only**: Booking amount, Check-in discount (new), SGST, CGST, Already paid, Room balance + F&B orders + Transferred |
| RIGHT (bill-right) | Tiny "Room discount applied: ₹X" note above CollectPaymentPanel | **Room Discount section** (Apply-to, Amount/%, reason, preview) + CollectPaymentPanel (unchanged, R5) |

---

## Code Reality Check

```
grep "RoomDiscountSection\|bill-right.*discount\|checkout.*discount.*right" FolioCheckoutPanel.jsx → 0 hits
```

Code Reality: NONE. Full change needed.

---

## Conflict Pre-Check

| Open item | Status | Touches FolioCheckoutPanel? | Lines |
|-----------|--------|----------------------------|-------|
| BUG-495 | GATE_5A_IMPLEMENTED | YES — L53-61, L229-240 | maxPct (BUG-496 will revise these) |
| BUG-494 | GATE_5A_IMPLEMENTED | YES — L16, L40, L165-169, L176, L191, L254-274, L350, L372 | baseBalance useMemo + prop threading |
| BUG-496 | GATE_3_PLAN_COMPLETE | **SCOPE EXCLUDES** FolioCheckoutPanel | ✅ No conflict |
| BUG-497 | GATE_3_PLAN_COMPLETE | NO | ✅ No conflict |

BUG-498/499 will REPLACE or REVISE the BUG-495 maxPct lines (L53-61, L229-240) with the correct checkout formula. BUG-494's `baseBalance` useMemo (L254-274) is kept and reused. No fresh conflicts.

---

## Data Flow Trace

### Room discount currently (WRONG):
```
RoomSection roomDiscountRs (L45-53):
  base = c.booking_charge (LR, stale ₹6,700)
  Percent: floor(6700 × 50%) = ₹3,350  ← should be on folio bp

handlePaid (L296-300):
  bookingCharge = order.roomInfo?.roomPrice   = ₹6,700  (full)
  balanceDue    = order.roomInfo?.balancePayment = ₹0    (folio)
  roomDiscountRs = Math.min(floor(6700×50%), 0) = ₹0    ← silent ₹0 sent!
  payload.room_discount = ₹0  ← WRONG

For "Both" (L294-305):
  room_discount = full room% applied to full price
  payment_amount = order.amount (no food discount deducted)
  ← both wrong per handover_5 §4.4
```

### After fix (CORRECT):
```
RoomDiscountSection (RIGHT panel, new):
  base = baseBalance (folio bp, already computed in BUG-494 useMemo)
  Percent: floor(bp × roomDiscount%) = correct room amount
  maxPct = floor(bp / booking_charge × 100) per OD-498-01

handlePaid:
  roomDiscountRs = floor(bp × roomDiscount%)   ← correct
  payload.room_discount = roomDiscountRs        ← correct ₹ sent

For "Both":
  foodPct = roomDiscount / 2
  roomPct = roomDiscount / 2
  payload.room_discount = floor(bp × roomPct%)
  payload.payment_amount -= floor(order.amount × foodPct%)  ← food half deducted
  No CollectPaymentPanel change needed (R5 untouched)
```

---

## Affected Sections — All in FolioCheckoutPanel.jsx

### SECTION A — RoomSection (LEFT panel, simplified)

**Remove** from RoomSection props and JSX:
- All discount input UI (apply-to buttons, Amount/Percent toggle, input, reason field)
- All split payment UI (roomSplitEnabled/Legs)
- `roomDiscountRs` useMemo (moves to parent — see Section C)
- `maxPct` useMemo + `discountOverMax` (moves to parent)
- Props removed from signature: `roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs`

**Keep** in RoomSection:
- Toggle open/close
- Booking amount line
- Upgrade line
- SGST / CGST (displaySgst ?? c.sgst) — BUG-494 preserved
- Already paid
- Room balance line (baseBalance ?? c.balance_due) — BUG-494 preserved

**Add** to RoomSection (NEW):
- Check-in discount read-only line (between Booking amount and SGST):
  ```jsx
  {Number(order?.roomInfo?.discountAmount || 0) > 0 && (
    <Line
      label={`Check-in discount (${order.roomInfo.discountType === 'Percent' ? `${order.roomInfo.discountDetail?.check_in?.value ?? ''}%` : '₹'})`}
      value={`−${fmtINR(order.roomInfo.discountAmount)}`}
      testId="bill-room-checkin-discount"
      muted
    />
  )}
  ```

**New RoomSection signature:**
```javascript
const RoomSection = ({ row, order, upgrade, baseBalance = null, displaySgst = null, displayCgst = null }) => {
```
Much simpler — 6 props down from 18.

---

### SECTION B — Statement (passes new simplified RoomSection)

**Remove** all discount prop threading:
- Remove from Statement signature: 12 discount props
- Remove from `<RoomSection>` call: 12 discount props

**Add** `order` prop to Statement (so RoomSection can read `order.roomInfo.discountAmount`):
```javascript
const Statement = ({ row, folio, order, baseBalance, displaySgst, displayCgst }) => {
```

**Update** RoomSection call inside Statement:
```jsx
<RoomSection row={row} order={order} upgrade={upgrade}
  baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
/>
```

**Update** Statement call in parent JSX (add `order={order}`, remove 12 discount props).

---

### SECTION C — NEW RoomDiscountSection (RIGHT panel, above CollectPaymentPanel)

**Placement:** Inside `bill-right` div, replacing the current tiny info note (L354-358), above the `<Suspense>` block.

**Contains:**
```jsx
{/* BUG-498 + BUG-499: room discount controls moved to right panel */}
{baseBalance !== null && (
  <div className="px-3 pt-3 pb-2 border-b border-[#E5E5E5] text-[12px]" data-testid="room-discount-section">
    <div className="font-semibold text-[#1A1A1A] mb-2">Room Discount · optional</div>

    {/* Apply-to */}
    <div className="flex gap-1 mb-2">
      {['room', 'both', 'food'].map(v => (
        <button key={v} type="button" data-testid={`bill-apply-to-${v}`}
          onClick={() => { setRoomApplyTo(v); if (v === 'food') setRoomDiscount(0); }}
          className={`px-2 py-0.5 rounded text-[10px] border ${roomApplyTo === v ? 'bg-[#329937] text-white border-[#329937]' : 'border-[#E5E5E5] text-[#555]'}`}>
          {v === 'room' ? 'Room' : v === 'both' ? 'Both' : 'F&B only'}
        </button>
      ))}
    </div>

    {/* Amount / Percent input */}
    {roomApplyTo !== 'food' && (
      <div className="flex gap-1 items-center mb-1">
        <div className="flex rounded border border-[#E5E5E5] overflow-hidden text-[10px]">
          {['Amount', 'Percent'].map(t => (
            <button key={t} type="button" data-testid={`bill-discount-type-${t.toLowerCase()}`}
              onClick={() => { setRoomDiscountType(t); setRoomDiscount(0); }}
              className={`px-1.5 py-0.5 ${roomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}>
              {t === 'Amount' ? '₹' : '%'}
            </button>
          ))}
        </div>
        <input
          type="number" min="0"
          max={roomDiscountType === 'Percent' ? maxPct : baseBalance}
          placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
          value={roomDiscount || ''}
          onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value)||0),
            roomDiscountType === 'Percent' ? maxPct : baseBalance))}
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

    {/* Alert: over max */}
    {discountOverMax && (
      <div className="text-[11px] text-[#B91C1C] bg-red-50 border border-red-200 rounded px-2 py-1 mb-1"
           data-testid="bill-discount-over-max-alert">
        Maximum: {maxPct}% (₹{Math.floor(baseBalance * maxPct / 100)})
      </div>
    )}

    {/* Preview */}
    {roomDiscountRs > 0 && roomApplyTo === 'room' && (
      <div className="text-[11px] text-[#329937]" data-testid="bill-room-discount-preview">
        Room discount: −{fmtINR(roomDiscountRs)}
      </div>
    )}
    {roomDiscountRs > 0 && roomApplyTo === 'both' && (
      <div className="text-[11px] text-[#329937]" data-testid="bill-both-discount-preview">
        {/* BUG-499: Both = 50/50 split preview */}
        Room −{fmtINR(roomDiscountRs)} · F&B −{fmtINR(foodDiscountRs)}
      </div>
    )}
    {roomApplyTo === 'food' && Number(roomDiscount) > 0 && (
      <div className="text-[11px] text-[#329937]" data-testid="bill-food-discount-preview">
        F&B discount: −{fmtINR(foodDiscountRs)}
      </div>
    )}

    {/* Split room payment */}
    <div className="mt-2">
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
                className="h-6 border border-[#E5E5E5] rounded px-1 text-[11px]">
                {['cash','upi','card'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="number" min="0" placeholder="0"
                value={leg.amount}
                onChange={e => setRoomSplitLegs(prev => prev.map((l,j) => j===i ? {...l, amount: e.target.value} : l))}
                data-testid={`bill-room-split-amount-${i}`}
                className="flex-1 h-6 border border-[#E5E5E5] rounded px-1 text-[11px]"
              />
            </div>
          ))}
          <button type="button" onClick={() => setRoomSplitLegs(prev => [...prev, {mode:'cash', amount:''}])}
            data-testid="bill-room-split-add-leg"
            className="text-[10px] text-[#329937] mt-0.5">+ Add leg</button>
        </div>
      )}
    </div>
  </div>
)}
```

---

### SECTION D — Parent: new `roomDiscountRs`, `maxPct`, `discountOverMax`, `foodDiscountRs` useMemos

Move out of RoomSection (where they were) into the parent `FolioCheckoutPanel` scope, after the existing `baseBalance` useMemo (L254-274).

```javascript
// BUG-498: maxPct and roomDiscountRs based on folio balancePayment (OD-498-01)
const maxPct = useMemo(() => {
  if (baseBalance === null) return 0;
  const bc = Number(row.charge?.booking_charge || 0);
  if (!bc) return 100;
  return Math.floor(Math.min(baseBalance, bc) / bc * 100);
}, [baseBalance, row.charge?.booking_charge]);

const roomDiscountRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
  if (roomDiscountType === 'Percent') {
    return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
  }
  return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
}, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);

// BUG-499: food half for Both discount
const foodDiscountRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'room') return 0;
  const fnbTotal = order?.amount || 0;
  if (!fnbTotal) return 0;
  if (roomApplyTo === 'food') {
    return roomDiscountType === 'Percent'
      ? Math.floor(fnbTotal * roomDiscount / 100)
      : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
  }
  // 'both': split 50/50 per handover_5 §4.4
  return roomDiscountType === 'Percent'
    ? Math.floor(fnbTotal * (roomDiscount / 2) / 100)
    : Math.floor(Number(roomDiscount) / 2);
}, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);

const discountOverMax = useMemo(() => {
  if (roomDiscountType !== 'Percent' || roomApplyTo === 'food') return false;
  return Number(roomDiscount) > maxPct;
}, [roomDiscount, roomDiscountType, roomApplyTo, maxPct]);

// Existing roomDiscountInfoRs stays (used in roomInfo balance_due override for CollectPaymentPanel)
// but its formula updates to use baseBalance not row.charge.balance_due:
// BUG-498: roomDiscountInfoRs uses baseBalance
const roomDiscountInfoRs = useMemo(() => {
  if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
  return roomDiscountRs; // same as roomDiscountRs — consolidate
}, [roomDiscount, roomApplyTo, baseBalance, roomDiscountRs]);
```

**Note:** `roomDiscountInfoRs` can be replaced by `roomDiscountRs` directly — they compute the same thing. Remove `roomDiscountInfoRs` useMemo entirely; use `roomDiscountRs` everywhere it was used.

---

### SECTION E — handlePaid: fix payload

```javascript
// BUG-498: room_discount based on folio balancePayment (not stale LR booking_charge)
if (roomDiscount > 0 && roomApplyTo !== 'food') {
  const roomHalfRs = roomApplyTo === 'both'
    ? (roomDiscountType === 'Percent'
        ? Math.floor(baseBalance * (roomDiscount / 2) / 100)
        : Math.floor(Number(roomDiscount) / 2))
    : roomDiscountRs;
  payload.room_discount          = roomHalfRs;          // BUG-498: correct base
  payload.room_discount_apply_to = roomApplyTo;          // 'room' | 'both'
  payload.room_discount_type     = roomDiscountType;
  payload.room_discount_value    = roomDiscount;
  payload.room_discount_reason   = roomDiscountReason || null;
}

// BUG-499: Both — deduct food half from payment_amount
if (roomApplyTo !== 'room' && foodDiscountRs > 0) {
  payload.payment_amount = Math.max(0, (payload.payment_amount || 0) - foodDiscountRs);
  payload.grant_amount   = payload.payment_amount;
  payload.order_amount   = payload.payment_amount;
  payload.order_discount      = foodDiscountRs;   // audit field
  payload.order_discount_type = roomDiscountType;
}

// BUG-496 (carried through): room_gst_tax from displaySgst+displayCgst
const roomGstTax = (displaySgst !== null && displayCgst !== null)
  ? (displaySgst + displayCgst) : (order.roomInfo?.gstTax ?? 0);
if (roomGstTax > 0) payload.room_gst_tax = roomGstTax;
```

---

### SECTION F — CollectPaymentPanel `total` prop

```jsx
{/* BUG-499: deduct food half for Both/food discount from F&B total */}
total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))}
```

This makes CollectPaymentPanel display the correct post-food-discount total. The `payment_amount` in the payload is further corrected in handlePaid (Section E).

---

### SECTION G — roomInfo override (CollectPaymentPanel roomInfo prop)

```jsx
roomInfo={roomInfoFromCharge(order.roomInfo, {
  ...row.charge,
  balance_due: Math.max(0, (baseBalance ?? Number(row.charge?.balance_due || 0)) - roomDiscountRs)
  // BUG-498: baseBalance already correct from BUG-494 useMemo; roomDiscountRs now correct
})}
```

No change needed in formula — but `roomDiscountRs` is now computed correctly in parent (Section D), so this will automatically use the correct value.

---

## Edit Sites Summary

| ID | Section | Change | Lines (approx) |
|----|---------|--------|---------------|
| E-498-1 | RoomSection signature | Remove 12 discount props, add `order` | L40 |
| E-498-2 | RoomSection discount UI | REMOVE entire discount input block (L73-163) | ~90 lines removed |
| E-498-3 | RoomSection: add check-in discount line | NEW Line between Booking amount and SGST | +5 lines |
| E-498-4 | Statement signature | Remove 12 props, add `order` | L176 |
| E-498-5 | Statement → RoomSection call | Remove 12 props, add `order` | L184-192 |
| E-498-6 | Statement call in parent JSX | Remove 12 props, add `order` | L343-351 |
| E-498-7 | Parent: remove `roomDiscountInfoRs` useMemo | Consolidate into `roomDiscountRs` | L220-228 |
| E-498-8 | Parent: add 4 new useMemos (maxPct, roomDiscountRs, foodDiscountRs, discountOverMax) | After existing `baseBalance` useMemo (~L274) | +30 lines |
| E-498-9 | bill-right: replace info note with RoomDiscountSection | L354-358 → full new section | ~70 lines |
| E-498-10 | handlePaid: fix room_discount payload | L293-305 | ~12 lines |
| E-499-1 | handlePaid: add Both food deduction | After E-498-10 | +8 lines |
| E-499-2 | CollectPaymentPanel `total` prop | L363 | 1 line |
| E-499-3 | handlePaid: fix room_gst_tax | L291-292 | 2 lines |

**Files WILL change:** `FolioCheckoutPanel.jsx` only
**Files WILL NOT touch:** `CollectPaymentPanel.jsx` (R5) · `CheckInForm.jsx` · `CheckInPage.jsx` · `pmsService.js` · `frontDeskService.js` · `orderTransform.js` (R5)

---

## Execution Order

**Critical:** BUG-494's `baseBalance` useMemo (L254-274) must remain in place — all of BUG-498 depends on it.

1. E-498-1 through E-498-7: Simplify RoomSection + Statement (remove discount UI from left)
2. E-498-8: Add new useMemos in parent
3. E-498-9: Add RoomDiscountSection to bill-right
4. E-498-10 + E-499-1 + E-499-2 + E-499-3: Fix handlePaid + CollectPaymentPanel props
5. Compile check

---

## Verification Matrix

| # | What to verify | How |
|---|---------------|-----|
| V1 | LEFT panel: no discount input visible | Visual: bill-left shows only read-only lines |
| V2 | LEFT panel: check-in discount line shows for #000326 | Visual: "Check-in discount (80%) −₹5,325" appears |
| V3 | RIGHT panel: Room Discount section appears | Visual: above CollectPaymentPanel |
| V4 | maxPct = floor(bp/bc × 100) for order #000326 (bp=0 → maxPct=0) | DOM: max attr on % input = 0 when bp=0 |
| V5 | Amount mode max = baseBalance | DOM: max attr = bp value |
| V6 | 50% Both → room half + food half shown in preview | Visual: "Room −₹X · F&B −₹Y" |
| V7 | CollectPaymentPanel total = F&B − foodDiscountRs when Both | DOM: total display updated |
| V8 | handlePaid payload: `room_discount` = floor(bp × roomPct%) | Network tab: correct ₹ value |
| V9 | handlePaid payload: `payment_amount` = F&B − food half | Network tab: correct F&B |
| V10 | No regression: non-discount checkout proceeds | Normal checkout still works |
| V11 | Compile: 0 new warnings | webpack |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-498 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] registry.json: BUG-499 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: both rows updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-498 + BUG-499 2026-10-06
- [ ] Code markers: // BUG-498 and // BUG-499 on each modified section
- [ ] Compile: 0 new warnings
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `baseBalance = null` (folio loading) → no discount possible | `{baseBalance !== null && <RoomDiscountSection>}` — section hidden while loading |
| `baseBalance = 0` (fully-paid via advance) → maxPct = 0, no room discount possible | Correct — nothing to discount on; UI hidden/disabled |
| `order?.amount` = 0 (room-only, no F&B) → foodDiscountRs = 0 | `Math.floor(0 × x%) = 0` — no-op |
| CollectPaymentPanel R5 — no changes allowed | ✅ Only `total` prop value changes; no CollectPaymentPanel internals modified |
| `roomDiscountInfoRs` was used in roomInfo override (L374) | Replaced by `roomDiscountRs` in Section D — same value, cleaner |
| BUG-494 baseBalance useMemo (L254-274) must stay intact | ✅ Not touching it; only adding useMemos AFTER it |
| "F&B only" apply-to: food discount sent as `order_discount` but no `room_discount` | Backend: `apply_to = food` with `room_discount=0` → omit `room_discount_apply_to` entirely (backend 422 if apply_to without room_discount) |
