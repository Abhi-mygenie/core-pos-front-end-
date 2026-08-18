// BUG-298 / BUG-299: qty-aware complementary modal — mirrors CancelFoodModal pattern
import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { COLORS } from "../../constants";

const MarkCompModal = ({ item, onClose, onMark }) => {
  const itemQty = item?.qty || 1;
  const existing = item?.compQty || 0;
  const [compQty, setCompQty] = useState(
    existing > 0 ? existing : itemQty
  );

  const decrease = () => { if (compQty > 0) setCompQty(q => q - 1); };
  const increase = () => { if (compQty < itemQty) setCompQty(q => q + 1); };

  const handleConfirm = () => {
    onMark({ item, compQty });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="mark-comp-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="comp-modal-backdrop"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="comp-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }} data-testid="comp-modal-title">
                Mark Complementary
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                {item?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="comp-modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Qty selector — only when qty > 1 */}
          {itemQty > 1 && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                    Current Quantity:
                  </span>
                  <span className="ml-2 font-bold" style={{ color: COLORS.darkText }}>
                    {itemQty}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                    Comp Qty:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={decrease}
                      disabled={compQty <= 0}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}
                      data-testid="comp-qty-decrease"
                    >
                      <Minus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                    <span
                      className="min-w-[2.5rem] text-center font-bold text-lg"
                      style={{ color: compQty === 0 ? COLORS.grayText : COLORS.primaryGreen }}
                      data-testid="comp-qty-value"
                    >
                      {compQty}
                    </span>
                    <button
                      onClick={increase}
                      disabled={compQty >= itemQty}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}
                      data-testid="comp-qty-increase"
                    >
                      <Plus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                  </div>
                </div>
              </div>
              {compQty > 0 && compQty < itemQty && (
                <p className="text-xs mt-2" style={{ color: COLORS.grayText }}>
                  {compQty} complimentary (₹0) · {itemQty - compQty} remain charged normally
                </p>
              )}
              {compQty === 0 && existing > 0 && (
                <p className="text-xs mt-2" style={{ color: '#F59E0B' }}>
                  Set to 0 to remove complementary entirely
                </p>
              )}
            </div>
          )}

          {/* Single-qty info */}
          {itemQty === 1 && (
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              {existing > 0
                ? 'This item is currently marked complementary. Confirm to remove it.'
                : 'This item will be marked complimentary (₹0).'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors"
            style={{ backgroundColor: compQty === 0 ? '#6B7280' : COLORS.primaryGreen }}
            data-testid="mark-comp-confirm-btn"
          >
            {compQty === 0
              ? 'Remove Complementary'
              : `Mark ${compQty === itemQty ? 'All' : compQty} Complementary`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkCompModal;
