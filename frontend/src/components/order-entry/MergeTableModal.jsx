import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { COLORS } from "../../constants";
import TablePickerGrid from "./TablePickerGrid";

const ALLOWED_STATUSES = ["occupied", "billReady", "paid"];

const MergeTableModal = ({ currentTable, onClose, onMerge }) => {
  const [selectedTables, setSelectedTables] = useState([]);

  // Get current table data for bill calculation
  const currentTableData = useMemo(() => {
    return currentTable || { amount: 0 };
  }, [currentTable]);

  // Handle table selection (toggle)
  const handleSelectTable = (table) => {
    setSelectedTables((prev) => {
      const exists = prev.find((t) => t.id === table.id);
      if (exists) {
        return prev.filter((t) => t.id !== table.id);
      }
      return [...prev, table];
    });
  };

  // Remove table from selection
  const removeFromSelection = (tableId) => {
    setSelectedTables((prev) => prev.filter((t) => t.id !== tableId));
  };

  // Calculate combined bill
  const combinedBill = useMemo(() => {
    const currentAmount = currentTableData?.amount || 0;
    const selectedAmount = selectedTables.reduce((sum, t) => sum + (t.amount || 0), 0);
    return currentAmount + selectedAmount;
  }, [currentTableData, selectedTables]);

  // Handle merge
  const handleMerge = () => {
    if (selectedTables.length === 0) return;
    onMerge({
      primaryTable: currentTable,
      mergeTables: selectedTables,
      combinedBill,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="merge-table-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="p-5 border-b flex-shrink-0" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {currentTable?.id} → Merge Tables
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select tables to merge (multi-select)
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          {/* Selected Tables Preview */}
          {selectedTables.length > 0 && (
            <div
              className="p-3 rounded-xl mt-4"
              style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>
                  Selected for Merge:
                </span>
                <span className="text-sm font-bold" style={{ color: COLORS.primaryGreen }}>
                  Combined: ₹{combinedBill.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
                >
                  {currentTable?.id} (Current)
                </span>
                {selectedTables.map((table) => (
                  <span
                    key={table.id}
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                    onClick={() => removeFromSelection(table.id)}
                  >
                    {table.id} {table.amount ? `₹${table.amount.toLocaleString()}` : ""}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content - Table Picker */}
        <div className="flex-1 overflow-y-auto p-5">
          <TablePickerGrid
            currentTable={currentTable}
            allowedStatuses={ALLOWED_STATUSES}
            multiSelect={true}
            selectedTables={selectedTables}
            onSelectTable={handleSelectTable}
            onRemoveTable={removeFromSelection}
          />
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <button
            onClick={handleMerge}
            disabled={selectedTables.length === 0}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            Merge {selectedTables.length > 0 ? `(${selectedTables.length + 1} tables)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeTableModal;
