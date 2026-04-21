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
import { fetchSingleOrderForSocket, printOrder } from "../../api/services/orderService";
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
  const { orders, addOrder, refreshOrders, removeOrder, waitForOrderRemoval, waitForOrderEngaged, waitForOrderReady, getOrderByTableId, getOrderById } = useOrders();
  const { getItemCancellationReasons, getOrderCancellationReasons } = useSettings();
  const { restaurant, cancellation, settings } = useRestaurant();
  const { user, hasPermission } = useAuth();
  const { updateTableStatus, setTableEngaged, waitForTableEngaged, isTableEngaged } = useTables();
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
  // BUG-004 (QA, Apr 2026): grand total captured at the moment Split Bill is
  // opened from CollectPaymentPanel. Used by SplitBillModal as the authoritative
  // total (includes discount / SC / tax / tip / delivery / round-off).
  const [splitGrandTotal, setSplitGrandTotal] = useState(0);
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
          // BUG-003 (QA, Apr 2026): use actual user-entered customerName from the
          // transform — never the synthetic display label (customer can be
          // 'Walk-In' | 'TA' | 'Del'). Leaking the label into customer.name
          // caused CollectPaymentPanel to pre-fill the Credit/TAB Name field
          // with 'Walk-In' for walk-in orders (and 'TA'/'Del' similarly).
          name: orderData.customerName || '',
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
        // BUG-267: Restore delivery address from existing order
        if (orderData.deliveryAddress) {
          setSelectedAddress(orderData.deliveryAddress);
        }
      }
    } else if (orderData) {
      if (orderData.customer || orderData.phone) {
        setCustomer({
          // BUG-003 (QA, Apr 2026): use actual user-entered customerName from the
          // transform — never the synthetic display label. See detailed comment
          // in the savedCart branch above.
          name: orderData.customerName || '',
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
      // BUG-267: Restore delivery address from existing order
      if (orderData.deliveryAddress) {
        setSelectedAddress(orderData.deliveryAddress);
      }
      if (orderData.items && orderData.items.length > 0) {
        const existingItems = orderData.items.map(item => ({
          id: item.id,
          foodId: item.foodId,
          tax: item.tax || { percentage: 0, type: 'GST', calculation: 'Exclusive', isInclusive: false },
          name: item.name,
          qty: item.qty || 1,
          _originalQty: item.qty || 1, // BUG-237: track server qty for delta detection
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
      // Keep unplaced items that are NOT delta items (delta items are invalidated by server update)
      const unplaced = prev.filter(i => !i.placed && !i._deltaForId);
      const placed = orderFromContext.items.map(i => ({ ...i, placed: true, _originalQty: i.qty || 1 }));
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
    // Case 3: Prepaid orders cannot be edited
    if (isPrepaid && placedOrderId) {
      toast({ title: "Cannot Edit", description: "Prepaid orders cannot be modified", variant: "destructive" });
      return;
    }
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
  // Placed (placed: true)   → BUG-237: create unplaced delta item for qty increase
  const updateQuantity = useCallback((itemId, newQty, isPlaced = false) => {
    if (isPlaced) {
      // BUG-237: For placed items, qty increase creates an unplaced delta item
      // that flows through the normal Update Order pipeline
      setCartItems(prev => {
        const placedItem = prev.find(i => i.id === itemId && i.placed);
        if (!placedItem) return prev;

        const originalQty = placedItem._originalQty || placedItem.qty;
        
        // Block decrease below original qty (use Cancel Item for that)
        if (newQty < originalQty) return prev;

        // If back to original qty, remove any delta item
        if (newQty === originalQty) {
          return prev.filter(i => !(i._deltaForId === itemId && !i.placed));
        }

        const deltaQty = newQty - originalQty;
        const existingDelta = prev.find(i => i._deltaForId === itemId && !i.placed);

        if (existingDelta) {
          // Update existing delta item qty
          return prev.map(i => i._deltaForId === itemId && !i.placed ? { ...i, qty: deltaQty } : i);
        } else {
          // Create new unplaced delta item
          const deltaItem = {
            ...placedItem,
            id: placedItem.foodId || placedItem.id, // use foodId for cart-update (food catalog ID)
            qty: deltaQty,
            placed: false,
            _deltaForId: itemId, // link back to placed item
            _originalQty: undefined,
            status: 'preparing',
            addedAt: new Date().toISOString(),
          };
          return [...prev, deltaItem];
        }
      });
      return;
    }
    setCartItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      // BUG-017 (Apr-2026): Recompute totalPrice on qty change for customized items.
      // Plain items (no customization) have no `totalPrice` — the render fallback
      // `item.price * item.qty` already handles them correctly.
      if (item.totalPrice !== undefined && item.totalPrice !== null) {
        const basePrice = (item.selectedSize?.price ?? item.price) || 0;
        const variantsPrice = item.selectedVariants
          ? Object.values(item.selectedVariants).reduce((s, opt) => s + (parseFloat(opt?.price) || 0), 0)
          : 0;
        const addonsArr = Array.isArray(item.selectedAddons) ? item.selectedAddons : [];
        const addonsPrice = addonsArr.reduce(
          (s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)),
          0
        );
        const unitPrice = basePrice + variantsPrice + addonsPrice;
        return { ...item, qty: newQty, totalPrice: unitPrice * newQty };
      }
      return { ...item, qty: newQty };
    }));
  }, []);

  // Cart total: final payable amount including tax (for Collect Bill button)
  // Before placing: calculate locally (subtotal + tax)
  // After placing: use orderFinancials.amount from socket (already includes tax)
  const hasPlacedItems = cartItems.some(i => i.placed);
  const hasUnplacedItems = cartItems.some(i => !i.placed && i.status !== 'cancelled');

  // Live order status & payment type from OrderContext (socket-synced)
  const liveOrder = placedOrderId ? orders.find(o => o.orderId === placedOrderId) : null;
  const orderStatus = liveOrder?.status || orderData?.status || null;
  const orderPaymentType = liveOrder?.paymentType || orderData?.paymentType || '';
  const isPrepaid = orderPaymentType === 'prepaid';
  const isServed = orderStatus === 'served';
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
          serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom) ? (restaurant?.serviceChargePercentage || 0) : 0,
          addressId: selectedAddress?.id || null,
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
        // BUG-210: Pre-flight check — prevent placing on already-occupied/engaged table
        const preCheckTableId = Number(table?.tableId);
        if (preCheckTableId) {
          if (isTableEngaged(preCheckTableId)) {
            toast({ title: "Table Busy", description: "This table is being updated by another device. Please wait.", variant: "destructive" });
            setIsPlacingOrder(false);
            return;
          }
          const existingOrder = getOrderByTableId(preCheckTableId);
          if (existingOrder) {
            toast({ title: "Table Occupied", description: "This table already has an active order. Please refresh the dashboard.", variant: "destructive" });
            setIsPlacingOrder(false);
            return;
          }
        }

        // Scenario 2 / New Order — Fire HTTP, redirect immediately
        // Socket events (update-table engage → new-order) handle all state updates
        // For Walk-In orders: use walkInTableName as customer name if provided (for table label)
        const effectiveCustomer = orderType === 'walkIn' && walkInTableName
          ? { ...customer, name: walkInTableName }
          : customer;
        
        const payload = orderToAPI.placeOrder(
          { ...table, tableId: table?.tableId },
          cartItems, effectiveCustomer, orderType,
          { restaurantId: restaurant?.id, orderNotes, total, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom) ? (restaurant?.serviceChargePercentage || 0) : 0 }
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

              {/* Shift/Transfer Table — hidden for TakeAway/Delivery (no physical table) and prepaid orders (BUG-270) */}
              {canShiftTable && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid && (
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Shift Table"
                  data-testid="shift-table-btn"
                >
                  <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
                </button>
              )}

              {/* Merge Tables — hidden for TakeAway/Delivery (no physical table) and prepaid orders (BUG-270) */}
              {canMergeOrder && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid && (
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
              orderType={orderType}
              onBack={() => setShowPaymentPanel(false)}
              // BUG-004 (QA, Apr 2026): expose Split Bill trigger from the Collect
              // Payment screen. Only provided when eligible: postpaid placed
              // dine-in/walk-in order with 2+ placed items.
              onOpenSplitBill={
                (placedOrderId
                  && cartItems.filter(i => i.placed && i.status !== 'cancelled').length >= 2
                  && orderType !== 'takeAway'
                  && orderType !== 'delivery'
                  && !isPrepaid)
                  ? (grandTotal) => {
                      setSplitGrandTotal(Number(grandTotal) || 0);
                      setShowSplitBillModal(true);
                    }
                  : null
              }
              onPrintBill={async (overrides) => {
                // BUG-277: Manual print bill from CollectPaymentPanel.
                // Uses existing order's rawOrderDetails; only enabled when placed items exist.
                try {
                  const printOrderId = effectiveTable?.orderId || placedOrderId;
                  if (!printOrderId) {
                    toast({ title: "Cannot print bill", description: "Order not placed yet", variant: "destructive" });
                    return;
                  }
                  const order = getOrderById(printOrderId) || orderData;
                  if (!order || !order.rawOrderDetails) {
                    toast({ title: "Cannot print bill", description: "Order details unavailable", variant: "destructive" });
                    return;
                  }
                  // BUG-012: inject selectedAddress so print payload has delivery address
                  const printOverrides = orderType === 'delivery' && selectedAddress
                    ? { ...overrides, deliveryAddress: selectedAddress }
                    : overrides;
                  await printOrder(printOrderId, 'bill', null, order, restaurant?.serviceChargePercentage || 0, printOverrides);
                  toast({ title: "Bill request sent", description: `Order #${printOrderId}` });
                } catch (err) {
                  console.error('[PrintBill] error:', err?.response?.status, err?.response?.data);
                  const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Bill print failed';
                  toast({ title: "Failed to print bill", description: msg, variant: "destructive" });
                }
              }}
              onPaymentComplete={async (paymentData) => {
                if (isProcessingPayment) return;
                setIsProcessingPayment(true);

                // BUG-273 (Session 16, Feb 2026): Auto-print bill AFTER a FRESH new-order
                // prepaid Place+Pay succeeds. Source of truth is the socket-hydrated order
                // in OrderContext, plus LIVE paymentData overrides from CollectPaymentPanel.
                //
                // BUG-001 (QA, Apr 2026): Previously this path called printOrder WITHOUT
                // overrides, which caused buildBillPrintPayload's default branch to emit
                // discount_amount=0 and Tip=0 (see orderTransform.js lines 975, 997).
                // Fix: forward the live bill values (tip, discounts, SC, delivery, tax)
                // from paymentData — same override shape as manual "Print Bill" button
                // (CollectPaymentPanel.handlePrintBill, lines 360-384).
                //
                // Scope: new-order ONLY. Not fired on collect-bill (update-order-paid) or
                // item edit (update-order). Manual "Print Bill" in CollectPaymentPanel
                // handles those cases explicitly.
                //
                // Pipeline:
                //   1. Fire HTTP place-order, capture response.order_id
                //   2. Wait for update-table engage (dine-in) OR 0.5s (walk-in/TA/Del) — redirect timing
                //   3. waitForOrderReady(orderId, 3000) — socket new-order landed in context + engage released
                //   4. Read order from context via getOrderById(orderId)
                //   5. printOrder(..., overrides from paymentData) — live bill values used
                const autoPrintNewOrderIfEnabled = async (newOrderId) => {
                  // [BUG-273 diag] Single consolidated entry log — shows every gate state.
                  console.log('[AutoPrintBill] entry', {
                    'settings.autoBill': settings?.autoBill,
                    'settings (full)': settings,
                    newOrderId,
                    'typeof newOrderId': typeof newOrderId,
                    'restaurant.serviceChargePercentage': restaurant?.serviceChargePercentage,
                  });
                  try {
                    if (!settings?.autoBill) {
                      console.warn('[AutoPrintBill] SKIPPED — settings.autoBill is falsy. Value:', settings?.autoBill, 'full settings:', settings);
                      return;
                    }
                    if (!newOrderId) {
                      console.error('[AutoPrintBill] SKIPPED — no order_id returned from place-order response (capture returned null)');
                      return;
                    }
                    console.log(`[AutoPrintBill] waiting for order ${newOrderId} to settle in context (3000ms cap)...`);
                    // BUG-273 (Session 16b): waitForOrderReady now returns the order object
                    // directly from ordersRef (bypasses React closure staleness on getOrderById).
                    const order = await waitForOrderReady(Number(newOrderId), 3000);
                    console.log(`[AutoPrintBill] waitForOrderReady(${newOrderId}) resolved:`, order ? { orderId: order.orderId, hasRawOrderDetails: !!order.rawOrderDetails } : null);
                    if (!order) {
                      console.error(`[AutoPrintBill] SKIPPED — order ${newOrderId} did not settle in context within 3000ms`);
                      return;
                    }
                    if (!order.rawOrderDetails) {
                      console.error(`[AutoPrintBill] SKIPPED — order ${newOrderId} missing rawOrderDetails after settle`);
                      return;
                    }
                    console.log('[AutoPrintBill] FIRING printOrder for order:', newOrderId);
                    // BUG-001 (QA, Apr 2026): forward LIVE bill values from paymentData so
                    // the order-temp-store payload carries tip / discount / loyalty / wallet
                    // / service-charge / delivery / discount-adjusted tax. Without overrides,
                    // buildBillPrintPayload default branch hardcodes discount=0 and relies
                    // on socket-echoed tip_amount (which is not guaranteed on fresh orders).
                    // Mirrors CollectPaymentPanel.handlePrintBill override shape.
                    const autoPrintDiscountAmount = Math.round(
                      ((paymentData?.discounts?.manual || 0)
                        + (paymentData?.discounts?.preset || 0)
                        + (paymentData?.discounts?.couponDiscount || 0)) * 100
                    ) / 100;
                    const autoPrintOverrides = {
                      orderItemTotal:      paymentData?.itemTotal,
                      orderSubtotal:       paymentData?.subtotal,
                      paymentAmount:       paymentData?.finalTotal,
                      discountAmount:      autoPrintDiscountAmount,
                      couponCode:          paymentData?.discounts?.couponTitle || '',
                      loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                      walletAmount:        paymentData?.discounts?.walletBalance || 0,
                      serviceChargeAmount: paymentData?.serviceCharge || 0,
                      deliveryCharge:      paymentData?.deliveryCharge || 0,
                      gstTax:              paymentData?.printGstTax,
                      vatTax:              paymentData?.printVatTax,
                      tip:                 paymentData?.tip || 0,
                      // BUG-012: inject delivery address for print
                      ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                    };
                    console.log('[AutoPrintBill] overrides:', autoPrintOverrides);
                    await printOrder(
                      Number(newOrderId),
                      'bill',
                      null,
                      order,
                      restaurant?.serviceChargePercentage || 0,
                      autoPrintOverrides,
                    );
                    console.log('[AutoPrintBill] printOrder COMPLETED for order:', newOrderId);
                  } catch (err) {
                    console.error('[AutoPrintBill] THREW (non-blocking):', err?.response?.status, err?.response?.data || err?.message, err);
                  }
                };

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
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom) ? (restaurant?.serviceChargePercentage || 0) : 0, autoBill: settings?.autoBill || false }
                    );
                    const formData = new FormData();
                    formData.append('data', JSON.stringify(payload));
                    console.log('[Prepaid] payload:', JSON.stringify(payload, null, 2));

                    let apiFailed = false;
                    let newOrderId = null;
                    // BUG-273 (Session 16 fix-up): HTTP promise must be captured and awaited
                    // before auto-print. Previously fire-and-forget .then() caused newOrderId
                    // to remain null when autoPrintNewOrderIfEnabled ran, because engage socket
                    // arrives BEFORE HTTP response (per CLARIFICATIONS §8). Result: print skipped.
                    const placePromise = api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    })
                      .then(res => {
                        console.log('[Prepaid] response:', res.data);
                        // [BUG-273 diag] Explicit multi-shape capture log
                        const o1 = res?.data?.order_id;
                        const o2 = res?.data?.data?.order_id;
                        const o3 = res?.data?.new_order_ids?.[0];
                        newOrderId = o1 || o2 || o3 || null;
                        console.log('[Prepaid] newOrderId capture:', { 'res.data.order_id': o1, 'res.data.data.order_id': o2, 'res.data.new_order_ids[0]': o3, 'chosen': newOrderId });
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

                    // BUG-273: block on HTTP response so newOrderId is populated before auto-print.
                    // Engage socket typically arrives first; we must also wait for HTTP to capture order_id.
                    await placePromise;

                    if (apiFailed) return;
                    console.log('[Prepaid] Table engaged + HTTP resolved — redirecting to dashboard');
                    // BUG-273: auto-print bill for fresh new-order (event-driven wait on context settle).
                    // Scope: new-order ONLY. Scenario 1 (collect-bill) intentionally does NOT auto-print.
                    await autoPrintNewOrderIfEnabled(newOrderId);
                    onClose();
                    return; // Skip finally cleanup — isPlacingOrder cleared by onClose unmount
                  } else {
                    // Scenario 1 — existing order: collect bill via POST order-bill-payment
                    // No local table engage — order-engage socket handles locking
                    //
                    // BUG-002 (QA, Apr 2026): Auto-print bill fires here on successful
                    // collect-bill when settings.autoBill is ON. Per QA product contract,
                    // the user expects `order-temp-store` to be called after a successful
                    // postpaid collect-bill (same behavior as Scenario 2 prepaid).
                    // Overrides mirror BUG-001 shape so tip/discount/SC/delivery are not
                    // zeroed (default buildBillPrintPayload branch hardcodes discount=0).
                    //
                    // Supersedes earlier BUG-273 Session-16 comment that restricted auto-
                    // print to new-order only.
                    setIsPlacingOrder(true);

                    const collectOrderId = effectiveTable?.orderId || placedOrderId;
                    const engagePromise = collectOrderId ? waitForOrderEngaged(collectOrderId) : null;

                    const payload = orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, {
                      autoBill: settings?.autoBill || false,
                      waiterId: user?.employeeId || '',
                      restaurantName: restaurant?.name || '',
                    });
                    console.log('[CollectBill] payload:', JSON.stringify(payload, null, 2));

                    // BUG-002: await the bill-payment so we can gate auto-print on success.
                    let billPaymentFailed = false;
                    await api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
                      .then(res => {
                        console.log('[CollectBill] response:', res.data);
                        toast({ title: "Payment Collected", description: res.data?.message || "Bill cleared successfully" });
                      })
                      .catch(err => {
                        billPaymentFailed = true;
                        console.error('[CollectBill] CRITICAL:', err?.response?.status, err?.response?.data);
                        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
                        toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                        setIsPlacingOrder(false);
                      });

                    if (billPaymentFailed) return;

                    // BUG-002 (QA, Apr 2026): fire auto-print AFTER successful collect-bill.
                    // Non-blocking (wrapped in try/catch); if print fails, payment remains
                    // collected and manual "Print Bill" stays available as fallback.
                    if (settings?.autoBill && collectOrderId) {
                      try {
                        const orderForPrint = getOrderById(Number(collectOrderId));
                        if (orderForPrint && orderForPrint.rawOrderDetails) {
                          const collectBillDiscountAmount = Math.round(
                            ((paymentData?.discounts?.manual || 0)
                              + (paymentData?.discounts?.preset || 0)
                              + (paymentData?.discounts?.couponDiscount || 0)) * 100
                          ) / 100;
                          const collectBillOverrides = {
                            orderItemTotal:      paymentData?.itemTotal,
                            orderSubtotal:       paymentData?.subtotal,
                            paymentAmount:       paymentData?.finalTotal,
                            discountAmount:      collectBillDiscountAmount,
                            couponCode:          paymentData?.discounts?.couponTitle || '',
                            loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                            walletAmount:        paymentData?.discounts?.walletBalance || 0,
                            serviceChargeAmount: paymentData?.serviceCharge || 0,
                            deliveryCharge:      paymentData?.deliveryCharge || 0,
                            gstTax:              paymentData?.printGstTax,
                            vatTax:              paymentData?.printVatTax,
                            tip:                 paymentData?.tip || 0,
                            // BUG-012: inject delivery address for print
                            ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                          };
                          console.log('[AutoPrintCollectBill] overrides:', collectBillOverrides);
                          await printOrder(
                            Number(collectOrderId),
                            'bill',
                            null,
                            orderForPrint,
                            restaurant?.serviceChargePercentage || 0,
                            collectBillOverrides,
                          );
                          console.log('[AutoPrintCollectBill] printOrder COMPLETED for order:', collectOrderId);
                        } else {
                          console.warn('[AutoPrintCollectBill] SKIPPED — order or rawOrderDetails missing for', collectOrderId);
                        }
                      } catch (err) {
                        console.error('[AutoPrintCollectBill] THREW (non-blocking):', err?.response?.status, err?.response?.data || err?.message, err);
                      }
                    }

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

                {/* BUG-004 (QA, Apr 2026): Split Bill button moved from OrderEntry header
                    into CollectPaymentPanel header so the split is driven by the LIVE
                    grand total (finalTotal) — including discount / SC / tax / tip /
                    delivery / round-off — instead of the raw item subtotal.
                    Modal still mounts below at the OrderEntry level. */}
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
                isPrepaid={isPrepaid}
                isServed={isServed}
                hasUnplacedItems={hasUnplacedItems}
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
          // BUG-004 (QA, Apr 2026): grand total captured when Split Bill was
          // opened from CollectPaymentPanel (includes discount / SC / tax / tip /
          // delivery / round-off). Modal uses this as the authoritative total.
          grandTotal={splitGrandTotal}
          items={cartItems.filter(i => i.placed && i.status !== 'cancelled').map(item => {
            // BUG-004: compute line total the SAME way CollectPaymentPanel.getItemLinePrice
            // does (unit × qty + addons + variations). Previously `price || (unitPrice * qty)`
            // short-circuited and passed unit price as line total, under-reporting totals
            // for qty>1 items and ignoring addons/variations.
            const qty = item.qty || 1;
            const unit = Number(item.price) || 0; // cart.item.price is unit price
            const addonSum = (item.addOns || []).reduce(
              (s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)),
              0
            );
            const varSum = (item.variation || []).reduce((s, group) => {
              const groupSum = Array.isArray(group?.values)
                ? group.values.reduce((gs, val) => gs + (parseFloat(val.optionPrice) || 0), 0)
                : (parseFloat(group?.price) || 0);
              return s + groupSum;
            }, 0);
            const lineTotal = item.totalPrice != null
              ? Number(item.totalPrice)
              : (unit * qty) + ((addonSum + varSum) * qty);
            return {
              id: item.id,
              name: item.name,
              qty,
              price: lineTotal, // LINE TOTAL (was unit price via short-circuit)
              unitPrice: unit,
            };
          })}
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
