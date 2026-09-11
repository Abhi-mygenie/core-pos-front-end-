/**
 * orderLedgerAuditEngine.js — CR-011 S6 Ledger Audit · Block A REVISED (2026-06-03)
 *
 * Pure functions. No React, no DOM, no side effects.
 *
 * Block A revised by owner 2026-06-03 (replaces 2026-06-03 morning version):
 *   • FE-81  RED   Cancelled order carries tax (bumped from AMBER)
 *   • FE-82  REJECTED — Not applicable at order level (tax is per-item)
 *   • FE-82R RED   SubTotal formula integrity (replaces FE-82)
 *   • FE-83  RED   Both GST + VAT on same order
 *   • FE-84  POLICY ±₹0.02 tolerance (paise rounding — no per-order flag)
 *   • FE-85  POLICY Skip empty orders (no per-order flag)
 *   • FE-86  RED   Tax aggregation: Σ items.tax_amount ≠ order.gstAmount/vatAmount
 *   • FE-88  RED   Grand Total formula integrity
 *
 * 4-step order math (owner-canonical):
 *   Step 1  ItemTotal      = Σ items[i].price × items[i].qty
 *   Step 2  SubTotal       = ItemTotal − discount + delivery + service + tip
 *   Step 3  Tax            = Σ items[i].tax_amount   (GST or VAT, never both)
 *   Step 4  Total (pre-RO) = SubTotal + Tax
 *   Step 5  Final Total    = Total (pre-RO) + roundOff
 *
 * Note: couponDiscount / loyaltyDiscount / walletUsed / loyaltyUsed are
 * deliberately EXCLUDED from `discount` per owner directive ("ignore loyalty
 * and coupon for now"). Will add as separate rules later.
 * RoundOff is always ≥ 0 in this system (Math.ceil pattern, see
 * CartPanel.jsx line 359). Profile flag `restaurant.totalRound !== false`
 * gates the calculation but doesn't change our audit formula — when disabled,
 * order.roundOff stays 0 and the term contributes nothing.
 *
 * Per Protocol §8 every rule fires only if `approved=true` in auditManifest.
 */
import { AUDIT_RULES } from './auditManifest';

const r2 = (n) => Math.round(n * 100) / 100;
const TOLERANCE = 0.02; // FE-84 policy: ±₹0.02 paise rounding allowed

// FE-85 engine guard — no per-order flag
const isEmpty = (o) =>
  (Number(o.subTotal) || 0) === 0 &&
  (Number(o.gstAmount) || 0) === 0 &&
  (Number(o.vatAmount) || 0) === 0;

const isApproved = (id) => {
  const r = AUDIT_RULES.find((x) => x.id === id);
  return Boolean(r && r.approved);
};

const sumItemTax = (o) => {
  const items = o.__source?.items || [];
  return items.reduce((s, it) => s + (Number(it.gstAmount) || 0) + (Number(it.vatAmount) || 0), 0);
};

const sumItemTotal = (o) => {
  const items = o.__source?.items || [];
  // each item: price × qty (use total field if present, else multiply)
  return items.reduce((s, it) => {
    const total = Number(it.total ?? it.amount);
    if (!Number.isNaN(total) && total > 0) return s + total;
    const price = Number(it.price ?? it.unitPrice ?? it.basePrice) || 0;
    const qty   = Number(it.qty ?? it.quantity) || 1;
    return s + price * qty;
  }, 0);
};

/**
 * Audit a single order against Block A revised.
 *
 * @param {Object} o   - ledger row (carries paymentMethod, gstAmount, vatAmount,
 *                       subTotal, totalAmount, itemTotal, discount,
 *                       deliveryCharge, serviceCharge, tipAmount, roundOff,
 *                       statusLabel, __source.items)
 * @returns {Array<{ruleId, severity, message, expected, actual, formula}>}
 */
export const auditOrder = (o, opts = {}) => {
  const flags = [];
  if (!o) return flags;
  if (isEmpty(o)) return flags;                          // FE-85

  const gst = Number(o.gstAmount) || 0;       // Pure GST (after VAT-FIX)
  const vat = Number(o.vatAmount) || 0;        // Pure VAT
  const rawGst = Number(o.rawGstAmount) || 0;  // VAT-FIX: original total_gst_tax_amount (= total tax)
  const subTotal = Number(o.subTotal) || 0;
  const itemTotal = Number(o.itemTotal) || 0;
  const discount = Number(o.discount) || 0;
  const delivery = Number(o.deliveryCharge) || 0;
  const service = Number(o.serviceCharge) || 0;
  const tip = Number(o.tipAmount) || 0;
  const roundOff = Number(o.roundOff) || 0;
  const totalAmount = Number(o.totalAmount) || 0;

  // ── Operation tags (badges) ──────────────────────────────────────────────
  const src = o.__source || {};
  const srcItems = src.items || [];
  const srcOps = src.operations || [];
  const tags = [];
  if (srcItems.some((it) => it.foodStatus === 3)) tags.push('CANCELLED');
  if ((src.orderType || '').toLowerCase() === 'delivery') tags.push('DELIVERY');
  if (src.paymentMethod === 'Merge' || src.paymentStatus === 'Merge') tags.push('MERGE');
  if ((src.paymentMethod || '').toLowerCase() === 'transfertoroom') tags.push('TRANSFER');
  if (srcOps.some((op) => (op.operation || '').toLowerCase().includes('split'))) tags.push('SPLIT');

  // ── Delivery-GST location detection (CR delivery-gst 2026-06-04) ──────────
  // Restaurant profile rate (e.g. cafe103 = 5%). Used to classify WHERE the
  // backend parked the delivery GST so the owner can triage at a glance:
  //   • inHeader  → GST lumped into header total_gst_tax_amount, NOT itemized
  //                 → breaks the FE-86 rollup → REAL bug → stays RED.
  //   • inTotal   → GST sits only inside order_amount, not booked anywhere
  //                 → FE-88 drift == expDelGst → AMBER (self-heals on backfill).
  const delGstRate = Number(opts.deliveryChargeGstPct) || 0;
  const expDelGst = r2(delivery * (delGstRate / 100));
  const delGstItemsTax = sumItemTax(o);
  const delGstHeaderTax = gst + vat;  // VAT-FIX: use combined header tax
  const delGstInHeader =
    delivery > 0 && delGstRate > 0 && expDelGst > 0 &&
    Math.abs(r2(delGstHeaderTax - delGstItemsTax) - expDelGst) <= TOLERANCE;

  // ── FE-81 (Cancelled order carries tax) — RED ───────────────────────────
  if (isApproved('FE-81')) {
    const cancelled = o.paymentMethod === 'Cancel' || o.statusLabel === 'Cancelled';
    if (cancelled && (gst > 0 || vat > 0)) {
      flags.push({
        ruleId: 'FE-81',
        severity: 'RED',
        message: 'Cancelled order carries tax',
        expected: 0,
        actual: r2(gst + vat),
        formula: 'cancelled AND (gstAmount > 0 OR vatAmount > 0)',
        tags,
      });
    }
  }

  // ── FE-83 (Both GST + VAT on same ITEM) — RED ────────────────────────────
  // VAT-FIX (2026-06-06): Restaurants with a bar legitimately have GST (food) +
  // VAT (liquor) on the same ORDER. FE-83 now checks for both taxes on the same
  // ITEM — which is the real misconfiguration. Order-level mix is normal for bars.
  if (isApproved('FE-83')) {
    const items = o.__source?.items || [];
    const anyItemHasBoth = items.some((it) => (Number(it.gstAmount) || 0) > 0 && (Number(it.vatAmount) || 0) > 0);
    if (anyItemHasBoth) {
      flags.push({
        ruleId: 'FE-83',
        severity: 'RED',
        message: 'Item has both GST and VAT booked on same line',
        expected: 'only one tax type per item',
        actual: `gst=${r2(gst)} · vat=${r2(vat)}`,
        formula: 'any item: gstAmount > 0 AND vatAmount > 0',
      });
    }
  }

  // ── FE-82R (SubTotal formula integrity) — RED ──────────────────────────
  // SubTotal = itemTotal − discount + delivery + service + tip
  // Loyalty/coupon excluded per owner directive 2026-06-03.
  if (isApproved('FE-82R')) {
    const expected = itemTotal - discount + delivery + service + tip;
    const drift = Math.abs(r2(subTotal) - r2(expected));
    if (drift > TOLERANCE) {
      flags.push({
        ruleId: 'FE-82R',
        severity: 'RED',
        message: 'SubTotal ≠ itemTotal − discount + delivery + service + tip',
        expected: r2(expected),
        actual: r2(subTotal),
        formula: 'subTotal = itemTotal − discount + deliveryCharge + serviceCharge + tipAmount',
        tags,
      });
    }
  }

  // ── FE-86 (Tax aggregation rollup) — RED ────────────────────────────────
  // Σ items[i].tax_amount + (deliveryCharge × delGstRate) must equal
  // order.gstAmount (or vatAmount, whichever is the non-zero one — they're
  // mutually exclusive per FE-83).
  //
  // Policy change 2026-06-04 PM (owner confirmed): header total_gst_tax_amount
  // legitimately includes delivery GST (food GST + delivery GST = header).
  // This is the accepted API contract, not a backend bug. So the expected
  // GST now bakes in the delivery GST component → rows where the only "drift"
  // is `deliveryCharge × delGstRate` are CLEAN, not RED. Drops false positives
  // on the DEL_GST_HEADER pattern; truly broken orders still flag.
  //
  // De-dup directive (owner 2026-06-04 AM): when an order is ALREADY RED in
  // FE-82R (subtotal double-count), suppress this FE-86 flag — the root cause
  // is the subtotal, surfaced once is enough.
  const fe82rFired = flags.some((f) => f.ruleId === 'FE-82R');
  if (isApproved('FE-86')) {
    const itemsTax = sumItemTax(o);
    if (itemsTax > 0 || gst > 0 || vat > 0 || expDelGst > 0) {
      // VAT-FIX (2026-06-06): Use combined header tax (pure GST + pure VAT)
      // instead of picking one. Bar restaurants have both tax types legitimately.
      const headerTax = gst + vat;
      const expectedHeaderTax = r2(itemsTax + expDelGst);
      const drift = Math.abs(r2(headerTax) - expectedHeaderTax);
      if (drift > TOLERANCE && !fe82rFired) {
        flags.push({
          ruleId: 'FE-86',
          severity: 'RED',
          message: 'Order header tax ≠ Σ items.tax_amount + deliveryCharge × delGstRate',
          expected: expectedHeaderTax,
          actual: r2(headerTax),
          formula: 'gstAmount (or vatAmount) = Σ items[i].tax_amount + deliveryCharge × delGstRate',
          tags,
          // Expose delivery-GST component on the flag for the UI to surface
          // in the dedicated "Exp. Del. GST" column.
          expDelGstComponent: expDelGst,
          expFoodGstComponent: r2(itemsTax),
        });
      }
    }
  }

  // ── FE-88 (Grand Total formula integrity) — RED or AMBER ────────────
  // totalAmount = subTotal + gstAmount + vatAmount + roundOff
  // roundOff defaults to 0 when restaurant.totalRound === false.
  // Compare API's order_amount (real) vs formula.
  // ±₹0.02 tolerance = GREEN (backend paise rounding, not a real issue).
  // AMBER = backend round_up=0 but order_amount includes ₹0.50 ceil (missing round_up data gap).
  //
  // De-dup directive (owner 2026-06-04): when an order is ALREADY RED in FE-82R
  // (subtotal double-count), FE-88's expected total is built on that wrong
  // subtotal, so its drift is just the subtotal error resurfacing. Suppress the
  // FE-88 flag entirely — the order stays RED in FE-82R (the root cause).
  // VAT-FIX (2026-06-06): Backend grand total = subTotal + total_gst_tax_amount + total_vat_tax_amount + roundOff
  // where total_gst_tax_amount is actually total tax (includes VAT). Use rawGst (= original
  // total_gst_tax_amount) + vat for the expected formula to match the backend.
  if (isApproved('FE-88')) {
    const expected = subTotal + rawGst + vat + roundOff;
    const apiTotal = Number(o.__source?.amount) || 0;
    const realDrift = r2(apiTotal - expected);
    if (Math.abs(realDrift) > TOLERANCE && !fe82rFired) {
      // Delivery GST sits only inside order_amount (not booked in any GST field):
      // drift == deliveryCharge × rate% → AMBER (self-heals on backend backfill).
      const isDelGstInTotal = delivery > 0 && delGstRate > 0 && expDelGst > 0 &&
        Math.abs(realDrift - expDelGst) <= TOLERANCE;
      const isMissingRoundOff = !isDelGstInTotal && roundOff === 0 && Math.abs(realDrift) <= 1.00;
      let fe88Tags = tags;
      let severity = 'RED';
      let message = 'Backend: totalAmount ≠ subTotal + gst + vat + roundOff';
      if (isDelGstInTotal) {
        severity = 'AMBER';
        message = 'Delivery GST present in order_amount but not booked in any GST field';
        fe88Tags = [...tags, 'DEL_GST_TOTAL'];
      } else if (isMissingRoundOff) {
        severity = 'AMBER';
        message = 'Backend round_up=0 but order_amount includes rounding';
        fe88Tags = [...tags, 'ROUND_OFF'];
      }
      flags.push({
        ruleId: 'FE-88',
        severity,
        message,
        expected: r2(expected),
        actual: r2(apiTotal),
        formula: 'totalAmount = subTotal + gstAmount + vatAmount + roundOff',
        tags: fe88Tags,
      });
    }
  }

  // ── FE-89 (Delivery charge GST not applied) — AMBER ─────────────────────
  // Restaurant profile sets deliveryChargeGstPct (e.g. cafe103 = 5%). Backend
  // must collect delivery × rate% somewhere — either in the dedicated
  // `delivery_charge_gst` field OR lumped into `total_gst_tax_amount` (header).
  //
  // Policy 2026-06-04 PM (owner confirmed, mirrors FE-86 Option C): collection
  // anywhere is fine; book-keeping in the dedicated field is preferred but not
  // required. Fire AMBER only when delivery GST is missing from BOTH places —
  // dedicated field is 0 AND the header doesn't carry the expected amount over
  // and above Σ items.tax. Once delivery GST is collected (either bucket),
  // the rule clears.
  if (isApproved('FE-89')) {
    const rate = Number(opts.deliveryChargeGstPct) || 0;
    const deliveryChargeGst = Number(o.deliveryChargeGst) || 0;
    if (delivery > 0 && rate > 0) {
      const expected = r2(delivery * (rate / 100));
      const driftField = Math.abs(r2(deliveryChargeGst) - r2(expected));
      // Header-bucket: does total tax include the delivery GST?
      const headerTax = gst + vat;  // VAT-FIX: use combined header tax
      const headerExcess = r2(headerTax - sumItemTax(o));  // GST sitting in header beyond items
      const inHeader = Math.abs(headerExcess - expected) <= TOLERANCE;
      if (driftField > TOLERANCE && !inHeader) {
        flags.push({
          ruleId: 'FE-89',
          severity: 'AMBER',
          message: 'Delivery charge GST not collected (missing from both dedicated field and header total_gst_tax_amount)',
          expected: r2(expected),
          actual: r2(deliveryChargeGst),
          formula: `deliveryChargeGst (or header bucket) = deliveryCharge × ${rate}%`,
          tags: [...tags, 'DELIVERY_GST'],
        });
      }
    }
  }

  return flags;
};

/**
 * Audit all orders. Returns flat flag list + severity counts + scan stats.
 */
export const auditAllOrders = (orders = [], opts = {}) => {
  const flags = [];
  let scanned = 0;
  let skipped = 0;
  for (const o of orders) {
    if (isEmpty(o)) { skipped++; continue; }
    scanned++;
    const orderFlags = auditOrder(o, opts);
    for (const f of orderFlags) {
      flags.push({ orderNumber: o.orderNumber, orderRow: o, ...f });
    }
  }
  const counts = { RED: 0, AMBER: 0, REVIEW: 0, EXEMPT: 0, ACTIVE: flags.length, byRule: {} };
  for (const f of flags) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
    counts.byRule[f.ruleId] = (counts.byRule[f.ruleId] || 0) + 1;
  }
  return { flags, counts, scanned, skipped };
};
