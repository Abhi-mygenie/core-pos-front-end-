// CR-385 M0 — Arrivals tab: pending reservations · chips Late/Today/Tomorrow/Upcoming vs meta.business_date (F6, X-06) · ₹ = charge.total_with_gst · actions phase-gated
import { useMemo, useState } from 'react';
import { bucketArrival } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns, sortRows, toggleSort, StatusPill, PhaseButton, RowExpansionStub } from './GuestTable';
import { fmtDate } from './money';

export const CHIP_ORDER = { arrivals: ['late', 'today', 'tomorrow', 'upcoming'], departures: ['overdue', 'today', 'tomorrow', 'upcoming'], inhouse: ['all', 'arrived', 'leaving', 'stayover'] };
const CHIP_LABEL = { late: 'Late', today: 'Today', tomorrow: 'Tomorrow', upcoming: 'Upcoming', overdue: 'Overdue', all: 'All', arrived: 'Arrived today', leaving: 'Leaving today', stayover: 'Stayover' };

export const Chips = ({ tab, active, counts, onPick, danger = [] }) => (
  <div className="flex items-center gap-2 mb-3 flex-wrap" role="tablist" aria-label={`${tab} filters`}>
    {CHIP_ORDER[tab].map((k) => {
      const on = active === k;
      const red = danger.includes(k) && (counts[k] ?? 0) > 0;
      return (
        <button key={k} type="button" role="tab" aria-selected={on} data-testid={`fd-chip-${tab}-${k}`} onClick={() => onPick(k)}
          className={`fd-chip px-3 h-8 rounded-full text-[12px] font-semibold border ${on ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : red ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]' : 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-[#F7F7F7]'}`}>
          {CHIP_LABEL[k]} <span className="tabular-nums opacity-70">{counts[k] ?? 0}</span>
        </button>
      );
    })}
  </div>
);

export const useChipCounts = (rows, bucketFn, bd, keys) => useMemo(() => {
  const c = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => { const k = bucketFn(r, bd); c[k] = (c[k] ?? 0) + 1; });
  c.all = rows.length;
  return c;
}, [rows, bucketFn, bd, keys]);

export const firstNonEmptyChip = (counts, order) => order.find((k) => (counts?.[k] ?? 0) > 0) ?? 'today'; // CR-385 M0.5 BUG-437 D70: first non-empty bucket in display order, all-zero → today

export const ArrivalsPanel = ({ rows, meta, kpis, expandedId, onToggle, chip, onChip }) => {
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'checkin', dir: 'asc' });
  const counts = useChipCounts(rows, bucketArrival, bd, CHIP_ORDER.arrivals);
  const active = chip ?? firstNonEmptyChip(counts, CHIP_ORDER.arrivals); // CR-385 M0.5 BUG-437 null chip = auto until the user clicks (D70)
  const visible = useMemo(() => sortRows(rows.filter((r) => bucketArrival(r, bd) === active), sort), [rows, bd, active, sort]); // CR-385 M0.5 BUG-437

  const actions = (r) => (
    <>
      <PhaseButton testId={`fd-row-${r.id}-checkin-btn`} label="Check In" phase={2} />
      <PhaseButton testId={`fd-row-${r.id}-kebab`} label="⋮" phase={1} />
    </>
  );
  const columns = commonColumns({
    amountKey: 'total_with_gst', amountLabel: 'Booking ₹', actions,
    statusOf: (r) => (bucketArrival(r, bd) === 'late' ? <StatusPill kind="late" rowId={r.id} suffix={`· since ${fmtDate(r.checkin)}`} /> : <StatusPill kind="pending" rowId={r.id} />),
  });

  return (
    <section data-testid="fd-panel-arrivals">
      <Chips tab="arrivals" active={active} counts={counts} onPick={onChip} danger={['late']} /> {/* CR-385 M0.5 BUG-437 active chip */}
      <GuestTable tab="arrivals" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText={`No ${active} arrivals` /* CR-385 M0.5 BUG-437 */}
        renderExpansion={(row) => <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={actions(row)} />} />
      <div className="mt-2 text-[11px] text-[#767676]" data-testid="fd-arrivals-footer">No-shows today: <span className="tabular-nums font-semibold" data-testid="fd-arrivals-footer-noshow">{kpis?.today?.no_show_count ?? '—'}</span></div>
    </section>
  );
};

export default ArrivalsPanel;
