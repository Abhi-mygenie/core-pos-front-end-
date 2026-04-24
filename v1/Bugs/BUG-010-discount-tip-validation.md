## BUG-010 — Discount and Tip Fields Allow Invalid Values (No Programmatic Max Validation)

**Module:** Billing / Collect Payment / Discount / Tip  
**Status:** Fixed  
**Severity:** Medium  
**Priority:** P2  

### Expected Behavior
- Discount percentage field should be capped at 100%. Values above 100% should be rejected.
- Flat discount should not allow negative values.
- Tip field should not allow negative values.

### Actual Behavior
- HTML `max="100"` attribute was set on discount % input, but not enforced by JavaScript — user could type 110% and it was accepted.
- `onChange` handler only rejected negative values (`< 0`), no upper bound check.
- Tip input had no validation at all — `onChange={(e) => setTipInput(e.target.value)}`.
- If 110% discount was entered, `manualDiscount` exceeded `itemTotal`, making `subtotalAfterDiscount = 0` via the `Math.max(0, ...)` clamp, but the display showed a discount larger than the item total.

### Business Impact
- Staff could accidentally enter invalid discount values, leading to ₹0 or confusing totals.
- No warning or feedback when exceeding limits.

### Root Cause
Confirmed: HTML `max` attribute on `type="number"` is advisory only — it does not prevent typing values above the max. The `onChange` handler only guarded against negatives, not upper bounds.

### Scope
`CollectPaymentPanel.jsx` — discount input (default + room branch), tip input.

### Dependencies
None — pure frontend input validation. No API or socket impact.

### Reference Docs
None.

### Candidate Files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (discount onChange lines ~471, ~808; tip onChange line ~625)

### Fix Applied
- **Discount % onChange**: Added JS-enforced clamp — if `val > 100` for percent type, sets value to `'100'`. Rejects negative and empty.
- **Discount flat onChange**: Same negative rejection (flat discount has no hard upper cap since it depends on context, but `subtotalAfterDiscount = Math.max(0, ...)` prevents negative subtotal).
- **Tip onChange**: Rejects negative values, allows empty for clearing.
- Applied to both default branch and Room Service branch discount inputs.

### Verification
- Enter 110 in discount % → clamped to 100.
- Enter -5 in discount → cleared to empty.
- Enter -10 in tip → cleared to empty.
- Normal values (e.g., 15%, ₹50 tip) work as before.

### Regression Risk
None — only adds input guards, no computation change.
