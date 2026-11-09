// BUG-583: billPrinted mapping (bill_print with print_bill_status fallback)
import { fromAPI } from '../../../api/transforms/orderTransform';

const base = { id: 1, order_details: [] };

describe('BUG-583 billPrinted mapping', () => {
  test('bill_print Yes -> true', () => {
    expect(fromAPI.order({ ...base, bill_print: 'Yes' }).billPrinted).toBe(true);
  });
  test('print_bill_status Yes fallback -> true', () => {
    expect(fromAPI.order({ ...base, print_bill_status: 'Yes' }).billPrinted).toBe(true);
  });
  test('neither field -> false', () => {
    expect(fromAPI.order({ ...base }).billPrinted).toBe(false);
  });
  test('bill_print No -> false', () => {
    expect(fromAPI.order({ ...base, bill_print: 'No' }).billPrinted).toBe(false);
  });
  test('bill_print No, print_bill_status Yes -> true (fallback OR)', () => {
    expect(fromAPI.order({ ...base, bill_print: 'No', print_bill_status: 'Yes' }).billPrinted).toBe(true);
  });
  test('orderList propagates billPrinted', () => {
    const list = fromAPI.orderList([{ ...base, bill_print: 'Yes' }, { ...base, id: 2 }]);
    expect(list.map(o => o.billPrinted)).toEqual([true, false]);
  });
});
