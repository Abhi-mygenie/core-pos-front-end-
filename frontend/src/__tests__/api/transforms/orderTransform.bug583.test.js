// BUG-583 + BUG-664: billPrinted mapping — only bill_print drives tile colour.
// print_bill_status means "auto-bill was requested at placement" (NOT "bill printed") —
// removed as fallback per BUG-664 (tile was turning green on prepaid placement with no print).
import { fromAPI } from '../../../api/transforms/orderTransform';

const base = { id: 1, order_details: [] };

describe('BUG-583 + BUG-664 billPrinted mapping', () => {
  test('bill_print Yes -> true', () => {
    expect(fromAPI.order({ ...base, bill_print: 'Yes' }).billPrinted).toBe(true);
  });
  test('print_bill_status Yes alone -> false (BUG-664: not a print signal)', () => {
    expect(fromAPI.order({ ...base, print_bill_status: 'Yes' }).billPrinted).toBe(false);
  });
  test('neither field -> false', () => {
    expect(fromAPI.order({ ...base }).billPrinted).toBe(false);
  });
  test('bill_print No -> false', () => {
    expect(fromAPI.order({ ...base, bill_print: 'No' }).billPrinted).toBe(false);
  });
  test('bill_print No, print_bill_status Yes -> false (BUG-664: fallback removed)', () => {
    expect(fromAPI.order({ ...base, bill_print: 'No', print_bill_status: 'Yes' }).billPrinted).toBe(false);
  });
  test('orderList propagates billPrinted', () => {
    const list = fromAPI.orderList([{ ...base, bill_print: 'Yes' }, { ...base, id: 2 }]);
    expect(list.map(o => o.billPrinted)).toEqual([true, false]);
  });
});
