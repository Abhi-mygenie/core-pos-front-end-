// CR-385 M4 — per-night lines from server charge.nights_detail[] (BQ-385-19). Labels come ONLY from `source`; never sums gst (D50).
import { fmtINR, fmtDate, plural } from './money';

export const SOURCE_LABEL = { held: 'held rate', calendar: 'rate table', held_fallback: 'held (no rate for this date)' };
const CHIP = { held: 'bg-[#EEF2FF] text-[#3730A3]', calendar: 'bg-[#ECFDF5] text-[#065F46]', held_fallback: 'bg-[#FEF3C7] text-[#92400E]' };

export const NightsLines = ({ charge, testId = 'nights-lines' }) => {
  const lines = charge?.nights_detail;
  if (!Array.isArray(lines) || lines.length === 0) {
    return <div className="text-[12px] text-[#767676]" data-testid={testId} data-variant="avg"><span data-testid={`${testId}-avg`}>{plural(charge?.nights ?? 0, 'night')} · avg. rate / night {fmtINR(charge?.rate_per_night)}</span></div>; // QA it.19 N: container testid on both branches
  }
  return (
    <ul className="text-[12px] divide-y divide-[#F0F0F0]" data-testid={testId}>
      {lines.map((n, i) => (
        <li key={`${n.date}-${i}`} className="flex items-center justify-between py-1 gap-2" data-testid={`${testId}-${n.date}`}>
          <span className="text-[#1A1A1A]">{fmtDate(n.date)}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CHIP[n.source] ?? 'bg-[#F3F4F6] text-[#374151]'}`} data-testid={`${testId}-${n.date}-source`}>{SOURCE_LABEL[n.source] ?? n.source ?? '—'}</span>
          <span className="text-[#767676]">GST {n.gst_percent ?? '—'}%</span>
          <span className="font-semibold tabular-nums" data-testid={`${testId}-${n.date}-rate`}>{fmtINR(n.rate)}</span>
        </li>
      ))}
    </ul>
  );
};

export default NightsLines;
