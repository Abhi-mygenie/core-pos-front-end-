// =============================================================================
// CR-170 — Conditional grand total round-off (replaces ROUND-001 always-ceil)
// -----------------------------------------------------------------------------
// Owner-confirmed rule (2026-08-20, supersedes BUG-051 / BUG-076):
//   paise < 10  → Math.floor  (₹100.04 → ₹100, round_up = −₹0.04)
//   paise ≥ 10  → Math.ceil   (₹100.10 → ₹101, round_up = +₹0.90)
//   paise = 0   → unchanged   (₹100.00 → ₹100)
//   toggle OFF  → raw 2-decimal (no rounding)
//
// Float-drift guard: uses integer paise (Math.round((raw % 1) * 100)) so
// 100.10 % 1 = 0.09999... maps to paise=10 (ceil), not paise=9 (floor).
//
// History:
//   BUG-051 / BUG-076 : established always-ceil — this file locked that rule
//   CR-170             : owner changes rule to conditional threshold
// =============================================================================

import { applyGrandTotalRoundOff } from '../../../utils/roundOffUtils';
const { toAPI } = require('../../../api/transforms/orderTransform');

// Minimal zero-tax cart item: rawTotal == price, order_amount == roundOff(price)
const buildItem = (price) => ({
  id: 1,
  foodId: 100,
  name: 'Item',
  price,
  qty: 1,
  station: 'KDS',
  status: 'placed',
  placed: false,
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

const roundUpFor = (price, roundOffEnabled = true) =>
  toAPI.placeOrderWithPayment(
    { tableId: 1 },
    [buildItem(price)],
    {},
    'dineIn',
    { method: 'cash', tip: 0, deliveryCharge: 0, discounts: {} },
    { roundOffEnabled },
  ).round_up;

// --- Unit tests on shared helper ---
describe('CR-170 | applyGrandTotalRoundOff — helper unit tests', () => {
  test('100.04 → 100 (4 paise < 10 → floor)', () => {
    expect(applyGrandTotalRoundOff(100.04)).toBe(100);
  });

  test('100.09 → 100 (9 paise < 10 → floor, upper boundary)', () => {
    expect(applyGrandTotalRoundOff(100.09)).toBe(100);
  });

  test('100.10 → 101 (10 paise ≥ 10 → ceil, lower boundary)', () => {
    expect(applyGrandTotalRoundOff(100.10)).toBe(101);
  });

  test('100.50 → 101 (50 paise ≥ 10 → ceil)', () => {
    expect(applyGrandTotalRoundOff(100.50)).toBe(101);
  });

  test('100.95 → 101 (95 paise ≥ 10 → ceil)', () => {
    expect(applyGrandTotalRoundOff(100.95)).toBe(101);
  });

  test('100.00 → 100 (exact integer — no change)', () => {
    expect(applyGrandTotalRoundOff(100.00)).toBe(100);
  });

  test('0 → 0 (zero guard)', () => {
    expect(applyGrandTotalRoundOff(0)).toBe(0);
  });

  test('enabled=false → raw 2-decimal (toggle off)', () => {
    expect(applyGrandTotalRoundOff(100.04, false)).toBe(100.04);
    expect(applyGrandTotalRoundOff(100.50, false)).toBe(100.50);
  });

  test('float-drift guard: 100.10 must ceil not floor (0.09999... → paise=10)', () => {
    // 100.10 % 1 = 0.09999... in JS — integer-paise approach gives 10 → ceil
    expect(applyGrandTotalRoundOff(100.10)).toBe(101);
  });

  test('paise sweep 01–09 all floor', () => {
    for (let p = 1; p <= 9; p++) {
      expect(applyGrandTotalRoundOff(100 + p / 100)).toBe(100);
    }
  });

  test('paise sweep 10–99 all ceil', () => {
    for (let p = 10; p <= 99; p++) {
      expect(applyGrandTotalRoundOff(100 + p / 100)).toBe(101);
    }
  });
});

// --- Integration tests via real calcOrderTotals ---
describe('CR-170 | calcOrderTotals integration — order_amount + round_up', () => {
  test('100.04 → order_amount=100, round_up="-0.04"', () => {
    expect(orderAmountFor(100.04)).toBe(100);
    expect(roundUpFor(100.04)).toBe('-0.04');
  });

  test('100.09 → order_amount=100, round_up="-0.09"', () => {
    expect(orderAmountFor(100.09)).toBe(100);
    expect(roundUpFor(100.09)).toBe('-0.09');
  });

  test('100.10 → order_amount=101, round_up="0.90"', () => {
    expect(orderAmountFor(100.10)).toBe(101);
    expect(roundUpFor(100.10)).toBe('0.90');
  });

  test('100.50 → order_amount=101, round_up="0.50"', () => {
    expect(orderAmountFor(100.50)).toBe(101);
    expect(roundUpFor(100.50)).toBe('0.50');
  });

  test('100.00 → order_amount=100, round_up="0.00"', () => {
    expect(orderAmountFor(100.00)).toBe(100);
    expect(roundUpFor(100.00)).toBe('0.00');
  });

  test('enabled=false → order_amount=100.04 (no rounding)', () => {
    expect(orderAmountFor(100.04, false)).toBe(100.04);
  });
});

