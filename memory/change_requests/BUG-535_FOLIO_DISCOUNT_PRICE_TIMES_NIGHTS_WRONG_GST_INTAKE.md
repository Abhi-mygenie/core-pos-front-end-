# BUG-535 — Intake

## FolioCheckoutPanel: `discountedPrice * nights` Causes Wrong GST Slab for Multi-Night Bookings After Extension

**Date:** 2026-10-10
**Type:** BUG / FE_CALCULATION_ERROR
**Priority:** P1
**Risk:** HIGH (wrong checkout balance shown to cashier — ₹14,504 instead of ₹11,020)
**Area:** PMS / Front Desk / FolioCheckoutPanel (checkout bill)
**Sprint:** oct_bug_batch
**Registered by:** INVESTIGATION role (INV-EXTEND-STAY-POST-EXTENSION-BUGS_2026_10_10.md)
**Related:** BUG-534 (same session, result panel display), BUG-533 (extend stay enrichedRow), BUG-517 (gstRate formula — same block)
**Backend co-deploy required:** YES — see §Backend Dependency

---

## Duplicate Check

**DISTINCT.**
- BUG-494/BUG-515/BUG-517/BUG-527: All previous GST fixes; none addressed the `* nights` multiplier in `discountedPrice * nights` at L248.
- This bug was LATENT for 1-night bookings (nights=1, `* 1` = no-op). Extension to 2 nights exposed it.
- BUG-534: Different file, different panel.

---

## Symptom (from screenshots)

After extending a 1-night booking to 2 nights (bonk r4, check-in discount ₹1,000):

| | Observed | Expected |
|---|---|---|
| SGST (folio bill) | **₹2,052** | ₹310 |
| CGST (folio bill) | **₹2,052** | ₹310 |
| Room balance | **₹14,504** | ₹11,020 |
| Balance column (InHouse row) | ₹11,020 ✓ | ₹11,020 ✓ |

The InHouse balance column is correct (₹11,020) but the folio checkout bill shows ₹14,504 — a ₹3,484 discrepancy.

---

## Code Reality Check

**NONE — fix not applied.**

```
FolioCheckoutPanel.jsx L248:
  computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
  ← "* nights" present — bug confirmed
  
FolioCheckoutPanel.jsx L253:
  gst.gstTotal / (discountedPrice * nights)
  ← "* nights" in denominator present — bug confirmed
```

---

## Root Cause — Two Compounding Bugs

### Bug 1: `* nights` multiplier on `discountedPrice` (L248)

```js
// FolioCheckoutPanel.jsx L246-248:
const discountedPrice = Math.max(0, bc - discountAmt);
// bc = ₹13,400 (rack, after BE fix)  discountAmt = ₹1,000
// discountedPrice = ₹12,400  ← total for ALL nights (not per-night)

const gst = computeRoomGst(applicable, slabs, discountedPrice * nights, nights, 1);
//                                              ↑ discountedPrice is TOTAL, multiplying by nights double-counts
```

`computeRoomGst` internally divides `totalAmount` by `nights` to derive `nightlyUnit`:
```
nightlyUnit = (discountedPrice × nights) / roomCount / nights
            = discountedPrice          ← because nights cancel out!
```

For 2 nights: `nightlyUnit = ₹12,400` → exceeds ₹7,500 threshold → **18% slab** instead of **5%** → GST ₹4,464 instead of ₹620.

**Fix:** Pass `discountedPrice` directly (not `* nights`). `computeRoomGst` already handles the nights division internally.

### Bug 2: `gstRate` denominator (L253) — same `* nights` error

```js
// FolioCheckoutPanel.jsx L253:
const gstRate = gst.gstTotal / (discountedPrice * nights);
// For 2 nights: ₹620 / ₹24,800 = 0.025 ← half the correct rate
// Correct: ₹620 / ₹12,400 = 0.05

// Fix:
const gstRate = gst.gstTotal / discountedPrice;
```

`gstRate` feeds `maxCheckoutDiscount` — the cap on any additional room discount at checkout. Wrong rate allows a larger discount than permitted.

---

## Simulation Results (verified programmatically)

```
Variables: bc_rack=₹13,400, discountAmt=₹1,000, nights=2, bp=₹10,400
GST slabs: 0-7500: 5%, >7500: 18%

STATE 1 — CURRENT (LR has discounted bc=₹12,400 + * nights bug):
  discountedPrice = ₹11,400 (double discount)
  gstTotal = ₹4,104, sgst=cgst=₹2,052
  base = ₹14,504  ← screenshots confirmed

STATE 2 — BE FIX ONLY (rack bc=₹13,400, * nights still present):
  discountedPrice = ₹12,400
  gstTotal = ₹4,464, sgst=cgst=₹2,232
  base = ₹14,864  ← STILL wrong (different wrong value!)

STATE 3 — BOTH FE + BE FIX:
  discountedPrice = ₹12,400
  gstTotal = ₹620, sgst=cgst=₹310
  base = ₹11,020  ← correct ✓
```

**BE fix alone changes ₹14,504 → ₹14,864 (still wrong). FE fix alone → ~₹10,970 (close but off by ₹50 due to backend still having discounted booking_charge). Both must co-deploy.**

---

## Backend Dependency

The backend must deploy `AiosellReservationChargeService.php` + `AiosellLocalReservationService.php` to ensure `charge.booking_charge` = rack value in LR snapshot (per contract). See backend brief: `BACKEND_BRIEF_BUG535_EXTEND_CHARGE_BOOKING_CHARGE_2026_10_10.md`.

**Deploy order:** BE deploys first (or simultaneously) → FE goes live.

---

## Evidence

- Source: OWNER-REPORTED (screenshots 2026-10-10) + AGENT-CONFIRMED (code trace + simulation)
- Contract doc: `extend_stay_charge_fe.md` — Option B locked (rack `booking_charge`)
- Simulation: node -e script, STATE 1/2/3 all verified
- Confidence: HIGH

---

## Blast Radius

| File | R5? | Change |
|------|-----|--------|
| `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | NO | L248: remove `* nights`; L253: remove `* nights` from denominator — 2 lines |

**Scope:** SMALL (1 file, 2 lines, NOT R5)
**Fast Lane eligible:** NO (financial calculation — full gate required)
**Latent bug:** For 1-night bookings, `* 1` = no-op — zero regression risk for existing checkouts.

---

## Open Questions

- OD-535-01: **Backend co-deploy timing** — can FE and BE ship in the same deployment? Or does FE fix need a feature flag until BE is live?
  - Recommended: ship together (BE deploys LR overlay first, then FE goes live)

---

## Gate Status

- Gate 1: COMPLETE (this document)
- Gate 2: PENDING
- Gate 3: PENDING
- Gate 4 GO: NOT given (also awaiting BE deployment confirmation)

---

## Next

"Gate 2 GO BUG-535" → PLANNING → Gate 3 → Gate 4 GO **co-timed with BE deploy**.
