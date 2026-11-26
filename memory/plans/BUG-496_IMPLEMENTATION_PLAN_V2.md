# BUG-496 — Gate 3 Implementation Plan (FINAL)

**Date:** 2026-10-06
**Author:** PLANNING agent
**Risk:** HIGH
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` · `src/pages/pms/CheckInPage.jsx`
**Files WILL NOT touch:** FolioCheckoutPanel.jsx · pmsService.js · frontDeskService.js · CheckInPage effectiveBalanceDue (→ BUG-500)

**Run after BUG-500** (BUG-500 must be in place first so effectiveBalanceDue is correct before maxPct is used)

---

## E1 — CheckInForm.jsx L69-76 · maxPct useMemo

### Current:
```javascript
  // BUG-495: maxPct = floor((bc − adv × (1+gstRate)) / bc × 100) — reserves GST implied in advance
  const maxPct = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return 100;
    const gstRate      = (Number(c.sgst||0) + Number(c.cgst||0)) / bc;
    const gstOnAdvance = advance * gstRate;
    return Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
  }, [c.booking_charge, c.advance_payment, c.sgst, c.cgst]);
```

### After:
```javascript
  // BUG-496: maxPct = floor((bc − advance) / bc × 100) — max disc preserves GST on advance (OD-496-01)
  const maxPct = useMemo(() => {
    const bc      = Number(c.booking_charge  || 0);
    const advance = Number(c.advance_payment || 0);
    if (!bc) return 100;
    return Math.floor(Math.max(0, bc - advance) / bc * 100);
  }, [c.booking_charge, c.advance_payment]);
```

**Scenario proof:** bc=9000, adv=1000 → floor(8000/9000×100) = **88** ✓

---

## E1b — CheckInForm.jsx L59-67 · roomDiscountRs cap

### Current:
```javascript
  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge (mirrors form.orderAmount in CheckInPage)
  // BUG-490: cap result at c.balance_due (what guest actually owes after advance)
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const cap = Number(c.balance_due || 0); // BUG-490: discount cannot exceed outstanding balance
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(Number(c.booking_charge || 0) * raw / 100), cap);
    }
    return Math.min(Math.floor(raw), cap);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.balance_due]);
```

### After:
```javascript
  // BUG-489: resolve discount to ₹ — OD-489-01: base = c.booking_charge
  // BUG-496: cap = bc − advance (OD-496-01) — discount cannot reduce room below the advance paid
  const roomDiscountRs = useMemo(() => {
    const raw = parseFloat(ciRoomDiscountAmt) || 0;
    if (raw <= 0) return 0;
    const bc  = Number(c.booking_charge  || 0);
    const cap = Math.max(0, bc - Number(c.advance_payment || 0)); // BUG-496: max = bc − advance
    if (ciRoomDiscountType === 'Percent') {
      return Math.min(Math.floor(bc * raw / 100), cap);
    }
    return Math.min(Math.floor(raw), cap);
  }, [ciRoomDiscountAmt, ciRoomDiscountType, c.booking_charge, c.advance_payment]);
```

**What changes:** cap from `c.balance_due` (9620) → `Math.max(0, bc − advance)` (8000). Deps updated.

---

## E2 — CheckInForm.jsx L199 · discount Amount input max

### Current:
```jsx
                  max={ciRoomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
```

### After:
```jsx
                  max={ciRoomDiscountType === 'Percent' ? maxPct : Math.max(0, Number(c.booking_charge || 0) - Number(c.advance_payment || 0)) || undefined} {/* BUG-496 */}
```

**What changes:** Amount mode max: `c.balance_due` (9620) → `bc − advance` (8000). Inline, same line.

---

## E3 — CheckInPage.jsx L271-280 · maxPct useMemo

### Current:
```javascript
  // BUG-495: maxPct = floor((bc − adv×(1+gstRate)) / bc × 100) — GST on advance reserved
  const maxPct = useMemo(() => {
    const bc      = Number(form?.orderAmount    || 0);
    const advance = Number(form?.advancePayment || 0);
    if (!bc) return 100;
    const { gstTotal: gstOnAdvance } = computeRoomGst(
      roomGstApplicable, roomGstSlabs, advance * (formNights || 1), formNights || 1, 1
    );
    return Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
  }, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);
```

### After:
```javascript
  // BUG-496: maxPct = floor((bc − bookingAdv) / bc × 100) — uses LR booking advance (OD-496-01)
  // IMPORTANT: form.advancePayment = collect-now (starts empty). Booking advance = selected?.charge?.advance_payment
  const maxPct = useMemo(() => {
    const bc         = Number(form?.orderAmount || 0);
    const bookingAdv = Number(selected?.charge?.advance_payment || 0); // BUG-496: booking advance from LR
    if (!bc) return 100;
    return Math.floor(Math.max(0, bc - bookingAdv) / bc * 100);
  }, [form?.orderAmount, selected?.charge?.advance_payment]);
```

**What changes:** `advance` source: `form.advancePayment` (=0 at start) → `selected?.charge?.advance_payment` (=1000). Removes `computeRoomGst` call. Deps: 5 → 2.

---

## E4 — CheckInPage.jsx L300-308 · gstBase in handleConfirm

### Current:
```javascript
      // BUG-386: compute GST before submit — BUG-396: gstBase is room amount only (advance is deposit, not additional charge)
      const gstBase = Number(form.orderAmount); // BUG-396: advance excluded — it is a deposit against the room amount
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-396: room amount only
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

### After:
```javascript
      // BUG-386: compute GST before submit — BUG-496: gstBase = discounted price for correct GST strip value (OD-496-02)
      // Note: backend ignores sent gst_tax (probe 2026-10-06) but we send the correct display value
      const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-496: discounted room amount
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**What changes:** `gstBase = form.orderAmount` → `Math.max(0, form.orderAmount − roomDiscountRs)`. `roomDiscountRs` is in scope (L263-270).

---

## Verification Matrix

| # | Edit | Check | How |
|---|------|-------|-----|
| V1 | E1 | maxPct=88 for bc=9000/adv=1000 | Code: floor(8000/9000×100)=88 |
| V2 | E1 | maxPct=100 for walk-in (adv=0) | Code: floor(9000/9000×100)=100 |
| V3 | E1 | deps: booking_charge, advance_payment only | grep: no sgst/cgst in deps |
| V4 | E1b | roomDiscountRs capped at 8000 | Code: max(0,9000−1000)=8000 |
| V5 | E2 | Amount discount input max=8000 | DevTools: max attr on ci-room-discount-input=8000 |
| V6 | E3 | maxPct=88 for 9000/1000 booking | Code: floor((9000−1000)/9000×100)=88 |
| V7 | E3 | maxPct=100 for walk-in | selected?.charge?.advance_payment undef → 0 → 100 |
| V8 | E3 | deps: orderAmount, selected.charge.advance_payment | grep |
| V9 | E4 | gstBase=1080 after 88% disc | Code: max(0,9000−7920)=1080 |
| V10 | ALL | webpack 0 new warnings | tail frontend.out.log |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-496 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-496 row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-496 2026-10-06
- [ ] Code markers: // BUG-496 in every modified block
- [ ] Compile: 0 new warnings
```
