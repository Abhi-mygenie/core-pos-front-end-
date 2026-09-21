// CR-385 M0 — Departures tab: in_house rows · chips Overdue/Today/Tomorrow/Upcoming vs meta.business_date · ₹ = charge.balance_due (P0 placeholder; P3 → getRowBalances) · actions phase-gated
import { useMemo, useState } from 'react';
import { bucketDeparture, isCleared, dayDiff } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns, sortRows, toggleSort, StatusPill, PhaseButton, RowExpansionStub } from './GuestTable';
import { Chips, CHIP_ORDER, useChipCounts, firstNonEmptyChip } from './ArrivalsPanel'; // CR-385 M0.5 BUG-437 firstNonEmptyChip

export const stayActions = (r, variant = '') => ( // BUG-439 variant '' = row cell · 'exp-' = expansion drawer → unique testids (D73)
  <>
    <PhaseButton testId={`fd-row-${r.id}-${variant}bill-btn`} label="Bill" phase={4} /> {/* BUG-439 */}
    <PhaseButton testId={`fd-row-${r.id}-${variant}hk-btn`} label="Request HK" phase={3} /> {/* BUG-439 */}
    <PhaseButton testId={`fd-row-${r.id}-${variant}extend-btn`} label="Extend" phase={3} /> {/* BUG-439 */}
  </>
);

export const stayStatus = (r, bd) => {
  if (isCleared(r)) return <StatusPill kind="cleared" rowId={r.id} />;
  const b = bucketDeparture(r, bd);
  if (b === 'overdue') return <StatusPill kind="overdue" rowId={r.id} suffix={`${dayDiff(r.checkout, bd)} d`} />;
  return <StatusPill kind="in_house" rowId={r.id} />;
};

export const DeparturesPanel = ({ rows, meta, expandedId, onToggle, chip, onChip }) => {
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'checkout', dir: 'asc' });
  const counts = useChipCounts(rows, bucketDeparture, bd, CHIP_ORDER.departures);
  const active = chip ?? firstNonEmptyChip(counts, CHIP_ORDER.departures); // CR-385 M0.5 BUG-437 null chip = auto until the user clicks (D70)
  const visible = useMemo(() => sortRows(rows.filter((r) => bucketDeparture(r, bd) === active), sort), [rows, bd, active, sort]); // CR-385 M0.5 BUG-437
  const columns = commonColumns({ amountKey: 'balance_due', amountLabel: 'Balance', actions: stayActions, statusOf: (r) => stayStatus(r, bd), badgeInHouse: true });

  return (
    <section data-testid="fd-panel-departures">
      <Chips tab="departures" active={active} counts={counts} onPick={onChip} danger={['overdue']} /> {/* CR-385 M0.5 BUG-437 active chip */}
      <GuestTable tab="departures" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText={`No ${active} departures` /* CR-385 M0.5 BUG-437 */}
        renderExpansion={(row) => <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-')} />} /> {/* BUG-439 drawer copy → -exp- ids */}
      <div className="mt-2 text-[11px] text-[#767676]" data-testid="fd-departures-footer">Balances shown from the reservation ledger (<code>charge.balance_due</code>); room-service and transferred F&amp;B join in Phase 3.</div>
    </section>
  );
};

export default DeparturesPanel;
