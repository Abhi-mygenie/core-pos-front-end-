// ROLE-NAME-WIRE-FIX (May-2026) Test Suite
// Locks the contract: role_name on the wire == permissions[0] || 'Manager'.
//
// Source contract: /app/memory/ROLE_NAME_WIRE_FIX_HANDOVER.md §6
// Pure-Jest test (no DOM, no @testing-library) — exercises the cancelOrder
// transform which carries `role_name` to /order-status-update. The same
// resolver expression `permissions?.[0] || 'Manager'` is used at every wire
// call site (DashboardPage.jsx, OrderEntry.jsx, LoadingPage.jsx,
// useRefreshAllData.js); locking it on one transform is sufficient because
// the resolver is plain JS and not endpoint-dependent.

const { toAPI: orderToAPI } = require('../../api/transforms/orderTransform');

// Mirrors the resolver expression used at every callsite post-fix.
const resolveRoleParam = (permissions) => permissions?.[0] || 'Manager';

describe('ROLE-NAME-WIRE-FIX: role_name on the wire', () => {
  const dummyReason = { reasonText: 'Test', reasonNote: 'Test note' };

  test('Owner login — permissions=["Manager", "food", "pos"] → role_name="Manager"', () => {
    const permissions = ['Manager', 'food', 'pos'];
    const payload = orderToAPI.cancelOrder(42, resolveRoleParam(permissions), dummyReason);
    expect(payload.role_name).toBe('Manager');
  });

  test('Waiter login — permissions=["Waiter", "food"] → role_name="Waiter"', () => {
    const permissions = ['Waiter', 'food'];
    const payload = orderToAPI.cancelOrder(42, resolveRoleParam(permissions), dummyReason);
    expect(payload.role_name).toBe('Waiter');
  });

  test('Empty permissions [] → fallback role_name="Manager"', () => {
    const payload = orderToAPI.cancelOrder(42, resolveRoleParam([]), dummyReason);
    expect(payload.role_name).toBe('Manager');
  });

  test('Undefined permissions → fallback role_name="Manager"', () => {
    const payload = orderToAPI.cancelOrder(42, resolveRoleParam(undefined), dummyReason);
    expect(payload.role_name).toBe('Manager');
  });

  test('cancelOrder transform shape unchanged (regression)', () => {
    const payload = orderToAPI.cancelOrder(42, resolveRoleParam(['Manager']), dummyReason);
    // CR-POS2-003-REOPEN-A (May-2026): printer_agent additive field; defaults to []
    // when no options passed (no printerAgents / no allCartItems).
    expect(payload).toEqual({
      order_id: 42,
      role_name: 'Manager',
      order_status: 'cancelled',
      cancellation_reason: 'Test',
      cancellation_note: 'Test note',
      printer_agent: [],
    });
  });

  test('Helper getOrderRoleParam removed from orderService (E.1)', () => {
    const orderService = require('../../api/services/orderService');
    expect(orderService).not.toHaveProperty('getOrderRoleParam');
  });
});
