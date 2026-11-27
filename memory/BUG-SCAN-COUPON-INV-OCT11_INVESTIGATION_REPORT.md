# INVESTIGATION REPORT — Coupon Auto-Apply (Scan & Order)
**Date:** 2026-10-11
**Status:** CLOSED — Root cause confirmed, routed to INTAKE as CR-408
**Steps used:** 6/10

---

## 1. Summary

Root cause: `CollectPaymentPanel.jsx` lines 882–887 — a `useEffect` block intentionally added in BUG-108 V1B (owner decision B-5) that silently auto-applies the "best" available CRM coupon as soon as the `/available` fetch returns results. Fires unconditionally for all order types including scan & order.

- **Classification:** FE_BUG / OWNER_DECISION_REVOKED
- **Confidence:** HIGH
- **Steps used:** 6/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Coupon auto-applied by silent useEffect in CPP | Code trace CPP lines 882-887 | CONFIRMED | CPP L882-887 |
| H2 | Auto-apply gated by order type (isWebOrder) | grep for isWebOrder in CPP coupon section | ELIMINATED | No guard exists |
| H3 | Single-order API returns coupon fields for re-hydration | API probe order 1233112 | ELIMINATED | `get-single-order-new` returns null for all coupon fields |
| H4 | Second auto-apply path: debounced type-ahead (L986-1005) | Code trace | DISTINCT | Requires cashier to type — cashier-initiated, acceptable |

---

## 3. Data Flow Trace

```
CollectPaymentPanel mounts (customer.id present, restaurantSettings.isCoupon=true)
  → useEffect [customer?.id] fires (L873-878)
  → fetchAvailableCoupons() → GET /pos/coupons/available
  → setAvailableCoupons(sorted) — list cached in state
  → displayedCoupons useMemo recomputes → non-empty
  → useEffect [displayedCoupons] fires (L882-887)        ← ROOT CAUSE
      if (selectedCoupon || couponCode || !displayedCoupons.length) return;  ← no order-type guard
      const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
      if (best) runValidate(best.code);
  → runValidate('MARRY') → POST /pos/coupons/validate
  → setSelectedCoupon(result)   ← coupon applied without cashier action
```

**Break point:** L882-887 — unconditional auto-apply with no guard for scan & order, isWebOrder, isPrepaid, or cashier intent.

---

## 4. API Evidence

**Order 1233112 (live scan & order with coupon MARRY)**

| API | coupon_code | coupon_discount | loyalty_info |
|-----|------------|-----------------|--------------|
| `employee-orders-list` (LIST) | `MARRY` | `197` | `{earned:true, redeemed:false, ...}` |
| `get-single-order-new` (SINGLE) | `null` | `null` | `null` |

Additional finding: `fromAPI.order` transform (orderTransform.js) does not read `coupon_code` / `coupon_discount` / `loyalty_info` from the API response — these fields are silently dropped during transform.

Evidence files:
- `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/order_1233112_raw.json`
- `/app/memory/evidence/BUG-SCAN-COUPON-INV-OCT11/step1_findings.json`

---

## 5. Fix Scope

- **File:** `CollectPaymentPanel.jsx` (R5 HOTSPOT)
- **Lines:** 882–887 (6-line `useEffect` block — delete entirely)
- **Planning-skip eligible:** NO — R5 hotspot requires full gate flow (Gates 2–4)

```javascript
// LINES TO REMOVE (882-887):
useEffect(() => {
  if (selectedCoupon || couponCode || !displayedCoupons.length) return;
  const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
  if (best) runValidate(best.code);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [displayedCoupons]);
```

**PATH 2 (L986-1005 debounced type-ahead): NO CHANGE** — this path only fires after cashier types a code prefix; it is cashier-initiated and acceptable.

---

## 6. Retroactive Candidates

None.

---

## 7. Routing

→ Registered as **CR-408** (INTAKE complete).
→ Awaiting Gate 2 (Impact Analysis) + Gate 3 (Plan) + Gate 4 GO before implementation.
