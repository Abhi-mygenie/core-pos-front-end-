// CR-358-P4: Unit tests for buildTapeChart (T2)
// V-U4..U8: window/dates, unassigned, kinds, spans, groups

const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const dayDiff = (a, b) => Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
const blockKind = (line) => (line.lineStatus === 'checked_in' ? 'in_house' : line.lineStatus === 'checked_out' ? 'departed' : 'pending');

const buildTapeChart = ({ rooms, reservations, startDate, days, today }) => {
  const endExclusive = addDays(startDate, days);
  const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i));
  const byRoom = Object.fromEntries(rooms.map(r => [r.id, []]));
  const unassigned = [];
  reservations.forEach(res => {
    if (!res.checkin || !res.checkout) return;
    const ci = res.checkin, co = res.checkout <= res.checkin ? addDays(res.checkin, 1) : res.checkout;
    if (co <= startDate || ci >= endExclusive) return;
    const lines = (res.roomLines ?? []).filter(l => l.restaurantTableId != null);
    if (lines.length === 0) { if (res.operationalStatus === 'pending') unassigned.push(res); return; }
    lines.forEach(l => {
      if (!byRoom[l.restaurantTableId]) return;
      const s = ci < startDate ? startDate : ci;
      const e = co > endExclusive ? endExclusive : co;
      byRoom[l.restaurantTableId].push({
        key: `${res.bookingId ?? res.id}-${l.lineId}`, res, line: l, kind: blockKind(l),
        startIdx: dayDiff(startDate, s), span: Math.max(1, dayDiff(s, e)),
        clippedStart: ci < startDate, clippedEnd: co > endExclusive,
      });
    });
  });
  const rowStatus = Object.fromEntries(rooms.map(r => {
    const blocks = byRoom[r.id] ?? [];
    const covers = (b) => b.res.checkin <= today && today < (b.res.checkout <= b.res.checkin ? addDays(b.res.checkin, 1) : b.res.checkout);
    if (blocks.some(b => b.kind === 'in_house')) return [r.id, 'occupied'];
    if (blocks.some(b => b.kind === 'pending' && covers(b))) return [r.id, 'booked'];
    return [r.id, null];
  }));
  const groups = Object.values(rooms.reduce((acc, r) => {
    const k = r.roomType ?? 'unmapped';
    (acc[k] ??= { type: k, rooms: [] }).rooms.push(r);
    return acc;
  }, {})).map(g => ({ ...g, rooms: g.rooms.sort((a, b) => String(a.tableNo).localeCompare(String(b.tableNo), undefined, { numeric: true })) }));
  return { dates, byRoom, unassigned, rowStatus, groups, todayIdx: dayDiff(startDate, today) };
};

// Fixtures
const ROOMS = [
  { id: 8524, tableNo: 'r3', roomType: 'suite' },
  { id: 8525, tableNo: 'r4', roomType: 'suite' },
  { id: 8526, tableNo: 'r2', roomType: 'executive' },
  { id: 8527, tableNo: 'r5', roomType: 'suite' },
  { id: 8528, tableNo: 'r1', roomType: 'executive' },
];

const mkRes = (o) => ({
  bookingId: 'B001', guestName: 'Test', channel: 'Direct', checkin: '2026-09-03', checkout: '2026-09-04',
  nights: 1, operationalStatus: 'pending', roomCode: 'executive', amount: 1000, pah: true,
  roomLines: [{ lineId: 1, restaurantTableId: 8528, orderId: null, tableNo: 'r1', paymentStatus: null, lineStatus: 'pending', checkedInAt: null, checkedOutAt: null }],
  ...o,
});

const TC = { startDate: '2026-09-02', days: 7, today: '2026-09-04' };

// V-U4: window/dates/todayIdx
const testU4 = () => {
  const c = buildTapeChart({ rooms: ROOMS, reservations: [], ...TC });
  const checks = [
    c.dates.length === 7,
    c.dates[0] === '2026-09-02',
    c.dates[6] === '2026-09-08',
    c.todayIdx === 2,
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U4 window/dates: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// V-U5: unassigned
const testU5 = () => {
  const res = [
    mkRes({ bookingId: 'UNASSIGNED1', checkin: '2026-09-03', checkout: '2026-09-05', operationalStatus: 'pending', roomLines: [] }),
    mkRes({ bookingId: 'ASSIGNED1', checkin: '2026-09-03', checkout: '2026-09-04', roomLines: [{ lineId: 1, restaurantTableId: 8528, lineStatus: 'pending' }] }),
    mkRes({ bookingId: 'DEPARTED_NO_TABLE', checkin: '2026-09-01', checkout: '2026-09-02', operationalStatus: 'departed', roomLines: [] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const checks = [
    c.unassigned.length === 1,
    c.unassigned[0].bookingId === 'UNASSIGNED1',
    (c.byRoom[8528] ?? []).length === 1,
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U5 unassigned: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// V-U6: kinds + rowStatus
const testU6 = () => {
  const res = [
    mkRes({ bookingId: 'IN1', checkin: '2026-09-03', checkout: '2026-09-06', roomLines: [{ lineId: 1, restaurantTableId: 8526, lineStatus: 'checked_in' }] }),
    mkRes({ bookingId: 'DEP1', checkin: '2026-09-01', checkout: '2026-09-03', operationalStatus: 'departed', roomLines: [{ lineId: 2, restaurantTableId: 8528, lineStatus: 'checked_out' }] }),
    mkRes({ bookingId: 'PND1', checkin: '2026-09-04', checkout: '2026-09-05', roomLines: [{ lineId: 3, restaurantTableId: 8524, lineStatus: 'pending' }] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const checks = [
    c.byRoom[8526][0]?.kind === 'in_house',
    c.byRoom[8528][0]?.kind === 'departed',
    c.byRoom[8524][0]?.kind === 'pending',
    c.rowStatus[8526] === 'occupied',
    c.rowStatus[8524] === 'booked',
    c.rowStatus[8528] === null,   // departed doesn't set rowStatus
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U6 kinds/rowStatus: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) checks.forEach((c, i) => { if (!c) console.log(`  sub-check ${i} FAILED`); });
  return pass;
};

// V-U7: span + same-day
const testU7 = () => {
  const res = [
    mkRes({ bookingId: 'S3', checkin: '2026-09-03', checkout: '2026-09-06', roomLines: [{ lineId: 1, restaurantTableId: 8528, lineStatus: 'pending' }] }),
    mkRes({ bookingId: 'SAMEDAY', checkin: '2026-09-04', checkout: '2026-09-04', roomLines: [{ lineId: 2, restaurantTableId: 8526, lineStatus: 'pending' }] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const checks = [
    c.byRoom[8528][0]?.span === 3,
    c.byRoom[8526][0]?.span === 1,  // same-day → 1 night min
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U7 span/same-day: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// V-U8: groups + natural sort + unknown table id
const testU8 = () => {
  const res = [
    mkRes({ bookingId: 'UNK', checkin: '2026-09-03', checkout: '2026-09-04', roomLines: [{ lineId: 1, restaurantTableId: 9999, lineStatus: 'pending' }] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const execGroup = c.groups.find(g => g.type === 'executive');
  const suiteGroup = c.groups.find(g => g.type === 'suite');
  const checks = [
    execGroup?.rooms.length === 2,
    execGroup?.rooms[0].tableNo === 'r1',
    execGroup?.rooms[1].tableNo === 'r2',
    suiteGroup?.rooms.length === 3,
    suiteGroup?.rooms[0].tableNo === 'r3',
    // Unknown table 9999 → silently skipped
    (c.byRoom[9999] ?? []).length === 0,
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U8 groups/sort/unknown: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// Clipping test
const testClipping = () => {
  const res = [
    mkRes({ bookingId: 'CLIP', checkin: '2026-08-30', checkout: '2026-09-10', roomLines: [{ lineId: 1, restaurantTableId: 8528, lineStatus: 'pending' }] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const block = c.byRoom[8528][0];
  const checks = [
    block?.clippedStart === true,
    block?.clippedEnd === true,
    block?.startIdx === 0,
    block?.span === 7,
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U4b clipping: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// Exclusion test (outside window)
const testExclusion = () => {
  const res = [
    mkRes({ bookingId: 'BEFORE', checkin: '2026-08-25', checkout: '2026-08-28', roomLines: [{ lineId: 1, restaurantTableId: 8528, lineStatus: 'pending' }] }),
    mkRes({ bookingId: 'AFTER', checkin: '2026-09-15', checkout: '2026-09-17', roomLines: [{ lineId: 2, restaurantTableId: 8528, lineStatus: 'pending' }] }),
  ];
  const c = buildTapeChart({ rooms: ROOMS, reservations: res, ...TC });
  const pass = (c.byRoom[8528] ?? []).length === 0;
  console.log(`V-U4c exclusion: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

const results = [testU4(), testU5(), testU6(), testU7(), testU8(), testClipping(), testExclusion()];
const allPass = results.every(Boolean);
console.log(`\n=== buildTapeChart: ${allPass ? 'ALL PASS' : 'FAILURES'} (${results.filter(Boolean).length}/${results.length}) ===`);
process.exit(allPass ? 0 : 1);
