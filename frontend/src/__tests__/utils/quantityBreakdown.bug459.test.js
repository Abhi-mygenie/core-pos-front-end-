// BUG-459 · unit tests for quantityBreakdown helpers
import { toBreakdown, fromBreakdown, normalizeBreakdown, hasConversion, minorDp } from '@/utils/quantityBreakdown';

describe('BUG-459 quantityBreakdown', () => {
  test('T1 toBreakdown(7800,800,pkt,gm)', () => {
    const r = toBreakdown(7800, 800, 'pkt', 'gm');
    expect(r.major).toBe(9); expect(r.minor).toBe(600); expect(r.text).toBe('9 pkt 600 gm');
  });
  test('T2 toBreakdown(4700,500,pkt,gm)', () => {
    const r = toBreakdown(4700, 500, 'pkt', 'gm');
    expect(r.major).toBe(9); expect(r.minor).toBe(200);
  });
  test('T3 negative', () => {
    const r = toBreakdown(-100, 500, 'pkt', 'gm');
    expect(r.sign).toBe('-'); expect(r.text.endsWith('0 pkt 100 gm')).toBe(true);
  });
  test('T4 zero', () => {
    expect(toBreakdown(0, 500, 'pkt', 'gm').text).toBe('0 pkt');
  });
  test('T5 no factor', () => {
    const r = toBreakdown(2.5, '', 'kg', '');
    expect(r.major).toBe(2.5); expect(r.minor).toBeNull(); expect(r.text).toBe('2.5 kg');
  });
  test('T6 exact multiple', () => {
    const r = toBreakdown(1600, 1600, 'tin', 'gm');
    expect(r.major).toBe(1); expect(r.minor).toBe(0); expect(r.text).toBe('1 tin');
  });
  test('T7 fractional factor', () => {
    const r = toBreakdown(5, 2.5, 'box', 'ltr');
    expect(r.major).toBe(2); expect(r.minor).toBe(0);
  });
  test('T8 fromBreakdown(9,600,800)', () => {
    const r = fromBreakdown(9, 600, 800);
    expect(r.displayQty).toBe(9.75); expect(r.baseQty).toBe(7800);
  });
  test('T9 fromBreakdown(9,"",500)', () => {
    const r = fromBreakdown(9, '', 500);
    expect(r.displayQty).toBe(9); expect(r.baseQty).toBe(4500);
  });
  test('T10 fromBreakdown no factor', () => {
    const r = fromBreakdown('9.4', 0, 0);
    expect(r.displayQty).toBe(9.4); expect(r.baseQty).toBe(9.4);
  });
  test('T11 normalize carry', () => {
    const r = normalizeBreakdown(0, 1700, 1600);
    expect(r.major).toBe(1); expect(r.minor).toBe(100);
  });
  test('T12 normalize no-op', () => {
    const r = normalizeBreakdown(2, 300, 1600);
    expect(r.major).toBe(2); expect(r.minor).toBe(300);
  });
  test('T13 hasConversion', () => {
    expect(hasConversion(800, 'pkt', 'gm')).toBe(true);
    expect(hasConversion('', 'kg', '')).toBe(false);
    expect(hasConversion(1, 'kg', 'kg')).toBe(false);
  });
  test('T14 minorDp', () => {
    expect(minorDp('gm')).toBe(0); expect(minorDp('ltr')).toBe(2);
  });
});
