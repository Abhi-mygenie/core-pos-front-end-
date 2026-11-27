# INV-SC-PREPAID — Service Charge Included in API Payload Despite UI Removal

**Date:** 2026-11-16
**Role:** INVESTIGATION
**Classification:** CRITICAL risk (money, billing, financial payload)
**Steps Used:** 8/10
**Confidence:** HIGH — code-traced end-to-end, root cause pinpointed to exact lines
**Restaurant:** RID 675, Table 6087, Dine-In, Cash, Prepaid

---

## 1. Summary

**Root Cause: CODE_ERROR in `OrderEntry.jsx` — BUG-662 logic at lines 1708-1709 and 2492-2493.**

The `placeOrderWithPayment` (prepaid) path computes `serviceChargePercentage` using:
```javascript
(!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0)
```

When `autoServiceCharge=true` (restaurant setting), this expression is **ALWAYS true** — regardless of the cashier's toggle state in CollectPaymentPanel. The `||` (OR) operator means the left side (`autoServiceCharge=true`) short-circuits, ignoring the right side (`serviceCharge > 0` from the toggle). Result: `calcOrderTotals` receives the full SC percentage and computes SC + SC GST into `order_amount` even when the cashier explicitly turned SC OFF.

**Impact:** `order_amount` sent to backend = ₹275 (with SC). Actual collected = ₹250 (without SC). Discrepancy = ₹25 (SC ₹23.81 + SC GST ₹1.19). Backend records ₹275 as the order total — **books don't match cash collected**.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|-----------|-------------|-------|--------|----------|
| H1 | CollectPaymentPanel doesn't zero SC when toggle is OFF | Code trace (CPP L796-798) | 1 | **ELIMINATED** | `serviceCharge = scApplicable && serviceChargeEnabled && ... : 0` — when toggle OFF, `serviceChargeEnabled=false` → `serviceCharge=0` ✅ |
| H2 | `paymentData` doesn't carry the 0 SC value to OrderEntry | Code trace (CPP L1337) | 1 | **ELIMINATED** | `paymentData.serviceCharge = serviceCharge` = 0 when toggle OFF ✅ |
| H3 | OrderEntry `scApplicable` ignores toggle-OFF state | Code trace (OE L1708-1709) | 1 | **CONFIRMED** | `!!restaurant?.autoServiceCharge` is true → OR short-circuits → `scApplicable=true` always |
| H4 | `calcOrderTotals` receives wrong percentage | Code trace (OE L1719) | 1 | **CONFIRMED** | `scApplicable ? restaurant.serviceChargePercentage : 0` → passes full % when scApplicable=true |
| H5 | `calcOrderTotals` computes SC from percentage, not from CPP amount | Code trace (orderTransform L862-863) | 1 | **CONFIRMED** | `serviceCharge = postDiscount * serviceChargePercentage / 100` → re-computes from %, ignoring toggle |
| H6 | `collectBillExisting` has same bug | Code trace (orderTransform L1522, 1707) | 1 | **ELIMINATED** | `collectBillExisting` reads `serviceCharge` directly from `paymentData` (₹ amount, not %) — uses 0 when toggle OFF ✅ |

---

## 3. Data Flow Trace — The Bug Path

### CollectPaymentPanel (UI layer — CORRECT)
```
L459-474: useState(serviceChargeEnabled)
  → Default: autoServiceCharge && scApplicable && serviceChargePercentage > 0
  → Cashier toggles OFF → serviceChargeEnabled = false

L796-798: serviceCharge computed
  → scApplicable && serviceChargeEnabled && serviceChargePercentage > 0
  → serviceChargeEnabled = false → serviceCharge = 0  ✅

L822: scGst = serviceCharge * scTaxRate = 0 * rate = 0  ✅
L858: subtotal does NOT include SC  ✅
L866: rawFinalTotal does NOT include SC  ✅

L1337: paymentData.serviceCharge = 0  ✅  (correct in UI)
L1350: paymentData.serviceGstTaxAmount = 0  ✅
```
**UI shows ₹250. paymentData carries 0 SC. All correct here.**

### OrderEntry (routing layer — THE BUG)
```
onPaymentComplete(paymentData) called with serviceCharge=0

L1706-1709 (QSR prepaid path):
  scApplicable = (orderType === 'dineIn')    // TRUE
    && (!!restaurant?.autoServiceCharge      // TRUE (restaurant setting)
        || paymentData?.serviceCharge > 0);  // FALSE (toggle OFF)
  
  → TRUE && (TRUE || FALSE) = TRUE && TRUE = TRUE  ⚠️ BUG

L1719:
  serviceChargePercentage: scApplicable ? restaurant.serviceChargePercentage : 0
  → TRUE ? 10 : 0 = 10  ⚠️ passes 10% instead of 0

L2491-2493 (non-QSR Scenario 2 prepaid path):
  SAME BUG — identical logic with BUG-662 comment
```

### orderTransform.placeOrderWithPayment (payload builder)
```
L1296: receives serviceChargePercentage = 10 (from the buggy scApplicable)

L1338: totals = calcOrderTotals(items, 10, {...})

calcOrderTotals L862-863:
  serviceCharge = postDiscount * 10 / 100 = 238.10 * 10% = 23.81  ⚠️
  
L893: scGstAmt = 23.81 * 5% = 1.19  ⚠️
L916: rawTotal = 238.10 + 23.81 + 0 + 0 + 13.09 = 275.00  ⚠️

L922-935 returns:
  service_tax: 23.81                ⚠️ should be 0
  service_gst_tax_amount: 1.19      ⚠️ should be 0
  order_amount: 275                  ⚠️ should be 250

L1410: ...totals spread into API payload → sent to backend
```

---

## 4. Affected vs Unaffected Paths

| Path | Flow | SC Logic | Affected? |
|------|------|----------|-----------|
| `placeOrder` (unpaid) | Place without payment | Uses only `autoServiceCharge` (no toggle exists yet) | NO — correct by design |
| `updateOrder` (add items) | Update existing order | Uses only `autoServiceCharge` | NO — correct by design |
| `placeOrderWithPayment` — QSR | QSR prepaid | BUG-662: `autoServiceCharge \|\| serviceCharge > 0` | **YES — THE BUG** |
| `placeOrderWithPayment` — Scenario 2 | Non-QSR prepaid | BUG-662: identical logic | **YES — THE BUG** |
| `collectBillExisting` | Collect bill on placed order | Reads `paymentData.serviceCharge` (₹ amount) directly | NO — correct |
| `collectBillExisting` — QSR | QSR collect on placed | Same as above | NO — correct |

**Bug scope:** ONLY `placeOrderWithPayment` (prepaid fresh orders). Both QSR and non-QSR paths are affected.

---

## 5. BUG-662 Context — How the Bug Was Introduced

The comment at L1706-1707 explains the intent:
```
// BUG-662: honour cashier's manual SC toggle on prepaid. paymentData.serviceCharge > 0
// means the cashier ticked SC ON in CollectPaymentPanel (even when auto=No).
```

**Original problem (BUG-662):** When `autoServiceCharge=No`, the old code always passed `serviceChargePercentage=0`, so cashiers who manually toggled SC ON in CPP couldn't get SC into the prepaid payload.

**BUG-662 fix:** Added `|| paymentData?.serviceCharge > 0` to also enable SC when the cashier manually toggles it ON.

**Unintended side effect:** The `||` (OR) operator means `autoServiceCharge=true` (left side) ALWAYS makes `scApplicable=true` — the cashier's toggle-OFF (`serviceCharge=0`, right side) is NEVER evaluated when `autoServiceCharge` is true.

**The logic reads:** "SC is applicable if auto is ON **OR** cashier toggled it ON"
**It should read:** "SC is applicable if cashier toggled it ON (where auto determines the default toggle state)"

---

## 6. Amount Breakdown Verification

From the bug report:
```
Subtotal (excl. tax): ₹261.91
GST:                  ₹ 13.09
Service Charge:       ₹ 23.81  ← should be 0
Service Charge GST:   ₹  1.19  ← should be 0
Order Amount:         ₹275.00  ← should be 250
Actual Collected:     ₹250.00
```

Cross-check: 261.91 + 13.09 = 275.00 (matches order_amount)
Without SC: 261.91 - 23.81 = 238.10 (item subtotal pre-SC)
238.10 + 13.09 - 1.19 = 250.00 (matches actual collected, since SC GST is also included in the 13.09)

Actually: The ₹13.09 GST includes SC GST (₹1.19). Correct order amount without SC:
- Item subtotal: ₹238.10
- Item GST only: ₹13.09 - ₹1.19 = ₹11.90
- Total: ₹238.10 + ₹11.90 = ₹250.00 ✅ matches actual collected

---

## 7. Recommendations

**Classification:** CODE_ERROR — BUG-662 fix has an unintended side-effect.

### Fix (1 logical change, 2 locations):

**The correct logic:** The CPP already computes the correct SC amount (₹0 when toggle OFF, ₹N when toggle ON). The `placeOrderWithPayment` path should trust this computed amount, not re-derive applicability from `autoServiceCharge`.

**Location 1:** `OrderEntry.jsx:1708-1709` (QSR prepaid path)
```
CURRENT:
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);

FIX:
  && paymentData?.serviceCharge > 0;
```

**Location 2:** `OrderEntry.jsx:2492-2493` (Scenario 2 prepaid path)
```
CURRENT:
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0) // BUG-662

FIX:
  && paymentData?.serviceCharge > 0
```

**Why this is safe:**
- When cashier toggles SC ON: `paymentData.serviceCharge > 0` = true → passes SC % → `calcOrderTotals` computes SC ✅
- When cashier toggles SC OFF: `paymentData.serviceCharge = 0` → passes 0% → `calcOrderTotals` computes 0 SC ✅
- When SC is not applicable (takeaway/delivery): `paymentData.serviceCharge = 0` → passes 0% ✅
- Edge case: items total ₹0 (all comp) + SC ON: `paymentData.serviceCharge = 0` (SC of 0 * rate = 0) → passes 0% → correct (SC on ₹0 base is ₹0)

**Risk:** LOW — change is 2 lines, same file, no hotspot. `autoServiceCharge` continues to control the DEFAULT toggle state in CollectPaymentPanel (L466-474) — that's unaffected.

### Planning skip eligible?
- ≤10 lines: YES (2 lines)
- 1 file: YES (OrderEntry.jsx)
- Not hotspot: OrderEntry IS an R5 hotspot → **NO — requires full Planning gate**
- Financial logic: YES → CRITICAL risk

**Verdict: Full Planning gate required** (R5 hotspot + financial logic).

---

## 8. Evidence Artifacts

| File | Lines | Finding |
|------|-------|---------|
| `CollectPaymentPanel.jsx` | 459-474 | SC toggle default uses `autoServiceCharge` ✅ |
| `CollectPaymentPanel.jsx` | 796-798 | SC amount = 0 when toggle OFF ✅ |
| `CollectPaymentPanel.jsx` | 1337, 1350 | paymentData carries 0 SC + 0 SC GST ✅ |
| `OrderEntry.jsx` | 1706-1709 | **BUG: `autoServiceCharge \|\| serviceCharge > 0` always true when auto=true** |
| `OrderEntry.jsx` | 2491-2493 | **Same BUG in Scenario 2 path** |
| `OrderEntry.jsx` | 1719 | Passes full SC % to transform when scApplicable=true |
| `orderTransform.js` | 1338 | `calcOrderTotals` receives wrong SC % → computes SC |
| `orderTransform.js` | 862-863, 893, 916, 930, 935 | SC + SC GST computed and spread into payload |
| `orderTransform.js` | 1516-1522, 1707 | `collectBillExisting` reads ₹ amount directly — NOT affected |

Saved to: `/app/memory/evidence/INV-SC-PREPAID-2026-11-16/`

---

## 9. Retroactive Candidates

None identified.

---

## Report Footer

```
Root cause: CODE_ERROR — BUG-662 fix at OrderEntry.jsx:1708-1709 and 2492-2493.
  `!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0`
  always true when autoServiceCharge=true, ignoring cashier's SC toggle OFF.
  Result: calcOrderTotals receives full SC % → computes SC + SC GST into
  order_amount even when UI shows 0 SC. Payload: ₹275. Collected: ₹250.
Confidence: HIGH. Steps: 8/10.
Classification: CODE_ERROR (BUG-662 unintended side-effect)
FE fix: YES — 2 lines in 1 file (OrderEntry.jsx). Remove autoServiceCharge
  from the OR condition; trust paymentData.serviceCharge > 0 alone.
Planning skip eligible: NO — OrderEntry is R5 hotspot + financial logic.
Retroactive candidates: NONE.
Investigation report at: /app/memory/investigations/INV-SC-PREPAID-2026-11-16.md
```
