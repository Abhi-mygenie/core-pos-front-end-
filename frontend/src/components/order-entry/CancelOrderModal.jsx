// CR-165: mode prop — 'cancel' (default) | 'refund'
// In refund mode: title/warning/button change; note textarea shown.
// onCancel always receives (reason, note) — note is '' in cancel mode (backward-compatible).
import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";

const CancelOrderModal = ({ table, itemCount, reasons = [], onClose, onCancel, mode = 'cancel', cancelNoteMandatory = false }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cancellationNote, setCancellationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isRefund = mode === 'refund';

  const handleCancel = async () => {
    if (!selectedReason || submitting) return;
    if (cancelNoteMandatory && !cancellationNote.trim()) return; // CR-493 B5
    setSubmitting(true);
    setError(null);
    try {
      await onCancel(selectedReason, cancellationNote);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Operation failed. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="cancel-order-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {isRefund ? 'Cancel & Refund' : 'Cancel Order'}
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                {table?.label || table?.id} · {itemCount} item{itemCount !== 1 ? 's' : ''} will be cancelled
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" data-testid="cancel-order-close-btn">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            {isRefund
              ? 'This will cancel the order and initiate a Razorpay refund. This action cannot be undone.'
              : 'This will cancel ALL items in this order. This action cannot be undone.'}
          </div>

          {/* Reason Dropdown — CR-493 E1: mandatory asterisk, E3: no-reasons block */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Cancellation Reason <span style={{ color: COLORS.errorText }}>*</span>
            </label>
            {reasons.length === 0 ? (
              <div
                className="px-4 py-3 rounded-xl border text-sm"
                style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#DC2626' }}
                data-testid="cancel-order-no-reasons"
              >
                No cancellation reasons configured. Ask admin to add cancellation reasons.
              </div>
            ) : (
            <div className="relative">
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: COLORS.borderGray }}
                onClick={() => setShowDropdown(!showDropdown)}
                data-testid="cancel-order-reason-dropdown"
              >
                <span style={{ color: selectedReason ? COLORS.darkText : COLORS.grayText }}>
                  {selectedReason ? selectedReason.reasonText : "Select reason"}
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} style={{ color: COLORS.grayText }} />
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto z-10"
                  style={{ borderColor: COLORS.borderGray }}>
                  {reasons.map((reason) => (
                    <button
                      key={reason.reasonId}
                      onClick={() => { setSelectedReason(reason); setShowDropdown(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      style={{
                        color: COLORS.darkText,
                        backgroundColor: selectedReason?.reasonId === reason.reasonId ? `${COLORS.errorText}10` : "transparent",
                      }}
                      data-testid={`cancel-order-reason-${reason.reasonId}`}
                    >
                      {reason.reasonText}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          {/* BUG-674 E2: Note textarea — shown in all modes (cancel + refund) */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              {isRefund ? 'Refund Note' : (cancelNoteMandatory ? <>Notes <span style={{ color: COLORS.errorText }}>*</span></> : 'Notes (Optional)')}
            </label>
            <textarea
              value={cancellationNote}
              onChange={(e) => setCancellationNote(e.target.value)}
              placeholder={isRefund ? 'Add a note for the refund (optional)' : 'Type here…'}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-100"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={isRefund ? 'cancel-order-refund-note' : 'cancel-order-note'}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {error && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={!selectedReason || submitting || (cancelNoteMandatory && !cancellationNote.trim())}
            data-testid="cancel-order-confirm-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#EF4444' }}
          >
            {submitting
              ? (isRefund ? 'Processing Refund...' : 'Cancelling...')
              : (isRefund ? 'Confirm & Refund via Razorpay' : 'Cancel Order')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
