// CR-385 M0 — Front Desk workstation page (/pms/front-desk-v2). Landing Arrivals; ?tab= ↔ localStorage mygenie_frontdesk_tab (OD-385-10).
// Money: charge.* only (D50). Dates: meta.business_date only after the first load — the browser date is used ONLY to build the first request window (X-06).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext'; // CR-385 M2 BUG-442: cancelled_by = user.fullName (restaurant.profile.fullName never existed)
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
const DEFAULT_CHIP = { arrivals: null, departures: null, inhouse: 'all', rooms: 'all' }; // CR-385 M0.5 BUG-437 null = auto → first non-empty bucket (D70); a chip click pins it
const browserToday = () => new Date().toLocaleDateString('en-CA'); // request window only (X-06)

export const useFrontDeskSnapshot = () => { // CR-385 M0.5 BUG-435 named export for the RTL debounce tests (D71)
  const [snap, setSnap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const bdRef = useRef(null);
  const inFlightRef = useRef(null); // CR-385 M0.5 BUG-435 D71: in-flight snapshot promise — a second refresh() is coalesced onto it, never dropped
  const lastFetchRef = useRef(0);   // CR-385 M0.5 BUG-435 D71: time of the last successful fetch (focus debounce)
  const refresh = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current; // CR-385 M0.5 BUG-435 coalesce
    const bd = bdRef.current ?? browserToday();
    setRefreshing(true);
    inFlightRef.current = (async () => { // CR-385 M0.5 BUG-435
      try {
        const s = await getSnapshot({ start: plusDays(bd, -30), end: plusDays(bd, 60), today: bd });
        bdRef.current = s.meta?.business_date ?? bdRef.current;
        lastFetchRef.current = Date.now(); // CR-385 M0.5 BUG-435
        setSnap(s); setError(null);
      } catch (e) {
        setError(e?.response?.data?.message ?? e?.readableMessage ?? e?.message ?? 'Could not load the front desk');
      } finally { setLoading(false); setRefreshing(false); inFlightRef.current = null; } // CR-385 M0.5 BUG-435
    })();
    return inFlightRef.current; // CR-385 M0.5 BUG-435
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onFocus = () => { if (Date.now() - lastFetchRef.current < 5000) return; refresh(); }; // CR-385 M0.5 BUG-435 D71: focus refresh ignored < 5 s after the last fetch; manual ↻ / Retry / after-PATCH never skipped
    window.addEventListener('focus', onFocus); return () => window.removeEventListener('focus', onFocus); // CR-385 M0.5 BUG-435
  }, [refresh]);
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
  const [expanded, setExpanded] = useState({ rowId: null, roomId: null, kind: 'detail' }); // one open at a time (F1); CR-385 M2 kind = detail | modify | cancel | noshow
  const [busyId, setBusyId] = useState(null);

  const closeAll = () => setExpanded({ rowId: null, roomId: null, kind: 'detail' });
  const toggleRow = (id) => setExpanded((e) => ({ rowId: id && String(e.rowId) !== String(id) ? id : null, roomId: null, kind: 'detail' }));
  const toggleRoom = (id) => setExpanded((e) => ({ roomId: id && String(e.roomId) !== String(id) ? id : null, rowId: null, kind: 'detail' }));
  const openExpansion = (rowId, kind) => setExpanded({ rowId, roomId: null, kind: kind ?? 'detail' }); // CR-385 M2
  const afterAction = async (msg) => { toast.success(msg); closeAll(); await refresh(); }; // CR-385 M2 X-14: toast → close → refetch after every mutating action
  const setChip = (t, c) => setChips((s) => ({ ...s, [t]: c }));

  const navigateTo = useCallback(({ tab: t, chip, rowId, roomId, kind }) => {
    setTab(t);
    if (chip) setChip(t, chip);
    setExpanded({ rowId: rowId ?? null, roomId: roomId ?? null, kind: kind ?? 'detail' }); // CR-385 M2 alert "stay expired" → nsOrCancel kind
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
      case 'rooms': return <RoomsPanel snapshot={snap} expandedRoomId={expanded.roomId} onToggleRoom={toggleRoom} chip={chips.rooms} onChip={(c) => setChip('rooms', c)} busyId={busyId} onPatch={handlePatch} onRetry={refresh} retrying={refreshing} />; // CR-385 M0.5 BUG-434 retrying
      default: return <ArrivalsPanel rows={pending} kpis={snap.kpis} {...common} expandedKind={expanded.kind} onOpen={openExpansion} onDone={afterAction} cancelledBy={user?.fullName || 'staff'} />; // CR-385 M2 · BUG-442
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F7F7] fd-page" data-testid="fd-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto min-w-0" data-testid="fd-workstation-body">{/* CR-385 M0.5 BUG-436 scope for the ui_naming_rule DOM assertions (excludes app chrome) */}
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
              <button type="button" data-testid="fd-retry-btn" onClick={refresh} disabled={refreshing} aria-busy={refreshing} className="fd-btn mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white disabled:opacity-70 disabled:cursor-wait" style={{ background: '#F26B33' }}>{refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {refreshing ? 'Retrying…' : 'Retry'}</button> {/* CR-385 M0.5 BUG-434 in-flight state (F14) */}
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
