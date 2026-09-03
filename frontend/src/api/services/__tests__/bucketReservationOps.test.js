/**
 * CR-358-P3 Gate 5b — Unit Tests for bucketReservationOps
 * V-U1: arrivalsToday ⊆ pending ∧ checkin === today
 * V-U2: arrivalsLate ⊆ pending ∧ checkin < today
 * V-U3: depOverdue ⊆ inHouse ∧ checkout < today
 * V-U4: depCheckedOut ⊆ departed (sorted newest first)
 *
 * Runs with plain Node — inlined pure function from pmsService.js
 */

// ─── Pure function copy (identical to pmsService.js L172..L193) ──
const bucketReservationOps = (list, today) => {
  const pending  = list.filter(r => r.operationalStatus === 'pending');
  const inHouse  = list.filter(r => r.operationalStatus === 'in_house');
  const departed = list.filter(r => r.operationalStatus === 'departed');
  const byCheckin  = (a, b) => String(a.checkin).localeCompare(String(b.checkin)) || a.guestName.localeCompare(b.guestName);
  const dayOf = (ts) => (ts ? String(ts).slice(0, 10) : null);
  const lines = (src) => src.flatMap(r => r.roomLines.map(l => ({ ...r, line: l, orderId: l.orderId, tableNo: l.tableNo, paymentStatus: l.paymentStatus })));
  const byCheckout = (a, b) => String(a.checkout).localeCompare(String(b.checkout));
  return {
    arrivalsToday:    pending.filter(r => r.checkin === today).sort(byCheckin),
    arrivalsUpcoming: pending.filter(r => r.checkin >  today).sort(byCheckin),
    arrivalsLate:     pending.filter(r => r.checkin <  today).sort(byCheckin),
    checkedInToday:   inHouse.filter(r => r.checkin === today || dayOf(r.checkedInAt) === today).sort(byCheckin),
    inHouse,
    depOverdue:       lines(inHouse).filter(x => x.checkout <  today).sort(byCheckout),
    depDueToday:      lines(inHouse).filter(x => x.checkout === today).sort(byCheckout),
    depUpcoming:      lines(inHouse).filter(x => x.checkout >  today).sort(byCheckout),
    depCheckedOut:    lines(departed).sort((a, b) => String(b.line.checkedOutAt ?? '').localeCompare(String(a.line.checkedOutAt ?? ''))),
    withSpecialRequests: pending.filter(r => (r.specialRequests ?? '').trim() !== '').length,
  };
};

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

// V-U1
const testU1 = () => {
  const list = [
    mkRes({ guestName: 'Today Arrival', checkin: TODAY, operationalStatus: 'pending' }),
    mkRes({ guestName: 'Future Arrival', checkin: '2026-09-10', operationalStatus: 'pending' }),
    mkRes({ guestName: 'In House Guest', checkin: TODAY, operationalStatus: 'in_house', checkout: '2026-09-05' }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.arrivalsToday.length === 1 && b.arrivalsToday[0].guestName === 'Today Arrival';
  console.log(`V-U1 arrivalsToday: ${pass ? 'PASS' : 'FAIL'} (${b.arrivalsToday.length} items, expected 1)`);
  return pass;
};

// V-U2
const testU2 = () => {
  const list = [
    mkRes({ guestName: 'Late Arrival', checkin: '2026-09-01', operationalStatus: 'pending' }),
    mkRes({ guestName: 'Today Arrival', checkin: TODAY, operationalStatus: 'pending' }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.arrivalsLate.length === 1 && b.arrivalsLate[0].guestName === 'Late Arrival';
  console.log(`V-U2 arrivalsLate: ${pass ? 'PASS' : 'FAIL'} (${b.arrivalsLate.length} items, expected 1)`);
  return pass;
};

// V-U3
const testU3 = () => {
  const list = [
    mkRes({ guestName: 'Overdue Guest', checkin: '2026-08-28', checkout: '2026-09-01', operationalStatus: 'in_house',
      roomLines: [{ lineId: 1, orderId: 200, tableNo: 'r2', paymentStatus: 'unpaid', checkedOutAt: null }] }),
    mkRes({ guestName: 'Due Today Guest', checkin: '2026-09-01', checkout: TODAY, operationalStatus: 'in_house',
      roomLines: [{ lineId: 2, orderId: 201, tableNo: 'r3', paymentStatus: null, checkedOutAt: null }] }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.depOverdue.length === 1 && b.depOverdue[0].guestName === 'Overdue Guest';
  console.log(`V-U3 depOverdue: ${pass ? 'PASS' : 'FAIL'} (${b.depOverdue.length} items, expected 1)`);
  return pass;
};

// V-U4
const testU4 = () => {
  const list = [
    mkRes({ guestName: 'Old Departure', operationalStatus: 'departed',
      roomLines: [{ lineId: 3, orderId: 300, tableNo: 'r1', paymentStatus: 'paid', checkedOutAt: '2026-09-03T10:00:00Z' }] }),
    mkRes({ guestName: 'New Departure', operationalStatus: 'departed',
      roomLines: [{ lineId: 4, orderId: 301, tableNo: 'r2', paymentStatus: 'paid', checkedOutAt: '2026-09-03T14:00:00Z' }] }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.depCheckedOut.length === 2 && b.depCheckedOut[0].guestName === 'New Departure';
  console.log(`V-U4 depCheckedOut sorted newest first: ${pass ? 'PASS' : 'FAIL'} (${b.depCheckedOut.length} items, first=${b.depCheckedOut[0]?.guestName})`);
  return pass;
};

// V-U5: withSpecialRequests count
const testU5 = () => {
  const list = [
    mkRes({ guestName: 'SR Guest 1', specialRequests: 'Extra pillow' }),
    mkRes({ guestName: 'SR Guest 2', specialRequests: '  ' }), // whitespace-only = no SR
    mkRes({ guestName: 'No SR', specialRequests: '' }),
    mkRes({ guestName: 'SR Guest 3', specialRequests: 'Late check-in' }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.withSpecialRequests === 2;
  console.log(`V-U5 withSpecialRequests: ${pass ? 'PASS' : 'FAIL'} (${b.withSpecialRequests}, expected 2)`);
  return pass;
};

// V-U6: checkedInToday includes in_house with checkedInAt on today
const testU6 = () => {
  const list = [
    mkRes({ guestName: 'Checked In Today', checkin: '2026-09-02', operationalStatus: 'in_house', checkedInAt: '2026-09-03T08:00:00Z', checkout: '2026-09-05' }),
    mkRes({ guestName: 'Checked In Yesterday', checkin: '2026-09-01', operationalStatus: 'in_house', checkedInAt: '2026-09-02T08:00:00Z', checkout: '2026-09-05' }),
  ];
  const b = bucketReservationOps(list, TODAY);
  const pass = b.checkedInToday.length === 1 && b.checkedInToday[0].guestName === 'Checked In Today';
  console.log(`V-U6 checkedInToday: ${pass ? 'PASS' : 'FAIL'} (${b.checkedInToday.length} items, expected 1)`);
  return pass;
};

const results = [testU1(), testU2(), testU3(), testU4(), testU5(), testU6()];
const allPass = results.every(Boolean);
console.log(`\n=== V-U SUMMARY: ${allPass ? 'ALL PASS' : 'FAILURES DETECTED'} (${results.filter(Boolean).length}/${results.length}) ===`);
process.exit(allPass ? 0 : 1);
