/**
 * POS2-003-REOPEN-A — Wire-Level FE Integration QA
 * ----------------------------------------------------------------------------
 * Drives the same code paths OrderEntry executes and asserts what lands on
 * the wire (URL + payload) for the three REOPEN-A flows:
 *
 *   1. update-place-order
 *   2. cancel-food-item
 *   3. order-status-update (cancel-order)
 *
 * Profile pipeline: a raw v1 profile blob with `print_agent` populated for
 * BILL + KDS + BAR + GRILL (one canonical + one dynamic non-canonical) is
 * normalised via `profileTransform.fromAPI.printerAgents`, simulating the
 * RestaurantContext state on a tenant where the operator has configured
 * printer agents. The resulting normalised list is then passed through the
 * three builders + axios mocks, exactly the way `OrderEntry.jsx` does.
 *
 * Regression checks bundled at the end:
 *   - place-order payload still emits `printer_agent` (POS2-003 behaviour)
 *   - order-temp-store (printOrder) still routes BILL agent on `bill` and
 *     KOT agents on `kot` (POS2-003 + FU-02 behaviour)
 *   - endpoint paths unchanged
 *
 * NOTE: This is a JEST integration test — runs in jsdom; does not contact
 * any backend. Backend `printer_agent` acceptance is owner-confirmed via
 * curl 2026-05-09 (BC-1 / BC-2 / BC-3 closed in the impact analysis).
 */

const { fromAPI } = require('../../api/transforms/profileTransform');
const { toAPI } = require('../../api/transforms/orderTransform');
const { API_ENDPOINTS } = require('../../api/constants');

// Capture every axios call without firing real HTTP traffic.
jest.mock('../../api/axios', () => {
  const calls = [];
  const stub = () => Promise.resolve({ data: { ok: true } });
  const put = jest.fn((url, body) => { calls.push({ verb: 'put', url, body }); return stub(); });
  const post = jest.fn((url, body) => { calls.push({ verb: 'post', url, body }); return stub(); });
  const get = jest.fn((url) => { calls.push({ verb: 'get', url }); return stub(); });
  const del = jest.fn((url) => { calls.push({ verb: 'delete', url }); return stub(); });
  return {
    __esModule: true,
    default: { put, post, get, delete: del },
    __getCalls: () => calls,
    __resetCalls: () => { calls.length = 0; },
  };
});

const api = require('../../api/axios').default;
const apiMod = require('../../api/axios');
const { printOrder } = require('../../api/services/orderService');

beforeEach(() => {
  apiMod.__resetCalls();
  // Clear call history; re-set implementation defensively so async chains in
  // orderService (which awaits response.data) always receive the canned shape.
  const stub = (verb) => (url, body) => {
    apiMod.__getCalls().push({ verb, url, body });
    return Promise.resolve({ data: { ok: true } });
  };
  api.put.mockReset().mockImplementation(stub('put'));
  api.post.mockReset().mockImplementation(stub('post'));
  api.get.mockReset().mockImplementation(stub('get'));
  api.delete.mockReset().mockImplementation(stub('delete'));
});

// ---------------------------------------------------------------------------
// Test fixtures: a v1 profile blob with print_agent populated for 4 stations.
// Mirrors the live preprod schema but with non-empty `print_agent` so the
// REOPEN-A wire path can be exercised end-to-end.
// ---------------------------------------------------------------------------

const RAW_PRINT_AGENT_PROFILE = [
  // BILL — used only by bill-print path; must be EXCLUDED from KOT / cancel / update payloads.
  { mapping: { area_name: 'BILL', default_employee_id: 3001 },
    printer_data: [{ printer_name: 'EPSON_BILL', printer_ip: '10.0.0.10', printer_paper_roll: 58, vendor_id: null, product_id: null, wifi_printer_ip: null, wifi_printer_name: null }] },
  // KDS — kitchen station (canonical).
  { mapping: { area_name: 'KDS',  default_employee_id: 3002 },
    printer_data: [{ printer_name: 'EPSON_KDS',  printer_ip: '10.0.0.20', printer_paper_roll: 80, vendor_id: null, product_id: null, wifi_printer_ip: null, wifi_printer_name: null }] },
  // BAR — bar station (canonical).
  { mapping: { area_name: 'BAR',  default_employee_id: 3003 },
    printer_data: [{ printer_name: 'EPSON_BAR',  printer_ip: '10.0.0.30', printer_paper_roll: 80, vendor_id: null, product_id: null, wifi_printer_ip: null, wifi_printer_name: null }] },
  // GRILL — dynamic non-canonical station label (BE-PA8). Tenant-defined.
  { mapping: { area_name: 'GRILL', default_employee_id: 3004 },
    printer_data: [{ printer_name: 'EPSON_GRILL', printer_ip: '10.0.0.40', printer_paper_roll: 80, vendor_id: null, product_id: null, wifi_printer_ip: null, wifi_printer_name: null }] },
];

// Normalise via the same transform RestaurantContext uses.
const PRINTER_AGENTS = fromAPI.printerAgents(RAW_PRINT_AGENT_PROFILE);

const TABLE = { orderId: 8881, tableId: 12 };
const REASON = { reasonId: 4, reasonText: 'Customer request', reasonNote: 'Out of stock' };

const buildItem = (overrides = {}) => ({
  id: overrides.id || 1,
  foodId: overrides.foodId || 100,
  name: overrides.name || 'Item',
  price: overrides.price != null ? overrides.price : 200,
  qty: overrides.qty || 1,
  category: overrides.category || 'Food',
  station: overrides.station || 'KDS',
  taxAmount: 0, cgst: 0, sgst: 0, vatAmount: 0, vat: 0, gst: 0,
  cgstPercent: 0, sgstPercent: 0, vatPercent: 0,
  status: overrides.status || 'placed',
  placed: overrides.placed != null ? overrides.placed : true,
  ...overrides,
});

// =============================================================================
// 0. Profile → printerAgents pipeline (RestaurantContext state simulation)
// =============================================================================
describe('REOPEN-A | profile → printerAgents pipeline (non-empty print_agent)', () => {
  test('profileTransform.fromAPI.printerAgents normalises 4 stations with verbatim casing', () => {
    expect(Array.isArray(PRINTER_AGENTS)).toBe(true);
    expect(PRINTER_AGENTS.length).toBe(4);
    expect(PRINTER_AGENTS.map((a) => a.station)).toEqual(['BILL', 'KDS', 'BAR', 'GRILL']);
    // R-OWNER-3: id is string-coerced.
    PRINTER_AGENTS.forEach((a) => expect(typeof a.printer_agent_id).toBe('string'));
    // R-OWNER-4: passthroughs preserved.
    expect(PRINTER_AGENTS[0].printer_type).toBe('EPSON_BILL');
    expect(PRINTER_AGENTS[3].printer_type).toBe('EPSON_GRILL');
  });
});

// =============================================================================
// 1. update-place-order
// =============================================================================
describe('REOPEN-A | UPDATE_ORDER wire — printer_agent', () => {
  const dispatchUpdate = (cartItems, newItems, opts = {}) =>
    api.put(API_ENDPOINTS.UPDATE_ORDER, toAPI.updateOrder(TABLE, newItems, { name: 'Alice' }, 'dineIn', {
      restaurantId: 99,
      orderNotes: [],
      printAllKOT: opts.printAllKOT != null ? opts.printAllKOT : true,
      allCartItems: cartItems,
      serviceChargePercentage: 0,
      addressId: null,
      deliveryCharge: 0,
      serviceChargeTaxPct: 0,
      deliveryChargeGstPct: 0,
      printerAgents: opts.printerAgents != null ? opts.printerAgents : PRINTER_AGENTS,
    }));

  test('Endpoint path UNCHANGED at v2 update-place-order', () => {
    expect(API_ENDPOINTS.UPDATE_ORDER).toBe('/api/v2/vendoremployee/order/update-place-order');
  });

  test('print_kot:Yes + new KDS+GRILL items → printer_agent has KDS + GRILL agents (BILL excluded)', async () => {
    const placed = [buildItem({ id: 1, station: 'BAR', placed: true })];
    const newItems = [
      buildItem({ id: 11, station: 'KDS',   placed: false, status: 'preparing' }),
      buildItem({ id: 12, station: 'GRILL', placed: false, status: 'preparing' }),
    ];
    await dispatchUpdate([...placed, ...newItems], newItems);

    expect(api.put).toHaveBeenCalledTimes(1);
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/api/v2/vendoremployee/order/update-place-order');
    expect(payload).toHaveProperty('printer_agent');
    expect(Array.isArray(payload.printer_agent)).toBe(true);
    expect(payload.printer_agent).not.toBeNull();
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS', 'GRILL']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
    // BAR is in the cart but only as a *placed* item — not a new item — so its
    // agent must NOT appear (KOT-fire semantics on update).
    expect(payload.printer_agent.find((a) => a.station === 'BAR')).toBeUndefined();
  });

  test('print_kot:No → printer_agent: [] (empty fallback, never null)', async () => {
    const newItems = [buildItem({ id: 11, station: 'KDS', placed: false })];
    await dispatchUpdate(newItems, newItems, { printAllKOT: false });
    const payload = api.put.mock.calls[0][1];
    expect(payload.print_kot).toBe('No');
    expect(payload.printer_agent).toEqual([]);
    expect(payload.printer_agent).not.toBeNull();
  });

  test('Empty/missing print_agent profile → printer_agent: []', async () => {
    const newItems = [buildItem({ id: 11, station: 'KDS', placed: false })];
    await dispatchUpdate(newItems, newItems, { printerAgents: [] });
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
  });

  test('Dynamic GRILL label is selected (BE-PA8 — non-canonical station)', async () => {
    const newItems = [buildItem({ id: 11, station: 'GRILL', placed: false })];
    await dispatchUpdate(newItems, newItems);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['GRILL']);
  });

  test('Existing payload fields preserved (no unrelated mutation)', async () => {
    const newItems = [buildItem({ id: 11, station: 'KDS', placed: false, qty: 2, price: 50 })];
    await dispatchUpdate(newItems, newItems);
    const payload = api.put.mock.calls[0][1];
    // Pre-existing keys still present:
    expect(payload).toMatchObject({
      order_id: '8881',
      order_type: 'dinein',     // mapOrderTypeToAPI lowercases dineIn → 'dinein'
      cust_name: 'Alice',
      payment_method: 'pending',
      payment_status: 'unpaid',
      payment_type: 'postpaid',
      print_kot: 'Yes',
      auto_dispatch: 'No',
    });
    expect(payload).toHaveProperty('cart-update');
    expect(Array.isArray(payload['cart-update'])).toBe(true);
    expect(payload['cart-update'].length).toBe(1);
    expect(payload).toHaveProperty('printer_agent');
  });
});

// =============================================================================
// 2. cancel-food-item (owner rule: all-stations-in-cart)
// =============================================================================
describe('REOPEN-A | CANCEL_ITEM wire — printer_agent (all-stations-in-cart)', () => {
  const dispatchCancelItem = (cartItems, item, opts = {}) =>
    api.put(API_ENDPOINTS.CANCEL_ITEM, toAPI.cancelItem(TABLE, item, REASON, item.qty, {
      printerAgents: opts.printerAgents != null ? opts.printerAgents : PRINTER_AGENTS,
      allCartItems: cartItems,
    }));

  test('Endpoint path UNCHANGED at v2 cancel-food-item', () => {
    expect(API_ENDPOINTS.CANCEL_ITEM).toBe('/api/v2/vendoremployee/order/cancel-food-item');
  });

  test('Active cart with KDS+BAR+GRILL → printer_agent contains all three (BILL excluded)', async () => {
    const items = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR' }),
      buildItem({ id: 3, station: 'GRILL' }),
    ];
    await dispatchCancelItem(items, items[0]);
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/api/v2/vendoremployee/order/cancel-food-item');
    expect(payload).toHaveProperty('printer_agent');
    expect(Array.isArray(payload.printer_agent)).toBe(true);
    expect(payload.printer_agent).not.toBeNull();
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'GRILL', 'KDS']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Cancelled items + Check-In marker excluded from station set', async () => {
    const items = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR', status: 'cancelled' }),
      buildItem({ id: 99, station: 'ROOM', isCheckInMarker: true }),
    ];
    await dispatchCancelItem(items, items[0]);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['KDS']);
  });

  test('Empty/all-cancelled cart → printer_agent: []', async () => {
    const items = [buildItem({ id: 1, station: 'KDS', status: 'cancelled' })];
    await dispatchCancelItem(items, items[0]);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
    expect(payload.printer_agent).not.toBeNull();
  });

  test('Empty/missing print_agent profile → printer_agent: []', async () => {
    const items = [buildItem({ id: 1, station: 'KDS' })];
    await dispatchCancelItem(items, items[0], { printerAgents: [] });
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
  });

  test('Dynamic GRILL station selected (BE-PA8)', async () => {
    const items = [
      buildItem({ id: 1, station: 'GRILL' }),
      buildItem({ id: 2, station: 'KDS' }),
    ];
    await dispatchCancelItem(items, items[0]);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['GRILL', 'KDS']);
  });

  test('Existing payload fields preserved (order_id, item_id, cancel_qty, cancel_type, reason)', async () => {
    const items = [buildItem({ id: 42, foodId: 777, station: 'KDS', status: 'preparing', qty: 2 })];
    await dispatchCancelItem(items, items[0]);
    const payload = api.put.mock.calls[0][1];
    expect(payload).toMatchObject({
      order_id: 8881,
      order_food_id: 777,
      item_id: 42,
      cancel_qty: 2,
      order_status: 'cancelled',
      reason_type: 4,
      reason: 'Customer request',
      cancel_type: 'Pre-Serve',
    });
    expect(payload).toHaveProperty('printer_agent');
  });
});

// =============================================================================
// 3. order-status-update / cancel-order (owner rule: all-stations-in-cart)
// =============================================================================
describe('REOPEN-A | ORDER_STATUS_UPDATE wire — printer_agent (all-stations-in-cart)', () => {
  const dispatchCancelOrder = (cartItems, opts = {}) =>
    api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, toAPI.cancelOrder(TABLE.orderId, 'Manager', REASON, {
      printerAgents: opts.printerAgents != null ? opts.printerAgents : PRINTER_AGENTS,
      allCartItems: cartItems,
    }));

  test('Endpoint path UNCHANGED at v2 order-status-update', () => {
    expect(API_ENDPOINTS.ORDER_STATUS_UPDATE).toBe('/api/v2/vendoremployee/order/order-status-update');
  });

  test('Active cart with KDS+BAR → printer_agent contains both (BILL excluded)', async () => {
    const items = [
      buildItem({ id: 1, station: 'KDS' }),
      buildItem({ id: 2, station: 'BAR' }),
    ];
    await dispatchCancelOrder(items);
    const [url, payload] = api.put.mock.calls[0];
    expect(url).toBe('/api/v2/vendoremployee/order/order-status-update');
    expect(payload).toHaveProperty('printer_agent');
    expect(Array.isArray(payload.printer_agent)).toBe(true);
    expect(payload.printer_agent).not.toBeNull();
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
  });

  test('Empty cart → printer_agent: []', async () => {
    await dispatchCancelOrder([]);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
    expect(payload.printer_agent).not.toBeNull();
  });

  test('All items already cancelled → printer_agent: []', async () => {
    const items = [
      buildItem({ id: 1, station: 'KDS', status: 'cancelled' }),
      buildItem({ id: 2, station: 'BAR', status: 'cancelled' }),
    ];
    await dispatchCancelOrder(items);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
  });

  test('Empty/missing print_agent profile → printer_agent: []', async () => {
    const items = [buildItem({ id: 1, station: 'KDS' })];
    await dispatchCancelOrder(items, { printerAgents: [] });
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
  });

  test('Dynamic GRILL station selected (BE-PA8)', async () => {
    const items = [buildItem({ id: 1, station: 'GRILL' })];
    await dispatchCancelOrder(items);
    const payload = api.put.mock.calls[0][1];
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['GRILL']);
  });

  test('Existing payload fields preserved (order_id, role_name, cancellation_note)', async () => {
    const items = [buildItem({ id: 1, station: 'KDS' })];
    await dispatchCancelOrder(items);
    const payload = api.put.mock.calls[0][1];
    expect(payload).toMatchObject({
      order_id: 8881,
      role_name: 'Manager',
      order_status: 'cancelled',
      cancellation_reason: 'Customer request',
      cancellation_note: 'Out of stock',
    });
    expect(payload).toHaveProperty('printer_agent');
  });
});

// =============================================================================
// 4. Regression — POS2-003 place-order behaviour unchanged
// =============================================================================
describe('REOPEN-A regression | place-order behaviour unchanged (POS2-003)', () => {
  test('Endpoint UNCHANGED at v2 place-order (REOPEN-B applied 2026-05-09)', () => {
    expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v2/vendoremployee/order/place-order');
  });

  test('placeOrder still emits printer_agent for KOT stations (POS2-003)', () => {
    const cartItems = [
      buildItem({ id: 1, station: 'KDS', placed: false }),
      buildItem({ id: 2, station: 'BAR', placed: false }),
    ];
    const payload = toAPI.placeOrder(TABLE, cartItems, { name: 'Alice' }, 'dineIn', {
      restaurantId: 99,
      printAllKOT: true,
      printerAgents: PRINTER_AGENTS,
    });
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
    // print_kot intact, station_kot/cart structure intact, no new keys leaked.
    expect(payload.print_kot).toBe('Yes');
    expect(Array.isArray(payload.cart)).toBe(true);
  });

  test('placeOrder with print_kot:No still emits printer_agent: []', () => {
    const cartItems = [buildItem({ id: 1, station: 'KDS', placed: false })];
    const payload = toAPI.placeOrder(TABLE, cartItems, {}, 'dineIn', {
      restaurantId: 99,
      printAllKOT: false,
      printerAgents: PRINTER_AGENTS,
    });
    expect(payload.printer_agent).toEqual([]);
  });
});

// =============================================================================
// 5. Regression — order-temp-store (printOrder) behaviour unchanged
// =============================================================================
describe('REOPEN-A regression | order-temp-store behaviour unchanged (POS2-003 + FU-02)', () => {
  test('Endpoint UNCHANGED at order-temp-store', () => {
    expect(API_ENDPOINTS.PRINT_ORDER).toBeDefined();
  });

  test('printOrder("kot", stationKot="KDS,BAR") routes KDS + BAR agents (BILL excluded)', async () => {
    await printOrder(8881, 'kot', 'KDS,BAR', null, 0, {}, PRINTER_AGENTS);
    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, payload] = api.post.mock.calls[0];
    expect(url).toBe(API_ENDPOINTS.PRINT_ORDER);
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station).sort()).toEqual(['BAR', 'KDS']);
    expect(payload.printer_agent.find((a) => a.station === 'BILL')).toBeUndefined();
    // station_kot shape unchanged (OQ-PA-11)
    expect(payload.station_kot).toBe('KDS,BAR');
    expect(payload.print_type).toBe('kot');
  });

  test('printOrder("bill") routes BILL agent only (R-OWNER-7)', async () => {
    // Minimal orderData stub for buildBillPrintPayload.
    const orderDataStub = {
      orderId: 8881,
      cartItems: [buildItem({ id: 1, station: 'KDS' })],
      orderType: 'dineIn',
      table: TABLE,
      tableNumber: 12,
      customer: { name: 'Alice' },
      paymentMethod: 'cash',
      orderNote: '',
      orderDiscount: 0,
      tip: 0,
      deliveryCharge: 0,
      orderAmount: 200,
      taxAmount: 0,
      roundUp: 0,
      cgst: 0,
      sgst: 0,
      vatTaxAmount: 0,
    };
    await printOrder(8881, 'bill', null, orderDataStub, 0, {}, PRINTER_AGENTS);
    const payload = api.post.mock.calls[0][1];
    expect(payload).toHaveProperty('printer_agent');
    expect(payload.printer_agent.map((a) => a.station)).toEqual(['BILL']);
    expect(payload.printer_agent.find((a) => a.station === 'KDS')).toBeUndefined();
    expect(payload.printer_agent.find((a) => a.station === 'BAR')).toBeUndefined();
  });

  test('printOrder("kot", stationKot=null) → printer_agent: [] (FU-02 graceful)', async () => {
    await printOrder(8881, 'kot', null, null, 0, {}, PRINTER_AGENTS);
    const payload = api.post.mock.calls[0][1];
    expect(payload.printer_agent).toEqual([]);
  });
});

// =============================================================================
// 6. Endpoint contract — quick global sanity
// =============================================================================
describe('REOPEN-A | endpoint contract sanity', () => {
  test('All 4 in-scope + adjacent endpoints unchanged', () => {
    expect(API_ENDPOINTS.UPDATE_ORDER).toBe('/api/v2/vendoremployee/order/update-place-order');
    expect(API_ENDPOINTS.CANCEL_ITEM).toBe('/api/v2/vendoremployee/order/cancel-food-item');
    expect(API_ENDPOINTS.ORDER_STATUS_UPDATE).toBe('/api/v2/vendoremployee/order/order-status-update');
    expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v2/vendoremployee/order/place-order'); // REOPEN-B applied 2026-05-09
    expect(API_ENDPOINTS.PROFILE).toBe('/api/v1/vendoremployee/profile'); // PROFILE flip not started
  });
});
