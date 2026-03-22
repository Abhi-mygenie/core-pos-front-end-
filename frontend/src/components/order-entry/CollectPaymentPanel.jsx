import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { COLORS } from "../../constants";
import { usePaymentCalculation, useCustomerLookup, useCouponValidation } from "../../hooks";
import {
  BillSummary,
  RewardsSection,
  PaymentMethodSelector,
  CashInputSection,
  SplitPaymentSection,
} from "../payment";

/**
 * CollectPaymentPanel - Optimized and decomposed
 */
const CollectPaymentPanel = ({ cartItems, total, onBack, onPaymentComplete }) => {
  // Customer lookup hook
  const {
    phone,
    setPhone,
    customerName,
    setCustomerName,
    customer,
    customerStatus,
    handleFindCustomer,
  } = useCustomerLookup();

  // Rewards state
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);

  // Coupon validation hook
  const {
    selectedCoupon,
    couponCode,
    setCouponCode,
    couponError,
    handleApplyCoupon,
    handleSelectCoupon,
  } = useCouponValidation(customer, total);

  // Payment calculation hook
  const {
    subtotal,
    tax,
    loyaltyDiscount,
    walletDiscount,
    couponDiscount,
    totalDiscount,
    finalTotal,
    calculateChange,
    getQuickAmounts,
  } = usePaymentCalculation({
    total,
    customer,
    useLoyalty,
    useWallet,
    walletAmount,
    selectedCoupon,
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "" },
    { method: "card", amount: "" },
  ]);

  const change = calculateChange(amountReceived);

  // Handle payment completion
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
        {/* Bill Summary */}
        <BillSummary
          cartItems={cartItems}
          subtotal={subtotal}
          tax={tax}
        />

        {/* Rewards Section */}
        <RewardsSection
          customer={customer}
          subtotal={subtotal}
          useLoyalty={useLoyalty}
          setUseLoyalty={setUseLoyalty}
          useWallet={useWallet}
          setUseWallet={setUseWallet}
          walletAmount={walletAmount}
          setWalletAmount={setWalletAmount}
          selectedCoupon={selectedCoupon}
          onSelectCoupon={handleSelectCoupon}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          couponError={couponError}
          onApplyCoupon={handleApplyCoupon}
        />

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

        {/* Payment Method Selector */}
        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          showSplit={showSplit}
          setShowSplit={setShowSplit}
        />

        {/* Cash Input Section */}
        {paymentMethod === "cash" && !showSplit && (
          <CashInputSection
            amountReceived={amountReceived}
            setAmountReceived={setAmountReceived}
            finalTotal={finalTotal}
            change={change}
            quickAmounts={getQuickAmounts}
          />
        )}

        {/* Split Payment Section */}
        {showSplit && (
          <SplitPaymentSection
            splitPayments={splitPayments}
            setSplitPayments={setSplitPayments}
            finalTotal={finalTotal}
          />
        )}
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
