# BUG-522 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-522
**Date:** 2026-10-09
**Agent:** PLANNING (Gate 3)
**Risk:** HIGH (R6 — handlePaid financial block)
**Gate 2 IA:** `impact/BUG-522_IMPACT_ANALYSIS.md`
**ODs:** All locked. OD-INV-01=a (independent: room-only, CPP handles F&B)
**Awaiting:** Gate 4 GO before any code change

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 9 edits

**Files will NOT touch:**
- `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` · `folioTransform.js` · any other file

---

## Conflict Pre-Check

| File | Last modifier | Open items touching it | Conflict |
|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-519 (2026-10-09) | None | NONE |

---

## Entry Verification (run BEFORE any edit)

```bash
F=/app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx

# All 9 must return results. If any fails → STOP, re-read IA.
grep -n "roomApplyTo.*useState" $F
# Expected: 217:  const [roomApplyTo, setRoomApplyTo]

grep -n "const roomDiscountInfoRs = useMemo" $F
# Expected: 262

grep -n "const foodDiscountRs = useMemo" $F
# Expected: 285

grep -n "roomApplyTo !== 'food' && baseBalance" $F
# Expected: 319

grep -n "foodDiscountRs > 0" $F | grep -v useMemo
# Expected: 334

grep -n "roomApplyTo, roomSplitEnabled" $F
# Expected: 357

grep -n "bill-apply-to-room" $F
# Expected: 61  (inside RoomDiscountControls)

grep -n "roomApplyTo !== 'food' &&" $F | head -2
# Expected: 68  (RoomDiscountControls JSX guard)  +  319 (handlePaid)

grep -n "roomApplyTo={roomApplyTo}" $F
# Expected: 393

grep -n "roomApplyTo !== 'room'" $F
# Expected: 408
```

---

## Edits — Execution Sequence

### E-522-1 · Remove `roomApplyTo` state (L217)

**Current:**
```js
  const [roomApplyTo, setRoomApplyTo]           = useState('room');   // 'room' | 'both' | 'food'
```

**New:** *(line deleted entirely)*
```js
  // BUG-522: roomApplyTo removed — room discount is always room-only; apply_to set dynamically in handlePaid
```

**Verify:** `grep -n "roomApplyTo.*useState" $F` → 0 hits

---

### E-522-2 · Simplify `roomDiscountInfoRs` useMemo (L262–274)

**Current:**
```js
  const roomDiscountInfoRs = useMemo(() => { // BUG-518: 'both' Amount uses capped half (OD-518-01=a)
    if (!roomDiscount || roomApplyTo === 'food' || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      const half = roomApplyTo === 'both' ? roomDiscount / 2 : roomDiscount;
      return bc > 0 ? Math.min(Math.floor(bc * half / 100), maxCap) : 0;         // BUG-518
    }
    if (roomApplyTo === 'both') {
      return Math.min(Math.floor(Number(roomDiscount) / 2), maxCap);              // BUG-518: capped half
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);                    // BUG-517
  }, [roomDiscount, roomDiscountType, roomApplyTo, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
```

**New:**
```js
  const roomDiscountInfoRs = useMemo(() => { // BUG-522: room-only; full entered discount (no halving)
    if (!roomDiscount || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0;
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
```

**Verify:** `grep -n "roomApplyTo" $F | grep "262\|263\|264\|265\|266\|267\|268\|269\|270\|271\|272\|273\|274"` → 0 hits

---

### E-522-3 · Remove `foodDiscountRs` useMemo (L285–297)

**Current:**
```js
  // BUG-499: foodDiscountRs — F&B half for Both/food (OD-499-01, handover_5 §4.4)
  const foodDiscountRs = useMemo(() => { // BUG-518: per-side cap (OD-518-01=a); fnbTotal base (OD-518-03)
    const fnbTotal = order?.amount || 0;
    if (!fnbTotal || !roomDiscount || roomApplyTo === 'room') return 0;
    if (roomApplyTo === 'food') {
      return roomDiscountType === 'Percent'
        ? Math.min(Math.floor(fnbTotal * roomDiscount / 100), fnbTotal)           // BUG-518: cap
        : Math.min(Math.floor(Number(roomDiscount)), fnbTotal);
    }
    // 'both': OD-518-01=a — cap each half at its own limit
    return roomDiscountType === 'Percent'
      ? Math.min(Math.floor(fnbTotal * (roomDiscount / 2) / 100), fnbTotal)      // BUG-518: cap
      : Math.min(Math.floor(Number(roomDiscount) / 2), fnbTotal);                // BUG-518: capped half
  }, [roomDiscount, roomDiscountType, roomApplyTo, order?.amount]);
```

**New:** *(block deleted entirely)*
```js
  // BUG-522: foodDiscountRs removed — CPP's collectBillExisting handles F&B discount natively
```

**Verify:** `grep -c "foodDiscountRs" $F` → 0

---

### E-522-4 · Simplify handlePaid room block + remove food block (L319–340)

**Current:**
```js
      if (roomDiscount > 0 && roomApplyTo !== 'food' && baseBalance !== null) {
        // BUG-498: room half = baseBalance-based; for Both = floor(baseBalance × pct/2%)
        const bc517 = Number(row.charge?.booking_charge || 0);                   // BUG-517
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.min(bc517 > 0 ? Math.floor(bc517 * (roomDiscount / 2) / 100) : 0, maxCheckoutDiscount ?? 0) // BUG-517: bc base + cap
              : Math.min(Math.floor(Number(roomDiscount) / 2), maxCheckoutDiscount ?? 0)) // BUG-518: capped half
          : roomDiscountInfoRs; // 'room' only — full roomDiscountInfoRs (correct base)
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

**New:**
```js
      if (roomDiscount > 0 && baseBalance !== null) { // BUG-522: removed roomApplyTo guard
        payload.room_discount          = roomDiscountInfoRs; // BUG-522: full room amount (no halving)
        // BUG-522: dynamic apply_to per fe_discount_curls.md:
        //   payload.order_discount set by collectBillExisting from CPP's Discount dropdown
        //   'both' (Curl E) when CPP food discount present; 'room' (Curl C) when room only
        payload.room_discount_apply_to = payload.order_discount > 0 ? 'both' : 'room';
        payload.room_discount_type     = roomDiscountType;
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
      // BUG-522: food block removed — CPP's collectBillExisting handles F&B discount fully:
      //   payment_amount, order_discount, order_discount_type, discount_value, discount_type
```

**Verify:**
```bash
grep -n "roomApplyTo !== 'food' && baseBalance" $F  # → 0
grep -n "foodDiscountRs" $F                          # → 0
grep -n "apply_to.*both.*room.*BUG-522" $F           # → 1 hit
```

---

### E-522-5 · Update handlePaid deps (L357)

**Current:**
```js
  }, [order, row.orderId, row.roomNo, row.charge?.booking_charge, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs, baseBalance, maxCheckoutDiscount, displaySgst, displayCgst, foodDiscountRs, roomDiscountInfoRs, discountOverMax]); // BUG-498 + BUG-499 + BUG-517
```

**New:**
```js
  }, [order, row.orderId, row.roomNo, row.charge?.booking_charge, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomSplitEnabled, roomSplitLegs, baseBalance, maxCheckoutDiscount, displaySgst, displayCgst, roomDiscountInfoRs, discountOverMax]); // BUG-498 + BUG-517 + BUG-522
```

**Verify:** `grep -n "roomApplyTo.*roomSplitEnabled\|foodDiscountRs.*roomDiscountInfoRs" $F` → 0

---

### Compile check A (after E-522-1 through E-522-5)

```bash
sleep 15 && tail -3 /var/log/supervisor/frontend.out.log
# Must: "webpack compiled" — with 0 new errors
```

If compile fails here → **STOP. Do not proceed to E-522-6 through E-522-9.** Debug before continuing.

---

### E-522-6 · Simplify RoomDiscountControls signature (L41–45)

**Current:**
```js
const RoomDiscountControls = ({
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo,
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance,
}) => {
```

**New:**
```js
const RoomDiscountControls = ({ // BUG-522: removed roomApplyTo, setRoomApplyTo
  c, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason,
  roomDiscountType, setRoomDiscountType,
  roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs,
  maxCheckoutDiscount, baseBalance,
}) => {
```

**Verify:** `grep -n "roomApplyTo" $F | head -5` — should only show lines NOT in RoomDiscountControls signature

---

### E-522-7 · Remove three-button selector + `roomApplyTo !== 'food'` wrapper (L57–103)

This is the largest visual change. Replace the entire py-0.5 div (from opening comment to closing div) with a simplified version that keeps only the inputs and alert.

**Current (lines ~57–103):**
```jsx
      {/* CR-405-A + CR-407 Sub-scope B: apply_to selector + Amount/Percent toggle */}
      <div className="py-0.5">
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
            {/* BUG-517: max/clamp use maxCheckoutDiscount cap */}
            <input
              type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : ((maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0)) || undefined)}
              placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
              value={roomDiscount || ''}
              onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0))))}
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
              Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or use Amount mode.{/* BUG-517 */}
            </div>
          )}
          </>
        )}
      </div>
```

**New:**
```jsx
      {/* CR-405-A + BUG-522: removed apply_to selector; input always visible (independent room discount) */}
      <div className="py-0.5">
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
            {/* BUG-517: max/clamp use maxCheckoutDiscount cap */}
            <input
              type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : ((maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0)) || undefined)}
              placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
              value={roomDiscount || ''}
              onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0))))}
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
              Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or use Amount mode.{/* BUG-517 */}
            </div>
          )}
      </div>
```

**Verify:**
```bash
grep -c "bill-apply-to-" $F   # → 0
grep -c "setRoomApplyTo" $F   # → 0
grep -n "bill-room-discount-input" $F  # → 1 hit (still present)
```

---

### E-522-8 · Remove call site props (L393)

**Current:**
```jsx
                roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
```

**New:** *(line deleted entirely)*

**Verify:** `grep -n "roomApplyTo=" $F` → 0 hits

---

### E-522-9 · Simplify CPP `total` prop (L408)

**Current:**
```jsx
              total={Math.max(0, (order.amount || 0) - (roomApplyTo !== 'room' ? foodDiscountRs : 0))}
```

**New:**
```jsx
              total={order.amount || 0} {/* BUG-522: CPP computes food total from cartItems */}
```

**Verify:** `grep -n "roomApplyTo" $F` → **0 total hits** (complete removal confirmed)

---

### Compile check B (after E-522-6 through E-522-9)

```bash
sleep 18 && tail -3 /var/log/supervisor/frontend.out.log
# Must: "webpack compiled successfully" — 0 new warnings
```

---

## Execution Sequence

```
1. Run all Entry Verification greps → confirm all 10 anchors match
2. E-522-1: Remove roomApplyTo state
3. E-522-2: Simplify roomDiscountInfoRs useMemo
4. E-522-3: Remove foodDiscountRs useMemo
5. E-522-4: Simplify handlePaid room block + remove food block
6. E-522-5: Update handlePaid deps
7. Compile check A → must pass before continuing
8. E-522-6: RoomDiscountControls signature
9. E-522-7: Remove three-button selector + wrapper
10. E-522-8: Remove call site props
11. E-522-9: Simplify CPP total prop
12. Compile check B → must pass
13. Final roomApplyTo sweep: grep -c "roomApplyTo" $F → must be 0
14. Self-test: run Verification Matrix V-1 through V-5 (auto-checks)
15. EXIT GATE 5/5
16. Write QA Handover
```

**Critical rule for E-522-7:** This is a large search-replace. The search string must include the opening comment line through the closing `</div>`. If the search fails to find the exact string, check whitespace (tabs vs spaces). Do NOT attempt a partial edit — use the full old→new block shown above.

---

## Verification Matrix (Implementation agent self-test)

| # | Edit | Verify command | Expected |
|---|---|---|---|
| V-1 | All roomApplyTo removed | `grep -c "roomApplyTo" $F` | 0 |
| V-2 | All foodDiscountRs removed | `grep -c "foodDiscountRs" $F` | 0 |
| V-3 | Selector buttons gone | `grep -c "bill-apply-to-" $F` | 0 |
| V-4 | Dynamic apply_to | `grep -n "order_discount > 0.*BUG-522" $F` | 1 hit |
| V-5 | Compile | `tail -3 /var/log/supervisor/frontend.out.log` | webpack compiled |
| V-6 | Scenario A — room only | Browser: enter ₹200 room disc → left shows −₹200; Network: apply_to="room" | NO |
| V-7 | Scenario B — CPP food | CPP Discount 10% → Food Total decreases; Network: no room_discount_apply_to | NO |
| V-8 | Scenario C — both | Room disc + CPP Discount → Network: apply_to="both", order_discount>0 | NO |
| V-9 | maxCheckoutDiscount cap | bonk: enter ₹600 → capped at 525, alert shown | NO |
| V-10 | Split room payment | Toggle → legs visible | NO |
| V-11 | Left panel discount line | Enter discount → left reads "Room discount: −₹X" | NO |

---

## Risk Register

| Risk | Assessment |
|---|---|
| handlePaid room block (R6) | SIMPLIFICATION of existing code. 'room' branch formula is identical to pre-BUG-499. Low regression risk. |
| Dynamic `apply_to` | `payload.order_discount` is set by `collectBillExisting` synchronously before our block. Always reliable. |
| `roomDiscountInfoRs` formula | 'room' branch formula unchanged (BUG-517 cap preserved). Only 'both'/'food' branches removed. |
| E-522-7 large search-replace | Use the complete old→new block shown. If search fails, view file first to get exact whitespace. |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-522 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-522 IMPL, date
- [ ] Code markers: // BUG-522 comment on every changed section (already in new code above)
- [ ] COMPILE CHECK: webpack 0 new warnings
```

---

**Gate 3 Status: COMPLETE — no open ODs.**
**Next: Owner Gate 4 GO → IMPLEMENTATION agent executes edits in sequence.**
