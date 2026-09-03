// CR-358-P3: S10 — Departures (tabs Overdue/Due Today/Upcoming/Checked Out, client pagination 20, in-page checkout slider OD-P3-01 d)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Loader2, AlertCircle, LogOut, Receipt, BedDouble } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import { getReservationOps } from '@/api/services/pmsService';
import PmsCheckoutDrawer from '@/components/pms/PmsCheckoutDrawer';

const TABS = [
  { key: 'overdue',    label: 'Overdue' },
  { key: 'due',        label: 'Due Today' },
  { key: 'upcoming',   label: 'Upcoming' },
  { key: 'checkedOut', label: 'Checked Out' },
];
const PAGE_SIZE = 20; // OD-P3-07

// CR-358-P3: PAH/Prepaid badge (OD-P3-03)
const PahBadge = ({ pah }) => {
  if (pah === true) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#FEF3C7', color: '#92400E' }}>PAY AT HOTEL</span>;
  if (pah === false) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#D1FAE5', color: '#065F46' }}>Prepaid</span>;
  return null;
};

// CR-358-P3: Folio badge (OD-P3-03)
const FolioBadge = ({ status }) => {
  if (status === 'paid') return <span className="text-[11px] font-semibold" style={{ color: '#329937' }}>Clear</span>;
  if (status === 'unpaid') return <span className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>Open</span>;
  return <span className="text-[11px] text-[#888]">&mdash;</span>;
};

// CR-358-P3: Status pill
const StatusPill = ({ tab }) => {
  const map = {
    overdue:    { bg: '#FEE2E2', color: '#991B1B', text: 'Overdue' },
    due:        { bg: '#FFF7ED', color: '#C2410C', text: 'Due' },
    upcoming:   { bg: '#F3F4F6', color: '#4B5563', text: 'Upcoming' },
    checkedOut: { bg: '#D1FAE5', color: '#065F46', text: 'Done' },
  };
  const s = map[tab] || map.upcoming;
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.text}</span>;
};

export default function DeparturesPage() {
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('due');
  const [page, setPage]         = useState(1);
  const [checkout, setCheckout] = useState(null); // { orderId, roomNo, guestName }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReservationOps();
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load departures');
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

  const handleCheckoutSuccess = useCallback(({ orderId: oid }) => {
    toast.success(`Checked out · Room ${checkout?.roomNo || ''}`);
    setCheckout(null);
    load();
  }, [checkout, load]);

  // Tab data mapping
  const tabData = {
    overdue:    data?.depOverdue    ?? [],
    due:        data?.depDueToday   ?? [],
    upcoming:   data?.depUpcoming   ?? [],
    checkedOut: data?.depCheckedOut ?? [],
  };
  const rows = tabData[activeTab] || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows  = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // KPI counts
  const overdueCount    = (data?.depOverdue ?? []).length;
  const dueCount        = (data?.depDueToday ?? []).length;
  const checkedOutCount = (data?.depCheckedOut ?? []).length;
  const totalDue        = overdueCount + dueCount;

  const longDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="departures-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Today's Departures</h1>
            <p className="text-[12px] text-[#888] mt-0.5">{longDate} · Check-out by 11:00 AM</p>
          </div>
          <button data-testid="dep-refresh-btn" onClick={load}
            className="flex items-center gap-2 border border-[#E5E5E5] text-[13px] px-3 h-9 rounded-lg text-[#666] hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="p-6">
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-4 mb-5" data-testid="dep-kpi-strip">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="dep-kpi-total">
              <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Total Due</div>
              <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{loading ? '—' : totalDue}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="dep-kpi-overdue">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#EF4444' }}>Overdue</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#EF4444' }}>{loading ? '—' : overdueCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="dep-kpi-due">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#F26B33' }}>Due Today</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#F26B33' }}>{loading ? '—' : dueCount}</div>
            </div>
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="dep-kpi-checked-out">
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#329937' }}>Checked Out</div>
              <div className="text-[22px] font-bold mt-1" style={{ color: '#329937' }}>{loading ? '—' : checkedOutCount}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-[#E5E5E5]">
            {TABS.map(t => {
              const count = (tabData[t.key] ?? []).length;
              const active = activeTab === t.key;
              return (
                <button key={t.key} data-testid={`dep-tab-${t.key === 'due' ? 'due' : t.key === 'checkedOut' ? 'checked-out' : t.key}`}
                  onClick={() => { setActiveTab(t.key); setPage(1); }}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${active ? 'border-[#F26B33] text-[#F26B33]' : 'border-transparent text-[#888] hover:text-[#1A1A1A]'}`}>
                  {t.label} ({loading ? '—' : count})
                </button>
              );
            })}
          </div>

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#888]" data-testid="dep-loading">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading departures...
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-20" data-testid="dep-error">
              <AlertCircle className="w-6 h-6 text-[#EF4444]" />
              <div className="text-sm font-medium text-[#1A1A1A]">{error}</div>
              <button onClick={load} className="mt-2 px-3 py-1.5 text-xs rounded border border-[#E5E5E5] text-[#666] hover:bg-gray-50">Retry</button>
            </div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-[#888]" data-testid="dep-empty">
              <BedDouble className="w-8 h-8" />
              <div className="text-sm">
                {activeTab === 'overdue' && 'No overdue departures'}
                {activeTab === 'due' && 'No departures due today'}
                {activeTab === 'upcoming' && 'No upcoming departures'}
                {activeTab === 'checkedOut' && 'No checked out rooms'}
              </div>
            </div>
          )}

          {/* Table */}
          {!loading && !error && rows.length > 0 && (
            <>
              <div className="bg-white rounded-lg border border-[#E5E5E5] overflow-hidden" data-testid="dep-table">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-left text-[11px] font-semibold uppercase text-[#888] tracking-wide">
                      <th className="px-4 py-3">Room</th>
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Guests</th>
                      <th className="px-4 py-3">Check-out</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Folio</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, idx) => {
                      const lineId = row.line?.lineId ?? row.orderId ?? `${row.bookingId}-${idx}`;
                      const adults = row.line?.adults ?? row.adults ?? 1;
                      const children = row.line?.children ?? row.children ?? 0;
                      const tNo = row.tableNo ?? row.line?.tableNo;
                      const rCode = row.line?.roomCode ?? row.roomCode;
                      const coDate = activeTab === 'checkedOut'
                        ? (row.line?.checkedOutAt ? new Date(row.line.checkedOutAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '—')
                        : (row.checkout ?? '—');
                      return (
                        <tr key={lineId} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]" data-testid={`dep-row-${lineId}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#1A1A1A]">{tNo ?? '—'}</div>
                            {rCode && <div className="text-[11px] text-[#888]">{rCode}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#1A1A1A]">{row.guestName || '—'}</div>
                            {row.phone && <div className="text-[11px] text-[#888]">{row.phone}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.bookingType === 'Direct' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {row.channel ?? row.bookingType ?? '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#1A1A1A]">{adults}A{children > 0 ? ` · ${children}C` : ''}</td>
                          <td className="px-4 py-3">
                            {activeTab === 'overdue' && <span className="text-[#EF4444] font-semibold text-[11px] uppercase">OVERDUE</span>}
                            {activeTab !== 'overdue' && <span className="text-[#1A1A1A]">{coDate}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#1A1A1A] font-medium">{row.amount != null ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}</div>
                            <PahBadge pah={row.pah} />
                          </td>
                          <td className="px-4 py-3"><FolioBadge status={row.paymentStatus} /></td>
                          <td className="px-4 py-3"><StatusPill tab={activeTab} /></td>
                          <td className="px-4 py-3">
                            {activeTab === 'checkedOut' ? (
                              <button data-testid={`dep-receipt-btn-${row.orderId || lineId}`}
                                onClick={() => navigate('/reports/room-orders')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-gray-50">
                                <Receipt className="w-3.5 h-3.5" /> Receipt
                              </button>
                            ) : (
                              <button data-testid={`dep-checkout-btn-${row.orderId || lineId}`}
                                disabled={!row.orderId}
                                title={!row.orderId ? 'No room order linked' : `Check out Room ${tNo}`}
                                onClick={() => row.orderId && setCheckout({ orderId: row.orderId, roomNo: tNo, guestName: row.guestName })}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: row.orderId ? '#329937' : '#ccc' }}>
                                <LogOut className="w-3.5 h-3.5" /> Check Out
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
                <div className="flex items-center justify-between mt-4 text-[13px] text-[#888]" data-testid="dep-pagination">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}</span>
                  <div className="flex gap-1">
                    <button data-testid="dep-page-prev" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1 rounded border border-[#E5E5E5] disabled:opacity-40 hover:bg-gray-50">Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button key={i + 1} onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 rounded border ${page === i + 1 ? 'border-[#F26B33] text-[#F26B33] bg-orange-50' : 'border-[#E5E5E5] hover:bg-gray-50'}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button data-testid="dep-page-next" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 rounded border border-[#E5E5E5] disabled:opacity-40 hover:bg-gray-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Checkout slider */}
      <PmsCheckoutDrawer
        open={!!checkout}
        orderId={checkout?.orderId}
        roomNo={checkout?.roomNo}
        guestName={checkout?.guestName}
        onClose={() => setCheckout(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
