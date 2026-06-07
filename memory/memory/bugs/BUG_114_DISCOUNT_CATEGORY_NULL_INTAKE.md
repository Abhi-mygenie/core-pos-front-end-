# BUG-114 — Discount Type & Category Fields Not Passed to Backend on Category Discount

**Status:** INTAKE
**Priority:** P1
**Sprint:** POS 4.0
**Opened:** 2026-06-07
**Reporter:** Owner
**Component:** CollectPaymentPanel.jsx / orderTransform.js (likely)

---

## 1. Problem Statement (Owner Verbatim)

> Discount type as well as category — discount category is coming null to the backend. It's not getting passed from the frontend when any category discount is applied.

---

## 2. Evidence (Owner Screenshot — Order #939399)

Payload sent to backend (highlighted fields are the problem):

```json
{
  "order_id": "939399",
  "payment_mode": "cash",
  "payment_amount": 16,
  "payment_status": "paid",
  "comm_discount": 13.5,
  "discount_type": "",                        // ← SHOULD have a value (e.g., "category" or "member")
  "order_discount_type": "Percent",           // ← This IS populated
  "order_discount": 0,
  "discount_value": 13.5,
  "discount_member_category_id": 0,           // ← SHOULD be the category ID
  "discount_member_category_name": "",        // ← SHOULD be the category name
  "self_discount": 0,
  "coupon_code": "",
  "coupon_discount": 0
}
```

**Key observations:**
- `comm_discount: 13.5` and `discount_value: 13.5` are correctly populated — the discount amount IS being calculated
- `order_discount_type: "Percent"` is populated — the discount method IS known
- But `discount_type: ""` — the discount source/category type is **empty**
- `discount_member_category_id: 0` — the category ID is **not threaded**
- `discount_member_category_name: ""` — the category name is **not threaded**

---

## 3. Expected Behavior

When a **category discount** is applied (e.g., member/staff/VIP category), the payload should include:

```json
{
  "discount_type": "<category_type>",
  "discount_member_category_id": <actual_category_id>,
  "discount_member_category_name": "<actual_category_name>"
}
```

---

## 4. Likely Affected Files

| File | Role |
|---|---|
| `CollectPaymentPanel.jsx` | Discount selection UI, category picker, state management |
| `orderTransform.js` | `collectBillExisting` / `placeOrderWithPayment` payload builders |
| `CartPanel.jsx` | If discount state is managed here before passing to payment |

---

## 5. Suspected Root Cause (To Investigate)

- Category discount selection stores the amount (`comm_discount`, `discount_value`) but does NOT propagate `discount_type`, `category_id`, `category_name` into the payment payload builder
- The payload transform function may not have fields mapped for these 3 properties
- Or the discount state object in React doesn't carry category metadata through to the payment submission

---

## 6. Open Questions

| # | Question |
|---|---|
| Q-114-1 | What are the valid values for `discount_type`? (e.g., "category", "member", "manual", "preset") |
| Q-114-2 | Where does the category list come from — profile API / CRM API? |
| Q-114-3 | Is this affecting all discount types or only category-based discounts? |

---

## 7. Next Steps

1. Trace discount category selection flow in `CollectPaymentPanel.jsx`
2. Check how `discount_type` / `discount_member_category_id` / `discount_member_category_name` are (or aren't) threaded into the payment payload in `orderTransform.js`
3. Wire the missing fields into the payload builder
4. Verify with a test order
