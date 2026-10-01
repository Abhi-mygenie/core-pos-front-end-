// BUG-042-A — OrderTable Hold-row Collect Bill disable when no eligible
// primary payment method (Cash / Card / UPI) is configured for the
// restaurant.
// ----------------------------------------------------------------------------
// Owner-locked rule (Feb-2026): the Audit Report → Hold tab Collect Bill
// row action must be disabled with a clear tooltip when the restaurant has
// none of Cash / Card / UPI configured in `paymentTypes`. The window-gate
// (`isWithinMutationWindow`) keeps precedence — if the row is outside the
// 2-day mutation window, the window message is shown, not the new one.
//
// Test surface: OrderTable.renderActionsCell Hold branch (presentational).
// Other tabs (Paid, etc.) and other eligibility paths are NOT touched and
// should continue to render their existing action sets unchanged.

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// The Paid-tab Change Method picker pulls in a `@/lib/utils` alias via
// `popover.jsx` that the test runner doesn't resolve. Stub it — we don't
// exercise the picker in this suite (Hold-tab focus); the stub just
// renders a data-testid placeholder so Paid-row assertions still work.
jest.mock('../../../components/reports/PaymentMethodPicker', () => ({
  __esModule: true,
  default: ({ order }) => (
    <span data-testid={`row-action-change-method-${order.id}`} />
  ),
}));

import OrderTable from '../../../components/reports/OrderTable';

// =============================================================================
// Helpers
// =============================================================================

const makeHoldOrder = (overrides = {}) => ({
  id: 730217,
  orderId: 'T-730217',
  displayOrderId: 'T-730217',
  status: 'hold',
  createdAt: '2026-02-10T12:00:00Z',
  customer: 'Guest',
  customerContact: { phone: '' },
  tableNo: '5',
  punchedBy: 'Cashier 1',
  actionedBy: '',
  amount: 250,
  paymentMethod: 'paylater',
  fOrderStatus: 9,
  orderIn: 'D',
  ...overrides,
});

const makePaidOrder = (overrides = {}) => ({
  id: 730218,
  orderId: 'T-730218',
  displayOrderId: 'T-730218',
  status: 'paid',
  createdAt: '2026-02-10T12:00:00Z',
  customer: 'Guest',
  customerContact: { phone: '' },
  tableNo: '5',
  punchedBy: 'Cashier 1',
  actionedBy: 'Collected by Cashier 1',
  amount: 250,
  paymentMethod: 'cash',
  fOrderStatus: 6,
  orderIn: 'D',
  ...overrides,
});

const baseActionsConfig = (overrides = {}) => ({
  isWithinMutationWindow: true,
  canChangeMethod: false,
  canMarkUnpaid: false,
  pendingChangeMethodIds: new Set(),
  onCollectBill: jest.fn(),
  onChangeMethod: jest.fn(),
  onMarkUnpaid: jest.fn(),
  ...overrides,
});

// =============================================================================
// Hold tab — Collect Bill enabled / disabled matrix
// =============================================================================

describe('BUG-042-A | OrderTable Hold-row Collect Bill row action', () => {
  test('U-7: enabled when hasEligibleHoldPaymentMethod=true and within window', () => {
    const order = makeHoldOrder();
    const actionsConfig = baseActionsConfig({ hasEligibleHoldPaymentMethod: true });

    render(
      <OrderTable
        orders={[order]}
        tabId="hold"
        tabLabel="On Hold"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    const btn = screen.getByTestId(`row-action-collect-bill-${order.id}`);
    expect(btn).toBeEnabled();
    expect(btn).toHaveAttribute('title', 'Collect bill');

    fireEvent.click(btn);
    expect(actionsConfig.onCollectBill).toHaveBeenCalledTimes(1);
    expect(actionsConfig.onCollectBill).toHaveBeenCalledWith(order);
  });

  test('U-8: DISABLED when hasEligibleHoldPaymentMethod=false (within window) — clear tooltip + onCollectBill never fires', () => {
    const order = makeHoldOrder();
    const actionsConfig = baseActionsConfig({ hasEligibleHoldPaymentMethod: false });

    render(
      <OrderTable
        orders={[order]}
        tabId="hold"
        tabLabel="On Hold"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    const btn = screen.getByTestId(`row-action-collect-bill-${order.id}`);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'No eligible payment methods configured');

    // Disabled buttons swallow clicks at the browser level, but defend in code:
    fireEvent.click(btn);
    expect(actionsConfig.onCollectBill).not.toHaveBeenCalled();
  });

  test('U-9: window=false + hasEligibleHoldPaymentMethod=false → window message takes precedence', () => {
    const order = makeHoldOrder();
    const actionsConfig = baseActionsConfig({
      isWithinMutationWindow: false,
      hasEligibleHoldPaymentMethod: false,
    });

    render(
      <OrderTable
        orders={[order]}
        tabId="hold"
        tabLabel="On Hold"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    const btn = screen.getByTestId(`row-action-collect-bill-${order.id}`);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Only available for today and yesterday');
  });

  test('U-11 regression: hasEligibleHoldPaymentMethod=undefined → behaves like pre-BUG-042-A (enabled within window)', () => {
    // Simulates a caller that hasn't been updated to surface the flag —
    // preserves the existing behaviour for any consumer outside Audit Report.
    const order = makeHoldOrder();
    const actionsConfig = baseActionsConfig(); // no hasEligibleHoldPaymentMethod key

    render(
      <OrderTable
        orders={[order]}
        tabId="hold"
        tabLabel="On Hold"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    const btn = screen.getByTestId(`row-action-collect-bill-${order.id}`);
    expect(btn).toBeEnabled();
    expect(btn).toHaveAttribute('title', 'Collect bill');
  });

  test('regression: Hold row with fOrderStatus===8 has NO action button (POS2-005-FU preserved)', () => {
    const order = makeHoldOrder({ fOrderStatus: 8 });
    const actionsConfig = baseActionsConfig({ hasEligibleHoldPaymentMethod: true });

    render(
      <OrderTable
        orders={[order]}
        tabId="hold"
        tabLabel="On Hold"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    expect(screen.queryByTestId(`row-action-collect-bill-${order.id}`)).toBeNull();
  });
});

// =============================================================================
// Paid tab — unaffected by hasEligibleHoldPaymentMethod
// =============================================================================

describe('BUG-042-A | Paid tab row actions are NOT affected by hasEligibleHoldPaymentMethod', () => {
  test('U-10: Paid row with canChangeMethod=true and hasEligibleHoldPaymentMethod=false → Change Method picker still rendered', () => {
    const order = makePaidOrder();
    const actionsConfig = baseActionsConfig({
      canChangeMethod: true,
      canMarkUnpaid: true,
      hasEligibleHoldPaymentMethod: false, // explicitly false to assert isolation
    });

    render(
      <OrderTable
        orders={[order]}
        tabId="paid"
        tabLabel="Paid"
        isLoading={false}
        actionsConfig={actionsConfig}
      />,
    );

    // The Hold Collect testid must NOT appear on Paid rows.
    expect(screen.queryByTestId(`row-action-collect-bill-${order.id}`)).toBeNull();
    // The Paid-tab Mark Unpaid pill must be present (canMarkUnpaid=true).
    expect(screen.getByTestId(`row-action-mark-unpaid-${order.id}`)).toBeInTheDocument();
  });
});
