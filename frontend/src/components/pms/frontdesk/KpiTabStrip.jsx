// CR-385 M0 — 4 tiles = tabs (F5, OD-385-01/07): numbers from counts.* (AC-12), board counts, kpis.today.occupancy_percent_physical (MV-06). Rooms 2× wide. No trend hint (D4). Red left edge when late/overdue/OOO > 0.
const Tile = ({ id, label, value, sub, red, active, wide, onClick, onSub }) => (
  <button type="button" role="tab" id={`fd-tab-${id}`} data-testid={`fd-tab-${id}`} aria-selected={active} onClick={onClick}
    className={`fd-tab text-left bg-white rounded-xl border px-4 py-3 h-[60px] flex flex-col justify-center relative ${wide ? 'col-span-2' : ''} ${active ? 'border-[#1A1A1A] shadow-sm' : 'border-[#E5E5E5] hover:border-[#CCC]'}`}
    style={red ? { borderLeft: '4px solid #EF4444' } : undefined}>
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#767676]">{label}</span>
      <span className="text-[18px] font-bold text-[#1A1A1A] tabular-nums leading-none" style={{ fontFamily: 'Poppins, sans-serif' }} data-testid={`fd-tab-${id}-count`}>{value}</span>
    </div>
    <div className="text-[11px] text-[#767676] mt-0.5 truncate flex gap-2">
      {sub.map((s) => (
        <span key={s.key} role="link" tabIndex={0} data-testid={`fd-tab-${id}-sub-${s.key}`}
          className={`hover:underline ${s.red ? 'text-[#B91C1C] font-semibold' : ''}`}
          onClick={(e) => { e.stopPropagation(); onSub(s.key); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onSub(s.key); } }}>
          {s.text}
        </span>
      ))}
    </div>
  </button>
);

export const KpiTabStrip = ({ counts = {}, boardCounts, boardError, kpis, active, onTab }) => {
  const occ = kpis?.today?.occupancy_percent_physical;
  const free = boardError || !boardCounts ? '—' : `${boardCounts.available ?? 0} free`;
  const ooo = boardCounts?.ooo ?? 0;
  const roomsSub = boardError
    ? [{ key: 'all', text: 'board unavailable', red: true }]
    : [
      { key: 'occupied', text: `${boardCounts?.occupied ?? 0} occupied` },
      { key: 'hk', text: `${boardCounts?.hk ?? 0} HK` },
      { key: 'ooo', text: `${ooo} OOO`, red: ooo > 0 },
      ...(occ != null ? [{ key: 'all', text: `${occ}% occupancy` }] : []),
    ];
  return (
    <div className="grid grid-cols-5 gap-3" role="tablist" aria-label="Front desk tabs" data-testid="fd-tab-strip">
      <Tile id="arrivals" label="Arrivals" value={counts.arrivals_today ?? 0} active={active === 'arrivals'} red={(counts.arrivals_late ?? 0) > 0}
        onClick={() => onTab('arrivals')} onSub={(k) => onTab('arrivals', k)}
        sub={[{ key: 'late', text: `${counts.arrivals_late ?? 0} late`, red: (counts.arrivals_late ?? 0) > 0 }, { key: 'tomorrow', text: `${counts.arrivals_tomorrow ?? 0} tomorrow` }]} />
      <Tile id="departures" label="Departures" value={counts.departures_today ?? 0} active={active === 'departures'} red={(counts.departures_overdue ?? 0) > 0}
        onClick={() => onTab('departures')} onSub={(k) => onTab('departures', k)}
        sub={[{ key: 'overdue', text: `${counts.departures_overdue ?? 0} overdue`, red: (counts.departures_overdue ?? 0) > 0 }, { key: 'today', text: `${counts.leaving_today ?? 0} leaving today` }]} />
      <Tile id="inhouse" label="In-House" value={counts.in_house ?? 0} active={active === 'inhouse'}
        onClick={() => onTab('inhouse')} onSub={(k) => onTab('inhouse', k)}
        sub={[{ key: 'arrived', text: `${counts.arrived_today ?? 0} arrived today` }, { key: 'leaving', text: `${counts.leaving_today ?? 0} leaving today` }]} />
      <Tile id="rooms" label="Rooms" value={free} wide active={active === 'rooms'} red={ooo > 0}
        onClick={() => onTab('rooms')} onSub={(k) => onTab('rooms', k)} sub={roomsSub} />
    </div>
  );
};

export default KpiTabStrip;
