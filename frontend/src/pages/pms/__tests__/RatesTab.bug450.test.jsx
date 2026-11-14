// BUG-450 — Inventory Restrictions room types come from the fetched rateplans (never a literal list); labels from Room Mapping name ?? code.
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RatesTab from '../RatesTab';

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/api/services/pmsService', () => ({
  getRatesData: jest.fn(), pushRatesData: jest.fn(), pushInvRestrictionsData: jest.fn(), pushRateRestrictionsData: jest.fn(),
  localDate: () => '2026-09-22',
}));
const pms = require('@/api/services/pmsService');
const { toast } = require('sonner');

const plans = (codes) => codes.flatMap((c) => [{ roomCode: c, rateplanCode: `${c}-s-ep` }, { roomCode: c, rateplanCode: `${c}-d-cp` }]);
const armRates = (codes) => pms.getRatesData.mockResolvedValue({ rateplans: plans(codes), dateRateMap: { '2026-09-22': {} }, dates: ['2026-09-22'] });

const openInv = async (props) => {
  const utils = render(<RatesTab {...props} />);
  await waitFor(() => expect(pms.getRatesData).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByTestId('rt-rates-grid')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('rt-subtab-inv'));
  await waitFor(() => expect(screen.getByTestId('rt-inv-form')).toBeInTheDocument());
  return utils;
};

beforeEach(() => { pms.pushInvRestrictionsData.mockResolvedValue({}); });

describe('BUG-450 — Inventory Restrictions room types derive from rateplans', () => {
  test('2-code property (non-view-room / road-view-room): two cards, real codes in payload, no literal executive/suite', async () => {
    armRates(['non-view-room', 'road-view-room']);
    await openInv();
    expect(screen.getByTestId('rt-inv-card-non-view-room')).toBeInTheDocument();
    expect(screen.getByTestId('rt-inv-card-road-view-room')).toBeInTheDocument();
    expect(screen.queryByText('Executive Room')).toBeNull();
    expect(screen.queryByText('Suite')).toBeNull();
    expect(screen.getByTestId('rt-inv-label-non-view-room').textContent).toBe('non-view-room'); // no catalogue → code
    fireEvent.click(screen.getByTestId('rt-inv-non-view-room-stop_sell'));
    fireEvent.click(screen.getByTestId('rt-inv-push-btn'));
    await waitFor(() => expect(pms.pushInvRestrictionsData).toHaveBeenCalledTimes(1));
    const body = pms.pushInvRestrictionsData.mock.calls[0][0];
    expect(body.rooms.map((r) => r.room_code)).toEqual(['non-view-room', 'road-view-room']);
    expect(body.rooms[0].restrictions).toEqual({ stop_sell: true });
    expect(body.rooms[1].restrictions).toEqual({});
    expect(JSON.stringify(body)).not.toMatch(/executive|suite/);
  });

  test('3-code property: three cards, three payload rows; labels from Room Mapping roomName', async () => {
    armRates(['a-room', 'b-room', 'c-room']);
    await openInv({ aiosellRooms: [{ roomCode: 'a-room', roomName: 'Garden View' }, { roomCode: 'c-room', roomName: 'Penthouse' }] });
    expect(screen.getAllByTestId(/^rt-inv-card-/)).toHaveLength(3);
    expect(screen.getByTestId('rt-inv-label-a-room').textContent).toBe('Garden View');
    expect(screen.getByTestId('rt-inv-label-b-room').textContent).toBe('b-room'); // unmapped → code, never a literal
    expect(screen.getByTestId('rt-inv-label-c-room').textContent).toBe('Penthouse');
    fireEvent.change(screen.getByTestId('rt-inv-b-room-minimum_stay'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('rt-inv-push-btn'));
    await waitFor(() => expect(pms.pushInvRestrictionsData).toHaveBeenCalledTimes(1));
    const body = pms.pushInvRestrictionsData.mock.calls[0][0];
    expect(body.rooms).toHaveLength(3);
    expect(body.rooms.find((r) => r.room_code === 'b-room').restrictions).toEqual({ minimum_stay: 3 });
  });

  test('1-code property: exactly one card, no phantom second room in the payload', async () => {
    armRates(['only-room']);
    await openInv();
    expect(screen.getAllByTestId(/^rt-inv-card-/)).toHaveLength(1);
    fireEvent.click(screen.getByTestId('rt-inv-only-room-close_on_arrival'));
    fireEvent.click(screen.getByTestId('rt-inv-push-btn'));
    await waitFor(() => expect(pms.pushInvRestrictionsData).toHaveBeenCalledTimes(1));
    expect(pms.pushInvRestrictionsData.mock.calls[0][0].rooms).toEqual([{ room_code: 'only-room', restrictions: { close_on_arrival: true } }]);
  });

  test('TGK regression: executive/suite property still renders two cards and pushes both codes', async () => {
    armRates(['executive', 'suite']);
    await openInv({ aiosellRooms: [{ roomCode: 'executive', roomName: 'Executive Room' }, { roomCode: 'suite', roomName: 'Suite' }] });
    expect(screen.getByTestId('rt-inv-label-executive').textContent).toBe('Executive Room');
    expect(screen.getByTestId('rt-inv-label-suite').textContent).toBe('Suite');
    fireEvent.click(screen.getByTestId('rt-inv-suite-close_on_departure'));
    fireEvent.click(screen.getByTestId('rt-inv-push-btn'));
    await waitFor(() => expect(pms.pushInvRestrictionsData).toHaveBeenCalledTimes(1));
    expect(pms.pushInvRestrictionsData.mock.calls[0][0].rooms.map((r) => r.room_code)).toEqual(['executive', 'suite']);
  });

  test('0 room types (rates not loaded): empty state, push disabled, no request', async () => {
    pms.getRatesData.mockResolvedValue({ rateplans: [], dateRateMap: {}, dates: [] });
    await openInv();
    expect(screen.getByTestId('rt-inv-empty').textContent).toMatch(/Load rates first/);
    expect(screen.getByTestId('rt-inv-push-btn')).toBeDisabled();
    expect(pms.pushInvRestrictionsData).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test('Rates grid group headers use roomName ?? code — never "Suite" for a foreign code', async () => {
    armRates(['non-view-room', 'road-view-room']);
    render(<RatesTab aiosellRooms={[{ roomCode: 'road-view-room', roomName: 'Road View' }]} />);
    await waitFor(() => expect(screen.getByText('Road View')).toBeInTheDocument());
    expect(screen.getAllByText('non-view-room').length).toBeGreaterThan(0);
    expect(screen.queryByText('Suite')).toBeNull();
    expect(screen.queryByText('Executive Room')).toBeNull();
  });

  test('guard grep: no executive/suite literals left in RatesTab.jsx', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../RatesTab.jsx'), 'utf8');
    expect(src).not.toMatch(/['"]executive['"]|['"]suite['"]|Executive Room/);
    expect(src).toContain('// BUG-450');
  });
});
