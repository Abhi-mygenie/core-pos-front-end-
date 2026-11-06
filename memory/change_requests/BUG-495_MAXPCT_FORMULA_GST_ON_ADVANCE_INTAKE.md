# BUG-495 — maxDiscount / maxPct formula ignores GST on advance for GST-enabled hotels

**ID:** BUG-495
**Type:** BUG (formula gap in BUG-492 Sub-B implementation)
**Date:** 2026-10-06
**Registered by:** Intake agent (session 2026-10-06, owner-reported)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** HIGH
**Severity:** P1
**Related:** BUG-492 Sub-B (PARENT — this corrects its maxPct formula), BUG-494 (RELATED — same area)

---

## Description

BUG-492 Sub-B introduced a `maxPct` cap and red alert to prevent cashiers from entering a % discount that has no additional effect beyond `balance_due`. However, the formula does not account for the GST implied in the advance payment for GST-enabled hotels.

**Current formula (BUG-492 Sub-B, all 3 components):**
```
maxDiscountAmount ≈ balance_due  (charge.balance_due or effectiveBalanceDue)
maxPct = floor(balance_due / booking_charge × 100)
```

**Problem (owner-reported, 2026-10-06):**

For a GST-enabled hotel, room = ₹1,500, advance = ₹300:

| Step | Action | Discounted room | GST on discounted | Total due | Advance | Balance |
|------|--------|----------------|-------------------|-----------|---------|---------|
| Current cap (non-GST) | 80% / ₹1,200 | ₹300 | ₹15 | ₹315 | ₹300 | **₹15 (GST only)** ← AWKWARD |
| Correct cap (GST-aware) | 79% / ₹1,185 | ₹315 | ₹15.75 | ₹330.75 | ₹300 | **₹30.75** (both room + GST collectable) |

At the current 80% cap, the discounted room price equals the advance. The advance "covers" the room but leaves only GST outstanding. This creates an awkward situation: the system shows balance = ₹0 for the room but ₹15 for GST, which is confusing at checkout.

The same issue applies to split-discount scenarios (discount at check-in + discount at checkout):
- 40% at check-in (₹600) → balance = ₹600
- 40% at checkout (₹600) → total discount = 80% (₹1,200) → hits the awkward GST-only-outstanding state
- The checkout discount of ₹600 should not be allowable; correct cap = ₹585 (so total ≤ ₹1,185)

---

## Business Rule (owner, 2026-10-06)

**For GST-applicable hotels, the maximum discount must ensure the advance covers the discounted room price AND its GST:**

```
gst_implied_in_advance   = advance_payment × gst_rate_for_booking
maxDiscountAmount        = booking_charge − advance_payment − gst_implied_in_advance
                         = booking_charge − advance_payment × (1 + gst_rate)
maxPct                   = floor(maxDiscountAmount / booking_charge × 100)
```

**For non-GST hotels (unchanged):**
```
maxDiscountAmount = booking_charge − advance_payment
maxPct            = floor(maxDiscountAmount / booking_charge × 100)
```

**Proof (room = ₹1,500, advance = ₹300, GST = 5%):**
```
gst_implied_in_advance = 300 × 0.05 = ₹15
maxDiscountAmount      = 1500 − 300 − 15 = ₹1,185
maxPct                 = floor(1185/1500×100) = 79%

At 79% discount: discounted_room = ₹315, GST on ₹315 = ₹15.75, balance = ₹30.75
→ Both room and GST components are outstanding. Advance does NOT fully cover. Cashier can collect.
```

**`gst_rate` derivation:** Use `computeRoomGst(roomGstApplicable, roomGstSlabs, advance_payment, nights, 1).gstTotal / advance_payment`

OR simplified: use `(charge.sgst + charge.cgst) / charge.booking_charge` (LR API rate, same slab) × advance.

---

## Current formula gaps per component

| Component | Current maxPct formula | Gap |
|-----------|----------------------|-----|
| `CheckInForm.jsx` L69-73 | `Math.floor(c.balance_due / c.booking_charge × 100)` | `c.balance_due` includes GST on full price → 85% for 5% GST hotel (too high) |
| `CheckInPage.jsx` L272-276 | `Math.floor(effectiveBalanceDue / form.orderAmount × 100)` | `effectiveBalanceDue` includes full-price GST → similarly too high |
| `FolioCheckoutPanel.jsx` RoomSection L54-58 | `Math.floor(c.balance_due / c.booking_charge × 100)` | Same as CheckInForm |

All three need: `maxDiscountAmount = booking_charge − advance × (1 + gst_rate)` for GST hotels.

**Note:** For non-GST hotels (`roomGstApplicable = false`), current formula gives `floor((booking_charge − advance) / booking_charge × 100)` which is correct (gst_rate = 0).

---

## Code Reality

**NONE** — no corrected formula exists. BUG-492 Sub-B formula active at:
- `CheckInForm.jsx` L69-73
- `CheckInPage.jsx` L272-276
- `FolioCheckoutPanel.jsx` L54-58

---

## Duplicate Check

- **BUG-492 Sub-B:** PARENT — this is a formula correction to BUG-492 Sub-B's maxPct implementation. **DISTINCT** (different formula, same files).
- No other duplicate found.

---

## Severity

**P1 — HIGH**
- GST-enabled hotels show wrong maxPct (e.g., 85% shown when correct is 79%)
- Allows discounts that leave only GST outstanding at checkout (confusing/error-prone)
- Affects all 3 discount entry points (check-in form, arrivals page, checkout Bill panel)

---

## Risk Classification

**HIGH**
- 3 files, all modified by BUG-492 Sub-B — requires targeted changes to 3 useMemo blocks
- Financial validation (discount cap) — wrong cap can result in incorrect amounts collected
- Requires `computeRoomGst` import in CheckInForm + FolioCheckoutPanel (new import)
- Fast Lane: NOT eligible (3 files, financial logic)

---

## Evidence

- Owner-reported 2026-10-06 with example:
  - Room ₹1,500, advance ₹300, GST 5%
  - "can't exceed 1185 (79%)" — not 1200 (80%)
  - "discount rule need to include gst of advance paid for gst enabled hotels"
- Formula verified analytically: `maxDiscountAmount = booking_charge − advance × (1 + gst_rate)`
- **Source:** OWNER-REPORTED
- **Confidence:** HIGH (formula proven)

---

## Blast Radius

| File | Change |
|------|--------|
| `src/components/pms/frontdesk/CheckInForm.jsx` | L69-73: maxPct useMemo formula |
| `src/pages/pms/CheckInPage.jsx` | L272-276: maxPct useMemo formula |
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | L54-58: maxPct useMemo in RoomSection |

- **3 files** — all already modified by BUG-492 Sub-B
- **Blast radius: SMALL** (targeted useMemo formula changes only)
- New import: `computeRoomGst` in CheckInForm + FolioCheckoutPanel (CheckInPage already has it)

---

## Owner Decisions

All decisions **LOCKED** (owner-confirmed 2026-10-06):

| OD | Decision |
|----|---------|
| OD-495-01 | GST hotel formula: `maxDiscount = booking_charge − advance × (1 + gst_rate)`. LOCKED. |
| OD-495-02 | Non-GST hotel formula: unchanged `maxDiscount = booking_charge − advance`. LOCKED. |

**No open ODs. Gate 2 can proceed immediately.**

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation.
Same sprint (oct_bug_batch). Can be planned and implemented alongside BUG-494.
