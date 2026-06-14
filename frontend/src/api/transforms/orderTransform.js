// Order Transform - Maps raw API order data to canonical frontend schema

import { F_ORDER_STATUS, ORDER_TO_TABLE_STATUS, ORDER_TYPES } from '../constants';
import { selectAgentsForKot, cartStationsToSet } from './printerAgentSelector';
// BUG-108 P1 (May-2026): Feature flags + payload-safety guard. When a flag is
// `false`, the corresponding fields are emitted as 0/'' so no mock value can
// reach PLACE_ORDER / BILL_PAYMENT / print payloads. See
// `POS3_0_BUG_108_P1_BUG_099_HOTSPOT_CHECK_AND_CR_PLAYBOOK_HANDOFF_2026_05_22.md`.
import { BUG108_FLAGS } from '../../utils/BUG108_FLAGS';

/**
 * Compute elapsed time string from a date
 * @param {string} dateStr - ISO/SQL date string
 * @returns {string} - e.g. "45 min", "2 hrs", "1 day"
 */
const computeElapsedTime = (dateStr) => {
  if (!dateStr) return '';
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now - created;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} mins`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hrs`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays} days`;
};

/**
 * Map f_order_status number to frontend status key
 */
const mapOrderStatus = (fOrderStatus) => {
  return F_ORDER_STATUS[fOrderStatus] || 'unknown';
};

/**
 * POS2-002 Phase 1 (May-2026): normalise backend `order_from` into a stable
 * FE token. Mirrors the audit-side mapping at `reportService.js:746-762`
 * (CR-001 CS-15) so the audit-report and live-order pipelines agree on the
 * canonical value.
 *
 * Owner-confirmed values today: `'pos'` | `'web'` (BE-OF1/2/3 closed
 * 2026-05-09 — backend echoes `order_from` on `single-order-new`,
 * `employee-orders-list`, and the four socket flows that pass through
 * `fetchSingleOrderForSocket`).
 *
 * Anything else (future BE additions like `'aggregator'`, `'kiosk'`) is
 * preserved verbatim (lowercased, trimmed) so the FE doesn't silently drop
 * unexpected values. `null` / empty / non-string → `null`.
 */
const normaliseOrderFrom = (raw) => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
};

/**
 * Map f_order_status to table card status
 */
const mapTableStatus = (fOrderStatus) => {
  const statusKey = mapOrderStatus(fOrderStatus);
  return ORDER_TO_TABLE_STATUS[statusKey] || 'occupied';
};

/**
 * Normalize order_type to a consistent frontend value
 */
const normalizeOrderType = (orderType) => {
  switch (orderType) {
    case ORDER_TYPES.POS:
    case ORDER_TYPES.DINE_IN:
    case ORDER_TYPES.WALK_IN:
    case 'dinein':  // Direct match from API
      return 'dineIn';
    case ORDER_TYPES.TAKE_AWAY:
    case 'takeaway':  // Direct match from API
    case 'take_away': // OLD_POS_NORMALIZE (Task 3, Apr-2026): old POS emits this variant
      return 'takeAway';
    case ORDER_TYPES.DELIVERY:
    case 'delivery':  // Direct match from API
      return 'delivery';
    default:
      return 'dineIn';
  }
};

/**
 * Map frontend orderType to API order_type value
 */
const mapOrderTypeToAPI = (orderType) => {
  switch (orderType) {
    case 'takeAway':
      return 'takeaway';
    case 'delivery':
      return 'delivery';
    case 'dineIn':
    default:
      return 'dinein';
  }
};

// =============================================================================
// FROM API transforms
// =============================================================================
export const fromAPI = {
  /**
   * Transform a single order item (orderDetail)
   */
  orderItem: (detail) => {
    const foodDetails = detail.food_details || {};
    return {
      id: detail.id,
      foodId: foodDetails.id || null,       // food catalog ID — needed for full cancel item_id
      categoryId: foodDetails.category_id || null, // BUG-108 V2 (2026-05-25): category ID for item/category coupon matching
      name: foodDetails.name || 'Unknown Item',
      // Tax from food_details — used for billing calculations
      tax: {
        percentage: parseFloat(foodDetails.tax) || 0,
        type: foodDetails.tax_type || 'GST',
        calculation: foodDetails.tax_calc || 'Exclusive',
        isInclusive: foodDetails.tax_calc === 'Inclusive',
      },
      qty: detail.quantity || 1,
      // Use unit_price (per-unit) as canonical price — detail.price from socket
      // contains total (unit_price × quantity), which causes double-multiplication
      // in display calculations that do price × qty
      price: parseFloat(detail.unit_price) || parseFloat(detail.price) || 0,
      unitPrice: parseFloat(detail.unit_price) || parseFloat(detail.price) || 0,
      status: mapOrderStatus(detail.food_status),
      station: detail.station || 'KDS',
      itemType: detail.item_type || null,  // Phase 1: BAR, KDS, etc.
      variation: Array.isArray(detail.variation) ? detail.variation : [],
      addOns: detail.add_ons || [],
      notes: detail.food_level_notes || '',
      readyAt: detail.ready_at,
      serveAt: detail.serve_at,
      cancelAt: detail.cancel_at,
      createdAt: detail.created_at,
      // BUG-018 Part 1 (Apr-2026): propagate catalog-complimentary flags from
      // backend-echoed food_details so re-engaged / reloaded cart items carry the
      // same flags that freshly-added items get from adaptProduct. Without this,
      // Step 1's conditional in buildCartItem / collectBillExisting falls dormant
      // on any order opened from the dashboard (vs placed within the current session).
      isComplementary: (foodDetails.complementary || '').toLowerCase() === 'yes',
      complementaryPrice: parseFloat(foodDetails.complementary_price) || 0,
      // BUG-018 Part 2 (Apr-2026): runtime-marked complimentary flag, echoed back
      // by backend on the order-detail record itself (not on the catalog record).
      // Enables runtime-marked state to survive reload / socket re-engage. Defaults
      // to false when backend omits the field — backward-compatible.
      isComplementaryRuntime: (detail.is_complementary || '').toLowerCase() === 'yes',
      // CR-010: Weight-based billing — rehydrate from backend echo (filter out "0" / invalid values)
      itemUnit: ['Kg','gm','L','ml'].includes(detail.item_unit || detail.food_details?.item_unit) ? (detail.item_unit || detail.food_details?.item_unit) : null,
      itemUnitPrice: parseFloat(detail.item_unit_price || detail.food_details?.item_unit_price) || 0,
      isWeightItem: ['Kg','gm','L','ml'].includes(detail.item_unit || detail.food_details?.item_unit),
      // CR-028: Discount eligibility — rehydrate from food_details (give_discount: "Yes"/"No")
      giveDiscount: (foodDetails.give_discount || 'Yes') !== 'No',
    };
  },

  /**
   * Transform a single order
   */
  order: (api) => {
    const table = api.restaurantTable || {};
    const employee = api.vendorEmployee || {};
    const user = api.user || {};
    const isRoom = table.rtype === 'RM' || api.order_in === 'RM';
    const isWalkIn = !api.table_id || api.table_id === 0;
    const orderType = normalizeOrderType(api.order_type);

    // Build customer display name
    let customer = api.user_name || '';
    if (!customer && user.f_name) {
      customer = [user.f_name, user.l_name].filter(Boolean).join(' ');
    }
    
    // Default customer label based on order type (only if no actual customer name)
    let customerLabel = customer;
    if (!customer) {
      switch (orderType) {
        case 'takeAway':
          customerLabel = 'TA';
          break;
        case 'delivery':
          customerLabel = 'Del';
          break;
        default:
          customerLabel = isWalkIn ? 'Walk-In' : '';
      }
    }

    return {
      orderId: api.id,
      orderNumber: api.restaurant_order_id || '',
      orderType,
      rawOrderType: api.order_type,
      orderIn: api.order_in,
      status: mapOrderStatus(api.f_order_status),
      fOrderStatus: api.f_order_status,
      tableStatus: mapTableStatus(api.f_order_status),
      lifecycle: api.order_status || 'queue',
      
      // Table info
      tableId: api.table_id || 0,
      tableNumber: table.table_no || '',
      tableSectionName: table.title || '',
      isWalkIn,
      isRoom,

      // Customer
      customer: customerLabel,
      customerName: customer,
      phone: user.phone || '',

      // Financials (Phase 1: Enhanced with new API fields)
      // No fallback — if socket doesn't send subtotal, keep as 0 (GET single order will fill it)
      amount: parseFloat(api.order_amount) || 0,
      subtotalBeforeTax: parseFloat(api.order_sub_total_without_tax) || 0,
      subtotalAmount: parseFloat(api.order_sub_total_amount) || 0,
      serviceTax: parseFloat(api.total_service_tax_amount) || 0,
      tipAmount: parseFloat(api.tip_amount) || 0,
      tipTaxAmount: parseFloat(api.tip_tax_amount) || 0,
      // BUG-050 (Wave 4, May-2026): expose backend-stored order-level discount
      // so the dashboard re-print default branch of buildBillPrintPayload can
      // cascade it (mirroring how tipAmount + deliveryCharge already cascade).
      // Source field mirrors reportTransform.js (`restaurant_discount_amount`
      // with `discount_value` as legacy fallback). Missing field → 0 (no
      // regression vs current behavior).
      discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0) || 0,
      paymentStatus: api.payment_status || 'unpaid',
      paymentType: api.payment_type || '',
      paymentMethod: api.payment_method || api.payment_mode || '',

      // POS2-002 Phase 1 (May-2026): origin axis for downstream phases —
      //   • Phase 2 web-delivery-lock predicate (CollectPaymentPanel.jsx)
      //   • Phase 3 dashboard web-order filter (Header / OrderCard)
      //   • Phase 4 Scan & Order auto-pop-out predicate
      // Owner-confirmed values: `'pos'` | `'web'`. Missing → `null`
      // (preserved per audit-side parity at `reportService.js:746-762`).
      // `isWebOrder` is a derived boolean sugar accessor — saves every
      // consumer from re-comparing the string for the most common gate.
      orderFrom: normaliseOrderFrom(api.order_from),
      isWebOrder: normaliseOrderFrom(api.order_from) === 'web',

      // Timing
      time: computeElapsedTime(api.created_at),
      createdAt: api.created_at,
      updatedAt: api.updated_at,

      // Computed order-level timestamps from items (for timeline)
      readyAt: (() => {
        const items = api.orderDetails || [];
        const readyTimes = items.map(d => d.ready_at).filter(Boolean);
        return readyTimes.length > 0 ? readyTimes.sort()[0] : null; // First item ready
      })(),
      servedAt: (() => {
        const items = api.orderDetails || [];
        const serveTimes = items.map(d => d.serve_at).filter(Boolean);
        return serveTimes.length > 0 ? serveTimes.sort().pop() : null; // Last item served
      })(),

      // Staff
      punchedBy: employee.f_name || '',
      waiter: employee.f_name || '',

      // Source (own, swiggy, zomato, etc.)
      source: (api.order_in || 'own').toLowerCase(),

      // Items — keep backend "Check In" system marker in the cart (required for
      // Update-Order vs Place-Order branching on checked-in rooms). Consumers MUST
      // filter `!isCheckInMarker` before rendering or running bill math. The
      // marker is neutralised to price 0 / tax 0 so any accidental consumer that
      // sums it remains arithmetically inert. See
      // /app/memory/ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md.
      items: (api.orderDetails || []).map((d) => {
        const isCheckIn = (d.food_details?.name || '').toLowerCase() === 'check in';
        const mapped = fromAPI.orderItem(d);
        if (!isCheckIn) return mapped;
        return {
          ...mapped,
          isCheckInMarker: true,
          price: 0,
          unitPrice: 0,
          tax: { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false },
        };
      }),

      // Notes
      orderNote: api.order_note || '',

      // Print status
      kotPrinted: api.print_kot === 'Yes',
      billPrinted: api.print_bill_status === 'Yes',

      // Delivery (basic — detailed mapping deferred)
      deliveryAddress: api.delivery_address || null,
      deliveryCharge: parseFloat(api.delivery_charge) || 0,

      // CR-018: Schedule Order (Jun-2026). Parse scheduling fields from backend.
      // `scheduled` is 0/1 integer from backend — coerce to boolean.
      // `schedule_at` is "YYYY-MM-DD HH:mm:ss" string or null.
      scheduled: api.scheduled === 1 || api.scheduled === '1' || !!api.schedule_at,
      scheduleAt: api.schedule_at || null,

      // Delivery rider (BUG-097: normalized from backend delivery_man object)
      // Backend fields: delivery_man (object|null), delivery_man_id, delivery_man_status ("Yes"/"No"), order_dispatch_status ("Yes"/"No")
      deliveryMan: api.delivery_man || null,
      deliveryManId: api.delivery_man_id || null,
      deliveryManStatus: api.delivery_man_status || 'No',
      orderDispatchStatus: api.order_dispatch_status || 'No',
      rider: api.delivery_man
        ? [api.delivery_man.f_name, api.delivery_man.l_name].filter(Boolean).join(' ') || null
        : null,
      riderPhone: api.delivery_man?.phone || null,
      // Computed rider status — priority: rider state first, dispatch state only when no rider
      // Rule 1: delivery_man_id exists + accepted (rider picked up) → dispatched
      // Rule 2: delivery_man_id exists + pending  → riderAssigned
      // Rule 3: no delivery_man_id + dispatched   → dispatched
      // Rule 4: no delivery_man_id + not dispatched → null (awaiting action)
      // NOTE (2026-05-21): rider-pickup and manual-dispatch collapse into a single
      //   'dispatched' value — both mean "order has left the restaurant, en route
      //   to customer". The earlier value 'riderReached' was a misnomer and has
      //   been retired in this patch.
      riderStatus: (() => {
        if (api.delivery_man_id && api.delivery_man_status === 'Yes') return 'dispatched';
        if (api.delivery_man_id && api.delivery_man_status === 'No') return 'riderAssigned';
        if (!api.delivery_man_id && api.order_dispatch_status === 'Yes') return 'dispatched';
        return null;
      })(),

      // Associated orders — table orders transferred to this room (Phase 2B)
      // REQ3 (Apr-2026): preserve the full raw API item under `_raw` so that
      // buildBillPrintPayload can emit the backend-expected `associated_orders[]`
      // schema (id, room_id, restaurant_id, user_id, order_id, restaurant_order_id,
      // order_amount, order_status, created_at, updated_at). Existing camelCase
      // fields (orderId/orderNumber/amount/transferredAt) are kept unchanged so
      // existing consumers (CartPanel, CollectPaymentPanel, DashboardPage) are
      // not affected.
      associatedOrders: (() => {
        const raw = api.associated_order_list || [];
        const seen = new Set();
        return raw.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).map(item => ({
          orderId: item.id,
          orderNumber: item.restaurant_order_id || '',
          amount: parseFloat(item.order_amount) || 0,
          transferredAt: item.collect_Bill || '',
          _raw: item,
        }));
      })(),

      // ROOM_CHECKIN_GAP3 (Stage 1): expose room-booking financials so the
      // Checkout screen can render a Room section and roll the outstanding
      // balance into the grand total. Backend delivers `room_info` on both
      // running-orders and socket frames. Strings are coerced to numbers;
      // missing field collapses to null so non-room orders are unaffected.
      // Per architecture: room balance has NO SC, NO GST, NO discount applied
      // — it is a pass-through ₹ amount added to grand_total via the
      // collect-bill payload `grand_total` field. Marker remains an exception.
      // See /app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md.
      //
      // CR-004 (Phase 4.1) ADDITIVE EXTENSION:
      // Surface check-in metadata so the new Room Orders Report (`/reports/rooms`)
      // can render the check-in datetime + guest name without round-tripping a
      // separate endpoint. All fields are pass-through; pre-existing consumers
      // (Checkout, Room section, audit-report drill-down) are unaffected because
      // they read only `roomPrice` / `advancePayment` / `balancePayment`.
      //   - `checkInDate`  : raw "YYYY-MM-DD HH:MM:SS" string from `room_info.checkin_date`
      //   - `checkOutDate` : raw "YYYY-MM-DD HH:MM:SS" string from `room_info.checkout_date`
      //                      (carried through for Phase 2; ignored in Phase 1 UI)
      //   - `bookingType`  : e.g. "WalkIn" — used as a guest-name fallback when
      //                      neither `name3` nor RM-parent's `user_name` is present
      //   - `guestName`    : resolved guest name with priority:
      //                        room_info.name3
      //                        → api.user_name (RM-parent top-level)
      //                        → "Walk-in" derived from booking_type
      //                        → null (consumer renders "Guest" fallback)
      //                      A central resolution here keeps every report consumer
      //                      aligned and avoids re-deriving the priority N times.
      roomInfo: api.room_info ? {
        roomPrice:      parseFloat(api.room_info.room_price)      || 0,
        advancePayment: parseFloat(api.room_info.advance_payment) || 0,
        balancePayment: parseFloat(api.room_info.balance_payment) || 0,
        // BE-2 §4.1 derived math (wired 2026-05-01) — backend ships these
        // alongside the original 3 fields. `receiveBalance` is the cash
        // collected at checkout (vs `advancePayment` collected at check-in).
        // `paymentStatus` ('paid' | null) flags whether the lodging side is
        // settled — once 'paid', `balancePayment` becomes stale and must be
        // ignored (per CR-004 Rule 2). `roomNo` carries the actual room
        // label (e.g. "109") for richer reporting.
        receiveBalance:     parseFloat(api.room_info.receive_balance) || 0,
        paymentStatus:      api.room_info.payment_status || null,
        balancePaymentMode: api.room_info.balance_payment_mode || null,
        roomNo:             api.room_info.room_no || null,
        // BE-2 §4.1 (still pending backend) — keep null fallbacks until BE
        // ships explicit discount fields. Until then, `discount` is derived
        // in RoomRowCard.numbers as (room_price - lodging_collected) on
        // settled rooms.
        discountAmount:     parseFloat(api.room_info.discount_amount) || 0,
        discountReason:     api.room_info.discount_reason || null,
        checkInDate:    api.room_info.checkin_date  || null,
        checkOutDate:   api.room_info.checkout_date || null,
        bookingType:    api.room_info.booking_details?.booking_type || api.room_info.booking_type || null,
        guestName: (() => {
          const name3 = (api.room_info.name3 || '').trim();
          if (name3) return name3;
          const top = (api.user_name || '').trim();
          if (top) return top;
          const bt = (api.room_info.booking_details?.booking_type || api.room_info.booking_type || '').trim();
          if (bt.toLowerCase() === 'walkin' || bt.toLowerCase() === 'walk-in') return 'Walk-in';
          if (bt) return bt;
          return null;
        })(),
      } : null,

      // Raw orderDetails preserved for bill printing (order-temp-store API)
      rawOrderDetails: api.orderDetails || [],
    };
  },

  /**
   * Transform order list (includes all orders - tables and rooms)
   * @param {Array} apiOrders - Raw API orders
   * @returns {Array} - All orders with isRoom flag
   */
  orderList: (apiOrders) => {
    if (!Array.isArray(apiOrders)) return [];
    return apiOrders.map(fromAPI.order);
  },
};


// =============================================================================
// SHARED HELPERS: Cart Item Builder & Order Totals Calculator
// Used by placeOrder, updateOrder, placeOrderWithPayment
// =============================================================================

/**
 * FO-B1-01 (May-2026): Sum prices across selectedVariants regardless of shape.
 *
 * Each entry in selectedVariants[groupId] is either:
 *   - a single option object       (single-select group): { price, ... }
 *   - an array of option objects   (multi-select group):  [{ price, ... }, ...]
 * Plus defensive cases:            null / undefined / empty array / malformed object.
 *
 * Returns 0 for any null/undefined/empty/malformed input.
 *
 * Mirrors the shape-aware logic already in:
 *   - ItemCustomizationModal.jsx:100-105 (modal preview)
 *   - this file's buildCartItem at L390-403 (outbound variation_amount)
 *
 * Display-only consumer: OrderEntry.jsx qty +/- recompute (cart-line totalPrice).
 * Outbound payload paths must continue to use buildCartItem's own calc — DO NOT
 * route them through this helper; payload contract is already correct.
 *
 * @param {Object|null|undefined} selectedVariants - { [groupId]: option | option[] }
 * @returns {number} sum of option.price across all groups; 0 if no input
 */
export const calculateSelectedVariantsPrice = (selectedVariants) => {
  if (!selectedVariants || typeof selectedVariants !== 'object') return 0;
  return Object.values(selectedVariants).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) {
      return sum + sel.reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0);
    }
    return sum + (parseFloat(sel?.price) || 0);
  }, 0);
};

// ==========================================================================
// CR-028: Per-item discount distribution (largest-remainder)
// ==========================================================================

/**
 * Distribute a total ₹ discount across items proportional to their line totals.
 * Uses largest-remainder rounding to ensure Σ per-item = total (±0.00).
 * Items with giveDiscount===false, complimentary, or cancelled are excluded.
 *
 * CR-028 Phase 3B: When couponInfo indicates item/category scope, the coupon
 * portion is targeted to CRM benefit_items; remainder (loyalty/wallet) is
 * distributed proportionally.
 *
 * @param {Object[]} builtItems  - Items from buildCartItem / food_detail builder
 * @param {Object[]} sourceItems - Original cart items (giveDiscount, isComplementary, etc.)
 * @param {number}   totalDiscount - Total ₹ discount to distribute
 * @param {Object}   [couponInfo]  - { couponDiscount, couponType, benefitItems }
 * @returns {number[]} Per-item discount amounts (same length as builtItems)
 */
function distributeItemDiscounts(builtItems, sourceItems, totalDiscount, couponInfo = null) {
  if (totalDiscount <= 0 || builtItems.length === 0) return builtItems.map(() => 0);

  // Compute fullLineTotal and discountable flag per item
  const lines = builtItems.map((item, i) => {
    const src = sourceItems[i] || {};
    const fullLine = (parseFloat(item.food_amount) || 0)
      + (parseFloat(item.variation_amount) || 0)
      + (parseFloat(item.addon_amount) || 0);
    const isDiscountable = src.giveDiscount !== false
      && !src.isComplementary && !src.isComplementaryRuntime
      && src.status !== 'cancelled';
    return { fullLine, isDiscountable, foodId: String(src.foodId || src.id || item.food_id || '') };
  });

  const discountableTotal = lines.reduce((s, l) => s + (l.isDiscountable ? l.fullLine : 0), 0);
  if (discountableTotal <= 0) return builtItems.map(() => 0);

  // CR-028 Phase 3B: item/category coupon — targeted distribution
  const couponDisc = parseFloat(couponInfo?.couponDiscount || 0);
  const couponType = couponInfo?.couponType || '';
  const benefitItems = couponInfo?.benefitItems || [];
  const isCouponTargeted = couponDisc > 0 && benefitItems.length > 0
    && (couponType === 'item' || couponType === 'category');

  if (isCouponTargeted) {
    // Map CRM benefit_items to cart items by food_id
    const benefitMap = new Map();
    benefitItems.forEach(bi => {
      const fid = String(bi.food_id || bi.id || '');
      if (fid) benefitMap.set(fid, parseFloat(bi.discount_amount || bi.amount || bi.discount || 0));
    });

    // Targeted coupon amounts
    const couponAmounts = lines.map(l => {
      if (!l.isDiscountable || !benefitMap.has(l.foodId)) return 0;
      return Math.min(benefitMap.get(l.foodId), l.fullLine); // cap at line total
    });

    // Remaining discount (loyalty + wallet) distributed proportionally
    const remainingDiscount = Math.max(0, totalDiscount - couponDisc);
    if (remainingDiscount > 0) {
      const proportional = _distributeProportional(lines, remainingDiscount, discountableTotal);
      return couponAmounts.map((ca, i) => {
        const combined = Math.round((ca + proportional[i]) * 100) / 100;
        return Math.min(combined, lines[i].fullLine);
      });
    }
    return couponAmounts;
  }

  // Default: proportional distribution (manual/preset/order-scope coupon)
  return _distributeProportional(lines, Math.min(totalDiscount, discountableTotal), discountableTotal);
}

/**
 * Largest-remainder proportional distribution (internal helper).
 */
function _distributeProportional(lines, cappedDiscount, discountableTotal) {
  if (cappedDiscount <= 0 || discountableTotal <= 0) return lines.map(() => 0);

  const rawShares = lines.map(l =>
    (l.isDiscountable && l.fullLine > 0) ? (l.fullLine / discountableTotal) * cappedDiscount : 0
  );

  const floored = rawShares.map(s => Math.floor(s * 100) / 100);
  const flooredSum = Math.round(floored.reduce((a, b) => a + b, 0) * 100);
  const target = Math.round(cappedDiscount * 100);
  let diff = target - flooredSum;

  if (diff > 0) {
    const remainders = rawShares
      .map((s, i) => ({ idx: i, rem: (s * 100) - Math.floor(s * 100) }))
      .filter(r => r.rem > 0)
      .sort((a, b) => b.rem - a.rem);
    for (let k = 0; k < diff && k < remainders.length; k++) {
      floored[remainders[k].idx] = Math.round((floored[remainders[k].idx] + 0.01) * 100) / 100;
    }
  }

  return floored.map((d, i) => Math.min(Math.round(d * 100) / 100, lines[i].fullLine));
}

/**
 * Build a single cart item for the API payload
 * Maps frontend cart item → backend cart[] item shape
 * @param {Object} item - Frontend cart item (from addToCart or addCustomizedItemToCart)
 * @returns {Object} - API cart item
 */
const buildCartItem = (item) => {
  // Addon IDs and quantities — flat arrays
  const addons = item.selectedAddons || item.addOns || [];
  const addonIds = addons.map(a => a.id).filter(Boolean);
  const addonQtys = addons.map(a => a.quantity || a.qty || 1);

  // Addon total price
  const addonAmount = addons.reduce((sum, a) => {
    return sum + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1));
  }, 0);

  // Variation data — group-level structure: {name: "GroupName", values: {label: ["Option1"]}}
  // Backend expects variations grouped by variant group with selected option labels
  const variantGroups = item.variantGroups || [];
  let variations = [];
  let variationAmount = 0;

  if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
    // CR-006 Phase B / Bucket B1 (May-2026): selectedVariants[groupId] can be
    // either a single option object (single-select group) or an array of
    // option objects (multi-select group). Normalise to array, then iterate
    // each option uniformly. Empty arrays are skipped so multi groups with
    // zero selections never appear in the outbound payload.
    // Backend contract: [{name, values: {label: [...]}}] — array shape was
    // confirmed via preprod DevTools trace on 2026-05-02.
    const groupMap = {};
    Object.entries(item.selectedVariants)
      .filter(([, sel]) => sel)
      .forEach(([groupId, sel]) => {
        const optionList = Array.isArray(sel) ? sel : [sel];
        if (optionList.length === 0) return;
        // Look up group name from variantGroups
        const group = variantGroups.find(g => String(g.id) === String(groupId));
        const groupName = group?.name || optionList[0]?.groupName || `Variant`;
        if (!groupMap[groupName]) groupMap[groupName] = [];
        optionList.forEach(option => {
          variationAmount += parseFloat(option?.price) || 0;
          if (option?.name) groupMap[groupName].push(option.name);
        });
      });
    // Convert to API format: [{name, values: {label: [...]}}]
    variations = Object.entries(groupMap)
      .filter(([, labels]) => labels.length > 0)
      .map(([name, labels]) => ({
        name,
        values: { label: labels },
      }));
  } else if (item.variation?.length > 0) {
    // BUG-VARIATION-RESHAPE (Apr-2026): placed items hydrated from the socket /
    // running-orders response carry `variation` in the BACKEND RESPONSE shape:
    //   [{name, type, min, max, required, values: [{label, optionPrice}, ...]}]
    // The place-order / update-place-order endpoints expect the REQUEST shape:
    //   [{name, values: {label: [...]}}]
    // When user increments qty on a placed customised item, OrderEntry creates
    // an unplaced delta cart item by spreading the placed item, so
    // `item.variation` arrives here in RESPONSE shape. Without normalisation,
    // the payload triggers PHP "Undefined array key 'label'".
    // Accept either shape on input; always emit the REQUEST shape.
    variations = item.variation.map(v => {
      // Already in REQUEST shape — pass through (defensive).
      if (v?.values && !Array.isArray(v.values) && Array.isArray(v.values.label)) {
        return { name: v.name, values: { label: v.values.label } };
      }
      // RESPONSE shape — extract option labels into the label-array.
      if (Array.isArray(v?.values)) {
        return {
          name: v.name,
          values: { label: v.values.map(opt => opt?.label).filter(Boolean) },
        };
      }
      // Defensive fallback for any other shape.
      return { name: v?.name || 'Variant', values: { label: [] } };
    });
    // variation_amount math below already handles BOTH shapes — unchanged.
    variationAmount = item.variation.reduce((sum, v) => {
      // Try direct price (legacy)
      if (v.price) return sum + (parseFloat(v.price) || 0);
      // Parse nested values array: values[].optionPrice
      const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
      return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
    }, 0);
  }

  // Per-item financials
  // CR-010: Weight items use itemUnitPrice as billing rate; no addons/variations (D13)
  const isWeight = ['Kg','gm','L','ml'].includes(item.itemUnit);
  const basePrice = isWeight ? (item.itemUnitPrice || item.price || 0) : (item.price || 0);
  const foodAmount = basePrice * (item.qty || 1);
  const fullUnitPrice = isWeight ? basePrice : (basePrice + addonAmount + variationAmount);

  // Tax calculation
  const taxPct = parseFloat(item.tax?.percentage) || 0;
  const taxType = (item.tax?.type || 'GST').toUpperCase();
  const taxCalc = item.tax?.calculation || 'Exclusive';
  const isInclusive = taxCalc === 'Inclusive';
  const lineTotal = fullUnitPrice * (item.qty || 1);
  let taxAmount = 0;
  if (taxPct > 0) {
    taxAmount = isInclusive
      ? lineTotal - (lineTotal / (1 + taxPct / 100))
      : lineTotal * (taxPct / 100);
  }
  const isGst = taxType === 'GST';

  // BUG-018 Part 2 (Apr-2026): runtime-marked complimentary lines carve out all
  // billable amounts and flip the flag. Catalog-complimentary Step 1 path is
  // preserved in the else branch below.
  const isRuntimeComp = item.isComplementaryRuntime === true;

  return {
    food_id:             item.foodId || item.id,
    quantity:            item.qty || 1,          // CR-010: decimal for weight items
    price:               basePrice,              // CR-010: item_unit_price for weight items
    variant:             '',
    add_on_ids:          addonIds,
    add_on_qtys:         addonQtys,
    variations:          variations,
    add_ons:             [],
    station:             item.station ? item.station.toUpperCase() : null,  // null if no station (no KOT)
    food_amount:         isRuntimeComp ? 0 : foodAmount,
    variation_amount:    isRuntimeComp ? 0 : variationAmount,
    addon_amount:        isRuntimeComp ? 0 : addonAmount,
    gst_amount:          isRuntimeComp ? '0.00' : String((isGst ? taxAmount : 0).toFixed(2)),
    vat_amount:          isRuntimeComp ? '0.00' : String((!isGst ? taxAmount : 0).toFixed(2)),
    discount_amount:     '0.00',
    // CR-010: Weight-based billing fields (only for weight items)
    ...(isWeight ? {
      item_unit:         item.itemUnit,
      item_unit_price:   String(item.itemUnitPrice || ''),
    } : {}),
    // BUG-018 Part 1 (Apr-2026) — catalog-complimentary: actual price in
    // complementary_price, is_complementary stays "No".
    // BUG-018 Part 2 (Apr-2026) — runtime-marked: is_complementary = "Yes",
    // complementary_price = actual line unit price (fullUnitPrice = base + variant + addon).
    complementary_price: isRuntimeComp
      ? fullUnitPrice
      : (item.isComplementary
          ? (parseFloat(item.complementaryPrice) || parseFloat(item.price) || 0)
          : 0.0),
    is_complementary:    isRuntimeComp ? 'Yes' : 'No',
    food_level_notes:    Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : (item.notes || ''),
    _fullUnitPrice:      fullUnitPrice,
  };
};

/**
 * Calculate order-level financial totals from built cart items
 * @param {Array} cart - Array of items returned by buildCartItem
 * @param {number} serviceChargePercentage - Service charge rate (e.g. 10 for 10%)
 * @param {Object} extras - BUG-006 (AD-101) + CR-013 (May-2026): discount / tax-rate inputs
 *   @param {number} extras.discountAmount        - Total discount applied at collect-bill
 *   @param {number} extras.tipAmount             - Tip (flat ₹) — taxable per CR-013 (rides SC rate)
 *   @param {number} extras.deliveryCharge        - Delivery charge — taxable per CR-013 (`deliver_charge_gst`)
 *   @param {number} extras.serviceChargeTaxPct   - CR-013: GST % for SC + Tip (`service_charge_tax`)
 *   @param {number} extras.deliveryChargeGstPct  - CR-013: GST % for Delivery (`deliver_charge_gst`)
 *
 * CR-013 frozen rule (§1 row 10): missing / null / blank / non-numeric / negative
 * pcts default to 0 (force-0 fallback). Owner directive 2026-05-05: charging 0%
 * GST on unconfigured components is the desired, compliant default.
 *
 * @returns {Object} - Financial totals for the order payload
 */
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const {
    discountAmount = 0,
    tipAmount = 0,
    deliveryCharge = 0,
    // CR-013: component-specific GST rate sources (pcts as 0..100). Defaults to
    // 0 — backward-compatible (callers pre-CR-013 still produce a valid payload,
    // just with 0 GST on SC/tip/delivery, which matches the force-0 fallback).
    serviceChargeTaxPct = 0,
    deliveryChargeGstPct = 0,
    // BUG-052: profile-driven round-off gate. true = apply ceiling, false = no
    // round-off. Defaults to true for backward compatibility (callers that don't
    // pass this field still get ceiling round-off from BUG-051).
    roundOffEnabled = true,
  } = extras;
  let subtotal = 0;
  let gstTax = 0;
  let vatTax = 0;

  cart.forEach(item => {
    // BUG-018 Part 2 (Apr-2026): exclude runtime-marked complimentary lines from
    // billable subtotal and tax aggregation. Catalog-complimentary lines already
    // contribute 0 naturally via price:0 — this guard only affects runtime-marked
    // lines (where price > 0 but is_complementary is flipped to "Yes").
    if (item.is_complementary === 'Yes') return;
    // CR-010: item.quantity may be decimal for weight-based items — do not parseInt/floor
    const lineTotal = (item._fullUnitPrice || item.price || 0) * (item.quantity || 1);
    subtotal += lineTotal;
    gstTax += parseFloat(item.gst_amount) || 0;
    vatTax += parseFloat(item.vat_amount) || 0;
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const postDiscount = Math.max(0, subtotal - discountAmount);

  // BUG-006 (AD-101): Service charge on POST-discount subtotal.
  const serviceCharge = serviceChargePercentage > 0
    ? Math.round(postDiscount * serviceChargePercentage / 100 * 100) / 100
    : 0;

  // Subtotal-without-tax (pre-tax complete): items − discount + SC + tip + delivery.
  // Mirrors the UI "Subtotal" row (CollectPaymentPanel.jsx:446). Pure additive
  // metadata — not used by rawTotal / orderAmount / round_up below, so Grand Total
  // is byte-identical regardless of this value.
  const subtotalWithoutTax = Math.round(
    (postDiscount + serviceCharge + tipAmount + deliveryCharge) * 100
  ) / 100;

  // CR-013 (May-2026): GST on items (post-discount), SC, tip, delivery now uses
  // component-specific rates from the restaurant profile, not avgGstRate.
  //   - SC GST + Tip GST   → serviceChargeTaxPct (extras)
  //   - Delivery GST       → deliveryChargeGstPct (extras)
  //   Tip rides SC rate (frozen rule §1 row 9): if SC rate = 0 → tip GST = 0.
  //   Pre-CR-013 (`avgGstRate`-based) was buggy on mixed-GST carts and ignored
  //   configured rates entirely.
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;
  const scTaxRate     = (serviceChargeTaxPct  || 0) / 100;
  const delTaxRate    = (deliveryChargeGstPct || 0) / 100;

  // CR-013 Phase 1.5 D-GST-3 (May-2026, owner-approved): expose component
  // breakdown so backend payload keys `service_gst_tax_amount` and
  // `tip_tax_amount` carry real values instead of the historical hardcoded 0
  // (BUG-232 reversal). Delivery GST stays folded into composite gst_tax for
  // now — a dedicated `delivery_charge_gst_amount` key is BE-G9 in Phase 3.
  // Round-off applies ONLY to the final order_amount (BUG-009), NOT to these
  // component values. Owner directive 2026-05-05.
  const scGstAmt    = serviceCharge  * scTaxRate;
  const tipGstAmt   = tipAmount      * scTaxRate;
  const delGstAmt   = deliveryCharge * delTaxRate;
  const itemGstPostDiscount = gstTax * (1 - discountRatio);

  // BUG-054: VAT proration mirrors GST (frozen TAX-003). Previously only GST
  // was prorated by discount; VAT was left at the pre-discount amount.
  const vatTaxPostDiscount = vatTax * (1 - discountRatio);

  gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt;

  const totalTax = Math.round((gstTax + vatTaxPostDiscount) * 100) / 100;

  // BUG-051 / ROUND-001: always-ceil round-off, replacing BUG-009 fractional
  // rule. Pending-freeze rule until promoted into BUSINESS_RULES_BASELINE_FINAL.md.
  // BUG-052: gated by profile boolean (roundOffEnabled). When false, raw total
  // is used with 2-decimal precision (no rounding).
  // ROUND-002: round-off applies ONLY to Grand Total; component values keep
  // 2-decimal precision. Owner directive 2026-05-05.
  const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
  const orderAmount = rawTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal * 100) / 100)
    : 0;
  const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
  const roundUpAbs = roundUp > 0 ? roundUp : 0;

  return {
    order_sub_total_amount:      subtotal,            // Item Total: items-only, pre-discount/SC/tip/delivery/tax
    order_sub_total_without_tax: subtotalWithoutTax,  // Subtotal: items − discount + SC + tip + delivery (pre-tax)
    tax_amount:                  totalTax,
    gst_tax:                     Math.round(gstTax * 100) / 100,
    vat_tax:                     Math.round(vatTaxPostDiscount * 100) / 100,   // BUG-054: prorated
    order_amount:                orderAmount,
    round_up:                    String(roundUpAbs.toFixed(2)),
    service_tax:                 serviceCharge,
    // CR-013 Phase 1.5 D-GST-3 (May-2026): component-wise GST persistence.
    // Backend echoes these as `total_service_tax_amount` / `tip_tax_amount` on
    // socket responses (orderTransform.js:187,189). Pre-CR-013 these were
    // hardcoded 0 at every payload site (BUG-232 wording). Now real.
    service_gst_tax_amount:      Math.round(scGstAmt  * 100) / 100,
    tip_tax_amount:              Math.round(tipGstAmt * 100) / 100,
    // BUG-083: Separate delivery GST key. Absent for non-delivery (delGstAmt = 0
    // when deliveryCharge = 0) per owner answer Q-083-6. Composite gst_tax
    // retains delivery GST per DEL-001 policy.
    ...(delGstAmt > 0 ? { delivery_charge_gst_amount: Math.round(delGstAmt * 100) / 100 } : {}),
  };
};

// =============================================================================
// Frontend → API (Request) - Phase 1C Order Operations
// =============================================================================
// ============================================================================
// BUG-007 (Apr-2026): Build backend-contract `delivery_address` object for
// place-order / place-order-with-payment payloads. Emitted ONLY for delivery
// orders, alongside the existing `address_id` (which remains the primary CRM
// identifier). Shape frozen with user on 2026-04-20.
// Backend persistence note: preprod confirmed HTTP 200 but field is currently
// silently dropped at the storage layer — backend team to wire up persistence.
// See /app/memory/AD_UPDATES_PENDING.md Entry #6.
// ============================================================================
const buildDeliveryAddress = (addr) => {
  if (!addr) return null;
  const lat = parseFloat(addr.latitude);
  const lng = parseFloat(addr.longitude);
  return {
    contact_person_name:   addr.contactPersonName   || '',
    contact_person_number: addr.contactPersonNumber || '',
    address_type:          addr.addressType         || '',
    address:               addr.address             || '',
    pincode:               addr.pincode             || '',
    floor:                 addr.floor || null,
    road:                  addr.road  || null,
    house:                 addr.house || null,
    location: {
      latitude:  Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
    },
  };
};

export const toAPI = {
  /**
   * Cancel item — cancels specific quantity (full cancel = pass item.qty)
   * cancel_type: "Pre-Serve" (item still cooking) | "Post-Serve" (item cooked/served)
   * Endpoint: PUT /api/v2/vendoremployee/partial-cancel-food-item
   * @param {Object} currentTable - Table entry (has orderId)
   * @param {Object} item         - Order item (has id=order_food_id, foodId=item_id)
   * @param {Object} reason       - Cancellation reason (has reasonId, reasonText)
   * @param {number} cancelQty    - Number of items to cancel (item.qty for full cancel)
   */
  cancelItem: (currentTable, item, reason, cancelQty, options = {}) => {
    // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field on cancel-item.
    // Owner-selected station rule: all-stations-in-cart (BC-4 default).
    // BILL excluded by selectAgentsForKot (R-OWNER-7). Empty cart → []. Never null.
    const { printerAgents = [], allCartItems = [] } = options;
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const printerAgentForCancelItem = selectAgentsForKot(printerAgents, cartStationsToSet(allActiveItems));
    return {
      order_id:      currentTable.orderId,
      order_food_id: item.foodId,      // food catalog ID (food_details.id)
      item_id:       item.id,          // order line item ID (orderDetails[].id)
      cancel_qty:    cancelQty,
      order_status:  'cancelled',
      reason_type:   reason.reasonId,
      reason:        reason.reasonText,
      cancel_type:   item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
      // CR-POS2-003-REOPEN-A (May-2026): always emit, never omit. OQ-PA-9.
      printer_agent: printerAgentForCancelItem,
    };
  },

  /**
   * Cancel entire order — single API call
   * Endpoint: PUT /api/v2/vendoremployee/order-status-update
   * @param {number} orderId   - Order ID
   * @param {string} roleName  - User role from profile (e.g. 'Manager')
   * @param {Object} reason    - { reasonText, reasonNote? }
   */
  cancelOrder: (orderId, roleName, reason, options = {}) => {
    // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field on cancel-order.
    // Owner-selected station rule: all-stations-in-cart.
    // BILL excluded by selectAgentsForKot (R-OWNER-7). Empty cart → []. Never null.
    const { printerAgents = [], allCartItems = [] } = options;
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const printerAgentForCancelOrder = selectAgentsForKot(printerAgents, cartStationsToSet(allActiveItems));
    return {
      order_id:            orderId,
      role_name:           roleName,
      order_status:        'cancelled',
      cancellation_reason: reason.reasonText,
      cancellation_note:   reason.reasonNote || reason.reasonText,
      // CR-POS2-003-REOPEN-A (May-2026): always emit, never omit. OQ-PA-9.
      printer_agent: printerAgentForCancelOrder,
    };
  },

  /**
   * Add out-of-menu custom item — creates product in catalog
   * Endpoint: POST /api/v1/vendoremployee/add-single-product
   * @param {string} name       - Custom item name
   * @param {number} categoryId - Category ID from MenuContext
   * @param {number} price      - Custom price
   */
  addCustomItem: (name, categoryId, price) => ({
    name,
    category_id: categoryId,
    price,
    tax:      0,
    tax_type: 'GST',
    tax_calc: 'Exclusive',
  }),

  // ==========================================================================
  // Flow 1: Place New Order (unpaid)
  // Endpoint: POST /api/v2/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  placeOrder: (table, cartItems, customer, orderType, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, deliveryCharge = 0, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true, scheduled = false, scheduleAt = null } = options;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
    // CR-008 / Bucket D1-Cap follow-up (May-2026, delivery-charge in totals):
    // Pass deliveryCharge into calcOrderTotals so order_amount, tax_amount, and
    // round_up include the delivery component. Backend echoes order_amount back
    // → dashboard TableCard / OrderCard / Audit Report all read the corrected
    // total. Gated to delivery orders only to prevent stray state bleeding into
    // non-delivery payloads (defense-in-depth; OrderEntry already gates on entry).
    // CR-013 (May-2026): plumb component-specific GST rate pcts into calcOrderTotals.
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage, {
      deliveryCharge: orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0,
      serviceChargeTaxPct,
      deliveryChargeGstPct,
      roundOffEnabled,
    });

    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
    const printerAgentForPlace = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];

    const payload = {
      user_id:                    userId,
      restaurant_id:              restaurantId,
      table_id:                   String(table?.tableId || 0),
      order_type:                 mapOrderTypeToAPI(orderType),
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_email:                 customer?.email || '',
      cust_dob:                   customer?.dob || '',
      cust_anniversary:           customer?.anniversary || '',
      cust_membership_id:         customer?.id || '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             'pending',
      payment_status:             'unpaid',
      payment_type:               'postpaid',
      transaction_id:             '',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      auto_dispatch:              'No',
      // CR-018 (Jun-2026): schedule order — pass through from options.
      scheduled:                  scheduled ? 1 : 0,
      schedule_at:                scheduleAt || null,
      // Financial
      ...totals,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): `service_gst_tax_amount` and
      // `tip_tax_amount` now flow from `...totals` above (calcOrderTotals
      // computes them). Pre-Phase-1.5 these were hardcoded 0 here.
      tip_amount:                 0,
      // CR-008 / Bucket D1-Cap (May-2026, delivery-charge capture): accept per-order
      // delivery_charge from OrderEntry (was previously hardcoded 0 here; BUG-019
      // already round-trips this value on Collect Bill).
      delivery_charge:            deliveryCharge,
      // Discount
      discount_type:              null,
      self_discount:              0,
      // BUG-108 V1B (2026-05-25, E-11): coupon_code parity field — Flow 1 never
      // carries a coupon (unpaid placement), but the field is emitted so POS BE
      // schema is uniform across all 4 commit flows.
      coupon_code:                '',
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      loyalty_points_used:        0,
      loyalty_discount:           0,
      use_wallet_balance:         0,
      // Room & Address
      paid_room:                  null,
      room_id:                    null,
      address_id:                 addressId,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      cart,
      // CR-POS2-003 (May-2026): printer_agent additive field (place-order v1).
      // OQ-PA-13: empty when print_kot:'No'. OQ-PA-9: never omit the key.
      printer_agent: printerAgentForPlace,
    };

    // R-OWNER-6 / R-LOG-1: warn ONLY when agents were configured + print_kot:'Yes'
    // but no station match landed.
    if (printAllKOT && Array.isArray(printerAgents) && printerAgents.length > 0 && printerAgentForPlace.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[printer_agent] empty agent set on place-order', {
        printKot: printAllKOT,
        cartStationCount: cartStationsToSet(unplacedItems).length,
      });
    }

    // BUG-007 / BUG-016 (Apr-2026): emit full delivery_address object for
    // delivery orders only; for non-delivery orders emit `null` so the preprod
    // PHP backend's unguarded `$payload['delivery_address']` access does not
    // throw "Undefined array key". See AD_UPDATES_PENDING.md Entry #6.
    payload.delivery_address = (orderType === 'delivery' && deliveryAddress)
      ? buildDeliveryAddress(deliveryAddress)
      : null;

    return payload;
  },

  // ==========================================================================
  // Flow 2: Update Existing Order (add items)
  // Endpoint: PUT /api/v1/vendoremployee/order/update-place-order (application/json)
  // ==========================================================================

  updateOrder: (table, newItems, customer, orderType, options = {}) => {
    const { 
      orderNotes = [], 
      printAllKOT = true,
      allCartItems = [],
      serviceChargePercentage = 0,
      addressId = null,
      deliveryCharge = 0,
      // CR-013 (May-2026): component-specific GST rate pcts (force-0 default).
      serviceChargeTaxPct = 0,
      deliveryChargeGstPct = 0,
      // CR-POS2-003-REOPEN-A (May-2026): printer agents for update/edit-order KOT.
      printerAgents = [],
      // BUG-052: profile-driven round-off gate.
      roundOffEnabled = true,
    } = options;

    // cart-update payload: only NEW (unplaced) items
    const cartUpdateRaw = newItems.map(buildCartItem);
    const cartUpdate = cartUpdateRaw.map(({ _fullUnitPrice, ...item }) => item);

    // COMBINED financial totals: ALL items (placed + unplaced, excluding cancelled)
    // ROOM_CHECKIN_FIX_V2 (Step 3): also exclude the synthetic Check-In marker
    // so the combined totals aggregation does not loop over a zero-priced noise row.
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const allBuilt = allActiveItems.map(buildCartItem);
    // CR-008 / Bucket D1-Cap follow-up (May-2026, delivery-charge in totals):
    // Same gate-and-pass as placeOrder so update-place-order echoes order_amount
    // including delivery. Without this, dashboard / audit tiles drop delivery
    // after an Update Order action even though the place-order had it.
    // CR-013 (May-2026): plumb component-specific GST rate pcts into calcOrderTotals.
    const combinedTotals = calcOrderTotals(allBuilt, serviceChargePercentage, {
      deliveryCharge: orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0,
      serviceChargeTaxPct,
      deliveryChargeGstPct,
      roundOffEnabled,
    });

    // CR-POS2-003-REOPEN-A (May-2026): KOT-station printer agents for update/edit.
    // Station set derived from new (unplaced) items only — mirrors the KOT-fire
    // semantics on update-place-order (only the newly-added lines route a KOT).
    // R-OWNER-9 / R-OWNER-10. BILL excluded by selectAgentsForKot. Empty → [].
    const printerAgentForUpdate = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(newItems))
      : [];

    const updatePayload = {
      order_id:                   String(table.orderId),
      order_type:                 mapOrderTypeToAPI(orderType),
      cust_name:                  customer?.name || '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             'pending',
      payment_status:             'unpaid',
      payment_type:               'postpaid',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      auto_dispatch:              'No',
      // Financial — COMBINED totals (existing placed + new unplaced)
      ...combinedTotals,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): `service_gst_tax_amount` and
      // `tip_tax_amount` now flow from `...combinedTotals` above
      // (calcOrderTotals computes them). Pre-Phase-1.5 these were hardcoded 0.
      tip_amount:                 0,
      // CR-008 / Bucket D1-Cap (May-2026, delivery-charge capture): accept per-order
      // delivery_charge from OrderEntry on update path (was previously hardcoded 0).
      delivery_charge:            deliveryCharge,
      // Discount
      discount_type:              null,
      self_discount:              0,
      // BUG-108 V1B (2026-05-25, E-12): coupon_code parity field — Flow 2 never
      // carries a coupon (item-add only), but the field is emitted so POS BE
      // schema is uniform across all 4 commit flows.
      coupon_code:                '',
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // BUG-055: payload parity — always emit key even on update (value is 0 on
      // update path since update-order does not carry discount yet).
      order_discount_type:        '',
      // Loyalty & Wallet
      used_loyalty_point:         0,
      loyalty_points_used:        0,
      loyalty_discount:           0,
      use_wallet_balance:         0,
      // Room
      room_id:                    null,
      // BUG-278: propagate delivery address id on update-order too, so users can
      // change address after placing the order (and on re-edit of a delivery order).
      address_id:                 addressId,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: null,
      usage_id:                   null,
      'cart-update':              cartUpdate,
      // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field after 'cart-update'.
      // OQ-PA-9: always emit. OQ-PA-13-equivalent: empty when print_kot:'No'.
      printer_agent: printerAgentForUpdate,
    };

    // R-OWNER-6 / R-LOG-1 parity with placeOrder: warn ONLY when agents were
    // configured + print_kot:'Yes' but no station match landed on update.
    if (printAllKOT && Array.isArray(printerAgents) && printerAgents.length > 0 && printerAgentForUpdate.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[printer_agent] empty agent set on update-order', {
        printKot: printAllKOT,
        cartStationCount: cartStationsToSet(newItems).length,
      });
    }

    return updatePayload;
  },

  // ==========================================================================
  // Flow 3: Place New Order + Collect Payment (prepaid)
  // Endpoint: POST /api/v2/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  placeOrderWithPayment: (table, cartItems, customer, orderType, paymentData, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, autoBill = false, serviceChargeTaxPct = 0, deliveryChargeGstPct = 0, printerAgents = [], roundOffEnabled = true, scheduled = false, scheduleAt = null } = options;
    const { method = 'cash', transactionId = '', splitPayments = [], tip = 0, deliveryCharge = 0, discounts = {} } = paymentData;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    // CR-028: Build cart items then inject per-item discount_amount
    const builtItems = unplacedItems.map(buildCartItem);
    const itemDiscounts = distributeItemDiscounts(builtItems, unplacedItems, parseFloat(discounts.total || 0), {
      couponDiscount: discounts.couponDiscount || 0,
      couponType: discounts.couponType || '',
      benefitItems: discounts.benefitItems || [],
    });
    const cart = builtItems.map((item, i) => {
      const { _fullUnitPrice, ...rest } = item;
      const discAmt = itemDiscounts[i];
      // CR-028 GST fix: recompute gst/vat on post-discount base
      const fullLine = (parseFloat(item.food_amount) || 0)
        + (parseFloat(item.variation_amount) || 0)
        + (parseFloat(item.addon_amount) || 0);
      const postDisc = Math.max(0, fullLine - discAmt);
      const src = unplacedItems[i];
      const taxPct = parseFloat(src?.tax?.percentage) || 0;
      const isInclusive = src?.tax?.isInclusive === true;
      const isGst = (src?.tax?.type || 'GST').toUpperCase() === 'GST';
      let newTax = 0;
      if (taxPct > 0 && postDisc > 0) {
        newTax = isInclusive
          ? postDisc - (postDisc / (1 + taxPct / 100))
          : postDisc * (taxPct / 100);
      }
      newTax = Math.round(newTax * 100) / 100;
      return {
        ...rest,
        discount_amount: String(discAmt.toFixed(2)),
        gst_amount: String((isGst ? newTax : 0).toFixed(2)),
        vat_amount: String((!isGst ? newTax : 0).toFixed(2)),
      };
    });
    // BUG-006 (AD-101): pass discount/tip/delivery so SC and GST compute on post-discount base
    // CR-013 (May-2026): plumb component-specific GST rate pcts into calcOrderTotals.
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage, {
      discountAmount: parseFloat(discounts.total || 0),
      tipAmount:      parseFloat(tip || 0),
      deliveryCharge: parseFloat(deliveryCharge || 0),
      serviceChargeTaxPct,
      deliveryChargeGstPct,
      roundOffEnabled,
    });
    const finalTotal = paymentData.finalTotal || totals.order_amount || 0;

    // CR-POS2-003 (May-2026): KOT-station printer agents only when print_kot:'Yes'.
    // R-OWNER-9 / R-OWNER-10. BILL is excluded by selectAgentsForKot.
    const printerAgentForPlace = printAllKOT
      ? selectAgentsForKot(printerAgents, cartStationsToSet(unplacedItems))
      : [];

    // Build partial_payments — always include all 3 modes
    let partialPayments;
    if (splitPayments?.length) {
      // Split payment: use provided amounts
      partialPayments = splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: parseFloat(p.amount) || 0,
        grant_amount:   parseFloat(p.amount) || 0,
        transaction_id: p.transactionId || '',
      }));
      // Ensure all 3 modes are present (add missing with 0)
      ['cash', 'card', 'upi'].forEach(mode => {
        if (!partialPayments.find(p => p.payment_mode === mode)) {
          partialPayments.push({ payment_mode: mode, payment_amount: 0, grant_amount: 0, transaction_id: '' });
        }
      });
    } else {
      // Single payment: selected method gets full amount, others get 0
      partialPayments = ['cash', 'card', 'upi'].map(mode => ({
        payment_mode:   mode,
        payment_amount: mode === method ? finalTotal : 0,
        grant_amount:   mode === method ? finalTotal : 0,
        transaction_id: mode === method ? (transactionId || '') : '',
      }));
    }

    const payload = {
      user_id:                    userId,
      restaurant_id:              restaurantId,
      table_id:                   String(table?.tableId || 0),
      order_type:                 mapOrderTypeToAPI(orderType),
      cust_name:                  customer?.name || '',
      cust_mobile:                customer?.phone || '',
      cust_email:                 customer?.email || '',
      cust_dob:                   customer?.dob || '',
      cust_anniversary:           customer?.anniversary || '',
      cust_membership_id:         customer?.id || '',
      order_note:                 orderNotes.map(n => n.label).join(', '),
      payment_method:             splitPayments?.length > 0 ? 'partial' : method,
      // BUG-058 (Wave 7): PayLater in prepaid path must be treated as postpaid.
      // Backend expects payment_status 'sucess' (literal typo) + payment_type
      // 'postpaid' — matching the postpaid PayLater collect-bill contract.
      payment_status:             (typeof method === 'string' && method.toLowerCase() === 'paylater') ? 'sucess' : 'paid',
      payment_type:               'prepaid',
      transaction_id:             transactionId || '',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      billing_auto_bill_print:    autoBill ? 'Yes' : 'No',
      auto_dispatch:              'No',
      // CR-018 (Jun-2026): schedule order — pass through from options.
      scheduled:                  scheduled ? 1 : 0,
      schedule_at:                scheduleAt || null,
      // Financial
      ...totals,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): `service_gst_tax_amount` and
      // `tip_tax_amount` now flow from `...totals` above (calcOrderTotals
      // computes them). Pre-Phase-1.5 these were hardcoded 0 with the
      // BUG-232 note "embedded in gst_tax".
      tip_amount:                 parseFloat(tip || 0),   // BUG-006: actual tip (was hardcoded '0')
      delivery_charge:            parseFloat(deliveryCharge || 0),
      // Discount — CR-025: order_discount sends ₹ amount, self_discount zeroed
      self_discount:              0,
      // BUG-108 V1B (2026-05-25, E-13 + E-14) — Flow 3 coupon fields:
      //   1. KEY-MISMATCH FIX: read `discounts.couponDiscount` (correct key),
      //      NOT `discounts.coupon` (pre-V1B latent bug — masked while
      //      `couponLive=false` zeroed everything upstream).
      //   2. Add `coupon_code` field per Owner SQ-1 = A.
      //   3. Add `couponLive` gate for symmetry with Flow 4 collectBillExisting.
      //   On V1 closure (Step 4) the `couponLive` ternaries become unconditional.
      // BUG-108 V1B (2026-05-25, E-13/E-14): Flow 3 coupon fields.
      // V1 closure (2026-05-25): couponLive ternaries removed — fields unconditional.
      self_discount:              0,
      coupon_code:                discounts.couponCode || '',
      coupon_discount:            discounts.couponDiscount || 0,
      coupon_title:               discounts.couponTitle || '',
      coupon_type:                discounts.couponType || '',
      comm_discount:              discounts.preset || 0,
      discount_type:              discounts.discountType || '',
      order_discount:             discounts.manual || 0,
      // BUG-055: payload parity with collectBillExisting (L1273).
      order_discount_type:        discounts.orderDiscountType || '',
      // discount_value: raw input (not resolved ₹). Preset/manual % → raw %;
      // manual flat → capped ₹; coupon → CRM ₹. Loyalty/wallet have own keys.
      discount_value:             discounts.preset > 0
                                    ? (discounts.presetDiscountPercent || 0)
                                    : discounts.orderDiscountPercent > 0
                                      ? discounts.orderDiscountPercent
                                      : discounts.manual > 0
                                        ? discounts.manual
                                        : (discounts.couponDiscount || 0),
      // Loyalty & Wallet — BUG-108 Phase C all-paths fix (2026-05-24):
      // Prepaid/place+pay now carries CRM-calculated values (mirrors collectBillExisting).
      // POS Backend handles actual CRM redemption.
      used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPointsRedeemed || 0)
                                      : 0,
      loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPointsRedeemed || 0)
                                      : 0,
      loyalty_discount:             BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPoints || 0)
                                      : 0,
      loyalty_redemption_id:        null,  // POS Backend generates during CRM call
      use_wallet_balance:           BUG108_FLAGS.walletDebitLive ? (discounts.walletBalance || 0) : 0,
      // Room & Address
      paid_room:                  '',
      room_id:                    '',
      address_id:                 addressId,
      // Misc
      // BUG-114 (POS 4.0): read from discounts (threaded from CollectPaymentPanel)
      discount_member_category_id:   discounts.discountMemberCategoryId || 0,
      discount_member_category_name: discounts.discountMemberCategoryName || '',
      usage_id:                   '',
      cart,
      // CR-021 parity: only attach partial_payments when split (mirrors collectBillExisting L1434)
      ...(splitPayments?.length > 0 ? { partial_payments: splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: parseFloat(p.amount) || 0,
        grant_amount:   parseFloat(p.amount) || 0,
        transaction_id: p.transactionId || '',
      })) } : {}),
      // OQ-PA-13: empty when print_kot:'No'. OQ-PA-9: never omit the key.
      printer_agent:              printerAgentForPlace,
      // BUG-007 / BUG-016 (Apr-2026): always emit `delivery_address` key — full
      // object for delivery orders, `null` otherwise — so the preprod PHP
      // backend's unguarded `$payload['delivery_address']` access does not throw
      // "Undefined array key" on non-delivery Place+Pay. See AD_UPDATES_PENDING.md Entry #6.
      delivery_address: (orderType === 'delivery' && deliveryAddress)
        ? buildDeliveryAddress(deliveryAddress)
        : null,
    };

    // R-OWNER-6 / R-LOG-1: warn ONLY when agents were configured + print_kot:'Yes'
    // but no station match landed (placeOrderWithPayment / prepaid path).
    if (printAllKOT && Array.isArray(printerAgents) && printerAgents.length > 0 && printerAgentForPlace.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[printer_agent] empty agent set on place-order', {
        printKot: printAllKOT,
        cartStationCount: cartStationsToSet(unplacedItems).length,
      });
    }

    return payload;
  },

  // ==========================================================================
  // Flow 4: Collect Payment on Existing Order (postpaid → paid)
  // Endpoint: POST /api/v2/vendoremployee/order/order-bill-payment
  // BUG-252: Aligned with OLD POS payload structure
  // ==========================================================================

  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    const { autoBill = false, waiterId = '', restaurantName = '', paymentType = '' } = options;
    const { 
      method = 'cash', transactionId = '',
      splitPayments = [], tip = 0,
      finalTotal = 0, sgst = 0, cgst = 0, vatAmount = 0,
      itemTotal = 0, subtotal = 0, serviceCharge = 0, deliveryCharge = 0,
      tabContact = null, discounts = {},
      roomBalance = 0,  // ROOM_CHECKIN_GAP3 (Stage 2): outstanding room booking balance, pass-through ₹ — no SC/GST/discount applied (L2 rule).
      // CR-013 Phase 1.5 D-GST-3 (May-2026): SC GST and Tip GST ₹ amounts —
      // computed in CollectPaymentPanel (`scGst`, `tipGst`). Pre-Phase-1.5
      // these were hardcoded 0 in the BILL_PAYMENT payload.
      serviceGstTaxAmount = 0,
      tipTaxAmount = 0,
      // CR-029 G1 (Gate 3, 2026-06-12): food-only round-off ₹ from UI
      // (CollectPaymentPanel L643 / CartPanel L423). Default 0 preserves
      // drawer re-collect (CollectBillPanelDrawer) + legacy test fixtures
      // that did not pass the key.
      roundOff = 0,
    } = paymentData;

    const gstTax = Math.round((sgst + cgst) * 100) / 100;

    // BUG-252: Detect TAB payment (can arrive as 'credit' internal ID or 'tab'/'TAB' API name)
    const isTab = method === 'credit' || (typeof method === 'string' && method.toLowerCase() === 'tab');

    // ON-HOLD-PAYLATER-PAID-FIX (May-2026): PayLater hold-collect-bill settle
    // requires payment_status = 'sucess' (literal six-letter typo accepted by
    // backend authoritative parser — confirmed via working curl for hold-paid
    // collect of order 825855, 2026-05-13). All other flows unchanged:
    // TAB/credit → 'success', cash/card/upi → 'paid'.
    const isPayLater = typeof method === 'string' && method.toLowerCase() === 'paylater';

    // BUG-252: Build food_detail from placed cart items (matches OLD POS structure)
    // ROOM_CHECKIN_FIX_V2 (Step 3): exclude synthetic Check-In marker so the
    // order-bill-payment payload never leaks a zero-priced marker row. This
    // preserves pre-fix behavior (transform used to strip the marker upstream).
    const placedSourceItems = (cartItems || [])
      .filter(item => item.placed && item.status !== 'cancelled' && !item.isCheckInMarker);
    const food_detail_raw = placedSourceItems
      .map(item => {
        const unitPrice = item.unitPrice || item.price || 0;
        const qty = item.qty || 1;

        // Compute variation amount from item.variation array
        let variationAmount = 0;
        if (item.variation?.length > 0) {
          variationAmount = item.variation.reduce((sum, v) => {
            if (v.price) return sum + (parseFloat(v.price) || 0);
            const vals = Array.isArray(v.values) ? v.values : [];
            return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
          }, 0);
        }

        // Compute addon amount from item.addOns array
        let addonAmount = 0;
        if (item.addOns?.length > 0) {
          addonAmount = item.addOns.reduce((sum, a) => {
            return sum + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1));
          }, 0);
        }

        // Compute per-item tax
        const taxPct = parseFloat(item.tax?.percentage) || 0;
        const taxType = (item.tax?.type || 'GST').toUpperCase();
        const isInclusive = item.tax?.isInclusive || false;
        const fullUnitPrice = unitPrice + addonAmount + variationAmount;
        const lineTotal = fullUnitPrice * qty;
        let taxAmount = 0;
        if (taxPct > 0) {
          taxAmount = isInclusive
            ? lineTotal - (lineTotal / (1 + taxPct / 100))
            : lineTotal * (taxPct / 100);
        }
        const isGst = taxType === 'GST';

        // BUG-018 Part 2 (Apr-2026): runtime-marked complimentary lines carve
        // out all billable amounts and flip the flag. Catalog-complimentary
        // Step 1 path is preserved in the else branch.
        const isRuntimeComp = item.isComplementaryRuntime === true;

        return {
          food_id:            item.foodId || item.id,
          quantity:           qty,
          item_id:            item.id,
          unit_price:         unitPrice,
          is_complementary:   isRuntimeComp ? 'Yes' : 'No',
          food_amount:        isRuntimeComp ? 0 : (unitPrice * qty),
          variation_amount:   isRuntimeComp ? 0 : variationAmount,
          addon_amount:       isRuntimeComp ? 0 : addonAmount,
          gst_amount:         isRuntimeComp ? '0.00' : String((isGst ? taxAmount : 0).toFixed(2)),
          vat_amount:         isRuntimeComp ? '0.00' : String((!isGst ? taxAmount : 0).toFixed(2)),
          discount_amount:    '0.00',
          // BUG-018 Part 1 (Apr-2026) — catalog-complimentary: actual price in
          // complementary_total (order-bill-payment key; distinct from place-order's
          // complementary_price). is_complementary stays "No".
          // BUG-018 Part 2 (Apr-2026) — runtime-marked: is_complementary = "Yes",
          // complementary_total = actual line unit price (base + variation + addon).
          complementary_total: isRuntimeComp
            ? (unitPrice + variationAmount + addonAmount)
            : (item.isComplementary
                ? (parseFloat(item.complementaryPrice) || parseFloat(item.price) || 0)
                : 0),
        };
      });
    // CR-028: Inject per-item discount_amount via largest-remainder distribution
    const food_detail = (() => {
      const totalDisc = parseFloat(discounts.total || 0);
      if (totalDisc <= 0) return food_detail_raw;
      const discAmts = distributeItemDiscounts(food_detail_raw, placedSourceItems, totalDisc, {
        couponDiscount: discounts.couponDiscount || 0,
        couponType: discounts.couponType || '',
        benefitItems: discounts.benefitItems || [],
      });
      return food_detail_raw.map((item, i) => {
        const discAmt = discAmts[i];
        // CR-028 GST fix: recompute gst/vat on post-discount base
        const fullLine = (parseFloat(item.food_amount) || 0)
          + (parseFloat(item.variation_amount) || 0)
          + (parseFloat(item.addon_amount) || 0);
        const postDisc = Math.max(0, fullLine - discAmt);
        const src = placedSourceItems[i];
        const taxPct = parseFloat(src?.tax?.percentage) || 0;
        const isInclusive = src?.tax?.isInclusive === true;
        const isGst = (src?.tax?.type || 'GST').toUpperCase() === 'GST';
        let newTax = 0;
        if (taxPct > 0 && postDisc > 0) {
          newTax = isInclusive
            ? postDisc - (postDisc / (1 + taxPct / 100))
            : postDisc * (taxPct / 100);
        }
        newTax = Math.round(newTax * 100) / 100;
        return {
          ...item,
          discount_amount: String(discAmt.toFixed(2)),
          gst_amount: String((isGst ? newTax : 0).toFixed(2)),
          vat_amount: String((!isGst ? newTax : 0).toFixed(2)),
        };
      });
    })();

    const payload = {
      order_id:                     String(table.orderId),
      // BUG-058 (Wave 7): Include payment_type when provided (hold-tab settle
      // sends 'postpaid' so backend treats prepaid-hold orders as postpaid).
      ...(paymentType ? { payment_type: paymentType } : {}),
      payment_mode:                 splitPayments?.length > 0 ? 'partial' : method,
      payment_amount:               finalTotal || 0,
      payment_status:               isPayLater ? 'sucess' : (isTab ? 'success' : 'paid'),
      transaction_id:               transactionId || '',
      billing_auto_bill_print:      autoBill ? 'Yes' : 'No',
      // Item details (BUG-252: required by backend for all payment types)
      food_detail,
      // Employee & restaurant
      waiter_id:                    waiterId,
      restaurant_name:              restaurantName,
      email:                        '',
      // Financial totals
      order_sub_total_amount:       itemTotal || 0,    // Item Total
      order_sub_total_without_tax:  subtotal  || 0,    // Subtotal (incl. delivery when applicable) — sourced from CollectPaymentPanel.subtotal
      total_gst_tax_amount:         gstTax,
      gst_tax:                      gstTax,
      vat_tax:                      vatAmount || 0,
      grant_amount:                 finalTotal || 0,
      // ROOM_CHECKIN_GAP3 (Stage 2, revised 2026-04-25): `order_amount` carries
      // the full payable amount (food + associated + room balance) for room
      // orders with a pending room balance. User-confirmed field name on
      // 2026-04-25 (replaces earlier `grand_total` candidate). Emitted only
      // when roomBalance > 0 to keep non-room flows byte-identical to
      // pre-Stage-2 payloads.
      ...(roomBalance > 0 ? { order_amount: finalTotal || 0 } : {}),
      // CR-029 G1 (Gate 3, 2026-06-12): real food-only round-off ₹ — replaces
      // the hardcoded 0 that was masking BILL_PAYMENT round-off persistence.
      // Q-BE-1 confirmed NUMERIC type on BILL_PAYMENT (live screenshot of
      // order #939848). PLACE_ORDER (calcOrderTotals:844) continues to emit
      // String(toFixed(2)) per its existing contract — cross-flow type
      // unification OUT of CR-029 scope. Math.max(0,…) mirrors L835 clamp.
      round_up:                     Math.max(0, Math.round((parseFloat(roundOff) || 0) * 100) / 100),
      // Tax & Tip
      service_tax:                  serviceCharge || 0,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): real SC GST + Tip GST values
      // (was hardcoded 0). Owner directive 2026-05-05.
      service_gst_tax_amount:       Math.round((serviceGstTaxAmount || 0) * 100) / 100,
      tip_amount:                   tip || 0,
      tip_tax_amount:               Math.round((tipTaxAmount || 0) * 100) / 100,
      delivery_charge:              deliveryCharge || 0,
      // BUG-083: separate delivery GST key. Absent for non-delivery per Q-083-6.
      // Composite gst_tax retains delivery GST per DEL-001 policy. deliveryGstAmount
      // is passed through from CollectPaymentPanel (deliveryGst variable).
      ...(paymentData.deliveryGstAmount > 0 ? { delivery_charge_gst_amount: Math.round(paymentData.deliveryGstAmount * 100) / 100 } : {}),
      // Discounts — CR-025: order_discount sends ₹ amount, self_discount zeroed
      self_discount:                0,
      coupon_code:                  discounts.couponCode || '',
      coupon_discount:              discounts.couponDiscount || 0,
      coupon_title:                 discounts.couponTitle || '',
      coupon_type:                  discounts.couponType || '',
      comm_discount:                discounts.preset || 0,
      discount_type:                discounts.discountType || '',
      order_discount_type:          discounts.orderDiscountType || 'Percent',
      order_discount:               discounts.manual || 0,
      // discount_value: raw input (not resolved ₹). Preset/manual % → raw %;
      // manual flat → capped ₹; coupon → CRM ₹. Loyalty/wallet have own keys.
      discount_value:               discounts.preset > 0
                                      ? (discounts.presetDiscountPercent || 0)
                                      : discounts.orderDiscountPercent > 0
                                        ? discounts.orderDiscountPercent
                                        : discounts.manual > 0
                                          ? discounts.manual
                                          : (discounts.couponDiscount || 0),
      // BUG-114 (POS 4.0): read from discounts (threaded from CollectPaymentPanel)
      discount_member_category_id:  discounts.discountMemberCategoryId || 0,
      discount_member_category_name: discounts.discountMemberCategoryName || '',
      // Loyalty & Wallet — BUG-108 Phase C corrected (2026-05-24):
      // Payload carries CRM-calculated values from /pos/max-redeemable.
      // POS Backend handles actual redemption. No direct CRM redeem call.
      used_loyalty_point:           BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPointsRedeemed || 0)
                                      : 0,
      loyalty_points_used:          BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPointsRedeemed || 0)
                                      : 0,
      loyalty_discount:             BUG108_FLAGS.loyaltyRatioLive
                                      ? (discounts.loyaltyPoints || 0)
                                      : 0,
      loyalty_redemption_id:        null,  // POS Backend generates during CRM call
      use_wallet_balance:           BUG108_FLAGS.walletDebitLive ? (discounts.walletBalance || 0) : 0,
      // Room & Misc
      paid_room:                    '',
      usage_id:                     '',
      // TAB-specific fields (BUG-252: customer info for credit tracking)
      name:                         tabContact?.name || '',
      mobile:                       tabContact?.phone || '',
    };

    // Partial payments — CR-021 B1: gate on splitPayments length only
    // (mirrors placeOrderWithPayment L1119). method is never set to 'partial'.
    if (splitPayments?.length > 0) {
      payload.partial_payments = splitPayments.map(p => ({
        payment_mode:   p.method,
        payment_amount: p.amount,
        transaction_id: p.transactionId || '',
      }));
    }

    return payload;
  },

  /**
   * Transfer to Room — Phase 2B (transfer entire table order to a room)
   * Endpoint: POST /api/v2/vendoremployee/order/order-shifted-room (JSON)
   * @param {Object} table       - Table entry (has orderId)
   * @param {Object} paymentData - { method, finalTotal, sgst, cgst, vatAmount, tip, discounts }
   * @param {number|string} roomId - Destination room ID
   */
  transferToRoom: (table, paymentData, roomId) => {
    const {
      method = 'cash', finalTotal = 0,
      sgst = 0, cgst = 0, vatAmount = 0,
      tip = 0, discounts = {}, serviceCharge = 0,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): SC GST + Tip GST ₹.
      serviceGstTaxAmount = 0,
      tipTaxAmount = 0,
    } = paymentData;

    return {
      order_id:                 String(table.orderId),
      payment_mode:             method,
      payment_amount:           finalTotal,
      payment_status:           'paid',
      room_id:                  String(roomId),
      order_discount:           discounts.manual || 0,
      self_discount:            0,
      comm_discount:            discounts.preset || 0,
      tip_amount:               tip,
      vat_tax:                  vatAmount,
      gst_tax:                  Math.round(((sgst || 0) + (cgst || 0)) * 100) / 100,
      service_tax:              serviceCharge || 0,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): real values (was hardcoded 0).
      service_gst_tax_amount:   Math.round((serviceGstTaxAmount || 0) * 100) / 100,
      tip_tax_amount:           Math.round((tipTaxAmount || 0) * 100) / 100,
    };
  },

  // ==========================================================================
  // Update Order Status (Ready / Served)
  // Endpoint: PUT /api/v2/vendoremployee/order-status-update
  // ==========================================================================
  /**
   * Build payload for updating order status (ready/served)
   * @param {number|string} orderId - Order ID
   * @param {string} roleName - User's role name (e.g., "Owner", "Manager")
   * @param {string} status - New status: "ready" | "served"
   */
  updateOrderStatus: (orderId, roleName, status) => ({
    order_id: String(orderId),
    role_name: roleName,
    order_status: status,
  }),

  // ==========================================================================
  // Manual Bill Print — full payload for order-temp-store API
  // BUG-273/277: `overrides` lets callers (e.g. CollectPaymentPanel) pass the
  // LIVE values from the payment screen so that discount/service-charge/delivery
  // changes made on the collect-bill page are reflected in the printed bill.
  // Defaults (omitted overrides) preserve previous behavior for dashboard cards.
  // ==========================================================================
  buildBillPrintPayload: (order, serviceChargePercentage = 0, overrides = {}) => {
    const rawDetails = order.rawOrderDetails || [];

    // BUG-018 Part 3 (Apr-2026): Complimentary carve-out for print payload.
    // BUG-021 (Apr-2026, v2): `overrides.runtimeComplimentaryFoodIds` lets the
    // caller (CollectPaymentPanel / OrderEntry auto-print) mark lines as
    // complimentary even when the backend-hydrated
    // `rawOrderDetails[].is_complementary` is stale (e.g., the postpaid collect-bill
    // auto-print path fires before socket re-engage). The override list carries
    // two kinds of IDs and `isDetailComplimentary` matches either:
    //   - order_details row IDs (preferred, unique per cart row) vs `d.id`
    //   - catalog food IDs (fallback / secondary match)         vs `d.food_details.id`
    // This mirrors `fromAPI.orderItem` (line 85-86) where
    //   cartItem.id      = detail.id              (order_details row ID)
    //   cartItem.foodId  = detail.food_details.id (catalog food ID)
    //
    // Predicate also matches existing BUG-018 sources:
    //   - catalog:  food_details.complementary === 'Yes' (case-insensitive)
    //   - runtime:  detail.is_complementary === 'Yes'   (case-insensitive)
    const runtimeCompIds = Array.isArray(overrides.runtimeComplimentaryFoodIds)
      ? overrides.runtimeComplimentaryFoodIds.map(v => String(v))
      : [];
    const isDetailComplimentary = (d) => {
      const catalog = (d?.food_details?.complementary || '').toLowerCase() === 'yes';
      const runtime = (d?.is_complementary || '').toLowerCase() === 'yes';
      const override = runtimeCompIds.length > 0
        && (runtimeCompIds.includes(String(d?.id))
            || runtimeCompIds.includes(String(d?.food_details?.id)));
      return catalog || runtime || override;
    };

    // Step 1: Zero-out price / tax on complimentary lines in billFoodList so the
    // printed receipt shows the line at ₹0 (item name preserved). Non-
    // complimentary lines pass through unchanged. Also filters the 'Check In'
    // system marker.
    //
    // 2026-05-01 — Cancelled-item exclusion:
    //   Bill totals are already computed correctly from the (uncancelled-only)
    //   subtotal pipeline upstream, but the raw `rawOrderDetails` array still
    //   contains cancelled items with their original price. Without this
    //   filter the printed receipt lists those line items even though they
    //   are not part of the customer's tab — confusing on counter, awkward
    //   on a hotel folio. The /order-temp-store endpoint stores whatever we
    //   send, so the fix has to happen here at payload-build time.
    //
    //   Cancelled-item indicators on a raw detail row (verified live 2026-05-01):
    //     - food_status === 3        // F_ORDER_STATUS map → 'cancelled'
    //     - cancel_at non-null       // timestamp set when item is cancelled
    //     - cancel_type non-null     // Pre-Serve / Post-Serve / Order / full
    //   Any one of these flips the row to cancelled. We OR them so partial
    //   backend population still excludes the row.
    const isDetailCancelled = (d) =>
      Number(d?.food_status) === 3 || d?.cancel_at != null || d?.cancel_type != null;
    const billFoodList = rawDetails
      .filter(d => (d.food_details?.name || '').toLowerCase() !== 'check in')
      .filter(d => !isDetailCancelled(d))
      .map(d => {
        if (!isDetailComplimentary(d)) return d;
        return {
          ...d,
          is_complementary: 'Yes',  // HOTFIX-COMP-PRINT (2026-05-26): was missing — spread carried stale 'No' from backend
          price:          0,
          unit_price:     0,
          food_amount:    0,
          variation_amount: 0,
          addon_amount:   0,
          gst_tax_amount: 0,
          vat_tax_amount: 0,
          tax_amount:     0,
          // complementary_price preserved from original detail for print reference.
        };
      });

    // Dev-only diagnostic: count cancelled items removed from print so we can
    // verify the filter is working from the browser console.
    if (process.env.NODE_ENV === 'development') {
      const removedCount = rawDetails.filter(isDetailCancelled).length;
      if (removedCount > 0) {
        // eslint-disable-next-line no-console
        console.info(`[BILL-PRINT] excluded ${removedCount} cancelled item(s) from /order-temp-store payload for order ${order.id || order.orderId}`);
      }
    }

    // Compute GST and VAT totals + subtotal from item-level data
    // BUG-246: item.price from rawOrderDetails is the LINE TOTAL (unit_price × qty),
    // NOT the unit price. Use unit_price or food_details.price to avoid double-counting.
    // BUG-018 Part 3: skip complimentary lines from the aggregation so the
    // default-branch (no-override) fallback — used by dashboard printer icons
    // and any path that omits orderItemTotal/orderSubtotal/gstTax overrides —
    // does not inflate subtotal or tax.
    let gst_tax = 0, vat_tax = 0, computedSubtotal = 0;
    billFoodList.forEach(item => {
      if (isDetailComplimentary(item)) return;
      const qty = parseFloat(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || parseFloat(item.food_details?.price) || 0;
      const price = unitPrice > 0 ? unitPrice : (parseFloat(item.price) || 0);
      const lineTotal = price * qty;
      computedSubtotal += lineTotal;

      // Try pre-computed item-level tax first, then compute from food_details
      let taxAmt = parseFloat(item.gst_tax_amount || item.tax_amount || 0);
      if (!taxAmt && item.food_details) {
        const taxPct = parseFloat(item.food_details.tax) || 0;
        if (taxPct > 0) {
          const isInclusive = (item.food_details.tax_calc || '').toLowerCase() === 'inclusive';
          taxAmt = isInclusive
            ? lineTotal * taxPct / (100 + taxPct)
            : lineTotal * taxPct / 100;
        }
      }

      const taxType = (item.food_details?.tax_type || 'GST').toUpperCase();
      if (taxType === 'VAT') vat_tax += taxAmt;
      else gst_tax += taxAmt;
    });
    computedSubtotal = Math.round(computedSubtotal * 100) / 100;

    // BUG-006 (AD-101): Service charge on POST-discount subtotal.
    // Caller override still wins (CollectPaymentPanel sends the live UI value).
    //
    // BUG-050 (Wave 4, May-2026): when caller did NOT pass an override (e.g.
    // dashboard re-print from OrderCard/TableCard/PrintBillButton), fall back
    // to the stored backend discount carried on `order.discount` (added in
    // fromAPI.order). This mirrors how `overrideTip` / `overrideDelivery`
    // already fall back to `order.tipAmount` / `order.deliveryCharge` (see
    // L1597 / L1603-L1605 below), restoring print parity with Collect Bill
    // for orders that had a stored discount.
    const overrideDiscount = overrides.discountAmount !== undefined
      ? parseFloat(overrides.discountAmount) || 0
      : (parseFloat(order.discount) || 0);
    const overrideTip = overrides.tip !== undefined
      ? parseFloat(overrides.tip) || 0 : 0;
    const overrideDelivery = overrides.deliveryCharge !== undefined
      ? parseFloat(overrides.deliveryCharge) || 0 : 0;
    const postDiscountSubtotal = Math.max(0, computedSubtotal - overrideDiscount);

    // BUG-023 (Apr-2026): Mirror CollectPaymentPanel SC-applicability rule
    // (CollectPaymentPanel.jsx:244) in the default branch so dashboard-card
    // manual print (OrderCard/TableCard) does not emit service charge for
    // takeaway / delivery. Override path is untouched.
    //
    // BUG-023 defect-in-fix (Apr-2026, follow-up): Previous implementation
    // also checked `order.isWalkIn === true`. In `fromAPI.order` (line 134)
    // `isWalkIn` is derived as `!api.table_id || api.table_id === 0`, which
    // is TRUE for every takeaway/delivery order (no table_id). That caused
    // the gate to evaluate true for exactly the two types the fix was meant
    // to exempt — SC was still emitted. `normalizeOrderType` folds walk-ins
    // into `'dineIn'` anyway, so the first clause covers them. Effective
    // rule matches CollectPaymentPanel: dineIn || isRoom.
    const scApplicable =
      order.orderType === 'dineIn' || order.isRoom === true;

    const serviceChargeAmount = overrides.serviceChargeAmount !== undefined
      ? overrides.serviceChargeAmount
      : (scApplicable
          ? (serviceChargePercentage > 0
              ? Math.round(postDiscountSubtotal * serviceChargePercentage / 100 * 100) / 100
              : (order.serviceTax || 0))
          : 0);

    // CR-013 (May-2026): re-print fallback path. When CollectPaymentPanel is the
    // caller, overrides.serviceChargeAmount + overrides.gstTax are already set
    // and we skip recompute. For dashboard-driven re-prints (TableCard /
    // OrderCard / RePrintButton) overrides may be empty — recompute uses the
    // component-specific GST rate pcts forwarded via overrides:
    //   - SC GST + Tip GST   → overrides.serviceChargeTaxPct
    //   - Delivery GST       → overrides.deliveryChargeGstPct
    // Tip rides SC rate (frozen rule §1 row 9). Missing/unset → 0 (force-0
    // fallback per frozen rule §1 row 10). Pre-CR-013 used `avgGstRate` here.
    if (overrides.serviceChargeAmount === undefined
        && computedSubtotal > 0) {
      const discountRatio = overrideDiscount / computedSubtotal;
      const scTaxRate     = (overrides.serviceChargeTaxPct  || 0) / 100;
      const delTaxRate    = (overrides.deliveryChargeGstPct || 0) / 100;
      gst_tax = gst_tax * (1 - discountRatio)
              + serviceChargeAmount * scTaxRate
              + overrideTip          * scTaxRate
              + overrideDelivery     * delTaxRate;
    }

    gst_tax = Math.round(gst_tax * 100) / 100;
    vat_tax = Math.round(vat_tax * 100) / 100;

    // Format date as DD/MMM/YYYY HH:MM AM/PM
    const formatBillDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      let hours = d.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins} ${ampm}`;
    };

    // Derive table name label
    // NOTE: orderType must be checked BEFORE isWalkIn because isWalkIn is
    // derived from !table_id, which is true for ALL takeaway/delivery orders
    // (they have no table). Same root-cause as BUG-023 SC fix at L1633.
    const tablename = order.orderType === 'takeAway' ? 'TA'
      : order.orderType === 'delivery' ? 'Del'
      : order.isWalkIn ? 'WC'
      : order.tableNumber || '';

    // BUG-273/277: compute final values honoring any overrides provided by the
    // payment screen. Falls back to legacy behavior when overrides are absent.
    const finalOrderItemTotal = overrides.orderItemTotal !== undefined
      ? overrides.orderItemTotal
      : (order.subtotalAmount || computedSubtotal || 0);
    // BUG-282: when caller didn't pass overrides (e.g. dashboard TableCard /
    // OrderCard printer icon), compute Subtotal with BUG-281 semantic:
    //   order_subtotal = itemBase + serviceCharge + tip
    // Discount is absent from the socket-hydrated order (it's only entered on
    // the Collect Bill page), so no discount term here.
    const finalOrderSubtotal = overrides.orderSubtotal !== undefined
      ? overrides.orderSubtotal
      : (() => {
          const itemBase = order.subtotalBeforeTax || order.subtotalAmount || computedSubtotal || 0;
          const tipAmt   = overrides.tip !== undefined ? overrides.tip : (parseFloat(order.tipAmount) || 0);
          // Dashboard / re-print fallback: when no live override is supplied, fold
          // the order's delivery principal into Subtotal so dashboard re-prints match
          // the cashier-print Subtotal value. `order.deliveryCharge` is hydrated by
          // fromAPI.order (L280). Live-print path (override branch above) already
          // carries delivery via CollectPaymentPanel.subtotal cascade.
          const delAmt   = overrides.deliveryCharge !== undefined
            ? (parseFloat(overrides.deliveryCharge) || 0)
            : (parseFloat(order.deliveryCharge) || 0);
          return Math.round((itemBase + serviceChargeAmount + tipAmt + delAmt) * 100) / 100;
        })();
    const finalPaymentAmount = overrides.paymentAmount !== undefined
      ? overrides.paymentAmount
      : (order.amount || 0);
    const finalGstTax = overrides.gstTax !== undefined ? overrides.gstTax : gst_tax;
    const finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax;

    // ==========================================================================
    // REQ3 (Apr-2026): Room order bill print enrichment.
    // - Replaces the hardcoded 0s for `roomRemainingPay` / `roomAdvancePay`
    //   with real values from `order.roomInfo` when isRoom.
    // - Emits `associated_orders[]` matching the backend schema (sourced from
    //   `_raw` preserved in fromAPI.order).
    // - Architectural rule preserved: SC / discount / tip / GST apply ONLY to
    //   food-subtotal — NOT to roomBalance, NOT to associatedTotal.
    // - `roomGst` stays 0 per Q-3E.
    //
    // PRINT-CORRECTIVE (May-2026): print payload now emits TWO distinct money
    // fields with different semantics (PRINT-002 business rule):
    //   - `payment_amount` = food-only bill ("Total" line on the printed bill)
    //     = finalPaymentAmount (override caller passes food-only `finalTotal`;
    //     default branch falls back to `order.amount`)
    //   - `grant_amount`   = full amount payable now ("Grand Total" line)
    //     = finalPaymentAmount + associatedTotal + roomBalance (for room orders)
    //     = finalPaymentAmount                                   (for non-room)
    //
    // The previous (Mini-CR) approach conflated both fields to `effectiveTotal`,
    // which made the printed "Total" line equal the Grand Total on the override
    // path, and left the default path collapsing both fields to food-only on
    // room orders (receipts #1/#2 in owner's 2026-05-17 evidence). The earlier
    // comment claiming `order.amount` is "room-inclusive per Task 4" was wrong:
    // `computeRoomCardAmount` in DashboardPage.jsx only mutates the dashboard
    // CARD display value — the `order` object passed to this function still
    // carries the raw food-only `order.amount`.
    //
    // Item Total / Service Charge / Sub Total / CGST / SGST drift between the
    // override and default branches is acknowledged but DEFERRED per owner
    // directive 2026-05-17 (pending separate proof + approval).
    // ==========================================================================
    const isRoomPrint = order.isRoom === true;
    const associatedOrdersForPrint = isRoomPrint
      ? (order.associatedOrders || []).map(ao => {
          const r = ao._raw || {};
          return {
            id: r.id ?? ao.orderId ?? 0,
            room_id: r.room_id ?? 0,
            restaurant_id: r.restaurant_id ?? 0,
            user_id: r.user_id ?? null,
            order_id: r.order_id ?? 0,
            restaurant_order_id: r.restaurant_order_id ?? ao.orderNumber ?? '',
            order_amount: r.order_amount !== undefined ? Number(r.order_amount) : (ao.amount ?? 0),
            order_status: r.order_status ?? 0,
            created_at: r.created_at ?? '',
            updated_at: r.updated_at ?? '',
          };
        })
      : [];
    const associatedTotalForPrint = associatedOrdersForPrint.reduce(
      (s, o) => s + (Number(o.order_amount) || 0), 0
    );
    const roomBalanceForPrint = isRoomPrint && order.roomInfo
      ? Math.max(0, Number(order.roomInfo.balancePayment) || 0)
      : 0;
    const roomAdvanceForPrint = isRoomPrint && order.roomInfo
      ? (Number(order.roomInfo.advancePayment) || 0)
      : 0;

    // PRINT-CORRECTIVE (May-2026): "Grand Total" value emitted as `grant_amount`.
    // - Room orders: food-only finalPaymentAmount + associatedTotal + roomBalance.
    //   Mirrors what CollectPaymentPanel computes as `effectiveTotal` for the
    //   Checkout button (collectBillExisting payload sends the same number as
    //   its own `grant_amount`).
    // - Non-room orders: identical to `payment_amount` (associated=0, balance=0).
    //
    // Override hook: `overrides.grantAmount` allows live-state callers
    // (e.g. CollectPaymentPanel.handlePrintBill) to pass the live effectiveTotal
    // directly when the order context's room/associated data may not yet be
    // fully hydrated.
    const finalGrantAmount = overrides.grantAmount !== undefined
      ? overrides.grantAmount
      : (isRoomPrint
          ? Math.round((Number(finalPaymentAmount) + associatedTotalForPrint + roomBalanceForPrint) * 100) / 100
          : finalPaymentAmount);

    return {
      order_id: order.orderId,
      restaurant_order_id: order.orderNumber || '',
      print_type: 'bill',
      // PRINT-CORRECTIVE (May-2026, PRINT-002): two distinct semantics:
      //   payment_amount → "Total" line  → food-only (finalPaymentAmount)
      //   grant_amount   → "Grand Total" → full payable (finalGrantAmount;
      //                                    = finalPaymentAmount for non-room)
      payment_amount: finalPaymentAmount,
      grant_amount: finalGrantAmount,
      order_item_total: finalOrderItemTotal,
      order_subtotal: finalOrderSubtotal,
      // BUG-050 (Wave 4, May-2026): default-branch fallback now reads stored
      // `order.discount` instead of hardcoded 0, so dashboard re-print matches
      // Collect Bill discount_amount when the order was paid with a discount.
      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
      // BUG-108 P1 (May-2026): Force-zero coupon/loyalty/wallet print fields
      // when their CRM endpoints are not yet live. UI keeps these sections
      // disabled; this prevents any stale override value from printing on the bill.
      coupon_code: overrides.couponCode !== undefined ? overrides.couponCode : '',
      // BUG-108 V1B (2026-05-25, E-16, Owner Q5 = A): print payload carries
      // coupon discount amount. V1 closure (2026-05-25): couponLive gate removed.
      coupon_discount: overrides.couponDiscount !== undefined ? overrides.couponDiscount : 0,
      loyalty_dicount_amount: BUG108_FLAGS.loyaltyRatioLive ? (overrides.loyaltyAmount !== undefined ? overrides.loyaltyAmount : 0) : 0,
      wallet_used_amount: BUG108_FLAGS.walletDebitLive ? (overrides.walletAmount !== undefined ? overrides.walletAmount : 0) : 0,
      Date: formatBillDate(order.createdAt),
      waiterName: order.waiter || '',
      tablename,
      custName: order.customerName || '',
      custPhone: order.phone || '',
      custGSTName: '',
      custGST: '',
      billFoodList,
      orderNote: order.orderNote || '',
      serviceChargeAmount,
      roomRemainingPay: roomBalanceForPrint,
      roomAdvancePay: roomAdvanceForPrint,
      roomGst: 0,
      // REQ3: associated dine-in/walk-in bills transferred to this room.
      // Empty array for non-room orders. Schema mirrors backend
      // `associated_order_list` items (see /app/memory/REQ3_*).
      associated_orders: associatedOrdersForPrint,
      // BUG-012: Use overrides.deliveryAddress (from selectedAddress in OrderEntry)
      // when available; fallback to order.deliveryAddress (from socket, often null).
      deliveryCustName: order.orderType === 'delivery'
        ? (overrides.deliveryAddress?.contactPersonName || order.deliveryAddress?.contact_person_name || order.customer || '')
        : '',
      deliveryAddressType: order.orderType === 'delivery'
        ? (overrides.deliveryAddress?.addressType || order.deliveryAddress?.address_type || '')
        : '',
      deliveryCustAddress: order.orderType === 'delivery'
        ? (overrides.deliveryAddress?.address || order.deliveryAddress?.formatted || order.deliveryAddress?.address || '')
        : '',
      deliveryCustPincode: order.orderType === 'delivery'
        ? (overrides.deliveryAddress?.pincode || order.deliveryAddress?.pincode || '')
        : '',
      deliveryCustPhone: order.orderType === 'delivery'
        ? (overrides.deliveryAddress?.contactPersonNumber || order.deliveryAddress?.contact_person_number || order.phone || '')
        : '',
      Tip: overrides.tip !== undefined ? overrides.tip : (order.tipAmount || 0),
      station_kot: '',
      order_type: order.rawOrderType || 'dinein',
      // PRINT-MINI-CR (May-2026): backend-added field. Binary:
      // - "RM" when order is a room order (`order.isRoom === true`)
      // - "TB" for every other channel (dine-in, takeaway, walk-in, delivery, etc.)
      // Emitted only on the temp-store print payload (Q2a=(i)). Not added
      // to `collectBillExisting` or any other payload.
      rtype: order.isRoom ? 'RM' : 'TB',
      // PRINT-MINI-CR Addendum (May-2026): backend-requested keys. Sourced
      // straight from order context (`fromAPI.order` L220 / L222) — no
      // override-branch handling. Collect Bill panel preview prints
      // 'unpaid' / '' (truthful state at preview time); dashboard / order-
      // entry / audit reprint of a paid order prints the real stored values
      // (e.g. 'paid' / 'cash'). PayLater backend typo 'sucess' passes
      // through unchanged per L1184 backend contract.
      payment_status: order.paymentStatus || '',
      payment_method: order.paymentMethod || '',
      gst_tax: finalGstTax,
      // CR-013 Phase 1.5 D-GST-4-PRINT-PAYLOAD (May-2026, owner-approved):
      // composite GST split into CGST + SGST (50/50) on the print payload so
      // the backend `order-temp-store` template can render them as separate
      // lines. Round-off is NOT applied to component values (BUG-009 round-off
      // applies only to final order_amount). If the backend template doesn't
      // yet read these fields they're harmless; per-component slot adoption
      // tracked under Phase 3 CR (CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md).
      cgst_amount: Math.round((finalGstTax / 2) * 100) / 100,
      sgst_amount: Math.round((finalGstTax / 2) * 100) / 100,
      vat_tax: finalVatTax,
      delivery_charge: overrides.deliveryCharge !== undefined ? overrides.deliveryCharge : (order.deliveryCharge || 0),
      // BUG-083: delivery GST for print template. Absent for non-delivery.
      ...(overrides.deliveryGstAmount > 0 ? { delivery_charge_gst_amount: Math.round(overrides.deliveryGstAmount * 100) / 100 } : {}),
    };
  },
};

// =============================================================================
// API Response → Cart Item (custom item mapping)
// =============================================================================
/**
 * Maps add-single-product API response to cart item shape
 * @param {Object} data  - API response data object
 * @param {number} qty   - User-selected quantity
 * @param {string} notes - Optional notes
 */
export const customItemFromAPI = (data, qty, notes) => ({
  id:           data.id,
  name:         data.name,
  price:        parseFloat(data.price) || 0,
  unitPrice:    parseFloat(data.price) || 0,
  qty,
  notes:        notes || '',
  status:       'preparing',
  placed:       false,
  isCustomItem: true,
  addedAt:      new Date().toISOString(),
});

