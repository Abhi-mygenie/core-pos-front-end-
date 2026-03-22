import { ClipboardList } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * BillSummary - Cart items list with subtotal and tax
 */
const BillSummary = ({ cartItems, subtotal, tax }) => {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ borderColor: COLORS.borderGray }}
      data-testid="bill-summary-section"
    >
      <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
        <ClipboardList className="w-4 h-4" /> Bill Summary
      </div>
      <div className="space-y-2 text-sm">
        {cartItems.map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span style={{ color: COLORS.darkText }}>
              {item.name} x{item.qty}
            </span>
            <span style={{ color: COLORS.darkText }}>₹{item.price * item.qty}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex justify-between">
            <span style={{ color: COLORS.grayText }}>Subtotal</span>
            <span style={{ color: COLORS.darkText }}>₹{subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.grayText }}>Tax (5%)</span>
            <span style={{ color: COLORS.darkText }}>₹{tax}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillSummary;
