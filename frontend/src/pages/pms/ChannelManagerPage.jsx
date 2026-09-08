// CR-358-P1: S8 — Channel Manager Page
// Tabs: OTA / Sync | AIOSELL Setup | Room Mapping | Rates & Restrictions (P5)
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Wifi, WifiOff, Settings, GitMerge,
  BarChart2, CheckCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Sidebar from '@/components/layout/Sidebar';
import {
  getAiosellStatus,
  startAiosellService,
  stopAiosellService,
  getAiosellRooms,
  saveRoomMapping,
  fetchInventory,
  pushInventory,
  fetchReservations,
} from '@/api/services/aiosellService';
import aiosellTransform from '@/api/transforms/aiosellTransform';

const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const TABS = ['OTA / Sync', 'AIOSELL Setup', 'Room Mapping', 'Rates & Restrictions'];

export default function ChannelManagerPage() {
  // BUG-361: persist sidebar state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => localStorage.getItem('mygenie_sidebar_expanded') === 'true'
  );
  const [activeTab, setActiveTab] = useState(0);

  // ── Status (Tab 1) ──────────────────────────────────────────────────────
  const [status, setStatus]             = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError]   = useState(null);
  const [toggling, setToggling]         = useState(false);

  // ── Rooms / Mapping (Tab 2) ─────────────────────────────────────────────
  const [rooms, setRooms]               = useState(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError]     = useState(null);
  const [pendingMappings, setPendingMappings] = useState({});
  const [savingMapping, setSavingMapping]     = useState(false);

  // ── Inventory (Tab 0) ───────────────────────────────────────────────────
  const [inventory, setInventory] = useState(null);
  const [invLoading, setInvLoading] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const [fetching, setFetching]     = useState(false);

  // ── Load status on mount ────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const data = await getAiosellStatus();
      setStatus(aiosellTransform.fromAPI.status(data?.data ?? data));
    } catch (err) {
      setStatusError(err?.response?.data?.message ?? 'Failed to load status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ── Load inventory when OTA tab is active ───────────────────────────────
  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const data = await fetchInventory({ startDate: today(), endDate: daysFromNow(14) });
      setInventory(aiosellTransform.fromAPI.inventory(data?.data ?? data));
    } catch {
      // Non-blocking — inventory bars just won't show
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 0) loadInventory();
  }, [activeTab, loadInventory]);

  // ── Load rooms when Room Mapping tab opens ──────────────────────────────
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const data = await getAiosellRooms();
      const transformed = aiosellTransform.fromAPI.rooms(data?.data ?? data);
      setRooms(transformed);
      const seed = {};
      transformed.mappings.forEach(m => {
        if (m.restaurantTableId) seed[m.restaurantTableId] = m.aiosellRoomCode;
      });
      setPendingMappings(seed);
    } catch (err) {
      setRoomsError(err?.response?.data?.message ?? 'Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 2 && !rooms) loadRooms();
  }, [activeTab, rooms, loadRooms]);

  // ── Toggle AIOSELL service ──────────────────────────────────────────────
  const handleToggleService = async () => {
    setToggling(true);
    try {
      if (status?.isRunning) {
        await stopAiosellService();
        toast.success('AIOSELL service stopped');
      } else {
        await startAiosellService();
        toast.success('AIOSELL service started');
      }
      await loadStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to toggle service');
    } finally {
      setToggling(false);
    }
  };

  // ── Push inventory (Sync All Now) ───────────────────────────────────────
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await pushInventory({ startDate: today(), endDate: daysFromNow(30) });
      toast.success('Inventory pushed to all OTA channels');
      await loadInventory();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // ── Fetch reservations from CM ──────────────────────────────────────────
  const handleFetchReservations = async () => {
    setFetching(true);
    try {
      const data = await fetchReservations({ startDate: today(), endDate: daysFromNow(30), importToLocal: true });
      const count = data?.data?.records ?? data?.records ?? 0;
      toast.success(`Fetched ${count} reservation(s) from channel manager`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Fetch reservations failed');
    } finally {
      setFetching(false);
    }
  };

  // ── Save room mapping ───────────────────────────────────────────────────
  const handleSaveMapping = async () => {
    if (!rooms) return;
    setSavingMapping(true);
    try {
      const mappings = rooms.localRooms
        .filter(r => pendingMappings[r.id])
        .map(r => ({
          restaurantTableId:   r.id,
          aiosellRoomCode:     pendingMappings[r.id],
          aiosellRateplanCode: null,
        }));
      await saveRoomMapping(mappings);
      toast.success('Room mapping saved');
      await loadRooms();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Failed to save mapping');
    } finally {
      setSavingMapping(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="channel-manager-page">
      <Sidebar
        isExpanded={isSidebarExpanded}
        setIsExpanded={(v) => {
          setIsSidebarExpanded(v);
          localStorage.setItem('mygenie_sidebar_expanded', String(v));
        }}
      />
      <main className="flex-1 overflow-auto">

        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-0 flex items-center gap-6">
          <h1 className="text-[18px] font-bold text-[#1A1A1A] py-4 mr-4">Channel Manager</h1>
          {TABS.map((label, i) => (
            <button
              key={i}
              data-testid={`channel-manager-tab-${i}`}
              onClick={() => setActiveTab(i)}
              className={`h-14 px-1 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === i
                  ? 'border-[#329937] text-[#329937]'
                  : 'border-transparent text-[#666] hover:text-[#1A1A1A]'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto">
            <button
              data-testid="sync-all-btn"
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white text-[13px] font-medium px-4 h-9 rounded-lg hover:bg-[#333] disabled:opacity-60"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync All Now
            </button>
          </div>
        </div>

        <div className="p-6">

          {/* ── TAB 0: OTA / Sync ─────────────────────────────────────── */}
          {activeTab === 0 && (
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 space-y-4">
                {statusLoading ? (
                  <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading status…</span>
                  </div>
                ) : statusError ? (
                  <div className="bg-white rounded-xl border border-red-200 p-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600">{statusError}</span>
                    <button onClick={loadStatus} className="ml-auto text-sm text-[#329937] hover:underline">Retry</button>
                  </div>
                ) : status ? (
                  <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${status.isRunning ? 'bg-[#329937]' : 'bg-gray-400'}`} />
                    <div>
                      <div className="text-[14px] font-semibold text-[#1A1A1A]">AIOSELL</div>
                      <div className="text-[12px] text-gray-500">
                        {status.isRunning ? 'Connected · Live' : 'Disconnected'}
                        {status.hotelCode ? ` · ${status.hotelCode}` : ''}
                        {status.lastSyncAt ? ` · Last sync ${new Date(status.lastSyncAt).toLocaleTimeString()}` : ''}
                      </div>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        data-testid="fetch-reservations-btn"
                        onClick={handleFetchReservations}
                        disabled={fetching}
                        className="flex items-center gap-2 border border-[#E5E5E5] text-[13px] px-3 h-8 rounded-lg text-[#666] hover:bg-gray-50 disabled:opacity-60"
                      >
                        {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3 h-3" />}
                        Fetch Reservations
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Inventory bars */}
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Inventory — Tonight</h2>
                    <button onClick={loadInventory} className="text-[12px] text-[#329937] hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                  {invLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading inventory…
                    </div>
                  ) : inventory?.updates?.length > 0 ? (
                    <div className="space-y-3">
                      {inventory.updates.slice(0, 1).map((u, i) => (
                        <div key={i} className="space-y-2">
                          {u.rooms.map(r => (
                            <div key={r.roomCode} className="flex items-center gap-3">
                              <span className="text-[13px] text-[#666] w-24 capitalize">{r.roomCode}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-[#F26B33]"
                                  style={{ width: `${Math.max(5, 100 - (r.available / 10) * 100)}%` }}
                                />
                              </div>
                              <span className="text-[13px] font-medium text-[#1A1A1A] w-16 text-right">
                                {r.available} available
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No inventory data. Click Refresh.</p>
                  )}
                </div>
              </div>

              {/* Right: quick stats */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-5">
                  <h3 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Today's Stats</h3>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between"><span className="text-[#666]">Total bookings</span><span className="font-medium">—</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">From OTAs</span><span className="font-medium">—</span></div>
                    <div className="flex justify-between"><span className="text-[#666]">Direct / Walk-in</span><span className="font-medium">—</span></div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3">Live data available in Phase 3 (Front Desk)</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 1: AIOSELL Setup ──────────────────────────────────── */}
          {activeTab === 1 && (
            <div className="max-w-lg">
              {statusLoading ? (
                <div className="flex items-center gap-3 p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Loading…</span>
                </div>
              ) : status?.isActive ? (
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#329937]" />
                    <div>
                      <div className="text-[14px] font-semibold">AIOSELL Connected</div>
                      <div className="text-[12px] text-gray-500">
                        hotel_code: {status.hotelCode} · pms: {status.pmsSlug}
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#E5E5E5] flex gap-3">
                    <button
                      data-testid="toggle-service-btn"
                      onClick={handleToggleService}
                      disabled={toggling}
                      className={`flex items-center gap-2 text-[13px] px-4 h-9 rounded-lg font-medium disabled:opacity-60 ${
                        status.isRunning
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          : 'bg-[#329937] text-white hover:bg-[#2a8030]'
                      }`}
                    >
                      {toggling
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : status.isRunning ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                      {status.isRunning ? 'Stop Service' : 'Start Service'}
                    </button>
                    <button
                      onClick={loadStatus}
                      className="flex items-center gap-2 border border-[#E5E5E5] text-[13px] px-3 h-9 rounded-lg text-[#666] hover:bg-gray-50"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center">
                  <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h2 className="text-[16px] font-semibold text-[#1A1A1A] mb-2">Connect AIOSELL Channel Manager</h2>
                  <p className="text-[13px] text-gray-500 mb-4">
                    Link your property to AIOSELL to automatically sync inventory, rates, and reservations across all OTA channels.
                  </p>
                  <p className="text-[12px] text-gray-400">
                    Setup form available in full implementation. Provide hotel_code + api_key from your AIOSELL account.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Room Mapping ───────────────────────────────────── */}
          {activeTab === 2 && (
            <div>
              {roomsLoading ? (
                <div className="flex items-center gap-3 p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Loading rooms…</span>
                </div>
              ) : roomsError ? (
                <div className="bg-white rounded-xl border border-red-200 p-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600">{roomsError}</span>
                  <button onClick={loadRooms} className="ml-auto text-sm text-[#329937] hover:underline">Retry</button>
                </div>
              ) : rooms ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center justify-between">
                      <h2 className="text-[14px] font-semibold">Room Mapping</h2>
                      <div className="text-[12px] text-gray-500">
                        {rooms.mapping.mappedCount}/{rooms.mapping.totalLocalRooms} mapped
                        {rooms.mapping.canPushInventory && (
                          <span className="ml-2 text-[#329937] font-medium">· Ready to push</span>
                        )}
                      </div>
                    </div>
                    <table className="w-full text-[13px]" data-testid="room-mapping-table">
                      <thead className="bg-[#F7F7F7]">
                        <tr>
                          <th className="text-left px-5 py-2 text-[11px] font-semibold text-[#666] uppercase tracking-wide">Local Room</th>
                          <th className="text-left px-5 py-2 text-[11px] font-semibold text-[#666] uppercase tracking-wide">AIOSELL Room Type</th>
                          <th className="text-left px-5 py-2 text-[11px] font-semibold text-[#666] uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.localRooms.map(room => (
                          <tr key={room.id} className="border-t border-[#F0F0F0]">
                            <td className="px-5 py-3">
                              <div className="font-medium">{room.tableNo}</div> {/* BUG-377: removed 'Table #' prefix — these are RM rooms not tables */}
                              {room.areaName && <div className="text-[11px] text-gray-400">{room.areaName}</div>}
                            </td>
                            <td className="px-5 py-3">
                              <select
                                value={pendingMappings[room.id] ?? ''}
                                onChange={e => setPendingMappings(prev => ({
                                  ...prev,
                                  [room.id]: e.target.value || null,
                                }))}
                                className="border border-[#E5E5E5] rounded-lg text-[13px] px-2 h-8 bg-white text-[#1A1A1A] w-40"
                              >
                                <option value="">— Unassigned —</option>
                                {/* BUG-377: fallback — show saved mapping code when aiosellRooms catalogue
                                    is empty or doesn't yet include the already-mapped room code */}
                                {pendingMappings[room.id] &&
                                  !rooms.aiosellRooms.some(ar => ar.roomCode === pendingMappings[room.id]) && (
                                  <option value={pendingMappings[room.id]}>{pendingMappings[room.id]}</option>
                                )}
                                {rooms.aiosellRooms.map(ar => (
                                  <option key={ar.roomCode} value={ar.roomCode}>
                                    {ar.roomName ?? ar.roomCode}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-5 py-3">
                              {pendingMappings[room.id]
                                ? <span className="text-[12px] text-[#329937] font-medium">Mapped</span>
                                : <span className="text-[12px] text-gray-400">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-5 py-3 border-t border-[#E5E5E5] flex justify-end">
                      <button
                        data-testid="save-mapping-btn"
                        onClick={handleSaveMapping}
                        disabled={savingMapping}
                        className="flex items-center gap-2 bg-[#329937] text-white text-[13px] font-medium px-5 h-9 rounded-lg hover:bg-[#2a8030] disabled:opacity-60"
                      >
                        {savingMapping
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle className="w-4 h-4" />}
                        Save Mapping
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── TAB 3: Rates & Restrictions (Phase 5 placeholder) ─────── */}
          {activeTab === 3 && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h2 className="text-[16px] font-semibold text-[#1A1A1A] mb-2">Rates & Restrictions</h2>
                <p className="text-[13px] text-gray-500">Available in Phase 5 of the PMS rollout.</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
