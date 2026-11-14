// CR-385 M0 — global search (F8): client-side over the snapshot by guest / phone (last digits) / booking id / room no. `/` focuses, Esc clears. Groups In-house · Arriving · Departing · Rooms. Select → tab + chip + row / tile.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { bucketArrival, bucketDeparture } from '@/api/transforms/frontDeskTransform';
import { fmtDate, maskPhone } from './money';

const GROUPS = [
  { key: 'inhouse', label: 'In-house' },
  { key: 'arriving', label: 'Arriving' },
  { key: 'departing', label: 'Departing' },
  { key: 'rooms', label: 'Rooms' },
];

const norm = (s) => String(s ?? '').toLowerCase();
const rowMatches = (r, q) => norm(r.guestName).includes(q) || norm(r.bookingId).includes(q) || norm(r.phone).endsWith(q) || norm(r.roomNo) === q || norm(r.roomNo).includes(q);

export const searchSnapshot = (snap, query) => {
  const q = norm(query).trim();
  if (!q || !snap) return [];
  const bd = snap.meta?.business_date;
  const res = snap.reservations ?? [];
  const inhouse = res.filter((r) => r.operationalStatus === 'in_house' && rowMatches(r, q));
  const arriving = res.filter((r) => r.operationalStatus === 'pending' && rowMatches(r, q));
  const out = [];
  inhouse.forEach((r) => out.push({ group: 'inhouse', text: `${r.guestName} · Room ${r.roomNo ?? '—'} · out ${fmtDate(r.checkout)}`, go: { tab: 'inhouse', chip: 'all', rowId: String(r.id) } }));
  arriving.forEach((r) => out.push({ group: 'arriving', text: `${r.guestName} · ${r.bookingId} · in ${fmtDate(r.checkin)}`, go: { tab: 'arrivals', chip: bucketArrival(r, bd), rowId: String(r.id) } }));
  inhouse.filter((r) => r.checkout <= bd).forEach((r) => out.push({ group: 'departing', text: `${r.guestName} · Room ${r.roomNo ?? '—'} · ${maskPhone(r.phone)}`, go: { tab: 'departures', chip: bucketDeparture(r, bd), rowId: String(r.id) } }));
  (snap.rooms ?? []).filter((rm) => norm(rm.tableNo).includes(q) || norm(rm.guest?.name).includes(q) || norm(rm.title).includes(q))
    .forEach((rm) => out.push({ group: 'rooms', text: `Room ${rm.tableNo} · ${rm.roomType ?? ''} · ${rm.displayStatus}${rm.guest?.name ? ` · ${rm.guest.name}` : ''}`, go: { tab: 'rooms', chip: 'all', roomId: String(rm.id) } }));
  return out.slice(0, 24);
};

export const GlobalSearch = ({ snapshot, onNavigate }) => {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const results = useMemo(() => searchSnapshot(snapshot, q), [snapshot, q]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (r) => { setQ(''); onNavigate(r.go); };

  return (
    <div className="relative w-[380px] max-w-full" data-testid="fd-search">
      <Search className="w-4 h-4 text-[#767676] absolute left-3 top-1/2 -translate-y-1/2" />
      <input ref={ref} data-testid="fd-search-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); e.currentTarget.blur(); } }}
        placeholder="Search room · guest · phone · booking  ( / )" aria-label="Search front desk"
        className="w-full h-9 pl-9 pr-8 rounded-full border border-[#E5E5E5] bg-white text-[13px] focus:outline-none focus:border-[#1A1A1A]" />
      {q && <button type="button" data-testid="fd-search-clear" onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-[#767676] hover:text-[#1A1A1A]"><X className="w-4 h-4" /></button>}
      {q && (
        <div data-testid="fd-search-results" className="absolute z-30 mt-1 w-full bg-white border border-[#E5E5E5] rounded-xl shadow-lg max-h-[360px] overflow-auto p-2">
          {results.length === 0 && <div className="text-[12px] text-[#767676] px-2 py-3" data-testid="fd-search-empty">No matches in today's snapshot</div>}
          {GROUPS.map((g) => {
            const items = results.filter((r) => r.group === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key} className="mb-1">
                <div className="text-[10px] uppercase font-semibold text-[#767676] px-2 pt-1">{g.label}</div>
                {items.map((r, i) => (
                  <button key={`${g.key}-${i}`} type="button" data-testid={`fd-search-result-${g.key}-${i}`} onClick={() => pick(r)}
                    className="fd-btn block w-full text-left text-[13px] px-2 py-1.5 rounded-md hover:bg-[#F7F7F7]">{r.text}</button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
