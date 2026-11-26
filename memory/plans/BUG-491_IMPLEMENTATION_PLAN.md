# BUG-491 — Implementation Plan (Gate 3)

**ID:** BUG-491
**Title:** In-House Balance + Discount Display: 4-issue batch (Sub-A pmsService formula / Sub-B static balance_due / Sub-C Percent badge / Sub-D info note)
**Date:** 2026-10-05
**Role:** PLANNING (Gate 3)
**IA verified:** Gate 2 anchors re-confirmed against live code this session — all match.
**Code Reality:** NONE
**Risk:** HIGH

---

## Scope Lock

**Files WILL change (8 edit sites):**
- `src/api/services/pmsService.js` — E1 (L103-108 Sub-A balance formula)
- `src/components/pms/frontdesk/CheckInForm.jsx` — E2 (L163 Sub-B balance display)
- `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` — E3 (new useMemo in RoomSection), E4 (L57 badge), E5 (L137 balance line), E6 (new Sub-D info useMemo in main component), E7 (new Sub-D info JSX in bill-right div), and React import update (E0)

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` (R5 hotspot) — `total` prop intentionally unchanged per OD-491-D-01 Option B
- `orderTransform.js`, `DashboardPage.jsx` (R5 hotspots)
- `InHouseGuestsPage.jsx`, `frontDeskService.js`, `folioTransform.js`

---

## Execution Sequence

```
1. pmsService.js       — E1 (Sub-A, independent)
2. CheckInForm.jsx     — E2 (Sub-B, independent; but ensure BUG-490 E1 is done first
                          so roomDiscountRs in scope is properly capped)
3. FolioCheckoutPanel.jsx — E0 → E3 → E4 → E5 → E6 → E7 (in this strict order, one pass)
   E0: add useMemo to React import
   E3: add roomDiscountRs useMemo inside RoomSection (Sub-C — E4+E5 depend on it)
   E4: fix badge line 57 (Sub-C — depends on E3)
   E5: fix balance line 137 (Sub-B — depends on E3)
   E6: add roomDiscountInfoRs useMemo in main component (Sub-D)
   E7: add info note JSX in bill-right (Sub-D — depends on E6)
```

**Cross-item note:** BUG-490 E6 (max L80) and E7 (onChange L83) ALSO touch FolioCheckoutPanel. Do them in the same pass, immediately after BUG-491's edits to this file.

---

## Edit E0 — `FolioCheckoutPanel.jsx` — Add `useMemo` to React import

**Line:** 5

**Current:**
```javascript
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
```

**New:**
```javascript
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
```

**Self-test:** Webpack compiles without "useMemo is not defined" error. ✓

---

## Edit E1 — `pmsService.js` — Sub-A: balance formula using `balance_payment` + chargeGst

**Lines:** 103–108

**Current:**
```javascript
        const ri = raw.room_info ?? {};
        const rp = Number(ri.room_price      ?? 0);
        const gt = Number(ri.gst_tax         ?? 0);
        const ap = Number(ri.advance_payment ?? 0);
        const rb = Number(ri.receive_balance ?? 0);
        const roomBalance = Math.max(0, rp + gt - ap - rb);
```

**New:**
```javascript
        const ri = raw.room_info ?? {};
        const rp = Number(ri.room_price      ?? 0);
        const gt = Number(ri.gst_tax         ?? 0);
        const ap = Number(ri.advance_payment ?? 0);
        const rb = Number(ri.receive_balance ?? 0);
        // BUG-491 Sub-A: ri.gst_tax is absent from room_info; use backend pre-computed balance_payment
        // (includes discount deduction) + charge-level GST from booking snapshot
        const bp        = ri.balance_payment != null ? Number(ri.balance_payment) : null;
        const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
        const roomBalance = bp != null
          ? Math.max(0, bp + chargeGst)
          : Math.max(0, rp + gt - ap - rb - Number(ri.room_discount_amount ?? 0));
```

**Note:** `row` is the loop variable from `rows.forEach(row => { ... })` at line 99 — in scope. `row.charge` is the reservation charge object from the API join. `row.charge?.sgst ?? 0` is safe (defaults to 0 when absent — non-GST restaurants unaffected).

**Self-test (order 1232970):**
- `bp = 2665`, `chargeGst = 335 (sgst 167.50 + cgst 167.50)`
- `roomBalance = Math.max(0, 2665 + 335) = 3000` ✅ (was 5345)

**Regression (no-discount order):**
- `ri.balance_payment = ri.room_price - ri.advance_payment` (backend pre-computes)
- No discount: `bp = room_price - advance`, `roomBalance = bp + chargeGst` — correct ✓

---

## Edit E2 — `CheckInForm.jsx` — Sub-B: reactive balance_due display

**Line:** 163

**Current:**
```jsx
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(c.balance_due)}</span>
```

**New:**
```jsx
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}</span>
```

**Note:** `roomDiscountRs` is in scope at line 163 (defined at lines 57-65). After BUG-490 E1 is applied, `roomDiscountRs` is already capped at `c.balance_due`, so `Math.max(0, c.balance_due - roomDiscountRs)` will never go negative. ✓

**Self-test:** Enter 40% discount → "Balance due" updates live. Enter 100% → "Balance due" shows ₹0. ✓

---

## Edit E3 — `FolioCheckoutPanel.jsx` — Sub-C: add `roomDiscountRs` useMemo inside RoomSection

**Insert location:** Inside `RoomSection`, after the `const [open, setOpen] = useState(true);` line (currently L41), before the `return (`.

**Current:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C
  const c = row.charge ?? {};
  const [open, setOpen] = useState(true);
  return (
```

**New:**
```javascript
const RoomSection = ({ row, upgrade, roomDiscount, setRoomDiscount, roomDiscountReason, setRoomDiscountReason, roomDiscountType, setRoomDiscountType, roomApplyTo, setRoomApplyTo, roomSplitEnabled, setRoomSplitEnabled, roomSplitLegs, setRoomSplitLegs }) => { // CR-385 M6 · BUG-418 · CR-405-A · CR-407-B · CR-407-C
  const c = row.charge ?? {};
  const [open, setOpen] = useState(true);
  // BUG-491 Sub-C: compute discount ₹ for badge + balance display; BUG-490 cap absorbed
  const roomDiscountRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food') return 0;
    const balanceDue = Number(c.balance_due || 0);
    if (roomDiscountType === 'Percent') {
      return Math.min(Math.floor(balanceDue * roomDiscount / 100), balanceDue);
    }
    return Math.min(Math.floor(Number(roomDiscount)), balanceDue);
  }, [roomDiscount, roomDiscountType, roomApplyTo, c.balance_due]);
  return (
```

**Self-test:** Percent mode 10% with balance_due=5680 → `Math.floor(5680 × 10/100) = 568`. Amount mode 500 with balance_due=5680 → 500. Amount 9999 with balance_due=5680 → 5680. ✓

---

## Edit E4 — `FolioCheckoutPanel.jsx` — Sub-C: fix badge to use `roomDiscountRs`

**Line:** 57 (inside RoomSection, now after E3 insert; match on content)

**Current:**
```jsx
              {roomDiscount > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscount : 0)}</span>}
```

**New:**
```jsx
              {roomDiscountRs > 0 && <span className="tabular-nums font-medium text-[#329937]" data-testid="bill-room-discount-applied">−{fmtINR(roomApplyTo === 'room' || roomApplyTo === 'both' ? roomDiscountRs : 0)}</span>}
```

**Self-test:** Percent mode 10% → badge shows −₹568 (not −₹10). Amount mode 500 → badge shows −₹500. ✓

---

## Edit E5 — `FolioCheckoutPanel.jsx` — Sub-B: fix balance line to use `roomDiscountRs`

**Line:** 137 (inside RoomSection; match on content)

**Current:**
```jsx
          <Line label="Room balance" value={fmtINR(c.balance_due)} testId="bill-room-balance" bold />
```

**New:**
```jsx
          <Line label="Room balance" value={fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))} testId="bill-room-balance" bold />
```

**Self-test:** Enter 10% discount → "Room balance" updates from ₹5,680 to ₹5,112. Enter 100% → ₹0. ✓

---

## Edit E6 — `FolioCheckoutPanel.jsx` — Sub-D: add `roomDiscountInfoRs` useMemo in main component

**Insert location:** In `FolioCheckoutPanel` main export (line 170+), after the existing state declarations block (after the `roomSplitLegs` state at line 186), before `const stop = (e) =>`.

**Current:**
```javascript
  const [roomSplitEnabled, setRoomSplitEnabled] = useState(false);
  const [roomSplitLegs, setRoomSplitLegs]       = useState([{ mode: 'cash', amount: '' }, { mode: 'upi', amount: '' }]);
  const stop = (e) => e.stopPropagation();
```

**New:**
```javascript
  const [roomSplitEnabled, setRoomSplitEnabled] = useState(false);
  const [roomSplitLegs, setRoomSplitLegs]       = useState([{ mode: 'cash', amount: '' }, { mode: 'upi', amount: '' }]);
  // BUG-491 Sub-D: compute room discount ₹ for info note in right panel (OD-491-D-01 Option B)
  const roomDiscountInfoRs = useMemo(() => {
    if (!roomDiscount || roomApplyTo === 'food') return 0;
    const bd = Number(row.charge?.balance_due || 0);
    if (!bd) return 0;
    return roomDiscountType === 'Percent'
      ? Math.min(Math.floor(bd * roomDiscount / 100), bd)
      : Math.min(Math.floor(Number(roomDiscount)), bd);
  }, [roomDiscount, roomDiscountType, roomApplyTo, row.charge?.balance_due]);
  const stop = (e) => e.stopPropagation();
```

**Note:** `row` is a prop of `FolioCheckoutPanel` (line 170). `row.charge?.balance_due` is safe. `roomDiscount`, `roomDiscountType`, `roomApplyTo` are all state vars in scope.

---

## Edit E7 — `FolioCheckoutPanel.jsx` — Sub-D: info note JSX in bill-right div

**Insert location:** Inside the `<div ... data-testid="bill-right">` div, immediately before the `<Suspense>` wrapping CollectPaymentPanel.

**Current:**
```jsx
          <div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]${tabPrefilled(billCustomer(order, row)) ? ' fd-bill-tab-prefilled' : ''}`} data-testid="bill-right"> {/* CR-385 BUG-448 / OD-385-21 */}
            <Suspense fallback={<div className="flex items-center gap-2 p-4 text-[12px] text-[#767676]" data-testid="bill-panel-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading payment panel…</div>}>
```

**New:**
```jsx
          <div className={`frontdesk-bill bill-right rounded-xl border border-[#E5E5E5]${tabPrefilled(billCustomer(order, row)) ? ' fd-bill-tab-prefilled' : ''}`} data-testid="bill-right"> {/* CR-385 BUG-448 / OD-385-21 */}
            {/* BUG-491 Sub-D: room discount info note (OD-491-D-01 Option B — total unchanged) */}
            {roomDiscountInfoRs > 0 && (
              <div className="text-[11px] text-[#329937] px-3 pt-2 pb-1 border-b border-[#E5E5E5]" data-testid="bill-room-discount-info">
                Room discount applied: −{fmtINR(roomDiscountInfoRs)}
              </div>
            )}
            <Suspense fallback={<div className="flex items-center gap-2 p-4 text-[12px] text-[#767676]" data-testid="bill-panel-loading"><Loader2 className="w-4 h-4 animate-spin" /> Loading payment panel…</div>}>
```

**Self-test:** Enter 10% discount → green info note appears at top of right panel: "Room discount applied: −₹568". CollectPaymentPanel total stays at ₹5,680 (unchanged). ✓

---

## Verification Matrix

| Edit # | File | Sub | Change | How to Verify | Automated? |
|--------|------|-----|--------|---------------|:---:|
| E0 | FolioCheckoutPanel.jsx L5 | — | Add `useMemo` to React import | Webpack compiles, no useMemo reference error | YES (compile) |
| E1 | pmsService.js L103-108 | A | Replace formula with `bp + chargeGst` | In-house table: order 1232970 BALANCE = ₹3,000 (was ₹5,345) | NO (needs live data) |
| E1b | pmsService.js | A | Fallback when `bp == null` | No-discount orders: BALANCE column unchanged | NO |
| E2 | CheckInForm.jsx L163 | B | `Math.max(0, balance_due - roomDiscountRs)` | FD v2 Check-In form: enter discount → Balance due updates | NO |
| E3 | FolioCheckoutPanel.jsx (new in RoomSection) | C | `roomDiscountRs` useMemo | Percent 10% with balance_due=5680 → roomDiscountRs=568 | NO |
| E4 | FolioCheckoutPanel.jsx L57 | C | Badge uses `roomDiscountRs` | Checkout Bill: 10% → badge shows −₹568 not −₹10 | NO |
| E5 | FolioCheckoutPanel.jsx L137 | B | Balance line uses `roomDiscountRs` | Checkout Bill: enter discount → "Room balance" live-updates | NO |
| E6 | FolioCheckoutPanel.jsx (new in main) | D | `roomDiscountInfoRs` useMemo | Enter discount → useMemo returns correct ₹ | NO |
| E7 | FolioCheckoutPanel.jsx (new JSX) | D | Info note in bill-right | Checkout Bill: discount entered → info note visible in right panel | NO |
| E7b | FolioCheckoutPanel.jsx | D | `total` prop on CollectPaymentPanel unchanged | Right panel total still shows pre-discount amount | NO |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| E1 regression on no-discount orders: `bp` always present, `chargeGst` may be 0 | LOW | `bp + 0 = bp`; fallback branch handles `bp == null` (very old orders pre-discount feature) |
| E1 regression on non-GST restaurant: chargeGst=0 | NONE | `bp + 0 = bp` — correct |
| E3 `roomDiscountRs` in RoomSection needs `useMemo` import | MANAGED | E0 adds useMemo to import |
| E5 shows ₹0 when 100% discount | CORRECT BEHAVIOR | `Math.max(0, balance_due - balance_due) = 0` |
| E7 info note inside CollectPaymentPanel Suspense boundary? | NOT AN ISSUE | Info note is BEFORE the Suspense block |
| FolioCheckoutPanel combined pass (BUG-491 + BUG-490) | MANAGED | Strict sequence E0→E3→E4→E5→E6→E7→BUG490.E6→BUG490.E7 |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-491 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-491 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: pmsService.js + CheckInForm.jsx + FolioCheckoutPanel.jsx with BUG-491 + date
- [ ] Code markers: // BUG-491 Sub-A/B/C/D comment at every modified site (8 sites + import)
```
