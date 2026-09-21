// CR-385 M0 — In-House tab: in_house rows · chips All/Arrived today/Leaving today/Stayover vs meta.business_date · ₹ = charge.balance_due (P0; P3 → getRowBalances) · actions phase-gated
import { useMemo, useState } from 'react';
import { bucketInHouse } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns, sortRows, toggleSort, RowExpansionStub } from './GuestTable';
import { Chips, CHIP_ORDER, useChipCounts } from './ArrivalsPanel';
import { stayActions, stayStatus } from './DeparturesPanel';

export const InHousePanel = ({ rows, meta, expandedId, onToggle, chip, onChip }) => {
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'room', dir: 'asc' });
  const counts = useChipCounts(rows, bucketInHouse, bd, CHIP_ORDER.inhouse);
  const visible = useMemo(() => sortRows(chip === 'all' ? rows : rows.filter((r) => bucketInHouse(r, bd) === chip), sort), [rows, bd, chip, sort]);
  const columns = commonColumns({ amountKey: 'balance_due', amountLabel: 'Balance', actions: stayActions, statusOf: (r) => stayStatus(r, bd), badgeInHouse: true });

  return (
    <section data-testid="fd-panel-inhouse">
      <Chips tab="inhouse" active={chip} counts={counts} onPick={onChip} />
      <GuestTable tab="inhouse" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText="No guests in house"
        renderExpansion={(row) => <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-')} />} /> {/* BUG-439 drawer copy → -exp- ids */}
    </section>
  );
};

export default InHousePanel;
