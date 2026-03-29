import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed, Trash2 } from "lucide-react";
import { COLORS } from "../../constants";
import { useMenu, useOrders, useSettings, useRestaurant, useAuth } from "../../contexts";
import { useToast } from "../../hooks/use-toast";
import api from "../../api/axios";
import { API_ENDPOINTS } from "../../api/constants";
import { toAPI as tableToAPI } from "../../api/transforms/tableTransform";
import { toAPI as orderToAPI, customItemFromAPI } from "../../api/transforms/orderTransform";
import AddCustomItemModal from "./AddCustomItemModal";
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
import CancelOrderModal from "./CancelOrderModal";
import CollectPaymentPanel from "./CollectPaymentPanel";

const ORDER_TYPES = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "takeAway", label: "TakeAway", icon: ShoppingBag },
  { id: "walkIn", label: "Walk-In", icon: UtensilsCrossed },
];

const DROPDOWN_TABLE_SORT = { available: 0, reserved: 1, occupied: 2, billReady: 3, paid: 4, yetToConfirm: 4 };

// Order Entry Screen Component - 3-Panel Layout
const OrderEntry = ({ table, onClose, orderData, orderType = "delivery", onOrderTypeChange, allTables = [], onSelectTable, savedCart = [], onCartChange }) => {
  const { categories, products, popularFood } = useMenu();
  const { orders, refreshOrders } = useOrders();
  const { getItemCancellationReasons, getOrderCancellationReasons } = useSettings();
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { toast } = useToast();

  // Adapt real product data to the format expected by menu item pills
  // Maps a MenuContext product to a cart item shape for display
  // NOTE (Sprint 3 / CHG-037 — Place Order): When Place Order API endpoint is provided,
  // add categoryId + tax fields here so toAPI.placeOrder() can read them from cartItems.
  // Fields to add: categoryId: product.categoryId, tax: product.tax
  const adaptProduct = (product) => ({
    id: product.productId,
    name: product.productName,
    price: product.basePrice,
    tax: product.tax,             // { percentage, type, calculation, isInclusive } — for billing
    categoryId: product.categoryId,
    type: product.isVeg ? 'veg' : product.hasEgg ? 'egg' : 'nonveg',
    station: product.station || 'kitchen',
    glutenFree: false,
    jain: product.isJain || false,
    vegan: false,
    customizable: product.hasVariations || (product.addOns && product.addOns.length > 0),
    variantGroups: product.variations || [],
    addons: product.addOns || [],
    productImage: product.productImage,
  });

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
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(table?.orderId || null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);
  const [flashItemId, setFlashItemId] = useState(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [itemNotesModal, setItemNotesModal] = useState(null); // { item, cartIndex }
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customer, setCustomer] = useState(null);
  // Effective table — merges placedOrderId into table for same-session operations
  const effectiveTable = { ...table, orderId: placedOrderId || table?.orderId };
  const cartKeyRef = useRef(null); // tracks previous table key for save-on-switch
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

  // Per-table cart: save + restore on table/orderType switch
  useEffect(() => {
    const newKey = table?.id || orderType;
    const oldKey = cartKeyRef.current;

    // Save previous table's cart before switching
    if (oldKey && oldKey !== newKey) {
      onCartChange?.(oldKey, cartItems);
    }
    cartKeyRef.current = newKey;

    // Restore: savedCart takes priority, then API orderData, then empty
    if (savedCart && savedCart.length > 0) {
      setCartItems(savedCart);
      if (orderData?.customer || orderData?.phone) {
        setCustomer({
          name: orderData.customer !== 'WC' ? (orderData.customer || '') : '',
          phone: orderData.phone || '',
        });
      }
    } else if (orderData) {
      if (orderData.customer || orderData.phone) {
        setCustomer({
          name: orderData.customer !== 'WC' ? (orderData.customer || '') : '',
          phone: orderData.phone || '',
        });
      }
      if (orderData.items && orderData.items.length > 0) {
        const existingItems = orderData.items.map(item => ({
          id: item.id,
          foodId: item.foodId,
          tax: item.tax || { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false },
          name: item.name,
          qty: item.qty || 1,
          price: item.unitPrice || item.price || 0,
          status: item.status || 'preparing',
          placed: true,
          addedAt: item.createdAt || new Date().toISOString(),
          variation: item.variation,
          addOns: item.addOns,
          notes: item.notes,
        }));
        setCartItems(existingItems);
      } else {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id, orderType]);

  // Get current menu items based on category, search, and dietary filters
  const getFilteredItems = () => {
    let items;
    if (activeCategory === "all") {
      items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else if (activeCategory === "popular") {
      const source = popularFood.length > 0 ? popularFood : products.slice(0, 20);
      items = source.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
    } else {
      items = products
        .filter(p => p.categoryId === activeCategory && p.isActive && !p.isDisabled)
        .map(adaptProduct);
    }
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

  // updateQuantity — differentiates placed vs unplaced items
  // Unplaced (placed: false) → local state only (no API)
  // Placed (placed: true)   → CHG-040: will call editOrderItem API when endpoint provided
  const updateQuantity = useCallback((itemId, newQty, isPlaced = false) => {
    if (isPlaced) {
      // TODO CHG-040: call orderToAPI.editOrderItem() + api.put(EDIT_ORDER_ITEM) when endpoint provided
      // For now: local state update only (stub)
    }
    setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, qty: newQty } : item));
  }, []);

  const total = cartItems.reduce((sum, item) =>
    item.status === 'cancelled' ? sum : sum + (item.price * item.qty), 0
  );

  // handlePlaceOrder — CHG-037: Place Order API
  const handlePlaceOrder = async () => {
    const unplaced = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    if (unplaced.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      const hasPlaced = cartItems.some(i => i.placed);

      if (hasPlaced && placedOrderId) {
        // Scenario 1 — Update Order (add new items to existing order)
        const payload = orderToAPI.updateOrder(effectiveTable, unplaced, customer, orderType, {
          restaurantId: restaurant?.id,
          orderNotes,
          printAllKOT,
          total: unplaced.reduce((s, i) => s + (i.price * i.qty), 0),
        });
        const response = await api.put(API_ENDPOINTS.UPDATE_ORDER, payload);
        console.log('[UpdateOrder] response:', response.data);
        toast({ title: "Order Updated", description: response.data?.message || "Items added to order" });
      } else {
        // Scenario 2 / New Order — Place Order
        const payload = orderToAPI.placeOrder(
          { ...table, tableId: table?.tableId },
          cartItems, customer, orderType,
          { restaurantId: restaurant?.id, orderNotes, total, printAllKOT }
        );
        console.log('[PlaceOrder] table object:', table);
        console.log('[PlaceOrder] payload:', JSON.stringify(payload, null, 2));
        const formData = new URLSearchParams();
        formData.append('data', JSON.stringify(payload));
        const response = await api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        console.log('[PlaceOrder] response:', response.data);
        const newOrderId = response.data?.order_id;
        if (newOrderId) setPlacedOrderId(newOrderId);
        toast({ title: "Order Placed", description: response.data?.message || "Order placed successfully" });
      }

      // Mark unplaced items as placed
      setCartItems(prev => prev.map(item =>
        !item.placed ? { ...item, placed: true, status: 'preparing' } : item
      ));
      setEditingQtyItemId(null);
    } catch (err) {
      console.log('[PlaceOrder] ERROR status:', err?.response?.status);
      console.log('[PlaceOrder] ERROR response:', err?.response?.data);
      const apiMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to place order';
      // ⚠️ DISABLED (Phase 3 — B33): Was refreshOrders on 403 to recover stale state.
      // Removed because Phase 3 sockets will handle all real-time state sync.
      // If this causes issues before sockets are live, re-enable: refreshOrders(user?.roleName || 'Manager')
      toast({ title: "Order Failed", description: apiMsg });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleOrderPlacedClose = () => {
    setShowOrderPlaced(false);
  };

  const handleTransfer = async ({ toOrder, item: transferredItem }) => {
    const payload = tableToAPI.transferFood(effectiveTable, toOrder, transferredItem);
    const response = await api.post(API_ENDPOINTS.TRANSFER_FOOD, payload);
    toast({
      title: "Item Transferred",
      description: response.data?.message || `${transferredItem?.name} transferred to ${toOrder.isWalkIn ? toOrder.customer || 'WC' : `T${toOrder.tableNumber}`}`,
    });
    setTransferItem(null);
    onClose();
  };

  const handleMerge = async ({ selectedOrders }) => {
    // Sequential API calls — one per selected source table
    for (const sourceOrder of selectedOrders) {
      const payload = tableToAPI.mergeTable(effectiveTable, sourceOrder);
      await api.post(API_ENDPOINTS.MERGE_ORDER, payload);
    }
    toast({
      title: "Tables Merged",
      description: `${selectedOrders.length} table(s) merged into ${table?.label || table?.id}`,
    });
    onClose();
  };

  const handleShift = async ({ toTable }) => {    const payload = tableToAPI.shiftTable(effectiveTable, toTable);
    const response = await api.post(API_ENDPOINTS.ORDER_TABLE_SWITCH, payload);
    toast({
      title: "Table Shifted",
      description: response.data?.message || `Order moved to ${toTable.displayName}`,
    });
    onClose();
  };

  const handleCancelFood = async ({ item, reason, cancelQuantity }) => {
    const isFullCancel = cancelQuantity >= item.qty;
    let payload, endpoint;
    if (isFullCancel) {
      payload = orderToAPI.cancelItemFull(effectiveTable, item, reason);
      endpoint = API_ENDPOINTS.CANCEL_ITEM_FULL;
    } else {
      payload = orderToAPI.cancelItemPartial(effectiveTable, item, reason, cancelQuantity);
      endpoint = API_ENDPOINTS.CANCEL_ITEM_PARTIAL;
    }
    const response = await api.put(endpoint, payload);
    toast({
      title: "Item Cancelled",
      description: response.data?.message || `${item?.name} cancelled successfully`,
    });
    // Update local cart state to reflect cancellation
    if (isFullCancel) {
      setCartItems(prev => prev.filter(ci => ci.id !== item.id));
    } else {
      setCartItems(prev => prev.map(ci =>
        ci.id === item.id ? { ...ci, qty: ci.qty - cancelQuantity } : ci
      ));
    }
    setCancelItem(null);
  };

  const handleCancelOrder = async (reason) => {
    // Get all placed, non-cancelled items
    const itemsToCancel = cartItems.filter(i => i.placed && i.status !== 'cancelled');
    // Sequential API calls — one per item, cancel_type based on item status
    for (const item of itemsToCancel) {
      const payload = orderToAPI.cancelOrderItem(effectiveTable, item, reason);
      await api.put(API_ENDPOINTS.CANCEL_ORDER, payload);
    }
    toast({
      title: "Order Cancelled",
      description: `${itemsToCancel.length} item(s) cancelled for ${table?.label || table?.id}`,
    });
    onClose();
  };

  const handleAddCustomItem = async ({ name, categoryId, price, qty, notes }) => {    const payload = orderToAPI.addCustomItem(name, categoryId, price);
    const response = await api.post(API_ENDPOINTS.ADD_CUSTOM_ITEM, payload);
    const cartItem = customItemFromAPI(response.data.data, qty, notes);
    setCartItems(prev => [...prev, cartItem]);
    toast({
      title: "Custom Item Added",
      description: `${cartItem.name} added to order`,
    });
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
          onBack={onClose}
          categories={categories}
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
                    className="px-4 py-3 rounded-full text-xs font-medium transition-colors"
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
                    className="px-4 py-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
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
              onClick={() => setShowCustomItemModal(true)}
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
              cartItems={cartItems}
              total={total}
              customer={customer}
              onBack={() => setShowPaymentPanel(false)}
              onPaymentComplete={async (paymentData) => {
                try {
                  if (!placedOrderId) {
                    // Scenario 2 — fresh order: place + pay in one shot
                    const payload = orderToAPI.collectBill(
                      effectiveTable, cartItems, customer, orderType, paymentData,
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT }
                    );
                    const formData = new URLSearchParams();
                    formData.append('data', JSON.stringify(payload));
                    const res = await api.post(API_ENDPOINTS.PLACE_ORDER_AND_PAYMENT, formData, {
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    });
                    toast({ title: "Payment Collected", description: res.data?.message || "Order placed and payment collected" });
                  } else {
                    // Scenario 1 — existing order: collect payment only
                    const payload = orderToAPI.clearBill(effectiveTable, paymentData);
                    const res = await api.post(API_ENDPOINTS.CLEAR_BILL, payload);
                    toast({ title: "Payment Collected", description: res.data?.message || "Bill cleared successfully" });
                  }
                  setCartItems([]);
                  setShowPaymentPanel(false);
                  onClose();
                } catch (err) {
                  const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
                  toast({ title: "Payment Failed", description: msg });
                }
              }}
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
                    {/* Show table label for physical dineIn AND walkIn tables */}
                    {(orderType === "walkIn" || orderType === "dineIn") && table ? (
                      <span>{table.label || table.id}</span>
                    ) : (
                      <>
                        {(() => { const Icon = ORDER_TYPES.find(t => t.id === orderType)?.icon; return Icon ? <Icon className="w-4 h-4" /> : null; })()}
                        <span>{ORDER_TYPES.find(t => t.id === orderType)?.label || orderType}</span>
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
                          return (parseInt((a.label || a.id).replace(/\D/g, ''), 10) || 0) - (parseInt((b.label || b.id).replace(/\D/g, ''), 10) || 0);
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
                              <span className="font-medium truncate min-w-0">{t.label || t.id}</span>
                              <span className="text-xs capitalize whitespace-nowrap flex-shrink-0 ml-2" style={{ color: isAvailable ? COLORS.primaryGreen : COLORS.grayText }}>
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

                {/* Trash icon — context-aware:
                    unplaced items exist → Clear unplaced items (local)
                    all items placed → Cancel Order (API) */}
                {(() => {
                  const hasUnplaced = cartItems.some(i => !i.placed);
                  const hasPlaced = cartItems.some(i => i.placed && i.status !== 'cancelled');
                  if (!hasUnplaced && !hasPlaced) return null;
                  return (
                    <button
                      onClick={() => hasUnplaced
                        ? setCartItems(prev => prev.filter(i => i.placed))
                        : setShowCancelOrderModal(true)
                      }
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                      title={hasUnplaced ? "Clear unplaced items" : "Cancel Order"}
                      data-testid="clear-cart-btn"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                    </button>
                  );
                })()}

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
                isPlacingOrder={isPlacingOrder}
                hasPlacedItems={cartItems.some(i => i.placed)}
                setShowPaymentPanel={setShowPaymentPanel}
                onAddNote={(item, cartIndex) => setItemNotesModal({ item, cartIndex })}
                onCustomize={(item) => setCustomizationItem(item)}
                customer={customer}
                onCustomerChange={setCustomer}
                onClearCart={() => setCartItems(prev => prev.filter(i => i.placed))}
                onDeleteItem={(item) => setCartItems(prev => {
                  const idx = prev.indexOf(item);
                  return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
                })}
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
        <TransferFoodModal item={transferItem} currentTable={table} orders={orders} onClose={() => setTransferItem(null)} onTransfer={handleTransfer} />
      )}
      {showMergeModal && table && (
        <MergeTableModal currentTable={table} orders={orders} onClose={() => setShowMergeModal(false)} onMerge={handleMerge} />
      )}
      {showShiftModal && table && (
        <ShiftTableModal currentTable={table} onClose={() => setShowShiftModal(false)} onShift={handleShift} />
      )}
      {cancelItem && (
        <CancelFoodModal item={cancelItem} reasons={getItemCancellationReasons()} onClose={() => setCancelItem(null)} onCancel={handleCancelFood} />
      )}
      {showCancelOrderModal && (
        <CancelOrderModal
          table={table}
          itemCount={cartItems.filter(i => i.placed && i.status !== 'cancelled').length}
          reasons={getOrderCancellationReasons()}
          onClose={() => setShowCancelOrderModal(false)}
          onCancel={handleCancelOrder}
        />
      )}
      {showCustomItemModal && (
        <AddCustomItemModal
          categories={categories}
          products={products}
          onClose={() => setShowCustomItemModal(false)}
          onAdd={handleAddCustomItem}
        />
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
