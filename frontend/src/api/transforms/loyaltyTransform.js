// Loyalty Transform — request/response mappers + helpers for the redeem endpoint
// Contract source: CR-001C-LR handoff (frozen 2026-05-23). See:
//   /app/memory/change_requests/final_sprint_reconciliation/
//     POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md
//
// Frozen request: customer_id, points_to_redeem, order_id, order_total, idempotency_key
// Frozen response (success.data):
//   transaction_id, points_redeemed, ratio_per_point, redeemed_value,
//   remaining_points, remaining_points_value, tier, total_points_redeemed,
//   customer_id, idempotent (replay marker only)
// Frozen error envelope: { success: false, message, data: { error: { code, message, ... } } }
//
// C-FE-1 (kill-switched): this transform is callable; live redemption is gated
// at the service layer via `BUG108_FLAGS.loyaltyRedeemLive`.

// =============================================================================
// UI state machine constants (for CollectPaymentPanel local state)
// =============================================================================
export const LOYALTY_REDEEM_STATES = Object.freeze({
  IDLE:                     'idle',                       // checkbox unticked or ineligible
  ELIGIBLE:                 'eligible',                   // ticked, points-to-redeem chosen, ready to fire
  APPLYING:                 'applying',                   // POST in flight
  APPLIED:                  'applied',                    // server returned success — discount applied
  ERROR:                    'error',                      // server returned `success=false` or HTTP 422 — inline error
  MANUAL_RECOVERY_WARNING:  'manual_recovery_warning',    // redeem succeeded but downstream order/payment failed
});

// =============================================================================
// Idempotency key — recommended format from CR-001C-LR §4.1
//   pos_{restaurant_id}_{order_id}_loyalty_{points}
// =============================================================================
export const buildRedeemIdempotencyKey = ({ restaurantId, orderId, points }) => {
  const r = String(restaurantId || 'unknown').replace(/[^A-Za-z0-9_]/g, '');
  const o = String(orderId || 'noorder').replace(/[^A-Za-z0-9_]/g, '');
  const p = String(points || 0);
  return `pos_${r}_${o}_loyalty_${p}`;
};

// LocalStorage keys
export const LOYALTY_LS_KEYS = Object.freeze({
  ORPHAN_DEBITS:    'bug108_loyalty_orphan_debits',
  IDEMPOTENCY_MAP:  'bug108_loyalty_idempotency_map',
});

// =============================================================================
// Request mapper — POS state → CRM request body
// =============================================================================
export const toAPI = {
  redeem: ({ customerId, pointsToRedeem, orderId, orderTotal, idempotencyKey }) => ({
    customer_id:      String(customerId || ''),
    points_to_redeem: parseInt(pointsToRedeem, 10),
    order_id:         String(orderId || ''),
    order_total:      Number(orderTotal || 0),
    idempotency_key:  String(idempotencyKey || ''),
  }),
};

// =============================================================================
// Response mappers — CRM response → POS state
// =============================================================================
export const fromAPI = {
  /**
   * Map a successful redeem response (HTTP 200, `success=true`).
   * Includes the `idempotent` replay marker when present.
   */
  redeemSuccess: (responseBody) => {
    const data = responseBody?.data || {};
    return {
      transactionId:        data.transaction_id || null,
      pointsRedeemed:       Number(data.points_redeemed || 0),
      ratioPerPoint:        Number(data.ratio_per_point || 0),
      redeemedValue:        Number(data.redeemed_value || 0),
      remainingPoints:      Number(data.remaining_points || 0),
      remainingPointsValue: Number(data.remaining_points_value || 0),
      tier:                 data.tier || '',
      totalPointsRedeemed:  Number(data.total_points_redeemed || 0),
      customerId:           data.customer_id || null,
      idempotent:           data.idempotent === true,
      message:              responseBody?.message || '',
    };
  },

  /**
   * Map a business-failure response (HTTP 200, `success=false`).
   * Carries diagnostic extras when present (`existing` triplet for
   * IDEMPOTENCY_CONFLICT, `min_redemption_points` for BELOW_MIN_REDEMPTION).
   */
  redeemError: (responseBody) => {
    const error = responseBody?.data?.error || {};
    const code = error.code || 'UNKNOWN_ERROR';
    return {
      code,
      message:             error.message || responseBody?.message || 'Redemption failed.',
      existing:            error.existing || null,
      minRedemptionPoints: error.min_redemption_points !== undefined
                             ? Number(error.min_redemption_points)
                             : null,
    };
  },
};

// =============================================================================
// Error code → cashier-facing copy
// (Cashier copy stays minimal here; component-level copy in BUG108_COPY.)
// =============================================================================
const ERROR_COPY = Object.freeze({
  ORDER_ID_REQUIRED:        'Order reference missing. Please re-create the order.',
  IDEMPOTENCY_KEY_REQUIRED: 'Internal redeem error. Please retry.',
  INVALID_POINTS:           'Points must be a positive whole number.',
  IDEMPOTENCY_CONFLICT:     'Loyalty key conflict. Please refresh and try again.',
  SETTINGS_MISSING:         'Loyalty program is not configured for this restaurant.',
  LOYALTY_DISABLED:         'Loyalty program is currently disabled.',
  CUSTOMER_NOT_FOUND:       'Customer not found.',
  BELOW_MIN_REDEMPTION:     'Below minimum redeemable points.',
  INSUFFICIENT_POINTS:      'No redeemable points available.',
  UNKNOWN_ERROR:            'Redemption failed. Please retry or pay without loyalty.',
});

export const errorCodeToCopy = (code) =>
  ERROR_COPY[code] || ERROR_COPY.UNKNOWN_ERROR;


// =============================================================================
// Phase C corrected (2026-05-24): /pos/max-redeemable response mapper
// Non-mutating CRM calculation endpoint — returns tier-aware, cap-aware values.
// =============================================================================
export const maxRedeemableFromAPI = (responseBody) => {
  const data = responseBody?.data || {};
  const errorObj = data.error || null;
  return {
    maxPointsRedeemable: Number(data.max_points_redeemable || 0),
    maxDiscountValue:    Number(data.max_discount_value || 0),
    ratioPerPoint:       Number(data.ratio_per_point || 0),
    tier:                data.tier || '',
    availablePoints:     Number(data.available_points || 0),
    minRedemptionPoints: Number(data.min_redemption_points || 0),
    loyaltyEnabled:      data.loyalty_enabled !== undefined ? data.loyalty_enabled : null,
    // PROD-HOTFIX-007 (2026-05-29): earn-points projection from CRM.
    projectedPointsEarned: Number(data.projected_points_earned || 0),
    projectedEarnPercent:  Number(data.projected_earn_percent || 0),
    earnRatioDisplay:      data.earn_ratio_display || '',
    error:               errorObj ? { code: errorObj.code || 'UNKNOWN_ERROR', message: errorObj.message || '' } : null,
    success:             responseBody?.success !== false,
  };
};
