// CR-385 M2 (OD-385-16 a) — Modify Booking, expand-in-place. Server-priced: the form sends the INTENT only
// ({checkin, checkout, rateplan_code?, reason}); preview:true = dry run (side-effect free, M2-04 probe 2026-09-20) →
// "Current → New" from the returned charge{}. Confirm = same body without preview. NEVER amount_after_tax (G-02).
// Money: charge.* only (D50). Dates: min = meta.business_date (X-06). Guard checkout > checkin (AC-11).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getRatesData } from '@/api/services/pmsService';
import { modifyReservation, previewModifyReservation } from '@/api/services/frontDeskService';
import { fmtINR, fmtDate, plural } from './money';

export const PREVIEW_DEBOUNCE_MS = 500;

export const buildModifyBody = ({ row, checkin, checkout, rateplanCode, reason }) => {
  const body = { checkin, checkout, reason: reason?.trim() || 'Modified from Front Desk' };
  if (rateplanCode && rateplanCode !== row.rateplanCode) body.rateplan_code = rateplanCode;
  return body;
};

const chargeOf = (res) => res?.data?.reservation?.charge ?? res?.reservation?.charge ?? null;
const errText = (e, fallback) => e?.response?.data?.message ?? e?.message ?? fallback;

export const ModifyBookingForm = ({ row, meta, onDone, onClose }) => {
  const bd = meta?.business_date;
  const [checkin, setCheckin] = useState(row.checkin ?? '');
  const [checkout, setCheckout] = useState(row.checkout ?? '');
  const [rateplanCode, setRateplanCode] = useState(row.rateplanCode ?? '');
  const [reason, setReason] = useState('');
  const [plans, setPlans] = useState([]);
  const [preview, setPreview] = useState({ charge: null, loading: false, error: null });
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const pendingRef = useRef(null); // latest body requested while a preview was in flight

  const datesValid = Boolean(checkin && checkout && checkout > checkin);
  const body = useMemo(() => buildModifyBody({ row, checkin, checkout, rateplanCode, reason }), [row, checkin, checkout, rateplanCode, reason]);
  const changed = checkin !== row.checkin || checkout !== row.checkout || Boolean(body.rateplan_code);

  useEffect(() => {
    if (!datesValid) return;
    getRatesData({ startDate: checkin, endDate: checkout })
      .then((d) => setPlans((d?.rateplans ?? []).filter((p) => !row.roomType || p.roomCode === row.roomType)))
      .catch(() => setPlans([]));
  }, [checkin, checkout, datesValid, row.roomType]);

  useEffect(() => { // debounced, serialised preview — never two in flight
    if (!datesValid || !changed) { setPreview({ charge: null, loading: false, error: null }); return undefined; }
    const run = async (b) => {
      inFlight.current = true;
      setPreview((p) => ({ ...p, loading: true, error: null }));
      try { const res = await previewModifyReservation(row.id, b); setPreview({ charge: chargeOf(res), loading: false, error: null }); }
      catch (e) { setPreview({ charge: null, loading: false, error: errText(e, 'Preview failed') }); }
      finally {
        inFlight.current = false;
        if (pendingRef.current) { const next = pendingRef.current; pendingRef.current = null; run(next); }
      }
    };
    const t = setTimeout(() => { if (inFlight.current) pendingRef.current = body; else run(body); }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [body, datesValid, changed, row.id]);

  const confirm = async () => {
    if (!datesValid || !changed) return;
    setBusy(true);
    try {
      await modifyReservation(row.id, body);
      onDone('Booking updated');
    } catch (e) {
      toast.error(errText(e, 'Modification failed'));
    } finally { setBusy(false); }
  };

  const cur = row.charge ?? {};
  const nw = preview.charge;
  const delta = nw ? Number(nw.total_with_gst ?? 0) - Number(cur.total_with_gst ?? 0) : null;
  const stop = (e) => e.stopPropagation();

  return (
    <div className="px-5 py-4" data-testid={`fd-row-${row.id}-modify`} onClick={stop} onKeyDown={stop}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[14px] font-semibold">Modify booking <span className="text-[#767676] font-normal">· {row.guestName} · {row.bookingId}</span></div>
          <div className="text-[12px] text-[#767676] mt-0.5">Current: {fmtDate(row.checkin)} → {fmtDate(row.checkout)} · {plural(row.nights ?? 0, 'night')} · {row.roomType ?? '—'}</div>
        </div>
        <button type="button" data-testid={`fd-row-${row.id}-modify-close`} onClick={onClose} className="fd-btn text-[12px] text-[#767676] hover:text-[#1A1A1A]">✕ Close</button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-in</span>
              <input type="date" value={checkin} min={bd || undefined} onChange={(e) => setCheckin(e.target.value)} disabled={busy}
                className="w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px]" data-testid="modify-checkin" />
            </label>
            <label className="block">
              <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-out</span>
              <input type="date" value={checkout} min={checkin || bd || undefined} onChange={(e) => setCheckout(e.target.value)} disabled={busy}
                className="w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px]" data-testid="modify-checkout" />
            </label>
          </div>
          {!datesValid && checkin && checkout && <div className="text-[12px] text-[#B91C1C]" role="alert" data-testid="modify-dates-error">Check-out must be after check-in.</div>}
          <label className="block">
            <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Rate plan</span>
            <select value={rateplanCode} onChange={(e) => setRateplanCode(e.target.value)} disabled={busy}
              className="w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px] bg-white" data-testid="modify-rateplan">
              {row.rateplanCode && !plans.some((p) => p.rateplanCode === row.rateplanCode) && <option value={row.rateplanCode}>{row.rateplanCode} (current)</option>}
              {plans.map((p) => <option key={p.rateplanCode} value={p.rateplanCode}>{p.rateplanCode}{p.rateplanCode === row.rateplanCode ? ' (current)' : ''}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Reason</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Guest extended trip" disabled={busy}
              className="w-full border border-[#E5E5E5] rounded-md px-3 h-9 text-[13px]" data-testid="modify-reason" />
          </label>
        </div>

        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 text-[12px]" data-testid="modify-preview">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-[#1A1A1A]">Current → New</span>
            {preview.loading && <span className="inline-flex items-center gap-1 text-[#767676]" data-testid="modify-preview-loading"><Loader2 className="w-3 h-3 animate-spin" /> pricing on server…</span>}
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 tabular-nums">
            <span className="text-[#767676]">Nights</span><span>{cur.nights ?? '—'}</span><span className="font-semibold" data-testid="modify-preview-nights">{nw ? nw.nights : '—'}</span>
            <span className="text-[#767676]">Booking charge</span><span>{fmtINR(cur.booking_charge)}</span><span className="font-semibold">{nw ? fmtINR(nw.booking_charge) : '—'}</span>
            <span className="text-[#767676]">SGST</span><span>{fmtINR(cur.sgst)}</span><span>{nw ? fmtINR(nw.sgst) : '—'}</span>
            <span className="text-[#767676]">CGST</span><span>{fmtINR(cur.cgst)}</span><span>{nw ? fmtINR(nw.cgst) : '—'}</span>
            <span className="text-[#767676]">Total (incl. GST)</span><span data-testid="modify-current-total">{fmtINR(cur.total_with_gst)}</span><span className="font-semibold" data-testid="modify-preview-total">{nw ? fmtINR(nw.total_with_gst) : '—'}</span>
            <span className="text-[#767676]">Balance due</span><span>{fmtINR(cur.balance_due)}</span><span className="font-semibold">{nw ? fmtINR(nw.balance_due) : '—'}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#E5E5E5] flex justify-between">
            <span className="text-[#767676]">Change vs current</span>
            <span className={`font-semibold tabular-nums ${delta > 0 ? 'text-[#B91C1C]' : delta < 0 ? 'text-[#329937]' : ''}`} data-testid="modify-preview-delta">
              {delta == null ? '—' : delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}${fmtINR(Math.abs(delta))}`}
            </span>
          </div>
          {preview.error && <div className="mt-2 text-[#B91C1C]" role="alert" data-testid="modify-preview-error">{preview.error}</div>}
          <div className="mt-2 text-[11px] text-[#767676]">Figures come from the server preview; nothing is saved until you confirm.</div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={busy} data-testid="modify-cancel-btn"
          className="px-4 h-9 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">Keep as is</button>
        <button type="button" onClick={confirm} disabled={busy || !datesValid || !changed || preview.loading || !nw} data-testid="modify-booking-confirm-btn"
          className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Confirm changes
        </button>
      </div>
    </div>
  );
};

export default ModifyBookingForm;
