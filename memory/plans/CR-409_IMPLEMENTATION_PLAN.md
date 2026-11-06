# CR-409 — Implementation Plan (Gate 3)
**Date:** 2026-10-11
**Stage:** GATE_3_PLAN_COMPLETE
**Depends on:** `impact/CR-409_IMPACT_ANALYSIS.md`

---

## Entry Verification (MANDATORY before any code)

Run all three checks and confirm exact matches before touching a single file:

```bash
# E-1 anchor — orderTransform.js
sed -n '447,449p' /app/frontend/src/api/transforms/orderTransform.js
# Expected:
#       // Raw orderDetails preserved for bill printing (order-temp-store API)
#       rawOrderDetails: api.orderDetails || [],
#     };

# E-2a anchor — CPP props
sed -n '74,78p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
# Expected:
#   // method passed in `allowedMethods` only renders if it is ALSO configured
#   // by the restaurant. When undefined (dashboard caller) → existing
#   // behaviour is preserved verbatim.
#   allowedMethods,
# }) => {

# E-2b anchor — CPP coupon state
sed -n '327,331p' /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
# Expected:
#   const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
#   const [discountValue, setDiscountValue] = useState("");
#   const [discountFor, setDiscountFor] = useState('');     // CR-137: optional discount reason (max 50 chars)
#
#   // BUG-276: Service charge toggle

# E-3 anchor — OrderEntry CPP JSX
sed -n '1933,1937p' /app/frontend/src/components/order-entry/OrderEntry.jsx
# Expected:
#                   : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
#               }
#               // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

If any anchor differs → **STOP. Return to Planning.** Do not proceed.

---

## Scope Lock

| | |
|---|---|
| **Files WILL change** | `src/api/transforms/orderTransform.js` · `src/components/order-entry/CollectPaymentPanel.jsx` · `src/components/order-entry/OrderEntry.jsx` |
| **Files WILL NOT touch** | `couponTransform.js` · `couponService.js` · `socketHandlers.js` · `orderService.js` · `CartPanel.jsx` · `DashboardPage.jsx` · `AggregatorOrderPopOut.jsx` · `OrderDetailSheet.jsx` · `orderLedgerService.js` · any test file |

Scope expansion beyond these 3 files → **STOP. Declare. Get owner approval.**

---

## Edits

### E-1 — `orderTransform.js` — Add coupon fields to `fromAPI.order`

**File:** `src/api/transforms/orderTransform.js`
**Where:** Inside `fromAPI.order` return object, immediately before the `rawOrderDetails` field (line ~447–448)

**Current:**
```javascript
      // Raw orderDetails preserved for bill printing (order-temp-store API)
      rawOrderDetails: api.orderDetails || [],
    };
```

**New:**
```javascript
      // CR-409: pre-loaded coupon fields from scan & order / re-engaged orders.
      // Source: employee-orders-list + scan-new-order socket payload.
      // Not available on get-single-order-new (OD-409-02 = B — accepted).
      couponCode:     api.coupon_code     || '',
      couponDiscount: parseFloat(api.coupon_discount) || 0,
      couponTitle:    api.coupon_title    || '',
      couponType:     api.coupon_type     || 'order',

      // Raw orderDetails preserved for bill printing (order-temp-store API)
      rawOrderDetails: api.orderDetails || [],
    };
```

---

### E-2a — `CollectPaymentPanel.jsx` — Add `initialCoupon` prop

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Where:** Props list — insert before `allowedMethods,` (line ~76)

**Current:**
```javascript
  allowedMethods,
}) => {
```

**New:**
```javascript
  // CR-409: pre-loaded coupon from scan & order. Null for regular POS orders → no change.
  initialCoupon = null,
  allowedMethods,
}) => {
```

---

### E-2b — `CollectPaymentPanel.jsx` — Mount useEffect to seed `selectedCoupon`

**File:** `src/components/order-entry/CollectPaymentPanel.jsx`
**Where:** After coupon/discount state declarations (after `discountFor` useState ~L329), before the service-charge block (~L331)

**Current:**
```javascript
  const [discountFor, setDiscountFor] = useState('');     // CR-137: optional discount reason (max 50 chars)

  // BUG-276: Service charge toggle
```

**New:**
```javascript
  const [discountFor, setDiscountFor] = useState('');     // CR-137: optional discount reason (max 50 chars)

  // CR-409: seed selectedCoupon from pre-loaded scan & order coupon on mount.
  // Fires once at panel open. initialCoupon = null for regular POS orders → no-op.
  // OD-409-01 (B): cashier can remove this coupon — Remove button works as normal.
  useEffect(() => {
    if (initialCoupon?.code && !selectedCoupon) {
      setSelectedCoupon(initialCoupon);
      setCouponCode(initialCoupon.code || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only — initialCoupon is frozen at panel open

  // BUG-276: Service charge toggle
```

---

### E-3 — `OrderEntry.jsx` — Pass `initialCoupon` prop to `<CollectPaymentPanel>`

**File:** `src/components/order-entry/OrderEntry.jsx`
**Where:** Inside `<CollectPaymentPanel>` JSX (starts L1866). After `initialDeliveryCharge={...}` closing `}` (~L1935), before the `// BUG-004` comment (~L1936)

**Current:**
```javascript
              initialDeliveryCharge={
                Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
                  ? (Number(deliveryCharge) || 0)
                  : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
              }
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

**New:**
```javascript
              initialDeliveryCharge={
                Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
                  ? (Number(deliveryCharge) || 0)
                  : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
              }
              // CR-409: pre-load coupon from existing scan & order.
              // Guard: null when no coupon on order → zero regression on regular POS orders.
              initialCoupon={
                orderData?.couponCode
                  ? {
                      valid:                true,
                      code:                 orderData.couponCode,
                      title:                orderData.couponTitle || orderData.couponCode,
                      computedDiscount:     orderData.couponDiscount || 0,
                      couponType:           orderData.couponType   || 'order',
                      stackableWithLoyalty: true,
                      fromExistingOrder:    true,
                    }
                  : null
              }
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
```

---

## Verification Matrix

| # | Edit | File | Change | How to verify | Auto? |
|---|------|------|--------|---------------|:-----:|
| V-1 | E-1 | `orderTransform.js` | 4 coupon fields present in `fromAPI.order` | `grep -n "couponCode.*api.coupon_code" orderTransform.js` → 1 hit | YES |
| V-2 | E-1 | `orderTransform.js` | Fields absent for orders with no coupon (empty string / 0) | Unit: `fromAPI.order({})` → `couponCode: '', couponDiscount: 0` | YES |
| V-3 | E-1 | `orderTransform.js` | Fields populated for orders with coupon | Unit: `fromAPI.order({ coupon_code:'MARRY', coupon_discount: 197 })` → `couponCode:'MARRY', couponDiscount:197` | YES |
| V-4 | E-2a | `CollectPaymentPanel.jsx` | `initialCoupon` prop present | `grep -n "initialCoupon = null" CollectPaymentPanel.jsx` → 1 hit | YES |
| V-5 | E-2b | `CollectPaymentPanel.jsx` | Mount useEffect present | `grep -n "CR-409" CollectPaymentPanel.jsx` → ≥1 hit | YES |
| V-6 | E-3 | `OrderEntry.jsx` | `initialCoupon` prop passed | `grep -n "initialCoupon=" OrderEntry.jsx` → 1 hit | YES |
| V-7 | E-3 | `OrderEntry.jsx` | null guard works — regular order passes null | Unit/browser: open Collect Bill on dine-in order with no coupon → coupon section empty, no badge | NO |
| V-8 | All | Browser | Scan order with coupon → CPP shows coupon pre-loaded | Open order 1233112 (or any web order with coupon) → Collect Payment → "✓ MARRY (−₹197)" badge already shown | NO |
| V-9 | All | Browser | Pay total correct | Same order → Pay button shows ₹1,242 (not ₹1,441) | NO |
| V-10 | All | Browser | Cashier can remove coupon | Click Remove on pre-loaded badge → coupon cleared → total reverts to ₹1,441 | NO |
| V-11 | Compile | All | 0 new webpack warnings | `yarn build` exit 0 | YES |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `initialCoupon` mount useEffect fires after CR-408 auto-apply deletion but before auto-fetch completes — no race | NONE | Mount effect fires synchronously at mount; auto-fetch is async. No interaction. |
| `orderData?.couponCode` guard fails for empty string `''` | VERY LOW | `''` is falsy → `initialCoupon = null` → correct |
| E-3 passed to wrong CPP instance | NONE | Only 1 `<CollectPaymentPanel` in OrderEntry (confirmed) |

---

## Execution Sequence

1. Entry Verification (all 3 anchors) — confirm exact match
2. Apply E-1 (`orderTransform.js`) via `search_replace`
3. Apply E-2a (`CollectPaymentPanel.jsx`) — prop
4. Apply E-2b (`CollectPaymentPanel.jsx`) — mount useEffect
5. Apply E-3 (`OrderEntry.jsx`) — pass prop
6. `yarn build` → 0 new warnings
7. Grep checks V-1 through V-6
8. Write unit tests for V-2 and V-3
9. Execute Post-Code Registry Checklist (Step 5)
10. Write QA Handover

---

## Post-Code Registry Checklist (Step 5)

```
□ 1. registry.json: CR-409 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_cr_batch
□ 2. CR_REGISTRY.md: CR-409 row updated to GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: entries for all 3 files with CR-409 marker
□ 4. Code markers: // CR-409 present in all 3 modified files
□ 5. Compile: yarn build exit 0, 0 new warnings
```

---

## QA Handover Seed

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V-1..V-6 | Grep/build checks | Run grep + yarn build | All pass |
| V-7 | Regular POS order — no coupon | Open Collect Payment on dine-in (no coupon) | Coupon section blank — no badge |
| V-8 | Scan order with coupon | Open order 1233112 (or any web order with `coupon_code`) → Collect Payment | "✓ MARRY (−₹197)" badge pre-loaded |
| V-9 | Correct pay total | Same scan order | Pay button = ₹1,242 |
| V-10 | Cashier removes coupon | Click Remove on pre-loaded badge | Badge cleared, total = ₹1,441 |
| V-11 | Cashier re-applies coupon | After removal, type MARRY → auto-complete | Coupon re-applies via CRM |

---

## Summary

| Field | Value |
|---|---|
| Edits | 3 (E-1, E-2a, E-2b, E-3) |
| Files changing | 3 (`orderTransform.js`, `CollectPaymentPanel.jsx`, `OrderEntry.jsx`) |
| Lines added | ~28 |
| Lines deleted | 0 |
| Owner decisions | NONE (all locked) |
| Gate 4 GO needed | YES |
