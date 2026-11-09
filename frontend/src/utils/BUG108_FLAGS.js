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
//   - loyaltyRedeemLive→ `POST /pos/loyalty/redeem` (CR-001C-LR, Phase C redeem-only)
//   - walletDebitLive  → separate Wallet CR (out of BUG-108 scope)
//
// Owner-locked decisions (see FINAL_OWNER_APPROVALS doc):
//   Q1=B  — Coupon UI visible-but-disabled with "Coming soon"
//   Q5=B  — Loyalty input disabled with helper text
//   Q6=B  — Wallet input disabled with helper text
//   Q7=B  — CRM-unavailable banner copy: "loyalty program unavailable"
//
// Phase C Redeem-Only (CR-001C-LR) owner-locked answers:
//   Q1=A — Redeem after payment success / on cashier confirm (A-resolved)
//   Q2=A — Apply max available capped amount (server auto-caps)
//   Q3=C — Pre-tax slot, follow current POS discount convention
//   Q4=A — On orphan (redeem succeeds but payment/order fails), surface
//          persistent manual-recovery warning with `transaction_id`
//   Q5=A — Production release not approved until preprod QA + owner smoke
//
// C-FE-1 (kill-switched wiring): `loyaltyRedeemLive=false` means
//   * `loyaltyService.redeemLoyalty()` throws `LOYALTY_REDEEM_DISABLED`
//   * `orderTransform.js` payload fields stay force-zeroed
//   * Redeem UI state machine remains at `idle`; no API call possible

export const BUG108_FLAGS = {
  // couponLive: REMOVED at V1 closure (2026-05-25). Coupon module gated only by restaurantSettings.isCoupon.
  loyaltyRatioLive: true,     // Phase C corrected (2026-05-24): gates payload + max-redeemable display
  loyaltyPreviewLive: true,
  loyaltyRedeemLive: false,   // Phase C corrected (2026-05-24): direct CRM redeem call REMOVED. Flag kept for dead-code safety but no longer gates anything active.
  walletDebitLive: false,
};

// Owner-locked cashier-facing copy strings (FINAL_OWNER_APPROVALS §2.1)
export const BUG108_COPY = {
  // couponDisabledHelper: REMOVED at V1 closure (2026-05-25). "Coming soon" path no longer exists.
  couponBlockedByDiscount:    'Remove the manual discount to apply a coupon.',
  discountBlockedByCoupon:    'Remove the coupon to apply a manual discount.',
  loyaltyDisabledHelper:      'Loyalty program unavailable',
  loyaltyPreviewHelper:       'Redemption will be enabled in a future update.',
  walletDisabledHelper:       'Wallet payments will be available after the next update.',
  crmUnavailableBanner:       'loyalty program unavailable',
  // Phase C corrected (2026-05-24) — CRM max-redeemable-driven copy.
  loyaltyLoadingHelper:       'Calculating loyalty discount…',
  loyaltyFailedHelper:        'Unable to calculate loyalty discount',
  loyaltyBelowMinHelper:      'Minimum {min} points required',
  // Legacy Phase C direct-redeem copy (dead code — kept for reference).
  loyaltyRedeemArmedHelper:   'Loyalty discount will apply when you confirm payment.',
  loyaltyRedeemApplyingHelper:'Redeeming loyalty points…',
  loyaltyRedeemAppliedHelper: 'Loyalty discount applied.',
  loyaltyRedeemCappedHelper:  'Capped to maximum allowed.',
  loyaltyRedeemRetryHelper:   'Redemption failed. Please retry or pay without loyalty.',
  loyaltyRedeemOrphanWarning: 'Loyalty was redeemed but the order did not complete. Admin must reconcile manually. Reference: ',
};
