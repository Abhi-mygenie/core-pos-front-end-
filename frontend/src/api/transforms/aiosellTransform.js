// CR-358-P1: AIOSELL API response transforms + meal plan decoder
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

// ─── PUBLIC API ─────────────────────────────────────────────────────────────
const aiosellTransform = {
  fromAPI: {
    status:    fromStatus,
    rooms:     fromRooms,
    inventory: fromInventory,
  },
  decodeMealPlan,
};

export default aiosellTransform;
