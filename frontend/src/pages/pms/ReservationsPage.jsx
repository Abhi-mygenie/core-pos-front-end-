// CR-358-P4: S2 — Tape Chart (rooms × dates Gantt; reuses getReservationOps via getTapeChartData — OD-P4-02; block popover OD-P4-04; unassigned OD-P4-05)
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTapeChartData, buildTapeChart, localDate } from '@/api/services/pmsService';
import { useRestaurant } from '@/contexts/RestaurantContext';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Loader2, AlertCircle, LogIn, FileText, X } from 'lucide-react';

const VIEWS = [7, 14, 30];
const COL_W = { 7: 108, 14: 64, 30: 36 };
const KIND_BAR   = { in_house: '#329937', departed: '#888', pending: '#F26B33' };
const KIND_BG    = { in_house: 'rgba(50,153,55,.08)', departed: 'rgba(136,136,136,.06)', pending: 'rgba(242,107,51,.08)' };
const KIND_LABEL = { in_house: 'In-house', departed: 'Departed', pending: 'Pending' };

const fmtDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const channelLabel = (c) => c === 'WalkIn' ? 'Walk-in' : (c ?? '—');
const shortId = (id) => id ? (id.length > 12 ? id.slice(0, 12) + '…' : id) : '';
const fmtRange = (dates) => {
  if (!dates || dates.length === 0) return '';
  const f = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f(dates[0])} – ${f(dates[dates.length - 1])}`;
};
const dayName = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const dayNum = (d) => new Date(`${d}T00:00:00`).getDate();
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };

const PahBadge = ({ pah }) => pah ? (
  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#FEF3C7] text-[#D97706]">PAY AT HOTEL</span>
) : (
  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#DCFCE7] text-[#16A34A]">PREPAID</span>
);

export default function ReservationsPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const [isExpanded, setIsExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') !== 'false');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);
  const [startDate, setStartDate] = useState(() => localDate(-2));
  const [popover, setPopover] = useState(null);
  const popRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getTapeChartData();
      setData(d);
    } catch (e) {
      setError(e?.message ?? 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  // Close popover on ESC / outside click
  useEffect(() => {
    if (!popover) return;
    const onKey = (e) => { if (e.key === 'Escape') setPopover(null); };
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target)) setPopover(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick, true);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick, true); };
  }, [popover]);

  const chart = useMemo(() => data && buildTapeChart({ ...data, startDate, days, today: data.today }), [data, startDate, days]);
  const step = Math.ceil(days / 2);
  const colW = COL_W[days] ?? 64;

  const handleBlockClick = (block, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({ block, anchorRect: rect });
  };

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="reservations-page">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Reservations · Tape Chart</h1>
            <p className="text-[13px] text-[#888] mt-0.5">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="tc-refresh-btn" onClick={load} disabled={loading}
              className="p-2 rounded-lg hover:bg-[#F7F7F7] text-[#888] disabled:opacity-40 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button data-testid="tc-new-booking-btn" onClick={() => navigate('/pms/new-booking')}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] transition-colors flex items-center gap-1.5">
              <Plus className="w-4 h-4" />New Booking
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-3 flex items-center gap-3 flex-wrap shrink-0">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[#E5E5E5] overflow-hidden">
            {VIEWS.map(v => (
              <button key={v} data-testid={`tc-view-${v}d`} onClick={() => setDays(v)}
                className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                style={days === v ? { backgroundColor: '#1A1A1A', color: '#fff' } : { color: '#555' }}>
                {v}d
              </button>
            ))}
          </div>

          {/* Navigation */}
          <button data-testid="tc-prev-btn" onClick={() => setStartDate(addDays(startDate, -step))}
            className="p-1.5 rounded-md hover:bg-[#F7F7F7] text-[#555] transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <button data-testid="tc-today-btn" onClick={() => setStartDate(localDate(-2))}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium border border-[#E5E5E5] hover:bg-[#F7F7F7] text-[#555] transition-colors">Today</button>
          <button data-testid="tc-next-btn" onClick={() => setStartDate(addDays(startDate, step))}
            className="p-1.5 rounded-md hover:bg-[#F7F7F7] text-[#555] transition-colors"><ChevronRight className="w-4 h-4" /></button>

          {/* Range label */}
          <span data-testid="tc-range-label" className="text-[12px] text-[#888] font-medium">{chart ? fmtRange(chart.dates) : ''}</span>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-3" data-testid="tc-legend">
            {Object.entries(KIND_LABEL).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1 text-[11px] text-[#555]">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: KIND_BAR[k] }} />{l}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[11px] text-[#555]">
              <span className="w-3 h-3 rounded-sm border-2 border-dashed border-[#F26B33]" />Unassigned
            </span>
          </div>
        </div>

        {/* Content */}
        {loading && !data ? (
          <div className="flex items-center justify-center h-64" data-testid="tc-loading">
            <Loader2 className="w-6 h-6 animate-spin text-[#888]" /><span className="ml-2 text-[14px] text-[#888]">Loading tape chart...</span>
          </div>
        ) : error && !data ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3" data-testid="tc-error">
            <AlertCircle className="w-8 h-8 text-[#EF4444]" /><p className="text-[14px] text-[#888]">{error}</p>
            <button onClick={load} className="px-4 py-2 text-[13px] rounded-lg bg-[#329937] text-white hover:bg-[#287a2d]">Retry</button>
          </div>
        ) : chart && chart.groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-[14px] text-[#888]" data-testid="tc-empty">
            No RM rooms mapped — <button onClick={() => navigate('/pms/channel-manager')} className="text-[#329937] underline">open Channel Manager</button>
          </div>
        ) : chart ? (
          <div className="flex-1 overflow-auto relative" data-testid="tc-grid">
            <table className="border-collapse" style={{ tableLayout: 'fixed', minWidth: 160 + chart.dates.length * colW }}>
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  <th className="sticky left-0 z-20 bg-white border-b border-r border-[#E5E5E5] px-3 py-2 text-left text-[12px] font-medium text-[#888]" style={{ width: 160 }}>Room</th>
                  {chart.dates.map((d, i) => {
                    const isToday = i === chart.todayIdx;
                    return (
                      <th key={d} data-testid={isToday ? 'tc-today-col' : `tc-day-col-${d}`}
                        className="border-b border-[#E5E5E5] px-1 py-2 text-center text-[11px] font-medium"
                        style={{ width: colW, backgroundColor: isToday ? 'rgba(50,153,55,.03)' : undefined, color: isToday ? '#329937' : '#888' }}>
                        {isToday ? <span className="inline-block px-1.5 py-0.5 rounded-full bg-[#329937] text-white text-[9px] font-bold mb-0.5">TODAY</span> : dayName(d)}
                        <br />{dayNum(d)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Unassigned section */}
                {chart.unassigned.length > 0 && (
                  <>
                    <tr><td colSpan={1 + chart.dates.length} data-testid="tc-unassigned-header"
                      className="bg-[#FFF7ED] px-3 py-2 text-[12px] font-semibold text-[#F26B33] border-b border-[#E5E5E5]">
                      Unassigned Bookings ({chart.unassigned.length})
                    </td></tr>
                    {chart.unassigned.map(res => {
                      const ci = res.checkin, co = res.checkout;
                      const ciIdx = Math.max(0, Math.round((new Date(`${ci}T00:00:00`) - new Date(`${chart.dates[0]}T00:00:00`)) / 86400000));
                      const coIdx = Math.min(chart.dates.length, Math.round((new Date(`${co}T00:00:00`) - new Date(`${chart.dates[0]}T00:00:00`)) / 86400000));
                      const span = Math.max(1, coIdx - ciIdx);
                      return (
                        <tr key={res.bookingId ?? res.id} data-testid={`tc-unassigned-row-${res.bookingId}`}>
                          <td className="sticky left-0 z-10 bg-white border-b border-r border-[#E5E5E5] px-3 py-2">
                            <div className="text-[12px] font-medium text-[#1A1A1A]">{res.roomCode ?? '?'} <span className="text-[#888] font-normal">(no room)</span></div>
                            <button data-testid={`tc-assign-room-btn-${res.bookingId}`} disabled title="Coming in Phase 5"
                              className="mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[#F7F7F7] text-[#888] cursor-not-allowed">Assign Room</button>
                          </td>
                          {chart.dates.map((d, di) => (
                            <td key={d} className="border-b border-[#E5E5E5] relative" style={{ width: colW, height: 48, backgroundColor: di === chart.todayIdx ? 'rgba(50,153,55,.03)' : undefined }}>
                              {di === ciIdx && (
                                <div className="absolute top-1 left-1 rounded-md border-2 border-dashed border-[#F26B33] px-1.5 py-0.5 text-[10px] text-[#F26B33] font-medium truncate"
                                  style={{ width: span * colW - 4, zIndex: 1, backgroundColor: 'rgba(242,107,51,.06)' }}
                                  title={`${channelLabel(res.channel)} · ${res.bookingId} · ${res.nights ?? 1}N`}>
                                  {channelLabel(res.channel)} · {res.nights ?? 1}N · {shortId(res.bookingId)}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </>
                )}

                {/* Room groups */}
                {chart.groups.map(g => (
                  <GroupRows key={g.type} group={g} chart={chart} colW={colW} onBlockClick={handleBlockClick} />
                ))}
              </tbody>
            </table>

            {/* Popover */}
            {popover && <BlockPopover popover={popover} popRef={popRef} setPopover={setPopover} navigate={navigate} />}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function GroupRows({ group, chart, colW, onBlockClick }) {
  return (
    <>
      <tr data-testid={`tc-group-${group.type}`}>
        <td colSpan={1 + chart.dates.length}
          className="bg-[#FAFAFA] px-3 py-1.5 text-[12px] font-semibold text-[#555] border-b border-[#E5E5E5] capitalize">
          {group.type} — {group.rooms.map(r => r.tableNo).join(', ')}
        </td>
      </tr>
      {group.rooms.map(room => {
        const blocks = chart.byRoom[room.id] ?? [];
        const badge = chart.rowStatus[room.id];
        return (
          <tr key={room.id} data-testid={`tc-room-row-${room.id}`}>
            <td className="sticky left-0 z-10 bg-white border-b border-r border-[#E5E5E5] px-3 py-2" style={{ width: 160 }}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#1A1A1A]">{room.tableNo}</span>
                {badge && (
                  <span data-testid={`tc-room-badge-${room.id}`}
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                    style={{ backgroundColor: badge === 'occupied' ? 'rgba(242,107,51,.12)' : 'rgba(136,136,136,.12)', color: badge === 'occupied' ? '#F26B33' : '#888' }}>
                    {badge === 'occupied' ? 'Occupied' : 'Booked'}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#888] mt-0.5">{room.roomType ? `${room.roomType} · ` : ''}id {room.id}</div>
            </td>
            {chart.dates.map((d, di) => (
              <td key={d} className="border-b border-[#E5E5E5] relative p-0" style={{ width: colW, height: 48, backgroundColor: di === chart.todayIdx ? 'rgba(50,153,55,.03)' : undefined }}>
                {blocks.filter(b => b.startIdx === di).map(block => (
                  <div key={block.key} data-testid={`tc-block-${block.res.bookingId}-${block.line.lineId}`}
                    className="absolute top-1 cursor-pointer transition-opacity hover:opacity-80"
                    style={{
                      left: 2, width: block.span * colW - 4, height: 38, zIndex: 2,
                      backgroundColor: KIND_BG[block.kind], borderLeft: `3px solid ${KIND_BAR[block.kind]}`,
                      borderRadius: block.clippedStart ? '0 6px 6px 0' : block.clippedEnd ? '6px 0 0 6px' : '6px',
                      opacity: block.kind === 'departed' ? 0.65 : 1,
                    }}
                    onClick={(e) => onBlockClick(block, e)}
                    title={`${block.res.guestName} · ${channelLabel(block.res.channel)} · ${block.res.checkin} → ${block.res.checkout}`}>
                    <div className="px-2 py-1 truncate">
                      <div className="text-[10px] font-medium text-[#1A1A1A] truncate">
                        {block.res.guestName}{block.kind === 'in_house' ? ' ✓' : ''} · {block.res.nights ?? 1}N
                      </div>
                      {colW >= 64 && (
                        <div className="text-[9px] text-[#888] truncate">{channelLabel(block.res.channel)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );
}

function BlockPopover({ popover, popRef, setPopover, navigate }) {
  const { block, anchorRect } = popover;
  const { res, line, kind } = block;
  const statusLabels = { in_house: 'In-house', departed: 'Departed', pending: 'Pending' };
  const statusColors = { in_house: '#329937', departed: '#888', pending: '#F26B33' };

  // Position: below the block, horizontally centered
  const top = anchorRect.bottom + 8;
  const left = Math.max(16, Math.min(anchorRect.left, window.innerWidth - 320));

  return (
    <div ref={popRef} data-testid="tc-popover"
      className="fixed bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-50 w-[300px]"
      style={{ top, left }}>
      <div className="px-4 pt-3 pb-2 border-b border-[#E5E5E5] flex items-start justify-between">
        <div>
          <div className="text-[14px] font-semibold text-[#1A1A1A]">{res.guestName}</div>
          <div className="text-[11px] text-[#888] mt-0.5">{channelLabel(res.channel)} · {res.bookingId}</div>
        </div>
        <button data-testid="tc-popover-close" onClick={() => setPopover(null)} className="p-1 hover:bg-[#F7F7F7] rounded transition-colors">
          <X className="w-3.5 h-3.5 text-[#888]" />
        </button>
      </div>
      <div className="px-4 py-2.5 space-y-1.5 text-[12px]">
        <div className="text-[#555]">{res.checkin} → {res.checkout} · {res.nights ?? 1} night{(res.nights ?? 1) !== 1 ? 's' : ''}</div>
        <div className="text-[#555]">Room {line.tableNo ?? '—'} ({res.roomCode ?? '—'})</div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: `${statusColors[kind]}18`, color: statusColors[kind] }}>
            {statusLabels[kind] ?? kind}
          </span>
          <PahBadge pah={res.pah} />
        </div>
        {res.amount != null && <div className="text-[13px] font-medium text-[#1A1A1A]">₹{Number(res.amount).toLocaleString('en-IN')}</div>}
      </div>
      <div className="px-4 pb-3 pt-1 flex gap-2">
        {kind === 'pending' && (
          <button data-testid="tc-popover-checkin-btn"
            onClick={() => { setPopover(null); navigate(`/pms/check-in?booking_id=${encodeURIComponent(res.bookingId ?? '')}`); }}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] transition-colors flex items-center gap-1">
            <LogIn className="w-3 h-3" />Check In
          </button>
        )}
        {kind === 'in_house' && line.orderId && (
          <button data-testid="tc-popover-folio-btn"
            onClick={() => { setPopover(null); navigate('/reports/rooms'); }}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium border border-[#F26B33] text-[#F26B33] hover:bg-[#FFF7ED] transition-colors flex items-center gap-1">
            <FileText className="w-3 h-3" />View Folio
          </button>
        )}
      </div>
    </div>
  );
}
