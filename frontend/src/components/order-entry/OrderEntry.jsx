import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed, Scissors, ArrowRightLeft, GitMerge, X } from "lucide-react";
import { COLORS } from "../../constants";
import { useMenu, useOrders, useSettings, useRestaurant, useAuth, useTables } from "../../contexts";
import { useToast } from "../../hooks/use-toast";
import api from "../../api/axios";
import { lookupAddresses, addAddress } from "../../api/services/customerService";
import { API_ENDPOINTS } from "../../api/constants";
import { toAPI as tableToAPI } from "../../api/transforms/tableTransform";
import { toAPI as orderToAPI, customItemFromAPI, fromAPI as orderFromAPI } from "../../api/transforms/orderTransform";
import { fetchSingleOrderForSocket } from "../../api/services/orderService";
import AddCustomItemModal from "./AddCustomItemModal";
import CategoryPanel from "./CategoryPanel";
import CartPanel from "./CartPanel";
import ItemCustomizationModal from "./ItemCustomizationModal";
import OrderNotesModal from "./OrderNotesModal";
import ItemNotesModal from "./ItemNotesModal";
import CustomerModal from "./CustomerModal";
import AddressPickerModal from "./AddressPickerModal";
import AddressFormModal from "./AddressFormModal";
import OrderPlacedModal from "./OrderPlacedModal";
import TransferFoodModal from "./TransferFoodModal";
import MergeTableModal from "./MergeTableModal";
import ShiftTableModal from "./ShiftTableModal";
import CancelFoodModal from "./CancelFoodModal";
import CancelOrderModal from "./CancelOrderModal";
import CollectPaymentPanel from "./CollectPaymentPanel";
import SplitBillModal from "../modals/SplitBillModal";

const ORDER_TYPES = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "takeAway", label: "TakeAway", icon: ShoppingBag },
  { id: "walkIn", label: "Walk-In", icon: UtensilsCrossed },
];

const DROPDOWN_TABLE_SORT = { available: 0, reserved: 1, occupied: 2, billReady: 3, paid: 4, yetToConfirm: 4 };

// Order Entry Screen Component - 3-Panel Layout
const OrderEntry = ({ table, onClose, orderData, orderType = "delivery", onOrderTypeChange, allTables = [], onSelectTable, savedCart = [], onCartChange, initialShowPayment = false, initialTransferItem = null }) => {
  const { categories, products, popularFood } = useMenu();
  const { orders, addOrder, refreshOrders, removeOrder, waitForOrderRemoval, waitForOrderEngaged } = useOrders();
  const { getItemCancellationReasons, getOrderCancellationReasons } = useSettings();
  const { restaurant, cancellation } = useRestaurant();
  const { user, hasPermission } = useAuth();
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
  const [transferItem, setTransferItem] = useState(initialTransferItem);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [showCancelOrderModal, setShowCancelOrderModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(table?.orderId || null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentPanel, setShowPaymentPanel] = useState(initialShowPayment);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [walkInTableName, setWalkInTableName] = useState(""); // For Walk-In dynamic table name
  
  // API financials for placed orders (amount, subtotal from server)
  const [orderFinancials, setOrderFinancials] = useState({
    amount: orderData?.amount || 0,
    subtotalAmount: orderData?.subtotalAmount || 0,
    subtotalBeforeTax: orderData?.subtotalBeforeTax || 0,
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState(""); // Search filter for tables dropdown
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);
  const [flashItemId, setFlashItemId] = useState(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [itemNotesModal, setItemNotesModal] = useState(null); // { item, cartIndex }
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customer, setCustomer] = useState(null);
  // Delivery address state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  // Effective table — merges placedOrderId into table for same-session operations
  const effectiveTable = { ...table, orderId: placedOrderId || table?.orderId };

  // Fetch delivery addresses when customer phone is available and orderType is delivery
  const fetchDeliveryAddresses = async (phone) => {
    if (!phone?.trim()) return;
    setAddressLoading(true);
    try {
      const addresses = await lookupAddresses(phone.trim());
      setDeliveryAddresses(addresses);
      // Auto-select default if available
      const defaultAddr = addresses.find(a => a.isDefault);
      if (defaultAddr && !selectedAddress) setSelectedAddress(defaultAddr);
    } catch (err) {
      console.error('[OrderEntry] Address lookup failed:', err);
    } finally {
      setAddressLoading(false);
    }
  };

  // Handle adding new address via CRM
  const handleAddAddress = async (formData) => {
    if (!customer?.id || customer.id.startsWith('CUST-')) {
      // Local-only customer — store address locally
      const localAddr = { ...formData, id: `local_${Date.now()}`, isDefault: true };
      setDeliveryAddresses(prev => [...prev, localAddr]);
      setSelectedAddress(localAddr);
      setShowAddressForm(false);
      return;
    }
    setAddressSaving(true);
    try {
      const result = await addAddress(customer.id, formData);
      if (result?.address_id) {
        // Re-fetch addresses to get updated list
        await fetchDeliveryAddresses(customer.phone);
        // Select the newly added address
        const newAddr = { ...formData, id: result.address_id, isDefault: formData.isDefault };
        setSelectedAddress(newAddr);
      }
      setShowAddressForm(false);
    } catch (err) {
      console.error('[OrderEntry] Add address failed:', err);
    } finally {
      setAddressSaving(false);
    }
  };
  const cartKeyRef = useRef(null); // tracks previous table key for save-on-switch
  const typeDropdownRef = useRef(null);

  // Filter tables based on search query
  const filteredTables = useMemo(() => {
    if (!tableSearchQuery.trim()) return allTables;
    const query = tableSearchQuery.toLowerCase();
    return allTables.filter(t => 
      (t.label || t.id || '').toLowerCase().includes(query)
    );
  }, [allTables, tableSearchQuery]);

  // ── Permission flags ──
  const canCancelOrder = hasPermission('order_cancel');
  const canCancelItem = hasPermission('food');
  const canShiftTable = hasPermission('transfer_table');
  const canMergeOrder = hasPermission('merge_table');
  const canFoodTransfer = hasPermission('food_transfer');
  const canCustomerManage = hasPermission('customer_management');
  const canBill = hasPermission('bill');
  const canDiscount = hasPermission('discount');
  const canPrintBill = hasPermission('print_icon');

  // ── Permission-only checks ──
  // Order Card shows action if user has permission; restaurant settings validation removed
  // Actual business rules should be enforced by backend API
  const isOrderCancelAllowed = canCancelOrder;

  // Item-level cancel: permission only
  const isItemCancelAllowed = useCallback((item) => {
    return canCancelItem;
  }, [canCancelItem]);

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
        // Restore order-level notes from placed order
        if (orderData.orderNote) {
          setOrderNotes(
            orderData.orderNote.split(',').map((note, i) => ({
              id: `existing-${i}`,
              label: note.trim(),
              type: 'custom',
            })).filter(n => n.label)
          );
        }
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
      // Restore order-level notes from placed order
      if (orderData.orderNote) {
        setOrderNotes(
          orderData.orderNote.split(',').map((note, i) => ({
            id: `existing-${i}`,
            label: note.trim(),
            type: 'custom',
          })).filter(n => n.label)
        );
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

    // Validation: TakeAway requires name, Delivery requires name + phone + address
    if (orderType === 'takeAway' && !customer?.name?.trim()) {
      toast({ title: "Name Required", description: "Customer name is mandatory for TakeAway orders", variant: "destructive" });
      return;
    }
    if (orderType === 'delivery') {
      if (!customer?.name?.trim()) {
        toast({ title: "Name Required", description: "Customer name is mandatory for Delivery orders", variant: "destructive" });
        return;
      }
      if (!customer?.phone?.trim()) {
        toast({ title: "Phone Required", description: "Customer phone is mandatory for Delivery orders", variant: "destructive" });
        return;
      }
      if (!selectedAddress) {
        toast({ title: "Address Required", description: "Delivery address is mandatory for Delivery orders", variant: "destructive" });
        return;
      }
    }

    setIsPlacingOrder(true);
    try {
      const hasPlaced = cartItems.some(i => i.placed);

      if (hasPlaced && placedOrderId) {
        // Scenario 1 — Update Order: fire HTTP, wait for socket engage, redirect
        // Socket is source of truth — API response not used
        const payload = orderToAPI.updateOrder(effectiveTable, unplaced, customer, orderType, {
          restaurantId: restaurant?.id,
          orderNotes,
          printAllKOT,
          allCartItems: cartItems,
        });

        // Start listening for socket engage BEFORE firing API
        const engagePromise = waitForOrderEngaged(placedOrderId);

        // Fire API — don't await response
        let apiFailed = false;
        api.put(API_ENDPOINTS.UPDATE_ORDER, payload)
          .then(res => console.log('[UpdateOrder] response:', res.data))
          .catch(err => {
            apiFailed = true;
            console.error('[UpdateOrder] CRITICAL:', err?.response?.status, err?.response?.data);
            const apiMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed';
            toast({ title: "Order Update Failed", description: apiMsg, variant: "destructive" });
            setIsPlacingOrder(false);
          });

        // Wait for socket order-engage then redirect
        await engagePromise;
        if (apiFailed) return; // API failed — stay on screen, toast shown
        console.log('[UpdateOrder] Socket engaged — redirecting to dashboard');
      } else {
        // Scenario 2 / New Order — Fire HTTP, redirect immediately
        // Socket events (update-table engage → new-order) handle all state updates
        // For Walk-In orders: use walkInTableName as customer name if provided (for table label)
        const effectiveCustomer = orderType === 'walkIn' && walkInTableName
          ? { ...customer, name: walkInTableName }
          : customer;
        
        const payload = orderToAPI.placeOrder(
          { ...table, tableId: table?.tableId },
          cartItems, effectiveCustomer, orderType,
          { restaurantId: restaurant?.id, orderNotes, total, printAllKOT, addressId: selectedAddress?.id || null }
        );
        
        // Log station info for Auto KOT debugging
        const cartStations = payload.cart?.map(item => ({ food_id: item.food_id, station: item.station }));
        console.log('[PlaceOrder] Auto KOT - Cart stations:', cartStations);
        console.log('[PlaceOrder] payload:', JSON.stringify(payload, null, 2));
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));
        
        // Fire HTTP request (don't await response) - sockets handle state
        console.log('[PlaceOrder] Firing HTTP request...');
        api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
          .then(res => console.log('[PlaceOrder] HTTP response:', res.data))
          .catch(err => {
            console.log('[PlaceOrder] ERROR status:', err?.response?.status);
            console.log('[PlaceOrder] ERROR response:', err?.response?.data);
            const apiMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed';
            toast({ title: "Order Failed", description: apiMsg });
          });
        
        // Wait for socket update-table engage before redirect
        const tableId = Number(table?.tableId);
        if (tableId) {
          // Physical table - wait for engage socket
          console.log('[PlaceOrder] Waiting for update-table engage socket...');
          await waitForTableEngaged(tableId, 10000);
          console.log('[PlaceOrder] Table engaged, now redirecting to dashboard');
        } else {
          // Walk-in/TakeAway/Delivery - no physical table, brief delay for UX
          console.log('[PlaceOrder] No physical table (walk-in/takeaway/delivery), adding 0.5s delay for UX...');
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('[PlaceOrder] Redirecting to dashboard...');
        }
        
        setIsPlacingOrder(false);
        onClose();
        return; // Exit early
      }

      // Redirect to dashboard (for Update Order path)
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
    const sourceOrderId = effectiveTable?.orderId;
    const engagePromise = sourceOrderId ? waitForOrderEngaged(sourceOrderId) : null;

    const payload = tableToAPI.transferFood(effectiveTable, toOrder, transferredItem);
    api.post(API_ENDPOINTS.TRANSFER_FOOD, payload)
      .then(res => {
        toast({
          title: "Item Transferred",
          description: res.data?.message || `${transferredItem?.name} transferred to ${toOrder.isWalkIn ? toOrder.customer || 'WC' : `T${toOrder.tableNumber}`}`,
        });
      })
      .catch(err => {
        console.error('[TransferFood] CRITICAL:', err?.response?.status, err?.response?.data);
        const msg = err?.response?.data?.message || err?.message || 'Transfer failed';
        toast({ title: "Transfer Failed", description: msg, variant: "destructive" });
      });

    setTransferItem(null);
    if (engagePromise) await engagePromise;
    console.log('[TransferFood] Socket engaged — redirecting to dashboard');
    onClose();
  };

  const handleMerge = async ({ selectedOrders }) => {
    const targetOrderId = effectiveTable?.orderId;
    const engagePromise = targetOrderId ? waitForOrderEngaged(targetOrderId) : null;

    // Sequential API calls — one per selected source table
    for (const sourceOrder of selectedOrders) {
      const payload = tableToAPI.mergeTable(effectiveTable, sourceOrder);
      api.post(API_ENDPOINTS.MERGE_ORDER, payload)
        .then(() => {
          toast({
            title: "Tables Merged",
            description: `Merged into ${table?.label || table?.id}`,
          });
        })
        .catch(err => {
          console.error('[MergeTable] CRITICAL:', err?.response?.status, err?.response?.data);
          const msg = err?.response?.data?.message || err?.message || 'Merge failed';
          toast({ title: "Merge Failed", description: msg, variant: "destructive" });
        });
    }

    if (engagePromise) await engagePromise;
    console.log('[MergeTable] Socket engaged — redirecting to dashboard');
    onClose();
  };

  const handleShift = async ({ toTable }) => {
    const destTableId = Number(toTable?.tableId);
    const engagePromise = destTableId ? waitForTableEngaged(destTableId) : null;

    const payload = tableToAPI.shiftTable(effectiveTable, toTable);
    api.post(API_ENDPOINTS.ORDER_TABLE_SWITCH, payload)
      .then(res => {
        toast({
          title: "Table Shifted",
          description: res.data?.message || `Order moved to ${toTable.displayName}`,
        });
      })
      .catch(err => {
        console.error('[ShiftTable] CRITICAL:', err?.response?.status, err?.response?.data);
        const msg = err?.response?.data?.message || err?.message || 'Shift failed';
        toast({ title: "Shift Failed", description: msg, variant: "destructive" });
      });

    if (engagePromise) await engagePromise;
    console.log('[ShiftTable] Socket engaged — redirecting to dashboard');
    onClose();
  };

  const handleCancelFood = async ({ item, reason, cancelQuantity }) => {
    setIsPlacingOrder(true);
    const orderId = effectiveTable?.orderId || placedOrderId;
    const engagePromise = orderId ? waitForOrderEngaged(orderId) : null;

    const payload = orderToAPI.cancelItem(effectiveTable, item, reason, cancelQuantity);
    api.put(API_ENDPOINTS.CANCEL_ITEM, payload)
      .then(() => {
        toast({
          title: "Item Cancelled",
          description: `${item?.name} cancelled successfully`,
        });
      })
      .catch(err => {
        console.error('[CancelFood] CRITICAL:', err?.response?.status, err?.response?.data);
        const msg = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || err?.message || 'Cancellation failed';
        toast({ title: "Cancel Failed", description: msg, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    if (engagePromise) await engagePromise;
    console.log('[CancelFood] Socket engaged — redirecting to dashboard');
    setCancelItem(null);
    onClose();
  };

  const handleCancelOrder = async (reason) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    if (!orderId) return;

    setIsPlacingOrder(true);
    const engagePromise = waitForOrderEngaged(orderId);

    const payload = orderToAPI.cancelOrder(orderId, user?.roleName || 'Manager', reason);
    api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload)
      .catch(err => {
        console.error('[CancelOrder] CRITICAL:', err?.response?.status, err?.response?.data);
        toast({ title: "Cancel Failed", description: err?.response?.data?.message || err?.message, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    await engagePromise;
    console.log('[CancelOrder] Socket engaged — redirecting to dashboard');
    toast({
      title: "Order Cancelled",
      description: `Order cancelled for ${table?.label || table?.id}`,
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
          onBack={onClose}
          categories={categories}
        />

        {/* MIDDLE PANEL - Menu Items */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: `1px solid ${COLORS.borderGray}` }}>
          {/* Single Compact Header Row: Search + Action Icons */}
          <div className="px-4 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
            {/* Search Input - Limited width */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: COLORS.primaryOrange }} />
              <input
                data-testid="menu-search-input"
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm border-2 focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: "white", 
                  color: COLORS.darkText,
                  borderColor: COLORS.primaryOrange,
                  boxShadow: "0 2px 4px rgba(249, 115, 22, 0.15)",
                  fontSize: "13px"
                }}
              />
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Icons: Add Custom, Shift, Merge, Notes, Customer */}
            <div className="flex items-center gap-3">
              {/* Add Custom Item - First icon */}
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                style={{ border: `1px solid ${COLORS.borderGray}` }}
                title="Add Custom Item"
                data-testid="add-custom-item-btn"
              >
                <Plus className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
              </button>

              {/* Shift/Transfer Table */}
              {canShiftTable && (
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Shift Table"
                  data-testid="shift-table-btn"
                >
                  <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
                </button>
              )}

              {/* Merge Tables */}
              {canMergeOrder && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Merge Tables"
                  data-testid="merge-tables-btn"
                >
                  <GitMerge className="w-5 h-5" style={{ color: COLORS.grayText }} />
                </button>
              )}

              {/* Order Notes */}
              <button
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors relative"
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

              {/* Customer Info */}
              {canCustomerManage && (
                <button 
                  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors" 
                  title="Customer Info"
                  onClick={() => setShowCustomerModal(true)}
                  data-testid="customer-info-btn"
                >
                  <UserPlus className="w-5 h-5" style={{ color: customer ? COLORS.primaryGreen : COLORS.grayText }} />
                </button>
              )}
            </div>
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
              isProcessingPayment={isProcessingPayment}
              onBack={() => setShowPaymentPanel(false)}
              onPaymentComplete={async (paymentData) => {
                if (isProcessingPayment) return;
                setIsProcessingPayment(true);
                try {
                  // Scenario 3 — Transfer to Room (Phase 2B)
                  if (paymentData.isTransferToRoom && paymentData.roomId) {
                    const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
                    const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
                    toast({ title: "Transferred to Room", description: res.data?.message || "Order transferred successfully" });
                    // Prepaid cleanup — stay on order screen
                    setCartItems([]);
                    setShowPaymentPanel(false);
                    setPlacedOrderId(null);
                    setOrderFinancials({ amount: 0, subtotalAmount: 0, subtotalBeforeTax: 0 });
                    setOrderNotes([]);
                    setCustomer({ name: '', phone: '' });
                    if (onSelectTable) onSelectTable(null);
                    if (onOrderTypeChange) onOrderTypeChange('walkIn');
                  } else if (!placedOrderId) {
                    // Scenario 2 — fresh order + pay in one shot (prepaid via place-order with payment fields)
                    // Validation: TakeAway requires name, Delivery requires name + phone + address
                    if (orderType === 'takeAway' && !customer?.name?.trim()) {
                      toast({ title: "Name Required", description: "Customer name is mandatory for TakeAway orders", variant: "destructive" });
                      return;
                    }
                    if (orderType === 'delivery') {
                      if (!customer?.name?.trim()) {
                        toast({ title: "Name Required", description: "Customer name is mandatory for Delivery orders", variant: "destructive" });
                        return;
                      }
                      if (!customer?.phone?.trim()) {
                        toast({ title: "Phone Required", description: "Customer phone is mandatory for Delivery orders", variant: "destructive" });
                        return;
                      }
                      if (!selectedAddress) {
                        toast({ title: "Address Required", description: "Delivery address is mandatory for Delivery orders", variant: "destructive" });
                        return;
                      }
                    }

                    // Same pattern as Place Order: fire HTTP, wait for table engage, redirect
                    setIsPlacingOrder(true);

                    const tableId = Number(effectiveTable?.tableId || table?.tableId);
                    const engagePromise = tableId ? waitForTableEngaged(tableId, 10000) : null;

                    const payload = orderToAPI.placeOrderWithPayment(
                      effectiveTable, cartItems, customer, orderType, paymentData,
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT, addressId: selectedAddress?.id || null }
                    );
                    const formData = new FormData();
                    formData.append('data', JSON.stringify(payload));
                    console.log('[Prepaid] payload:', JSON.stringify(payload, null, 2));

                    let apiFailed = false;
                    api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                      .then(res => {
                        console.log('[Prepaid] response:', res.data);
                        toast({ title: "Payment Collected", description: res.data?.message || "Order placed and payment collected" });
                      })
                      .catch(err => {
                        apiFailed = true;
                        console.error('[Prepaid] CRITICAL:', err?.response?.status, err?.response?.data);
                        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
                        toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                        setIsPlacingOrder(false);
                      });

                    if (engagePromise) {
                      console.log('[Prepaid] Waiting for update-table engage socket...');
                      await engagePromise;
                    } else {
                      // Walk-in/TakeAway/Delivery — no physical table, brief delay for UX
                      console.log('[Prepaid] No physical table, adding 0.5s delay...');
                      await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    if (apiFailed) return;
                    console.log('[Prepaid] Table engaged — redirecting to dashboard');
                    onClose();
                    return; // Skip finally cleanup — isPlacingOrder cleared by onClose unmount
                  } else {
                    // Scenario 1 — existing order: collect bill via POST order-bill-payment
                    // No local table engage — order-engage socket handles locking
                    setIsPlacingOrder(true);

                    const collectOrderId = effectiveTable?.orderId || placedOrderId;
                    const engagePromise = collectOrderId ? waitForOrderEngaged(collectOrderId) : null;

                    const payload = orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData);
                    console.log('[CollectBill] payload:', JSON.stringify(payload, null, 2));
                    api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
                      .then(res => {
                        console.log('[CollectBill] response:', res.data);
                        toast({ title: "Payment Collected", description: res.data?.message || "Bill cleared successfully" });
                      })
                      .catch(err => {
                        console.error('[CollectBill] CRITICAL:', err?.response?.status, err?.response?.data);
                        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
                        toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                        setIsPlacingOrder(false);
                      });

                    if (engagePromise) await engagePromise;
                    console.log('[CollectBill] Socket engaged — redirecting to dashboard');
                    onClose();
                    return; // Skip finally cleanup — isPlacingOrder cleared by onClose unmount
                  }
                } catch (err) {
                  const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
                  toast({ title: "Payment Failed", description: msg });
                  setIsPlacingOrder(false);
                } finally {
                  setIsProcessingPayment(false);
                }
              }}
            />
          ) : (
            <>
              {/* Header Row: Table Selector + Split */}
              <div
                className="px-4 py-4 flex items-center gap-3"
                style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
              >
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
                      
                      {/* Table Search */}
                      <div className="px-3 py-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
                          <input
                            type="text"
                            placeholder="Search tables..."
                            value={tableSearchQuery}
                            onChange={(e) => setTableSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-1"
                            style={{ 
                              borderColor: COLORS.borderGray,
                              backgroundColor: "#f9fafb",
                              fontSize: "12px"
                            }}
                            data-testid="table-search-input"
                          />
                        </div>
                      </div>

                      <div className="px-3 py-1">
                        <span className="text-xs font-medium" style={{ color: COLORS.grayText }}>Tables</span>
                      </div>
                      {filteredTables.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-center" style={{ color: COLORS.grayText }}>
                          No tables found
                        </div>
                      ) : (
                        [...filteredTables]
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
                              onClick={() => { onSelectTable?.(t); setShowTypeDropdown(false); setTableSearchQuery(""); }}
                            >
                              <span className="font-medium truncate min-w-0">{t.label || t.id}</span>
                              <span className="text-xs capitalize whitespace-nowrap flex-shrink-0 ml-2" style={{ color: isAvailable ? COLORS.primaryGreen : COLORS.grayText }}>
                                {t.status === "available" ? "Available" : t.status === "paid" ? "Clear" : t.status === "billReady" ? "Bill Ready" : t.status === "yetToConfirm" ? "Clear" : t.status}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Cancel Order/Clear Cart - Prominent styling */}
                {(() => {
                  const hasUnplaced = cartItems.some(i => !i.placed);
                  const hasPlaced = cartItems.some(i => i.placed && i.status !== 'cancelled');
                  if (!hasUnplaced && !hasPlaced) return null;
                  if (!hasUnplaced && hasPlaced && !isOrderCancelAllowed) return null;
                  return (
                    <button
                      onClick={() => hasUnplaced
                        ? setCartItems(prev => prev.filter(i => i.placed))
                        : setShowCancelOrderModal(true)
                      }
                      className="px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 font-medium text-sm"
                      style={{ 
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #FECACA'
                      }}
                      title={hasUnplaced ? "Clear unplaced items" : "Cancel Order"}
                      data-testid="cancel-order-btn"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  );
                })()}

                {/* Split Bill Button - Only for dine-in/walk-in placed orders with 2+ items (not takeaway/delivery) */}
                {placedOrderId && cartItems.filter(i => i.placed).length >= 2 && orderType !== 'takeAway' && orderType !== 'delivery' && (
                  <button
                    onClick={() => setShowSplitBillModal(true)}
                    className="px-3 py-2 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 font-medium text-sm"
                    style={{ 
                      backgroundColor: '#FFF7ED',
                      color: COLORS.primaryOrange,
                      border: '1px solid #FED7AA'
                    }}
                    title="Split Bill"
                    data-testid="split-bill-btn"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Split</span>
                  </button>
                )}
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
                selectedAddress={selectedAddress}
                onAddressClick={() => {
                  if (customer?.phone) fetchDeliveryAddresses(customer.phone);
                  setShowAddressPicker(true);
                }}
                onClearCart={() => setCartItems(prev => prev.filter(i => i.placed))}
                onDeleteItem={(item) => setCartItems(prev => {
                  const idx = prev.indexOf(item);
                  return idx >= 0 ? [...prev.slice(0, idx), ...prev.slice(idx + 1)] : prev;
                })}
                orderNotes={orderNotes}
                onEditOrderNotes={() => setShowNotesModal(true)}
                canCancelItem={canCancelItem}
                canFoodTransfer={canFoodTransfer}
                canBill={canBill}
                canPrintBill={canPrintBill}
                isItemCancelAllowed={isItemCancelAllowed}
                orderType={orderType}
                walkInTableName={walkInTableName}
                onWalkInTableNameChange={setWalkInTableName}
                orderId={placedOrderId}
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
          restaurantId={restaurant?.id}
        />
      )}
      {showAddressPicker && (
        <AddressPickerModal
          onClose={() => setShowAddressPicker(false)}
          onSelect={(addr) => { setSelectedAddress(addr); setShowAddressPicker(false); }}
          onAddNew={() => { setShowAddressPicker(false); setShowAddressForm(true); }}
          addresses={deliveryAddresses}
          customerId={customer?.id}
          loading={addressLoading}
        />
      )}
      {showAddressForm && (
        <AddressFormModal
          onClose={() => setShowAddressForm(false)}
          onSave={handleAddAddress}
          saving={addressSaving}
        />
      )}
      {showSplitBillModal && (
        <SplitBillModal
          isOpen={showSplitBillModal}
          onClose={() => setShowSplitBillModal(false)}
          orderId={placedOrderId}
          items={cartItems.filter(i => i.placed && i.status !== 'cancelled').map(item => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
            price: item.price || (item.unitPrice * item.qty),
            unitPrice: item.unitPrice || item.price / item.qty,
          }))}
          onSplitSuccess={async (response) => {
            // After split, open payment for the NEW order (selected items)
            // The API response should contain the new order ID(s)
            console.log('[SplitSuccess] response:', response);
            
            try {
              // Get new order ID from response - API may return it in different formats
              const newOrderId = response?.new_order_ids?.[0] || response?.order_id || response?.data?.new_order_ids?.[0];
              
              if (newOrderId) {
                // Fetch the new order details
                const newOrder = await fetchSingleOrderForSocket(newOrderId);
                
                if (newOrder) {
                  // Add new order to OrderContext so dashboard renders it immediately
                  addOrder(newOrder);
                  
                  // Update cart with new order's items
                  const newCartItems = (newOrder.items || []).map(item => ({
                    ...item,
                    placed: true,
                  }));
                  
                  setCartItems(newCartItems);
                  setPlacedOrderId(newOrderId);
                  setOrderFinancials({
                    amount: newOrder.amount || 0,
                    subtotalAmount: newOrder.subtotalAmount || 0,
                    subtotalBeforeTax: newOrder.subtotalBeforeTax || 0,
                  });
                  
                  // Open payment panel for the new order (selected items)
                  setShowPaymentPanel(true);
                  toast({ title: "Bill Split", description: "Opening payment for selected items..." });
                } else {
                  toast({ title: "Bill Split", description: "Bill split successfully. Please select the new order from dashboard." });
                }
              } else {
                toast({ title: "Bill Split", description: "Bill split successfully. Please select the new order from dashboard." });
              }
            } catch (err) {
              console.error('[SplitSuccess] Error fetching new order:', err);
              toast({ title: "Bill Split", description: "Bill split successfully. Please select the new order from dashboard." });
            }
            
            // Refresh orders list
            refreshOrders();
            setShowSplitBillModal(false);
          }}
        />
      )}
    </div>
  );
};

export default OrderEntry;
