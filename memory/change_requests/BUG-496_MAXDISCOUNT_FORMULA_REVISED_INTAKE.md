# BUG-496 — Intake (REVISED 2026-10-06)

**ID:** BUG-496
**Date created:** 2026-10-06
**Revised:** 2026-10-06 — OD-496-01 formula CORRECTED; CheckInPage scope extended; checkout items PARKED
**Source:** OWNER-REPORTED + INV-LOGIN-BOOKING-PHASE_2026_10_06
**Severity:** P1 — HIGH
**Risk:** HIGH (financial — wrong discount cap; sends wrong GST to backend at check-in)
**Sprint:** oct_bug_batch
**Duplicate check:** DISTINCT (supersedes BUG-495)
**Blast radius:** MEDIUM (4 edit sites, 2 files — checkout parked for checkout phase)
**Fast Lane eligible:** NO (financial logic, 2 files)

---

## ⚠️ REVISION NOTICE

**OD-496-01 was WRONG.** Previous formula `floor(advance/bc × 100)` gave 11% max discount on a ₹9,000 room
with ₹1,000 advance — far too restrictive and contradicts the owner's own scenario.

Owner's correct rule (2026-10-06 session): "max discount = such that GST on advance is preserved as due balance"

**Correct formula:** `maxPct = floor((bc − advance) / bc × 100)`

Owner scenario proof:
- Room ₹9,000, advance ₹1,000 → max discount = ₹8,000 (88.89% → floor = 88%)
- After discount: room = ₹1,000, GST @ 5% slab = ₹50, total = ₹1,050, balance = **₹50** ✓
- GST never goes negative, "gst will not get eaten at discount" ✓

**FolioCheckoutPanel items (E5-E8) PARKED** — checkout phase will be addressed separately.

---

## Description

The maxPct / maxDiscount formula at check-in (both Front Desk Beta and legacy CheckInPage) is wrong.

**Problem A — Wrong formula in CheckInForm.jsx (Front Desk Beta):**
Current (BUG-495): `floor((bc − adv − gstOnAdv) / bc × 100)` → 86% for ₹9,000/₹1,000 scenario
Correct: `floor((bc − adv) / bc × 100)` → **88%**

**Problem B — Wrong advance source in CheckInPage.jsx (Legacy):**
Current: uses `form.advancePayment` (the collect-NOW field, starts as '' = 0)
→ maxPct = floor((9000−0−0)/9000×100) = **100%** — allows entire room as free!
Correct: must use `selected?.charge?.advance_payment` (booking advance = ₹1,000 from LR data)

**Problem C — GST base at check-in submit uses full price:**
CheckInPage.jsx L301: `gstBase = form.orderAmount` (full ₹9,000)
Should be: `gstBase = Math.max(0, form.orderAmount − roomDiscountRs)` (discounted price)

---

## Owner Decisions

**OD-496-01:** ~~maxDiscount = advance paid~~ → **REVISED**
maxDiscount formula = `floor((booking_charge − advance_at_booking) / booking_charge × 100)`
→ For ₹9,000 room / ₹1,000 advance: **maxPct = 88%**, max₹ = ₹8,000
→ After max discount: balance = advance × new_gst_rate = ₹50 (positive, GST preserved)
**STATUS: RE-LOCKED 2026-10-06** (supersedes previous OD-496-01 "advance only = 11%")

**OD-496-02:** GST at check-in submit = computed on discounted price
`gstBase = Math.max(0, orderAmount − roomDiscountRs)`
**STATUS: LOCKED** (unchanged from previous)

**OD-496-03:** Checkout room_gst_tax — **PARKED for checkout phase**
Not in scope for this fix batch.

---

## Data Sources by File

| File | Advance source | Booking charge source |
|------|--------------|----------------------|
| `CheckInForm.jsx` | `c.advance_payment` (= `row.charge.advance_payment` from LR) | `c.booking_charge` |
| `CheckInPage.jsx` | `selected?.charge?.advance_payment` (NOT `form.advancePayment`) | `form.orderAmount` (= `a.amount` from LR) |

**Critical for CheckInPage:** `form.advancePayment` is the COLLECT-NOW field (starts empty).
The booking advance (₹1,000) is in `selected` (the arrival row from LR), not in `form`.

---

## Fix Scope (Gate 3 plan will follow)

| # | File | Site | Change |
|---|------|------|--------|
| E1 | CheckInForm.jsx | L69-76 maxPct | `floor(Math.max(0, bc − advance) / bc × 100)` |
| E2 | CheckInForm.jsx | L199 Amount max | `Math.max(0, Number(c.balance_due||0) - roomDiscountRs)` (balance − discount, not advance alone) |
| E3 | CheckInPage.jsx | L271-280 maxPct | `floor(Math.max(0, bc − bookingAdv) / bc × 100)` where `bookingAdv = Number(selected?.charge?.advance_payment \|\| 0)` |
| E4 | CheckInPage.jsx | L301 gstBase | `Math.max(0, Number(form.orderAmount) − roomDiscountRs)` |

**Files WILL NOT touch:** FolioCheckoutPanel.jsx · CollectPaymentPanel.jsx · pmsService.js · frontDeskService.js

---

## Evidence

- **INV report:** `investigations/INV-LOGIN-BOOKING-PHASE_2026_10_06.md`
- **Formula proof:**
  ```
  bc=9000, adv=1000, slabs: {0-7500: 5%, >7500: 18%}
  maxPct_old (BUG-495) = floor((9000-1000-180)/9000×100) = 86  ← wrong
  maxPct_bad (OD-496-01 old) = floor(1000/9000×100) = 11        ← too restrictive
  maxPct_correct = floor((9000-1000)/9000×100) = 88              ← correct ✓
  After 88%: room=1080, gst@5%=54, balance=134 (positive ✓)
  At flat ₹8000: room=1000, gst=50, balance=50 (= advance×5% ✓)
  ```
- **Code trace:**
  - CheckInForm.jsx L69-76: BUG-495 formula using c.advance_payment (correct source, wrong formula)
  - CheckInPage.jsx L272-280: BUG-495 formula using form.advancePayment (wrong source = 0)
  - CheckInPage.jsx L301: gstBase = full orderAmount (ignores discount)
- **Confidence:** HIGH

---

## Verification Matrix (seeds Gate 3 plan)

| # | Check | How |
|---|-------|-----|
| V1 | maxPct = 88% for ₹9,000/₹1,000 scenario | Code: floor((9000-1000)/9000×100) = 88 |
| V2 | maxPct = 0% when advance = 0 (walk-in) | Code: floor((bc-0)/bc×100) = 100 (no advance = full discount allowed) |
| V3 | maxPct = 100% when bc = 0 (guard) | Code: if (!bc) return 100 |
| V4 | CheckInPage uses booking advance not form.advancePayment | grep: selected?.charge?.advance_payment |
| V5 | gstBase at submit = orderAmount − roomDiscountRs | Code trace L301 after fix |
| V6 | Compile: 0 new warnings | tail frontend.out.log |

---

## Post-Code Checklist

```
- [ ] registry.json: BUG-496 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: CheckInForm.jsx + CheckInPage.jsx — BUG-496 2026-10-06
- [ ] Code markers: // BUG-496 in every modified block
- [ ] Compile: 0 new warnings
```

---

## Conflict Check

| File | Other active items | Safe? |
|------|------------------|-------|
| CheckInForm.jsx | BUG-497 (L225 collect input) | ✅ non-overlapping lines |
| CheckInPage.jsx | BUG-497 (L847 advance input), BUG-500 (effectiveBalanceDue L254, GST strip L924) | ✅ different lines |

Recommended execution order: BUG-496 → BUG-497 → BUG-500 (all in same Gate 4 batch if owner approves)

---

**Status:** GATE_1_INTAKE_REVISED → needs Gate 2 (Impact Analysis) + Gate 3 (Plan) before Gate 4 GO
**Previous plans (`plans/BUG-496_IMPLEMENTATION_PLAN.md`) are SUPERSEDED — do not implement until revised plan is written.**
