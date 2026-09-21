// CR-385 M0 — Rooms tab: group-by segmented control Room no. · Type · Area (title, D41/D42; persisted mygenie_frontdesk_groupby) · chips All/Available/Occupied/Booked/HK/OOO/Turns today · tile → RoomDetail (one open at a time) · boardError → panel retry only (OD-385-11)
import { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { groupRooms, isTurn, roomChipKey } from '@/api/transforms/frontDeskTransform';
import RoomTile from './RoomTile';
import RoomDetail from './RoomDetail';

const GROUP_MODES = [{ key: 'number', label: 'Room no.' }, { key: 'type', label: 'Type' }, { key: 'area', label: 'Area' }];
const ROOM_CHIPS = [['all', 'All'], ['available', 'Available'], ['occupied', 'Occupied'], ['booked', 'Booked'], ['hk', 'HK'], ['ooo', 'OOO'], ['turns', 'Turns today']];
const GROUPBY_KEY = 'mygenie_frontdesk_groupby';

export const RoomsPanel = ({ snapshot, expandedRoomId, onToggleRoom, chip, onChip, busyId, onPatch, onRetry }) => {
  const { rooms = [], reservations = [], meta, boardError, autoHkOnRmCheckout } = snapshot ?? {};
  const bd = meta?.business_date;
  const [mode, setMode] = useState(() => localStorage.getItem(GROUPBY_KEY) || 'number');
  const pickMode = (m) => { setMode(m); localStorage.setItem(GROUPBY_KEY, m); };

  const turnIds = useMemo(() => new Set(rooms.filter((r) => isTurn(r, reservations, bd)).map((r) => r.id)), [rooms, reservations, bd]);
  const chipCounts = useMemo(() => {
    const c = { all: rooms.length, turns: turnIds.size };
    rooms.forEach((r) => { const k = roomChipKey(r); if (k === 'occupied_hk') { c.occupied = (c.occupied ?? 0) + 1; c.hk = (c.hk ?? 0) + 1; } else c[k] = (c[k] ?? 0) + 1; });
    return c;
  }, [rooms, turnIds]);
  const filtered = useMemo(() => rooms.filter((r) => {
    if (chip === 'all') return true;
    if (chip === 'turns') return turnIds.has(r.id);
    const k = roomChipKey(r);
    if (chip === 'occupied') return k === 'occupied' || k === 'occupied_hk';
    if (chip === 'hk') return k === 'hk' || k === 'occupied_hk';
    return k === chip;
  }), [rooms, chip, turnIds]);
  const groups = useMemo(() => groupRooms(filtered, mode), [filtered, mode]);
  const rowsByTable = useMemo(() => {
    const m = {};
    reservations.forEach((r) => { if (r.tableId != null) (m[r.tableId] ??= []).push(r); });
    return m;
  }, [reservations]);

  if (boardError) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-10 text-center" data-testid="fd-rooms-error">
        <AlertCircle className="w-6 h-6 text-[#EF4444] mx-auto" />
        <div className="text-[13px] mt-2">Room board unavailable. Reservations tabs still work.</div>
        <button type="button" data-testid="fd-rooms-retry-btn" onClick={onRetry} className="fd-btn mt-3 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg text-[13px] font-semibold text-white" style={{ background: '#F26B33' }}><RefreshCw className="w-4 h-4" /> Retry</button>
      </div>
    );
  }

  const inHouseFor = (room) => (rowsByTable[room.id] ?? []).find((r) => r.operationalStatus === 'in_house') ?? null;
  const nextArrivalFor = (room) => (rowsByTable[room.id] ?? []).filter((r) => r.operationalStatus === 'pending').sort((a, b) => a.checkin.localeCompare(b.checkin))[0] ?? null;

  return (
    <section data-testid="fd-panel-rooms">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="rooms filters">
          {ROOM_CHIPS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={chip === k} data-testid={`fd-chip-rooms-${k}`} onClick={() => onChip(k)}
              className={`fd-chip px-3 h-8 rounded-full text-[12px] font-semibold border ${chip === k ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : k === 'ooo' && chipCounts.ooo > 0 ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-[#F7F7F7]'}`}>
              {label} <span className="tabular-nums opacity-70">{chipCounts[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {autoHkOnRmCheckout != null && <span className="text-[11px] text-[#767676]" data-testid="fd-rooms-autohk">Auto-HK on checkout: <b>{autoHkOnRmCheckout ? 'On' : 'Off'}</b></span>}
          <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-white p-0.5" role="radiogroup" aria-label="Group rooms by">
            {GROUP_MODES.map((g) => (
              <button key={g.key} type="button" role="radio" aria-checked={mode === g.key} data-testid={`fd-rooms-groupby-${g.key}`} onClick={() => pickMode(g.key)}
                className={`fd-btn px-3 h-7 rounded-md text-[12px] font-medium ${mode === g.key ? 'bg-[#1A1A1A] text-white' : 'text-[#1A1A1A] hover:bg-[#F7F7F7]'}`}>{g.label}</button>
            ))}
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.key} className="mb-5" data-testid={`fd-rooms-group-${g.key.replace(/\s+/g, '-').toLowerCase()}`}>
          {mode !== 'number' && <h3 className="text-[12px] font-semibold text-[#767676] mb-2" data-testid={`fd-rooms-group-title-${g.key.replace(/\s+/g, '-').toLowerCase()}`}>{g.key} <span className="tabular-nums">· {g.rooms.length}</span></h3>}
          <div className="grid grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {g.rooms.map((room) => [
              <RoomTile key={room.id} room={room} selected={String(expandedRoomId) === String(room.id)} isTurn={turnIds.has(room.id)} onOpen={() => onToggleRoom(String(room.id))} />,
              String(expandedRoomId) === String(room.id) && (
                <RoomDetail key={`${room.id}-d`} room={room} row={inHouseFor(room)} nextArrival={nextArrivalFor(room)} isTurn={turnIds.has(room.id)} busy={busyId === room.id} onPatch={onPatch} onClose={() => onToggleRoom(null)} />
              ),
            ])}
          </div>
          {g.rooms.length === 0 && <div className="text-[12px] text-[#767676]">No rooms</div>}
        </div>
      ))}
      {filtered.length === 0 && <div className="bg-white rounded-xl border border-[#E5E5E5] p-8 text-center text-[13px] text-[#767676]" data-testid="fd-rooms-empty">No rooms match this filter</div>}
    </section>
  );
};

export default RoomsPanel;
