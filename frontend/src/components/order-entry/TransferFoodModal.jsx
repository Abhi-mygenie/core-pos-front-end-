import { useState } from "react";
import { X, Check, Minus, Plus } from "lucide-react";
import { COLORS } from "../../constants";
import TablePickerGrid from "./TablePickerGrid";

const ALLOWED_STATUSES = ["occupied", "billReady"];

const TransferFoodModal = ({ item, currentTable, onClose, onTransfer }) => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [transferQty, setTransferQty] = useState(1);
  const [switchNotes, setSwitchNotes] = useState(true);

  const totalQty = item?.qty || 1;
  const showQtyPicker = totalQty > 1;

  // Handle table selection (toggle single)
  const handleSelectTable = (table) => {
    setSelectedTable((prev) => (prev?.id === table.id ? null : table));
  };

  // Handle transfer
  const handleTransfer = () => {
    if (!selectedTable) return;
    onTransfer({
      item,
      toTable: selectedTable,
      transferQty,
      switchNotes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="transfer-food-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="transfer-modal-backdrop"
      />

      {/* Modal Content */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        data-testid="transfer-modal-content"
      >
        {/* Header - Fixed */}
        <div
          className="p-5 border-b flex-shrink-0"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: COLORS.darkText }}
                data-testid="transfer-modal-title"
              >
                {currentTable?.id} → Transfer {item?.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                {showQtyPicker
                  ? `Select quantity to transfer (total: ${totalQty})`
                  : "Select a table to transfer this item"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="transfer-modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          {/* Selection Preview Chip */}
          {selectedTable && (
            <div
              className="p-3 rounded-xl mt-4"
              style={{
                backgroundColor: `${COLORS.primaryOrange}10`,
                border: `1px solid ${COLORS.primaryOrange}30`,
              }}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-sm font-medium"
                  style={{ color: COLORS.darkText }}
                >
                  Transfer{showQtyPicker ? ` ${transferQty}x` : ""}:
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: COLORS.primaryOrange,
                    color: "white",
                  }}
                >
                  {currentTable?.id} (Current)
                </span>
                <span className="text-sm" style={{ color: COLORS.grayText }}>
                  →
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: COLORS.primaryGreen,
                    color: "white",
                  }}
                >
                  {selectedTable.id}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content - Table Picker */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Quantity Picker - only if qty > 1 */}
          {showQtyPicker && (
            <div className="mb-4">
              <label
                className="text-xs font-semibold uppercase tracking-wide mb-1.5 block"
                style={{ color: COLORS.grayText }}
              >
                Transfer Quantity
              </label>
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ borderColor: COLORS.borderGray }}
              >
                <span className="text-sm" style={{ color: COLORS.darkText }}>
                  Transfer <span className="font-bold">{transferQty}</span> of{" "}
                  {totalQty}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setTransferQty((q) => Math.max(1, q - 1))
                    }
                    disabled={transferQty <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{
                      backgroundColor: COLORS.sectionBg,
                      color: COLORS.darkText,
                    }}
                    data-testid="transfer-qty-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span
                    className="text-lg font-bold w-8 text-center"
                    style={{ color: COLORS.darkText }}
                    data-testid="transfer-qty-value"
                  >
                    {transferQty}
                  </span>
                  <button
                    onClick={() =>
                      setTransferQty((q) => Math.min(totalQty, q + 1))
                    }
                    disabled={transferQty >= totalQty}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{
                      backgroundColor: COLORS.sectionBg,
                      color: COLORS.darkText,
                    }}
                    data-testid="transfer-qty-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <TablePickerGrid
            currentTable={currentTable}
            allowedStatuses={ALLOWED_STATUSES}
            multiSelect={false}
            selectedTables={selectedTable}
            onSelectTable={handleSelectTable}
          />

          {/* Switch Notes Checkbox */}
          <div
            className="flex items-center gap-3 cursor-pointer mt-4"
            onClick={() => setSwitchNotes(!switchNotes)}
            data-testid="switch-notes-checkbox"
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{
                borderColor: switchNotes
                  ? COLORS.primaryGreen
                  : COLORS.borderGray,
                backgroundColor: switchNotes
                  ? COLORS.primaryGreen
                  : "transparent",
              }}
            >
              {switchNotes && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
            <span style={{ color: COLORS.darkText }}>Switch Notes</span>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div
          className="p-4 border-t flex-shrink-0"
          style={{
            borderColor: COLORS.borderGray,
            backgroundColor: COLORS.sectionBg,
          }}
        >
          <button
            onClick={handleTransfer}
            disabled={!selectedTable}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="transfer-to-table-btn"
          >
            Transfer {transferQty > 1 || showQtyPicker ? `${transferQty}x ` : ""}To{" "}
            {selectedTable ? selectedTable.id : "Table"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferFoodModal;
