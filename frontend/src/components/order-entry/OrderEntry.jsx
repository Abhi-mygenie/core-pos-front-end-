import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { COLORS } from "../../constants";
import { mockMenuItems } from "../../data";
import CategoryPanel from "./CategoryPanel";
import CartPanel from "./CartPanel";
import ItemCustomizationModal from "./ItemCustomizationModal";
import OrderNotesModal from "./OrderNotesModal";
import ItemNotesModal from "./ItemNotesModal";
import CustomerModal from "./CustomerModal";
import OrderPlacedModal from "./OrderPlacedModal";
import TransferFoodModal from "./TransferFoodModal";
import MergeTableModal from "./MergeTableModal";
import ShiftTableModal from "./ShiftTableModal";
import CancelFoodModal from "./CancelFoodModal";
import CollectPaymentPanel from "./CollectPaymentPanel";

const ORDER_TYPES = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "takeAway", label: "TakeAway", icon: ShoppingBag },
  { id: "walkIn", label: "Walk-In", icon: UtensilsCrossed },
];

const DROPDOWN_TABLE_SORT = { available: 0, reserved: 1, occupied: 2, billReady: 3, paid: 4, yetToConfirm: 4 };

// Order Entry Screen Component - 3-Panel Layout
const OrderEntry = ({ table, onClose, orderData, orderType = "delivery", onOrderTypeChange, allTables = [], onSelectTable }) => {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [printAllKOT, setPrintAllKOT] = useState(true);
  const [customizationItem, setCustomizationItem] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState([]);
  const [showOrderPlaced, setShowOrderPlaced] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);
  const [flashItemId, setFlashItemId] = useState(null);
  const [itemNotesModal, setItemNotesModal] = useState(null); // { item, cartIndex }
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customer, setCustomer] = useState(null);
  const typeDropdownRef = useRef(null);

  // Dietary filter states
  const [primaryFilter, setPrimaryFilter] = useState(null); // "veg" | "egg" | "nonveg" | null
  const [secondaryFilters, setSecondaryFilters] = useState({ glutenFree: false, jain: false, vegan: false });

  // Toggle primary filter (mutually exclusive)
  const togglePrimaryFilter = (filter) => {
    setPrimaryFilter(prev => prev === filter ? null : filter);
  };

  // Toggle secondary filter
  const toggleSecondaryFilter = (filter) => {
    setSecondaryFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  };

  // Close type dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setShowTypeDropdown(false);
      }
    };
    if (showTypeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTypeDropdown]);

  // Initialize cart with existing order items
  useEffect(() => {
    if (orderData && orderData.items) {
      const existingItems = orderData.items.map(item => ({
        ...item,
        price: Math.floor(Math.random() * 400) + 100,
        placed: true,
        addedAt: new Date(Date.now() - item.time * 60000).toISOString(),
      }));
      setCartItems(existingItems);
    }
  }, [orderData]);

  // Get current menu items based on category, search, and dietary filters
  const getFilteredItems = () => {
    let items = mockMenuItems[activeCategory] || [];
    if (searchQuery.trim()) {
      items = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // Apply primary dietary filter
    if (primaryFilter) {
      items = items.filter(item => item.type === primaryFilter);
    }
    // Apply secondary dietary filters
    if (secondaryFilters.glutenFree) {
      items = items.filter(item => item.glutenFree === true);
    }
    if (secondaryFilters.jain) {
      items = items.filter(item => item.jain === true);
    }
    if (secondaryFilters.vegan) {
      items = items.filter(item => item.vegan === true);
    }
    return items;
  };

  // Cart item counts by item id (for badge on pills)
  const cartCountMap = useMemo(() => {
    const map = {};
    cartItems.forEach(ci => { map[ci.id] = (map[ci.id] || 0) + ci.qty; });
    return map;
  }, [cartItems]);

  // Add item to cart with flash feedback
  const addToCart = (item) => {
    const existingIndex = cartItems.findIndex(ci => ci.id === item.id && !ci.customizations && !ci.placed);
    if (existingIndex >= 0 && !item.customizations) {
      const updated = [...cartItems];
      updated[existingIndex].qty += 1;
      setCartItems(updated);
    } else {
      setCartItems([...cartItems, {
        ...item,
        qty: item.quantity || 1,
        status: "preparing",
        placed: false,
        addedAt: new Date().toISOString()
      }]);
    }
    setFlashItemId(item.id);
    setTimeout(() => setFlashItemId(null), 400);
  };

  const addCustomizedItemToCart = (item) => {
    setCartItems([...cartItems, {
      ...item,
      qty: item.quantity || 1,
      status: "preparing",
      placed: false,
      addedAt: new Date().toISOString()
    }]);
    setCustomizationItem(null);
  };

  const updateQuantity = useCallback((itemId, newQty) => {
    setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, qty: newQty } : item));
  }, []);

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) return;
    setCartItems(prev => prev.map(item => ({ ...item, placed: true })));
    setEditingQtyItemId(null);
    setShowOrderPlaced(true);
  };

  const handleOrderPlacedClose = () => {
    setShowOrderPlaced(false);
  };

  const handleTransfer = (item, targetTable) => {
    setCartItems(prev => prev.filter(ci => ci.id !== item.id));
    setTransferItem(null);
  };

  const handleMerge = (targetTable) => {
    setShowMergeModal(false);
  };

  const handleShift = (targetTable) => {
    setShowShiftModal(false);
  };

  const handleCancelFood = (item, reason) => {
    setCartItems(prev => prev.filter(ci => ci.id !== item.id));
    setCancelItem(null);
  };

  return (
    <div
      data-testid="order-entry-screen"
      className="fixed inset-0 z-50 flex"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="flex w-full h-full bg-white">
        {/* LEFT PANEL - Categories */}
        <CategoryPanel
          activeCategory={activeCategory}
          onCategoryChange={(id) => setActiveCategory(id)}
          onShiftTable={() => setShowShiftModal(true)}
          onMergeTable={() => setShowMergeModal(true)}
        />

        {/* MIDDLE PANEL - Menu Items */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: `1px solid ${COLORS.borderGray}` }}>
          {/* Search + Dietary Filters (Header Row) */}
          <div className="px-4 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
            {/* Compact Search */}
            <div className="relative w-48 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.grayText }} />
              <input
                data-testid="menu-search-input"
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.darkText }}
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px" style={{ backgroundColor: COLORS.borderGray }} />

            {/* Primary Dietary Filters */}
            <div className="flex items-center gap-2">
              {[
                { key: "veg", label: "Veg" },
                { key: "nonveg", label: "Non-Veg" },
                { key: "egg", label: "Egg" }
              ].map(filter => {
                const isActive = primaryFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    data-testid={`filter-${filter.key}`}
                    onClick={() => togglePrimaryFilter(filter.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? COLORS.primaryGreen : "transparent",
                      color: isActive ? "white" : COLORS.darkText,
                      border: `1px solid ${isActive ? COLORS.primaryGreen : COLORS.borderGray}`,
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-6 w-px" style={{ backgroundColor: COLORS.borderGray }} />

            {/* Secondary Dietary Filters */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { key: "glutenFree", label: "Gluten Free" },
                { key: "jain", label: "Jain" },
                { key: "vegan", label: "Vegan" }
              ].map(filter => {
                const isActive = secondaryFilters[filter.key];
                return (
                  <button
                    key={filter.key}
                    data-testid={`filter-${filter.key}`}
                    onClick={() => toggleSecondaryFilter(filter.key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: isActive ? COLORS.primaryGreen : "transparent",
                      color: isActive ? "white" : COLORS.grayText,
                      border: `1px solid ${isActive ? COLORS.primaryGreen : COLORS.borderGray}`,
                    }}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Add Custom Item */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ border: `1px solid ${COLORS.borderGray}` }}
              title="Add Custom Item"
              data-testid="add-custom-item-btn"
            >
              <Plus className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            </button>
          </div>

          {/* Menu Items - Pill Layout */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-wrap gap-3">
              {getFilteredItems().map(item => {
                const cartCount = cartCountMap[item.id] || 0;
                const isFlashing = flashItemId === item.id;
                return (
                  <button
                    key={item.id}
                    data-testid={`menu-item-${item.id}`}
                    onClick={() => item.customizable ? setCustomizationItem(item) : addToCart(item)}
                    className="relative px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2"
                    style={{
                      backgroundColor: isFlashing ? `${COLORS.primaryGreen}20` : "white",
                      border: `1px solid ${cartCount > 0 ? COLORS.primaryGreen : COLORS.borderGray}`,
                      color: COLORS.darkText,
                      transition: "background-color 0.3s ease, border-color 0.3s ease",
                      transform: isFlashing ? "scale(1.03)" : "scale(1)",
                    }}
                  >
                    <span>{item.name}</span>
                    {item.customizable && (
                      <span className="text-xs font-medium" style={{ color: COLORS.primaryGreen }}>Customize</span>
                    )}
                    {cartCount > 0 && (
                      <span
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: COLORS.primaryOrange }}
                      >
                        {cartCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Cart */}
        <div className="w-96 flex-shrink-0 flex flex-col" style={{ backgroundColor: COLORS.lightBg }}>
          {showPaymentPanel ? (
            <CollectPaymentPanel
              total={total}
              onClose={() => setShowPaymentPanel(false)}
              onComplete={() => { setShowPaymentPanel(false); onClose(); }}
            />
          ) : (
            <>
              {/* Header Row: Back + Table Selector + KOT Toggle */}
              <div
                className="px-4 py-3 flex items-center gap-4"
                style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
              >
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="order-entry-back-btn"
                >
                  <ChevronLeft className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
                </button>

                {/* Order Type Selector */}
                <div className="relative" ref={typeDropdownRef}>
                  <button
                    className="px-4 py-2 rounded-full font-bold text-white text-sm cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-2"
                    style={{ backgroundColor: COLORS.primaryOrange }}
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    data-testid="order-type-badge"
                  >
                    {orderType === "walkIn" && table ? (
                      <span>{table.id}</span>
                    ) : (
                      <>
                        {(() => { const Icon = ORDER_TYPES.find(t => t.id === orderType)?.icon; return Icon ? <Icon className="w-4 h-4" /> : null; })()}
                        <span>{ORDER_TYPES.find(t => t.id === orderType)?.label}</span>
                      </>
                    )}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showTypeDropdown && (
                    <div
                      className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden min-w-[180px] max-h-[400px] overflow-y-auto"
                      style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}` }}
                    >
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
                            onClick={() => { onOrderTypeChange?.(type.id); setShowTypeDropdown(false); }}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{type.label}</span>
                          </button>
                        );
                      })}

                      <div className="h-px mx-3" style={{ backgroundColor: COLORS.borderGray }} />
                      <div className="px-3 py-2">
                        <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Tables</span>
                      </div>
                      {[...allTables]
                        .sort((a, b) => {
                          const aPri = DROPDOWN_TABLE_SORT[a.status] ?? 5;
                          const bPri = DROPDOWN_TABLE_SORT[b.status] ?? 5;
                          if (aPri !== bPri) return aPri - bPri;
                          return (parseInt(a.id.replace(/\D/g, ''), 10) || 0) - (parseInt(b.id.replace(/\D/g, ''), 10) || 0);
                        })
                        .map(t => {
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
                              onClick={() => { onSelectTable?.(t); setShowTypeDropdown(false); }}
                            >
                              <span className="font-medium">{t.id}</span>
                              <span className="text-xs capitalize" style={{ color: isAvailable ? COLORS.primaryGreen : COLORS.grayText }}>
                                {t.status === "available" ? "Available" : t.status === "paid" ? "Clear" : t.status === "billReady" ? "Bill Ready" : t.status === "yetToConfirm" ? "Clear" : t.status}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <button 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative" 
                  title="Customer Info"
                  onClick={() => setShowCustomerModal(true)}
                  data-testid="customer-info-btn"
                >
                  <UserPlus className="w-5 h-5" style={{ color: customer ? COLORS.primaryGreen : COLORS.grayText }} />
                  {customer && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.primaryGreen }} />
                  )}
                </button>

                {/* Order Notes */}
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                  title="Order Notes"
                  onClick={() => setShowNotesModal(true)}
                  data-testid="order-notes-btn"
                >
                  <StickyNote className="w-5 h-5" style={{ color: orderNotes.length > 0 ? COLORS.primaryGreen : COLORS.grayText }} />
                  {orderNotes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white" style={{ backgroundColor: COLORS.primaryGreen }}>
                      {orderNotes.length}
                    </span>
                  )}
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* KOT Toggle - Right aligned */}
                <div
                  onClick={() => setPrintAllKOT(!printAllKOT)}
                  className="w-10 h-5 rounded-full relative cursor-pointer transition-colors flex-shrink-0"
                  style={{ backgroundColor: printAllKOT ? COLORS.primaryGreen : COLORS.borderGray }}
                  title="Print All KOT's"
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                    style={{ left: printAllKOT ? "22px" : "2px" }}
                  />
                </div>
              </div>

              {/* Cart Panel */}
              <CartPanel
                cartItems={cartItems}
                total={total}
                editingQtyItemId={editingQtyItemId}
                setEditingQtyItemId={setEditingQtyItemId}
                updateQuantity={updateQuantity}
                setCancelItem={setCancelItem}
                setTransferItem={setTransferItem}
                handlePlaceOrder={handlePlaceOrder}
                setShowPaymentPanel={setShowPaymentPanel}
                onAddNote={(item, cartIndex) => setItemNotesModal({ item, cartIndex })}
                customer={customer}
                onCustomerChange={setCustomer}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {customizationItem && (
        <ItemCustomizationModal item={customizationItem} onClose={() => setCustomizationItem(null)} onAddToOrder={addCustomizedItemToCart} />
      )}
      {showNotesModal && (
        <OrderNotesModal 
          tableId={table?.id} 
          onClose={() => setShowNotesModal(false)} 
          onSave={(notes) => setOrderNotes(notes)} 
          initialNotes={orderNotes}
          customerId={customer?.id || null}
        />
      )}
      {itemNotesModal && (
        <ItemNotesModal
          item={itemNotesModal.item}
          onClose={() => setItemNotesModal(null)}
          onSave={(notes) => {
            // Update the cart item with notes
            setCartItems(prev => prev.map((item, idx) => 
              idx === itemNotesModal.cartIndex 
                ? { ...item, itemNotes: notes }
                : item
            ));
            setItemNotesModal(null);
          }}
          initialNotes={itemNotesModal.item?.itemNotes || []}
          customerId={customer?.id || null}
        />
      )}
      {showOrderPlaced && (
        <OrderPlacedModal onClose={handleOrderPlacedClose} autoCloseDelay={2000} />
      )}
      {transferItem && table && (
        <TransferFoodModal item={transferItem} currentTable={table} onClose={() => setTransferItem(null)} onTransfer={handleTransfer} />
      )}
      {showMergeModal && table && (
        <MergeTableModal currentTable={table} onClose={() => setShowMergeModal(false)} onMerge={handleMerge} />
      )}
      {showShiftModal && table && (
        <ShiftTableModal currentTable={table} onClose={() => setShowShiftModal(false)} onShift={handleShift} />
      )}
      {cancelItem && (
        <CancelFoodModal item={cancelItem} onClose={() => setCancelItem(null)} onCancel={handleCancelFood} />
      )}
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSave={(customerData) => setCustomer(customerData)}
          initialData={customer}
        />
      )}
    </div>
  );
};

export default OrderEntry;
