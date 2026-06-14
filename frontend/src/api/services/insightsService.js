// Insights Service — CR-011 Reports Module
// 
// Provides aggregation helpers for the new Insights module. Each helper
// fetches raw data via the existing endpoints, joins menu master + categories,
// and returns a denormalised row-set suitable for direct table rendering.
//
// IMPORTANT: this service is intentionally separate from `reportService.js`
// to avoid touching any logic powering the existing Audit Report. The
// existing `getOrderLogsReport` only supports single-day fetches; here we
// hit `/order-logs-report` directly with multi-day range (verified working
// on preprod 2026-06-01).

import api from '../axios';
import { API_ENDPOINTS } from '../constants';
import { stripOrders } from '../transforms/orderPayloadStripper';
import { buildCacheKey, fetchOrReuse } from './insightsCache';
import { getBusinessDayRange, isWithinBusinessDay } from '../../utils/businessDay';
import { classifyPaymentMethod, CREDIT_GROUP } from '../../utils/paymentClassifier';
import { getTabSettlementsForRange } from './orderLedgerService';
import {
  CANCEL_LOOKBACK_DAYS, isOrderCancelledScope, getCancelAt,
  valueCancelledLine, valueCancelledOrder,
} from '../../utils/cancellationValuation';

const addDaysISO = (dateStr, n) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * CR-011 S2 / Item Sales (core, aggregated).
 *
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate   - YYYY-MM-DD
 * @param {string} sortBy   - 'collect_bill' (paid-date attribution, default)
 *                          | 'created_at'   (punched-date attribution)
 *                          | 'cancel_at'    (cancelled-date attribution; client-side filter on
 *                                            line.cancel_at — server is fetched with created_at)
 * @returns {Promise<{ rows: Array, meta: Object }>}
 */
export const getItemSalesAggregated = async (fromDate, toDate, sortBy = 'collect_bill', schedules = [], restaurantId = 0) => {
  // CR-031 (GO-3): backend does NOT support sort_by='cancel_at' (live-verified).
  // Cancelled bucket is ALWAYS attributed by line cancel_at — fetch widens by
  // CANCEL_LOOKBACK_DAYS (+1 tail) so cross-month cancels (max observed gap 33d) land.
  const serverSortBy = sortBy === 'cancel_at' ? 'created_at' : sortBy;

  // Parallel fetch: orders (cached), products, categories, cancellation reasons
  const [orders, productsResp, categoriesResp, cancelReasonsResp] = await Promise.all([
    fetchOrReuse(
      buildCacheKey(restaurantId, 'order-logs', serverSortBy, addDaysISO(fromDate, -CANCEL_LOOKBACK_DAYS), addDaysISO(toDate, 1)),
      async () => {
        const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, {
          sort_by: serverSortBy,
          from_date: addDaysISO(fromDate, -CANCEL_LOOKBACK_DAYS),
          to_date: addDaysISO(toDate, 1),
        });
        const data = stripOrders(resp.data?.order || []);
        return { data, orderCount: data.length };
      }
    ),
    api.get(API_ENDPOINTS.PRODUCTS, { params: { limit: 10000, offset: 1, type: 'all' } }),
    api.get(API_ENDPOINTS.CATEGORIES),
    api.get(API_ENDPOINTS.CANCELLATION_REASONS, { params: { limit: 100, offset: 1 } }).catch(() => ({ data: {} })),
  ]);

  const products = productsResp.data?.products || [];
  const categories = Array.isArray(categoriesResp.data) ? categoriesResp.data : [];
  const cancelReasons = cancelReasonsResp.data?.reasons || [];

  // Business-day boundary filter (aligns with S9/S6 pattern)
  const { start: dayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dayEnd } = getBusinessDayRange(toDate, schedules);
  const isOrderInPunchRange = (ot) => {
    const ca = (ot.created_at || '').replace('T', ' ').substring(0, 19);
    if (!ca) return false;
    if (fromDate === toDate) return isWithinBusinessDay(ca, dayStart, dayEnd);
    return ca >= dayStart && ca <= dayEnd;
  };
  // CR-031: cancelled lines gate by cancel_at business window
  const isCancelInRange = (ts) => {
    if (!ts) return false;
    if (fromDate === toDate) return isWithinBusinessDay(ts, dayStart, dayEnd);
    return ts >= dayStart && ts <= dayEnd;
  };
  // Lookback orders (punched before range) contribute ONLY their cancelled lines.
  const filteredOrders = orders.filter((o) => {
    const ot = o.orders_table || {};
    // Exclude merged orders — empty shells, not real orders
    if ((ot.payment_method || '').toLowerCase() === 'merge') return false;
    return true;
  });

  // Lookups
  const cancelReasonById = new Map(cancelReasons.map((r) => [r.id, r.reason]));

  // Lookups
  const productById = new Map(products.map((p) => [p.id, p]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  // Aggregate item lines by food_id
  const itemMap = new Map();
  let totalLines = 0;

  // Per-item drill-down data: order lines, variations, addons, cancellations
  const drillMap = new Map();

  for (const wrapper of filteredOrders) {
    const items = wrapper.order_details_table || [];
    const ot = wrapper.orders_table || {};
    const orderId = ot.restaurant_order_id || ot.id || '';
    const orderDate = ot.created_at || '';
    const waiterName = ot.waiter_name || '—';
    // @audit:rule id="FE-56" name="Sold Items gate: f_order_status === 6"
    //   explains="A line counts as 'sold' only if the parent order has f_order_status=6 (delivered/paid). Orders with status 2/5/etc are excluded from Sold and go to Pending Billing."
    //   approved=true approvedDate="2026-06-03" approvedSource="Owner chat directive 2026-06-03"
    const orderFStatus = String(ot.f_order_status || '');
    const isOrderPaid = orderFStatus === '6';
    // CR-034 (GO-3): TAB parent → lines belong to the Credit bucket, not Sold
    const isTabParent = (ot.payment_method || '').toLowerCase() === 'tab';
    // CR-031 (GO-3): punch-range membership decides non-cancelled buckets
    const orderInRange = isOrderInPunchRange(ot);

    // Order-level charges (not distributed to item lines by backend)
    const orderDeliveryCharge = parseFloat(ot.delivery_charge) || 0;
    const orderTipAmount = parseFloat(ot.tip_amount) || 0;
    const orderRoundOff = parseFloat(ot.round_up) || 0;    // BUG-126: real API field (round_off does not exist)
    const orderLevelCharges = orderDeliveryCharge + orderTipAmount + orderRoundOff;

    // Pass 1: process all lines, collect sold-line revenue for proportional split
    let orderSoldLineRevenue = 0;
    const orderLineData = [];

    for (const line of items) {
      totalLines += 1;
      const foodId = line.food_id;
      if (!foodId) continue;

      // Parse food_details (it's a JSON string in the API response)
      let fd = {};
      try {
        fd = typeof line.food_details === 'string' ? JSON.parse(line.food_details) : (line.food_details || {});
      } catch (e) {
        fd = {};
      }

      // BUG-133: Skip "check in" marker items — room tariff disguised as food item.
      if ((fd.name || '').trim().toLowerCase() === 'check in') continue;

      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.price) || 0;
      const unitPrice = parseFloat(line.unit_price) || 0;
      // VAT-FIX (2026-06-06): gst_tax_amount holds total tax for the item (GST+VAT).
      // vat_tax_amount holds the VAT subset. Derive pure GST by subtracting.
      const rawGst = parseFloat(line.gst_tax_amount) || 0;
      const vat = parseFloat(line.vat_tax_amount) || 0;
      const gst = rawGst - vat;  // Pure GST
      // @audit:rule id="FE-51" name="Discount source = discount_on_food (per-line allocated discount)"
      //   explains="Backend allocates order-level restaurant_discount proportionally across lines into discount_on_food. The legacy field discount_amount is always ₹0 and unused. discount_on_food is the actual discount applied to this line before tax computation."
      //   approved=true approvedDate="2026-06-02" approvedSource="Owner chat directive 2026-06-02"
      const discount = parseFloat(line.discount_on_food) || 0;
      const serviceCharge = parseFloat(line.service_charge) || 0;
      const addonPrice = parseFloat(line.total_add_on_price) || 0;
      const variationPrice = parseFloat(line.total_variation_price) || 0;
      // @audit:rule id="FE-53" name="Item Total = unit_price × qty + addon + variation"
      //   explains="Item Total represents the full line value before discount. Uses unit_price from order log (not product API) × quantity + total_add_on_price + total_variation_price. Backend price field is inconsistent (sometimes includes addons, sometimes not), so we compute from components."
      //   approved=false approvedDate="" approvedSource=""
      let itemTotal = unitPrice * qty + addonPrice + variationPrice;
      // @audit:rule id="FE-54" name="Subtotal = Item Total − Discount + Service Charge"
      //   explains="Subtotal is the taxable base. Backend computes GST on this amount. Tips and delivery charge excluded (order-level only)."
      //   approved=false approvedDate="" approvedSource=""
      let subtotal = itemTotal - discount + serviceCharge;
      // @audit:rule id="FE-07" name="Tax aggregation formula"
      //   explains="Per-line tax = pure GST + pure VAT (after VAT-FIX: gst = gst_tax_amount − vat_tax_amount, no double-count)."
      //   approved=false approvedDate="" approvedSource=""
      const tax = gst + vat;
      // @audit:rule id="FE-55" name="Total Revenue = Subtotal + Tax"
      //   explains="Total Revenue is what was actually collected for this line: subtotal (taxable base) + tax. This is the final amount the customer paid for this line item."
      //   approved=false approvedDate="" approvedSource=""
      let totalRevenue = subtotal + tax;
      // @audit:rule id="FE-17" name="Cancelled-no-tax-field audit exemption"
      //   explains="Detect whether backend booked ANY tax field on this line. Used downstream by the audit engine to mark cancelled-line buckets as EXEMPT when no tax claim exists."
      //   approved=true approvedDate="2026-06-02" approvedSource="Owner chat directive 2026-06-02 — cancelled no-tax-field → light-green sort-bottom"
      const hasTaxField =
        line.gst_tax_amount !== undefined && line.gst_tax_amount !== null && line.gst_tax_amount !== '' ||
        line.vat_tax_amount !== undefined && line.vat_tax_amount !== null && line.vat_tax_amount !== '';
      const bothTaxesOnLine = gst > 0 && vat > 0;
      // @audit:rule id="FE-08" name="Cancelled-line detection"
      //   explains="Line is cancelled iff food_status === '3' (string)."
      //   approved=false approvedDate="" approvedSource=""
      const isCancelled = String(line.food_status) === '3';
      // @audit:rule id="FE-09" name="Complementary-line detection"
      //   explains="Line is complementary iff complementary === '1' OR === 1."
      //   approved=false approvedDate="" approvedSource=""
      const isComplementary = String(line.complementary) === '1' || line.complementary === 1;
      // H22-KEY (GO-3): comp lines (incl. comp-cancel) valued at complementary_price × qty
      // (billed keys zeroed by backend — complementary_price holds the menu value)
      if (isComplementary) {
        const compPrice = parseFloat(line.complementary_price || 0) || unitPrice;
        itemTotal = compPrice * qty;
        subtotal = itemTotal - discount + serviceCharge;
        totalRevenue = subtotal + tax;
      }
      // @audit:rule id="FE-57" name="Pending Billing bucket: f_order_status !== 6"
      //   explains="Non-cancelled, non-comp lines from orders with f_order_status !== 6 go to Pending Billing."
      //   approved=true approvedDate="2026-06-03" approvedSource="Owner chat directive 2026-06-03"
      // CR-034 (GO-3): precedence Cancelled → Comp → Credit (parent pm='TAB') → Sold → Pending
      const isCredit = !isCancelled && !isComplementary && isTabParent;
      const isSold = !isCancelled && !isComplementary && !isTabParent && isOrderPaid;
      const isPending = !isCancelled && !isComplementary && !isTabParent && !isOrderPaid;

      // CR-031 (GO-3): ONE cancellation truth — cancelled lines attributed by cancel_at
      // business window; non-cancelled lines only from punch-range orders (lookback
      // orders exist solely to surface their cross-month cancels).
      if (isCancelled) {
        if (!isCancelInRange(getCancelAt(line))) continue;
      } else if (!orderInRange) {
        continue;
      }

      const product = productById.get(foodId);
      // @audit:rule id="FE-11" name="menuPrice fallback chain"
      //   explains="menuPrice = product.price → line.complementary_price → line.unit_price (first non-zero wins)."
      //   approved=false approvedDate="" approvedSource=""
      const menuPrice = parseFloat(product?.price) || parseFloat(line.complementary_price || 0) || unitPrice;

      // Read product-config tax (for audit's expected-tax calculation)
      // @audit:rule id="FE-23" name="tax_rate fallback chain"
      //   explains="taxRate = parseFloat(fd.tax) → parseFloat(product.tax) → 0. Zero means any actual tax > 0 will AMBER-flag."
      //   approved=false approvedDate="" approvedSource=""
      const taxRate = parseFloat(fd.tax) || parseFloat(product?.tax) || 0;
      // @audit:rule id="FE-21" name="tax_type fallback chain"
      //   explains="taxType = fd.tax_type → product.tax_type → (vat>0 ? 'VAT' : 'GST'). Auto-classifies when product silent."
      //   approved=false approvedDate="" approvedSource=""
      const taxType = fd.tax_type || product?.tax_type || (vat > 0 ? 'VAT' : 'GST');
      // @audit:rule id="FE-22" name="tax_calc fallback chain"
      //   explains="taxCalc = fd.tax_calc → product.tax_calc → 'Exclusive'. Assumes Exclusive when product silent."
      //   approved=false approvedDate="" approvedSource=""
      const taxCalc = fd.tax_calc || product?.tax_calc || 'Exclusive';

      // --- Drill-down detail collection (S3) ---
      if (!drillMap.has(foodId)) {
        drillMap.set(foodId, { orderLines: [], variations: new Map(), addons: new Map(), cancels: [], driftLines: [] });
      }
      const drill = drillMap.get(foodId);

      // @audit:rule id="FE-36" name="Drill line status priority"
      //   explains="cancelled → comp → served. Mixed-classifier lines resolve to cancelled first."
      //   approved=false approvedDate="" approvedSource=""
      const status = isCancelled ? 'cancelled' : isComplementary ? 'comp' : 'served';
      drill.orderLines.push({
        orderId: `#${orderId}`,
        date: orderDate,
        qty,
        price: Math.round(totalRevenue),
        discount: Math.round(discount),
        status,
        waiter: waiterName,
      });

      // Parse and aggregate variations
      let variations = [];
      try {
        const raw = typeof line.variation === 'string' ? JSON.parse(line.variation) : (line.variation || []);
        variations = Array.isArray(raw) ? raw : [];
      } catch (_e) { /* skip */ }
      for (const v of variations) {
        const label = v.label || v.name || v.group || 'Unknown';
        const existing = drill.variations.get(label);
        if (existing) {
          existing.qty += qty;
          existing.revenue += Math.round(totalRevenue);
        } else {
          drill.variations.set(label, { label, qty, revenue: Math.round(totalRevenue) });
        }
      }

      // Parse and aggregate addons
      let addons = [];
      try {
        const raw = typeof line.add_ons === 'string' ? JSON.parse(line.add_ons) : (line.add_ons || []);
        addons = Array.isArray(raw) ? raw : [];
      } catch (_e) { /* skip */ }
      // @audit:rule id="FE-34" name="Addon revenue formula"
      //   explains="Addon revenue contribution = addonPrice × qty (parent item qty)."
      //   approved=false approvedDate="" approvedSource=""
      for (const a of addons) {
        const name = a.name || 'Unknown Addon';
        const addonPrice = parseFloat(a.price) || 0;
        const existingAddon = drill.addons.get(name);
        if (existingAddon) {
          existingAddon.count += 1;
          existingAddon.revenue += Math.round(addonPrice * qty);
        } else {
          drill.addons.set(name, { name, count: 1, revenue: Math.round(addonPrice * qty) });
        }
      }

      // Collect cancellation details
      // reason_type (ID) → lookup = the cancellation reason
      // cancel_reason_text = extra notes by staff
      if (isCancelled) {
        const reason = line.reason_type ? (cancelReasonById.get(line.reason_type) || '') : '';
        const orderReason = ot.cancellation_reason || '';
        const notes = line.cancel_reason_text || '';
        // @audit:rule id="FE-35" name="Cancel-scope derivation (item vs order)"
        //   explains="scope='order' iff line has no reason_type AND parent order has cancellation_reason; else scope='item'."
        //   approved=false approvedDate="" approvedSource=""
        const isOrderLevelCancel = !reason && !!orderReason;
        drill.cancels.push({
          reason: reason || orderReason || '',
          notes,
          type: line.cancel_type || '—',
          by: line.cancel_by_name || '—',
          scope: isOrderLevelCancel ? 'order' : 'item',
        });
      }

      // @audit:rule id="FE-58" name="Drift investigation: retain per-line order details for drift lines"
      //   explains="When a line has |actual_tax - expected_tax| > tolerance, save order details into driftLines[] for the Audit tab Investigate button."
      //   approved=true approvedDate="2026-06-03" approvedSource="Owner chat directive 2026-06-03"
      // @audit:rule id="FE-61" name="GST NOT CONFIGURED exemption policy"
      //   explains="Items added on May 22 (food_ids: 176906,177448,181573,181574,181622,182021,187051,189443,190676,190677) were created without GST. Drift from these items is tagged GST_NOT_CONFIGURED and rendered green/exempt."
      //   approved=true approvedDate="2026-06-04" approvedSource="Owner chat directive 2026-06-04 — mark them green in audit under new policy"
      if (!isCancelled) {
        const _rate = parseFloat(fd.tax) || parseFloat(product?.tax) || 0;
        const _calc = fd.tax_calc || product?.tax_calc || 'Exclusive';
        const _expected = _rate > 0 && subtotal > 0
          ? (_calc === 'Inclusive' ? subtotal - (subtotal / (1 + _rate / 100)) : subtotal * (_rate / 100))
          : 0;
        const _drift = Math.round((tax - _expected) * 100) / 100;
        if (Math.abs(_drift) > 0.02) {
          const bucket = isCancelled ? 'cancelled' : isComplementary ? 'comp' : isCredit ? 'credit' : isPending ? 'pending' : 'sold';
          // FE-61: May-22 items exemption — items created without GST configured
          const GST_NOT_CONFIGURED_IDS = new Set([176906,177448,181573,181574,181622,182021,187051,189443,190676,190677]);
          const isGstNotConfigured = GST_NOT_CONFIGURED_IDS.has(foodId);
          // Root cause classification (sold bucket only)
          let rootCause = 'OTHER';
          if (bucket === 'sold') {
            if (isGstNotConfigured) rootCause = 'GST_NOT_CONFIGURED';
            else if (_drift > 0) rootCause = 'OVER_TAXED';
            else rootCause = 'TAX_NOT_COMPUTED';
          }
          drill.driftLines.push({
            orderId: `#${orderId}`,
            date: orderDate,
            employee: waiterName,
            payment: ot.payment_method || '',
            table: ot.table_name || '',
            bucket,
            qty,
            unitPrice,
            subtotal: Math.round(subtotal * 100) / 100,
            expectedTax: Math.round(_expected * 100) / 100,
            actualTax: Math.round(tax * 100) / 100,
            drift: _drift,
            taxRate: _rate,
            foodId,
            rootCause,
          });
        }
      }

      // Build or update aggregate
      const existing = itemMap.get(foodId);
      if (existing) {
        existing.qtySold += isSold ? qty : 0;
        existing.qtyCancelled += isCancelled ? qty : 0;
        existing.qtyComplementary += (isComplementary && !isCancelled) ? qty : 0;
        existing.qtyCredit += isCredit ? qty : 0;
        existing.qtyPending += isPending ? qty : 0;

        // Per-bucket: itemTotal, discount, serviceCharge, subtotal, tax, totalRevenue
        if (isCancelled) {
          existing.itemTotalCancelled     += itemTotal;
          existing.discountCancelled      += discount;
          existing.serviceChargeCancelled += serviceCharge;
          existing.subtotalCancelled      += subtotal;
          existing.taxCancelled           += tax;
          existing.totalRevenueCancelled  += totalRevenue;
        } else if (isComplementary) {
          existing.itemTotalComplementary     += itemTotal;
          existing.discountComplementary      += discount;
          existing.serviceChargeComplementary += serviceCharge;
          existing.subtotalComplementary      += subtotal;
          existing.taxComplementary           += tax;
          existing.totalRevenueComplementary  += totalRevenue;
        } else if (isCredit) {
          existing.itemTotalCredit     += itemTotal;
          existing.discountCredit      += discount;
          existing.serviceChargeCredit += serviceCharge;
          existing.subtotalCredit      += subtotal;
          existing.taxCredit           += tax;
          existing.totalRevenueCredit  += totalRevenue;
        } else if (isPending) {
          existing.itemTotalPending     += itemTotal;
          existing.discountPending      += discount;
          existing.serviceChargePending += serviceCharge;
          existing.subtotalPending      += subtotal;
          existing.taxPending           += tax;
          existing.totalRevenuePending  += totalRevenue;
        } else {
          existing.itemTotalSold     += itemTotal;
          existing.discountSold      += discount;
          existing.serviceChargeSold += serviceCharge;
          existing.subtotalSold      += subtotal;
          existing.taxSold           += tax;
          existing.totalRevenueSold  += totalRevenue;
        }

        // Per-bucket bothTaxesBooked flag — RED audit trigger
        if (bothTaxesOnLine) {
          if (isCancelled)         existing.bothTaxesBooked_cancelled = true;
          else if (isComplementary) existing.bothTaxesBooked_comp    = true;
          else if (isCredit)       existing.bothTaxesBooked_credit   = true;
          else if (isPending)      existing.bothTaxesBooked_pending  = true;
          else                     existing.bothTaxesBooked_sold     = true;
        }

        // Per-bucket hasTaxField flag — FE-17 EXEMPT trigger (sticky: true if ANY line had a tax field)
        if (hasTaxField) {
          if (isCancelled)         existing.hasTaxField_cancelled = true;
          else if (isComplementary) existing.hasTaxField_comp     = true;
          else if (isCredit)       existing.hasTaxField_credit    = true;
          else if (isPending)      existing.hasTaxField_pending   = true;
          else                     existing.hasTaxField_sold      = true;
        }
      } else {
        const fdName = fd.name || product?.name || `Item #${foodId}`;
        const station = line.station || product?.station_name || '—';
        const categoryId = fd.category_id || product?.category_id;
        const categoryName = categoryById.get(categoryId)?.name || (categoryId ? `#${categoryId}` : '—');
        const veg = fd.veg ?? product?.veg;

        itemMap.set(foodId, {
          foodId,
          name: fdName,
          category: categoryName,
          station,
          veg: veg === 1 || veg === '1' || veg === true,
          taxRate, taxType, taxCalc,
          bothTaxesBooked_sold:      isSold && bothTaxesOnLine,
          bothTaxesBooked_cancelled: isCancelled && bothTaxesOnLine,
          bothTaxesBooked_comp:      isComplementary && bothTaxesOnLine,
          bothTaxesBooked_credit:    isCredit && bothTaxesOnLine,
          bothTaxesBooked_pending:   isPending && bothTaxesOnLine,
          hasTaxField_sold:      isSold && hasTaxField,
          hasTaxField_cancelled: isCancelled && hasTaxField,
          hasTaxField_comp:      isComplementary && hasTaxField,
          hasTaxField_credit:    isCredit && hasTaxField,
          hasTaxField_pending:   isPending && hasTaxField,
          qtySold:           isSold ? qty : 0,
          qtyCancelled:      isCancelled ? qty : 0,
          qtyComplementary:  (isComplementary && !isCancelled) ? qty : 0,
          qtyCredit:         isCredit ? qty : 0,
          qtyPending:        isPending ? qty : 0,
          // Per-bucket columns: itemTotal, discount, serviceCharge, subtotal, tax, totalRevenue
          itemTotalSold:            isSold          ? itemTotal : 0,
          itemTotalCancelled:       isCancelled     ? itemTotal : 0,
          itemTotalComplementary:   isComplementary ? itemTotal : 0,
          itemTotalCredit:          isCredit        ? itemTotal : 0,
          itemTotalPending:         isPending       ? itemTotal : 0,
          discountSold:             isSold          ? discount : 0,
          discountCancelled:        isCancelled     ? discount : 0,
          discountComplementary:    isComplementary ? discount : 0,
          discountCredit:           isCredit        ? discount : 0,
          discountPending:          isPending       ? discount : 0,
          serviceChargeSold:        isSold          ? serviceCharge : 0,
          serviceChargeCancelled:   isCancelled     ? serviceCharge : 0,
          serviceChargeComplementary: isComplementary ? serviceCharge : 0,
          serviceChargeCredit:      isCredit        ? serviceCharge : 0,
          serviceChargePending:     isPending       ? serviceCharge : 0,
          subtotalSold:             isSold          ? subtotal : 0,
          subtotalCancelled:        isCancelled     ? subtotal : 0,
          subtotalComplementary:    isComplementary ? subtotal : 0,
          subtotalCredit:           isCredit        ? subtotal : 0,
          subtotalPending:          isPending       ? subtotal : 0,
          taxSold:                  isSold          ? tax : 0,
          taxCancelled:             isCancelled     ? tax : 0,
          taxComplementary:         isComplementary ? tax : 0,
          taxCredit:                isCredit        ? tax : 0,
          taxPending:               isPending       ? tax : 0,
          totalRevenueSold:         isSold          ? totalRevenue : 0,
          totalRevenueCancelled:    isCancelled     ? totalRevenue : 0,
          totalRevenueComplementary: isComplementary ? totalRevenue : 0,
          totalRevenueCredit:       isCredit        ? totalRevenue : 0,
          totalRevenuePending:      isPending       ? totalRevenue : 0,
        });
      }

      // Track sold/credit lines for order-level charge distribution (Pass 2)
      // CR-034: TAB orders' charges flow into the Credit bucket, not Sold
      if ((isSold || isCredit) && totalRevenue > 0) {
        orderSoldLineRevenue += totalRevenue;
        orderLineData.push({ foodId, totalRevenue, isCredit });
      }
    }

    // Pass 2: Distribute order-level charges (delivery + tips + round-off) proportionally to sold items
    if (orderLevelCharges !== 0 && orderSoldLineRevenue > 0 && orderLineData.length > 0) {
      for (const ld of orderLineData) {
        const share = ld.totalRevenue / orderSoldLineRevenue;
        const distributed = orderLevelCharges * share;
        const entry = itemMap.get(ld.foodId);
        if (entry) {
          if (ld.isCredit) entry.totalRevenueCredit += distributed; // CR-034
          else entry.totalRevenueSold += distributed;
        }
      }
    }
  }

  // Compute avgSalePrice per item + attach drill-down data
  const rows = Array.from(itemMap.values()).map((r) => {
    const drill = drillMap.get(r.foodId);
    // @audit:rule id="FE-32" name="Drill panel keeps max 20 most-recent order lines"
    //   explains="Drill side-sheet displays at most 20 order lines per item, sorted by date desc. Older lines truncated."
    //   approved=false approvedDate="" approvedSource=""
    const orderLines = drill
      ? drill.orderLines.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 20)
      : [];
    // Variations as sorted array
    const variations = drill ? Array.from(drill.variations.values()).sort((a, b) => b.qty - a.qty) : [];
    // @audit:rule id="FE-33" name="Addon attach-rate formula"
    //   explains="rate = round((addonCount / totalSoldLines) × 100). totalSoldLines = served-status lines for parent item."
    //   approved=false approvedDate="" approvedSource=""
    const totalSoldLines = orderLines.filter(l => l.status === 'served').length || 1;
    const addons = drill
      ? Array.from(drill.addons.values()).map(a => ({
          ...a,
          rate: Math.round((a.count / Math.max(totalSoldLines, 1)) * 100),
        })).sort((a, b) => b.count - a.count)
      : [];
    // Aggregate cancel reasons (keyed by reason + scope to distinguish item vs order)
    const cancelMap = new Map();
    if (drill) {
      for (const c of drill.cancels) {
        const key = `${c.reason}::${c.scope}`;
        const ex = cancelMap.get(key);
        if (ex) {
          ex.count += 1;
          if (c.notes && !ex.notesList.includes(c.notes)) ex.notesList.push(c.notes);
        } else {
          cancelMap.set(key, { ...c, count: 1, notesList: c.notes ? [c.notes] : [] });
        }
      }
    }
    const cancels = Array.from(cancelMap.values()).sort((a, b) => b.count - a.count);

    return {
      ...r,
      // @audit:rule id="FE-13" name="avgPrice = totalRevenue / qty (actual collected per unit)"
      //   explains="REJECTED old formula (unitPriceSum/lineCount). Now: totalRevenue/qty = actual avg revenue collected per unit including addons, variations, service charge, and tax."
      //   approved=false approvedDate="" approvedSource="REJECTED 2026-06-02"
      avgPriceSold:          r.qtySold          > 0 ? r.totalRevenueSold          / r.qtySold          : 0,
      avgPriceCancelled:     r.qtyCancelled     > 0 ? r.totalRevenueCancelled     / r.qtyCancelled     : 0,
      avgPriceComplementary: r.qtyComplementary > 0 ? r.totalRevenueComplementary / r.qtyComplementary : 0,
      avgPricePending:       r.qtyPending       > 0 ? r.totalRevenuePending       / r.qtyPending       : 0,
      avgPriceCredit:        r.qtyCredit        > 0 ? r.totalRevenueCredit        / r.qtyCredit        : 0,
      drill: { orderLines, variations, addons, cancels, driftLines: drill ? drill.driftLines : [] },
    };
  });

  // Meta totals (sold only)
  const totalRevSold = rows.reduce((sum, r) => sum + r.totalRevenueSold, 0);
  const totalItems = rows.reduce((sum, r) => sum + r.qtySold, 0);
  const totalItemsCancelled = rows.reduce((sum, r) => sum + r.qtyCancelled, 0);
  const totalItemsComplementary = rows.reduce((sum, r) => sum + r.qtyComplementary, 0);
  const totalItemsPending = rows.reduce((sum, r) => sum + r.qtyPending, 0);
  const totalRevenuePending = rows.reduce((sum, r) => sum + r.totalRevenuePending, 0);
  const totalItemsCredit = rows.reduce((sum, r) => sum + r.qtyCredit, 0);          // CR-034
  const totalRevenueCredit = rows.reduce((sum, r) => sum + r.totalRevenueCredit, 0); // CR-034

  return {
    rows,
    meta: {
      totalOrders: orders.length,
      totalLines,
      totalItems,
      totalItemsCancelled,
      totalItemsComplementary,
      totalItemsPending,
      totalRevenueSold: totalRevSold,
      totalRevenuePending,
      totalItemsCredit,
      totalRevenueCredit,
      productCount: products.length,
      categoryCount: categories.length,
      sortBy,
    },
  };
};

/**
 * CR-011 S0 / Dashboard Aggregated.
 *
 * Single fetch to /order-logs-report, derives all 8 dashboard tiles from the response.
 *
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate   - YYYY-MM-DD
 * @returns {Promise<Object>} tiles object
 */
export const getDashboardAggregated = async (fromDate, toDate, schedules = [], restaurantId = 0) => {
  // BUG-128 (GO-1, H4): single created_at fetch for punch-dated tiles.
  // CR-030 (GO-2): separate collect_bill fetch (to+1 for the 00:00–03:00 tail)
  // drives the REVENUE tiles (Net Sales / Channel / Payment mix) by collection date.
  // BUG-127 (GO-2, R2-AMEND): restaurant-tap-summary → Credit Outstanding tile.
  // CR-031 (GO-3): dedicated cancel fetch with CANCEL_LOOKBACK_DAYS (+1 tail) —
  // cancel tile attributed by cancel_at, shared valuation ≡ Cancellations report.
  const [orders, collectOrders, cancelDataOrders, cancelReasonsResp, tapResp, tabSettlements] = await Promise.all([
    fetchOrReuse(
      buildCacheKey(restaurantId, 'order-logs', 'created_at', fromDate, toDate),
      async () => {
        const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: 'created_at', from_date: fromDate, to_date: toDate });
        const data = stripOrders(resp.data?.order || []);
        return { data, orderCount: data.length };
      }
    ),
    fetchOrReuse(
      buildCacheKey(restaurantId, 'order-logs', 'collect_bill', fromDate, addDaysISO(toDate, 1)),
      async () => {
        const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: 'collect_bill', from_date: fromDate, to_date: addDaysISO(toDate, 1) });
        const data = stripOrders(resp.data?.order || []);
        return { data, orderCount: data.length };
      }
    ),
    fetchOrReuse(
      buildCacheKey(restaurantId, 'order-logs', 'created_at', addDaysISO(fromDate, -CANCEL_LOOKBACK_DAYS), addDaysISO(toDate, 1)),
      async () => {
        const resp = await api.post(API_ENDPOINTS.ORDER_LOGS_REPORT, { sort_by: 'created_at', from_date: addDaysISO(fromDate, -CANCEL_LOOKBACK_DAYS), to_date: addDaysISO(toDate, 1) });
        const data = stripOrders(resp.data?.order || []);
        return { data, orderCount: data.length };
      }
    ),
    api.get(API_ENDPOINTS.CANCELLATION_REASONS, { params: { limit: 100, offset: 1 } }).catch(() => ({ data: {} })),
    api.post(API_ENDPOINTS.CREDIT_CUSTOMER_LIST, {}).catch(() => ({ data: {} })),
    getTabSettlementsForRange(fromDate, toDate).catch(() => []),
  ]);

  const cancelReasons = cancelReasonsResp.data?.reasons || [];
  const cancelReasonById = new Map(cancelReasons.map((r) => [r.id, r.reason]));

  // Business-day boundary filter (aligns with S9/S6 pattern)
  const { start: dbDayStart } = getBusinessDayRange(fromDate, schedules);
  const { end: dbDayEnd } = getBusinessDayRange(toDate, schedules);
  const bdFilter = (o) => {
    const ot = o.orders_table || {};
    if ((ot.payment_method || '').toLowerCase() === 'merge') return false;
    const ca = (ot.created_at || '').replace('T', ' ').substring(0, 19);
    if (!ca) return false;
    if (fromDate === toDate) return isWithinBusinessDay(ca, dbDayStart, dbDayEnd);
    return ca >= dbDayStart && ca <= dbDayEnd;
  };
  const filteredOrders = orders.filter(bdFilter);
  // CR-031: cancels gate by cancel_at, not punch — merge guard only here
  const cancelOrdersAll = cancelDataOrders.filter(
    (o) => ((o.orders_table || {}).payment_method || '').toLowerCase() !== 'merge'
  );
  const inCancelRange = (ts) => {
    if (!ts) return false;
    if (fromDate === toDate) return isWithinBusinessDay(ts, dbDayStart, dbDayEnd);
    return ts >= dbDayStart && ts <= dbDayEnd;
  };

  // CR-030 (GO-2): revenue rows = fs6, collect_bill within business-day range
  const cbFilter = (w) => {
    const ot = w.orders_table || {};
    const pm = (ot.payment_method || '').toLowerCase();
    if (pm === 'merge') return false;
    if (String(ot.f_order_status) !== '6') return false;
    const cb = (ot.collect_bill || '').replace('T', ' ').substring(0, 19);
    if (!cb) return false;
    if (fromDate === toDate) return isWithinBusinessDay(cb, dbDayStart, dbDayEnd);
    return cb >= dbDayStart && cb <= dbDayEnd;
  };
  const collectRows = collectOrders.filter(cbFilter);

  // --- Tile 1: Net Sales ---
  let totalRevenue = 0;
  let paidOrderCount = 0;
  const hourlyBuckets = {};

  // --- Tile 2: Channel Mix ---
  const channelCounts = { 'Dine-In': 0, Takeaway: 0, Delivery: 0, Room: 0 };

  // --- Tile (3rd row): Audit ---
  let makeUnpaidCount = 0;
  let paymentMethodChangeCount = 0;
  const auditOrders = [];
  const channelRevenue = { 'Dine-In': 0, Takeaway: 0, Delivery: 0, Room: 0 };

  // --- Tile 4: Payment Mix --- (collection-dated, CR-030/CR-032)
  const paymentCounts = {};
  const paymentRevenue = {};

  // BUG-127 (R2-AMEND): Credit Outstanding from restaurant-tap-summary (as of today)
  const tapSummary = tapResp?.data?.['restaurant-tap-summary'] || {};
  const creditOutstanding = parseFloat(String(tapSummary.balance ?? '0').replace(/,/g, '')) || 0;

  // --- Tile 5: Cancellations --- (computed from cancelDataOrders below, not from collect_bill)
  let cancelledOrderCount = 0;
  let cancelledRevenue = 0;
  const cancelReasonCounts = {};
  let cancelledItemCount = 0;
  let cancelledItemRevenue = 0;

  // --- Tile 6: Discounts & Offers ---
  let directDiscountTotal = 0;
  let couponDiscountTotal = 0;
  let couponOrderCount = 0;
  let compItemTotal = 0;
  let compItemCount = 0;
  let loyaltyDiscountTotal = 0;

  // --- Tile 7: Kitchen ---
  const prepTimes = [];
  const serveTimes = [];
  let slaBreachCount = 0;

  // --- Tile 8: Customer ---
  const customerVisits = new Map();
  let guestCount = 0;
  let registeredCount = 0;

  // --- Tile 3: Top Items ---
  const itemRevMap = new Map();

  // ── CR-030 (GO-2): REVENUE tiles by COLLECTION date ──
  // Net Sales / Channel mix / Payment mix / hourly sparkline from collectRows.
  // pm='TAB' excluded (credit at punch — H5); settlements added after the loop.
  for (const wrapper of collectRows) {
    const ot = wrapper.orders_table || {};
    const pm = ot.payment_method || '';
    if (pm.toLowerCase() === 'tab') continue;
    const amt = parseFloat(ot.order_amount) || 0;
    totalRevenue += amt;
    paidOrderCount += 1;

    const cb = (ot.collect_bill || '').replace('T', ' ');
    const hour = cb.slice(11, 13) || '00';
    hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + amt;

    const orderIn = ot.order_in || '';
    const orderType = (ot.order_type || '').toLowerCase();
    let channel = 'Dine-In';
    if (orderIn === 'RM' || orderIn === 'SRM' || pm === 'ROOM') channel = 'Room';
    else if (orderType.includes('delivery') || orderType.includes('home_delivery')) channel = 'Delivery';
    else if (orderType.includes('takeaway') || orderType.includes('take_away')) channel = 'Takeaway';
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    channelRevenue[channel] = (channelRevenue[channel] || 0) + amt;

    const bucket = classifyPaymentMethod(pm); // CR-032 shared classifier
    if (bucket) {
      paymentCounts[bucket] = (paymentCounts[bucket] || 0) + 1;
      paymentRevenue[bucket] = (paymentRevenue[bucket] || 0) + amt;
    }
  }
  // TAB settlements = Credit group, money-in on settlement day (H5)
  const settlementTotal = (tabSettlements || []).reduce((s, x) => s + (x.total || 0), 0);
  if (settlementTotal > 0) {
    totalRevenue += settlementTotal;
    paymentCounts[CREDIT_GROUP] = (tabSettlements || []).filter((x) => x.total > 0).length;
    paymentRevenue[CREDIT_GROUP] = settlementTotal;
  }

  for (const wrapper of filteredOrders) {
    const ot = wrapper.orders_table || {};
    const items = wrapper.order_details_table || [];
    const operations = wrapper.operations || [];
    const orderAmount = parseFloat(ot.order_amount) || 0;
    const fStatus = String(ot.f_order_status);
    const isCancelled = fStatus === '3';

    // Channel classification
    // Channel classification — CR-030: channel mix now computed in collectRows loop

    const isPaid = fStatus === '6';

    if (isPaid) {
      // CR-030: revenue / hourly / payment-mix moved to the collectRows loop above.
      // This punch-dated loop keeps: customers, discounts, audits, items, kitchen.

      // Tile 8 — Customer
      const userId = ot.user_id;
      const custMobile = ot.cust_mobile;
      const customerKey = userId || custMobile || null;
      if (customerKey) {
        registeredCount += 1;
        customerVisits.set(customerKey, (customerVisits.get(customerKey) || 0) + 1);
      } else {
        guestCount += 1;
      }

      // Tile 6 — Discounts & Offers (order-level)
      directDiscountTotal += parseFloat(ot.restaurant_discount_amount || 0) || 0;
      const couponAmt = parseFloat(ot.coupon_discount_amount || 0) || 0;
      if (couponAmt > 0) {
        couponDiscountTotal += couponAmt;
        couponOrderCount += 1;
      }
      // Loyalty discount from loyalty_info JSON
      let loyaltyInfo = {};
      try {
        loyaltyInfo = typeof ot.loyalty_info === 'string' ? JSON.parse(ot.loyalty_info) : (ot.loyalty_info || {});
      } catch (_e) { /* skip */ }
      const loyaltyAmt = parseFloat(loyaltyInfo.loyalty_discount || 0) || 0;
      if (loyaltyAmt > 0) {
        loyaltyDiscountTotal += loyaltyAmt;
      }
    } else {
      // Order-level cancellation — skip here, computed from cancelDataOrders below
    }

    // Channel mix — CR-030: moved to the collectRows loop (collection-dated)

    // Item-level processing
    for (const line of items) {
      const foodId = line.food_id;
      const lineStatus = String(line.food_status);
      const price = parseFloat(line.price) || 0;
      const qty = parseFloat(line.quantity) || 0;

      // Cancelled items at line level — skip here, computed from cancelDataOrders below

      // Tile 3 — Top items (only non-cancelled, non-comp)
      if (lineStatus !== '3' && String(line.complementary) !== '1' && line.complementary !== 1) {
        let fd = {};
        try {
          fd = typeof line.food_details === 'string' ? JSON.parse(line.food_details) : (line.food_details || {});
        } catch (_e) { fd = {}; }
        // BUG-133: Skip "check in" marker items.
        if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
        const name = fd.name || `Item #${foodId}`;
        const existing = itemRevMap.get(foodId);
        if (existing) {
          existing.qty += qty;
          existing.revenue += price;
        } else {
          itemRevMap.set(foodId, { foodId, name, qty, revenue: price });
        }
      }

      // Tile 6 — Complementary items (item-level)
      if ((String(line.complementary) === '1' || line.complementary === 1) && lineStatus !== '3') {
        const compPrice = parseFloat(line.complementary_price || 0) || parseFloat(line.unit_price || 0) || 0;
        compItemTotal += compPrice * qty;
        compItemCount += 1;
      }

      // Tile 7 — Kitchen times
      const createdAt = ot.created_at;
      const readyAt = line.ready_at;
      const serveAt = line.serve_at;
      if (createdAt && readyAt && lineStatus !== '3') {
        const prep = (new Date(readyAt) - new Date(createdAt)) / 60000; // minutes
        if (prep > 0 && prep < 300) { // sanity: under 5 hours
          prepTimes.push(prep);
          if (serveAt) {
            const serve = (new Date(serveAt) - new Date(readyAt)) / 60000;
            if (serve > 0 && serve < 300) serveTimes.push(serve);
          }
          const total = serveAt ? (new Date(serveAt) - new Date(createdAt)) / 60000 : prep;
          if (total > 25) slaBreachCount += 1;
        }
      }
    }

    // Tile 6 — Audit alerts from operations[]
    for (const op of operations) {
      const opStr = (op.operation || '').toLowerCase();
      if (opStr === 'make_unpaid') {
        makeUnpaidCount += 1;
        const oid = ot.restaurant_order_id || ot.id || '';
        if (!auditOrders.find(a => a.id === oid && a.type === 'make_unpaid')) {
          auditOrders.push({
            id: oid,
            type: 'make_unpaid',
            amount: orderAmount,
            by: op.vendor_employee_name || '—',
            prevMethod: op.previous_payment_method || '',
            currMethod: op.current_payment_method || '',
          });
        }
      } else if (opStr === 'payment_method_change') {
        paymentMethodChangeCount += 1;
        const oid = ot.restaurant_order_id || ot.id || '';
        if (!auditOrders.find(a => a.id === oid && a.type === 'payment_method_change')) {
          auditOrders.push({
            id: oid,
            type: 'payment_method_change',
            amount: orderAmount,
            by: op.vendor_employee_name || '—',
            prevMethod: op.previous_payment_method || '',
            currMethod: op.current_payment_method || '',
          });
        }
      }
    }
  }

  // --- Cancellations (CR-031, GO-3): cancel_at attribution + shared valuation ---
  // Identity target: Dashboard tile ≡ Cancellations report (same module, same window).
  // Counting = qty (H20); order-scope value = OPS-CANCEL rule via valueCancelledOrder.
  for (const wrapper of cancelOrdersAll) {
    const ot = wrapper.orders_table || {};
    const items = wrapper.order_details_table || [];

    if (isOrderCancelledScope(ot)) {
      // Order-level cancel: include once if ANY line's cancel_at falls in range
      const hasItemInRange = items.some(
        (item) => String(item.food_status) === '3' && inCancelRange(getCancelAt(item))
      );
      if (hasItemInRange) {
        cancelledOrderCount += 1;
        cancelledRevenue += valueCancelledOrder(wrapper).value;
        const reason = ot.cancellation_reason || 'No reason provided';
        cancelReasonCounts[reason] = (cancelReasonCounts[reason] || 0) + 1;
      }
    } else {
      // Item-level cancels within active orders
      for (const line of items) {
        if (String(line.food_status) !== '3') continue;
        if (!inCancelRange(getCancelAt(line))) continue;
        // BUG-133: Skip "check in" marker items.
        let _fd = {};
        try { _fd = typeof line.food_details === 'string' ? JSON.parse(line.food_details) : (line.food_details || {}); } catch (_e) { _fd = {}; }
        if ((_fd.name || '').trim().toLowerCase() === 'check in') continue;
        const v = valueCancelledLine(line);
        cancelledItemCount += v.qty;
        cancelledItemRevenue += v.value;
        if (line.reason_type) {
          const reason = cancelReasonById.get(line.reason_type) || 'Unknown reason';
          cancelReasonCounts[reason] = (cancelReasonCounts[reason] || 0) + 1;
        }
      }
    }
  }

  // Build sparkline data (sorted by hour)
  const sparkline = Object.entries(hourlyBuckets)
    .map(([hour, value]) => ({
      time: `${parseInt(hour) > 12 ? parseInt(hour) - 12 : parseInt(hour) || 12}${parseInt(hour) >= 12 ? 'pm' : 'am'}`,
      hour: parseInt(hour),
      value: Math.round(value),
    }))
    .sort((a, b) => a.hour - b.hour);

  // Channel mix percentages
  const totalOrders = Object.values(channelCounts).reduce((s, v) => s + v, 0) || 1;
  const channelMix = Object.entries(channelCounts).map(([name, count]) => ({
    name,
    value: Math.round((count / totalOrders) * 100),
    revenue: Math.round(channelRevenue[name] || 0),
    count,
  }));
  const topChannel = channelMix.sort((a, b) => b.value - a.value)[0] || { name: '—', value: 0 };

  // Payment mix
  const totalPaymentOrders = Object.values(paymentCounts).reduce((s, v) => s + v, 0) || 1;
  const paymentMix = Object.entries(paymentCounts)
    .map(([name, count]) => ({
      name,
      value: Math.round((count / totalPaymentOrders) * 100),
      revenue: Math.round(paymentRevenue[name] || 0),
      count,
    }))
    .sort((a, b) => b.value - a.value);

  // Top items
  const topItems = Array.from(itemRevMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((it) => ({ ...it, revenue: Math.round(it.revenue) }));
  const totalItemsSold = Array.from(itemRevMap.values()).reduce((s, it) => s + it.qty, 0);

  // Top cancel reason
  const topCancelReason = Object.entries(cancelReasonCounts)
    .sort(([, a], [, b]) => b - a)[0] || ['No cancellations', 0];

  // Kitchen averages
  const avgPrep = prepTimes.length > 0 ? prepTimes.reduce((s, v) => s + v, 0) / prepTimes.length : 0;
  const avgServe = serveTimes.length > 0 ? serveTimes.reduce((s, v) => s + v, 0) / serveTimes.length : 0;
  const fmtTime = (mins) => {
    const m = Math.floor(mins);
    const s = Math.round((mins - m) * 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Customer repeat %
  const totalCustomers = registeredCount + guestCount;
  let repeatCount = 0;
  for (const visits of customerVisits.values()) {
    if (visits > 1) repeatCount += 1;
  }
  const repeatPct = customerVisits.size > 0 ? Math.round((repeatCount / customerVisits.size) * 100) : 0;
  const newCustomersToday = totalCustomers > 0 ? guestCount : 0;

  // Audit risk score (0-3)
  const auditTotal = auditOrders.length;
  const riskScore = auditTotal > 5 ? 3 : auditTotal > 2 ? 2 : auditTotal > 0 ? 1 : 0;

  // At-a-glance summary
  const glanceParts = [];
  if (paidOrderCount > 0) glanceParts.push(`${paidOrderCount} paid orders totalling ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRevenue)}`);
  if (topChannel.name !== '—') glanceParts.push(`top channel is ${topChannel.name} at ${topChannel.value}%`);
  if (cancelledOrderCount > 0) glanceParts.push(`${cancelledOrderCount} cancelled order${cancelledOrderCount > 1 ? 's' : ''}`);
  if (avgPrep > 0) glanceParts.push(`avg prep time ${fmtTime(avgPrep)} mins`);
  const glanceSummary = glanceParts.length > 0 ? glanceParts.join('. ') + '.' : 'No order data in this date range.';

  return {
    sales: {
      totalRevenue: Math.round(totalRevenue),
      paidOrderCount,
      sparkline,
    },
    channels: {
      mix: channelMix,
      topChannel: topChannel.name,
      topChannelPct: topChannel.value,
    },
    topItems: {
      items: topItems,
      totalItemsSold: Math.round(totalItemsSold),
    },
    payments: {
      mix: paymentMix,
      creditOutstanding: Math.round(creditOutstanding), // BUG-127 (R2-AMEND): as of today, all ranges
      creditSettled: Math.round(settlementTotal),
    },
    cancellations: {
      orderCount: cancelledOrderCount,
      itemCount: cancelledItemCount,
      totalCount: cancelledOrderCount + cancelledItemCount,
      orderRevenue: Math.round(cancelledRevenue),
      itemRevenue: Math.round(cancelledItemRevenue),
      totalRevenue: Math.round(cancelledRevenue + cancelledItemRevenue),
      topReason: topCancelReason[0],
      topReasonCount: topCancelReason[1],
    },
    discounts: {
      directDiscount: Math.round(directDiscountTotal),
      couponDiscount: Math.round(couponDiscountTotal),
      couponOrders: couponOrderCount,
      loyaltyDiscount: Math.round(loyaltyDiscountTotal),
      compItemTotal: Math.round(compItemTotal),
      compItemCount,
      totalLeakage: Math.round(directDiscountTotal + couponDiscountTotal + loyaltyDiscountTotal + compItemTotal),
    },
    audits: {
      madeUnpaid: makeUnpaidCount,
      paymentMethodChanged: paymentMethodChangeCount,
      orders: auditOrders,
      total: auditTotal,
      riskScore,
    },
    kitchen: {
      avgPrep: fmtTime(avgPrep),
      avgServe: fmtTime(avgServe),
      slaBreachCount,
      hasPrepData: prepTimes.length > 0,
    },
    customers: {
      repeatPct,
      repeatCount,
      totalIdentified: customerVisits.size,
      newCustomers: newCustomersToday,
      totalOrders: totalCustomers,
    },
    glanceSummary,
    meta: {
      totalOrders: orders.length,
      fromDate,
      toDate,
    },
  };
};

export default { getItemSalesAggregated, getDashboardAggregated };
