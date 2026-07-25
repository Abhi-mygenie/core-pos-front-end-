# BUG-118 — Nth-Item Coupon Code & BOGO Coupon Code — Features Not Working

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** CollectPaymentPanel.jsx / couponService.js / couponTransform (likely)

---

## 1. Problem Statement (Owner Verbatim)

> For the nth item coupon code and BOGO coupon code, few features are not working, so we have to test it.

---

## 2. Symptom

Certain coupon types are not functioning correctly:
- **Nth-item coupon** (e.g., "every 3rd item free" or "buy N get discount on Nth item")
- **BOGO coupon** (Buy One Get One)

Specific broken features are unknown at intake — needs a full test pass to identify which flows fail.

---

## 3. Expected Behavior

- Nth-item coupons: correctly identify qualifying items, apply discount to the Nth item based on coupon rules
- BOGO coupons: correctly identify qualifying pairs, apply free/discounted item based on coupon rules
- Both should: validate correctly, show discount in bill breakdown, pass correct payload to backend, print correctly on bill

---

## 4. Likely Affected Files

| File | Role |
|---|---|
| `CollectPaymentPanel.jsx` | Coupon input, validation, application |
| `couponService.js` | Coupon validation API calls |
| `couponTransform.js` (if exists) | Coupon response → discount mapping |
| `orderTransform.js` | Coupon fields in payment payload |
| `CartPanel.jsx` | Cart-level coupon display |

---

## 5. Test Matrix (Discovery Phase)

| Coupon Type | Test Case | Status |
|---|---|---|
| **Nth-item** | Apply to qualifying cart (N items present) | TBD |
| **Nth-item** | Apply to non-qualifying cart (< N items) | TBD |
| **Nth-item** | Discount amount correct on Nth item | TBD |
| **Nth-item** | Payload sent to backend correctly | TBD |
| **BOGO** | Apply to qualifying cart (pair present) | TBD |
| **BOGO** | Apply to non-qualifying cart (single item) | TBD |
| **BOGO** | Free item discount correct | TBD |
| **BOGO** | Payload sent to backend correctly | TBD |
| **Both** | Bill print shows coupon discount | TBD |
| **Both** | Remove coupon → discount reverts | TBD |

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-118-1 | Which specific coupon codes to test with on preprod? |
| Q-118-2 | Are these CRM-issued coupons or restaurant-configured coupons? |
| Q-118-3 | Is the issue in coupon validation, discount calculation, or payload submission? |

---

## 7. Next Steps

1. Get test coupon codes for Nth-item and BOGO types on preprod
2. Full test pass across the test matrix above
3. Identify and fix broken flows
