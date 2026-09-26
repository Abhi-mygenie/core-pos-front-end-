// CR-385 M0 — Departures tab: in_house rows · chips Overdue/Today/Tomorrow/Upcoming vs meta.business_date
// CR-385 M5 — ₹ = getRowBalances display (room + room service + transferred F&B, CR-170 round-off shared with the bill, BUG-433) · Extend / Request HK / Mark Clean live · Cleared → Bill disabled (X-02)
// CR-385 M6 — Bill live → FolioCheckoutPanel expansion (kind 'bill')
import { useMemo, useState } from 'react';
import { bucketDeparture, isCleared, dayDiff } from '@/api/transforms/frontDeskTransform';
import GuestTable, { commonColumns, sortRows, toggleSort, StatusPill, PhaseButton, RowExpansionStub } from './GuestTable';
import ExtendStayForm from './ExtendStayForm'; // CR-385 M4
import FolioCheckoutPanel from './FolioCheckoutPanel'; // CR-385 M6
import { fmtINR } from './money';
import { Chips, CHIP_ORDER, useChipCounts, firstNonEmptyChip } from './ArrivalsPanel'; // CR-385 M0.5 BUG-437 firstNonEmptyChip

export const stayActions = (r, variant = '', h = {}) => { // BUG-439 variant '' = row cell · 'exp-' = expansion drawer → unique testids (D73) · CR-385 M5 handlers { onOpen, onPatch, busyId }
  const hkNext = r.roomStatus === 'hk' ? 'available' : 'hk'; // Request HK ↔ Mark Clean on the guest's room (same patchRoomStatus as the Rooms tab)
  const busy = h.busyId != null && String(h.busyId) === String(r.tableId);
  return (
    <>
      <PhaseButton testId={`fd-row-${r.id}-${variant}bill-btn`} label="Bill" phase={4} onClick={h.onOpen && r.orderId && !isCleared(r) ? () => h.onOpen(r.id, 'bill') : undefined} title={isCleared(r) ? 'Cleared — nothing to bill' : h.onOpen && !r.orderId ? 'No folio order linked to this stay' : undefined} /> {/* BUG-439 · CR-385 M6 live · X-02 */}
      <PhaseButton testId={`fd-row-${r.id}-${variant}hk-btn`} label={r.roomStatus === 'hk' ? 'Mark Clean' : 'Request HK'} phase={3} onClick={h.onPatch && r.tableId && !busy ? () => h.onPatch(r.tableId, hkNext) : undefined} title={busy ? 'Updating…' : undefined} /> {/* CR-385 M5 live */}
      <PhaseButton testId={`fd-row-${r.id}-${variant}extend-btn`} label="Extend" phase={3} onClick={h.onOpen && r.orderId ? () => h.onOpen(r.id, 'extend') : undefined} title={h.onOpen && !r.orderId ? 'No folio order linked to this stay' : undefined} /> {/* CR-385 M4 live */}
    </>
  );
};

export const balanceOf = (balances) => (r) => (balances === undefined ? undefined : balances === null ? r.charge?.balance_due : (balances[String(r.orderId)]?.display ?? r.charge?.balance_due)); // CR-385 M5: undefined = loading ("…", Q2 a) · null = folio path unavailable → ledger fallback
export const balanceTitle = (balances) => (r) => { const b = balances?.[String(r.orderId)]; return b && b.roundOff !== 0 ? `${fmtINR(b.raw)} ${b.roundOff > 0 ? '+' : '−'} ${fmtINR(Math.abs(b.roundOff))} round-off (as on the bill)` : undefined; }; // BUG-433

export const stayStatus = (r, bd) => {
  if (isCleared(r)) return <StatusPill kind="cleared" rowId={r.id} />;
  const b = bucketDeparture(r, bd);
  if (b === 'overdue') return <StatusPill kind="overdue" rowId={r.id} suffix={`${dayDiff(r.checkout, bd)} d`} />;
  return <StatusPill kind="in_house" rowId={r.id} />;
};

export const DeparturesPanel = ({ rows, meta, expandedId, expandedKind = 'detail', onToggle, onOpen, onDone, onPatch, busyId, balances, chip, onChip }) => { // CR-385 M4/M5
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'checkout', dir: 'asc' });
  const counts = useChipCounts(rows, bucketDeparture, bd, CHIP_ORDER.departures);
  const active = chip ?? firstNonEmptyChip(counts, CHIP_ORDER.departures); // CR-385 M0.5 BUG-437 null chip = auto until the user clicks (D70)
  const visible = useMemo(() => sortRows(rows.filter((r) => bucketDeparture(r, bd) === active), sort), [rows, bd, active, sort]); // CR-385 M0.5 BUG-437
  const h = { onOpen, onPatch, busyId };
  const columns = commonColumns({ amountKey: 'balance_due', amountLabel: 'Balance', actions: (r) => stayActions(r, '', h), statusOf: (r) => stayStatus(r, bd), badgeInHouse: true, amountOf: balanceOf(balances), amountTitle: balanceTitle(balances) }); // CR-385 M5
  const renderExpansion = (row) => (expandedKind === 'bill' ? <FolioCheckoutPanel row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : expandedKind === 'extend' ? <ExtendStayForm row={row} meta={meta} onDone={onDone} onClose={() => onToggle(null)} /> : <RowExpansionStub row={row} onClose={() => onToggle(null)} actions={stayActions(row, 'exp-', h)} />); // CR-385 M4 · M6

  return (
    <section data-testid="fd-panel-departures">
      <Chips tab="departures" active={active} counts={counts} onPick={onChip} danger={['overdue']} /> {/* CR-385 M0.5 BUG-437 active chip */}
      <GuestTable tab="departures" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText={`No ${active} departures` /* CR-385 M0.5 BUG-437 */}
        renderExpansion={renderExpansion} />
      <div className="mt-2 text-[11px] text-[#767676]" data-testid="fd-departures-footer">{balances === null ? 'Balances: room ledger only (folio balances unavailable right now).' : 'Balance = room ledger + room service + transferred F&B, rounded as on the bill (hover for the exact figure).'}</div>
    </section>
  );
};

export default DeparturesPanel;
