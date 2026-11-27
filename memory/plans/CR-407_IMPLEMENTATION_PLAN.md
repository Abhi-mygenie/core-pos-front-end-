# CR-407 — Implementation Plan

**ID:** CR-407
**Gate:** 3 — IMPLEMENTATION PLAN
**Date:** 2026-10-05
**Risk:** CRITICAL
**Scope lock:**
- Files WILL change: `pages/pms/CheckInPage.jsx` · `api/services/pmsService.js` · `components/pms/frontdesk/FolioCheckoutPanel.jsx`
- Files will NOT touch: `orderTransform.js` · `roomService.js` · `CollectPaymentPanel.jsx` · `roomGstCalculator.js`

**Execution sequence:** Sub-scope A (check-in) → Sub-scope B (checkout expand) → Sub-scope C (partial_payments_room). Independent — can be done in one session.

**Conflict note (CheckInPage.jsx):** BUG-419 + BUG-420 at Gate 3. Implementation agent runs Step 0 Entry Verification on CheckInPage.jsx before editing. If BUG-419/420 have been implemented since this plan was written, re-verify line numbers.

---

# SUB-SCOPE A — Check-in Discount

## A-E1 — CheckInPage.jsx: add 2 state variables

**File:** `src/pages/pms/CheckInPage.jsx`
**After line 57** (after `const [advancePaymentMethod, setAdvancePaymentMethod] = useState('');`)

**Insert:**
```javascript
  // CR-407 Sub-scope A: check-in room discount
  const [ciRoomDiscountAmt,  setCiRoomDiscountAmt]  = useState('');   // raw input (₹ or %)
  const [ciRoomDiscountType, setCiRoomDiscountType] = useState('Amount'); // 'Amount' | 'Percent'
```

---

## A-E2 — CheckInPage.jsx: add roomDiscountRs useMemo

**File:** `src/pages/pms/CheckInPage.jsx`
**After line 248** (after the `nightCount` useMemo — the one ending with `[form?.checkin, form?.checkout]`)

**Insert:**
```javascript
  // CR-407 Sub-scope A: resolve discount to ₹ before send (OD-407-01)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    if (ciRoomDiscountType === 'Percent') {
      return Math.floor(Number(form?.orderAmount || 0) * raw / 100);
    }
    return Math.floor(raw);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, form?.orderAmount]);
```

---

## A-E3 — CheckInPage.jsx: pass discount to pmsCheckIn()

**File:** `src/pages/pms/CheckInPage.jsx`
**Current block (lines ~328–332):**
```javascript
        // CR-380: ID documents
        idType,
        frontImage,
        backImage,
      });
```

**After (replace the closing `});` with):**
```javascript
        // CR-380: ID documents
        idType,
        frontImage,
        backImage,
        // CR-407 Sub-scope A: check-in room discount (OD-407-01: FE computes ₹)
        ...(roomDiscountRs > 0 ? {
          roomDiscount:      roomDiscountRs,
          roomDiscountType:  ciRoomDiscountType,
          roomDiscountValue: parseFloat(ciRoomDiscountAmt) || 0,
          roomDiscountReason: '',
        } : {}),
      });
```

---

## A-E4 — CheckInPage.jsx: add discount UI in form

**File:** `src/pages/pms/CheckInPage.jsx`
**After the "Advance Payment" row** — find the `data-testid="ci-advance"` input block and insert directly after its closing `</div>` tag.

**Insert after the advance payment method picker block:**
```jsx
                    {/* CR-407 Sub-scope A: check-in room discount */}
                    <div className="mt-3">
                      <label className="text-[12px] text-[#888] mb-1 block">Room Discount (optional)</label>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-md border border-[#E5E5E5] overflow-hidden text-[11px]">
                          {['Amount', 'Percent'].map(t => (
                            <button
                              key={t} type="button"
                              data-testid={`ci-discount-type-${t.toLowerCase()}`}
                              onClick={() => { setCiRoomDiscountType(t); setCiRoomDiscountAmt(''); }}
                              className={`px-2 py-1 ${ciRoomDiscountType === t ? 'bg-[#329937] text-white' : 'bg-white text-[#555]'}`}
                            >{t === 'Amount' ? '₹' : '%'}</button>
                          ))}
                        </div>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-2 text-[12px] text-[#888]">
                            {ciRoomDiscountType === 'Amount' ? '₹' : '%'}
                          </span>
                          <input
                            type="number" min="0"
                            max={ciRoomDiscountType === 'Percent' ? 100 : form?.orderAmount || undefined}
                            placeholder="0"
                            value={ciRoomDiscountAmt}
                            onChange={e => setCiRoomDiscountAmt(e.target.value)}
                            onWheel={e => e.target.blur()}
                            data-testid="ci-room-discount-input"
                            className="w-full pl-6 pr-2 py-1.5 border border-[#E5E5E5] rounded-md text-[12px]"
                          />
                        </div>
                        {roomDiscountRs > 0 && (
                          <span className="text-[11px] text-[#329937] font-medium" data-testid="ci-room-discount-rs">
                            −₹{roomDiscountRs}
                          </span>
                        )}
                      </div>
                    </div>
```

---

## A-E5 — pmsService.js: append discount fields to FormData

**File:** `src/api/services/pmsService.js`
**Current (lines 280–283):**
```javascript
  // ── Corporate (CR-379) ────────────────────────────────────────────────────
  fd.append('firm_name',       p.firmName ?? '');
  fd.append('firm_gst',        p.firmGst  ?? '');

  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, fd, {
```

**After (replace with):**
```javascript
  // ── Corporate (CR-379) ────────────────────────────────────────────────────
  fd.append('firm_name',       p.firmName ?? '');
  fd.append('firm_gst',        p.firmGst  ?? '');

  // ── Room discount at check-in (CR-407 Sub-scope A) ─────────────────────────
  if ((p.roomDiscount ?? 0) > 0) {
    fd.append('room_discount',        String(p.roomDiscount));
    fd.append('room_discount_type',   p.roomDiscountType   ?? 'Amount');
    fd.append('room_discount_value',  String(p.roomDiscountValue ?? p.roomDiscount));
    fd.append('room_discount_reason', p.roomDiscountReason ?? '');
  }

  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, fd, {
```

---

# SUB-SCOPE B — Checkout apply_to expansion + Percent type

## B-E1 — FolioCheckoutPanel.jsx: add 2 new state variables

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Current (lines 116–117):**
```javascript
  const [roomDiscount, setRoomDiscount] = useState(0);
  const [roomDiscountReason, setRoomDiscountReason] = useState('');
```

**After:**
```javascript
  const [roomDiscount, setRoomDiscount] = useState(0);
  const [roomDiscountReason, setRoomDiscountReason] = useState('');
  // CR-407 Sub-scope B: apply_to selector + Percent type
  const [roomDiscountType, setRoomDiscountType] = useState('Amount'); // 'Amount' | 'Percent'
  const [roomApplyTo, setRoomApplyTo]           = useState('room');   // 'room' | 'both' | 'food'
```

---

## B-E2 — FolioCheckoutPanel.jsx: update RoomSection props signature

**Current (line 39):**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason }) => { // CR-385 M6 · BUG-418 · CR-405-A
```

**After:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B
```

---

## B-E3 — FolioCheckoutPanel.jsx: update RoomSection JSX — add apply_to selector + Percent toggle

**Current (lines 58–73 — the room discount div block):**
```jsx
          <div className="py-0.5">
            <div className="flex justify-between text-[#767676]">
              <span>Room discount</span>
              {roomDiscount > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomDiscount)}</span>}
            </div>
            <div className="flex gap-1 mt-0.5">
              <input
                type="number" min="0" placeholder="₹ amount"
                value={roomDiscount || ''}
                onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-24 h-6 border border-[#E5E5E5] rounded px-1 text-[11px] text-[#1A1A1A]"
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
          </div>
```

**After:**
```jsx
          {/* CR-407 Sub-scope B: apply_to selector + Amount/Percent toggle */}
          <div className="py-0.5">
            <div className="flex justify-between text-[#767676] mb-0.5">
              <span>Room discount</span>
              {roomDiscount > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}</span>}
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
                <input
                  type="number" min="0" max={roomDiscountType === 'Percent' ? 100 : undefined}
                  placeholder={roomDiscountType === 'Amount' ? '₹ amount' : '% off'}
                  value={roomDiscount || ''}
                  onChange={e => setRoomDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
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
            )}
          </div>
```

---

## B-E4 — FolioCheckoutPanel.jsx: update Statement props

**Current (line 85):**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason }) => {
```
**After:**
```javascript
const Statement = ({ row, folio, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo }) => {
```

**Current (lines 93–95 — RoomSection call inside Statement):**
```jsx
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
```
**After:**
```jsx
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
```

---

## B-E5 — FolioCheckoutPanel.jsx: update handlePaid inject block

**Current (lines 145–152):**
```javascript
      // CR-405-A: room discount at checkout (handover_5 §4.4) — apply_to='room' cuts UID balance
      if (roomDiscount > 0) {
        payload.room_discount          = roomDiscount;
        payload.room_discount_apply_to = 'room';
        payload.room_discount_type     = 'Amount';
        payload.room_discount_value    = roomDiscount;
        payload.room_discount_reason   = roomDiscountReason || null;
      }
```

**After:**
```javascript
      // CR-405-A + CR-407-B: room discount at checkout — apply_to + Percent type expansion
      if (roomDiscount > 0 && roomApplyTo !== 'food') {
        // OD-407-01: Percent → FE computes ₹ from row balance_due
        const balanceDue = order.roomInfo?.balancePayment ?? 0;
        const roomDiscountRs = roomDiscountType === 'Percent'
          ? Math.floor(balanceDue * roomDiscount / 100)
          : roomDiscount;
        payload.room_discount          = roomDiscountRs;
        payload.room_discount_apply_to = roomApplyTo;           // 'room' | 'both'
        payload.room_discount_type     = roomDiscountType;       // 'Amount' | 'Percent'
        payload.room_discount_value    = roomDiscount;           // raw input for audit
        payload.room_discount_reason   = roomDiscountReason || null;
      }
```

---

## B-E6 — FolioCheckoutPanel.jsx: update handlePaid deps + Statement call

**Current (line 159):**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason]);
```
**After:**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo]);
```

**Current (lines 180–181 — Statement call in return):**
```jsx
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
```
**After:**
```jsx
              roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
              roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
              roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
              roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
```

---

# SUB-SCOPE C — partial_payments_room

## C-E1 — FolioCheckoutPanel.jsx: add 2 state variables

**After line 119** (after `const [roomApplyTo, setRoomApplyTo] = useState('room');` from B-E1):
```javascript
  // CR-407 Sub-scope C: room payment split
  const [roomSplitEnabled, setRoomSplitEnabled] = useState(false);
  const [roomSplitLegs, setRoomSplitLegs]       = useState([{ mode: 'cash', amount: '' }, { mode: 'upi', amount: '' }]);
```

---

## C-E2 — FolioCheckoutPanel.jsx: add room split UI in RoomSection

**File:** `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**After the discount div block (after the last `</div>` of the discount section, before `<Line label="SGST"`):**

Add new props to RoomSection: `roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs`

**Insert before `<Line label="SGST"` line:**
```jsx
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

Update RoomSection props: add `roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs`.
Update Statement → RoomSection call: pass through the 4 new props.
Update Statement props signature: add same 4 props.
Update FolioCheckoutPanel main return → Statement call: pass `roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs`.

---

## C-E3 — FolioCheckoutPanel.jsx: inject partial_payments_room in handlePaid

**After the room_discount block (after B-E5), still inside handlePaid try block:**
```javascript
      // CR-407 Sub-scope C: partial_payments_room — room-rent split legs
      if (roomSplitEnabled) {
        const positiveLegs = roomSplitLegs.filter(l => parseFloat(l.amount) > 0);
        if (positiveLegs.length > 0) {
          payload.partial_payments_room = positiveLegs.map(l => ({
            payment_mode:   l.mode,
            payment_amount: parseFloat(l.amount),
          }));
        }
      }
```

**Update handlePaid deps (line 159 — already extended in B-E6; add new deps):**
```javascript
  }, [order, row.orderId, row.roomNo, paying, settings?.autoBill, user?.employeeId, restaurant?.name, onDone, roomDiscount, roomDiscountReason, roomDiscountType, roomApplyTo, roomSplitEnabled, roomSplitLegs]);
```

---

## Verification Matrix

| # | Edit | Check | Method | Auto? |
|---|------|-------|--------|:---:|
| V-A1 | A-E1 | `ciRoomDiscountAmt` + `ciRoomDiscountType` state in CheckInPage | grep | YES |
| V-A2 | A-E2 | `roomDiscountRs` useMemo in CheckInPage | grep | YES |
| V-A3 | A-E3 | `roomDiscount`, `roomDiscountType` in pmsCheckIn() call | grep | YES |
| V-A4 | A-E4 | `ci-room-discount-input` testid present | grep | YES |
| V-A5 | A-E5 | `fd.append('room_discount',...)` in pmsService conditional | grep | YES |
| V-A6 | A-E5 | `room_discount` NOT appended when `p.roomDiscount === 0` | Code confirm | YES |
| V-B1 | B-E1 | `roomDiscountType` + `roomApplyTo` state in FolioCheckoutPanel | grep | YES |
| V-B2 | B-E3 | `bill-apply-to-room/both/food` testids present | grep | YES |
| V-B3 | B-E3 | `bill-discount-type-amount/percent` testids present | grep | YES |
| V-B4 | B-E5 | `Percent` branch: `roomDiscountRs = floor(balance × pct/100)` | Code confirm | YES |
| V-B5 | B-E5 | `apply_to='food'` skips room_discount injection | Code confirm | YES |
| V-B6 | B-E6 | handlePaid deps includes `roomDiscountType` + `roomApplyTo` | grep | YES |
| V-C1 | C-E1 | `roomSplitEnabled` + `roomSplitLegs` state present | grep | YES |
| V-C2 | C-E2 | `bill-room-split-toggle` testid present | grep | YES |
| V-C3 | C-E2 | `bill-room-split-mode-0/1` + `bill-room-split-amount-0/1` testids | grep | YES |
| V-C4 | C-E3 | `partial_payments_room` injected only when `roomSplitEnabled && positiveLegs>0` | Code confirm | YES |
| V-C5 | C-E3 | Zero-amount legs filtered out before send | Code confirm | YES |
| V-7 | All | yarn build exit 0, 0 new warnings | build | YES |
| V-8 | A | Check-in with ₹ discount → UI shows −₹ badge | Browser | NO |
| V-9 | A | Check-in with % discount → roomDiscountRs = floor(room×pct/100) | Browser | NO |
| V-10 | B | apply_to='both' sends room_discount + apply_to='both' | Network tab | NO |
| V-11 | B | apply_to='food' → no room_discount in payload | Network tab | NO |
| V-12 | C | Split ON + 2 legs → partial_payments_room[0]+[1] in payload | Network tab | NO |
| V-13 | C | Split OFF → no partial_payments_room in payload | Network tab | NO |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-407 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
- [ ] CR_REGISTRY.md: row CR-407 updated with GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx / pmsService.js / FolioCheckoutPanel.jsx — CR-407 + date
- [ ] Code markers: // CR-407-A in CheckInPage + pmsService; // CR-407-B in FolioCheckoutPanel; // CR-407-C in FolioCheckoutPanel
- [ ] Compile check: yarn build exit 0
```

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| R1: Percent calc on zero balance | `balanceDue = order.roomInfo?.balancePayment ?? 0`; `Math.floor(0 × pct/100) = 0` → guard `if (roomDiscountRs > 0)` catches this |
| R2: BE 422 when apply_to='both' + room_discount=0 | Guard: `if (roomDiscount > 0 && roomApplyTo !== 'food')` — only injects when there is a real amount |
| R3: CheckInPage conflict with BUG-419/420 | Step 0 Entry Verification: implementation agent re-confirms line numbers before editing |
| R4: FolioCheckoutPanel R5 hotspot | Changes are purely additive; existing CR-405-A block is REPLACED not wrapped (B-E5 replaces the 8 lines) |
| R5: partial_payments_room sum mismatch | FE responsibility: UI shows sum; BE does not 422 on _room sum mismatch (confirmed in investigation) |
