// CR-385 M0 — frontDeskService: LR window always sent (C2), LR reject → throws, board reject → snapshot still returned (OD-385-11)
jest.mock('../../axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('../pmsService', () => ({ patchRoomStatus: jest.fn(), bulkMarkClean: jest.fn() }));

import api from '../../axios';
import lrFixture from '../../../__fixtures__/cr385/local_reservations_view_all.json';
import boardFixture from '../../../__fixtures__/cr385/room_status_board.json';
import kpisFixture from '../../../__fixtures__/cr385/dashboard_kpis.json';
import { getSnapshot, getLocalReservationsAll } from '../frontDeskService';

const route = (impl) => api.get.mockImplementation((url, cfg) => impl(url, cfg));

describe('CR-385 M0 frontDeskService', () => {
  beforeEach(() => api.get.mockReset());

  test('LR called with start_date / end_date / view=all', async () => {
    route(() => Promise.resolve({ data: lrFixture }));
    await getLocalReservationsAll({ start: '2026-08-21', end: '2026-11-19' });
    const [url, cfg] = api.get.mock.calls[0];
    expect(url).toMatch(/local-reservations$/);
    expect(cfg.params).toEqual({ start_date: '2026-08-21', end_date: '2026-11-19', view: 'all' });
  });

  test('getSnapshot: all fulfilled → meta, counts, rooms, kpis', async () => {
    route((url) => {
      if (url.includes('local-reservations')) return Promise.resolve({ data: lrFixture });
      if (url.includes('room-status-board')) return Promise.resolve({ data: boardFixture });
      return Promise.resolve({ data: kpisFixture });
    });
    const s = await getSnapshot({ start: 'a', end: 'b', today: 't' });
    expect(s.meta.business_date).toBe('2026-09-20');
    expect(s.counts.arrivals_late).toBe(10);
    expect(s.rooms).toHaveLength(5);
    expect(s.boardError).toBe(false);
    expect(s.kpis.today.in_house_count).toBe(2);
    expect(api.get.mock.calls.find(([u]) => u.includes('dashboard-kpis'))[1].params).toEqual({ start_date: 't', end_date: 't' }); // KPI range capped at 31 days → single day
  });

  test('board rejected → boardError true, rooms [], reservations intact', async () => {
    route((url) => (url.includes('room-status-board') ? Promise.reject(new Error('500')) : Promise.resolve({ data: url.includes('kpis') ? kpisFixture : lrFixture })));
    const s = await getSnapshot({ start: 'a', end: 'b' });
    expect(s.boardError).toBe(true);
    expect(s.rooms).toEqual([]);
    expect(s.reservations).toHaveLength(80);
  });

  test('LR rejected → getSnapshot throws (page error F14)', async () => {
    route((url) => (url.includes('local-reservations') ? Promise.reject(new Error('LR 500')) : Promise.resolve({ data: boardFixture })));
    await expect(getSnapshot({ start: 'a', end: 'b' })).rejects.toThrow('LR 500');
  });
});
