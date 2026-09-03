// CR-358-P1 | BUG-378: PMS aggregation service
// getInHouseGuests: two-call join — GET_ROOM_LIST + local-reservations enriched on order_id.
// roomService.getRoomList() and roomListTransform are NOT modified — only called.
import { getRoomList } from './roomService';
import roomListTransform from '../transforms/roomListTransform';
import { getLocalReservations } from './aiosellService'; // BUG-378

// Date helper — offset from today (YYYY-MM-DD)
const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * S6 — In-House Guests (BUG-378: enriched with phone, checkinDate, checkoutDate, balance)
 *
 * Step 1: GET_ROOM_LIST → roomListTransform (roomNumber, guestName, phone)
 * Step 2: local-reservations ?start_date=today-60&end_date=today+60
 *         Filter: operational_status === 'in_house'
 *         Join:   rooms[0].order_id === row.parentOrderId
 *         Enrich: checkinDate (checked_in_at), checkoutDate, balance (amount_after_tax), channel
 * Walk-in guests (no AIOSELL reservation): phone from Step 1, dates/balance stay null → "—"
 * Graceful degradation: if Step 2 fails, Step 1 data is still returned (no crash).
 */
export const getInHouseGuests = async () => {
  // Step 1 — GET_ROOM_LIST (room number, guest name, phone)
  const raw  = await getRoomList();
  const rows = roomListTransform.transformRoomListToRows(raw);

  // Step 2 — local-reservations enrichment
  try {
    const lrData       = await getLocalReservations({ startDate: dateOffset(-60), endDate: dateOffset(60) });
    const reservations = lrData?.data?.reservations ?? lrData?.reservations ?? [];
    const inHouse      = reservations.filter(r => r.operational_status === 'in_house');

    // Build order_id lookup: { [order_id]: { res, room } }
    const lookup = {};
    inHouse.forEach(res => {
      (res.rooms ?? []).forEach(room => {
        if (room.order_id) lookup[room.order_id] = { res, room };
      });
    });

    // Enrich rows with dates, balance, channel
    rows.forEach(row => {
      const match = lookup[row.parentOrderId];
      if (match) {
        row.checkinDate   = match.room.checked_in_at            ?? null; // actual physical check-in (for table column)
        row.bookingCheckin= match.res.checkin                  ?? null; // booking start date (for Avg Nights KPI) — CR-360
        row.checkoutDate  = match.res.checkout                 ?? null;
        row.balance       = match.res.amount_after_tax != null
                           ? Number(match.res.amount_after_tax) : null;
        row.channel       = match.res.channel                  ?? null;
      }
    });
  } catch {
    // Degraded mode: local-reservations failed (network/auth error).
    // rows still contain roomNumber, guestName, phone from Step 1.
    // checkinDate/checkoutDate/balance will be undefined → page renders "—".
  }

  return rows;
};

// ─── Phase 2 stubs (wired in CR-358-P2) ─────────────────────────────────────
// Declared here so Phase 1 App.js routes compile without errors.
// Phase 2 implementation will replace these throws with real API calls.

/** P2: Get reservations for Check-In/New Booking flows */
export const getPmsReservations = async () => {
  throw new Error('[CR-358-P2] getPmsReservations not yet implemented — Phase 2 scope');
};

/** P2: Create a direct/walk-in booking */
export const createDirectReservation = async () => {
  throw new Error('[CR-358-P2] createDirectReservation not yet implemented — Phase 2 scope');
};
