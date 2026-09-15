# CR-363 + CR-366 — JOINT IMPLEMENTATION PLAN (Gate 3)

**IDs:** CR-363 — PMS Night Audit Report · CR-366 — PMS Revenue Dashboard
**Date:** 2026-09-14
**Role:** PLANNING (Gate 3 — Implementation Plan ONLY. No code written.)
**Sprint:** pos_pms_1
**Risk:** CR-363 HIGH · CR-366 MEDIUM
**Gate 2 doc:** `memory/impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md`
**Design:** `design_guidelines.json` + `public/pms-mockup.html` (LOCKED)

---

## 0. Pre-Implementation Verification (impl agent runs FIRST, before any edit)

```bash
# 0a. BN-6 probe — confirm group_by=month
TOKEN=$(curl -s -X POST https://preprod.mygenie.online/api/v1/vendoremployee/auth/common-login \
  -H "Content-Type: application/json" \
  -d '{"email":"***","password":"***"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
curl -s "https://preprod.mygenie.online/api/v2/vendoremployee/aiosell/revenue-summary?start_date=2025-09-01&end_date=2026-09-14&group_by=month" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('HTTP shape:', list(d.get('data',{}).keys()))
s=d.get('data',{}).get('series',[])
print('series count:', len(s))
if s: print('bucket sample:', s[0].get('bucket_start'), s[0].get('bucket_end'))
"
```
Expected: 200, `series[]` with monthly `bucket_start`/`bucket_end` pairs.

```bash
# 0b. Re-verify target lines (run before editing)
grep -n "EXTEND_STAY" /app/frontend/src/api/constants.js
grep -c "" /app/frontend/src/api/services/pmsService.js   # expect ~442
grep -n "RoomStatusPage" /app/frontend/src/App.js
grep -n "pms-room-status" /app/frontend/src/components/layout/Sidebar.jsx
```

```bash
# 0c. Compile baseline — record current warning count
tail -5 /var/log/supervisor/frontend.out.log   # expect "webpack compiled successfully"
```

---

## 1. Execution Sequence (strict order — each group unblocks the next)

| Step | Files | Reason for order |
|---|---|---|
| 1 | `constants.js` | Foundation — all other files import from here |
| 2 | `pmsService.js` | Service layer — pages import from here |
| 3 | `nightAuditTransform.js` (NEW) | Pure fn — no UI dep; testable immediately |
| 4 | `revenueTransform.js` (NEW) | Pure fn — same |
| 5 | `NightAuditPage.jsx` (NEW) | UI — needs transform + service |
| 6 | `RevenueDashboardPage.jsx` (NEW) | UI — needs transform + service |
| 7 | `App.js` | Routes — needs pages to exist |
| 8 | `Sidebar.jsx` | Navigation — always last (SC ack done) |

Build as **one combined change-set** so Sidebar is touched exactly once.

---

## 2. Detailed Edits

### Edit 1 — `src/api/constants.js` (MOD, +2 lines)

**Current line 595–596:**
```js
  EXTEND_STAY:             '/api/v2/vendoremployee/pos/room-extend-stay',         // CR-362: POST {order_id, new_checkout_date, new_room_price, reason}
};
```

**After edit (insert before `};`):**
```js
  EXTEND_STAY:             '/api/v2/vendoremployee/pos/room-extend-stay',         // CR-362: POST {order_id, new_checkout_date, new_room_price, reason}
  // CR-363 + CR-366 — PMS Reports (shipped 2026-09-14, BE reply confirmed)
  NIGHT_AUDIT:             '/api/v2/vendoremployee/aiosell/night-audit',          // CR-363: GET ?date=YYYY-MM-DD
  REVENUE_SUMMARY:         '/api/v2/vendoremployee/aiosell/revenue-summary',      // CR-366: GET ?start_date&end_date&group_by
};
```

**Verification:** `grep -n "NIGHT_AUDIT\|REVENUE_SUMMARY" src/api/constants.js` → 2 hits at ~L596–597.

---

### Edit 2 — `src/api/services/pmsService.js` (MOD, +16 lines at EOF)

**Append after current last line (~L442):**
```js

// ─── CR-363 — Night Audit ────────────────────────────────────────────────────
/** Fetch end-of-day night audit for a single business date.
 *  @param {string} date  YYYY-MM-DD (business date, IST calendar)
 */
export const getNightAudit = async (date) => {
  const res = await api.get(AIOSELL_ENDPOINTS.NIGHT_AUDIT, { params: { date } });
  return res.data?.data ?? null;
};

// ─── CR-366 — Revenue Dashboard ──────────────────────────────────────────────
/** Fetch aggregated revenue metrics over a date range.
 *  @param {{ startDate:string, endDate:string, groupBy:'day'|'week'|'month' }} p
 */
export const getRevenueSummary = async ({ startDate, endDate, groupBy }) => {
  const res = await api.get(AIOSELL_ENDPOINTS.REVENUE_SUMMARY, {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
  return res.data?.data ?? null;
};
```

**Verification:** `grep -n "getNightAudit\|getRevenueSummary" src/api/services/pmsService.js` → 2 hits.

---

### Edit 3 — `src/api/transforms/nightAuditTransform.js` (NEW)

**Full file — pure transform, no side effects, no arithmetic (R6):**
```js
// CR-363 — Night Audit transform
// Rules: null-normalise only. Never derive totals or do arithmetic (R6).

/** Coerce to number; return 0 for null/undefined/NaN. */
const num = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Coerce to display string; return '—' for null/undefined/''. */
const str = (v) => (v == null || v === '' ? '—' : String(v));

/** Normalise a single outstanding row. */
const outstandingRow = (r) => ({
  orderId:          r.order_id         ?? null,
  reservationId:    str(r.reservation_id),
  roomNo:           str(r.room_no),
  roomCode:         str(r.room_code),          // may be '—' (BN-1)
  guestName:        str(r.guest_name),          // may be '—' (BN-1)
  checkin:          str(r.checkin),             // may be '—' (BN-1)
  checkout:         str(r.checkout),            // may be '—' (BN-1)
  channel:          str(r.channel),
  bookingPaymentType: str(r.booking_payment_type),
  roomBooked:       num(r.room_booked),
  roomCollected:    num(r.room_collected),
  roomBalance:      num(r.room_balance),
  fnbPosted:        num(r.fnb_posted),
  fnbCollected:     num(r.fnb_collected),
  fnbBalance:       num(r.fnb_balance),
  paymentStatus:    str(r.payment_status),
});

/** Normalise a waiter reconciliation row. */
const reconRow = (r) => ({
  waiterId:        r.waiter_id  ?? null,
  name:            str(r.name),               // may be '—' (BN-2)
  todayCollection: num(r.today_collection),   // may be 0  (BN-2)
  roomShare:       num(r.room_share),
  fnbShare:        num(r.fnb_share),
});

/** Normalise an audit trail event. */
const trailEvent = (e) => ({
  at:   str(e.at),
  type: str(e.type),
  orderId: e.order_id ?? null,
  reservationId: str(e.reservation_id),
  roomNo: str(e.room_no),
  by:   str(e.by),
  // detail IDs may be null for transfer_to_room (BN-3 / BUG-193)
  detailPrevTableId: e.detail?.previous_table_id ?? null,
  detailCurrTableId: e.detail?.current_table_id  ?? null,
  hasDetail: !!(e.detail?.previous_table_id || e.detail?.current_table_id),
});

/** Main entry: transforms raw API response `data` into view model. */
export function fromAPI(data) {
  if (!data) return null;

  const occ = data.occupancy ?? {};
  const rev = data.revenue   ?? {};
  const fnb = data.fnb_posted_to_rooms ?? {};
  const out = data.outstanding ?? {};
  const ns  = data.no_shows   ?? {};
  const dep = data.departures ?? {};
  const rsc = data.room_status_close ?? {};
  const rec = data.reconciliation ?? {};

  return {
    // Meta
    date:        str(data.date),
    isforecast:  !!data.is_forecast,
    statusAsOf:  str(data.status_as_of),  // 'current' for all dates
    businessDay: {
      start: str(data.business_day?.start),
      end:   str(data.business_day?.end),
    },

    // Section A — Occupancy
    occupancy: {
      roomsTotal:            num(occ.rooms_total),
      roomsOoo:              num(occ.rooms_ooo),
      roomsAvailable:        num(occ.rooms_available),
      roomsSold:             num(occ.rooms_sold),
      roomsComplimentary:    num(occ.rooms_complimentary),
      occupancyPercent:      num(occ.occupancy_percent),
      arrivalsExpected:      num(occ.arrivals_expected),
      arrivalsActual:        num(occ.arrivals_actual),
      departuresExpected:    num(occ.departures_expected),
      departuresActual:      num(occ.departures_actual),
      inHouse:               num(occ.in_house),
      dayUse:                num(occ.day_use),
      byRoomType: (occ.by_room_type ?? []).map(rt => ({
        roomCode:         str(rt.room_code),
        capacity:         num(rt.capacity),
        available:        num(rt.available),
        sold:             num(rt.sold),
        // clamp display bar at 100 but keep raw value (N1)
        occupancyPercent: num(rt.occupancy_percent),
        occupancyBarPct:  Math.min(num(rt.occupancy_percent), 100),
      })),
    },

    // Section B — Revenue (read from backend fields directly — R6)
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
        advanceAtBooking:  num(rev.collected_by_stage?.advance_at_booking),
        advanceAtCheckin:  num(rev.collected_by_stage?.advance_at_checkin),
        midStay:           num(rev.collected_by_stage?.mid_stay),
        checkout:          num(rev.collected_by_stage?.checkout),
      },
      refunds:          num(rev.refunds),
      adrBooked:        num(rev.adr_booked),
      adrCollected:     num(rev.adr_collected),
      revparBooked:     num(rev.revpar_booked),
      revparCollected:  num(rev.revpar_collected),
      otherRevenue:     num(rev.other_revenue_posted),
    },

    // F&B posted to rooms (separate — OD-363-03)
    fnbPostedToRooms: {
      orders:      fnb.orders == null ? null : num(fnb.orders), // null → show '—' not 0 (N5)
      amount:      num(fnb.amount),
      gst:         num(fnb.gst),
      collected:   num(fnb.collected),
      outstanding: num(fnb.outstanding),
      trevpar:     num(fnb.trevpar),
    },

    // Section C — Outstanding
    outstanding: {
      totalRoomBalance: num(out.total_room_balance),
      totalFnbBalance:  num(out.total_fnb_balance),
      totalBalance:     num(out.total_balance),
      rows: (out.rows ?? []).map(outstandingRow),
    },

    // Section D — No-shows
    noShows: {
      count:       num(ns.count),
      feeCharged:  num(ns.fee_charged),
      rows: (ns.rows ?? []).map(r => ({
        reservationId: str(r.reservation_id),
        guestName:     str(r.guest_name),
        channel:       str(r.channel),
        checkin:       str(r.checkin),
        nights:        num(r.nights),
        bookedValue:   num(r.booked_value),
        advanceCollected: num(r.advance_collected),
        retained:      num(r.retained),
        markedAt:      str(r.marked_at),
      })),
    },

    // Section E — Departures
    departures: {
      checkedOutPaid:   (dep.checked_out_paid   ?? []).map(r => ({ ...r })),
      checkedOutUnpaid: (dep.checked_out_unpaid ?? []).map(r => ({ ...r })),
      overdueInHouse:   (dep.overdue_in_house   ?? []).map(r => ({ ...r })),
      earlyCheckouts:   (dep.early_checkouts    ?? []).map(r => ({ ...r })),
    },

    // Section F — Room status close (always 'current' — OD-363-07: show badge)
    roomStatusClose: {
      available: num(rsc.available),
      occupied:  num(rsc.occupied),
      occupiedHk:num(rsc.occupied_hk),
      booked:    num(rsc.booked),
      hk:        num(rsc.hk),
      ooo:       num(rsc.ooo),
      statusAsOf: str(rsc.status_as_of),  // 'current'
      rows: (rsc.rows ?? []).map(r => ({
        roomNo:    str(r.room_no),
        roomCode:  str(r.room_code),
        status:    str(r.status),
        hkStatus:  str(r.hk_status),
      })),
    },

    // Section H — Reconciliation (partial — BN-2)
    reconciliation: {
      settlementTotalCollection: rec.settlement_total_collection ?? null, // may be null (BN-2)
      settlementRoomShare:       num(rec.settlement_room_share),
      settlementFnbShare:        rec.settlement_fnb_share ?? null,        // may be null (BN-2)
      nightAuditRoomCashCardUpi: num(rec.night_audit_room_cash_card_upi),
      delta:                     num(rec.delta),
      byWaiter: (rec.by_waiter ?? []).map(reconRow),
    },

    // Section G — Audit trail
    auditTrail: (data.audit_trail ?? []).map(trailEvent),
  };
}
```

**Verification:** Import in browser console → `nightAuditTransform.fromAPI(null)` → `null`. `fromAPI({})` → object with null-safe sections.

---

### Edit 4 — `src/pages/pms/NightAuditPage.jsx` (NEW)

**Key implementation spec (impl agent writes from this):**

```
State:
  date       string    YYYY-MM-DD, default localDate(0) from pmsService
  audit      object    null until loaded; result of nightAuditTransform.fromAPI()
  loading    bool
  error      string|null
  collapsed  object    { A: false, B: false, C: false, D: true, E: true, F: false, G: true, H: false }
             (D, E, G default collapsed — lower priority sections)

Data flow:
  useEffect([date]) → setLoading(true) → getNightAudit(date) → fromAPI(raw) → setAudit(vm)

Page header:
  <h1>Night Audit Report</h1>
  <p>End-of-day hotel financial & room reconciliation</p>
  Right: <input type="date" value={date} onChange={...} data-testid="night-audit-date-picker" />
         <button onClick={handleExcelExport}  data-testid="export-excel-button">Excel</button>
         <button onClick={handlePDFExport}    data-testid="export-pdf-button">PDF</button>

  PDF/Excel: call exportReportAsPDF / exportReportAsExcel with:
    { title:'Night Audit Report', subtitle:`Business Date: ${date}`,
      restaurant: { name: restaurant?.name },
      dateRange: { from: date, to: date },
      generatedBy: user?.name,
      kpis: [ occupancy%, roomsSold, salesBooked, revenueCollected, outstanding ],
      sheets: [ sectionA table, sectionC table, sectionH table ] }

Section cards (data-testid="section-X" where X = occupancy/revenue/outstanding/...):
  Each: white card, orange left-border accent, collapsible via collapsed[X] state.
  Card header: title + badge + collapse chevron (rotate on collapse).

Section A — Occupancy:
  6 stat tiles (roomsAvailable, roomsSold, occupancyPercent, inHouse, arrivalsActual, departuresActual)
  Table: byRoomType rows. occupancyBarPct for bar (max 100); raw occupancyPercent for text.
  Show ⚠ icon if occupancyPercent > 100.

Section B — Revenue:
  Two 2-col grids: By Tender / By Stage
  Highlight row: "Total Collected" (roomRevenueCollected) in orange
  Separate F&B block below (OD-363-03)

Section C — Outstanding:
  IF null fields detected (guestName==='—' for all rows):
    Show amber warning banner: "Guest name, room code, check-in/checkout pending backend fix (BN-1)"
  Table: roomNo / guestName / checkin / checkout / channel / roomBalance / fnbBalance / paymentStatus badge
  Null cells render '—' (text-gray-300 italic per design)

Section D — No-shows (default collapsed)

Section E — Departures (default collapsed)
  3 sub-tables: checkedOutPaid / checkedOutUnpaid / overdueInHouse

Section F — Room Status Close:
  ALWAYS show badge "Room status as of now" (OD-363-07) — regardless of date.
  4 stat tiles (available, occupied, hk, ooo)
  Room grid: colour-coded cells (occ=orange, avail=green, hk=amber, ooo=gray)

Section G — Audit Trail (default collapsed)
  Timeline list. hasDetail=false → hide detail line.

Section H — Reconciliation:
  IF settlementTotalCollection === null → show amber warning: "Settlement total pending backend fix (BN-2)"
  Recon rows: room share, cash+card+UPI, delta.
  Delta badge: green "Balanced ✓" if delta===0, red "Delta ₹X ⚠" if delta!==0.
  Per-waiter table. name==='—' → show '—'.

Loading state: skeleton cards (pulse animation) for each section.
Error state: red banner with retry button.

code marker: // CR-363 at top of file and at each section component.
```

---

### Edit 5 — `src/api/transforms/revenueTransform.js` (NEW)

```js
// CR-366 — Revenue Dashboard transform
// Rules: null-normalise + number-coerce only. No derived money math (R6).
// groupByAutoSelect: ≤92d→'day', ≤366d→'week', >366d→'month' (per BE compute note)

const num = (v) => (v == null || isNaN(Number(v)) ? 0 : Number(v));
const str = (v) => (v == null || v === '' ? '—' : String(v));
const pct = (v) => (v == null ? null : num(v)); // null preserved for "no data" state

/** Auto-select group_by from date range in days. */
export function groupByAutoSelect(startDate, endDate) {
  const days = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
  if (days <= 92)  return 'day';
  if (days <= 366) return 'week';
  return 'month';
}

/** Normalise a single series bucket. */
const seriesBucket = (b) => ({
  bucketStart:         str(b.bucket_start),
  bucketEnd:           str(b.bucket_end),
  isForecast:          !!b.is_forecast,
  roomsAvailable:      num(b.rooms_available),
  roomsSold:           num(b.rooms_sold),
  occupancyPercent:    pct(b.occupancy_percent),
  arrivals:            num(b.arrivals),
  departures:          num(b.departures),
  inHouse:             num(b.in_house),
  roomRevenueBooked:   num(b.room_revenue_booked),
  roomRevenueCollected:num(b.room_revenue_collected),
  fnbRevenuePosted:    num(b.fnb_revenue_posted),
  adrBooked:           num(b.adr_booked),
  adrCollected:        num(b.adr_collected),
  revparBooked:        num(b.revpar_booked),
  revparCollected:     num(b.revpar_collected),
});

/** Main entry. */
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

    // KPI totals (side-by-side per OD-366-08=A)
    totals: {
      roomsAvailable:         num(t.rooms_available),
      roomsSold:              num(t.rooms_sold),
      occupancyPercent:       pct(t.occupancy_percent),
      roomRevenueBooked:      num(t.room_revenue_booked),
      roomRevenueCollected:   num(t.room_revenue_collected),
      fnbRevenuePosted:       num(t.fnb_revenue_posted),
      taxCollected:           num(t.tax_collected),
      adrBooked:              num(t.adr_booked),         // use directly — R6
      adrCollected:           num(t.adr_collected),
      revparBooked:           num(t.revpar_booked),
      revparCollected:        num(t.revpar_collected),
      trevpar:                num(t.trevpar),
      // nulls preserved — shown as '—' (BN-5)
      bookingsCount:          t.bookings_count    ?? null,
      avgLosNights:           t.avg_los_nights    ?? null,
      avgLeadTimeDays:        t.avg_lead_time_days ?? null,
      outstandingBalance:     t.outstanding_balance ?? null,
    },

    // Recharts-ready series
    series: (data.series ?? []).map(seriesBucket),

    // Breakdown tables
    byChannel: (data.by_channel ?? []).map(ch => ({
      channel:               str(ch.channel),
      roomNights:            num(ch.room_nights),
      roomRevenueBooked:     num(ch.room_revenue_booked),
      roomRevenueCollected:  num(ch.room_revenue_collected),
      shareOfRevenuePct:     num(ch.share_of_revenue_percent),
      // bookings=0 issue (BN-6) — hide until BE fixes
      bookings:              ch.bookings === 0 && ch.room_nights > 0 ? null : num(ch.bookings),
    })),

    byRoomType: (data.by_room_type ?? []).map(rt => ({
      roomCode:             str(rt.room_code),
      soldNights:           num(rt.sold_nights),
      roomRevenueBooked:    num(rt.room_revenue_booked),
      roomRevenueCollected: num(rt.room_revenue_collected),
      occupancyPercent:     pct(rt.occupancy_percent),
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
```

---

### Edit 6 — `src/pages/pms/RevenueDashboardPage.jsx` (NEW)

```
State:
  preset     'today'|'7d'|'30d'|'custom'    default '7d' (OD-366-07)
  startDate  string  YYYY-MM-DD             derived from preset
  endDate    string  YYYY-MM-DD             derived from preset (= localDate(0))
  groupBy    string  auto from groupByAutoSelect(startDate, endDate)
  data       object  null until loaded; result of revenueTransform.fromAPI()
  loading    bool
  error      string|null

Preset date calculation:
  today → startDate = endDate = localDate(0)
  7d    → startDate = localDate(-6), endDate = localDate(0)
  30d   → startDate = localDate(-29), endDate = localDate(0)
  custom → date range picker (From / To inputs)

Data flow:
  useEffect([startDate, endDate]) → setLoading(true)
    → groupBy = groupByAutoSelect(startDate, endDate)
    → getRevenueSummary({ startDate, endDate, groupBy })
    → fromAPI(raw) → setData(vm)
  On range change: cancel previous request (AbortController or ignore stale).

Page header:
  <h1>Revenue Dashboard</h1>
  Date preset pills: Today / 7D (active default) / 30D / Custom
  data-testid="date-pills", each pill data-testid="pill-{today|7d|30d|custom}"
  Export buttons: Excel + PDF (data-testid="export-excel-button", "export-pdf-button")

KPI row (OD-366-08 = Option A — side-by-side, always visible):
  5 tiles: Occupancy / ADR / RevPAR / Room Revenue / TRevPAR
  ADR tile: shows adrBooked (orange "Sales") + adrCollected (green "Revenue") side-by-side
  RevPAR tile: same pattern
  Room Revenue tile: roomRevenueBooked (orange) + roomRevenueCollected (green)
  Occupancy tile: single value (no split needed)
  TRevPAR tile: single value (no split — includes F&B)
  data-testid: "kpi-occupancy", "kpi-adr", "kpi-revpar", "kpi-room-revenue", "kpi-trevpar"

Charts (recharts 3.6.0, responsive, height=220):
  Chart 1 — Occupancy Trend (LineChart):
    XAxis: bucketStart (formatted DD MMM)
    YAxis: occupancyPercent (%)
    Line 1: occupancyPercent — stroke #329937, label "Occupancy %"
    Line 2: roomsSold — stroke #F26B33, yAxisId="right"
    data-testid="chart-occupancy"

  Chart 2 — Revenue Booked vs Collected (BarChart):
    XAxis: bucketStart
    Bar 1: roomRevenueBooked   — fill #F26B33 (opacity .8), label "Booked (Sales)"
    Bar 2: roomRevenueCollected — fill #329937 (opacity .7), label "Collected (Revenue)"
    Bar 3: fnbRevenuePosted    — fill #F4A11A (opacity .6), label "F&B Posted"
    data-testid="chart-revenue"

  Chart 3 — ADR & RevPAR Trend (LineChart):
    Line 1: adrBooked     — stroke #F26B33, solid
    Line 2: adrCollected  — stroke #F26B33, strokeDasharray="4 4"
    Line 3: revparBooked  — stroke #329937, solid
    Line 4: revparCollected — stroke #329937, strokeDasharray="4 4"
    data-testid="chart-adr-revpar"

Breakdown tables (4 cards, 2×2 grid):
  1. By Channel: Channel / Room Nights / Revenue Booked / Share % / (Bookings hidden if null)
  2. By Room Type: Type / Sold Nights / Revenue Booked / Revenue Collected / Occupancy % / ADR
  3. By Payment Type: Payment Type / Room Nights / Booked / Collected / Outstanding
  4. By Booking Status: status counts (confirmed/checked-in/checked-out/cancelled/no-show) — if data present
  data-testid: "table-channel", "table-room-type", "table-payment-type", "table-booking-status"

Loading: skeleton per section (pulse)
Error: red banner with retry

code marker: // CR-366 at top of file.
```

---

### Edit 7 — `src/App.js` (MOD, +4 lines)

**After line 106** (last PMS import `RoomStatusPage`), add:
```js
import NightAuditPage      from './pages/pms/NightAuditPage';      // CR-363
import RevenueDashboardPage from './pages/pms/RevenueDashboardPage'; // CR-366
```

**After line 264** (last PMS route `pms/room-status`), add:
```jsx
              <Route path="/pms/night-audit" element={<ProtectedRoute><NightAuditPage /></ProtectedRoute>} />      {/* CR-363 */}
              <Route path="/pms/revenue"     element={<ProtectedRoute><RevenueDashboardPage /></ProtectedRoute>} /> {/* CR-366 */}
```

**Verification:** Navigate to `/pms/night-audit` and `/pms/revenue` in browser → pages load without 404.

---

### Edit 8 — `src/components/layout/Sidebar.jsx` (MOD, +2 lines, SC ack done)

**After line 241** (`pms-room-status` entry), add:
```js
      // CR-363 + CR-366 — SC ack approved 2026-09-14
      { id: 'pms-night-audit', label: 'Night Audit',        path: '/pms/night-audit' },
      { id: 'pms-revenue',     label: 'Revenue Dashboard',  path: '/pms/revenue' },
```

**Verification:** Sidebar renders 2 new children under "Rooms & Reservations". Clicking each navigates correctly. Existing links unchanged.

---

## 3. Verification Matrix

| Edit | File | What to verify | Method | Auto? |
|---|---|---|---|---|
| 1 | `constants.js` | `NIGHT_AUDIT` + `REVENUE_SUMMARY` keys present | grep | YES |
| 2 | `pmsService.js` | `getNightAudit` + `getRevenueSummary` exported | grep | YES |
| 3 | `nightAuditTransform.js` | `fromAPI(null)` → null; `fromAPI({})` → object with all sections | console | NO |
| 3 | `nightAuditTransform.js` | null guest → guestName==='—'; num(null)→0 | console | NO |
| 4 | `NightAuditPage.jsx` | Route `/pms/night-audit` loads without crash | Browser | NO |
| 4 | `NightAuditPage.jsx` | Change date → loading state → data renders | Browser | NO |
| 4 | `NightAuditPage.jsx` | Section F always shows "as of now" badge | Browser | NO |
| 4 | `NightAuditPage.jsx` | Section C shows amber warning + `—` cells | Browser | NO |
| 4 | `NightAuditPage.jsx` | PDF export opens print dialog | Browser | NO |
| 5 | `revenueTransform.js` | `groupByAutoSelect('2026-09-07','2026-09-14')` → `'day'` | console | NO |
| 5 | `revenueTransform.js` | `fromAPI(null)` → null | console | NO |
| 6 | `RevenueDashboardPage.jsx` | Route `/pms/revenue` loads without crash | Browser | NO |
| 6 | `RevenueDashboardPage.jsx` | Default = 7D preset active on mount | Browser | NO |
| 6 | `RevenueDashboardPage.jsx` | KPI tiles show side-by-side orange/green values | Browser | NO |
| 6 | `RevenueDashboardPage.jsx` | All 3 charts render with data | Browser | NO |
| 6 | `RevenueDashboardPage.jsx` | Switching to 30D → new API call → data updates | Browser | NO |
| 7 | `App.js` | 2 new routes reachable | Browser | NO |
| 8 | `Sidebar.jsx` | 2 new children visible + clickable | Browser | NO |
| ALL | webpack | 0 new warnings vs baseline | log | YES |

---

## 4. Risk Register

| # | Risk | Mitigation in plan |
|---|---|---|
| R-1 | `adrBooked` ≫ `adrCollected` confuses owner | Labels "Sales (booked)" / "Revenue (collected)" in all tiles. Tooltip text: "Sales = booked value; Revenue = cash received." |
| R-2 | BN-6: group_by=month might differ in shape | `groupByAutoSelect` only used for >366d ranges (edge case). Transform handles missing fields gracefully (num(null)=0). |
| R-3 | Sidebar entry order not matching design | Append after `pms-room-status` — visible near bottom of PMS section. Owner can request reorder post-Gate-6. |
| R-4 | recharts version compatibility | recharts 3.6.0 already installed + used in `CashierSettlementMockup.jsx`. Follow same pattern. |
| R-5 | reportExporter param mismatch | Verified param shape: `{title, subtitle, restaurant, dateRange:{from,to}, generatedBy, kpis, sheets}`. Use exactly this shape. |
| R-6 | Night Audit Section H delta=null vs 0 | `num(null)=0` so delta displays as ₹0. Safe — backend sends 0 when balanced. |

---

## 5. Post-Code Registry Checklist (impl agent runs after coding)

```
- [ ] registry.json: CR-363 → status: IMPLEMENTED, sprint_key: pos_pms_1
- [ ] registry.json: CR-366 → status: IMPLEMENTED, sprint_key: pos_pms_1
- [ ] CR_REGISTRY.md: CR-363 row → IMPLEMENTED
- [ ] CR_REGISTRY.md: CR-366 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add 8 files with CR-363/CR-366 + date
- [ ] Code markers: // CR-363 in NightAuditPage.jsx + nightAuditTransform.js + pmsService.js + constants.js + App.js + Sidebar.jsx
- [ ] Code markers: // CR-366 in RevenueDashboardPage.jsx + revenueTransform.js + pmsService.js + constants.js + App.js + Sidebar.jsx
- [ ] Compile check: webpack 0 new warnings
```

---

## 6. Scope Lock (FINAL — matches Gate 2 decision)

**WILL change (8 files):**
`pages/pms/NightAuditPage.jsx` (NEW) · `api/transforms/nightAuditTransform.js` (NEW) ·
`pages/pms/RevenueDashboardPage.jsx` (NEW) · `api/transforms/revenueTransform.js` (NEW) ·
`api/services/pmsService.js` (MOD +16 lines) · `api/constants.js` (MOD +3 lines) ·
`App.js` (MOD +4 lines) · `components/layout/Sidebar.jsx` (MOD +3 lines)

**WILL NOT touch:** CollectPaymentPanel · OrderEntry · orderTransform · DashboardPage · LoadingPage · SettlementPanel · DayClosurePage · aiosellTransform · aiosellService · insightsCache · PmsCheckoutDrawer · CartPanel · RecordPaymentModal · reportService · utils/reportExporter.js (called only) · utils/businessDay.js · any `/app/memory/final/*`

---

```
Planning complete: CR-363, CR-366
Stage: Gate 3 — Implementation Plan
Code reality: NONE
Risk: CR-363 HIGH · CR-366 MEDIUM
Files WILL change: NightAuditPage.jsx (NEW), nightAuditTransform.js (NEW),
                   RevenueDashboardPage.jsx (NEW), revenueTransform.js (NEW),
                   pmsService.js (+16L), constants.js (+3L), App.js (+4L), Sidebar.jsx (+3L)
Files WILL NOT touch: all R5 hotspots, settlement/day closure, aiosellTransform, insightsCache
Owner decisions needed: NONE — all resolved at Gate 2
Docs: plans/CR-363_CR-366_JOINT_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO (owner approves) → IMPLEMENTATION
```
