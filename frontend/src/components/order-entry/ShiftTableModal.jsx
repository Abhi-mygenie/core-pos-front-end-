import { useState, useEffect, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight, LayoutGrid, List, Loader } from "lucide-react";
import { COLORS } from "../../constants";
import { getTables } from "../../api/services/tableService";
import { TABLE_STATUS } from "../../api/constants";

const ShiftTableModal = ({ currentTable, onClose, onShift }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTable, setSelectedTable] = useState(null);
  const [areaFilter, setAreaFilter] = useState("all");
  const [expandedAreas, setExpandedAreas] = useState([]);
  const [viewMode, setViewMode] = useState("grid");

  // Live API state
  const [availableTables, setAvailableTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch fresh table list on modal open (multi-user: real-time availability)
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        setError(null);
        const tables = await getTables(true); // tablesOnly=true excludes rooms
        // Filter: only free tables (engage=No), exclude current table
        const free = tables.filter(
          (t) => t.status === TABLE_STATUS.FREE && t.tableId !== currentTable?.tableId
        );
        setAvailableTables(free);
        // Auto-expand all areas
        const areas = [...new Set(free.map((t) => t.sectionName || "Default"))];
        setExpandedAreas(areas);
      } catch (err) {
        setError("Failed to load tables. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [currentTable?.tableId]);

  // Build area list for dropdown
  const areas = useMemo(() => {
    const areaSet = [...new Set(availableTables.map((t) => t.sectionName || "Default"))];
    return areaSet.map((name) => ({ id: name, name }));
  }, [availableTables]);

  // Group and filter tables by area
  const filteredTablesByArea = useMemo(() => {
    const result = {};
    availableTables.forEach((table) => {
      const areaName = table.sectionName || "Default";
      if (areaFilter !== "all" && areaFilter !== areaName) return;
      if (searchQuery && !table.displayName.toLowerCase().includes(searchQuery.toLowerCase())) return;
      if (!result[areaName]) result[areaName] = { name: areaName, tables: [] };
      result[areaName].tables.push(table);
    });
    return result;
  }, [availableTables, searchQuery, areaFilter]);

  const toggleArea = (areaKey) => {
    setExpandedAreas((prev) =>
      prev.includes(areaKey) ? prev.filter((k) => k !== areaKey) : [...prev, areaKey]
    );
  };

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleShift = async () => {
    if (!selectedTable || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onShift({ toTable: selectedTable });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Shift failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="shift-table-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {currentTable?.label || currentTable?.id} → Shift Table
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select a free table to shift to
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          {/* Filters */}
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

            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            >
              <option value="all">All Areas</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>

            <div className="flex items-center rounded-lg border" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-gray-100" : ""}`}>
                <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-gray-100" : ""}`}>
                <List className="w-4 h-4" style={{ color: viewMode === "list" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: COLORS.grayText }}>
              <Loader className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading available tables...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-sm" style={{ color: COLORS.errorText }}>{error}</div>
          ) : Object.entries(filteredTablesByArea).length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: COLORS.grayText }}>
              No free tables available
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-4">
              {Object.entries(filteredTablesByArea).map(([areaKey, area]) => (
                <div key={areaKey}>
                  <button onClick={() => toggleArea(areaKey)} className="w-full flex items-center gap-2 py-2 text-left">
                    {expandedAreas.includes(areaKey)
                      ? <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />}
                    <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                      {area.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                      {area.tables.length} free
                    </span>
                  </button>

                  {expandedAreas.includes(areaKey) && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {area.tables.map((table) => {
                        const isSelected = selectedTable?.tableId === table.tableId;
                        return (
                          <button
                            key={table.tableId}
                            data-testid={`shift-table-${table.tableId}`}
                            onClick={() => setSelectedTable(table)}
                            className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-md cursor-pointer"
                            style={{
                              borderColor: isSelected ? COLORS.primaryOrange : COLORS.primaryGreen,
                              backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : `${COLORS.primaryGreen}08`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm" style={{ color: COLORS.darkText }}>
                                {table.displayName}
                              </span>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primaryGreen }} title="Free" />
                            </div>
                            <div className="text-xs" style={{ color: COLORS.primaryGreen }}>Available</div>
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
              <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                <span>Table</span>
                <span>Area</span>
                <span>Status</span>
              </div>
              <div className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                {Object.entries(filteredTablesByArea).flatMap(([areaKey, area]) =>
                  area.tables.map((table) => {
                    const isSelected = selectedTable?.tableId === table.tableId;
                    return (
                      <button
                        key={table.tableId}
                        onClick={() => setSelectedTable(table)}
                        className="w-full grid grid-cols-3 gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        style={{ backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : "transparent" }}
                      >
                        <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>{table.displayName}</span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>{area.name}</span>
                        <span className="text-sm px-2 py-0.5 rounded-full inline-block w-fit"
                          style={{ backgroundColor: `${COLORS.primaryGreen}15`, color: COLORS.primaryGreen }}>
                          Available
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {selectedTable ? (
            <div className="text-sm mb-3">
              <span style={{ color: COLORS.grayText }}>Shifting to: </span>
              <span className="font-semibold" style={{ color: COLORS.darkText }}>{selectedTable.displayName}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${COLORS.primaryGreen}15`, color: COLORS.primaryGreen }}>
                {selectedTable.sectionName || "Default"}
              </span>
            </div>
          ) : (
            <div className="text-sm mb-3" style={{ color: COLORS.grayText }}>Select a free table to shift to</div>
          )}

          {submitError && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {submitError}
            </div>
          )}

          <button
            onClick={handleShift}
            disabled={!selectedTable || submitting}
            data-testid="shift-confirm-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            {submitting ? "Shifting..." : selectedTable ? `Shift to ${selectedTable.displayName}` : "Select a table"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftTableModal;
