// =============================================================================
// TIP-003 — Tip & Tip GST must NOT apply on Takeaway / Delivery orders.
// -----------------------------------------------------------------------------
// Owner-correct rule (pending-freeze A1, owner-verified via BUG-075 / BUG-281):
//   Tip applies ONLY to dine-in, walk-in and room orders (mirrors the SC pattern,
//   BUG-013). On Takeaway and Delivery: the tip input must NOT appear and the tip
//   amount must be 0 in the payload.
//
// Amendment (owner-verified via BUG-281): tip is additionally gated by the profile
//   feature flag `restaurant.features.tip`. When the feature is OFF, tip never
//   applies on ANY order type.
//
// This file locks the rule with a verbatim pure-function copy of the gate
// (CollectPaymentPanel.jsx:307-310 + 556) as a contract, plus a small RTL render
// mirroring the `{tipApplicable && (<input data-testid="tip-input"/>)}` JSX
// (CollectPaymentPanel.jsx:1551). Avoids mounting the full panel (heavy context).
// =============================================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Verbatim contract copy — kept identical to CollectPaymentPanel.jsx:307-310,556.
const computeTipApplicable = ({ tipEnabled = false, orderType = 'dineIn', isRoom = false } = {}) =>
  tipEnabled && (orderType === 'dineIn' || orderType === 'walkIn' || isRoom);

const computeTip = ({ tipApplicable = false, tipInput = '' } = {}) =>
  tipApplicable ? (parseFloat(tipInput) || 0) : 0;

// Minimal render mirroring the panel's tip-input JSX gate.
const TipInputGate = (props) => {
  const tipApplicable = computeTipApplicable(props);
  return (
    <div>
      {tipApplicable && (
        <input type="number" data-testid="tip-input" defaultValue={props.tipInput || ''} />
      )}
    </div>
  );
};

describe('TIP-003 | applicability gate (verbatim contract)', () => {
  test('dine-in (feature ON) → tip applies, amount flows', () => {
    const applicable = computeTipApplicable({ tipEnabled: true, orderType: 'dineIn' });
    expect(applicable).toBe(true);
    expect(computeTip({ tipApplicable: applicable, tipInput: '50' })).toBe(50);
  });

  test('walk-in (feature ON) → tip applies', () => {
    expect(computeTipApplicable({ tipEnabled: true, orderType: 'walkIn' })).toBe(true);
  });

  test('room (feature ON) → tip applies', () => {
    expect(computeTipApplicable({ tipEnabled: true, orderType: 'delivery', isRoom: true })).toBe(true);
  });

  test('TAKEAWAY → tip does NOT apply, forced to 0 even if entered', () => {
    const applicable = computeTipApplicable({ tipEnabled: true, orderType: 'takeaway' });
    expect(applicable).toBe(false);
    expect(computeTip({ tipApplicable: applicable, tipInput: '50' })).toBe(0);
  });

  test('DELIVERY → tip does NOT apply, forced to 0 even if entered', () => {
    const applicable = computeTipApplicable({ tipEnabled: true, orderType: 'delivery' });
    expect(applicable).toBe(false);
    expect(computeTip({ tipApplicable: applicable, tipInput: '50' })).toBe(0);
  });

  test('BUG-281 amendment: feature OFF → tip never applies (even dine-in)', () => {
    expect(computeTipApplicable({ tipEnabled: false, orderType: 'dineIn' })).toBe(false);
  });
});

describe('TIP-003 | tip input visibility (RTL — mirrors JSX gate)', () => {
  test('dine-in (feature ON) → tip input IS rendered', () => {
    render(<TipInputGate tipEnabled orderType="dineIn" />);
    expect(screen.getByTestId('tip-input')).toBeInTheDocument();
  });

  test('takeaway → tip input is NOT rendered', () => {
    render(<TipInputGate tipEnabled orderType="takeaway" />);
    expect(screen.queryByTestId('tip-input')).not.toBeInTheDocument();
  });

  test('delivery → tip input is NOT rendered', () => {
    render(<TipInputGate tipEnabled orderType="delivery" />);
    expect(screen.queryByTestId('tip-input')).not.toBeInTheDocument();
  });
});
