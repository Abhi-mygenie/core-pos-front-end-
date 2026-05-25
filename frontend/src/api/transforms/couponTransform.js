// Coupon transforms — POS ↔ CRM coupon API.
// BUG-108 V1A foundation (2026-05-25).
//
// Scope:
//   V1 supports `offer_type='simple'`, `discount_scope='order'` only.
//   Item/category scope (V2) and BOGO/BXG/Every-Nth (V3) deferred.
//
// References:
//   - Contract Freeze:   POS3_0_BUG_108_COUPON_CRM_CONTRACT_FREEZE_V1_2026_05_25.md
//   - V1 Implementation: POS3_0_BUG_108_COUPON_PHASE_V1_IMPLEMENTATION_PLAN_2026_05_25.md (§2.3)
//   - Payload Mapping:   POS3_0_BUG_108_COUPON_FRONTEND_PAYLOAD_MAPPING_DISCOVERY_2026_05_25.md
//
// V1A scope (this file): pure transforms only — no UI, no commit-flow edits.

/**
 * POS internal orderType → CRM channel (strict snake_case per Owner Q1).
 * Fallback: 'pos' for unknown orderTypes (matches CRM's accepted generic channel).
 */
// BUG-108 V1B (2026-05-25, owner decision B-6): NEVER send `'pos'` channel.
// CRM `'pos'` is reserved for the future web/pos platform. All POS Frontend
// orderTypes must pin to one of dine_in / takeaway / delivery. Unknown types
// default to `'dine_in'` (safest in-premises default per owner B-6 follow-up).
const CHANNEL_MAP = {
  dineIn:      'dine_in',
  walkIn:      'dine_in',   // counter-order, in-premises consumption (Owner B-6)
  takeAway:    'takeaway',
  delivery:    'delivery',
  roomService: 'dine_in',   // in-premises consumption (room-dining) (Owner B-6)
};

export const fromAPI = {
  /**
   * GET /api/pos/coupons/available response → POS-canonical shape.
   *
   * CRM response envelope:
   *   { success: bool, data: { coupons: [...] }, message? }
   *
   * @param {Object} apiData – raw axios .data
   * @returns {{ coupons: Array<Object>, error: Object|null }}
   */
  availableCoupons: (apiData) => {
    if (!apiData || apiData.success !== true) {
      return { coupons: [], error: apiData?.data?.error || apiData?.error || null };
    }
    const list = Array.isArray(apiData.data?.coupons) ? apiData.data.coupons : [];
    const coupons = list.map((c) => ({
      id:                     c.id ?? null,
      code:                   c.code || '',
      title:                  c.title || c.code || '',
      offerType:              c.offer_type || 'simple',
      discountScope:          c.discount_scope || 'order',
      expectedDiscount:       parseFloat(c.expected_discount) || 0,
      finalAmountPreview:     parseFloat(c.final_amount_preview) || 0,
      stackableWithLoyalty:   c.stackable_with_loyalty !== false,
      requiresCartValidation: c.requires_cart_validation === true,
      // Time-window
      withinWindowNow:        c.time_window?.within_window_now !== false,
      nextWindowStart:        c.time_window?.next_window_start || null,
      timeWindowConfigured:   c.time_window?.configured === true,
      // Failure-only field; may be present on /available list items in edge cases.
      posInstruction:         c.pos_instruction || null,
    }));
    return { coupons, error: null };
  },

  /**
   * POST /api/pos/coupons/validate response → POS-canonical shape.
   *
   * CRM returns HTTP 200 for both success and validation-failure cases.
   *   Success:  { data: { valid: true, computed_discount, final_amount_preview, ... } }
   *   Failure:  { data: { valid: false, error: { code, field?, detail? }, pos_instruction?, time_window_status? } }
   *
   * @param {Object} apiData – raw axios .data
   * @returns {Object} canonical validate shape
   */
  validateCoupon: (apiData) => {
    if (apiData?.data?.valid === true) {
      const d = apiData.data;
      return {
        valid:                true,
        couponId:             d.coupon_id ?? null,
        code:                 d.code || '',
        title:                d.title || d.code || '',
        couponType:           d.coupon_type || 'order',
        discountScope:        d.discount_scope || 'order',
        computedDiscount:     parseFloat(d.computed_discount) || 0,
        finalAmountPreview:   parseFloat(d.final_amount_preview) || 0,
        stackableWithLoyalty: d.stackable_with_loyalty !== false,
        offerType:            d.offer_type || 'simple',
      };
    }
    const errData = apiData?.data || {};
    return {
      valid:            false,
      error:            errData.error || { code: 'UNKNOWN', detail: apiData?.message || 'Coupon not valid' },
      posInstruction:   errData.pos_instruction || null,
      timeWindowStatus: errData.time_window_status || null,
    };
  },
};

export const toAPI = {
  /**
   * POS orderType → CRM `channel`. Owner Q1 frozen: strict CRM snake_case.
   * Unknown / missing orderTypes fall back to generic `'pos'`.
   *
   * @param {string} orderType - 'dineIn' | 'takeAway' | 'delivery' | other
   * @returns {string} CRM channel string
   */
  channel: (orderType) => CHANNEL_MAP[orderType] || 'dine_in',

  /**
   * Build GET /api/pos/coupons/available query params.
   * Used by couponService.getAvailableCoupons.
   *
   * @returns {{ customer_id: string, order_total: number, channel: string }}
   */
  availableRequest: ({ customerId, orderTotal, channel }) => ({
    customer_id: String(customerId ?? ''),
    order_total: parseFloat(orderTotal) || 0,
    channel:     channel || 'pos',
  }),

  /**
   * Build POST /api/pos/coupons/validate request body.
   *
   * V1 sends `items: null` because Phase V1 supports only `discount_scope='order'`
   * coupons (no item-level matching). V2 will replace this with `items.map(posCartItem)`.
   *
   * @returns {Object} CRM request body
   */
  validateRequest: ({ code, customerId, orderTotal, channel, loyaltyPointsUsed }) => ({
    code:                String(code || '').trim().toUpperCase(),
    customer_id:         String(customerId ?? ''),
    order_total:         parseFloat(orderTotal) || 0,
    channel:             channel || 'pos',
    loyalty_points_used: parseInt(loyaltyPointsUsed, 10) || 0,
    items:               null,                          // V1: null. V2: build via toAPI.posCartItem.
    order_time:          new Date().toISOString(),      // informational only — CRM uses server clock.
  }),

  /**
   * POSCartItem mapper — POS cart line → CRM POSCartItem schema.
   *
   * V1 STUB: returns null. CRM contract supports `items: null` for V1 simple/order
   * coupons (no cart-level eligibility match required).
   *
   * V2 will implement the full transform: { food_id, item_id, name, quantity, unit_price, category_name }.
   *
   * @param {Object} _cartLine - POS cart line (CollectPaymentPanel cartItems entry)
   * @returns {null} V1 stub
   */
  posCartItem: (_cartLine) => null,
};
