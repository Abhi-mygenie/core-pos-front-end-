// PlatformCounterChip — POS2-002 Phase 3.1 (May-2026)
//
// Read-only "Web N · POS M" pulse chip surfaced in the dashboard header,
// immediately to the left of the search box. Two-segment pill with a
// brand-color dot per axis (green = web, orange = POS).
//
// Owner-locked behaviour (2026-05-10):
//   - Counter respects status chips, channel column hide, and search.
//   - Counter IGNORES the Platform dropdown itself (independence guarantee
//     — prevents the circular "Web 4 · POS 0" artifact when the operator
//     is filtered to Web).
//   - Excludes terminal statuses (3 cancelled, 6 paid) and orders without
//     an orderId (empty tables / available rooms).
//   - Read-only — no click handler in v1.
//   - Layout stable when both counts are 0; numeric labels dim instead of
//     collapsing.
//
// File is purely presentational; the count logic lives in
// `computePlatformCounts` below as a pure exportable helper so the
// dashboard `useMemo` and the Jest tests share one source of truth.

import React from 'react';

// Brand palette — matches Mygenie logo / Add button.
// Web = secondary brand green; POS = primary brand orange (also Add button).
export const BRAND_COLOR_WEB = '#3DAB4E';
export const BRAND_COLOR_POS = '#F26522';

// Terminal statuses — orders in these states do NOT count toward "running"
// pulse. Numbers come from f_order_status: 3 = cancelled, 6 = paid.
const TERMINAL_F_ORDER_STATUSES = new Set([3, 6]);

/**
 * Pure-function counter — single source of truth for the chip values.
 *
 * @param {Array<object>} orders — each order may carry `orderFrom` or a
 *   nested `order.orderFrom`, plus `fOrderStatus` and `orderId`.
 * @returns {{web: number, pos: number}}
 *
 * Bucketing rules (locked):
 *   - web bucket  = `orderFrom === 'web'` (i.e. `isWebOrder === true`)
 *   - pos bucket  = everything else, INCLUDING undefined / unknown future
 *                   BE values like 'aggregator' / 'kiosk' (future-proofing
 *                   parity with the Phase 3 dropdown predicate)
 *
 * Skipped rows:
 *   - no `orderId` (empty tables, available rooms)
 *   - `fOrderStatus` ∈ {3, 6}  (cancelled / paid — terminal)
 *
 * The function is intentionally agnostic of any header filter state.
 * Callers narrow the input list to the in-context pool BEFORE calling.
 */
export const computePlatformCounts = (orders) => {
  if (!Array.isArray(orders)) return { web: 0, pos: 0 };
  let web = 0;
  let pos = 0;
  for (const order of orders) {
    if (!order || !order.orderId) continue;
    if (TERMINAL_F_ORDER_STATUSES.has(order.fOrderStatus)) continue;
    const orderFrom = order.orderFrom ?? order.order?.orderFrom;
    if (orderFrom === 'web') web += 1;
    else pos += 1;
  }
  return { web, pos };
};

/**
 * Visual chip. Pure presentational — both numbers are passed in by the
 * dashboard `useMemo`. Default values keep the chip safe to render in
 * older call sites that haven't wired the props yet.
 */
const PlatformCounterChip = ({ webCount = 0, posCount = 0 }) => {
  const webDim = webCount === 0;
  const posDim = posCount === 0;

  return (
    <div
      data-testid="dashboard-platform-counter"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium"
      role="status"
      aria-label={`${webCount} running web orders, ${posCount} running POS orders`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: BRAND_COLOR_WEB }}
        />
        <span
          data-testid="dashboard-platform-counter-web"
          data-count={webCount}
          className={webDim ? 'text-zinc-400' : 'text-zinc-700'}
        >
          Web {webCount}
        </span>
      </span>

      <span aria-hidden="true" className="text-zinc-300 select-none">·</span>

      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: BRAND_COLOR_POS }}
        />
        <span
          data-testid="dashboard-platform-counter-pos"
          data-count={posCount}
          className={posDim ? 'text-zinc-400' : 'text-zinc-700'}
        >
          POS {posCount}
        </span>
      </span>
    </div>
  );
};

export default PlatformCounterChip;
