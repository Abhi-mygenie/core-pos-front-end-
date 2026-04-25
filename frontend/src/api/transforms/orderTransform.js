// Order Transform - Maps raw API order data to canonical frontend schema

import { F_ORDER_STATUS, ORDER_TO_TABLE_STATUS, ORDER_TYPES } from '../constants';

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
      variation: detail.variation || [],
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
      paymentStatus: api.payment_status || 'unpaid',
      paymentType: api.payment_type || '',
      paymentMethod: api.payment_method || '',

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
      roomInfo: api.room_info ? {
        roomPrice:      parseFloat(api.room_info.room_price)      || 0,
        advancePayment: parseFloat(api.room_info.advance_payment) || 0,
        balancePayment: parseFloat(api.room_info.balance_payment) || 0,
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
    // Build group map: groupName → [selected option labels]
    const groupMap = {};
    Object.entries(item.selectedVariants)
      .filter(([, option]) => option)
      .forEach(([groupId, option]) => {
        variationAmount += parseFloat(option.price) || 0;
        // Look up group name from variantGroups
        const group = variantGroups.find(g => String(g.id) === String(groupId));
        const groupName = group?.name || option.groupName || `Variant`;
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(option.name);
      });
    // Convert to API format: [{name, values: {label: [...]}}]
    variations = Object.entries(groupMap).map(([name, labels]) => ({
      name,
      values: { label: labels },
    }));
  } else if (item.variation?.length > 0) {
    // Fallback for placed items from socket (already in API format or empty)
    variations = item.variation;
    // Socket format: [{name, values: [{label, optionPrice}]}] or [{name, values: {label: []}}]
    variationAmount = item.variation.reduce((sum, v) => {
      // Try direct price (legacy)
      if (v.price) return sum + (parseFloat(v.price) || 0);
      // Parse nested values array: values[].optionPrice
      const vals = Array.isArray(v.values) ? v.values : (v.values?.label ? [] : []);
      return sum + vals.reduce((s, opt) => s + (parseFloat(opt.optionPrice) || 0), 0);
    }, 0);
  }

  // Per-item financials
  const basePrice = item.price || 0;
  const foodAmount = basePrice * (item.qty || 1);
  const fullUnitPrice = basePrice + addonAmount + variationAmount;

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
    quantity:            item.qty || 1,
    price:               basePrice,
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
 * @param {Object} extras - BUG-006 (AD-101): discount-aware math inputs
 *   @param {number} extras.discountAmount - Total discount applied at collect-bill
 *   @param {number} extras.tipAmount      - Tip (flat ₹) — taxable per GST-on-tip rule
 *   @param {number} extras.deliveryCharge - Delivery charge — taxable per GST-on-delivery rule
 * @returns {Object} - Financial totals for the order payload
 */
const calcOrderTotals = (cart, serviceChargePercentage = 0, extras = {}) => {
  const { discountAmount = 0, tipAmount = 0, deliveryCharge = 0 } = extras;
  let subtotal = 0;
  let gstTax = 0;
  let vatTax = 0;

  cart.forEach(item => {
    // BUG-018 Part 2 (Apr-2026): exclude runtime-marked complimentary lines from
    // billable subtotal and tax aggregation. Catalog-complimentary lines already
    // contribute 0 naturally via price:0 — this guard only affects runtime-marked
    // lines (where price > 0 but is_complementary is flipped to "Yes").
    if (item.is_complementary === 'Yes') return;
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

  // BUG-006: GST applies to items (post-discount), SC, tip, and delivery charge.
  const avgGstRate    = subtotal > 0 ? gstTax / subtotal : 0;
  const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

  gstTax = (gstTax * (1 - discountRatio))
         + (serviceCharge  * avgGstRate)
         + (tipAmount      * avgGstRate)
         + (deliveryCharge * avgGstRate);

  const totalTax = Math.round((gstTax + vatTax) * 100) / 100;

  // BUG-009: Rounding based on fractional part (old POS parity).
  // If fractional > 0.10 → ceil; if fractional <= 0.10 → floor.
  const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;
  const fractional = Math.round((rawTotal - Math.floor(rawTotal)) * 100) / 100;
  const orderAmount = rawTotal > 0
    ? (fractional > 0.10 ? Math.ceil(rawTotal) : Math.floor(rawTotal))
    : 0;
  const roundUp = Math.round((orderAmount - rawTotal) * 100) / 100;
  const roundUpAbs = roundUp > 0 ? roundUp : 0;

  return {
    order_sub_total_amount:      subtotal,        // items-only (pre-discount) — backend contract unchanged
    order_sub_total_without_tax: subtotal,
    tax_amount:                  totalTax,
    gst_tax:                     Math.round(gstTax * 100) / 100,
    vat_tax:                     Math.round(vatTax * 100) / 100,
    order_amount:                orderAmount,
    round_up:                    String(roundUpAbs.toFixed(2)),
    service_tax:                 serviceCharge,
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
  cancelItem: (currentTable, item, reason, cancelQty) => ({
    order_id:      currentTable.orderId,
    order_food_id: item.foodId,      // food catalog ID (food_details.id)
    item_id:       item.id,          // order line item ID (orderDetails[].id)
    cancel_qty:    cancelQty,
    order_status:  'cancelled',
    reason_type:   reason.reasonId,
    reason:        reason.reasonText,
    cancel_type:   item.status === 'preparing' ? 'Pre-Serve' : 'Post-Serve',
  }),

  /**
   * Cancel entire order — single API call
   * Endpoint: PUT /api/v2/vendoremployee/order-status-update
   * @param {number} orderId   - Order ID
   * @param {string} roleName  - User role from profile (e.g. 'Manager')
   * @param {Object} reason    - { reasonText, reasonNote? }
   */
  cancelOrder: (orderId, roleName, reason) => ({
    order_id:            orderId,
    role_name:           roleName,
    order_status:        'cancelled',
    cancellation_reason: reason.reasonText,
    cancellation_note:   reason.reasonNote || reason.reasonText,
  }),

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
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0 } = options;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage);

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
      scheduled:                  0,
      schedule_at:                null,
      // Financial
      ...totals,
      service_gst_tax_amount:     0,
      tip_amount:                 0,
      tip_tax_amount:             0,
      delivery_charge:            0,
      // Discount
      discount_type:              null,
      self_discount:              0,
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
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
    };

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
    } = options;

    // cart-update payload: only NEW (unplaced) items
    const cartUpdateRaw = newItems.map(buildCartItem);
    const cartUpdate = cartUpdateRaw.map(({ _fullUnitPrice, ...item }) => item);

    // COMBINED financial totals: ALL items (placed + unplaced, excluding cancelled)
    // ROOM_CHECKIN_FIX_V2 (Step 3): also exclude the synthetic Check-In marker
    // so the combined totals aggregation does not loop over a zero-priced noise row.
    const allActiveItems = allCartItems.filter(i => i.status !== 'cancelled' && !i.isCheckInMarker);
    const allBuilt = allActiveItems.map(buildCartItem);
    const combinedTotals = calcOrderTotals(allBuilt, serviceChargePercentage);

    return {
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
      service_gst_tax_amount:     0,
      tip_amount:                 0,
      tip_tax_amount:             0,
      delivery_charge:            0,
      // Discount
      discount_type:              null,
      self_discount:              0,
      coupon_discount:            0,
      coupon_title:               null,
      coupon_type:                null,
      order_discount:             0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
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
    };
  },

  // ==========================================================================
  // Flow 3: Place New Order + Collect Payment (prepaid)
  // Endpoint: POST /api/v2/vendoremployee/order/place-order (multipart/form-data)
  // ==========================================================================

  placeOrderWithPayment: (table, cartItems, customer, orderType, paymentData, options = {}) => {
    const { restaurantId, orderNotes = [], printAllKOT = true, userId = '', addressId = null, deliveryAddress = null, serviceChargePercentage = 0, autoBill = false } = options;
    const { method = 'cash', transactionId = '', splitPayments = [], tip = 0, deliveryCharge = 0, discounts = {} } = paymentData;

    const unplacedItems = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    const cart = unplacedItems.map(buildCartItem).map(({ _fullUnitPrice, ...item }) => item);
    // BUG-006 (AD-101): pass discount/tip/delivery so SC and GST compute on post-discount base
    const totals = calcOrderTotals(unplacedItems.map(buildCartItem), serviceChargePercentage, {
      discountAmount: parseFloat(discounts.total || 0),
      tipAmount:      parseFloat(tip || 0),
      deliveryCharge: parseFloat(deliveryCharge || 0),
    });
    const finalTotal = paymentData.finalTotal || totals.order_amount || 0;

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

    return {
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
      payment_method:             method,
      payment_status:             'paid',
      payment_type:               'prepaid',
      transaction_id:             transactionId || '',
      print_kot:                  printAllKOT ? 'Yes' : 'No',
      billing_auto_bill_print:    autoBill ? 'Yes' : 'No',
      auto_dispatch:              'No',
      scheduled:                  0,
      schedule_at:                null,
      // Financial
      ...totals,
      service_gst_tax_amount:     0,       // BUG-232: service charge GST not used (embedded in gst_tax)
      tip_amount:                 parseFloat(tip || 0),   // BUG-006: actual tip (was hardcoded '0')
      tip_tax_amount:             0,
      delivery_charge:            parseFloat(deliveryCharge || 0),
      // Discount
      discount_type:              discounts.type || '',
      self_discount:              discounts.manual || 0,
      coupon_discount:            discounts.coupon || 0,
      coupon_title:               discounts.couponTitle || '',
      coupon_type:                discounts.couponType || '',
      order_discount:             discounts.orderDiscountPercent || 0,
      // Loyalty & Wallet
      used_loyalty_point:         0,
      use_wallet_balance:         0,
      // Room & Address
      paid_room:                  '',
      room_id:                    '',
      address_id:                 addressId,
      // Misc
      discount_member_category_id:   0,
      discount_member_category_name: '',
      usage_id:                   '',
      cart,
      partial_payments:           partialPayments,
      // BUG-007 / BUG-016 (Apr-2026): always emit `delivery_address` key — full
      // object for delivery orders, `null` otherwise — so the preprod PHP
      // backend's unguarded `$payload['delivery_address']` access does not throw
      // "Undefined array key" on non-delivery Place+Pay. See AD_UPDATES_PENDING.md Entry #6.
      delivery_address: (orderType === 'delivery' && deliveryAddress)
        ? buildDeliveryAddress(deliveryAddress)
        : null,
    };
  },

  // ==========================================================================
  // Flow 4: Collect Payment on Existing Order (postpaid → paid)
  // Endpoint: POST /api/v2/vendoremployee/order/order-bill-payment
  // BUG-252: Aligned with OLD POS payload structure
  // ==========================================================================

  collectBillExisting: (table, cartItems, customer, paymentData, options = {}) => {
    const { autoBill = false, waiterId = '', restaurantName = '' } = options;
    const { 
      method = 'cash', transactionId = '',
      splitPayments = [], tip = 0,
      finalTotal = 0, sgst = 0, cgst = 0, vatAmount = 0,
      itemTotal = 0, serviceCharge = 0, deliveryCharge = 0,
      tabContact = null, discounts = {},
      roomBalance = 0,  // ROOM_CHECKIN_GAP3 (Stage 2): outstanding room booking balance, pass-through ₹ — no SC/GST/discount applied (L2 rule).
    } = paymentData;

    const gstTax = Math.round((sgst + cgst) * 100) / 100;

    // BUG-252: Detect TAB payment (can arrive as 'credit' internal ID or 'tab'/'TAB' API name)
    const isTab = method === 'credit' || (typeof method === 'string' && method.toLowerCase() === 'tab');

    // BUG-252: Build food_detail from placed cart items (matches OLD POS structure)
    // ROOM_CHECKIN_FIX_V2 (Step 3): exclude synthetic Check-In marker so the
    // order-bill-payment payload never leaks a zero-priced marker row. This
    // preserves pre-fix behavior (transform used to strip the marker upstream).
    const food_detail = (cartItems || [])
      .filter(item => item.placed && item.status !== 'cancelled' && !item.isCheckInMarker)
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

    const payload = {
      order_id:                     String(table.orderId),
      payment_mode:                 method,
      payment_amount:               finalTotal || 0,
      payment_status:               isTab ? 'success' : 'paid',
      transaction_id:               transactionId || '',
      billing_auto_bill_print:      autoBill ? 'Yes' : 'No',
      // Item details (BUG-252: required by backend for all payment types)
      food_detail,
      // Employee & restaurant
      waiter_id:                    waiterId,
      restaurant_name:              restaurantName,
      email:                        '',
      // Financial totals
      order_sub_total_amount:       itemTotal || 0,
      order_sub_total_without_tax:  itemTotal || 0,
      total_gst_tax_amount:         gstTax,
      gst_tax:                      gstTax,
      vat_tax:                      vatAmount || 0,
      grand_amount:                 finalTotal || 0,
      // ROOM_CHECKIN_GAP3 (Stage 2, revised 2026-04-25): `order_amount` carries
      // the full payable amount (food + associated + room balance) for room
      // orders with a pending room balance. User-confirmed field name on
      // 2026-04-25 (replaces earlier `grand_total` candidate). Emitted only
      // when roomBalance > 0 to keep non-room flows byte-identical to
      // pre-Stage-2 payloads.
      ...(roomBalance > 0 ? { order_amount: finalTotal || 0 } : {}),
      round_up:                     0,
      // Tax & Tip
      service_tax:                  serviceCharge || 0,
      service_gst_tax_amount:       0,
      tip_amount:                   tip || 0,
      tip_tax_amount:               0,
      delivery_charge:              deliveryCharge || 0,
      // Discounts (BUG-252: field names aligned with OLD POS)
      self_discount:                discounts.manual || 0,
      coupon_discount:              discounts.couponDiscount || 0,
      coupon_title:                 discounts.couponTitle || '',
      coupon_type:                  discounts.couponType || '',
      comm_discount:                discounts.preset || 0,
      discount_type:                discounts.discountType || '',
      order_discount_type:          discounts.orderDiscountType || 'Percent',
      order_discount:               discounts.orderDiscountPercent || 0,
      discount_value:               discounts.total || 0,
      discount_member_category_id:  0,
      discount_member_category_name: '',
      // Loyalty & Wallet
      used_loyalty_point:           discounts.loyaltyPoints || 0,
      use_wallet_balance:           discounts.walletBalance || 0,
      // Room & Misc
      paid_room:                    '',
      usage_id:                     '',
      // TAB-specific fields (BUG-252: customer info for credit tracking)
      name:                         tabContact?.name || '',
      mobile:                       tabContact?.phone || '',
    };

    // Partial payments
    if (method === 'partial' && splitPayments?.length) {
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
   * Endpoint: POST /api/v1/vendoremployee/order-shifted-room (JSON)
   * @param {Object} table       - Table entry (has orderId)
   * @param {Object} paymentData - { method, finalTotal, sgst, cgst, vatAmount, tip, discounts }
   * @param {number|string} roomId - Destination room ID
   */
  transferToRoom: (table, paymentData, roomId) => {
    const {
      method = 'cash', finalTotal = 0,
      sgst = 0, cgst = 0, vatAmount = 0,
      tip = 0, discounts = {}, serviceCharge = 0,
    } = paymentData;

    return {
      order_id:                 String(table.orderId),
      payment_mode:             method,
      payment_amount:           finalTotal,
      payment_status:           'paid',
      room_id:                  String(roomId),
      order_discount:           discounts.orderDiscountPercent || 0,
      self_discount:            discounts.manual || 0,
      comm_discount:            discounts.preset || 0,
      tip_amount:               tip,
      vat_tax:                  vatAmount,
      gst_tax:                  Math.round(((sgst || 0) + (cgst || 0)) * 100) / 100,
      service_tax:              serviceCharge || 0,
      service_gst_tax_amount:   0,
      tip_tax_amount:           0,
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
    const billFoodList = rawDetails
      .filter(d => (d.food_details?.name || '').toLowerCase() !== 'check in')
      .map(d => {
        if (!isDetailComplimentary(d)) return d;
        return {
          ...d,
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
    const overrideDiscount = overrides.discountAmount !== undefined
      ? parseFloat(overrides.discountAmount) || 0 : 0;
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

    // GST on SC / tip / delivery — only when we computed SC ourselves; otherwise the
    // caller (CollectPaymentPanel) has already baked these into overrides.gstTax.
    if (overrides.serviceChargeAmount === undefined
        && computedSubtotal > 0) {
      const avgGstRate    = gst_tax / computedSubtotal;
      const discountRatio = overrideDiscount / computedSubtotal;
      gst_tax = gst_tax * (1 - discountRatio)
              + serviceChargeAmount * avgGstRate
              + overrideTip          * avgGstRate
              + overrideDelivery     * avgGstRate;
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
    const tablename = order.isWalkIn ? 'WC'
      : order.orderType === 'takeAway' ? 'TA'
      : order.orderType === 'delivery' ? 'Del'
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
          return Math.round((itemBase + serviceChargeAmount + tipAmt) * 100) / 100;
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
    // - Rolls associatedTotal + roomBalance into `payment_amount` / `grant_amount`
    //   when the override path supplies a food-only `paymentAmount`, so the
    //   printed bill total matches the cashier-visible total
    //   (CollectPaymentPanel.jsx:543 / 555 / 1986).
    // - Architectural rule preserved: SC / discount / tip / GST apply ONLY to
    //   food-subtotal — NOT to roomBalance, NOT to associatedTotal.
    // - `roomGst` stays 0 per Q-3E.
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
    // Roll room-side amounts into the final payable when the override path
    // supplied a food-only `paymentAmount`. Default branch (no override)
    // already trusts `order.amount`, which is room-inclusive per Task 4
    // (computeRoomCardAmount in DashboardPage.jsx).
    const roomFinalPaymentAmount = (isRoomPrint && overrides.paymentAmount !== undefined)
      ? Math.round((Number(finalPaymentAmount) + associatedTotalForPrint + roomBalanceForPrint) * 100) / 100
      : finalPaymentAmount;

    return {
      order_id: order.orderId,
      restaurant_order_id: order.orderNumber || '',
      print_type: 'bill',
      payment_amount: roomFinalPaymentAmount,
      grant_amount: roomFinalPaymentAmount,
      order_item_total: finalOrderItemTotal,
      order_subtotal: finalOrderSubtotal,
      discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : 0,
      coupon_code: overrides.couponCode !== undefined ? overrides.couponCode : '',
      loyalty_dicount_amount: overrides.loyaltyAmount !== undefined ? overrides.loyaltyAmount : 0,
      wallet_used_amount: overrides.walletAmount !== undefined ? overrides.walletAmount : 0,
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
      gst_tax: finalGstTax,
      vat_tax: finalVatTax,
      delivery_charge: overrides.deliveryCharge !== undefined ? overrides.deliveryCharge : (order.deliveryCharge || 0),
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

