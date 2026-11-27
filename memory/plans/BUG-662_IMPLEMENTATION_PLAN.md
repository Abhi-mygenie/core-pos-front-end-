# BUG-662 — Implementation Plan (Gate 3)

**Item:** BUG-662 — Prepaid Manual Service Charge Missing from Place-Order Payload
**Priority:** P0 | **Risk:** CRITICAL (financial)
**Strategy:** Option A — thread SC from `paymentData.serviceCharge > 0` signal (OD-662-01 LOCKED)
**Scope:** Prepaid paths only — A1 + A2 (OD-662-02 LOCKED)
**IA:** `impact/BUG-662_IMPACT_ANALYSIS.md`
**Date:** 2026-11-09
**Code reality re-verified at HEAD:** ✅ L1679-1680 and L2462-2464 match IA exactly.

---

## 1. Scope Lock

**Files WILL change:**
- `src/components/order-entry/OrderEntry.jsx` — 2 edit sites (E1, E2)

**Files WILL NOT touch:**
- `CollectPaymentPanel.jsx` — paymentData already correct
- `orderTransform.js` — `calcOrderTotals` + `placeOrderWithPayment` functions untouched
- `orderTransform.js collectBillExisting` — working postpaid path
- All report/settlement/print transforms
- All non-prepaid placeOrder/updateOrder paths

---

## 2. Edits

### E1 — OrderEntry.jsx L1679-1680 (QSR Place&Pay, fresh order)

**Current (L1679-1680):**
```js
        const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
          && !!restaurant?.autoServiceCharge;
```

**New:**
```js
        // BUG-662: honour cashier's manual SC toggle on prepaid. paymentData.serviceCharge > 0
        // means the cashier ticked SC ON in CollectPaymentPanel (even when auto=No).
        const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
          && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```

**Rationale:** Adds `|| paymentData?.serviceCharge > 0` as an OR condition. When `autoServiceCharge` is true, behaviour is unchanged (already true). When `autoServiceCharge` is false but cashier manually ticked SC, `paymentData.serviceCharge` is the computed SC amount (> 0) → `scApplicable` becomes true → `serviceChargePercentage` passes the restaurant's SC% to `placeOrderWithPayment` → `calcOrderTotals` computes correct `service_tax`.

---

### E2 — OrderEntry.jsx L2462-2465 (Prepaid Place+Pay inline)

**Current (L2462-2465):**
```js
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (
                        (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
                        && !!restaurant?.autoServiceCharge
                      ) ? (restaurant?.serviceChargePercentage || 0) : 0, autoBill: printAllBill,
```

**New:**
```js
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (
                        (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
                        && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0) // BUG-662
                      ) ? (restaurant?.serviceChargePercentage || 0) : 0, autoBill: printAllBill,
```

**Rationale:** Same fix as E1 — adds `|| paymentData?.serviceCharge > 0` to the inline ternary condition. Note this path uses `table?.isRoom` (not `effectiveTable?.isRoom`) and `paymentData` is in scope from the enclosing callback parameter.

---

## 3. Execution Sequence

1. **E1** — edit L1679-1680 (QSR path)
2. **E2** — edit L2462-2465 (inline prepaid path)
3. **Compile check** — `yarn build` exit 0, 0 new warnings
4. Self-test via verification matrix

No ordering dependency between E1 and E2 — they are independent code paths.

---

## 4. Verification Matrix (inherited from IA + implementation specifics)

| # | Check | How to Verify | Self-Test |
|---|-------|---------------|:---------:|
| V1 | Auto SC=No + cashier ticks SC ON → prepaid payload has `service_tax > 0` | Browser: intercept `place-order`, inspect payload `service_tax` field | ⬜ |
| V2 | Auto SC=No + cashier leaves SC OFF → prepaid payload has `service_tax = 0` | Browser: intercept `place-order`, inspect payload | ⬜ |
| V3 | Auto SC=Yes + cashier leaves SC ON (default) → prepaid payload has `service_tax > 0` | Browser: regression — same as before fix | ⬜ |
| V4 | Auto SC=Yes + cashier unticks SC → prepaid payload has `service_tax = 0` | Browser: regression | ⬜ |
| V5 | Postpaid collect-bill still works correctly | Code review: `collectBillExisting` untouched | ⬜ |
| V6 | `order_amount` includes SC when cashier enables SC | Payload: `order_amount` = items + tax + SC + SC-GST | ⬜ |
| V7 | `payment_amount` ≈ `order_amount` (no inconsistency) | Payload: compare the two fields | ⬜ |
| V8 | webpack compiles 0 new warnings | `yarn build` | ⬜ |
| V9 | E1 code marker `// BUG-662` present | grep | ⬜ |
| V10 | E2 code marker `// BUG-662` present | grep | ⬜ |

---

## 5. Post-Code Registry Checklist

The Implementation agent MUST execute after coding:
- [ ] `registry.json`: BUG-662 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] `BUG_TRACKER.md`: row updated with IMPLEMENTED status
- [ ] `FILE_OWNERSHIP.md`: add `OrderEntry.jsx` with BUG-662 marker
- [ ] Code markers: `// BUG-662` comment at both edit sites

---

## 6. Risks

| # | Risk | Mitigation |
|---|------|------------|
| R1 | R5 hotspot — OrderEntry.jsx | Change is additive OR condition only. 1 line per site. No logic restructuring. |
| R2 | `paymentData` scope at E2 | Confirmed: E2 is inside the `onPaymentComplete` callback; `paymentData` is the parameter. |
| R3 | Rounding mismatch: `calcOrderTotals` SC vs CPP SC | Both use identical formula: `Math.round(postDiscount * SC% / 100 * 100) / 100`. Base may differ by discount distribution rounding — verify V6/V7 in QA. |
| R4 | Regression: auto SC=Yes restaurants | Additive OR: when `autoServiceCharge=true`, first operand is already true → no change. |
