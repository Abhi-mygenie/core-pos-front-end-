/**
 * CreditClearanceModal — BUG-104 Phase 1 — SS4
 *
 * Centered Dialog opened FROM the customer detail Sheet (VQ-04 = C).
 * Validation messages render inline below the amount input AND a toast
 * is fired on submit success/failure (VQ-05 = D).
 *
 * Does NOT mutate any local balance — caller refreshes after success.
 */
import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, Wallet, Loader2, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip';
import { COLORS } from '../../constants';
import { useToast } from '../../hooks/use-toast';
import { insertTabPayment } from '../../api/services/creditService';
import { formatINR } from '../../api/transforms/creditTransform';

const ALL_METHODS = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'upi', label: 'UPI', icon: Wallet },
];

function validate(amount, balance, method) {
  if (!method) return { ok: false, msg: 'Select a payment method.' };
  if (amount === '' || amount === null || amount === undefined) {
    return { ok: false, msg: 'Enter an amount.' };
  }
  const n = parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, msg: 'Amount must be greater than 0.' };
  }
  if (n > balance) return { ok: false, msg: 'Amount cannot exceed outstanding balance.' };
  return { ok: true, msg: '' };
}

export default function CreditClearanceModal({ open, customer, paymentMethods, onClose, onSuccess }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  // Methods enabled in restaurant config (fall back to all 3 if config missing).
  const methods = useMemo(() => {
    const enabled = ALL_METHODS.filter((m) => paymentMethods?.[m.key]);
    return enabled.length > 0 ? enabled : ALL_METHODS;
  }, [paymentMethods]);

  // Reset state every time the modal opens.
  useEffect(() => {
    if (open) {
      setAmount('');
      setMethod(methods[0]?.key || null);
      setSubmitting(false);
      setTouched(false);
    }
  }, [open, methods]);

  if (!customer) return null;

  const balance = Number(customer.balance) || 0;
  const numericAmount = parseFloat(amount);
  const validation = validate(amount, balance, method);
  const showInlineError = touched && !validation.ok && validation.msg;
  const remaining =
    Number.isFinite(numericAmount) && numericAmount > 0 ? Math.max(0, balance - numericAmount) : balance;

  const handleSubmit = async () => {
    setTouched(true);
    if (!validation.ok) {
      toast({ title: 'Cannot record payment', description: validation.msg, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await insertTabPayment({
        mobile: customer.mobile,
        name: customer.name,
        email: customer.email || '',
        debitAmount: numericAmount,
        paymentMethod: method,
      });
      toast({
        title: 'Payment recorded',
        description: `${formatINR(numericAmount)} marked as paid for ${customer.name}.`,
      });
      onSuccess?.();
    } catch (err) {
      const msg = err.readableMessage;
      toast({ title: 'Payment failed', description: msg, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose?.()}>
      <DialogContent className="sm:max-w-md" data-testid="credit-clearance-modal">
        <DialogHeader>
          <DialogTitle data-testid="credit-clearance-title">Record Payment — {customer.name}</DialogTitle>
          <DialogDescription>Cashier-only · Recorded against customer tab balance.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer summary */}
          <div className="rounded-lg p-3" style={{ backgroundColor: COLORS.sectionBg }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>Mobile</span>
              <span style={{ color: COLORS.darkText }}>{customer.mobile || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span style={{ color: COLORS.grayText }}>Outstanding Balance</span>
              <span className="text-lg font-bold" data-testid="credit-clearance-outstanding" style={{ color: COLORS.primaryOrange }}>
                {formatINR(balance)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="text-sm font-semibold mb-2" style={{ color: COLORS.darkText }}>
              Payment Method <span style={{ color: COLORS.errorText }}>*</span>
            </div>
            <div className="flex gap-2">
              {methods.map((m) => {
                const Icon = m.icon;
                const active = method === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    data-testid={`credit-payment-method-${m.key}`}
                    onClick={() => {
                      setMethod(m.key);
                      setTouched(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? COLORS.primaryOrange : 'white',
                      color: active ? 'white' : COLORS.darkText,
                      border: `1px solid ${active ? COLORS.primaryOrange : COLORS.borderGray}`,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: COLORS.darkText }}>
              Amount <span style={{ color: COLORS.errorText }}>*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
              <input
                data-testid="credit-clearance-amount-input"
                type="number"
                value={amount}
                step="0.01"
                min="0"
                onChange={(e) => {
                  setAmount(e.target.value);
                  setTouched(true);
                }}
                placeholder="0.00"
                disabled={submitting}
                className="w-full border rounded-lg pl-8 pr-3 py-2.5 text-base font-medium focus:outline-none"
                style={{ borderColor: showInlineError ? COLORS.errorText : COLORS.borderGray }}
              />
            </div>
            {showInlineError ? (
              <p data-testid="credit-clearance-inline-error" className="text-xs mt-1" style={{ color: COLORS.errorText }}>
                {validation.msg}
              </p>
            ) : (
              <p className="text-xs mt-1" style={{ color: COLORS.grayText }}>
                Remaining after payment:{' '}
                <span data-testid="credit-clearance-remaining" className="font-semibold" style={{ color: COLORS.darkText }}>
                  {formatINR(remaining)}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 pt-4">
          {/* Print Receipt — Phase 2C placeholder */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="credit-print-receipt-btn"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border text-zinc-300 border-zinc-200 cursor-not-allowed"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Print payment receipt after recording</p>
                <p className="text-[10px] opacity-70 mt-0.5">Phase 2C — Requires API response documentation (BG-03)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex gap-3">
            <button
              data-testid="credit-clearance-cancel-btn"
              onClick={() => onClose?.()}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            >
              Cancel
            </button>
            <button
              data-testid="credit-clearance-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !validation.ok}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: COLORS.primaryOrange }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Record Payment
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
