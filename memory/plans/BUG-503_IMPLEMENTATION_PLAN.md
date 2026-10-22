# BUG-503 — Implementation Plan (Gate 3)

**Date:** 2026-10-07
**Author:** PLANNING agent
**Risk:** HIGH
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` ONLY
**Files WILL NOT touch:** CheckInPage.jsx · FolioCheckoutPanel.jsx · pmsService.js · any other file

**OD-503-01 → Agent-selected Option A** (useRestaurant hook inside CheckInForm — owner confirm at Gate 4 GO)
**OD-503-02 → Agent-selected Option A** (replace static SGST/CGST/Total with dynamic values — owner confirm at Gate 4 GO)

**MUST run BEFORE BUG-504 CheckInForm.jsx** (BUG-504 requires computeRoomGst + slab config added here)

---

## Entry Verification (Implementation agent must confirm before coding)

| Edit | File | Plan says | Check |
|------|------|-----------|-------|
| E1 | CheckInForm.jsx L10 | Last import: `import { fmtINR, fmtDate, fmtTime, plural, channelLabel } from './money';` | grep L10 |
| E2 | CheckInForm.jsx L23 | `export const CheckInForm = ({ row, meta, rooms, rules, onDone, onClose }) => {` | grep L23 |
| E3 | CheckInForm.jsx L24 | `const bd = meta?.business_date;` | view L24 |
| E4 | CheckInForm.jsx L69-75 | maxPct useMemo (floor formula) | view L69-75 |
| E5 | CheckInForm.jsx L173 | `{fmtINR(c.sgst)}` | view L173 |
| E6 | CheckInForm.jsx L174 | `{fmtINR(c.cgst)}` | view L174 |
| E7 | CheckInForm.jsx L175 | `{fmtINR(c.total_with_gst)}` | view L175 |
| E8 | CheckInForm.jsx L178 | `{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}` | view L178 |

---

## E1 — CheckInForm.jsx · Add imports (after L10)

**Current (L6-10):**
```javascript
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import GuestDocsSection from '@/components/pms/GuestDocsSection';
import { checkIn } from '@/api/services/frontDeskService';
import { fmtINR, fmtDate, fmtTime, plural, channelLabel } from './money';
```

**After:**
```javascript
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import GuestDocsSection from '@/components/pms/GuestDocsSection';
import { checkIn } from '@/api/services/frontDeskService';
import { fmtINR, fmtDate, fmtTime, plural, channelLabel } from './money';
import { useRestaurant } from '@/contexts'; // BUG-503: GST slab config (OD-503-01 Option A)
import { computeRoomGst } from '@/utils/roomGstCalculator'; // BUG-503
```

**2 lines added after L10.**

---

## E2 — CheckInForm.jsx · Add hook + formNights inside component body (after L24)

**Current (L23-25):**
```javascript
export const CheckInForm = ({ row, meta, rooms, rules, onDone, onClose }) => {
  const bd = meta?.business_date;
  const early = isEarly(row, bd);
```

**After:**
```javascript
export const CheckInForm = ({ row, meta, rooms, rules, onDone, onClose }) => {
  const bd = meta?.business_date;
  const early = isEarly(row, bd);
  // BUG-503: GST slab config (OD-503-01 Option A — hook, no prop change)
  const { restaurant } = useRestaurant();
  const { roomGstApplicable, roomGstSlabs } = restaurant?.checkInFlags ?? {};
  // BUG-503: nights from booking row (LR already has this; no date arithmetic needed)
  const formNights = row?.nights ?? 1;
```

**4 lines added. Component signature unchanged.**

---

## E3 — CheckInForm.jsx · Add displayGst useMemo (after existing maxPct useMemo at L75)

**Insert after the closing `}, [c.booking_charge, c.advance_payment]);` of maxPct useMemo:**

```javascript
  // BUG-503: live GST on discounted room price — updates as discount changes (OD-503-02 Option A)
  const { gstTotal: displayGstTotal, cgst: displayCgst, sgst: displaySgst } = useMemo(() => {
    const gstBase = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    return computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, formNights, 1);
  }, [c.booking_charge, roomDiscountRs, roomGstApplicable, roomGstSlabs, formNights]);
  // BUG-503: GST slab rate for live slab badge
  const displayGstRate = useMemo(() => {
    const gstBase = Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs);
    const nightlyUnit = gstBase / formNights;
    return roomGstSlabs?.slabs?.find(
      s => nightlyUnit >= (s.min ?? 0) && (s.max == null || nightlyUnit <= s.max)
    )?.gst_percent ?? 0;
  }, [c.booking_charge, roomDiscountRs, roomGstSlabs, formNights]);
```

**10 lines added after maxPct useMemo.**

---

## E4 — CheckInForm.jsx · Replace static SGST/CGST/Total in bill grid (L173-175)

**Current (L173-175):**
```jsx
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(c.sgst)}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(c.cgst)}</span>
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(c.total_with_gst)}</span>
```

**After:**
```jsx
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(displaySgst)}{/* BUG-503 */}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(displayCgst)}{/* BUG-503 */}</span>
            {roomGstApplicable && displayGstRate > 0 && <span className="col-span-2 text-right text-[10px] font-semibold text-[#166534]">{displayGstRate}% Slab</span>}{/* BUG-503 */}
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs) + displayGstTotal)}{/* BUG-503 */}</span>
```

**What changes:**
- `c.sgst` → `displaySgst` (live, slab-aware)
- `c.cgst` → `displayCgst` (live, slab-aware)
- New slab badge row (hidden when GST not applicable)
- `c.total_with_gst` → `(bc − roomDiscountRs) + displayGstTotal` (live)

---

## E5 — CheckInForm.jsx · Update Balance due formula (L178)

**Current (L177-178):**
```jsx
            {/* BUG-491 Sub-B: balance due subtracts live roomDiscountRs */}
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.balance_due || 0) - roomDiscountRs))}</span>
```

**After:**
```jsx
            {/* BUG-491 Sub-B + BUG-503: balance due uses live GST on discounted price */}
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(Math.max(0, Number(c.booking_charge || 0) - roomDiscountRs + displayGstTotal - Number(c.advance_payment || 0)))}</span>
```

**What changes:** Formula changes from `c.balance_due - roomDiscountRs` (embeds booking-time GST from c.balance_due) to `(bc − roomDiscountRs) + displayGstTotal − advance` (uses recalculated GST).

**Numeric proof:**
```
No discount:   (9000 − 0) + 1620 − 1000 = 9620  ✓ (matches c.balance_due)
88% discount:  (9000 − 7920) + 54 − 1000 = 134  ✓ (gstBase=1080 → 5% → gstTotal=54)
```

---

## Verification Matrix

| # | Edit | Check | Expected | How |
|---|------|-------|----------|-----|
| V1 | E1+E2 | webpack compiles | 0 errors | tail frontend.out.log |
| V2 | E2 | useRestaurant in scope | No undefined error | Browser: open CheckInForm |
| V3 | E3 | No discount: displaySgst=810, displayCgst=810 (18% on 9000) | As booking-time | Browser: 9000 booking, 0% disc |
| V4 | E4 | 88% discount: SGST=27, CGST=27, slab badge "5% Slab" | gstBase=1080 < 7500 → 5% | Browser: type 88% |
| V5 | E4 | 0% discount: "18% Slab" badge | gstBase=9000 > 7500 → 18% | Browser |
| V6 | E5 | Balance due: no discount → 9620 | (9000−0)+1620−1000=9620 | Browser |
| V7 | E5 | Balance due: 88% discount → 134 | (9000−7920)+54−1000=134 | Browser |
| V8 | All | Walk-in (row.nights=null): formNights=1, no crash | 1-night assumption | Browser: walk-in scenario |
| V9 | All | webpack 0 new warnings | — | tail frontend.out.log |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-503 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-503 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx — BUG-503 2026-10-07
- [ ] Code markers: // BUG-503 on every changed block (E1-E5)
- [ ] Compile: 0 new warnings
```
