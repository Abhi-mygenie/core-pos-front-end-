// CR-385 Phase 1.5c — BUG-445: In-House "Leaving today" = checkout === business date only; overdue (checkout < bd) is Stayover (+ Overdue pill), never "leaving"
import { bucketInHouse } from '@/api/transforms/frontDeskTransform';

const row = (checkout, checkin = '2026-09-20', checkedInAt = '2026-09-20 14:00:00') => ({ checkin, checkout, checkedInAt });

describe('BUG-445 bucketInHouse', () => {
  const bd = '2026-09-22';
  test('overdue guests (checkout < bd) are NOT "leaving" — chip must match the tile/backend leaving_today', () => {
    expect(bucketInHouse(row('2026-09-21'), bd)).toBe('stayover');
    expect(bucketInHouse(row('2026-09-01'), bd)).toBe('stayover');
  });
  test('checkout === bd → leaving; checkout > bd → stayover; arrived today → arrived', () => {
    expect(bucketInHouse(row('2026-09-22'), bd)).toBe('leaving');
    expect(bucketInHouse(row('2026-09-25'), bd)).toBe('stayover');
    expect(bucketInHouse(row('2026-09-25', '2026-09-22', '2026-09-22 10:00:00'), bd)).toBe('arrived');
    expect(bucketInHouse(row('2026-09-22', '2026-09-22', '2026-09-22 10:00:00'), bd)).toBe('leaving'); // same-day in/out counts as leaving
  });
  test('fixture-like day: two overdue in-house rows on bd 2026-09-22 → leaving 0, stayover 2', () => {
    const rows = [row('2026-09-21'), row('2026-09-21')];
    const counts = rows.reduce((c, r) => { const k = bucketInHouse(r, bd); c[k] = (c[k] ?? 0) + 1; return c; }, {});
    expect(counts).toEqual({ stayover: 2 });
  });
});
