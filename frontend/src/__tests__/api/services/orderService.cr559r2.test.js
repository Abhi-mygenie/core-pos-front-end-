// CR-559 R2: confirmOrder sends printer_agent on the confirm payload (payload parity);
// updatePrintStatus posts kot_print after a gated web/scan Accept. No order-temp-store here.
jest.mock('../../../api/axios', () => ({
  __esModule: true,
  default: { post: jest.fn(), get: jest.fn(), put: jest.fn() },
}));

import api from '../../../api/axios';
import { API_ENDPOINTS } from '../../../api/constants';
import { confirmOrder, updatePrintStatus } from '../../../api/services/orderService';

const AGENTS = [
  { station: 'KDS', printer_agent_id: '5843', printer_type: 'bluetooth' },
  { station: 'BILL', printer_agent_id: '5843', printer_type: 'bluetooth' },
];

describe('CR-559 R2 — confirmOrder printer_agent parity', () => {
  beforeEach(() => jest.clearAllMocks());

  test('confirmOrder with a non-empty block → payload carries printer_agent, no print_kot', async () => {
    api.put.mockResolvedValueOnce({ data: { ok: 1 } });
    await confirmOrder('1578953', 'Manager', 'cooking', AGENTS);
    expect(api.put).toHaveBeenCalledTimes(1);
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe(API_ENDPOINTS.CONFIRM_ORDER);
    expect(payload).toMatchObject({ order_id: '1578953', role_name: 'Manager', order_status: 'cooking' });
    expect(payload.printer_agent).toEqual(AGENTS);
    expect('print_kot' in payload).toBe(false);
  });

  test('confirmOrder with empty/null block → NO printer_agent key (ready/serve shape preserved)', async () => {
    api.put.mockResolvedValue({ data: { ok: 1 } });
    await confirmOrder('1578953', 'Manager', 'cooking', []);
    expect('printer_agent' in api.put.mock.calls[0][1]).toBe(false);
    await confirmOrder('1578953', 'Manager', 'cooking');
    expect('printer_agent' in api.put.mock.calls[1][1]).toBe(false);
  });

  test('updatePrintStatus posts kot_print Yes / bill_print No with numeric order_id', async () => {
    api.post.mockResolvedValueOnce({ data: { c: 1 } });
    await updatePrintStatus('1578953', { kot_print: 'Yes', bill_print: 'No' });
    expect(api.post).toHaveBeenCalledWith(
      API_ENDPOINTS.CONFIRM_PRINT_STATUS,
      { order_id: 1578953, bill_print: 'No', kot_print: 'Yes' },
    );
  });
});
