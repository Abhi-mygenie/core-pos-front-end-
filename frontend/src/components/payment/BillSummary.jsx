import { useState, useRef, useEffect } from "react";
import { ClipboardList, Star, Ticket, ChevronDown, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { discountTypes, TAX_RATES, SERVICE_CHARGE_RATE } from "../../data/mockDiscounts";

/**
 * BillSummary - Comprehensive bill display with discounts, tip, service charge, and taxes
 * Order: Item Total → Discount → Tip → Service Charge → Taxes → Final
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
  // Tip props
  tip,
  onTipChange,
  tipAmount,
  // Service Charge props
  applyServiceCharge,
  onServiceChargeChange,
  serviceChargeAmount,
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
  sgstAmount,
  cgstAmount,
  vatAmount,
  finalTotal,
}) => {
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const discountDropdownRef = useRef(null);
  const modeDropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (discountDropdownRef.current && !discountDropdownRef.current.contains(event.target)) {
        setShowDiscountDropdown(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(event.target)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDiscountTypeChange = (type) => {
    onManualDiscountChange({ 
      ...manualDiscount, 
      type: type.id, 
      amount: type.id === "none" ? 0 : (type.defaultPercent || manualDiscount.amount),
      mode: type.id === "none" ? manualDiscount.mode : "percent"
    });
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
  const isNamedDiscount = manualDiscount.type !== "none";
  const isDropdownOpen = showDiscountDropdown || showModeDropdown;

  // Helper to get customization text (without arrow)
  const getCustomizationText = (item) => {
    if (!item.customizations) return null;
    
    const parts = [
      item.customizations.size,
      item.customizations.crust,
      item.customizations.base,
      item.customizations.spice,
      ...(item.customizations.addons || [])
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div 
      className={`rounded-lg border flex flex-col ${isDropdownOpen ? 'overflow-visible' : 'overflow-hidden'}`}
      style={{ borderColor: COLORS.borderGray, maxHeight: "100%" }}
      data-testid="bill-summary-section"
    >
      {/* Sticky Header with Final Amount */}
      <div 
        className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: COLORS.sectionBg, borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="flex items-center gap-2 font-semibold" style={{ color: COLORS.darkText }}>
          <ClipboardList className="w-4 h-4" /> Bill Summary
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
            ₹{finalTotal.toLocaleString()}
          </div>
          <div className="text-xs" style={{ color: COLORS.grayText }}>Total to Pay</div>
        </div>
      </div>

      {/* Scrollable Content - Compact padding */}
      <div className={`flex-1 px-4 py-3 space-y-3 ${isDropdownOpen ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {/* Items List - Compact layout */}
        <div className="space-y-1">
          {cartItems.map((item, idx) => {
            const customizationText = getCustomizationText(item);
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.darkText }}>
                    {item.name} x{item.qty}
                  </span>
                  <span style={{ color: COLORS.darkText }}>₹{(item.price * item.qty).toLocaleString()}</span>
                </div>
                {/* Only show customization line if there's actual data */}
                {customizationText && (
                  <div className="text-xs pl-2" style={{ color: COLORS.primaryGreen }}>
                    {customizationText}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Item Total - Compact */}
        <div className="flex justify-between pt-2 pb-1 border-t" style={{ borderColor: COLORS.borderGray }}>
          <span className="font-medium text-sm" style={{ color: COLORS.darkText }}>Item Total</span>
          <span className="font-medium text-sm" style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
        </div>

        {/* Discount Section - Compact */}
        <div className="pt-2 border-t relative" style={{ borderColor: COLORS.borderGray, zIndex: 20 }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: COLORS.grayText }}>
            Discount
          </div>
          <div className="flex gap-2 items-center relative">
            {/* Discount Type Dropdown */}
            <div className="relative flex-1" ref={discountDropdownRef}>
              <button
                onClick={() => {
                  setShowDiscountDropdown(!showDiscountDropdown);
                  setShowModeDropdown(false);
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border flex items-center justify-between"
                style={{ borderColor: COLORS.borderGray, backgroundColor: "#fff" }}
                data-testid="discount-type-dropdown"
              >
                <span style={{ color: COLORS.darkText }}>{selectedDiscountType.name}</span>
                <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
              </button>
              {showDiscountDropdown && (
                <>
                  {/* Backdrop to prevent click-through */}
                  <div 
                    className="fixed inset-0 bg-black/5" 
                    style={{ zIndex: 9998 }}
                    onClick={() => setShowDiscountDropdown(false)}
                  />
                  <div 
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-y-auto"
                    style={{ 
                      borderColor: COLORS.borderGray, 
                      zIndex: 9999,
                      minWidth: "200px",
                      width: "max-content"
                    }}
                  >
                    {discountTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleDiscountTypeChange(type)}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                        style={{ color: COLORS.darkText }}
                      >
                        <span>{type.name}</span>
                        <div className="flex items-center gap-2">
                          {type.defaultPercent && (
                            <span className="text-xs" style={{ color: COLORS.grayText }}>{type.defaultPercent}%</span>
                          )}
                          {type.id === manualDiscount.type && (
                            <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Mode Dropdown (Flat/Percent) - Only shown when No Discount selected */}
            {!isNamedDiscount && (
              <div className="relative w-24" ref={modeDropdownRef}>
                <button
                  onClick={() => {
                    setShowModeDropdown(!showModeDropdown);
                    setShowDiscountDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border flex items-center justify-between"
                  style={{ borderColor: COLORS.borderGray, backgroundColor: "#fff" }}
                  data-testid="discount-mode-dropdown"
                >
                  <span style={{ color: COLORS.darkText }}>
                    {manualDiscount.mode === "flat" ? "Flat ₹" : "%"}
                  </span>
                  <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
                </button>
                {showModeDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/5" 
                      style={{ zIndex: 9998 }}
                      onClick={() => setShowModeDropdown(false)}
                    />
                    <div 
                      className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl"
                      style={{ 
                        borderColor: COLORS.borderGray, 
                        zIndex: 9999,
                        minWidth: "100px"
                      }}
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
                  </>
                )}
              </div>
            )}

            {/* Amount Input */}
            <div className="relative w-20">
              <input
                type="number"
                value={manualDiscount.amount || ""}
                onChange={(e) => handleDiscountAmountChange(e.target.value)}
                placeholder={isNamedDiscount || manualDiscount.mode === "percent" ? "%" : "₹"}
                className="w-full px-3 py-2 text-sm rounded-lg border text-right"
                style={{ borderColor: COLORS.borderGray }}
                disabled={manualDiscount.type === "none" && !manualDiscount.mode}
                data-testid="discount-amount-input"
              />
              {isNamedDiscount && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>%</span>
              )}
            </div>

            {/* Discount Amount - Same row */}
            {manualDiscountAmount > 0 && (
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.primaryGreen }}>
                -₹{manualDiscountAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* TIP Section - Flat amount only */}
        <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
          <div className="text-xs font-medium uppercase tracking-wide mb-1.5" style={{ color: COLORS.grayText }}>
            Tip
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: COLORS.grayText }}>₹</span>
              <input
                type="number"
                value={tip || ""}
                onChange={(e) => onTipChange(parseFloat(e.target.value) || 0)}
                placeholder="Enter tip amount"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="tip-amount-input"
              />
            </div>
            {tipAmount > 0 && (
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.primaryOrange }}>
                +₹{tipAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* SERVICE CHARGE Section - Checkbox */}
        <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyServiceCharge}
                onChange={(e) => onServiceChargeChange(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
                data-testid="service-charge-checkbox"
              />
              <span className="text-sm" style={{ color: COLORS.darkText }}>
                Service Charge ({SERVICE_CHARGE_RATE * 100}%)
              </span>
            </label>
            {serviceChargeAmount > 0 && (
              <span className="text-sm font-medium" style={{ color: COLORS.primaryOrange }}>
                +₹{serviceChargeAmount.toLocaleString()}
              </span>
            )}
          </div>
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

        {/* Total Discount - Only show if there's discount from loyalty/coupon (not manual) */}
        {(loyaltyDiscount > 0 || couponDiscount > 0) && (
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

        {/* Taxes - SGST, CGST, VAT */}
        <div className="space-y-1">
          {sgstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>SGST @ {TAX_RATES.SGST * 100}% (Food)</span>
              <span style={{ color: COLORS.grayText }}>₹{sgstAmount.toLocaleString()}</span>
            </div>
          )}
          {cgstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>CGST @ {TAX_RATES.CGST * 100}% (Food)</span>
              <span style={{ color: COLORS.grayText }}>₹{cgstAmount.toLocaleString()}</span>
            </div>
          )}
          {vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>VAT @ {TAX_RATES.VAT * 100}% (Alcohol)</span>
              <span style={{ color: COLORS.grayText }}>₹{vatAmount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillSummary;
