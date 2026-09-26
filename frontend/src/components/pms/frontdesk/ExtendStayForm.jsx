// CR-385 M4 — Extend Stay, expand-in-place on In-House / Departures rows (D39, OD-385-16 a, OD-385-18 a no Split).
// Money: RIGHT shows row.charge (pending) → after 200 the response charge + NightsLines → onDone refetches LR and the row re-renders from LR (D55).
// 409 "Room conflict for new checkout." → server text verbatim + free same-type rooms from room-availability (window = check-in → new check-out) → new_restaurant_table_id required (D7/D12).
// Body via frontDeskService.buildExtendBody — never new_room_price. Collect-now above payable = soft hint, server verdict verbatim (Q3 a).
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { extendStay, getAvailability } from '@/api/services/frontDeskService';
import { plusDays, dayDiff } from '@/api/transforms/frontDeskTransform';
import { fmtINR, fmtDate, plural } from './money';
import NightsLines from './NightsLines';

const METHODS = [['cash', 'Cash'], ['card', 'Card'], ['upi', 'UPI']];
const inputCls = 'w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px] bg-white disabled:bg-[#F7F7F7]';
const Label = ({ children }) => <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">{children}</span>;
const errText = (e, fallback) => e?.response?.data?.message ?? e?.message ?? fallback;
export const isConflict = (e) => e?.response?.status === 409;

export const ExtendStayForm = ({ row, meta, onDone, onClose }) => {
  const bd = meta?.business_date;
  const minDate = row.checkin ? plusDays(row.checkin, 1) : undefined;
  const [checkout, setCheckout] = useState(row.checkout ?? '');
  const [reason, setReason] = useState('');
  const [discOpen, setDiscOpen] = useState(false);
  const [discount, setDiscount] = useState({ type: 'percent', value: '', reason: '' });
  const [payOpen, setPayOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', reference: '' });
  const [conflict, setConflict] = useState(null); // { message, rooms: [] }
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const inFlight = useRef(false);

  const c = row.charge ?? {};
  const changed = Boolean(checkout && checkout !== row.checkout && checkout >= (minDate ?? ''));
  const shorten = changed && checkout < row.checkout;
  const delta = changed ? dayDiff(row.checkout, checkout) : 0; // + = added nights, − = removed
  const payAmt = Number(payment.amount || 0);
  const payNeedsRef = payAmt > 0 && payment.method !== 'cash' && !payment.reference.trim();
  const discVal = Number(discount.value || 0);
  const missing = [!changed && 'new check-out date', !reason.trim() && 'reason', payNeedsRef && 'payment reference', discVal > 0 && !discount.reason.trim() && 'discount reason', conflict && !moveTo && 'room to move to'].filter(Boolean);
  const ready = missing.length === 0;

  useEffect(() => { setConflict(null); setMoveTo(''); }, [checkout]); // a new date invalidates the offered rooms

  const submit = async () => {
    if (!ready || busy || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(null);
    try {
      const res = await extendStay({ orderId: row.orderId, newCheckoutDate: checkout, reason, payment: payAmt > 0 ? payment : null, discount: discVal > 0 ? discount : null, newRestaurantTableId: moveTo || null });
      setResult(res?.data ?? res);
    } catch (e) {
      if (isConflict(e)) {
        let rooms = [];
        try { const a = await getAvailability({ checkin: row.checkin, checkout }); rooms = (a?.rooms ?? []).filter((r) => r.available && r.aiosell_room_code === row.roomType && String(r.restaurant_table_id) !== String(row.tableId)); } catch { rooms = []; }
        setConflict({ message: errText(e, 'Room conflict for new checkout.'), rooms });
      } else setError(errText(e, 'Extend failed'));
    } finally { setBusy(false); inFlight.current = false; }
  };

  const stop = (e) => e.stopPropagation();
  const rc = result?.charge ?? null;

  return (
    <div className="px-5 py-4" data-testid="extend-form" onClick={stop} onKeyDown={stop}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold">{shorten ? 'Shorten stay' : 'Extend stay'} <span className="text-[#767676] font-normal">· {row.guestName} · Room {row.roomNo ?? '—'}</span></div>
          <div className="text-[12px] text-[#767676] mt-0.5" data-testid="extend-facts-stay">{fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · {row.roomType ?? '—'} · business date {fmtDate(bd)}</div>
        </div>
        <button type="button" data-testid={`fd-row-${row.id}-extend-close`} onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>

      {result ? (
        <div data-testid="extend-result" className="grid grid-cols-[1.2fr_1fr] gap-6">
          <div>
            <div className="text-[13px] font-semibold text-[#329937] mb-2">{shorten ? 'Stay shortened' : 'Stay extended'} · new check-out {fmtDate(result.new_checkout_date ?? checkout)}{result.new_restaurant_table_id ? ` · moved to room #${result.new_restaurant_table_id}` : ''}</div>
            <NightsLines charge={rc} testId="extend-nights" />
            {result.inventory_push_warning && <div className="mt-2 text-[11px] text-[#92400E]" data-testid="extend-inventory-warning">{result.inventory_push_warning}</div>}
          </div>
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] grid grid-cols-2 gap-y-1 tabular-nums self-start">
            <span className="text-[#767676]">Booking charge</span><span className="text-right" data-testid="extend-bill-charge">{fmtINR(rc?.booking_charge)}</span>
            <span className="text-[#767676]">SGST</span><span className="text-right" data-testid="extend-bill-sgst">{fmtINR(rc?.sgst)}</span>
            <span className="text-[#767676]">CGST</span><span className="text-right" data-testid="extend-bill-cgst">{fmtINR(rc?.cgst)}</span>
            <span className="text-[#767676] font-semibold">Total (incl. GST)</span><span className="text-right font-semibold" data-testid="extend-bill-total">{fmtINR(rc?.total_with_gst)}</span>
            <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-bill-paid">{fmtINR(rc?.advance_payment)}</span>
            <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-bill-balance">{fmtINR(rc?.balance_due)}</span>
            <div className="col-span-2 mt-3 flex justify-end"><button type="button" data-testid="extend-done-btn" onClick={() => onDone(`${shorten ? 'Stay shortened' : 'Stay extended'} — Room ${row.roomNo ?? ''} to ${fmtDate(result.new_checkout_date ?? checkout)}`)} className="px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d]">Done</button></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1.2fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><Label>New check-out</Label><input type="date" value={checkout} min={minDate} onChange={(e) => setCheckout(e.target.value)} className={inputCls} data-testid="extend-checkout" disabled={busy} /></label>
              <label className="block"><Label>Reason</Label><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} data-testid="extend-reason" disabled={busy} /></label>
            </div>
            {changed && <div className="text-[12px]" data-testid="extend-delta">{shorten ? `Shorten to ${fmtDate(checkout)} (−${plural(-delta, 'night')})` : `Extend to ${fmtDate(checkout)} (+${plural(delta, 'night')})`}</div>}
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-discount-toggle" onClick={() => setDiscOpen((v) => !v)} className="fd-btn text-[12px] font-semibold flex items-center gap-2"><span className={`inline-block w-4 h-4 rounded border ${discOpen ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCC]'}`} aria-hidden /> Discount <span className="text-[#767676] font-normal">· optional</span></button>
              {discOpen && <div className="mt-3 grid grid-cols-[auto_1fr_1.5fr] gap-3 items-end" data-testid="extend-discount">
                <div className="flex gap-1.5">{[['percent', '%'], ['amount', '₹']].map(([k, l]) => <button key={k} type="button" data-testid={`extend-discount-${k}`} aria-pressed={discount.type === k} onClick={() => setDiscount((d) => ({ ...d, type: k }))} className={`fd-btn px-3 h-9 rounded-md text-[12px] font-semibold border ${discount.type === k ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>{l}</button>)}</div>
                <label className="block"><Label>Value</Label><input type="number" min={0} value={discount.value} onChange={(e) => setDiscount((d) => ({ ...d, value: e.target.value }))} className={inputCls} data-testid="extend-discount-value" disabled={busy} /></label>
                <label className="block"><Label>Reason · required</Label><input value={discount.reason} onChange={(e) => setDiscount((d) => ({ ...d, reason: e.target.value }))} className={inputCls} data-testid="extend-discount-reason" disabled={busy} /></label>
              </div>}
            </div>
            <div className="border border-[#E5E5E5] rounded-lg p-3">
              <button type="button" data-testid="extend-collect-toggle" onClick={() => setPayOpen((v) => !v)} className="fd-btn text-[12px] font-semibold flex items-center gap-2"><span className={`inline-block w-4 h-4 rounded border ${payOpen ? 'bg-[#1A1A1A] border-[#1A1A1A]' : 'border-[#CCC]'}`} aria-hidden /> Collect now <span className="text-[#767676] font-normal">· optional</span></button>
              {payOpen && <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-end" data-testid="extend-collect">
                <label className="block"><Label>Amount</Label><input type="number" min={0} value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} className={inputCls} data-testid="extend-collect-amount" disabled={busy} /></label>
                <div className="flex gap-1.5">{METHODS.map(([k, l]) => <button key={k} type="button" data-testid={`extend-pay-${k}`} aria-pressed={payment.method === k} onClick={() => setPayment((p) => ({ ...p, method: k }))} className={`fd-btn px-3 h-9 rounded-md text-[12px] font-semibold border ${payment.method === k ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>{l}</button>)}</div>
                <label className="block"><Label>{payment.method === 'upi' ? 'UTR' : payment.method === 'card' ? 'Txn ID' : 'Reference'}{payment.method !== 'cash' && ' · required'}</Label><input value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} className={inputCls} data-testid="extend-pay-ref" disabled={busy} /></label>
                {payAmt > Number(c.balance_due ?? 0) && <div className="col-span-3 text-[11px] text-[#92400E]" data-testid="extend-collect-hint">Above the current balance ({fmtINR(c.balance_due)}). The server decides after pricing the change — its message is shown if it rejects.</div>}
              </div>}
            </div>
            {conflict && (
              <div className="border border-[#FDE68A] bg-[#FEF3C7] rounded-lg p-3 text-[12px]" role="alert" data-testid="extend-conflict">
                <div className="font-semibold text-[#92400E]" data-testid="extend-conflict-message">{conflict.message}</div>
                <div className="mt-1 text-[#92400E]">Room {row.roomNo} is taken on the new dates. Move the guest to a free {row.roomType} room and confirm again (housekeeping is requested on the old room automatically).</div>
                {conflict.rooms.length ? <div className="mt-2 flex flex-wrap gap-2">{conflict.rooms.map((r) => <button key={r.restaurant_table_id} type="button" data-testid={`extend-move-room-${r.restaurant_table_id}`} aria-pressed={String(moveTo) === String(r.restaurant_table_id)} onClick={() => setMoveTo(String(r.restaurant_table_id))} className={`fd-btn px-3 h-8 rounded-md text-[12px] font-semibold border bg-white ${String(moveTo) === String(r.restaurant_table_id) ? 'ring-2 ring-[#1A1A1A] border-transparent' : 'border-[#E5E5E5]'}`}>{r.table_no}{r.title ? ` · ${r.title}` : ''}</button>)}</div>
                  : <div className="mt-2 text-[#92400E]" data-testid="extend-conflict-none">No free {row.roomType} room for these dates — pick another date.</div>}
              </div>
            )}
          </div>
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px] flex flex-col" data-testid="extend-bill">
            <div className="font-semibold text-[#1A1A1A] mb-2">Current bill · from the ledger</div>
            <div className="grid grid-cols-2 gap-y-1 tabular-nums">
              <span className="text-[#767676]">Total (incl. GST)</span><span className="text-right" data-testid="extend-current-total">{fmtINR(c.total_with_gst)}</span>
              <span className="text-[#767676]">Paid so far</span><span className="text-right" data-testid="extend-current-paid">{fmtINR(c.advance_payment)}</span>
              <span className="text-[#767676] font-semibold">Balance due</span><span className="text-right font-semibold" data-testid="extend-current-balance">{fmtINR(c.balance_due)}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#E5E5E5]"><NightsLines charge={c} testId="extend-current-nights" /></div>
            <div className="mt-3 text-[11px] text-[#767676]" data-testid="extend-pricing-note">{shorten ? 'Removed nights are re-priced by the server on confirm.' : 'Added nights are priced by the server on confirm (rate table or held rate, per the property setting).'}</div>
            <div className="mt-3">{ready ? <span className="inline-block px-2.5 py-1 rounded-full bg-[#D1FAE5] text-[#065F46] text-[11px] font-semibold" data-testid="extend-ready-pill">✓ Ready</span> : <span className="text-[11px] text-[#92400E]" data-testid="extend-missing">Missing: {missing.join(', ')}</span>}</div>
            {error && <div className="mt-3 text-[#B91C1C]" role="alert" data-testid="extend-server-error">{error}</div>}
            <div className="mt-auto pt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} data-testid="extend-cancel-btn" className="px-4 h-9 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">Cancel</button>
              <button type="button" onClick={submit} disabled={!ready || busy} data-testid="extend-confirm-btn" className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{conflict ? 'Move & confirm' : shorten ? `Shorten to ${fmtDate(checkout)}` : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtendStayForm;
