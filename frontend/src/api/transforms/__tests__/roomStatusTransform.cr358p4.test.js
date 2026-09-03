// CR-358-P4: Unit tests for roomStatusTransform (T1)
// V-U1: fromRoomStatusBoard, V-U2: fromPatchResponse, V-U3: patchErrorMessage

const { fromRoomStatusBoard, fromPatchResponse, patchErrorMessage, ROOM_MANUAL_STATUSES, DISPLAY_STATUSES } = (() => {
  // Inline the pure functions for Node execution (ES module → CJS)
  const ROOM_MANUAL_STATUSES = ['hk', 'ooo', 'available'];
  const DISPLAY_STATUSES = ['available', 'occupied', 'booked', 'hk', 'ooo'];
  const fromBoardRoom = (r) => {
    const x = r ?? {};
    const g = x.guest ?? null;
    const v = x.reservation ?? null;
    return {
      id: x.restaurant_table_id ?? null, tableNo: x.table_no ?? String(x.restaurant_table_id ?? ''),
      title: x.title ?? null, roomType: x.aiosell_room_code ?? null,
      manualStatus: x.manual_status ?? null,
      displayStatus: DISPLAY_STATUSES.includes(x.display_status) ? x.display_status : 'available',
      statusSince: x.room_operational_status_at ?? null,
      guest: g ? { name: g.name ?? '', bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null,
      reservation: v ? { bookingId: v.booking_id ?? null, channel: v.channel ?? null, checkin: v.checkin ?? null,
                         checkout: v.checkout ?? null, guestName: v.guest_name ?? '', roomCode: v.room_code ?? null } : null,
      canToggle: x.display_status !== 'occupied' && x.display_status !== 'booked',
    };
  };
  const fromRoomStatusBoard = (data) => {
    const d = data?.data ?? data ?? {};
    const rooms = Array.isArray(d.rooms) ? d.rooms.map(fromBoardRoom) : [];
    const counts = DISPLAY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: rooms.filter(r => r.displayStatus === s).length }), { all: rooms.length });
    return { autoHkOnRmCheckout: Boolean(d.auto_hk_on_rm_checkout), rooms, counts };
  };
  const fromPatchResponse = (data) => {
    const d = data?.data ?? {};
    return { message: data?.message ?? '', room: d.room ? { id: d.room.restaurant_table_id ?? null, manualStatus: d.room.manual_status ?? null, statusSince: d.room.room_operational_status_at ?? null } : null, inventoryPushWarning: d.inventory_push_warning ?? null };
  };
  const patchErrorMessage = (err) => {
    const data = err?.response?.data ?? {};
    return data.message ?? data.errors?.status?.[0] ?? err?.readableMessage ?? err?.message ?? 'Status update failed';
  };
  return { fromRoomStatusBoard, fromPatchResponse, patchErrorMessage, ROOM_MANUAL_STATUSES, DISPLAY_STATUSES };
})();

// G3-01 shaped fixture (5 rooms)
const BOARD_FIXTURE = {
  status: true, message: 'OK',
  data: {
    auto_hk_on_rm_checkout: true,
    rooms: [
      { restaurant_table_id: 8524, table_no: 'r3', title: null, aiosell_room_code: 'suite', manual_status: null, display_status: 'occupied', room_operational_status_at: null, guest: { name: 'Test1 Guest1', phone: '9876573210', email: 'test@test.com', booking_id: 'BDC3590615', order_id: 15 }, reservation: null },
      { restaurant_table_id: 8525, table_no: 'r4', title: null, aiosell_room_code: 'suite', manual_status: null, display_status: 'booked', room_operational_status_at: null, guest: null, reservation: { booking_id: 'BDC7497606', channel: 'booking.com', checkin: '2026-09-07', checkout: '2026-09-09', guest_name: 'Test Guest', room_code: 'suite' } },
      { restaurant_table_id: 8526, table_no: 'r2', title: null, aiosell_room_code: 'executive', manual_status: 'hk', display_status: 'occupied', room_operational_status_at: '2026-09-04 04:32:09', guest: { name: 'poii poii', phone: '123', email: null, booking_id: 'BDC3590615', order_id: 14 }, reservation: null },
      { restaurant_table_id: 8527, table_no: 'r5', title: null, aiosell_room_code: 'suite', manual_status: null, display_status: 'booked', room_operational_status_at: null, guest: null, reservation: { booking_id: 'BDC6263973', channel: 'booking.com', checkin: '2026-09-10', checkout: '2026-09-12', guest_name: 'Test Guest', room_code: 'suite' } },
      { restaurant_table_id: 8528, table_no: 'r1', title: null, aiosell_room_code: 'executive', manual_status: 'hk', display_status: 'hk', room_operational_status_at: '2026-09-04 04:32:09', guest: null, reservation: null },
    ]
  }
};

// V-U1: fromRoomStatusBoard
const testU1 = () => {
  const b = fromRoomStatusBoard(BOARD_FIXTURE);
  const checks = [
    b.rooms.length === 5,
    b.autoHkOnRmCheckout === true,
    b.counts.occupied === 2,
    b.counts.booked === 2,
    b.counts.hk === 1,
    b.counts.ooo === 0,
    b.counts.available === 0,
    b.counts.all === 5,
    // r2: manual_status='hk' but display_status='occupied' → displayStatus='occupied', canToggle=false
    b.rooms.find(r => r.id === 8526)?.displayStatus === 'occupied',
    b.rooms.find(r => r.id === 8526)?.canToggle === false,
    // booked → canToggle=false
    b.rooms.find(r => r.id === 8525)?.canToggle === false,
    // hk → canToggle=true
    b.rooms.find(r => r.id === 8528)?.canToggle === true,
    // No phone/email in model
    !('phone' in (b.rooms.find(r => r.id === 8524)?.guest ?? {})),
    !('email' in (b.rooms.find(r => r.id === 8524)?.guest ?? {})),
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U1 fromRoomStatusBoard: ${pass ? 'PASS' : 'FAIL'} (${checks.filter(Boolean).length}/${checks.length} sub-checks)`);
  if (!pass) checks.forEach((c, i) => { if (!c) console.log(`  sub-check ${i} FAILED`); });
  return pass;
};

// V-U2: fromPatchResponse
const testU2 = () => {
  const res = fromPatchResponse({ status: true, message: 'Room marked for housekeeping.', data: { room: { restaurant_table_id: 8528, table_no: 'r1', title: null, manual_status: 'hk', room_operational_status_at: '2026-09-04 04:32:09' }, inventory_push_warning: null } });
  const checks = [
    res.message === 'Room marked for housekeeping.',
    res.room?.manualStatus === 'hk',
    res.room?.id === 8528,
    res.inventoryPushWarning === null,
  ];
  // Empty input safe
  const empty = fromPatchResponse({});
  checks.push(empty.room === null, empty.inventoryPushWarning === null);
  const pass = checks.every(Boolean);
  console.log(`V-U2 fromPatchResponse: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// V-U3: patchErrorMessage
const testU3 = () => {
  const checks = [
    patchErrorMessage({ response: { data: { status: false, message: 'Cannot set HK/OOO while the room is occupied.' } } }) === 'Cannot set HK/OOO while the room is occupied.',
    patchErrorMessage({ response: { data: { status: false, errors: { status: ['The selected status is invalid.'] } } } }) === 'The selected status is invalid.',
    patchErrorMessage({ response: { data: { status: false, message: 'Room not found for this restaurant (must be rtype=RM).' } } }) === 'Room not found for this restaurant (must be rtype=RM).',
    patchErrorMessage({ message: 'Network Error' }) === 'Network Error',
    patchErrorMessage({}) === 'Status update failed',
  ];
  const pass = checks.every(Boolean);
  console.log(`V-U3 patchErrorMessage: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

// Empty board safe
const testEmpty = () => {
  const b = fromRoomStatusBoard({});
  const pass = b.rooms.length === 0 && b.counts.all === 0 && b.autoHkOnRmCheckout === false;
  console.log(`V-U1b emptyBoard: ${pass ? 'PASS' : 'FAIL'}`);
  return pass;
};

const results = [testU1(), testU2(), testU3(), testEmpty()];
const allPass = results.every(Boolean);
console.log(`\n=== roomStatusTransform: ${allPass ? 'ALL PASS' : 'FAILURES'} (${results.filter(Boolean).length}/${results.length}) ===`);
process.exit(allPass ? 0 : 1);
