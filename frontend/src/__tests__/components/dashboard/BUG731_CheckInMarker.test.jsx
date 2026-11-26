// BUG-731: "Check In" system marker (isCheckInMarker) must NOT leak into ScanOrderPopOut
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScanOrderPopOut from '../../../components/dashboard/ScanOrderPopOut';

jest.mock('../../../utils/soundManager', () => ({ __esModule: true, default: { stop: jest.fn() } }), { virtual: true });

const MARKER = { id: 99, name: 'check in', qty: 1, unitPrice: 0, price: 0, status: 'preparing', foodStatus: 1, isCheckInMarker: true };

const scanOrderWithMarker = () => ({
  orderId: 101, id: 101, fOrderStatus: 7, isWebOrder: true, scheduled: false,
  createdAt: '2026-01-01T10:00:00Z', amount: 300, orderType: 'dineIn', tableNumber: 'T1',
  items: [
    { id: 1, name: 'Paneer', qty: 1, unitPrice: 100, status: 'preparing', foodStatus: 1 },
    { id: 2, name: 'Dal', qty: 1, unitPrice: 100, status: 'preparing', foodStatus: 1 },
    MARKER,
  ],
  rawOrderDetails: [{ id: 1 }, { id: 2 }, { id: 99 }],
});

const editOrderWithMarker = () => ({
  orderId: 202, id: 202, fOrderStatus: 2, isWebOrder: true, scheduled: false,
  createdAt: '2026-01-01T10:00:00Z', amount: 300,
  items: [
    { id: 11, name: 'Old Item', qty: 1, unitPrice: 50, status: 'served', foodStatus: 2 },
    MARKER,
    { id: 12, name: 'New A', qty: 1, unitPrice: 60, status: 'pending', isNotConfirmed: true },
  ],
});

const baseProps = { onAccept: jest.fn(), onReject: jest.fn(), onToggleSnooze: jest.fn(), snoozedOrders: new Set(), currencySymbol: '₹' };

describe('BUG-731 check-in marker hidden in ScanOrderPopOut', () => {
  test('normal mode: marker not rendered, not counted, not KOT-selectable', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[scanOrderWithMarker()]} onPrintKOT={onPrintKOT} />);
    // not rendered
    expect(screen.queryByText(/check in/i)).toBeNull();
    // item-count label excludes marker (2 real items, not 3)
    expect(screen.getByTestId('scan-order-popout-item-count')).toHaveTextContent('2 items');
    // KOT selection excludes marker
    const btn = screen.getByTestId('popout-print-kot-101');
    expect(btn).toHaveTextContent('KOT (2)');
    expect(screen.getByTestId('popout-kot-select-all')).toHaveTextContent('Deselect all (2)');
    // payload never contains the marker id 99
    fireEvent.click(btn);
    expect(onPrintKOT.mock.calls[0][1].map(i => i.id)).toEqual([1, 2]);
    expect(onPrintKOT.mock.calls[0][1].some(i => i.isCheckInMarker)).toBe(false);
  });

  test('edit mode: marker not shown in previously-ordered list', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[editOrderWithMarker()]} onPrintKOT={onPrintKOT} />);
    expect(screen.queryByText(/check in/i)).toBeNull();
    // prev list has only the 1 real old item, not 2
    expect(screen.getByTestId('popout-prev-items')).toHaveTextContent('Previously ordered items (1)');
    // only the 1 new item is KOT-selectable
    expect(screen.getByTestId('popout-print-kot-202')).toHaveTextContent('KOT (1)');
  });

  test('regression: order without marker is unaffected', () => {
    const onPrintKOT = jest.fn();
    const o = scanOrderWithMarker();
    o.items = o.items.filter(i => !i.isCheckInMarker);
    render(<ScanOrderPopOut {...baseProps} orders={[o]} onPrintKOT={onPrintKOT} />);
    expect(screen.getByTestId('popout-print-kot-101')).toHaveTextContent('KOT (2)');
    expect(screen.getByTestId('scan-order-popout-item-count')).toHaveTextContent('2 items');
  });
});
