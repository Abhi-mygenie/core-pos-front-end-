# CR-025: Discount Payload Fix — order_discount sends ₹ amount, self_discount zeroed
## Registered: 2026-06-10
**Sprint:** pos_4_0
**Priority:** P0 (money-impacting — backend stores wrong discount values)
**Status:** IMPLEMENTED — awaiting owner smoke test
**Owner:** Abhi

---

## 1. BUGS FIXED

### Bug 1: `order_discount` sent percentage instead of ₹ amount
- **Before:** `order_discount: discounts.orderDiscountPercent` → sent **20** (the percentage)
- **After:** `order_discount: discounts.manual` → sends **87.8** (the ₹ amount)
- `order_discount_type` ("Percent"/"Flat") remains as metadata about how it was derived
- **All 3 paths fixed:** prepaid, postpaid, transferToRoom

### Bug 2: `self_discount` should not be used
- **Before:** `self_discount: discounts.manual` → sent the ₹ discount amount
- **After:** `self_discount: 0` across all paths
- Owner directive: this field should not be relied on

### Bug 3: Prepaid missing fields that postpaid sends
- **Added to prepaid:** `comm_discount`, `discount_value`, `discount_type`
- All 3 paths are now symmetric

## 2. FILES CHANGED

| File | Change |
|------|--------|
| `src/api/transforms/orderTransform.js` | `placeOrderWithPayment`: order_discount → manual, self_discount → 0, added comm_discount/discount_value/discount_type |
| `src/api/transforms/orderTransform.js` | `collectBillExisting`: order_discount → manual, self_discount → 0 |
| `src/api/transforms/orderTransform.js` | `transferToRoom`: order_discount → manual, self_discount → 0 |

## 3. VERIFICATION

For a 20% discount on ₹439 Item Total:
- **Before:** `order_discount: 20, self_discount: 87.8`
- **After:** `order_discount: 87.8, self_discount: 0`

## 4. OWNER DECISIONS
| ID | Decision | Pick |
|----|----------|------|
| OD-025-1 | `self_discount` handling | Send as 0 (keep field, zero it out) |

## 5. ARTIFACT TRACKER
| # | Artifact | Status |
|---|----------|--------|
| 1 | Investigation | DONE |
| 2 | Implementation | DONE |
| 3 | Owner Smoke Test | PENDING |
