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
// CR-045: stripOrders removed — backend now strips server-side (2026-06-17)
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
        const data = resp.data?.order || []; // CR-045: backend strips server-side
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

// CR-045: getDashboardAggregated removed (474 lines) — backend aggregation endpoints replaced it (2026-06-17)


// CR-049: Backend aggregation fetch functions — wrapped in CR-044 cache

export const fetchInsightsDashboard = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-dashboard', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_DASHBOARD, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsSales = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-sales', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_SALES, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsItems = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-items', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_ITEMS, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsCancellations = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-cancellations', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_CANCELLATIONS, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

// CR-011 Phase 3: New endpoint fetch functions
export const fetchInsightsTax = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-tax', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_TAX, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsDiscounts = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-discounts', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_DISCOUNTS, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsStaff = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-staff', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_STAFF, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsCustomers = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-customers', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_CUSTOMERS, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

export const fetchInsightsLocations = async (fromDate, toDate, restaurantId = 0) => {
  const key = buildCacheKey(restaurantId, 'insights-locations', 'default', fromDate, toDate);
  return fetchOrReuse(key, async () => {
    const resp = await api.post(API_ENDPOINTS.INSIGHTS_LOCATIONS, { from_date: fromDate, to_date: toDate });
    return { data: resp.data?.data, orderCount: 0 };
  });
};

// CR-049: Helper — minutes (float) → "mm:ss" string
const formatMinutesToTime = (mins) => {
  if (!mins || mins <= 0) return '00:00';
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// CR-049: Transform backend insights-dashboard response → DashboardMockup tiles shape
export const transformDashboardResponse = (data) => ({
  sales: {
    totalRevenue: Math.round(data.revenue?.total || 0),
    paidOrderCount: data.revenue?.paid_order_count || 0,
    sparkline: (data.revenue?.by_hour || []).map(h => ({ hour: h.hour, value: h.revenue })),
  },
  channels: (() => {
    const totalOrders = (data.channel_mix || []).reduce((s, c) => s + (c.orders || 0), 0) || 1;
    const mix = (data.channel_mix || []).map(c => ({ name: c.channel, value: Math.round((c.orders || 0) / totalOrders * 100), revenue: Math.round(c.revenue || 0), count: c.orders || 0 }));
    const top = mix.sort((a, b) => b.value - a.value)[0] || { name: '—', value: 0 };
    return { mix, topChannel: top.name, topChannelPct: top.value };
  })(),
  topItems: {
    items: (data.top_items || []).map(i => ({ name: i.name, qty: i.qty, revenue: i.revenue })),
    totalItemsSold: (data.top_items || []).reduce((s, i) => s + i.qty, 0),
  },
  payments: (() => {
    const totalOrders = (data.payment_mix || []).reduce((s, p) => s + (p.orders || 0), 0) || 1;
    const mix = (data.payment_mix || []).map(p => ({ name: p.method, value: Math.round((p.orders || 0) / totalOrders * 100), revenue: Math.round(p.revenue || 0), count: p.orders || 0 }));
    return { mix, creditOutstanding: Math.round(data.credit_outstanding || 0), creditSettled: Math.round(data.revenue?.tab_settlement_total || 0) };
  })(),
  cancellations: {
    orderCount: data.cancellations?.order_scope_count || 0,
    itemCount: data.cancellations?.item_scope_count || 0,
    totalCount: data.cancellations?.total_count || 0,
    orderRevenue: Math.round(data.cancellations?.order_scope_loss || 0),
    itemRevenue: Math.round(data.cancellations?.item_scope_loss || 0),
    totalRevenue: Math.round(data.cancellations?.total_loss || 0),
    topReason: data.cancellations?.top_reason || '',
    topReasonCount: data.cancellations?.top_reason_count || 0,
  },
  discounts: {
    directDiscount: Math.round(data.discounts?.manual_discount || 0),
    couponDiscount: Math.round(data.discounts?.coupon_discount || 0),
    couponOrders: data.discounts?.coupon_order_count || 0,
    loyaltyDiscount: Math.round(data.discounts?.loyalty_discount || 0),
    compItemTotal: Math.round(data.discounts?.comp_item_total || 0),
    compItemCount: data.discounts?.comp_item_count || 0,
    totalLeakage: Math.round(data.discounts?.total_leakage || 0),
  },
  audits: {
    madeUnpaid: data.audits?.make_unpaid_count || 0,
    paymentMethodChanged: data.audits?.payment_method_change_count || 0,
    orders: data.audits?.orders || [],
    total: data.audits?.total || 0,
    riskScore: Math.min(5, Math.ceil((data.audits?.total || 0) / 3)),
  },
  kitchen: {
    avgPrep: formatMinutesToTime(data.kitchen?.avg_prep_minutes),
    avgServe: formatMinutesToTime(data.kitchen?.avg_serve_minutes),
    slaBreachCount: data.kitchen?.sla_breach_count || 0,
    hasPrepData: data.kitchen?.has_prep_data || false,
  },
  customers: {
    repeatPct: data.customers?.repeat_pct || 0,
    repeatCount: data.customers?.repeat_customers || 0,
    totalIdentified: data.customers?.unique_customers || 0,
    newCustomers: data.customers?.guest_count || 0,
    totalOrders: data.customers?.total_orders || 0,
  },
  meta: { totalOrders: data.revenue?.paid_order_count || 0 },
});

// CR-049: Transform backend insights-items response → FE item row shape
// CR-049: Transform backend insights-items response into row shape expected by S5
// Backend returns sold/cancelled/complementary/pending/credit as objects {qty, revenue, ...}
export const transformItemRows = (items) => (items || []).map(i => {
  const sold = i.sold || {};
  const cancelled = i.cancelled || {};
  const comp = i.complementary || {};
  const pending = i.pending || {};
  const credit = i.credit || {};
  return {
    productId: i.food_id,
    productName: i.name,
    categoryId: i.category_id,
    categoryName: i.category_name,
    station: i.station || '',
    qtySold: sold.qty || 0,
    qtyCancelled: cancelled.qty || 0,
    qtyComplementary: comp.qty || 0,
    qtyPending: pending.qty || 0,
    qtyCredit: credit.qty || 0,
    totalRevenueSold: sold.revenue || 0,
    totalRevenueCancelled: cancelled.revenue || 0,
    totalRevenueComplementary: comp.revenue || 0,
    totalRevenuePending: pending.revenue || 0,
    totalRevenueCredit: credit.revenue || 0,
    itemTotalSold: sold.item_total || 0,
    discountSold: sold.discount || 0,
    serviceChargeSold: sold.service_charge || 0,
    taxSold: sold.tax || 0,
    menuPrice: i.menu_price || 0,
    avgPriceSold: i.avg_price_sold || 0,
    avgPriceCancelled: 0,
    avgPriceComplementary: 0,
    avgPricePending: 0,
    avgPriceCredit: 0,
    orderChargesDistributed: i.order_charges_distributed || 0,
    hasPending: (pending.qty || 0) > 0,
    hasCredit: (credit.qty || 0) > 0,
    isComplimentary: (comp.qty || 0) > 0,
    taxRate: i.tax_rate || 0,
    taxType: i.tax_type || '',
    taxCalc: i.tax_calc || '',
    drill: {
      variations: i.variations || [],
      addons: i.addons || [],
      cancelReasons: i.cancel_reasons || [],
      orderLines: [],
      cancels: [],
      driftLines: [],
    },
  };
});

export default { getItemSalesAggregated, fetchInsightsDashboard, fetchInsightsSales, fetchInsightsItems, fetchInsightsCancellations, transformDashboardResponse, transformItemRows }; // CR-045: getDashboardAggregated removed
