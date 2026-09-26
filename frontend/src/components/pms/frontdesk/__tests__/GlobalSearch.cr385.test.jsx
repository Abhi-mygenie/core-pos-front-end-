// CR-385 M0.5 BUG-438 — GlobalSearch: searchSnapshot on the REAL fixtures (phone suffix A6, room no., guest name, empty) + `/` focus / Esc clear
import { render, screen, fireEvent } from '@testing-library/react';
import lrFixture from '../../../../__fixtures__/cr385/local_reservations_view_all.json';
import boardFixture from '../../../../__fixtures__/cr385/room_status_board.json';
import kpisFixture from '../../../../__fixtures__/cr385/dashboard_kpis.json';
import { fromRoomStatusBoard } from '@/api/transforms/roomStatusTransform';
import { fromFrontDeskSnapshot } from '@/api/transforms/frontDeskTransform';
import GlobalSearch, { searchSnapshot } from '../GlobalSearch';

const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'fulfilled', value: fromRoomStatusBoard(boardFixture) }, kpis: { status: 'fulfilled', value: kpisFixture } });

describe('CR-385 M0.5 BUG-438 searchSnapshot', () => {
  test('phone suffix (last 4 digits) finds the in-house guest (A6) → In-house group, row 155', () => {
    const res = searchSnapshot(snap, '5723');
    const inhouse = res.filter((r) => r.group === 'inhouse');
    expect(inhouse).toHaveLength(1);
    expect(inhouse[0].go).toEqual({ tab: 'inhouse', chip: 'all', rowId: '155' });
    expect(inhouse[0].text).toMatch(/Room r3/);
  });

  test('room number "r4" → Rooms group with the tile id 8525', () => {
    const rooms = searchSnapshot(snap, 'r4').filter((r) => r.group === 'rooms');
    expect(rooms).toHaveLength(1);
    expect(rooms[0].go).toEqual({ tab: 'rooms', chip: 'all', roomId: '8525' });
  });

  test('guest name matches pending arrivals → Arriving group with the bucket chip of that row', () => {
    const arriving = searchSnapshot(snap, 'loki').filter((r) => r.group === 'arriving');
    expect(arriving.length).toBeGreaterThan(0);
    expect(arriving[0].go.tab).toBe('arrivals');
    expect(['late', 'today', 'tomorrow', 'upcoming']).toContain(arriving[0].go.chip);
  });

  test('empty / whitespace / no snapshot → []', () => {
    expect(searchSnapshot(snap, '')).toEqual([]);
    expect(searchSnapshot(snap, '   ')).toEqual([]);
    expect(searchSnapshot(null, 'r4')).toEqual([]);
    expect(searchSnapshot(snap, 'zzzz-no-match')).toEqual([]);
  });
});

describe('CR-385 M0.5 BUG-438 GlobalSearch component', () => {
  test('`/` focuses the input, typing shows grouped results, Esc clears, click navigates', () => {
    const onNavigate = jest.fn();
    render(<GlobalSearch snapshot={snap} onNavigate={onNavigate} />);
    const input = screen.getByTestId('fd-search-input');
    fireEvent.keyDown(window, { key: '/' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '5723' } });
    expect(screen.getByTestId('fd-search-results')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fd-search-result-inhouse-0'));
    expect(onNavigate).toHaveBeenCalledWith({ tab: 'inhouse', chip: 'all', rowId: '155' });
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { value: 'r4' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
    expect(screen.queryByTestId('fd-search-results')).toBeNull();
  });
});
