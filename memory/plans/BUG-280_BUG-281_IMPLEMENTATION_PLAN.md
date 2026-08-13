# Implementation Plan — BUG-280 + BUG-281

**Produced by:** Planning Role (Gate 3)  
**Date:** 2026-07-31  
**Status:** AWAITING Gate 4 GO — no code changes until owner approves  
**Impact analysis:** `/app/memory/impact/BUG-280_BUG-281_IMPACT_ANALYSIS.md`

---

## 1. Scope Lock

### Files WILL change
| File | Edits | Bugs |
|------|-------|------|
| `frontend/src/api/transforms/orderTransform.js` | E1a, E1b | BUG-280 + BUG-281 |
| `frontend/src/components/order-entry/OrderEntry.jsx` | E2, E3, E4, E5, E6 | BUG-281 |

### Files WILL NOT change (explicit lock)
| File | Reason |
|------|--------|
| `CollectPaymentPanel.jsx` | Already correct — custGST/custGSTName in paymentData at L1099–1100; manual Print Bill at L1166–1167 |
| `CollectBillPanelDrawer.jsx` | Inherits settlement fix from E1b; no auto-print block to fix; customer name limitation is out of scope |
| `buildBillPrintPayload` in `orderTransform.js` | Already reads `overrides.custGST` and `overrides.custGSTName` at L2063–2064 |
| `placeOrder` in `orderTransform.js` | Already correct |
| `updateOrder` in `orderTransform.js` | Already correct |
| Any backend file | Frontend-only fix |
| `.env` files | No environment changes |
| `package.json` / `requirements.txt` | No dependency changes |

---

## 2. Edit Sequence

Edits are listed in order. All are purely additive — no existing line is deleted or modified.

---

### E1a — `orderTransform.js`: Add `custGST` + `custGSTName` to `collectBillExisting` destructuring

**File:** `frontend/src/api/transforms/orderTransform.js`  
**Anchor:** The last line of the `paymentData` destructuring block inside `collectBillExisting`  
**Current text (exact):**
```js
      roundOff = 0,
    } = paymentData;
```
**Replacement:**
```js
      roundOff = 0,
      // BUG-281: B2B GST fields forwarded to backend settlement + auto-bill print
      custGST     = '',
      custGSTName = '',
    } = paymentData;
```
**Why:** Makes `custGST` and `custGSTName` available as named variables in the function body for E1b insertion.

---

### E1b — `orderTransform.js`: Add `cust_name` / `cust_mobile` / `cust_membership_id` (BUG-280) and `custGST` / `custGSTName` (BUG-281) to `collectBillExisting` payload

**File:** `frontend/src/api/transforms/orderTransform.js`  
**Anchor:** The TAB-specific fields block near the end of the payload, just before `};`  
**Current text (exact):**
```js
      // TAB-specific fields (BUG-252: customer info for credit tracking)
      name:                         tabContact?.name || '',
      mobile:                       tabContact?.phone || '',
    };
```
**Replacement:**
```js
      // BUG-280: CRM customer identity fields (mirrors placeOrder L1000–1005 + updateOrder L1131–1133)
      // NOTE: cust_email is intentionally omitted — legacy '' preserved per owner OD-BUG280-1.
      cust_name:          customer?.name  || '',
      cust_mobile:        customer?.phone || '',
      cust_membership_id: customer?.id    || '',
      // TAB-specific fields (BUG-252: customer info for credit tracking)
      name:                         tabContact?.name || '',
      mobile:                       tabContact?.phone || '',
      // BUG-281: B2B GST — forwarded for backend auto-bill print
      custGST,
      custGSTName,
    };
```
**Why:** `placeOrder` and `updateOrder` already send these three fields. `collectBillExisting` was the only settlement builder that omitted them. `custGST`/`custGSTName` are needed when `billing_auto_bill_print: 'Yes'`.

---

### E2 — `OrderEntry.jsx`: Add `custGST` / `custGSTName` to M1 (QSR PlaceAndPay immediate auto-print)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`  
**Anchor:** The M1 override block ending
**Current text (exact):**
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
                printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                  .then(() => console.log('[QSR PlaceAndPay] auto-print completed for order:', newOrderId))
```
**Replacement:**
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
                  custGST:             paymentData?.custGST     || '',  // BUG-281
                  custGSTName:         paymentData?.custGSTName || '',  // BUG-281
                  ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                };
                printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                  .then(() => console.log('[QSR PlaceAndPay] auto-print completed for order:', newOrderId))
```

---

### E3 — `OrderEntry.jsx`: Add `custGST` / `custGSTName` to M2 (QSR PlaceAndPay background auto-print)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`  
**Anchor:** The M2 override block ending  
**Current text (exact):**
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
                    printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                      .then(() => console.log('[QSR PlaceAndPay] background auto-print completed for order:', newOrderId))
```
**Replacement:**
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
                      custGST:             paymentData?.custGST     || '',  // BUG-281
                      custGSTName:         paymentData?.custGSTName || '',  // BUG-281
                      ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                    };
                    printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                      .then(() => console.log('[QSR PlaceAndPay] background auto-print completed for order:', newOrderId))
```

---

### E4 — `OrderEntry.jsx`: Add `custGST` / `custGSTName` to M_NEW-A (QSR existing-order auto-print — **investigation missed this site**)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`  
**Anchor:** The M_NEW-A override block within `handleQsrCollectBill`  
**Current text (exact):**
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
              await printOrder(Number(collectOrderId), 'bill', null, orderForPrint, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || []);
```
**Replacement:**
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
                custGST:             paymentData?.custGST     || '',  // BUG-281
                custGSTName:         paymentData?.custGSTName || '',  // BUG-281
                ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
              };
              await printOrder(Number(collectOrderId), 'bill', null, orderForPrint, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || []);
```

---

### E5 — `OrderEntry.jsx`: Add `custGST` / `custGSTName` to M_NEW-B (`autoPrintOverrides` inside `autoPrintNewOrderIfEnabled` — **investigation missed this site**)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`  
**Anchor:** `autoPrintOverrides` block inside `autoPrintNewOrderIfEnabled`  
**Current text (exact):**
```js
                    const autoPrintOverrides = {
                      orderItemTotal:      paymentData?.itemTotal,
                      orderSubtotal:       paymentData?.subtotal,
                      paymentAmount:       paymentData?.finalTotal,
                      discountAmount:      autoPrintDiscountAmount,
                      couponCode:          paymentData?.discounts?.couponCode || '',
                      couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                      loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                      walletAmount:        paymentData?.discounts?.walletBalance || 0,
                      serviceChargeAmount: paymentData?.serviceCharge || 0,
                      deliveryCharge:      paymentData?.deliveryCharge || 0,
                      gstTax:              paymentData?.printGstTax,
                      vatTax:              paymentData?.printVatTax,
                      tip:                 paymentData?.tip || 0,
                      // BUG-012: inject delivery address for print
                      ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                    };
```
**Replacement:**
```js
                    const autoPrintOverrides = {
                      orderItemTotal:      paymentData?.itemTotal,
                      orderSubtotal:       paymentData?.subtotal,
                      paymentAmount:       paymentData?.finalTotal,
                      discountAmount:      autoPrintDiscountAmount,
                      couponCode:          paymentData?.discounts?.couponCode || '',
                      couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                      loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                      walletAmount:        paymentData?.discounts?.walletBalance || 0,
                      serviceChargeAmount: paymentData?.serviceCharge || 0,
                      deliveryCharge:      paymentData?.deliveryCharge || 0,
                      gstTax:              paymentData?.printGstTax,
                      vatTax:              paymentData?.printVatTax,
                      tip:                 paymentData?.tip || 0,
                      custGST:             paymentData?.custGST     || '',  // BUG-281
                      custGSTName:         paymentData?.custGSTName || '',  // BUG-281
                      // BUG-012: inject delivery address for print
                      ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                    };
```

---

### E6 — `OrderEntry.jsx`: Add `custGST` / `custGSTName` to M3 (main CollectBill existing-order auto-print)

**File:** `frontend/src/components/order-entry/OrderEntry.jsx`  
**Anchor:** `collectBillOverrides` block  
**Current text (exact):**
```js
                          const collectBillOverrides = {
                            orderItemTotal:      paymentData?.itemTotal,
                            orderSubtotal:       paymentData?.subtotal,
                            paymentAmount:       paymentData?.finalTotal,
                            discountAmount:      collectBillDiscountAmount,
                            couponCode:          paymentData?.discounts?.couponCode || '',
                            couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                            loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                            walletAmount:        paymentData?.discounts?.walletBalance || 0,
                            serviceChargeAmount: paymentData?.serviceCharge || 0,
                            deliveryCharge:      paymentData?.deliveryCharge || 0,
                            gstTax:              paymentData?.printGstTax,
                            vatTax:              paymentData?.printVatTax,
                            tip:                 paymentData?.tip || 0,
                            // BUG-012: inject delivery address for print
                            ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
```
**Replacement:**
```js
                          const collectBillOverrides = {
                            orderItemTotal:      paymentData?.itemTotal,
                            orderSubtotal:       paymentData?.subtotal,
                            paymentAmount:       paymentData?.finalTotal,
                            discountAmount:      collectBillDiscountAmount,
                            couponCode:          paymentData?.discounts?.couponCode || '',
                            couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                            loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                            walletAmount:        paymentData?.discounts?.walletBalance || 0,
                            serviceChargeAmount: paymentData?.serviceCharge || 0,
                            deliveryCharge:      paymentData?.deliveryCharge || 0,
                            gstTax:              paymentData?.printGstTax,
                            vatTax:              paymentData?.printVatTax,
                            tip:                 paymentData?.tip || 0,
                            custGST:             paymentData?.custGST     || '',  // BUG-281
                            custGSTName:         paymentData?.custGSTName || '',  // BUG-281
                            // BUG-012: inject delivery address for print
                            ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
```

---

## 3. Edit Summary

| Edit | File | Lines approx | BUG | Additive only? | Existing line changed? |
|------|------|--------------|-----|----------------|------------------------|
| E1a | `orderTransform.js` | 1426–1427 | 281 | YES | NO |
| E1b | `orderTransform.js` | 1638–1641 | 280 + 281 | YES | NO |
| E2 | `OrderEntry.jsx` | 1397–1398 | 281 | YES | NO |
| E3 | `OrderEntry.jsx` | 1435–1436 | 281 | YES | NO |
| E4 | `OrderEntry.jsx` | 1507–1508 | 281 | YES | NO |
| E5 | `OrderEntry.jsx` | 1904–1905 | 281 | YES | NO |
| E6 | `OrderEntry.jsx` | 2185–2186 | 281 | YES | NO |

**Total lines added: 14** (2 per override block × 5, plus 3 + 2 + 1 in orderTransform)  
**No existing line is deleted or modified anywhere.**

---

## 4. Implementation Order

1. Apply E1a and E1b to `orderTransform.js` — foundation edit
2. Apply E2 through E6 to `OrderEntry.jsx` — 5 parallel-safe additive edits  
3. Verify webpack compiles with no new errors (hot-reload, check browser console)
4. Verify test suite still passes: run existing Jest tests

---

## 5. Verification Matrix

| Test | Method | Pass criteria |
|------|--------|--------------|
| T1 — BUG-280 basic: Collect Bill with CRM customer selected | Log BILL_PAYMENT payload (`console.log('[CollectBill] payload:')` at OrderEntry L2140) | `cust_name`, `cust_mobile`, `cust_membership_id` non-blank and match selected customer |
| T2 — BUG-280 no-customer: Collect Bill with no customer | Same log | `cust_name: ''`, `cust_mobile: ''`, `cust_membership_id: ''` — no crash |
| T3 — BUG-280 no-email invariant | Same log | `cust_email` key absent from payload |
| T4 — BUG-281 manual Print Bill unchanged | Log in CPP `handlePrintBill` | `custGST` and `custGSTName` still present — unchanged from pre-fix |
| T5 — BUG-281 auto-print M3 with GST entered | Log `[AutoPrintCollectBill] overrides:` at L2202 | `custGST` and `custGSTName` match what was typed in CPP |
| T6 — BUG-281 auto-print M3 with no GST | Same log | `custGST: ''`, `custGSTName: ''` |
| T7 — BUG-281 QSR M1: QSR PlaceAndPay immediate | Log `[QSR PlaceAndPay] auto-print` | `custGST`/`custGSTName` in overrides |
| T8 — BUG-281 QSR M2: QSR PlaceAndPay background | Same | Same |
| T9 — BUG-281 M_NEW-A: QSR existing-order | Log `[QSR Pay AutoPrint]` | `custGST`/`custGSTName` in overrides |
| T10 — BUG-281 M_NEW-B: new-order prepaid | Log `[AutoPrintBill] overrides:` | `custGST`/`custGSTName` in overrides |
| T11 — BUG-281 M4 settlement payload | Log `[CollectBill] payload:` | `custGST`/`custGSTName` present |
| T12 — No regression: billing totals unchanged | Existing Jest suite | All existing tests pass |
| T13 — No regression: split-payment payload intact | Log or Jest | `partial_payments` array unchanged |
| T14 — No regression: room order auto-print suppressed | Log `[AutoPrintBill] SKIPPED — isRoom` | Unchanged — room guard still works |

---

## 6. Rollback

All edits are purely additive field additions. Rollback = remove the added lines. No data migration, no backend change, no environment change.

If a rollback is needed after deployment, the specific added lines can be removed without touching anything else.

---

## 7. Post-Code Registry Checklist (to perform AFTER implementation)

- [ ] Update `BUG_TRACKER.md`: BUG-280 and BUG-281 → Gate 5 (Implementation Done — Pending Verify)
- [ ] Update `registry.json`: same status
- [ ] Run Jest tests: confirm all pass
- [ ] Capture one browser console log showing `cust_name` non-blank in BILL_PAYMENT payload (T1)
- [ ] Capture one browser console log showing `custGST` non-blank in auto-print override (T5)
- [ ] Save evidence to `/app/memory/evidence/BUG-280/` and `/app/memory/evidence/BUG-281/`
- [ ] Request owner smoke test for Gate 6

---

## 8. Gate Status

| Gate | Status |
|------|--------|
| Gate 1 — Intake | CLOSED |
| Gate 2 — Impact Analysis | COMPLETE |
| Gate 3 — Implementation Plan | **COMPLETE** (this document) |
| Gate 4 — Owner GO | **PENDING — required before any code change** |
| Gate 5 — Implementation Done | Not started |
| Gate 6 — Owner Smoke Test | Not started |
