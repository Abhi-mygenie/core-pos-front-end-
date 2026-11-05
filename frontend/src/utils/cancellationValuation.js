// Cancellation Valuation — CR-031 (GO-3, 2026-06-11)
//
// ONE shared cancellation-truth module consumed by:
//   Cancellations report (S9) · Dashboard cancel tile · Items & Menu cancelled bucket
//
// Decisions: H18 (item-line value; discount verified zeroed 823/823) · H19 (partial =
// line value) · H20 (counting = qty) · H21 (Cancellations+Items by cancel_at; Ledger
// stays punch) · H22 (comp loss at `complementary_price`) · OPS-CANCEL (operations
// `order_cancel.previous_order_amount` when present, else line consolidation) ·
// BUG-125 (scope predicate, Merge guard upstream).
//
// Backend does NOT support sort_by='cancel_at' (live-verified 2026-06-11: success=false).
// Strategy: fetch created_at with CANCEL_LOOKBACK_DAYS lookback and client-filter by
// cancel_at. Max observed punch→cancel gap = 33 days (137 cross-day cases, 4 months,
// both restaurants) → 45-day lookback covers with margin.

export const CANCEL_LOOKBACK_DAYS = 45;

const num = (x) => parseFloat(x) || 0;

/** BUG-125 scope predicate (order-level cancel). Merge rows must be excluded upstream. */
export const isOrderCancelledScope = (ot = {}) => {
  const pm = (ot.payment_method || '').toLowerCase();
  return String(ot.f_order_status) === '3' || pm === 'cancel' || pm === 'cancelled';
};

/** Normalised cancel_at timestamp ('YYYY-MM-DD HH:MM:SS') or ''. */
export const getCancelAt = (line = {}) =>
  (line.cancel_at || '').replace('T', ' ').substring(0, 19);

/**
 * Value ONE cancelled line (H18/H19/H22).
 * Standard:  unit_price×qty + addons + variations − discount + serviceCharge + residual tax
 *            (discount/serviceCharge verified zeroed on cancelled lines — kept for audit parity)
 * Comp line: complementary_price × qty (billed keys zeroed by backend) + residual tax
 */
export const valueCancelledLine = (line = {}) => {
  const qty = num(line.quantity);
  const unitPrice = num(line.unit_price);
  const addonPrice = num(line.total_add_on_price);
  const variationPrice = num(line.total_variation_price);
  const discount = num(line.discount_on_food);
  const serviceCharge = num(line.service_charge);
  // VAT-FIX: gst_tax_amount = total tax (GST+VAT); derive pure GST
  const rawGst = num(line.gst_tax_amount);
  const vat = num(line.vat_tax_amount);
  const gst = rawGst - vat;
  const tax = gst + vat;
  const isComp = String(line.complementary) === '1' || line.complementary === 1;

  const itemTotal = isComp
    ? (num(line.complementary_price) || unitPrice) * qty // H22-KEY
    : unitPrice * qty + addonPrice + variationPrice;
  const subtotal = itemTotal - discount + serviceCharge;
  const value = subtotal + tax;

  return { qty, value, itemTotal, subtotal, discount, serviceCharge, gst, vat, tax, isComp };
};

/**
 * Value a fully-cancelled ORDER (OPS-CANCEL display rule).
 * operations[] `order_cancel.previous_order_amount` when present (>0) — note: amount is
 * tax-inclusive and captured at cancel time (known drifts vs line consolidation logged
 * in harness: 015756 1 vs 54 · 015772 210 vs 400). Else Σ line values.
 */
export const valueCancelledOrder = (wrapper = {}) => {
  const ops = wrapper.operations || [];
  const cancelOp = ops.find(
    (op) => (op.operation || '').toLowerCase() === 'order_cancel' && num(op.previous_order_amount) > 0
  );
  if (cancelOp) {
    return { value: num(cancelOp.previous_order_amount), source: 'ops_previous_order_amount' };
  }
  const lines = wrapper.order_details_table || [];
  const value = lines
    .filter((l) => String(l.food_status) === '3')
    .reduce((s, l) => s + valueCancelledLine(l).value, 0);
  return { value, source: 'line_consolidation' };
};

export default { CANCEL_LOOKBACK_DAYS, isOrderCancelledScope, getCancelAt, valueCancelledLine, valueCancelledOrder };
