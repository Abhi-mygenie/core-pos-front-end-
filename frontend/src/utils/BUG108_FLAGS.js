// BUG-108 P1 — Feature flags for Coupon / Loyalty / Wallet CRM integration
//
// All flags default to `false`. UI renders the three sections in their
// "disabled with helper text" state and `orderTransform.js` force-zeros the
// corresponding payload fields so no mock value can reach PLACE_ORDER /
// BILL_PAYMENT / print payloads.
//
// P2 will flip individual flags to `true` once the corresponding CRM endpoint
// is verified live:
//   - couponLive       → `GET /pos/coupons/available` + `POST /pos/coupons/validate`
//   - loyaltyRatioLive → per-tier ratio from `customer.loyalty.ratio_per_point`
//   - walletDebitLive  → separate Wallet CR (out of BUG-108 scope)
//
// Owner-locked decisions (see FINAL_OWNER_APPROVALS doc):
//   Q1=B  — Coupon UI visible-but-disabled with "Coming soon"
//   Q5=B  — Loyalty input disabled with helper text
//   Q6=B  — Wallet input disabled with helper text
//   Q7=B  — CRM-unavailable banner copy: "loyalty program unavailable"

export const BUG108_FLAGS = {
  couponLive: false,
  loyaltyRatioLive: false,
  loyaltyPreviewLive: true,   // Phase B: show real CRM loyalty data (read-only preview)
  walletDebitLive: false,
};

// Owner-locked cashier-facing copy strings (FINAL_OWNER_APPROVALS §2.1)
export const BUG108_COPY = {
  couponDisabledHelper:       'Coming soon',
  couponBlockedByDiscount:    'Remove the manual discount to apply a coupon.',
  discountBlockedByCoupon:    'Remove the coupon to apply a manual discount.',
  loyaltyDisabledHelper:      'Loyalty program unavailable',
  loyaltyPreviewHelper:       'Redemption will be enabled in a future update.',
  walletDisabledHelper:       'Wallet payments will be available after the next update.',
  crmUnavailableBanner:       'loyalty program unavailable',
};
