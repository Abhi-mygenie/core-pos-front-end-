// Room List Transform — CR-004 Phase 2 (Bucket B / FE-1)
//
// Normalises an item from `/api/v2/vendoremployee/get-room-list` into a
// row-seed shape consumed by `RoomOrdersReportPage` and `RoomRowCard`. The
// same shape is also produced by `reportService.getRoomsForReport` for the
// `/order-logs-report` source so the page's downstream code reads a single
// uniform record regardless of source.
//
// `/get-room-list` shape (live, in-house only):
//   [
//     {
//       table: { id, table_no, title, ... },
//       order_id,                             // active RM-parent order id
//       user:  { id, f_name, l_name, phone, email }
//     },
//     ...
//   ]
//
// Notes:
//   - Backend already filters this endpoint to currently-in-house rooms
//     (verified live preprod 2026-04-29: a checked-out room is NOT returned).
//     No defensive client-side filter is required.
//   - Rooms with no `order_id` (between-bookings edge case) are skipped.
//   - `restaurantOrderId`, `checkInDateTime`, and the financial fields are
//     left null on this seed; the per-row detail fetch
//     (`getSingleOrderRoom`) populates them via `RoomRowCard.numbers`.

/**
 * @param {Array<Object>} raw - raw response from `/get-room-list`.
 * @returns {Array<Object>} row seeds matching the page's `roomRows` shape.
 */
export const transformRoomListToRows = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  const rows = [];
  for (const r of list) {
    if (!r || !r.order_id) continue;
    const t = r.table || {};
    const u = r.user || {};
    const guestName =
      [u.f_name, u.l_name].filter(Boolean).join(' ').trim() || 'Guest';
    rows.push({
      _source: 'live',
      parentOrderId: r.order_id,
      restaurantOrderId: null, // unknown until detail fetch
      roomNumber: t.table_no || null,
      tableId: t.id || null,
      guestName,
      checkInDateTime: null, // detail fetch fills via roomInfo.checkInDate
      transferCount: null,
      food: null,
      total: null,
      paid: null,
      outstanding: null,
      _raw: r,
    });
  }
  return rows;
};

export default { transformRoomListToRows };
