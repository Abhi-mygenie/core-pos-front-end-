// BUG-648: Unit test — WeightEntryModal select-on-focus
// Verifies that the weight input's pre-filled value is selected on mount (autoFocus)
// so that typing replaces the value instead of appending to it.

import React from 'react';
import { render, fireEvent } from '@testing-library/react';

// Mock useKeyboardShortcuts to avoid hook dependency
jest.mock('../../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
}));

// WeightEntryModal requires these props
const baseProps = {
  item: {
    name: 'Gopal Bhog',
    itemUnit: 'Kg',
    itemUnitPrice: 460,
    food_details: { unit: 'Kg', unit_price: 460 },
  },
  onConfirm: jest.fn(),
  onClose: jest.fn(),
  kbdEnabled: false,
};

describe('BUG-648: WeightEntryModal select-on-focus', () => {
  let selectSpy;

  beforeEach(() => {
    selectSpy = jest.spyOn(HTMLInputElement.prototype, 'select');
  });

  afterEach(() => {
    selectSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('calls select() on mount with kbdEnabled=false', () => {
    const { getByTestId } = render(<WeightEntryModal {...baseProps} kbdEnabled={false} />);
    const input = getByTestId('weight-input');
    expect(input).toBeTruthy();
    expect(selectSpy).toHaveBeenCalled();
  });

  it('calls select() on mount with kbdEnabled=true', () => {
    const { getByTestId } = render(<WeightEntryModal {...baseProps} kbdEnabled={true} />);
    const input = getByTestId('weight-input');
    expect(input).toBeTruthy();
    expect(selectSpy).toHaveBeenCalled();
  });

  it('calls select() again after blur then re-focus', () => {
    const { getByTestId } = render(<WeightEntryModal {...baseProps} kbdEnabled={false} />);
    const input = getByTestId('weight-input');
    selectSpy.mockClear();
    fireEvent.blur(input);
    fireEvent.focus(input);
    expect(selectSpy).toHaveBeenCalled();
  });
});

// Lazy-require so mock is in place before import
const { default: WeightEntryModal } = require('../../components/order-entry/WeightEntryModal');
