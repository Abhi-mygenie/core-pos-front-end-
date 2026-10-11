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
      // V2 (2026-05-25): eligible item/category hint for POS-side cart filtering.
      eligibleMatchHint:      c.eligible_match_hint || null,
      // V3-B/V3-C (2026-05-25): BOGO/BXG/Nth offer metadata for dropdown display + cart filtering.
      buyQuantity:            c.buy_quantity ?? null,
      getQuantity:            c.get_quantity ?? null,
      getDiscountType:        c.get_discount_type || null,
      getDiscountValue:       c.get_discount_value ?? null,
      maxApplications:        c.max_applications ?? null,
      allowRepeat:            c.allow_repeat ?? null,
      sameItemRequired:       c.same_item_required ?? null,
      nthItemNumber:          c.nth_item_number ?? null,
      nthDiscountType:        c.nth_discount_type || null,
      nthDiscountValue:       c.nth_discount_value ?? null,
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
        // V3-B/V3-C (2026-05-25): benefit items, application count, match summaries.
        benefitItems:           d.benefit_items || [],
        appliedApplications:    d.applied_applications ?? null,
        buyMatchSummary:        d.buy_match_summary || [],
        getMatchSummary:        d.get_match_summary || [],
        eligibleMatchSummary:   d.eligible_match_summary || [],
        nthItemNumber:          d.nth_item_number ?? null,
        nthDiscountType:        d.nth_discount_type || null,
        nthDiscountValue:       d.nth_discount_value ?? null,
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
  validateRequest: ({ code, customerId, orderTotal, channel, loyaltyPointsUsed, items }) => ({
    code:                String(code || '').trim().toUpperCase(),
    customer_id:         String(customerId ?? ''),
    order_total:         parseFloat(orderTotal) || 0,
    channel:             channel || 'pos',
    loyalty_points_used: parseInt(loyaltyPointsUsed, 10) || 0,
    items:               items || null,                 // V1: null. V2: built via toAPI.posCartItem.
    order_time:          new Date().toISOString(),      // informational only — CRM uses server clock.
  }),

  /**
   * POSCartItem mapper — POS cart line → CRM POSCartItem schema.
   * V2 (2026-05-25): real implementation. Maps fresh cart items (Flow 3) and
   * hydrated order items (Flow 4) to the CRM validate/commit schema.
   *
   * @param {Object} item - Cart item (has foodId/id, name, qty, price/unitPrice, categoryId)
   * @param {Function} [getCategoryById] - MenuContext category resolver (categoryId → { categoryName })
   * @returns {Object} CRM POSCartItem
   */
  posCartItem: (item, getCategoryById) => ({
    food_id:       String(item.foodId || item.id || ''),
    item_id:       String(item.id || item.foodId || ''),
    name:          item.name || '',
    quantity:      item.qty || 1,
    unit_price:    parseFloat(item.unitPrice || item.price) || 0,
    line_total:    (parseFloat(item.unitPrice || item.price) || 0) * (item.qty || 1),
    category_name: getCategoryById?.(item.categoryId)?.categoryName || '',
  }),
};
