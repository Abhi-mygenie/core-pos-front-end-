// CR-385 M3 — Check-In, expand-in-place on the Arrivals row / booked RoomDetail. Copied from pages/pms/CheckInPage.jsx
// (state L26–57 · GuestDocsSection usage L787–797 · submit L263–345 minus navigate) @ P2 entry 2026-09-22; mirror rule until FU-385-C.
// Money: RIGHT bill = row.charge.* only (D50); the server recomputes on confirm (paid upgrade) and returns data.charge.
// Room chooser: booked-type rooms `available` + `hk` (HK badge + amber note, N9/D52) · "Show higher categories (upgrade)" (D23) ·
// early check-in guard N7/D53 (rules.allowEarlyCheckin vs meta.business_date) · server 422 shown verbatim · no Split (OD-385-18 a).
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import GuestDocsSection from '@/components/pms/GuestDocsSection';
import { checkIn } from '@/api/services/frontDeskService';
import { fmtINR, fmtDate, fmtTime, plural, channelLabel } from './money';

const METHODS = [['Cash', 'Cash'], ['Card', 'Card'], ['UPI', 'UPI']];
const UPGRADE_REASONS = ['Overbooking', 'Loyalty', 'Service recovery', 'Manager discretion'];
const inputCls = 'w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px] bg-white disabled:bg-[#F7F7F7]';
const Label = ({ children }) => <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">{children}</span>;
const errText = (e, fallback) => e?.response?.data?.message ?? e?.message ?? fallback;

export const isEarly = (row, bd) => Boolean(row?.checkin && bd && row.checkin > bd);
export const isHk = (room) => room?.displayStatus === 'hk' || room?.manualStatus === 'hk';
export const eligibleRooms = (rooms, roomType, showUpgrade) =>
  (rooms ?? []).filter((r) => (r.displayStatus === 'available' || r.displayStatus === 'hk') && (showUpgrade ? r.roomType !== roomType : r.roomType === roomType));

export const CheckInForm = ({ row, meta, rooms, rules, onDone, onClose }) => {
  const bd = meta?.business_date;
  const early = isEarly(row, bd);
  const blockedEarly = early && !rules?.allowEarlyCheckin;
  const [tableId, setTableId] = useState(row.tableId ? String(row.tableId) : '');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrade, setUpgrade] = useState({ type: 'paid', amount: '', reason: '' });
  const [idType, setIdType] = useState('Aadhar card');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [extraAdults, setExtraAdults] = useState(() => Array.from({ length: Math.max(0, (row.adults ?? 1) - 1) }, () => ({ name: '' })));
  const [b2b, setB2b] = useState(false);
  const [firm, setFirm] = useState({ name: '', gst: '' });
  const [collect, setCollect] = useState({ amount: '', method: 'Cash', reference: '' });
  const [autoPrint, setAutoPrint] = useState(Boolean(rules?.autoPrintCheckinReceipt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const sameType = useMemo(() => eligibleRooms(rooms, row.roomType, false), [rooms, row.roomType]);
  const otherType = useMemo(() => (showUpgrade ? eligibleRooms(rooms, row.roomType, true) : []), [rooms, row.roomType, showUpgrade]);
  const room = (rooms ?? []).find((r) => String(r.id) === tableId) ?? null;
  const isUpgrade = Boolean(room && room.roomType !== row.roomType);
  const c = row.charge ?? {};
  const collectAmt = Number(collect.amount || 0);
  const collectNeedsRef = collectAmt > 0 && collect.method !== 'Cash' && !collect.reference.trim();
  const missing = [
    !room && 'room', isUpgrade && upgrade.type === 'paid' && !(Number(upgrade.amount) > 0) && 'upgrade amount', isUpgrade && !upgrade.reason && 'upgrade reason',
    b2b && (!firm.name.trim() || !firm.gst.trim()) && 'GST name / number', collectNeedsRef && 'payment reference', blockedEarly && `arrival date (${fmtDate(row.checkin)})`,
  ].filter(Boolean);
  const ready = missing.length === 0;

  const confirm = async () => {
    if (!ready || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await checkIn({
        bookingType: row.isOta ? 'Online' : 'Direct', bookingId: row.bookingId, reservationId: row.id, name: row.guestName, phone: row.phone ?? '', email: row.email ?? '',
        restaurantTableId: room.id, idType, frontImage, backImage, adults: row.adults ?? 1, children: row.children ?? 0, extraAdults, checkin: row.checkin, checkout: row.checkout,
        collectNow: collectAmt, paymentMethod: collect.method, note: collect.reference.trim() ? `${collect.method} ref ${collect.reference.trim()}` : '',
        firmName: b2b ? firm.name.trim() : '', firmGst: b2b ? firm.gst.trim() : '',
        upgradeType: isUpgrade ? upgrade.type : 'none', upgradeAmount: upgrade.amount, upgradeReason: upgrade.reason,
      });
      const roomNo = room.tableNo ?? res?.data?.orders?.[0]?.room_no ?? '';
      onDone(`Checked in — Room ${roomNo}${autoPrint ? ' · receipt print requested' : ''}`, res?.data);
    } catch (e) { setError(errText(e, 'Check-in failed')); }
    finally { setBusy(false); }
  };

  const stop = (e) => e.stopPropagation();
  const RoomOption = ({ r }) => <option value={String(r.id)}>{r.tableNo}{r.title ? ` · ${r.title}` : ''} · {r.roomType}{isHk(r) ? ' · HK' : ''}{r.roomType !== row.roomType ? ' · upgrade' : ''}</option>;

  return (
    <div className="px-5 py-4" data-testid="checkin-form" onClick={stop} onKeyDown={stop}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold">Check in <span className="text-[#767676] font-normal">· {row.guestName} · {row.bookingId}</span></div>
          <div className="text-[12px] text-[#767676] mt-0.5" data-testid="checkin-facts-stay">{channelLabel(row.channel)} · {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · {row.adults ?? 0}A{row.children ? ` ${row.children}C` : ''} · {row.roomType ?? '—'}{row.phone ? ` · ${row.phone}` : ''}</div>
        </div>
        <button type="button" data-testid={`fd-row-${row.id}-checkin-close`} onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>
      {blockedEarly && <div className="mb-3 text-[12px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-md px-3 py-2" role="alert" data-testid="checkin-early-tooltip">Arrives {fmtDate(row.checkin)} — modify the booking dates to check in today. (Early check-in is off for this property.)</div>}

      <div className="grid grid-cols-[1.3fr_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <Label>Room · {row.roomType} rooms {showUpgrade ? '+ other categories' : ''}</Label>
            <select value={tableId} onChange={(e) => setTableId(e.target.value)} className={inputCls} data-testid="checkin-room-select" disabled={busy}>
              <option value="">Select a room…</option>
              {sameType.map((r) => <RoomOption key={r.id} r={r} />)}
              {otherType.map((r) => <RoomOption key={r.id} r={r} />)}
            </select>
            <label className="mt-2 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={showUpgrade} onChange={(e) => { setShowUpgrade(e.target.checked); if (!e.target.checked && isUpgrade) setTableId(''); }} data-testid="checkin-upgrade-toggle" disabled={busy} /> Show higher categories (upgrade)</label>
            {room && isHk(room) && <div className="mt-2 text-[12px] text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-md px-3 py-2" data-testid="checkin-room-hk-warning"><span className="font-semibold" data-testid="checkin-room-hk-badge">HK</span>{room.statusSince ? ` · since ${fmtTime(room.statusSince)}` : ''}{room.hkAssignee ? ` · ${room.hkAssignee}` : ''} — Room is still being cleaned. Check-in is allowed.</div>}
            {isUpgrade && (
              <div className="mt-2 border border-[#E5E5E5] rounded-md p-3 space-y-2" data-testid="checkin-upgrade">
                <div className="flex gap-2 text-[12px]">
                  <button type="button" data-testid="checkin-upgrade-paid" aria-pressed={upgrade.type === 'paid'} onClick={() => setUpgrade((u) => ({ ...u, type: 'paid' }))} className={`fd-btn px-3 h-8 rounded-md border font-semibold ${upgrade.type === 'paid' ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>Paid upgrade</button>
                  <button type="button" data-testid="checkin-upgrade-comp" aria-pressed={upgrade.type === 'complimentary'} onClick={() => setUpgrade((u) => ({ ...u, type: 'complimentary' }))} className={`fd-btn px-3 h-8 rounded-md border font-semibold ${upgrade.type === 'complimentary' ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>Complimentary</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {upgrade.type === 'paid' && <label className="block"><Label>Upgrade amount (per stay, pre-GST)</Label><input type="number" min={1} value={upgrade.amount} onChange={(e) => setUpgrade((u) => ({ ...u, amount: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-amount" disabled={busy} /></label>}
                  <label className="block"><Label>Reason</Label>
                    {upgrade.type === 'paid'
                      ? <input value={upgrade.reason} onChange={(e) => setUpgrade((u) => ({ ...u, reason: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-reason" disabled={busy} />
                      : <select value={upgrade.reason} onChange={(e) => setUpgrade((u) => ({ ...u, reason: e.target.value }))} className={inputCls} data-testid="checkin-upgrade-reason" disabled={busy}><option value="">Select…</option>{UPGRADE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>}
                  </label>
                </div>
                <div className="text-[11px] text-[#767676]">The server prices the upgrade and recomputes GST on confirm; a lower category is rejected by the server.</div>
              </div>
            )}
          </div>

          <div data-testid="checkin-id-card-0">
            <GuestDocsSection label="Primary Guest" idType={idType} onIdTypeChange={setIdType} frontImage={frontImage} onFrontChange={setFrontImage} backImage={backImage} onBackChange={setBackImage} inputCls={inputCls} />
          </div>
          {extraAdults.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {extraAdults.map((a, i) => <label key={i} className="block"><Label>Adult {i + 2} name</Label><input value={a.name} onChange={(e) => setExtraAdults((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputCls} data-testid={`checkin-adult-${i + 2}-name`} disabled={busy} /></label>)}
            </div>
          )}
          <div className="border border-[#E5E5E5] rounded-md p-3">
            <label className="flex items-center gap-2 text-[12px] font-semibold"><input type="checkbox" checked={b2b} onChange={(e) => setB2b(e.target.checked)} data-testid="checkin-b2b-toggle" disabled={busy} /> B2B (GST) billing</label>
            {b2b && <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="block"><Label>GST customer name</Label><input value={firm.name} onChange={(e) => setFirm((f) => ({ ...f, name: e.target.value }))} className={inputCls} data-testid="checkin-gst-name" disabled={busy} /></label>
              <label className="block"><Label>GSTIN</Label><input value={firm.gst} onChange={(e) => setFirm((f) => ({ ...f, gst: e.target.value }))} className={inputCls} data-testid="checkin-gst-number" disabled={busy} /></label>
            </div>}
          </div>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] flex flex-col" data-testid="checkin-bill">
          <div className="font-semibold text-[#1A1A1A] mb-2">Room bill · from the booking</div>
          <div className="grid grid-cols-2 gap-y-1 tabular-nums">
            <span className="text-[#767676]">{plural(c.nights ?? row.nights ?? 0, 'night')} · rate / night</span><span className="text-right" data-testid="checkin-bill-rate">{fmtINR(c.rate_per_night)}</span>
            <span className="text-[#767676]">Booking charge</span><span className="text-right">{fmtINR(c.booking_charge)}</span>
            {Number(c.upgrade_amount) > 0 && <><span className="text-[#767676]">Room upgrade</span><span className="text-right" data-testid="checkin-bill-upgrade">{fmtINR(c.upgrade_amount)}</span></>}
            {isUpgrade && upgrade.type === 'paid' && <><span className="text-[#767676]">Room upgrade (on confirm)</span><span className="text-right text-[#767676]" data-testid="checkin-bill-upgrade-pending">{Number(upgrade.amount) > 0 ? `${fmtINR(Number(upgrade.amount))} + GST` : '—'}</span></>}
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="checkin-bill-sgst">{fmtINR(c.sgst)}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="checkin-bill-cgst">{fmtINR(c.cgst)}</span>
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="checkin-bill-total">{fmtINR(c.total_with_gst)}</span>
            <span className="text-[#767676]">Already paid</span><span className="text-right" data-testid="checkin-bill-paid">{fmtINR(c.advance_payment)}</span>
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="checkin-bill-balance">{fmtINR(c.balance_due)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
            <Label>Collect now · optional</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input type="number" min={0} value={collect.amount} onChange={(e) => setCollect((k) => ({ ...k, amount: e.target.value }))} className={inputCls} data-testid="checkin-collect-amount" disabled={busy} />
              <div className="flex gap-1.5">{METHODS.map(([k, l]) => <button key={k} type="button" data-testid={`checkin-pay-${k.toLowerCase()}`} aria-pressed={collect.method === k} onClick={() => setCollect((x) => ({ ...x, method: k }))} disabled={busy} className={`fd-btn px-2.5 h-9 rounded-md text-[12px] font-semibold border ${collect.method === k ? 'bg-white ring-2 ring-[#1A1A1A] border-transparent' : 'bg-white border-[#E5E5E5]'}`}>{l}</button>)}</div>
            </div>
            {collect.method !== 'Cash' && <input placeholder={collect.method === 'UPI' ? 'UTR · required' : 'Txn ID · required'} value={collect.reference} onChange={(e) => setCollect((k) => ({ ...k, reference: e.target.value }))} className={`${inputCls} mt-2`} data-testid="checkin-pay-ref" disabled={busy} />}
            {collectAmt > 0 && <div className="mt-2 text-[11px] text-[#767676]">Collecting <span className="font-semibold tabular-nums" data-testid="checkin-collect-summary">{fmtINR(collectAmt)} · {collect.method}</span> — the server updates “Paid so far” and the balance after confirm.</div>}
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} data-testid="checkin-autoprint" disabled={busy} /> Auto-print check-in receipt <span className="text-[#767676]">· default from Settings: {rules?.autoPrintCheckinReceipt ? 'On' : 'Off'}</span></label>
          <div className="mt-3" data-testid="checkin-progress">
            {ready ? <span className="inline-block px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-[11px] font-semibold" data-testid="checkin-progress-ready">✓ Ready to check in</span>
              : <span className="text-[11px] text-[#92400E]" data-testid="checkin-progress-missing">Missing: {missing.join(', ')}</span>}
          </div>
          {error && <div className="mt-3 text-[#B91C1C]" role="alert" data-testid="checkin-server-error">{error}</div>}
          <div className="mt-auto pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} data-testid="checkin-cancel-btn" className="px-4 h-9 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">Cancel</button>
            <button type="button" onClick={confirm} disabled={!ready || busy} data-testid="checkin-confirm-btn" className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm check-in</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInForm;
