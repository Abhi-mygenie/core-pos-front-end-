import { useState, useRef, useEffect } from "react";
import { CreditCard, Banknote, Smartphone, Split, Wallet, ChevronDown, Check } from "lucide-react";
import { COLORS } from "../../constants";

const PAYMENT_OPTIONS = [
  { id: "cash", icon: Banknote, label: "Cash" },
  { id: "card", icon: CreditCard, label: "Card" },
  { id: "upi", icon: Smartphone, label: "UPI" },
];

const OTHER_PAYMENT_METHODS = [
  { id: "pay_later", label: "Pay Later" },
  { id: "m_credit", label: "M-Credit" },
  { id: "dineout", label: "Dineout" },
  { id: "zomato_pay", label: "Zomato Pay" },
  { id: "swiggy_money", label: "Swiggy Money" },
  { id: "eazedine", label: "EazeDine" },
];

/**
 * PaymentMethodSelector - Payment method selection with Wallet and Other dropdown
 */
const PaymentMethodSelector = ({
  paymentMethod,
  setPaymentMethod,
  showSplit,
  setShowSplit,
}) => {
  const [showOtherDropdown, setShowOtherDropdown] = useState(false);
  const [selectedOther, setSelectedOther] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOtherDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOtherSelect = (method) => {
    setSelectedOther(method);
    setPaymentMethod(method.id);
    setShowSplit(false);
    setShowOtherDropdown(false);
  };

  const handleMainPayment = (id) => {
    setPaymentMethod(id);
    setShowSplit(false);
    setSelectedOther(null);
  };

  const handleWallet = () => {
    setPaymentMethod("wallet");
    setShowSplit(false);
    setSelectedOther(null);
  };

  const isOtherSelected = selectedOther && paymentMethod === selectedOther.id;

  return (
    <div data-testid="payment-method-section">
      <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: COLORS.darkText }}>
        <CreditCard className="w-4 h-4" /> Payment Method
      </div>
      
      {/* Main Payment Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {PAYMENT_OPTIONS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleMainPayment(id)}
            className="p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all"
            style={{
              borderColor: !showSplit && !isOtherSelected && paymentMethod === id ? COLORS.primaryGreen : COLORS.borderGray,
              backgroundColor: !showSplit && !isOtherSelected && paymentMethod === id ? `${COLORS.primaryGreen}10` : "white",
            }}
            data-testid={`payment-${id}-btn`}
          >
            <Icon className="w-5 h-5" style={{ color: !showSplit && !isOtherSelected && paymentMethod === id ? COLORS.primaryGreen : COLORS.grayText }} />
            <span className="text-xs" style={{ color: !showSplit && !isOtherSelected && paymentMethod === id ? COLORS.primaryGreen : COLORS.darkText }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary Options: Split, Wallet, Other */}
      <div className="grid grid-cols-3 gap-2">
        {/* Split Button */}
        <button
          onClick={() => { setShowSplit(!showSplit); setSelectedOther(null); }}
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

        {/* Wallet Button */}
        <button
          onClick={handleWallet}
          className="p-2 rounded-lg border flex items-center justify-center gap-2 text-sm"
          style={{
            borderColor: !showSplit && paymentMethod === "wallet" ? COLORS.primaryGreen : COLORS.borderGray,
            backgroundColor: !showSplit && paymentMethod === "wallet" ? `${COLORS.primaryGreen}10` : "white",
            color: !showSplit && paymentMethod === "wallet" ? COLORS.primaryGreen : COLORS.darkText,
          }}
          data-testid="wallet-payment-btn"
        >
          <Wallet className="w-4 h-4" /> Wallet
        </button>

        {/* Other Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowOtherDropdown(!showOtherDropdown)}
            className="w-full p-2 rounded-lg border flex items-center justify-center gap-1 text-sm"
            style={{
              borderColor: isOtherSelected ? COLORS.primaryGreen : COLORS.borderGray,
              backgroundColor: isOtherSelected ? `${COLORS.primaryGreen}10` : "white",
              color: isOtherSelected ? COLORS.primaryGreen : COLORS.darkText,
            }}
            data-testid="other-payment-btn"
          >
            {isOtherSelected ? selectedOther.label : "Other"}
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showOtherDropdown && (
            <>
              <div 
                className="fixed inset-0 bg-black/5" 
                style={{ zIndex: 9998 }}
                onClick={() => setShowOtherDropdown(false)}
              />
              <div 
                className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl overflow-hidden"
                style={{ borderColor: COLORS.borderGray, zIndex: 9999, minWidth: "140px" }}
              >
                {OTHER_PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleOtherSelect(method)}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between"
                    style={{ color: COLORS.darkText }}
                  >
                    {method.label}
                    {selectedOther?.id === method.id && (
                      <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
