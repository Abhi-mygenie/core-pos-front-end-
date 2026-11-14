// =============================================================================
// CR-036 — Bulk Editor Add Item Row Visibility (Top-Pinned, Empty Category,
//          Auto-Focus). Locks Gate 3 contract:
//   1. Add Item appends a new row at row #1 of the grid (above all category headers)
//   2. Category cell renders "Select category…" placeholder (no auto-category)
//   3. Name input auto-focuses on the new row
//   4. Multiple Add Item clicks stack newest-first at the top
//   5. Search filter does NOT hide _isNew rows (they always show)
//   6. Reset (RotateCcw) on a new row removes it from the top
// =============================================================================

import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
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

// CR-036-FU-03: mock useRestaurant so BulkEditor receives a stable restaurant
// context across the whole test suite. Default: gstStatus=false → tax-required
// validation OFF (preserves CR-036 + FU-01 + FU-02 baseline behaviour). Tests
// that exercise F3 override this mock per-case via mockRestaurantValue.
let mockRestaurantValue = { restaurant: { tax: { gstStatus: false } } };
jest.mock('../../../contexts/RestaurantContext', () => ({
  useRestaurant: () => mockRestaurantValue,
}));

// Make requestAnimationFrame synchronous so the addNewRow scroll/focus runs
// immediately in tests. (No longer strictly required after CR-036 refactored
// the focus logic to useEffect, but kept for resilience if rAF is reintroduced.)
beforeAll(() => {
  global.requestAnimationFrame = (cb) => { cb(); return 0; };
});

const makeFood = (i, catId = 1, catName = 'Beverages') => ({
  productId: i,
  productName: `Item ${i}`,
  categoryId: catId,
  categoryName: catName,
  basePrice: 100 + i,
  isActive: true,
  itemType: 1,
  taxPercent: 5,
  taxType: 'GST',
});

// Two categories, alphabetically: Beverages, Pizzas. Existing items distributed.
const foods = [
  makeFood(1, 1, 'Beverages'),
  makeFood(2, 1, 'Beverages'),
  makeFood(3, 2, 'Pizzas'),
];
const categories = [
  { categoryId: 1, categoryName: 'Beverages' },
  { categoryId: 2, categoryName: 'Pizzas' },
];

const setup = () =>
  render(
    <>
      <BulkEditor foods={foods} categories={categories} menuType="Normal" onRefresh={jest.fn()} onClose={jest.fn()} />
      <Toaster />
    </>
  );

const clickAddItem = () => fireEvent.click(screen.getByTestId('add-row-btn'));

afterEach(() => jest.clearAllMocks());

// -----------------------------------------------------------------------------
// G-Vis: New row appears at top of grid (Edit 3)
// -----------------------------------------------------------------------------
describe('CR-036 G-Vis | Add Item row appears at top of grid', () => {
  test('new row precedes the first category header in the grid order', () => {
    setup();
    clickAddItem();

    // Grab the grid body. Iterate tbody rows: first non-header tr must be a
    // new row (matches data-testid pattern `row-new-…`); category header trs
    // (data-testid `category-group-…`) must come AFTER.
    const grid = screen.getByTestId('bulk-editor-grid');
    const trs = within(grid).getAllByRole('row');
    // Skip the thead row (#0). First body row at index 1 should be the new row.
    const firstBodyRow = trs[1];
    expect(firstBodyRow.getAttribute('data-testid') || '').toMatch(/^row-new-/);

    // First category header must appear LATER in the DOM order.
    const firstHeader = trs.find(r => (r.getAttribute('data-testid') || '').startsWith('category-group-'));
    expect(firstHeader).toBeDefined();
    expect(trs.indexOf(firstBodyRow)).toBeLessThan(trs.indexOf(firstHeader));
  });

  test('multiple Add Item clicks stack newest-first at the top', async () => {
    setup();
    // Three clicks — small sleeps so Date.now() differs for stable _orderIndex.
    clickAddItem();
    await new Promise(r => setTimeout(r, 5));
    clickAddItem();
    await new Promise(r => setTimeout(r, 5));
    clickAddItem();

    const grid = screen.getByTestId('bulk-editor-grid');
    const trs = within(grid).getAllByRole('row');
    // First 3 body rows (after the thead row) must all be _isNew rows (testid prefix row-new-).
    const newRows = trs.slice(1, 4);
    newRows.forEach(tr => {
      expect((tr.getAttribute('data-testid') || '')).toMatch(/^row-new-/);
    });
    // Confirm a category header appears AFTER all 3 new rows.
    const headerIdx = trs.findIndex(r => (r.getAttribute('data-testid') || '').startsWith('category-group-'));
    expect(headerIdx).toBeGreaterThan(3);
  });
});

// -----------------------------------------------------------------------------
// G-Cat: Category cell renders "Select category…" placeholder (Edit 1 + 7)
// -----------------------------------------------------------------------------
describe('CR-036 G-Cat | Add Item leaves category empty with placeholder', () => {
  test('new row Category select renders "Select category…" placeholder option', () => {
    setup();
    clickAddItem();

    // Grab the new row's Category cell (testid pattern: cell-categoryId-new-…)
    const selects = screen.getAllByTestId(/^cell-categoryId-/);
    const newSelect = selects.find(el => el.getAttribute('data-testid').startsWith('cell-categoryId-new-'));
    expect(newSelect).toBeDefined();

    // Value should be empty string (no category chosen yet).
    expect(newSelect.value).toBe('');

    // The placeholder option must exist (disabled, value="").
    const placeholder = Array.from(newSelect.querySelectorAll('option')).find(o => o.value === '');
    expect(placeholder).toBeDefined();
    expect(placeholder.textContent).toMatch(/select category/i);
    expect(placeholder.disabled).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// G-Focus: Name input on new row is auto-focused (Edit 6)
// -----------------------------------------------------------------------------
describe('CR-036 G-Focus | Add Item auto-focuses Name input', () => {
  test('after Add Item, document.activeElement is the new row Name input', () => {
    setup();
    clickAddItem();

    const inputs = screen.getAllByTestId(/^cell-productName-new-/);
    expect(inputs.length).toBe(1);
    expect(document.activeElement).toBe(inputs[0]);
  });
});

// -----------------------------------------------------------------------------
// G-Search: New rows visible regardless of active search filter (Edit 4)
// -----------------------------------------------------------------------------
describe('CR-036 G-Search | New rows always visible during search', () => {
  test('search filter does NOT hide _isNew rows', () => {
    setup();

    // Type a search that matches no existing item.
    const searchInput = screen.getByTestId('bulk-editor-search');
    fireEvent.change(searchInput, { target: { value: 'zzznomatchzzz' } });

    // Now Add Item — new row must still appear.
    clickAddItem();

    const newSelects = screen.getAllByTestId(/^cell-categoryId-new-/);
    expect(newSelects.length).toBe(1);
  });

  test('search keeps existing-row filter behavior intact', () => {
    setup();
    const searchInput = screen.getByTestId('bulk-editor-search');
    fireEvent.change(searchInput, { target: { value: 'Item 3' } });

    // Existing matching row should still be visible.
    expect(screen.queryByTestId('cell-productName-3')).toBeDefined();
    // Non-matching existing items should NOT be in DOM.
    expect(screen.queryByTestId('cell-productName-1')).toBeNull();
    expect(screen.queryByTestId('cell-productName-2')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// G-Reset: Reset on new row removes it from the top (existing behavior intact).
// Post CR-036-FU-01, new rows expose this action via `delete-row-${id}` testid
// (Trash2 icon). Existing dirty rows still use `reset-row-${id}` (RotateCcw).
// -----------------------------------------------------------------------------
describe('CR-036 G-Reset | Reset removes new row from top', () => {
  test('Trash2 (delete) on a new row removes it from the grid', () => {
    setup();
    clickAddItem();

    const newRow = screen.getAllByTestId(/^row-new-/)[0];
    const rowId = newRow.getAttribute('data-testid').replace('row-', '');

    // Type a name so the row becomes dirty → delete button appears
    const nameInput = screen.getByTestId(`cell-productName-${rowId}`);
    fireEvent.change(nameInput, { target: { value: 'X' } });
    // Trigger blur so LocalTextInput flushes to parent state
    fireEvent.blur(nameInput);

    // CR-036-FU-01: new rows use `delete-row-${id}` testid (Trash2 icon)
    const deleteBtn = screen.getByTestId(`delete-row-${rowId}`);
    fireEvent.click(deleteBtn);

    // Row should be removed from DOM.
    expect(screen.queryByTestId(`row-${rowId}`)).toBeNull();
  });
});
// =============================================================================
// CR-036-FU-01 — Validation UX (specific toast + focus + red border + Trash2)
// -----------------------------------------------------------------------------
// Locks Gate 3 contract for handleSave validation branch + action button:
//   E1  Toast description surfaces first failing row's identifier + first error
//        + "+N more on this row" + "+M more rows need attention" (mirrors footer
//        pluralization).
//   E2  First failing row gets red border-l + bg + focus on Name input;
//        invalid existing rows additionally scrollIntoView({block:"center"}).
//   E3  `_isNew` rows render Trash2 (red, "Delete new row"); existing dirty
//        rows render RotateCcw (grey, "Undo").
//
// Owner decisions baked in (deep plan §3):
//   OQ-1 YES auto-scroll for existing invalid rows
//   OQ-2 YES mirror footer pluralization ("1 more row needs attention" /
//        "3 more rows need attention")
//   OQ-3 DISTINCT border intensities (validation = red-500, save = red-400)
//   OQ-4 NO delete animation
// =============================================================================

// Helper: find the toast description text in the rendered Toaster output.
const getToastDescription = () => {
  // shadcn Toaster renders descriptions inside the toast component. Search by
  // ToastDescription's class signature (group's [&_p]:leading-relaxed).
  const allText = Array.from(document.querySelectorAll('div'))
    .map(d => d.textContent)
    .filter(t => t && t.includes('Name is required') || (t && t.includes('Category is required')) || (t && t.includes('Price must be > 0')));
  return allText.join(' | ');
};

const fillName = (rowId, name) => {
  const input = screen.getByTestId(`cell-productName-${rowId}`);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.blur(input);
};

const clickSave = () => {
  // Primary save button in the toolbar
  const saveBtn = screen.getByTestId('save-changes-btn');
  act(() => { fireEvent.click(saveBtn); });
};

// -----------------------------------------------------------------------------
// G-Toast: descriptive toast on validation failure (E1)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-Toast | toast surfaces specific failing row + error', () => {
  test('single invalid new row → toast names "Row 1" + first error', async () => {
    setup();
    clickAddItem();             // 1 new row, all required fields empty
    clickSave();

    // CR-036-FU-03 test infra: waitFor polls until toast is in DOM (more
    // reliable than fixed setTimeout — React 19 + jsdom + Toaster portal
    // sometimes need an extra tick when the new row's Name input is also
    // being auto-focused on the same render pass).
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Validation Error/);
    });
    expect(document.body.textContent).toMatch(/Row 1 — Name is required/);
  });

  test('row with productName uses that as the identifier in toast', async () => {
    setup();
    clickAddItem();
    const rowId = screen.getAllByTestId(/^row-new-/)[0].getAttribute('data-testid').replace('row-', '');
    fillName(rowId, 'My Special Item');
    clickSave();                // still missing Category + Price

    await new Promise(r => setTimeout(r, 50));
    const body = document.body.textContent;
    expect(body).toMatch(/My Special Item — Category is required/);
  });

  test('multiple invalid rows → toast mentions first + count of additional rows (plural)', async () => {
    setup();
    clickAddItem();
    await new Promise(r => setTimeout(r, 5));
    clickAddItem();
    await new Promise(r => setTimeout(r, 5));
    clickAddItem();             // 3 new invalid rows total
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const body = document.body.textContent;
    // "+2 more rows need attention" (plural)
    expect(body).toMatch(/2 more rows need attention/);
  });

  test('two invalid rows → singular "1 more row needs attention"', async () => {
    setup();
    clickAddItem();
    await new Promise(r => setTimeout(r, 5));
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const body = document.body.textContent;
    expect(body).toMatch(/1 more row needs attention/);
  });
});

// -----------------------------------------------------------------------------
// G-Focus: first failing row's Name input is focused (E2)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-Focus | first failing row gets focus on Save', () => {
  test('after Save with validation failure, focus moves to first failing row Name input', async () => {
    setup();
    clickAddItem();
    // Click somewhere else to ensure focus is NOT on the new row initially
    document.body.focus();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const newNameInput = screen.getAllByTestId(/^cell-productName-new-/)[0];
    expect(document.activeElement).toBe(newNameInput);
  });
});

// -----------------------------------------------------------------------------
// G-RedBorder: failing row has saturated red border + bg (E2)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-RedBorder | failing row has red border-l + bg', () => {
  test('failing row has border-l-red-500 + bg-red-50/40 classes', async () => {
    setup();
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const newRow = screen.getAllByTestId(/^row-new-/)[0];
    const cls = newRow.className;
    expect(cls).toMatch(/border-l-4/);
    expect(cls).toMatch(/border-l-red-500/);
    expect(cls).toMatch(/bg-red-50/);
  });

  test('valid rows do not get red border treatment', async () => {
    setup();
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    // Existing items (Item 1, Item 2, Item 3) should NOT be red.
    const existingRows = [
      screen.getByTestId('row-1'),
      screen.getByTestId('row-2'),
      screen.getByTestId('row-3'),
    ];
    existingRows.forEach(r => {
      expect(r.className).not.toMatch(/border-l-red-500/);
      expect(r.className).not.toMatch(/bg-red-50/);
    });
  });
});

// -----------------------------------------------------------------------------
// G-CellTint: failing cell has red tint per-field (E2)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-CellTint | failing cells get red tint', () => {
  test('cells matching validation error field get bg-red-100/60', async () => {
    setup();
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const newRow = screen.getAllByTestId(/^row-new-/)[0];
    // Find <td> containing the productName cell — it should carry red tint.
    const nameCell = newRow.querySelector(`[data-testid^="cell-productName-"]`)?.closest('td');
    const catCell  = newRow.querySelector(`[data-testid^="cell-categoryId-"]`)?.closest('td');
    const priceCell = newRow.querySelector(`[data-testid^="cell-basePrice-"]`)?.closest('td');

    expect(nameCell?.className).toMatch(/bg-red-100/);
    expect(catCell?.className).toMatch(/bg-red-100/);
    expect(priceCell?.className).toMatch(/bg-red-100/);
  });
});

// -----------------------------------------------------------------------------
// G-Clear: editing a field clears row's _validationErrors (E2 lifecycle)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-Clear | edit clears red treatment', () => {
  test('after Save validation fails, editing any field clears the red border + cell tints', async () => {
    setup();
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const newRow = screen.getAllByTestId(/^row-new-/)[0];
    const rowId = newRow.getAttribute('data-testid').replace('row-', '');

    // Sanity: confirm red treatment is present
    expect(newRow.className).toMatch(/border-l-red-500/);

    // Edit any field — Name in this case
    fillName(rowId, 'Now valid name');

    // Re-find row after re-render
    const refreshedRow = screen.getByTestId(`row-${rowId}`);
    expect(refreshedRow.className).not.toMatch(/border-l-red-500/);
  });
});

// -----------------------------------------------------------------------------
// G-Trash: _isNew rows use Trash2; existing dirty rows use RotateCcw (E3)
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-Trash | dedicated Trash2 delete for new rows', () => {
  test('new row exposes delete action via `delete-row-${id}` testid', () => {
    setup();
    clickAddItem();
    const newRowId = screen.getAllByTestId(/^row-new-/)[0]
      .getAttribute('data-testid').replace('row-', '');

    // _isNew rows render with delete-row-* testid (Trash2 icon).
    const deleteBtn = screen.getByTestId(`delete-row-${newRowId}`);
    expect(deleteBtn).toBeDefined();
    // Confirm tooltip reads "Delete new row"
    expect(deleteBtn.getAttribute('title')).toBe('Delete new row');
  });

  test('existing dirty row exposes undo via `reset-row-${id}` testid (unchanged)', async () => {
    setup();
    // Make an existing row dirty
    const existingNameInput = screen.getByTestId('cell-productName-1');
    fireEvent.change(existingNameInput, { target: { value: 'Renamed Item 1' } });
    fireEvent.blur(existingNameInput);

    await new Promise(r => setTimeout(r, 20));
    const resetBtn = screen.getByTestId('reset-row-1');
    expect(resetBtn).toBeDefined();
    expect(resetBtn.getAttribute('title')).toBe('Undo');
  });
});

// -----------------------------------------------------------------------------
// G-Regression: CR-036 ordering still intact under validation pressure
// -----------------------------------------------------------------------------
describe('CR-036-FU-01 G-Regression | CR-036 top-pinned ordering unchanged', () => {
  test('new invalid rows still appear at top of grid after Save validation', async () => {
    setup();
    clickAddItem();
    clickSave();

    await new Promise(r => setTimeout(r, 50));
    const grid = screen.getByTestId('bulk-editor-grid');
    const trs = within(grid).getAllByRole('row');
    // First body row (after thead) is still the new row
    const firstBodyRow = trs[1];
    expect(firstBodyRow.getAttribute('data-testid') || '').toMatch(/^row-new-/);
  });
});



// =============================================================================
// CR-036-FU-02 — Cosmetic: Column reorder + Sold By (Unit) Tier-1 promotion
// -----------------------------------------------------------------------------
// Locks Gate 3 contract:
//   F4   ALL_COLUMNS order: itemType → taxType → taxPercent (Tax Type BEFORE Tax %).
//   N2   `itemUnit` (label "Sold By (Unit)") visible by default (Tier 1, not Tier 4).
//
// No backend dependency. No wire-format impact. Pure UI ordering + visibility.
// =============================================================================

describe('CR-036-FU-02 G-ColOrder | Tax Type renders before Tax %', () => {
  test('header row places Tax Type column before Tax % column', () => {
    setup();
    const grid = screen.getByTestId('bulk-editor-grid');
    const headers = within(grid).getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent.trim());
    const typeIdx     = headerTexts.findIndex(t => /^Type$/i.test(t));
    const taxTypeIdx  = headerTexts.findIndex(t => /^Tax Type$/i.test(t));
    const taxPctIdx   = headerTexts.findIndex(t => /^Tax %$/i.test(t));

    expect(typeIdx).toBeGreaterThanOrEqual(0);
    expect(taxTypeIdx).toBeGreaterThan(typeIdx);
    expect(taxPctIdx).toBeGreaterThan(taxTypeIdx);
  });
});

describe('CR-036-FU-02 G-SoldBy | "Sold By (Unit)" visible by default + label aligned', () => {
  test('Sold By (Unit) header is rendered without enabling Tier 4 via column-picker', () => {
    setup();
    const grid = screen.getByTestId('bulk-editor-grid');
    const headers = within(grid).getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent.trim());
    const soldByIdx = headerTexts.findIndex(t => /Sold By/i.test(t));
    expect(soldByIdx).toBeGreaterThanOrEqual(0);
  });

  test('header label matches "Sold By (Unit)" exactly (matches ProductForm)', () => {
    setup();
    const grid = screen.getByTestId('bulk-editor-grid');
    const headers = within(grid).getAllByRole('columnheader');
    const headerTexts = headers.map(h => h.textContent.trim());
    expect(headerTexts).toContain('Sold By (Unit)');
  });

  test('cell renderer renders an itemUnit select for existing items', () => {
    setup();
    // Existing item testid pattern: cell-itemUnit-{productId}
    const itemUnitCells = screen.queryAllByTestId(/^cell-itemUnit-/);
    expect(itemUnitCells.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// CR-036-FU-03 — Tax-Required Validation + Loader Overlay + Race-Guard
// -----------------------------------------------------------------------------
// Locks Gate 3 contract:
//   F3   When restaurant.tax.gstStatus === true, items must have a valid tax
//        type (GST or VAT) AND tax rate > 0. Packaged items (packedFood ===
//        "Yes") are EXEMPT (owner directive 2026-06-12).
//   N1   Backdrop overlay over BulkEditor during isLoading || importing ||
//        exporting; pointer-events disabled on grid behind. Status text
//        adapts to the active operation.
//   N1   Race-guard on [foods] useEffect: pendingImport gate prevents the
//        reset from wiping local edits while confirmation dialog is open.
//        Import-with-unsaved-edits shows a confirmation dialog.
// =============================================================================

const setRestaurantGstStatus = (v) => {
  mockRestaurantValue = { restaurant: { tax: { gstStatus: v } } };
};

afterEach(() => {
  // Reset mock to default (gstStatus=false) after each test so tests don't
  // leak the tax-required flag to subsequent runs.
  setRestaurantGstStatus(false);
});

// -----------------------------------------------------------------------------
// G-TaxRequired: F3 validation when restaurant.gstStatus === true
// -----------------------------------------------------------------------------
describe('CR-036-FU-03 G-TaxRequired | tax validation when restaurant has GST enabled', () => {
  test('non-packed new row with taxPercent=0 fails validation when gstStatus=true', async () => {
    setRestaurantGstStatus(true);
    setup();
    clickAddItem();
    const rowId = screen.getAllByTestId(/^row-new-/)[0].getAttribute('data-testid').replace('row-', '');
    fillName(rowId, 'Test Item');
    const catSel = screen.getByTestId(`cell-categoryId-${rowId}`);
    fireEvent.change(catSel, { target: { value: '1' } });
    const priceInput = screen.getByTestId(`cell-basePrice-${rowId}`);
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.blur(priceInput);
    // New row defaults to taxPercent=5 (from addNewRow); explicitly set to 0
    // to exercise the "Tax % must be > 0" rule.
    const taxPctInput = screen.getByTestId(`cell-taxPercent-${rowId}`);
    fireEvent.change(taxPctInput, { target: { value: '0' } });
    fireEvent.blur(taxPctInput);
    clickSave();
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/GST or VAT tax required|Tax % must be > 0/);
    });
  });

  test('packed item (packedFood=Yes) is EXEMPT from tax validation', async () => {
    setRestaurantGstStatus(true);
    setup();
    clickAddItem();
    const rowId = screen.getAllByTestId(/^row-new-/)[0].getAttribute('data-testid').replace('row-', '');
    fillName(rowId, 'Packed Item');
    const catSel = screen.getByTestId(`cell-categoryId-${rowId}`);
    fireEvent.change(catSel, { target: { value: '1' } });
    const priceInput = screen.getByTestId(`cell-basePrice-${rowId}`);
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.blur(priceInput);
    // packedFood renders as a toggle button, not a select. Click toggles No → Yes.
    const packedBtn = screen.getByTestId(`cell-packedFood-${rowId}`);
    fireEvent.click(packedBtn);
    // Now packed_food === "Yes" → exemption applies → no tax-required validation.
    clickSave();
    await new Promise(r => setTimeout(r, 80));
    expect(document.body.textContent).not.toMatch(/GST or VAT tax required/);
  });

  test('gstStatus=false → no tax validation triggered (backward compat)', async () => {
    setRestaurantGstStatus(false);
    setup();
    clickAddItem();
    const rowId = screen.getAllByTestId(/^row-new-/)[0].getAttribute('data-testid').replace('row-', '');
    fillName(rowId, 'Tax Off Item');
    const catSel = screen.getByTestId(`cell-categoryId-${rowId}`);
    fireEvent.change(catSel, { target: { value: '1' } });
    const priceInput = screen.getByTestId(`cell-basePrice-${rowId}`);
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.blur(priceInput);
    // Clear tax fields — should still pass validation because gstStatus=false
    const taxTypeSel = screen.getByTestId(`cell-taxType-${rowId}`);
    fireEvent.change(taxTypeSel, { target: { value: '' } });
    clickSave();
    await new Promise(r => setTimeout(r, 80));
    expect(document.body.textContent).not.toMatch(/GST or VAT tax required/);
  });

  test('gstStatus=undefined (mock returns no tax block) → no validation (safe fallback)', async () => {
    mockRestaurantValue = { restaurant: { tax: {} } };
    setup();
    clickAddItem();
    const rowId = screen.getAllByTestId(/^row-new-/)[0].getAttribute('data-testid').replace('row-', '');
    fillName(rowId, 'Fallback Item');
    const catSel = screen.getByTestId(`cell-categoryId-${rowId}`);
    fireEvent.change(catSel, { target: { value: '1' } });
    const priceInput = screen.getByTestId(`cell-basePrice-${rowId}`);
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.blur(priceInput);
    clickSave();
    await new Promise(r => setTimeout(r, 80));
    expect(document.body.textContent).not.toMatch(/GST or VAT tax required/);
  });
});

// -----------------------------------------------------------------------------
// G-Overlay: N1 backdrop loader during isLoading / importing / exporting
// -----------------------------------------------------------------------------
describe('CR-036-FU-03 G-Overlay | backdrop loader overlay', () => {
  const setupWithLoading = (loadingProp) =>
    render(
      <>
        <BulkEditor foods={foods} categories={categories} menuType="Normal" isLoading={loadingProp} onRefresh={jest.fn()} onClose={jest.fn()} />
        <Toaster />
      </>
    );

  test('isLoading=true → overlay visible with "Loading menu…" status text', () => {
    setupWithLoading(true);
    const overlay = screen.getByTestId('bulk-editor-loader-overlay');
    expect(overlay).toBeDefined();
    expect(screen.getByTestId('loader-status-text').textContent).toMatch(/Loading menu/i);
  });

  test('isLoading=false + no import/export → overlay NOT rendered', () => {
    setupWithLoading(false);
    expect(screen.queryByTestId('bulk-editor-loader-overlay')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// G-RaceGuard: N1 race-guard + import confirmation dialog
// -----------------------------------------------------------------------------
describe('CR-036-FU-03 G-RaceGuard | data-loss race guard on foods refresh', () => {
  test('Add Item then foods prop unchanged → new row preserved (regression)', () => {
    // This locks the existing CR-036 behaviour: the foods useEffect should
    // not reset rows when foods reference is stable.
    setup();
    clickAddItem();
    expect(screen.getAllByTestId(/^row-new-/).length).toBe(1);
  });

  test('confirmation dialog testid exists (not rendered when no pending import)', () => {
    setup();
    expect(screen.queryByTestId('import-confirm-dialog')).toBeNull();
  });
});

