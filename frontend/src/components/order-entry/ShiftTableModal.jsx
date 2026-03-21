import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight, LayoutGrid, List } from "lucide-react";
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

const ShiftTableModal = ({ currentTable, onClose, onShift }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [expandedAreas, setExpandedAreas] = useState(Object.keys(mockTables));
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

  // Get all areas
  const areas = useMemo(() => {
    return Object.entries(mockTables).map(([key, area]) => ({
      id: key,
      name: area.name,
      tableCount: area.tables.length,
    }));
  }, []);

  // Filter and organize tables - ONLY show Available and Reserved
  const filteredTablesByArea = useMemo(() => {
    const result = {};
    const allowedStatuses = ["available", "reserved"];
    
    Object.entries(mockTables).forEach(([areaKey, area]) => {
      // Filter by area
      if (areaFilter !== "all" && areaFilter !== areaKey) return;

      const filteredTables = area.tables.filter((table) => {
        // Exclude current table
        if (table.id === currentTable?.id) return false;
        
        // Only show Available and Reserved
        if (!allowedStatuses.includes(table.status)) return false;
        
        // Filter by search
        if (searchQuery && !table.id.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        // Filter by status
        if (statusFilter !== "all" && table.status !== statusFilter) {
          return false;
        }
        
        return true;
      });

      if (filteredTables.length > 0) {
        result[areaKey] = {
          ...area,
          tables: filteredTables,
        };
      }
    });

    return result;
  }, [searchQuery, statusFilter, areaFilter, currentTable]);

  // Toggle area expansion
  const toggleArea = (areaKey) => {
    setExpandedAreas((prev) =>
      prev.includes(areaKey)
        ? prev.filter((k) => k !== areaKey)
        : [...prev, areaKey]
    );
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

  // Get status config
  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.available;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="shift-table-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between mb-4">
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

          {/* Filters Row */}
          <div className="flex items-center gap-3">
            {/* Search */}
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

            {/* Status Filter - Only Available and Reserved */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
            </select>

            {/* Area Filter */}
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

            {/* View Toggle */}
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
            // Grid View with Collapsible Areas
            <div className="space-y-4">
              {Object.entries(filteredTablesByArea).map(([areaKey, area]) => (
                <div key={areaKey}>
                  {/* Area Header */}
                  <button
                    onClick={() => toggleArea(areaKey)}
                    className="w-full flex items-center gap-2 py-2 text-left"
                  >
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

                  {/* Tables Grid */}
                  {expandedAreas.includes(areaKey) && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {area.tables.map((table) => {
                        const statusConfig = getStatusConfig(table.status);
                        const isSelected = selectedTable?.id === table.id;
                        const isCurrent = table.id === currentTable?.id;

                        return (
                          <button
                            key={table.id}
                            onClick={() => !isCurrent && setSelectedTable(table)}
                            disabled={isCurrent}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              isCurrent ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                            }`}
                            style={{
                              borderColor: isSelected ? COLORS.primaryOrange : COLORS.borderGray,
                              backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : "white",
                            }}
                          >
                            {/* Table ID + Status Dot */}
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm" style={{ color: COLORS.darkText }}>
                                {table.id}
                              </span>
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: statusConfig.color }}
                                title={statusConfig.label}
                              />
                            </div>

                            {/* Capacity */}
                            <div className="text-xs" style={{ color: COLORS.grayText }}>
                              {table.capacity}-seat
                            </div>

                            {/* Amount or Status */}
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
            // List View
            <div className="border rounded-xl overflow-hidden" style={{ borderColor: COLORS.borderGray }}>
              {/* List Header */}
              <div
                className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              >
                <span>Table</span>
                <span>Area</span>
                <span>Capacity</span>
                <span>Status</span>
                <span>Amount</span>
              </div>

              {/* List Items */}
              <div className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                {Object.entries(filteredTablesByArea).flatMap(([areaKey, area]) =>
                  area.tables.map((table) => {
                    const statusConfig = getStatusConfig(table.status);
                    const isSelected = selectedTable?.id === table.id;
                    const isCurrent = table.id === currentTable?.id;

                    return (
                      <button
                        key={table.id}
                        onClick={() => !isCurrent && setSelectedTable(table)}
                        disabled={isCurrent}
                        className={`w-full grid grid-cols-5 gap-4 px-4 py-3 text-left transition-colors ${
                          isCurrent ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : "transparent",
                        }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>
                          {isCurrent ? `${table.id} ★` : table.id}
                        </span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>
                          {area.name}
                        </span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>
                          {table.capacity}-seat
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

        {/* Footer - Selection Preview + Action */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {selectedTable ? (
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm" style={{ color: COLORS.grayText }}>Selected: </span>
                <span className="font-semibold" style={{ color: COLORS.darkText }}>
                  {selectedTable.id}
                </span>
                <span className="text-sm ml-2" style={{ color: COLORS.grayText }}>
                  ({Object.values(mockTables).find(a => a.tables.some(t => t.id === selectedTable.id))?.name}, {selectedTable.capacity}-seat, {getStatusConfig(selectedTable.status).label})
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
