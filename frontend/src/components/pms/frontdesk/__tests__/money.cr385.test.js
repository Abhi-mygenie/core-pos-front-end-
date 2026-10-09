// CR-385 M0 — money.js display helpers (D44-i): en-IN, 0 dp when integer else 2 dp, sign before ₹
import { fmtINR, fmtDate, fmtDateLong, fmtTime, plural, maskPhone, channelLabel, AVG_RATE_LABEL } from '../money';

describe('CR-385 M0 money.js', () => {
  test('fmtINR', () => {
    expect(fmtINR(19688)).toBe('₹19,688');
    expect(fmtINR(2212.35)).toBe('₹2,212.35');
    expect(fmtINR(-500)).toBe('−₹500');
    expect(fmtINR(0)).toBe('₹0');
    expect(fmtINR(null)).toBe('—');
    expect(fmtINR('5142.86')).toBe('₹5,142.86');
    expect(fmtINR(1234567)).toBe('₹12,34,567');
  });
  test('dates format only, no arithmetic', () => {
    expect(fmtDate('2026-09-21')).toBe('21 Sep');
    expect(fmtDateLong('2026-09-20')).toBe('Sunday, 20 September 2026');
    expect(fmtTime('2026-09-04 04:32:09')).toBe('04:32');
    expect(fmtDate(null)).toBe('—');
  });
  test('plural / maskPhone / channelLabel / avg label', () => {
    expect(plural(1, 'night')).toBe('1 night');
    expect(plural(3, 'night')).toBe('3 nights');
    expect(maskPhone('9876573210')).toBe('••••3210');
    expect(channelLabel('WalkIn')).toBe('Walk-in');
    expect(channelLabel(null)).toBe('—');
    expect(AVG_RATE_LABEL).toBe('avg. rate / night');
  });
});
