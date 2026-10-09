# BUG-496 — Implementation Plan (Gate 3)

**ID:** BUG-496
**Date:** 2026-10-06
**Author:** PLANNING agent
**Risk:** HIGH
**Files WILL change:** `src/components/pms/frontdesk/CheckInForm.jsx` · `src/pages/pms/CheckInPage.jsx`
**Files WILL NOT touch:** `FolioCheckoutPanel.jsx` (→ BUG-498) · `pmsService.js` · `frontDeskService.js` · any other file

---

## Scope Lock

2 files · 5 edit sites · all check-in surfaces only.
`FolioCheckoutPanel.jsx` is explicitly excluded — its maxPct uses `balancePayment` (OD-498-01), not `advance`.

---

## Execution order

BUG-497 (GATE_3_PLAN_COMPLETE) touches CheckInForm.jsx L225. BUG-496 touches L68-76 and L199. **Non-overlapping — can implement in any order.** Recommended: finish BUG-497 Gate 4 → Gate 5a first, then BUG-496, to keep file change sets clean.

---

## E-496-1 — CheckInForm.jsx L68-76: maxPct formula

**Current:**
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

**After:**
```javascript
// BUG-496: maxPct = floor(advance / bc × 100) — discount capped at advance paid only (OD-496-01)
const maxPct = useMemo(() => {
  const bc      = Number(c.booking_charge  || 0);
  const advance = Number(c.advance_payment || 0);
  if (!bc) return 100;
  return Math.floor(Math.min(advance, bc) / bc * 100);
}, [c.booking_charge, c.advance_payment]);
```

**What changes:** formula simplified (3 lines removed); deps reduced from 4 to 2 (`c.sgst`, `c.cgst` no longer referenced → lint-clean).

**Verify:** For ₹5,700 room, ₹1,000 advance → `floor(1000/5700×100) = 17`. Previously was `81`.

---

## E-496-2 — CheckInForm.jsx L199: Amount mode `max`

**Current:**
```jsx
max={ciRoomDiscountType === 'Percent' ? maxPct : Number(c.balance_due || 0) || undefined}
```

**After:**
```jsx
max={ciRoomDiscountType === 'Percent' ? maxPct : Number(c.advance_payment || 0) || undefined} {/* BUG-496: Amount max = advance (OD-496-01) */}
```

**What changes:** Amount mode cap `c.balance_due` → `c.advance_payment`. For ₹5,700 room, ₹1,000 advance: max changes from ₹4,985 to ₹1,000.

**Note:** `c.advance_payment` is already in scope (`const c = row.charge ?? {}` at L48). No new variable.

---

## E-496-3 — CheckInPage.jsx L271-280: maxPct formula

**Current:**
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

**After:**
```javascript
// BUG-496: maxPct = floor(advance / bc × 100) — discount capped at advance paid only (OD-496-01)
const maxPct = useMemo(() => {
  const bc      = Number(form?.orderAmount    || 0);
  const advance = Number(form?.advancePayment || 0);
  if (!bc) return 100;
  return Math.floor(Math.min(advance, bc) / bc * 100);
}, [form?.orderAmount, form?.advancePayment]);
```

**What changes:** `computeRoomGst` call on advance removed. Deps reduced from 5 to 2 (`roomGstApplicable`, `roomGstSlabs`, `formNights` no longer referenced here → lint-clean). Note: `computeRoomGst` import remains — it is still used at L257 and L302.

---

## E-496-4 — CheckInPage.jsx L900: Amount mode `max`

**Current:**
```jsx
max={ciRoomDiscountType === 'Percent' ? maxPct : effectiveBalanceDue || undefined}
```

**After:**
```jsx
max={ciRoomDiscountType === 'Percent' ? maxPct : Number(form?.advancePayment || 0) || undefined} {/* BUG-496: Amount max = advance (OD-496-01) */}
```

**What changes:** Amount cap `effectiveBalanceDue` → `form?.advancePayment`. `form?.advancePayment` already in scope.

---

## E-496-5 — CheckInPage.jsx L300-308: gstBase in handleConfirm

**Current:**
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

**After:**
```javascript
// BUG-386: compute GST before submit — BUG-496: gstBase is discounted price (OD-496-02)
const gstBase = Math.max(0, Number(form.orderAmount) - roomDiscountRs); // BUG-496: GST on discounted price
const { gstTotal: gstTax } = computeRoomGst(
  roomGstApplicable,
  roomGstSlabs,
  gstBase, // BUG-496: discounted room amount
  formNights ?? 1,
  1  // single-room check-in (pms_gst.md §5)
);
```

**What changes:** Two lines edited — the comment (L300) and the `gstBase` assignment (L301) + the inline comment at L305. No new variables.

**Effect on `balance_payment`:** `pmsCheckIn` L282 sends `balance_payment = orderAmount + gstTax - advance`. After this fix, `gstTax` is on the discounted price (lower). `balance_payment` is slightly lower, but the backend applies `room_discount` separately (handover_5 §3: "before check-in discount bake") — the resulting UID balance is correct either way.

**`roomDiscountRs` in scope:** `handleConfirm` is defined at L296, after `roomDiscountRs` useMemo (L263-270). ✅

---

## Verification Matrix

| Edit | File | Verify | How |
|------|------|--------|-----|
| E-496-1 | CheckInForm.jsx L68-76 | maxPct = 17% for ₹5,700/₹1,000 | Code: `floor(min(1000,5700)/5700×100)=17` |
| E-496-1 | CheckInForm.jsx | dep array has 2 items, no sgst/cgst | grep deps |
| E-496-2 | CheckInForm.jsx L199 | Amount input `max` = `c.advance_payment` | DOM: inspect max attr in Amount mode = ₹1,000 |
| E-496-3 | CheckInPage.jsx L271-280 | maxPct = 17% | Same formula as E-496-1 |
| E-496-3 | CheckInPage.jsx | dep array has 2 items, no computeRoomGst call | grep deps |
| E-496-4 | CheckInPage.jsx L900 | Amount input `max` = `form.advancePayment` | DOM: inspect max attr = ₹1,000 |
| E-496-5 | CheckInPage.jsx L301 | gstBase = orderAmount − roomDiscountRs | code trace: roomDiscountRs > 0 → gstBase < orderAmount |
| V-REG-1 | Both files | No discount → gstBase = orderAmount (roomDiscountRs=0) | No discount entered → Math.max(0, X-0) = X |
| V-REG-2 | Both files | maxPct = 100 when booking_charge = 0 | guard: `if (!bc) return 100` |
| V-REG-3 | Both files | Alert still fires at correct threshold | Enter 18% → alert shows "Maximum discount: 17%" |
| V-COMPILE | Both files | 0 new webpack warnings | `webpack compiled with 1 warning` (pre-existing only) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-496 → GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: BUG-496 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-496 2026-10-06
- [ ] Code markers: // BUG-496 in each modified block (E-496-1 through E-496-5)
- [ ] Compile: 0 new warnings
```

---

## R11 API Probe — COMPLETE (2026-10-06)

**Evidence file:** `evidence/BUG-496-R11/R11_PROBE_2026_10_06.md`

| Finding | Result |
|---------|--------|
| `gst_tax` stored in `room_info`? | **NO** — field absent in all 3 orders probed |
| Backend stores `gst_tax` from pmsCheckIn payload? | **NO** — no field, no storage |
| `balance_payment` from payload used by backend? | **NO** — backend OVERRIDES with `room_price - discount - advance` |
| E-496-5 visible effect on folio? | **NO-OP** — neither gst_tax nor balance_payment from our payload affects folio state |

**Gate 4 decision for E-496-5:** MAY include (correct formula) but has no visible effect. E-496-1 through E-496-4 are the critical changes.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| advance = 0 → maxPct = 0, no discount possible | Correct: hotel collected nothing, no discount to give |
| advance > booking_charge (edge case) | `Math.min(advance, bc)` guard → maxPct = 100% max |
| Removing c.sgst/cgst from deps causes stale closure | No — they are no longer read in the function body; dep removal is correct |
| computeRoomGst still imported after removing from maxPct | ✅ Still used at L257 (effectiveBalanceDue) and L302-308 (handleConfirm) |
| E-496-5 changes `balance_payment` slightly | Backend OVERRIDES balance_payment — no effect on folio (R11 probe confirmed) |
| BUG-497 conflict on CheckInForm | BUG-497 touches L225; BUG-496 touches L68-76 + L199 — non-overlapping |
