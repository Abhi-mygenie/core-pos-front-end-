# SC Prepaid Bug — Code Flow Evidence

## Date: 2026-11-16
## Bug: Service Charge in API despite UI toggle OFF

### Key Code Locations

#### 1. CollectPaymentPanel — SC Toggle (CORRECT)
```
L459-474: serviceChargeEnabled useState — defaults from autoServiceCharge + scApplicable
L796-798: serviceCharge = scApplicable && serviceChargeEnabled && ... ? computed : 0
L1337:    paymentData.serviceCharge = serviceCharge (0 when toggle OFF)
L1350:    paymentData.serviceGstTaxAmount = scGst (0 when SC=0)
```

#### 2. OrderEntry — scApplicable (THE BUG)
```
L1708-1709 (QSR):
  scApplicable = (dineIn/walkIn/room) && (autoServiceCharge || serviceCharge > 0)
  When autoServiceCharge=true: ALWAYS true regardless of toggle

L2492-2493 (Scenario 2):
  Same logic, same bug

L1719: serviceChargePercentage: scApplicable ? restaurant.serviceChargePercentage : 0
  → Passes full % when autoServiceCharge=true
```

#### 3. orderTransform.calcOrderTotals — SC Computation
```
L818: receives serviceChargePercentage (wrong — should be 0)
L862: serviceCharge = postDiscount * serviceChargePercentage / 100  → ₹23.81
L893: scGstAmt = serviceCharge * scTaxRate → ₹1.19
L930: service_tax: 23.81 (returned in totals)
L935: service_gst_tax_amount: 1.19 (returned in totals)
L928: order_amount: 275 (includes SC + SC GST)
```

#### 4. collectBillExisting — NOT affected
```
L1522: serviceCharge = 0 (from paymentData directly)
L1707: service_tax: serviceCharge || 0 = 0
  → Correct because it reads the ₹ amount, not the %
```

### Bug Introduction Context
```
BUG-662 comment at L1706-1707:
"honour cashier's manual SC toggle on prepaid. paymentData.serviceCharge > 0
 means the cashier ticked SC ON in CollectPaymentPanel (even when auto=No)."

Intent: Allow manual SC ON when auto=No
Side effect: Prevents manual SC OFF when auto=Yes
```
