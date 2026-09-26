import { useEffect } from "react";
import { X, Check } from "lucide-react";
import { COLORS } from "../../constants";

const OrderPlacedModal = ({ onClose, autoCloseDelay = 2000 }) => {
  // Auto-close after delay
  useEffect(() => {
    if (autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoCloseDelay, onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="order-placed-modal"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="order-placed-backdrop"
      />

      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-8 flex flex-col items-center"
        data-testid="order-placed-content"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
          data-testid="order-placed-close-btn"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>

        {/* Success Icon */}
        <div 
          className="w-24 h-24 rounded-full border-4 flex items-center justify-center mb-6"
          style={{ borderColor: COLORS.primaryGreen }}
          data-testid="order-placed-icon"
        >
          <Check 
            className="w-12 h-12" 
            style={{ color: COLORS.primaryGreen }}
            strokeWidth={3}
          />
        </div>

        {/* Success Text */}
        <h2 
          className="text-2xl font-semibold"
          style={{ color: COLORS.darkText }}
          data-testid="order-placed-text"
        >
          Order Placed
        </h2>
      </div>
    </div>
  );
};

export default OrderPlacedModal;
