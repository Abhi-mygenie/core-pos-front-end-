// CR-358-P5: S8-D — Shared destructive Mark No-Show confirmation dialog.
// Used by: ArrivalsPage (Late/Today tab) + ReservationsPage (BlockPopover).
// Props:
//   target:    { bookingId, guestName, channel, checkin, roomCode } | null  (null = dialog closed)
//   onClose:   () => void
//   onSuccess: () => void  (called AFTER successful API call; caller reloads data + shows toast)
import { useState } from 'react';
import { UserX, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { markNoShowBooking } from '@/api/services/pmsService';

export default function NoShowDialog({ target, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [remark, setRemark] = useState('');

  if (!target) return null;

  const { bookingId, guestName, channel, checkin, roomCode } = target;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await markNoShowBooking(bookingId, channel);
      onClose();
      setRemark('');
      onSuccess();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to mark no-show';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => { if (!busy) { setRemark(''); onClose(); } };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      data-testid="noshow-overlay">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto"
        data-testid="noshow-dialog">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E5E5E5] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
            <UserX className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#1A1A1A]">Confirm Mark No-Show</div>
            <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] mt-1">
              Permanent &amp; Irreversible
            </span>
          </div>
        </div>

        {/* Booking details */}
        <div className="px-5 py-4 space-y-3">
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg px-4 py-3 text-[12px] grid grid-cols-[88px_1fr] gap-y-1.5">
            <span className="text-[#888] font-medium">Guest</span>
            <span className="font-semibold text-[#1A1A1A]">{guestName || '—'}</span>
            <span className="text-[#888] font-medium">Booking ID</span>
            <span className="font-mono text-[11px] font-semibold text-[#1A1A1A]">{bookingId}</span>
            <span className="text-[#888] font-medium">Check-in</span>
            <span className="font-semibold text-[#1A1A1A]">{checkin || '—'}</span>
            <span className="text-[#888] font-medium">Room</span>
            <span className="font-semibold text-[#1A1A1A]">{roomCode || '—'}</span>
            <span className="text-[#888] font-medium">Channel</span>
            <span className="font-semibold text-[#1A1A1A] capitalize">{channel || '—'}</span>
          </div>

          {/* Warning */}
          <div className="bg-[#FEE2E2] border border-[#FECACA] rounded-lg px-4 py-3 flex gap-2.5 items-start">
            <TriangleAlert className="w-3.5 h-3.5 text-[#B91C1C] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#991B1B] leading-relaxed">
              Marking as No-Show will notify <strong className="capitalize">{channel}</strong>, cancel the
              reservation, and immediately release the room back to available inventory.{' '}
              <strong>This action cannot be undone.</strong>
            </p>
          </div>

          {/* Optional remark */}
          <div>
            <label className="block text-[11px] font-medium text-[#666] mb-1.5">
              Front-desk remark <span className="text-[#888]">(optional)</span>
            </label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Guest did not respond to calls"
              className="w-full h-9 border border-[#E5E5E5] rounded-lg px-3 text-[12px] outline-none focus:border-[#329937] focus:ring-1 focus:ring-[#329937]/20"
              data-testid="noshow-remark-input"
              disabled={busy}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={handleClose}
            disabled={busy}
            className="flex-1 h-9 border border-[#E5E5E5] rounded-lg text-[13px] font-medium text-[#555] hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
            data-testid="noshow-cancel-btn">
            Cancel / Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 h-9 bg-[#EF4444] hover:bg-[#D32F2F] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
            data-testid="noshow-confirm-btn">
            {busy ? (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              <UserX className="w-3.5 h-3.5" />
            )}
            Mark No-Show &amp; Release Room
          </button>
        </div>
      </div>
    </div>
  );
}
