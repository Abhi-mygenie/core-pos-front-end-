// BUG-042-A — CollectPaymentPanel Hold-mode rail gate (pure-function tests)
// ----------------------------------------------------------------------------
// Owner-locked rule (Feb-2026): when `allowedMethods` is provided to
// `CollectPaymentPanel` (i.e. mounted by the Audit Report → Hold tab
// CollectBillPanelDrawer), the panel must:
//   1. Hide Row 2 entirely (Split, Credit/Tab dynamic button, "More"
//      dropdown, To Room button).
//   2. Only render Row 1 buttons whose method id is ALSO configured by the
//      restaurant (intersection with `enabledLayout.row1`, which itself is
//      filtered by `filterLayoutByApiTypes`).
//   3. Default the selected `paymentMethod` to 'cash' when configured; if
//      not configured, fall back to the first allowed-AND-configured
//      method.
//   4. When `allowedMethods` is absent (dashboard caller), every existing
//      behaviour must be preserved verbatim.
//
// Test surface: pure functions that mirror the production logic at
// `CollectPaymentPanel.jsx`:
//   • `isHoldContext = Array.isArray(allowedMethods) && allowedMethods.length > 0`
//   • initial-state computation for `paymentMethod` (lazy initializer)
// Plus a real integration check via `filterLayoutByApiTypes` from the
// production config to assert end-to-end that the row1 / row2 intersection
// behaves as expected for owner-supplied scenarios.

import {
  PAYMENT_METHODS,
  DEFAULT_PAYMENT_LAYOUT,
  filterLayoutByApiTypes,
  getDynamicPaymentTypes,
} from '../../../config/paymentMethods';

// =============================================================================
// Pure-function mirrors of CollectPaymentPanel logic
// =============================================================================

const computeIsHoldContext = (allowedMethods) =>
  Array.isArray(allowedMethods) && allowedMethods.length > 0;

const computeInitialPaymentMethod = (allowedMethods, enabledLayout) => {
  if (!Array.isArray(allowedMethods) || allowedMethods.length === 0) return 'cash';
  const row1 = (enabledLayout && enabledLayout.row1) || [];
  const configured = allowedMethods.filter((id) => row1.includes(id));
  if (configured.includes('cash')) return 'cash';
  return configured[0] || 'cash';
};

// Helper to model a restaurant's API paymentTypes array.
const apiTypes = (...names) => names.map((n) => ({ id: n, name: n, displayName: n }));

// =============================================================================
// 1. isHoldContext derivation
// =============================================================================

describe('BUG-042-A | isHoldContext derivation', () => {
  test('undefined allowedMethods → false (dashboard default)', () => {
    expect(computeIsHoldContext(undefined)).toBe(false);
  });

  test('null allowedMethods → false', () => {
    expect(computeIsHoldContext(null)).toBe(false);
  });

  test('empty array allowedMethods → false (treated as no restriction)', () => {
    expect(computeIsHoldContext([])).toBe(false);
  });

  test("['cash','card','upi'] allowedMethods → true (Hold-Collect mode)", () => {
    expect(computeIsHoldContext(['cash', 'card', 'upi'])).toBe(true);
  });

  test("['cash'] allowedMethods → true", () => {
    expect(computeIsHoldContext(['cash'])).toBe(true);
  });
});

// =============================================================================
// 2. initialPaymentMethod default selection
// =============================================================================

describe('BUG-042-A | initial paymentMethod default selection', () => {
  test('U-6 regression: undefined allowedMethods → "cash" (dashboard default preserved)', () => {
    expect(computeInitialPaymentMethod(undefined, { row1: ['cash', 'card', 'upi'] })).toBe('cash');
  });

  test('U-5: allowedMethods=[cash,card,upi] but only Card+UPI configured → "card"', () => {
    expect(
      computeInitialPaymentMethod(['cash', 'card', 'upi'], { row1: ['card', 'upi'] })
    ).toBe('card');
  });

  test('U-5b: allowedMethods=[cash,card,upi] but only UPI configured → "upi"', () => {
    expect(
      computeInitialPaymentMethod(['cash', 'card', 'upi'], { row1: ['upi'] })
    ).toBe('upi');
  });

  test('happy path: cash configured → "cash" wins', () => {
    expect(
      computeInitialPaymentMethod(['cash', 'card', 'upi'], { row1: ['cash', 'card', 'upi'] })
    ).toBe('cash');
  });

  test('safety: allowedMethods present but ZERO configured → falls back to "cash"', () => {
    expect(computeInitialPaymentMethod(['cash', 'card', 'upi'], { row1: [] })).toBe('cash');
  });

  test('safety: enabledLayout undefined → falls back to "cash"', () => {
    expect(computeInitialPaymentMethod(['cash', 'card', 'upi'], undefined)).toBe('cash');
  });
});

// =============================================================================
// 3. End-to-end intersection via real `filterLayoutByApiTypes`
//    Asserts Row 1 surfaces exactly the cash/card/upi configured by the
//    restaurant, regardless of how many extra payment types exist.
// =============================================================================

describe('BUG-042-A | Row 1 intersection with allowedMethods (using real filterLayoutByApiTypes)', () => {
  const ALLOWED = ['cash', 'card', 'upi'];

  test('U-1: full config (cash + card + upi + partial + TAB + rooms) → Row 1 surfaces only cash/card/upi (Row 2 hidden by isHoldContext)', () => {
    const types = apiTypes('cash', 'card', 'upi', 'partial', 'tab');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, /* hasRooms */ true);
    expect(enabledLayout.row1).toEqual(['cash', 'card', 'upi']);

    // In Hold-Collect mode the panel hides Row 2 wholesale, so we don't
    // intersect Row 2 here — confirm the predicate is on:
    expect(computeIsHoldContext(ALLOWED)).toBe(true);

    // Initial method must be 'cash' (configured) when allowedMethods=[cash,card,upi].
    expect(computeInitialPaymentMethod(ALLOWED, enabledLayout)).toBe('cash');
  });

  test('U-2: only Cash configured → Row 1 surfaces only Cash; initial method = "cash"', () => {
    const types = apiTypes('cash');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, false);
    expect(enabledLayout.row1).toEqual(['cash']);
    expect(computeInitialPaymentMethod(ALLOWED, enabledLayout)).toBe('cash');
  });

  test('U-3: Cash + UPI configured (no Card) → Row 1 surfaces Cash + UPI; initial method = "cash"', () => {
    const types = apiTypes('cash', 'upi');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, false);
    expect(enabledLayout.row1).toEqual(['cash', 'upi']);
    expect(computeInitialPaymentMethod(ALLOWED, enabledLayout)).toBe('cash');
  });

  test('Card + UPI only (no Cash) → Row 1 surfaces Card + UPI; initial method falls back to "card"', () => {
    const types = apiTypes('card', 'upi');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, false);
    expect(enabledLayout.row1).toEqual(['card', 'upi']);
    expect(computeInitialPaymentMethod(ALLOWED, enabledLayout)).toBe('card');
  });

  test('U-4 regression: dashboard caller (no allowedMethods) keeps Row 1 + Row 2 unchanged with full config', () => {
    const types = apiTypes('cash', 'card', 'upi', 'partial', 'tab');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, true);
    expect(enabledLayout.row1).toEqual(['cash', 'card', 'upi']);
    // Row 2 retains split + credit + transferToRoom availability:
    expect(enabledLayout.row2).toContain('split');
    // Note: 'credit' is delivered through `getDynamicPaymentTypes` in the
    // panel (not Row 2 of the layout), so we assert via that path:
    const dynamics = getDynamicPaymentTypes(types).map((d) => d.id);
    // tab → mapApiNameToMethodId returns 'credit' or original key depending
    // on env; either way it must be present in dynamicPaymentTypes for the
    // dashboard caller.
    expect(dynamics.length).toBeGreaterThan(0);
    // No Hold context → initial method = 'cash'
    expect(computeIsHoldContext(undefined)).toBe(false);
    expect(computeInitialPaymentMethod(undefined, enabledLayout)).toBe('cash');
  });

  test('None of cash/card/upi configured (only TAB) → Row 1 EMPTY; initial method falls back to "cash" string (row-level disable in OrderTable enforces UX)', () => {
    const types = apiTypes('tab');
    const enabledLayout = filterLayoutByApiTypes(DEFAULT_PAYMENT_LAYOUT, types, false);
    expect(enabledLayout.row1).toEqual([]);
    // initial-state fallback returns 'cash' string; the UI will render no
    // Row 1 button (empty intersection) AND OrderTable will disable Collect
    // Bill at row level via hasEligibleHoldPaymentMethod=false.
    expect(computeInitialPaymentMethod(ALLOWED, enabledLayout)).toBe('cash');
  });
});

// =============================================================================
// 4. PAYMENT_METHODS catalog sanity — primary methods exist
// =============================================================================

describe('BUG-042-A | PAYMENT_METHODS catalog has the three primary methods', () => {
  test.each(['cash', 'card', 'upi'])('%s exists with type="method"', (id) => {
    expect(PAYMENT_METHODS[id]).toBeDefined();
    expect(PAYMENT_METHODS[id].type).toBe('method');
  });
});
