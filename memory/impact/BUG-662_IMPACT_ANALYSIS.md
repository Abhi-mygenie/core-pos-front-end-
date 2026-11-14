# BUG-662 — Impact Analysis (Gate 2)

**Item:** BUG-662 — Prepaid Manual Service Charge Missing from Place-Order Payload
**Priority:** P0 | **Risk:** CRITICAL (financial)
**Code Reality:** FULL — buggy code exists; fix is net-new logic
**Conflict Pre-Check:** CLEAN — no other open item touches the specific SC derivation in prepaid paths. Multiple items touch OrderEntry/CPP/orderTransform (BUG-555, CR-482, BUG-660 etc.) but none overlap with the SC percentage threading for prepaid.
**Date:** 2026-11-09

---

## 1. Data Flow Trace

```
CollectPaymentPanel.jsx
  L433-437: serviceChargeEnabled = useState(orderType applicable && SC% > 0 && autoServiceCharge)
    → When auto=No, defaults to OFF (unticked). Cashier can manually tick ON.
  L759-760: serviceCharge = scApplicable && serviceChargeEnabled && SC% > 0
    → Correctly computes SC amount (e.g. ₹12.38 on ₹123.81 subtotal at 10%)
  L784:     scGst = serviceCharge * scTaxRate → correct
  L820:     subtotal includes serviceCharge → UI total is correct (₹143.01)
  L1289:    paymentData.serviceCharge = serviceCharge (₹12.38)
  L1225:    paymentData.finalTotal = effectiveTotal (₹143.01, includes SC)
  → paymentData is CORRECT — contains both serviceCharge amount and finalTotal with SC

OrderEntry.jsx → onPaymentComplete(paymentData) →
  PREPAID PATH 1 — L1679-1690 (QSR Place&Pay, fresh order):
    L1679-1680: scApplicable = (dineIn/walkIn/room) && !!restaurant?.autoServiceCharge
                → When auto=No → scApplicable = FALSE
    L1690:      serviceChargePercentage: scApplicable ? SC% : 0
                → serviceChargePercentage = 0   ← ★ BREAK POINT: ignores cashier toggle

  PREPAID PATH 2 — L2460-2465 (Prepaid Place+Pay):
    L2462-2464: same pattern → serviceChargePercentage = 0   ← ★ BREAK POINT

  PREPAID PATH 3 — L1350-1356 (Scenario 2 placeOrder, non-prepaid):
    L1353-1356: same pattern (auto flag only). NOT a bug here — non-prepaid doesn't collect payment.

  UPDATE PATH — L1290-1293 (Scenario 1 updateOrder):
    L1290-1293: same pattern. NOT a bug — update doesn't collect payment.

orderTransform.js placeOrderWithPayment (L1294):
  L1295: destructures serviceChargePercentage from options (= 0)
  L1334: calcOrderTotals(cart, serviceChargePercentage=0, extras)
    → calcOrderTotals L862: serviceCharge = 0 * SC% = 0
    → totals.service_tax = 0, totals.service_gst_tax_amount = 0
  L1405: ...totals → payload has service_tax: 0
  L1342: finalTotal = paymentData.finalTotal (= ₹143.01, includes SC)
    → payment_amount/grant_amount = ₹143.01 (CORRECT — from paymentData)

RESULT: order_amount excludes SC, payment_amount includes SC → internal inconsistency.
        service_tax: 0, service_gst_tax_amount: 0 → SC and SC-GST lost from reports.
```

### Contrast: Working Postpaid Path

```
orderTransform.js collectBillExisting (L1507):
  L1632: destructures { serviceCharge, ... } = paymentData
    → Reads SC amount DIRECTLY from paymentData (set by CPP)
  L1696: service_tax: serviceCharge || 0
    → Correct: uses the actual computed SC amount, not re-derived from restaurant flag
```

**Root cause:** The prepaid path (placeOrderWithPayment) re-derives SC from the restaurant-level `autoServiceCharge` flag via `calcOrderTotals`, while the postpaid path (collectBillExisting) reads the SC amount directly from `paymentData`. When auto=No and cashier manually enables SC, the prepaid path produces SC=0 while the postpaid path produces the correct amount.

---

## 2. Affected Files & Lines

| # | File | Lines | What's Wrong | Risk |
|---|------|-------|-------------|------|
| **A1** | `OrderEntry.jsx` | L1679-1680 | QSR Place&Pay: `scApplicable` gated on `autoServiceCharge` — ignores cashier toggle | R5 hotspot |
| **A2** | `OrderEntry.jsx` | L2462-2464 | Prepaid Place+Pay: same `autoServiceCharge` gate — ignores cashier toggle | R5 hotspot |
| **A3** | `orderTransform.js` | L1294-1295, L1334 | `placeOrderWithPayment` receives `serviceChargePercentage=0` → `calcOrderTotals` produces `service_tax:0` | R5 hotspot |

### Files NOT Touched (scope lock)

- `CollectPaymentPanel.jsx` — paymentData already carries correct `serviceCharge`, `serviceChargeEnabled`. **May optionally need to emit `serviceChargePercentage`** (see OD-662-01).
- `orderTransform.js calcOrderTotals` — function is correct; it just receives 0 as input.
- `orderTransform.js collectBillExisting` — working postpaid path, untouched.
- All report/settlement/print transforms — downstream consumers.

---

## 3. Downstream Consumers

The `placeOrderWithPayment` payload feeds:
- **Backend order record** — `service_tax`, `service_gst_tax_amount` stored per-order
- **Settlement reports** — SC revenue column reads `service_tax`
- **Insights / Sales reports** — aggregate SC from order records
- **Bill print** — reads from order data; if SC was 0 at placement, print also shows 0
- **GST filing** — `service_gst_tax_amount` feeds tax reports

All downstream consumers will automatically correct once the payload is fixed.

---

## 4. Fix Strategy Options

### Option A: Thread SC% from paymentData (Recommended)

OrderEntry prepaid paths read `paymentData.serviceCharge > 0` as the signal that cashier enabled SC, and pass `restaurant?.serviceChargePercentage` (not 0) to `placeOrderWithPayment`.

```
// A1: OrderEntry.jsx L1679-1680
const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
  && !!restaurant?.autoServiceCharge;
// ↓ becomes ↓
const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
  && (!!restaurant?.autoServiceCharge || paymentData?.serviceCharge > 0);
```

Same pattern at A2 (L2462-2464). No change to `calcOrderTotals` or `orderTransform`.

**Pros:** Minimal change (2 sites, ~2 lines each). `calcOrderTotals` re-derives the same SC amount the UI computed — guaranteed consistency. No new fields needed in paymentData.
**Cons:** Relies on `paymentData.serviceCharge > 0` as a proxy for "cashier enabled SC". This is accurate because CPP only sets `serviceCharge > 0` when `serviceChargeEnabled` is true.

### Option B: Bypass calcOrderTotals for SC in prepaid

In `placeOrderWithPayment`, after `calcOrderTotals`, override `totals.service_tax` and `totals.service_gst_tax_amount` from `paymentData.serviceCharge` (mirroring `collectBillExisting`).

**Pros:** Mirrors the working postpaid pattern exactly.
**Cons:** `calcOrderTotals` still produces wrong `order_amount` (excludes SC) — would need further overrides. More invasive.

### Option C: Add serviceChargePercentage to paymentData from CPP

CPP emits `paymentData.serviceChargePercentage = serviceChargeEnabled ? serviceChargePercentage : 0`. OrderEntry passes this through to `placeOrderWithPayment`.

**Pros:** Explicit intent signal.
**Cons:** Adds a new field to the paymentData contract; all consumers must be aware. CPP is R5.

---

## 5. Owner Decisions — ALL LOCKED 2026-11-09

| OD | Question | Decision | Date |
|----|----------|----------|------|
| **OD-662-01** | Fix strategy | **(a) Option A — thread SC from paymentData.serviceCharge > 0 signal.** Minimal change, 2 lines per prepaid site. | 2026-11-09 |
| **OD-662-02** | Scope: also fix non-prepaid placeOrder/updateOrder paths? | **(a) Prepaid paths only (A1+A2).** Postpaid collect-bill already works (owner confirmed: "for post paid order its already happening when they collect bill"). Non-prepaid paths don't collect payment. | 2026-11-09 |

---

## 6. Risk Register

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | R5 hotspot: OrderEntry.jsx | High traffic file | Change is 2 lines per site, additive condition only |
| R2 | `paymentData.serviceCharge > 0` as proxy | Could be non-zero from rounding artefact | CPP computes SC as `subtotalAfterDiscount × SC% / 100`; only > 0 when `serviceChargeEnabled` is true AND SC% > 0 AND subtotal > 0. Safe proxy. |
| R3 | `calcOrderTotals` re-derives SC ≠ CPP SC | Possible rounding mismatch | Both use `Math.round(x * 100) / 100`. Rounding is deterministic on same inputs. Base differs slightly (calcOrderTotals uses built-cart subtotal vs CPP's `subtotalAfterDiscount`) — verify in QA. |
| R4 | Postpaid regression | autoServiceCharge=Yes restaurants must still auto-apply SC on prepaid | Additive OR condition; when `autoServiceCharge=true`, `scApplicable` is already true — no change in behavior. |

---

## 7. Verification Matrix (seeds QA)

| # | Check | How to Verify | Automated? |
|---|-------|---------------|:---:|
| V1 | Auto SC=No + cashier ticks SC ON → prepaid payload has `service_tax > 0` | Browser: intercept place-order, check payload | NO |
| V2 | Auto SC=No + cashier leaves SC OFF → prepaid payload has `service_tax = 0` | Browser: intercept place-order, check payload | NO |
| V3 | Auto SC=Yes + cashier leaves SC ON (default) → prepaid payload has `service_tax > 0` | Browser: regression check | NO |
| V4 | Auto SC=Yes + cashier unticks SC → prepaid payload has `service_tax = 0` | Browser: regression check | NO |
| V5 | Postpaid collect-bill still works correctly (regression) | Browser: collect bill, check payload | NO |
| V6 | `order_amount` includes SC when SC is enabled | Payload inspection: `order_amount = items + tax + SC + SC-GST` | NO |
| V7 | `payment_amount` = `order_amount` (no internal inconsistency) | Payload inspection | NO |
| V8 | webpack compiles with 0 new warnings | `yarn build` | YES |
