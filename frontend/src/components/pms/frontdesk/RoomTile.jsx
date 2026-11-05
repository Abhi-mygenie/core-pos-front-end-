// CR-385 M0 — RoomTile: copied from pages/pms/RoomStatusPage.jsx @8c7745f L25–27 (STATUS_BAR / STATUS_LABELS / fmtSince) + L198–266 (tile body markup; actions moved to RoomDetail).
// Mirror rule until FU-385-C: visual fixes to the source tile land here too. Tile is a button that opens RoomDetail (no navigation, F13).
import { Clock, Repeat } from 'lucide-react';
import { fmtTime, fmtDate } from './money';

export const STATUS_BAR = { occupied: '#F26B33', occupied_hk: '#F26B33', booked: '#888', hk: '#F59E0B', ooo: '#EF4444', available: '#329937' }; // BUG-397 parity
export const STATUS_LABELS = { occupied: 'Occupied', occupied_hk: 'Occupied · HK', booked: 'Booked', hk: 'Housekeeping', ooo: 'Out of order', available: 'Available' };
const fmtSince = (s) => (s ? `${fmtDate(s.slice(0, 10))}, ${fmtTime(s)}` : '');

export const RoomTile = ({ room, selected, isTurn, onOpen }) => {
  const s = room.displayStatus;
  const barColor = STATUS_BAR[s] ?? '#888';
  const isDashed = s === 'booked';
  return (
    <button type="button" data-testid={`fd-room-tile-${room.id}`} aria-selected={selected} onClick={() => onOpen(room)}
      className="fd-tile text-left w-full bg-white rounded-xl border border-[#E5E5E5] overflow-hidden relative"
      style={{ borderTop: isDashed ? `4px dashed ${barColor}` : `4px solid ${barColor}` }}>
      <div className="px-4 pt-3 pb-3">
        <span data-testid={`fd-room-tile-badge-${room.id}`} className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ backgroundColor: `${barColor}18`, color: barColor }}>
          {STATUS_LABELS[s] ?? s}
        </span>
        <div className="text-[20px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Poppins, sans-serif' }}>{room.tableNo}</div>
        <div className="text-[11px] text-[#888] mt-0.5">{room.roomType ? `${room.roomType} · ` : ''}{room.title ? room.title : `id ${room.id}`}</div>

        {(s === 'occupied' || s === 'occupied_hk') && (
          <div className="mt-2">
            <div className="text-[13px] font-medium text-[#1A1A1A]">{room.guest?.name ?? 'Guest'}</div>
            {room.guest?.bookingId && <div className="text-[11px] text-[#888] mt-0.5 truncate">{room.guest.bookingId}</div>}
            {s === 'occupied_hk'
              ? <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#D97706' }}><Clock className="w-3 h-3" />Housekeeping in progress</div>
              : <div className="text-[11px] text-[#888] mt-0.5">Checked in</div>}
          </div>
        )}
        {s === 'booked' && room.reservation && (
          <div className="mt-2">
            <div className="text-[13px] font-medium text-[#1A1A1A]">{room.reservation.guestName}</div>
            <div className="text-[11px] text-[#888] mt-0.5">{room.reservation.channel === 'WalkIn' ? 'Walk-in' : (room.reservation.channel ?? '—')} · {room.reservation.bookingId}</div>
            <div className="text-[11px] text-[#888] mt-0.5">{fmtDate(room.reservation.checkin)} – {fmtDate(room.reservation.checkout)} (arriving)</div>
          </div>
        )}
        {s === 'hk' && (
          <div className="mt-2">
            <div className="text-[13px] text-[#D97706] font-medium">Needs housekeeping</div>
            {room.statusSince && <div className="text-[11px] text-[#888] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Since {fmtSince(room.statusSince)}{room.hkAssignee ? ` · ${room.hkAssignee}` : ''}</div>}
          </div>
        )}
        {s === 'ooo' && (
          <div className="mt-2">
            <div className="text-[13px] text-[#EF4444] font-medium">Out of order</div>
            {room.statusSince && <div className="text-[11px] text-[#888] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />Since {fmtSince(room.statusSince)}</div>}
          </div>
        )}
        {s === 'available' && <div className="mt-2"><div className="text-[13px] text-[#329937] font-medium">Ready</div></div>}
        {isTurn && <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: '#FEF3C7', color: '#92400E' }} data-testid={`fd-room-tile-turn-${room.id}`}><Repeat className="w-3 h-3" />Turn today</div>}
      </div>
    </button>
  );
};

export default RoomTile;
