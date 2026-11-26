# BUG-495 — Implementation Plan (Gate 3)

**ID:** BUG-495
**Date:** 2026-10-06
**Author:** Planning agent
**Risk:** HIGH
**Files WILL change:**
  - `src/components/pms/frontdesk/CheckInForm.jsx`
  - `src/pages/pms/CheckInPage.jsx`
  - `src/components/pms/frontdesk/FolioCheckoutPanel.jsx`
**Files WILL NOT touch:** CollectPaymentPanel.jsx (R5), orderTransform.js (R5), pmsService.js, frontDeskService.js, any other file

---

## Scope Lock — 3 files, 4 edit sites, no new imports

Alert JSX, `discountOverMax` const (CheckInForm/CheckInPage), `max` attrs, `disabled` props, confirm buttons, handlePaid guard — ALL UNCHANGED. Only the `maxPct` useMemo body and deps change, plus the parent FolioCheckoutPanel `discountOverMax` useMemo for consistency.

---

## E-495-1 — CheckInForm.jsx: maxPct useMemo (L69-73)

**Current:**
```javascript
  // BUG-492 Sub-B: maxPct + discountOverMax for % cap
  const maxPct = useMemo(() => {
    const bd = Number(c.balance_due    || 0);
    const bc = Number(c.booking_charge || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [c.balance_due, c.booking_charge]);
```
**After:**
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
**No import change needed** — gstRate derived from existing LR `c.sgst`, `c.cgst`, `c.booking_charge`.

---

## E-495-2 — CheckInPage.jsx: maxPct useMemo (L272-276)

**Current:**
```javascript
  // BUG-492 Sub-B: maxPct + discountOverMax for % cap
  const maxPct = useMemo(() => {
    const bd = effectiveBalanceDue;
    const bc = Number(form?.orderAmount || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [effectiveBalanceDue, form?.orderAmount]);
```
**After:**
```javascript
  // BUG-495: maxPct = floor((bc − adv×(1+gstRate)) / bc × 100) — GST on advance reserved
  const maxPct = useMemo(() => {
    const bc      = Number(form?.orderAmount   || 0);
    const advance = Number(form?.advancePayment || 0);
    if (!bc) return 100;
    const { gstTotal: gstOnAdvance } = computeRoomGst(
      roomGstApplicable, roomGstSlabs, advance * (formNights || 1), formNights || 1, 1
    );
    return Math.floor(Math.max(0, bc - advance - gstOnAdvance) / bc * 100);
  }, [form?.orderAmount, form?.advancePayment, roomGstApplicable, roomGstSlabs, formNights]);
```
**No import change** — `computeRoomGst`, `roomGstApplicable`, `roomGstSlabs`, `formNights` all already in scope.

---

## E-495-3 — FolioCheckoutPanel.jsx: RoomSection maxPct useMemo (L54-58)

**Current:**
```javascript
  // BUG-492 Sub-B: maxPct = floor(balance_due / booking_charge × 100) — meaningful % cap
  const maxPct = useMemo(() => {
    const bd = Number(c.balance_due    || 0);
    const bc = Number(c.booking_charge || 1);
    return bc > 0 ? Math.floor(bd / bc * 100) : 100;
  }, [c.balance_due, c.booking_charge]);
```
**After:**
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
**No import change** — same LR-derived gstRate approach as CheckInForm.

---

## E-495-4 — FolioCheckoutPanel.jsx: parent `discountOverMax` useMemo (L227-233)

**Reason:** Parent `discountOverMax` guards `handlePaid`. Must use the same GST-aware formula as RoomSection `maxPct` — otherwise alert triggers at 79% but handlePaid only blocks at the old 85%, creating an inconsistency.

**Current:**
```javascript
  // BUG-492 Sub-B: discountOverMax at parent scope — blocks handlePaid when % > maxPct
  const discountOverMax = useMemo(() => {
    if (roomDiscountType !== 'Percent') return false;
    const bd = Number(row.charge?.balance_due    || 0);
    const bc = Number(row.charge?.booking_charge || 1);
    if (!bc) return false;
    return Number(roomDiscount) > Math.floor(bd / bc * 100);
  }, [roomDiscount, roomDiscountType, row.charge?.balance_due, row.charge?.booking_charge]);
```
**After:**
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

---

## Verification Matrix

| Edit | File | Change | Verify |
|------|------|--------|--------|
| E-495-1 | CheckInForm L69-73 | maxPct body + deps | Room 1500, adv 300, GST 5% → maxPct=79% |
| E-495-2 | CheckInPage L272-276 | maxPct body + deps | Same scenario → maxPct=79% |
| E-495-3 | FolioCheckoutPanel L54-58 | RoomSection maxPct | Same scenario → maxPct=79% |
| E-495-4 | FolioCheckoutPanel L227-233 | parent discountOverMax | 80% → handlePaid blocked; 79% → handlePaid proceeds |
| REG-1 | CheckInForm | Non-GST hotel | maxPct = floor(1200/1500×100) = 80% (unchanged) |
| REG-2 | All 3 | Amount mode | max=balance_due unchanged, no regression |
| REG-3 | FolioCheckoutPanel | Alert text | Shows "79%…" not "85%…" for GST hotel |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-495 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-495 row updated
- [ ] FILE_OWNERSHIP.md: 3 files + BUG-495 2026-10-06
- [ ] Code markers: // BUG-495 in each modified useMemo
- [ ] Compile: 0 new warnings
```

---

## Execution Sequence

1. E-495-1 (CheckInForm) — independent
2. E-495-2 (CheckInPage) — independent
3. E-495-3 + E-495-4 (FolioCheckoutPanel, same file, different locations) — run together
4. Compile check
5. Registry + ownership sync

**Execute BUG-495 before BUG-494** (BUG-494 adds props to RoomSection; doing BUG-495 first avoids touching the same useMemo twice).

Gate 4 GO → IMPLEMENTATION.
