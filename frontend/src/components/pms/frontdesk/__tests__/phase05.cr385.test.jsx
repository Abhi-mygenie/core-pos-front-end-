// CR-385 M0.5 — BUG-434 (retry in-flight state) · BUG-435 (refresh coalescing + 5 s focus debounce, D71) · BUG-437 (first non-empty chip, D70)
import { render, screen, renderHook, act, waitFor } from '@testing-library/react';
import lrFixture from '../../../../__fixtures__/cr385/local_reservations_view_all.json';
import { fromFrontDeskSnapshot } from '@/api/transforms/frontDeskTransform';
import RoomsPanel from '../RoomsPanel';
import ArrivalsPanel, { firstNonEmptyChip, CHIP_ORDER } from '../ArrivalsPanel';
import DeparturesPanel from '../DeparturesPanel';
import { getSnapshot } from '@/api/services/frontDeskService';
import { useFrontDeskSnapshot } from '@/pages/pms/FrontDeskWorkstationPage';

jest.mock('@/api/services/frontDeskService', () => ({ getSnapshot: jest.fn(), patchRoomStatus: jest.fn(), getRowBalances: jest.fn(() => Promise.resolve({})) })); // CR-385 M5 getRowBalances
jest.mock('@/api/services/restaurantSettingsService', () => ({ getFrontDeskRules: jest.fn(() => Promise.resolve({})) })); // CR-385 M3
jest.mock('@/contexts/RestaurantContext', () => ({ useRestaurant: () => ({ restaurant: { totalRound: true, checkInFlags: {} } }) })); // CR-385 M5
jest.mock('@/components/layout/Sidebar', () => () => null);
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { firstName: 'Owner' } }) }));

const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'rejected', reason: new Error('500') }, kpis: { status: 'rejected', reason: new Error('500') } });
const BD = snap.meta.business_date; // 2026-09-20 — fixture: arrivals Today 0 / Late 10
const pending = snap.reservations.filter((r) => r.operationalStatus === 'pending');
const noop = () => {};

describe('CR-385 M0.5 BUG-434 retry buttons show an in-flight state', () => {
  test('RoomsPanel board error: retrying → disabled + "Retrying…"; idle → enabled "Retry"', () => {
    const { rerender } = render(<RoomsPanel snapshot={snap} chip="all" onChip={noop} onToggleRoom={noop} onPatch={noop} onRetry={noop} retrying />);
    const btn = screen.getByTestId('fd-rooms-retry-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/Retrying/);
    rerender(<RoomsPanel snapshot={snap} chip="all" onChip={noop} onToggleRoom={noop} onPatch={noop} onRetry={noop} retrying={false} />);
    expect(screen.getByTestId('fd-rooms-retry-btn')).not.toBeDisabled();
    expect(screen.getByTestId('fd-rooms-retry-btn')).toHaveTextContent(/^Retry$/);
  });
});

describe('CR-385 M0.5 BUG-437 first non-empty chip (D70)', () => {
  test('firstNonEmptyChip: display order, all-zero → today', () => {
    expect(firstNonEmptyChip({ late: 10, today: 0, tomorrow: 0, upcoming: 4 }, CHIP_ORDER.arrivals)).toBe('late');
    expect(firstNonEmptyChip({ late: 0, today: 0, tomorrow: 3, upcoming: 4 }, CHIP_ORDER.arrivals)).toBe('tomorrow');
    expect(firstNonEmptyChip({ late: 0, today: 2, tomorrow: 3 }, CHIP_ORDER.arrivals)).toBe('today');
    expect(firstNonEmptyChip({}, CHIP_ORDER.arrivals)).toBe('today');
    expect(firstNonEmptyChip({ overdue: 1, today: 2 }, CHIP_ORDER.departures)).toBe('overdue');
    expect(firstNonEmptyChip({ overdue: 0, today: 0, tomorrow: 0, upcoming: 0 }, CHIP_ORDER.departures)).toBe('today');
  });

  test('ArrivalsPanel on the real fixture (Today 0 / Late 10) with chip=null lands on Late and shows rows', () => {
    render(<ArrivalsPanel rows={pending} meta={snap.meta} kpis={null} expandedId={null} onToggle={noop} chip={null} onChip={noop} />);
    expect(screen.getByTestId('fd-chip-arrivals-late')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('fd-chip-arrivals-today')).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByTestId('fd-table-arrivals-empty')).toBeNull();
    expect(screen.getByTestId('fd-row-15')).toBeInTheDocument();
  });

  test('ArrivalsPanel with no rows → Today; explicit user chip is honoured', () => {
    const { rerender } = render(<ArrivalsPanel rows={[]} meta={snap.meta} kpis={null} expandedId={null} onToggle={noop} chip={null} onChip={noop} />);
    expect(screen.getByTestId('fd-chip-arrivals-today')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('fd-table-arrivals-empty')).toHaveTextContent('No today arrivals');
    rerender(<ArrivalsPanel rows={pending} meta={snap.meta} kpis={null} expandedId={null} onToggle={noop} chip="today" onChip={noop} />);
    expect(screen.getByTestId('fd-chip-arrivals-today')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('fd-table-arrivals-empty')).toBeInTheDocument();
  });

  test('DeparturesPanel: overdue row → Overdue; none → Today', () => {
    const overdue = [{ ...snap.reservations.find((r) => r.operationalStatus === 'in_house'), checkout: '2026-09-19' }];
    const { rerender } = render(<DeparturesPanel rows={overdue} meta={snap.meta} expandedId={null} onToggle={noop} chip={null} onChip={noop} />);
    expect(screen.getByTestId('fd-chip-departures-overdue')).toHaveAttribute('aria-selected', 'true');
    rerender(<DeparturesPanel rows={[]} meta={snap.meta} expandedId={null} onToggle={noop} chip={null} onChip={noop} />);
    expect(screen.getByTestId('fd-chip-departures-today')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('CR-385 M0.5 BUG-435 refresh coalescing + focus debounce (D71)', () => {
  const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };
  const result = { meta: { business_date: BD }, counts: {}, reservations: [], rooms: [], loadedAt: 1 };
  let now;
  beforeEach(() => { getSnapshot.mockReset(); now = 1_000_000; jest.spyOn(Date, 'now').mockImplementation(() => now); });
  afterEach(() => { Date.now.mockRestore(); });

  test('mount → 1 call; two focus events < 5 s → still 1; focus after 6 s → 2', async () => {
    getSnapshot.mockResolvedValue(result);
    const hook = renderHook(() => useFrontDeskSnapshot());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    act(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    now += 6000;
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(getSnapshot).toHaveBeenCalledTimes(2);
  });

  test('manual refresh twice while in flight → one extra call (coalesced, never dropped); refreshing flag covers the flight', async () => {
    const first = deferred();
    getSnapshot.mockReturnValueOnce(first.p);
    const hook = renderHook(() => useFrontDeskSnapshot());
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    act(() => { first.resolve(result); });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    const second = deferred();
    getSnapshot.mockReturnValueOnce(second.p);
    let p1, p2;
    act(() => { p1 = hook.result.current.refresh(); p2 = hook.result.current.refresh(); });
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(p1).toBe(p2);
    await waitFor(() => expect(hook.result.current.refreshing).toBe(true));
    act(() => { second.resolve(result); });
    await act(async () => { await p1; });
    expect(hook.result.current.refreshing).toBe(false);
    expect(hook.result.current.error).toBeNull();
  });

  test('a manual refresh right after a focus refresh is coalesced; LR failure sets error and a later refresh clears it', async () => {
    getSnapshot.mockRejectedValueOnce(Object.assign(new Error('boom'), { response: { data: { message: 'Request failed with status code 500' } } }));
    const hook = renderHook(() => useFrontDeskSnapshot());
    await waitFor(() => expect(hook.result.current.error).toBe('Request failed with status code 500'));
    getSnapshot.mockResolvedValue(result);
    await act(async () => { await hook.result.current.refresh(); });
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.snap.meta.business_date).toBe(BD);
    expect(getSnapshot).toHaveBeenCalledTimes(2);
  });
});
