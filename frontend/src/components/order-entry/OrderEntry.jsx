import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed, Trash2 } from "lucide-react";
import { COLORS } from "../../constants";
import { useMenu, useOrders, useSettings, useRestaurant, useAuth, useTables } from "../../contexts";
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
const OrderEntry = ({ table, onClose, orderData, orderType = "delivery", onOrderTypeChange, allTables = [], onSelectTable, savedCart = [], onCartChange, initialShowPayment = false }) => {
  const { categories, products, popularFood } = useMenu();
  const { orders, refreshOrders, removeOrder } = useOrders();
  const { getItemCancellationReasons, getOrderCancellationReasons } = useSettings();
  const { restaurant } = useRestaurant();
  const { user } = useAuth();
  const { updateTableStatus, setTableEngaged, waitForTableEngaged } = useTables();
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
  const [showPaymentPanel, setShowPaymentPanel] = useState(initialShowPayment);
  
  // API financials for placed orders (amount, subtotal from server)
  const [orderFinancials, setOrderFinancials] = useState({
    amount: orderData?.amount || 0,
    subtotalAmount: orderData?.subtotalAmount || 0,
    subtotalBeforeTax: orderData?.subtotalBeforeTax || 0,
  });
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
      // Initialize financials from orderData
      if (orderData) {
        setOrderFinancials({
          amount: orderData.amount || 0,
          subtotalAmount: orderData.subtotalAmount || 0,
          subtotalBeforeTax: orderData.subtotalBeforeTax || 0,
        });
      }
    } else if (orderData) {
      if (orderData.customer || orderData.phone) {
        setCustomer({
          name: orderData.customer !== 'WC' ? (orderData.customer || '') : '',
          phone: orderData.phone || '',
        });
      }
      // Initialize financials from orderData
      setOrderFinancials({
        amount: orderData.amount || 0,
        subtotalAmount: orderData.subtotalAmount || 0,
        subtotalBeforeTax: orderData.subtotalBeforeTax || 0,
      });
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

  // Sync from OrderContext when socket updates the order (new-order, update-order, update-food-status)
  // Also fires when GET single order enriches the order with missing financial fields
  // Dependencies: only placedOrderId and orders — NOT orderFinancials (would cause infinite loop)
  useEffect(() => {
    if (!placedOrderId) return;
    
    const orderFromContext = orders.find(o => o.orderId === placedOrderId);
    if (!orderFromContext || !orderFromContext.items?.length) return;

    console.log('[OrderEntry] Syncing from OrderContext', {
      orderId: placedOrderId,
      amount: orderFromContext.amount,
      subtotalBeforeTax: orderFromContext.subtotalBeforeTax,
      subtotalAmount: orderFromContext.subtotalAmount,
      itemCount: orderFromContext.items?.length,
    });

    // Always sync cart items from context (socket = source of truth)
    setCartItems(prev => {
      const unplaced = prev.filter(i => !i.placed);
      const placed = orderFromContext.items.map(i => ({ ...i, placed: true }));
      return [...placed, ...unplaced];
    });

    setOrderFinancials({
      amount: orderFromContext.amount || 0,
      subtotalAmount: orderFromContext.subtotalAmount || 0,
      subtotalBeforeTax: orderFromContext.subtotalBeforeTax || 0,
    });
  }, [placedOrderId, orders]);

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
      // TODO CHG-040: call orderToAPI.editOrderItem() + api.put(EDIT_ORDER_ITEM) or api.put(EDIT_ORDER_ITEM_QTY) when endpoint provided
      // For now: local state update only (stub)
    }
    setCartItems(prev => prev.map(item => item.id === itemId ? { ...item, qty: newQty } : item));
  }, []);

  // Cart total: final payable amount including tax (for Collect Bill button)
  // Before placing: calculate locally (subtotal + tax)
  // After placing: use orderFinancials.amount from socket (already includes tax)
  const hasPlacedItems = cartItems.some(i => i.placed);
  const localSubtotal = cartItems.reduce((sum, item) =>
    item.status === 'cancelled' ? sum : sum + (item.totalPrice || (item.price * item.qty)), 0
  );
  // Calculate local tax for unplaced items
  const localTax = cartItems.reduce((sum, item) => {
    if (item.status === 'cancelled' || item.placed) return sum;
    const linePrice = item.totalPrice || (item.price * item.qty);
    const taxPct = parseFloat(item.tax?.percentage) || 0;
    if (taxPct === 0) return sum;
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
  }, 0);
  const unplacedSubtotal = cartItems
    .filter(i => !i.placed && i.status !== 'cancelled')
    .reduce((sum, item) => sum + (item.totalPrice || (item.price * item.qty)), 0);
  const unplacedTax = cartItems.reduce((sum, item) => {
    if (item.status === 'cancelled' || item.placed) return sum;
    const linePrice = item.totalPrice || (item.price * item.qty);
    const taxPct = parseFloat(item.tax?.percentage) || 0;
    if (taxPct === 0) return sum;
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
  }, 0);
  // total = final amount including tax + round-off (for Collect Bill button)
  const rawLocalTotal = Math.round((localSubtotal + localTax) * 100) / 100;
  const rawUnplacedTotal = Math.round((unplacedSubtotal + unplacedTax) * 100) / 100;
  const applyRoundOff = (raw) => {
    const ceil = Math.ceil(raw);
    const diff = Math.round((ceil - raw) * 100) / 100;
    return diff >= 0.10 ? ceil : Math.floor(raw);
  };
  const total = hasPlacedItems
    ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
    : applyRoundOff(rawLocalTotal);

  // handlePlaceOrder — CHG-037: Place Order API
  const handlePlaceOrder = async () => {
    const unplaced = cartItems.filter(i => !i.placed && i.status !== 'cancelled');
    if (unplaced.length === 0 || isPlacingOrder) return;
    setIsPlacingOrder(true);
    try {
      const hasPlaced = cartItems.some(i => i.placed);

      if (hasPlaced && placedOrderId) {
        // Scenario 1 — Update Order: await API + wait for socket engage before redirect
        const payload = orderToAPI.updateOrder(effectiveTable, unplaced, customer, orderType, {
          restaurantId: restaurant?.id,
          orderNotes,
          printAllKOT,
          allCartItems: cartItems,
        });
        const response = await api.put(API_ENDPOINTS.UPDATE_ORDER, payload);
        console.log('[UpdateOrder] response:', response.data);
        toast({ title: "Order Updated", description: "Items sent to kitchen" });

        // Wait for socket update-table (engage) before redirect
        const tableId = Number(effectiveTable?.tableId);
        if (tableId) {
          await waitForTableEngaged(tableId, 5000);
        }
      } else {
        // Scenario 2 / New Order — Place Order: await API + wait for socket engage before redirect
        const payload = orderToAPI.placeOrder(
          { ...table, tableId: table?.tableId },
          cartItems, customer, orderType,
          { restaurantId: restaurant?.id, orderNotes, total, printAllKOT }
        );
        console.log('[PlaceOrder] payload:', JSON.stringify(payload, null, 2));
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));
        const response = await api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log('[PlaceOrder] response:', response.data);
        toast({ title: "Order Placed", description: "Order sent to kitchen" });

        // Wait for socket update-table (engage) before redirect — same pattern as Update Order
        const tableId = Number(table?.tableId);
        if (tableId) {
          await waitForTableEngaged(tableId, 5000);
        }
      }

      // Redirect to dashboard
      onClose();
    } catch (err) {
      console.log('[PlaceOrder] ERROR status:', err?.response?.status);
      console.log('[PlaceOrder] ERROR response:', err?.response?.data);
      const apiMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed';
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
    // Always use partial-cancel endpoint with cancel_qty
    // Full cancel = cancel_qty equals item.qty
    const payload = orderToAPI.cancelItem(effectiveTable, item, reason, cancelQuantity);
    const response = await api.put(API_ENDPOINTS.CANCEL_ITEM, payload);
    toast({
      title: "Item Cancelled",
      description: response.data?.message || `${item?.name} cancelled successfully`,
    });
    
    // Socket update-order-status will update OrderContext
    // useEffect will sync cartItems + orderFinancials from context
    console.log('[CancelFood] Waiting for socket sync');
    setCancelItem(null);
  };

  const handleCancelOrder = async (reason) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    if (!orderId) return;

    // Remove BEFORE api call — socket is faster than HTTP response
    // If we await api.put first, socket arrives, handler finds order still in context, re-adds it
    removeOrder(orderId);
    const tableId = effectiveTable?.tableId || table?.tableId;
    if (tableId) {
      updateTableStatus(tableId, 'available');
    }

    toast({
      title: "Order Cancelled",
      description: `Order cancelled for ${table?.label || table?.id}`,
    });

    onClose();

    // Fire API call after removing from context
    try {
      const payload = orderToAPI.cancelOrder(orderId, user?.roleName || 'Manager', reason);
      await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
    } catch (err) {
      console.error('[CancelOrder] API call failed:', err);
    }
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
          <div className="flex-1 overflow-y-auto p-4" style={{ opacity: isPlacingOrder ? 0.5 : 1, pointerEvents: isPlacingOrder ? 'none' : 'auto' }}>
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
              isRoom={table?.isRoom}
              associatedOrders={orderData?.associatedOrders || []}
              orderFinancials={orderFinancials}
              hasPlacedItems={cartItems.some(i => i.placed)}
              onBack={() => setShowPaymentPanel(false)}
              onPaymentComplete={async (paymentData) => {
                try {
                  // Scenario 3 — Transfer to Room (Phase 2B)
                  if (paymentData.isTransferToRoom && paymentData.roomId) {
                    const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
                    const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
                    toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
                  } else if (!placedOrderId) {
                    // Scenario 2 — fresh order: place + pay in one shot (same endpoint, payment_status=paid)
                    const payload = orderToAPI.placeOrderWithPayment(
                      effectiveTable, cartItems, customer, orderType, paymentData,
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT }
                    );
                    const formData = new FormData();
                    formData.append('data', JSON.stringify(payload));
                    const res = await api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    toast({ title: "Payment Collected", description: res.data?.message || "Order placed and payment collected" });
                  } else {
                    // Scenario 1 — existing order: collect payment only (same endpoint with order_id)
                    const payload = orderToAPI.collectBillExisting(effectiveTable, paymentData, orderFinancials);
                    const formData = new FormData();
                    formData.append('data', JSON.stringify(payload));
                    const res = await api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    toast({ title: "Payment Collected", description: res.data?.message || "Bill cleared successfully" });
                  }
                  setCartItems([]);
                  setShowPaymentPanel(false);
                  setPlacedOrderId(null);
                  setOrderFinancials({ amount: 0, subtotalAmount: 0, subtotalBeforeTax: 0 });
                  setOrderNotes([]);
                  setCustomer({ name: '', phone: '' });
                  // Prepaid: stay on order screen, clear table, switch to walkIn
                  if (onSelectTable) onSelectTable(null);
                  if (onOrderTypeChange) onOrderTypeChange('walkIn');
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
                isRoom={table?.isRoom}
                associatedOrders={orderData?.associatedOrders || []}
                onAddNote={(item, cartIndex) => setItemNotesModal({ item, cartIndex })}
                onCustomize={(item) => setCustomizationItem(item)}
                customer={customer}
                onCustomerChange={setCustomer}
                onClearCart={() => setCartItems(prev => prev.filter(i => i.placed))}
                onDeleteItem={(item) => setCartItems(prev => {
                  const idx = prev.indexOf(item);
                  return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
                })}
                orderNotes={orderNotes}
                onEditOrderNotes={() => setShowNotesModal(true)}
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
            // Update the cart item with notes (clear legacy item.notes, use itemNotes array)
            setCartItems(prev => prev.map((item, idx) => 
              idx === itemNotesModal.cartIndex 
                ? { ...item, itemNotes: notes, notes: '' }
                : item
            ));
            setItemNotesModal(null);
          }}
          initialNotes={
            itemNotesModal.item?.itemNotes?.length > 0
              ? itemNotesModal.item.itemNotes
              : itemNotesModal.item?.notes
                ? [{ id: `custom-legacy`, label: itemNotesModal.item.notes, type: 'custom' }]
                : []
          }
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
