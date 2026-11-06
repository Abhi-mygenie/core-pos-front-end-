// CR-363 — Night Audit transform
// Rules: null-normalise only. Never derive totals or do arithmetic (R6).

/** Coerce to number; return 0 for null/undefined/NaN. */
const num = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Coerce to display string; return '—' for null/undefined/''. */
const str = (v) => (v == null || v === '' ? '—' : String(v));

const outstandingRow = (r) => ({
  orderId:            r.order_id ?? null,
  reservationId:      str(r.reservation_id),
  roomNo:             str(r.room_no),
  roomCode:           str(r.room_code),       // may be '—' (BN-1)
  guestName:          str(r.guest_name),       // may be '—' (BN-1)
  checkin:            str(r.checkin),          // may be '—' (BN-1)
  checkout:           str(r.checkout),         // may be '—' (BN-1)
  channel:            str(r.channel),
  bookingPaymentType: str(r.booking_payment_type),
  roomBooked:         num(r.room_booked),
  roomCollected:      num(r.room_collected),
  roomBalance:        num(r.room_balance),
  fnbPosted:          num(r.fnb_posted),
  fnbCollected:       num(r.fnb_collected),
  fnbBalance:         num(r.fnb_balance),
  paymentStatus:      str(r.payment_status),
});

const reconRow = (r) => ({
  waiterId:        r.waiter_id ?? null,
  name:            str(r.name),               // may be '—' (BN-2)
  todayCollection: num(r.today_collection),   // may be 0  (BN-2)
  roomShare:       num(r.room_share),
  fnbShare:        num(r.fnb_share),
});

const trailEvent = (e) => ({
  at:             str(e.at),
  type:           str(e.type),
  orderId:        e.order_id ?? null,
  reservationId:  str(e.reservation_id),
  roomNo:         str(e.room_no),
  by:             str(e.by),
  detailPrevTableId: e.detail?.previous_table_id ?? null,
  detailCurrTableId: e.detail?.current_table_id  ?? null,
  hasDetail: !!(e.detail?.previous_table_id || e.detail?.current_table_id),
});

export function fromAPI(data) {
  if (!data) return null;

  const occ = data.occupancy           ?? {};
  const rev = data.revenue             ?? {};
  const fnb = data.fnb_posted_to_rooms ?? {};
  const out = data.outstanding         ?? {};
  const ns  = data.no_shows            ?? {};
  const dep = data.departures          ?? {};
  const rsc = data.room_status_close   ?? {};
  const rec = data.reconciliation      ?? {};

  return {
    date:        str(data.date),
    isForecast:  !!data.is_forecast,
    statusAsOf:  str(data.status_as_of),
    businessDay: { start: str(data.business_day?.start), end: str(data.business_day?.end) },

    // A — Occupancy
    occupancy: {
      roomsTotal:         num(occ.rooms_total),
      roomsOoo:           num(occ.rooms_ooo),
      roomsAvailable:     num(occ.rooms_available),
      roomsSold:          num(occ.rooms_sold),
      roomsComplimentary: num(occ.rooms_complimentary),
      occupancyPercent:   num(occ.occupancy_percent),
      arrivalsExpected:   num(occ.arrivals_expected),
      arrivalsActual:     num(occ.arrivals_actual),
      departuresExpected: num(occ.departures_expected),
      departuresActual:   num(occ.departures_actual),
      inHouse:            num(occ.in_house),
      dayUse:             num(occ.day_use),
      byRoomType: (occ.by_room_type ?? []).map(rt => ({
        roomCode:         str(rt.room_code),
        capacity:         num(rt.capacity),
        available:        num(rt.available),
        sold:             num(rt.sold),
        occupancyPercent: num(rt.occupancy_percent),
        occupancyBarPct:  Math.min(num(rt.occupancy_percent), 100),
      })),
    },

    // B — Revenue (read backend fields directly — R6)
    revenue: {
      roomSalesBooked:      num(rev.room_sales_booked),
      roomRevenueCollected: num(rev.room_revenue_collected),
      roomGstCollected:     num(rev.room_gst_collected),
      collectedByTender: {
        cash:          num(rev.collected_by_tender?.cash),
        card:          num(rev.collected_by_tender?.card),
        upi:           num(rev.collected_by_tender?.upi),
        tab:           num(rev.collected_by_tender?.tab),
        otaRemittance: num(rev.collected_by_tender?.ota_remittance),
        other:         num(rev.collected_by_tender?.other),
      },
      collectedByStage: {
        advanceAtBooking: num(rev.collected_by_stage?.advance_at_booking),
        advanceAtCheckin: num(rev.collected_by_stage?.advance_at_checkin),
        midStay:          num(rev.collected_by_stage?.mid_stay),
        checkout:         num(rev.collected_by_stage?.checkout),
      },
      refunds:         num(rev.refunds),
      adrBooked:       num(rev.adr_booked),
      adrCollected:    num(rev.adr_collected),
      revparBooked:    num(rev.revpar_booked),
      revparCollected: num(rev.revpar_collected),
      otherRevenue:    num(rev.other_revenue_posted),
    },

    // F&B to rooms (separate — OD-363-03)
    fnbPostedToRooms: {
      orders:      fnb.orders == null ? null : num(fnb.orders),
      amount:      num(fnb.amount),
      gst:         num(fnb.gst),
      collected:   num(fnb.collected),
      outstanding: num(fnb.outstanding),
      trevpar:     num(fnb.trevpar),
    },

    // C — Outstanding
    outstanding: {
      totalRoomBalance: num(out.total_room_balance),
      totalFnbBalance:  num(out.total_fnb_balance),
      totalBalance:     num(out.total_balance),
      rows: (out.rows ?? []).map(outstandingRow),
    },

    // D — No-shows
    noShows: {
      count:      num(ns.count),
      feeCharged: num(ns.fee_charged),
      rows: (ns.rows ?? []).map(r => ({
        reservationId:    str(r.reservation_id),
        guestName:        str(r.guest_name),
        channel:          str(r.channel),
        checkin:          str(r.checkin),
        nights:           num(r.nights),
        bookedValue:      num(r.booked_value),
        advanceCollected: num(r.advance_collected),
        retained:         num(r.retained),
        markedAt:         str(r.marked_at),
      })),
    },

    // E — Departures
    departures: {
      checkedOutPaid:   (dep.checked_out_paid   ?? []),
      checkedOutUnpaid: (dep.checked_out_unpaid ?? []),
      overdueInHouse:   (dep.overdue_in_house   ?? []),
      earlyCheckouts:   (dep.early_checkouts    ?? []),
    },

    // F — Room status close (always 'current' — OD-363-07: show badge always)
    roomStatusClose: {
      available:  num(rsc.available),
      occupied:   num(rsc.occupied),
      occupiedHk: num(rsc.occupied_hk),
      booked:     num(rsc.booked),
      hk:         num(rsc.hk),
      ooo:        num(rsc.ooo),
      statusAsOf: str(rsc.status_as_of),
      rows: (rsc.rows ?? []).map(r => ({
        roomNo:   str(r.room_no),
        roomCode: str(r.room_code),
        status:   str(r.status),
        hkStatus: str(r.hk_status),
      })),
    },

    // H — Reconciliation (partial — BN-2)
    reconciliation: {
      settlementTotalCollection: rec.settlement_total_collection ?? null,
      settlementRoomShare:       num(rec.settlement_room_share),
      settlementFnbShare:        rec.settlement_fnb_share ?? null,
      nightAuditRoomCashCardUpi: num(rec.night_audit_room_cash_card_upi),
      delta:                     num(rec.delta),
      byWaiter: (rec.by_waiter ?? []).map(reconRow),
    },

    // G — Audit trail
    auditTrail: (data.audit_trail ?? []).map(trailEvent),
  };
}
