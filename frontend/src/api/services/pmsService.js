// CR-358-P1 | BUG-378 | CR-358-P2: PMS aggregation + booking/check-in service
// getInHouseGuests: two-call join — GET_ROOM_LIST + local-reservations enriched on order_id.
// roomService.getRoomList() and roomListTransform are NOT modified — only called.
import { getRoomList } from './roomService';
import roomListTransform from '../transforms/roomListTransform';
import { getLocalReservations, getAiosellRooms } from './aiosellService'; // BUG-378, CR-358-P2
import api from '../axios';                                        // CR-358-P2
import { AIOSELL_ENDPOINTS } from '../constants';                  // CR-358-P2
import aiosellTransform from '../transforms/aiosellTransform';     // CR-358-P2
const to2dp = (v) => Number(Number(v ?? 0).toFixed(2));            // CR-358-P2

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

// ─── Phase 2 (CR-358-P2) ─────────────────────────────────────────────────────

/** S3: room picker source (OD-P2-03) — local rooms joined with room-type mapping */
export const getBookableRooms = async () => {
  const raw = await getAiosellRooms();
  const rooms = aiosellTransform.fromAPI.rooms(raw?.data ?? raw);
  const typeById = Object.fromEntries(rooms.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  return rooms.localRooms.map(r => ({ id: r.id, tableNo: r.tableNo, roomType: typeById[r.id] ?? null }));
};

/** S4: reservations in window → arrival models (pending) + in-house list for KPIs */
export const getPmsReservations = async ({ startDate, endDate }) => {
  const data = await getLocalReservations({ startDate, endDate });
  const list = data?.data?.reservations ?? data?.reservations ?? [];
  const all  = list.map(aiosellTransform.fromAPI.pendingArrival);
  return {
    arrivals: all.filter(r => r.operationalStatus === 'pending')
                 .sort((a, b) => String(a.checkin).localeCompare(String(b.checkin))),
    inHouse:  all.filter(r => r.operationalStatus === 'in_house'),
  };
};

/** S3: Save as Booking → POST /aiosell/direct-reservation (JSON, 201). OD-P2-07: never sends advance. */
export const createDirectReservation = async (f) => {
  const payload = {
    guest:        { name: f.name, phone: f.phone, email: f.email || null },
    checkin:      f.checkin,
    checkout:     f.checkout,
    rooms:        [{ restaurant_table_id: Number(f.restaurantTableId) }],
    order_amount: to2dp(f.orderAmount),
    adults:       Number(f.adults ?? 1),
    children:     Number(f.children ?? 0),
    notes:        f.notes ?? '',
  };
  const res = await api.post(AIOSELL_ENDPOINTS.DIRECT_RESERVATION, payload);
  return aiosellTransform.fromAPI.directReservation(res.data);
};

const CHECKIN_TYPES = ['WalkIn', 'Direct', 'Online'];

/**
 * S4: PMS check-in → POST /pos/user-group-check-in as JSON (OD-P2-01 Option B).
 * Separate from roomService.checkIn() (FormData) — that function is NOT modified.
 * booking_type is mandatory (no default). booking_id sent only for Direct/Online.
 */
export const pmsCheckIn = async (p) => {
  if (!CHECKIN_TYPES.includes(p?.bookingType)) {
    throw new Error(`[CR-358-P2] pmsCheckIn: bookingType must be one of ${CHECKIN_TYPES.join('|')}`);
  }
  if (p.bookingType !== 'WalkIn' && !p.bookingId) {
    throw new Error('[CR-358-P2] pmsCheckIn: bookingId required for Direct/Online');
  }
  const orderAmount = to2dp(p.orderAmount);
  const advance     = to2dp(p.advancePayment);
  const payload = {
    booking_type:    p.bookingType,
    ...(p.bookingType !== 'WalkIn' ? { booking_id: p.bookingId } : {}),
    name:            p.name,
    phone:           p.phone,
    email:           p.email ?? '',
    room_id:         [Number(p.restaurantTableId)],
    id_type:         'Select document type',   // REQUIRED (NOT NULL) — probe P6 500 without it
    total_adult:     Number(p.adults ?? 1),
    total_children:  Number(p.children ?? 0),
    children_name:   '',
    checkin_date:    p.checkin,
    checkout_date:   p.checkout,
    booking_details: '',
    booking_for:     'Individual',
    order_amount:    orderAmount,
    room_price:      orderAmount,
    advance_payment: advance,
    balance_payment: to2dp(orderAmount - advance),
    payment_method:  p.paymentMethod ?? '',
    order_note:      p.note ?? '',
    gst_tax:         '0.00',
    firm_name:       '',
    firm_gst:        '',
  };
  const res = await api.post(AIOSELL_ENDPOINTS.LOCAL_CHECKIN, payload, { headers: { 'X-localization': 'en' } });
  return res.data;
};
