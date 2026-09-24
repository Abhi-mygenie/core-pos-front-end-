// CR-385 Phase 2 — M1 New Booking · M3 Check-In. Payload snapshots (no rate_per_night / room_price>0 / amount_after_tax), BQ-385-26 skipped → hard error,
// early check-in guard (N7/D53) with rules true/false, HK room selectable (N9/D52), getFrontDeskRules shape (C2), 422 verbatim, F1 booking form.
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import api from '@/api/axios';
import lrFixture from '../../__fixtures__/cr385/local_reservations_view_all.json';
import boardFixture from '../../__fixtures__/cr385/room_status_board.json';
import created201 from '../../__fixtures__/cr385/direct_reservation_201.json';
import skipped200 from '../../__fixtures__/cr385/direct_reservation_skipped.json';
import norate422 from '../../__fixtures__/cr385/direct_reservation_422_norate.json';
import availability from '../../__fixtures__/cr385/room_availability.json';
import checkin200 from '../../__fixtures__/cr385/checkin_200_upgrade.json';
import settingsBasic from '../../__fixtures__/cr385/settings_list_basic.json';
import { fromFrontDeskSnapshot } from '@/api/transforms/frontDeskTransform';
import { buildBookingBody, buildCheckInFormData, reservationOf, createBooking, checkIn } from '@/api/services/frontDeskService';
import { getFrontDeskRules } from '@/api/services/restaurantSettingsService';
import ArrivalsPanel from '@/components/pms/frontdesk/ArrivalsPanel';
import CheckInForm, { eligibleRooms, isEarly } from '@/components/pms/frontdesk/CheckInForm';
import NewBookingForm, { freeByType, READS_DEBOUNCE_MS } from '@/components/pms/frontdesk/NewBookingForm';

jest.mock('@/api/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/api/services/pmsService', () => ({ getRatesData: jest.fn(), cancelReservation: jest.fn(), markNoShowBooking: jest.fn(), patchRoomStatus: jest.fn(), bulkMarkClean: jest.fn() }));
jest.mock('@/components/pms/GuestDocsSection', () => ({ __esModule: true, default: () => <div data-testid="guest-docs-stub" />, CRM_DOC_TYPE: {} }));
const pms = require('@/api/services/pmsService');

const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'fulfilled', value: require('@/api/transforms/roomStatusTransform').fromRoomStatusBoard(boardFixture) }, kpis: { status: 'rejected' } });
const bd = snap.meta.business_date; // '2026-09-20'
const pending = snap.reservations.filter((r) => r.operationalStatus === 'pending');
const todayRow = { ...pending[0], checkin: bd, checkout: '2026-09-21', roomType: 'suite', tableId: null, id: 9001, bookingId: 'MG-TEST-1', channel: 'Direct', isOta: false, adults: 2, children: 0 };
const futureRow = { ...todayRow, id: 9002, checkin: '2026-10-10', checkout: '2026-10-11' };
const rooms = [
  { id: 8525, tableNo: 'r4', title: '2nd floor', roomType: 'suite', displayStatus: 'available', manualStatus: null },
  { id: 8527, tableNo: 'r5', title: 'ground floor', roomType: 'suite', displayStatus: 'hk', manualStatus: 'hk', statusSince: '2026-09-20 10:00:00', hkAssignee: 'Asha' },
  { id: 8526, tableNo: 'r2', title: 'first floor', roomType: 'executive', displayStatus: 'available', manualStatus: null },
  { id: 8524, tableNo: 'r3', title: '3rd floor', roomType: 'suite', displayStatus: 'occupied', manualStatus: null },
];
const rulesOff = { allowEarlyCheckin: false, extendRateMode: 'calendar', autoPrintCheckinReceipt: false };
const formDataToObj = (fd) => Object.fromEntries([...fd.entries()]);

beforeEach(() => { // CRA resetMocks:true → re-arm per test
  pms.getRatesData.mockResolvedValue({ rateplans: [{ roomCode: 'suite', rateplanCode: 'suite-ep' }, { roomCode: 'executive', rateplanCode: 'executive-s-ep' }], dateRateMap: { [bd]: { 'suite-ep': 31500, 'executive-s-ep': 8600 } }, dates: [bd] });
  api.get.mockResolvedValue({ data: availability });
});

describe('M1 payload (BQ-385-10/16) — intent only', () => {
  test('buildBookingBody: room_code + rateplan_code + rooms_count 1, advance only when > 0, never rate_per_night', () => {
    const b = buildBookingBody({ name: ' Smoke P2 ', phone: '9876500231', checkin: bd, checkout: '2026-09-21', adults: 1, children: 0, roomCode: 'suite', rateplanCode: 'suite-ep', advance: { amount: '1000', method: 'upi', reference: 'UTR1' } });
    expect(b).toEqual({ guest: { name: 'Smoke P2', phone: '9876500231' }, checkin: bd, checkout: '2026-09-21', adults: 1, children: 0, rooms: [{ room_code: 'suite', rateplan_code: 'suite-ep', rooms_count: 1 }], advance: { amount: 1000, method: 'upi', reference: 'UTR1' } });
    expect(JSON.stringify(b)).not.toMatch(/rate_per_night|room_price|amount_after_tax|order_amount/);
    expect(buildBookingBody({ name: 'A', phone: '1', checkin: bd, checkout: '2026-09-21', roomCode: 'suite', rateplanCode: 'suite-ep', advance: { amount: '0', method: 'cash' } }).advance).toBeUndefined();
  });
  test('reservationOf: 201 body → reservation with charge; skipped:true / missing reservation → hard error (BQ-385-26)', () => {
    expect(reservationOf(created201).charge.advance_payment).toBe(1000);
    expect(() => reservationOf(skipped200)).toThrow(/Booking not created — Direct reservation skipped: incomplete stay dates\./);
    expect(() => reservationOf({ status: true, data: {} })).toThrow(/Booking not created/);
  });
  test('createBooking posts to direct-reservation and rejects on skipped', async () => {
    api.post.mockResolvedValueOnce({ data: skipped200 });
    await expect(createBooking({ rooms: [] })).rejects.toThrow(/Booking not created/);
    expect(api.post.mock.calls[0][0]).toMatch(/aiosell\/direct-reservation$/);
  });
  test('freeByType counts available rooms per aiosell_room_code (room-availability probe shape)', () => {
    expect(freeByType(availability.data)).toEqual({ suite: 3, executive: 0 });
  });
});

describe('M1 NewBookingForm', () => {
  const fill = async () => {
    fireEvent.change(screen.getByTestId('booking-guest-name'), { target: { value: 'Smoke P2' } });
    fireEvent.change(screen.getByTestId('booking-guest-phone'), { target: { value: '9876500231' } });
    await act(async () => { jest.advanceTimersByTime(READS_DEBOUNCE_MS + 10); });
    await waitFor(() => expect(screen.getByTestId('booking-cell-suite-suite-ep')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('booking-cell-suite-suite-ep'));
  };
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  test('pre-save RIGHT pane is a Stay summary (D82): server rate/night + nights, no GST/total; sold-out type disabled; ready pill', async () => {
    render(<NewBookingForm meta={snap.meta} onDone={jest.fn()} onCheckInNow={jest.fn()} onClose={jest.fn()} />);
    await fill();
    expect(screen.getByTestId('booking-summary-rate')).toHaveTextContent('₹31,500');
    expect(screen.getByTestId('booking-summary-nights')).toHaveTextContent('1');
    expect(screen.getByTestId('booking-bill-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('booking-bill-total')).toBeNull();
    expect(screen.getByTestId('booking-cell-executive-executive-s-ep')).toBeDisabled(); // 0 free
    expect(screen.getByTestId('booking-type-executive-free')).toHaveTextContent('sold out');
    expect(screen.getByTestId('booking-ready-pill')).toBeInTheDocument();
    expect(pms.getRatesData).toHaveBeenCalledTimes(1); // one debounced read batch
  });
  test('Save → 201 → confirmation strip from charge.* only; Done → onDone', async () => {
    const onDone = jest.fn();
    api.post.mockResolvedValueOnce({ data: created201 });
    render(<NewBookingForm meta={snap.meta} onDone={onDone} onCheckInNow={jest.fn()} onClose={jest.fn()} />);
    await fill();
    fireEvent.click(screen.getByTestId('booking-advance-toggle'));
    fireEvent.change(screen.getByTestId('booking-advance-amount'), { target: { value: '1000' } });
    fireEvent.click(screen.getByTestId('booking-pay-upi'));
    expect(screen.getByTestId('booking-save-btn')).toBeDisabled(); // AC-09 UPI needs UTR
    fireEvent.change(screen.getByTestId('booking-pay-ref'), { target: { value: 'UTR123' } });
    await act(async () => { fireEvent.click(screen.getByTestId('booking-save-btn')); });
    await waitFor(() => expect(screen.getByTestId('booking-confirmation')).toBeInTheDocument());
    expect(api.post.mock.calls[0][1].advance).toEqual({ amount: 1000, method: 'upi', reference: 'UTR123' });
    expect(screen.getByTestId('booking-bill-total')).toHaveTextContent('₹10,148');
    expect(screen.getByTestId('booking-bill-sgst')).toHaveTextContent('₹774');
    expect(screen.getByTestId('booking-bill-advance')).toHaveTextContent('₹1,000');
    expect(screen.getByTestId('booking-bill-balance')).toHaveTextContent('₹9,148');
    fireEvent.click(screen.getByTestId('booking-done-btn'));
    expect(onDone).toHaveBeenCalledWith(expect.stringMatching(/Booking saved — MG-69/));
  });
  test('200 skipped:true → booking-error, no onDone; 422 "no rate configured" shown verbatim', async () => {
    const onDone = jest.fn();
    api.post.mockResolvedValueOnce({ data: skipped200 });
    render(<NewBookingForm meta={snap.meta} onDone={onDone} onCheckInNow={jest.fn()} onClose={jest.fn()} />);
    await fill();
    await act(async () => { fireEvent.click(screen.getByTestId('booking-save-btn')); });
    await waitFor(() => expect(screen.getByTestId('booking-error')).toHaveTextContent(/Booking not created — Direct reservation skipped/));
    expect(onDone).not.toHaveBeenCalled();
    api.post.mockRejectedValueOnce({ response: { status: 422, data: norate422 } });
    await act(async () => { fireEvent.click(screen.getByTestId('booking-save-btn')); });
    await waitFor(() => expect(screen.getByTestId('booking-error')).toHaveTextContent('no rate configured'));
  });
  test('advance above rate × nights is a soft hint only — Save stays enabled', async () => {
    render(<NewBookingForm meta={snap.meta} onDone={jest.fn()} onCheckInNow={jest.fn()} onClose={jest.fn()} />);
    await fill();
    fireEvent.click(screen.getByTestId('booking-advance-toggle'));
    fireEvent.change(screen.getByTestId('booking-advance-amount'), { target: { value: '99999' } });
    expect(screen.getByTestId('booking-advance-hint')).toHaveTextContent('₹31,500');
    expect(screen.getByTestId('booking-save-btn')).not.toBeDisabled();
  });
});

describe('M3 check-in FormData (copy of pmsCheckIn + upgrade_* / aiosell_reservation_id; server prices)', () => {
  test('superset of the legacy field set, money fields zero, collect-now as advance_payment, explicit multipart', async () => {
    api.post.mockResolvedValueOnce({ data: checkin200 });
    const res = await checkIn({ bookingType: 'Direct', bookingId: 'MG-1', reservationId: 194, name: 'G', phone: '9', restaurantTableId: 8527, adults: 2, checkin: bd, checkout: '2026-09-21', collectNow: 500, paymentMethod: 'Card', upgradeType: 'paid', upgradeAmount: 1500, upgradeReason: 'smoke' });
    const [url, fd, cfg] = api.post.mock.calls[0];
    expect(url).toMatch(/user-group-check-in$/);
    expect(cfg.headers['Content-Type']).toBe('multipart/form-data');
    const o = formDataToObj(fd);
    ['booking_type', 'booking_id', 'name', 'phone', 'email', 'room_id[0]', 'id_type', 'total_adult', 'total_children', 'children_name', 'name2', 'id_type2', 'name3', 'name4', 'checkin_date', 'checkout_date', 'booking_details', 'booking_for', 'order_amount', 'room_price', 'advance_payment', 'balance_payment', 'payment_method', 'order_note', 'gst_tax', 'firm_name', 'firm_gst'].forEach((k) => expect(Object.keys(o)).toContain(k));
    expect(o).toMatchObject({ aiosell_reservation_id: '194', upgrade_type: 'paid', upgrade_amount: '1500', upgrade_reason: 'smoke', room_price: '0', order_amount: '0', gst_tax: '0', balance_payment: '0', advance_payment: '500', payment_method: 'Card', booking_for: 'Individual', 'room_id[0]': '8527' });
    expect(res.data.charge.upgrade_amount).toBe(1500);
    const none = formDataToObj(buildCheckInFormData({ bookingType: 'Direct', bookingId: 'x', reservationId: 1, restaurantTableId: 1, checkin: bd, checkout: bd, collectNow: 0 }));
    expect(none).toMatchObject({ upgrade_type: 'none', upgrade_amount: '0', upgrade_reason: '', advance_payment: '0', payment_method: '' });
  });
  test('eligibleRooms: booked type available + hk only (occupied excluded); upgrade toggle → other types', () => {
    expect(eligibleRooms(rooms, 'suite', false).map((r) => r.tableNo)).toEqual(['r4', 'r5']);
    expect(eligibleRooms(rooms, 'suite', true).map((r) => r.tableNo)).toEqual(['r2']);
    expect(isEarly({ checkin: '2026-10-10' }, bd)).toBe(true); expect(isEarly({ checkin: bd }, bd)).toBe(false);
  });
});

describe('M3 early check-in guard (N7/D53) + CheckInForm', () => {
  const panel = (row, rules, chip = "today") => render(<ArrivalsPanel rows={[row]} meta={snap.meta} kpis={null} expandedId={null} onToggle={jest.fn()} onOpen={jest.fn()} onDone={jest.fn()} chip={chip} onChip={jest.fn()} rules={rules} rooms={rooms} />);
  test('future row + allowEarlyCheckin=false → Check In disabled with the Arrives tooltip; today row enabled', () => {
    const { unmount } = panel(futureRow, rulesOff, "upcoming");
    const btn = screen.getByTestId(`fd-row-${futureRow.id}-checkin-btn`);
    expect(btn).toBeDisabled(); expect(btn).toHaveAttribute('title', expect.stringMatching(/^Arrives 10 Oct — modify the booking dates to check in today$/));
    unmount();
    panel(todayRow, rulesOff);
    expect(screen.getByTestId(`fd-row-${todayRow.id}-checkin-btn`)).not.toBeDisabled();
  });
  test('future row + allowEarlyCheckin=true → enabled and opens kind checkin', () => {
    const onOpen = jest.fn();
    render(<ArrivalsPanel rows={[futureRow]} meta={snap.meta} kpis={null} expandedId={null} onToggle={jest.fn()} onOpen={onOpen} onDone={jest.fn()} chip="upcoming" onChip={jest.fn()} rules={{ ...rulesOff, allowEarlyCheckin: true }} rooms={rooms} />);
    fireEvent.click(screen.getByTestId(`fd-row-${futureRow.id}-checkin-btn`));
    expect(onOpen).toHaveBeenCalledWith(futureRow.id, 'checkin');
  });
  test('CheckInForm: bill from row.charge, HK room selectable with badge + amber note, confirm → onDone("Checked in — Room r5")', async () => {
    const onDone = jest.fn();
    api.post.mockResolvedValueOnce({ data: checkin200 });
    const row = { ...todayRow, charge: created201.data.reservation.charge };
    render(<CheckInForm row={row} meta={snap.meta} rooms={rooms} rules={rulesOff} onDone={onDone} onClose={jest.fn()} />);
    expect(screen.getByTestId('checkin-bill-total')).toHaveTextContent('₹10,148');
    expect(screen.getByTestId('checkin-bill-paid')).toHaveTextContent('₹1,000');
    expect(screen.getByTestId('checkin-confirm-btn')).toBeDisabled();
    fireEvent.change(screen.getByTestId('checkin-room-select'), { target: { value: '8527' } });
    expect(screen.getByTestId('checkin-room-hk-badge')).toBeInTheDocument();
    expect(screen.getByTestId('checkin-room-hk-warning')).toHaveTextContent(/still being cleaned/);
    expect(screen.getByTestId('checkin-progress-ready')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByTestId('checkin-confirm-btn')); });
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Checked in — Room r5', expect.objectContaining({ order_id: 1232624 })));
    expect(formDataToObj(api.post.mock.calls[0][1])).toMatchObject({ 'room_id[0]': '8527', upgrade_type: 'none', aiosell_reservation_id: '9001' });
  });
  test('CheckInForm: server 422 shown verbatim; upgrade to other type requires amount + reason (paid)', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 422, data: { status: false, message: 'Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-20)' } } });
    render(<CheckInForm row={{ ...todayRow, charge: created201.data.reservation.charge }} meta={snap.meta} rooms={rooms} rules={rulesOff} onDone={jest.fn()} onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('checkin-upgrade-toggle'));
    fireEvent.change(screen.getByTestId('checkin-room-select'), { target: { value: '8526' } });
    expect(screen.getByTestId('checkin-progress-missing')).toHaveTextContent(/upgrade amount, upgrade reason/);
    fireEvent.change(screen.getByTestId('checkin-upgrade-amount'), { target: { value: '1500' } });
    fireEvent.change(screen.getByTestId('checkin-upgrade-reason'), { target: { value: 'smoke' } });
    await act(async () => { fireEvent.click(screen.getByTestId('checkin-confirm-btn')); });
    await waitFor(() => expect(screen.getByTestId('checkin-server-error')).toHaveTextContent(/Early check-in is not allowed for this property/));
    expect(formDataToObj(api.post.mock.calls[0][1])).toMatchObject({ upgrade_type: 'paid', upgrade_amount: '1500', upgrade_reason: 'smoke' });
  });
});

describe('C2 getFrontDeskRules shape (settings-list basic.*)', () => {
  test('returns the three rules incl. autoPrintCheckinReceipt; held → held', async () => {
    api.get.mockResolvedValueOnce({ data: settingsBasic });
    await expect(getFrontDeskRules()).resolves.toEqual({ allowEarlyCheckin: false, extendRateMode: 'held', autoPrintCheckinReceipt: false });
    api.get.mockResolvedValueOnce({ data: { data: { basic: {} } } });
    await expect(getFrontDeskRules()).resolves.toEqual({ allowEarlyCheckin: false, extendRateMode: 'calendar', autoPrintCheckinReceipt: false });
  });
});
