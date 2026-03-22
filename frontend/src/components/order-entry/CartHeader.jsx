import { useRef, useCallback, useState } from "react";
import { ChevronLeft, ChevronDown, UserPlus, StickyNote, Truck, ShoppingBag, UtensilsCrossed, Search } from "lucide-react";
import { COLORS } from "../../constants";
import { useClickOutside } from "../../hooks";

const ORDER_TYPES = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "takeAway", label: "TakeAway", icon: ShoppingBag },
  { id: "walkIn", label: "Walk-In", icon: UtensilsCrossed },
];

const DROPDOWN_TABLE_SORT = { 
  available: 0, 
  reserved: 1, 
  occupied: 2, 
  billReady: 3, 
  paid: 4, 
  yetToConfirm: 4 
};

/**
 * OrderTypeSelector - Dropdown for selecting order type and table
 */
const OrderTypeSelector = ({
  orderType,
  table,
  allTables,
  showDropdown,
  setShowDropdown,
  onOrderTypeChange,
  onSelectTable,
}) => {
  const dropdownRef = useRef(null);
  const [tableSearch, setTableSearch] = useState("");

  const handleClickOutside = useCallback(() => {
    setShowDropdown(false);
    setTableSearch("");
  }, [setShowDropdown]);

  useClickOutside(dropdownRef, handleClickOutside, showDropdown);

  const currentType = ORDER_TYPES.find(t => t.id === orderType);
  const CurrentIcon = currentType?.icon;

  const sortedTables = [...allTables].sort((a, b) => {
    const aPri = DROPDOWN_TABLE_SORT[a.status] ?? 5;
    const bPri = DROPDOWN_TABLE_SORT[b.status] ?? 5;
    if (aPri !== bPri) return aPri - bPri;
    return (parseInt(a.id.replace(/\D/g, ''), 10) || 0) - (parseInt(b.id.replace(/\D/g, ''), 10) || 0);
  });

  const filteredTables = tableSearch
    ? sortedTables.filter(t => t.id.toLowerCase().includes(tableSearch.toLowerCase()))
    : sortedTables;

  const getTableStatusLabel = (status) => {
    switch (status) {
      case "available": return "Available";
      case "paid": return "Clear";
      case "billReady": return "Bill Ready";
      case "yetToConfirm": return "Clear";
      default: return status;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="px-4 py-2 rounded-full font-bold text-white text-sm cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
        style={{ backgroundColor: COLORS.primaryOrange }}
        onClick={() => { setShowDropdown(!showDropdown); setTableSearch(""); }}
        data-testid="order-type-badge"
      >
        {orderType === "walkIn" && table ? (
          <span>{table.id}</span>
        ) : (
          <>
            {CurrentIcon && <CurrentIcon className="w-4 h-4" />}
            <span>{currentType?.label}</span>
          </>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-[70] overflow-hidden min-w-[220px] max-h-[400px] flex flex-col"
          style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
          data-testid="order-type-dropdown"
        >
          {/* Order Types */}
          <div className="flex-shrink-0">
            {ORDER_TYPES.map(type => {
              const Icon = type.icon;
              const isActive = orderType === type.id;
              return (
                <button
                  key={type.id}
                  data-testid={`order-type-${type.id}`}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{
                    color: isActive ? COLORS.primaryOrange : COLORS.darkText,
                    backgroundColor: isActive ? `${COLORS.primaryOrange}10` : "transparent",
                  }}
                  onClick={() => { onOrderTypeChange?.(type.id); setShowDropdown(false); setTableSearch(""); }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px mx-3 flex-shrink-0" style={{ backgroundColor: COLORS.borderGray }} />

          {/* Search Bar */}
          <div className="px-3 py-2 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.lightBg }}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.grayText }} />
              <input
                type="text"
                placeholder="Search table..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full text-sm bg-transparent outline-none"
                style={{ color: COLORS.darkText }}
                data-testid="table-search-input"
                autoFocus
              />
            </div>
          </div>
          
          {/* Tables Header */}
          <div className="px-3 py-1 flex-shrink-0">
            <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Tables</span>
          </div>

          {/* Table List - Scrollable */}
          <div className="overflow-y-auto flex-1">
            {filteredTables.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center" style={{ color: COLORS.grayText }}>
                No tables found
              </div>
            ) : (
              filteredTables.map(t => {
                const isSelected = table?.id === t.id && orderType === "walkIn";
                const isAvailable = t.status === "available";
                return (
                  <button
                    key={t.id}
                    data-testid={`select-table-${t.id}`}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-sm transition-colors hover:bg-gray-50"
                    style={{
                      color: isSelected ? COLORS.primaryOrange : isAvailable ? COLORS.darkText : COLORS.grayText,
                      backgroundColor: isSelected ? `${COLORS.primaryOrange}10` : "transparent",
                    }}
                    onClick={() => { onSelectTable?.(t); setShowDropdown(false); setTableSearch(""); }}
                  >
                    <span className="font-medium">{t.id}</span>
                    <span 
                      className="text-xs capitalize" 
                      style={{ color: isAvailable ? COLORS.primaryGreen : COLORS.grayText }}
                    >
                      {getTableStatusLabel(t.status)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * CartHeader - Header row for cart panel with back, type selector, customer, notes, and KOT toggle
 */
const CartHeader = ({
  table,
  orderType,
  allTables,
  showTypeDropdown,
  setShowTypeDropdown,
  onOrderTypeChange,
  onSelectTable,
  customer,
  orderNotes,
  printAllKOT,
  onClose,
  onCustomerClick,
  onNotesClick,
  onKOTToggle,
}) => {
  return (
    <div
      className="px-4 py-3 flex items-center gap-4"
      style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
    >
      {/* Back Button */}
      <button
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        data-testid="order-entry-back-btn"
      >
        <ChevronLeft className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
      </button>

      {/* Order Type Selector */}
      <OrderTypeSelector
        orderType={orderType}
        table={table}
        allTables={allTables}
        showDropdown={showTypeDropdown}
        setShowDropdown={setShowTypeDropdown}
        onOrderTypeChange={onOrderTypeChange}
        onSelectTable={onSelectTable}
      />

      {/* Customer Info Button */}
      <button 
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative" 
        title="Customer Info"
        onClick={onCustomerClick}
        data-testid="customer-info-btn"
      >
        <UserPlus className="w-5 h-5" style={{ color: customer ? COLORS.primaryGreen : COLORS.grayText }} />
        {customer && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primaryGreen }} />
        )}
      </button>

      {/* Order Notes Button */}
      <button
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
        title="Order Notes"
        onClick={onNotesClick}
        data-testid="order-notes-btn"
      >
        <StickyNote className="w-5 h-5" style={{ color: orderNotes.length > 0 ? COLORS.primaryGreen : COLORS.grayText }} />
        {orderNotes.length > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white" 
            style={{ backgroundColor: COLORS.primaryGreen }}
          >
            {orderNotes.length}
          </span>
        )}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* KOT Toggle */}
      <div
        onClick={onKOTToggle}
        className="w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0"
        style={{ backgroundColor: printAllKOT ? COLORS.primaryGreen : COLORS.borderGray }}
        title="Print All KOT's"
        data-testid="kot-toggle"
      >
        <div
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
          style={{ left: printAllKOT ? "22px" : "2px" }}
        />
      </div>
    </div>
  );
};

export { OrderTypeSelector };
export default CartHeader;
