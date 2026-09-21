// CR-385 M0 — Front Desk workstation page (/pms/front-desk-v2). Landing Arrivals; ?tab= ↔ localStorage mygenie_frontdesk_tab (OD-385-10).
// Money: charge.* only (D50). Dates: meta.business_date only after the first load — the browser date is used ONLY to build the first request window (X-06).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { getSnapshot, patchRoomStatus } from '@/api/services/frontDeskService';
import { patchErrorMessage } from '@/api/transforms/roomStatusTransform';
import { plusDays } from '@/api/transforms/frontDeskTransform';
import WorkstationHeader from '@/components/pms/frontdesk/WorkstationHeader';
import KpiTabStrip from '@/components/pms/frontdesk/KpiTabStrip';
import AlertBar from '@/components/pms/frontdesk/AlertBar';
import GlobalSearch from '@/components/pms/frontdesk/GlobalSearch';
import ArrivalsPanel from '@/components/pms/frontdesk/ArrivalsPanel';
import DeparturesPanel from '@/components/pms/frontdesk/DeparturesPanel';
import InHousePanel from '@/components/pms/frontdesk/InHousePanel';
import RoomsPanel from '@/components/pms/frontdesk/RoomsPanel';
import '@/components/pms/frontdesk/frontdesk.css';

const TABS = ['arrivals', 'departures', 'inhouse', 'rooms'];
const TAB_KEY = 'mygenie_frontdesk_tab';
const DEFAULT_CHIP = { arrivals: 'today', departures: 'today', inhouse: 'all', rooms: 'all' };
const browserToday = () => new Date().toLocaleDateString('en-CA'); // request window only (X-06)

const useFrontDeskSnapshot = () => {
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const bdRef = useRef(null);
  const refresh = useCallback(async () => {
    const bd = bdRef.current ?? browserToday();
    setRefreshing(true);
    try {
      const s = await getSnapshot({ start: plusDays(bd, -30), end: plusDays(bd, 60) });
      bdRef.current = s.meta?.business_date ?? bdRef.current;
      setSnap(s); setError(null);
    } catch (e) {
      setError(e?.response?.data?.message ?? e?.readableMessage ?? e?.message ?? 'Could not load the front desk');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { window.addEventListener('focus', refresh); return () => window.removeEventListener('focus', refresh); }, [refresh]);
  return { snap, loading, refreshing, error, refresh };
};

const useTabParam = () => {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('tab');
  const tab = TABS.includes(fromUrl) ? fromUrl : (TABS.includes(localStorage.getItem(TAB_KEY)) ? localStorage.getItem(TAB_KEY) : 'arrivals');
  const setTab = useCallback((t) => { localStorage.setItem(TAB_KEY, t); setParams({ tab: t }, { replace: true }); }, [setParams]);
  useEffect(() => { if (fromUrl !== tab) setParams({ tab }, { replace: true }); }, [fromUrl, tab, setParams]);
  return [tab, setTab];
};

export default function FrontDeskWorkstationPage() {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') !== 'false');
  const { snap, loading, refreshing, error, refresh } = useFrontDeskSnapshot();
  const [tab, setTab] = useTabParam();
  const [chips, setChips] = useState(DEFAULT_CHIP);
  const [expanded, setExpanded] = useState({ rowId: null, roomId: null }); // one open at a time (F1)
  const [busyId, setBusyId] = useState(null);

  const closeAll = () => setExpanded({ rowId: null, roomId: null });
  const toggleRow = (id) => setExpanded((e) => ({ rowId: id && String(e.rowId) !== String(id) ? id : null, roomId: null }));
  const toggleRoom = (id) => setExpanded((e) => ({ roomId: id && String(e.roomId) !== String(id) ? id : null, rowId: null }));
  const setChip = (t, c) => setChips((s) => ({ ...s, [t]: c }));

  const navigateTo = useCallback(({ tab: t, chip, rowId, roomId }) => {
    setTab(t);
    if (chip) setChip(t, chip);
    setExpanded({ rowId: rowId ?? null, roomId: roomId ?? null });
  }, [setTab]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') closeAll(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handlePatch = async (tableId, status) => {
    setBusyId(tableId);
    try {
      const r = await patchRoomStatus(tableId, status);
      toast.success(r.message || 'Room status updated');
      if (r.inventoryPushWarning) toast.warning(r.inventoryPushWarning);
      await refresh(); // X-14: refetch after every mutating action
    } catch (e) {
      toast.error(patchErrorMessage(e));
    } finally { setBusyId(null); }
  };

  const pending = useMemo(() => (snap?.reservations ?? []).filter((r) => r.operationalStatus === 'pending'), [snap]);
  const inHouse = useMemo(() => (snap?.reservations ?? []).filter((r) => r.operationalStatus === 'in_house'), [snap]);

  const panel = () => {
    const common = { meta: snap.meta, expandedId: expanded.rowId, onToggle: toggleRow, chip: chips[tab], onChip: (c) => setChip(tab, c) };
    switch (tab) {
      case 'departures': return <DeparturesPanel rows={inHouse} {...common} />;
      case 'inhouse': return <InHousePanel rows={inHouse} {...common} />;
      case 'rooms': return <RoomsPanel snapshot={snap} expandedRoomId={expanded.roomId} onToggleRoom={toggleRoom} chip={chips.rooms} onChip={(c) => setChip('rooms', c)} busyId={busyId} onPatch={handlePatch} onRetry={refresh} />;
      default: return <ArrivalsPanel rows={pending} kpis={snap.kpis} {...common} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F7F7] fd-page" data-testid="fd-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto min-w-0">
        <WorkstationHeader firstName={user?.firstName} meta={snap?.meta} loadedAt={snap?.loadedAt} refreshing={refreshing} onRefresh={refresh} onNewBooking={null} />
        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-20 text-[#767676]" data-testid="fd-loading"><Loader2 className="w-5 h-5 animate-spin" /> Loading front desk…</div>
          )}
          {!loading && error && (
            <div className="bg-white rounded-xl border border-[#FECACA] p-10 text-center" data-testid="fd-page-error" role="alert">
              <AlertCircle className="w-6 h-6 text-[#EF4444] mx-auto" />
              <div className="text-[14px] font-semibold mt-2">Reservations could not be loaded</div>
              <div className="text-[12px] text-[#767676] mt-1">{error}</div>
              <button type="button" data-testid="fd-retry-btn" onClick={refresh} className="fd-btn mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#F26B33' }}><RefreshCw className="w-4 h-4" /> Retry</button>
            </div>
          )}
          {!loading && !error && snap && (
            <>
              <KpiTabStrip counts={snap.counts} boardCounts={snap.boardCounts} boardError={snap.boardError} kpis={snap.kpis} active={tab} onTab={(t, chip) => navigateTo({ tab: t, chip })} />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0"><AlertBar snapshot={snap} onNavigate={navigateTo} /></div>
                <GlobalSearch snapshot={snap} onNavigate={navigateTo} />
              </div>
              <div role="tabpanel" aria-labelledby={`fd-tab-${tab}`} data-testid={`fd-tabpanel-${tab}`}>{panel()}</div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
