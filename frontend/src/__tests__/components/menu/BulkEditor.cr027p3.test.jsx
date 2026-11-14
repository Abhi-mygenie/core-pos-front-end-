// CR-027 Phase 3 — BulkEditor row-error trail tests (OD-025-3 hybrid)
// Verifies: _saveError stored from err.readableMessage, tooltip on red indicator,
// ≤3 failures hover-hint toast, >3 failures [View errors] toast action + drawer,
// error clears on re-edit.

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import BulkEditor from '../../../components/panels/menu/BulkEditor';
import { Toaster } from '../../../components/ui/toaster';

jest.mock('../../../api/services/menuManagementService', () => ({
  addFood: jest.fn(),
  editFood: jest.fn(),
  toggleFoodStatus: jest.fn(),
  bulkExport: jest.fn(),
  exportSample: jest.fn(),
  bulkImport: jest.fn(),
}));

// CR-036-FU-03: BulkEditor now consumes useRestaurant(); mock it here so the
// CR-027 P3 test file can render BulkEditor without the RestaurantProvider.
// Default gstStatus=false → tax-required validation OFF (preserves CR-027 P3
// baseline behaviour where save validation only checks Name/Category/Price).
jest.mock('../../../contexts/RestaurantContext', () => ({
  useRestaurant: () => ({ restaurant: { tax: { gstStatus: false } } }),
}));

const menuService = require('../../../api/services/menuManagementService');

const makeFood = (i) => ({
  productId: i,
  productName: `Item ${i}`,
  categoryId: 1,
  categoryName: 'Cat',
  basePrice: 100 + i,
  isActive: true,
  itemType: 1,
  taxPercent: 5,
  taxType: 'GST',
});

const foods = [1, 2, 3, 4, 5].map(makeFood);
const categories = [{ categoryId: 1, categoryName: 'Cat' }];

const setup = () =>
  render(
    <>
      <BulkEditor foods={foods} categories={categories} stations={[]} menuType="Normal" onRefresh={jest.fn()} onClose={jest.fn()} />
      <Toaster />
    </>
  );

const dirtyRow = (id, price) => {
  const input = screen.getByTestId(`cell-basePrice-${id}`);
  fireEvent.change(input, { target: { value: String(price) } });
};

const clickSave = () => fireEvent.click(screen.getByTestId('footer-save-btn'));

const failWith = (msg) => {
  const err = new Error('Request failed with status code 400');
  err.readableMessage = msg;
  return err;
};

afterEach(() => jest.clearAllMocks());

describe('CR-027 Phase 3 | BulkEditor row-error trail', () => {
  test('≤3 failures: rows store readableMessage, tooltip on red indicator, hover-hint toast', async () => {
    menuService.editFood.mockImplementation((id) =>
      id === 1 ? Promise.reject(failWith('Price exceeds category cap')) : Promise.resolve({})
    );

    setup();
    dirtyRow(1, 999);
    dirtyRow(2, 222);
    clickSave();

    // Row 1 fails → red indicator with native-title tooltip carrying the backend message
    await waitFor(() => expect(screen.getByTestId('row-error-indicator-1')).toBeInTheDocument());
    expect(screen.getByTestId('row-error-indicator-1')).toHaveAttribute('title', 'Price exceeds category cap');

    // Toast: hover hint, NO [View errors] button
    await waitFor(() => expect(screen.getByText(/1 saved, 1 failed\. Hover red rows to see why\./)).toBeInTheDocument());
    expect(screen.queryByTestId('view-errors-toast-btn')).not.toBeInTheDocument();
  });

  test('>3 failures: [View errors] toast button opens drawer listing each row + message', async () => {
    menuService.editFood.mockImplementation((id) =>
      Promise.reject(failWith(`Backend rejected item ${id}`))
    );

    setup();
    [1, 2, 3, 4].forEach((id) => dirtyRow(id, 500 + id));
    clickSave();

    // Toast with action button
    const viewBtn = await screen.findByTestId('view-errors-toast-btn');
    expect(screen.getByText('4 saved, 4 failed.'.replace('4 saved', '0 saved'))).toBeInTheDocument();
    fireEvent.click(viewBtn);

    // Drawer lists all 4 failed rows with their backend messages
    const dialog = await screen.findByTestId('bulk-errors-dialog');
    [1, 2, 3, 4].forEach((id) => {
      const row = within(dialog).getByTestId(`bulk-error-row-${id}`);
      expect(within(row).getByText(`Item ${id}`)).toBeInTheDocument();
      expect(within(row).getByText(`Backend rejected item ${id}`)).toBeInTheDocument();
    });
  });

  test('re-editing a failed row clears its _saveError (tooltip falls back)', async () => {
    menuService.editFood.mockRejectedValue(failWith('Duplicate product name'));

    setup();
    dirtyRow(3, 777);
    clickSave();

    await waitFor(() =>
      expect(screen.getByTestId('row-error-indicator-3')).toHaveAttribute('title', 'Duplicate product name')
    );

    // Re-edit the row → error trail clears
    dirtyRow(3, 888);
    expect(screen.getByTestId('row-error-indicator-3')).toHaveAttribute('title', 'Save failed');
  });

  test('all-success path unchanged: success toast, no indicators, no drawer button', async () => {
    menuService.editFood.mockResolvedValue({});

    setup();
    dirtyRow(1, 150);
    dirtyRow(2, 250);
    clickSave();

    await waitFor(() => expect(screen.getByText('2 items saved successfully.')).toBeInTheDocument());
    expect(screen.queryByTestId('row-error-indicator-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('view-errors-toast-btn')).not.toBeInTheDocument();
  });
});
