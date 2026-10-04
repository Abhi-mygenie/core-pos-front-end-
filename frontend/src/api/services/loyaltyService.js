// Loyalty Service — CRM redeem endpoint wrapper (CR-001C-LR contract).
// Endpoint:  POST  ${REACT_APP_CRM_BASE_URL}/pos/loyalty/redeem
// Auth:      X-API-Key (attached by crmAxios request interceptor)
// Contract:  /app/memory/change_requests/final_sprint_reconciliation/
//              POS3_0_BUG_108_LOYALTY_PHASE_C_REDEEM_API_CONTRACT_FREEZE_2026_05_23.md
//
// C-FE-1 (kill-switched): when `BUG108_FLAGS.loyaltyRedeemLive === false`,
// `redeemLoyalty` throws `LOYALTY_REDEEM_DISABLED` synchronously WITHOUT
// touching the network. This guarantees that no live redemption call can
// occur from POS while the kill switch is off — even if a caller forgets
// to gate its UI.

import crmApi from '../crmAxios';
import { API_ENDPOINTS } from '../constants';
import { BUG108_FLAGS } from '../../utils/BUG108_FLAGS';
import {
  toAPI,
  fromAPI,
  buildRedeemIdempotencyKey,
  errorCodeToCopy,
} from '../transforms/loyaltyTransform';

/**
 * Redeem loyalty points for an order.
 *
 * Inputs:
 *   customerId       - CRM customer id (string)
 *   pointsToRedeem   - positive integer
 *   orderId          - POS order id (string, non-empty)
 *   orderTotal       - bill amount before loyalty (number)
 *   idempotencyKey   - POS-generated deterministic key
 *                      (use `buildRedeemIdempotencyKey` if not pre-built)
 *
 * Returns (on HTTP 200 + success=true):
 *   { ok: true, data: <fromAPI.redeemSuccess shape> }
 *
 * Returns (on HTTP 200 + success=false, business failure):
 *   { ok: false, error: <fromAPI.redeemError shape>, copy: <user message> }
 *
 * Throws (network / HTTP 5xx / HTTP 401 / HTTP 422 / kill switch):
 *   Error with .type ∈ {
 *     'LOYALTY_REDEEM_DISABLED',   // kill switch
 *     'AUTH_FAILED',               // HTTP 401
 *     'SCHEMA_VIOLATION',          // HTTP 422
 *     'SERVER_ERROR',              // HTTP 5xx
 *     'NETWORK_ERROR',             // network / timeout / unknown
 *   }
 *   Network/5xx errors carry `.retryable = true` — caller MUST retry with
 *   the SAME `idempotencyKey` and SAME body.
 */
export const redeemLoyalty = async ({
  customerId,
  pointsToRedeem,
  orderId,
  orderTotal,
  idempotencyKey,
}) => {
  // C-FE-1 kill switch — refuse to touch the network when redemption is off.
  if (!BUG108_FLAGS.loyaltyRedeemLive) {
    const err = new Error('Loyalty redemption is not enabled in this build.');
    err.type = 'LOYALTY_REDEEM_DISABLED';
    err.retryable = false;
    throw err;
  }

  const body = toAPI.redeem({
    customerId,
    pointsToRedeem,
    orderId,
    orderTotal,
    idempotencyKey,
  });

  let response;
  try {
    response = await crmApi.post(API_ENDPOINTS.LOYALTY_REDEEM, body);
  } catch (axiosErr) {
    const status = axiosErr.response?.status;
    const typed = new Error(axiosErr.readableMessage || axiosErr.message);
    if (status === 401) {
      typed.type = 'AUTH_FAILED';
      typed.retryable = false;
    } else if (status === 422) {
      typed.type = 'SCHEMA_VIOLATION';
      typed.retryable = false;
      typed.detail = axiosErr.response?.data;
    } else if (status && status >= 500) {
      typed.type = 'SERVER_ERROR';
      typed.retryable = true;
    } else {
      typed.type = 'NETWORK_ERROR';
      typed.retryable = true;
    }
    throw typed;
  }

  const payload = response?.data || {};
  if (payload.success === true) {
    return { ok: true, data: fromAPI.redeemSuccess(payload) };
  }

  const error = fromAPI.redeemError(payload);
  return { ok: false, error, copy: errorCodeToCopy(error.code) };
};

// Re-export for callers that want to construct the key themselves.
export { buildRedeemIdempotencyKey };


// =============================================================================
// Phase C corrected (2026-05-24): Non-mutating CRM calculation endpoint.
// POST /pos/max-redeemable — returns tier-aware, cap-aware max discount.
// Safe to call from Collect Bill on every bill amount change.
// =============================================================================
import { maxRedeemableFromAPI } from '../transforms/loyaltyTransform';

export const getMaxRedeemable = async ({ posId, restaurantId, customerId, custMobile, billAmount }) => {
  const body = {
    pos_id:        posId || 'mygenie',
    restaurant_id: String(restaurantId || ''),
    bill_amount:   Number(billAmount || 0),
  };
  // Prefer customer_id; fall back to cust_mobile
  if (customerId) body.customer_id = String(customerId);
  else if (custMobile) body.cust_mobile = String(custMobile);

  try {
    const response = await crmApi.post(API_ENDPOINTS.MAX_REDEEMABLE, body);
    return maxRedeemableFromAPI(response?.data || {});
  } catch (err) {
    const status = err.response?.status;
    if (status === 401) {
      console.warn('[Loyalty] max-redeemable: auth failed (401)');
    } else if (status === 422) {
      console.warn('[Loyalty] max-redeemable: schema violation (422)', err.response?.data);
    } else {
      console.warn('[Loyalty] max-redeemable: network/server error', err.message);
    }
    // Return a safe empty result so callers don't crash
    return {
      maxPointsRedeemable: 0, maxDiscountValue: 0, ratioPerPoint: 0,
      tier: '', availablePoints: 0, minRedemptionPoints: 0, loyaltyEnabled: null,
      error: { code: 'NETWORK_ERROR', message: err.readableMessage || err.message || 'CRM unavailable' },
      success: false,
    };
  }
};
