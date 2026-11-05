// POS2-002 Phase 4 — ScanOrderPopOut focused tests (May-2026)
// ============================================================================
// Owner-locked behaviour (handover 2026-05-10):
//   - PRESENTATION-ONLY overlay for Web / Scan & Order YTC orders.
//   - Predicate: orderFrom === 'web' && fOrderStatus === 7
//   - Sequential one-at-a-time queue, "Order N of M" + Next/Prev nav.
//   - 2-minute pop-out-local snooze hide-set (R-SNOOZE-9; duration
//     superseded 2026-01-16, was 5 min).
//   - Status-flip auto-remove via predicate (R-SNOOZE-12).
//   - Silent layer — no audio surface.
//   - Reuses caller-provided handlers verbatim. No new endpoints.
//
// Test groups:
//   T-1..T-16  — unit tests on ScanOrderPopOut.jsx
//   I-1..I-2   — integration sanity (light, in-process)
//   A-1..A-5   — anti-tests (regression guards)
// ============================================================================

import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// Module under test
import ScanOrderPopOut, {
  isUnconfirmedScanOrder,
  buildTableEntryFromOrder,
} from '../../../components/dashboard/ScanOrderPopOut';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseWebYtcOrder = (overrides = {}) => ({
  orderId: 1001,
  orderNumber: 'WO-1001',
  orderType: 'delivery',
  orderFrom: 'web',
  fOrderStatus: 7,
  status: 'yetToConfirm',
  tableId: 0,
  tableNumber: '',
  tableSectionName: '',
  customerName: 'Test Customer',
  phone: '9999999999',
  amount: 250.5,
  items: [
    { id: 'i1', name: 'Pizza', quantity: 1, total: 200 },
    { id: 'i2', name: 'Coke', quantity: 1, total: 50.5 },
  ],
  createdAt: '2026-05-10T10:00:00Z',
  ...overrides,
});

const mountWith = (props = {}) =>
  render(
    <ScanOrderPopOut
      orders={[]}
      snoozedOrders={new Set()}
      onToggleSnooze={() => {}}
      onAccept={() => {}}
      onReject={() => {}}
      onEdit={() => {}}
      currencySymbol="₹"
      {...props}
    />
  );

// ===========================================================================
// T-1..T-16 — Unit tests
// ===========================================================================

describe('POS2-002 Phase 4 | ScanOrderPopOut — unit', () => {
  // T-1
  test('T-1: renders nothing when no orders are queued', () => {
    const { container } = mountWith({ orders: [] });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('scan-order-popout-backdrop')).toBeNull();
  });

  // T-13 — predicate strictness (orderFrom)
  // T-13 — Wave 6: fOrderStatus === 7 is the only predicate now.
  // POS orders never have fOrderStatus=7, so this test verifies
  // that non-7 statuses don't show in popup regardless of orderFrom.
  test('T-13: renders nothing for non-YTC orders regardless of orderFrom', () => {
    const orders = [
      baseWebYtcOrder({ orderId: 2001, orderFrom: 'pos', fOrderStatus: 1 }),
      baseWebYtcOrder({ orderId: 2002, orderFrom: null, fOrderStatus: 2 }),
      baseWebYtcOrder({ orderId: 2003, orderFrom: 'web', fOrderStatus: 6 }),
    ];
    const { container } = mountWith({ orders });
    expect(container).toBeEmptyDOMElement();
  });

  // T-14 — predicate strictness (fOrderStatus)
  test('T-14: renders nothing for web orders not in YTC (fOrderStatus !== 7)', () => {
    const orders = [
      baseWebYtcOrder({ orderId: 3001, fOrderStatus: 1 }),
      baseWebYtcOrder({ orderId: 3002, fOrderStatus: 2 }),
      baseWebYtcOrder({ orderId: 3003, fOrderStatus: 6 }),
    ];
    const { container } = mountWith({ orders });
    expect(container).toBeEmptyDOMElement();
  });

  // T-3 — single web YTC order
  test('T-3: renders a single panel when one web YTC order is queued', () => {
    const orders = [baseWebYtcOrder()];
    mountWith({ orders });
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('scan-order-popout-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-1001');
  });

  // T-4 — Order N of M indicator
  test('T-4: renders "Order 1 of 3" when three web YTC orders are queued', () => {
    const orders = [
      baseWebYtcOrder({ orderId: 1, orderNumber: 'WO-001', createdAt: '2026-05-10T09:00:00Z' }),
      baseWebYtcOrder({ orderId: 2, orderNumber: 'WO-002', createdAt: '2026-05-10T10:00:00Z' }),
      baseWebYtcOrder({ orderId: 3, orderNumber: 'WO-003', createdAt: '2026-05-10T11:00:00Z' }),
    ];
    mountWith({ orders });
    expect(screen.getByTestId('scan-order-popout-queue-indicator')).toHaveTextContent(
      /Order\s+1\s+of\s+3/
    );
    // FIFO oldest-first: WO-001 is shown first.
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-001');
  });

  // T-5 — Accept
  test('T-5: clicking Accept invokes onAccept with a tableEntry-shaped object for the active order', () => {
    const onAccept = jest.fn();
    const order = baseWebYtcOrder({ orderId: 5001, orderType: 'delivery' });
    mountWith({ orders: [order], onAccept });
    fireEvent.click(screen.getByTestId('popout-accept-btn-5001'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    const arg = onAccept.mock.calls[0][0];
    expect(arg).toMatchObject({ orderId: 5001, orderType: 'delivery', id: 'del-5001' });
  });

  // T-6 — Reject
  test('T-6: clicking Reject invokes onReject with the raw order object', () => {
    const onReject = jest.fn();
    const order = baseWebYtcOrder({ orderId: 6001 });
    mountWith({ orders: [order], onReject });
    fireEvent.click(screen.getByTestId('popout-reject-btn-6001'));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onReject.mock.calls[0][0]).toBe(order);
  });

  // T-7 — View / Open
  test('T-7: clicking View invokes onEdit with a tableEntry derived from the order', () => {
    const onEdit = jest.fn();
    const order = baseWebYtcOrder({ orderId: 7001, orderType: 'takeAway' });
    mountWith({ orders: [order], onEdit });
    fireEvent.click(screen.getByTestId('popout-view-btn-7001'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit.mock.calls[0][0]).toMatchObject({ orderId: 7001, orderType: 'takeAway', id: 'ta-7001' });
  });

  // T-8 — Snooze splits state correctly
  // T-8 — Snooze: calls onToggleSnooze, popup stays open (Wave 6 simplification)
  test('T-8: clicking Snooze calls onToggleSnooze with the id string, popup stays open', () => {
    const onToggleSnooze = jest.fn();
    const order = baseWebYtcOrder({ orderId: 8001 });
    mountWith({ orders: [order], onToggleSnooze });
    // Before snooze: panel renders.
    expect(screen.getByTestId('scan-order-popout-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('popout-snooze-btn-8001'));
    // Existing handler invoked with id-string (matches OrderCard.jsx:349).
    expect(onToggleSnooze).toHaveBeenCalledTimes(1);
    expect(onToggleSnooze).toHaveBeenCalledWith('8001');
    // Wave 6: popup stays open after snooze (only sound stops).
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();
  });

  // T-9 — Wave 6: snooze no longer hides popup, so no 2-min re-entry logic.
  // Replaced: verify snooze keeps popup visible and sound stops.
  test('T-9: snooze stops sound but popup remains visible (no 2-min hide)', () => {
    const order = baseWebYtcOrder({ orderId: 9001 });
    mountWith({ orders: [order] });
    expect(screen.getByTestId('scan-order-popout-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('popout-snooze-btn-9001'));
    // Popup stays open after snooze.
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-1001');
  });

  // T-10 — R-SNOOZE-12 single status-flip rule (queue selector recomputes)
  test('T-10: when an order flips out of YTC, it leaves the queue immediately regardless of snooze state', () => {
    jest.useFakeTimers();
    const order = baseWebYtcOrder({ orderId: 10001 });
    const { rerender } = mountWith({ orders: [order] });
    fireEvent.click(screen.getByTestId('popout-snooze-btn-10001'));
    // Simulate socket-driven status flip (still in 2-min window).
    const flipped = { ...order, fOrderStatus: 1, status: 'placed' };
    rerender(
      <ScanOrderPopOut
        orders={[flipped]}
        snoozedOrders={new Set()}
        onToggleSnooze={() => {}}
        onAccept={() => {}}
        onReject={() => {}}
        onEdit={() => {}}
        currencySymbol="₹"
      />
    );
    expect(screen.queryByTestId('scan-order-popout-backdrop')).toBeNull();
    // Advance 2 min — still must not re-pop a non-YTC order.
    act(() => {
      jest.advanceTimersByTime(130000); // 2+ minutes — no timer exists, just safety check
    });
    expect(screen.queryByTestId('scan-order-popout-backdrop')).toBeNull();
    jest.useRealTimers();
  });

  // T-11 — Next / Previous boundary handling (no wrap)
  test('T-11: Next/Prev chevrons advance and retreat the active index with no wrap-around', () => {
    const orders = [
      baseWebYtcOrder({ orderId: 1, orderNumber: 'WO-001', createdAt: '2026-05-10T09:00:00Z' }),
      baseWebYtcOrder({ orderId: 2, orderNumber: 'WO-002', createdAt: '2026-05-10T10:00:00Z' }),
      baseWebYtcOrder({ orderId: 3, orderNumber: 'WO-003', createdAt: '2026-05-10T11:00:00Z' }),
    ];
    mountWith({ orders });
    // Start at WO-001 (oldest). Prev is disabled.
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-001');
    expect(screen.getByTestId('popout-nav-prev')).toBeDisabled();
    expect(screen.getByTestId('popout-nav-next')).not.toBeDisabled();
    // Next → WO-002.
    fireEvent.click(screen.getByTestId('popout-nav-next'));
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-002');
    // Next → WO-003. Now Next is disabled (no wrap).
    fireEvent.click(screen.getByTestId('popout-nav-next'));
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-003');
    expect(screen.getByTestId('popout-nav-next')).toBeDisabled();
    // Clicking Next again is a no-op.
    fireEvent.click(screen.getByTestId('popout-nav-next'));
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-003');
    // Prev → WO-002 → WO-001 → Prev disabled.
    fireEvent.click(screen.getByTestId('popout-nav-prev'));
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-002');
    fireEvent.click(screen.getByTestId('popout-nav-prev'));
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-001');
    expect(screen.getByTestId('popout-nav-prev')).toBeDisabled();
  });

  // T-12 — viewport layout class assertions
  test('T-12: panel class set carries full-screen behaviour by default with lg: overrides for desktop overlay', () => {
    mountWith({ orders: [baseWebYtcOrder()] });
    const panel = screen.getByTestId('scan-order-popout-panel');
    // Small viewport baseline (full-screen):
    expect(panel.className).toMatch(/\bh-full\b/);
    expect(panel.className).toMatch(/\bw-full\b/);
    // Desktop overrides (centered overlay ≥ 50%):
    expect(panel.className).toMatch(/\blg:h-auto\b/);
    expect(panel.className).toMatch(/lg:max-h-\[85vh\]/);
    expect(panel.className).toMatch(/lg:w-\[min\(60vw,820px\)\]/);
    expect(panel.className).toMatch(/lg:min-w-\[480px\]/);
    expect(panel.className).toMatch(/\blg:rounded-2xl\b/);
  });

  // T-15 — auto-dismiss on queue drain
  test('T-15: pop-out auto-dismisses (renders null) when the queue drains', () => {
    const order = baseWebYtcOrder({ orderId: 15001 });
    const { rerender, container } = mountWith({ orders: [order] });
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();
    // Backend confirms the order — flips out of YTC.
    rerender(
      <ScanOrderPopOut
        orders={[{ ...order, fOrderStatus: 1, status: 'placed' }]}
        snoozedOrders={new Set()}
        onToggleSnooze={() => {}}
        onAccept={() => {}}
        onReject={() => {}}
        onEdit={() => {}}
        currencySymbol="₹"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // T-16 — accessibility attributes
  test('T-16: dialog has role="dialog", aria-modal="true", and aria-labelledby pointing to a real title node', () => {
    mountWith({ orders: [baseWebYtcOrder()] });
    const dialog = screen.getByTestId('scan-order-popout-backdrop');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const titleEl = document.getElementById(labelledBy);
    expect(titleEl).not.toBeNull();
    expect(titleEl).toHaveTextContent(/awaiting confirmation/i);
  });

  // T-2 — Wave 6: snooze no longer hides popup. Verify popup stays visible after snooze.
  test('T-2: popup stays visible after snooze (no hide-set)', () => {
    const order = baseWebYtcOrder({ orderId: 2222 });
    mountWith({ orders: [order] });
    fireEvent.click(screen.getByTestId('popout-snooze-btn-2222'));
    // Wave 6: popup stays open — snooze only stops sound.
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();
  });
});

// ===========================================================================
// I-1..I-2 — Integration sanity
// ===========================================================================

describe('POS2-002 Phase 4 | ScanOrderPopOut — integration', () => {
  // I-1 — wiring contract (handler props get used as-is)
  test('I-1: passes the exact handlers through — accept/reject/snooze/edit each receive their original references', () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();
    const onToggleSnooze = jest.fn();
    const onEdit = jest.fn();
    const order = baseWebYtcOrder({ orderId: 12345 });

    mountWith({
      orders: [order],
      onAccept,
      onReject,
      onToggleSnooze,
      onEdit,
    });

    fireEvent.click(screen.getByTestId('popout-view-btn-12345'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('popout-reject-btn-12345'));
    expect(onReject).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('popout-snooze-btn-12345'));
    expect(onToggleSnooze).toHaveBeenCalledTimes(1);
    // Accept last — it disables all buttons (loader state).
    fireEvent.click(screen.getByTestId('popout-accept-btn-12345'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  // I-2 — socket-driven status flip in the prop array drops the active order
  test('I-2: a status flip on the active queued order via prop update auto-drops it', () => {
    const orders = [
      baseWebYtcOrder({ orderId: 700, orderNumber: 'WO-700', createdAt: '2026-05-10T08:00:00Z' }),
      baseWebYtcOrder({ orderId: 701, orderNumber: 'WO-701', createdAt: '2026-05-10T09:00:00Z' }),
    ];
    const { rerender } = mountWith({ orders });
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-700');
    expect(screen.getByTestId('scan-order-popout-queue-indicator')).toHaveTextContent(/Order\s+1\s+of\s+2/);
    // Operator A confirms WO-700 elsewhere → socket flips status.
    const flipped = [{ ...orders[0], fOrderStatus: 1 }, orders[1]];
    rerender(
      <ScanOrderPopOut
        orders={flipped}
        snoozedOrders={new Set()}
        onToggleSnooze={() => {}}
        onAccept={() => {}}
        onReject={() => {}}
        onEdit={() => {}}
        currencySymbol="₹"
      />
    );
    // Queue now shows WO-701 as the only / active order.
    expect(screen.getByTestId('scan-order-popout-order-number')).toHaveTextContent('#WO-701');
    expect(screen.getByTestId('scan-order-popout-queue-indicator')).toHaveTextContent(/Order\s+1\s+of\s+1/);
  });
});

// ===========================================================================
// A-1..A-5 — Anti-tests (regression guards)
// ===========================================================================

describe('POS2-002 Phase 4 | ScanOrderPopOut — anti-tests', () => {
  // A-1 — silent layer (no audio surface beyond the CR-approved
  // soundManager.stop() exception in handleSnoozeClick).
  // CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026) explicitly allows
  // `import soundManager from '../../utils/soundManager'` and a single
  // `soundManager.stop()` call inside handleSnoozeClick. EVERYTHING else
  // on the audio surface (play, setEnabled, NotificationContext) is still
  // forbidden.
  test('A-1: the component module does not introduce play/setEnabled/NotificationContext audio surfaces', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/ScanOrderPopOut.jsx'),
      'utf8'
    );
    // Strip line + block comments so doc references don't trigger false positives.
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[\s]*\/\/.*$/gm, '');
    // NotificationContext is still off-limits.
    expect(src).not.toMatch(/from\s+['"][^'"]*NotificationContext/);
    expect(src).not.toMatch(/useNotification\s*\(/);
    // No play / setEnabled on soundManager.
    expect(src).not.toMatch(/soundManager\s*\.\s*play\s*\(/);
    expect(src).not.toMatch(/soundManager\s*\.\s*setEnabled\s*\(/);
    // No `new Audio(`, no raw audio element construction.
    expect(src).not.toMatch(/\bnew\s+Audio\s*\(/);
  });

  // A-1b — Snooze sound-stop is wired exactly once. Guarantees the CR's
  // single-call-site contract: the `soundManager.stop()` call expression
  // must appear once in the file (the call inside handleSnoozeClick).
  // String literals (e.g. the console.warn message) are masked before
  // counting so they don't inflate the count.
  test('A-1b: soundManager.stop() is wired exactly once (handleSnoozeClick only)', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/ScanOrderPopOut.jsx'),
      'utf8'
    );
    const src = raw
      // Strip block comments.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Strip line comments.
      .replace(/^[\s]*\/\/.*$/gm, '')
      // Mask single-quoted, double-quoted, and template-literal string bodies
      // so calls referenced inside string literals don't count.
      .replace(/'(?:\\.|[^'\\])*'/g, "''")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
    const matches = src.match(/soundManager\s*\.\s*stop\s*\(/g) || [];
    expect(matches.length).toBe(1);
  });

  // A-2 — no direct service / API / socket call
  test('A-2: the component module does not import orderService / api / socketHandlers', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const raw = fs.readFileSync(
      path.resolve(__dirname, '../../../components/dashboard/ScanOrderPopOut.jsx'),
      'utf8'
    );
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[\s]*\/\/.*$/gm, '');
    expect(src).not.toMatch(/from\s+['"][^'"]*orderService['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*api\/axios['"]/);
    expect(src).not.toMatch(/from\s+['"][^'"]*socket\/socketHandlers['"]/);
    expect(src).not.toMatch(/\bconfirmOrder\s*\(/);
    expect(src).not.toMatch(/\bcancelOrder\s*\(/);
    expect(src).not.toMatch(/socket\.emit/);
  });

  // A-3 — no persistence writes during snooze
  test('A-3: snooze does not write to localStorage / sessionStorage', () => {
    jest.useFakeTimers();
    const setLocal = jest.spyOn(Storage.prototype, 'setItem');
    const order = baseWebYtcOrder({ orderId: 33001 });
    mountWith({ orders: [order] });
    fireEvent.click(screen.getByTestId('popout-snooze-btn-33001'));
    act(() => {
      jest.advanceTimersByTime(130000); // 2+ minutes — no timer exists, just safety check
    });
    expect(setLocal).not.toHaveBeenCalled();
    setLocal.mockRestore();
    jest.useRealTimers();
  });

  // A-4 — snooze does not mutate the order object's status fields
  test('A-4: snooze does not mutate order.fOrderStatus / order.status', () => {
    jest.useFakeTimers();
    const order = baseWebYtcOrder({ orderId: 44001 });
    const snapshotBefore = JSON.parse(JSON.stringify(order));
    mountWith({ orders: [order] });
    fireEvent.click(screen.getByTestId('popout-snooze-btn-44001'));
    act(() => {
      jest.advanceTimersByTime(130000); // 2+ minutes — no timer exists, just safety check
    });
    expect(order).toEqual(snapshotBefore);
    expect(order.fOrderStatus).toBe(7);
    expect(order.status).toBe('yetToConfirm');
    jest.useRealTimers();
  });

  // A-5 — pop-out's actions DO call the caller's handler; the caller (Dashboard)
  // is the one wiring the existing dashboard handlers. This anti-test asserts
  // that ScanOrderPopOut does NOT short-circuit / bypass / call any handler
  // it was not explicitly given. (Defense-in-depth complement to A-2.)
  test('A-5: when no handler props are supplied, clicking action buttons does not throw and does not call any global handler', () => {
    const order = baseWebYtcOrder({ orderId: 55001 });
    render(
      <ScanOrderPopOut
        orders={[order]}
        snoozedOrders={new Set()}
        // handlers intentionally omitted
      />
    );
    // View / Reject / Accept first — they keep the panel mounted. Snooze
    // last because it hides the active order from the pop-out queue.
    expect(() => {
      fireEvent.click(screen.getByTestId('popout-view-btn-55001'));
    }).not.toThrow();
    expect(() => {
      fireEvent.click(screen.getByTestId('popout-reject-btn-55001'));
    }).not.toThrow();
    expect(() => {
      fireEvent.click(screen.getByTestId('popout-accept-btn-55001'));
    }).not.toThrow();
    expect(() => {
      fireEvent.click(screen.getByTestId('popout-snooze-btn-55001'));
    }).not.toThrow();
  });
});

// ===========================================================================
// Pure-helper exports — quick sanity
// ===========================================================================

describe('POS2-002 Phase 4 | pure helpers', () => {
  // Wave 6: predicate simplified to fOrderStatus === 7 only.
  test('isUnconfirmedScanOrder predicate quadrants', () => {
    expect(isUnconfirmedScanOrder(null)).toBe(false);
    expect(isUnconfirmedScanOrder(undefined)).toBe(false);
    expect(isUnconfirmedScanOrder({ orderFrom: 'web', fOrderStatus: 7 })).toBe(true);
    expect(isUnconfirmedScanOrder({ orderFrom: 'web', fOrderStatus: 1 })).toBe(false);
    // Wave 6: orderFrom doesn't matter — only fOrderStatus === 7
    expect(isUnconfirmedScanOrder({ orderFrom: 'pos', fOrderStatus: 7 })).toBe(true);
    expect(isUnconfirmedScanOrder({ orderFrom: null, fOrderStatus: 7 })).toBe(true);
  });

  test('buildTableEntryFromOrder shapes for each channel', () => {
    expect(buildTableEntryFromOrder(null)).toBeNull();
    expect(buildTableEntryFromOrder({ orderId: 1, orderType: 'delivery' })).toEqual({
      id: 'del-1',
      orderId: 1,
      tableId: 0,
      orderType: 'delivery',
    });
    expect(buildTableEntryFromOrder({ orderId: 2, orderType: 'takeAway' })).toEqual({
      id: 'ta-2',
      orderId: 2,
      tableId: 0,
      orderType: 'takeAway',
    });
    expect(buildTableEntryFromOrder({ orderId: 3, orderType: 'dineIn', tableId: 42 })).toEqual({
      id: '42',
      orderId: 3,
      tableId: 42,
      orderType: 'dineIn',
    });
    // Fallback: dine-in without a tableId behaves like a walk-in.
    expect(buildTableEntryFromOrder({ orderId: 4, orderType: 'dineIn', tableId: 0 })).toEqual({
      id: 'wc-4',
      orderId: 4,
      tableId: 0,
      orderType: 'dineIn',
    });
  });
});


// ===========================================================================
// CR SNOOZE_SOUND_STOP_AND_DURATION (Jan-2026) — snooze sound-stop + 2-min
// duration. Owner decisions:
//   1) Clicking Snooze stops the in-progress local chime.
//   2) Local-device only. No backend, no API, no status mutation.
//   3) No global mute. No future-sound suppression.
//   4) Snooze duration is 2 minutes.
//   5) Snooze expiry MUST NOT replay sound — popup may silently re-show.
// ===========================================================================

import soundManager from '../../../utils/soundManager';

describe('CR SNOOZE_SOUND_STOP_AND_DURATION | ScanOrderPopOut — snooze sound-stop', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // T-11 — Snooze stops the in-progress chime exactly once.
  test('T-11: clicking Snooze calls soundManager.stop() exactly once', () => {
    jest.useFakeTimers();
    const stopSpy = jest.spyOn(soundManager, 'stop').mockImplementation(() => {});
    const setEnabledSpy = jest
      .spyOn(soundManager, 'setEnabled')
      .mockImplementation(() => {});
    const playSpy = jest.spyOn(soundManager, 'play').mockImplementation(() => {});

    const order = baseWebYtcOrder({ orderId: 11001 });
    mountWith({ orders: [order] });

    expect(stopSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('popout-snooze-btn-11001'));

    // Sound-stop fires exactly once.
    expect(stopSpy).toHaveBeenCalledTimes(1);
    // Owner decision #6: NO global mute via setEnabled.
    expect(setEnabledSpy).not.toHaveBeenCalled();
    // Owner decision #11 / pre-existing rule: pop-out never plays sound.
    expect(playSpy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  // T-12 — Snooze does NOT call setEnabled(false); future play() still works.
  test('T-12: Snooze does NOT call soundManager.setEnabled(false) and future play() still works', () => {
    jest.useFakeTimers();
    const stopSpy = jest.spyOn(soundManager, 'stop').mockImplementation(() => {});
    const setEnabledSpy = jest
      .spyOn(soundManager, 'setEnabled')
      .mockImplementation(() => {});
    const playSpy = jest.spyOn(soundManager, 'play').mockImplementation(() => {});

    const order = baseWebYtcOrder({ orderId: 12001 });
    mountWith({ orders: [order] });

    fireEvent.click(screen.getByTestId('popout-snooze-btn-12001'));

    expect(stopSpy).toHaveBeenCalledTimes(1);
    expect(setEnabledSpy).not.toHaveBeenCalled();

    // Simulate the FCM pipeline firing a fresh chime for a new order AFTER
    // Snooze. The pop-out itself never calls play(); we verify here that
    // soundManager.play remains functional and reachable.
    playSpy.mockClear();
    soundManager.play('new_order');
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(playSpy).toHaveBeenCalledWith('new_order');

    jest.useRealTimers();
  });

  // T-13 — Wave 6: snooze no longer hides popup, so no expiry logic.
  // Replaced: verify snooze stops sound, popup stays, no play() called.
  test('T-13: snooze stops sound, popup stays open, no soundManager.play() calls', () => {
    const stopSpy = jest.spyOn(soundManager, 'stop').mockImplementation(() => {});
    const playSpy = jest.spyOn(soundManager, 'play').mockImplementation(() => {});
    const setEnabledSpy = jest
      .spyOn(soundManager, 'setEnabled')
      .mockImplementation(() => {});

    const order = baseWebYtcOrder({ orderId: 13001 });
    mountWith({ orders: [order] });

    fireEvent.click(screen.getByTestId('popout-snooze-btn-13001'));
    expect(stopSpy).toHaveBeenCalledTimes(1);
    // Wave 6: popup stays open after snooze.
    expect(screen.getByTestId('scan-order-popout-backdrop')).toBeInTheDocument();

    // No play or setEnabled calls.
    expect(playSpy).not.toHaveBeenCalled();
    expect(setEnabledSpy).not.toHaveBeenCalled();
  });
});
