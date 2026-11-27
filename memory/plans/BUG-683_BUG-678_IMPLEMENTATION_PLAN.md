# BUG-683 + BUG-678 — Implementation Plan (Gate 3)

**Date:** 2026-11-18
**Agent:** PLANNING (Gate 3 — Implementation Plan)
**Items:** BUG-683 (VAT switch never read) + BUG-678 (SC prepaid default)
**Risk:** CRITICAL (BUG-683) + CRITICAL (BUG-678)
**Files WILL change:** profileTransform.js, OrderEntry.jsx, CartPanel.jsx, CollectPaymentPanel.jsx, orderTransform.js
**Files WILL NOT touch:** DashboardPage.jsx, RestaurantSettingsPage.jsx, restaurantSettingsTransform.js, any context/service/hook/utility/CSS/config/test file, any backend file
**Total edits:** 8 numbered edits, 22 individual line changes
**Execution sequence:** E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 (dependency: E1 must land first, rest are independent)

---

## Edit 1 — profileTransform.js: Read VAT switch from API (ROOT FIX)

### E1a — L79: Pass `vat_info` to restaurant transform

```
FILE: src/api/transforms/profileTransform.js
LINE: 79

CURRENT:
    restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type, api.payment_types),

NEW:
    restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type, api.payment_types, api.vat_info), // BUG-683: pass top-level vat_info
```

### E1b — L108: Add `vatInfo` parameter to function signature

```
FILE: src/api/transforms/profileTransform.js
LINE: 108

CURRENT:
  restaurant: (api, printAgent, discountTypesOverride, paymentTypesOverride) => { // BUG-523

NEW:
  restaurant: (api, printAgent, discountTypesOverride, paymentTypesOverride, vatInfo) => { // BUG-523 + BUG-683
```

### E1c — L187: Add `vatStatus` to tax block

```
FILE: src/api/transforms/profileTransform.js
LINE: 187 (after gstStatus line)

CURRENT:
        gstStatus: api.gst_status === true,
      },

NEW:
        gstStatus: api.gst_status === true,
        vatStatus: vatInfo?.status === true, // BUG-683: top-level vat_info.status (boolean)
      },
```

**Self-test:** After login, check React DevTools → restaurant.tax.vatStatus should be true/false (not undefined).

---

## Edit 2 — OrderEntry.jsx: Fix VAT property path (10 sites)

### E2a — L1339: placeOrder taxFlags

```
FILE: src/components/order-entry/OrderEntry.jsx
LINE: 1339

CURRENT:
          taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }, // BUG-647

NEW:
          taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-647 + BUG-683
```

### E2b — L1402: placeOrder alternate taxFlags

```
LINE: 1402

CURRENT:
            taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false },

NEW:
            taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-683
```

### E2c — L1736: placeOrderWithPayment (QSR prepaid) taxFlags

```
LINE: 1736

CURRENT:
            taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }, // BUG-647

NEW:
            taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-647 + BUG-683
```

### E2d — L1886: collectBillExisting (QSR edge) taxFlags

```
LINE: 1886

CURRENT:
          taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }, // BUG-647

NEW:
          taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-647 + BUG-683
```

### E2e — L2515: collectBillExisting (Scenario 2 prepaid) taxFlags

```
LINE: 2515

CURRENT:
                        taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }, // BUG-647

NEW:
                        taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-647 + BUG-683
```

### E2f — L2619: collectBillExisting (postpaid) taxFlags

```
LINE: 2619

CURRENT:
                      taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.settings?.vatEnabled !== false }, // BUG-647

NEW:
                      taxFlags: { gstEnabled: restaurant?.tax?.gstStatus !== false, vatEnabled: restaurant?.tax?.vatStatus !== false }, // BUG-647 + BUG-683
```

### E2g — L1152: localTax VAT skip (cart button pre-place)

```
LINE: 1152

CURRENT:
    if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return sum;

NEW:
    if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return sum; // BUG-683
```

### E2h — L1167: unplacedTax VAT skip (cart button added-items)

```
LINE: 1167

CURRENT:
    if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return sum;

NEW:
    if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return sum; // BUG-683
```

**Self-test:** All 8 sites now use `restaurant?.tax?.vatStatus`. Grep confirms zero remaining `restaurant?.settings?.vatEnabled` in OrderEntry.jsx.

---

## Edit 3 — CartPanel.jsx: Fix VAT property path + inverted logic

### E3a — L434: taxTotals VAT skip

```
FILE: src/components/order-entry/CartPanel.jsx
LINE: 434

CURRENT:
      if (taxType === 'VAT' && !restaurant?.settings?.vatEnabled) return;

NEW:
      if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return; // BUG-683
```

### E3b — L455: useMemo dependency

```
LINE: 455

CURRENT:
  }, [billableItems, restaurant?.tax?.gstStatus, restaurant?.settings?.vatEnabled]);

NEW:
  }, [billableItems, restaurant?.tax?.gstStatus, restaurant?.tax?.vatStatus]); // BUG-683
```

**Self-test:** CartPanel shows VAT line when VAT is ON, hides when OFF. Grep confirms zero remaining `restaurant?.settings?.vatEnabled` in CartPanel.jsx.

---

## Edit 4 — CollectPaymentPanel.jsx: Add VAT skip check

```
FILE: src/components/order-entry/CollectPaymentPanel.jsx
LINE: 323 (after the room GST check)

CURRENT:
      if (taxType === 'GST' && isRoom && restaurant?.settings?.roomGstApplicable === false) return;

NEW:
      if (taxType === 'GST' && isRoom && restaurant?.settings?.roomGstApplicable === false) return;
      // BUG-683: skip VAT items when restaurant has VAT disabled (mirrors GST skip at L321)
      if (taxType === 'VAT' && restaurant?.tax?.vatStatus === false) return;
```

**Self-test:** CPP hides VAT line when VAT is OFF. With VAT ON, VAT line shows as before.

---

## Edit 5 — orderTransform.js placeOrderWithPayment: Per-item tax flag check

### E5a — After L1316: Extract gstEnabled/vatEnabled from taxFlags

```
FILE: src/api/transforms/orderTransform.js
LINE: 1316 (after the paymentData destructure)

CURRENT:
    const { method = 'cash', transactionId = '', splitPayments = [], tip = 0, deliveryCharge = 0, discounts = {}, tabContact } = paymentData; // BUG-672: add tabContact

NEW:
    const { method = 'cash', transactionId = '', splitPayments = [], tip = 0, deliveryCharge = 0, discounts = {}, tabContact } = paymentData; // BUG-672: add tabContact
    const { gstEnabled = true, vatEnabled = true } = taxFlags; // BUG-683: for per-item tax zeroing in cart builder
```

### E5b — L1351: gst_amount with gstEnabled gate

```
LINE: 1351

CURRENT:
        gst_amount: String((isGst ? newTax : 0).toFixed(2)),

NEW:
        gst_amount: String((isGst && gstEnabled ? newTax : 0).toFixed(2)), // BUG-683
```

### E5c — L1352: vat_amount with vatEnabled gate

```
LINE: 1352

CURRENT:
        vat_amount: String((!isGst ? newTax : 0).toFixed(2)),

NEW:
        vat_amount: String((!isGst && vatEnabled ? newTax : 0).toFixed(2)), // BUG-683
```

**Self-test:** Prepaid order with GST OFF → per-item `gst_amount: "0.00"` in network payload. Same for VAT OFF.

---

## Edit 6 — orderTransform.js collectBillExisting: Per-item tax flag check (discount branch)

### E6a — L1683: gst_amount with gstEnabled gate

```
FILE: src/api/transforms/orderTransform.js
LINE: 1683

CURRENT:
          gst_amount: String((isGst ? newTax : 0).toFixed(2)),

NEW:
          gst_amount: String((isGst && gstEnabled ? newTax : 0).toFixed(2)), // BUG-683
```

### E6b — L1684: vat_amount with vatEnabled gate

```
LINE: 1684

CURRENT:
          vat_amount: String((!isGst ? newTax : 0).toFixed(2)),

NEW:
          vat_amount: String((!isGst && vatEnabled ? newTax : 0).toFixed(2)), // BUG-683
```

**Note:** `gstEnabled`/`vatEnabled` already extracted at L1585 for this function scope.
**Self-test:** Postpaid collect-bill with discount + GST OFF → per-item `gst_amount: "0.00"` in food_detail.

---

## Edit 7 — CollectPaymentPanel.jsx: Gate SC/Tip/Delivery GST display

```
FILE: src/components/order-entry/CollectPaymentPanel.jsx
LINES: 822-824

CURRENT:
  const scGst               = serviceCharge  * scTaxRate;
  const tipGst              = tip            * scTaxRate;
  const deliveryGst         = deliveryCharge * delTaxRate;

NEW:
  const scGst               = restaurant?.tax?.gstStatus !== false ? serviceCharge  * scTaxRate : 0; // BUG-683: zero SC GST display when GST OFF
  const tipGst              = restaurant?.tax?.gstStatus !== false ? tip            * scTaxRate : 0; // BUG-683
  const deliveryGst         = restaurant?.tax?.gstStatus !== false ? deliveryCharge * delTaxRate : 0; // BUG-683
```

**Self-test:** GST OFF + SC ON + SC GST rate configured → no SGST/CGST lines shown under Service Charge.

---

## Edit 8 — CollectPaymentPanel.jsx: BUG-678 SC prepaid default

```
FILE: src/components/order-entry/CollectPaymentPanel.jsx
LINES: 470-474

CURRENT:
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
    && !!restaurant?.autoServiceCharge
  );

NEW:
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
    && !!restaurant?.autoServiceCharge
    && !isPrepaid // BUG-678: prepaid orders should not auto-apply SC
  );
```

**Self-test:** Prepaid dine-in order → SC toggle defaults OFF. Postpaid dine-in with autoServiceCharge → SC toggle defaults ON (unchanged).

---

## Execution Sequence

```
Order: E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8
       │
       └─ E1 MUST land first (creates restaurant.tax.vatStatus)
          E2-E8 are independent of each other but all depend on E1
          
Recommended grouping for compile-checks:
  Batch A: E1 (profileTransform) → compile check
  Batch B: E2 + E3 (OrderEntry + CartPanel — same property path swap) → compile check
  Batch C: E4 + E7 + E8 (CollectPaymentPanel — 3 edits in same file) → compile check
  Batch D: E5 + E6 (orderTransform — 2 functions) → compile check
```

---

## Verification Matrix

| # | Edit | File | How to Verify | Expected |
|---|------|------|--------------|----------|
| V1 | E1 | profileTransform.js | Login → React DevTools → restaurant.tax | `vatStatus: true` or `false` (not undefined) |
| V2 | E2a-f | OrderEntry.jsx | `grep 'settings.*vatEnabled' OrderEntry.jsx` | 0 matches |
| V3 | E2g-h | OrderEntry.jsx | VAT ON restaurant → cart button includes VAT. VAT OFF → no VAT in button. | Button total matches CPP total |
| V4 | E3 | CartPanel.jsx | VAT OFF → no VAT line. VAT ON → VAT line shows. | Matches CPP behavior |
| V5 | E4 | CollectPaymentPanel.jsx | VAT OFF → no VAT in TAXES section of CPP | ₹0 VAT |
| V6 | E5 | orderTransform.js | Prepaid + GST OFF → Network tab: per-item `gst_amount: "0.00"` | All items "0.00" |
| V7 | E5 | orderTransform.js | Prepaid + VAT OFF → per-item `vat_amount: "0.00"` | All items "0.00" |
| V8 | E6 | orderTransform.js | Postpaid + discount + GST OFF → food_detail per-item `gst_amount: "0.00"` | All items "0.00" |
| V9 | E7 | CollectPaymentPanel.jsx | GST OFF + SC ON + SC GST rate > 0 → no SGST/CGST under SC | ₹0 display |
| V10 | E8 | CollectPaymentPanel.jsx | Prepaid dine-in → SC toggle defaults OFF | SC = ₹0 |
| V11 | E8 | CollectPaymentPanel.jsx | Postpaid dine-in + autoSC → SC toggle defaults ON | SC = computed |
| V12 | Regression | All | GST ON + VAT ON restaurant → all totals and per-item unchanged | Byte-identical to pre-fix |
| V13 | Regression | All | Order-level totals match per-item sums | gst_tax = Σ gst_amount, vat_tax = Σ vat_amount |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: BUG-683 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] registry.json: BUG-678 → status: IMPLEMENTED (update smoke-fail note)
- [ ] BUG_TRACKER.md: both rows updated
- [ ] CR_REGISTRY.md: both rows updated
- [ ] FILE_OWNERSHIP.md: add 5 files with BUG-683 + BUG-678 markers
- [ ] Code markers: // BUG-683 and // BUG-678 in every modified file
```

---

## Scope Lock

**IN SCOPE:** Edits E1-E8 as described above. No other changes.
**OUT OF SCOPE:** BUG-684 (cart button round-off — separate item). Backend changes. Test file changes. Settings page changes. Any other file not listed above.
