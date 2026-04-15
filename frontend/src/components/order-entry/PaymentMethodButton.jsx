/**
 * PaymentMethodButton Component
 * 
 * Reusable button for payment methods.
 * Uses the payment methods registry for consistent rendering.
 */

import { PAYMENT_METHODS } from "../../config/paymentMethods";
import { COLORS } from "../../constants";

/**
 * PaymentMethodButton - Renders a single payment method button
 * 
 * @param {string} methodId - Payment method ID from registry
 * @param {boolean} isSelected - Whether this method is currently selected
 * @param {function} onClick - Click handler
 * @param {boolean} disabled - Whether button is disabled
 * @param {string} accentColor - Override accent color (default: primaryGreen)
 */
const PaymentMethodButton = ({ 
  methodId, 
  isSelected = false, 
  onClick, 
  disabled = false,
  accentColor = COLORS.primaryGreen 
}) => {
  const method = PAYMENT_METHODS[methodId];
  
  if (!method) {
    console.warn(`[PaymentMethodButton] Unknown method ID: ${methodId}`);
    return null;
  }

  const { icon: Icon, label } = method;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="py-3 px-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors disabled:opacity-50"
      style={{
        borderColor: isSelected ? accentColor : COLORS.borderGray,
        backgroundColor: isSelected ? `${accentColor}10` : "white",
      }}
      data-testid={`payment-${methodId}-btn`}
    >
      <Icon 
        className="w-5 h-5" 
        style={{ color: isSelected ? accentColor : COLORS.grayText }} 
      />
      <span 
        className="text-xs" 
        style={{ color: isSelected ? accentColor : COLORS.darkText }}
      >
        {label}
      </span>
    </button>
  );
};

/**
 * PaymentMethodButtonInline - Renders a compact inline button (for row 2)
 */
export const PaymentMethodButtonInline = ({ 
  methodId, 
  isSelected = false, 
  onClick, 
  disabled = false,
  accentColor = COLORS.primaryGreen 
}) => {
  const method = PAYMENT_METHODS[methodId];
  
  if (!method) {
    console.warn(`[PaymentMethodButtonInline] Unknown method ID: ${methodId}`);
    return null;
  }

  const { icon: Icon, label } = method;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors w-full disabled:opacity-50"
      style={{
        borderColor: isSelected ? accentColor : COLORS.borderGray,
        backgroundColor: isSelected ? `${accentColor}10` : "white",
      }}
      data-testid={`payment-${methodId}-btn`}
    >
      <Icon 
        className="w-4 h-4" 
        style={{ color: isSelected ? accentColor : COLORS.grayText }} 
      />
      <span 
        className="text-xs" 
        style={{ color: isSelected ? accentColor : COLORS.darkText }}
      >
        {label}
      </span>
    </button>
  );
};

export default PaymentMethodButton;
