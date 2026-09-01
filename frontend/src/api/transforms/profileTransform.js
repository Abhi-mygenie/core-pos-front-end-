// Profile Transform - Vendor Profile API response mapping

import { YES_NO_MAP, F_ORDER_STATUS_API } from '../constants';
import { normalizePrinterAgent } from './printerAgentSelector';

/**
 * Helper to convert API truthy/falsy representations to boolean.
 *
 * BUG-AUTOKOT/AUTOBILL VISIBILITY (May-2026): Issue surfaced as cart KOT/Bill
 * checkboxes always rendering unticked even when the profile toggles
 * (autoKot / autoBill) were set to ON. Root cause: API emits these flags as
 * a string shape this helper did not recognise (e.g. "true"/"false",
 * "1"/"0", "on"/"off"), so toBoolean fell through to the default false.
 *
 * Fix: widen acceptance — additive only. Every previously truthy/falsy
 * mapping still resolves identically; new aliases now also resolve. No
 * consumer (settings.autoKot, autoBill, dine_in, delivery, etc.) needs to
 * change.
 */
const toBoolean = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true'  || v === '1' || v === 'on')  return true;
    if (v === 'false' || v === '0' || v === 'off') return false;
    return YES_NO_MAP[value] ?? YES_NO_MAP[v] ?? false;
  }
  return false;
};

/**
 * Helper to safely parse a percentage / numeric tax-rate value from the API.
 *
 * CR-013 (May-2026): Used to expose `service_charge_tax` and `deliver_charge_gst`
 * onto the restaurant object as `serviceChargeTaxPct` and `deliveryChargeGstPct`.
 *
 * Frozen rule (CR_013_FROZEN_BUSINESS_LOGIC.md §1 row 10 / §4):
 *   - If the key is missing / null / blank / non-numeric / negative → return 0.
 *   - Explicit "0.00" is also honoured as 0 (override semantics — config wins).
 *
 * Owner directive: when the backend has not yet populated these keys, charging
 * 0% GST on the affected component is the desired, compliant default ("correct,
 * coz it's bug" — owner reply 2026-05-05).
 *
 * Bucket D-GST-1 only exposes these values; consumption lands in D-GST-2.
 */
const parseTaxPct = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * Helper to construct full image URL
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const baseUrl = process.env.REACT_APP_API_BASE_URL;
  return `${baseUrl}/storage/${imagePath}`;
};

// =============================================================================
// API → Frontend (Response)
// =============================================================================
export const fromAPI = {
  /**
   * Transform full profile response
   */
  profileResponse: (api) => ({
    user: fromAPI.user(api),
    // Owner override 2026-05-08: v1 endpoint places `print_agent` at the
    // TOP LEVEL of the response (not in `restaurants[0]`). Pass it down
    // explicitly so the restaurant builder still owns the resulting
    // `printerAgents` field on the canonical restaurant object.
    restaurant: fromAPI.restaurant(api.restaurants?.[0], api.print_agent, api.restaurant_discount_type),
    permissions: api.role || [],
  }),

  /**
   * Transform user/employee info
   */
  user: (api) => ({
    odwnerId: api.id,
    employeeId: api.emp_id,
    firstName: api.emp_f_name || '',
    lastName: api.emp_l_name || '',
    fullName: `${api.emp_f_name || ''} ${api.emp_l_name || ''}`.trim(),
    email: api.emp_email || api.email,
    phone: api.phone,
    roleName: api.role_name,
    isDefaultUser: toBoolean(api.default_user),
    image: getImageUrl(api.image),
  }),

  /**
   * Transform restaurant info
   *
   * @param {Object} api - the `restaurants[0]` sub-object from the profile response
   * @param {*} printAgent - the TOP-LEVEL `print_agent` value (new v1 endpoint
   *   places this OUTSIDE `restaurants[0]`). Optional; missing → []. Owner
   *   override 2026-05-08.
   */
  restaurant: (api, printAgent, discountTypesOverride) => {
    if (!api) return null;
    return {
      id: api.id,
      name: api.name,
      phone: api.phone,
      email: api.email,
      address: api.address,
      logo: getImageUrl(api.logo),
      coverPhoto: getImageUrl(api.cover_photo),
      currency: api.currency || 'INR',
      currencySymbol: api.currency === 'INR' ? '₹' : api.currency,

      // CR-078 · Smart Purchase / CR-077 Receive pill dependency:
      //   Surface restaurant_type_flag ("normal" | "franchise" | "master") to consumers.
      //   Used by Sidebar to conditionally render the Receive pill (CR-078 B13:
      //   visible for franchise + master, hidden for normal or undefined).
      restaurantTypeFlag: api.restaurant_type_flag || null,
      parentRestaurantId: api.parent_restaurant_id || null,
      
      // Features
      features: {
        dineIn: toBoolean(api.dine_in),
        delivery: toBoolean(api.delivery),
        takeaway: toBoolean(api.take_away),
        room: toBoolean(api.room),
        inventory: toBoolean(api.inventory),
        tip: toBoolean(api.tip),
        serviceCharge: toBoolean(api.service_charge),
        deliveryAssign: toBoolean(api.delivery_assign),
        scheduleOrderEnabled: toBoolean(api.schedule_order), // BUG-331
      },
      
      // Service charge settings
      serviceChargePercentage: parseFloat(api.service_charge_percentage) || 0,
      autoServiceCharge: toBoolean(api.auto_service_charge),

      // CR-013 (May-2026): Component-specific GST rate sources.
      // Parsed from backend profile API and exposed at restaurant root for
      // symmetry with serviceChargePercentage. Bucket D-GST-1 only exposes
      // these values; calculation switch lives in Bucket D-GST-2.
      // Frozen rule (§1 row 3/6/9, §3, §4):
      //   - serviceChargeTaxPct → drives Service Charge GST AND Tip GST (tip
      //     rides SC rate; if SC rate = 0 then tip GST = 0).
      //   - deliveryChargeGstPct → drives Delivery Charge GST.
      //   - Missing / null / blank / non-numeric / negative → 0 (force-0
      //     fallback per owner directive 2026-05-05).
      //   - Explicit "0.00" → also 0 (override semantics — config wins).
      // No new payload key, no backend change, no consumer in this bucket.
      serviceChargeTaxPct: parseTaxPct(api.service_charge_tax),
      // CR-013 Phase 1.5 Fix-1 (May-2026, owner-approved 2026-05-05): some
      // tenants (e.g. Bean Me Up id=742) nest `deliver_charge_gst` under
      // `restaurants[0].settings.deliver_charge_gst` instead of at the
      // restaurants[0] root — confirmed live via preprod profile API. Read
      // root first (back-compat for tenants that had it at root); fall back
      // to settings if root is null/undefined. Frozen-rule §10 force-0
      // semantics still apply when both are missing/blank/non-numeric.
      // service_charge_tax (line above) is intentionally NOT given a
      // settings fallback in this fix — no tenant in our cohort exhibits
      // service_charge_tax nesting today; symmetry can be added if/when
      // such a tenant is observed.
      deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),

      // BUG-052: Profile-driven round-off boolean. "Yes" → ceiling round-off
      // applied (BUG-051); "No"/missing → no round-off (raw total used).
      // Owner-confirmed API key: `total_round`. Backend already sends this field.
      totalRound: toBoolean(api.total_round),

      // Tax settings
      tax: {
        percentage: parseFloat(api.tax) || 0,
        gstPercentage: parseFloat(api.gst_tax) || 0,
        gstCode: api.gst_code,
        // CR-036-FU-03 F3 (2026-06-12): owner-confirmed top-level boolean
        // at restaurants[0] (sibling of `gst_code` / `payment_types` per
        // products-list response screenshot). Defensive `=== true` so any
        // null / undefined / missing-field response yields `false` and
        // BulkEditor's tax-required validation is silently disabled (safe
        // fallback per OQ-F3-3). Consumer: `restaurant.tax.gstStatus`.
        gstStatus: api.gst_status === true,
      },
      
      // Payment types
      paymentTypes: fromAPI.paymentTypes(api.payment_types),
      
      // Payment method toggles
      paymentMethods: {
        cash: toBoolean(api.pay_cash),
        upi: toBoolean(api.pay_upi),
        card: toBoolean(api.pay_cc),
        tab: toBoolean(api.pay_tab),
      },
      
      // Discount types
      // Discount types — BUG-056: root-level override (same pattern as print_agent).
      // API places restaurant_discount_type at the TOP LEVEL of the profile response,
      // not inside restaurants[0]. Fall back to restaurants[0] for safety.
      discountTypes: fromAPI.discountTypes(discountTypesOverride ?? api.restaurant_discount_type),
      
      // Printer configuration
      printers: fromAPI.printers(api.restaurant_printer_new),

      // CR-POS2-003 (May-2026): dynamic per-station printer agents (additive;
      // missing/empty/non-array → []). Drives BILL/KOT printer-agent injection
      // on order-temp-store + place-order. See printerAgentSelector.js.
      // Owner override 2026-05-08: source moved from `restaurants[0].print_agent`
      // (initial v2-style assumption) to the v1 endpoint's TOP-LEVEL
      // `print_agent` — passed down via the second arg of this builder.
      printerAgents: fromAPI.printerAgents(printAgent),
      
      // Operating hours
      schedules: fromAPI.schedules(api.schedules),
      
      // Settings
      settings: fromAPI.settings(api),
      
      // Cancellation rules
      cancellation: {
        allowPostServeCancel: toBoolean(api.cancle_post_serve),
        allowPostServeCancel2: toBoolean(api.allow_cancel_post_server),
        orderCancelWindowMinutes: parseInt(api.cancel_order_time) || 0,
        itemCancelWindowMinutes: parseInt(api.cancel_food_timings) || 0,
      },

      // Default order status for confirm endpoint (mapped via F_ORDER_STATUS_API)
      defaultOrderStatus: F_ORDER_STATUS_API[api.def_ord_status] || null,

      // Search options
      searchOptions: api.search_by || ['order id', 'table no', 'user id'],

      // Room Module V2 — Profile flags driving Room Check-In layout/visibility.
      // Additive per V2 §9.3 / §13.5 — do not rename or remove existing keys above.
      checkInFlags: {
        guestDetails: toBoolean(api.guest_details),
        bookingDetails: toBoolean(api.booking_details),
        showUserGst: toBoolean(api.show_user_gst),
        roomGstApplicable: toBoolean(api.room_gst_applicable),
        foodPriceWithPaisa: toBoolean(api.food_price_with_paisa),
        billDateFormat: api.bill_date_format || 'dd/MMM/yyyy hh:mm a',
      },

      // POS2-007 Phase 1 — pass-through ONLY (no FE consumer this CR).
      // Owner directive 2026-05-09: "do not use confirm_order_ringer,
      // tone_timing, voice_in_kds in FE logic". Exposed for any future
      // settings-page UI; do NOT add consumers without a new owner-approved CR.
      // confirm_order_ringer is already enforced backend-side (when "No",
      // backend skips FCM entirely → no FE handling needed).
      confirmOrderRinger: api.confirm_order_ringer || null,
      toneTiming: parseInt(api.tone_timing) || null,
      voiceInKds: toBoolean(api.voice_in_kds),
    };
  },

  /**
   * Transform payment types
   */
  paymentTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.name,
      displayName: type.display_name,
    }));
  },

  /**
   * Transform discount types
   */
  discountTypes: (apiTypes) => {
    if (!Array.isArray(apiTypes)) return [];
    return apiTypes.map((type) => ({
      id: type.id,
      name: type.discount_type || type.name || '',
      discountPercent: parseFloat(type.discount_percent) || 0,
    }));
  },

  /**
   * Transform printer configuration
   */
  printers: (apiPrinters) => {
    if (!Array.isArray(apiPrinters)) return [];
    return apiPrinters.map((printer) => ({
      id: printer.id,
      name: printer.printer_name,
      type: printer.printer_type,
      paperSize: printer.paper_size,
      categoryIds: printer.categories_id || [],
      isActive: toBoolean(printer.status),
    }));
  },

  /**
   * CR-POS2-003 (May-2026): Transform `print_agent` array into the canonical
   * `printerAgents` list used by orderService.printOrder + toAPI.placeOrder /
   * placeOrderWithPayment. Missing, non-array, or unusable entries → []. Each
   * row is normalised by `normalizePrinterAgent` (R-OWNER-1/3/4/5; OQ-PA-5/6).
   */
  printerAgents: (apiArray) => {
    if (!Array.isArray(apiArray)) return [];
    return apiArray.map(normalizePrinterAgent).filter(Boolean);
  },

  /**
   * Transform schedules (operating hours)
   */
  schedules: (apiSchedules) => {
    if (!Array.isArray(apiSchedules)) return [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return apiSchedules.map((schedule) => ({
      id: schedule.id,
      day: schedule.day,
      dayName: dayNames[schedule.day] || `Day ${schedule.day}`,
      openingTime: schedule.opening_time,
      closingTime: schedule.closing_time,
    }));
  },

  /**
   * Transform restaurant settings
   */
  settings: (apiSettings) => {
    if (!apiSettings) return {};
    return {
      isCoupon: toBoolean(apiSettings.settings?.is_coupon),
      isLoyalty: toBoolean(apiSettings.settings?.is_loyality),
      isCustomerWallet: toBoolean(apiSettings.settings?.is_customer_wallet),
      // aggregatorAutoKot is a backend-driven flag for aggregator (Zomato/Swiggy)
      // orders placed via webhook. Intentionally NOT wired into any client-side
      // place-order / collect-bill / KOT-checkbox flow. Surfaced here only so
      // the Settings page (ViewEditViews.jsx) can display and edit it.
      aggregatorAutoKot: toBoolean(apiSettings.aggregator_auto_kot),
      // CR-118: aggregator auto bill print + stage (Acknowledged or Ready)
      aggregatorAutoBill: toBoolean(apiSettings.aggregator_auto_bill),
      aggregatorAutoBillStage: (apiSettings.aggregator_auto_bill_stage || 'Ready').toLowerCase(), // 'acknowledged' | 'ready'
      // BUG-AUTOKOT-MAPPING (May-2026, REVISITED 2026-05-01): `autoKot` (in-house
      // Auto KOT) is exposed as `print_kot` at the restaurant ROOT — confirmed
      // against the live preprod API on 2026-05-01 (restaurant 478):
      //   restaurants[0].print_kot = "Yes"
      // The earlier May-2026 change to `apiSettings.autoKot` was based on a
      // mistaken assumption that the backend emits a camelCase key; no such
      // key exists on the response, so the alias resolved to `undefined` and
      // every consumer (cart KOT checkbox initial state, place-order payload
      // `print_kot` field) silently saw `false`. Restoring the correct
      // root-level snake_case path. Consumers (OrderEntry.jsx, KotBillCheckboxes,
      // CollectBillPanelDrawer) require no further change.
      autoKot:           toBoolean(apiSettings.print_kot),
      // BUG-AUTOBILL-MAPPING (May-2026, REVISITED 2026-05-01): `autoBill`
      // (in-house Auto Bill) is exposed as `billing_auto_bill_print` at the
      // restaurant ROOT — confirmed against the live preprod API on 2026-05-01:
      //   restaurants[0].billing_auto_bill_print = "Yes"
      // Same regression pattern as autoKot above. Restoring the correct
      // root-level snake_case path.
      autoBill:          toBoolean(apiSettings.billing_auto_bill_print),
      defaultPrepTime: parseInt(apiSettings.default_prep_time) || 15,
      // CR-109: Prep time bracket config for dynamic aggregator prep time computation
      prepTimeBonusConfig: (() => {
        const raw = apiSettings.settings?.prep_time_bonus_config ?? apiSettings.prep_time_bonus_config;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
        return [];
      })(),
      prepTimeCountMethod: apiSettings.settings?.prep_time_count_method ?? apiSettings.prep_time_count_method ?? 'quantity',
      // CR-109: Auto-accept toggle for aggregator orders
      autoPrepTimeAck: toBoolean(apiSettings.settings?.auto_prep_time_ack ?? apiSettings.auto_prep_time_ack),

      // POS2-007 Phase 1 — confirm-order tone selector (FE override consumer).
      // Value lives nested under `restaurants[0].settings.confirm_order_tone`
      // per live preprod payload (restaurant 478, 2026-05-09). Root-fallback
      // mirrors the deliveryChargeGstPct pattern at line 157 for safety on
      // tenants that may flatten the field. Mapped values: 'silent' /
      // 'default' / 'buzzer'. See utils/toneMapper.js for the FE consumer.
      confirmOrderTone: apiSettings.settings?.confirm_order_tone ?? apiSettings.confirm_order_tone ?? null,

      // POS2-007 Phase 1 — pass-through ONLY (no FE consumer this CR).
      // Owner directive 2026-05-09: "just put in transform don't map".
      // Exposed for any future settings-page UI; do NOT add a consumer
      // without a new owner-approved CR.
      aggregatorOrderTone: apiSettings.settings?.aggregator_order_tone ?? apiSettings.aggregator_order_tone ?? null,

      // BUG-144: Token number display/print gate. Backend field: settings.use_token ("Yes"/"No").
      // When true, OrderCard shows daily_token and print payloads include it.
      useToken: toBoolean(apiSettings.settings?.use_token),
      showScanPopup: toBoolean(apiSettings.settings?.show_scan_popup ?? 1), // CR-056: default ON (1 = enabled)
      // CR-148 BUG FIX: show_popular_category missing from boot transform — Popular tab was always hidden.
      // Dual path mirrors confirmOrderTone pattern (root fallback for tenants that flatten the field).
      showPopularCategory: toBoolean(apiSettings.show_popular_category ?? apiSettings.settings?.show_popular_category),
    };
  },
};

// =============================================================================
// Frontend → API (Request) - Phase 2
// =============================================================================
export const toAPI = {
  // Will be added in Phase 2 for update operations
};
