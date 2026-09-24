// CR-POS2-003-REOPEN-A (May-2026) — printer_agent additive field on
// updateOrder, cancelItem, and cancelOrder builders.
//
// Mirrors placeOrderPayload.test.js style. Validates:
//   - printer_agent key is always present on each builder's payload (never null).
//   - BILL agent is excluded from KOT-style update/cancel payloads (R-OWNER-7/8).
//   - Update-order: station set derived from NEW items only; print_kot:'No' → [].
//   - Cancel-item / Cancel-order: owner-selected rule = ALL stations in active cart.
//   - Empty cart / everything cancelled → []. No matching agents → [].
//   - Dynamic non-canonical station labels (PASTRY) route correctly (BE-PA8).
//   - Existing payload fields are preserved (no unrelated mutations).

const { toAPI } = require('../../../api/transforms/orderTransform');

const buildItem = (overrides = {}) => ({
  id: overrides.id || 1,
  foodId: overrides.foodId || 100,
  name: overrides.name || 'Item',
  price: overrides.price || 100,
  qty: overrides.qty || 1,
  category: overrides.category || 'Food',
  station: overrides.station || 'KDS',
  taxAmount: 0,
  cgst: 0,
  sgst: 0,
  vatAmount: 0,
  vat: 0,
  gst: 0,
  cgstPercent: 0,
  sgstPercent: 0,
  vatPercent: 0,
  status: overrides.status || 'placed',
  placed: overrides.placed != null ? overrides.placed : true,
  ...overrides,
});

const PRINTER_AGENTS = [
  { station: 'KDS',    printer_agent_id: '1', printer_type: 'EPSON_KDS',    printer_ip: '1.1.1.1', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'BAR',    printer_agent_id: '2', printer_type: 'EPSON_BAR',    printer_ip: '1.1.1.2', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'BILL',   printer_agent_id: '3', printer_type: 'EPSON_BILL',   printer_ip: '1.1.1.3', printer_paper_roll: '58', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'PASTRY', printer_agent_id: '4', printer_type: 'EPSON_PASTRY', printer_ip: '1.1.1.4', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
];

const TABLE = { orderId: 555, tableId: 1 };
const REASON = { reasonId: 7, reasonText: 'Customer changed mind', reasonNote: 'note' };

// =============================================================================
// updateOrder
// =============================================================================
describe('CR-POS2-003-REOPEN-A | toAPI.updateOrder — printer_agent injection', () => {
  test('print_kot:"Yes" + new KDS+BAR items → KDS+BAR agents (BILL excluded)', () => {
    const newItems = [
      buildItem({ id: 10, station: 'KDS',  placed: false, status: 'preparing' }),
      buildItem({ id: 11, station: 'BAR',  placed: false, status: 'preparing' }),
    ];
    const allCart = [...newItems, buildItem({ id: 1, station: 'PASTRY', placed: true })];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: true, allCartItems: allCart, printerAgents: PRINTER_AGENTS,
    });
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('print_kot:"No" → printer_agent: []', () => {
    const newItems = [buildItem({ id: 10, station: 'KDS', placed: false })];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: false, allCartItems: newItems, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.print_kot).toBe('No');
    expect(payload.printer_agent).toEqual([]);
  });

  test('No printerAgents configured → printer_agent: []', () => {
    const newItems = [buildItem({ id: 10, station: 'KDS', placed: false })];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: true, allCartItems: newItems, printerAgents: [],
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('Station set derives from NEW items only (placed items in cart ignored for selection)', () => {
    const newItems = [buildItem({ id: 10, station: 'KDS', placed: false })];
    const allCart = [
      ...newItems,
      buildItem({ id: 1, station: 'BAR', placed: true }),     // already placed → not in selection
      buildItem({ id: 2, station: 'PASTRY', placed: true }),  // already placed → not in selection
    ];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: true, allCartItems: allCart, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Dynamic non-canonical label PASTRY routes correctly (BE-PA8)', () => {
    const newItems = [buildItem({ id: 10, station: 'PASTRY', placed: false })];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: true, allCartItems: newItems, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['PASTRY']);
  });

  test('Case-insensitive station match (kds vs KDS)', () => {
    const newItems = [buildItem({ id: 10, station: 'kds', placed: false })];
    const payload = toAPI.updateOrder(TABLE, newItems, {}, 'dineIn', {
      printAllKOT: true, allCartItems: newItems, printerAgents: PRINTER_AGENTS,
    });
    // Selector preserves backend casing (R-OWNER-1) — match still lands on KDS entry.
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Existing payload fields preserved (cart-update, totals, address_id, delivery_charge)', () => {
    const newItems = [buildItem({ id: 10, station: 'KDS', placed: false, qty: 2, price: 50 })];
    const payload = toAPI.updateOrder(TABLE, newItems, { name: 'Bob' }, 'delivery', {
      printAllKOT: true, allCartItems: newItems, printerAgents: PRINTER_AGENTS,
      addressId: 999, deliveryCharge: 30,
    });
    expect(payload).toHaveProperty('order_id', '555');
    expect(payload).toHaveProperty('cart-update');
    expect(Array.isArray(payload['cart-update'])).toBe(true);
    expect(payload['cart-update'].length).toBe(1);
    expect(payload).toHaveProperty('cust_name', 'Bob');
    expect(payload).toHaveProperty('payment_status', 'unpaid');
    expect(payload).toHaveProperty('payment_type', 'postpaid');
    expect(payload).toHaveProperty('address_id', 999);
    expect(payload).toHaveProperty('delivery_charge', 30);
    expect(payload).toHaveProperty('printer_agent');
  });
});

// =============================================================================
// cancelItem (owner rule: all-stations-in-cart)
// =============================================================================
describe('CR-POS2-003-REOPEN-A | toAPI.cancelItem — printer_agent injection (all-stations-in-cart)', () => {
  test('Sends agents for ALL distinct stations in active cart (BILL excluded)', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR' }),
      buildItem({ id: 3, station: 'PASTRY' }),
    ];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS', 'PASTRY']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Even when cancelling a single KDS item, agents still include all cart stations', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR' }),
    ];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS']);
  });

  test('Cancelled items in cart are excluded from station set', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR', status: 'cancelled' }),
    ];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Check-In marker excluded from station set', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 99, station: 'ROOM', isCheckInMarker: true }),
    ];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Empty cart / everything cancelled → printer_agent: []', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS', status: 'cancelled' }),
    ];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('No printerAgents configured → printer_agent: []', () => {
    const cartItems = [buildItem({ id: 1, station: 'KDS' })];
    const payload = toAPI.cancelItem(TABLE, cartItems[0], REASON, 1, {
      printerAgents: [], allCartItems: cartItems,
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('Missing options object → still emits printer_agent: [] (never null)', () => {
    const item = buildItem({ id: 1, station: 'KDS' });
    const payload = toAPI.cancelItem(TABLE, item, REASON, 1);
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent).toEqual([]);
  });

  test('Existing payload fields preserved (order_id, item_id, cancel_qty, cancel_type, reason)', () => {
    const item = buildItem({ id: 42, foodId: 777, station: 'KDS', status: 'preparing' });
    const payload = toAPI.cancelItem(TABLE, item, REASON, 2, {
      printerAgents: PRINTER_AGENTS, allCartItems: [item],
    });
    expect(payload).toMatchObject({
      order_id: 555,
      order_food_id: 777,
      item_id: 42,
      cancel_qty: 2,
      order_status: 'cancelled',
      reason_type: 7,
      reason: 'Customer changed mind',
      cancel_type: 'Pre-Serve',
    });
    expect(payload).toHaveProperty('printer_agent');
  });

  test('Post-Serve cancel_type still emits printer_agent (no conditional gating)', () => {
    const item = buildItem({ id: 42, station: 'KDS', status: 'served' });
    const payload = toAPI.cancelItem(TABLE, item, REASON, 1, {
      printerAgents: PRINTER_AGENTS, allCartItems: [item],
    });
    expect(payload.cancel_type).toBe('Post-Serve');
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });
});

// =============================================================================
// cancelOrder (owner rule: all-stations-in-cart)
// =============================================================================
describe('CR-POS2-003-REOPEN-A | toAPI.cancelOrder — printer_agent injection (all-stations-in-cart)', () => {
  test('Sends agents for ALL distinct stations in active cart (BILL excluded)', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR' }),
    ];
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Empty cart → printer_agent: []', () => {
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: PRINTER_AGENTS, allCartItems: [],
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('All items cancelled → printer_agent: []', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS', status: 'cancelled' }),
      buildItem({ id: 2, station: 'BAR', status: 'cancelled' }),
    ];
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('No printerAgents configured → printer_agent: []', () => {
    const cartItems = [buildItem({ id: 1, station: 'KDS' })];
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: [], allCartItems: cartItems,
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('Missing options object → still emits printer_agent: [] (never null)', () => {
    const payload = toAPI.cancelOrder(555, 'Manager', REASON);
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent).toEqual([]);
  });

  test('Existing payload fields preserved (order_id, role_name, cancellation_note)', () => {
    const cartItems = [buildItem({ id: 1, station: 'KDS' })];
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload).toMatchObject({
      order_id: 555,
      role_name: 'Manager',
      order_status: 'cancelled',
      cancellation_reason: 'Customer changed mind',
      cancellation_note: 'note',
    });
    expect(payload).toHaveProperty('printer_agent');
  });

  test('Dynamic station label (PASTRY) routes correctly (BE-PA8)', () => {
    const cartItems = [buildItem({ id: 1, station: 'PASTRY' })];
    const payload = toAPI.cancelOrder(555, 'Manager', REASON, {
      printerAgents: PRINTER_AGENTS, allCartItems: cartItems,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['PASTRY']);
  });
});
