/**
 * Test Suite: handleUpdateOrderStatus — BUG-107 v2 socket-payload contract
 *
 * HISTORICAL NOTE
 * ---------------
 * This file originally tested the BUG-107 pre-v2 logic which (a) used a
 * 4-element message with numeric status (3=cancelled, 6=paid), (b) called
 * `fetchSingleOrderForSocket(orderId)` to retrieve the latest order from
 * REST, and (c) inspected per-item `status` to decide remove vs update on
 * a single-item cancel.
 *
 * BUG-107 v2 (April 2026) replaced that logic with a simpler, faster path:
 *   - The socket payload arrives with the full order object inside it.
 *   - `parseMessage(message)` returns `{ orderId, payload }`; the order is
 *     reconstructed via `orderFromAPI.order(payload.orders[0])`.
 *   - Decision rule: if the transformed `order.status` is `'cancelled'` or
 *     `'paid'`, remove the order; otherwise update it. Per-item analysis
 *     is no longer performed in this handler.
 *
 * Tests are rewritten in place to reflect the v2 contract. No file deletion;
 * outer describe shell preserved.
 */

import { handleUpdateOrderStatus } from '../../../api/socket/socketHandlers';
import { fromAPI as orderFromAPI } from '../../../api/transforms/orderTransform';

// =============================================================================
// Test Data
// =============================================================================

const createMockApiOrder = (overrides = {}) => ({
  order_id: 730217,
  restaurant_order_id: 'ORD-001',
  food_order_status: 'running',
  table_id: 5,
  ...overrides,
});

// Build a v2 update-order-status socket message:
// parseMessage expects a 5-element array: [event, orderId, restaurantId, status, payload]
const createV2Message = (orderId, apiOrder) => ([
  'update-order-status',
  orderId,
  690,                          // restaurantId
  apiOrder?.food_order_status || 'running',
  { orders: [apiOrder] },       // payload
]);

// Mock parseMessage so we feed a deterministic { orderId, payload } pair.
jest.mock('../../../api/socket/socketHandlers', () => {
  const actual = jest.requireActual('../../../api/socket/socketHandlers');
  return actual;
});

// We mock the transform so we can assert the handler routes correctly without
// re-asserting transform behaviour (covered by orderTransform tests).
jest.mock('../../../api/transforms/orderTransform', () => {
  const actual = jest.requireActual('../../../api/transforms/orderTransform');
  return {
    ...actual,
    fromAPI: {
      ...actual.fromAPI,
      order: jest.fn(),
    },
  };
});

// =============================================================================
// Test Suite
// =============================================================================

describe('BUG-107v2: handleUpdateOrderStatus — socket-payload contract', () => {

  let mockUpdateOrder;
  let mockRemoveOrder;
  let mockUpdateTableStatus;
  let mockGetOrderById;
  let mockSetTableEngaged;
  let mockSetOrderEngaged;
  let context;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateOrder = jest.fn();
    mockRemoveOrder = jest.fn();
    mockUpdateTableStatus = jest.fn();
    mockGetOrderById = jest.fn();
    mockSetTableEngaged = jest.fn();
    mockSetOrderEngaged = jest.fn();
    context = {
      updateOrder: mockUpdateOrder,
      removeOrder: mockRemoveOrder,
      updateTableStatus: mockUpdateTableStatus,
      getOrderById: mockGetOrderById,
      setTableEngaged: mockSetTableEngaged,
      setOrderEngaged: mockSetOrderEngaged,
    };
    // Silence handler logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore?.();
    console.error.mockRestore?.();
    console.warn.mockRestore?.();
  });

  // ---------------------------------------------------------------------------
  // B107v2-T1: Cancelled order → remove
  // ---------------------------------------------------------------------------
  test('B107v2-T1: removes order when transformed status is "cancelled"', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'cancelled' });
    orderFromAPI.order.mockReturnValue({ orderId: 730217, status: 'cancelled', tableId: 5 });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // B107v2-T2: Paid order → remove
  // ---------------------------------------------------------------------------
  test('B107v2-T2: removes order when transformed status is "paid"', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'paid' });
    orderFromAPI.order.mockReturnValue({ orderId: 730217, status: 'paid', tableId: 5 });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // B107v2-T3: Other statuses → update
  // ---------------------------------------------------------------------------
  test.each(['running', 'preparing', 'ready', 'served', 'hold'])(
    'B107v2-T3: updates order when transformed status is "%s" (not cancelled/paid)',
    async (status) => {
      const apiOrder = createMockApiOrder({ food_order_status: status });
      const transformed = { orderId: 730217, status, tableId: 5 };
      orderFromAPI.order.mockReturnValue(transformed);

      const message = createV2Message(730217, apiOrder);

      await handleUpdateOrderStatus(message, context);

      expect(mockUpdateOrder).toHaveBeenCalledWith(730217, transformed);
      expect(mockRemoveOrder).not.toHaveBeenCalled();
    }
  );

  // ---------------------------------------------------------------------------
  // B107v2-T4: Invalid message → early return
  // ---------------------------------------------------------------------------
  test('B107v2-T4: returns early on invalid message format (no context calls)', async () => {
    // Pass a malformed message that parseMessage will reject (null / non-array).
    await handleUpdateOrderStatus(null, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
    expect(orderFromAPI.order).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // B107v2-T5: Missing/empty payload.orders → early return
  // ---------------------------------------------------------------------------
  test('B107v2-T5: returns early when payload.orders is missing', async () => {
    const message = ['update-order-status', 730217, 690, 'running', {}]; // payload exists but no .orders

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
    expect(orderFromAPI.order).not.toHaveBeenCalled();
  });

  test('B107v2-T5b: returns early when payload.orders is an empty array', async () => {
    const message = ['update-order-status', 730217, 690, 'running', { orders: [] }];

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // B107v2-T6: Transform throws → handler logs + returns gracefully
  // ---------------------------------------------------------------------------
  test('B107v2-T6: handles transform throw gracefully (no context mutations)', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'cancelled' });
    orderFromAPI.order.mockImplementation(() => {
      throw new Error('Transform failure');
    });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // BUG-042-C: status-9 (PayLater/Hold) → remove, but DO NOT force table available.
  // Regression anchors for 3 / 6 / 7 included alongside.
  // ---------------------------------------------------------------------------

  test('BUG-042-C / U-1: removes order when fOrderStatus === 9 and does NOT force table available', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'pendingPayment' });
    // Status-9 maps to 'pendingPayment' string; table derives to 'occupied'.
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'pendingPayment',
      fOrderStatus: 9,
      tableId: 5,
      tableStatus: 'occupied',
    });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    expect(mockUpdateOrder).not.toHaveBeenCalled();
    // CRITICAL: status-9 must NOT force the table to 'available'.
    // syncTableStatus is invoked WITHOUT an override → table derives to 'occupied'.
    expect(mockUpdateTableStatus).toHaveBeenCalledWith(5, 'occupied');
    expect(mockUpdateTableStatus).not.toHaveBeenCalledWith(5, 'available');
  });

  test('BUG-042-C / U-2 regression: status-3 (cancelled) still removes AND forces table available', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'cancelled' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'cancelled',
      fOrderStatus: 3,
      tableId: 5,
      tableStatus: 'occupied',
    });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    expect(mockUpdateTableStatus).toHaveBeenCalledWith(5, 'available');
  });

  test('BUG-042-C / U-3 regression: status-6 (paid) still removes AND forces table available', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'paid' });
    orderFromAPI.order.mockReturnValue({
      orderId: 730217,
      status: 'paid',
      fOrderStatus: 6,
      tableId: 5,
      tableStatus: 'occupied',
    });

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).toHaveBeenCalledWith(730217);
    expect(mockUpdateTableStatus).toHaveBeenCalledWith(5, 'available');
  });

  test('BUG-042-C / U-4 CRITICAL GUARD: status-7 (Yet-to-Confirm) is NOT removed', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'pending' });
    const transformed = {
      orderId: 730217,
      status: 'pending',
      fOrderStatus: 7,
      tableId: 5,
      tableStatus: 'yetToConfirm',
    };
    orderFromAPI.order.mockReturnValue(transformed);

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).toHaveBeenCalledWith(730217, transformed);
  });

  test('BUG-042-C / U-5 regression: status-5 (served) is NOT removed', async () => {
    const apiOrder = createMockApiOrder({ food_order_status: 'served' });
    const transformed = {
      orderId: 730217,
      status: 'served',
      fOrderStatus: 5,
      tableId: 5,
      tableStatus: 'occupied',
    };
    orderFromAPI.order.mockReturnValue(transformed);

    const message = createV2Message(730217, apiOrder);

    await handleUpdateOrderStatus(message, context);

    expect(mockRemoveOrder).not.toHaveBeenCalled();
    expect(mockUpdateOrder).toHaveBeenCalledWith(730217, transformed);
  });
});
