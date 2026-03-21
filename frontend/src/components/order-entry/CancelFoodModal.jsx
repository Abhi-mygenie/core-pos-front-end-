import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";
import { cancellationReasons } from "../../data";

const CancelFoodModal = ({ item, onClose, onCancel }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Handle cancel
  const handleCancel = () => {
    onCancel({
      item,
      reason: selectedReason,
      notes: additionalNotes,
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="cancel-food-modal"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="cancel-modal-backdrop"
      />

      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="cancel-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-start justify-between">
            <h2 
              className="text-xl font-semibold"
              style={{ color: COLORS.darkText }}
              data-testid="cancel-modal-title"
            >
              Cancel {item?.name}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="cancel-modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Reason Dropdown */}
          <div className="relative">
            <div 
              className="flex items-center justify-between px-4 py-3 rounded-full border cursor-pointer"
              style={{ borderColor: COLORS.borderGray }}
              onClick={() => setShowDropdown(!showDropdown)}
              data-testid="reason-dropdown"
            >
              <span style={{ color: selectedReason ? COLORS.darkText : COLORS.grayText }}>
                {selectedReason ? selectedReason.label : "Select the Reason"}
              </span>
              <ChevronDown 
                className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                style={{ color: COLORS.grayText }} 
              />
            </div>

            {/* Dropdown List */}
            {showDropdown && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-48 overflow-y-auto z-10"
                style={{ borderColor: COLORS.borderGray }}
              >
                {cancellationReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => {
                      setSelectedReason(reason);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    style={{ 
                      color: COLORS.darkText,
                      backgroundColor: selectedReason?.id === reason.id ? `${COLORS.primaryGreen}10` : "transparent",
                    }}
                    data-testid={`reason-option-${reason.id}`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Additional Notes Textarea */}
          <div>
            <textarea
              placeholder="Type here.."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full p-4 rounded-lg border resize-none h-32 focus:outline-none focus:ring-2"
              style={{ 
                borderColor: COLORS.borderGray,
                backgroundColor: COLORS.lightBg,
              }}
              data-testid="cancel-notes-input"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="p-0">
          <button
            onClick={handleCancel}
            className="w-full py-4 font-semibold text-white text-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="cancel-item-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelFoodModal;
