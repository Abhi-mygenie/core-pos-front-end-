// CR-362: Modify dates + amount on a pending reservation. Fetches live rates on date change.
import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { modifyReservation, getRatesData } from '@/api/services/pmsService';
import { toast } from 'sonner';

export default function ModifyBookingDialog({ target, onClose, onSuccess }) {
  // target: { reservationId, guestName, channel, roomCode, checkin, checkout }
  const [checkin,      setCheckin]      = useState('');
  const [checkout,     setCheckout]     = useState('');
  const [rates,        setRates]        = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [reason,       setReason]       = useState('');
  const [loading,      setLoading]      = useState(false);
  const [busy,         setBusy]         = useState(false);

  useEffect(() => {
    if (!target) return;
    setCheckin(target.checkin ?? '');
    setCheckout(target.checkout ?? '');
    setRates([]); setSelectedRate(null); setReason('');
  }, [target]);

  useEffect(() => {
    if (!checkin || !checkout || checkout <= checkin) { setRates([]); setSelectedRate(null); return; }
    setLoading(true);
    getRatesData({ startDate: checkin, endDate: checkout })
      .then(data => {
        const rateplans = data?.rateplans ?? (Array.isArray(data) ? data : []);
        const nights = Math.max(1, Math.round((new Date(checkout) - new Date(checkin)) / 86400000));
        const mapped = rateplans.slice(0, 5).map(rp => ({
          id:       rp.id ?? rp.rateplanId ?? Math.random(),
          name:     rp.name ?? rp.rateplanName ?? 'Standard Rate',
          perNight: Number(rp.rates?.[checkin] ?? rp.rate ?? 0),
          total:    Number(rp.rates?.[checkin] ?? rp.rate ?? 0) * nights,
          nights,
        }));
        setRates(mapped);
        setSelectedRate(mapped[0] ?? null);
      })
      .catch(() => { setRates([]); setSelectedRate(null); })
      .finally(() => setLoading(false));
  }, [checkin, checkout]);

  if (!target) return null;

  const datesValid = checkin && checkout && checkout > checkin;

  const handleConfirm = async () => {
    if (!datesValid) { toast.error('Invalid date range'); return; }
    setBusy(true);
    try {
      await modifyReservation(target.reservationId, {
        checkin,
        checkout,
        amountAfterTax: selectedRate?.total ?? undefined,
        reason,
      });
      toast.success('Booking modified.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Modification failed';
      toast.error(msg.toLowerCase().includes('check') ? 'Cannot modify — room already checked in.' : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="modify-booking-dialog">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold">Modify Booking</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">
          {target.guestName} · {target.channel} · {target.roomCode} · Current: {target.checkin} – {target.checkout}
        </p>

        {/* Date pickers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-in</label>
            <input type="date" value={checkin} onChange={e => setCheckin(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-checkin"/>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1">Check-out</label>
            <input type="date" value={checkout} min={checkin || ''} onChange={e => setCheckout(e.target.value)}
              className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-checkout"/>
          </div>
        </div>

        {/* Live rates */}
        {datesValid && (
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-2">
              Rate for new dates
              {loading && <span className="text-[#329937] font-normal normal-case ml-1">(fetching…)</span>}
              {!loading && rates.length > 0 && <span className="text-[#329937] font-normal normal-case ml-1">· Live rates</span>}
            </div>
            {loading && <div className="h-10 bg-[#F3F4F6] rounded animate-pulse"/>}
            {!loading && rates.map(r => (
              <div key={r.id} onClick={() => setSelectedRate(r)} data-testid={`modify-rate-${r.id}`}
                className={`border rounded-lg p-2.5 mb-1.5 cursor-pointer transition-colors ${
                  selectedRate?.id === r.id ? 'border-[#329937] bg-[#F0FDF4]' : 'border-[#E5E5E5] hover:border-[#329937]'
                }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[12px] font-medium">{r.name}</div>
                    <div className="text-[10px] text-[#888]">{r.nights} nights × ₹{r.perNight.toLocaleString('en-IN')}/night</div>
                  </div>
                  <div className="text-[13px] font-bold text-[#329937]">₹{r.total.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))}
            {!loading && rates.length === 0 && <p className="text-[12px] text-[#888]">No rates available — enter amount manually if needed.</p>}
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">Reason (optional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Guest extended trip"
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px]" data-testid="modify-reason"/>
        </div>

        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA]">Cancel</button>
          <button onClick={handleConfirm} disabled={busy || !datesValid}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#329937] text-white hover:bg-[#287a2d] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="modify-booking-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
