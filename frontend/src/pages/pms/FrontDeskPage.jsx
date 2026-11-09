// CR-358-P3: S1 — Front Desk (server KPIs OD-P3-05, arrivals preview, departures mini-list → checkout slider, Channel Sync + Sync Now OD-P3-11 c)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Loader2, AlertCircle, LogOut, ExternalLink, BedDouble } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import { useRestaurant } from '@/contexts';
import { getReservationOps, getFrontDeskKpis, getChannelSyncStatus, syncNow as syncNowService } from '@/api/services/pmsService';
import PmsCheckoutDrawer from '@/components/pms/PmsCheckoutDrawer';

// CR-358-P3: PAH/Prepaid badge (OD-P3-03) — shared
const PahBadge = ({ pah }) => {
  if (pah === true) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#FEF3C7', color: '#92400E' }}>PAY AT HOTEL</span>;
  if (pah === false) return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: '#D1FAE5', color: '#065F46' }}>Prepaid</span>;
  return null;
};

// CR-358-P3: Status pill — shared
const StatusPill = ({ status }) => {
  const map = {
    pending:  { bg: '#FEF3C7', color: '#92400E', text: 'Pending' },
    in_house: { bg: '#D1FAE5', color: '#065F46', text: 'Checked In' },
  };
  const s = map[status] || map.pending;
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.text}</span>;
};

// CR-358-P3: Greeting by hour
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// CR-358-P3: Relative time from ISO timestamp
const relativeTime = (iso) => {
  if (!iso) return 'never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
};

export default function FrontDeskPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );

  const [ops, setOps]           = useState(null);
  const [kpis, setKpis]         = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [syncing, setSyncing]   = useState(false);
  const [checkout, setCheckout] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getReservationOps(),
        getFrontDeskKpis(),
        getChannelSyncStatus(),
      ]);
      // Ops failure is page-level error; KPI/status failures are tile-level "—"
      if (results[0].status === 'rejected') throw results[0].reason;
      setOps(results[0].value);
      setKpis(results[1].status === 'fulfilled' ? results[1].value : null);
      setSyncStatus(results[2].status === 'fulfilled' ? results[2].value : null);
    } catch (err) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load front desk data');
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

  // Sync Now handler (OD-P3-11 c)
  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncNowService();
      if (result.fetched && result.pushed) {
        toast.success('Bookings refreshed · inventory pushed');
      } else if (result.fetched && !result.pushed) {
        toast.warning('Bookings refreshed · inventory push failed');
      } else {
        toast.error(result.error ?? 'Sync failed');
      }
      await load(); // reload status + ops + KPIs
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [syncing, load]);

  const handleCheckoutSuccess = useCallback(({ orderId: oid }) => {
    toast.success(`Checked out · Room ${checkout?.roomNo || ''}`);
    setCheckout(null);
    load();
  }, [checkout, load]);

  // A-11: Preview lists
  const arrivalsPreview = useMemo(() => {
    if (!ops) return [];
    return [...(ops.arrivalsToday ?? []), ...(ops.checkedInToday ?? [])].slice(0, 6);
  }, [ops]);

  const departuresPreview = useMemo(() => {
    if (!ops) return [];
    return [...(ops.depOverdue ?? []), ...(ops.depDueToday ?? [])].slice(0, 3);
  }, [ops]);

  const totalArrivals    = (ops?.arrivalsToday ?? []).length + (ops?.checkedInToday ?? []).length;
  const totalDepartures  = (ops?.depOverdue ?? []).length + (ops?.depDueToday ?? []).length;

  const longDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="front-desk-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>{greeting()}</h1>
            <p className="text-[12px] text-[#888] mt-0.5">{longDate}{restaurant?.name ? ` · ${restaurant.name}` : ''}</p>
          </div>
          <button data-testid="fd-new-booking-btn" onClick={() => navigate('/pms/new-booking')}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#329937' }}>
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>

        <div className="p-6">
          {/* Loading / Error */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#888]" data-testid="fd-loading">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading front desk...
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-2 py-20" data-testid="fd-error">
              <AlertCircle className="w-6 h-6 text-[#EF4444]" />
              <div className="text-sm font-medium text-[#1A1A1A]">{error}</div>
              <button onClick={load} className="mt-2 px-3 py-1.5 text-xs rounded border border-[#E5E5E5] text-[#666] hover:bg-gray-50">Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* KPI tiles — 4 columns */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="fd-kpi-occupancy">
                  <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Occupancy</div>
                  <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{kpis?.occupancyPct != null ? `${kpis.occupancyPct}%` : '—'}</div>
                  <div className="text-[11px] text-[#888] mt-0.5">{kpis?.occupiedTonight != null ? `${kpis.occupiedTonight} of ${kpis.totalRooms ?? '?'} rooms` : '—'}</div>
                </div>
                <button className="bg-white rounded-lg border border-[#E5E5E5] p-4 text-left hover:border-[#F26B33] transition-colors" data-testid="fd-kpi-arrivals" onClick={() => navigate('/pms/arrivals')}>
                  <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Arrivals Today</div>
                  <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{kpis?.arrivalsCount ?? '—'}</div>
                  <div className="text-[11px] text-[#888] mt-0.5">{ops ? `${(ops.checkedInToday ?? []).length} checked in · ${(ops.arrivalsToday ?? []).length} pending` : '—'}</div>
                </button>
                <button className="bg-white rounded-lg border border-[#E5E5E5] p-4 text-left hover:border-[#F26B33] transition-colors" data-testid="fd-kpi-departures" onClick={() => navigate('/pms/departures')}>
                  <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">Departures</div>
                  <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{kpis?.departuresCount ?? '—'}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: (ops?.depOverdue ?? []).length > 0 ? '#EF4444' : '#888' }}>{ops ? `${(ops.depOverdue ?? []).length} overdue` : '—'}</div>
                </button>
                <button className="bg-white rounded-lg border border-[#E5E5E5] p-4 text-left hover:border-[#F26B33] transition-colors" data-testid="fd-kpi-inhouse" onClick={() => navigate('/pms/in-house')}>
                  <div className="text-[11px] font-semibold uppercase text-[#888] tracking-wide">In-House</div>
                  <div className="text-[22px] font-bold text-[#1A1A1A] mt-1">{kpis?.inHouseCount ?? '—'}</div>
                  <div className="text-[11px] text-[#888] mt-0.5">Currently staying</div>
                </button>
              </div>

              {/* 2-col body */}
              <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 320px' }}>
                {/* Left: Today's Arrivals card */}
                <div className="bg-white rounded-lg border border-[#E5E5E5]" data-testid="fd-arrivals-card">
                  <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
                    <div className="text-[14px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Today's Arrivals</div>
                    <span className="text-[12px] text-[#888]">Showing {arrivalsPreview.length} of {totalArrivals}</span>
                  </div>
                  {arrivalsPreview.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-[#888]">
                      <BedDouble className="w-6 h-6 mb-2" />
                      <span className="text-[13px]">No arrivals today</span>
                    </div>
                  ) : (
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-left text-[11px] font-semibold uppercase text-[#888] tracking-wide">
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Guest</th>
                          <th className="px-4 py-2">Room · Guests</th>
                          <th className="px-4 py-2">Balance</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arrivalsPreview.map((row) => {
                          const isCheckedIn = row.operationalStatus === 'in_house';
                          return (
                            <tr key={row.bookingId ?? row.id} className="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]" data-testid={`fd-arrival-row-${row.bookingId ?? row.id}`}>
                              <td className="px-4 py-2.5">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${row.bookingType === 'Direct' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {row.channel ?? row.bookingType ?? '—'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="font-medium text-[#1A1A1A]">{row.guestName || '—'}</div>
                                {row.phone && <div className="text-[11px] text-[#888]">{row.phone}</div>}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-[#1A1A1A]">{row.roomCode ?? '—'} · {row.nights ?? '—'}n</span>
                                <span className="text-[#888] ml-1">{row.adults ?? 1}A{(row.children ?? 0) > 0 ? ` · ${row.children}C` : ''}</span>
                                {(row.specialRequests ?? '').trim() !== '' && (
                                  <span title={row.specialRequests} className="inline-block w-2 h-2 rounded-full ml-1.5" style={{ background: '#F59E0B' }} />
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="text-[#1A1A1A] font-medium">{row.amount != null ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}</div>
                                <PahBadge pah={row.pah} />
                              </td>
                              <td className="px-4 py-2.5">
                                <StatusPill status={isCheckedIn ? 'in_house' : 'pending'} />
                              </td>
                              <td className="px-4 py-2.5">
                                {isCheckedIn ? (
                                  <button data-testid={`fd-view-btn-${row.bookingId}`} onClick={() => navigate('/pms/in-house')}
                                    className="px-2.5 py-1 rounded text-[11px] font-medium border border-[#E5E5E5] text-[#666] hover:bg-gray-50">View</button>
                                ) : (
                                  <button data-testid={`fd-checkin-btn-${row.bookingId}`} onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(row.bookingId)}`)}
                                    className="px-2.5 py-1 rounded text-[11px] font-semibold text-white" style={{ background: '#329937' }}>Check In</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  <div className="px-4 py-3 border-t border-[#E5E5E5]">
                    <button data-testid="fd-view-all-arrivals" onClick={() => navigate('/pms/arrivals')}
                      className="text-[12px] font-semibold flex items-center gap-1" style={{ color: '#F26B33' }}>
                      View all {totalArrivals} arrivals <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-5">
                  {/* Channel Sync card */}
                  <div className="bg-white rounded-lg border border-[#E5E5E5] p-4" data-testid="fd-sync-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[14px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Channel Sync</div>
                      <button data-testid="fd-sync-now-btn" onClick={handleSyncNow} disabled={syncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold border border-[#E5E5E5] text-[#666] hover:bg-gray-50 disabled:opacity-50">
                        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync Now
                      </button>
                    </div>
                    <div className="text-[12px] text-[#888]" data-testid="fd-sync-status">
                      AIOSELL · synced {relativeTime(syncStatus?.lastSyncAt)}
                    </div>
                    <div className="text-[12px] text-[#888] mt-1" data-testid="fd-available-tonight">
                      Available tonight: {kpis?.availableTonight != null ? `${kpis.availableTonight} / ${kpis.totalRooms ?? '?'}` : '—'}
                    </div>
                  </div>

                  {/* Departures Today card */}
                  <div className="bg-white rounded-lg border border-[#E5E5E5]" data-testid="fd-departures-card">
                    <div className="px-4 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
                      <div className="text-[14px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Departures Today</div>
                      <span className="text-[12px] text-[#888]">{totalDepartures}</span>
                    </div>
                    {departuresPreview.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-[#888]">
                        <BedDouble className="w-5 h-5 mb-1.5" />
                        <span className="text-[12px]">No departures due today</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#E5E5E5]">
                        {departuresPreview.map((row, idx) => {
                          const tNo = row.tableNo ?? row.line?.tableNo;
                          const isOverdue = (ops?.depOverdue ?? []).some(x => x.orderId === row.orderId && x.line?.lineId === row.line?.lineId);
                          return (
                            <div key={row.orderId ?? idx} className="px-4 py-3 flex items-center justify-between" data-testid={`fd-departure-row-${row.orderId || idx}`}>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-[#1A1A1A] truncate">{row.guestName || '—'}</div>
                                <div className="text-[11px] text-[#888]">
                                  Rm {tNo ?? '—'} · <span style={{ color: isOverdue ? '#EF4444' : '#888' }}>{isOverdue ? 'OVERDUE' : 'due today'}</span>
                                </div>
                              </div>
                              <div className="text-right mr-3">
                                <div className="text-[13px] font-medium text-[#1A1A1A]">{row.amount != null ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}</div>
                              </div>
                              <button data-testid={`fd-checkout-btn-${row.orderId}`}
                                disabled={!row.orderId}
                                title={!row.orderId ? 'No room order linked' : `Check out Room ${tNo}`}
                                onClick={() => row.orderId && setCheckout({ orderId: row.orderId, roomNo: tNo, guestName: row.guestName })}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: row.orderId ? '#329937' : '#ccc' }}>
                                <LogOut className="w-3 h-3" /> Check Out
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="px-4 py-3 border-t border-[#E5E5E5]">
                      <button data-testid="fd-view-all-departures" onClick={() => navigate('/pms/departures')}
                        className="text-[12px] font-semibold flex items-center gap-1" style={{ color: '#F26B33' }}>
                        View all {totalDepartures} departures <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
