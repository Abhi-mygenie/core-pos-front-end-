// CR-385 M0 — common guest table: sticky <th> (no top padding, M0-03), sort ▲▼ (F16), ↑↓ Enter Esc (D57), one expansion at a time (F1), scrollIntoView on open (M6-11)
import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { fmtINR, fmtDate, plural, maskPhone, channelLabel } from './money';
import { badgesFor } from '@/api/transforms/frontDeskTransform'; // CR-385 BUG-447 badgesFor (PAH + advance)

const SortIcon = ({ active, dir }) => (
  <span className="inline-flex flex-col ml-1 align-middle" aria-hidden="true">
    <ChevronUp className={`w-3 h-3 -mb-1 ${active && dir === 'asc' ? 'text-[#F26B33]' : 'text-[#CCC]'}`} />
    <ChevronDown className={`w-3 h-3 ${active && dir === 'desc' ? 'text-[#F26B33]' : 'text-[#CCC]'}`} />
  </span>
);

function ExpansionRow({ colSpan, rowId, testIdPrefix, children }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.scrollIntoView?.({ block: 'nearest' }); }, []);
  return (
    <tr ref={ref} data-testid={`${testIdPrefix}-row-${rowId}-expansion`} className="fd-expansion">
      <td colSpan={colSpan} className="p-0 border-b border-[#E5E5E5] bg-[#FAFAFA]">{children}</td>
    </tr>
  );
}

export const GuestTable = ({ rows, columns, sort, onSort, expandedId, onToggle, renderExpansion, testIdPrefix = 'fd', tab, emptyText = 'Nothing here' }) => {
  const scrollRef = useRef(null);

  const onKeyDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll('tr[data-fd-row]'));
    const idx = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
      items[next]?.focus();
    } else if (e.key === 'Enter' && idx >= 0) {
      e.preventDefault();
      onToggle(items[idx].dataset.fdRow);
    } else if (e.key === 'Escape' && expandedId != null) {
      e.preventDefault();
      onToggle(null);
    }
  };

  return (
    <div ref={scrollRef} className="fd-table-scroll rounded-xl border border-[#E5E5E5] bg-white" data-testid={`fd-table-${tab}`} onKeyDown={onKeyDown}>
      <table className="w-full text-[13px] text-[#1A1A1A] border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} data-testid={`fd-th-${c.key}`} scope="col"
                className={`fd-sticky-th text-left text-[11px] font-semibold uppercase tracking-wide text-[#767676] px-3 py-2.5 border-b border-[#E5E5E5] ${c.sortable ? 'cursor-pointer select-none hover:text-[#1A1A1A]' : ''} ${c.className ?? ''}`}
                onClick={c.sortable ? () => onSort(c.key) : undefined}
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {c.label}{c.sortable && <SortIcon active={sort?.key === c.key} dir={sort?.dir} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-[#767676]" data-testid={`fd-table-${tab}-empty`}>{emptyText}</td></tr>
          )}
          {rows.map((row) => {
            const open = String(expandedId) === String(row.id);
            return [
              <tr key={row.id} data-fd-row={row.id} data-testid={`${testIdPrefix}-row-${row.id}`} tabIndex={0} role="button"
                aria-expanded={open} className="fd-row" onClick={() => onToggle(String(row.id))}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2.5 border-b border-[#F0F0F0] align-middle ${c.className ?? ''}`}>{c.render(row)}</td>
                ))}
              </tr>,
              open && renderExpansion && (
                <ExpansionRow key={`${row.id}-x`} colSpan={columns.length} rowId={row.id} testIdPrefix={testIdPrefix}>
                  {renderExpansion(row)}
                </ExpansionRow>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Common 9 cells (F3): Guest · Phone · Channel/badge · Dates · Nights/Pax · Room · ₹ · Status · Actions ──
const BADGE = {
  prepaid: { text: 'Prepaid', bg: '#D1FAE5', color: '#065F46' },
  pah:     { text: 'Pay at hotel', bg: '#FEF3C7', color: '#92400E' },
  advance: { text: 'Advance', bg: '#DBEAFE', color: '#1E40AF' },
};
export const Badge = ({ badge, rowId, inHouse, testId }) => {
  if (!badge) return null;
  const b = BADGE[badge.kind];
  const text = badge.kind === 'advance' ? `${inHouse ? 'Paid so far' : 'Advance'} ${fmtINR(badge.amount)}` : b.text;
  return <span data-testid={testId ?? `fd-row-${rowId}-badge`} className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide" style={{ background: b.bg, color: b.color }}>{text}</span>;
};

const STATUS = {
  pending:   { text: 'Pending',    bg: '#FEF3C7', color: '#92400E' },
  in_house:  { text: 'In-House',   bg: '#D1FAE5', color: '#065F46' },
  departed:  { text: 'Departed',   bg: '#F3F4F6', color: '#374151' },
  late:      { text: 'Late',       bg: '#FEE2E2', color: '#991B1B' },
  overdue:   { text: 'Overdue',    bg: '#FEE2E2', color: '#991B1B' },
  cleared:   { text: 'Cleared',    bg: '#D1FAE5', color: '#065F46' },
};
export const StatusPill = ({ kind, rowId, suffix }) => {
  const s = STATUS[kind] ?? STATUS.pending;
  return <span data-testid={`fd-row-${rowId}-status`} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>{s.text}{suffix ? ` ${suffix}` : ''}</span>;
};

export const commonColumns = ({ amountKey, amountLabel, statusOf, actions, badgeInHouse = false, amountOf, amountTitle }) => [ // CR-385 M5 amountOf/amountTitle (balances)
  { key: 'guest', label: 'Guest', sortable: true, render: (r) => (
    <div><div className="font-medium">{r.guestName}</div><div className="text-[11px] text-[#767676]">{r.bookingId ?? '—'}{r.specialRequests ? ' · SR ●' : ''}</div></div>) },
  { key: 'phone', label: 'Phone', render: (r) => <span className="text-[#767676]">{maskPhone(r.phone)}</span> },
  { key: 'channel', label: 'Source', render: (r) => <span>{channelLabel(r.channel)}{badgesFor(r).map((bd, i) => <Badge key={bd.kind} badge={bd} rowId={r.id} inHouse={badgeInHouse} testId={i === 0 ? `fd-row-${r.id}-badge` : `fd-row-${r.id}-badge-${bd.kind}`} />)}</span> }, // CR-385 BUG-447: PAH + advance both
  { key: 'checkin', label: 'Check-in', sortable: true, render: (r) => fmtDate(r.checkin) },
  { key: 'checkout', label: 'Check-out', sortable: true, render: (r) => fmtDate(r.checkout) },
  { key: 'pax', label: 'Nights · Guests', render: (r) => `${plural(r.nights ?? 0, 'night')} · ${r.adults ?? 0}A${r.children ? ` ${r.children}C` : ''}` },
  { key: 'room', label: 'Room', sortable: true, render: (r) => <span className="font-medium">{r.roomNo ?? '—'}{r.roomType ? <span className="text-[11px] text-[#767676] font-normal"> · {r.roomType}</span> : null}</span> },
  { key: 'amount', label: amountLabel, sortable: true, className: 'text-right', render: (r) => { const v = amountOf ? amountOf(r) : r.charge?.[amountKey]; return <span data-testid={`fd-row-${r.id}-balance`} title={amountTitle?.(r) ?? undefined} className="font-semibold tabular-nums">{v === undefined ? <span className="text-[#767676]" data-testid={`fd-row-${r.id}-balance-loading`}>…</span> : fmtINR(v)}</span>; } }, // CR-385 M5 BUG-433
  { key: 'status', label: 'Status', render: (r) => statusOf(r) },
  { key: 'actions', label: '', className: 'text-right whitespace-nowrap', render: (r) => actions(r) },
];

export const sortRows = (rows, sort) => {
  if (!sort?.key) return rows;
  const val = (r) => {
    switch (sort.key) {
      case 'guest': return r.guestName ?? '';
      case 'room': return r.roomNo ?? '';
      case 'amount': return Number(r.charge?.balance_due ?? r.charge?.total_with_gst ?? 0);
      default: return r[sort.key] ?? '';
    }
  };
  const dir = sort.dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = val(a), y = val(b);
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
    return String(x).localeCompare(String(y), undefined, { numeric: true }) * dir;
  });
};

export const toggleSort = (sort, key) => (sort?.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });

// Phase-gated action button (disabled with tooltip until its phase lands)
export const PhaseButton = ({ testId, label, phase, danger, onClick, title }) => ( // CR-385 M3 E18: title override (early check-in tooltip, N7/D53)
  <button type="button" data-testid={testId} disabled={!onClick} title={title ?? (onClick ? undefined : `Available in Phase ${phase}`)}
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    className={`fd-btn ml-1.5 px-2.5 h-7 rounded-md text-[12px] font-semibold border ${danger ? 'border-[#FECACA] text-[#B91C1C]' : 'border-[#E5E5E5] text-[#1A1A1A]'} disabled:opacity-40 disabled:cursor-not-allowed`}>
    {label}
  </button>
);

// P0 expansion body: facts + phase-gated actions
export const RowExpansionStub = ({ row, onClose, actions }) => (
  <div className="px-5 py-4" data-testid={`fd-row-${row.id}-detail`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[14px] font-semibold">{row.guestName} <span className="text-[#767676] font-normal">· {row.bookingId}</span></div>
        <div className="text-[12px] text-[#767676] mt-1">
          {channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · Room {row.roomNo ?? '—'}{row.roomType ? ` (${row.roomType})` : ''}
          {row.phone ? ` · ${maskPhone(row.phone)}` : ''}{row.email ? ` · ${row.email}` : ''}
        </div>
        {row.specialRequests && <div className="text-[12px] mt-1"><span className="text-[#767676]">Special requests:</span> {row.specialRequests}</div>}
        <div className="grid grid-cols-4 gap-x-6 gap-y-1 mt-3 text-[12px]">
          <span className="text-[#767676]">Booking (incl. GST)</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-total`}>{fmtINR(row.charge?.total_with_gst)}</span>
          <span className="text-[#767676]">Paid so far</span><span className="tabular-nums" data-testid={`fd-row-${row.id}-paid`}>{fmtINR(row.charge?.advance_payment)}</span>
          <span className="text-[#767676]">SGST</span><span className="tabular-nums">{fmtINR(row.charge?.sgst)}</span>
          <span className="text-[#767676]">CGST</span><span className="tabular-nums">{fmtINR(row.charge?.cgst)}</span>
          <span className="text-[#767676]">Balance due</span><span className="font-semibold tabular-nums" data-testid={`fd-row-${row.id}-due`}>{fmtINR(row.charge?.balance_due)}</span>
        </div>
      </div>
      <button type="button" data-testid={`fd-row-${row.id}-close`} onClick={(e) => { e.stopPropagation(); onClose(); }} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
    </div>
    <div className="mt-3 flex justify-end">{actions}</div>
  </div>
);

export default GuestTable;
