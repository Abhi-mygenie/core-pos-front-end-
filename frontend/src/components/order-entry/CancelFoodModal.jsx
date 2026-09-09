import { useState } from "react";
import { X, ChevronDown, Minus, Plus } from "lucide-react";
import { COLORS } from "../../constants";

const CancelFoodModal = ({ item, reasons = [], onClose, onCancel }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  // CR-010: Weight items default to full weight; step by 50gm/ml equivalent
  const isWeight = ['Kg','gm','L','ml'].includes(item?.itemUnit);
  const weightStep = isWeight
    ? ((item.itemUnit === 'Kg' || item.itemUnit === 'L') ? 0.05 : 50)
    : 1;
  const [cancelQty, setCancelQty] = useState(isWeight ? (item?.qty || 1) : 1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const itemQty = item?.qty || 1;
  // CR-010: Always show qty/weight selector for weight items
  const showQtySelector = isWeight || itemQty > 1;

  const decreaseQty = () => {
    const min = isWeight ? weightStep : 1;
    if (cancelQty > min) setCancelQty(Math.round((cancelQty - weightStep) * 100) / 100);
  };
  const increaseQty = () => {
    if (cancelQty < itemQty) setCancelQty(Math.round((cancelQty + weightStep) * 100) / 100);
  };

  const handleCancel = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onCancel({ item, reason: selectedReason, cancelQuantity: cancelQty, remainingQuantity: itemQty - cancelQty });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Cancellation failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
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
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="cancel-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
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
                Select cancellation details
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quantity Selector - Only show if qty > 1 or weight item */}
          {showQtySelector && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                    {isWeight ? 'Current Weight:' : 'Current Quantity:'}
                  </span>
                  <span className="ml-2 font-bold" style={{ color: COLORS.darkText }}>
                    {isWeight
                      ? (itemQty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
                          ? `${Math.round(itemQty * 1000)} ${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
                          : `${parseFloat(itemQty.toFixed(2))} ${item.itemUnit}`)
                      : itemQty}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                    {isWeight ? 'Cancel Weight:' : 'Cancel Qty:'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={decreaseQty}
                      disabled={cancelQty <= weightStep}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}
                      data-testid="cancel-qty-decrease"
                    >
                      <Minus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                    <span
                      className="min-w-[2.5rem] text-center font-bold text-lg"
                      style={{ color: COLORS.primaryOrange }}
                      data-testid="cancel-qty-value"
                    >
                      {isWeight
                        ? (cancelQty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
                            ? `${Math.round(cancelQty * 1000)}`
                            : parseFloat(cancelQty.toFixed(2)))
                        : cancelQty}
                    </span>
                    {isWeight && (
                      <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>
                        {cancelQty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
                          ? (item.itemUnit === 'Kg' ? 'gm' : 'ml')
                          : item.itemUnit}
                      </span>
                    )}
                    <button
                      onClick={increaseQty}
                      disabled={cancelQty >= itemQty}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ backgroundColor: COLORS.borderGray }}
                      data-testid="cancel-qty-increase"
                    >
                      <Plus className="w-4 h-4" style={{ color: COLORS.darkText }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reason Dropdown */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Cancellation Reason
            </label>
            <div className="relative">
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
                style={{ borderColor: COLORS.borderGray }}
                onClick={() => setShowDropdown(!showDropdown)}
                data-testid="reason-dropdown"
              >
                <span style={{ color: selectedReason ? COLORS.darkText : COLORS.grayText }}>
                  {selectedReason ? selectedReason.reasonText : "Select the Reason"}
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
                  {reasons.map((reason) => (
                    <button
                      key={reason.reasonId}
                      onClick={() => { setSelectedReason(reason); setShowDropdown(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      style={{
                        color: COLORS.darkText,
                        backgroundColor: selectedReason?.reasonId === reason.reasonId ? `${COLORS.primaryGreen}10` : "transparent",
                      }}
                      data-testid={`reason-option-${reason.reasonId}`}
                    >
                      {reason.reasonText}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes Textarea */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Additional Notes (Optional)
            </label>
            <textarea
              placeholder="Type here..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full p-4 rounded-xl border resize-none h-28 focus:outline-none focus:ring-2"
              style={{
                borderColor: COLORS.borderGray,
                backgroundColor: COLORS.lightBg,
              }}
              data-testid="cancel-notes-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {/* Cancellation Preview */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm" style={{ color: COLORS.grayText }}>Cancelling: </span>
              <span className="font-semibold" style={{ color: COLORS.darkText }}>
                {showQtySelector ? `${cancelQty} of ${itemQty}` : "1"} {item?.name}
              </span>
            </div>
            {showQtySelector && cancelQty < itemQty && (
              <span className="text-sm" style={{ color: COLORS.primaryGreen }}>
                {itemQty - cancelQty} will remain
              </span>
            )}
          </div>

          {submitError && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {submitError}
            </div>
          )}

          <button
            onClick={handleCancel}
            disabled={!selectedReason || submitting}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#ef4444" }}
            data-testid="cancel-confirm-btn"
          >
            {submitting ? "Cancelling..." : `Cancel ${showQtySelector && cancelQty < itemQty ? `${cancelQty} Item${cancelQty > 1 ? "s" : ""}` : "Item"}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelFoodModal;
