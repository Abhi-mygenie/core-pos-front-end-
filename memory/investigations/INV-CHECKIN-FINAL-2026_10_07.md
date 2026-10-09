# INV-CHECKIN-FINAL-2026_10_07 — Final Investigation Summary

**Date:** 2026-10-07
**Role:** INVESTIGATION (no code changes)
**Steps used:** 7/10. Confidence: HIGH.

---

## ISSUE 1 — ₹7,900 Discount: NOT the same bug

### Finding: CORRECT by current BUG-509 formula

At ₹7,900 flat and % mode (87.78%):
- gstBase = 1100
- computeBase = 1100 − gstOnAdvFloor(50) = 1050 = advance(1000) + extra_room(50)
- GST = 5% × 1050 = 52.50 (no compound — the 50 is extra ROOM CHARGE, not gstOnAdv)
- displayBalance = 102.50
- collectMax = 100 (= bc − 7900 − advance)
- Hint condition: 102.50 > 100 → TRUE → hint fires ✓ ("Room balance: ₹100 · GST settled at checkout")

The ₹102.50 balance = ₹50 room charge above advance + ₹52.50 GST. Correct.
The hint works. User can collect max ₹100 (room only). ₹2.50 GST is protected.

### Why it LOOKS like the same bug

Old ₹7,949 (before fix) showed CGST ₹26.27, balance ₹103.55.
Current ₹7,900 shows CGST ₹26.25, balance ₹102.50.
Numerically similar. But different causes — ₹7,900 values are mathematically correct.

---

## ISSUE 1 — % Mode: No separate issue

| Input | roomDiscountRs | computeBase | balance | Button |
|-------|---------------|-------------|---------|--------|
| 87.78% (≡ ₹7,900) | 7900 | 1050 | ₹102.50 | ENABLED |
| 88.33% (≡ ₹7,949) | 7949 | 1001 | ₹51.05 | ENABLED |
| 88.34% (= maxPct, ≡ ₹7,950) | 7950 | 1000 | ₹50.00 | ENABLED ✓ |
| 88.35%+ (over max) | 7950 (capped) | 1000 | ₹50.00 | DISABLED |

% mode correct after BUG-510.

---

## ISSUE 2 — Collect Now at Max (₹7,950): CONFIRMED BUG

### Business logic (owner-stated)
"The ₹50 we are collecting is GST not room rent — that's why we didn't discount that ₹50
and we settle GST at checkout."

The maxFlat formula deliberately preserves gstOnAdv (₹50):
  maxFlat = bc − advance − gstOnAdv = 9000 − 1000 − 50 = 7950

This means: at max discount, the minimum remaining bill = ₹50 = gstOnAdv. This ₹50 is
reserved for GST settlement at checkout — NOT collectable at check-in.

### Root cause
  collectMax at max = bc − maxFlat − advance = gstOnAdv = ₹50
  displayBalance at max = ₹50
  Hint condition: displayBalance > collectMax → 50 > 50 → FALSE (strict inequality misses equal)
  → No protection. User can collect ₹50 (= gstOnAdv) at check-in. WRONG.

### Detection condition (targeted — fires ONLY at max)
  collectMax <= gstOnAdvFloor
  → max (7950): 50 ≤ 50 = TRUE  ← fires
  → ₹7,949: 51 > 50 = FALSE     ← silent
  → ₹7,900: 100 > 50 = FALSE    ← silent

Both flat and % mode affected (same roomDiscountRs = maxFlat).

### Fix direction (UI-only)
1. New const: collectAtMaxGst = (collectMax <= gstOnAdvFloor && collectMax > 0)
2. When TRUE: show "Maximum discount applied — GST settled at checkout. Nothing to collect at check-in."
3. When TRUE: set collect input max = 0 (or disable)
4. collectMax for backend: UNCHANGED (BUG-500 preserved)

Files: CheckInForm.jsx (~3 lines) + CheckInPage.jsx (~3 lines)

---

## Summary Table

| Scenario | Status | Root cause |
|----------|--------|-----------|
| ₹7,949 flat | ✅ Fixed (BUG-509) | computeBase guard missed by 1 |
| ₹7,949 % mode | ✅ Fixed (BUG-509 + BUG-510) | same + maxPct ceil |
| ₹7,900 flat | ✅ Correct | not a bug — ₹102.50 is right |
| ₹7,900 % mode | ✅ Correct | same as flat |
| Max ₹7,950 collect now | ❌ Confirmed bug | hint: 50>50=FALSE; strict > misses equal |
| Max % 88.34% collect now | ❌ Same bug | roomDiscountRs=maxFlat → same condition |
