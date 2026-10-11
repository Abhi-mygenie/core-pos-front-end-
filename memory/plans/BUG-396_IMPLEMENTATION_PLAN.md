# BUG-396 Implementation Plan — Gate 3
## PMS Check-In: GST calculated on advance (advance is deposit, not additional charge)

**ID:** BUG-396
**Date:** 2026-09-13
**Role:** PLANNING agent (ALPHA v0.7)
**Gate:** 3 — Implementation Plan
**Risk:** CRITICAL (R6)
**Impact Analysis:** `impact/BUG-396_IMPACT_ANALYSIS.md`

---

## Scope Lock

**Files WILL change:**
- `src/pages/pms/CheckInPage.jsx`
- `src/api/services/pmsService.js`

**Files will NOT touch:**
- `roomGstCalculator.js` — pure utility, no change needed
- `profileTransform.js` — slab config unchanged
- `PmsCheckoutDrawer.jsx` — reads gst_tax from API, not re-computed
- `orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx` — not in PMS check-in path
- `App.js`, `AppProviders.jsx`, any localStorage key

---

## Edit Sites (3 total — 2 files)

---

### E1 — `CheckInPage.jsx` ≈ L255-260 — handleConfirm submit gstBase

**Location:** Inside `handleConfirm` async function, just before `computeRoomGst` call.

**Current (wrong):**
```js
      // BUG-386: compute GST before submit — BUG-388: gstBase includes advance (advance is additional charge)
      const gstBase = Number(form.orderAmount) + Number(form.advancePayment || 0); // BUG-388
      const { gstTotal: gstTax } = computeRoomGst(
        roomGstApplicable,
        roomGstSlabs,
        gstBase, // BUG-388: was Number(form.orderAmount) only
        formNights ?? 1,
        1  // single-room check-in (pms_gst.md §5)
      );
```

**New (correct):**
```js
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

**Verification:** After edit, `gstBase` at submit equals `form.orderAmount` only. `form.advancePayment` NOT in gstBase.

---

### E2 — `CheckInPage.jsx` ≈ L766-767 — GST display strip IIFE gstBase

**Location:** Inside the `{(() => { ... })()}` IIFE that renders the GST accommodation strip in JSX.

**Current (wrong):**
```js
                      const amt = Number(form.orderAmount) || 0;
                      const advAmt = Number(form.advancePayment) || 0;
                      const gstBase = amt + advAmt; // BUG-388: advance is additional charge — include in GST base
```

**New (correct):**
```js
                      const amt = Number(form.orderAmount) || 0;
                      const gstBase = amt; // BUG-396: advance is deposit — GST base is room amount only
```

**Change:** Remove `advAmt` declaration (no longer needed, eliminates unused variable). Change `gstBase` to `amt` only.

**Verification:** Display strip reacts to changes in `form.orderAmount` only. Changing advance does NOT change the GST strip values.

---

### E3 — `pmsService.js` ≈ L193 — `balance_payment` API field

**Location:** Inside `pmsCheckIn()` function, money block.

**Current (wrong):**
```js
  fd.append('balance_payment', String(to2dp(orderAmount + (p.gstTax ?? 0)))); // BUG-388 preserved
```

**New (correct):**
```js
  fd.append('balance_payment', String(to2dp(orderAmount + (p.gstTax ?? 0) - advance))); // BUG-396: advance is deposit — subtract from balance (guest owes total minus advance paid)
```

**Verification:** `advance` is already declared at L144 as `const advance = to2dp(p.advancePayment)`. Zero-advance case: `- 0` has no effect (regression-safe).

---

## Execution Sequence

```
1. Edit E1 (CheckInPage.jsx handleConfirm)
2. Edit E2 (CheckInPage.jsx display IIFE)  
3. Edit E3 (pmsService.js balance_payment)
4. Webpack compile check — 0 new warnings
5. Self-test all 3 edit sites (Verification Matrix)
```

---

## Verification Matrix

| Edit | File | Change | How to Verify |
|---|---|---|---|
| E1 | `CheckInPage.jsx:256` | `gstBase = Number(form.orderAmount)` — no advance | Grep: `form.advancePayment` must NOT appear in the gstBase assignment at this line |
| E2 | `CheckInPage.jsx:767` | `gstBase = amt` — `advAmt` removed | Grep: `advAmt` must NOT appear in file (it's only in this one IIFE) |
| E3 | `pmsService.js:193` | `balance_payment = orderAmount + gstTax - advance` | Grep: `balance_payment` line must contain `- advance` |

**Manual browser verification (3 scenarios):**

| Scenario | Expected GST strip | Expected balance |
|---|---|---|
| Room ₹100, Adv ₹100 | 5% slab, CGST ₹2.50, SGST ₹2.50, Total ₹105 | balance = ₹5 in payload |
| Room ₹7,500, Adv ₹100 | **5% slab** (not 18%), GST ₹375, Total ₹7,875 | balance = ₹7,775 |
| Room ₹7,500, Adv ₹0 | 5% slab, GST ₹375, Total ₹7,875 | balance = ₹7,875 (unchanged) |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-396 → status: IMPLEMENTED, gate: 5, sprint_key: pos_pms_1
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: CheckInPage.jsx + pmsService.js entries added for BUG-396
- [ ] Code markers: // BUG-396 comment in every modified line
- [ ] Webpack: 0 new warnings
```

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Zero-advance regression | LOW | `- advance` where advance=0 → mathematically no-op. Verified in numeric table. |
| CR-380 conflict | LOW | Different sections. Conflict pre-check CLEAR (IA §3). |
| advAmt used elsewhere in IIFE | LOW | Full IIFE read confirms advAmt only used on the one gstBase line. |
| balance_payment sign error | LOW | `advance` is `to2dp(p.advancePayment)` — always non-negative (form validation: `advance <= orderAmount`). |

---

*Plan complete: BUG-396. Gate 3 DONE. Awaiting Gate 4 GO from owner.*
