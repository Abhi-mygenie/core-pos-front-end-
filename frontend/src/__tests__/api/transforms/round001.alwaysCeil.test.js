// =============================================================================
// ROUND-001 — Grand-Total round-off must ALWAYS use ceiling (no floor case).
// -----------------------------------------------------------------------------
// Owner-correct rule (pending-freeze A2, owner-verified via BUG-051 / BUG-076):
//   The grand total round-off is ALWAYS Math.ceil, regardless of the paise value.
//   There is NO conditional ceil/floor (the old "paise > 0.10 → up, else down" is
//   rejected). Canonical cases: 105.05 → 106 AND 105.15 → 106.
//
// Amendment (owner-verified via BUG-052): round-off is gated by the restaurant
//   profile flag (`roundOffEnabled`, sourced from `restaurant.totalRound`). When
//   the profile DISABLES round-off, the exact 2-decimal total is used. When it is
//   ENABLED (default), the ceiling rule above always applies — never a floor.
//
// This file locks the rule against the REAL transform (toAPI.placeOrderWithPayment
// → calcOrderTotals) plus a verbatim pure-function copy of the round predicate
// (orderTransform.js:709-711 / CollectPaymentPanel.jsx:633-634) as a contract.
// =============================================================================

const { toAPI } = require('../../../api/transforms/orderTransform');

// Minimal unplaced, zero-tax cart item → subtotal == price (no SC/tip/delivery/tax),
// so rawTotal == price and order_amount == round-off(price).
const buildItem = (price) => ({
  id: 1,
  foodId: 100,
  name: 'Item',
  price,
  qty: 1,
  station: 'KDS',
  status: 'placed',
  placed: false,
  // no `tax` → taxPct 0 → gst_amount/vat_amount 0
});

const orderAmountFor = (price, roundOffEnabled = true) =>
  toAPI.placeOrderWithPayment(
    { tableId: 1 },
    [buildItem(price)],
    {},
    'dineIn',
    { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
    { roundOffEnabled },
  ).order_amount;

describe('ROUND-001 | always-ceil round-off (real transform)', () => {
  test('105.05 → 106 (canonical case — was floor under old rule)', () => {
    expect(orderAmountFor(105.05)).toBe(106);
  });

  test('105.15 → 106 (canonical case)', () => {
    expect(orderAmountFor(105.15)).toBe(106);
  });

  test('105.95 → 106 (near-integer still ceils)', () => {
    expect(orderAmountFor(105.95)).toBe(106);
  });

  test('105.00 → 105 (exact integer is NOT over-rounded)', () => {
    expect(orderAmountFor(105.0)).toBe(105);
  });

  test('0 → 0 (empty/zero total guard)', () => {
    expect(orderAmountFor(0)).toBe(0);
  });

  test('BUG-052 amendment: roundOffEnabled=false keeps exact 2-decimal total', () => {
    expect(orderAmountFor(105.05, false)).toBe(105.05);
    expect(orderAmountFor(105.15, false)).toBe(105.15);
  });
});

// -----------------------------------------------------------------------------
// Verbatim contract copy of the round predicate (kept identical to production):
//   orderTransform.js:709-711  /  CollectPaymentPanel.jsx:633-634
// A 1-paise sweep proves the ENABLED path NEVER rounds DOWN (no floor case).
// -----------------------------------------------------------------------------
const grandTotal = (rawTotal, roundOffEnabled = true) =>
  rawTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawTotal) : Math.round(rawTotal * 100) / 100)
    : 0;

describe('ROUND-001 | predicate contract — no floor branch exists', () => {
  test('every fractional paise from x.01..x.99 rounds UP to the next integer', () => {
    for (let p = 1; p <= 99; p++) {
      const raw = 105 + p / 100;
      expect(grandTotal(raw)).toBe(106);
    }
  });

  test('disabled path mirrors the raw 2-decimal total (no rounding)', () => {
    expect(grandTotal(105.05, false)).toBe(105.05);
    expect(grandTotal(105.5, false)).toBe(105.5);
  });
});
