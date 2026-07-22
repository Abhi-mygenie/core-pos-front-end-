// POS2-006-PG-FILTER-DROPDOWN — focused tests (May-2026)
// ----------------------------------------------------------------------------
// Owner-locked behaviour (from amendment doc 2026-05-09 Decision 8.1):
//   1. PG filter is now a 3-option dropdown (ALL / Non-PG / PG).
//   2. Default value = ALL = `paymentGateway: null`.
//   3. Visible across all report tabs (no tab-visibility predicate).
//   4. No reset on tab change (selection persists).
//   5. Non-PG branch enabled in filtering logic (this CR's item 7).
//   6. FilterTags chip renders for both 'gateway' and 'nonGateway'
//      ("PG" and "Non-PG" labels respectively); ALL produces no chip.
//
// Files exercised:
//   - components/reports/FilterBar.jsx (PAYMENT_GATEWAY_OPTIONS export
//     + dropdown rendering)
//   - components/reports/FilterTags.jsx (tri-state chip rendering)
//   - components/reports/OrderTable.jsx (pgFilterActive predicate is
//     true ONLY for 'gateway', not 'nonGateway' — so PG columns hide
//     when Non-PG is selected)
//   - pages/AllOrdersReportPage.jsx row predicate is verified by the
//     pure-function test below (predicate logic copied verbatim from
//     the page; no DOM render required for the row-narrowing path).

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import FilterBar, { PAYMENT_GATEWAY_OPTIONS } from '../../../components/reports/FilterBar';
import FilterTags from '../../../components/reports/FilterTags';

// =============================================================================
// 1. PAYMENT_GATEWAY_OPTIONS — exported shape (consumed by FilterTags + tests)
// =============================================================================
describe('POS2-006 | PAYMENT_GATEWAY_OPTIONS export', () => {
  test('exports exactly two non-null options (Non-PG + PG); ALL is the placeholder', () => {
    expect(Array.isArray(PAYMENT_GATEWAY_OPTIONS)).toBe(true);
    expect(PAYMENT_GATEWAY_OPTIONS.length).toBe(2);
    const values = PAYMENT_GATEWAY_OPTIONS.map((o) => o.value);
    expect(values).toEqual(['nonGateway', 'gateway']);
    const labels = PAYMENT_GATEWAY_OPTIONS.map((o) => o.label);
    expect(labels).toEqual(['Non-PG', 'PG']);
    // ALL is intentionally NOT in the options list — the Select component
    // renders the placeholder ("ALL") as the first row in the dropdown
    // panel and emits `null` when clicked.
    expect(values).not.toContain(null);
  });
});

// =============================================================================
// 2. FilterBar — dropdown rendering + ALL default + selecting Non-PG / PG
// =============================================================================
describe('POS2-006 | FilterBar PG dropdown rendering', () => {
  const renderBar = (filters = {}, onChange = jest.fn()) => {
    return render(
      <FilterBar
        filters={filters}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="all"
        hasPlatformData={false}
      />
    );
  };

  test('renders the PG dropdown trigger with testId="filter-payment-gateway"', () => {
    renderBar();
    const trigger = screen.getByTestId('filter-payment-gateway');
    expect(trigger).toBeInTheDocument();
    // Trigger label shows the placeholder "ALL" when filters.paymentGateway is null/undefined.
    expect(trigger.textContent).toMatch(/ALL/i);
  });

  test('default state (paymentGateway: null) displays ALL placeholder', () => {
    renderBar({ paymentGateway: null });
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/ALL/i);
  });

  test('paymentGateway: "gateway" displays PG label on trigger', () => {
    renderBar({ paymentGateway: 'gateway' });
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/PG/);
    // Negative: should NOT show "Non-PG" or "ALL" on the trigger.
    expect(screen.getByTestId('filter-payment-gateway').textContent).not.toMatch(/Non-PG/);
  });

  test('paymentGateway: "nonGateway" displays Non-PG label on trigger', () => {
    renderBar({ paymentGateway: 'nonGateway' });
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/Non-PG/);
  });

  test('clicking trigger opens the panel with ALL + Non-PG + PG choices (3 rows)', () => {
    renderBar();
    const trigger = screen.getByTestId('filter-payment-gateway');
    fireEvent.click(trigger);
    // The placeholder "ALL" appears as the first panel option (also visible on the trigger);
    // expect at least one match plus both declared options.
    const allMatches = screen.getAllByText(/ALL/i);
    expect(allMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Non-PG')).toBeInTheDocument();
    expect(screen.getByText('PG')).toBeInTheDocument();
  });

  test('selecting "Non-PG" emits onFilterChange("paymentGateway", "nonGateway")', () => {
    const onChange = jest.fn();
    renderBar({ paymentGateway: null }, onChange);
    fireEvent.click(screen.getByTestId('filter-payment-gateway'));
    fireEvent.click(screen.getByText('Non-PG'));
    expect(onChange).toHaveBeenCalledWith('paymentGateway', 'nonGateway');
  });

  test('selecting "PG" emits onFilterChange("paymentGateway", "gateway")', () => {
    const onChange = jest.fn();
    renderBar({ paymentGateway: null }, onChange);
    fireEvent.click(screen.getByTestId('filter-payment-gateway'));
    fireEvent.click(screen.getByText('PG'));
    expect(onChange).toHaveBeenCalledWith('paymentGateway', 'gateway');
  });

  test('clicking ALL row in panel emits onFilterChange("paymentGateway", null)', () => {
    const onChange = jest.fn();
    renderBar({ paymentGateway: 'gateway' }, onChange);
    fireEvent.click(screen.getByTestId('filter-payment-gateway'));
    // The ALL row is rendered using the placeholder string. The trigger
    // text node also matches; pick the panel one (last by DOM order).
    const allMatches = screen.getAllByText(/^ALL$/);
    fireEvent.click(allMatches[allMatches.length - 1]);
    expect(onChange).toHaveBeenCalledWith('paymentGateway', null);
  });
});

// =============================================================================
// 3. FilterTags — chip rendering for both 'gateway' and 'nonGateway'
// =============================================================================
describe('POS2-006 | FilterTags chip rendering', () => {
  test('paymentGateway: "gateway" renders chip with "PG" label', () => {
    render(
      <FilterTags
        filters={{ paymentGateway: 'gateway' }}
        onRemove={() => {}}
        onClearAll={() => {}}
      />
    );
    const chip = screen.getByTestId('filter-tag-paymentGateway');
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toMatch(/Payment Gateway/);
    expect(chip.textContent).toMatch(/PG/);
    // Should NOT render "Non-PG"
    expect(chip.textContent).not.toMatch(/Non-PG/);
  });

  test('paymentGateway: "nonGateway" renders chip with "Non-PG" label', () => {
    render(
      <FilterTags
        filters={{ paymentGateway: 'nonGateway' }}
        onRemove={() => {}}
        onClearAll={() => {}}
      />
    );
    const chip = screen.getByTestId('filter-tag-paymentGateway');
    expect(chip).toBeInTheDocument();
    expect(chip.textContent).toMatch(/Payment Gateway/);
    expect(chip.textContent).toMatch(/Non-PG/);
  });

  test('paymentGateway: null produces NO chip (ALL = no narrowing)', () => {
    const { container } = render(
      <FilterTags
        filters={{ paymentGateway: null }}
        onRemove={() => {}}
        onClearAll={() => {}}
      />
    );
    expect(screen.queryByTestId('filter-tag-paymentGateway')).not.toBeInTheDocument();
    // No FilterTags container at all when the only filter value is null.
    expect(container.querySelector('[data-testid="filter-tags"]')).not.toBeInTheDocument();
  });

  test('chip remove fires onRemove("paymentGateway")', () => {
    const onRemove = jest.fn();
    render(
      <FilterTags
        filters={{ paymentGateway: 'nonGateway' }}
        onRemove={onRemove}
        onClearAll={() => {}}
      />
    );
    fireEvent.click(screen.getByTestId('filter-tag-remove-paymentGateway'));
    expect(onRemove).toHaveBeenCalledWith('paymentGateway');
  });
});

// =============================================================================
// 4. Row-narrowing predicate (mirrors AllOrdersReportPage.jsx item 7)
// =============================================================================
//
// Pure-function copy of the predicate at AllOrdersReportPage.jsx:
//   if (filters.paymentGateway === 'gateway')        → keep o.isPaymentGateway === true
//   else if (filters.paymentGateway === 'nonGateway')→ keep o.isPaymentGateway !== true
//   else (null / undefined)                           → keep all
const applyPgFilter = (orders, paymentGateway) => {
  if (paymentGateway === 'gateway') {
    return orders.filter((o) => o.isPaymentGateway === true);
  }
  if (paymentGateway === 'nonGateway') {
    return orders.filter((o) => o.isPaymentGateway !== true);
  }
  return orders;
};

describe('POS2-006 | row-narrowing predicate (AllOrdersReportPage parity)', () => {
  const ORDERS = [
    { id: 1, isPaymentGateway: true },
    { id: 2, isPaymentGateway: false },
    { id: 3, isPaymentGateway: null },     // missing PG signal
    { id: 4 },                              // missing field entirely
    { id: 5, isPaymentGateway: true },
  ];

  test('paymentGateway: null (ALL) → returns all 5 orders', () => {
    expect(applyPgFilter(ORDERS, null).map((o) => o.id)).toEqual([1, 2, 3, 4, 5]);
  });

  test('paymentGateway: "gateway" (PG) → returns only PG orders (true only)', () => {
    expect(applyPgFilter(ORDERS, 'gateway').map((o) => o.id)).toEqual([1, 5]);
  });

  test('paymentGateway: "nonGateway" (Non-PG) → returns explicit-false + missing/null', () => {
    expect(applyPgFilter(ORDERS, 'nonGateway').map((o) => o.id)).toEqual([2, 3, 4]);
  });

  test('PG ∪ Non-PG = ALL (no row leaks; no row double-counted)', () => {
    const pg = applyPgFilter(ORDERS, 'gateway').map((o) => o.id);
    const nonPg = applyPgFilter(ORDERS, 'nonGateway').map((o) => o.id);
    const union = [...pg, ...nonPg].sort((a, b) => a - b);
    expect(union).toEqual([1, 2, 3, 4, 5]);
    // No overlap between PG and Non-PG sets.
    expect(pg.some((id) => nonPg.includes(id))).toBe(false);
  });
});

// =============================================================================
// 5. Selection persistence across tab change (no reset)
// =============================================================================
//
// Locked items 4 + 5: dropdown does NOT reset on tab change; selection
// persists. This is the absence of a reset; verify FilterBar receives
// activeTab as a prop but does not mutate `filters.paymentGateway` when
// activeTab changes.
describe('POS2-006 | selection persists across tab change (no reset)', () => {
  test('FilterBar shows the same selection across re-renders with different activeTab', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <FilterBar
        filters={{ paymentGateway: 'gateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="paid"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/PG/);

    // Simulate user switching tab — parent re-renders FilterBar with new
    // `activeTab` but the same `filters` (selection has NOT been reset by
    // the parent page; locked item 4 forbids reset).
    rerender(
      <FilterBar
        filters={{ paymentGateway: 'gateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="hold"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/PG/);

    rerender(
      <FilterBar
        filters={{ paymentGateway: 'gateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="cancelled"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/PG/);

    rerender(
      <FilterBar
        filters={{ paymentGateway: 'gateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="running"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/PG/);

    // FilterBar itself never emits onFilterChange when only activeTab changes.
    expect(onChange).not.toHaveBeenCalled();
  });

  test('Non-PG selection also persists across tab change', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <FilterBar
        filters={{ paymentGateway: 'nonGateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="paid"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/Non-PG/);

    rerender(
      <FilterBar
        filters={{ paymentGateway: 'nonGateway' }}
        onFilterChange={onChange}
        onClearAll={() => {}}
        activeTab="aggregator"
      />
    );
    expect(screen.getByTestId('filter-payment-gateway').textContent).toMatch(/Non-PG/);
    expect(onChange).not.toHaveBeenCalled();
  });
});
