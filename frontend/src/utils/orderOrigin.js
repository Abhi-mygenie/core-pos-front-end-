// Shared Web/POS origin helpers — POS2-002 Phase 3.2 (May-2026)
// ===========================================================================
//
// Single source of truth for the "where did this order originate" axis used
// by BOTH the dashboard header pulse counter (`Web N · POS M`) and the
// Platform dropdown filter (`Platform: All / POS / Web · Scan`).
//
// Owner-locked rules (CR-2026-05-15):
//   1. Web bucket  = `orderFrom === 'web'` (i.e. `isWebOrder === true` after
//      transform normalisation).
//   2. POS bucket  = every other running order. Future BE values such as
//      `'aggregator'`, `'kiosk'`, `'whatsapp'`, `'qr_campaign'` automatically
//      bucket to POS until each gains its own dropdown row.
//   3. Empty Available tables / rooms (no orderId) are NOT orders — they are
//      containers. They are excluded from BOTH origin buckets. They remain
//      visible only when the filter is "Platform: All".
//   4. Terminal statuses (3 cancelled, 6 paid) are NOT running orders —
//      excluded from counts.
//   5. Pulse counter is INDEPENDENT of status chips, channel chips, search,
//      and the Platform dropdown itself. It always reflects the true running-
//      order universe.
//
// These two helpers are intentionally tiny and side-effect free so they can
// be composed by callers (DashboardPage.jsx) and unit-tested directly.

// Terminal statuses are out of the running-order universe.
const TERMINAL_F_ORDER_STATUSES = new Set([3, 6]); // 3 = cancelled, 6 = paid

/**
 * Pure boolean — the ONLY origin check anywhere in the dashboard.
 * Safe against either field shape: order may carry `orderFrom` directly
 * or nested under `order.orderFrom` (channel-row adapter wrappers).
 *
 * @param {object} item
 * @returns {boolean}
 */
export const isWebOrigin = (item) =>
  (item?.orderFrom ?? item?.order?.orderFrom) === 'web';

/**
 * Single source of truth for "the running-order universe".
 *
 * Takes the raw orders array (OrderContext `orders`) and returns the subset
 * that should be counted by the header pulse. Independent of any UI
 * narrowing (status chips, channel chips, search, platform dropdown).
 *
 * Skipped rows:
 *   - `!orderId`         (empty Available containers; not real orders)
 *   - fOrderStatus ∈ {3, 6} (terminal — cancelled or paid)
 *
 * @param {Array<object>} orders
 * @returns {Array<object>}
 */
export const getRunningOrders = (orders) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(
    (o) => o && o.orderId && !TERMINAL_F_ORDER_STATUSES.has(o.fOrderStatus)
  );
};
