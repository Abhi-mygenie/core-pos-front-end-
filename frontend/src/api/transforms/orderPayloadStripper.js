/**
 * orderPayloadStripper.js — CR-045
 *
 * TEMPORARY FE-SIDE OPTIMIZATION.
 * Backend will ship server-side field stripping in future.
 * When backend strips: set REACT_APP_STRIP_ORDERS=false in .env to disable.
 * Then remove this file entirely once backend strip is verified across all reports.
 *
 * Strips unused fields from order-logs-report API responses before
 * they enter React state or cache. Reduces payload ~68% (validated
 * against live API: 18.2 KB -> 5.8 KB per order).
 *
 * Field whitelists derived from DOC10 audit + live API validation
 * (cafe103 + Welcome Resort + Palm House, 2026-05/06).
 */

// Toggle: set REACT_APP_STRIP_ORDERS=false in .env to disable FE stripping
const STRIP_ENABLED = process.env.REACT_APP_STRIP_ORDERS !== 'false';

// === Field Whitelists (keep these, drop everything else) ===

const ORDERS_TABLE_KEEP = new Set([
  'id', 'restaurant_order_id', 'created_at', 'collect_bill', 'updated_at',
  'f_order_status', 'payment_method', 'payment_status', 'payment_type',
  'order_amount', 'order_in', 'order_type', 'order_from',
  'order_sub_total_amount', 'order_sub_total_without_tax',
  'delivery_charge', 'delivery_charge_gst', 'tip_amount', 'tip_tax_amount',
  'round_up', 'table_name', 'table_id', 'waiter_name', 'employee_name',
  'employee_id', 'restaurant_discount_amount', 'coupon_discount_amount',
  'coupon_code', 'cancellation_reason', 'cancel_at',
  'total_gst_tax_amount', 'total_vat_tax_amount', 'total_service_tax_amount',
  'service_gst_tax_amount', 'discount_value', 'order_discount',
  'order_discount_type', 'comunity_discount', 'discount_member_category',
  'user_id', 'user_name', 'cust_mobile', 'razorpay_order_id',
  'transaction_id', 'parent_order_id', 'payment_amount',
  'snapshot_razorpay_status', 'order_note', 'ready_at', 'serve_at',
  'loyalty_info', 'canceled_by',
  // DOUBT fields — kept for safety
  'order_status', 'total_tax_amount', 'cancel_state', 'waiter_id',
  'print_bill_status', 'print_kot', 'scheduled', 'schedule_at',
  // reportTransform fallback chain fields (may be absent in API but referenced)
  'cust_email', 'user_email', 'user_phone', 'phone',
  'order_plateform', 'order_platform',
  'gst_tax', 'vat_tax', 'service_tax',
  'transection_id',
]);

const ITEMS_KEEP = new Set([
  'id', 'food_id', 'food_details', 'food_status', 'quantity', 'unit_price',
  'price', 'station', 'station_name', 'variation', 'add_ons', 'food_level_notes',
  'cancel_at', 'cancel_by', 'cancel_by_name', 'cancel_type', 'cancel_reason_text',
  'complementary', 'complementary_price', 'gst_tax_amount', 'vat_tax_amount',
  'discount_amount', 'service_charge', 'ready_at', 'ready_by',
  'serve_at', 'serve_by', 'created_at', 'item_type',
  'total_add_on_price', 'total_variation_price', 'discount_on_food',
  // DOUBT fields
  'reason_type',
]);

const FOOD_DETAILS_KEEP = new Set([
  'id', 'name', 'category_id', 'tax', 'tax_type', 'tax_calc', 'veg',
]);

const OPS_KEEP = new Set([
  'operation', 'created_at', 'previous_order_amount',
  'previous_payment_method', 'current_payment_method',
  'vendor_employee_name', 'food_id', 'restaurant_order_id',
]);

/** Pick only whitelisted keys from an object */
const pick = (obj, keyset) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of keyset) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
};

/** Strip food_details blob to 7 fields. Preserves original format (string->string, object->object). */
const stripFoodDetails = (fd) => {
  if (!fd) return fd;
  if (typeof fd === 'string') {
    try {
      const parsed = JSON.parse(fd);
      return JSON.stringify(pick(parsed, FOOD_DETAILS_KEEP));
    } catch { return fd; }
  }
  return pick(fd, FOOD_DETAILS_KEEP);
};

/** Strip a single order wrapper to only used fields. */
const _stripOrder = (orderWrapper) => {
  if (!orderWrapper) return orderWrapper;
  return {
    orders_table: pick(orderWrapper.orders_table, ORDERS_TABLE_KEEP),
    order_details_table: (orderWrapper.order_details_table || []).map(item => ({
      ...pick(item, ITEMS_KEEP),
      food_details: stripFoodDetails(item.food_details),
    })),
    operations: (orderWrapper.operations || []).map(op => pick(op, OPS_KEEP)),
    partial_payments: orderWrapper.partial_payments,
    room_info: orderWrapper.room_info,
    customer_details: orderWrapper.customer_details,
    order_info: orderWrapper.order_info,
    associated_orders: orderWrapper.associated_orders,
  };
};

/** Public API — strip a single order. Passthrough when disabled. */
export const stripOrder = (orderWrapper) => STRIP_ENABLED ? _stripOrder(orderWrapper) : orderWrapper;

/** Strip an array of order wrappers. Passthrough when disabled. */
export const stripOrders = (orders) => {
  if (!STRIP_ENABLED) return orders;
  if (!Array.isArray(orders)) return orders;
  return orders.map(_stripOrder);
};
