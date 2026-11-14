// CR-385 M0 — alert bar (F7, D37 priority): overdue departures → HK > 2 h → OOO ≥ 1 d → expired arrivals. Max 3 + "+N" popover. Click → tab + chip + row. No dismiss. Dates vs meta.business_date / board server_time only.
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { dayDiff, nsOrCancel, roomChipKey } from '@/api/transforms/frontDeskTransform';
import { fmtDate } from './money';

// naive timestamps (server local) → ms; offset stripped so both sides use the same clock
const naiveMs = (ts) => (ts ? Date.parse(String(ts).replace(' ', 'T').slice(0, 19)) : NaN);

export const deriveAlerts = ({ reservations = [], rooms = [], meta, boardMeta }) => {
  const bd = meta?.business_date;
  const nowMs = naiveMs(boardMeta?.server_time ?? meta?.server_time);
  const out = [];
  if (!bd) return out;
  reservations.filter((r) => r.operationalStatus === 'in_house' && r.checkout < bd)
    .sort((a, b) => a.checkout.localeCompare(b.checkout))
    .forEach((r) => out.push({ key: `overdue-${r.id}`, cat: 'overdue', urgent: true, text: `Overdue check-out · ${r.guestName} · Room ${r.roomNo ?? '—'} · ${dayDiff(r.checkout, bd)} d`, go: { tab: 'departures', chip: 'overdue', rowId: String(r.id) } }));
  rooms.filter((rm) => roomChipKey(rm) === 'hk' && rm.statusSince && Number.isFinite(nowMs) && nowMs - naiveMs(rm.statusSince) > 2 * 3600000)
    .sort((a, b) => naiveMs(a.statusSince) - naiveMs(b.statusSince))
    .forEach((rm) => out.push({ key: `hk-${rm.id}`, cat: 'housekeeping', urgent: true, text: `Housekeeping > ${Math.floor((nowMs - naiveMs(rm.statusSince)) / 3600000)} h · Room ${rm.tableNo}${rm.hkAssignee ? ` · ${rm.hkAssignee}` : ''}`, go: { tab: 'rooms', chip: 'hk', roomId: String(rm.id) } }));
  rooms.filter((rm) => rm.displayStatus === 'ooo' && rm.statusSince && dayDiff(rm.statusSince.slice(0, 10), bd) >= 1)
    .forEach((rm) => out.push({ key: `ooo-${rm.id}`, cat: 'out of order', text: `Out of order ${dayDiff(rm.statusSince.slice(0, 10), bd)} d · Room ${rm.tableNo}`, go: { tab: 'rooms', chip: 'ooo', roomId: String(rm.id) } }));
  reservations.filter((r) => r.operationalStatus === 'pending' && r.checkin < bd)
    .sort((a, b) => a.checkin.localeCompare(b.checkin))
    .forEach((r) => out.push({ key: `late-${r.id}`, cat: 'no-show', text: `Stay expired · ${r.guestName} · arrived ${fmtDate(r.checkin)}`, go: { tab: 'arrivals', chip: 'late', rowId: String(r.id), kind: nsOrCancel(r) } }));
  return out;
};

export const AlertBar = ({ snapshot, onNavigate }) => {
  const alerts = useMemo(() => deriveAlerts(snapshot ?? {}), [snapshot]);
  const [open, setOpen] = useState(false);
  if (alerts.length === 0) return null;
  const head = alerts.slice(0, 3);
  const rest = alerts.length - head.length;
  const Item = ({ a, i }) => (
    <button type="button" data-testid={`fd-alert-item-${i}`} onClick={() => { setOpen(false); onNavigate(a.go); }}
      className={`fd-btn text-left text-[12px] px-2.5 h-7 rounded-md border hover:bg-white ${a.urgent ? 'border-[#FECACA] text-[#991B1B]' : 'border-[#FDE68A] text-[#92400E]'}`}>
      {a.text}
    </button>
  );
  return (
    <div className="relative flex items-center gap-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-3 py-2" data-testid="fd-alert-bar" role="region" aria-label="Alerts">
      <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
      <div className="flex items-center gap-2 flex-wrap">{head.map((a, i) => <Item key={a.key} a={a} i={i} />)}</div>
      {rest > 0 && (
        <button type="button" data-testid="fd-alert-more" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="fd-btn ml-auto text-[12px] font-semibold text-[#92400E] hover:underline">+{rest} more</button>
      )}
      {open && (
        <div data-testid="fd-alert-popover" className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#E5E5E5] rounded-xl shadow-lg p-2 w-[420px] max-h-[320px] overflow-auto">
          {alerts.map((a, i) => (
            <div key={a.key} className="flex items-center gap-2 py-1">
              <span className="text-[10px] uppercase font-semibold text-[#767676] w-24 shrink-0">{a.cat}</span>
              <Item a={a} i={`p-${i}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertBar;
