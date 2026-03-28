import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight, LayoutGrid, List, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { mockTables } from "../../data";

const STATUS_CONFIG = {
  available: { label: "Available", color: COLORS.primaryGreen, bgColor: `${COLORS.primaryGreen}15` },
  occupied: { label: "Occupied", color: "#f59e0b", bgColor: "#f59e0b15" },
  reserved: { label: "Reserved", color: "#3b82f6", bgColor: "#3b82f615" },
  billReady: { label: "Bill Ready", color: "#8b5cf6", bgColor: "#8b5cf615" },
  paid: { label: "Paid", color: COLORS.grayText, bgColor: `${COLORS.grayText}15` },
  yetToConfirm: { label: "Pending", color: "#ef4444", bgColor: "#ef444415" },
};

const MergeTableModal = ({ currentTable, onClose, onMerge }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTables, setSelectedTables] = useState([]); // Multi-select
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expandedAreas, setExpandedAreas] = useState(Object.keys(mockTables));
  const [viewMode, setViewMode] = useState("grid");

  // Get all areas
  const areas = useMemo(() => {
    return Object.entries(mockTables).map(([key, area]) => ({
      id: key,
      name: area.name,
      tableCount: area.tables.length,
    }));
  }, []);

  // Get current table data
  const currentTableData = useMemo(() => {
    for (const area of Object.values(mockTables)) {
      const table = area.tables.find((t) => t.id === currentTable?.id);
      if (table) return table;
    }
    return currentTable;
  }, [currentTable]);

  // Filter and organize tables - ONLY show Occupied, Bill Ready, Paid
  const filteredTablesByArea = useMemo(() => {
    const result = {};
    const allowedStatuses = ["occupied", "billReady", "paid"];

    Object.entries(mockTables).forEach(([areaKey, area]) => {
      if (areaFilter !== "all" && areaFilter !== areaKey) return;

      const filteredTables = area.tables.filter((table) => {
        if (table.id === currentTable?.id) return false;
        
        // Only show Occupied, Bill Ready, Paid
        if (!allowedStatuses.includes(table.status)) return false;
        
        if (searchQuery && !table.id.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (statusFilter !== "all" && table.status !== statusFilter) {
          return false;
        }
        return true;
      });

      if (filteredTables.length > 0) {
        result[areaKey] = { ...area, tables: filteredTables };
      }
    });

    return result;
  }, [searchQuery, statusFilter, areaFilter, currentTable]);

  // Toggle table selection (multi-select)
  const toggleTableSelection = (table) => {
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

  // Toggle area expansion
  const toggleArea = (areaKey) => {
    setExpandedAreas((prev) =>
      prev.includes(areaKey) ? prev.filter((k) => k !== areaKey) : [...prev, areaKey]
    );
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

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.available;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="merge-table-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between mb-4">
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
              className="p-3 rounded-xl mb-4"
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
                    {(table.label || table.id)} {table.amount ? `₹${table.amount.toLocaleString()}` : ""}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters Row */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              />
            </div>

            {/* Status Filter - Only Occupied, Bill Ready, Paid */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            >
              <option value="all">All Status</option>
              <option value="occupied">Occupied</option>
              <option value="billReady">Bill Ready</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            >
              <option value="all">All Areas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>

            <div className="flex items-center rounded-lg border" style={{ borderColor: COLORS.borderGray }}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-gray-100" : ""}`}
              >
                <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-gray-100" : ""}`}
              >
                <List className="w-4 h-4" style={{ color: viewMode === "list" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(filteredTablesByArea).length === 0 ? (
            <div className="text-center py-12" style={{ color: COLORS.grayText }}>
              No tables found matching your criteria
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-4">
              {Object.entries(filteredTablesByArea).map(([areaKey, area]) => (
                <div key={areaKey}>
                  <button onClick={() => toggleArea(areaKey)} className="w-full flex items-center gap-2 py-2 text-left">
                    {expandedAreas.includes(areaKey) ? (
                      <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    )}
                    <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                      {area.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                      {area.tables.length} tables
                    </span>
                  </button>

                  {expandedAreas.includes(areaKey) && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {area.tables.map((table) => {
                        const statusConfig = getStatusConfig(table.status);
                        const isSelected = selectedTables.some((t) => t.id === table.id);

                        return (
                          <button
                            key={table.id}
                            onClick={() => toggleTableSelection(table)}
                            className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-md cursor-pointer relative"
                            style={{
                              borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                              backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : "white",
                            }}
                          >
                            {/* Checkmark for selected */}
                            {isSelected && (
                              <div
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: COLORS.primaryGreen }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}

                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm" style={{ color: COLORS.darkText }}>
                                {table.label || table.id}
                              </span>
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: statusConfig.color }}
                                title={statusConfig.label}
                              />
                            </div>
                            <div className="text-xs" style={{ color: COLORS.grayText }}>
                              {table.capacity}-seat
                            </div>
                            <div className="text-xs mt-1" style={{ color: statusConfig.color }}>
                              {table.amount ? `₹${table.amount.toLocaleString()}` : statusConfig.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
              <div
                className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              >
                <span>Select</span>
                <span>Table</span>
                <span>Area</span>
                <span>Status</span>
                <span>Amount</span>
              </div>

              <div className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                {Object.entries(filteredTablesByArea).flatMap(([areaKey, area]) =>
                  area.tables.map((table) => {
                    const statusConfig = getStatusConfig(table.status);
                    const isSelected = selectedTables.some((t) => t.id === table.id);

                    return (
                      <button
                        key={table.id}
                        onClick={() => toggleTableSelection(table)}
                        className="w-full grid grid-cols-5 gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 cursor-pointer"
                        style={{ backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : "transparent" }}
                      >
                        <div>
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center"
                            style={{
                              borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                              backgroundColor: isSelected ? COLORS.primaryGreen : "white",
                            }}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>
                          {table.label || table.id}
                        </span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>
                          {area.name}
                        </span>
                        <span
                          className="text-sm px-2 py-0.5 rounded-full inline-block w-fit"
                          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          {statusConfig.label}
                        </span>
                        <span className="text-sm" style={{ color: COLORS.darkText }}>
                          {table.amount ? `₹${table.amount.toLocaleString()}` : "-"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Just Merge Button */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <button
            onClick={handleMerge}
            disabled={selectedTables.length === 0}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeTableModal;
