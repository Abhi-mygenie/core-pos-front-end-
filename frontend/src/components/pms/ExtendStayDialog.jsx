// CR-362: Extend an in-house guest's stay. Fetches live rates + shows price breakdown.
import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { extendStay, getRatesData } from '@/api/services/pmsService';
import { toast } from 'sonner';

export default function ExtendStayDialog({ target, onClose, onSuccess }) {
  // target: { orderId, guestName, channel, roomNo, checkout, currentPrice, nights }
  const [newCheckout, setNewCheckout] = useState('');
  const [extRate,     setExtRate]     = useState(null);  // { perNight, extraNights, extensionTotal, newTotal }
  const [loading,     setLoading]     = useState(false);
  const [reason,      setReason]      = useState('');
  const [busy,        setBusy]        = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!target) return;
    setNewCheckout(''); setExtRate(null); setReason('');
  }, [target]);

  useEffect(() => {
    if (!newCheckout || !target?.checkout) { setExtRate(null); return; }
    const extraNights = Math.round((new Date(newCheckout) - new Date(target.checkout)) / 86400000);
    if (extraNights <= 0) { setExtRate(null); return; }
    setLoading(true);
    getRatesData({ startDate: target.checkout, endDate: newCheckout })
      .then(data => {
        // BUG-402: getRatesData returns { dateRateMap, rateplans, dates }.
        // Each rateplan = { roomCode, rateplanCode } — no .rates/.rate property.
        // Must read from dateRateMap[date][rateplanCode].
        const rateplans = data?.rateplans ?? (Array.isArray(data) ? data : []);
        const rp = rateplans[0];
        let perNight = rp
          ? Number(data?.dateRateMap?.[target.checkout]?.[rp.rateplanCode] ?? 0)
          : 0;
        // BUG-402 fallback: if Aiosell has no rate plans (non-CM hotel), derive
        // per-night from original booking total ÷ original nights.
        if (perNight === 0 && target.nights && target.nights > 0) {
          perNight = Math.round(Number(target.currentPrice ?? 0) / target.nights);
        }
        const extensionTotal = perNight * extraNights;
        setExtRate({
          perNight,
          extraNights,
          extensionTotal,
          newTotal: Number(target.currentPrice ?? 0) + extensionTotal, // CR-362: Q1 locked — full new total
        });
      })
      .catch(() => setExtRate(null))
      .finally(() => setLoading(false));
  }, [newCheckout, target]);

  if (!target) return null;

  const minCheckout = target.checkout ?? today;
  const isValid = newCheckout && newCheckout > minCheckout;

  const handleConfirm = async () => {
    if (!isValid) { toast.error('New checkout must be after current checkout'); return; }
    setBusy(true);
    try {
      await extendStay({
        orderId:         target.orderId,
        newCheckoutDate: newCheckout,
        newRoomPrice:    extRate?.newTotal ?? target.currentPrice,
        reason,
      });
      toast.success(`Stay extended to ${newCheckout}.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Extension failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="extend-stay-dialog">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold">Extend Stay</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">{target.guestName} · {target.channel} · {target.roomNo}</p>

        {/* Current checkout */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Current Checkout</label>
          <div className="border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] bg-[#FAFAFA] text-[#888]">{target.checkout ?? '—'}</div>
        </div>

        {/* New checkout */}
        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">New Checkout Date</label>
          <input type="date" value={newCheckout} min={minCheckout}
            onChange={e => setNewCheckout(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="extend-new-checkout"/>
        </div>

        {/* Price breakdown */}
        {isValid && (
          <div className="mb-4">
            {loading && <div className="h-16 bg-[#F3F4F6] rounded animate-pulse"/>}
            {!loading && extRate && (
              <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-lg p-3 text-[12px]">
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">Original {target.nights ?? '—'} nights</span>
                  <span>₹{Number(target.currentPrice ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">+{extRate.extraNights} extra night{extRate.extraNights > 1 ? 's' : ''} × ₹{extRate.perNight.toLocaleString('en-IN')}</span>
                  <span>₹{extRate.extensionTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-[#A7F3D0] my-2"/>
                <div className="flex justify-between font-bold">
                  <span>New Total</span>
                  <span className="text-[#329937] text-[13px]">₹{extRate.newTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            {!loading && !extRate && (
              <p className="text-[12px] text-[#888]">Could not fetch rate — proceeding without price update.</p>
            )}
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Guest staying longer"
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="extend-reason"/>
        </div>

        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA]">Cancel</button>
          <button onClick={handleConfirm} disabled={busy || !isValid}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="extend-stay-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Confirm Extension
          </button>
        </div>
      </div>
    </div>
  );
}
