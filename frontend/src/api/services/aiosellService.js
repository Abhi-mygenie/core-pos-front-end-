// CR-358-P1: AIOSELL Channel Manager service
// All endpoints verified on preprod (restaurant 69) 2026-08-31.
// R25: GET for reads, POST for writes (Laravel convention).
// R11: every function curl-probed before wiring.
import api from '../axios';
import { AIOSELL_ENDPOINTS } from '../constants';

// ─── STATUS ─────────────────────────────────────────────────────────────────
/** GET /aiosell/status — Returns AIOSELL connection state */
export const getAiosellStatus = async () => {
  const res = await api.get(AIOSELL_ENDPOINTS.STATUS);
  return res.data;
};

// ─── PROPERTY (SETUP) ────────────────────────────────────────────────────────
/**
 * POST /aiosell/property — Save AIOSELL connection credentials
 * @param {{ hotelCode, pmsSlug, apiBaseUrl, apiKey, webhookSecret, isActive }} config
 */
export const saveAiosellProperty = async (config) => {
  const payload = {
    hotel_code:     config.hotelCode,
    pms_slug:       config.pmsSlug,
    api_base_url:   config.apiBaseUrl,
    api_key:        config.apiKey,
    webhook_secret: config.webhookSecret,
    is_active:      config.isActive ?? true,
  };
  const res = await api.post(AIOSELL_ENDPOINTS.PROPERTY, payload);
  return res.data;
};

// ─── START / STOP ────────────────────────────────────────────────────────────
/** POST /aiosell/start — Start the AIOSELL sync service */
export const startAiosellService = async () => {
  const res = await api.post(AIOSELL_ENDPOINTS.START);
  return res.data;
};

/** POST /aiosell/stop — Stop the AIOSELL sync service */
export const stopAiosellService = async () => {
  const res = await api.post(AIOSELL_ENDPOINTS.STOP);
  return res.data;
};

// ─── ROOMS + MAPPING ────────────────────────────────────────────────────────
/** GET /aiosell/rooms — Returns local rooms + AIOSELL room types + existing mappings */
export const getAiosellRooms = async () => {
  const res = await api.get(AIOSELL_ENDPOINTS.ROOMS);
  return res.data;
};

/**
 * POST /aiosell/room-mapping — Save room-type <-> local-table mappings
 * @param {Array<{restaurantTableId, aiosellRoomCode, aiosellRateplanCode}>} mappings
 */
export const saveRoomMapping = async (mappings) => {
  const payload = {
    mappings: mappings.map(m => ({
      restaurant_table_id:   m.restaurantTableId,
      aiosell_room_code:     m.aiosellRoomCode,
      aiosell_rateplan_code: m.aiosellRateplanCode ?? null,
    })),
  };
  const res = await api.post(AIOSELL_ENDPOINTS.ROOM_MAPPING, payload);
  return res.data;
};

// ─── INVENTORY ──────────────────────────────────────────────────────────────
/**
 * POST /aiosell/fetch-inventory — Pull latest availability from AIOSELL
 * @param {{ startDate: string, endDate: string }} dateRange  (YYYY-MM-DD)
 */
export const fetchInventory = async ({ startDate, endDate }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_INVENTORY, {
    start_date: startDate,
    end_date:   endDate,
  });
  return res.data;
};

/**
 * POST /aiosell/push-inventory — Push current availability to AIOSELL/OTAs
 * @param {{ startDate: string, endDate: string }} dateRange  (YYYY-MM-DD)
 */
export const pushInventory = async ({ startDate, endDate }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_INVENTORY, {
    start_date: startDate,
    end_date:   endDate,
  });
  return res.data;
};

/**
 * POST /aiosell/fetch-reservations — Pull reservations from AIOSELL channel manager
 * @param {{ startDate: string, endDate: string, importToLocal?: boolean }} params
 */
export const fetchReservations = async ({ startDate, endDate, importToLocal = false }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RESERVATIONS, {
    start_date: startDate,
    end_date:   endDate,
    import:     importToLocal,
  });
  return res.data;
};

/**
 * GET /aiosell/local-reservations — fetch locally-stored AIOSELL reservations
 * BUG-378: used by pmsService.getInHouseGuests() to enrich in-house rows with
 * checkinDate, checkoutDate, balance, channel via order_id join.
 * ⚠ Do NOT use view=in_house — returns 0 for early check-ins (date-range filter, not op_status).
 *   Always fetch without view param and filter op_status='in_house' client-side.
 * @param {{ startDate: string, endDate: string }} dateRange  (YYYY-MM-DD)
 */
export const getLocalReservations = async ({ startDate, endDate }) => {
  const res = await api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, {
    params: { start_date: startDate, end_date: endDate },
  });
  return res.data;
};

// ─── Phase 5 (CR-358-P5) ─────────────────────────────────────────────────────

/** S8-C: Fetch current rates from Aiosell for a date range */
export const getRates = async ({ startDate, endDate }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.FETCH_RATES, {
    start_date: startDate,
    end_date:   endDate,
  });
  return res.data;
};

/** S8-C: Push rate changes to Aiosell OTA channels.
 * @param {{ startDate, endDate, rates: [{room_code, rateplan_code, rate}] }} params
 */
export const pushRates = async ({ startDate, endDate, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATES, {
    start_date: startDate,
    end_date:   endDate,
    rates,
  });
  return res.data;
};

/** S8-C: Push inventory restrictions (stop-sell, min-stay, CTA, CTD) per room type.
 * @param {{ startDate, endDate, toChannels: string[], rooms: [{room_code, restrictions: {...}}] }} params
 * restrictions is an OBJECT not array. Only include keys to change.
 */
export const pushInventoryRestrictions = async ({ startDate, endDate, toChannels, rooms }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_INVENTORY_RESTRICT, {
    start_date:  startDate,
    end_date:    endDate,
    to_channels: toChannels,
    rooms,
  });
  return res.data;
};

/** S8-C: Push rate restrictions (min-stay, CTA, CTD) per rate plan.
 * @param {{ startDate, endDate, toChannels: string[], rates: [{room_code, rateplan_code, restrictions: {...}}] }} params
 */
export const pushRateRestrictions = async ({ startDate, endDate, toChannels, rates }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.PUSH_RATE_RESTRICT, {
    start_date:  startDate,
    end_date:    endDate,
    to_channels: toChannels,
    rates,
  });
  return res.data;
};

/** S8-D: Mark a booking as no-show. Irreversible. booking.com / gommt only.
 * Sends channel field per backend Q2-c for correct Aiosell routing.
 * @param {{ bookingId: string, channel: string }} params
 */
export const markNoShow = async ({ bookingId, channel }) => {
  const res = await api.post(AIOSELL_ENDPOINTS.MARK_NO_SHOW, {
    booking_id: bookingId,
    channel,
  });
  return res.data;
};
