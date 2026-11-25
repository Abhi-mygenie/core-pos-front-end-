// CR-547: Selective KOT in ScanOrderPopOut — fresh fixtures (testing agent)
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ScanOrderPopOut from '../../../components/dashboard/ScanOrderPopOut';

jest.mock('../../../utils/soundManager', () => ({ __esModule: true, default: { stop: jest.fn() } }), { virtual: true });

const scanOrder = (over = {}) => ({
  orderId: 101, id: 101, fOrderStatus: 7, isWebOrder: true, scheduled: false,
  createdAt: '2026-01-01T10:00:00Z', amount: 300, orderType: 'dineIn', tableNumber: 'T1',
  items: [
    { id: 1, name: 'Paneer', qty: 1, unitPrice: 100, status: 'preparing', foodStatus: 1 },
    { id: 2, name: 'Dal', qty: 1, unitPrice: 100, status: 'preparing', foodStatus: 1 },
    { id: 3, name: 'Roti', qty: 1, unitPrice: 100, status: 'cancelled', foodStatus: 3 },
  ],
  rawOrderDetails: [{ id: 1 }, { id: 2 }, { id: 3 }],
  ...over,
});

const editOrder = () => ({
  orderId: 202, id: 202, fOrderStatus: 2, isWebOrder: true, scheduled: false,
  createdAt: '2026-01-01T10:00:00Z', amount: 300,
  items: [
    { id: 11, name: 'Old Item', qty: 1, unitPrice: 50, status: 'served', foodStatus: 2 },
    { id: 12, name: 'New A', qty: 1, unitPrice: 60, status: 'pending', isNotConfirmed: true },
    { id: 13, name: 'New B', qty: 1, unitPrice: 70, status: 'pending', isNotConfirmed: true },
  ],
});

const baseProps = { onAccept: jest.fn(), onReject: jest.fn(), onToggleSnooze: jest.fn(), snoozedOrders: new Set(), currencySymbol: '₹' };

describe('CR-547 Selective KOT', () => {
  test('normal mode: defaults all non-cancelled selected, KOT (2)', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[scanOrder()]} onPrintKOT={onPrintKOT} />);
    const btn = screen.getByTestId('popout-print-kot-101');
    expect(btn).toHaveTextContent('KOT (2)');
    expect(btn).not.toBeDisabled();
    expect(screen.getByTestId('popout-kot-select-all')).toHaveTextContent('Deselect all (2)');
    expect(screen.queryByTestId('popout-kot-check-2')).toBeNull(); // cancelled row has no checkbox
    fireEvent.click(btn);
    expect(onPrintKOT).toHaveBeenCalledTimes(1);
    const [order, selected] = onPrintKOT.mock.calls[0];
    expect(order.orderId).toBe(101);
    expect(selected.map(i => i.id).sort()).toEqual([1, 2]);
  });

  test('normal mode: toggle one item -> KOT (1) and prints only that item', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[scanOrder()]} onPrintKOT={onPrintKOT} />);
    fireEvent.click(screen.getByTestId('popout-kot-check-0'));
    const btn = screen.getByTestId('popout-print-kot-101');
    expect(btn).toHaveTextContent('KOT (1)');
    expect(screen.getByTestId('popout-kot-select-all')).toHaveTextContent('Select all (2)');
    fireEvent.click(btn);
    expect(onPrintKOT.mock.calls[0][1].map(i => i.id)).toEqual([2]);
  });

  test('normal mode: deselect all disables KOT, select all re-enables', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[scanOrder()]} onPrintKOT={onPrintKOT} />);
    const header = screen.getByTestId('popout-kot-select-all').querySelector('input');
    fireEvent.click(header);
    const btn = screen.getByTestId('popout-print-kot-101');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/^KOT$/);
    fireEvent.click(btn);
    expect(onPrintKOT).not.toHaveBeenCalled();
    fireEvent.click(header);
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveTextContent('KOT (2)');
  });

  test('edit mode: only new items selectable/selected by default', () => {
    const onPrintKOT = jest.fn();
    render(<ScanOrderPopOut {...baseProps} orders={[editOrder()]} onPrintKOT={onPrintKOT} />);
    const btn = screen.getByTestId('popout-print-kot-202');
    expect(btn).toHaveTextContent('KOT (2)');
    expect(screen.getByTestId('popout-kot-check-new-0')).toBeChecked();
    expect(screen.getByTestId('popout-kot-check-new-1')).toBeChecked();
    fireEvent.click(screen.getByTestId('popout-kot-check-new-1'));
    expect(btn).toHaveTextContent('KOT (1)');
    fireEvent.click(btn);
    expect(onPrintKOT.mock.calls[0][1].map(i => i.id)).toEqual([12]);
    fireEvent.click(screen.getByTestId('popout-kot-select-all').querySelector('input'));
    expect(btn).toHaveTextContent('KOT (2)');
    fireEvent.click(screen.getByTestId('popout-kot-select-all').querySelector('input'));
    expect(btn).toBeDisabled();
  });

  test('no onPrintKOT prop: no checkboxes rendered', () => {
    render(<ScanOrderPopOut {...baseProps} orders={[scanOrder()]} />);
    expect(screen.queryByTestId('popout-kot-select-all')).toBeNull();
    expect(screen.queryByTestId('popout-kot-check-0')).toBeNull();
  });

  test('same order re-render with a new socket item: count badge vs selection', () => {
    const onPrintKOT = jest.fn();
    const { rerender } = render(<ScanOrderPopOut {...baseProps} orders={[scanOrder()]} onPrintKOT={onPrintKOT} />);
    const o2 = scanOrder();
    o2.items = [...o2.items, { id: 4, name: 'Lassi', qty: 1, unitPrice: 50, status: 'preparing', foodStatus: 1 }];
    rerender(<ScanOrderPopOut {...baseProps} orders={[o2]} onPrintKOT={onPrintKOT} />);
    // Document current behavior: new item NOT auto-selected (selection resets only on order switch)
    const btn = screen.getByTestId('popout-print-kot-101');
    // eslint-disable-next-line no-console
    console.log('After socket add, KOT label =', btn.textContent);
  });
});
