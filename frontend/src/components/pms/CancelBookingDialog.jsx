// CR-362: Cancel a pending reservation — reason picker + OTA extranet warning + advance refund note
import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, DollarSign, X } from 'lucide-react';
import { cancelReservation } from '@/api/services/pmsService';
import { getCancellationReasons } from '@/api/services/settingsService';
import { toast } from 'sonner';

const OTA_CHANNELS = ['booking.com', 'goibibo', 'gommt', 'makemytrip', 'expedia', 'agoda'];

export default function CancelBookingDialog({ target, onClose, onSuccess, inline = false }) { // CR-385 M2 D2 inline = render inside a row expansion (no overlay)
  // target: { reservationId, guestName, channel, checkin, checkout, roomCode, advance, cancelledBy }
  const [reasons,  setReasons]  = useState([]);
  const [reasonId, setReasonId] = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (!target) return;
    setReasonId('');
    getCancellationReasons({ limit: 50, offset: 1 })
      .then(r => setReasons(Array.isArray(r) ? r : []))
      .catch(() => setReasons([]));
  }, [target]);

  if (!target) return null;

  const isOta      = OTA_CHANNELS.includes((target.channel ?? '').toLowerCase());
  const hasAdvance = Number(target.advance ?? 0) > 0;
  const reasonText = reasons.find(r => String(r.id) === String(reasonId))?.name ?? '';

  const handleConfirm = async () => {
    if (!reasonId) { toast.error('Please select a cancellation reason'); return; }
    setBusy(true);
    try {
      await cancelReservation(target.reservationId, {
        reason: reasonText,
        cancelledBy: target.cancelledBy,
      });
      toast.success('Booking cancelled. Room inventory updated.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Cancellation failed';
      toast.error(msg.toLowerCase().includes('check') ? 'Cannot cancel — room already checked in.' : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className={inline ? 'w-full' : 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'} data-testid="cancel-booking-dialog"> {/* CR-385 M2 D2 inline */}
      <div className={`bg-white rounded-xl w-full max-w-md p-6 ${inline ? 'border border-[#E5E5E5]' : 'shadow-2xl'}`}>{/* CR-385 M2 D2 */}
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Cancel Booking</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#F7F7F7] rounded"><X className="w-4 h-4 text-[#888]"/></button>
        </div>
        <p className="text-[12px] text-[#888] mb-4">
          {target.guestName} · {target.channel} · {target.roomCode} · {target.checkin} – {target.checkout}
        </p>

        {/* OTA extranet warning */}
        {isOta && (
          <div className="flex gap-2 bg-[#FFF7ED] border border-[#FCD34D] rounded-lg p-3 mb-3 text-[11px] text-[#92400E]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D97706]"/>
            <span>Also cancel this booking on the <strong>{target.channel}</strong> extranet to notify the guest. This only frees up your room inventory.</span>
          </div>
        )}

        {/* Advance refund note */}
        {hasAdvance && (
          <div className="flex gap-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 mb-3 text-[11px] text-[#991B1B]">
            <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5"/>
            <span>Advance ₹{Number(target.advance).toLocaleString('en-IN')} received — refund to guest manually.</span>
          </div>
        )}

        {/* Reason */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-[#666] uppercase tracking-wide mb-1.5">
            Cancellation Reason <span className="text-[#EF4444]">*</span>
          </label>
          <select value={reasonId} onChange={e => setReasonId(e.target.value)}
            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 text-[13px] font-['Poppins'] bg-white"
            data-testid="cancel-reason-select">
            <option value="">Select reason…</option>
            {reasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end border-t border-[#F3F4F6] pt-4">
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2 text-[12px] font-medium border border-[#E5E5E5] rounded-md text-[#666] hover:bg-[#FAFAFA] disabled:opacity-40">
            Keep Booking
          </button>
          <button onClick={handleConfirm} disabled={busy || !reasonId}
            className="px-4 py-2 text-[12px] font-semibold rounded-md bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-40 flex items-center gap-1.5"
            data-testid="cancel-booking-confirm-btn">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}
