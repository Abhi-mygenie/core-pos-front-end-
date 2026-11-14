// CR-411: Cart carries forward on type/table switch; clears only on dashboard return.
// Reverts BUG-452 OD-452-01=B (nonce-bump-on-switch). Stay-on-order path (PROD-004) unchanged.
//
// Structural tests — DashboardPage has a 5-context + router + socket-hook fan-in that makes
// a mounted RTL harness impractical. Verified structurally against source (same pattern as
// BUG-452 original). Behavioural coverage lives in the preprod matrix V-8..V-12.

const fs = require('fs');
const path = require('path');

const dashboardSrc = fs.readFileSync(path.resolve(__dirname, '../../pages/DashboardPage.jsx'), 'utf-8');
const orderEntrySrc = fs.readFileSync(path.resolve(__dirname, '../../components/order-entry/OrderEntry.jsx'), 'utf-8');

const sliceBetween = (src, startRe, endRe) => {
  const start = src.search(startRe);
  expect(start).toBeGreaterThan(-1);
  const rest = src.slice(start);
  const end = rest.search(endRe);
  expect(end).toBeGreaterThan(-1);
  return rest.slice(0, end);
};

const BUMP = 'setOrderEntryResetNonce(n => n + 1)';
const FLAG_RESETS = ['setInitialShowMerge(false)', 'setInitialShowShift(false)', 'setInitialShowPayment(false)', 'setInitialTransferItem(null)'];

// ---------------------------------------------------------------------------
// CR-411 D-1 — handleTableClick carries cart forward (no nonce bump on switch)
// ---------------------------------------------------------------------------
describe('CR-411 D-1 — handleTableClick carries cart forward on table switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleTableClick = \(tableEntry\) => \{/, /\n  const handleAddOrder/);

  test('nonce bump REMOVED from table-switch path (CR-411 reverses BUG-452)', () => {
    expect(body).not.toContain(BUMP);
  });

  test('CR-411 marker present (R18)', () => {
    expect(body).toMatch(/\/\/ CR-411/);
  });

  test('VD-8 modal flag resets still present inside guard (belt-and-braces)', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });
});

// ---------------------------------------------------------------------------
// CR-411 D-2 — handleOrderTypeChange carries cart forward (no nonce bump on switch)
// ---------------------------------------------------------------------------
describe('CR-411 D-2 — handleOrderTypeChange carries cart forward on type switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleOrderTypeChange = \(newType\) => \{/, /\n  const handleCloseOrderEntry/);

  test('nonce bump REMOVED from type-switch path (CR-411 reverses BUG-452)', () => {
    expect(body).not.toContain(BUMP);
  });

  test('CR-411 marker present (R18)', () => {
    expect(body).toMatch(/\/\/ CR-411/);
  });

  test('modal flag resets still present inside guard', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });
});

// ---------------------------------------------------------------------------
// CR-411 D-3 — handleCloseOrderEntry clears cartsByTable before nulling state
// ---------------------------------------------------------------------------
describe('CR-411 D-3 — handleCloseOrderEntry clears saved cart on dashboard return', () => {
  const body = sliceBetween(dashboardSrc, /const handleCloseOrderEntry = \(\) => \{/, /\n  \/\/ CR-008 #4/);

  test('cartsByTable clear present before state nulling', () => {
    expect(body).toContain("setCartsByTable(prev => ({ ...prev, [cartKey]: [] }))");
  });

  test('cartKey derived from orderEntryTable?.id || orderEntryType', () => {
    expect(body).toContain('orderEntryTable?.id || orderEntryType');
  });

  test('CR-411 marker present (R18)', () => {
    expect(body).toMatch(/\/\/ CR-411/);
  });
});

// ---------------------------------------------------------------------------
// CR-411 D-4 — nonce mechanism still exists (stay-on-order path untouched)
// ---------------------------------------------------------------------------
describe('CR-411 D-4 — nonce wiring: only stay-on-order path retains nonce bump', () => {
  test('exactly ONE nonce bump remains in DashboardPage (handleCollectBillStayOnOrder)', () => {
    const bumps = (dashboardSrc.match(/setOrderEntryResetNonce\(n => n \+ 1\)/g) || []).length;
    expect(bumps).toBe(1);
  });

  test('<OrderEntry key={orderEntryResetNonce}> still wired (remount mechanism preserved for stay-on-order)', () => {
    expect(dashboardSrc).toMatch(/<OrderEntry\s+key=\{orderEntryResetNonce\}/);
  });

  test('handleCollectBillStayOnOrder still clears cartKey and re-enters walkIn (PROD-004)', () => {
    const body = sliceBetween(dashboardSrc, /const handleCollectBillStayOnOrder = \(\) => \{/, /\n  \};/);
    expect(body).toContain("setCartsByTable(prev => ({ ...prev, [cartKey]: [] }))");
    expect(body).toContain("setOrderEntryType('walkIn')");
  });
});

// ---------------------------------------------------------------------------
// CR-411 D-5 — OrderEntry.jsx carry-forward branch restored
// ---------------------------------------------------------------------------
describe('CR-411 D-5 — OrderEntry.jsx carry-forward branch restored', () => {
  const branch = sliceBetween(orderEntrySrc, /\} else if \(oldKey !== null\) \{/, /\n    \} else \{/);

  test('CR-411 carry-forward comment present (R18)', () => {
    expect(branch).toMatch(/CR-411.*cart carries forward/i);
  });

  test('branch is a no-op — no setCartItems call (items stay in state)', () => {
    expect(branch).not.toMatch(/setCartItems\(/);
  });

  test('oldKey write uses [] not cartItems (OD-411-01=A)', () => {
    const useEffectBody = sliceBetween(
      orderEntrySrc,
      /\/\/ CR-411: clear oldKey slot/,
      /cartKeyRef\.current = newKey/
    );
    expect(useEffectBody).toContain('onCartChange?.(oldKey, [])');
    expect(useEffectBody).not.toContain('onCartChange?.(oldKey, cartItems)');
  });
});
