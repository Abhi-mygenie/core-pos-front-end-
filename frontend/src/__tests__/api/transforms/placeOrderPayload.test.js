// CR-POS2-003 (May-2026) — placeOrder + placeOrderWithPayment payload tests
// for the new `printer_agent` additive field.
//
// Validates: V-1..V-5 in the implementation plan §7.2.

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
  status: 'placed',
  placed: false,
  ...overrides,
});

const PRINTER_AGENTS = [
  { station: 'KDS', printer_agent_id: '1', printer_type: 'EPSON_KDS', printer_ip: '1.1.1.1', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'BAR', printer_agent_id: '2', printer_type: 'EPSON_BAR', printer_ip: '1.1.1.2', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'BILL', printer_agent_id: '3', printer_type: 'EPSON_BILL', printer_ip: '1.1.1.3', printer_paper_roll: '58', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
  { station: 'PASTRY', printer_agent_id: '4', printer_type: 'EPSON_PASTRY', printer_ip: '1.1.1.4', printer_paper_roll: '80', vendor_id: null, product_id: null, wifi_printer_ip: null, printer_name: null },
];

describe('CR-POS2-003 | toAPI.placeOrder — printer_agent injection', () => {
  test('print_kot:"No" → printer_agent: [] (OQ-PA-13)', () => {
    const cart = [buildItem({ station: 'KDS' })];
    const payload = toAPI.placeOrder({ tableId: 1 }, cart, {}, 'dineIn', {
      restaurantId: 99, printAllKOT: false, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.print_kot).toBe('No');
    expect(payload.printer_agent).toEqual([]);
  });

  test('print_kot:"Yes" + matching cart stations → KDS+BAR agents (BILL excluded)', () => {
    const cart = [buildItem({ station: 'KDS' }), buildItem({ id: 2, station: 'BAR' })];
    const payload = toAPI.placeOrder({ tableId: 1 }, cart, {}, 'dineIn', {
      restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.print_kot).toBe('Yes');
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS', 'BAR']);
    // BILL must never appear on place-order printer_agent (R-OWNER-8).
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Dynamic non-canonical label (PASTRY) routes correctly (BE-PA8 / §7.3)', () => {
    const cart = [buildItem({ station: 'PASTRY' })];
    const payload = toAPI.placeOrder({ tableId: 1 }, cart, {}, 'dineIn', {
      restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['PASTRY']);
  });

  test('No printerAgents configured → printer_agent: [] (OQ-PA-9)', () => {
    const cart = [buildItem({ station: 'KDS' })];
    const payload = toAPI.placeOrder({ tableId: 1 }, cart, {}, 'dineIn', {
      restaurantId: 99, printAllKOT: true, printerAgents: [],
    });
    expect(payload.printer_agent).toEqual([]);
  });

  test('Cart station with no agent match silently ignored (OQ-PA-14)', () => {
    const cart = [buildItem({ station: 'KDS' }), buildItem({ id: 2, station: 'NONEXISTENT' })];
    const payload = toAPI.placeOrder({ tableId: 1 }, cart, {}, 'dineIn', {
      restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS,
    });
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Pre-existing payload fields preserved (no payload contract drift)', () => {
    const cart = [buildItem({ station: 'KDS' })];
    const payload = toAPI.placeOrder({ tableId: 5 }, cart, { name: 'X', phone: '1' }, 'dineIn', {
      restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS,
    });
    // Spot-check the load-bearing keys to detect accidental drift.
    expect(payload.user_id).toBeDefined();
    expect(payload.restaurant_id).toBe(99);
    expect(payload.table_id).toBe('5');
    expect(payload.cart).toBeDefined();
    expect(payload.payment_status).toBe('unpaid');
    expect(payload.payment_type).toBe('postpaid');
    expect(payload.delivery_address).toBeDefined();
  });
});

describe('CR-POS2-003 | toAPI.placeOrderWithPayment — printer_agent injection', () => {
  test('Prepaid + print_kot:"Yes" → KOT agents only', () => {
    const cart = [buildItem({ station: 'BAR' })];
    const payload = toAPI.placeOrderWithPayment(
      { tableId: 1 }, cart, {}, 'dineIn', { method: 'cash', tip: 0 },
      { restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS }
    );
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['BAR']);
  });

  test('Prepaid + print_kot:"No" → printer_agent: []', () => {
    const cart = [buildItem({ station: 'KDS' })];
    const payload = toAPI.placeOrderWithPayment(
      { tableId: 1 }, cart, {}, 'dineIn', { method: 'cash', tip: 0 },
      { restaurantId: 99, printAllKOT: false, printerAgents: PRINTER_AGENTS }
    );
    expect(payload.printer_agent).toEqual([]);
  });

  test('BILL excluded even when present in printerAgents', () => {
    const cart = [buildItem({ station: 'KDS' }), buildItem({ id: 2, station: 'PASTRY' })];
    const payload = toAPI.placeOrderWithPayment(
      { tableId: 1 }, cart, {}, 'dineIn', { method: 'cash', tip: 0 },
      { restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS }
    );
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS', 'PASTRY']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Pre-existing prepaid payload fields preserved', () => {
    const cart = [buildItem({ station: 'KDS' })];
    const payload = toAPI.placeOrderWithPayment(
      { tableId: 1 }, cart, {}, 'dineIn', { method: 'cash', tip: 5 },
      { restaurantId: 99, printAllKOT: true, printerAgents: PRINTER_AGENTS }
    );
    expect(payload.payment_status).toBe('paid');
    expect(payload.payment_type).toBe('prepaid');
    expect(payload.partial_payments).toBeDefined();
    expect(payload.cart).toBeDefined();
    expect(payload.delivery_address).toBeDefined();
  });
});
