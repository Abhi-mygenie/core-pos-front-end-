# BUG-592 — Intake
## Manual Bill Print Shows Discount as Percentage (50) Instead of Rupee Amount (₹180.96)

**Date:** 2026-10-18
**Type:** BUG
**Priority:** P1
**Risk:** MEDIUM
**Area:** Billing / Print / order-temp-store
**Sprint:** oct_cr_batch
**Registered by:** INTAKE role (investigated 2026-10-18 in session)

---

## Duplicate check
DISTINCT — separate from BUG-536 (SC GST missing). This is about discount_amount showing percentage not rupees.

---

## Symptom
When a prepaid order has a percentage discount applied (e.g., 50%) and a manual bill is printed before the order is served, the printed bill shows:

```
Discount: 50     ← shows the percentage number
```

Instead of:
```
Discount: ₹180.96   ← the actual rupee discount amount
```

Evidence: owner-provided bill photos (2026-10-18 session), Bill No. 000524, Krunch N Grill Ruby Zap restaurant, 50% discount.

---

## Root Cause (confirmed)

### Step 1 — FE sends raw % to backend (place-order payload)
```js
// orderTransform.js L1418-1424 (comment: "raw input, not resolved ₹")
discount_value: discounts.preset > 0
  ? (discounts.presetDiscountPercent || 0)   // sends 50 (the %) not ₹180.96
```
Backend stores `discount_value = 50`.

### Step 2 — Backend doesn't populate resolved ₹ amount for prepaid/unserved orders
`restaurant_discount_amount` (the actual ₹ amount) is only populated by backend at settlement. For prepaid orders not yet served, this field is null/absent.

### Step 3 — FE reads wrong fallback
```js
// orderTransform.js L234
discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0
// restaurant_discount_amount = null → falls back to discount_value = 50 ← BUG
```

### Step 4 — Wrong value sent to order-temp-store
```js
// buildBillPrintPayload
discount_amount: overrides.discountAmount ?? (parseFloat(order.discount) || 0)
// No override for manual reprint → uses order.discount = 50
// → order-temp-store receives discount_amount = 50
// → printer prints "Discount: 50"
```

---

## Two-Part Fix Required

| Part | Owner | Action |
|---|---|---|
| **Backend** | Backend team | Populate `restaurant_discount_amount` (resolved ₹) at order creation for prepaid orders — not only at settlement |
| **FE safety** | FE team | In the `fromAPI.order` fallback (L234): do NOT fall back to `discount_value` if it looks like a raw percentage (integer ≤ 100) without a corresponding ₹ amount field |

---

## Evidence
- Source: OWNER-REPORTED (bill photos, Oct 18 2026)
- Confidence: HIGH — code traced, root cause confirmed
- Investigation summary in session: `handover/SESSION_HANDOVER_2026_10_18_BUG463_ARCH_HOLD.md`
- Test restaurant: owner@krunchn.com or similar (Krunch N Grill Ruby Zap, Bill 000524)

---

## Blast Radius
- `src/api/transforms/orderTransform.js` L234 (FE safety fix)
- Backend: order creation API for prepaid orders
- Hotspot: NO (orderTransform.js L234 is read-only field mapping, not R5 logic)
- Risk: MEDIUM — affects all restaurants using percentage discounts with prepaid orders

---

## Gate Status
- Gate 1: COMPLETE
- Gate 2: BLOCKED on backend (backend must populate `restaurant_discount_amount` at order creation)
- Backend brief needed: Yes
