# Investigation Report — Room GST Wrong Slab + Wrong Base

**Date:** 2026-09-09
**Role:** INVESTIGATION agent (ALPHA v0.7)
**Item:** BUG-GST-ADVANCE (new — recommend INTAKE as BUG-388)
**Risk:** CRITICAL (financial — GST tax, room billing, balance_payment)
**Steps used:** 8/10
**Status:** CLOSED — root cause confirmed, owner decision received

---

## 1. Summary

Two distinct bugs found. Both affect the same check-in form.

| # | Bug | Classification | Confidence |
|---|---|---|---|
| **A** | GST base excludes `advancePayment` — advance is an additional charge, not a deposit | **PLAN_GAP** (FE) | HIGH — owner confirmed OD-GST-02 |
| **B** | Backend slab config has `slab2.min = 7500.01` instead of `7500.00` — ₹7,500 exact hits 5% | **CONFIG_ISSUE** (backend) | HIGH — API probe confirmed |

**Bug A is the primary issue** reported by owner ("total seventy-six hundred, GST not on total amount").
Bug B is secondary — still causes wrong slab when advance = 0 and room = ₹7,500 exactly.

---

## 2. Owner Decision

**OD-GST-02 (2026-09-09): RESOLVED**
> "If additional charge → fix: pass orderAmount + advancePayment as GST base. balance_payment formula also needs revisiting."

`advancePayment` is an **additional charge** on top of the room tariff, not a prepayment/deposit.

---

## 3. Bug A — Plan Gap: Advance Excluded from GST Base

### Data flow (current — wrong)

```
form.orderAmount   = ₹7,500   ← only this goes into computeRoomGst
form.advancePayment = ₹100    ← silently excluded

CheckInPage.jsx L169:
  computeRoomGst(applicable, slabs, Number(form.orderAmount), nights, 1)
                                     ^^^^^^^^^^^^
                                     ₹7,500 only — advance NOT included

→ nightlyUnit = 7500 / 1 / 1 = 7500
→ Slab1 match (max=7500 inclusive) → 5%
→ gstTax = ₹375   ← WRONG

pmsService.js L159:
  balance_payment = orderAmount + gstTax - advance
                  = 7500 + 375 - 100 = ₹7,775  ← WRONG
```

### What should happen (owner-confirmed)

```
GST base  = orderAmount + advance = 7500 + 100 = ₹7,600
Slab      = 7600 → slab2 (min=7500.01 < 7600) → 18%
gstTax    = 18% × 7600 = ₹1,368

balance_payment = (orderAmount + advance) + gstTax - advance
                = orderAmount + gstTax
                = 7500 + 1368 = ₹8,868

Total invoice   = (orderAmount + advance) + gstTax = ₹8,968
Guest advance   = ₹100
Guest balance   = ₹8,868
Total collected = ₹8,968  ✓
```

### Key insight — balance_payment formula change

| | Formula | Result |
|---|---|---|
| **Current (wrong)** | `orderAmount + gstTax - advance` | ₹8,768 |
| **Correct** | `(orderAmount + advance) + gstTax - advance` = `orderAmount + gstTax` | ₹8,868 |
| **Difference** | Off by the advance amount (₹100) | |

---

## 4. Bug B — Config Issue: Slab2.min = 7500.01

**API response for RID 69 (`restaurants[0].settings.room_gst`):**
```json
{
  "slabs": [
    { "min": 0,       "max": 7500,   "gst_percent": 5  },
    { "min": 7500.01, "max": null,   "gst_percent": 18 }
  ]
}
```

**Impact:** At `room = ₹7,500, advance = ₹0` (no advance), GST base = ₹7,500.
- `7500 <= slab1.max (7500)` → 5% ← wrong (should be 18%)
- `7500 >= slab2.min (7500.01)` → false → no match

Bug A fix resolves the ₹7,500 + ₹100 advance case. Bug B remains for the advance = 0 case.

**Backend brief required:** Change `slab2.min` from `7500.01` → `7500.00`
(Optionally change `slab1.max` from `7500` → `7499.99` to avoid overlap.)

---

## 5. Exact Edits Required (for Planning agent)

### Edit E1 — `CheckInPage.jsx` — GST strip display (L385–389)
```js
// Current
const amt = Number(form.orderAmount) || 0;
// ...
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, amt, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (amt / nights) >= (s.min ?? 0) && ...) ...

// Fix
const amt    = Number(form.orderAmount) || 0;
const advAmt = Number(form.advancePayment) || 0;
const gstBase = amt + advAmt;                    // ← include advance
const { gstTotal, cgst, sgst } = computeRoomGst(roomGstApplicable, roomGstSlabs, gstBase, nights, 1);
const rate = roomGstSlabs?.slabs?.find(s => (gstBase / nights) >= (s.min ?? 0) && ...) ...
// "Total incl. GST" label → show gstBase + gstTotal (not just amt + gstTotal)
```

### Edit E2 — `CheckInPage.jsx` — handleConfirm (L169–175)
```js
// Current
const { gstTotal: gstTax } = computeRoomGst(
  roomGstApplicable, roomGstSlabs,
  Number(form.orderAmount),        // ← wrong
  formNights ?? 1, 1
);

// Fix
const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0);  // ← include advance
const { gstTotal: gstTax } = computeRoomGst(
  roomGstApplicable, roomGstSlabs,
  gstBase,                         // ← correct
  formNights ?? 1, 1
);
```

### Edit E3 — `pmsService.js` — balance_payment formula (L159)
```js
// Current
balance_payment: to2dp(orderAmount + (p.gstTax ?? 0) - advance),

// Fix
balance_payment: to2dp(orderAmount + advance + (p.gstTax ?? 0) - advance),
// simplifies to:
balance_payment: to2dp(orderAmount + (p.gstTax ?? 0)),
```

### Backend (separate brief — not FE code)
Change room_gst config for RID 69:
- `slab2.min`: `7500.01` → `7500.00`
- `slab1.max` (optional): `7500` → `7499.99`

---

## 6. Evidence Artifacts

- `/app/memory/evidence/BUG-GST-7500/room_gst_slabs.json` — API slab config
- `/app/memory/evidence/BUG-GST-7500/profile_rid69.json` — full profile response

---

## 7. Planning Skip Eligibility

| Check | Result |
|---|---|
| ≤10 lines, 1 file | NO — 3 edits across 2 files |
| Not financial (R6) | FAIL — touches GST, balance_payment |
| Not hotspot (R5) | PARTIAL — pmsService.js is financial-critical |
| **Verdict** | **Full gate cycle required** (Planning → Gate 4 GO → Implementation → QA) |

---

*Steps used: 8/10 | Two bugs: PLAN_GAP (FE, primary) + CONFIG_ISSUE (backend, secondary)*
*Owner decision OD-GST-02: CONFIRMED — advance is additional charge*
*Investigation agent — 2026-09-09 | CLOSED*
