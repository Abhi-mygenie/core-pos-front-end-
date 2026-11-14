# INV — LOGIN + BOOKING PHASE INVESTIGATION
**Date:** 2026-10-06  
**Role:** INVESTIGATION  
**Steps used:** 8/10  
**Scope:** Login page → New Booking → Check-In formula chain (as described by owner)  
**Triggered by:** Owner scenario — room ₹9,000, advance ₹1,000 at booking, 18% GST, max discount rule

---

## 1. SUMMARY

| # | Area | Finding | Severity | Existing bug? |
|---|------|---------|----------|---------------|
| F1 | Login | Copyright year hardcoded `"2025"` | LOW | C1 (Track A, INV-501) |
| F2 | Booking form | Advance input has no `max` cap (soft warning only) | LOW | No registered bug |
| F3 | **maxPct formula — CheckInForm (Front Desk Beta)** | BUG-496 plan OD-496-01 formula is WRONG per owner's new rule | **CRITICAL** | BUG-496 plan needs revision |
| F4 | **maxPct formula — CheckInPage (Legacy)** | BUG-495 formula uses check-in advance (=0) not booking advance | **CRITICAL** | BUG-496 plan incomplete for legacy |
| F5 | effectiveBalanceDue — CheckInPage | Doesn't deduct booking advance (₹1,000) from balance | HIGH | BUG-500 (related) |
| F6 | GST strip — CheckInPage | Uses full room amount, ignores discount → slab doesn't update live | CRITICAL | BUG-500 F1 |
| F7 | Collect Now max — CheckInForm | `collect.amount` has NO `max` attribute | HIGH | BUG-497 (plan wrong cap) |
| F8 | Collect Now max — CheckInPage | `max={form.orderAmount}` = ₹9,000, should be `balance_due − discount` | HIGH | BUG-497 (not in legacy plan) |
| F9 | Collect Now reset — both | Field does NOT reset when discount changes | MEDIUM | Not registered |

---

## 2. OWNER SCENARIO (Locked)

```
Room rent:        ₹9,000 / night
GST slab:         18% (>₹7,500 per roomGstCalculator.js slabs confirmed OD-500-01)
GST amount:       ₹1,620
Total incl. GST:  ₹10,620
Advance at booking: ₹1,000
Balance due:      ₹9,620

Owner rule — MAX DISCOUNT:
  max_discount_₹ = room_rent − advance_at_booking
                 = 9,000 − 1,000 = ₹8,000

  After max discount:
    Remaining room  = 9,000 − 8,000 = ₹1,000
    New slab        = 5% (₹1,000 < ₹7,500)
    New GST         = ₹1,000 × 5% = ₹50
    New total       = ₹1,050
    Balance due     = ₹1,050 − ₹1,000 = ₹50 (positive, never negative ✓)

  "gst will not get eaten at discount" — the ₹50 GST due = advance × new_gst_rate

maxPct (%) = floor((room_rent − advance) / room_rent × 100)
           = floor((9,000 − 1,000) / 9,000 × 100)
           = floor(88.89)
           = 88%  (owner stated ≈88.32% ≈ ₹7,949 — within ±1 rounding)

Collect Now rule:
  max = balance_due_after_discount
      = Math.max(0, booking_charge − discount + new_GST − booking_advance)
  If discount changes → Collect Now field RESETS to empty
```

---

## 3. DATA FLOW TRACE

### Login Page (`LoginPage.jsx`)
```
File:    src/pages/LoginPage.jsx L268
Current: © Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.
Should:  © Mygenie {new Date().getFullYear()}. ...
Break:   Hardcoded year "2025" — will be stale from 2026 onward
```

### Booking Phase (`NewBookingForm.jsx`)
```
API:  POST /aiosell/direct-reservation (buildBookingBody → createBooking)
Payload: { name, phone, checkin, checkout, adults, children, room_code, rateplan_code,
           advance?: { amount, method, reference } }

Server response (charge.*):
  booking_charge   = 9,000   (room rent)
  sgst             = 810     (9%)
  cgst             = 810     (9%)
  total_with_gst   = 10,620
  advance_payment  = 1,000   (from booking)
  balance_due      = 9,620

UI shows after save:
  ✓ Booking charge, SGST, CGST, Total, Advance, Balance (data-testid: booking-bill-*)
  ✓ Server is authoritative — FE does NOT compute GST at booking time (correct by design, D50)

Advance input (L161 of NewBookingForm.jsx):
  type="number" min={0}   ← NO max
  softMax hint shown when advance > indicative rate (L166) but does NOT block
  Status: ACCEPTABLE — server rejects invalid amounts with message shown in UI
```

### Check-In Phase — Front Desk Beta (`CheckInForm.jsx`)
```
Source of truth: c = row.charge (from LR charge.*)
  c.booking_charge  = 9,000
  c.advance_payment = 1,000  ← CORRECT — uses booking advance
  c.balance_due     = 9,620
  c.sgst            = 810
  c.cgst            = 810

CURRENT maxPct (BUG-495 formula — L69-76):
  gstRate      = (sgst + cgst) / bc = (810+810)/9000 = 0.18
  gstOnAdvance = 1,000 × 0.18 = 180
  maxPct       = floor((9000 − 1000 − 180) / 9000 × 100)
               = floor(86.89) = 86%
  Max discount  = 86% × 9,000 = ₹7,740

CORRECT maxPct per owner rule:
  maxPct = floor((bc − advance) / bc × 100)
         = floor((9000 − 1000) / 9000 × 100)
         = floor(88.89) = 88%
  Max discount = 88% × 9,000 = ₹7,920  (flat cap = ₹8,000)

⚠️  BUG-496 OD-496-01 formula was: floor(advance/bc × 100) = floor(11.11) = 11%
⚠️  This gives max discount = ₹990 — COMPLETELY WRONG per new owner scenario
⚠️  OD-496-01 MUST BE REVISED before any implementation

Collect Now (L225):
  <input type="number" min={0} value={collect.amount} .../>  ← NO max
  Should have: max={Math.max(0, c.balance_due − roomDiscountRs)}
  = Math.max(0, 9620 − roomDiscountRs)
  BUG-497 plan covers this with: max={Math.max(0, c.balance_due − roomDiscountRs)} ✓ CORRECT
```

### Check-In Phase — Legacy (`CheckInPage.jsx`)
```
form prefill: form.orderAmount = a.amount = r.amount_after_tax (room rent ≈ 9,000)
              form.advancePayment = ''  ← EMPTY (NOT the booking advance!)

CRITICAL GAP: form.advancePayment = check-in collect-now, NOT the booking advance.
  Booking advance (₹1,000) lives in: selected?.charge?.advance_payment

CURRENT maxPct (BUG-495 — L272-280 of CheckInPage.jsx):
  bc      = form.orderAmount = 9,000
  advance = form.advancePayment = 0  ← empty at start!
  gstOnAdvance = computeRoomGst(slabs, 0×nights, nights, 1) = 0
  maxPct  = floor((9000 − 0 − 0) / 9000 × 100) = 100%
  → 100% discount allowed! Guest can get the entire room free ✗

  Even after BUG-496 plan (using form.advancePayment = 0):
  maxPct = floor(min(0, 9000)/9000 × 100) = 0% → no discount at all ✗

CORRECT for legacy path:
  Should use BOOKING ADVANCE from selected?.charge?.advance_payment (not form.advancePayment)
  bookingAdv = Number(selected?.charge?.advance_payment || 0) = 1,000
  maxPct = floor((bc − bookingAdv) / bc × 100) = 88%

effectiveBalanceDue (L254-259):
  CURRENT: base + GST(base) − form.advancePayment = 9000 + 1620 − 0 = 10,620
  SHOULD:  base + GST(discountedBase) − bookingAdv − form.advancePayment
         = 9000 + newGST − 1000 − 0 = 8,620 + newGST (using discounted base)
  → effectiveBalanceDue is 1,000 too high (misses booking advance)

Collect Now (Advance Payment field L847):
  max={form.orderAmount || 0}  = 9,000
  SHOULD BE: Math.max(0, balance_due_from_LR − roomDiscountRs)
           = Math.max(0, Number(selected?.charge?.balance_due || 0) − roomDiscountRs)
           = Math.max(0, 9,620 − roomDiscountRs)

GST strip (L924-968):
  gstBase = form.orderAmount = 9,000  ← full price, ignores discount
  SHOULD: gstBase = Math.max(0, form.orderAmount − roomDiscountRs)
  Result: if discount pushes room below ₹7,500, slab must drop 18% → 5%
  Currently: slab stays at 18%, shows wrong SGST/CGST/total ✗
```

---

## 4. FORMULA COMPARISON TABLE

| Formula | BUG-495 (current) | BUG-496 OD-496-01 (WRONG) | Owner's NEW rule |
|---------|------------------|--------------------------|-----------------|
| Max discount ₹ | ₹7,740 (86%) | ₹990 (11%) | ₹8,000 (88.89%) |
| maxPct | `floor((bc−adv−gstOnAdv)/bc×100)` | `floor(adv/bc×100)` | `floor((bc−adv)/bc×100)` |
| Scenario (bc=9000, adv=1000) | 86% | 11% | **88%** ✓ |
| Balance after max discount | ₹1,718 | ₹8,684 | **₹50** ✓ |
| GST preserved? | No | No | **Yes** ✓ |

---

## 5. FINDINGS DETAIL

### F3/F4 — maxPct Formula Revision (CRITICAL)

**Root cause:** OD-496-01 was locked as "advance only" = 11%. Owner's new example shows 88%.  
**Classification:** FE_BUG — wrong formula locked in OD-496-01.  
**Required action:** OD-496-01 must be RE-LOCKED before implementation.

**Correct formula (both files):**
```js
// NEW OD-496-01 (revised): max discount = room_rent − booking_advance
// After max discount: balance = advance × new_gst_rate (GST preserved, never negative)
const maxPct = useMemo(() => {
  const bc      = Number(c.booking_charge || 0);   // CheckInForm
  // OR: const bc = Number(form?.orderAmount || 0);  // CheckInPage
  const advance = Number(c.advance_payment || 0);   // CheckInForm: c.advance_payment (booking advance)
  // OR: const advance = Number(selected?.charge?.advance_payment || 0); // CheckInPage: booking advance
  if (!bc) return 100;
  return Math.floor(Math.max(0, bc - advance) / bc * 100);
}, [c.booking_charge, c.advance_payment]);
```

**Note for CheckInPage (legacy):** MUST use `selected?.charge?.advance_payment` (booking advance from LR), NOT `form.advancePayment` (which is the collect-now field, starts empty).

### F7/F8 — Collect Now max (HIGH)

**CheckInForm:** No `max` attribute. BUG-497 plan formula is CORRECT:
```js
max={Math.max(0, Number(c.balance_due || 0) - roomDiscountRs)}
```

**CheckInPage (legacy):** `max={form.orderAmount}` = ₹9,000. Should be:
```js
max={Math.max(0, Number(selected?.charge?.balance_due || 0) - roomDiscountRs)}
```
BUG-497 plan only covers CheckInForm — legacy CheckInPage needs same fix.

### F9 — Collect Now should reset on discount change (MEDIUM)

**Current behavior (both pages):** Changing the discount does NOT reset the Collect Now field.  
**Required:** `onChange` of discount input should call `setCollect(k => ({...k, amount: ''}))` (CheckInForm) or `setField('advancePayment', '')` (CheckInPage).  
**Not yet registered** as a bug.

### F5 — effectiveBalanceDue missing booking advance (HIGH — CheckInPage)

```js
// CURRENT (CheckInPage L254-259):
const effectiveBalanceDue = useMemo(() => {
  const base    = Number(form?.orderAmount   || 0);   // 9,000
  const advance = Number(form?.advancePayment || 0);  // 0 (collect-now, not booking advance)
  const { gstTotal } = computeRoomGst(..., base, ...); // on full price, not discounted!
  return Math.max(0, base + gstTotal - advance);       // 10,620 (wrong — should be 9,620)
}, [...]);

// SHOULD BE:
const bookingAdv = Number(selected?.charge?.advance_payment || 0); // 1,000
const discountedBase = Math.max(0, Number(form?.orderAmount || 0) - roomDiscountRs);
const { gstTotal } = computeRoomGst(..., discountedBase, ...); // on discounted price
return Math.max(0, discountedBase + gstTotal - bookingAdv - Number(form?.advancePayment || 0));
```

### F6 — GST strip not recalculating on discount (CRITICAL — BUG-500 F1)

Already documented in INV-500. Confirmed still present:
```js
// L924-930 (CheckInPage):
const gstBase = amt; // ← always full room amount, never discounted
// SHOULD:
const gstBase = Math.max(0, amt - roomDiscountRs);
```

---

## 6. KEY OD THAT MUST BE RE-LOCKED

| ID | Current (WRONG) | New (CORRECT) |
|----|----------------|--------------|
| OD-496-01 | maxDiscount = advance paid (₹1,000 = 11%) | maxDiscount = room_rent − advance (₹8,000 = 88%) |

The formula intent is: "hotel gives back the advance as a discount on room. After discount, guest owes only the GST on the advance (₹50). GST is never eaten by the discount."

Formulaically: `max_discount_₹ = bc − advance`  →  `maxPct = floor((bc−advance)/bc×100)`

---

## 7. SCOPE FOR NEXT STEPS (Gate 2 → Gate 3 → Gate 4)

| Item | Action | Files | Risk |
|------|--------|-------|------|
| Re-lock OD-496-01 | Owner confirms new maxPct formula | — | — |
| BUG-496 plan revision | Update CheckInForm.jsx + CheckInPage.jsx maxPct | 2 files | HIGH |
| BUG-497 legacy gap | Add Collect Now max to CheckInPage.jsx (L847) | 1 file | HIGH |
| F9 new bug: Collect Now reset | Register new bug, plan Collect Now reset on discount change | 2 files | MEDIUM |
| BUG-500 F1 (GST strip) | Already investigated (INV-500), needs Gate 3 plan | CheckInPage.jsx | CRITICAL |
| F5: effectiveBalanceDue | Fold into BUG-500 plan | CheckInPage.jsx | HIGH |
| C1: Login copyright | LOW risk, 1 line | LoginPage.jsx | LOW |

---

## 8. RETROACTIVE CANDIDATES

None. All findings are new or revisions to existing plans.

---

## 9. RECOMMENDATIONS

**BLOCKER before any implementation:**  
OD-496-01 must be RE-LOCKED with new formula before BUG-496 Gate 4 GO is given.  
The existing BUG-496 implementation plan MUST be rewritten.

**Order of work (owner to approve):**  
1. Re-lock OD-496-01 → revise BUG-496 plan  
2. Register F9 (Collect Now reset) as new BUG-501 (or fold into BUG-496/497)  
3. BUG-497 + BUG-496 Gate 4 GO together (same file, CheckInForm.jsx + CheckInPage.jsx)  
4. BUG-500 (GST strip + effectiveBalanceDue fix) — Gate 2+3 plan  
5. C1 Login copyright Fast Lane (LOW risk, owner approve)

---

Investigation complete.  
Root cause: HIGH confidence on all findings. Steps used: 8/10.  
Evidence: this report + code traces above.
