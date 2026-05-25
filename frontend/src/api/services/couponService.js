// Coupon CRM service — wraps GET /api/pos/coupons/available + POST /api/pos/coupons/validate.
//
// Auth:    X-API-Key via existing `crmAxios` request interceptor (login response `crm_token`).
// Path:    `/api` prefix supplied by REACT_APP_CRM_BASE_URL env var.
// Pattern: Mirrors `loyaltyService.js` (CR-001C-LR) for consistency.
//
// BUG-108 V1A foundation (2026-05-25).
//
// Important — V1A scope:
//   - Service module only. No UI wiring, no commit-flow payload edits.
//   - `BUG108_FLAGS.couponLive` remains the master kill switch and is read at
//     the CALLER site (CollectPaymentPanel — to be wired in V1B). This service
//     does NOT short-circuit on the flag; it is safe to expose because:
//       * `/available` and `/validate` are both read-only (no DB mutation).
//       * No caller invokes these functions yet in V1A.
//
// References:
//   - Contract Freeze:   POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md
//   - V1 Implementation: POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md (§2.2)

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';
import { toAPI, fromAPI } from '../transforms/couponTransform';

/**
 * Fetch coupons eligible for a customer + order context.
 *
 * Called on coupon-input focus (V1B wiring). Read-only — no DB side-effect.
 *
 * @param {Object} args
 * @param {string} args.customerId   - CRM customer id (mandatory; Phase 1 no guest support per G-1).
 * @param {number} args.orderTotal   - Pre-coupon, pre-loyalty bill base.
 * @param {string} [args.channel]    - CRM channel ('pos' | 'dine_in' | 'takeaway' | 'delivery'). Default 'pos'.
 * @returns {Promise<{ coupons: Array<Object>, error: ({code: string, detail: string}|null) }>}
 */
export const getAvailableCoupons = async ({ customerId, orderTotal, channel = 'pos' }) => {
  try {
    const params = toAPI.availableRequest({ customerId, orderTotal, channel });
    const response = await crmApi.get(API_ENDPOINTS.COUPONS_AVAILABLE, { params, timeout: 30000 });
    return fromAPI.availableCoupons(response.data);
  } catch (e) {
    // CRM `/available` returns 200 even when no coupons match; this catch is network-only.
    // eslint-disable-next-line no-console
    console.warn('[Coupon] getAvailableCoupons error:', e.readableMessage || e.message);
    return {
      coupons: [],
      error:   { code: 'NETWORK', detail: e.readableMessage || e.message || 'Network error' },
    };
  }
};

/**
 * Validate a specific coupon + compute discount.
 *
 * Read-only — no DB mutation. CRM returns HTTP 200 for both success and
 * validation-failure (e.g., `error.code: 'EXPIRED'`); this catch is network-only.
 *
 * @param {Object} args
 * @param {string} args.code                  - Coupon code (uppercased / trimmed by transform).
 * @param {string} args.customerId            - CRM customer id (mandatory).
 * @param {number} args.orderTotal            - Pre-coupon, pre-loyalty bill base.
 * @param {string} [args.channel]             - CRM channel. Default 'pos'.
 * @param {number} [args.loyaltyPointsUsed]   - Integer points being redeemed (for STACKING_NOT_ALLOWED check). Default 0.
 * @returns {Promise<Object>} canonical validate shape (see couponTransform.fromAPI.validateCoupon)
 */
export const validateCoupon = async ({
  code,
  customerId,
  orderTotal,
  channel = 'pos',
  loyaltyPointsUsed = 0,
  items,
}) => {
  try {
    const body = toAPI.validateRequest({
      code,
      customerId,
      orderTotal,
      channel,
      loyaltyPointsUsed,
      items,
    });
    const response = await crmApi.post(API_ENDPOINTS.COUPONS_VALIDATE, body);
    return fromAPI.validateCoupon(response.data);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Coupon] validateCoupon error:', e.readableMessage || e.message);
    return {
      valid: false,
      error: { code: 'NETWORK', detail: e.readableMessage || e.message || 'Network error' },
    };
  }
};

export default {
  getAvailableCoupons,
  validateCoupon,
};
