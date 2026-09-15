// CR-363 — Night Audit Report page
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, FileText, ChevronDown, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { getNightAudit } from '../../api/services/pmsService';
import { localDate } from '../../api/services/pmsService';
import * as nightAuditTransform from '../../api/transforms/nightAuditTransform';
import { openReportWindow, exportReportAsPDF, exportReportAsExcel } from '../../utils/reportExporter';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useAuth } from '../../contexts/AuthContext';

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtINR = (n) => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const SECTION_LABELS = { A:'Occupancy Summary', B:'Room Revenue', C:'Outstanding Guest Balances',
  D:'No-Shows & Late Arrivals', E:'Departures Reconciliation', F:'Room Status Close Board',
  G:'Order-Level Audit Trail', H:'Reconciliation to Day Closure' };

const STATUS_COLOR = { occupied:'bg-[#FFF4F0] border-[#F26B33] text-[#F26B33]', available:'bg-[#F0F9F0] border-[#329937] text-[#329937]',
  hk:'bg-[#FFFBEB] border-[#F4A11A] text-[#D97706]', ooo:'bg-[#F5F5F5] border-[#ccc] text-[#888]', booked:'bg-[#EFF6FF] border-[#93C5FD] text-[#2563EB]' };

const PayBadge = ({ s }) => {
  const c = s === 'paid' ? 'bg-[#F0F9F0] text-[#329937] border-[#329937]/20'
    : s === 'unpaid' ? 'bg-[#FEE2E2] text-[#EF4444] border-[#EF4444]/20'
    : 'bg-[#FFFBEB] text-[#D97706] border-[#F4A11A]/30';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c}`}>{s}</span>;
};

const SectionCard = ({ id, title, badge, defaultOpen = true, accent = '#F26B33', children, testId }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-sm overflow-hidden mb-3" data-testid={testId}>
      <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 rounded-sm flex-shrink-0" style={{ background: accent }} />
          <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
          {badge && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-[#F0F9F0] text-[#329937] border-[#329937]/20">{badge}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-[#888]" /> : <ChevronRight className="w-4 h-4 text-[#888]" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
};

const StatTile = ({ label, value, color }) => (
  <div className="flex-1 min-w-[90px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-3">
    <div className="text-[10px] font-medium text-[#888] uppercase tracking-wide mb-1">{label}</div>
    <div className={`text-lg font-bold ${color || 'text-[#1A1A1A]'}`}>{value}</div>
  </div>
);

const TableWrap = ({ children }) => (
  <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
    <table className="w-full border-collapse text-xs">{children}</table>
  </div>
);
const TH = ({ children }) => <th className="px-3 py-2 text-left text-[10px] font-semibold text-[#666] uppercase tracking-wide bg-[#FAFAFA] border-b border-[#E5E5E5] whitespace-nowrap">{children}</th>;
const TD = ({ children, className = '' }) => <td className={`px-3 py-2 text-[#1A1A1A] border-b border-[#F0F0F0] whitespace-nowrap ${className}`}>{children}</td>;
const NullCell = () => <td className="px-3 py-2 text-[#ccc] italic border-b border-[#F0F0F0]">—</td>;

const WarnBanner = ({ msg }) => (
  <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#F4A11A] rounded-lg px-3 py-2 mb-3">
    <AlertTriangle className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
    <span className="text-[11px] text-[#78350F]">{msg}</span>
  </div>
);

export default function NightAuditPage() { // CR-363
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [date, setDate] = useState(localDate(0));
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (d) => {
    setLoading(true); setError(null);
    try {
      const raw = await getNightAudit(d);
      setAudit(nightAuditTransform.fromAPI(raw));
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load night audit. Please try again.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const buildExportParams = () => ({
    title: 'Night Audit Report',
    subtitle: `Business Date: ${date}`,
    restaurant: { name: restaurant?.name || '' },
    dateRange: { from: date, to: date },
    generatedBy: user?.name || '',
    kpis: audit ? [
      { label: 'Rooms Sold',         value: String(audit.occupancy.roomsSold) },
      { label: 'Occupancy %',        value: `${fmt(audit.occupancy.occupancyPercent)}%` },
      { label: 'Sales (Booked)',     value: fmtINR(audit.revenue.roomSalesBooked) },
      { label: 'Revenue (Collected)',value: fmtINR(audit.revenue.roomRevenueCollected) },
      { label: 'Outstanding',        value: fmtINR(audit.outstanding.totalBalance) },
    ] : [],
    sheets: [],
  });

  const handlePDF = () => { const w = openReportWindow(); exportReportAsPDF(w, buildExportParams()); };
  const handleExcel = () => exportReportAsExcel(buildExportParams(), `Night_Audit_${date}.xls`);

  const hasNullGuests = audit?.outstanding?.rows?.some(r => r.guestName === '—');

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Night Audit Report</h1>
            <p className="text-xs text-[#888] mt-0.5">End-of-day hotel financial &amp; room reconciliation</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center">
              <Calendar className="absolute left-2 w-3.5 h-3.5 text-[#888] pointer-events-none" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                data-testid="night-audit-date-picker"
                className="pl-7 pr-2 py-1.5 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#1A1A1A] outline-none focus:border-[#F26B33]" />
            </div>
            <button onClick={handleExcel} data-testid="export-excel-button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#E5E5E5] rounded-lg bg-white text-[#1A1A1A] hover:border-[#F26B33] hover:text-[#F26B33] transition-colors">
              <Download className="w-3 h-3" /> Excel
            </button>
            <button onClick={handlePDF} data-testid="export-pdf-button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F26B33] text-white rounded-lg hover:bg-[#E05A22] transition-colors">
              <FileText className="w-3 h-3" /> PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-[#FEE2E2] border border-[#EF4444]/30 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-xs text-[#D32F2F]">{error}</span>
            <button onClick={() => load(date)} className="text-xs font-semibold text-[#EF4444] underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-[#E5E5E5] rounded-lg h-24 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && audit && (
          <>
            {/* Section A — Occupancy */}
            <SectionCard id="A" title={`A. ${SECTION_LABELS.A}`} badge={`${fmt(audit.occupancy.occupancyPercent)}% occ`} testId="section-occupancy">
              <div className="flex gap-2 flex-wrap mb-3">
                <StatTile label="Rooms Available" value={audit.occupancy.roomsAvailable} />
                <StatTile label="Rooms Sold" value={audit.occupancy.roomsSold} color="text-[#F26B33]" />
                <StatTile label="Occupancy %" value={`${fmt(audit.occupancy.occupancyPercent)}%`} color="text-[#F26B33]" />
                <StatTile label="In-House" value={audit.occupancy.inHouse} />
                <StatTile label="Arrivals (actual)" value={audit.occupancy.arrivalsActual} color="text-[#329937]" />
                <StatTile label="Departures" value={audit.occupancy.departuresActual} />
              </div>
              {audit.occupancy.byRoomType.length > 0 && (
                <TableWrap>
                  <thead><tr><TH>Room Type</TH><TH>Capacity</TH><TH>Available</TH><TH>Sold</TH><TH>Occupancy %</TH></tr></thead>
                  <tbody>
                    {audit.occupancy.byRoomType.map((rt, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                        <TD>{rt.roomCode}</TD><TD>{rt.capacity}</TD><TD>{rt.available}</TD><TD>{rt.sold}</TD>
                        <TD className={rt.occupancyPercent > 100 ? 'text-[#EF4444] font-semibold' : 'text-[#F26B33] font-semibold'}>
                          {fmt(rt.occupancyPercent)}%{rt.occupancyPercent > 100 && ' ⚠'}
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </SectionCard>

            {/* Section B — Revenue */}
            <SectionCard id="B" title={`B. ${SECTION_LABELS.B}`} testId="section-revenue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2">By Tender Type</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['Cash', audit.revenue.collectedByTender.cash], ['Card', audit.revenue.collectedByTender.card],
                      ['UPI', audit.revenue.collectedByTender.upi], ['OTA Remittance', audit.revenue.collectedByTender.otaRemittance]].map(([l, v]) => (
                      <div key={l} className="flex justify-between items-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-2">
                        <span className="text-[11px] font-medium text-[#444]">{l}</span>
                        <span className="text-xs font-bold">{fmtINR(v)}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex justify-between items-center bg-[#FFF4F0] border border-[#F26B33] rounded-lg px-3 py-2">
                      <span className="text-[11px] font-semibold text-[#F26B33]">Total Collected (Revenue)</span>
                      <span className="text-xs font-bold text-[#F26B33]">{fmtINR(audit.revenue.roomRevenueCollected)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2">By Stage</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['Advance (booking)', audit.revenue.collectedByStage.advanceAtBooking],
                      ['Advance (check-in)', audit.revenue.collectedByStage.advanceAtCheckin],
                      ['Mid-stay', audit.revenue.collectedByStage.midStay],
                      ['Checkout', audit.revenue.collectedByStage.checkout]].map(([l, v]) => (
                      <div key={l} className="flex justify-between items-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-2">
                        <span className="text-[11px] font-medium text-[#444]">{l}</span>
                        <span className="text-xs font-bold">{fmtINR(v)}</span>
                      </div>
                    ))}
                    <div className="col-span-2 flex justify-between items-center bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-3 py-2">
                      <span className="text-[11px] font-medium text-[#444]">Room Sales (Booked)</span>
                      <span className="text-xs font-bold">{fmtINR(audit.revenue.roomSalesBooked)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2">F&amp;B Posted to Rooms (separate)</div>
              <div className="flex gap-2 flex-wrap">
                <StatTile label="F&B Orders" value={audit.fnbPostedToRooms.orders ?? '—'} />
                <StatTile label="Amount" value={fmtINR(audit.fnbPostedToRooms.amount)} />
                <StatTile label="Collected" value={fmtINR(audit.fnbPostedToRooms.collected)} color="text-[#329937]" />
                <StatTile label="Outstanding" value={fmtINR(audit.fnbPostedToRooms.outstanding)} />
                <StatTile label="TRevPAR" value={fmtINR(audit.fnbPostedToRooms.trevpar)} color="text-[#F26B33]" />
              </div>
            </SectionCard>

            {/* Section C — Outstanding */}
            <SectionCard id="C" title={`C. ${SECTION_LABELS.C}`}
              badge={audit.outstanding.totalBalance > 0 ? fmtINR(audit.outstanding.totalBalance) + ' total' : null}
              accent="#EF4444" testId="section-outstanding">
              {hasNullGuests && <WarnBanner msg="Guest name, room code, check-in/checkout currently null from backend (BN-1). Backend fix pending. Showing '—'." />}
              <TableWrap>
                <thead><tr><TH>Room</TH><TH>Guest</TH><TH>Check-in</TH><TH>Check-out</TH><TH>Channel</TH><TH>Room Balance</TH><TH>F&B Balance</TH><TH>Status</TH></tr></thead>
                <tbody>
                  {audit.outstanding.rows.length === 0
                    ? <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-[#888]">No outstanding balances</td></tr>
                    : audit.outstanding.rows.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                      <TD className="font-medium">{r.roomNo}</TD>
                      {r.guestName === '—' ? <NullCell /> : <TD>{r.guestName}</TD>}
                      {r.checkin === '—' ? <NullCell /> : <TD>{r.checkin}</TD>}
                      {r.checkout === '—' ? <NullCell /> : <TD>{r.checkout}</TD>}
                      <TD>{r.channel}</TD>
                      <TD className={r.roomBalance > 0 ? 'text-[#EF4444] font-semibold' : ''}>{fmtINR(r.roomBalance)}</TD>
                      <TD className={r.fnbBalance > 0 ? 'text-[#EF4444] font-semibold' : ''}>{fmtINR(r.fnbBalance)}</TD>
                      <TD><PayBadge s={r.paymentStatus} /></TD>
                    </tr>
                  ))}
                  {audit.outstanding.rows.length > 0 && (
                    <tr className="bg-[#FAFAFA] font-semibold border-t-2 border-[#E5E5E5]">
                      <td colSpan={5} className="px-3 py-2 text-xs">Total Outstanding</td>
                      <TD className="text-[#EF4444] font-bold">{fmtINR(audit.outstanding.totalRoomBalance)}</TD>
                      <TD className="text-[#EF4444] font-bold">{fmtINR(audit.outstanding.totalFnbBalance)}</TD>
                      <td />
                    </tr>
                  )}
                </tbody>
              </TableWrap>
            </SectionCard>

            {/* Section D — No-shows */}
            <SectionCard id="D" title={`D. ${SECTION_LABELS.D}`}
              badge={audit.noShows.count > 0 ? `${audit.noShows.count} no-show` : null}
              accent="#EF4444" defaultOpen={false} testId="section-no-shows">
              {audit.noShows.rows.length === 0
                ? <p className="text-xs text-[#888]">No no-shows for this date.</p>
                : <TableWrap>
                    <thead><tr><TH>Reservation</TH><TH>Guest</TH><TH>Channel</TH><TH>Check-in</TH><TH>Nights</TH><TH>Booked Value</TH><TH>Advance</TH></tr></thead>
                    <tbody>{audit.noShows.rows.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                        <TD>{r.reservationId}</TD><TD>{r.guestName}</TD><TD>{r.channel}</TD>
                        <TD>{r.checkin}</TD><TD>{r.nights}</TD>
                        <TD className="font-semibold">{fmtINR(r.bookedValue)}</TD>
                        <TD>{fmtINR(r.advanceCollected)}</TD>
                      </tr>
                    ))}</tbody>
                  </TableWrap>}
            </SectionCard>

            {/* Section E — Departures */}
            <SectionCard id="E" title={`E. ${SECTION_LABELS.E}`} accent="#329937" defaultOpen={false} testId="section-departures">
              {audit.departures.checkedOutPaid.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold text-[#329937] uppercase tracking-wide mb-1">Checked Out — Paid ({audit.departures.checkedOutPaid.length})</div>
                  <TableWrap>
                    <thead><tr><TH>Room</TH><TH>Guest</TH><TH>Room Revenue</TH><TH>Tender</TH><TH>Checked Out</TH></tr></thead>
                    <tbody>{audit.departures.checkedOutPaid.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                        <TD>{str(r.room_no)}</TD><TD>{str(r.guest_name)}</TD>
                        <TD className="text-[#329937] font-semibold">{fmtINR(r.room_collected)}</TD>
                        <TD>{str(r.tender)}</TD><TD>{str(r.checked_out_at)}</TD>
                      </tr>
                    ))}</tbody>
                  </TableWrap>
                </>
              )}
              {audit.departures.overdueInHouse.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold text-[#EF4444] uppercase tracking-wide mb-1">Overdue In-House ({audit.departures.overdueInHouse.length})</div>
                  <TableWrap>
                    <thead><tr><TH>Room</TH><TH>Guest</TH><TH>Original Checkout</TH><TH>Days Overdue</TH><TH>Room Balance</TH></tr></thead>
                    <tbody>{audit.departures.overdueInHouse.map((r, i) => (
                      <tr key={i} className="bg-[#FEE2E2]/30">
                        <TD>{str(r.room_no)}</TD><TD>{str(r.guest_name)}</TD>
                        <TD className="text-[#EF4444]">{str(r.checkout)}</TD>
                        <TD className="text-[#EF4444] font-semibold">{r.days_overdue ? `${r.days_overdue}d` : '—'}</TD>
                        <TD>{fmtINR(r.room_balance)}</TD>
                      </tr>
                    ))}</tbody>
                  </TableWrap>
                </div>
              )}
              {audit.departures.checkedOutPaid.length === 0 && audit.departures.overdueInHouse.length === 0 && (
                <p className="text-xs text-[#888]">No departure data for this date.</p>
              )}
            </SectionCard>

            {/* Section F — Room Status Close (OD-363-07: always show "as of now" badge) */}
            <SectionCard id="F" title={`F. ${SECTION_LABELS.F}`} testId="section-room-status-close">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF4F0] text-[#F26B33] border border-[#F26B33]/30">
                  <Clock className="w-3 h-3" /> Room status as of now
                </span>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                <StatTile label="Occupied" value={audit.roomStatusClose.occupied} color="text-[#F26B33]" />
                <StatTile label="Available" value={audit.roomStatusClose.available} color="text-[#329937]" />
                <StatTile label="HK / Dirty" value={audit.roomStatusClose.hk} color="text-[#D97706]" />
                <StatTile label="Out of Order" value={audit.roomStatusClose.ooo} />
                <StatTile label="Booked" value={audit.roomStatusClose.booked} />
              </div>
              {audit.roomStatusClose.rows.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(54px,1fr))] gap-1.5 mt-1">
                  {audit.roomStatusClose.rows.map((r, i) => {
                    const st = r.status?.toLowerCase();
                    const cls = STATUS_COLOR[st === 'occupied_hk' ? 'hk' : st] || STATUS_COLOR.ooo;
                    return (
                      <div key={i} className={`border rounded-md px-1 py-1.5 text-center text-[10px] font-medium ${cls}`}>
                        {r.roomNo}<br />
                        <span className="text-[9px] opacity-75">{st?.toUpperCase().slice(0,3) || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Section G — Audit Trail */}
            <SectionCard id="G" title={`G. ${SECTION_LABELS.G}`} accent="#888" defaultOpen={false} testId="section-audit-trail">
              {audit.auditTrail.length === 0
                ? <p className="text-xs text-[#888]">No audit trail events for this date.</p>
                : <div className="space-y-0">
                    {audit.auditTrail.map((e, i) => {
                      const dotColor = { check_in:'#329937', check_out:'#F26B33', payment:'#2563EB', transfer_to_room:'#D97706' }[e.type] || '#888';
                      return (
                        <div key={i} className="flex gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: dotColor }} />
                          <div className="text-[10px] text-[#888] min-w-[52px]">{e.at?.slice(11, 16) || '—'}</div>
                          <div>
                            <div className="text-[11px] font-semibold text-[#1A1A1A] capitalize">{e.type?.replace(/_/g,' ')} {e.roomNo !== '—' ? `— Room ${e.roomNo}` : ''}</div>
                            <div className="text-[10px] text-[#888]">
                              {e.orderId ? `Order #${e.orderId}` : ''}{e.by !== '—' ? ` · by ${e.by}` : ''}
                              {!e.hasDetail && e.type === 'transfer_to_room' ? ' · detail pending (BN-3)' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>}
            </SectionCard>

            {/* Section H — Reconciliation */}
            <SectionCard id="H" title={`H. ${SECTION_LABELS.H}`} accent="#329937" testId="section-reconciliation">
              {audit.reconciliation.settlementTotalCollection === null && (
                <WarnBanner msg="Settlement total & F&B share null from backend (BN-2). Showing available fields only. Backend brief filed." />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  {[['Room Settlement Share', fmtINR(audit.reconciliation.settlementRoomShare)],
                    ['Night Audit (Cash+Card+UPI)', fmtINR(audit.reconciliation.nightAuditRoomCashCardUpi)],
                    ['Settlement Total (all)', audit.reconciliation.settlementTotalCollection === null ? '— (BN-2)' : fmtINR(audit.reconciliation.settlementTotalCollection)],
                    ['F&B Share', audit.reconciliation.settlementFnbShare === null ? '— (BN-2)' : fmtINR(audit.reconciliation.settlementFnbShare)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-center py-2 border-b border-[#F0F0F0] last:border-0">
                      <span className="text-xs text-[#444]">{l}</span>
                      <span className={`text-xs font-bold ${v.includes('BN-2') ? 'text-[#ccc] italic text-[10px]' : ''}`}>{v}</span>
                    </div>
                  ))}
                  <div className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-bold ${audit.reconciliation.delta === 0 ? 'bg-[#F0F9F0] text-[#329937] border border-[#329937]/20' : 'bg-[#FEE2E2] text-[#EF4444] border border-[#EF4444]/20'}`}>
                    {audit.reconciliation.delta === 0 ? 'Delta: ₹0.00 — Balanced ✓' : `Delta: ${fmtINR(audit.reconciliation.delta)} ⚠`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#888] uppercase tracking-wide mb-2">Per Waiter</div>
                  <TableWrap>
                    <thead><tr><TH>ID</TH><TH>Name</TH><TH>Room Share</TH><TH>Total</TH></tr></thead>
                    <tbody>
                      {audit.reconciliation.byWaiter.length === 0
                        ? <tr><td colSpan={4} className="px-3 py-3 text-center text-xs text-[#888]">No waiter data</td></tr>
                        : audit.reconciliation.byWaiter.map((w, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                            <TD>{w.waiterId ?? '—'}</TD>
                            {w.name === '—' ? <NullCell /> : <TD>{w.name}</TD>}
                            <TD className="font-semibold">{fmtINR(w.roomShare)}</TD>
                            {w.todayCollection === 0 && audit.reconciliation.settlementTotalCollection === null ? <NullCell /> : <TD>{fmtINR(w.todayCollection)}</TD>}
                          </tr>
                        ))}
                    </tbody>
                  </TableWrap>
                </div>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

function str(v) { return v == null || v === '' ? '—' : String(v); }
