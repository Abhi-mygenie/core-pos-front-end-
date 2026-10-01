// CR-385 M0 — Front Desk workstation page (/pms/front-desk-v2). Landing Arrivals; ?tab= ↔ localStorage mygenie_frontdesk_tab (OD-385-10).
// Money: charge.* only (D50). Dates: meta.business_date only after the first load — the browser date is used ONLY to build the first request window (X-06).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext'; // CR-385 M5: restaurant.totalRound (CR-170) + checkInFlags.roomGstApplicable, read-only // CR-385 M2 BUG-442: cancelled_by = user.fullName (restaurant.profile.fullName never existed)
import { getSnapshot, patchRoomStatus, getRowBalances } from '@/api/services/frontDeskService'; // CR-385 M5 getRowBalances
import { getFrontDeskRules } from '@/api/services/restaurantSettingsService'; // CR-385 M3 C2: rules live in settings-list basic.*, not the profile
import { patchErrorMessage } from '@/api/transforms/roomStatusTransform';
import { plusDays, fromReservation } from '@/api/transforms/frontDeskTransform';
import WorkstationHeader from '@/components/pms/frontdesk/WorkstationHeader';
import KpiTabStrip from '@/components/pms/frontdesk/KpiTabStrip';
import AlertBar from '@/components/pms/frontdesk/AlertBar';
import GlobalSearch from '@/components/pms/frontdesk/GlobalSearch';
import ArrivalsPanel from '@/components/pms/frontdesk/ArrivalsPanel';
import NewBookingForm from '@/components/pms/frontdesk/NewBookingForm'; // CR-385 M1
import DeparturesPanel from '@/components/pms/frontdesk/DeparturesPanel';
import InHousePanel from '@/components/pms/frontdesk/InHousePanel';
import RoomsPanel from '@/components/pms/frontdesk/RoomsPanel';
import '@/components/pms/frontdesk/frontdesk.css';

const TABS = ['arrivals', 'departures', 'inhouse', 'rooms'];
const TAB_KEY = 'mygenie_frontdesk_tab';
const DEFAULT_CHIP = { arrivals: null, departures: null, inhouse: 'all', rooms: 'all' }; // CR-385 M0.5 BUG-437 null = auto → first non-empty bucket (D70); a chip click pins it
const browserToday = () => new Date().toLocaleDateString('en-CA'); // request window only (X-06)
const DEFAULT_RULES = { allowEarlyCheckin: false, extendRateMode: 'calendar', autoPrintCheckinReceipt: false }; // CR-385 M3 C2 (server defaults, D53)

export const useRowBalances = (loadedAt, inHouseCount, opts) => { // CR-385 M5 / BUG-433 (D85): one getInHouseGuests per snapshot; undefined = loading ("…"), null = unavailable (fallback charge.balance_due)
  const [balances, setBalances] = useState(undefined);
  useEffect(() => {
    if (!loadedAt) return undefined;
    if (!inHouseCount) { setBalances({}); return undefined; }
    let live = true; setBalances(undefined);
    getRowBalances(opts).then((b) => { if (live) setBalances(b); }).catch(() => { if (live) setBalances(null); });
    return () => { live = false; };
  }, [loadedAt, inHouseCount]); // eslint-disable-line react-hooks/exhaustive-deps
  return balances;
};

export const useFrontDeskRules = (loadedAt) => { // CR-385 M3 C2: re-read once per snapshot; failure → defaults, never a page error
  const [rules, setRules] = useState(DEFAULT_RULES);
  useEffect(() => { if (!loadedAt) return; let live = true; getFrontDeskRules().then((r) => { if (live) setRules({ ...DEFAULT_RULES, ...r }); }).catch(() => {}); return () => { live = false; }; }, [loadedAt]);
  return rules;
};

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
  const { restaurant } = useRestaurant(); // CR-385 M5
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') !== 'false');
  const { snap, loading, refreshing, error, refresh } = useFrontDeskSnapshot();
  const [tab, setTab] = useTabParam();
  const [chips, setChips] = useState(DEFAULT_CHIP);
  const [expanded, setExpanded] = useState({ rowId: null, roomId: null, kind: 'detail' }); // one open at a time (F1); CR-385 M2 kind = detail | modify | cancel | noshow · CR-385 M3 + checkin · CR-385 M4 + extend · CR-385 M6 + bill
  const [busyId, setBusyId] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false); // CR-385 M1 D81: top-of-tab expansion, F1 with the row/room expansions
  const rules = useFrontDeskRules(snap?.loadedAt); // CR-385 M3
  const inHouseCount = (snap?.reservations ?? []).filter((r) => r.operationalStatus === 'in_house').length;
  const balances = useRowBalances(snap?.loadedAt, inHouseCount, { roomGstApplicable: Boolean(restaurant?.checkInFlags?.roomGstApplicable), totalRound: restaurant?.totalRound !== false }); // CR-385 M5 BUG-433

  const closeAll = () => setExpanded({ rowId: null, roomId: null, kind: 'detail' });
  const toggleRow = (id) => { setBookingOpen(false); setExpanded((e) => ({ rowId: id && String(e.rowId) !== String(id) ? id : null, roomId: null, kind: 'detail' })); }; // CR-385 M1 F1
  const toggleRoom = (id) => { setBookingOpen(false); setExpanded((e) => ({ roomId: id && String(e.roomId) !== String(id) ? id : null, rowId: null, kind: 'detail' })); }; // CR-385 M1 F1
  const openExpansion = (rowId, kind) => { setBookingOpen(false); setExpanded({ rowId, roomId: null, kind: kind ?? 'detail' }); }; // CR-385 M2 · M1 F1
  const afterAction = async (msg) => { toast.success(msg); setBookingOpen(false); closeAll(); await refresh(); }; // CR-385 M2 X-14: toast → close → refetch after every mutating action
  const setChip = (t, c) => setChips((s) => ({ ...s, [t]: c }));
  const toggleBooking = () => { setBookingOpen((v) => !v); closeAll(); }; // CR-385 M1 D81 F1

  const navigateTo = useCallback(({ tab: t, chip, rowId, roomId, kind }) => {
    setTab(t);
    if (chip) setChip(t, chip);
    setExpanded({ rowId: rowId ?? null, roomId: roomId ?? null, kind: kind ?? 'detail' }); // CR-385 M2 alert "stay expired" → nsOrCancel kind
  }, [setTab]);
  const checkInNow = async (reservation) => { // CR-385 M1 "Save & check in now": refetch so the new row exists, then open it as 'checkin'
    setBookingOpen(false); toast.success(`Booking saved — ${reservation.booking_id}`); await refresh();
    navigateTo({ tab: 'arrivals', chip: 'today', rowId: fromReservation(reservation).id, kind: 'checkin' });
  };

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
  const inHouse = useMemo(() => { // CR-385 M5: join the room's HK state so the row action reads Request HK / Mark Clean
    const byTable = Object.fromEntries((snap?.rooms ?? []).map((rm) => [String(rm.id), rm]));
    return (snap?.reservations ?? []).filter((r) => r.operationalStatus === 'in_house').map((r) => { const rm = byTable[String(r.tableId)]; return { ...r, roomStatus: rm && (rm.displayStatus === 'occupied_hk' || rm.manualStatus === 'hk') ? 'hk' : 'clean' }; });
  }, [snap]);

  const panel = () => {
    const common = { meta: snap.meta, expandedId: expanded.rowId, onToggle: toggleRow, chip: chips[tab], onChip: (c) => setChip(tab, c) };
    const stayProps = { expandedKind: expanded.kind, onOpen: openExpansion, onDone: afterAction, onPatch: handlePatch, busyId, balances }; // CR-385 M4/M5
    switch (tab) {
      case 'departures': return <DeparturesPanel rows={inHouse} {...common} {...stayProps} />; // CR-385 M4/M5
      case 'inhouse': return <InHousePanel rows={inHouse} {...common} {...stayProps} />; // CR-385 M4/M5
      case 'rooms': return <RoomsPanel snapshot={snap} expandedRoomId={expanded.roomId} onToggleRoom={toggleRoom} chip={chips.rooms} onChip={(c) => setChip('rooms', c)} busyId={busyId} onPatch={handlePatch} onRetry={refresh} retrying={refreshing}
        onExtend={(room) => { const r = inHouse.find((x) => String(x.tableId) === String(room.id)); if (r) navigateTo({ tab: 'inhouse', chip: 'all', rowId: r.id, kind: 'extend' }); else toast.error('No in-house stay is linked to this room'); }} onBill={(room) => { const r = inHouse.find((x) => String(x.tableId) === String(room.id)); if (r) navigateTo({ tab: 'inhouse', chip: 'all', rowId: r.id, kind: 'bill' }); else toast.error('No in-house stay is linked to this room'); }} /* CR-385 M6 */ onCheckIn={(room) => { const r = pending.find((x) => x.bookingId === room.reservation?.bookingId || (room.id && String(x.tableId) === String(room.id))); if (r) navigateTo({ tab: 'arrivals', rowId: r.id, kind: 'checkin' }); else toast.error('No pending arrival is linked to this room'); }} />; // CR-385 M0.5 BUG-434 retrying · CR-385 M3 E12e
      default: return <ArrivalsPanel rows={pending} kpis={snap.kpis} {...common} expandedKind={expanded.kind} onOpen={openExpansion} onDone={afterAction} cancelledBy={user?.fullName || 'staff'} rules={rules} rooms={snap.rooms} />; // CR-385 M2 · BUG-442 · CR-385 M3 rules + rooms
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F7F7] fd-page" data-testid="fd-page">
      <Sidebar isExpanded={isSidebarExpanded} setIsExpanded={(v) => { setIsSidebarExpanded(v); localStorage.setItem('mygenie_sidebar_expanded', String(v)); }} />
      <main className="flex-1 overflow-auto min-w-0" data-testid="fd-workstation-body">{/* CR-385 M0.5 BUG-436 scope for the ui_naming_rule DOM assertions (excludes app chrome) */}
        <WorkstationHeader firstName={user?.firstName} meta={snap?.meta} loadedAt={snap?.loadedAt} refreshing={refreshing} onRefresh={refresh} onNewBooking={toggleBooking} /> {/* CR-385 M1 E12c */}
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
              {bookingOpen && <NewBookingForm meta={snap.meta} onDone={afterAction} onCheckInNow={checkInNow} onClose={() => setBookingOpen(false)} />} {/* CR-385 M1 E12d top-of-tab (D81) */}
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
