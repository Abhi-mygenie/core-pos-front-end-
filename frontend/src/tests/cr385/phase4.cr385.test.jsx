// CR-385 M6 — Phase 4 unit tests: Bill / Checkout (Layout B). CollectPaymentPanel is stubbed (its own suites cover it; zero edits there, R15).
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import api from '@/api/axios';
import folioRaw from '../../__fixtures__/cr385/folio_room_upgrade.json';
import alreadyPaid from '../../__fixtures__/cr385/bill_payment_already_paid.json';
import lr from '../../__fixtures__/cr385/local_reservations_view_all.json';
import { fromAPI as orderFromAPI, toAPI as orderToAPI } from '@/api/transforms/orderTransform';
import { fromReservation, bucketDeparture } from '@/api/transforms/frontDeskTransform';
import { getFolio, payBill, roomInfoFromCharge, splitUpgradeLine, buildBookingBody } from '@/api/services/frontDeskService';
import FolioCheckoutPanel, { billCustomer, tabPrefilled } from '@/components/pms/frontdesk/FolioCheckoutPanel';
import DeparturesPanel, { stayActions } from '@/components/pms/frontdesk/DeparturesPanel';
import InHousePanel from '@/components/pms/frontdesk/InHousePanel';
import RoomDetail from '@/components/pms/frontdesk/RoomDetail';

jest.mock('@/api/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/api/services/pmsService', () => ({ getInHouseGuests: jest.fn(), getGuestFolio: jest.fn(), getRatesData: jest.fn(), cancelReservation: jest.fn(), markNoShowBooking: jest.fn(), patchRoomStatus: jest.fn(), bulkMarkClean: jest.fn() }));
jest.mock('@/api/services/orderService', () => ({ printOrder: jest.fn() }));
jest.mock('@/contexts/RestaurantContext', () => ({ useRestaurant: () => ({ restaurant: { name: 'Sandbox', totalRound: true } }) }));
jest.mock('@/contexts/SettingsContext', () => ({ useSettings: () => ({ settings: { autoBill: false } }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { employeeId: 5115, fullName: 'Owner' } }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
// Stub: renders the money props the host feeds it and exposes a Pay button that calls onPaymentComplete like the real panel (L1192)
jest.mock('@/components/order-entry/CollectPaymentPanel', () => ({ __esModule: true, default: (p) => (
  <div data-testid="cpp-stub">
    <span data-testid="cpp-room-balance">{p.roomInfo?.roomPaymentSummary?.remainingRoomBalance}</span>
    <span data-testid="cpp-room-price">{p.roomInfo?.roomPrice}</span>
    <span data-testid="cpp-gst">{p.roomInfo?.gstTax}</span>
    <span data-testid="cpp-adv">{p.roomInfo?.advancePayment}</span>
    <span data-testid="cpp-isroom">{String(p.isRoom)}</span>
    <span data-testid="cpp-split">{String(p.onOpenSplitBill)}</span>
    <span data-testid="cpp-processing">{String(p.isProcessingPayment)}</span>
    <span data-testid="cpp-cust-name">{p.customer?.name}</span>
    <span data-testid="cpp-cust-phone">{p.customer?.phone}</span>
    <button type="button" data-testid="complete-payment-btn" onClick={() => p.onPaymentComplete({ paymentMethod: 'tab', amountPaid: 17480 })}>Pay</button>
  </div>
) }));

const { getGuestFolio } = jest.requireMock('@/api/services/pmsService');
const { toast } = jest.requireMock('sonner');
const rawOrder = folioRaw.orders[0];
const meta = lr.data.meta;
const inHouse = lr.data.reservations.filter((r) => r.operational_status === 'in_house').map(fromReservation);
// LR row shaped like the gate-4 stay behind the folio fixture (charge from probes_2026_09_20_final: 17,500 / 1,094 / 1,094 / adv 1,500 / due 18,188)
const row = { ...inHouse[0], id: 901, orderId: rawOrder.id, roomNo: 'r1', tableId: 8528, charge: { ...inHouse[0].charge, booking_charge: 17500, sgst: 1094, cgst: 1094, advance_payment: 1500, balance_due: 18188, total_with_gst: 19688, upgrade_amount: 1500, nights: 2, nights_detail: [{ date: '2026-10-10', rate: 8600, source: 'held', gst_percent: 18 }, { date: '2026-10-11', rate: 7400, source: 'calendar', gst_percent: 5 }] } };

beforeEach(() => { jest.clearAllMocks(); getGuestFolio.mockResolvedValue(rawOrder); api.post.mockResolvedValue({ data: { success: true, status: 'success' } }); Element.prototype.scrollIntoView = jest.fn(); });

describe('M6 service layer', () => {
  test('getFolio: one existing getGuestFolio call → { raw, order (orderTransform), folio (folioTransform) }; empty → throws', async () => {
    const f = await getFolio(rawOrder.id);
    expect(getGuestFolio).toHaveBeenCalledTimes(1);
    expect(f.order.isRoom).toBe(true);
    expect(f.order.roomInfo.gstTax).toBe(2080);
    expect(f.folio.roomOrders.map((o) => o.name)).toEqual(['Room upgrade: Suite upgrade probe']);
    getGuestFolio.mockResolvedValueOnce(null);
    await expect(getFolio(1)).rejects.toThrow('Empty order detail');
  });
  test('roomInfoFromCharge (M6-10): panel room figures come from charge.*, never the BUG-425 formula', () => {
    const order = orderFromAPI.order(rawOrder);
    const ri = roomInfoFromCharge(order.roomInfo, row.charge);
    expect(ri.roomPaymentSummary.remainingRoomBalance).toBe(18188);
    expect(ri.roomPrice).toBe(17500);
    expect(ri.gstTax).toBe(2188);
    expect(ri.advancePayment).toBe(1500);
    // the folio's own figures (16,900 / 2,080 / 17,480) do NOT leak into the panel's room props
    expect(order.roomInfo.roomPrice).toBe(16900);
    expect(ri.roomPaymentSummary.remainingRoomBalance).not.toBe(order.roomInfo.roomPaymentSummary.remainingRoomBalance);
    expect(ri.receiveBalance).toBe(order.roomInfo.receiveBalance); // untouched passthrough of the rest
  });
  test('splitUpgradeLine (Q3 a): "Room upgrade: <reason>" folio line → ROOM section, removed from ROOM ORDERS', () => {
    const { upgrade, orders } = splitUpgradeLine([{ name: 'Room upgrade: Suite upgrade probe', amount: 1500 }, { name: 'Paneer Tikka', amount: 250 }]);
    expect(upgrade).toEqual({ reason: 'Suite upgrade probe', amount: 1500 });
    expect(orders.map((o) => o.name)).toEqual(['Paneer Tikka']);
    expect(splitUpgradeLine(undefined)).toEqual({ upgrade: null, orders: [] });
  });
  test('payBill posts to BILL_PAYMENT and returns the body (already_paid readable by the host)', async () => {
    api.post.mockResolvedValueOnce({ data: alreadyPaid.body });
    await expect(payBill({ a: 1 })).resolves.toEqual(alreadyPaid.body);
    expect(api.post).toHaveBeenCalledWith('/api/v2/vendoremployee/order/order-bill-payment', { a: 1 });
  });
  test('G-02 guard still holds for the other money flows (booking body carries no price keys)', () => {
    const b = buildBookingBody({ name: 'x', phone: '9', checkin: '2026-10-10', checkout: '2026-10-11', adults: 1, children: 0, roomCode: 'suite', rateplanCode: 'p' });
    expect(Object.keys(b)).not.toEqual(expect.arrayContaining(['rate_per_night', 'room_price', 'amount_after_tax', 'order_amount']));
  });
});

describe('FolioCheckoutPanel', () => {
  test('LEFT statement from server fields: ROOM (nights chips, booking, upgrade w/ reason, discount disabled, SGST + CGST two lines, paid, balance), ROOM ORDERS, TRANSFERRED; RIGHT panel fed from charge.*', async () => {
    render(<FolioCheckoutPanel row={row} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('bill-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('bill-left')).toBeInTheDocument());
    await waitFor(() => screen.getByTestId('cpp-stub')); // lazy panel
    expect(screen.getByTestId('bill-room-total')).toHaveTextContent('₹19,688');
    expect(screen.getByTestId('bill-nights-2026-10-10-source')).toHaveTextContent('held rate');
    expect(screen.getByTestId('bill-nights-2026-10-11-source')).toHaveTextContent('rate table');
    expect(screen.getByTestId('bill-room-booking')).toHaveTextContent('₹17,500');
    expect(screen.getByTestId('bill-room-upgrade')).toHaveTextContent('₹1,500');
    expect(screen.getByText('Room upgrade: Suite upgrade probe')).toBeInTheDocument();
    expect(screen.getByTestId('bill-room-discount-btn')).toBeDisabled();
    expect(screen.getByTestId('bill-room-discount-btn').getAttribute('title')).toBe('needs BQ-385-07');
    const sgst = screen.getByTestId('bill-room-sgst'); const cgst = screen.getByTestId('bill-room-cgst'); // BUG-418
    expect(sgst).not.toBe(cgst); expect(sgst).toHaveTextContent('₹1,094'); expect(cgst).toHaveTextContent('₹1,094');
    expect(screen.queryByText(/^GST$/)).toBeNull();
    expect(screen.getByTestId('bill-room-paid')).toHaveTextContent('₹1,500');
    expect(screen.getByTestId('bill-room-balance')).toHaveTextContent('₹18,188');
    expect(screen.getByTestId('bill-orders-empty')).toBeInTheDocument(); // upgrade line moved out of ROOM ORDERS
    expect(screen.getByTestId('bill-transferred-empty')).toBeInTheDocument();
    expect(screen.getByTestId('cpp-room-balance')).toHaveTextContent('18188');
    expect(screen.getByTestId('cpp-room-price')).toHaveTextContent('17500');
    expect(screen.getByTestId('cpp-gst')).toHaveTextContent('2188');
    expect(screen.getByTestId('cpp-adv')).toHaveTextContent('1500');
    expect(screen.getByTestId('cpp-isroom')).toHaveTextContent('true');
    expect(screen.getByTestId('cpp-split')).toHaveTextContent('null'); // Q4 a drawer parity
    expect(screen.getByTestId('bill-right').className).toContain('frontdesk-bill');
    expect(screen.getByTestId('bill-print-folio-btn')).toBeDisabled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled(); // M6-11
  });

  test('D87: checkout body = unchanged POS collectBillExisting output + room_gst_tax passthrough — the host adds nothing else', async () => {
    const spy = jest.spyOn(orderToAPI, 'collectBillExisting').mockReturnValue({ marker: 'pos-body', payment_amount: 17480 });
    const onDone = jest.fn();
    render(<FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('complete-payment-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('complete-payment-btn')); });
    expect(spy).toHaveBeenCalledTimes(1);
    const [table, items, customer, paymentData, opts] = spy.mock.calls[0];
    expect(table).toEqual({ orderId: rawOrder.id, isRoom: true, tableId: 8528, tableNumber: 'r1', tableSection: 'patal lok' });
    expect(items.every((i) => i.placed === true)).toBe(true);
    expect(customer).toEqual({ customerName: 'Gate4 Guest', phone: expect.any(String), email: '' });
    expect(paymentData).toEqual({ paymentMethod: 'tab', amountPaid: 17480 });
    expect(opts).toEqual({ autoBill: false, waiterId: 5115, restaurantName: 'Sandbox' });
    const body = api.post.mock.calls[0][1];
    expect(Object.keys(body).sort()).toEqual(['marker', 'payment_amount', 'room_gst_tax']);
    expect(body.room_gst_tax).toBe(2080); // server folio value passthrough (BUG-386), not charge, not computed
    expect(onDone).toHaveBeenCalledWith('Checked out · Room r1');
    spy.mockRestore();
  });

  test('M6-04 already_paid 200 → toast "Already checked out", onDone(null) (refetch), no error card', async () => {
    api.post.mockResolvedValueOnce({ data: alreadyPaid.body });
    const onDone = jest.fn();
    render(<FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('complete-payment-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('complete-payment-btn')); });
    expect(toast.info).toHaveBeenCalledWith('Already checked out');
    expect(onDone).toHaveBeenCalledWith(null);
    expect(screen.queryByTestId('bill-pay-error')).toBeNull();
  });

  test('server error → bill-pay-error verbatim, panel stays; folio load error → bill-error + retry reloads', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Order not found' } } });
    render(<FolioCheckoutPanel row={row} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('complete-payment-btn'));
    await act(async () => { fireEvent.click(screen.getByTestId('complete-payment-btn')); });
    expect(screen.getByTestId('bill-pay-error')).toHaveTextContent('Order not found');
    expect(screen.getByTestId('cpp-stub')).toBeInTheDocument();
    getGuestFolio.mockRejectedValueOnce(new Error('boom'));
    render(<FolioCheckoutPanel row={{ ...row, id: 902 }} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => expect(screen.getByTestId('bill-error')).toHaveTextContent('boom'));
    await act(async () => { fireEvent.click(screen.getByTestId('bill-retry-btn')); });
    await waitFor(() => expect(screen.getAllByTestId('bill-left')).toHaveLength(2));
  });

  test('AC-15 per-folio reset: row A → row B refetches and the LEFT is rebuilt from the new folio', async () => {
    const { rerender } = render(<FolioCheckoutPanel row={row} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('bill-left'));
    getGuestFolio.mockResolvedValueOnce({ ...rawOrder, id: 777, orderDetails: [] });
    rerender(<FolioCheckoutPanel row={{ ...row, orderId: 777, charge: { ...row.charge, upgrade_amount: 0 } }} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('bill-loading')).toBeInTheDocument();
    await waitFor(() => screen.getByTestId('bill-left'));
    expect(getGuestFolio).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('bill-room-upgrade')).toBeNull();
  });
});

describe('M6 wiring', () => {
  test('stayActions: Bill live → onOpen(id, "bill"); Cleared → disabled with title (X-02); no orderId → disabled with title', () => {
    const onOpen = jest.fn();
    const { rerender } = render(<>{stayActions(row, '', { onOpen })}</>);
    fireEvent.click(screen.getByTestId(`fd-row-${row.id}-bill-btn`));
    expect(onOpen).toHaveBeenCalledWith(row.id, 'bill');
    rerender(<>{stayActions({ ...row, orderPaymentStatus: 'paid', charge: { ...row.charge, balance_due: 0 } }, '', { onOpen })}</>);
    expect(screen.getByTestId(`fd-row-${row.id}-bill-btn`)).toBeDisabled();
    expect(screen.getByTestId(`fd-row-${row.id}-bill-btn`).getAttribute('title')).toBe('Cleared — nothing to bill');
    rerender(<>{stayActions({ ...row, orderId: null }, '', { onOpen })}</>);
    expect(screen.getByTestId(`fd-row-${row.id}-bill-btn`)).toBeDisabled();
    expect(screen.getByTestId(`fd-row-${row.id}-bill-btn`).getAttribute('title')).toBe('No folio order linked to this stay');
  });

  test.each([['Departures', DeparturesPanel, null], ['In-House', InHousePanel, 'all']])('%s panel: kind bill renders FolioCheckoutPanel inline; X-10 no duplicate testids with the Bill expansion open', async (_n, Panel, chip) => {
    const rows = [row, { ...inHouse[1] ?? inHouse[0], id: 903 }];
    render(<Panel rows={rows} meta={meta} expandedId={row.id} expandedKind="bill" onToggle={jest.fn()} onOpen={jest.fn()} onDone={jest.fn()} chip={chip ?? bucketDeparture(row, meta.business_date)} onChip={jest.fn()} balances={{}} />);
    await waitFor(() => screen.getByTestId(`bill-panel-${row.id}`));
    await waitFor(() => screen.getByTestId('bill-left'));
    const ids = [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid'));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  test('RoomDetail occupied: Bill live via onBill(room)', () => {
    const onBill = jest.fn();
    const room = { id: 8528, tableNo: 'r1', displayStatus: 'occupied', guest: { name: 'G' } };
    render(<RoomDetail room={room} row={row} busy={false} onPatch={jest.fn()} onClose={jest.fn()} onBill={onBill} />);
    fireEvent.click(screen.getByTestId('fd-room-action-bill-8528'));
    expect(onBill).toHaveBeenCalledWith(room);
  });
});

describe('BUG-448 — Credit/TAB prefill from the booking (D47-c, OD-385-21)', () => {
  test('billCustomer: name = row.guestName, phone = digits-only last 10 of row.phone; falls back to the folio; drawer keys kept', () => {
    const order = orderFromAPI.order(rawOrder);
    const c = billCustomer(order, { guestName: 'QA P4 A', phone: '+91 90000-00001' });
    expect(c.name).toBe('QA P4 A'); expect(c.phone).toBe('9000000001'); expect(c.customerName).toBe(order.customerName); expect(c.email).toBe('');
    expect(tabPrefilled(c)).toBe(true);
    const c2 = billCustomer({ ...order, phone: '' }, { guestName: '', phone: '' });
    expect(c2.name).toBe(order.customerName); expect(c2.phone).toBe(''); expect(tabPrefilled(c2)).toBe(false); // panel keeps Checkout disabled — rule not bypassed
    expect(tabPrefilled({ name: 'x', phone: '12345' })).toBe(false);
  });
  test('panel receives the prefilled customer; TAB block hidden only when prefilled (class fd-bill-tab-prefilled)', async () => {
    render(<FolioCheckoutPanel row={{ ...row, guestName: 'QA P4 A', phone: '9000000001' }} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('cpp-stub'));
    expect(screen.getByTestId('cpp-cust-name')).toHaveTextContent('QA P4 A');
    expect(screen.getByTestId('cpp-cust-phone')).toHaveTextContent('9000000001');
    expect(screen.getByTestId('bill-right').className).toContain('fd-bill-tab-prefilled');
  });
  test('no phone on booking or folio → class absent (TAB block stays visible so staff can type it)', async () => {
    getGuestFolio.mockResolvedValueOnce({ ...rawOrder, user: { ...rawOrder.user, phone: '' } });
    render(<FolioCheckoutPanel row={{ ...row, id: 904, phone: '' }} meta={meta} onDone={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByTestId('cpp-stub'));
    expect(screen.getByTestId('bill-right').className).not.toContain('fd-bill-tab-prefilled');
  });
});
