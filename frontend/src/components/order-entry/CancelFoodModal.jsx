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
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="cancel-modal-content"
      >
        {/* Header */}
        <div
          className="p-5 border-b flex-shrink-0"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: COLORS.darkText }}
                data-testid="cancel-modal-title"
              >
                Cancel {item?.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select a reason for cancellation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="cancel-modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Reason Dropdown */}
          <div className="relative">
            <label
              className="text-xs font-semibold uppercase tracking-wide mb-1.5 block"
              style={{ color: COLORS.grayText }}
            >
              Reason
            </label>
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors hover:border-gray-300"
              style={{ borderColor: showDropdown ? COLORS.primaryOrange : COLORS.borderGray }}
              onClick={() => setShowDropdown(!showDropdown)}
              data-testid="reason-dropdown"
            >
              <span
                style={{
                  color: selectedReason ? COLORS.darkText : COLORS.grayText,
                }}
              >
                {selectedReason ? selectedReason.label : "Select the Reason"}
              </span>
              <ChevronDown
                className={`w-5 h-5 transition-transform ${showDropdown ? "rotate-180" : ""}`}
                style={{ color: COLORS.grayText }}
              />
            </div>

            {/* Dropdown List */}
            {showDropdown && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto z-10"
                style={{ borderColor: COLORS.borderGray }}
              >
                {cancellationReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => {
                      setSelectedReason(reason);
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    style={{
                      color: COLORS.darkText,
                      backgroundColor:
                        selectedReason?.id === reason.id
                          ? `${COLORS.primaryGreen}10`
                          : "transparent",
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
            <label
              className="text-xs font-semibold uppercase tracking-wide mb-1.5 block"
              style={{ color: COLORS.grayText }}
            >
              Additional Notes
            </label>
            <textarea
              placeholder="Type here.."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full p-4 rounded-xl border resize-none h-32 focus:outline-none focus:ring-2"
              style={{
                borderColor: COLORS.borderGray,
                backgroundColor: COLORS.lightBg,
                focusRingColor: COLORS.primaryOrange,
              }}
              data-testid="cancel-notes-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-4 border-t flex-shrink-0"
          style={{
            borderColor: COLORS.borderGray,
            backgroundColor: COLORS.sectionBg,
          }}
        >
          <button
            onClick={handleCancel}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors hover:opacity-90"
            style={{ backgroundColor: COLORS.errorText }}
            data-testid="cancel-item-btn"
          >
            Cancel Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelFoodModal;
