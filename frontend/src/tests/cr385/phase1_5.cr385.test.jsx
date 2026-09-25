// CR-385 Phase 1.5 — BUG-441 (legacy Cancel/Modify must pass the numeric LR id) · BUG-442 (cancelled_by = logged-in user's fullName, fallback 'staff')
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArrivalsPage from '@/pages/pms/ArrivalsPage';
import { cancelTargetOf } from '@/components/pms/frontdesk/ArrivalsPanel';

jest.mock('@/components/layout/Sidebar', () => () => <aside data-testid="sidebar-mock" />);
jest.mock('@/contexts/RestaurantContext', () => ({ useRestaurant: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/api/services/pmsService', () => ({
  getReservationOps: jest.fn(), markNoShowBooking: jest.fn(), getCancelledReservations: jest.fn(),
  cancelReservation: jest.fn(), modifyReservation: jest.fn(), getRatesData: jest.fn(),
}));
jest.mock('@/api/services/settingsService', () => ({ getCancellationReasons: jest.fn() }));

const pms = require('@/api/services/pmsService');
const settings = require('@/api/services/settingsService');
const { useRestaurant } = require('@/contexts/RestaurantContext');
const { useAuth } = require('@/contexts/AuthContext');

const BID = 'MG-69-DD9A2965-CACC-454B-903A-0919C9F644C8';
const row = { id: 15, bookingId: BID, guestName: 'QA Legacy', channel: 'Direct', checkin: '2026-09-21', checkout: '2026-09-22', roomCode: 'suite', advance: 0, operationalStatus: 'pending', pah: true, roomLines: [], adults: 1, nights: 1, total: 37170 };
const empty = { arrivalsToday: [], arrivalsUpcoming: [], arrivalsLate: [], checkedInToday: [], cancelled: [], inHouse: [], all: [], today: '2026-09-21' };

beforeEach(() => {
  pms.getReservationOps.mockResolvedValue({ ...empty, arrivalsToday: [row], all: [row] });
  pms.cancelReservation.mockResolvedValue({});
  pms.getCancelledReservations.mockResolvedValue([]);
  settings.getCancellationReasons.mockResolvedValue({ reasons: [{ reasonId: 411, reasonText: 'guest cancelled' }] });
  useRestaurant.mockReturnValue({ restaurant: { name: 'TGK', profile: { fullName: 'WRONG SOURCE' } } });
  useAuth.mockReturnValue({ user: { fullName: 'Owner Goan', firstName: 'Owner' } });
});

const cancelViaLegacy = async () => {
  render(<MemoryRouter><ArrivalsPage /></MemoryRouter>);
  fireEvent.click(await screen.findByTestId(`arr-kebab-${BID}`));
  fireEvent.click(screen.getByTestId(`arr-cancel-btn-${BID}`));
  await screen.findByRole('option', { name: 'guest cancelled' });
  fireEvent.change(screen.getByTestId('cancel-reason-select'), { target: { value: '411' } });
  fireEvent.click(screen.getByTestId('cancel-booking-confirm-btn'));
  await waitFor(() => expect(pms.cancelReservation).toHaveBeenCalledTimes(1));
  return pms.cancelReservation.mock.calls[0];
};

describe('BUG-441 legacy /pms/arrivals Cancel uses the numeric LR id', () => {
  test('(a) cancelReservation(15, …) — never the MG- booking_id string', async () => {
    const [id] = await cancelViaLegacy();
    expect(id).toBe(15);
    expect(typeof id).toBe('number');
    expect(String(id)).not.toMatch(/^MG-/);
  });
});

describe('BUG-442 cancelled_by comes from AuthContext user.fullName', () => {
  test('(b) legacy payload cancelledBy === logged-in fullName (not restaurant.profile)', async () => {
    const [, opts] = await cancelViaLegacy();
    expect(opts).toEqual({ reason: 'guest cancelled', cancelledBy: 'Owner Goan' });
  });
  test('(c) fallback "staff" when there is no user / empty fullName', async () => {
    useAuth.mockReturnValue({ user: null });
    const [, opts] = await cancelViaLegacy();
    expect(opts.cancelledBy).toBe('staff');
  });
  test('(b2) Front Desk cancelTargetOf forwards the name and falls back to staff', () => {
    const fdRow = { id: 226, bookingId: BID, guestName: 'QA', channel: 'Direct', checkin: '2026-09-21', checkout: '2026-09-22', roomType: 'suite', charge: { advance_payment: 0 } };
    expect(cancelTargetOf(fdRow, 'Owner Goan').cancelledBy).toBe('Owner Goan');
    expect(cancelTargetOf(fdRow, '').cancelledBy).toBe('staff');
    expect(cancelTargetOf(fdRow, undefined).cancelledBy).toBe('staff');
    expect(cancelTargetOf(fdRow, 'x').reservationId).toBe(226);
  });
});

describe('source guards (legacy pages + Front Desk page)', () => {
  const fs = require('fs'); const path = require('path');
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../', p), 'utf8');
  test('no target passes bookingId as reservationId; no restaurant.profile.fullName; FD page reads user.fullName', () => {
    const arr = read('pages/pms/ArrivalsPage.jsx'); const res = read('pages/pms/ReservationsPage.jsx'); const fd = read('pages/pms/FrontDeskWorkstationPage.jsx');
    [arr, res].forEach((src) => { expect(src).not.toMatch(/reservationId:\s*(row|res)\.bookingId/); expect(src).not.toMatch(/restaurant\?\.profile\?\.fullName/); });
    expect(arr).toMatch(/reservationId:\s*row\.id/); expect(res).toMatch(/reservationId:\s*res\.id/);
    expect(fd).not.toMatch(/restaurant\?\.profile\?\.fullName/); expect(fd).toMatch(/cancelledBy=\{user\?\.fullName \|\| 'staff'\}/);
  });
});
