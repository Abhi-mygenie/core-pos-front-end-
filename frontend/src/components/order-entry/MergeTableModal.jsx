import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight, LayoutGrid, List, Check } from "lucide-react";
import { COLORS } from "../../constants";

const MergeTableModal = ({ currentTable, orders = [], onClose, onMerge }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [areaFilter, setAreaFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Build merge-eligible order list from OrderContext
  // Only dine-in tables and walk-in orders can participate in merge (not takeaway/delivery)
  // BUG-271: Exclude prepaid orders — cannot merge across payment types
  // When current order is a table: show other tables + walk-ins
  // When current order is a walk-in: show tables + other walk-ins
  const occupiedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderId !== currentTable?.orderId &&
             (o.orderType === 'dineIn' || o.isWalkIn) &&
             o.paymentType !== 'prepaid'
    );
  }, [orders, currentTable?.orderId]);

  // Get display label for an order (table or walk-in)
  const getOrderLabel = (order) =>
    order.isWalkIn ? (order.customer || "WC") : `T${order.tableNumber}`;

  // Get area for an order
  const getOrderArea = (order) =>
    order.isWalkIn ? "Walk-In" : (order.tableSectionName || "Default");

  // Build area list
  const areas = useMemo(() => {
    const areaSet = [...new Set(occupiedOrders.map(getOrderArea))];
    return areaSet.map((name) => ({ id: name, name }));
  }, [occupiedOrders]);

  // Group and filter by area + search
  const filteredByArea = useMemo(() => {
    const result = {};
    occupiedOrders.forEach((order) => {
      const areaName = getOrderArea(order);
      if (areaFilter !== "all" && areaFilter !== areaName) return;
      const label = getOrderLabel(order);
      if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) return;
      if (!result[areaName]) result[areaName] = { name: areaName, orders: [] };
      result[areaName].orders.push(order);
    });
    return result;
  }, [occupiedOrders, areaFilter, searchQuery]);

  const [expandedAreas, setExpandedAreas] = useState(() =>
    [...new Set(orders.filter(o => o.orderId !== currentTable?.orderId).map(getOrderArea))]
  );

  const toggleArea = (area) =>
    setExpandedAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);

  const toggleSelection = (order) => {
    setSelectedOrders((prev) => {
      const exists = prev.find((o) => o.orderId === order.orderId);
      return exists ? prev.filter((o) => o.orderId !== order.orderId) : [...prev, order];
    });
  };

  const removeSelection = (orderId) =>
    setSelectedOrders((prev) => prev.filter((o) => o.orderId !== orderId));

  const combinedBill = useMemo(() => {
    const currentAmount = currentTable?.amount || 0;
    const selectedAmount = selectedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    return currentAmount + selectedAmount;
  }, [currentTable?.amount, selectedOrders]);

  const handleMerge = async () => {
    if (selectedOrders.length === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onMerge({ selectedOrders });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Merge failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="merge-table-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {currentTable?.label || currentTable?.id} → Merge Tables
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select occupied tables to merge into this order
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          {/* Selected Preview */}
          {selectedOrders.length > 0 && (
            <div className="p-3 rounded-xl mb-4"
              style={{ backgroundColor: `${COLORS.primaryOrange}10`, border: `1px solid ${COLORS.primaryOrange}30` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Selected for Merge:</span>
                <span className="text-sm font-bold" style={{ color: COLORS.primaryGreen }}>
                  Combined: ₹{combinedBill.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}>
                  T{currentTable?.label || currentTable?.id} (Current)
                </span>
                {selectedOrders.map((o) => (
                  <span key={o.orderId}
                    className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                    onClick={() => removeSelection(o.orderId)}>
                    {getOrderLabel(o)} {o.amount ? `₹${o.amount.toLocaleString()}` : ""}
                    <X className="w-3 h-3" />
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
              <input type="text" placeholder="Search tables..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }} />
            </div>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border cursor-pointer"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}>
              <option value="all">All Areas</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex items-center rounded-lg border" style={{ borderColor: COLORS.borderGray }}>
              <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-gray-100" : ""}`}>
                <LayoutGrid className="w-4 h-4" style={{ color: viewMode === "grid" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-gray-100" : ""}`}>
                <List className="w-4 h-4" style={{ color: viewMode === "list" ? COLORS.primaryOrange : COLORS.grayText }} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.entries(filteredByArea).length === 0 ? (
            <div className="text-center py-12 text-sm" style={{ color: COLORS.grayText }}>
              No occupied tables available to merge
            </div>
          ) : viewMode === "grid" ? (
            <div className="space-y-4">
              {Object.entries(filteredByArea).map(([areaKey, area]) => (
                <div key={areaKey}>
                  <button onClick={() => toggleArea(areaKey)} className="w-full flex items-center gap-2 py-2 text-left">
                    {expandedAreas.includes(areaKey)
                      ? <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      : <ChevronRight className="w-4 h-4" style={{ color: COLORS.grayText }} />}
                    <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                      {area.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                      {area.orders.length} occupied
                    </span>
                  </button>

                  {expandedAreas.includes(areaKey) && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {area.orders.map((order) => {
                        const isSelected = selectedOrders.some((o) => o.orderId === order.orderId);
                        return (
                          <button key={order.orderId}
                            data-testid={`merge-table-${order.tableId}`}
                            onClick={() => toggleSelection(order)}
                            className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-md relative"
                            style={{
                              borderColor: isSelected ? COLORS.primaryGreen : COLORS.amber,
                              backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : `${COLORS.amber}08`,
                            }}>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: COLORS.primaryGreen }}>
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm" style={{ color: COLORS.darkText }}>
                                {getOrderLabel(order)}
                              </span>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.amber }} />
                            </div>
                            <div className="text-xs" style={{ color: COLORS.grayText }}>
                              {order.customer || "NA"}
                            </div>
                            <div className="text-xs mt-1 font-semibold" style={{ color: COLORS.darkText }}>
                              {order.amount ? `₹${order.amount.toLocaleString()}` : "-"}
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
              <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                <span>Select</span><span>Table</span><span>Area</span><span>Customer</span><span>Amount</span>
              </div>
              <div className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                {Object.entries(filteredByArea).flatMap(([areaKey, area]) =>
                  area.orders.map((order) => {
                    const isSelected = selectedOrders.some((o) => o.orderId === order.orderId);
                    return (
                      <button key={order.orderId} onClick={() => toggleSelection(order)}
                        className="w-full grid grid-cols-5 gap-4 px-4 py-3 text-left hover:bg-gray-50"
                        style={{ backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : "transparent" }}>
                        <div className="w-5 h-5 rounded border-2 flex items-center justify-center"
                          style={{ borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray, backgroundColor: isSelected ? COLORS.primaryGreen : "white" }}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>{getOrderLabel(order)}</span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>{area.name}</span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>{order.customer || "NA"}</span>
                        <span className="text-sm" style={{ color: COLORS.darkText }}>
                          {order.amount ? `₹${order.amount.toLocaleString()}` : "-"}
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
          {submitError && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {submitError}
            </div>
          )}
          <button onClick={handleMerge} disabled={selectedOrders.length === 0 || submitting}
            data-testid="merge-confirm-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}>
            {submitting
              ? "Merging..."
              : selectedOrders.length > 0
                ? `Merge ${selectedOrders.length} table(s) → ${currentTable?.label || currentTable?.id}`
                : "Select tables to merge"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeTableModal;
