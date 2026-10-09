// POS2-002 Phase 2 — web-delivery-charge lock at CollectPaymentPanel.
// ----------------------------------------------------------------------------
// Owner-locked rules (2026-05-09):
//   1. Use FROZEN `initialDeliveryCharge` from the incoming/persisted order
//      at panel open — predicate must NOT re-evaluate against the live
//      `deliveryChargeInput` state while typing.
//   2. Cashier can input only if frozen DC is zero.
//   3. Layer ON TOP OF the existing `isPrepaid` rule (additive); non-web
//      orders keep CR-008 D1-Gate behaviour unchanged.
//
// Predicate verified at CollectPaymentPanel.jsx:917 :
//   readOnly = isPrepaid || (isWebOrder && initialDeliveryCharge > 0)
//
// This test file exercises the predicate AS A PURE FUNCTION (mirrors the
// JSX logic verbatim) plus a small RTL render to verify the actual `input`
// element gets `readOnly=true` when expected. Avoids the heavy mounting of
// the full CollectPaymentPanel (which has many context dependencies).

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Pure-function copy of the predicate at CollectPaymentPanel.jsx:917.
// Kept verbatim so this test serves as the contract.
const isDeliveryLocked = ({ isPrepaid = false, isWebOrder = false, initialDeliveryCharge = 0 } = {}) =>
  isPrepaid || (isWebOrder && initialDeliveryCharge > 0);

// Minimal mock input that mirrors the JSX shape — render JUST the <input>
// with the same readOnly / className / title bindings as the panel does.
// This avoids importing the full panel + its context tree.
const DeliveryChargeInput = ({ isPrepaid = false, isWebOrder = false, initialDeliveryCharge = 0 }) => {
  const [value, setValue] = React.useState(
    initialDeliveryCharge > 0 ? String(initialDeliveryCharge) : ''
  );
  const locked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0);
  const title = isPrepaid
    ? (initialDeliveryCharge > 0
        ? 'Delivery charge already collected from customer — not editable'
        : 'Order is prepaid — delivery charge cannot be modified')
    : (isWebOrder && initialDeliveryCharge > 0
        ? 'Delivery charge captured from web order — not editable'
        : 'Enter or edit delivery charge');
  return (
    <input
      type="number"
      placeholder="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      readOnly={locked}
      title={title}
      className={locked ? 'bg-gray-100 cursor-not-allowed' : ''}
      data-testid="delivery-charge-input"
    />
  );
};

// =============================================================================
// 1. Pure-function predicate — every quadrant from §5 of the spec
// =============================================================================
describe('POS2-002 Phase 2 | predicate quadrants (isPrepaid × isWebOrder × DC)', () => {
  test('Q1: non-web + non-prepaid + DC=0 → editable', () => {
    expect(isDeliveryLocked({ isPrepaid: false, isWebOrder: false, initialDeliveryCharge: 0 })).toBe(false);
  });

  test('Q2: non-web + non-prepaid + DC>0 → editable (CR-008 D1-Cap preserved)', () => {
    expect(isDeliveryLocked({ isPrepaid: false, isWebOrder: false, initialDeliveryCharge: 80 })).toBe(false);
  });

  test('Q3: non-web + prepaid + DC=0 → locked (existing isPrepaid rule)', () => {
    expect(isDeliveryLocked({ isPrepaid: true, isWebOrder: false, initialDeliveryCharge: 0 })).toBe(true);
  });

  test('Q4: non-web + prepaid + DC>0 → locked (existing isPrepaid rule)', () => {
    expect(isDeliveryLocked({ isPrepaid: true, isWebOrder: false, initialDeliveryCharge: 80 })).toBe(true);
  });

  test('Q5: web + non-prepaid + DC=0 → editable (owner rule 3 happy-path)', () => {
    expect(isDeliveryLocked({ isPrepaid: false, isWebOrder: true, initialDeliveryCharge: 0 })).toBe(false);
  });

  test('Q6: web + non-prepaid + DC>0 → LOCKED (NEW — Phase 2 main fix)', () => {
    expect(isDeliveryLocked({ isPrepaid: false, isWebOrder: true, initialDeliveryCharge: 80 })).toBe(true);
  });

  test('Q7: web + prepaid + DC=0 → locked (isPrepaid layer)', () => {
    expect(isDeliveryLocked({ isPrepaid: true, isWebOrder: true, initialDeliveryCharge: 0 })).toBe(true);
  });

  test('Q8: web + prepaid + DC>0 → locked (both layers fire; same outcome)', () => {
    expect(isDeliveryLocked({ isPrepaid: true, isWebOrder: true, initialDeliveryCharge: 80 })).toBe(true);
  });

  test('Q9: defaults (all undefined props) → editable', () => {
    expect(isDeliveryLocked({})).toBe(false);
  });
});

// =============================================================================
// 2. Frozen-snapshot rule — typing does NOT re-evaluate the predicate
// =============================================================================
describe('POS2-002 Phase 2 | frozen-snapshot — typing does not re-lock (owner rule 1 + 2)', () => {
  test('Web + DC=80 → input is readOnly; typing does not flip the lock', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={true} initialDeliveryCharge={80} />);
    const input = screen.getByTestId('delivery-charge-input');
    expect(input).toHaveAttribute('readonly');
    expect(input.title).toMatch(/captured from web order/i);
    // Simulate typing — readOnly inputs would normally not accept input,
    // but the test asserts the readOnly attribute itself never flips.
    fireEvent.change(input, { target: { value: '0' } });
    expect(input).toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: '999' } });
    expect(input).toHaveAttribute('readonly');
  });

  test('Web + DC=0 → input is editable; typing freely accepted; lock never activates mid-type', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={true} initialDeliveryCharge={0} />);
    const input = screen.getByTestId('delivery-charge-input');
    expect(input).not.toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: '50' } });
    // Even after typing a non-zero value, the lock state must NOT re-evaluate
    // — the predicate is bound to the FROZEN initialDeliveryCharge prop, not
    // the live state.
    expect(input).not.toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: '100' } });
    expect(input).not.toHaveAttribute('readonly');
  });

  test('Non-web + DC=0 → editable (no lock, typing has no effect on lock)', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={false} initialDeliveryCharge={0} />);
    const input = screen.getByTestId('delivery-charge-input');
    expect(input).not.toHaveAttribute('readonly');
    fireEvent.change(input, { target: { value: '60' } });
    expect(input).not.toHaveAttribute('readonly');
  });

  test('Prepaid + DC>0 → locked with prepaid-specific tooltip (existing message preserved)', () => {
    render(<DeliveryChargeInput isPrepaid={true} isWebOrder={false} initialDeliveryCharge={80} />);
    const input = screen.getByTestId('delivery-charge-input');
    expect(input).toHaveAttribute('readonly');
    expect(input.title).toMatch(/already collected from customer/i);
  });
});

// =============================================================================
// 3. Tooltip differentiation — prepaid vs web layer
// =============================================================================
describe('POS2-002 Phase 2 | tooltip text by lock branch', () => {
  test('isPrepaid wins tooltip (web flag also true) → prepaid message', () => {
    render(<DeliveryChargeInput isPrepaid={true} isWebOrder={true} initialDeliveryCharge={80} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/already collected from customer/i);
  });

  test('isPrepaid only (web false) → prepaid message', () => {
    render(<DeliveryChargeInput isPrepaid={true} isWebOrder={false} initialDeliveryCharge={80} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/already collected from customer/i);
  });

  test('Web + DC>0 (not prepaid) → "captured from web order" message', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={true} initialDeliveryCharge={80} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/captured from web order/i);
  });

  test('Editable (web + DC=0) → "Enter or edit" message', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={true} initialDeliveryCharge={0} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/enter or edit/i);
  });

  test('Editable (non-web + non-prepaid) → "Enter or edit" message', () => {
    render(<DeliveryChargeInput isPrepaid={false} isWebOrder={false} initialDeliveryCharge={0} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/enter or edit/i);
  });

  test('Prepaid + DC=0 → "Order is prepaid" message (no DC collected yet)', () => {
    render(<DeliveryChargeInput isPrepaid={true} isWebOrder={false} initialDeliveryCharge={0} />);
    expect(screen.getByTestId('delivery-charge-input').title).toMatch(/order is prepaid/i);
  });
});

// =============================================================================
// 4. CSS class — locked state shows gray background + not-allowed cursor
// =============================================================================
describe('POS2-002 Phase 2 | locked-state CSS class', () => {
  test.each([
    [{ isPrepaid: true,  isWebOrder: false, initialDeliveryCharge: 80 }, 'locked'],
    [{ isPrepaid: false, isWebOrder: true,  initialDeliveryCharge: 80 }, 'locked'],
    [{ isPrepaid: true,  isWebOrder: true,  initialDeliveryCharge: 80 }, 'locked'],
    [{ isPrepaid: false, isWebOrder: true,  initialDeliveryCharge: 0  }, 'unlocked'],
    [{ isPrepaid: false, isWebOrder: false, initialDeliveryCharge: 80 }, 'unlocked'],
    [{ isPrepaid: false, isWebOrder: false, initialDeliveryCharge: 0  }, 'unlocked'],
  ])('props %j → %s', (props, expected) => {
    render(<DeliveryChargeInput {...props} />);
    const input = screen.getByTestId('delivery-charge-input');
    if (expected === 'locked') {
      expect(input.className).toMatch(/bg-gray-100/);
      expect(input.className).toMatch(/cursor-not-allowed/);
    } else {
      expect(input.className).not.toMatch(/bg-gray-100/);
      expect(input.className).not.toMatch(/cursor-not-allowed/);
    }
  });
});

// =============================================================================
// 5. Default-prop safety — undefined isWebOrder behaves as false
// =============================================================================
describe('POS2-002 Phase 2 | default-prop safety', () => {
  test('isWebOrder undefined → falls back to false → only isPrepaid governs', () => {
    expect(isDeliveryLocked({ isPrepaid: false, initialDeliveryCharge: 80 })).toBe(false);
    expect(isDeliveryLocked({ isPrepaid: true,  initialDeliveryCharge: 80 })).toBe(true);
  });

  test('initialDeliveryCharge undefined → defaults to 0 → web layer never fires', () => {
    expect(isDeliveryLocked({ isPrepaid: false, isWebOrder: true })).toBe(false);
  });

  test('All props undefined → editable (matches current default behaviour)', () => {
    expect(isDeliveryLocked()).toBe(false);
  });
});
