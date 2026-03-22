import { X, Copy, Edit3 } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * AddQuantityModal - Prompt when increasing quantity of customized items
 * Asks user to either duplicate with same customization or create new customization
 */
const AddQuantityModal = ({ item, onClose, onSameCustomization, onNewCustomization }) => {
  // Get customization summary
  const getCustomizationSummary = () => {
    if (!item?.customizations) return "";
    const parts = [];
    if (item.customizations.size) parts.push(item.customizations.size);
    if (item.customizations.crust) parts.push(item.customizations.crust);
    if (item.customizations.base) parts.push(item.customizations.base);
    if (item.customizations.spice) parts.push(item.customizations.spice);
    if (item.customizations.addons?.length > 0) {
      parts.push(...item.customizations.addons);
    }
    return parts.join(", ");
  };

  const customizationSummary = getCustomizationSummary();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="add-quantity-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
              Add {item?.name}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="add-qty-modal-close"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="p-4 space-y-3">
          {/* Same Customization Option */}
          <button
            onClick={onSameCustomization}
            className="w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="same-customization-btn"
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${COLORS.primaryGreen}15` }}
              >
                <Copy className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium" style={{ color: COLORS.darkText }}>
                  Same Customization
                </div>
                <div className="text-sm mt-0.5 truncate" style={{ color: COLORS.primaryGreen }}>
                  {customizationSummary || "Default options"}
                </div>
              </div>
            </div>
          </button>

          {/* New Customization Option */}
          <button
            onClick={onNewCustomization}
            className="w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="new-customization-btn"
          >
            <div className="flex items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${COLORS.primaryOrange}15` }}
              >
                <Edit3 className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
              </div>
              <div className="flex-1">
                <div className="font-medium" style={{ color: COLORS.darkText }}>
                  New Customization
                </div>
                <div className="text-sm mt-0.5" style={{ color: COLORS.grayText }}>
                  Choose different options
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuantityModal;
