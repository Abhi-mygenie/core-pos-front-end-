import { useState } from "react";
import { X, Search, ChevronDown, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { availableTables } from "../../data";

const TransferFoodModal = ({ item, currentTable, onClose, onTransfer }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [switchNotes, setSwitchNotes] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter out current table and filter by search
  const filteredTables = availableTables.filter(
    (table) =>
      table.id !== currentTable?.id &&
      table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle transfer
  const handleTransfer = () => {
    if (!selectedTable) return;
    onTransfer({
      item,
      toTable: selectedTable,
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
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="transfer-modal-content"
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-start justify-between">
            <div>
              <h2 
                className="text-xl font-semibold"
                style={{ color: COLORS.darkText }}
                data-testid="transfer-modal-title"
              >
                Transfer {item?.name} to
              </h2>
              <p 
                className="text-sm mt-1"
                style={{ color: COLORS.grayText }}
              >
                Size Table
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              data-testid="transfer-modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Search Dropdown */}
          <div className="relative">
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-full border cursor-pointer"
              style={{ borderColor: COLORS.borderGray }}
              onClick={() => setShowDropdown(!showDropdown)}
              data-testid="table-search-dropdown"
            >
              <Search className="w-5 h-5" style={{ color: COLORS.grayText }} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                className="flex-1 outline-none bg-transparent"
                style={{ color: COLORS.darkText }}
                onClick={(e) => e.stopPropagation()}
                data-testid="table-search-input"
              />
              <ChevronDown 
                className={`w-5 h-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                style={{ color: COLORS.grayText }} 
              />
            </div>

            {/* Dropdown List */}
            {showDropdown && searchQuery && (
              <div 
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border max-h-48 overflow-y-auto z-10"
                style={{ borderColor: COLORS.borderGray }}
              >
                {filteredTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table);
                      setSearchQuery("");
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
                    data-testid={`dropdown-table-${table.id}`}
                  >
                    <span style={{ color: COLORS.darkText }}>{table.name}</span>
                    {selectedTable?.id === table.id && (
                      <Check className="w-4 h-4" style={{ color: COLORS.primaryGreen }} />
                    )}
                  </button>
                ))}
                {filteredTables.length === 0 && (
                  <div className="px-4 py-3 text-center" style={{ color: COLORS.grayText }}>
                    No tables found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Table Grid */}
          <div 
            className="grid grid-cols-3 gap-3"
            data-testid="table-grid"
          >
            {filteredTables.slice(0, 9).map((table) => (
              <button
                key={table.id}
                onClick={() => setSelectedTable(table)}
                className="py-4 px-3 rounded-lg border-2 text-center font-medium transition-all hover:shadow-md"
                style={{
                  borderColor: selectedTable?.id === table.id ? COLORS.primaryGreen : COLORS.borderGray,
                  backgroundColor: selectedTable?.id === table.id ? `${COLORS.primaryGreen}10` : COLORS.lightBg,
                  color: selectedTable?.id === table.id ? COLORS.primaryGreen : COLORS.darkText,
                }}
                data-testid={`table-btn-${table.id}`}
              >
                {table.name}
              </button>
            ))}
          </div>

          {/* Switch Notes Checkbox */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setSwitchNotes(!switchNotes)}
            data-testid="switch-notes-checkbox"
          >
            <div
              className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
              style={{
                borderColor: switchNotes ? COLORS.primaryGreen : COLORS.borderGray,
                backgroundColor: switchNotes ? COLORS.primaryGreen : "transparent",
              }}
            >
              {switchNotes && (
                <Check className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            <span style={{ color: COLORS.darkText }}>Switch Notes</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-0">
          <button
            onClick={handleTransfer}
            disabled={!selectedTable}
            className="w-full py-4 font-semibold text-white text-lg transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="transfer-to-table-btn"
          >
            Transfer To Table
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferFoodModal;
