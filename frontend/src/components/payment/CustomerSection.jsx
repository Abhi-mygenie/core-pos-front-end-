import { Search, Smartphone, User, Star, Wallet, Ticket, Check } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * CustomerSection - Customer lookup and display
 */
const CustomerSection = ({
  phone,
  onPhoneChange,
  customerName,
  onNameChange,
  customer,
  customerStatus,
  onFindCustomer,
}) => {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.lightBg }}
      data-testid="customer-section"
    >
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4" style={{ color: COLORS.darkText }} />
        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>
          Customer
        </span>
        {customerStatus === "found" && (
          <span 
            className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ backgroundColor: `${COLORS.primaryGreen}20`, color: COLORS.primaryGreen }}
          >
            <Check className="w-3 h-3" /> Found
          </span>
        )}
        {customerStatus === "new" && (
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${COLORS.primaryOrange}20`, color: COLORS.primaryOrange }}
          >
            New
          </span>
        )}
      </div>
      
      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border bg-white" style={{ borderColor: COLORS.borderGray }}>
          <Smartphone className="w-4 h-4" style={{ color: COLORS.grayText }} />
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            onBlur={onFindCustomer}
            className="flex-1 outline-none text-sm"
            data-testid="customer-phone-input"
          />
        </div>
        <button
          onClick={onFindCustomer}
          className="px-3 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
          data-testid="find-customer-btn"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      <input
        type="text"
        placeholder="Name (optional)"
        value={customerName}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="customer-name-input"
      />

      {/* Customer Found - Show Rewards Summary */}
      {customer && (
        <div 
          className="mt-3 pt-3 border-t flex items-center gap-4 text-xs"
          style={{ borderColor: COLORS.borderGray }}
        >
          <span className="flex items-center gap-1" style={{ color: COLORS.primaryOrange }}>
            <Star className="w-3 h-3" /> {customer.tier || "Member"}
          </span>
          <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
            <Star className="w-3 h-3" style={{ color: COLORS.primaryOrange }} /> {customer.loyaltyPoints} pts
          </span>
          <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
            <Wallet className="w-3 h-3" style={{ color: COLORS.primaryGreen }} /> ₹{customer.walletBalance}
          </span>
          <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
            <Ticket className="w-3 h-3" style={{ color: COLORS.primaryOrange }} /> {customer.coupons?.length || 0}
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomerSection;
