// CR-385 Phase 1 — M7 (updateFrontDeskRules multipart) · M2 (Modify preview/confirm bodies, nsOrCancel wiring, inline dialogs, legacy ArrivalsPage untouched)
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import lrFixture from '../../../../__fixtures__/cr385/local_reservations_view_all.json';
import { fromFrontDeskSnapshot } from '@/api/transforms/frontDeskTransform';
import api from '@/api/axios';
import { updateFrontDeskRules } from '@/api/services/restaurantSettingsService';
import { modifyReservation, previewModifyReservation } from '@/api/services/frontDeskService';
import ArrivalsPanel from '../ArrivalsPanel';
import ModifyBookingForm, { buildModifyBody, PREVIEW_DEBOUNCE_MS } from '../ModifyBookingForm';
import CancelBookingDialog from '@/components/pms/CancelBookingDialog';
import NoShowDialog from '@/components/pms/NoShowDialog';

jest.mock('@/api/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('@/api/services/pmsService', () => ({ getRatesData: jest.fn(), cancelReservation: jest.fn(), markNoShowBooking: jest.fn(), patchRoomStatus: jest.fn(), bulkMarkClean: jest.fn() }));
jest.mock('@/api/services/settingsService', () => ({ getCancellationReasons: jest.fn() }));
jest.mock('@/api/services/frontDeskService', () => {
  const actual = jest.requireActual('@/api/services/frontDeskService');
  return { ...actual, modifyReservation: jest.fn(), previewModifyReservation: jest.fn() };
});
const pms = require('@/api/services/pmsService');
const settings = require('@/api/services/settingsService');
beforeEach(() => { // CRA resetMocks:true wipes factory implementations → re-arm per test
  pms.getRatesData.mockResolvedValue({ rateplans: [{ roomCode: 'executive', rateplanCode: 'executive-s-ep' }, { roomCode: 'executive', rateplanCode: 'executive-s-cp' }], dateRateMap: {}, dates: [] });
  pms.cancelReservation.mockResolvedValue({});
  pms.markNoShowBooking.mockResolvedValue({});
  settings.getCancellationReasons.mockResolvedValue({ reasons: [{ reasonId: 411, reasonText: 'guest cancelled', isActive: true }], total: 1, limit: 50, page: 1 }); // BUG-440 real service shape
});

const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'rejected', reason: new Error('500') }, kpis: { status: 'rejected', reason: new Error('500') } });
const pending = snap.reservations.filter((r) => r.operationalStatus === 'pending');
const direct = pending.find((r) => r.channel === 'Direct');      // id 15
const ota = pending.find((r) => r.channel === 'booking.com');   // id 7
const noop = () => {};
const previewCharge = { nights: 3, booking_charge: 22200, sgst: 555, cgst: 555, total_with_gst: 23310, balance_due: 22310 };

describe('CR-385 M7 updateFrontDeskRules', () => {
  test('multipart body: single "data" field = {"basic":{allow_early_checkin, extend_rate_mode}} (snapshot)', async () => {
    api.post.mockResolvedValue({ data: { status: true } });
    await updateFrontDeskRules({ allowEarlyCheckin: true, extendRateMode: 'held' });
    const [url, fd, cfg] = api.post.mock.calls[0];
    expect(url).toBe('/api/v2/vendoremployee/restaurant-settings/update-settings');
    expect(fd).toBeInstanceOf(FormData);
    expect(cfg).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } }); // QA iteration_11 BLK-M7-CT: shared axios default is application/json → FormData would be JSON-encoded
    const entries = [...fd.entries()].map(([k, v]) => [k, JSON.parse(v)]);
    expect(entries).toMatchSnapshot();
    expect(entries).toEqual([['data', { basic: { allow_early_checkin: true, extend_rate_mode: 'held' } }]]);
  });
  test('defaults coerce: non-boolean → false, unknown mode → calendar', async () => {
    api.post.mockResolvedValue({ data: {} });
    await updateFrontDeskRules({ allowEarlyCheckin: undefined, extendRateMode: 'bogus' });
    const fd = api.post.mock.calls.at(-1)[1];
    expect(JSON.parse(fd.get('data'))).toEqual({ basic: { allow_early_checkin: false, extend_rate_mode: 'calendar' } });
  });
});

describe('CR-385 M2 Modify bodies', () => {
  test('buildModifyBody never carries amount_after_tax; rateplan_code only when changed', () => {
    const b = buildModifyBody({ row: direct, checkin: direct.checkin, checkout: direct.checkout, rateplanCode: direct.rateplanCode, reason: '' });
    expect(b).not.toHaveProperty('amount_after_tax');
    expect(b).not.toHaveProperty('rateplan_code');
    expect(buildModifyBody({ row: direct, checkin: '2026-10-01', checkout: '2026-10-02', rateplanCode: 'other-plan', reason: 'x' })).toEqual({ checkin: '2026-10-01', checkout: '2026-10-02', reason: 'x', rateplan_code: 'other-plan' });
  });

  test('preview: debounced ≥500 ms, body has preview:true; confirm body has no preview and no amount_after_tax', async () => {
    jest.useFakeTimers();
    previewModifyReservation.mockImplementation((id, body) => Promise.resolve({ data: { preview: true, reservation: { charge: previewCharge } } }));
    modifyReservation.mockResolvedValue({ data: { reservation: { charge: previewCharge } } });
    const onDone = jest.fn();
    render(<ModifyBookingForm row={direct} meta={snap.meta} onDone={onDone} onClose={noop} />);
    const newOut = '2026-09-30';
    fireEvent.change(screen.getByTestId('modify-checkout'), { target: { value: newOut } });
    expect(previewModifyReservation).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS - 1); });
    expect(previewModifyReservation).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(previewModifyReservation).toHaveBeenCalledTimes(1);
    const [pid, pbody] = previewModifyReservation.mock.calls[0];
    expect(pid).toBe(direct.id);
    expect(pbody).toEqual({ checkin: direct.checkin, checkout: newOut, reason: 'Modified from Front Desk' });
    expect(pbody).not.toHaveProperty('amount_after_tax');
    jest.useRealTimers();
    await waitFor(() => expect(screen.getByTestId('modify-preview-total')).toHaveTextContent('₹23,310'));
    fireEvent.click(screen.getByTestId('modify-booking-confirm-btn'));
    await waitFor(() => expect(modifyReservation).toHaveBeenCalledTimes(1));
    const [cid, cbody] = modifyReservation.mock.calls[0];
    expect(cid).toBe(direct.id);
    expect(cbody).toEqual({ checkin: direct.checkin, checkout: newOut, reason: 'Modified from Front Desk' });
    expect(cbody).not.toHaveProperty('preview');
    expect(cbody).not.toHaveProperty('amount_after_tax');
    expect(JSON.stringify(cbody)).not.toMatch(/amount_after_tax/);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('Booking updated'));
  });

  test('service previewModifyReservation adds preview:true on top of the intent body', async () => {
    const actual = jest.requireActual('@/api/services/frontDeskService');
    api.patch.mockResolvedValue({ data: { ok: true } });
    await actual.previewModifyReservation(191, { checkout: '2026-10-22', reason: 'probe' });
    expect(api.patch).toHaveBeenCalledWith('/api/v2/vendoremployee/aiosell/local-reservations/191', { checkout: '2026-10-22', reason: 'probe', preview: true });
  });

  test('zero-night guard (AC-11): checkout === checkin → error + Confirm disabled, no preview call', () => {
    jest.useFakeTimers();
    previewModifyReservation.mockClear();
    render(<ModifyBookingForm row={direct} meta={snap.meta} onDone={noop} onClose={noop} />);
    fireEvent.change(screen.getByTestId('modify-checkout'), { target: { value: direct.checkin } });
    act(() => { jest.advanceTimersByTime(PREVIEW_DEBOUNCE_MS * 2); });
    expect(screen.getByTestId('modify-dates-error')).toBeInTheDocument();
    expect(screen.getByTestId('modify-booking-confirm-btn')).toBeDisabled();
    expect(previewModifyReservation).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe('CR-385 M2 nsOrCancel wiring (AC-13 EITHER/OR)', () => {
  test('booking.com row → No-Show only; Direct row → Cancel only', () => {
    render(<ArrivalsPanel rows={[direct, ota]} meta={snap.meta} chip="late" onChip={noop} expandedId={null} onToggle={noop} onOpen={noop} onDone={noop} />);
    expect(screen.getByTestId(`fd-row-${ota.id}-noshow-btn`)).toBeInTheDocument();
    expect(screen.queryByTestId(`fd-row-${ota.id}-cancel-btn`)).toBeNull();
    expect(screen.getByTestId(`fd-row-${direct.id}-cancel-btn`)).toBeInTheDocument();
    expect(screen.queryByTestId(`fd-row-${direct.id}-noshow-btn`)).toBeNull();
    expect(screen.getByTestId(`fd-row-${direct.id}-modify-btn`)).not.toBeDisabled();
    expect(screen.getByTestId(`fd-row-${direct.id}-checkin-btn`)).toBeDisabled();
  });
  test('clicking Cancel/No-Show/Modify opens the matching expansion kind', () => {
    const onOpen = jest.fn();
    render(<ArrivalsPanel rows={[direct, ota]} meta={snap.meta} chip="late" onChip={noop} expandedId={null} onToggle={noop} onOpen={onOpen} onDone={noop} />);
    fireEvent.click(screen.getByTestId(`fd-row-${direct.id}-cancel-btn`));
    fireEvent.click(screen.getByTestId(`fd-row-${ota.id}-noshow-btn`));
    fireEvent.click(screen.getByTestId(`fd-row-${direct.id}-modify-btn`));
    expect(onOpen.mock.calls).toEqual([[direct.id, 'cancel'], [ota.id, 'noshow'], [direct.id, 'modify']]);
  });
  test('cancel expansion renders inline dialog + outcome card; noshow expansion the same for OTA', async () => {
    render(<ArrivalsPanel rows={[direct]} meta={snap.meta} chip="late" onChip={noop} expandedId={direct.id} expandedKind="cancel" onToggle={noop} onOpen={noop} onDone={noop} cancelledBy="Owner" />);
    expect(screen.getByTestId('outcome-card')).toBeInTheDocument();
    expect(screen.getByTestId('outcome-phase2-ribbon')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-booking-dialog').className).not.toMatch(/\bfixed\b/);
    await waitFor(() => expect(screen.getByTestId('cancel-reason-select')).toBeInTheDocument());
  });
});

describe('CR-385 M2 D2 inline dialogs render without the fixed overlay', () => {
  const cancelTarget = { reservationId: 1, guestName: 'G', channel: 'Direct', checkin: '2026-09-20', checkout: '2026-09-21', roomCode: 'exec', advance: 0, cancelledBy: 'staff' };
  const noShowTarget = { bookingId: 'BDC1', guestName: 'G', channel: 'booking.com', checkin: '2026-09-20', roomCode: 'exec' };
  test('CancelBookingDialog: inline → no "fixed"; default → "fixed inset-0"', () => {
    const { unmount } = render(<CancelBookingDialog inline target={cancelTarget} onClose={noop} />);
    expect(screen.getByTestId('cancel-booking-dialog').className).not.toMatch(/\bfixed\b/);
    unmount();
    render(<CancelBookingDialog target={cancelTarget} onClose={noop} />);
    expect(screen.getByTestId('cancel-booking-dialog').className).toMatch(/\bfixed\b.*inset-0/);
  });
  test('NoShowDialog: inline → no "fixed" + no backdrop; default → "fixed inset-0"', () => {
    const { unmount } = render(<NoShowDialog inline target={noShowTarget} onClose={noop} onSuccess={noop} />);
    const ov = screen.getByTestId('noshow-overlay');
    expect(ov.className).not.toMatch(/\bfixed\b/);
    expect(ov.getAttribute('style')).toBeNull();
    unmount();
    render(<NoShowDialog target={noShowTarget} onClose={noop} onSuccess={noop} />);
    expect(screen.getByTestId('noshow-overlay').className).toMatch(/\bfixed\b.*inset-0/);
  });
});

describe('CR-385 M2 BUG-440 Cancel dialog reads the service shape { reasons: [{ reasonId, reasonText }] }', () => {
  const target = { reservationId: 222, guestName: 'QA', channel: 'Direct', checkin: '2026-09-21', checkout: '2026-09-22', roomCode: 'suite', advance: 0, cancelledBy: 'Owner' };
  test('option renders, Confirm enables after selection, cancelReservation gets reason text', async () => {
    const onSuccess = jest.fn();
    render(<CancelBookingDialog inline target={target} onClose={noop} onSuccess={onSuccess} />);
    const opt = await screen.findByRole('option', { name: 'guest cancelled' });
    expect(opt).toHaveValue('411');
    expect(screen.getByTestId('cancel-booking-confirm-btn')).toBeDisabled();
    fireEvent.change(screen.getByTestId('cancel-reason-select'), { target: { value: '411' } });
    expect(screen.getByTestId('cancel-booking-confirm-btn')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('cancel-booking-confirm-btn'));
    await waitFor(() => expect(pms.cancelReservation).toHaveBeenCalledWith(222, { reason: 'guest cancelled', cancelledBy: 'Owner' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
  test('legacy array shape / error → empty list, Confirm stays disabled (no crash)', async () => {
    settings.getCancellationReasons.mockRejectedValueOnce(new Error('500'));
    render(<CancelBookingDialog target={target} onClose={noop} />);
    await waitFor(() => expect(screen.getByTestId('cancel-reason-select').options).toHaveLength(1));
    expect(screen.getByTestId('cancel-booking-confirm-btn')).toBeDisabled();
  });
});

describe('CR-385 M2 legacy ArrivalsPage untouched (overlay dialogs, no inline prop)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../../pages/pms/ArrivalsPage.jsx'), 'utf8');
  const block = (tag) => src.slice(src.indexOf(`<${tag}`), src.indexOf('/>', src.indexOf(`<${tag}`)) + 2);
  test('NoShowDialog + CancelBookingDialog usages snapshot; neither passes inline', () => {
    const usages = { noShow: block('NoShowDialog'), cancel: block('CancelBookingDialog') };
    expect(usages).toMatchSnapshot();
    expect(usages.noShow).not.toMatch(/\binline\b/);
    expect(usages.cancel).not.toMatch(/\binline\b/);
    expect(src).not.toMatch(/CR-385/);
  });
});
