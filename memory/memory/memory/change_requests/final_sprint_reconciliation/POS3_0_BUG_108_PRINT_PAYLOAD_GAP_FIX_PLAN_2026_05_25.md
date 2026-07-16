# POS 3.0 BUG-108 — Print Payload (order-temp-store) Gap Fix Plan (P-1, P-3)

**Date:** 2026-05-25
**Status:** `bug_108_print_payload_gap_fix_plan_ready_for_implementation`
**Scope:** Fix missing/wrong coupon fields in auto-print overrides
**File:** `frontend/src/components/order-entry/OrderEntry.jsx` (1 file)

---

## 1. Gaps Addressed

| # | Gap | What happens today | Impact on printed bill | Fix |
|---|---|---|---|---|
| P-1 | `couponDiscount` missing from all 4 auto-print override blocks | `buildBillPrintPayload` receives no `couponDiscount` override → defaults to `0` | Bill prints "Coupon CODE −₹0" instead of actual discount amount | Add `couponDiscount: paymentData?.discounts?.couponDiscount \|\| 0` |
| P-3 | `couponCode` reads `couponTitle` (display name) instead of `couponCode` (the code) | Auto-print sends `"Summer 20% off"` where `"SUMMER20"` should be | Bill prints coupon title instead of code | Change source from `couponTitle` → `couponCode` |

**Note:** Manual "Print Bill" button (CollectPaymentPanel L1086-1090) is correct — both `couponCode` and `couponDiscount` are sent properly. Only the auto-print paths in OrderEntry.jsx are affected.

---

## 2. Affected Locations (4 auto-print override blocks)

| # | Location | Scenario | Current line (approx) |
|---|---|---|---|
| **1** | QSR PlaceAndPay auto-print | QSR fresh order: place + pay in one shot | L1203-1214 |
| **2** | QSR Collect Bill auto-print | QSR already-placed order: collect bill | L1264-1275 |
| **3** | Scenario 2 auto-print | Non-QSR fresh prepaid place+pay | L1650-1665 |
| **4** | Scenario 1 auto-print | Non-QSR postpaid collect bill | L1873-1900 |

---

## 3. File-Level Change Plan

### File: `frontend/src/components/order-entry/OrderEntry.jsx`

#### Edit 1 — QSR PlaceAndPay auto-print (~L1203-1214)

**Current:**
```js
const overrides = {
  orderItemTotal:      paymentData?.itemTotal,
  orderSubtotal:       paymentData?.subtotal,
  paymentAmount:       paymentData?.finalTotal,
  discountAmount,
  serviceChargeAmount: paymentData?.serviceCharge || 0,
  deliveryCharge:      paymentData?.deliveryCharge || 0,
  gstTax:              paymentData?.printGstTax,
  vatTax:              paymentData?.printVatTax,
  tip:                 paymentData?.tip || 0,
  ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
};
```

**After:** Add 2 lines:
```js
const overrides = {
  orderItemTotal:      paymentData?.itemTotal,
  orderSubtotal:       paymentData?.subtotal,
  paymentAmount:       paymentData?.finalTotal,
  discountAmount,
  couponCode:          paymentData?.discounts?.couponCode || '',
  couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
  serviceChargeAmount: paymentData?.serviceCharge || 0,
  deliveryCharge:      paymentData?.deliveryCharge || 0,
  gstTax:              paymentData?.printGstTax,
  vatTax:              paymentData?.printVatTax,
  tip:                 paymentData?.tip || 0,
  ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
};
```

#### Edit 2 — QSR Collect Bill auto-print (~L1264-1275)

Same pattern as Edit 1. Add `couponCode` + `couponDiscount` lines.

#### Edit 3 — Scenario 2 auto-print (~L1650-1665)

**Current:**
```js
couponCode:          paymentData?.discounts?.couponTitle || '',
loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
```

**After:** Fix source + add `couponDiscount`:
```js
couponCode:          paymentData?.discounts?.couponCode || '',
couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
```

#### Edit 4 — Scenario 1 auto-print (~L1873-1900)

**Current:**
```js
couponCode:          paymentData?.discounts?.couponTitle || '',
loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
```

**After:** Fix source + add `couponDiscount`:
```js
couponCode:          paymentData?.discounts?.couponCode || '',
couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
```

---

## 4. Data Source Mapping

| Override field | Source in `paymentData.discounts` | Set at (CollectPaymentPanel) | Value |
|---|---|---|---|
| `couponCode` | `discounts.couponCode` (L1017) | `selectedCoupon?.code \|\| ''` | e.g., `"SUMMER20"` |
| `couponDiscount` | `discounts.couponDiscount` (L1010) | `couponDiscount` (CRM `computed_discount`) | e.g., `100.0` |

**Why `couponTitle` was wrong:** L1018 sets `discounts.couponTitle = selectedCoupon?.title` which is the human-readable display name (e.g., "Summer 20% off"). The print template expects the coupon **code** (e.g., "SUMMER20") in the `coupon_code` field.

---

## 5. How `buildBillPrintPayload` consumes these overrides

```js
// orderTransform.js L1807-1810
coupon_code:     overrides.couponCode !== undefined ? overrides.couponCode : '',
coupon_discount: overrides.couponDiscount !== undefined ? overrides.couponDiscount : 0,
```

When `couponDiscount` is not in overrides (today's auto-print), the ternary falls to default `0`. After fix, the actual ₹ amount flows through.

When `couponCode` reads `couponTitle` (today), the bill prints the title. After fix, it prints the code.

---

## 6. Regression Checklist

| Test | Expected |
|---|---|
| Manual "Print Bill" from CollectPaymentPanel (with coupon) | Unchanged — already correct (L1086-1090) |
| Auto-print after prepaid place+pay (Scenario 2, with coupon) | Bill now shows `"Coupon SUMMER20 −₹100"` (was `"Coupon Summer 20% off −₹0"`) |
| Auto-print after postpaid collect-bill (Scenario 1, with coupon) | Same fix |
| QSR place+pay auto-print (with coupon) | Bill now shows coupon code + discount (was missing both) |
| QSR collect-bill auto-print (with coupon) | Same fix |
| Auto-print WITHOUT coupon | `couponCode: ''`, `couponDiscount: 0` — no change from today |
| Loyalty print field `loyaltyAmount` | Unchanged — reads `discounts.loyaltyPoints` (₹ amount, correct despite naming) |
| Wallet print field `walletAmount` | Unchanged |
| Discount, tip, SC, delivery, tax on print | Unchanged |

---

## 7. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| Existing QSR auto-print blocks (L1203, L1264) don't have `couponCode` at all today | LOW | Adding it is purely additive; `buildBillPrintPayload` already handles the field via `overrides.couponCode !== undefined` ternary |
| `paymentData.discounts.couponCode` could be undefined for non-coupon orders | LOW | Fallback `\|\| ''` handles this — same pattern as existing fields |
| OrderEntry.jsx is a hotspot file (per ARCHITECTURE_DECISIONS_FINAL Rule FA-03) | MEDIUM | Changes are confined to 4 override object literals — no logic/flow changes |

---

## 8. No Changes Needed

- `CollectPaymentPanel.jsx` — manual Print Bill overrides already correct
- `orderTransform.js` — `buildBillPrintPayload` already consumes `couponCode` + `couponDiscount` from overrides correctly
- `couponTransform.js` — no print-related transforms
- `BUG108_FLAGS.js` — no flag changes

---

**End of Print Payload Gap Fix Plan.**
