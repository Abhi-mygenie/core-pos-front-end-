# BUG-517 — IMPLEMENTATION PLAN (Gate 3)

**ID:** BUG-517
**Date:** 2026-10-08
**Agent:** PLANNING (Gate 3)
**Risk:** CRITICAL (R6 — financial formula)
**ODs:** OD-517-01 LOCKED — `maxCheckoutDiscount = baseBalance − floor(advance_paid × gst_rate)`
**Awaiting:** Gate 4 GO before any code change
**Execution order:** BUG-517 FIRST (introduces `maxCheckoutDiscount`) → BUG-518 builds on it

---

## Scope Lock

**Files WILL change:**
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — 9 edits (E-517-1 through E-517-9)

**Files will NOT touch:**
- `folioTransform.js` · `pmsService.js` · `frontDeskService.js`
- `CollectPaymentPanel.jsx` (R5) · `orderTransform.js` (R5) · any other file

---

## Conflict Pre-Check

| File | Last modifier | Open items | Conflict? |
|---|---|---|---|
| `FolioCheckoutPanel.jsx` | BUG-498/499 (2026-10-06) | BUG-518 (planned after), BUG-519 (planned after) | NONE — BUG-518 is planned to execute after BUG-517; BUG-519 after both |

---

## Code Reality: PARTIAL

Existing formula uses `baseBalance` as cap and % base throughout. New formula requires deriving `gst_rate` and computing `maxCheckoutDiscount = baseBalance − floor(advance × gst_rate)`.

---

## Entry Verification (MANDATORY before coding)

```bash
# E-517-1 anchor: baseBalance useMemo
grep -n "const { baseBalance, displaySgst, displayCgst } = useMemo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 238

# E-517-2 anchor: RoomSection signature
grep -n "const RoomSection = ({" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 40

# E-517-3 anchor: RoomSection roomDiscountRs useMemo
grep -n "const roomDiscountRs = useMemo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 44

# E-517-4 anchor: RoomSection maxPct useMemo
grep -n "const maxPct = useMemo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 52

# E-517-5 anchor: parent roomDiscountInfoRs useMemo
grep -n "const roomDiscountInfoRs = useMemo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 258

# E-517-6 anchor: parent discountOverMax useMemo
grep -n "const discountOverMax = useMemo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 266

# E-517-7 anchor: handlePaid roomHalfRs
grep -n "const roomHalfRs = roomApplyTo" \
  /app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx
# Must: line 311
```

---

## Edit E-517-1 — Parent useMemo L238-256: add `maxCheckoutDiscount`

**Current:**
```js
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

**New:**
```js
  const { baseBalance, displaySgst, displayCgst, maxCheckoutDiscount } = useMemo(() => { // BUG-517
    const bp          = order?.roomInfo?.balancePayment ?? null;
    const discountAmt = Number(order?.roomInfo?.discountAmount || 0);
    const bc          = Number(row.charge?.booking_charge || 0);
    const nights      = Number(row.charge?.nights || 1);
    const advance     = Number(row.charge?.advance_payment || 0);                // BUG-517: advance paid so far
    const { roomGstApplicable = false, roomGstSlabs = null } = restaurant?.checkInFlags || {};
    if (bp === null) return { baseBalance: null, displaySgst: null, displayCgst: null, maxCheckoutDiscount: null }; // BUG-517
    const discountedPrice = Math.max(0, bc - discountAmt);
    const gst = (roomGstApplicable && discountedPrice > 0)
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
      : { gstTotal: 0, sgst: 0, cgst: 0 };
    const base = bp === 0 ? 0 : Math.max(0, bp + gst.gstTotal);
    // BUG-517 OD-517-01: gstRate = GST / (discountedPrice × nights); advance × gstRate = GST on paid advances
    const gstRate = (roomGstApplicable && discountedPrice > 0 && nights > 0)
      ? gst.gstTotal / (discountedPrice * nights) : 0;                          // BUG-517
    const maxCheckout = Math.max(0, base - Math.floor(advance * gstRate));       // BUG-517: bonk: 600 - floor(1500×0.05) = 525
    return {
      baseBalance: base,
      displaySgst: base === 0 ? 0 : gst.sgst,
      displayCgst: base === 0 ? 0 : gst.cgst,
      maxCheckoutDiscount: maxCheckout,                                          // BUG-517
    };
  }, [order?.roomInfo?.balancePayment, order?.roomInfo?.discountAmount,
      row.charge?.booking_charge, row.charge?.nights, row.charge?.advance_payment, // BUG-517 +advance_payment
      restaurant?.checkInFlags]);
```

---

## Edit E-517-2 — RoomSection signature L40: add `maxCheckoutDiscount` prop

**Current (start of signature):**
```js
const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null }) => {
```

**New (add `maxCheckoutDiscount = null`):**
```js
const RoomSection = ({ row, checkInDiscountAmt = 0, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance = null, displaySgst = null, displayCgst = null, maxCheckoutDiscount = null }) => { // BUG-517
```

---

## Edit E-517-3 — RoomSection `roomDiscountRs` L44-50: correct % base + cap

**Current:**
```js
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
```

**New:**
```js
  const roomDiscountRs = useMemo(() => { // BUG-517: % uses bc (not baseBalance); cap = maxCheckoutDiscount
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance;
    const bc = Number(c.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0; // BUG-517: bc base
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);                    // BUG-517: maxCap
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance, maxCheckoutDiscount, c.booking_charge]);
```

---

## Edit E-517-4 — RoomSection `maxPct` L52-57: base on `maxCheckoutDiscount`

**Current:**
```js
  const maxPct = useMemo(() => {
    if (baseBalance === null) return 0;
    const bc = Number(c.booking_charge || 0);
    if (!bc || baseBalance <= 0) return 0;
    return Math.floor(Math.min(baseBalance, bc) / bc * 100);
  }, [baseBalance, c.booking_charge]);
```

**New:**
```js
  const maxPct = useMemo(() => { // BUG-517: floor(maxCheckoutDiscount/bc×100); bonk: floor(525/3000×100)=17
    const maxCap = maxCheckoutDiscount ?? baseBalance;
    if (maxCap === null || maxCap <= 0) return 0;
    const bc = Number(c.booking_charge || 0);
    if (!bc) return 0;
    return Math.floor(maxCap / bc * 100);                                         // BUG-517
  }, [maxCheckoutDiscount, baseBalance, c.booking_charge]);
```

---

## Edit E-517-5 — RoomSection input max + onChange L102-105: use `maxCheckoutDiscount`

**Current:**
```js
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0)) || undefined}
```
```js
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (baseBalance ?? Number(c.balance_due || 0))))}
```

**New:**
```js
                  type="number" min="0" max={roomDiscountType === 'Percent' ? maxPct : ((maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0)) || undefined)} {/* BUG-517 */}
```
```js
                  onChange={e => setRoomDiscount(Math.min(Math.max(0, parseFloat(e.target.value) || 0), roomDiscountType === 'Percent' ? maxPct : (maxCheckoutDiscount ?? baseBalance ?? Number(c.balance_due || 0))))} {/* BUG-517 */}
```

---

## Edit E-517-6 — RoomSection alert text L120: show `maxCheckoutDiscount` amount

**Current:**
```js
                  Maximum discount: {maxPct}% (₹{Math.floor((baseBalance ?? 0) * maxPct / 100)}). Entering above {maxPct}% has no additional effect.{/* BUG-498 */}
```

**New:**
```js
                  Maximum discount: {maxPct}% (≈ ₹{Math.min(Math.floor(Number(c.booking_charge || 0) * maxPct / 100), maxCheckoutDiscount ?? 0)}) or ₹{maxCheckoutDiscount ?? 0} flat. Reduce to {maxPct}% or use Amount mode.{/* BUG-517 */}
```

---

## Edit E-517-7 — Parent `roomDiscountInfoRs` L258-264: correct % base + cap

**Current:**
```js
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food' || baseBalance === null) return 0;
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(baseBalance * roomDiscount / 100), baseBalance);
    }
    return Math.min(Math.floor(Number(roomDiscount)), baseBalance);
  }, [roomDiscount, roomDiscountType, roomApplyTo, baseBalance]);
```

**New:**
```js
  const roomDiscountInfoRs = useMemo(() => { // BUG-517: % uses bc; cap = maxCheckoutDiscount
    if (!roomDiscount || roomApplyTo === 'food' || maxCheckoutDiscount === null) return 0;
    const maxCap = maxCheckoutDiscount ?? baseBalance ?? 0;
    const bc = Number(row.charge?.booking_charge || 0);
    if (roomDiscountType === 'Percent') {
      return bc > 0 ? Math.min(Math.floor(bc * roomDiscount / 100), maxCap) : 0; // BUG-517
    }
    return Math.min(Math.floor(Number(roomDiscount)), maxCap);                    // BUG-517
  }, [roomDiscount, roomDiscountType, roomApplyTo, maxCheckoutDiscount, baseBalance, row.charge?.booking_charge]);
```

---

## Edit E-517-8 — Parent `discountOverMax` L266-273: use `maxCheckoutDiscount`

**Current:**
```js
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    if (baseBalance === null) return false;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || baseBalance <= 0) return false;
    const maxPctParent = Math.floor(Math.min(baseBalance, bc) / bc * 100);
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, baseBalance, row.charge?.booking_charge]);
```

**New:**
```js
  const discountOverMax = useMemo(() => { // BUG-517: use maxCheckoutDiscount
    if (roomDiscountType !== 'Percent') return false;
    if (maxCheckoutDiscount === null) return false;
    const bc = Number(row.charge?.booking_charge || 0);
    if (!bc || maxCheckoutDiscount <= 0) return false;
    const maxPctParent = Math.floor(maxCheckoutDiscount / bc * 100);              // BUG-517
    return Number(roomDiscount) > maxPctParent;
  }, [roomDiscount, roomDiscountType, maxCheckoutDiscount, row.charge?.booking_charge]);
```

---

## Edit E-517-9 — Parent `handlePaid` roomHalfRs L311-314: fix 'both' Percent base

**Current:**
```js
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.floor(baseBalance * (roomDiscount / 2) / 100)
              : Math.floor(Number(roomDiscount) / 2))
          : roomDiscountInfoRs;
```

**New:**
```js
        const bc517 = Number(row.charge?.booking_charge || 0);                   // BUG-517
        const roomHalfRs = roomApplyTo === 'both'
          ? (roomDiscountType === 'Percent'
              ? Math.min(bc517 > 0 ? Math.floor(bc517 * (roomDiscount / 2) / 100) : 0, maxCheckoutDiscount ?? 0) // BUG-517: bc base + cap
              : Math.floor(Number(roomDiscount) / 2))                             // BUG-518 will add per-side cap here
          : roomDiscountInfoRs;
```

---

## Edit E-517-10 — RoomSection call site L182-190 + Statement L174: pass `maxCheckoutDiscount`

**Statement signature L174 — add `maxCheckoutDiscount = null`:**
```js
const Statement = ({ row, folio, checkInDiscountAmt = 0, foodDiscountRs = 0, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs, baseBalance, displaySgst, displayCgst, maxCheckoutDiscount = null }) => { // BUG-517
```

**RoomSection call inside Statement L182-190 — add `maxCheckoutDiscount={maxCheckoutDiscount}`:**
```jsx
      <RoomSection row={row} checkInDiscountAmt={checkInDiscountAmt} upgrade={upgrade}
        roomDiscount={roomDiscount} setRoomDiscount={setRoomDiscount}
        roomDiscountReason={roomDiscountReason} setRoomDiscountReason={setRoomDiscountReason}
        roomDiscountType={roomDiscountType} setRoomDiscountType={setRoomDiscountType}
        roomApplyTo={roomApplyTo} setRoomApplyTo={setRoomApplyTo}
        roomSplitEnabled={roomSplitEnabled} setRoomSplitEnabled={setRoomSplitEnabled}
        roomSplitLegs={roomSplitLegs} setRoomSplitLegs={setRoomSplitLegs}
        baseBalance={baseBalance} displaySgst={displaySgst} displayCgst={displayCgst}
        maxCheckoutDiscount={maxCheckoutDiscount} />{/* BUG-517 */}
```

**Statement JSX call in render L366-376 — add `maxCheckoutDiscount={maxCheckoutDiscount}`:**
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
              maxCheckoutDiscount={maxCheckoutDiscount} />{/* BUG-517 */}
```

---

## Execution Sequence

```
1. Entry verification (7 anchor checks)
2. E-517-1: parent useMemo (adds maxCheckoutDiscount + advance dep)
3. Compile check
4. E-517-2: RoomSection signature
5. E-517-3: RoomSection roomDiscountRs
6. E-517-4: RoomSection maxPct
7. E-517-5: input max + onChange
8. E-517-6: alert text
9. Compile check
10. E-517-7: parent roomDiscountInfoRs
11. E-517-8: parent discountOverMax
12. E-517-9: handlePaid roomHalfRs 'both' Percent
13. E-517-10: Statement signature + RoomSection call + Statement JSX call
14. Final compile check — 0 new warnings
15. EXIT GATE 5/5
```

---

## Verification Matrix

| # | Edit | Verification | Auto? |
|---|---|---|---|
| V-1 | E-517-1 maxCheckoutDiscount | `grep -n "maxCheckoutDiscount.*BUG-517" FolioCheckoutPanel.jsx` | YES |
| V-2 | E-517-1 advance dep | `grep -n "advance_payment.*BUG-517" FolioCheckoutPanel.jsx` | YES |
| V-3 | E-517-3 % base bc | `grep -n "bc \* roomDiscount.*BUG-517" FolioCheckoutPanel.jsx` | YES |
| V-4 | E-517-4 maxPct | `grep -n "maxCap / bc.*BUG-517" FolioCheckoutPanel.jsx` | YES |
| V-5 | E-517-7 roomDiscountInfoRs | `grep -n "Math.floor(bc \* roomDiscount.*BUG-517" FolioCheckoutPanel.jsx` | YES |
| V-6 | compile | webpack 0 new warnings | YES |
| V-7 | bonk maxCheckoutDiscount=525 | `console.log(maxCheckoutDiscount)` in useMemo = 525 | NO (browser) |
| V-8 | maxPct = 17 | UI shows maxPct=17 in alert message | NO (browser) |
| V-9 | Amount max = 525 | Input max attr = 525, can't enter 526 | NO (browser) |
| V-10 | 20% gives ~₹510 | At 20%, roomDiscountRs = floor(3000×20/100) = 600 → capped 525? No, min(600,525)=525 | NO (browser) |
| V-11 | 17% gives ₹510 | floor(3000×17/100)=510; no alert (510 ≤ 525) | NO (browser) |

**Note V-10:** At 20%, `min(floor(3000×20/100), 525) = min(600, 525) = 525`. maxPct=17 blocks entering 20% via alert.

---

## Risk Register

| Risk | Mitigation |
|---|---|
| `gstRate = 0` when roomGstApplicable=false → maxCheckoutDiscount = baseBalance | Guard: `gstRate = 0 when !roomGstApplicable` → `floor(advance × 0) = 0` → `maxCheckout = baseBalance − 0 = baseBalance`. Correct — no GST to protect. |
| `discountedPrice = 0` (bc=discountAmt) → gstRate = 0/0 | Guard: `discountedPrice > 0` check before computing gstRate |
| `maxCheckoutDiscount = null` (bp === null) → all formulas return 0 | All guards check `maxCheckoutDiscount === null` before computing |
| handlePaid `bc517` local variable name collision | Named `bc517` distinctly to avoid shadowing |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-517 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-517 row updated
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx — BUG-517, date
- [ ] Code markers: // BUG-517 on every modified line
- [ ] COMPILE CHECK: 0 new warnings
```
