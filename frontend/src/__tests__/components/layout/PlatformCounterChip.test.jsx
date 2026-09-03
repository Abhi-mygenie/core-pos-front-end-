// POS2-002 Phase 3.1 — PlatformCounterChip focused tests (May-2026)
// ----------------------------------------------------------------------------
// Owner-locked behaviour:
//   - Read-only chip rendered left of the search box on the dashboard header.
//   - Two segments: "Web N" and "POS M", separated by a center dot.
//   - Brand-color dots: green (#3DAB4E) for Web, orange (#F26522) for POS.
//   - Layout stable when both counts are 0 — numeric labels dim instead of
//     the chip collapsing.
//   - Counter respects status / channel / search context but IGNORES the
//     Platform dropdown itself (independence guarantee). The independence
//     guarantee is enforced upstream in DashboardPage.jsx — the pure
//     `computePlatformCounts` helper has no access to dropdown state.
//
// Files exercised:
//   - components/layout/PlatformCounterChip.jsx
//     (default export + computePlatformCounts named export + brand colors)

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import PlatformCounterChip, {
  computePlatformCounts,
  BRAND_COLOR_WEB,
  BRAND_COLOR_POS,
} from '../../../components/layout/PlatformCounterChip';

// =============================================================================
// 1. Brand color exports — locked palette
// =============================================================================
describe('POS2-002 Phase 3.1 | brand color exports', () => {
  test('Web brand color is the secondary brand green #3DAB4E', () => {
    expect(BRAND_COLOR_WEB).toBe('#3DAB4E');
  });

  test('POS brand color is the primary brand orange #F26522 (matches Add button)', () => {
    expect(BRAND_COLOR_POS).toBe('#F26522');
  });
});

// =============================================================================
// 2. Component render — both segments + brand dots + correct numbers
// =============================================================================
describe('POS2-002 Phase 3.1 | PlatformCounterChip rendering', () => {
  test('renders both segments with the supplied numbers', () => {
    render(<PlatformCounterChip webCount={4} posCount={17} />);
    expect(screen.getByTestId('dashboard-platform-counter-web')).toHaveTextContent('Web 4');
    expect(screen.getByTestId('dashboard-platform-counter-pos')).toHaveTextContent('POS 17');
  });

  test('exposes count values via data-count for QA / automation', () => {
    render(<PlatformCounterChip webCount={4} posCount={17} />);
    expect(screen.getByTestId('dashboard-platform-counter-web').getAttribute('data-count')).toBe('4');
    expect(screen.getByTestId('dashboard-platform-counter-pos').getAttribute('data-count')).toBe('17');
  });

  test('aria-label summarises both counts for assistive tech', () => {
    render(<PlatformCounterChip webCount={4} posCount={17} />);
    const chip = screen.getByTestId('dashboard-platform-counter');
    expect(chip).toHaveAttribute('aria-label', '4 running web orders, 17 running POS orders');
  });

  test('brand-green dot precedes the Web segment', () => {
    render(<PlatformCounterChip webCount={4} posCount={17} />);
    const webSpan = screen.getByTestId('dashboard-platform-counter-web');
    // The colored dot is the previous sibling of the numeric label span.
    const greenDot = webSpan.previousElementSibling;
    expect(greenDot).not.toBeNull();
    expect(greenDot.style.backgroundColor).toBe('rgb(61, 171, 78)'); // #3DAB4E in rgb form
  });

  test('brand-orange dot precedes the POS segment', () => {
    render(<PlatformCounterChip webCount={4} posCount={17} />);
    const posSpan = screen.getByTestId('dashboard-platform-counter-pos');
    const orangeDot = posSpan.previousElementSibling;
    expect(orangeDot).not.toBeNull();
    expect(orangeDot.style.backgroundColor).toBe('rgb(242, 101, 34)'); // #F26522 in rgb form
  });

  test('zero-count Web segment uses dimmed text class', () => {
    render(<PlatformCounterChip webCount={0} posCount={5} />);
    const webSpan = screen.getByTestId('dashboard-platform-counter-web');
    const posSpan = screen.getByTestId('dashboard-platform-counter-pos');
    expect(webSpan.className).toMatch(/text-zinc-400/);
    expect(posSpan.className).toMatch(/text-zinc-700/);
  });

  test('zero-count POS segment uses dimmed text class', () => {
    render(<PlatformCounterChip webCount={5} posCount={0} />);
    const webSpan = screen.getByTestId('dashboard-platform-counter-web');
    const posSpan = screen.getByTestId('dashboard-platform-counter-pos');
    expect(webSpan.className).toMatch(/text-zinc-700/);
    expect(posSpan.className).toMatch(/text-zinc-400/);
  });

  test('layout stable when both counts are zero — chip still renders, both dimmed', () => {
    render(<PlatformCounterChip webCount={0} posCount={0} />);
    expect(screen.getByTestId('dashboard-platform-counter')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-platform-counter-web')).toHaveTextContent('Web 0');
    expect(screen.getByTestId('dashboard-platform-counter-pos')).toHaveTextContent('POS 0');
    expect(screen.getByTestId('dashboard-platform-counter-web').className).toMatch(/text-zinc-400/);
    expect(screen.getByTestId('dashboard-platform-counter-pos').className).toMatch(/text-zinc-400/);
  });

  test('default props render zero/zero without crashing (back-compat shim)', () => {
    render(<PlatformCounterChip />);
    expect(screen.getByTestId('dashboard-platform-counter-web')).toHaveTextContent('Web 0');
    expect(screen.getByTestId('dashboard-platform-counter-pos')).toHaveTextContent('POS 0');
  });
});

// =============================================================================
// 3. computePlatformCounts — pure function, single source of truth
// =============================================================================
describe('POS2-002 Phase 3.1 | computePlatformCounts purefn', () => {
  test('empty input → { web: 0, pos: 0 }', () => {
    expect(computePlatformCounts([])).toEqual({ web: 0, pos: 0 });
  });

  test('non-array input → { web: 0, pos: 0 } (defensive)', () => {
    expect(computePlatformCounts(null)).toEqual({ web: 0, pos: 0 });
    expect(computePlatformCounts(undefined)).toEqual({ web: 0, pos: 0 });
    expect(computePlatformCounts({})).toEqual({ web: 0, pos: 0 });
  });

  test('excludes orders without an orderId (empty tables / available rooms)', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },
      { /* no orderId */ fOrderStatus: 7, orderFrom: 'pos' },
      { orderId: 2, fOrderStatus: 7, orderFrom: 'pos' },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 1, pos: 1 });
  });

  test('excludes terminal status 3 (cancelled)', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 3, orderFrom: 'web' }, // terminal — skip
      { orderId: 2, fOrderStatus: 7, orderFrom: 'web' },
      { orderId: 3, fOrderStatus: 3, orderFrom: 'pos' }, // terminal — skip
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 1, pos: 0 });
  });

  test('excludes terminal status 6 (paid)', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 6, orderFrom: 'web' }, // terminal — skip
      { orderId: 2, fOrderStatus: 1, orderFrom: 'web' },
      { orderId: 3, fOrderStatus: 6, orderFrom: 'pos' }, // terminal — skip
      { orderId: 4, fOrderStatus: 5, orderFrom: 'pos' },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 1, pos: 1 });
  });

  test('classifies orderFrom === "web" → web bucket', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },
      { orderId: 2, fOrderStatus: 1, orderFrom: 'web' },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 2, pos: 0 });
  });

  test('classifies orderFrom !== "web" → POS bucket (incl. undefined and unknown future BE values)', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'pos' },
      { orderId: 2, fOrderStatus: 7, orderFrom: 'aggregator' }, // future
      { orderId: 3, fOrderStatus: 7, orderFrom: 'kiosk' },      // future
      { orderId: 4, fOrderStatus: 7 /* no orderFrom */ },
      { orderId: 5, fOrderStatus: 7, orderFrom: '' },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 0, pos: 5 });
  });

  test('reads nested order.orderFrom when top-level is missing', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, order: { orderFrom: 'web' } },
      { orderId: 2, fOrderStatus: 7, order: { orderFrom: 'pos' } },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 1, pos: 1 });
  });

  test('top-level orderFrom takes precedence over nested when both present', () => {
    const orders = [
      // top-level wins → counts as POS
      { orderId: 1, fOrderStatus: 7, orderFrom: 'pos', order: { orderFrom: 'web' } },
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 0, pos: 1 });
  });

  test('mixed scenario — terminal exclusions + bucketing + missing fields', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },         // → web
      { orderId: 2, fOrderStatus: 1, orderFrom: 'web' },         // → web
      { orderId: 3, fOrderStatus: 6, orderFrom: 'web' },         // terminal — skip
      { orderId: 4, fOrderStatus: 7, orderFrom: 'pos' },         // → pos
      { orderId: 5, fOrderStatus: 3, orderFrom: 'pos' },         // terminal — skip
      { orderId: 6, fOrderStatus: 5, orderFrom: 'aggregator' },  // → pos (future)
      { /* no orderId */ fOrderStatus: 7, orderFrom: 'web' },    // skip
      { orderId: 8, fOrderStatus: 2 /* no orderFrom */ },        // → pos
    ];
    expect(computePlatformCounts(orders)).toEqual({ web: 2, pos: 3 });
  });

  test('idempotence — calling twice on same input yields same result', () => {
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },
      { orderId: 2, fOrderStatus: 7, orderFrom: 'pos' },
    ];
    const a = computePlatformCounts(orders);
    const b = computePlatformCounts(orders);
    expect(a).toEqual(b);
    expect(a).toEqual({ web: 1, pos: 1 });
  });

  test('independence guarantee — purefn has no access to platform-dropdown state, so result depends ONLY on input', () => {
    // The purefn signature accepts only `orders`; it cannot reference the
    // Platform dropdown. This test pins the API surface so any future
    // refactor that tries to thread filter state into the helper fails.
    expect(computePlatformCounts.length).toBe(1);
    const orders = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },
      { orderId: 2, fOrderStatus: 7, orderFrom: 'pos' },
      { orderId: 3, fOrderStatus: 7, orderFrom: 'pos' },
    ];
    // Even if a hypothetical caller had platform === 'web' selected, the
    // helper still reports the full split because it doesn't know about it.
    expect(computePlatformCounts(orders)).toEqual({ web: 1, pos: 2 });
  });

  test('composition with status filter — respects pre-filtered input list', () => {
    // Mirror what DashboardPage does: caller pre-filters to YTC only,
    // then calls computePlatformCounts on the result.
    const dataset = [
      { orderId: 1, fOrderStatus: 7, orderFrom: 'web' },
      { orderId: 2, fOrderStatus: 1, orderFrom: 'web' }, // not YTC
      { orderId: 3, fOrderStatus: 7, orderFrom: 'pos' },
      { orderId: 4, fOrderStatus: 5, orderFrom: 'pos' }, // not YTC
    ];
    const ytcOnly = dataset.filter((o) => o.fOrderStatus === 7);
    expect(computePlatformCounts(ytcOnly)).toEqual({ web: 1, pos: 1 });
  });
});
