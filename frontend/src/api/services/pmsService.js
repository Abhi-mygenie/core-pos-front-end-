// CR-358-P1 | BUG-378 | CR-358-P2 | CR-358-P3: PMS aggregation + booking/check-in + reservation-ops service
// getInHouseGuests: two-call join — GET_ROOM_LIST + local-reservations enriched on order_id.
// roomService.getRoomList() and roomListTransform are NOT modified — only called.
import { getRoomList } from './roomService';
import roomListTransform from '../transforms/roomListTransform';
import { getLocalReservations, getAiosellRooms, getAiosellStatus, fetchReservations, pushInventory } from './aiosellService'; // BUG-378, CR-358-P2, CR-358-P3
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

// CR-358-P3: LOCAL calendar date (not UTC) — restaurant clock. dateOffset() above is UTC and left untouched (BUG-378 consumer).
export const localDate = (offsetDays = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
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
  const [raw, occupied] = await Promise.all([
    getAiosellRooms(),
    getRoomList().catch(() => []),                           // BUG-380: occupied room IDs
  ]);
  const rooms = aiosellTransform.fromAPI.rooms(raw?.data ?? raw);
  const typeById = Object.fromEntries(rooms.mappings.map(m => [m.restaurantTableId, m.aiosellRoomCode]));
  const occIds = new Set((occupied ?? []).map(r => r?.table?.id).filter(Boolean));  // BUG-380
  return rooms.localRooms.map(r => ({
    id: r.id,
    tableNo: r.tableNo,
    roomType: typeById[r.id] ?? null,
    isOccupied: occIds.has(r.id),                            // BUG-380
  }));
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

// ─── Phase 3 (CR-358-P3) ─────────────────────────────────────────────────────
const RES_WINDOW = { back: 60, ahead: 30 }; // A-06

/** Pure bucketing — exported for unit tests (V-U1..U4). `today` = 'YYYY-MM-DD'. */
export const bucketReservationOps = (list, today) => {
  const pending  = list.filter(r => r.operationalStatus === 'pending');
  const inHouse  = list.filter(r => r.operationalStatus === 'in_house');
  const departed = list.filter(r => r.operationalStatus === 'departed');
  const byCheckin  = (a, b) => String(a.checkin).localeCompare(String(b.checkin)) || a.guestName.localeCompare(b.guestName);
  const dayOf = (ts) => (ts ? String(ts).slice(0, 10) : null);
  // S10 rows = room lines that have an order (A-03)
  const lines = (src) => src.flatMap(r => r.roomLines.map(l => ({ ...r, line: l, orderId: l.orderId, tableNo: l.tableNo, paymentStatus: l.paymentStatus })));
  const byCheckout = (a, b) => String(a.checkout).localeCompare(String(b.checkout));
  return {
    arrivalsToday:    pending.filter(r => r.checkin === today).sort(byCheckin),
    arrivalsUpcoming: pending.filter(r => r.checkin >  today).sort(byCheckin),
    arrivalsLate:     pending.filter(r => r.checkin <  today).sort(byCheckin),
    checkedInToday:   inHouse.filter(r => r.checkin === today || dayOf(r.checkedInAt) === today).sort(byCheckin), // A-02
    inHouse,
    depOverdue:       lines(inHouse).filter(x => x.checkout <  today).sort(byCheckout),
    depDueToday:      lines(inHouse).filter(x => x.checkout === today).sort(byCheckout),
    depUpcoming:      lines(inHouse).filter(x => x.checkout >  today).sort(byCheckout),
    depCheckedOut:    lines(departed).sort((a, b) => String(b.line.checkedOutAt ?? '').localeCompare(String(a.line.checkedOutAt ?? ''))),
    withSpecialRequests: pending.filter(r => (r.specialRequests ?? '').trim() !== '').length,
  };
};

/** S1/S9/S10: single fetch (OD-P3-04) → ops models → buckets */
export const getReservationOps = async () => {
  const today = localDate(0);
  const data  = await getLocalReservations({ startDate: localDate(-RES_WINDOW.back), endDate: localDate(RES_WINDOW.ahead) });
  const list  = (data?.data?.reservations ?? data?.reservations ?? []).map(aiosellTransform.fromAPI.reservationOps);
  return { today, all: list, ...bucketReservationOps(list, today) };
};

/** S1: server KPIs (OD-P3-05). Throws on error → page renders "—" tiles. */
export const getFrontDeskKpis = async () => {
  const today = localDate(0);
  const res = await api.get(AIOSELL_ENDPOINTS.DASHBOARD_KPIS, { params: { start_date: today, end_date: today } });
  return aiosellTransform.fromAPI.dashboardKpis(res.data);
};

/** S1: Channel Sync card source (OD-P3-06) */
export const getChannelSyncStatus = async () => aiosellTransform.fromAPI.status((await getAiosellStatus())?.data ?? {});

/** S1 Sync Now (OD-P3-11 c): pull bookings IN, then push inventory OUT. Never throws — returns per-step result. */
export const syncNow = async () => {
  const range = { startDate: localDate(0), endDate: localDate(RES_WINDOW.ahead) };
  const out = { fetched: false, pushed: false, error: null };
  try { await fetchReservations({ ...range, importToLocal: true }); out.fetched = true; }
  catch (e) { out.error = e?.response?.data?.message ?? e?.message ?? 'fetch-reservations failed'; return out; }
  try { await pushInventory(range); out.pushed = true; }
  catch (e) { out.error = e?.response?.data?.message ?? e?.message ?? 'push-inventory failed'; }
  return out;
};

