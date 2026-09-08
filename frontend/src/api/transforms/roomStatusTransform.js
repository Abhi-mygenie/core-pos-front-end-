// CR-358-P4: Room Status Board transforms — GET /aiosell/room-status-board + PATCH /aiosell/room-status/{id}
// Single-endpoint design (phased plan NS-B). UI state MUST use displayStatus (server precedence), never manualStatus (A-P4-07).
export const ROOM_MANUAL_STATUSES = ['hk', 'ooo', 'available'];   // OD-P4-01
export const DISPLAY_STATUSES     = ['available', 'occupied', 'booked', 'hk', 'ooo'];

const fromBoardRoom = (r) => {
  const x = r ?? {};
  const g = x.guest ?? null;
  const v = x.reservation ?? null;
  return {
    id:            x.restaurant_table_id ?? null,
    tableNo:       x.table_no ?? String(x.restaurant_table_id ?? ''),
    title:         x.title ?? null,
    roomType:      x.aiosell_room_code ?? null,
    manualStatus:  x.manual_status ?? null,
    displayStatus: DISPLAY_STATUSES.includes(x.display_status) ? x.display_status : 'available',
    statusSince:   x.room_operational_status_at ?? null,
    guest: g ? { name: g.name ?? '', bookingId: g.booking_id ?? null, orderId: g.order_id ?? null } : null,
    reservation: v ? { bookingId: v.booking_id ?? null, channel: v.channel ?? null, checkin: v.checkin ?? null,
                       checkout: v.checkout ?? null, guestName: v.guest_name ?? '', roomCode: v.room_code ?? null } : null,
    canToggle: x.display_status !== 'occupied' && x.display_status !== 'booked',
  };
};

export const fromRoomStatusBoard = (data) => {
  const d = data?.data ?? data ?? {};
  const rooms = Array.isArray(d.rooms) ? d.rooms.map(fromBoardRoom) : [];
  const counts = DISPLAY_STATUSES.reduce((acc, s) => ({ ...acc, [s]: rooms.filter(r => r.displayStatus === s).length }), { all: rooms.length });
  return { autoHkOnRmCheckout: Boolean(d.auto_hk_on_rm_checkout), rooms, counts };
};

export const fromPatchResponse = (data) => {
  const d = data?.data ?? {};
  return {
    message:              data?.message ?? '',
    room:                 d.room ? { id: d.room.restaurant_table_id ?? null, manualStatus: d.room.manual_status ?? null, statusSince: d.room.room_operational_status_at ?? null } : null,
    inventoryPushWarning: d.inventory_push_warning ?? null,
  };
};

/** Resolve a human message from PATCH 422/5xx (T4: shapes differ per case). */
export const patchErrorMessage = (err) => {
  const data = err?.response?.data ?? {};
  return data.message ?? data.errors?.status?.[0] ?? err?.readableMessage ?? err?.message ?? 'Status update failed';
};

const roomStatusTransform = { fromRoomStatusBoard, fromPatchResponse, patchErrorMessage, ROOM_MANUAL_STATUSES, DISPLAY_STATUSES };
export default roomStatusTransform;
