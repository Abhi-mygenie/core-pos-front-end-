import { COLORS } from "../../constants";

/**
 * CashInputSection - Cash received input with quick amounts and change calculation
 */
const CashInputSection = ({
  amountReceived,
  setAmountReceived,
  finalTotal,
  change,
  quickAmounts,
}) => {
  return (
    <div className="mt-4 p-3 rounded-lg border" style={{ borderColor: COLORS.borderGray }}>
      <div className="text-xs mb-2" style={{ color: COLORS.grayText }}>Cash Received</div>
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          placeholder="Amount"
          value={amountReceived}
          onChange={(e) => setAmountReceived(e.target.value)}
          className="flex-1 px-3 py-2 text-lg rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="cash-amount-input"
        />
      </div>
      <div className="flex gap-2 mb-3">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => setAmountReceived(amt.toString())}
            className="px-3 py-1 text-xs rounded-full border"
            style={{ borderColor: COLORS.borderGray }}
          >
            ₹{amt}
          </button>
        ))}
      </div>
      {amountReceived && parseFloat(amountReceived) >= finalTotal && (
        <div className="flex justify-between p-2 rounded-lg" style={{ backgroundColor: COLORS.sectionBg }}>
          <span style={{ color: COLORS.grayText }}>Change to Return</span>
          <span className="font-bold" style={{ color: COLORS.primaryOrange }}>₹{change}</span>
        </div>
      )}
    </div>
  );
};

export default CashInputSection;
