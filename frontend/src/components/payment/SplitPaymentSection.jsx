import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { COLORS } from "../../constants";

const SPLIT_METHOD_OPTIONS = [
  { value: "cash", icon: Banknote, label: "Cash" },
  { value: "card", icon: CreditCard, label: "Card" },
  { value: "upi", icon: Smartphone, label: "UPI" },
];

/**
 * SplitPaymentSection - Split payment inputs
 */
const SplitPaymentSection = ({
  splitPayments,
  setSplitPayments,
  finalTotal,
}) => {
  const handleMethodChange = (idx, value) => {
    const updated = [...splitPayments];
    updated[idx].method = value;
    setSplitPayments(updated);
  };

  const handleAmountChange = (idx, value) => {
    const updated = [...splitPayments];
    updated[idx].amount = value;
    setSplitPayments(updated);
  };

  const addSplit = () => {
    setSplitPayments([...splitPayments, { method: "cash", amount: "" }]);
  };

  const totalCovered = splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);

  return (
    <div className="mt-4 p-3 rounded-lg border space-y-3" style={{ borderColor: COLORS.borderGray }}>
      {splitPayments.map((sp, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <select
            value={sp.method}
            onChange={(e) => handleMethodChange(idx, e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: COLORS.borderGray }}
          >
            {SPLIT_METHOD_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Amount"
            value={sp.amount}
            onChange={(e) => handleAmountChange(idx, e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: COLORS.borderGray }}
          />
        </div>
      ))}
      <button
        onClick={addSplit}
        className="text-sm flex items-center gap-1"
        style={{ color: COLORS.primaryOrange }}
      >
        + Add Payment Split
      </button>
      <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: COLORS.grayText }}>Total Covered</span>
          <span style={{ color: totalCovered >= finalTotal ? COLORS.primaryGreen : COLORS.darkText }}>
            ₹{totalCovered} / ₹{finalTotal}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplitPaymentSection;
