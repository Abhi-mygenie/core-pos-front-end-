import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, LayoutGrid, List, Check } from "lucide-react";
import { COLORS } from "../../constants";
import { mockTables } from "../../data";
import { getModalStatusConfig } from "../../utils/statusHelpers";

/**
 * Shared TablePickerGrid component for Shift and Merge table modals
 * @param {Object} currentTable - The current/source table
 * @param {Array} allowedStatuses - Array of status strings that are allowed to be shown
 * @param {boolean} multiSelect - Whether to allow multiple table selection
 * @param {Array|Object} selectedTables - Selected table(s) - array for multiSelect, object for single
 * @param {Function} onSelectTable - Callback when table is selected
 * @param {Function} onRemoveTable - Callback when table is removed from selection (multiSelect only)
 */
const TablePickerGrid = ({
  currentTable,
  allowedStatuses,
  multiSelect = false,
  selectedTables,
  onSelectTable,
  onRemoveTable,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter and organize tables
  const filteredTablesByArea = useMemo(() => {
    const result = {};

    Object.entries(mockTables).forEach(([areaKey, area]) => {
      if (areaFilter !== "all" && areaFilter !== areaKey) return;

      const filteredTables = area.tables.filter((table) => {
        // Exclude current table
        if (table.id === currentTable?.id) return false;

        // Only show allowed statuses
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
        result[areaKey] = { ...area, tables: filteredTables };
      }
    });

    return result;
  }, [searchQuery, statusFilter, areaFilter, currentTable, allowedStatuses]);

  // Toggle area expansion
  const toggleArea = (areaKey) => {
    setExpandedAreas((prev) =>
      prev.includes(areaKey) ? prev.filter((k) => k !== areaKey) : [...prev, areaKey]
    );
  };

  // Check if a table is selected
  const isSelected = (tableId) => {
    if (multiSelect) {
      return selectedTables?.some((t) => t.id === tableId);
    }
    return selectedTables?.id === tableId;
  };

  // Handle table click
  const handleTableClick = (table) => {
    onSelectTable(table);
  };

  return (
    <>
      {/* Filters Row */}
      <div className="flex items-center gap-3 mb-4">
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

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
          style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        >
          <option value="all">All Status</option>
          {allowedStatuses.map((status) => (
            <option key={status} value={status}>
              {getModalStatusConfig(status).label}
            </option>
          ))}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
                      const statusConfig = getModalStatusConfig(table.status);
                      const selected = isSelected(table.id);
                      const isCurrent = table.id === currentTable?.id;
                      const borderColor = multiSelect
                        ? (selected ? COLORS.primaryGreen : COLORS.borderGray)
                        : (selected ? COLORS.primaryOrange : COLORS.borderGray);
                      const bgColor = multiSelect
                        ? (selected ? `${COLORS.primaryGreen}10` : "white")
                        : (selected ? `${COLORS.primaryOrange}10` : "white");

                      return (
                        <button
                          key={table.id}
                          onClick={() => !isCurrent && handleTableClick(table)}
                          disabled={isCurrent}
                          className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                            isCurrent ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                          }`}
                          style={{ borderColor, backgroundColor: bgColor }}
                        >
                          {/* Checkmark for multiSelect */}
                          {multiSelect && selected && (
                            <div
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: COLORS.primaryGreen }}
                            >
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}

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
              className={`grid gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide ${multiSelect ? "grid-cols-5" : "grid-cols-5"}`}
              style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
            >
              {multiSelect && <span>Select</span>}
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
                  const statusConfig = getModalStatusConfig(table.status);
                  const selected = isSelected(table.id);
                  const isCurrent = table.id === currentTable?.id;
                  const bgColor = selected
                    ? (multiSelect ? `${COLORS.primaryGreen}10` : `${COLORS.primaryOrange}10`)
                    : "transparent";

                  return (
                    <button
                      key={table.id}
                      onClick={() => !isCurrent && handleTableClick(table)}
                      disabled={isCurrent}
                      className={`w-full grid gap-4 px-4 py-3 text-left transition-colors ${
                        isCurrent ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 cursor-pointer"
                      } ${multiSelect ? "grid-cols-5" : "grid-cols-5"}`}
                      style={{ backgroundColor: bgColor }}
                    >
                      {multiSelect && (
                        <div>
                          <div
                            className="w-5 h-5 rounded border-2 flex items-center justify-center"
                            style={{
                              borderColor: selected ? COLORS.primaryGreen : COLORS.borderGray,
                              backgroundColor: selected ? COLORS.primaryGreen : "white",
                            }}
                          >
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      )}
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
    </>
  );
};

export default TablePickerGrid;
