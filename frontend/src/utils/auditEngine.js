/**
 * auditEngine.js — CR-011-AUDIT-01
 *
 * Pure functions. No React, no DOM, no side effects. Easy to unit-test.
 *
 * Severity model (per owner directive 2026-06-02, Audit Summary v3):
 *   • RED    — Business-rule violation: GST + VAT both booked on the same row.
 *   • AMBER  — Numeric deviation: |actualTax − expectedTax| > tolerance,
 *              where expectedTax derives from the item's product-config tax rate.
 *              Default tolerance = 0 (zero tolerance, A4 approved).
 *   • REVIEW — Frontend business rule never explicitly approved by owner
 *              (per Protocol §8 + auditManifest.js pending entries).
 */
import { pendingReviewRules } from './auditManifest';

const round2 = (n) => Math.round(n * 100) / 100;
const round0 = (n) => Math.round(n);

const BUCKETS = [
  { id: 'sold',      label: 'Sold',          subtotalKey: 'subtotalSold',          taxKey: 'taxSold',          bothKey: 'bothTaxesBooked_sold',      hasFieldKey: 'hasTaxField_sold'      },
  { id: 'cancelled', label: 'Cancelled',     subtotalKey: 'subtotalCancelled',     taxKey: 'taxCancelled',     bothKey: 'bothTaxesBooked_cancelled', hasFieldKey: 'hasTaxField_cancelled' },
  { id: 'comp',      label: 'Complimentary', subtotalKey: 'subtotalComplementary', taxKey: 'taxComplementary', bothKey: 'bothTaxesBooked_comp',      hasFieldKey: 'hasTaxField_comp'      },
  { id: 'pending',   label: 'Pending',       subtotalKey: 'subtotalPending',       taxKey: 'taxPending',       bothKey: 'bothTaxesBooked_pending',   hasFieldKey: 'hasTaxField_pending'   },
];

/**
 * Per-row × per-bucket data-integrity audit (RED + AMBER).
 * @param {Array<Object>} apiRows - rows enriched by service with taxRate/taxType/taxCalc + per-bucket bothTaxesBooked_*
 * @param {Object} [opts]
 * @param {number} [opts.tolerance=0]
 */
export function auditRows(apiRows, opts = {}) {
  // @audit:rule id="FE-20" name="AMBER tolerance = ₹0 (zero)"
  //   explains="Default tolerance for AMBER deviations is 0 rupees. Any non-zero |actual − expected| flags AMBER."
  //   approved=false approvedDate="" approvedSource=""
  const tolerance = opts.tolerance ?? 0;
  const flags = [];

  for (const r of apiRows) {
    for (const b of BUCKETS) {
      const subtotal = Number(r[b.subtotalKey]) || 0;
      const tax     = Number(r[b.taxKey]) || 0;
      if (subtotal === 0 && tax === 0) continue;

      if (r[b.bothKey] === true) {
        flags.push({
          severity: 'RED',
          foodId: r.id,
          name: r.name,
          bucket: b.label,
          bucketId: b.id,
          revenue: round0(subtotal),
          actualTax: round0(tax),
          reason: 'GST + VAT both booked on a single line — business rule allows only one tax type per item.',
          ruleRef: 'Owner directive 2026-06-02 (Audit Summary v3, decision #6)',
        });
        continue;
      }

      // FE-15 — Complimentary bucket audit policy (APPROVED 2026-06-02, owner directive)
      // Comp lines are exempt from the standard expectedTax × rate check because
      // backend computes tax against billable amount (= 0 for comp). Safety net:
      // if a comp line nonetheless carries non-zero tax, flag RED as data anomaly.
      if (b.id === 'comp') {
        if (tax > 0) {
          flags.push({
            severity: 'RED',
            foodId: r.id,
            name: r.name,
            bucket: b.label,
            bucketId: b.id,
            revenue: round0(subtotal),
            actualTax: round2(tax),
            reason: `Complimentary line carries non-zero tax (₹${round2(tax)}) — violates comp = no-tax policy (FE-15). Backend data anomaly.`,
            ruleRef: 'FE-15 audit-exemption · anomaly branch',
          });
        } else {
          flags.push({
            severity: 'EXEMPT',
            foodId: r.id,
            name: r.name,
            bucket: b.label,
            bucketId: b.id,
            revenue: round0(subtotal),
            actualTax: round0(tax),
            reason: 'Complimentary line — audit-exempt by FE-15 (comp = freebie, tax computed against billable amount = ₹0).',
            ruleRef: 'FE-15 approved 2026-06-02',
          });
        }
        continue;
      }

      if (b.id === 'cancelled') {
        if (tax > 0) {
          flags.push({
            severity: 'AMBER',
            foodId: r.id,
            name: r.name,
            bucket: b.label,
            bucketId: b.id,
            revenue: round0(subtotal),
            actualTax: round2(tax),
            reason: `Cancelled line carries ₹${round2(tax)} tax — business rule says cancelled items should not have tax. Review with backend.`,
            ruleRef: 'FE-17 approved 2026-06-02 (tax-presence audit)',
          });
        } else {
          flags.push({
            severity: 'EXEMPT',
            foodId: r.id,
            name: r.name,
            bucket: b.label,
            bucketId: b.id,
            revenue: round0(subtotal),
            actualTax: round0(tax),
            reason: 'Cancelled line — no tax booked. Matches business expectation.',
            ruleRef: 'FE-17 approved 2026-06-02 (tax-presence audit)',
          });
        }
        continue;
      }

      // FE-18: expectedTax formula — now uses subtotal (taxable base = itemTotal − discount + SC)
      const rate = Number(r.taxRate) || 0;
      const taxCalc = r.taxCalc || 'Exclusive';
      const expectedTax = taxCalc === 'Inclusive'
        ? subtotal - (subtotal / (1 + rate / 100))
        : subtotal * (rate / 100);
      const rawDelta = tax - expectedTax;
      const delta = round2(rawDelta);  // round to 2 decimals before tolerance check to eliminate floating-point ghosts

      if (Math.abs(delta) > tolerance) {
        flags.push({
          severity: 'AMBER',
          foodId: r.id,
          name: r.name,
          bucket: b.label,
          bucketId: b.id,
          revenue: round0(subtotal),
          actualTax: round2(tax),
          expectedTax: round2(expectedTax),
          delta: round2(delta),
          taxRate: rate,
          taxType: r.taxType || '—',
          taxCalc,
          reason: `Expected ₹${round0(expectedTax)} (${rate}% ${r.taxType || '—'} on ₹${round0(subtotal)}) · actual ₹${round0(tax)} · Δ ${delta >= 0 ? '+' : ''}₹${round0(delta)}`,
        });
      }
    }
  }
  return flags;
}

/**
 * REVIEW items (FE-rule disclosure). Pure manifest read.
 * @param {string} [screenId='S5']
 */
export function auditReviewItems(screenId = 'S5') {
  return pendingReviewRules()
    .filter((r) => r.screens.includes(screenId))
    .map((r) => ({
      severity: 'REVIEW',
      ruleId: r.id,
      name: r.name,
      explains: r.explains,
      source: r.source,
      category: r.category,
    }));
}

/**
 * Combined summary — what S5 binds to a useMemo.
 */
export function auditSummary(apiRows, screenId = 'S5', opts = {}) {
  let flags = [];
  try {
    flags = auditRows(apiRows, opts);
  } catch (_e) {
    flags = [];
  }
  let reviewItems = [];
  try {
    reviewItems = auditReviewItems(screenId);
  } catch (_e) {
    reviewItems = [];
  }
  const red    = flags.filter((f) => f.severity === 'RED').length;
  const amber  = flags.filter((f) => f.severity === 'AMBER').length;
  const exempt = flags.filter((f) => f.severity === 'EXEMPT').length;
  const review = reviewItems.length;
  const total  = red + amber + review;  // EXEMPT is informational; does not count toward audit total

  // @audit:rule id="FE-41" name="Row severity priority (RED > AMBER > EXEMPT)"
  //   explains="When tinting picks one severity for a row that has flags across multiple buckets, RED wins over AMBER which wins over EXEMPT."
  //   approved=false approvedDate="" approvedSource=""
  const rowSeverityIndex = {};
  for (const f of flags) {
    const prev = rowSeverityIndex[f.foodId];
    if (!prev) {
      rowSeverityIndex[f.foodId] = f.severity;
    } else if (prev === 'EXEMPT' && (f.severity === 'AMBER' || f.severity === 'RED')) {
      rowSeverityIndex[f.foodId] = f.severity;
    } else if (prev === 'AMBER' && f.severity === 'RED') {
      rowSeverityIndex[f.foodId] = f.severity;
    }
  }

  return {
    red,
    amber,
    exempt,
    review,
    total,
    blocksExport: (red + review) > 0,  // AMBER is advisory (backend bugs) — does not block exports. EXEMPT also does not block.
    flags,
    reviewItems,
    rowSeverityIndex,
  };
}
