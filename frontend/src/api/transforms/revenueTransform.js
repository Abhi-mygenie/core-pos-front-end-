// CR-366 — Revenue Dashboard transform
// Rules: null-normalise + number-coerce only. No derived money math (R6).
// BN-6: month bucket has reduced schema — 10 fields absent vs day/week.

const num = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));
const str = (v) => (v == null || v === '' ? '—' : String(v));
const nullable = (v) => (v == null ? null : Number(v));

/** Auto-select group_by from range length.
 *  ≤92d → 'day'  |  ≤366d → 'week'  |  >366d → 'month'
 */
export function groupByAutoSelect(startDate, endDate) {
  const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  if (days <= 92)  return 'day';
  if (days <= 366) return 'week';
  return 'month';
}

/** Normalise one series bucket.
 *  Month buckets (BN-6) are missing: adr_collected, revpar_collected, arrivals,
 *  departures, in_house, no_shows, cancellations, rooms_capacity, rooms_ooo, tax_collected.
 *  num(undefined) = 0 — caller suppresses collected lines when groupBy === 'month'.
 */
const seriesBucket = (b) => ({
  bucketStart:          str(b.bucket_start),
  bucketEnd:            str(b.bucket_end),
  isForecast:           !!b.is_forecast,
  roomsAvailable:       num(b.rooms_available),
  roomsSold:            num(b.rooms_sold),
  occupancyPercent:     nullable(b.occupancy_percent),
  arrivals:             num(b.arrivals),
  departures:           num(b.departures),
  inHouse:              num(b.in_house),
  roomRevenueBooked:    num(b.room_revenue_booked),
  roomRevenueCollected: num(b.room_revenue_collected),
  fnbRevenuePosted:     num(b.fnb_revenue_posted),
  adrBooked:            num(b.adr_booked),
  adrCollected:         num(b.adr_collected),    // absent in month → 0 (suppressed by page)
  revparBooked:         num(b.revpar_booked),
  revparCollected:      num(b.revpar_collected), // absent in month → 0 (suppressed by page)
});

export function fromAPI(data) {
  if (!data) return null;
  const t = data.totals ?? {};

  return {
    generatedAt: str(data.generated_at),
    currency:    str(data.currency),
    range: {
      startDate: str(data.range?.start_date),
      endDate:   str(data.range?.end_date),
      days:      num(data.range?.days),
      groupBy:   str(data.range?.group_by),
    },

    // KPI totals (side-by-side — OD-366-08=A)
    totals: {
      roomsAvailable:        num(t.rooms_available),
      roomsSold:             num(t.rooms_sold),
      occupancyPercent:      nullable(t.occupancy_percent),
      roomRevenueBooked:     num(t.room_revenue_booked),
      roomRevenueCollected:  num(t.room_revenue_collected),
      fnbRevenuePosted:      num(t.fnb_revenue_posted),
      taxCollected:          num(t.tax_collected),
      adrBooked:             num(t.adr_booked),
      adrCollected:          num(t.adr_collected),
      revparBooked:          num(t.revpar_booked),
      revparCollected:       num(t.revpar_collected),
      trevpar:               num(t.trevpar),
      // nulls preserved for '—' display (BN-5)
      bookingsCount:         t.bookings_count     ?? null,
      avgLosNights:          t.avg_los_nights     ?? null,
      avgLeadTimeDays:       t.avg_lead_time_days ?? null,
      outstandingBalance:    t.outstanding_balance ?? null,
    },

    series: (data.series ?? []).map(seriesBucket),

    byChannel: (data.by_channel ?? []).map(ch => ({
      channel:              str(ch.channel),
      roomNights:           num(ch.room_nights),
      roomRevenueBooked:    num(ch.room_revenue_booked),
      roomRevenueCollected: num(ch.room_revenue_collected),
      shareOfRevenuePct:    num(ch.share_of_revenue_percent),
      // BN-6: hide bookings col when 0 with non-zero room_nights
      bookings: (ch.bookings === 0 && num(ch.room_nights) > 0) ? null : num(ch.bookings),
    })),

    byRoomType: (data.by_room_type ?? []).map(rt => ({
      roomCode:             str(rt.room_code),
      soldNights:           num(rt.sold_nights),
      roomRevenueBooked:    num(rt.room_revenue_booked),
      roomRevenueCollected: num(rt.room_revenue_collected),
      occupancyPercent:     nullable(rt.occupancy_percent),
      adrBooked:            num(rt.adr_booked),
    })),

    byPaymentType: (data.by_booking_payment_type ?? []).map(pt => ({
      paymentType:          str(pt.booking_payment_type),
      roomNights:           num(pt.room_nights),
      roomRevenueBooked:    num(pt.room_revenue_booked),
      roomRevenueCollected: num(pt.room_revenue_collected),
      outstanding:          num(pt.outstanding),
    })),

    byBookingStatus: data.by_booking_status ? {
      confirmedPendingArrival: num(data.by_booking_status.confirmed_pending_arrival),
      checkedIn:               num(data.by_booking_status.checked_in),
      checkedOut:              num(data.by_booking_status.checked_out),
      cancelled:               num(data.by_booking_status.cancelled),
      noShow:                  num(data.by_booking_status.no_show),
    } : null,
  };
}
