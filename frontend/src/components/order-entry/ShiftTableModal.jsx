import { useState } from "react";
import { X } from "lucide-react";
import { COLORS } from "../../constants";
import { mockTables } from "../../data";
import { getModalStatusConfig } from "../../utils/statusHelpers";
import TablePickerGrid from "./TablePickerGrid";

const ALLOWED_STATUSES = ["available"];

const ShiftTableModal = ({ currentTable, onClose, onShift }) => {
  const [selectedTable, setSelectedTable] = useState(null);

  // Handle table selection
  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  // Handle shift
  const handleShift = () => {
    if (!selectedTable) return;
    onShift({
      fromTable: currentTable,
      toTable: selectedTable,
    });
    onClose();
  };

  const statusConfig = selectedTable ? getModalStatusConfig(selectedTable.status) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="shift-table-modal"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="p-5 border-b flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {currentTable?.id} → Shift Table
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select destination table
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Scrollable Content - Table Picker */}
        <div className="flex-1 overflow-y-auto p-5">
          <TablePickerGrid
            currentTable={currentTable}
            allowedStatuses={ALLOWED_STATUSES}
            multiSelect={false}
            selectedTables={selectedTable}
            onSelectTable={handleSelectTable}
          />
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {selectedTable ? (
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm" style={{ color: COLORS.grayText }}>Selected: </span>
                <span className="font-semibold" style={{ color: COLORS.darkText }}>
                  {selectedTable.id}
                </span>
                <span className="text-sm ml-2" style={{ color: COLORS.grayText }}>
                  ({Object.values(mockTables).find(a => a.tables.some(t => t.id === selectedTable.id))?.name}, {selectedTable.capacity}-seat, {statusConfig?.label})
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm mb-3" style={{ color: COLORS.grayText }}>
              Select a table to shift to
            </div>
          )}

          <button
            onClick={handleShift}
            disabled={!selectedTable}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            Shift to {selectedTable?.id || "..."}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftTableModal;
