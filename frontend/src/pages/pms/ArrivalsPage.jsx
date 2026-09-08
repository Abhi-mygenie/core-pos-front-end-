// CR-358-P3: S9 — Arrivals (tabs Today/Upcoming/Late/Checked In, client pagination 20)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Loader2, AlertCircle, MessageSquare, BedDouble } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { getReservationOps } from '@/api/services/pmsService';

const TABS = [
  { key: 'today',     label: 'Today' },
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'late',      label: 'Late' },
  { key: 'checkedIn', label: 'Checked In' },
];
const PAGE_SIZE = 20; // OD-P3-07

// CR-358-P3: PAH/Prepaid badge (OD-P3-03)
const PahBadge = ({ pah }) => {
  if (pah === true) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#FEF3C7', color: '#92400E' }}>PAY AT HOTEL</span>;
  if (pah === false) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#D1FAE5', color: '#065F46' }}>Prepaid</span>;
  return null;
};

// CR-358-P3: Status pill
const StatusPill = ({ status }) => {
  const map = {
    pending:   { bg: '#FEF3C7', color: '#92400E', text: 'Pending' },
    late:      { bg: '#FEE2E2', color: '#991B1B', text: 'Late' },
    in_house:  { bg: '#D1FAE5', color: '#065F46', text: 'Checked In' },
  };
  const s = map[status] || map.pending;
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.text}</span>;
};

export default function ArrivalsPage() {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [page, setPage]         = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReservationOps();
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load arrivals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A-10: refetch on visibility change
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [load]);

  const tabData = {
    today:     data?.arrivalsToday    ?? [],
    upcoming:  data?.arrivalsUpcoming ?? [],
    late:      data?.arrivalsLate     ?? [],
    checkedIn: data?.checkedInToday   ?? [],
  };
  const rows = tabData[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows  = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const todayCount     = (data?.arrivalsToday ?? []).length;
  const upcomingCount  = (data?.arrivalsUpcoming ?? []).length;
  const lateCount      = (data?.arrivalsLate ?? []).length;
  const checkedInCount = (data?.checkedInToday ?? []).length;
  const srCount        = data?.withSpecialRequests ?? 0;

  const longDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="arrivals-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Today's Arrivals</h1>
            <p className="text-[12px] text-[#888] mt-0.5">{longDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <button data-testid="arr-new-booking-btn" onClick={() => navigate('/pms/new-booking')}
              className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#329937' }}>
              <Plus className="w-4 h-4" /> New Booking
            </button>
            <button data-testid="arr-refresh-btn" onClick={load}
              className="flex items-center gap-2 border border-[#E5E5E5] text-[13px] px-3 h-9 rounded-lg text-[#666] hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* KPI strip */}
          <div className="grid grid-cols-5 gap-4 mb-5" data-testid="arr-kpi-strip">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="arr-kpi-today">
              <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Today</div>
              <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{loading ? '—' : todayCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="arr-kpi-upcoming">
              <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Upcoming</div>
              <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{loading ? '—' : upcomingCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="arr-kpi-late">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#EF4444' }}>Late</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#EF4444' }}>{loading ? '—' : lateCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="arr-kpi-checked-in">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#329937' }}>Checked In</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#329937' }}>{loading ? '—' : checkedInCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="arr-kpi-sr">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#F59E0B' }}>With SR</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#F59E0B' }}>{loading ? '—' : srCount}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-[#E5E5E5]">
            {TABS.map(t => {
              const count = (tabData[t.key] ?? []).length;
              const active = activeTab === t.key;
              return (
                <button key={t.key} data-testid={`arr-tab-${t.key === 'checkedIn' ? 'checked-in' : t.key}`}
                  onClick={() => { setActiveTab(t.key); setPage(1); }}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${active ? 'border-[#F26B33] text-[#F26B33]' : 'border-transparent text-[#888] hover:text-[#1A1A1A]'}`}>
                  {t.label} ({loading ? '—' : count})
                </button>
              );
            })}
          </div>

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#888]" data-testid="arr-loading">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading arrivals...
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-20" data-testid="arr-error">
              <AlertCircle className="w-6 h-6 text-[#EF4444]" />
              <div className="text-sm font-medium text-[#1A1A1A]">{error}</div>
              <button onClick={load} className="mt-2 px-3 py-1.5 text-xs rounded border border-[#E5E5E5] text-[#666] hover:bg-gray-50">Retry</button>
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#888]" data-testid="arr-empty">
              <BedDouble className="w-8 h-8" />
              <div className="text-sm">
                {activeTab === 'today' && 'No arrivals today'}
                {activeTab === 'upcoming' && 'No upcoming arrivals'}
                {activeTab === 'late' && 'No late arrivals'}
                {activeTab === 'checkedIn' && 'No check-ins today'}
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && rows.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden" data-testid="arr-table">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-left text-[11px] font-semibold uppercase text-[#888] tracking-wide">
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Room Type</th>
                      <th className="px-4 py-3">Guests</th>
                      <th className="px-4 py-3">Nights</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">SR</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row) => {
                      const isCheckedIn = row.operationalStatus === 'in_house';
                      const statusKey = activeTab === 'late' ? 'late' : (isCheckedIn ? 'in_house' : 'pending');
                      const hasSR = (row.specialRequests ?? '').trim() !== '';
                      return (
                        <tr key={row.bookingId ?? row.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]" data-testid={`arr-row-${row.bookingId ?? row.id}`}>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.bookingType === 'Direct' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {row.channel ?? row.bookingType ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#1A1A1A]">{row.guestName || '—'}</div>
                            {row.phone && <div className="text-[11px] text-[#888]">{row.phone}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#1A1A1A]">{row.roomCode ?? '—'}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              {row.mealPlan && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">{row.mealPlan}</span>}
                              {row.roomCount > 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">+{row.roomCount - 1} rooms</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#1A1A1A]">{row.adults ?? 1}A{(row.children ?? 0) > 0 ? ` · ${row.children}C` : ''}</td>
                          <td className="px-4 py-3 text-[#1A1A1A]">{row.nights ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="text-[#1A1A1A] font-medium">{row.amount != null ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}</div>
                            <PahBadge pah={row.pah} />
                          </td>
                          <td className="px-4 py-3">
                            {hasSR ? (
                              <span title={row.specialRequests} className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
                            ) : <span className="text-[#888]">—</span>}
                          </td>
                          <td className="px-4 py-3"><StatusPill status={statusKey} /></td>
                          <td className="px-4 py-3">
                            {isCheckedIn ? (
                              <button data-testid={`arr-view-btn-${row.bookingId}`}
                                onClick={() => navigate('/pms/in-house')}
                                className="px-3 py-1.5 rounded text-[12px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-gray-50">
                                View
                              </button>
                            ) : (
                              <button data-testid={`arr-checkin-btn-${row.bookingId}`}
                                onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(row.bookingId)}`)}
                                className="px-3 py-1.5 rounded text-[12px] font-semibold text-white" style={{ background: '#329937' }}>
                                Check In
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {rows.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 text-[13px] text-[#888]" data-testid="arr-pagination">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}</span>
                  <div className="flex gap-1">
                    <button data-testid="arr-page-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 rounded border border-[#E5E5E5] disabled:opacity-40 hover:bg-gray-50">Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i + 1} onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 rounded border ${page === i + 1 ? 'border-[#F26B33] text-[#F26B33] bg-orange-50' : 'border-[#E5E5E5] hover:bg-gray-50'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button data-testid="arr-page-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 rounded border border-[#E5E5E5] disabled:opacity-40 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
