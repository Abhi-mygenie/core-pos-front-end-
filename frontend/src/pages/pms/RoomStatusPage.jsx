// CR-358-P4: S7 — Room Status Board (GET room-status-board; PATCH hk/ooo/available OD-P4-01; occupied guard OD-P4-03; bulk Mark All Clean OD-P4-09; refetch after PATCH A-P4-08)
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoomStatusBoard, patchRoomStatus, bulkMarkClean } from '@/api/services/pmsService';
import { patchErrorMessage } from '@/api/transforms/roomStatusTransform';
import { useRestaurant } from '@/contexts/RestaurantContext';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import { RefreshCw, Loader2, AlertCircle, LogIn, FileText, Plus, Clock, Info } from 'lucide-react';

const FILTER_CHIPS = [
  { key: 'all',       label: 'All' },
  { key: 'occupied',  label: 'Occupied' },
  { key: 'booked',    label: 'Booked' },
  { key: 'hk',        label: 'HK' },
  { key: 'ooo',       label: 'OOO' },
  { key: 'available', label: 'Available' },
];

const CHIP_STYLES = {
  hk:  { text: '#D97706', bg: '#FEF3C7' },
  ooo: { text: '#EF4444', bg: '#FEE2E2' },
};

const STATUS_BAR = { occupied: '#F26B33', booked: '#888', hk: '#F59E0B', ooo: '#EF4444', available: '#329937' };
const STATUS_LABELS = { occupied: 'Occupied', booked: 'Booked', hk: 'Housekeeping', ooo: 'Out of Order', available: 'Available' };

const fmtDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtSince = (s) => { if (!s) return ''; const d = new Date(s.replace(' ', 'T')); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase(); };

export default function RoomStatusPage() {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const [isExpanded, setIsExpanded] = useState(() => localStorage.getItem('mygenie_sidebar_expanded') !== 'false');
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRoomStatusBoard();
      setBoard(data);
    } catch (e) {
      setError(e?.message ?? 'Failed to load room status');
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

  const handlePatch = async (id, status) => {
    setBusyId(id);
    try {
      const res = await patchRoomStatus(id, status);
      toast.success(res.message || 'Room status updated');
      if (res.inventoryPushWarning) toast.warning(`Inventory sync warning: ${res.inventoryPushWarning}`);
    } catch (e) {
      toast.error(patchErrorMessage(e));
    }
    await load();
    setBusyId(null);
  };

  const handleBulkClean = async () => {
    if (!board) return;
    const hkIds = board.rooms.filter(r => r.displayStatus === 'hk').map(r => r.id);
    if (hkIds.length === 0) return;
    setBulkBusy(true);
    const result = await bulkMarkClean(hkIds);
    if (result.failed.length > 0) {
      toast.warning(`${result.ok.length} cleaned, ${result.failed.length} failed — ${result.failed[0].message}`);
    } else {
      toast.success(`${result.ok.length} rooms marked clean`);
    }
    result.warnings.forEach(w => toast.warning(`Inventory sync warning: ${w.message}`));
    await load();
    setBulkBusy(false);
  };

  const filtered = board ? (filter === 'all' ? board.rooms : board.rooms.filter(r => r.displayStatus === filter)) : [];
  const sorted = [...filtered].sort((a, b) => String(a.tableNo).localeCompare(String(b.tableNo), undefined, { numeric: true }));

  return (
    <div className="flex h-screen bg-[#F7F7F7]" data-testid="room-status-page">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>Room Status Board</h1>
            <p className="text-[13px] text-[#888] mt-0.5">{fmtDate()} · {restaurant?.name ?? ''}</p>
          </div>
          <button data-testid="rs-refresh-btn" onClick={load} disabled={loading}
            className="p-2 rounded-lg hover:bg-[#F7F7F7] text-[#888] disabled:opacity-40 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading && !board ? (
          <div className="flex items-center justify-center h-64" data-testid="rs-loading">
            <Loader2 className="w-6 h-6 animate-spin text-[#888]" />
            <span className="ml-2 text-[14px] text-[#888]">Loading room status...</span>
          </div>
        ) : error && !board ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3" data-testid="rs-error">
            <AlertCircle className="w-8 h-8 text-[#EF4444]" />
            <p className="text-[14px] text-[#888]">{error}</p>
            <button onClick={load} className="px-4 py-2 text-[13px] rounded-lg bg-[#329937] text-white hover:bg-[#287a2d]">Retry</button>
          </div>
        ) : board ? (
          <div className="px-6 py-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {FILTER_CHIPS.map(c => {
                const count = c.key === 'all' ? board.counts.all : (board.counts[c.key] ?? 0);
                const isActive = filter === c.key;
                const chipStyle = CHIP_STYLES[c.key];
                return (
                  <button key={c.key} data-testid={`rs-filter-${c.key}`} onClick={() => setFilter(c.key)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
                    style={isActive
                      ? { backgroundColor: '#1A1A1A', color: '#fff', borderColor: '#1A1A1A' }
                      : chipStyle
                        ? { backgroundColor: chipStyle.bg, color: chipStyle.text, borderColor: 'transparent' }
                        : { backgroundColor: '#F7F7F7', color: '#555', borderColor: '#E5E5E5' }
                    }>
                    {c.label} {count}
                  </button>
                );
              })}

              <div className="w-px h-6 bg-[#E5E5E5] mx-1" />

              <button data-testid="rs-bulk-clean-btn" onClick={handleBulkClean}
                disabled={(board.counts.hk ?? 0) === 0 || bulkBusy}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-[#FEF3C7] text-[#D97706] border border-transparent hover:bg-[#FDE68A] disabled:opacity-40 transition-colors">
                {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
                Mark All Clean ({board.counts.hk ?? 0} HK)
              </button>

              <div data-testid="rs-auto-hk-pill"
                className="ml-auto px-3 py-1 rounded-full text-[11px] font-medium flex items-center gap-1"
                style={{ backgroundColor: board.autoHkOnRmCheckout ? '#DCFCE7' : '#FEE2E2', color: board.autoHkOnRmCheckout ? '#16A34A' : '#EF4444' }}>
                <Info className="w-3 h-3" />
                Auto-HK on checkout: {board.autoHkOnRmCheckout ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* Grid */}
            {sorted.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[14px] text-[#888]" data-testid="rs-empty">
                No rooms in this state
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5" data-testid="rs-grid">
                {sorted.map(room => (
                  <RoomTile key={room.id} room={room} busyId={busyId} onPatch={handlePatch} navigate={navigate} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function RoomTile({ room, busyId, onPatch, navigate }) {
  const isBusy = busyId === room.id;
  const s = room.displayStatus;
  const barColor = STATUS_BAR[s] ?? '#888';
  const isDashed = s === 'booked';

  return (
    <div data-testid={`rs-tile-${room.id}`}
      className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden relative"
      style={{ borderTop: isDashed ? `4px dashed ${barColor}` : `4px solid ${barColor}` }}>

      <div className="px-4 pt-3 pb-2">
        {/* Badge */}
        <span data-testid={`rs-tile-badge-${room.id}`}
          className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
          style={{ backgroundColor: `${barColor}18`, color: barColor }}>
          {STATUS_LABELS[s] ?? s}
        </span>

        {/* Room info */}
        <div className="text-[20px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>{room.tableNo}</div>
        <div className="text-[11px] text-[#888] mt-0.5">{room.roomType ? `${room.roomType} · ` : ''}id {room.id}</div>

        {/* Status-specific content */}
        {s === 'occupied' && (
          <div className="mt-2">
            <div className="text-[13px] font-medium text-[#1A1A1A]">{room.guest?.name ?? 'Guest'}</div>
            {room.guest?.bookingId && <div className="text-[11px] text-[#888] mt-0.5">{room.guest.bookingId}</div>}
            <div className="text-[11px] text-[#888] mt-0.5">Checked in</div>
          </div>
        )}
        {s === 'booked' && room.reservation && (
          <div className="mt-2">
            <div className="text-[13px] font-medium text-[#1A1A1A]">{room.reservation.guestName}</div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {room.reservation.channel === 'WalkIn' ? 'Walk-in' : (room.reservation.channel ?? '—')} · {room.reservation.bookingId}
            </div>
            <div className="text-[11px] text-[#888] mt-0.5">
              {room.reservation.checkin} – {room.reservation.checkout} (arriving)
            </div>
          </div>
        )}
        {s === 'hk' && (
          <div className="mt-2">
            <div className="text-[13px] text-[#D97706] font-medium">Needs housekeeping</div>
            {room.statusSince && <div className="text-[11px] text-[#888] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Since {fmtSince(room.statusSince)}</div>}
          </div>
        )}
        {s === 'ooo' && (
          <div className="mt-2">
            <div className="text-[13px] text-[#EF4444] font-medium">Out of order</div>
            {room.statusSince && <div className="text-[11px] text-[#888] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Since {fmtSince(room.statusSince)}</div>}
          </div>
        )}
        {s === 'available' && (
          <div className="mt-2">
            <div className="text-[13px] text-[#329937] font-medium">Ready</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 pt-1 flex flex-wrap gap-1.5">
        {s === 'occupied' && (
          <>
            <button data-testid={`rs-hk-btn-${room.id}`} disabled title="Cannot change while occupied"
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FEF3C7] text-[#D97706] opacity-40 cursor-not-allowed">HK</button>
            <button data-testid={`rs-ooo-btn-${room.id}`} disabled title="Cannot change while occupied"
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#EF4444] text-[#EF4444] opacity-40 cursor-not-allowed">OOO</button>
            {room.guest?.orderId && (
              <button data-testid={`rs-folio-btn-${room.id}`} onClick={() => navigate('/reports/rooms')}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#F26B33] text-[#F26B33] hover:bg-[#FFF7ED] transition-colors flex items-center gap-1">
                <FileText className="w-3 h-3" />View Folio
              </button>
            )}
          </>
        )}
        {s === 'booked' && (
          <button data-testid={`rs-checkin-btn-${room.id}`}
            onClick={() => navigate(`/pms/check-in?booking_id=${encodeURIComponent(room.reservation?.bookingId ?? '')}`)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] transition-colors flex items-center gap-1">
            <LogIn className="w-3 h-3" />Check In
          </button>
        )}
        {s === 'hk' && (
          <>
            <button data-testid={`rs-clean-btn-${room.id}`} onClick={() => onPatch(room.id, 'available')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 transition-colors flex items-center gap-1">
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Mark Clean
            </button>
            <button data-testid={`rs-ooo-btn-${room.id}`} onClick={() => onPatch(room.id, 'ooo')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] disabled:opacity-40 transition-colors">Mark OOO</button>
          </>
        )}
        {s === 'ooo' && (
          <>
            <button data-testid={`rs-available-btn-${room.id}`} onClick={() => onPatch(room.id, 'available')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 transition-colors flex items-center gap-1">
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}Back in Service
            </button>
            <button data-testid={`rs-hk-btn-${room.id}`} onClick={() => onPatch(room.id, 'hk')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] disabled:opacity-40 transition-colors">Needs HK</button>
          </>
        )}
        {s === 'available' && (
          <>
            <button data-testid={`rs-book-btn-${room.id}`} onClick={() => navigate('/pms/new-booking')}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#329937] text-white hover:bg-[#287a2d] transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" />Book Room
            </button>
            <button data-testid={`rs-hk-btn-${room.id}`} onClick={() => onPatch(room.id, 'hk')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A] disabled:opacity-40 transition-colors">Needs HK</button>
            <button data-testid={`rs-ooo-btn-${room.id}`} onClick={() => onPatch(room.id, 'ooo')} disabled={isBusy}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] disabled:opacity-40 transition-colors">Mark OOO</button>
          </>
        )}
      </div>
    </div>
  );
}
