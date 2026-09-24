// CR-385 M0 — RoomDetail: 6 states (available · booked · occupied · occupied_hk · hk · ooo). Live: Mark Clean / Request HK / Set OOO / Back in service via patchRoomStatus (same call as RoomStatusPage). Check in (M3) / Extend (M4) / Bill (M6) live via callbacks.
import { Loader2 } from 'lucide-react';
import { fmtINR, fmtDate, fmtTime, maskPhone, channelLabel, plural } from './money';
import { STATUS_LABELS, STATUS_BAR } from './RoomTile';
import { PhaseButton } from './GuestTable';

const Cell = ({ label, children, testId }) => (
  <div><div className="text-[10px] uppercase font-semibold text-[#767676]">{label}</div><div className="text-[13px] mt-0.5" data-testid={testId}>{children}</div></div>
);

const LiveButton = ({ testId, label, tone, busy, onClick }) => {
  const tones = { amber: 'bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]', green: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0]', red: 'bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FECACA]', grey: 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]' };
  return (
    <button type="button" data-testid={testId} disabled={busy} onClick={onClick} className={`fd-btn px-3 h-8 rounded-md text-[12px] font-semibold disabled:opacity-40 ${tones[tone]}`}>
      {busy && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}{label}
    </button>
  );
};

export const RoomDetail = ({ room, row, nextArrival, isTurn, busy, onPatch, onClose, onCheckIn, onExtend, onBill }) => { // CR-385 M6 onBill(room) // CR-385 M4 onExtend(room) // CR-385 M3 onCheckIn(room) → Arrivals row expanded as 'checkin'
  const s = room.displayStatus;
  const color = STATUS_BAR[s] ?? '#888';
  const guest = room.guest;
  const patch = (status) => onPatch(room.id, status);
  return (
    <div className="fd-expansion col-span-full bg-white rounded-xl border border-[#E5E5E5] p-4" data-testid={`fd-room-detail-${room.id}`} style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Room {room.tableNo} <span className="text-[#767676] font-normal text-[13px]">· {room.roomType ?? '—'}{room.title ? ` · ${room.title}` : ''}</span></div>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ backgroundColor: `${color}18`, color }}>{STATUS_LABELS[s] ?? s}</span>
          {isTurn && <span className="inline-block mt-1 ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: '#FEF3C7', color: '#92400E' }}>Turn today</span>}
        </div>
        <button type="button" data-testid={`fd-room-detail-close-${room.id}`} onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-4">
        {(s === 'occupied' || s === 'occupied_hk') && (
          <>
            <Cell label="Guest" testId={`fd-room-detail-guest-${room.id}`}>{guest?.name ?? row?.guestName ?? '—'}<div className="text-[11px] text-[#767676]">{maskPhone(guest?.phone ?? row?.phone)}{guest?.email ? ` · ${guest.email}` : ''}</div></Cell>
            <Cell label="Stay">{row ? <>{fmtDate(row.checkin)} → {fmtDate(row.checkout)}<div className="text-[11px] text-[#767676]">{plural(row.nights ?? 0, 'night')} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''}</div></> : '—'}</Cell>
            <Cell label="Balance" testId={`fd-room-detail-balance-${room.id}`}><span className="font-semibold tabular-nums">{fmtINR(row?.charge?.balance_due)}</span><div className="text-[11px] text-[#767676]">paid so far {fmtINR(row?.charge?.advance_payment)}</div></Cell>
            <Cell label="Source · booking">{row ? channelLabel(row.channel) : '—'}<div className="text-[11px] text-[#767676] truncate">{guest?.bookingId ?? row?.bookingId ?? '—'}</div></Cell>
          </>
        )}
        {s === 'booked' && (
          <>
            <Cell label="Arriving guest">{room.reservation?.guestName ?? nextArrival?.guestName ?? '—'}</Cell>
            <Cell label="Dates">{room.reservation ? `${fmtDate(room.reservation.checkin)} → ${fmtDate(room.reservation.checkout)}` : '—'}</Cell>
            <Cell label="Source · booking">{channelLabel(room.reservation?.channel)}<div className="text-[11px] text-[#767676] truncate">{room.reservation?.bookingId ?? '—'}</div></Cell>
            <Cell label="Booking ₹" testId={`fd-room-detail-balance-${room.id}`}><span className="font-semibold tabular-nums">{fmtINR(nextArrival?.charge?.total_with_gst)}</span></Cell>
          </>
        )}
        {(s === 'hk' || s === 'ooo' || s === 'available') && (
          <>
            <Cell label={s === 'available' ? 'Ready since' : s === 'hk' ? 'Housekeeping since' : 'Out of order since'}>{room.statusSince ? `${fmtDate(room.statusSince.slice(0, 10))}, ${fmtTime(room.statusSince)}` : '—'}</Cell>
            <Cell label="Assignee">{room.hkAssignee ?? '—'}</Cell>
            <Cell label="Next arrival">{nextArrival ? `${nextArrival.guestName} · ${fmtDate(nextArrival.checkin)}` : 'none assigned'}</Cell>
            <Cell label="Manual status">{room.manualStatus ?? '—'}</Cell>
          </>
        )}
        <div className="col-span-4">
          <div className="text-[10px] uppercase font-semibold text-[#767676]">Housekeeping</div>
          <div className="text-[13px] mt-0.5">{room.manualStatus === 'hk' || s === 'hk' || s === 'occupied_hk' ? 'Dirty / in progress' : s === 'ooo' ? 'Blocked' : 'Clean'}{room.hkAssignee ? ` · ${room.hkAssignee}` : ''}<span className="text-[11px] text-[#767676]"> · crew assignment lives in Housekeeping (CR-365)</span></div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0F0F0] flex flex-wrap gap-2 justify-end" data-testid={`fd-room-actions-${room.id}`}>
        {(s === 'hk') && <LiveButton testId={`fd-room-action-clean-${room.id}`} label="Mark Clean" tone="green" busy={busy} onClick={() => patch('available')} />}
        {(s === 'available' || s === 'occupied') && <LiveButton testId={`fd-room-action-hk-${room.id}`} label="Request HK" tone="amber" busy={busy} onClick={() => patch('hk')} />}
        {(s === 'available' || s === 'hk') && <LiveButton testId={`fd-room-action-ooo-${room.id}`} label="Set OOO" tone="red" busy={busy} onClick={() => patch('ooo')} />}
        {s === 'ooo' && <LiveButton testId={`fd-room-action-back-${room.id}`} label="Back in service" tone="green" busy={busy} onClick={() => patch('available')} />}
        {s === 'available' && <PhaseButton testId={`fd-room-action-book-${room.id}`} label="Book Room" phase={2} />}
        {s === 'booked' && <PhaseButton testId={`fd-room-action-checkin-${room.id}`} label="Check In" phase={2} onClick={onCheckIn && room.reservation ? () => onCheckIn(room) : undefined} title={onCheckIn && !room.reservation ? 'No linked reservation on this room' : undefined} />} {/* CR-385 M3 E13 */}
        {(s === 'occupied' || s === 'occupied_hk') && (
          <>
            <PhaseButton testId={`fd-room-action-extend-${room.id}`} label="Extend" phase={3} onClick={onExtend ? () => onExtend(room) : undefined} /> {/* CR-385 M4 live */}
            <PhaseButton testId={`fd-room-action-bill-${room.id}`} label="Bill" phase={4} onClick={onBill ? () => onBill(room) : undefined} /> {/* CR-385 M6 live */}
          </>
        )}
      </div>
    </div>
  );
};

export default RoomDetail;
