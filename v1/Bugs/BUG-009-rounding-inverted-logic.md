## BUG-009 — Rounding Off Inverted Logic (₹1.06 Rounds to ₹2 Instead of ₹1)

**Module:** Billing / Collect Payment / Order Totals / Bill Print  
**Status:** Fixed  
**Severity:** High  
**Priority:** P1  

### Expected Behavior
Round-off should follow old POS logic: if the fractional part of the raw total is <= 0.10, round DOWN (floor); if > 0.10, round UP (ceil). Example: ₹1.06 → ₹1; ₹1.11 → ₹2; ₹1.10 → ₹1.

### Actual Behavior
The rounding condition was inverted. Code checked `ceilTotal - rawTotal >= 0.10` (distance to ceiling) instead of `rawTotal - Math.floor(rawTotal) > 0.10` (fractional part). This produced the exact opposite result: ₹1.06 rounded UP to ₹2; ₹1.94 rounded DOWN to ₹1.

### Business Impact
- Every non-integer order total was rounding in the wrong direction.
- Customer-facing totals were incorrect — small fractional amounts were overcharged, large fractional amounts were undercharged.
- API payloads (`order_amount`, `round_up`) sent incorrect values to backend.

### Root Cause
Confirmed: The rounding logic in both `CollectPaymentPanel.jsx` (lines 247-251) and `orderTransform.js` `calcOrderTotals` (lines 397-402) used the condition `ceilTotal - rawTotal >= 0.10` which is the complement of the fractional part. For ₹1.06: `ceil(1.06) - 1.06 = 0.94`, and `0.94 >= 0.10` evaluated to true → wrongly rounded UP.

### Scope
All order total calculations — UI display (Collect Bill screen) and API payloads (place-order, update-order, place-order-with-payment).

### Dependencies
- Backend rounding must match — `round_up` and `order_amount` fields in API payloads now have different values for fractional amounts.
- AD-001 in ARCHITECTURE_DECISIONS_FINAL.md documented the old (wrong) behavior — AD update pending (Entry #7 in AD_UPDATES_PENDING.md).

### Reference Docs
- `app/memory/ARCHITECTURE_DECISIONS_FINAL.md` (AD-001)
- `app/memory/AD_UPDATES_PENDING.md` (Entry #7)

### Candidate Files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (rounding block, lines ~247-253)
- `frontend/src/api/transforms/orderTransform.js` (`calcOrderTotals` rounding block, lines ~397-405)

### Fix Applied
Replaced the inverted condition in both files:
- **OLD**: `ceilTotal - rawTotal >= 0.10 → ceil; else → floor`
- **NEW**: `fractional = rawTotal - Math.floor(rawTotal); fractional > 0.10 → ceil; else → floor`
- `roundOff` display value and `round_up` API field adjusted accordingly.

### Verification
- ₹1.06: fractional=0.06, <=0.10 → floor → ₹1 ✓
- ₹1.94: fractional=0.94, >0.10 → ceil → ₹2 ✓
- ₹1.10: fractional=0.10, <=0.10 → floor → ₹1 ✓
- ₹1.11: fractional=0.11, >0.10 → ceil → ₹2 ✓

### Regression Risk
- All order totals change for non-integer amounts. Backend rounding must be verified for consistency.
