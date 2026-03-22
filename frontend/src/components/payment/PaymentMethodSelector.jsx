import { CreditCard, Banknote, Smartphone, Split, FileText } from "lucide-react";
import { COLORS } from "../../constants";

const PAYMENT_OPTIONS = [
  { id: "cash", icon: Banknote, label: "Cash" },
  { id: "card", icon: CreditCard, label: "Card" },
  { id: "upi", icon: Smartphone, label: "UPI" },
];

/**
 * PaymentMethodSelector - Payment method selection buttons
 */
const PaymentMethodSelector = ({
  paymentMethod,
  setPaymentMethod,
  showSplit,
  setShowSplit,
}) => {
  return (
    <div data-testid="payment-method-section">
      <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
        <CreditCard className="w-4 h-4" /> Payment Method
      </div>
      
      {/* Main Payment Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {PAYMENT_OPTIONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setPaymentMethod(id); setShowSplit(false); }}
            className="p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all"
            style={{
              borderColor: !showSplit && paymentMethod === id ? COLORS.primaryGreen : COLORS.borderGray,
              backgroundColor: !showSplit && paymentMethod === id ? `${COLORS.primaryGreen}10` : "white",
            }}
            data-testid={`payment-${id}-btn`}
          >
            <Icon className="w-5 h-5" style={{ color: !showSplit && paymentMethod === id ? COLORS.primaryGreen : COLORS.grayText }} />
            <span className="text-xs" style={{ color: !showSplit && paymentMethod === id ? COLORS.primaryGreen : COLORS.darkText }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary Options */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowSplit(!showSplit)}
          className="p-2 rounded-lg border flex items-center justify-center gap-2 text-sm"
          style={{
            borderColor: showSplit ? COLORS.primaryGreen : COLORS.borderGray,
            backgroundColor: showSplit ? `${COLORS.primaryGreen}10` : "white",
            color: showSplit ? COLORS.primaryGreen : COLORS.darkText,
          }}
          data-testid="split-payment-btn"
        >
          <Split className="w-4 h-4" /> Split
        </button>
        <button
          className="p-2 rounded-lg border flex items-center justify-center gap-2 text-sm"
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          data-testid="credit-payment-btn"
        >
          <FileText className="w-4 h-4" /> Credit
        </button>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
