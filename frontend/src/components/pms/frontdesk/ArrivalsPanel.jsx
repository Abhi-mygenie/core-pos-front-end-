// CR-385 M0 — Arrivals tab: pending reservations · chips Late/Today/Tomorrow/Upcoming vs meta.business_date (F6, X-06) · ₹ = charge.total_with_gst
// CR-385 M2 — row actions live: Modify (server preview) · Cancel OR No-Show by nsOrCancel(row) (AC-13, EITHER/OR) · Check In stays phase-gated (P2)
import { useMemo, useState } from 'react';
import { bucketArrival, nsOrCancel } from '@/api/transforms/frontDeskTransform';
import CancelBookingDialog from '@/components/pms/CancelBookingDialog';
import NoShowDialog from '@/components/pms/NoShowDialog';
import GuestTable, { commonColumns, sortRows, toggleSort, StatusPill, PhaseButton, RowExpansionStub } from './GuestTable';
import ModifyBookingForm from './ModifyBookingForm';
import { fmtDate, fmtINR } from './money';

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

// CR-385 M2 — target shapes copied from pages/pms/ArrivalsPage.jsx L273–274 (same dialogs, same props); money from charge.* only (D50)
export const cancelTargetOf = (r, cancelledBy) => ({ reservationId: r.id, guestName: r.guestName, channel: r.channel, checkin: r.checkin, checkout: r.checkout, roomCode: r.roomType, advance: Number(r.charge?.advance_payment ?? 0), cancelledBy: cancelledBy || 'staff' });
export const noShowTargetOf = (r) => ({ bookingId: r.bookingId, guestName: r.guestName, channel: r.channel, checkin: r.checkin, roomCode: r.roomType });

// CR-385 M2 — read-only money outcome (DEC-2, AC-05): backend owns the penalty; refund processing is Phase 2
const OutcomeCard = ({ row, kind }) => {
  const c = row.charge ?? {};
  return (
    <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] w-full max-w-xs" data-testid="outcome-card">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-[#1A1A1A]">{kind === 'noshow' ? 'No-show' : 'Cancellation'} · money outcome</span>
        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E]" data-testid="outcome-phase2-ribbon">Refund · Phase 2</span>
      </div>
      <div className="grid grid-cols-2 gap-y-1 tabular-nums">
        <span className="text-[#767676]">Booking (incl. GST)</span><span className="text-right font-semibold" data-testid="outcome-total">{fmtINR(c.total_with_gst)}</span>
        <span className="text-[#767676]">Prepaid (OTA)</span><span className="text-right" data-testid="outcome-prepaid">{fmtINR(c.prepaid_amount)}</span>
        <span className="text-[#767676]">Advance received</span><span className="text-right" data-testid="outcome-advance">{fmtINR(c.advance_payment)}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-[#E5E5E5] text-[11px] text-[#767676]">
        {kind === 'noshow' ? 'Any refund is handled by the OTA. ' : 'Any refund to the guest is processed offline. '}The server records the final penalty.
      </div>
    </div>
  );
};

export const ArrivalsPanel = ({ rows, meta, kpis, expandedId, expandedKind = 'detail', onToggle, onOpen, onDone, cancelledBy, chip, onChip }) => {
  const bd = meta?.business_date;
  const [sort, setSort] = useState({ key: 'checkin', dir: 'asc' });
  const counts = useChipCounts(rows, bucketArrival, bd, CHIP_ORDER.arrivals);
  const active = chip ?? firstNonEmptyChip(counts, CHIP_ORDER.arrivals); // CR-385 M0.5 BUG-437 null chip = auto until the user clicks (D70)
  const visible = useMemo(() => sortRows(rows.filter((r) => bucketArrival(r, bd) === active), sort), [rows, bd, active, sort]); // CR-385 M0.5 BUG-437

  const actions = (r, variant = '') => { // BUG-439 variant '' = row cell · 'exp-' = expansion drawer → unique testids (D73)
    const ns = nsOrCancel(r); // CR-385 M2 AC-13: OTA → No-Show only · Direct/WalkIn → Cancel only (never both)
    return (
      <>
        <PhaseButton testId={`fd-row-${r.id}-${variant}checkin-btn`} label="Check In" phase={2} /> {/* BUG-439 */}
        <PhaseButton testId={`fd-row-${r.id}-${variant}modify-btn`} label="Modify" phase={1} onClick={() => onOpen?.(r.id, 'modify')} /> {/* CR-385 M2 */}
        {ns === 'noshow'
          ? <PhaseButton testId={`fd-row-${r.id}-${variant}noshow-btn`} label="No-Show" phase={1} danger onClick={() => onOpen?.(r.id, 'noshow')} />
          : <PhaseButton testId={`fd-row-${r.id}-${variant}cancel-btn`} label="Cancel" phase={1} danger onClick={() => onOpen?.(r.id, 'cancel')} />} {/* CR-385 M2 */}
      </>
    );
  };
  const columns = commonColumns({
    amountKey: 'total_with_gst', amountLabel: 'Booking ₹', actions,
    statusOf: (r) => (bucketArrival(r, bd) === 'late' ? <StatusPill kind="late" rowId={r.id} suffix={`· since ${fmtDate(r.checkin)}`} /> : <StatusPill kind="pending" rowId={r.id} />),
  });

  const close = () => onToggle(null);
  const stop = (e) => e.stopPropagation();
  const renderExpansion = (row) => { // CR-385 M2 — one expansion at a time (F1); kind picks the body
    switch (expandedKind) {
      case 'modify':
        return <ModifyBookingForm row={row} meta={meta} onDone={onDone} onClose={close} />;
      case 'cancel':
      case 'noshow':
        return (
          <div className="px-5 py-4 flex flex-wrap items-start gap-6" data-testid={`fd-row-${row.id}-${expandedKind}`} onClick={stop} onKeyDown={stop}>
            <OutcomeCard row={row} kind={expandedKind} />
            {expandedKind === 'cancel'
              ? <CancelBookingDialog inline target={cancelTargetOf(row, cancelledBy)} onClose={close} onSuccess={() => onDone?.('Booking cancelled')} />
              : <NoShowDialog inline target={noShowTargetOf(row)} onClose={close} onSuccess={() => onDone?.('No-show recorded. Room inventory released.')} />}
          </div>
        );
      default:
        return <RowExpansionStub row={row} onClose={close} actions={actions(row, 'exp-')} />; // BUG-439 drawer copy → -exp- ids
    }
  };

  return (
    <section data-testid="fd-panel-arrivals">
      <Chips tab="arrivals" active={active} counts={counts} onPick={onChip} danger={['late']} /> {/* CR-385 M0.5 BUG-437 active chip */}
      <GuestTable tab="arrivals" rows={visible} columns={columns} sort={sort} onSort={(k) => setSort(toggleSort(sort, k))}
        expandedId={expandedId} onToggle={onToggle} emptyText={`No ${active} arrivals` /* CR-385 M0.5 BUG-437 */}
        renderExpansion={renderExpansion} />
      <div className="mt-2 text-[11px] text-[#767676]" data-testid="fd-arrivals-footer">No-shows today: <span className="tabular-nums font-semibold" data-testid="fd-arrivals-footer-noshow">{kpis?.today?.no_show_count ?? '—'}</span></div>
    </section>
  );
};

export default ArrivalsPanel;
