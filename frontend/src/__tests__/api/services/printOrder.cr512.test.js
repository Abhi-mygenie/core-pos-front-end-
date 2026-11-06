// CR-512: print confirmation (update-print-status) wired inside printOrder()
jest.mock('../../../api/axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), put: jest.fn() },
}));

import api from '../../../api/axios';
import { API_ENDPOINTS } from '../../../api/constants';
import { printOrder } from '../../../api/services/orderService';

describe('CR-512 printOrder confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('constant points to v2 update-print-status', () => {
    expect(API_ENDPOINTS.CONFIRM_PRINT_STATUS).toBe('/api/v2/vendoremployee/print/update-print-status');
  });

  test('KOT print → temp-store then confirm with kot_print Yes', async () => {
    api.post.mockResolvedValueOnce({ data: { ok: 1 } }).mockResolvedValueOnce({ data: { c: 1 } });
    const res = await printOrder('123', 'kot', 'KDS');
    expect(res).toEqual({ ok: 1 });
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[0][0]).toBe(API_ENDPOINTS.PRINT_ORDER);
    expect(api.post.mock.calls[1]).toEqual([
      API_ENDPOINTS.CONFIRM_PRINT_STATUS,
      { order_id: 123, bill_print: 'No', kot_print: 'Yes' },
    ]);
  });

  test('Bill print (no orderData) → confirm with bill_print Yes', async () => {
    api.post.mockResolvedValueOnce({ data: { ok: 2 } }).mockResolvedValueOnce({ data: {} });
    const res = await printOrder(456, 'bill');
    expect(res).toEqual({ ok: 2 });
    expect(api.post.mock.calls[1]).toEqual([
      API_ENDPOINTS.CONFIRM_PRINT_STATUS,
      { order_id: 456, bill_print: 'Yes', kot_print: 'No' },
    ]);
  });

  test('confirmation failure is non-blocking', async () => {
    api.post.mockResolvedValueOnce({ data: { ok: 3 } }).mockRejectedValueOnce(new Error('500'));
    await expect(printOrder(789, 'bill')).resolves.toEqual({ ok: 3 });
    expect(console.warn).toHaveBeenCalled();
  });

  test('temp-store failure → no confirmation call, error propagates', async () => {
    api.post.mockRejectedValueOnce(new Error('queue fail'));
    await expect(printOrder(1, 'kot', 'KDS')).rejects.toThrow('queue fail');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
