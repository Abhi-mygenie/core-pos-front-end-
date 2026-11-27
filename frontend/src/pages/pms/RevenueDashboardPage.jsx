// CR-366 — Revenue Dashboard page
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, FileText, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react'; // BUG-416: ArrowLeft added
import { useNavigate } from 'react-router-dom'; // BUG-416
import Sidebar from '../../components/layout/Sidebar'; // BUG-416
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
} from 'recharts';
import { getRevenueSummary } from '../../api/services/pmsService';
import { localDate } from '../../api/services/pmsService';
import * as revenueTransform from '../../api/transforms/revenueTransform';
import { openReportWindow, exportReportAsPDF, exportReportAsExcel } from '../../utils/reportExporter';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useAuth } from '../../contexts/AuthContext';

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtINR = (n) => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtL = (n) => { if (n == null) return '—'; const v = Number(n); return v >= 100000 ? '₹' + (v/100000).toFixed(2) + 'L' : '₹' + v.toLocaleString('en-IN'); };
const fmtK = (n) => { if (n == null) return n; const v = Number(n); return v >= 1000 ? (v/1000).toFixed(1) + 'k' : String(Math.round(v)); };
const fmtDate = (s) => { if (!s || s === '—') return s; try { return new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); } catch { return s; } };

const PRESETS = [
  { id: 'today', label: 'Today',  offset: 0 },
  { id: '7d',   label: '7D',     offset: -6 },
  { id: '30d',  label: '30D',    offset: -29 },
  { id: 'custom', label: 'Custom', offset: null },
];

const TableWrap = ({ children }) => (
  <div className="overflow-x-auto border border-[#E5E5E5] rounded-lg">
    <table className="w-full border-collapse text-xs">{children}</table>
  </div>
);
const TH = ({ c, children }) => <th className={`px-3 py-2 text-[10px] font-semibold text-[#666] uppercase tracking-wide bg-[#FAFAFA] border-b border-[#E5E5E5] whitespace-nowrap ${c||'text-left'}`}>{children}</th>;
const TD = ({ c, children }) => <td className={`px-3 py-2 text-[#1A1A1A] border-b border-[#F0F0F0] whitespace-nowrap ${c||''}`}>{children ?? '—'}</td>;

const Card = ({ title, testId, children }) => (
  <div className="bg-white border border-[#E5E5E5] rounded-lg shadow-sm overflow-hidden" data-testid={testId}>
    <div className="px-4 py-3 border-b border-[#F5F5F5] flex items-center gap-2">
      <div className="w-1 h-4 rounded-sm bg-[#F26B33]" />
      <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

// OD-366-08 = Option A: side-by-side KPI tile
const KpiTile = ({ label, occupancy, booked, collected, single, testId }) => (
  <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-3" data-testid={testId}>
    <div className="text-[10px] font-medium text-[#888] uppercase tracking-wide mb-1.5">{label}</div>
    {single !== undefined ? (
      <div className="text-xl font-bold text-[#F26B33]">{single}</div>
    ) : occupancy !== undefined ? (
      <div className="text-xl font-bold text-[#F26B33]">{occupancy}</div>
    ) : (
      <div className="flex gap-3 mt-1">
        <div>
          <div className="flex items-center gap-1 text-[9px] font-semibold text-[#F26B33] uppercase tracking-wide mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F26B33] inline-block" /> Sales
          </div>
          <div className="text-base font-bold text-[#F26B33]">{booked}</div>
        </div>
        <div className="w-px bg-[#E5E5E5]" />
        <div>
          <div className="flex items-center gap-1 text-[9px] font-semibold text-[#329937] uppercase tracking-wide mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#329937] inline-block" /> Revenue
          </div>
          <div className="text-base font-bold text-[#329937]">{collected}</div>
        </div>
      </div>
    )}
  </div>
);

export default function RevenueDashboardPage() { // CR-366
  const navigate = useNavigate(); // BUG-416
  const [isSidebarExpanded, setIsSidebarExpanded] = useState( // BUG-416
    () => localStorage.getItem('mygenie_sidebar_expanded') !== 'false'
  );
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const [preset, setPreset] = useState('7d');
  const [startDate, setStartDate] = useState(localDate(-6));
  const [endDate, setEndDate] = useState(localDate(0));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async (s, e) => {
    if (abortRef.current) abortRef.current = false;
    const token = {};
    abortRef.current = token;
    setLoading(true); setError(null);
    try {
      const groupBy = revenueTransform.groupByAutoSelect(s, e);
      const raw = await getRevenueSummary({ startDate: s, endDate: e, groupBy });
      if (token !== abortRef.current) return;
      setData(revenueTransform.fromAPI(raw));
    } catch (err) {
      if (token !== abortRef.current) return;
      setError(err?.response?.data?.message || 'Failed to load revenue data. Please try again.');
    } finally {
      if (token === abortRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(startDate, endDate); }, [startDate, endDate, load]);

  const applyPreset = (p) => {
    setPreset(p.id);
    if (p.id !== 'custom') {
      setStartDate(localDate(p.offset));
      setEndDate(localDate(0));
    }
  };

  const groupBy = data ? data.range.groupBy : revenueTransform.groupByAutoSelect(startDate, endDate);
  const isMonth = groupBy === 'month';

  const series = data?.series ?? [];
  const chartData = series.map(b => ({
    label:   fmtDate(b.bucketStart),
    occ:     b.occupancyPercent ?? 0,
    sold:    b.roomsSold,
    booked:  b.roomRevenueBooked,
    collected: b.roomRevenueCollected,
    fnb:     b.fnbRevenuePosted,
    adrB:    b.adrBooked,
    adrC:    isMonth ? null : b.adrCollected,
    revparB: b.revparBooked,
    revparC: isMonth ? null : b.revparCollected,
  }));

  const t = data?.totals;

  const buildExportParams = () => ({
    title: 'Revenue Dashboard',
    subtitle: `${startDate} to ${endDate}`,
    restaurant: { name: restaurant?.name || '' },
    dateRange: { from: startDate, to: endDate },
    generatedBy: user?.name || '',
    kpis: t ? [
      { label: 'Occupancy %',   value: t.occupancyPercent != null ? `${fmt(t.occupancyPercent)}%` : '—' },
      { label: 'ADR (Booked)',  value: fmtINR(t.adrBooked) },
      { label: 'RevPAR',        value: fmtINR(t.revparBooked) },
      { label: 'Revenue',       value: fmtL(t.roomRevenueCollected) },
    ] : [],
    sheets: [],
  });

  const handlePDF = () => { const w = openReportWindow(); exportReportAsPDF(w, buildExportParams()); };
  const handleExcel = () => exportReportAsExcel(buildExportParams(), `Revenue_Dashboard_${startDate}_${endDate}.xls`);

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="revenue-dashboard-page"> {/* BUG-416 */}
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={v => {
        setIsSidebarExpanded(v);
        localStorage.setItem('mygenie_sidebar_expanded', String(v));
      }} />
      <main className="flex-1 overflow-auto">
      <div className="px-4 py-5" style={{ fontFamily: "'Poppins','Inter',sans-serif" }}>
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */} {/* BUG-416: back button added */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} data-testid="revenue-dashboard-back-btn"
              className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#555] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Revenue Dashboard</h1>
              <p className="text-xs text-[#888] mt-0.5">Hotel financial performance &amp; occupancy analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-white border border-[#E5E5E5] rounded-lg p-1" data-testid="date-pills">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => applyPreset(p)} data-testid={`pill-${p.id}`}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${preset === p.id ? 'bg-[#F26B33] text-white' : 'text-[#666] hover:text-[#F26B33]'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="flex items-center gap-1">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-[#E5E5E5] rounded-lg bg-white outline-none focus:border-[#F26B33]" />
                <span className="text-xs text-[#888]">–</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-[#E5E5E5] rounded-lg bg-white outline-none focus:border-[#F26B33]" />
              </div>
            )}
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
          <div className="bg-[#FEE2E2] border border-[#EF4444]/30 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-[#D32F2F]">{error}</span>
            <button onClick={() => load(startDate, endDate)} className="text-xs font-semibold text-[#EF4444] underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-white border border-[#E5E5E5] rounded-lg animate-pulse" />)}
          </div>
        )}

        {!loading && t && (
          <>
            {/* KPI Tiles — OD-366-08=A: side-by-side */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiTile label="Occupancy Rate" occupancy={t.occupancyPercent != null ? `${fmt(t.occupancyPercent)}%` : '—'} testId="kpi-occupancy" />
              <KpiTile label="ADR" booked={fmtINR(t.adrBooked)} collected={fmtINR(t.adrCollected)} testId="kpi-adr" />
              <KpiTile label="RevPAR" booked={fmtINR(t.revparBooked)} collected={fmtINR(t.revparCollected)} testId="kpi-revpar" />
              <KpiTile label="Room Revenue" booked={fmtL(t.roomRevenueBooked)} collected={fmtL(t.roomRevenueCollected)} testId="kpi-room-revenue" />
              <KpiTile label="TRevPAR" single={fmtINR(t.trevpar)} testId="kpi-trevpar" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Occupancy Trend" testId="chart-occupancy">
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
                    <YAxis yAxisId="occ" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
                    <YAxis yAxisId="sold" orientation="right" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} />
                    <ReTooltip contentStyle={{ fontSize: 11, border: '1px solid #E5E5E5', borderRadius: 6 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Line yAxisId="occ" type="monotone" dataKey="occ" stroke="#329937" strokeWidth={2} dot={{ r: 2 }} name="Occupancy %" animationDuration={500} />
                    <Line yAxisId="sold" type="monotone" dataKey="sold" stroke="#F26B33" strokeWidth={2} dot={{ r: 2 }} name="Rooms Sold" animationDuration={500} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Revenue — Booked vs Collected" testId="chart-revenue">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                    <ReTooltip contentStyle={{ fontSize: 11, border: '1px solid #E5E5E5', borderRadius: 6 }} formatter={v => fmtINR(v)} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="booked" fill="#F26B33" fillOpacity={0.85} radius={[3,3,0,0]} name="Booked (Sales)" animationDuration={500} />
                    <Bar dataKey="collected" fill="#329937" fillOpacity={0.75} radius={[3,3,0,0]} name="Collected (Revenue)" animationDuration={500} />
                    <Bar dataKey="fnb" fill="#F4A11A" fillOpacity={0.65} radius={[3,3,0,0]} name="F&B Posted" animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* ADR & RevPAR chart — month view suppresses collected lines (BN-6) */}
            <Card title={`ADR & RevPAR Trend${isMonth ? ' (monthly — collected line N/A)' : ''}`} testId="chart-adr-revpar">
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={{ stroke: '#E5E5E5' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} tickFormatter={v => '₹' + fmtK(v)} />
                  <ReTooltip contentStyle={{ fontSize: 11, border: '1px solid #E5E5E5', borderRadius: 6 }} formatter={v => fmtINR(v)} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="adrB" stroke="#F26B33" strokeWidth={2} dot={{ r: 2 }} name="ADR Booked" animationDuration={500} />
                  {!isMonth && <Line type="monotone" dataKey="adrC" stroke="#F26B33" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="ADR Collected" animationDuration={500} />}
                  <Line type="monotone" dataKey="revparB" stroke="#329937" strokeWidth={2} dot={{ r: 2 }} name="RevPAR Booked" animationDuration={500} />
                  {!isMonth && <Line type="monotone" dataKey="revparC" stroke="#329937" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="RevPAR Collected" animationDuration={500} />}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Breakdown tables 2×2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="By Booking Channel" testId="table-channel">
                <TableWrap>
                  <thead><tr><TH>Channel</TH><TH c="text-right">Room Nights</TH><TH c="text-right">Rev Booked</TH><TH c="text-right">Share %</TH></tr></thead>
                  <tbody>
                    {(data.byChannel ?? []).length === 0
                      ? <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-[#888]">No data</td></tr>
                      : (data.byChannel ?? []).map((ch, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                          <TD>{ch.channel}</TD>
                          <TD c="text-right">{ch.roomNights}</TD>
                          <TD c="text-right font-semibold">{fmtINR(ch.roomRevenueBooked)}</TD>
                          <TD c="text-right text-[#F26B33] font-semibold">{fmt(ch.shareOfRevenuePct)}%</TD>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              </Card>

              <Card title="By Room Type" testId="table-room-type">
                <TableWrap>
                  <thead><tr><TH>Type</TH><TH c="text-right">Sold Nights</TH><TH c="text-right">Rev Booked</TH><TH c="text-right">Rev Collected</TH><TH c="text-right">Occ %</TH></tr></thead>
                  <tbody>
                    {(data.byRoomType ?? []).length === 0
                      ? <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-[#888]">No data</td></tr>
                      : (data.byRoomType ?? []).map((rt, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                          <TD>{rt.roomCode}</TD>
                          <TD c="text-right">{rt.soldNights}</TD>
                          <TD c="text-right font-semibold">{fmtINR(rt.roomRevenueBooked)}</TD>
                          <TD c="text-right text-[#329937] font-semibold">{fmtINR(rt.roomRevenueCollected)}</TD>
                          <TD c={`text-right font-semibold ${rt.occupancyPercent > 100 ? 'text-[#EF4444]' : 'text-[#F26B33]'}`}>
                            {rt.occupancyPercent != null ? `${fmt(rt.occupancyPercent)}%` : '—'}
                          </TD>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              </Card>

              <Card title="By Payment Type" testId="table-payment-type">
                <TableWrap>
                  <thead><tr><TH>Payment Type</TH><TH c="text-right">Nights</TH><TH c="text-right">Booked</TH><TH c="text-right">Collected</TH><TH c="text-right">Outstanding</TH></tr></thead>
                  <tbody>
                    {(data.byPaymentType ?? []).length === 0
                      ? <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-[#888]">No data</td></tr>
                      : (data.byPaymentType ?? []).map((pt, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F7]'}>
                          <TD>{pt.paymentType}</TD>
                          <TD c="text-right">{pt.roomNights}</TD>
                          <TD c="text-right font-semibold">{fmtINR(pt.roomRevenueBooked)}</TD>
                          <TD c="text-right text-[#329937] font-semibold">{fmtINR(pt.roomRevenueCollected)}</TD>
                          <TD c={`text-right font-semibold ${pt.outstanding > 0 ? 'text-[#EF4444]' : ''}`}>{fmtINR(pt.outstanding)}</TD>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              </Card>

              {data.byBookingStatus && (
                <Card title="By Booking Status" testId="table-booking-status">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['Confirmed / Pending',  data.byBookingStatus.confirmedPendingArrival, '#2563EB'],
                      ['Checked In',           data.byBookingStatus.checkedIn,               '#329937'],
                      ['Checked Out',          data.byBookingStatus.checkedOut,              '#888'],
                      ['Cancelled',            data.byBookingStatus.cancelled,               '#EF4444'],
                      ['No-Show',              data.byBookingStatus.noShow,                  '#D97706'],
                    ].map(([l, v, c]) => (
                      <div key={l} className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-2.5 text-center">
                        <div className="text-lg font-bold" style={{ color: c }}>{v}</div>
                        <div className="text-[9px] text-[#888] mt-0.5 leading-tight">{l}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
      </div>
      </main>
    </div>
  );
}