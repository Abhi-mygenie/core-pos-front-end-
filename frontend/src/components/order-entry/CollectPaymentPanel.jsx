import { useState, useMemo } from "react";
import { ChevronLeft, CreditCard, Smartphone, Banknote, Split, FileText, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant } from "../../contexts";

const CollectPaymentPanel = ({ cartItems, total, onBack, onPaymentComplete, customer: passedCustomer, isRoom }) => {
  const customer = passedCustomer;
  const { discountTypes } = useRestaurant();

  // Per-item tax computation — uses product.tax if available, else 0%
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0;
    (cartItems || []).forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = item.price * (item.qty || 1);
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      // Split into SGST + CGST for GST type (India dine-in)
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2;
        cgst += taxAmt / 2;
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
    };
  }, [cartItems]);

  // Rewards state
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(customer?.walletBalance || 0);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
  const [discountValue, setDiscountValue] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splitType, setSplitType] = useState(null); // 'payment' or 'station'
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "" },
    { method: "card", amount: "" },
  ]);
  const [stationPayments, setStationPayments] = useState({
    bar: { method: "cash", paid: false },
    kitchen: { method: "cash", paid: false },
  });

  // Group items by station
  const barItems = (cartItems || []).filter(item => item.station === "bar");
  const kitchenItems = (cartItems || []).filter(item => item.station === "kitchen" || !item.station);
  const barTotal = barItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const kitchenTotal = kitchenItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Calculate bill
  const itemTotal = (cartItems || []).reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // Discount from restaurant preset types (from RestaurantContext)
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  const presetDiscount = selectedDiscountType
    ? Math.round((itemTotal * selectedDiscountType.discountPercent) / 100)
    : 0;

  const manualDiscount = discountType === 'percent'
    ? Math.round((itemTotal * parseFloat(discountValue || 0)) / 100)
    : parseFloat(discountValue || 0);
  
  const loyaltyDiscount = useLoyalty && customer?.loyaltyPoints 
    ? Math.min(customer.loyaltyPoints, itemTotal - manualDiscount) 
    : 0;
  
  const couponDiscount = selectedCoupon
    ? selectedCoupon.type === "percent"
      ? Math.min(Math.round((itemTotal * selectedCoupon.discount) / 100), selectedCoupon.maxDiscount || Infinity)
      : selectedCoupon.discount
    : 0;
  
  const walletDiscount = useWallet && customer?.walletBalance 
    ? Math.min(walletAmount || customer.walletBalance, itemTotal - manualDiscount - loyaltyDiscount - couponDiscount) 
    : 0;

  const totalDiscount = manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount;
  const subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount);

  // Tax: use per-item computed totals (from product.tax field)
  const sgst = taxTotals.sgst;
  const cgst = taxTotals.cgst;

  const finalTotal = Math.round((subtotalAfterDiscount + sgst + cgst) * 100) / 100;
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - finalTotal) : 0;

  // Apply coupon code
  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode) return;
    
    // Check in customer coupons or general coupons
    const generalCoupons = [
      { code: "FLAT50", description: "₹50 off", discount: 50, minOrder: 500, type: "flat" },
      { code: "SAVE10", description: "10% off (max ₹100)", discount: 10, type: "percent", maxDiscount: 100 },
    ];
    
    const allCoupons = [...(customer?.coupons || []), ...generalCoupons];
    const foundCoupon = allCoupons.find(
      (c) => c.code.toLowerCase() === couponCode.toLowerCase()
    );
    
    if (foundCoupon) {
      if (foundCoupon.minOrder && itemTotal < foundCoupon.minOrder) {
        setCouponError(`Min order ₹${foundCoupon.minOrder} required`);
      } else {
        setSelectedCoupon(foundCoupon);
        setCouponCode("");
      }
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  // handlePayment — CHG-038: Collect Payment API
  // TODO: Wire to API when Flow B (collect payment on existing order) endpoint is provided
  const handlePayment = () => {
    onPaymentComplete({
      method:          showSplit ? 'partial' : paymentMethod,
      finalTotal,
      sgst,
      cgst,
      vatAmount:       0,
      transactionId:   '',
      tip:             0,
      splitPayments:   showSplit ? splitPayments.map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0, transactionId: '' })) : null,
      tabContact:      null,
      // discount info
      discounts: {
        manual:               manualDiscount,
        preset:               presetDiscount,
        total:                totalDiscount,
        orderDiscountPercent: discountType === 'percent' ? parseFloat(discountValue || 0) : 0,
      },
      customer,
      itemTotal,
      subtotal: subtotalAfterDiscount,
    });
  };

  return (
    <div className="flex flex-col h-full" data-testid="collect-payment-panel">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full"
          data-testid="payment-back-btn"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
        </button>
        <span className="font-semibold" style={{ color: COLORS.darkText }}>
          Collect Payment
        </span>
        <span className="ml-auto text-sm" style={{ color: COLORS.grayText }}>
          #D-108219
        </span>
      </div>

      {/* Sticky Bill Summary Header */}
      <div 
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b bg-white"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="bill-summary-header"
      >
        <div className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          📋 BILL SUMMARY
        </div>
        <div className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
          ₹{finalTotal.toLocaleString()}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Bill Items */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="bill-summary-section"
        >
          
          {/* Items List */}
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Items
            </div>
            <div className="space-y-2 pb-3 border-b" style={{ borderColor: COLORS.borderGray }}>
              {(cartItems || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span style={{ color: COLORS.darkText }}>{item.name}</span>
                      <span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
                    </div>
                    {item.customizations && (
                      <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
                        └─ {item.customizations.size}
                        {item.customizations.addons?.length > 0 && ` + ${item.customizations.addons.join(", ")}`}
                      </div>
                    )}
                  </div>
                  <span className="ml-4 font-medium" style={{ color: COLORS.darkText }}>
                    ₹{(item.price * item.qty).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Item Total */}
            <div className="flex justify-between py-2 font-medium">
              <span style={{ color: COLORS.darkText }}>Item Total</span>
              <span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Discounts Section */}
          {totalDiscount > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
                Discounts
              </div>
              <div className="space-y-1.5 text-sm">
                {manualDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat'})
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount.toLocaleString()}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Loyalty Points ({customer?.loyaltyPoints} pts)
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{loyaltyDiscount.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Coupon: {selectedCoupon?.code}
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Wallet
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{walletDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-medium" style={{ color: COLORS.primaryGreen }}>
                  <span>Total Discount</span>
                  <span>-₹{totalDiscount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Subtotal after discounts */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: COLORS.grayText }}>Subtotal</span>
              <span style={{ color: COLORS.darkText }}>₹{subtotalAfterDiscount.toLocaleString()}</span>
            </div>
          </div>

          {/* Taxes */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Taxes
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span style={{ color: COLORS.grayText }}>SGST (2.5%)</span>
                <span style={{ color: COLORS.darkText }}>₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.grayText }}>CGST (2.5%)</span>
                <span style={{ color: COLORS.darkText }}>₹{cgst.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Discount Section - Always visible */}
        <div 
          className="p-3 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="discount-section"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
            <div className="flex gap-2 flex-1 justify-end">
              <select
                value={discountType || ""}
                onChange={(e) => setDiscountType(e.target.value || null)}
                className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray, minWidth: "80px" }}
              >
                <option value="">None</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
              </select>
              {discountType && (
                <input
                  type="number"
                  placeholder={discountType === 'percent' ? "%" : "₹"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: COLORS.borderGray }}
                />
              )}
              {manualDiscount > 0 && (
                <span className="text-sm font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Coupon Section - Only if customer entered */}
        {customer && (
          <div 
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="coupon-section"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🎫 Coupon</span>
              <input
                type="text"
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="coupon-input"
              />
              <button
                onClick={handleApplyCoupon}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                data-testid="apply-coupon-btn"
              >
                Apply
              </button>
            </div>
            {couponError && <div className="text-xs mt-1 ml-16" style={{ color: "#D32F2F" }}>{couponError}</div>}
            {selectedCoupon && (
              <div className="flex items-center justify-between mt-2 px-2 py-1 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}10` }}>
                <span className="text-sm" style={{ color: COLORS.primaryGreen }}>✓ {selectedCoupon.code} (-₹{couponDiscount})</span>
                <button onClick={() => setSelectedCoupon(null)} className="text-xs" style={{ color: COLORS.grayText }}>Remove</button>
              </div>
            )}
          </div>
        )}

        {/* 3. Loyalty Section - Placeholder when customer selected */}
        {customer && (
          <div 
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="loyalty-section"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => setUseLoyalty(e.target.checked)}
                  disabled={!customer?.loyaltyPoints}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50"
                  data-testid="use-loyalty-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>⭐ Loyalty</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>({customer?.loyaltyPoints || 0} pts)</span>
              </div>
              <span className="text-sm font-medium" style={{ color: useLoyalty && loyaltyDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                {useLoyalty && loyaltyDiscount > 0 ? `-₹${loyaltyDiscount}` : customer?.loyaltyPoints > 0 ? `₹${customer.loyaltyPoints} available` : "No points"}
              </span>
            </label>
          </div>
        )}

        {/* 4. Wallet Section - Placeholder when customer selected */}
        {customer && (
          <div 
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="wallet-section"
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  disabled={!customer?.walletBalance}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50"
                  data-testid="use-wallet-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>💰 Wallet</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>(₹{customer?.walletBalance || 0})</span>
              </label>
              <div className="flex items-center gap-2">
                {useWallet && customer?.walletBalance > 0 && (
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(Math.min(parseFloat(e.target.value) || 0, customer.walletBalance))}
                    className="w-16 px-2 py-1 text-sm text-right rounded border"
                    style={{ borderColor: COLORS.borderGray }}
                  />
                )}
                <span className="text-sm font-medium" style={{ color: useWallet && walletDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                  {useWallet && walletDiscount > 0 ? `-₹${walletDiscount}` : customer?.walletBalance > 0 ? "" : "No balance"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="payment-method-section"
        >
          <div className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
            💳 PAYMENT METHOD
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { id: "cash", icon: Banknote, label: "Cash" },
              { id: "card", icon: CreditCard, label: "Card" },
              { id: "upi", icon: Smartphone, label: "UPI" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => { setPaymentMethod(id); setShowSplit(false); setSplitType(null); }}
                className="py-3 px-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors"
                style={{
                  borderColor: paymentMethod === id && !showSplit ? COLORS.primaryGreen : COLORS.borderGray,
                  backgroundColor: paymentMethod === id && !showSplit ? `${COLORS.primaryGreen}10` : "white",
                }}
                data-testid={`payment-${id}-btn`}
              >
                <Icon className="w-5 h-5" style={{ color: paymentMethod === id && !showSplit ? COLORS.primaryGreen : COLORS.grayText }} />
                <span className="text-xs" style={{ color: paymentMethod === id && !showSplit ? COLORS.primaryGreen : COLORS.darkText }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
          
          <div className={isRoom ? "" : "grid grid-cols-2 gap-2"}>
            <button
              onClick={() => { setShowSplit(!showSplit); if (!showSplit) setSplitType("payment"); }}
              className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors w-full"
              style={{
                borderColor: showSplit ? COLORS.primaryGreen : COLORS.borderGray,
                backgroundColor: showSplit ? `${COLORS.primaryGreen}10` : "white",
              }}
              data-testid="payment-split-btn"
            >
              <Split className="w-4 h-4" style={{ color: showSplit ? COLORS.primaryGreen : COLORS.grayText }} />
              <span className="text-xs" style={{ color: showSplit ? COLORS.primaryGreen : COLORS.darkText }}>Split</span>
            </button>
            {!isRoom && (
            <button
              onClick={() => { setPaymentMethod("credit"); setShowSplit(false); setSplitType(null); }}
              className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors"
              style={{
                borderColor: paymentMethod === "credit" && !showSplit ? COLORS.primaryGreen : COLORS.borderGray,
                backgroundColor: paymentMethod === "credit" && !showSplit ? `${COLORS.primaryGreen}10` : "white",
              }}
              data-testid="payment-credit-btn"
            >
              <FileText className="w-4 h-4" style={{ color: paymentMethod === "credit" && !showSplit ? COLORS.primaryGreen : COLORS.grayText }} />
              <span className="text-xs" style={{ color: paymentMethod === "credit" && !showSplit ? COLORS.primaryGreen : COLORS.darkText }}>Credit</span>
            </button>
            )}
          </div>

          {/* Split Options */}
          {showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              {/* Split Type Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSplitType("payment")}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: splitType === "payment" ? COLORS.primaryGreen : COLORS.lightBg,
                    color: splitType === "payment" ? "white" : COLORS.darkText,
                  }}
                >
                  By Payment
                </button>
                <button
                  onClick={() => setSplitType("station")}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: splitType === "station" ? COLORS.primaryGreen : COLORS.lightBg,
                    color: splitType === "station" ? "white" : COLORS.darkText,
                  }}
                >
                  By Station
                </button>
              </div>

              {/* Split by Payment */}
              {splitType === "payment" && (
                <div className="space-y-2">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={sp.method}
                        onChange={(e) => {
                          const newSplit = [...splitPayments];
                          newSplit[idx].method = e.target.value;
                          setSplitPayments(newSplit);
                        }}
                        className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                        style={{ borderColor: COLORS.borderGray }}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={sp.amount}
                        onChange={(e) => {
                          const newSplit = [...splitPayments];
                          newSplit[idx].amount = e.target.value;
                          setSplitPayments(newSplit);
                        }}
                        className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                        style={{ borderColor: COLORS.borderGray }}
                      />
                    </div>
                  ))}
                  <div className="text-xs text-right" style={{ color: COLORS.grayText }}>
                    Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Split by Station */}
              {splitType === "station" && (
                <div className="space-y-3">
                  {/* Bar Items */}
                  {barItems.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>🍺 Bar ({barItems.length} items)</span>
                        <span className="text-sm font-bold" style={{ color: COLORS.primaryOrange }}>₹{barTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-xs mb-2 space-y-0.5" style={{ color: COLORS.grayText }}>
                        {barItems.map((item, idx) => (
                          <div key={idx}>{item.name} x{item.qty}</div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={stationPayments.bar.method}
                          onChange={(e) => setStationPayments({...stationPayments, bar: {...stationPayments.bar, method: e.target.value}})}
                          className="px-2 py-1.5 rounded border text-xs"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <button
                          onClick={() => setStationPayments({...stationPayments, bar: {...stationPayments.bar, paid: true}})}
                          disabled={stationPayments.bar.paid}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          style={{ 
                            backgroundColor: stationPayments.bar.paid ? COLORS.lightBg : COLORS.primaryGreen,
                            color: stationPayments.bar.paid ? COLORS.grayText : "white"
                          }}
                        >
                          {stationPayments.bar.paid ? "✓ Paid" : `Pay ₹${barTotal}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kitchen Items */}
                  {kitchenItems.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>🍳 Kitchen ({kitchenItems.length} items)</span>
                        <span className="text-sm font-bold" style={{ color: COLORS.primaryOrange }}>₹{kitchenTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-xs mb-2 space-y-0.5" style={{ color: COLORS.grayText }}>
                        {kitchenItems.map((item, idx) => (
                          <div key={idx}>{item.name} x{item.qty}</div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={stationPayments.kitchen.method}
                          onChange={(e) => setStationPayments({...stationPayments, kitchen: {...stationPayments.kitchen, method: e.target.value}})}
                          className="px-2 py-1.5 rounded border text-xs"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <button
                          onClick={() => setStationPayments({...stationPayments, kitchen: {...stationPayments.kitchen, paid: true}})}
                          disabled={stationPayments.kitchen.paid}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          style={{ 
                            backgroundColor: stationPayments.kitchen.paid ? COLORS.lightBg : COLORS.primaryGreen,
                            color: stationPayments.kitchen.paid ? COLORS.grayText : "white"
                          }}
                        >
                          {stationPayments.kitchen.paid ? "✓ Paid" : `Pay ₹${kitchenTotal}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash Received */}
          {paymentMethod === "cash" && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              <div className="text-xs mb-2" style={{ color: COLORS.grayText }}>Cash Received</div>
              <input
                type="number"
                placeholder="Amount"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-lg outline-none mb-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="cash-received-input"
              />
              <div className="flex gap-2">
                {[finalTotal, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setAmountReceived(amt.toString())}
                    className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
                    style={{ borderColor: COLORS.borderGray }}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              {change > 0 && (
                <div className="mt-3 text-center py-2 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                  <span className="text-sm" style={{ color: COLORS.grayText }}>Change: </span>
                  <span className="font-bold" style={{ color: COLORS.primaryOrange }}>₹{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pay Button */}
      <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray }}>
        <button
          onClick={handlePayment}
          disabled={(cartItems || []).length === 0}
          className="w-full py-4 rounded-lg font-bold text-lg text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="complete-payment-btn"
        >
          Pay ₹{finalTotal.toLocaleString()}
        </button>
      </div>
    </div>
  );
};

export default CollectPaymentPanel;
