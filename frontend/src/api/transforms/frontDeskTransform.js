// CR-385 M0 — Front Desk snapshot transform. Money: charge.* only (D50, X-01). Dates: ISO string compare vs meta.business_date only (X-06).
// FORBIDDEN reads (legacy top-level money fields and folio remaining balance — see plan §3 C2-F) are never touched here.

const OTA_CHANNELS_EXCLUDE = ['Direct', 'WalkIn'];
export const isOta = (channel) => !OTA_CHANNELS_EXCLUDE.includes(channel);

// "first  floor" → "First Floor"; null → "No section" (C3-T, G4-09)
export const normaliseTitle = (t) => {
  const s = typeof t === 'string' ? t.trim().replace(/\s+/g, ' ') : '';
  return s ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : 'No section';
};

// Pure ISO-date arithmetic (no browser clock). '2026-09-20' + 1 → '2026-09-21'
export const plusDays = (iso, n) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const pad = (v) => String(v).padStart(2, '0');
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

// Whole days between two ISO dates (b − a); pure arithmetic
export const dayDiff = (a, b) => {
  if (!a || !b) return 0;
  const p = (iso) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((p(b) - p(a)) / 86400000);
};

export const fromReservation = (r) => {
  const x = r ?? {};
  const g = x.guest ?? {};
  const line = Array.isArray(x.rooms) && x.rooms.length ? x.rooms[0] : {};
  const charge = x.charge ?? null;
  return {
    id: x.id ?? null,
    bookingId: x.booking_id ?? null,
    cmBookingId: x.cm_booking_id ?? null,
    guestName: [g.first_name, g.last_name].filter(Boolean).join(' ').trim() || line.guest_name || '—',
    phone: g.phone ?? null,
    email: g.email ?? null,
    channel: x.channel ?? null,
    isOta: isOta(x.channel),
    checkin: x.checkin ?? null,
    checkout: x.checkout ?? null,
    nights: charge?.nights ?? null,
    adults: line.adults ?? null,
    children: line.children ?? null,
    roomNo: line.table_no ?? null,
    roomTitle: line.table_title ?? null,
    roomType: line.room_code ?? null,
    rateplanCode: line.rateplan_code ?? charge?.rateplan_code ?? null,
    orderId: line.order_id ?? null,
    tableId: line.restaurant_table_id ?? null,
    orderPaymentStatus: line.order_payment_status ?? null,
    lineStatus: line.line_status ?? null,
    checkedInAt: line.checked_in_at ?? null,
    operationalStatus: x.operational_status ?? null,
    status: x.status ?? null,
    pah: Boolean(x.pah),
    specialRequests: x.special_requests ?? null,
    charge,
    cancelReason: x.cancel_reason ?? null,
    cancelledAt: x.cancelled_at ?? null,
  };
};

export const bucketArrival = (row, bd) => {
  if (!row?.checkin || !bd) return 'upcoming';
  if (row.checkin < bd) return 'late';
  if (row.checkin === bd) return 'today';
  if (row.checkin === plusDays(bd, 1)) return 'tomorrow';
  return 'upcoming';
};

export const bucketDeparture = (row, bd) => {
  if (!row?.checkout || !bd) return 'upcoming';
  if (row.checkout < bd) return 'overdue';
  if (row.checkout === bd) return 'today';
  if (row.checkout === plusDays(bd, 1)) return 'tomorrow';
  return 'upcoming';
};

// In-House chips (F6): arrived today · leaving today · stayover
export const bucketInHouse = (row, bd) => {
  if (!bd) return 'stayover';
  const arrived = (row?.checkedInAt ?? '').slice(0, 10) || row?.checkin;
  if (row?.checkout && row.checkout <= bd) return 'leaving';
  if (arrived === bd) return 'arrived';
  return 'stayover';
};

export const nsOrCancel = (row) => (row?.isOta ? 'noshow' : 'cancel'); // AC-13 EITHER/OR

export const isCleared = (row) => row?.orderPaymentStatus === 'paid' && Number(row?.charge?.balance_due) === 0; // X-02, OG-PMS-028

// D48-b / D50: prepaid > pah > advance(cumulative, pending/in-house only) > null
export const badgeFor = (row) => {
  const c = row?.charge ?? {};
  if (Number(c.prepaid_amount) > 0) return { kind: 'prepaid' };
  if (row?.pah) return { kind: 'pah' };
  if (Number(c.advance_payment) > 0 && row?.operationalStatus !== 'departed') {
    return { kind: 'advance', amount: Number(c.advance_payment) };
  }
  return null;
};

const groupBy = (arr, keyFn) => {
  const map = new Map();
  arr.forEach((it) => { const k = keyFn(it); if (!map.has(k)) map.set(k, []); map.get(k).push(it); });
  return Array.from(map.entries()).map(([key, rooms]) => ({ key, rooms }));
};

const roomNoSort = (a, b) => String(a.tableNo).localeCompare(String(b.tableNo), undefined, { numeric: true });

export const groupRooms = (rooms, mode) => {
  const sorted = [...(rooms ?? [])].sort(roomNoSort);
  if (mode === 'area') return groupBy(sorted, (r) => normaliseTitle(r.title)).sort((a, b) => a.key.localeCompare(b.key));
  if (mode === 'type') return groupBy(sorted, (r) => r.roomType ?? 'Unassigned').sort((a, b) => a.key.localeCompare(b.key));
  return [{ key: 'all', rooms: sorted }];
};

// D42: a Turn = departing today AND arriving today on the same table
export const isTurn = (room, rows, bd) => {
  if (!room || !bd) return false;
  const mine = (rows ?? []).filter((r) => r.tableId === room.id);
  const leaving = mine.some((r) => r.operationalStatus === 'in_house' && r.checkout === bd);
  const arriving = mine.some((r) => r.operationalStatus === 'pending' && r.checkin === bd);
  return leaving && arriving;
};

// board room → chip key
export const roomChipKey = (room) => {
  if (room.manualStatus === 'hk' && room.displayStatus !== 'occupied_hk') return 'hk';
  return room.displayStatus;
};

export const fromFrontDeskSnapshot = ({ lr, board, kpis }) => {
  const d = lr?.data ?? lr ?? {};
  const boardOk = board?.status === 'fulfilled';
  const kpisOk = kpis?.status === 'fulfilled';
  return {
    meta: d.meta ?? null,
    counts: d.counts ?? {},
    reservations: Array.isArray(d.reservations) ? d.reservations.map(fromReservation) : [],
    rooms: boardOk ? board.value.rooms : [],
    boardCounts: boardOk ? board.value.counts : null,
    boardMeta: boardOk ? board.value.meta : null,
    autoHkOnRmCheckout: boardOk ? board.value.autoHkOnRmCheckout : null,
    boardError: !boardOk,
    kpis: kpisOk ? (kpis.value?.data ?? kpis.value ?? null) : null,
    kpisError: !kpisOk,
    loadedAt: Date.now(),
  };
};
