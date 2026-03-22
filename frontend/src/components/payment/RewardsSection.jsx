import { Gift, Star, Wallet, Ticket } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * RewardsSection - Loyalty, wallet, and coupons
 */
const RewardsSection = ({
  customer,
  subtotal,
  useLoyalty,
  setUseLoyalty,
  useWallet,
  setUseWallet,
  walletAmount,
  setWalletAmount,
  selectedCoupon,
  onSelectCoupon,
  couponCode,
  setCouponCode,
  couponError,
  onApplyCoupon,
}) => {
  if (!customer) return null;

  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ borderColor: COLORS.borderGray }}
      data-testid="rewards-section"
    >
      <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
        <Gift className="w-4 h-4" /> Apply Rewards
      </div>
      
      {/* Loyalty Points */}
      {customer.loyaltyPoints > 0 && (
        <label className="flex items-center justify-between py-2 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useLoyalty}
              onChange={(e) => setUseLoyalty(e.target.checked)}
              className="w-4 h-4 accent-green-600"
              data-testid="use-loyalty-checkbox"
            />
            <span className="flex items-center gap-1 text-sm" style={{ color: COLORS.darkText }}>
              <Star className="w-3 h-3" style={{ color: COLORS.primaryOrange }} /> Use Loyalty ({customer.loyaltyPoints} pts)
            </span>
          </div>
          <span className="text-sm" style={{ color: COLORS.primaryGreen }}>
            -₹{Math.min(customer.loyaltyPoints, subtotal)}
          </span>
        </label>
      )}

      {/* Wallet */}
      {customer.walletBalance > 0 && (
        <label className="flex items-center justify-between py-2 cursor-pointer">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useWallet}
              onChange={(e) => setUseWallet(e.target.checked)}
              className="w-4 h-4 accent-green-600"
              data-testid="use-wallet-checkbox"
            />
            <span className="flex items-center gap-1 text-sm" style={{ color: COLORS.darkText }}>
              <Wallet className="w-3 h-3" style={{ color: COLORS.primaryGreen }} /> Use Wallet (₹{customer.walletBalance})
            </span>
          </div>
          {useWallet && (
            <input
              type="number"
              value={walletAmount}
              onChange={(e) => setWalletAmount(Math.min(parseFloat(e.target.value) || 0, customer.walletBalance))}
              className="w-20 px-2 py-1 text-sm text-right rounded border"
              style={{ borderColor: COLORS.borderGray }}
            />
          )}
        </label>
      )}

      {/* Available Coupons */}
      {customer.coupons && customer.coupons.length > 0 && (
        <div className="pt-2 border-t mt-2" style={{ borderColor: COLORS.borderGray }}>
          <div className="text-xs mb-2" style={{ color: COLORS.grayText }}>Available Coupons</div>
          {customer.coupons.map((coupon) => (
            <label 
              key={coupon.code}
              className="flex items-center justify-between py-1.5 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="coupon"
                  checked={selectedCoupon?.code === coupon.code}
                  onChange={() => onSelectCoupon(coupon)}
                  className="w-4 h-4 accent-green-600"
                />
                <span className="flex items-center gap-1 text-sm" style={{ color: COLORS.darkText }}>
                  <Ticket className="w-3 h-3" style={{ color: COLORS.primaryOrange }} /> {coupon.code}
                </span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>
                  {coupon.description || `${coupon.discount}${coupon.type === 'percent' ? '%' : '₹'} off`}
                </span>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Enter Coupon Code */}
      <div className="flex gap-2 mt-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
        <input
          type="text"
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2 text-sm rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="coupon-code-input"
        />
        <button
          onClick={onApplyCoupon}
          className="px-4 py-2 text-sm rounded-lg"
          style={{ backgroundColor: COLORS.sectionBg, color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
        >
          Apply
        </button>
      </div>
      {couponError && (
        <div className="text-xs mt-1" style={{ color: "red" }}>{couponError}</div>
      )}
    </div>
  );
};

export default RewardsSection;
