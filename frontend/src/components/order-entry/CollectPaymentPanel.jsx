import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { COLORS } from "../../constants";
import { usePaymentCalculation, useCustomerLookup, useCouponValidation } from "../../hooks";
import {
  BillSummary,
  PaymentMethodSelector,
  CashInputSection,
  SplitPaymentSection,
} from "../payment";

/**
 * CollectPaymentPanel - With Tip and Service Charge
 * Order: Item Total → Discount → Tip → Service Charge → Taxes → Final
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
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);

  // Manual discount state
  const [manualDiscount, setManualDiscount] = useState({
    type: "none",
    mode: "flat",
    amount: 0,
  });

  // Tip state (flat amount)
  const [tip, setTip] = useState(0);

  // Service charge state
  const [applyServiceCharge, setApplyServiceCharge] = useState(false);

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
    itemTotal,
    foodTotal,
    alcoholTotal,
    manualDiscountAmount,
    loyaltyDiscount,
    couponDiscount,
    totalDiscount,
    afterDiscount,
    tipAmount,
    serviceChargeAmount,
    subtotal,
    sgstAmount,
    cgstAmount,
    vatAmount,
    finalTotal,
    calculateChange,
    getQuickAmounts,
  } = usePaymentCalculation({
    cartItems,
    customer,
    useLoyalty,
    loyaltyPointsToRedeem,
    selectedCoupon,
    manualDiscount,
    tip,
    applyServiceCharge,
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
      itemTotal,
      discounts: { 
        manual: manualDiscountAmount, 
        loyalty: loyaltyDiscount, 
        coupon: couponDiscount 
      },
      totalDiscount,
      tip: tipAmount,
      serviceCharge: serviceChargeAmount,
      subtotal,
      taxes: { sgst: sgstAmount, cgst: cgstAmount, vat: vatAmount },
      total: finalTotal,
      paymentMethod: showSplit ? "split" : paymentMethod,
      splitPayments: showSplit ? splitPayments : null,
    });
  };

  return (
    <div className="flex flex-col h-full" data-testid="collect-payment-panel">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b flex-shrink-0"
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
        {/* Bill Summary with Discount, Tip, Service Charge, Taxes */}
        <BillSummary
          cartItems={cartItems}
          itemTotal={itemTotal}
          foodTotal={foodTotal}
          alcoholTotal={alcoholTotal}
          // Manual Discount
          manualDiscount={manualDiscount}
          onManualDiscountChange={setManualDiscount}
          manualDiscountAmount={manualDiscountAmount}
          // Tip
          tip={tip}
          onTipChange={setTip}
          tipAmount={tipAmount}
          // Service Charge
          applyServiceCharge={applyServiceCharge}
          onServiceChargeChange={setApplyServiceCharge}
          serviceChargeAmount={serviceChargeAmount}
          // Loyalty
          customer={customer}
          useLoyalty={useLoyalty}
          setUseLoyalty={setUseLoyalty}
          loyaltyPointsToRedeem={loyaltyPointsToRedeem}
          setLoyaltyPointsToRedeem={setLoyaltyPointsToRedeem}
          loyaltyDiscount={loyaltyDiscount}
          // Coupon
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          onApplyCoupon={handleApplyCoupon}
          selectedCoupon={selectedCoupon}
          couponError={couponError}
          couponDiscount={couponDiscount}
          // Totals
          totalDiscount={totalDiscount}
          subtotal={subtotal}
          sgstAmount={sgstAmount}
          cgstAmount={cgstAmount}
          vatAmount={vatAmount}
          finalTotal={finalTotal}
        />

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
      <div className="p-0 flex-shrink-0">
        <button
          onClick={handlePayment}
          className="w-full py-4 font-semibold text-white text-lg"
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
