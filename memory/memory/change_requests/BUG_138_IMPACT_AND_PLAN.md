# BUG-138 — Impact Analysis & Implementation Plan

**Item:** BUG-138 — Discount Payload `order_discount` and `self_discount` Wrong Values
**Gate:** 2+3 (Impact Analysis + Implementation Plan)
**Date:** 2026-06-18
**Risk:** CRITICAL (financial — discount fields affect order totals stored by backend)
**Code Reality:** PARTIAL (fields exist but carry wrong values)
**Conflict Pre-Check:** CLEAR — no other open item touches `orderTransform.js`
**Related:** CR-025 (original discount fix), 17-june session (discounts.manual → discounts.total)

---

## Gate 2: Impact Analysis

### Problem Summary

Two discount payload fields are wrong across 3 payment paths:

| Field | Current Code | Sends | Should Send | Impact |
|-------|-------------|-------|-------------|--------|
| `self_discount` | `0` (hardcoded) | Always 0 | `manual + preset` ₹ amount | Backend stores wrong discount |
| `order_discount` | `discounts.total \|\| 0` | manual + preset + coupon + loyalty + wallet | `manual + preset` ₹ amount only | Double-counts coupon/loyalty/wallet |

### Why `discounts.total` Is Wrong for `order_discount`

The `discounts` object has:
```
CollectPaymentPanel (Full Mode):
  total = manual + preset + loyalty + coupon + wallet     ← OVERCOUNTS

CartPanel (QSR Mode):
  total = manual + preset                                 ← coincidentally correct (no coupon/loyalty/wallet)
```

But the payload ALSO has separate fields for coupon/loyalty/wallet:
- `coupon_discount: discounts.couponDiscount || 0`
- `used_loyalty_point: discounts.loyaltyPointsRedeemed || 0`
- `use_wallet_balance: ...`

So using `discounts.total` for `order_discount` **double-counts** these when a coupon/loyalty/wallet is applied alongside a manual/preset discount.

### Old POS Field Semantics (from owner-provided curl)
| Field | Meaning | Example |
|-------|---------|---------|
| `self_discount` | ₹ amount of manual + preset discount | 5.6 |
| `order_discount` | Same as self_discount | 5.6 |
| `comm_discount` | ₹ amount of category/preset discount only | 5.6 |
| `coupon_discount` | ₹ amount of coupon (separate) | 0 |
| `discount_value` | Raw input (% or ₹ depending on type) | 10 |
| `order_discount_type` | "Percent" or "Amount" | Percent |

### Data Flow Per Path

**Flow 3 — Prepaid (`placeOrderWithPayment`):**
```
CollectPaymentPanel.jsx:1046 → discounts: { manual, preset, total, ... }
  ↓
OrderEntry.jsx:1894 → orderToAPI.placeOrderWithPayment(..., paymentData, ...)
  ↓
orderTransform.js:1199 → placeOrderWithPayment(table, items, customer, type, paymentData, options)
  → L1199: const { discounts = {} } = paymentData
  → L1313: self_discount: 0                    ← WRONG
  → L1323: self_discount: 0                    ← WRONG (duplicate line)
  → L1330: order_discount: discounts.total || 0 ← WRONG formula
```

**Flow 4 — Postpaid (`collectBillExisting`):**
```
CollectPaymentPanel.jsx:1046 → discounts: { manual, preset, total, ... }
  ↓
OrderEntry.jsx:1696 → orderToAPI.collectBillExisting(..., paymentData, ...)
  ↓
orderTransform.js:1410 → collectBillExisting(table, items, customer, paymentData, options)
  → L1410: const { discounts = {} } = paymentData (destructured)
  → L1594: self_discount: 0                      ← WRONG
  → L1602: order_discount: discounts.total || 0   ← WRONG formula
```

**Flow 5 — TransferToRoom:**
```
orderTransform.js:1661 → transferToRoom(table, paymentData)
  → L1661: const { discounts = {} } = paymentData (destructured)
  → L1673: order_discount: discounts.total || 0   ← WRONG formula
  → L1674: self_discount: 0                       ← WRONG
```

### Affected Files
| File | Lines | Impact |
|------|-------|--------|
| `api/transforms/orderTransform.js` | L1313, L1323, L1330, L1594, L1602, L1673, L1674 | **FIX TARGET** — 7 lines across 3 functions |

### Files WILL NOT Touch
- `CollectPaymentPanel.jsx` — discount computation is correct, `discounts` object shape is fine
- `CartPanel.jsx` — QSR discount computation is correct
- `OrderEntry.jsx` — passes paymentData through, no changes needed
- Flows 1 (placeOrder) and 2 (updateOrder) — correctly send 0 (no discount at placement time)

### Downstream Impact
- Backend stores `self_discount` and `order_discount` for reporting and settlement
- Reports that read these fields will show wrong discount values until fixed
- No frontend display impact (discount is shown from local state, not from stored payload)

### Owner Decisions Needed
- None — fix restores old POS parity (owner-provided curl is the contract)

---

## Gate 3: Implementation Plan

### Correct Formula
```js
// BUG-138: non-coupon/non-loyalty/non-wallet discount (manual + preset only)
// Matches old POS behavior. Coupon/loyalty/wallet have their own separate payload fields.
const selfAndOrderDiscount = (discounts.manual || 0) + (discounts.preset || 0);
```

### Edit 1: Flow 3 — Prepaid (`placeOrderWithPayment`)

**File:** `src/api/transforms/orderTransform.js`

**Current (L1312-1313 + L1323 + L1330):**
```js
      // Discount — CR-025: order_discount sends ₹ amount, self_discount zeroed
      self_discount:              0,
      ...
      self_discount:              0,
      ...
      order_discount:             discounts.total || 0,
```

**After:**
```js
      // BUG-138: self_discount + order_discount = manual + preset only (old POS parity)
      self_discount:              (discounts.manual || 0) + (discounts.preset || 0),
      ...
      self_discount:              (discounts.manual || 0) + (discounts.preset || 0),
      ...
      order_discount:             (discounts.manual || 0) + (discounts.preset || 0),
```

Note: L1313 and L1323 are duplicate `self_discount` lines (legacy from BUG-108 V1B). Both must be updated. Consider removing the duplicate during implementation.

### Edit 2: Flow 4 — Postpaid (`collectBillExisting`)

**File:** `src/api/transforms/orderTransform.js`

**Current (L1593-1594 + L1602):**
```js
      // Discounts — CR-025: order_discount sends ₹ amount, self_discount zeroed
      self_discount:                0,
      ...
      order_discount:               discounts.total || 0,
```

**After:**
```js
      // BUG-138: self_discount + order_discount = manual + preset only (old POS parity)
      self_discount:                (discounts.manual || 0) + (discounts.preset || 0),
      ...
      order_discount:               (discounts.manual || 0) + (discounts.preset || 0),
```

### Edit 3: Flow 5 — TransferToRoom

**File:** `src/api/transforms/orderTransform.js`

**Current (L1673-1674):**
```js
      order_discount:           discounts.total || 0,
      self_discount:            0,
```

**After:**
```js
      order_discount:           (discounts.manual || 0) + (discounts.preset || 0),
      self_discount:            (discounts.manual || 0) + (discounts.preset || 0),
```

### Verification Matrix

| Edit # | File | Change | How to Verify | Automated? |
|--------|------|--------|---------------|:---:|
| 1 | orderTransform.js:1313 | self_discount = manual+preset (prepaid) | Unit test: preset 10% on ₹56 → self_discount=5.6 | YES |
| 1 | orderTransform.js:1323 | self_discount = manual+preset (prepaid dup) | Same unit test covers | YES |
| 1 | orderTransform.js:1330 | order_discount = manual+preset (prepaid) | Unit test: preset 10% on ₹56 → order_discount=5.6 | YES |
| 2 | orderTransform.js:1594 | self_discount = manual+preset (postpaid) | Unit test: postpaid with preset discount | YES |
| 2 | orderTransform.js:1602 | order_discount = manual+preset (postpaid) | Same unit test | YES |
| 3 | orderTransform.js:1673 | order_discount = manual+preset (room) | Unit test: transferToRoom with discount | YES |
| 3 | orderTransform.js:1674 | self_discount = manual+preset (room) | Same unit test | YES |
| ALL | — | No double-count with coupon | Unit test: preset 5.6 + coupon 10 → order_discount=5.6, coupon_discount=10 | YES |
| ALL | — | QSR parity | Unit test: QSR with preset → same values | YES |
| ALL | — | No-discount order | Unit test: no discount → order_discount=0, self_discount=0 | YES |

### Execution Sequence
1. Edit L1312-1313: prepaid self_discount (first occurrence)
2. Edit L1323: prepaid self_discount (duplicate — update or remove)
3. Edit L1330: prepaid order_discount
4. Edit L1593-1594: postpaid self_discount
5. Edit L1602: postpaid order_discount
6. Edit L1673: room order_discount
7. Edit L1674: room self_discount
8. Compile check: `webpack compiled`
9. Run unit tests: existing `orderTransformFinancials.test.js` + new test cases

### Risk Register
| Risk | Mitigation |
|------|-----------|
| Backend expects `self_discount` to be 0 (per CR-025 OD-025-1) | Owner curl comparison proves backend expects the value. Old POS sent it. |
| `discounts.manual` or `discounts.preset` undefined | `|| 0` fallback handles undefined/null |
| Regression on non-discount orders | Formula yields 0+0=0 when no discount — identical to current behavior |
| QSR behavior change | QSR `discounts.total` already = `manual + preset` — no change |

### Post-Code Registry Checklist
- [ ] registry.json: BUG-138 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: add `orderTransform.js` row for BUG-138
- [ ] Code markers: `// BUG-138` comment on every modified line

### Scope Lock
- **Files WILL change:** `src/api/transforms/orderTransform.js` (7 lines modified across 3 functions)
- **Files WILL NOT touch:** CollectPaymentPanel, CartPanel, OrderEntry, orderService, any other file
