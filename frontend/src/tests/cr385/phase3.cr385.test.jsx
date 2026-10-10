// CR-385 Phase 3 — M4 Extend Stay · M5 Balances · BUG-433. Tests written first for BUG-433 + the extend body guard (owner rule).
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import api from '@/api/axios';
import extendCal from '../../__fixtures__/cr385/extend_200_calendar.json';
import extendHeld from '../../__fixtures__/cr385/extend_200_held_fallback.json';
import extend409 from '../../__fixtures__/cr385/extend_409.json';
import inhouseGuests from '../../__fixtures__/cr385/inhouse_guests.json';
import availability from '../../__fixtures__/cr385/room_availability.json';
import { applyGrandTotalRoundOff } from '@/utils/roundOffUtils';
import { buildExtendBody, extendStay, roundBalance, joinRowBalances, getRowBalances } from '@/api/services/frontDeskService';
import { fromReservation } from '@/api/transforms/frontDeskTransform';
import NightsLines from '@/components/pms/frontdesk/NightsLines';
import ExtendStayForm from '@/components/pms/frontdesk/ExtendStayForm';
import DeparturesPanel, { balanceOf, balanceTitle, stayActions } from '@/components/pms/frontdesk/DeparturesPanel';

jest.mock('@/api/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/api/services/pmsService', () => ({ getInHouseGuests: jest.fn(), getRatesData: jest.fn(), cancelReservation: jest.fn(), markNoShowBooking: jest.fn(), patchRoomStatus: jest.fn(), bulkMarkClean: jest.fn() }));
const pms = require('@/api/services/pmsService');

const meta = { business_date: '2026-10-10' };
const row = { ...fromReservation(extendCal.data.reservation), roomStatus: 'clean' };
const FORBIDDEN = /new_room_price|amount_after_tax|rate_per_night|room_price|order_amount/;

describe('BUG-433 — one rounding rule for the balance cell (CR-170, shared with the bill)', () => {
  test('roundBalance: 2,212.35 → 2,213 (+0.65) with totalRound on; raw when off; paise < 10 floors; equals the shared helper', () => {
    expect(roundBalance(2212.35, true)).toEqual({ raw: 2212.35, display: 2213, roundOff: 0.65 });
    expect(roundBalance(2212.35, false)).toEqual({ raw: 2212.35, display: 2212.35, roundOff: 0 });
    expect(roundBalance(2212.05, true)).toEqual({ raw: 2212.05, display: 2212, roundOff: -0.05 });
    expect(roundBalance(18688, true).display).toBe(applyGrandTotalRoundOff(18688, true));
    expect(roundBalance(2212.35, true).display).toBe(applyGrandTotalRoundOff(2212.35, true));
  });
  test('joinRowBalances keys by parentOrderId with room/fnb/transferred parts; getRowBalances calls getInHouseGuests once', async () => {
    pms.getInHouseGuests.mockResolvedValueOnce(inhouseGuests);
    const b = await getRowBalances({ roomGstApplicable: true, totalRound: true });
    expect(pms.getInHouseGuests).toHaveBeenCalledTimes(1);
    expect(pms.getInHouseGuests).toHaveBeenCalledWith({ roomGstApplicable: true });
    expect(b['1232632']).toMatchObject({ raw: 2212.35, display: 2213, roundOff: 0.65, room: 2100, fnb: 112.35, transferred: 0 });
    expect(b['9999'].display).toBe(2212);
    expect(joinRowBalances([{ parentOrderId: null, balance: 5 }])).toEqual({});
  });
  test('balance cell renders the bill figure with the raw + round-off tooltip; "…" while loading; ledger fallback when unavailable', () => {
    const b = joinRowBalances(inhouseGuests);
    const r = { ...row, orderId: 1232632 };
    expect(balanceOf(b)(r)).toBe(2213);
    expect(balanceTitle(b)(r)).toBe('₹2,212.35 + ₹0.65 round-off (as on the bill)');
    expect(balanceOf(undefined)(r)).toBeUndefined();
    expect(balanceOf(null)(r)).toBe(r.charge.balance_due);
    render(<DeparturesPanel rows={[r]} meta={meta} expandedId={null} onToggle={jest.fn()} chip="upcoming" onChip={jest.fn()} balances={b} />);
    expect(screen.getByTestId(`fd-row-${r.id}-balance`)).toHaveTextContent('₹2,213');
    expect(screen.getByTestId(`fd-row-${r.id}-balance`)).toHaveAttribute('title', expect.stringMatching(/round-off/));
  });
});

describe('M4 extend body guard (G-02) — never new_room_price / amount_after_tax / rate_per_night', () => {
  test('buildExtendBody: intent only; payment/discount/new_restaurant_table_id only when given', () => {
    const b = buildExtendBody({ orderId: '1232610', newCheckoutDate: '2026-10-12', reason: ' D14 ', payment: { amount: '500', method: 'cash', reference: '' }, discount: { type: 'percent', value: '10', reason: 'loyal' }, newRestaurantTableId: '8525' });
    expect(b).toEqual({ order_id: 1232610, new_checkout_date: '2026-10-12', reason: 'D14', payment: { amount: 500, method: 'cash' }, discount: { type: 'percent', value: 10, reason: 'loyal' }, new_restaurant_table_id: 8525 });
    expect(JSON.stringify(b)).not.toMatch(FORBIDDEN);
    const min = buildExtendBody({ orderId: 1, newCheckoutDate: '2026-10-12', reason: 'x', payment: { amount: '0' }, discount: { value: '' } });
    expect(min).toEqual({ order_id: 1, new_checkout_date: '2026-10-12', reason: 'x' });
  });
  test('extendStay posts to room-extend-stay with the guarded body', async () => {
    api.post.mockResolvedValueOnce({ data: extendCal });
    const res = await extendStay({ orderId: 1232610, newCheckoutDate: '2026-10-12', reason: 'D14' });
    expect(api.post.mock.calls[0][0]).toMatch(/pos\/room-extend-stay$/);
    expect(JSON.stringify(api.post.mock.calls[0][1])).not.toMatch(FORBIDDEN);
    expect(res.data.charge.nights_detail).toHaveLength(2);
  });
});

describe('M4 NightsLines (BQ-385-19) — labels from source only, never sums gst', () => {
  test('calendar fixture: held + rate table chips, GST % per night; held_fallback fixture; avg label when absent', () => {
    const { unmount } = render(<NightsLines charge={extendCal.data.charge} />);
    expect(screen.getByTestId('nights-lines-2026-10-10-source')).toHaveTextContent('held rate');
    expect(screen.getByTestId('nights-lines-2026-10-11-source')).toHaveTextContent('rate table');
    expect(screen.getByTestId('nights-lines-2026-10-11-rate')).toHaveTextContent('₹7,400');
    expect(screen.getByTestId('nights-lines')).toHaveTextContent('GST 5%');
    expect(screen.getByTestId('nights-lines').textContent).not.toMatch(/1,918|1918/); // 1548 + 370 never summed
    unmount();
    render(<NightsLines charge={extendHeld.data.charge} />);
    expect(screen.getByTestId('nights-lines-2026-11-15-source')).toHaveTextContent('held (no rate for this date)');
    render(<NightsLines charge={{ nights: 3, rate_per_night: 8000 }} testId="avg" />);
    expect(screen.getByTestId('avg-avg')).toHaveTextContent('3 nights · avg. rate / night ₹8,000');
  });
});

describe('M4 ExtendStayForm', () => {
  const setup = (over = {}) => { const onDone = jest.fn(); render(<ExtendStayForm row={{ ...row, ...over }} meta={meta} onDone={onDone} onClose={jest.fn()} />); return onDone; };
  test('current bill from row.charge; Confirm disabled until date + reason; +1 night → 200 → result from response charge → Done → onDone', async () => {
    const onDone = setup();
    api.post.mockResolvedValueOnce({ data: extendCal });
    expect(screen.getByTestId('extend-current-balance')).toHaveTextContent('₹18,688');
    expect(screen.getByTestId('extend-confirm-btn')).toBeDisabled();
    fireEvent.change(screen.getByTestId('extend-checkout'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByTestId('extend-reason'), { target: { value: 'smoke' } });
    expect(screen.getByTestId('extend-delta')).toHaveTextContent('Extend to 13 Oct (+1 night)');
    fireEvent.click(screen.getByTestId('extend-collect-toggle'));
    fireEvent.change(screen.getByTestId('extend-collect-amount'), { target: { value: '99999' } });
    expect(screen.getByTestId('extend-collect-hint')).toBeInTheDocument(); // soft hint, Q3 a
    expect(screen.getByTestId('extend-confirm-btn')).not.toBeDisabled();
    fireEvent.change(screen.getByTestId('extend-collect-amount'), { target: { value: '500' } });
    await act(async () => { fireEvent.click(screen.getByTestId('extend-confirm-btn')); });
    await waitFor(() => expect(screen.getByTestId('extend-result')).toBeInTheDocument());
    expect(api.post.mock.calls[0][1]).toEqual({ order_id: 1232610, new_checkout_date: '2026-10-13', reason: 'smoke', payment: { amount: 500, method: 'cash' } });
    expect(screen.getByTestId('extend-bill-total')).toHaveTextContent('₹19,688');
    expect(screen.getByTestId('extend-bill-sgst')).toHaveTextContent('₹1,094');
    expect(screen.getByTestId('extend-nights-2026-10-11-source')).toHaveTextContent('rate table');
    fireEvent.click(screen.getByTestId('extend-done-btn'));
    expect(onDone).toHaveBeenCalledWith(expect.stringMatching(/Stay extended — Room .* to 12 Oct/));
  });
  test('shorten: earlier date → "Shorten to" confirm text; body has no price', async () => {
    setup({ checkout: '2026-10-14', nights: 4 });
    api.post.mockResolvedValueOnce({ data: extendCal });
    fireEvent.change(screen.getByTestId('extend-checkout'), { target: { value: '2026-10-12' } });
    fireEvent.change(screen.getByTestId('extend-reason'), { target: { value: 'leaving early' } });
    expect(screen.getByTestId('extend-confirm-btn')).toHaveTextContent('Shorten to 12 Oct');
    await act(async () => { fireEvent.click(screen.getByTestId('extend-confirm-btn')); });
    expect(JSON.stringify(api.post.mock.calls[0][1])).not.toMatch(FORBIDDEN);
  });
  test('409 → server message verbatim + free same-type rooms from room-availability; Confirm disabled until a room is picked; retry sends new_restaurant_table_id', async () => {
    setup({ roomType: 'suite', tableId: 8524 });
    api.post.mockRejectedValueOnce({ response: { status: 409, data: extend409 } });
    api.get.mockResolvedValueOnce({ data: availability });
    fireEvent.change(screen.getByTestId('extend-checkout'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByTestId('extend-reason'), { target: { value: 'x' } });
    await act(async () => { fireEvent.click(screen.getByTestId('extend-confirm-btn')); });
    await waitFor(() => expect(screen.getByTestId('extend-conflict-message')).toHaveTextContent('Room conflict for new checkout.'));
    expect(api.get.mock.calls[0][1]).toEqual({ params: { checkin: row.checkin, checkout: '2026-10-13' } });
    expect(screen.getByTestId('extend-confirm-btn')).toBeDisabled();
    expect(screen.queryByTestId('extend-move-room-8524')).toBeNull(); // own room excluded
    fireEvent.click(screen.getByTestId('extend-move-room-8525'));
    expect(screen.getByTestId('extend-confirm-btn')).toHaveTextContent('Move & confirm');
    api.post.mockResolvedValueOnce({ data: extendCal });
    await act(async () => { fireEvent.click(screen.getByTestId('extend-confirm-btn')); });
    expect(api.post.mock.calls[1][1]).toMatchObject({ new_restaurant_table_id: 8525 });
  });
  test('non-409 server error shown verbatim', async () => {
    setup();
    api.post.mockRejectedValueOnce({ response: { status: 422, data: { status: false, message: 'Extension not allowed: stay already checked out' } } });
    fireEvent.change(screen.getByTestId('extend-checkout'), { target: { value: '2026-10-13' } });
    fireEvent.change(screen.getByTestId('extend-reason'), { target: { value: 'x' } });
    await act(async () => { fireEvent.click(screen.getByTestId('extend-confirm-btn')); });
    await waitFor(() => expect(screen.getByTestId('extend-server-error')).toHaveTextContent('Extension not allowed: stay already checked out'));
  });
});

describe('M5 row actions', () => {
  test('Extend opens kind extend; Request HK ↔ Mark Clean patches the room; Bill opens kind bill (M6)', () => {
    const onOpen = jest.fn(); const onPatch = jest.fn();
    const { rerender } = render(<>{stayActions({ ...row, tableId: 8525, roomStatus: 'clean' }, '', { onOpen, onPatch })}</>);
    fireEvent.click(screen.getByTestId(`fd-row-${row.id}-extend-btn`));
    expect(onOpen).toHaveBeenCalledWith(row.id, 'extend');
    expect(screen.getByTestId(`fd-row-${row.id}-hk-btn`)).toHaveTextContent('Request HK');
    fireEvent.click(screen.getByTestId(`fd-row-${row.id}-hk-btn`));
    expect(onPatch).toHaveBeenCalledWith(8525, 'hk');
    fireEvent.click(screen.getByTestId(`fd-row-${row.id}-bill-btn`)); // CR-385 M6 live
    expect(onOpen).toHaveBeenLastCalledWith(row.id, 'bill');
    rerender(<>{stayActions({ ...row, tableId: 8525, roomStatus: 'hk' }, '', { onOpen, onPatch })}</>);
    expect(screen.getByTestId(`fd-row-${row.id}-hk-btn`)).toHaveTextContent('Mark Clean');
    fireEvent.click(screen.getByTestId(`fd-row-${row.id}-hk-btn`));
    expect(onPatch).toHaveBeenLastCalledWith(8525, 'available');
  });
  test('DeparturesPanel: kind extend renders the form inline; fromReservation exposes nightsDetail', () => {
    render(<DeparturesPanel rows={[row]} meta={meta} expandedId={row.id} expandedKind="extend" onToggle={jest.fn()} onOpen={jest.fn()} onDone={jest.fn()} chip="upcoming" onChip={jest.fn()} balances={{}} />);
    expect(screen.getByTestId('extend-form')).toBeInTheDocument();
    expect(row.nightsDetail).toHaveLength(2);
  });
});
