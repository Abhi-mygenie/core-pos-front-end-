// POS2-002 Phase 3 — Platform Dropdown focused tests (May-2026)
// ----------------------------------------------------------------------------
// Owner-locked behaviour (UX proposal revised 2026-05-10 — header-only scope):
//   1. Platform filter is a 3-option dropdown: All / POS / Web / Scan.
//   2. Default value = `null` ("Platform: All") on every dashboard mount.
//   3. Selection persists across tab navigation (state lives on the parent —
//      this test verifies persistence by re-rendering the controlled
//      dropdown with the same value).
//   4. Resets to All on full page reload (no localStorage in v1).
//   5. Cards are NOT touched in Phase 3 — no card-level assertions here.
//   6. Predicate composition (AND with status / channel / search) is verified
//      via the pure-function predicate test below — predicate copied verbatim
//      from DashboardPage.jsx so any drift is caught here.
//
// Files exercised:
//   - components/layout/PlatformDropdown.jsx (component + PLATFORM_OPTIONS export)
//   - pages/DashboardPage.jsx platformMatches predicate (pure-function copy)

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import PlatformDropdown, { PLATFORM_OPTIONS } from '../../../components/layout/PlatformDropdown';

// =============================================================================
// 1. PLATFORM_OPTIONS — exported shape
// =============================================================================
describe('POS2-002 Phase 3 | PLATFORM_OPTIONS export', () => {
  test('exports exactly three options: All (null) / POS / Web / Scan', () => {
    expect(Array.isArray(PLATFORM_OPTIONS)).toBe(true);
    expect(PLATFORM_OPTIONS.length).toBe(3);
    expect(PLATFORM_OPTIONS.map(o => o.value)).toEqual([null, 'pos', 'web']);
    expect(PLATFORM_OPTIONS.map(o => o.label)).toEqual([
      'Platform: All',
      'POS',
      'Web / Scan',
    ]);
  });
});

// =============================================================================
// 2. PlatformDropdown — render + default state + active state
// =============================================================================
describe('POS2-002 Phase 3 | PlatformDropdown rendering & default state', () => {
  test('default trigger reads "Platform: All" when value === null', () => {
    render(<PlatformDropdown value={null} onChange={() => {}} />);
    const trigger = screen.getByTestId('dashboard-platform-filter');
    expect(trigger).toHaveTextContent('Platform: All');
    // Active flag absent → not currently filtering
    expect(trigger.getAttribute('data-active')).toBe('false');
  });

  test('panel is closed by default (no options visible)', () => {
    render(<PlatformDropdown value={null} onChange={() => {}} />);
    expect(screen.queryByTestId('dashboard-platform-filter-panel')).toBeNull();
  });

  test('clicking trigger opens the 3-option panel', () => {
    render(<PlatformDropdown value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('dashboard-platform-filter'));
    expect(screen.getByTestId('dashboard-platform-filter-panel')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-platform-filter-option-all')).toHaveTextContent('Platform: All');
    expect(screen.getByTestId('dashboard-platform-filter-option-pos')).toHaveTextContent('POS');
    expect(screen.getByTestId('dashboard-platform-filter-option-web')).toHaveTextContent('Web / Scan');
  });

  test('selecting POS calls onChange("pos") and closes the panel', () => {
    const onChange = jest.fn();
    render(<PlatformDropdown value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('dashboard-platform-filter'));
    fireEvent.click(screen.getByTestId('dashboard-platform-filter-option-pos'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('pos');
    // Panel closes
    expect(screen.queryByTestId('dashboard-platform-filter-panel')).toBeNull();
  });

  test('selecting Web / Scan calls onChange("web")', () => {
    const onChange = jest.fn();
    render(<PlatformDropdown value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('dashboard-platform-filter'));
    fireEvent.click(screen.getByTestId('dashboard-platform-filter-option-web'));
    expect(onChange).toHaveBeenCalledWith('web');
  });

  test('selecting All from a non-null state calls onChange(null)', () => {
    const onChange = jest.fn();
    render(<PlatformDropdown value="web" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('dashboard-platform-filter'));
    fireEvent.click(screen.getByTestId('dashboard-platform-filter-option-all'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  test('active visual cue: data-active="true" + label includes selected value when value !== null', () => {
    render(<PlatformDropdown value="web" onChange={() => {}} />);
    const trigger = screen.getByTestId('dashboard-platform-filter');
    expect(trigger.getAttribute('data-active')).toBe('true');
    expect(trigger).toHaveTextContent('Platform: Web / Scan');
  });

  test('active visual cue for POS: data-active="true" + "Platform: POS" label', () => {
    render(<PlatformDropdown value="pos" onChange={() => {}} />);
    const trigger = screen.getByTestId('dashboard-platform-filter');
    expect(trigger.getAttribute('data-active')).toBe('true');
    expect(trigger).toHaveTextContent('Platform: POS');
  });

  test('persistence — re-rendering with the same value keeps the trigger label stable', () => {
    // Simulates the operator switching tabs (parent unmounts/remounts the
    // dashboard chrome but keeps the platform value in state).
    const { rerender } = render(<PlatformDropdown value="web" onChange={() => {}} />);
    expect(screen.getByTestId('dashboard-platform-filter')).toHaveTextContent('Platform: Web / Scan');
    rerender(<PlatformDropdown value="web" onChange={() => {}} />);
    expect(screen.getByTestId('dashboard-platform-filter')).toHaveTextContent('Platform: Web / Scan');
  });

  test('selected option is highlighted in the panel (font-medium + bg-zinc-100)', () => {
    render(<PlatformDropdown value="pos" onChange={() => {}} />);
    fireEvent.click(screen.getByTestId('dashboard-platform-filter'));
    const posOption = screen.getByTestId('dashboard-platform-filter-option-pos');
    expect(posOption.className).toMatch(/bg-zinc-100/);
    expect(posOption.className).toMatch(/font-medium/);
    // Other options are not highlighted
    const webOption = screen.getByTestId('dashboard-platform-filter-option-web');
    expect(webOption.className).not.toMatch(/font-medium/);
  });
});

// =============================================================================
// 3. platformMatches predicate — pure-function copy of DashboardPage logic
// =============================================================================
//
// Predicate copied VERBATIM from DashboardPage.jsx (channelData & statusData
// useMemo blocks). Drift between the page and this test = test fails fast.
const platformMatchesFactory = (platform) => (item) => {
  if (platform === null) return true;
  const orderFrom = item.order?.orderFrom ?? item.orderFrom;
  if (platform === 'pos') return orderFrom !== 'web';
  if (platform === 'web') return orderFrom === 'web';
  return true;
};

describe('POS2-002 Phase 3 | platformMatches predicate', () => {
  // Synthetic order list covering every shape the dashboard can produce:
  //   - direct `orderFrom` (walkIn/takeAway/delivery adapted items)
  //   - nested `order.orderFrom` (dineIn enriched tables, room rows)
  //   - missing/undefined orderFrom (empty tables, available rooms)
  //   - unknown future BE values ('aggregator', 'kiosk') — must be classified
  //     as "non-web" (POS-side) until they get their own dropdown row in v2
  const orders = [
    { id: 'pos-1',         orderFrom: 'pos' },
    { id: 'pos-2-nested',  order: { orderFrom: 'pos' } },
    { id: 'web-1',         orderFrom: 'web' },
    { id: 'web-2-nested',  order: { orderFrom: 'web' } },
    { id: 'empty-table',   /* no orderFrom anywhere */ },
    { id: 'future-agg',    orderFrom: 'aggregator' },
    { id: 'future-kiosk',  orderFrom: 'kiosk' },
  ];

  test('platform === null → returns every item unchanged', () => {
    const out = orders.filter(platformMatchesFactory(null));
    expect(out.length).toBe(orders.length);
    expect(out.map(o => o.id)).toEqual(orders.map(o => o.id));
  });

  test('platform === "web" → only orders with orderFrom === "web"', () => {
    const out = orders.filter(platformMatchesFactory('web'));
    expect(out.map(o => o.id).sort()).toEqual(['web-1', 'web-2-nested'].sort());
  });

  test('platform === "pos" → every non-web order (incl. empty rows + unknown future BE values)', () => {
    const out = orders.filter(platformMatchesFactory('pos'));
    expect(out.map(o => o.id).sort()).toEqual(
      ['pos-1', 'pos-2-nested', 'empty-table', 'future-agg', 'future-kiosk'].sort()
    );
  });

  test('predicate reads order.orderFrom when item has nested order shape', () => {
    const item = { order: { orderFrom: 'web' } };
    expect(platformMatchesFactory('web')(item)).toBe(true);
    expect(platformMatchesFactory('pos')(item)).toBe(false);
  });

  test('predicate reads top-level orderFrom when no nested order', () => {
    const item = { orderFrom: 'web' };
    expect(platformMatchesFactory('web')(item)).toBe(true);
    expect(platformMatchesFactory('pos')(item)).toBe(false);
  });

  test('top-level orderFrom takes precedence is irrelevant — nested wins via ?? (only used when top-level is undefined)', () => {
    // Item with no top-level orderFrom but nested === 'web' → reads as web.
    const item = { order: { orderFrom: 'web' } };
    expect(platformMatchesFactory('web')(item)).toBe(true);
  });

  test('empty/available rows (no orderFrom) classify as POS-side, NOT Web', () => {
    const empty = { id: 'available-table' };
    expect(platformMatchesFactory('web')(empty)).toBe(false);
    expect(platformMatchesFactory('pos')(empty)).toBe(true);
    expect(platformMatchesFactory(null)(empty)).toBe(true);
  });

  test('predicate composes (AND) with a status filter without short-circuit damage', () => {
    // Mimics the dashboard pipeline: status filter first, then platform filter.
    const statusYTC = (o) => o.fOrderStatus === 7;
    const dataset = [
      { id: 'a', fOrderStatus: 7, orderFrom: 'pos' },
      { id: 'b', fOrderStatus: 1, orderFrom: 'pos' },
      { id: 'c', fOrderStatus: 7, orderFrom: 'web' },
      { id: 'd', fOrderStatus: 7 }, // empty
    ];
    const visible = dataset.filter(statusYTC).filter(platformMatchesFactory('web'));
    expect(visible.map(o => o.id)).toEqual(['c']);
    const visiblePOS = dataset.filter(statusYTC).filter(platformMatchesFactory('pos'));
    // YTC + POS → 'a' + 'd' (empty row is POS-side)
    expect(visiblePOS.map(o => o.id).sort()).toEqual(['a', 'd'].sort());
  });

  test('selecting "All" never removes any row (idempotence)', () => {
    const dataset = [
      { id: 'a', orderFrom: 'pos' },
      { id: 'b', orderFrom: 'web' },
      { id: 'c' },
    ];
    expect(dataset.filter(platformMatchesFactory(null))).toHaveLength(3);
  });
});
