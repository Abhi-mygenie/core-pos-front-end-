## BUG-015 — Loyalty, Coupon Code, and Wallet Shown Without Feature Flag Gating

**Module:** Billing / Collect Payment / Loyalty / Coupon / Wallet / Settings  
**Status:** Fixed  
**Severity:** Medium  
**Priority:** P2  

### Expected Behavior
Coupon, Loyalty, and Wallet sections on the Collect Bill screen should only be visible when the respective feature is enabled in the restaurant profile settings.

### Actual Behavior
All three sections were shown whenever a `customer` object was passed to `CollectPaymentPanel` — regardless of whether the restaurant had the feature enabled. The profile settings flags (`isCoupon`, `isLoyalty`, `isCustomerWallet`) existed in the codebase but were not referenced in `CollectPaymentPanel`.

### Business Impact
- Restaurants that have disabled coupons/loyalty/wallet in their settings still saw these options on the Collect Bill screen.
- Staff confusion — clicking on disabled features had no real effect but suggested they were available.

### Root Cause
Confirmed: `CollectPaymentPanel.jsx` render conditionals used `{customer && (...)}` only. The feature flags `isCoupon`, `isLoyalty`, `isCustomerWallet` from `profileTransform.settings()` were parsed and stored in `restaurant.settings` (via `useRestaurant()`) but never consumed in the billing screen. They were only used in the Settings panel (`ViewEditViews.jsx`) for display/toggle.

### Scope
`CollectPaymentPanel.jsx` — 6 render conditionals (3 default branch + 3 room branch).

### Dependencies
- Flags come from profile API via `profileTransform.settings()` → `restaurant.settings`.
- If profile API doesn't return these flags (stale/missing data), sections default to hidden (safe default via optional chaining `restaurantSettings?.isCoupon`).

### Reference Docs
- `frontend/src/api/transforms/profileTransform.js` (lines 190-192 — flag parsing)

### Candidate Files
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (render conditionals at lines ~496, ~533, ~560, ~845, ~876, ~892)

### Fix Applied
**CollectPaymentPanel.jsx**:
- Destructured: `const { ..., settings: restaurantSettings } = useRestaurant();`
- Default branch:
  - Coupon: `{customer && restaurantSettings?.isCoupon && (...)}`
  - Loyalty: `{customer && restaurantSettings?.isLoyalty && (...)}`
  - Wallet: `{customer && restaurantSettings?.isCustomerWallet && (...)}`
- Room branch: same 3 conditionals applied.

### Verification
- Disable Coupons in Settings → Coupon section hidden on Collect Bill.
- Disable Loyalty in Settings → Loyalty section hidden.
- Disable Wallet in Settings → Wallet section hidden.
- Enable all → all sections visible when customer is attached.

### Regression Risk
- If `restaurant.settings` is undefined/null, all sections default to hidden (safe). The `?.` optional chaining prevents errors.
