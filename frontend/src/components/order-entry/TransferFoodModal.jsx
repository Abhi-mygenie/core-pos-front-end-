import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight, LayoutGrid, List } from "lucide-react";
import { COLORS } from "../../constants";

const TransferFoodModal = ({ item, currentTable, orders = [], onClose, onTransfer }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [areaFilter, setAreaFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // All active orders eligible for food transfer — only dine-in tables and walk-in orders
  // Excludes takeaway/delivery (not eligible for food transfer)
  // BUG-271: Exclude prepaid orders — cannot transfer across payment types
  const occupiedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderId !== currentTable?.orderId &&
             (o.orderType === 'dineIn' || o.isWalkIn) &&
             o.paymentType !== 'prepaid'
    );
  }, [orders, currentTable?.orderId]);

  const getOrderLabel = (order) =>
    order.isWalkIn ? (order.customer || "WC") : `T${order.tableNumber}`;

  const getOrderArea = (order) =>
    order.isWalkIn ? "Walk-In" : (order.tableSectionName || "Default");

  const areas = useMemo(() => {
    const areaSet = [...new Set(occupiedOrders.map(getOrderArea))];
    return areaSet.map((name) => ({ id: name, name }));
  }, [occupiedOrders]);

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
    [...new Set(occupiedOrders.map(getOrderArea))]
  );

  const toggleArea = (area) =>
    setExpandedAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);

  const handleTransfer = async () => {
    if (!selectedOrder || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onTransfer({ toOrder: selectedOrder, item });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Transfer failed. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="transfer-food-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                Transfer — {item?.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                Select a table to transfer this item to
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>

          {/* Item Preview */}
          <div className="px-3 py-2 rounded-lg mb-4 flex items-center justify-between"
            style={{ backgroundColor: COLORS.sectionBg }}>
            <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>
              {item?.name}
            </span>
            {item?.price > 0 && (
              <span className="text-sm font-semibold" style={{ color: COLORS.primaryGreen }}>
                ₹{item.price.toLocaleString()}
              </span>
            )}
          </div>

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
              No occupied tables available for transfer
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
                        const isSelected = selectedOrder?.orderId === order.orderId;
                        return (
                          <button key={order.orderId}
                            data-testid={`transfer-table-${order.tableId}`}
                            onClick={() => setSelectedOrder(order)}
                            className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-md"
                            style={{
                              borderColor: isSelected ? COLORS.primaryOrange : COLORS.amber,
                              backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : `${COLORS.amber}08`,
                            }}>
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
              <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
                <span>Table</span><span>Area</span><span>Customer</span><span>Amount</span>
              </div>
              <div className="divide-y" style={{ borderColor: COLORS.borderGray }}>
                {Object.entries(filteredByArea).flatMap(([, area]) =>
                  area.orders.map((order) => {
                    const isSelected = selectedOrder?.orderId === order.orderId;
                    return (
                      <button key={order.orderId} onClick={() => setSelectedOrder(order)}
                        className="w-full grid grid-cols-4 gap-4 px-4 py-3 text-left hover:bg-gray-50"
                        style={{ backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : "transparent" }}>
                        <span className="font-semibold text-sm" style={{ color: COLORS.darkText }}>{getOrderLabel(order)}</span>
                        <span className="text-sm" style={{ color: COLORS.grayText }}>{getOrderArea(order)}</span>
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
          {selectedOrder ? (
            <div className="text-sm mb-3">
              <span style={{ color: COLORS.grayText }}>Transferring </span>
              <span className="font-semibold" style={{ color: COLORS.darkText }}>{item?.name}</span>
              <span style={{ color: COLORS.grayText }}> → </span>
              <span className="font-semibold" style={{ color: COLORS.primaryOrange }}>{getOrderLabel(selectedOrder)}</span>
            </div>
          ) : (
            <div className="text-sm mb-3" style={{ color: COLORS.grayText }}>
              Select a table to transfer {item?.name} to
            </div>
          )}

          {submitError && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {submitError}
            </div>
          )}

          <button onClick={handleTransfer} disabled={!selectedOrder || submitting}
            data-testid="transfer-confirm-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryOrange }}>
            {submitting
              ? "Transferring..."
              : selectedOrder
                ? `Transfer to ${getOrderLabel(selectedOrder)}`
                : "Select a table"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferFoodModal;
