// CR-385 M0 — frontDeskTransform on the REAL probe fixtures (evidence/CR-385/probes_2026_09_20_g4_09, business_date 2026-09-20)
import lrFixture from '../../../__fixtures__/cr385/local_reservations_view_all.json';
import boardFixture from '../../../__fixtures__/cr385/room_status_board.json';
import kpisFixture from '../../../__fixtures__/cr385/dashboard_kpis.json';
import { fromRoomStatusBoard } from '../roomStatusTransform';
import {
  normaliseTitle, plusDays, dayDiff, fromReservation, bucketArrival, bucketDeparture, bucketInHouse,
  nsOrCancel, isCleared, badgeFor, groupRooms, isTurn, fromFrontDeskSnapshot, isOta,
} from '../frontDeskTransform';

const BD = '2026-09-20';
const board = fromRoomStatusBoard(boardFixture);
const snap = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'fulfilled', value: board }, kpis: { status: 'fulfilled', value: kpisFixture } });

describe('CR-385 M0 frontDeskTransform', () => {
  test('counts pass through untouched (AC-12): 10 late / 2 in-house / 2 arrived', () => {
    expect(snap.meta.business_date).toBe(BD);
    expect(snap.counts.arrivals_late).toBe(10);
    expect(snap.counts.in_house).toBe(2);
    expect(snap.counts.arrived_today).toBe(2);
    expect(snap.reservations).toHaveLength(80);
  });

  test('normaliseTitle on the 5 raw board titles (incl. double space) + null', () => {
    expect(boardFixture.data.rooms.map((r) => normaliseTitle(r.title))).toEqual(['3rd Floor', '2nd Floor', 'First Floor', 'Ground Floor', 'Patal Lok']);
    expect(normaliseTitle(null)).toBe('No section');
    expect(normaliseTitle('  ')).toBe('No section');
  });

  test('pure date helpers', () => {
    expect(plusDays(BD, 1)).toBe('2026-09-21');
    expect(plusDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(plusDays(BD, -30)).toBe('2026-08-21');
    expect(dayDiff('2026-09-18', BD)).toBe(2);
  });

  test('bucketArrival late / today / tomorrow / upcoming vs business_date', () => {
    expect(bucketArrival({ checkin: '2026-09-10' }, BD)).toBe('late');
    expect(bucketArrival({ checkin: BD }, BD)).toBe('today');
    expect(bucketArrival({ checkin: '2026-09-21' }, BD)).toBe('tomorrow');
    expect(bucketArrival({ checkin: '2026-10-10' }, BD)).toBe('upcoming');
    const pending = snap.reservations.filter((r) => r.operationalStatus === 'pending');
    expect(pending.filter((r) => bucketArrival(r, BD) === 'late')).toHaveLength(snap.counts.arrivals_late);
  });

  test('bucketDeparture + bucketInHouse', () => {
    expect(bucketDeparture({ checkout: '2026-09-19' }, BD)).toBe('overdue');
    expect(bucketDeparture({ checkout: BD }, BD)).toBe('today');
    expect(bucketDeparture({ checkout: '2026-09-21' }, BD)).toBe('tomorrow');
    expect(bucketInHouse({ checkin: BD, checkout: '2026-09-22', checkedInAt: '2026-09-20 10:00:00' }, BD)).toBe('arrived');
    expect(bucketInHouse({ checkin: '2026-09-18', checkout: BD }, BD)).toBe('leaving');
    expect(bucketInHouse({ checkin: '2026-09-18', checkout: '2026-09-25' }, BD)).toBe('stayover');
  });

  test('nsOrCancel: Direct / WalkIn → cancel, booking.com → noshow (AC-13)', () => {
    expect(isOta('Direct')).toBe(false);
    expect(nsOrCancel(fromReservation({ channel: 'Direct' }))).toBe('cancel');
    expect(nsOrCancel(fromReservation({ channel: 'WalkIn' }))).toBe('cancel');
    expect(nsOrCancel(fromReservation({ channel: 'booking.com' }))).toBe('noshow');
  });

  test('isCleared: paid + 0 → true; paid + 950 → false; unpaid + 0 → false (X-02)', () => {
    expect(isCleared(fromReservation({ rooms: [{ order_payment_status: 'paid' }], charge: { balance_due: 0 } }))).toBe(true);
    expect(isCleared(fromReservation({ rooms: [{ order_payment_status: 'paid' }], charge: { balance_due: 950 } }))).toBe(false);
    expect(isCleared(fromReservation({ rooms: [{ order_payment_status: 'unpaid' }], charge: { balance_due: 0 } }))).toBe(false);
  });

  test('badgeFor priority: prepaid > pah > advance > null; advance hidden on departed (D48-b/D50)', () => {
    expect(badgeFor({ pah: true, charge: { prepaid_amount: 100, advance_payment: 50 } })).toEqual({ kind: 'prepaid' });
    expect(badgeFor({ pah: true, charge: { prepaid_amount: 0, advance_payment: 50 } })).toEqual({ kind: 'pah' });
    expect(badgeFor({ pah: false, operationalStatus: 'pending', charge: { prepaid_amount: 0, advance_payment: 1000 } })).toEqual({ kind: 'advance', amount: 1000 });
    expect(badgeFor({ pah: false, operationalStatus: 'departed', charge: { prepaid_amount: 0, advance_payment: 1000 } })).toBeNull();
    expect(badgeFor({ pah: false, charge: { prepaid_amount: 0, advance_payment: 0 } })).toBeNull();
  });

  test('fromReservation never reads forbidden legacy fields (X-01)', () => {
    const raw = lrFixture.data.reservations[0];
    const row = fromReservation(raw);
    expect(row.charge).toBe(raw.charge);
    expect(row).not.toHaveProperty('balancePayment');
    expect(row).not.toHaveProperty('amountAfterTax');
    expect(JSON.stringify(row)).not.toMatch(/balance_payment|amount_after_tax|amount_before_tax/);
    expect(row.orderPaymentStatus).toBe(raw.rooms[0].order_payment_status);
  });

  test('groupRooms by area → 5 groups incl. "First Floor"; by number → single group sorted', () => {
    const groups = groupRooms(board.rooms, 'area');
    expect(groups.map((g) => g.key)).toEqual(['2nd Floor', '3rd Floor', 'First Floor', 'Ground Floor', 'Patal Lok']);
    expect(groupRooms(board.rooms, 'number')).toHaveLength(1);
    expect(groupRooms(board.rooms, 'number')[0].rooms.map((r) => r.tableNo)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
  });

  test('isTurn: departing today AND arriving today on the same table (D42)', () => {
    const room = { id: 8525 };
    const rows = [
      { tableId: 8525, operationalStatus: 'in_house', checkout: BD },
      { tableId: 8525, operationalStatus: 'pending', checkin: BD },
    ];
    expect(isTurn(room, rows, BD)).toBe(true);
    expect(isTurn(room, rows.slice(0, 1), BD)).toBe(false);
  });

  test('isTurn on a live-shaped snapshot: real board room + fromReservation rows (CR-385 M0.5 BUG-438, A5)', () => {
    expect(snap.rooms.filter((r) => isTurn(r, snap.reservations, BD))).toHaveLength(0); // real fixture: Turns today 0 (QA A5)
    const r4 = snap.rooms.find((r) => r.tableNo === 'r4');
    const [inHouseRaw] = lrFixture.data.reservations.filter((r) => r.operational_status === 'in_house');
    const [pendingRaw] = lrFixture.data.reservations.filter((r) => r.operational_status === 'pending');
    const leaving = fromReservation({ ...inHouseRaw, checkout: BD, rooms: [{ ...inHouseRaw.rooms[0], restaurant_table_id: r4.id }] });
    const arriving = fromReservation({ ...pendingRaw, checkin: BD, rooms: [{ ...pendingRaw.rooms[0], restaurant_table_id: r4.id }] });
    const rows = [...snap.reservations, leaving, arriving];
    expect(leaving.tableId).toBe(r4.id);
    expect(isTurn(r4, rows, BD)).toBe(true);
    expect(snap.rooms.filter((r) => isTurn(r, rows, BD)).map((r) => r.tableNo)).toEqual(['r4']);
    expect(isTurn(r4, [...snap.reservations, leaving], BD)).toBe(false);
    expect(isTurn(r4, [...snap.reservations, { ...leaving, checkout: plusDays(BD, 1) }, arriving], BD)).toBe(false);
  });

  test('snapshot with board rejected → boardError true, rooms [] ; kpis pass-through', () => {
    const s = fromFrontDeskSnapshot({ lr: lrFixture, board: { status: 'rejected', reason: new Error('500') }, kpis: { status: 'fulfilled', value: kpisFixture } });
    expect(s.boardError).toBe(true);
    expect(s.rooms).toEqual([]);
    expect(s.kpis.today.occupancy_percent_physical).toBe(40);
    expect(snap.boardError).toBe(false);
    expect(snap.boardCounts.all).toBe(5);
    expect(snap.boardMeta.business_date).toBe(BD);
  });

  test('roomStatusTransform additive fields on the new board payload (O-6 / G-52)', () => {
    expect(board.meta.business_date).toBe(BD);
    expect(board.rooms[0].isOccupied).toBe(true);
    expect(board.rooms[0].guest.phone).toBe('8887765723');
    expect(board.rooms.every((r) => 'hkAssignee' in r)).toBe(true);
    expect(fromRoomStatusBoard({ data: { rooms: [] } }).meta).toBeNull();
  });
});
