# BUG-280 Investigation Report — CLOSED

**ID:** BUG-280  
**Title:** Customer Details (name/phone/membership_id) Not Sent to Settle API from Collect Bill  
**Type:** FE_BUG  
**Risk:** HIGH — customer profile data silently lost on every bill-payment  
**Role:** INVESTIGATION  
**Date:** 2026-07-30  
**Steps Used:** 7/10  
**Confidence:** HIGH — root cause confirmed by code trace  
**Status:** INVESTIGATION CLOSED — owner decisions received — READY FOR PLANNING

---

## Owner Decisions (Received 2026-07-30)

| Decision | Answer |
|----------|--------|
| OD-2: `email` vs `cust_email` key name | **Keep `email: ''` as legacy. Do NOT replace. Do NOT add `cust_email`.** |
| OD-2: Add user's email via `cust_email`? | **No** — email not used |

---

## Root Cause — CONFIRMED

`collectBillExisting` (`orderTransform.js` L1408-1654) receives `customer` as its 3rd parameter. The function's payload block (L1549-1641) **never reads the `customer` object**. Every `order-bill-payment` call sends empty strings for all customer identity fields, even when the operator selected a customer before collecting payment.

**Comparison with correctly-implemented functions:**

| Function | cust_name | cust_mobile | cust_membership_id |
|----------|:---------:|:-----------:|:-----------------:|
| `placeOrder` (L996-1001) | ✅ | ✅ | ✅ |
| `updateOrder` (L1131-1132) | ✅ | ✅ (BUG-270 fixed) | ✅ |
| `collectBillExisting` (L1639-1640) | ❌ | ❌ | ❌ |

---

## Data Flow Trace

```
Operator selects customer → customer object in OrderEntry.jsx state
  ↓
CollectPaymentPanel prop: customer = passedCustomer (L34)
  ↓
paymentData.customer = customer (CPP L1087) — set but only used for print
  ↓
OrderEntry.jsx L1467 / L2135:
  orderToAPI.collectBillExisting(table, cartItems, customer, paymentData, ...)
  ↓
collectBillExisting payload (L1549-1641):
  email: ''                   ← hardcoded empty (LEGACY — leave as-is per OD-2)
  name: tabContact?.name      ← TAB contact only
  mobile: tabContact?.phone   ← TAB contact only
  
MISSING:
  ✗ cust_name:          customer?.name || ''
  ✗ cust_mobile:        customer?.phone || ''
  ✗ cust_membership_id: customer?.id || ''
```

---

## Exact Fix (FINAL — confirmed with owner decisions)

**File:** `src/api/transforms/orderTransform.js`  
**Location:** `collectBillExisting` payload block, around L1636-1641 (before closing `}`)  
**Method:** `search_replace`

**ADD (3 lines — before `name: tabContact?.name`):**
```javascript
      // BUG-280 FIX: customer identity fields (mirrors placeOrder L996-1001 + updateOrder L1131-1132)
      cust_name:          customer?.name          || '',
      cust_mobile:        customer?.phone         || '',
      cust_membership_id: customer?.id            || '',
      // Note: email: '' left as legacy (OD-2 confirmed — not used)
```

**DO NOT change:**
- `email: ''` at L1564 — leave as-is (legacy, owner confirmed)
- `name: tabContact?.name` — leave as-is (TAB credit tracking, separate purpose)
- `mobile: tabContact?.phone` — leave as-is (TAB credit tracking)

---

## Blast Radius

| File | Lines | Change |
|------|-------|--------|
| `src/api/transforms/orderTransform.js` | +3 | `cust_name`, `cust_mobile`, `cust_membership_id` in `collectBillExisting` |

**Total: 1 file, 3 lines**  
**Hotspot R5: YES** → full gate cycle, no planning skip

---

## Acceptance Criteria

```
AC-1: After Collect Bill → settle → backend receives cust_name = operator-entered customer name
AC-2: After Collect Bill → settle → backend receives cust_mobile = customer's phone
AC-3: After Collect Bill → settle → backend receives cust_membership_id = customer's CRM ID
AC-4: email: '' unchanged (legacy field not broken)
AC-5: name: tabContact?.name unchanged (TAB tracking unaffected)
AC-6: Regression: placeOrder + updateOrder unchanged
```

---

## Related

- BUG-270: Same type of miss fixed for `updateOrder` — same pattern
- BUG-281: Shares `collectBillExisting` edit location — **combine both in one Planning session**
