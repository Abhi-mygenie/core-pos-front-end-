# BUG-495 — Impact Analysis (Gate 2)

**ID:** BUG-495
**Date:** 2026-10-06
**Author:** Planning agent
**Code Reality:** NONE for corrected formula. All three maxPct useMemos exist (BUG-492 Sub-B) but use wrong base.
**Conflict Pre-check:**
- All 3 files last modified: BUG-492 (2026-10-06, today)
- BUG-495 modifies the maxPct useMemo in each file — **directly supersedes** BUG-492 Sub-B formula at those exact locations
- Execution order: BUG-495 after BUG-492 (already implemented). BUG-495 replaces the useMemo body only; alert JSX, disabled logic, `discountOverMax` are ALL unchanged.
- BUG-494 and BUG-495 are parallel-safe in FolioCheckoutPanel (different lines: 495 at L53-58, 494 at L161-165+L339)

---

## 1. Business Rule (owner-locked)

For **GST-applicable** hotels:
```
gstOnAdvance       = advance_payment × gstRate  (where gstRate = charge.sgst+charge.cgst / charge.booking_charge)
maxDiscountAmount  = booking_charge − advance_payment − gstOnAdvance
                   = booking_charge − advance_payment × (1 + gstRate)
maxPct             = floor(maxDiscountAmount / booking_charge × 100)
```

For **non-GST** hotels (`roomGstApplicable = false`):
```
maxDiscountAmount  = booking_charge − advance_payment   (gstOnAdvance = 0)
maxPct             = floor(maxDiscountAmount / booking_charge × 100)
```

Proof (₹1,500 room, ₹300 advance, 5% GST):
```
gstOnAdvance = 300 × 0.05 = 15
maxDiscount  = 1500 − 300 − 15 = 1185
maxPct       = floor(1185/1500×100) = 79%
```

---

## 2. Current formula (BUG-492 Sub-B) vs Corrected

### CheckInForm.jsx — maxPct useMemo (L69-73)

**Current:**
```javascript
const maxPct = useMemo(() => {
  const bd = Number(c.balance_due    || 0);   // includes full-price GST → too high
  const bc = Number(c.booking_charge || 1);
  return bc > 0 ? Math.floor(bd / bc * 100) : 100;
}, [c.balance_due, c.booking_charge]);
```

**Corrected:**
```javascript
const maxPct = useMemo(() => {
  const bc      = Number(c.booking_charge  || 0);
  const advance = Number(c.advance_payment || 0);
  if (!bc) return 100;
  // gstRate derived from LR charge (already on full price, same slab)
  const gstRate      = bc > 0 ? (Number(c.sgst||0) + Number(c.cgst||0)) / bc : 0;
  const gstOnAdvance = advance * gstRate;   // GST implied in the advance
  const maxAmt       = Math.max(0, bc - advance - gstOnAdvance);
  return Math.floor(maxAmt / bc * 100);
}, [c.booking_charge, c.advance_payment, c.sgst, c.cgst]);
// BUG-495: gstOnAdvance reserves GST implied in advance for GST hotels
```

**No new imports** — derives gstRate from existing `c.sgst`, `c.cgst`, `c.booking_charge`.

---

### CheckInPage.jsx — maxPct useMemo (L272-276)

**Current:**
```javascript
const maxPct = useMemo(() => {
  const bd = effectiveBalanceDue;              // booking + fullGST - advance → too high
  const bc = Number(form?.orderAmount || 1);
  return bc > 0 ? Math.floor(bd / bc * 100) : 100;
}, [effectiveBalanceDue, form?.orderAmount]);
```

**Corrected:**
```javascript
const maxPct = useMemo(() => {
  const bc      = Number(form?.orderAmount   || 0);
  const advance = Number(form?.advancePayment || 0);
  if (!bc) return 100;
  // gstOnAdvance: what GST was implied when advance was collected
  const { gstTotal: gstOnAdvance } = computeRoomGst(
    roomGstApplicable, roomGstSlabs,
    advance * (formNights || 1), formNights || 1, 1
  );
  const maxAmt = Math.max(0, bc - advance - gstOnAdvance);
  return Math.floor(maxAmt / bc * 100);
}, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);
// BUG-495: gstOnAdvance computed via computeRoomGst (already imported + available)
```

**No new imports** — `computeRoomGst`, `roomGstApplicable`, `roomGstSlabs`, `formNights` all already in CheckInPage scope.

---

### FolioCheckoutPanel.jsx — maxPct useMemo in RoomSection (L54-58)

**Current:**
```javascript
const maxPct = useMemo(() => {
  const bd = Number(c.balance_due    || 0);   // includes full-price GST → too high
  const bc = Number(c.booking_charge || 1);
  return bc > 0 ? Math.floor(bd / bc * 100) : 100;
}, [c.balance_due, c.booking_charge]);
```

**Corrected:**
```javascript
const maxPct = useMemo(() => {
  const bc      = Number(c.booking_charge  || 0);
  const advance = Number(c.advance_payment || 0);
  if (!bc) return 100;
  const gstRate      = bc > 0 ? (Number(c.sgst||0) + Number(c.cgst||0)) / bc : 0;
  const gstOnAdvance = advance * gstRate;
  const maxAmt       = Math.max(0, bc - advance - gstOnAdvance);
  return Math.floor(maxAmt / bc * 100);
}, [c.booking_charge, c.advance_payment, c.sgst, c.cgst]);
// BUG-495: gstOnAdvance reserves GST implied in advance for GST hotels
```

**No new imports** — same approach as CheckInForm (derive from LR charge).

---

## 3. Side effects

**Alert text update needed:** All 3 components show `"Maximum discount: {maxPct}%"`. Since maxPct changes from 80%→79% (or 85%→79% for GST hotels), the alert text will automatically display the correct new value. No JSX change needed — it reads `maxPct` dynamically.

**`discountOverMax` recalculation:** All 3 use `discountOverMax = type === 'Percent' && value > maxPct`. Since maxPct is lower (79% not 80/85%), `discountOverMax` will trigger at the correct threshold. No change to the condition itself.

**`max` attribute on input:** All 3 use `max={type === 'Percent' ? maxPct : ...}`. Since maxPct changes, the input's HTML max attribute automatically restricts to the correct value. No change to JSX.

**Amount mode cap (BUG-490 `onChange` clamp):** Uses `c.balance_due` for the Amount mode cap (unchanged). Amount mode cap is NOT affected by this fix.

---

## 4. Verification Matrix Seeds

| # | Scenario | Expected |
|---|---------|---------|
| V-495-1 | Room ₹1,500, advance ₹300, GST 5% | maxPct = 79%, maxAmt = ₹1,185 |
| V-495-2 | Room ₹1,920, advance ₹300, GST 5% | maxPct = floor(1185/1920×100) = wait: maxAmt = 1920-300×1.05=1920-315=1605, maxPct=floor(1605/1920×100)=83% |
| V-495-3 | Non-GST hotel, room ₹1,500, advance ₹300 | maxPct = floor(1200/1500×100) = 80% (unchanged) |
| V-495-4 | Enter 80% on GST hotel (₹1,500, ₹300 advance) | Red alert triggered, button disabled |
| V-495-5 | Enter 79% on GST hotel | No alert, button enabled |
| V-495-R1 | Amount mode (BUG-490) | Unchanged — max = balance_due, no regression |
| V-495-R2 | discountOverMax logic | Still triggers correctly at new 79% threshold |

---

## 5. Affected Files

| File | Lines | Change |
|------|-------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L69-73 | maxPct useMemo body + deps |
| `src/pages/pms/CheckInPage.jsx` | L272-276 | maxPct useMemo body + deps |
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | L54-58 | maxPct useMemo body + deps in RoomSection |

**NOT touched:** Alert JSX, `discountOverMax` const, `max` attr, `disabled` props, confirm buttons, `handlePaid` guard, CheckInForm confirm button, pmsService.js, CollectPaymentPanel.jsx (R5), orderTransform.js (R5).

---

## 6. Risk

**HIGH** — financial validation (discount cap); 3 files; no hotspot R5. All 3 files already modified by BUG-492 (today). Targeted useMemo body replacements. No new imports required.

Gate 2 complete. Gate 3 pending owner GO.
