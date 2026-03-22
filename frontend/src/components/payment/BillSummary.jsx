import { useState } from "react";
import { ClipboardList, Star, Ticket, ChevronDown, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { discountTypes, TAX_RATES } from "../../data/mockDiscounts";

/**
 * BillSummary - Comprehensive bill display with discounts and taxes
 */
const BillSummary = ({ 
  cartItems, 
  itemTotal,
  foodTotal,
  alcoholTotal,
  // Discount props
  manualDiscount,
  onManualDiscountChange,
  manualDiscountAmount,
  // Loyalty props
  customer,
  useLoyalty,
  setUseLoyalty,
  loyaltyPointsToRedeem,
  setLoyaltyPointsToRedeem,
  loyaltyDiscount,
  // Coupon props
  couponCode,
  setCouponCode,
  onApplyCoupon,
  selectedCoupon,
  couponError,
  couponDiscount,
  // Totals
  totalDiscount,
  subtotal,
  gstAmount,
  vatAmount,
  finalTotal,
}) => {
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  const handleDiscountTypeChange = (type) => {
    onManualDiscountChange({ ...manualDiscount, type: type.id, amount: type.id === "none" ? 0 : manualDiscount.amount });
    setShowDiscountDropdown(false);
  };

  const handleDiscountModeChange = (mode) => {
    onManualDiscountChange({ ...manualDiscount, mode });
    setShowModeDropdown(false);
  };

  const handleDiscountAmountChange = (value) => {
    const amount = parseFloat(value) || 0;
    onManualDiscountChange({ ...manualDiscount, amount });
  };

  const selectedDiscountType = discountTypes.find(d => d.id === manualDiscount.type) || discountTypes[0];

  return (
    <div 
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: COLORS.borderGray }}
      data-testid="bill-summary-section"
    >
      {/* Header with Orange Total */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: COLORS.sectionBg }}
      >
        <div className="flex items-center gap-2 font-semibold" style={{ color: COLORS.darkText }}>
          <ClipboardList className="w-4 h-4" /> Bill Summary
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
            ₹{itemTotal.toLocaleString()}
          </div>
          <div className="text-xs" style={{ color: COLORS.grayText }}>Item Total</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Items List */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>
            Items
          </div>
          {cartItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span style={{ color: COLORS.darkText }}>
                {item.name} x{item.qty}
              </span>
              <span style={{ color: COLORS.darkText }}>₹{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Item Total */}
        <div className="flex justify-between pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
          <span className="font-medium" style={{ color: COLORS.darkText }}>Item Total</span>
          <span className="font-medium" style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
        </div>

        {/* Discount Section */}
        <div className="pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
            Discount
          </div>
          <div className="flex gap-2 items-center">
            {/* Discount Type Dropdown */}
            <div className="relative flex-1">
              <button
                onClick={() => setShowDiscountDropdown(!showDiscountDropdown)}
                className="w-full px-3 py-2 text-sm rounded-lg border flex items-center justify-between"
                style={{ borderColor: COLORS.borderGray, backgroundColor: "#fff" }}
                data-testid="discount-type-dropdown"
              >
                <span style={{ color: COLORS.darkText }}>{selectedDiscountType.name}</span>
                <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
              {showDiscountDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                  style={{ borderColor: COLORS.borderGray }}
                >
                  {discountTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleDiscountTypeChange(type)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                      style={{ color: COLORS.darkText }}
                    >
                      {type.name}
                      {type.id === manualDiscount.type && (
                        <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mode Dropdown (Flat/Percent) */}
            <div className="relative w-24">
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="w-full px-3 py-2 text-sm rounded-lg border flex items-center justify-between"
                style={{ borderColor: COLORS.borderGray, backgroundColor: "#fff" }}
                disabled={manualDiscount.type === "none"}
                data-testid="discount-mode-dropdown"
              >
                <span style={{ color: COLORS.darkText }}>
                  {manualDiscount.mode === "flat" ? "Flat ₹" : "%"}
                </span>
                <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
              {showModeDropdown && (
                <div 
                  className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10"
                  style={{ borderColor: COLORS.borderGray }}
                >
                  <button
                    onClick={() => handleDiscountModeChange("flat")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: COLORS.darkText }}
                  >
                    Flat ₹
                    {manualDiscount.mode === "flat" && (
                      <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDiscountModeChange("percent")}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: COLORS.darkText }}
                  >
                    Percent %
                    {manualDiscount.mode === "percent" && (
                      <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Amount Input */}
            <input
              type="number"
              value={manualDiscount.amount || ""}
              onChange={(e) => handleDiscountAmountChange(e.target.value)}
              placeholder={manualDiscount.mode === "flat" ? "₹" : "%"}
              className="w-20 px-3 py-2 text-sm rounded-lg border text-right"
              style={{ borderColor: COLORS.borderGray }}
              disabled={manualDiscount.type === "none"}
              data-testid="discount-amount-input"
            />
          </div>
          
          {/* Discount Applied */}
          {manualDiscountAmount > 0 && (
            <div className="flex justify-end mt-2">
              <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
                -₹{manualDiscountAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Loyalty Points Section - Only if customer exists */}
        {customer && customer.loyaltyPoints > 0 && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${COLORS.primaryOrange}08`, border: `1px solid ${COLORS.borderGray}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Loyalty Points</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: COLORS.grayText }}>
                Available: {customer.loyaltyPoints} pts
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => {
                    setUseLoyalty(e.target.checked);
                    if (!e.target.checked) setLoyaltyPointsToRedeem(0);
                  }}
                  className="w-4 h-4 accent-green-600"
                  data-testid="use-loyalty-checkbox"
                />
                <span className="text-xs" style={{ color: COLORS.darkText }}>Use Points</span>
              </label>
            </div>
            {useLoyalty && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs" style={{ color: COLORS.grayText }}>Points to redeem:</span>
                  <input
                    type="number"
                    value={loyaltyPointsToRedeem || ""}
                    onChange={(e) => {
                      const val = Math.min(parseInt(e.target.value) || 0, customer.loyaltyPoints);
                      setLoyaltyPointsToRedeem(val);
                    }}
                    max={customer.loyaltyPoints}
                    className="flex-1 px-2 py-1 text-sm rounded border text-right"
                    style={{ borderColor: COLORS.borderGray }}
                    data-testid="loyalty-points-input"
                  />
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: COLORS.grayText }}>Discount:</span>
                    <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
                      -₹{loyaltyDiscount.toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Coupon Section - Only if customer exists */}
        {customer && (
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${COLORS.primaryGreen}08`, border: `1px solid ${COLORS.borderGray}` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Coupon</span>
            </div>
            <div className="flex gap-2">
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
                className="px-4 py-2 text-sm font-medium rounded-lg text-white"
                style={{ backgroundColor: COLORS.primaryGreen }}
                data-testid="apply-coupon-btn"
              >
                Apply
              </button>
            </div>
            {couponError && (
              <div className="text-xs mt-1" style={{ color: COLORS.errorText }}>{couponError}</div>
            )}
            {selectedCoupon && (
              <div className="flex justify-between mt-2 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                <span className="text-xs flex items-center gap-1" style={{ color: COLORS.primaryGreen }}>
                  <Check className="w-3 h-3" /> {selectedCoupon.code} applied
                </span>
                <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>
                  -₹{couponDiscount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total Discount */}
        {totalDiscount > 0 && (
          <div className="flex justify-between pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
            <span className="font-medium" style={{ color: COLORS.darkText }}>Total Discount</span>
            <span className="font-medium" style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toLocaleString()}</span>
          </div>
        )}

        {/* Subtotal */}
        <div className="flex justify-between pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
          <span className="font-medium" style={{ color: COLORS.darkText }}>Subtotal</span>
          <span className="font-medium" style={{ color: COLORS.darkText }}>₹{subtotal.toLocaleString()}</span>
        </div>

        {/* Taxes */}
        <div className="space-y-1">
          {gstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>GST @ {TAX_RATES.GST * 100}% (Food)</span>
              <span style={{ color: COLORS.grayText }}>₹{gstAmount.toLocaleString()}</span>
            </div>
          )}
          {vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>VAT @ {TAX_RATES.VAT * 100}% (Alcohol)</span>
              <span style={{ color: COLORS.grayText }}>₹{vatAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Final Total */}
        <div 
          className="p-4 -mx-4 -mb-4 text-center"
          style={{ backgroundColor: `${COLORS.primaryGreen}10` }}
        >
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: COLORS.grayText }}>
            Total to Pay
          </div>
          <div className="text-3xl font-bold" style={{ color: COLORS.primaryGreen }}>
            ₹{finalTotal.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillSummary;
