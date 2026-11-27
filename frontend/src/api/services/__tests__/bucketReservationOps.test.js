// CR-358-P3 Gate 5b — bucketReservationOps unit tests (V-U1..V-U6)
// BUG-382: rewritten as a real Jest suite importing the production function
// (previous version was a plain-Node script testing an inlined copy).
import { bucketReservationOps } from '../pmsService';

const TODAY = '2026-09-03';

const mkRes = (overrides = {}) => ({
  guestName: 'Test Guest',
  checkin: TODAY,
  checkout: TODAY,
  operationalStatus: 'pending',
  specialRequests: '',
  checkedInAt: null,
  roomLines: [{ lineId: 1, orderId: 100, tableNo: 'r1', paymentStatus: null, checkedOutAt: null }],
  ...overrides,
});

describe('CR-358-P3 | bucketReservationOps', () => {
  test('V-U1: arrivalsToday ⊆ pending ∧ checkin === today', () => {
    const b = bucketReservationOps([
      mkRes({ guestName: 'Today Arrival', checkin: TODAY }),
      mkRes({ guestName: 'Future Arrival', checkin: '2026-09-10' }),
      mkRes({ guestName: 'In House Guest', checkin: TODAY, operationalStatus: 'in_house', checkout: '2026-09-05' }),
    ], TODAY);
    expect(b.arrivalsToday.map(r => r.guestName)).toEqual(['Today Arrival']);
    expect(b.arrivalsUpcoming.map(r => r.guestName)).toEqual(['Future Arrival']);
  });

  test('V-U2: arrivalsLate ⊆ pending ∧ checkin < today', () => {
    const b = bucketReservationOps([
      mkRes({ guestName: 'Late Arrival', checkin: '2026-09-01' }),
      mkRes({ guestName: 'Today Arrival', checkin: TODAY }),
    ], TODAY);
    expect(b.arrivalsLate.map(r => r.guestName)).toEqual(['Late Arrival']);
  });

  test('V-U3: depOverdue ⊆ inHouse ∧ checkout < today', () => {
    const b = bucketReservationOps([
      mkRes({ guestName: 'Overdue Guest', checkin: '2026-08-28', checkout: '2026-09-01', operationalStatus: 'in_house',
        roomLines: [{ lineId: 1, orderId: 200, tableNo: 'r2', paymentStatus: 'unpaid', checkedOutAt: null }] }),
      mkRes({ guestName: 'Due Today Guest', checkin: '2026-09-01', checkout: TODAY, operationalStatus: 'in_house',
        roomLines: [{ lineId: 2, orderId: 201, tableNo: 'r3', paymentStatus: null, checkedOutAt: null }] }),
    ], TODAY);
    expect(b.depOverdue.map(r => r.guestName)).toEqual(['Overdue Guest']);
    expect(b.depDueToday.map(r => r.guestName)).toEqual(['Due Today Guest']);
    expect(b.depOverdue[0].orderId).toBe(200);
  });

  test('V-U4: depCheckedOut ⊆ departed, sorted newest first', () => {
    const b = bucketReservationOps([
      mkRes({ guestName: 'Old Departure', operationalStatus: 'departed',
        roomLines: [{ lineId: 3, orderId: 300, tableNo: 'r1', paymentStatus: 'paid', checkedOutAt: '2026-09-03T10:00:00Z' }] }),
      mkRes({ guestName: 'New Departure', operationalStatus: 'departed',
        roomLines: [{ lineId: 4, orderId: 301, tableNo: 'r2', paymentStatus: 'paid', checkedOutAt: '2026-09-03T14:00:00Z' }] }),
    ], TODAY);
    expect(b.depCheckedOut.map(r => r.guestName)).toEqual(['New Departure', 'Old Departure']);
  });

  test('V-U5: withSpecialRequests ignores blank/whitespace', () => {
    const b = bucketReservationOps([
      mkRes({ specialRequests: 'Extra pillow' }),
      mkRes({ specialRequests: '  ' }),
      mkRes({ specialRequests: '' }),
      mkRes({ specialRequests: 'Late check-in' }),
    ], TODAY);
    expect(b.withSpecialRequests).toBe(2);
  });

  test('V-U6: checkedInToday includes in_house with checkedInAt on today', () => {
    const b = bucketReservationOps([
      mkRes({ guestName: 'Checked In Today', checkin: '2026-09-02', operationalStatus: 'in_house', checkedInAt: '2026-09-03T08:00:00Z', checkout: '2026-09-05' }),
      mkRes({ guestName: 'Checked In Yesterday', checkin: '2026-09-01', operationalStatus: 'in_house', checkedInAt: '2026-09-02T08:00:00Z', checkout: '2026-09-05' }),
    ], TODAY);
    expect(b.checkedInToday.map(r => r.guestName)).toEqual(['Checked In Today']);
  });

  test('empty list → all buckets empty', () => {
    const b = bucketReservationOps([], TODAY);
    expect(b.arrivalsToday).toEqual([]);
    expect(b.inHouse).toEqual([]);
    expect(b.depCheckedOut).toEqual([]);
    expect(b.withSpecialRequests).toBe(0);
  });
});
