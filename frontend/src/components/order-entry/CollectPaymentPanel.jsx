import { useState } from "react";
import { ChevronLeft, Search, Star, CreditCard, Smartphone, Banknote, Split, FileText } from "lucide-react";
import { COLORS } from "../../constants";

// Mock customer database
const mockCustomers = {
  "9876543210": {
    id: "C001",
    name: "Rahul Sharma",
    phone: "9876543210",
    tier: "Gold",
    loyaltyPoints: 450,
    walletBalance: 350,
    coupons: [
      { code: "FLAT50", description: "₹50 off", discount: 50, minOrder: 500 },
      { code: "WEEKEND20", description: "20% off (max ₹100)", discount: 20, type: "percent", maxDiscount: 100 },
    ],
  },
  "9123456789": {
    id: "C002",
    name: "Priya Patel",
    phone: "9123456789",
    tier: "Silver",
    loyaltyPoints: 120,
    walletBalance: 0,
    coupons: [],
  },
};

const CollectPaymentPanel = ({ cartItems, total, onBack, onPaymentComplete }) => {
  // Customer state
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerStatus, setCustomerStatus] = useState(null); // null, 'found', 'new'

  // Rewards state
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "" },
    { method: "card", amount: "" },
  ]);

  // Calculate bill
  const subtotal = total;
  const taxRate = 0.05;
  const tax = Math.round(subtotal * taxRate);
  
  // Calculate discounts
  const loyaltyDiscount = useLoyalty && customer ? Math.min(customer.loyaltyPoints, subtotal) : 0;
  const walletDiscount = useWallet && customer ? Math.min(walletAmount || customer.walletBalance, subtotal - loyaltyDiscount) : 0;
  
  let couponDiscount = 0;
  if (selectedCoupon) {
    if (selectedCoupon.type === "percent") {
      couponDiscount = Math.min(
        Math.round((subtotal * selectedCoupon.discount) / 100),
        selectedCoupon.maxDiscount || Infinity
      );
    } else {
      couponDiscount = selectedCoupon.discount;
    }
  }

  const totalDiscount = loyaltyDiscount + walletDiscount + couponDiscount;
  const finalTotal = Math.max(0, subtotal + tax - totalDiscount);
  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - finalTotal) : 0;

  // Find customer
  const handleFindCustomer = () => {
    if (phone.length >= 10) {
      const found = mockCustomers[phone];
      if (found) {
        setCustomer(found);
        setCustomerName(found.name);
        setCustomerStatus("found");
        setWalletAmount(found.walletBalance);
      } else {
        setCustomer(null);
        setCustomerStatus("new");
      }
    }
  };

  // Apply coupon code
  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode) return;
    
    const foundCoupon = customer?.coupons?.find(
      (c) => c.code.toLowerCase() === couponCode.toLowerCase()
    );
    
    if (foundCoupon) {
      if (foundCoupon.minOrder && subtotal < foundCoupon.minOrder) {
        setCouponError(`Min order ₹${foundCoupon.minOrder} required`);
      } else {
        setSelectedCoupon(foundCoupon);
        setCouponCode("");
      }
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  // Handle payment
  const handlePayment = () => {
    onPaymentComplete({
      customer: customer || { name: customerName, phone },
      subtotal,
      tax,
      discounts: { loyalty: loyaltyDiscount, wallet: walletDiscount, coupon: couponDiscount },
      total: finalTotal,
      paymentMethod: showSplit ? "split" : paymentMethod,
      splitPayments: showSplit ? splitPayments : null,
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
          className="p-1 hover:bg-gray-100 rounded-full"
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Customer Section */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.lightBg }}
          data-testid="customer-section"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>
              👤 Customer
            </span>
            {customerStatus === "found" && (
              <span 
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${COLORS.primaryGreen}20`, color: COLORS.primaryGreen }}
              >
                ✓ Found
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
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                onBlur={handleFindCustomer}
                className="flex-1 outline-none text-sm"
                data-testid="customer-phone-input"
              />
            </div>
            <button
              onClick={handleFindCustomer}
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
            onChange={(e) => setCustomerName(e.target.value)}
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
                <Star className="w-3 h-3" /> {customer.tier}
              </span>
              <span style={{ color: COLORS.darkText }}>
                ⭐ {customer.loyaltyPoints} pts
              </span>
              <span style={{ color: COLORS.darkText }}>
                💰 ₹{customer.walletBalance}
              </span>
              <span style={{ color: COLORS.darkText }}>
                🎟️ {customer.coupons.length}
              </span>
            </div>
          )}
        </div>

        {/* Bill Summary */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="bill-summary-section"
        >
          <div className="text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
            📋 Bill Summary
          </div>
          <div className="space-y-2 text-sm">
            {(cartItems || []).map((item, idx) => (
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

        {/* Apply Rewards Section */}
        {customer && (
          <div 
            className="p-4 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="rewards-section"
          >
            <div className="text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
              🎁 Apply Rewards
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
                  <span className="text-sm" style={{ color: COLORS.darkText }}>
                    ⭐ Use Loyalty ({customer.loyaltyPoints} pts)
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
                  <span className="text-sm" style={{ color: COLORS.darkText }}>
                    💰 Use Wallet (₹{customer.walletBalance})
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
                        onChange={() => setSelectedCoupon(selectedCoupon?.code === coupon.code ? null : coupon)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm" style={{ color: COLORS.darkText }}>
                        🎟️ {coupon.code}
                      </span>
                      <span className="text-xs" style={{ color: COLORS.grayText }}>
                        {coupon.description}
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
                onClick={handleApplyCoupon}
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
        )}

        {/* Discount Summary */}
        {totalDiscount > 0 && (
          <div className="flex justify-between px-4 py-2 rounded-lg" style={{ backgroundColor: `${COLORS.primaryGreen}10` }}>
            <span className="text-sm" style={{ color: COLORS.primaryGreen }}>Total Discount</span>
            <span className="text-sm font-medium" style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount}</span>
          </div>
        )}

        {/* Total */}
        <div 
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: COLORS.sectionBg }}
        >
          <div className="text-sm" style={{ color: COLORS.grayText }}>TOTAL TO PAY</div>
          <div className="text-3xl font-bold" style={{ color: COLORS.primaryGreen }}>
            ₹{finalTotal}
          </div>
        </div>

        {/* Payment Method */}
        <div data-testid="payment-method-section">
          <div className="text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
            💳 Payment Method
          </div>
          
          {/* Main Payment Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { id: "cash", icon: Banknote, label: "Cash" },
              { id: "card", icon: CreditCard, label: "Card" },
              { id: "upi", icon: Smartphone, label: "UPI" },
            ].map(({ id, icon: Icon, label }) => (
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

          {/* Cash - Amount & Change */}
          {paymentMethod === "cash" && !showSplit && (
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
                {[finalTotal, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].map((amt) => (
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
          )}

          {/* Split Payment */}
          {showSplit && (
            <div className="mt-4 p-3 rounded-lg border space-y-3" style={{ borderColor: COLORS.borderGray }}>
              {splitPayments.map((sp, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={sp.method}
                    onChange={(e) => {
                      const updated = [...splitPayments];
                      updated[idx].method = e.target.value;
                      setSplitPayments(updated);
                    }}
                    className="px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: COLORS.borderGray }}
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={sp.amount}
                    onChange={(e) => {
                      const updated = [...splitPayments];
                      updated[idx].amount = e.target.value;
                      setSplitPayments(updated);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: COLORS.borderGray }}
                  />
                </div>
              ))}
              <button
                onClick={() => setSplitPayments([...splitPayments, { method: "cash", amount: "" }])}
                className="text-sm flex items-center gap-1"
                style={{ color: COLORS.primaryOrange }}
              >
                + Add Payment Split
              </button>
              <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.grayText }}>Total Covered</span>
                  <span style={{ color: COLORS.darkText }}>
                    ₹{splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)} / ₹{finalTotal}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pay Button */}
      <div className="p-0">
        <button
          onClick={handlePayment}
          className="w-full py-4 font-semibold text-white text-lg"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="complete-payment-btn"
        >
          Pay ₹{finalTotal}
        </button>
      </div>
    </div>
  );
};

export default CollectPaymentPanel;
