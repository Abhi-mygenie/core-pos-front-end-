// CR-162: Modal for recording a mid-stay partial payment on an active room order
import { useState } from "react";
import { X, Banknote, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";
import { recordPartialPayment } from "../../api/services/roomService";
import { useToast } from "../../hooks/use-toast";

const PAYMENT_MODES = [
  { value: 'cash',     label: 'Cash' },
  { value: 'card',     label: 'Card' },
  { value: 'upi',      label: 'UPI' },
  { value: 'online',   label: 'Online' },
  { value: 'neft',     label: 'NEFT' },
  { value: 'razorpay', label: 'Razorpay' },
];

/**
 * roomOrderId  — numeric order ID (orderId from CartPanel)
 * liveBalance  — current outstanding (roomSummaryOverride ?? roomPaymentSummary?.remainingRoomBalance ?? balancePayment)
 * priorPayments — array from roomPaymentSummary.payments (may be empty)
 * onClose()    — dismiss modal
 * onSuccess(updatedSummary) — called with room_payment_summary from API response
 */
const RecordPaymentModal = ({ roomOrderId, liveBalance, priorPayments = [], onClose, onSuccess }) => {
  const { toast } = useToast();
  const [amount, setAmount]           = useState('');
  const [mode, setMode]               = useState('cash');
  const [note, setNote]               = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const isValid   = amountNum > 0 && amountNum <= liveBalance + 0.01;
  const remaining = liveBalance - amountNum;

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await recordPartialPayment({
        roomOrderId,
        amount: amountNum,
        paymentMode: mode,
        note,
      });
      if (res?.success) {
        const modeLabel = PAYMENT_MODES.find(m => m.value === mode)?.label || mode;
        toast({ title: 'Payment Recorded', description: `₹${amountNum.toLocaleString()} recorded via ${modeLabel}.` });
        onSuccess(res.room_payment_summary);
      } else {
        setError(res?.message || 'Payment failed. Please try again.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || err?.message || 'Payment failed.');
      setSubmitting(false);
    }
  };

  const modeLabel = PAYMENT_MODES.find(m => m.value === mode)?.label || mode;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center"
      data-testid="record-payment-modal"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: `1px solid ${COLORS.borderGray}` }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
            <span className="text-base font-bold" style={{ color: COLORS.darkText }}>Record Payment</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="record-payment-close"
          >
            <X className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Outstanding balance block */}
        <div className="mx-4 mt-4 rounded-xl px-4 py-3" style={{ background: '#FFF7ED', border: '1px solid #FDBA74' }}>
          <p className="text-xs font-medium mb-0.5" style={{ color: '#92400E' }}>Outstanding Balance</p>
          <p
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: COLORS.primaryOrange }}
            data-testid="record-payment-outstanding"
          >
            ₹{liveBalance.toLocaleString()}
          </p>
          {amountNum > 0 && amountNum <= liveBalance + 0.01 && (
            <p className="text-xs mt-1" style={{ color: '#B45309' }}>
              After this payment → <span className="font-bold" style={{ color: COLORS.primaryGreen }}>₹{Math.max(0, remaining).toLocaleString()} remaining</span>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="px-4 pt-4 pb-2 space-y-3">

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: COLORS.grayText }}>
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              max={liveBalance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border text-sm transition-all focus:outline-none"
              style={{
                borderColor: amountNum > liveBalance + 0.01 ? '#ef4444' : amountNum > 0 ? COLORS.primaryGreen : COLORS.borderGray,
                color: COLORS.darkText,
                boxShadow: amountNum > 0 && isValid ? `0 0 0 3px rgba(22,163,74,.1)` : 'none',
              }}
              data-testid="record-payment-amount-input"
            />
            {amountNum > liveBalance + 0.01 && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Cannot exceed outstanding balance</p>
            )}
          </div>

          {/* Payment mode grid */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: COLORS.grayText }}>
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_MODES.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className="py-2 rounded-lg border text-xs font-medium transition-all"
                  style={mode === m.value
                    ? { background: '#f0fdf4', borderColor: COLORS.primaryGreen, color: COLORS.primaryGreen, fontWeight: 600 }
                    : { borderColor: COLORS.borderGray, color: COLORS.darkText }
                  }
                  data-testid={`record-payment-mode-${m.value}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: COLORS.grayText }}>
              Note <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Partial advance Day 3"
              className="w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="record-payment-note-input"
            />
          </div>

          {/* Payment history accordion */}
          {priorPayments.length > 0 && (
            <div>
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold transition-colors"
                style={{ color: COLORS.darkText }}
                data-testid="record-payment-history-toggle"
              >
                <div className="flex items-center gap-1.5">
                  <span style={{ color: COLORS.primaryOrange }}>₳</span>
                  Payment History
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: '#FFF7ED', color: COLORS.primaryOrange }}>
                    {priorPayments.length}
                  </span>
                  <ChevronDown
                    className="w-3.5 h-3.5 transition-transform"
                    style={{ color: COLORS.grayText, transform: historyOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </div>
              </button>
              {historyOpen && (
                <div className="space-y-1.5 mb-2">
                  {priorPayments.map((p, i) => (
                    <div
                      key={p.id || i}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: COLORS.sectionBg || '#F9FAFB', border: `1px solid ${COLORS.borderGray}` }}
                    >
                      <div>
                        <p className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
                          ₹{p.amount.toLocaleString()} · {p.mode}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: COLORS.grayText }}>
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: '#f0fdf4', color: COLORS.primaryGreen }}
                      >
                        {p.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#EF4444' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={handleConfirm}
            disabled={!isValid || submitting}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: COLORS.primaryGreen,
              boxShadow: isValid && !submitting ? '0 4px 12px rgba(22,163,74,.25)' : 'none',
            }}
            data-testid="record-payment-confirm-btn"
          >
            {submitting
              ? 'Recording...'
              : isValid
                ? `Pay ₹${amountNum.toLocaleString()} via ${modeLabel}`
                : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
