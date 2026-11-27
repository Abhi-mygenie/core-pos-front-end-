// BUG-082 (Wave 6, May-2026) — handleScanNewOrder tests
// ============================================================================
// Validates the new scan-new-order handler behaviour:
//   - Message structure: ['scan-new-order', orderId, restaurantId, fOrderStatus, 'web']
//   - Index 4 is a PRIMITIVE string (order origin), NOT a payload object.
//   - No API call — minimal order entry added to OrderContext.
//   - Full data arrives via subsequent socket events on confirm/edit.
//   - Channel-based fallback (former L508-511) RETIRED per owner Q-082-4.
//   - Runtime validated 2026-05-17 (restaurant 478, order 868557).
// ============================================================================

import { handleScanNewOrder } from '../../../api/socket/socketHandlers';

// Verify no API call is made — the mock should never be invoked.
jest.mock('../../../api/services/orderService', () => ({
  fetchSingleOrderForSocket: jest.fn(),
}));
import { fetchSingleOrderForSocket } from '../../../api/services/orderService';

describe('BUG-082 | handleScanNewOrder — primitive index 4, no API call', () => {
  beforeEach(() => {
    fetchSingleOrderForSocket.mockReset();
  });

  test('reads orderFrom="web" from index 4, creates minimal order entry', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 868557, '478', 7, 'web'],
      { addOrder }
    );

    expect(addOrder).toHaveBeenCalledTimes(1);
    const order = addOrder.mock.calls[0][0];
    expect(order.orderId).toBe(868557);
    expect(order.fOrderStatus).toBe(7);
    expect(order.orderFrom).toBe('web');
    expect(order.isWebOrder).toBe(true);
    expect(order.status).toBe('pending');
    expect(order.items).toEqual([]);
    expect(order.amount).toBe(0);
    expect(order.tableId).toBe(0);
    // Popup predicate must pass on this minimal order.
    expect(order.orderFrom === 'web' && order.fOrderStatus === 7).toBe(true);
  });

  test('does NOT call fetchSingleOrderForSocket (no API call)', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 868557, '478', 7, 'web'],
      { addOrder }
    );

    expect(fetchSingleOrderForSocket).not.toHaveBeenCalled();
  });

  test('reads non-web value from index 4 (forward-compat: future tokens like "kiosk")', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 999, '478', 7, 'kiosk'],
      { addOrder }
    );

    const order = addOrder.mock.calls[0][0];
    expect(order.orderId).toBe(999);
    expect(order.orderFrom).toBe('kiosk');
    expect(order.isWebOrder).toBe(false);
  });

  test('defaults orderFrom to "web" when index 4 is missing', () => {
    const addOrder = jest.fn();

    // Only 4 elements — no index 4
    handleScanNewOrder(
      ['scan-new-order', 868557, '478', 7],
      { addOrder }
    );

    expect(addOrder).toHaveBeenCalledTimes(1);
    const order = addOrder.mock.calls[0][0];
    expect(order.orderFrom).toBe('web');
    expect(order.isWebOrder).toBe(false); // null !== 'web'
  });

  test('skips status-8 Hold orders (POS2-005 / BUG-042-C preserved)', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 825770, '478', 8, 'web'],
      { addOrder }
    );

    expect(addOrder).not.toHaveBeenCalled();
  });

  test('skips status-9 Hold orders (BUG-042-C preserved)', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 825770, '478', 9, 'web'],
      { addOrder }
    );

    expect(addOrder).not.toHaveBeenCalled();
  });

  test('rejects invalid message (too short)', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      ['scan-new-order', 868557],
      { addOrder }
    );

    expect(addOrder).not.toHaveBeenCalled();
  });

  test('rejects non-array message', () => {
    const addOrder = jest.fn();

    handleScanNewOrder(
      'not-an-array',
      { addOrder }
    );

    expect(addOrder).not.toHaveBeenCalled();
  });
});
