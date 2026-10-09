// BUG-452: Stale cart after type/table switch → Option B always-clear, S1 remount (+ VD-8 Option C flag reset).
// D-4 fallback (plan §D1, recorded at Gate 5): DashboardPage has a 5-context + router + socket-hook fan-in that makes a
// mounted RTL harness impractical, so the two handlers are verified structurally against source (same pattern as
// src/__tests__/structure/barrelExports.test.js). Behavioural coverage lives in the preprod matrix VD-1..VD-11.

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
const GUARD = 'if (orderEntryType !== null)';
const FLAG_RESETS = ['setInitialShowMerge(false)', 'setInitialShowShift(false)', 'setInitialShowPayment(false)', 'setInitialTransferItem(null)'];

describe('BUG-452 D-1 — handleTableClick remounts OrderEntry on in-OrderEntry table switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleTableClick = \(tableEntry\) => \{/, /\n  const handleAddOrder/);

  test('bump is guarded by orderEntryType !== null (no remount when OrderEntry is closed — VD-6)', () => {
    expect(body).toContain(GUARD);
    expect(body).toContain(BUMP);
    expect(body.indexOf(GUARD)).toBeLessThan(body.indexOf(BUMP));
  });

  test('null-table early return (prepaid path, VD-7) precedes the bump', () => {
    const nullReturn = body.indexOf('if (!tableEntry) {');
    expect(nullReturn).toBeGreaterThan(-1);
    expect(nullReturn).toBeLessThan(body.indexOf(BUMP));
  });

  test('room check-in early return precedes the bump; bump precedes setOrderEntryTable(tableEntry)', () => {
    expect(body.indexOf('setCheckInRoom(tableEntry)')).toBeLessThan(body.indexOf(BUMP));
    expect(body.indexOf(BUMP)).toBeLessThan(body.indexOf('setOrderEntryTable(tableEntry);'));
  });

  test('VD-8 Option C: Merge/Shift/Payment entry flags reset inside the same guard', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });

  test('exactly one bump and a // BUG-452 marker (R18)', () => {
    expect(body.split(BUMP).length - 1).toBe(1);
    expect(body).toMatch(/\/\/ BUG-452/);
  });
});

describe('BUG-452 D-2 — handleOrderTypeChange remounts OrderEntry on type switch', () => {
  const body = sliceBetween(dashboardSrc, /const handleOrderTypeChange = \(newType\) => \{/, /\n  const handleCloseOrderEntry/);

  test('guarded bump is the first statement (before the walk-in/takeAway/delivery table clearing)', () => {
    expect(body.indexOf(GUARD)).toBeLessThan(body.indexOf('if (newType === "walkIn"'));
    expect(body.indexOf(BUMP)).toBeLessThan(body.indexOf('setOrderEntryType(newType)'));
  });

  test('VD-8 Option C: Merge/Shift/Payment entry flags reset inside the same guard', () => {
    const guarded = sliceBetween(body, /if \(orderEntryType !== null\) \{/, /\n    \}/);
    FLAG_RESETS.forEach((call) => expect(guarded).toContain(call));
  });

  test('exactly one bump and a // BUG-452 marker (R18)', () => {
    expect(body.split(BUMP).length - 1).toBe(1);
    expect(body).toMatch(/\/\/ BUG-452/);
  });
});

describe('BUG-452 wiring — OrderEntry keyed by orderEntryResetNonce', () => {
  test('<OrderEntry key={orderEntryResetNonce} …> is still the remount mechanism (CR-008 #4 / PROD-004 unchanged)', () => {
    expect(dashboardSrc).toMatch(/<OrderEntry\s+key=\{orderEntryResetNonce\}/);
    expect(dashboardSrc).toContain('const [orderEntryResetNonce, setOrderEntryResetNonce] = useState(0);');
  });

  test('handleCollectBillStayOnOrder (PROD-004) untouched — still clears cartKey and re-enters walkIn', () => {
    const body = sliceBetween(dashboardSrc, /const handleCollectBillStayOnOrder = \(\) => \{/, /\n  \};/);
    expect(body).toContain("setCartsByTable(prev => ({ ...prev, [cartKey]: [] }))");
    expect(body).toContain("setOrderEntryType('walkIn')");
  });
});

describe('BUG-452 D-3 — OrderEntry.jsx BUG-334 branch annotated REVERSED (VD-12)', () => {
  const branch = sliceBetween(orderEntrySrc, /\} else if \(oldKey !== null\) \{/, /\n    \} else \{/);

  test('BUG-334 branch kept as a no-op guard with the REVERSED comment', () => {
    expect(branch).toMatch(/BUG-334 carry-forward REVERSED by BUG-452/);
    expect(branch).toMatch(/key = orderEntryResetNonce/);
    expect(branch).not.toMatch(/setCartItems\(/);
  });

  test('only the reversed comment references BUG-334 in OrderEntry.jsx', () => {
    const hits = orderEntrySrc.match(/BUG-334/g) || [];
    expect(hits.length).toBe(1);
  });
});
