// CR-358-P1 | CR-358-P2 | CR-358-P3: AIOSELL API response transforms + meal plan decoder
// Defensive: every fromAPI function guards against null/undefined response.
// Response shapes verified from preprod probes (2026-08-31 evidence files).

// ─── STATUS ─────────────────────────────────────────────────────────────────
// Source: GET /aiosell/status → res.data
// Shape: { restaurant_id, hotel_code, pms_slug, api_base_url,
//          service_status, is_active, is_running, last_sync_at }
const fromStatus = (data) => {
  const d = data ?? {};
  return {
    isRunning:     Boolean(d.is_running),
    isActive:      Boolean(d.is_active),
    hotelCode:     d.hotel_code    ?? null,
    pmsSlug:       d.pms_slug      ?? null,
    apiBaseUrl:    d.api_base_url  ?? null,
    serviceStatus: d.service_status ?? 'unknown',
    lastSyncAt:    d.last_sync_at  ?? null,
  };
};

// ─── ROOMS + MAPPING ────────────────────────────────────────────────────────
// Source: GET /aiosell/rooms → res.data
// Shape: { property{}, mapping{}, aiosell{}, mappings[], local_rooms[], availability{} }
const fromRooms = (data) => {
  const d = data ?? {};
  const mapping = d.mapping ?? {};
  const aiosellBody = d.aiosell?.body ?? {};

  return {
    property: fromStatus(d.property),
    mapping: {
      mappingComplete:      Boolean(mapping.mapping_complete),
      mappingRequired:      Boolean(mapping.mapping_required),
      canPushInventory:     Boolean(mapping.can_push_inventory),
      canReceiveBookings:   Boolean(mapping.can_receive_bookings_with_room),
      totalLocalRooms:      mapping.total_local_rooms   ?? 0,
      mappedCount:          mapping.mapped_count        ?? 0,
      unmappedCount:        mapping.unmapped_count      ?? 0,
      unmappedLocalRooms:   mapping.unmapped_local_rooms ?? [],
      byAiosellRoomCode:    mapping.by_aiosell_room_code ?? [],
    },
    localRooms: Array.isArray(d.local_rooms) ? d.local_rooms.map(r => ({
      id:       r.id          ?? r.table_id ?? null,
      tableNo:  r.table_no   ?? r.number   ?? String(r.id ?? ''),
      areaName: r.area_name  ?? r.title    ?? null, // BUG-377: API returns 'title', not 'area_name'
    })) : [],
    aiosellRooms: Array.isArray(aiosellBody.rooms) ? aiosellBody.rooms.map(r => ({
      roomCode:   r.room_id   ?? r.roomCode ?? r.room_code ?? r.code ?? null, // BUG-377: API uses room_id
      roomName:   r.room_name ?? r.roomName ?? r.name      ?? r.room_id ?? null, // BUG-377: API uses room_name
      totalRooms: r.totalRooms ?? r.total   ?? null,
    })) : [],
    mappings: Array.isArray(d.mappings) ? d.mappings.map(m => ({
      restaurantTableId:   m.restaurant_table_id ?? null,
      aiosellRoomCode:     m.aiosell_room_code   ?? null,
      aiosellRateplanCode: m.aiosell_rateplan_code ?? null,
    })) : [],
    availability: d.availability ?? {},
  };
};

// ─── INVENTORY ──────────────────────────────────────────────────────────────
// Source: POST /aiosell/fetch-inventory → res.data
// Shape: { aiosell: { success, http_status, body: { hotelCode, updates[{startDate,endDate,rooms[]}] } } }
const fromInventory = (data) => {
  const d = data ?? {};
  const body = d.aiosell?.body ?? {};
  const updates = Array.isArray(body.updates) ? body.updates : [];
  return {
    hotelCode: body.hotelCode ?? null,
    updates: updates.map(u => ({
      startDate: u.startDate ?? null,
      endDate:   u.endDate   ?? null,
      rooms: Array.isArray(u.rooms) ? u.rooms.map(r => ({
        roomCode:  r.roomCode  ?? r.room_code ?? null,
        available: r.available ?? 0,
      })) : [],
    })),
  };
};

// ─── MEAL PLAN DECODER ──────────────────────────────────────────────────────
// Source: AIOSELL rateplanCode field, e.g. "deluxe-ep", "suite-cp", "std-map"
// OD-08: decode suffix to badge label.
// Suffixes: ep → Room Only, cp → Breakfast Included, map → Half Board, ap → Full Board
// Returns null if no recognised suffix (no badge rendered).
const MEAL_PLAN_SUFFIXES = {
  ep:  'Room Only',
  cp:  'Breakfast Included',
  map: 'Half Board',
  ap:  'Full Board',
};

const decodeMealPlan = (rateplanCode) => {
  if (!rateplanCode || typeof rateplanCode !== 'string') return null;
  const lower = rateplanCode.toLowerCase();
  // Try longest suffix first (map before ap to avoid false match)
  for (const suffix of ['map', 'ep', 'cp', 'ap']) {
    if (lower.endsWith(`-${suffix}`) || lower === suffix) {
      return MEAL_PLAN_SUFFIXES[suffix];
    }
  }
  return null;
};

// ─── DIRECT RESERVATION (CR-358-P2) ─────────────────────────────────────────
// Source: POST /aiosell/direct-reservation → res.data
// Shape: { data: { reservation: { booking_id, channel, checkin, checkout, operational_status, status } } }
const fromDirectReservation = (data) => {
  const r = data?.data?.reservation ?? data?.reservation ?? data?.data ?? data ?? {};
  return {
    bookingId: r.booking_id ?? null,
    channel:   r.channel ?? 'Direct',
    checkin:   r.checkin ?? null,
    checkout:  r.checkout ?? null,
    status:    r.operational_status ?? r.status ?? 'pending',
  };
};

// ─── PENDING ARRIVAL (CR-358-P2) ─────────────────────────────────────────────
// Source: one element of GET /aiosell/local-reservations → data.reservations[]
// Used by CheckInPage arrivals list + form prefill. Guards every field.
const fromPendingArrival = (res) => {
  const r = res ?? {};
  const g = r.guest ?? {};
  const room = Array.isArray(r.rooms) && r.rooms.length ? r.rooms[0] : {};
  const guestName = [g.first_name, g.last_name].filter(Boolean).join(' ').trim() || room.guest_name || '';
  const nights = r.checkin && r.checkout
    ? Math.max(1, Math.round((new Date(r.checkout) - new Date(r.checkin)) / 86400000)) : null;
  return {
    id:                r.id ?? null,
    bookingId:         r.booking_id ?? null,
    channel:           r.channel ?? null,
    bookingType:       r.channel === 'Direct' ? 'Direct' : 'Online',   // CR-358-P2 §4.2 map
    guestName,
    phone:             g.phone ?? '',
    email:             g.email ?? '',
    checkin:           r.checkin ?? null,
    checkout:          r.checkout ?? null,
    nights,
    roomCode:          room.room_code ?? null,
    ratePlanCode:      room.rateplan_code ?? null,
    mealPlan:          decodeMealPlan(room.rateplan_code),               // OD-08 decoder reuse
    restaurantTableId: room.restaurant_table_id ?? null,
    tableNo:           room.table_no ?? null,
    adults:            room.adults ?? 1,
    children:          room.children ?? 0,
    amount:            r.amount_after_tax != null ? Number(r.amount_after_tax) : null,
    operationalStatus: r.operational_status ?? null,
    specialRequests:   r.special_requests ?? '',
  };
};

// ─── RESERVATION OPS (CR-358-P3) ─────────────────────────────────────────────
// Superset of fromPendingArrival for S1/S9/S10. fromPendingArrival is NOT modified (CheckInPage depends on it).
// Adds room-line ops fields + pah. `roomLines[]` carries one entry per rooms[] element (S10 rows = room lines).
const fromReservationOps = (res) => {
  const base  = fromPendingArrival(res);
  const r     = res ?? {};
  const rooms = Array.isArray(r.rooms) ? r.rooms : [];
  const first = rooms[0] ?? {};
  return {
    ...base,
    pah:            typeof r.pah === 'boolean' ? r.pah : null,        // true → PAY AT HOTEL, false → Prepaid, null → no badge
    cmBookingId:    r.cm_booking_id ?? null,
    roomCount:      rooms.length,
    orderId:        first.order_id ?? null,
    paymentStatus:  first.order_payment_status ?? null,                 // 'paid' | 'unpaid' | null
    lineStatus:     first.line_status ?? null,
    checkedInAt:    first.checked_in_at ?? null,
    checkedOutAt:   first.checked_out_at ?? null,
    roomLines: rooms.map((rm, i) => ({
      lineId:            rm.id ?? i,
      roomCode:          rm.room_code ?? null,
      tableNo:           rm.table_no ?? null,
      restaurantTableId: rm.restaurant_table_id ?? null,
      orderId:           rm.order_id ?? null,
      paymentStatus:     rm.order_payment_status ?? null,
      lineStatus:        rm.line_status ?? null,
      checkedInAt:       rm.checked_in_at ?? null,
      checkedOutAt:      rm.checked_out_at ?? null,
      adults:            rm.adults ?? 1,
      children:          rm.children ?? 0,
      guestName:         rm.guest_name ?? base.guestName,
    })),
  };
};

// ─── DASHBOARD KPIS (CR-358-P3) ──────────────────────────────────────────────
// Source: GET /aiosell/dashboard-kpis?start_date&end_date → res.data.data (probe 24). Guards every field; null → tile renders "—".
const fromDashboardKpis = (data) => {
  const d = data?.data ?? data ?? {};
  const t = d.today ?? {};
  const day0 = Array.isArray(d.physical?.days) ? d.physical.days[0] : null;
  const tot = day0?.totals ?? {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
  return {
    asOfDate:        d.as_of_date ?? null,
    arrivalsCount:   num(t.arrivals_count),
    departuresCount: num(t.departures_count),
    inHouseCount:    num(t.in_house_count),
    occupancyPct:    num(t.occupancy_percent_physical),
    totalRooms:      num(d.physical?.total_rooms) ?? num(tot.capacity),
    availableTonight:num(tot.available),
    occupiedTonight: num(tot.occupied),
  };
};

// ─── PUBLIC API ─────────────────────────────────────────────────────────────
const aiosellTransform = {
  fromAPI: {
    status:            fromStatus,
    rooms:             fromRooms,
    inventory:         fromInventory,
    directReservation: fromDirectReservation, // CR-358-P2
    pendingArrival:    fromPendingArrival,     // CR-358-P2
    reservationOps:    fromReservationOps,     // CR-358-P3
    dashboardKpis:     fromDashboardKpis,      // CR-358-P3
  },
  decodeMealPlan,
};

export default aiosellTransform;
