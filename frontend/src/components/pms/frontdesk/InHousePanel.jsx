// CR-385 M0 — In-House tab: in_house rows · chips All/Arrived today/Leaving today/Stayover vs meta.business_date · ₹ = charge.balance_due (P0; P3 → getRowBalances) · actions phase-gated
import { useMemo, useState } from 'react';
import { bucketInHouse } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns, sortRows, toggleSort, RowExpansionStub } from './GuestTable';
import { Chips, CHIP_ORDER, useChipCounts } from './ArrivalsPanel';
import { stayActions, stayStatus, balanceOf, balanceTitle } from './DeparturesPanel'; // CR-385 M5
import ExtendStayForm from './ExtendStayForm'; // CR-385 M4
import FolioCheckoutPanel from './FolioCheckoutPanel'; // CR-385 M6

export const InHousePanel = ({ rows, meta, expandedId, expandedKind = 'detail', onToggle, onOpen, onDone, onPatch, busyId, balances, chip, onChip }) => { // CR-385 M4/M5
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'room', dir: 'asc' });
  const counts = useChipCounts(rows, bucketInHouse, bd, CHIP_ORDER.inhouse);
  const visible = useMemo(() => sortRows(chip === 'all' ? rows : rows.filter((r) => bucketInHouse(r, bd) === chip), sort), [rows, bd, chip, sort]);
  const h = { onOpen, onPatch, busyId };
  const columns = commonColumns({ amountKey: 'balance_due', amountLabel: 'Balance', actions: (r) => stayActions(r, '', h), statusOf: (r) => stayStatus(r, bd), badgeInHouse: true, amountOf: balanceOf(balances), amountTitle: balanceTitle(balances) }); // CR-385 M5

  return (
    <section data-testid="fd-panel-inhouse">
      <Chips tab="inhouse" active={chip} counts={counts} onPick={onChip} />
      <GuestTable tab="inhouse" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText="No guests in house"
        renderExpansion={(row) => { // BUG-515 Sub-B: bridge discount fields from balance pipeline to snap row
          if (expandedKind === 'bill') return <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          if (expandedKind === 'extend') return <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} />;
          const b = balances?.[String(row.orderId)];
          const enrichedRow = (b?.roomDiscountAmount ?? 0) > 0
            ? { ...row, roomDiscountAmount: b.roomDiscountAmount, effectiveTotal: b.effectiveTotal,
                effectiveBalanceDue: b.effectiveBalanceDue, effectiveSgst: b.effectiveSgst, effectiveCgst: b.effectiveCgst }
            : row;
          return <RowExpansionStub row={enrichedRow} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />;
        }} /> {/* CR-385 M4 · M6 · BUG-439 · BUG-515 Sub-B */}
    </section>
  );
};

export default InHousePanel;
