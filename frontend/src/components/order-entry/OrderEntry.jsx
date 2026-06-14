import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronDown, Search, UserPlus, StickyNote, Plus, Truck, ShoppingBag, UtensilsCrossed, Scissors, ArrowRightLeft, GitMerge, X } from "lucide-react";
import { COLORS } from "../../constants";
import { useMenu, useOrders, useSettings, useRestaurant, useAuth, useTables } from "../../contexts";
import { useToast } from "../../hooks/use-toast";
import api from "../../api/axios";
import { lookupAddresses, addAddress, lookupCustomer } from "../../api/services/customerService";
import { API_ENDPOINTS } from "../../api/constants";
import { toAPI as tableToAPI } from "../../api/transforms/tableTransform";
import { toAPI as orderToAPI, customItemFromAPI, fromAPI as orderFromAPI, calculateSelectedVariantsPrice } from "../../api/transforms/orderTransform";
import { fetchSingleOrderForSocket, printOrder } from "../../api/services/orderService";
// CR-008 #4 Phase A / Bucket D1 (May-2026): post-Collect-Bill stay-vs-redirect
// preference. Read site for this flag is the success branch of
// onPaymentComplete (Scenario 1 — collect bill on existing order, see line
// ~1492). Default OFF preserves today's redirect-to-dashboard behavior.
import { getStayOnOrderAfterBill } from "../../utils/orderEntryPrefs";
import { getQsrModeEnabled, getQsrDiscountEnabled } from "../../utils/qsrModePrefs";
import { useCustomerIntel } from "../../hooks/useCustomerIntel";
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
import { PrintBillButton } from "./RePrintButton";
import SplitBillModal from "../modals/SplitBillModal";
// CR-010: Weight-based billing
import WeightEntryModal from "./WeightEntryModal";
import { getWeightPromptEnabled } from "../../utils/weightEntryPrefs";

const ORDER_TYPES = [
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "takeAway", label: "TakeAway", icon: ShoppingBag },
  { id: "walkIn", label: "Walk-In", icon: UtensilsCrossed },
];

const DROPDOWN_TABLE_SORT = { available: 0, reserved: 1, occupied: 2, billReady: 3, paid: 4, yetToConfirm: 4 };

// Order Entry Screen Component - 3-Panel Layout
const OrderEntry = ({ table, onClose, orderData, orderType = "delivery", onOrderTypeChange, allTables = [], onSelectTable, savedCart = [], onCartChange, initialShowPayment = false, initialTransferItem = null, onCollectBillStayOnOrder }) => {
  const { categories, products } = useMenu();
  const { orders, addOrder, refreshOrders, removeOrder, waitForOrderRemoval, waitForOrderEngaged, waitForOrderReady, getOrderByTableId, getOrderById } = useOrders();
  const { getItemCancellationReasons, getOrderCancellationReasons } = useSettings();
  const { restaurant, features, cancellation, settings, printerAgents } = useRestaurant();
  const { user, hasPermission, permissions } = useAuth();
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
    // BUG-018 Part 1 (Apr-2026): propagate catalog-complimentary flags into the
    // cart-item shape so buildCartItem / collectBillExisting can emit the actual
    // product price in complementary_price / complementary_total. Without these
    // two lines, the Step 1 conditional always evaluates to false and emits 0.
    isComplementary: product.isComplementary,
    complementaryPrice: product.complementaryPrice,
    // CR-010: Weight-based billing fields
    itemUnit: product.itemUnit || null,
    itemUnitPrice: product.itemUnitPrice || 0,
    isWeightItem: ['Kg','gm','L','ml'].includes(product.itemUnit),
    // CR-028: Discount eligibility flag
    giveDiscount: product.giveDiscount !== false,
  });

  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [printAllKOT,  setPrintAllKOT]  = useState(() => !!restaurant?.settings?.autoKot);
  const [printAllBill, setPrintAllBill] = useState(() => !!restaurant?.settings?.autoBill);
  // BUG-099: QSR mode flags — read from localStorage once per mount
  const qsrMode = useMemo(() => getQsrModeEnabled(), []);
  const qsrDiscountEnabled = useMemo(() => getQsrDiscountEnabled(), []);
  // BUG-AUTOKOT/AUTOBILL OVERRIDE-SCOPE (May-2026): the previous on-change
  // useEffect (`[settings?.autoKot]` / `[settings?.autoBill]`) re-synced state
  // on every reference change to settings, which clobbered a cashier override
  // mid-order whenever the profile / restaurant context refreshed (re-login,
  // settings save, socket-driven settings refresh).
  //
  // Per-order semantics: the override should hold for the current order only;
  // a fresh OrderEntry mount should pre-tick from the latest profile value.
  // We hydrate ONCE per OrderEntry instance, the first time the REAL profile
  // payload lands (`restaurant.settings`). RestaurantContext exposes a
  // defaulted `settings` object {autoKot:false, autoBill:false} even before
  // the profile loads, so we MUST gate on `restaurant?.settings` (the actual
  // payload) — not on `settings` — otherwise we hydrate with the defaults and
  // never pick up the real values. After hydration the ref blocks any future
  // re-sync, preserving manual overrides.
  const settingsHydratedRef = useRef(false);
  useEffect(() => {
    if (settingsHydratedRef.current) return;
    if (!restaurant?.settings) return;
    setPrintAllKOT(!!restaurant.settings.autoKot);
    setPrintAllBill(!!restaurant.settings.autoBill);
    settingsHydratedRef.current = true;
  }, [restaurant?.settings]);
  const [customizationItem, setCustomizationItem] = useState(null);
  // BUG-035 (Apr-2026): dynamic-price item awaiting cashier price entry.
  // When a menu item has base price === 1 it is treated as a "dynamic-price" item.
  // The cashier must enter an actual price before the item is added to the cart.
  const [dynamicPriceItem, setDynamicPriceItem] = useState(null);
  const [dynamicPriceInput, setDynamicPriceInput] = useState('');
  const [dynamicPriceError, setDynamicPriceError] = useState('');
  // CR-010: Weight item awaiting weight entry
  const [weightEntryItem, setWeightEntryItem] = useState(null);
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
  // CR-018: Schedule Order state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(null); // "YYYY-MM-DD HH:mm:ss" or null
  
  // API financials for placed orders (amount, subtotal from server)
  const [orderFinancials, setOrderFinancials] = useState({
    amount: orderData?.amount || 0,
    subtotalAmount: orderData?.subtotalAmount || 0,
    subtotalBeforeTax: orderData?.subtotalBeforeTax || 0,
    // BUG-019 (Apr-2026): propagate backend-echoed delivery_charge so Collect Bill
    // maps the scan/re-engage delivery charge instead of defaulting to 0.
    deliveryCharge: orderData?.deliveryCharge || 0,
  });
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [tableSearchQuery, setTableSearchQuery] = useState(""); // Search filter for tables dropdown
  const [editingQtyItemId, setEditingQtyItemId] = useState(null);
  const [flashItemId, setFlashItemId] = useState(null);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [itemNotesModal, setItemNotesModal] = useState(null); // { item, cartIndex }
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customer, setCustomer] = useState(null);
  // CR-002 Cross-Sell + Customer Intelligence (CRM 2.0, 2026-05-26)
  const { intel: customerIntel, loading: customerIntelLoading } = useCustomerIntel(
    customer?.id,
    cartItems,
    orderType
  );
  // Delivery address state
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // CR-018: Reset schedule when switching to order types that don't support it
  useEffect(() => {
    if (orderType === 'dineIn') {
      setIsScheduled(false);
      setScheduleAt(null);
    }
  }, [orderType]);

  // CR-018: Pre-populate schedule state on re-engage of existing scheduled order
  useEffect(() => {
    if (orderData?.scheduled) {
      setIsScheduled(true);
      setScheduleAt(orderData.scheduleAt || null);
    }
  }, [orderData?.scheduled, orderData?.scheduleAt]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  // CR-008 / Bucket D1-Cap (May-2026, delivery-charge capture): per-order delivery
  // charge entered at Order Entry (via AddressFormModal or the inline CartPanel row).
  // Threads into placeOrder / updateOrder payloads (see orderTransform.js) and into
  // the Collect Bill button total (CartPanel). Re-seeded on savedCart / re-engage /
  // socket refresh paths (same sites as BUG-019 orderFinancials.deliveryCharge).
  const [deliveryCharge, setDeliveryCharge] = useState(orderData?.deliveryCharge || 0);
  // BUG-108 Loyalty Pipeline Fix (2026-05-23): when restoring an existing
  // order/table the upstream payload only carries { name, phone } (no CRM
  // loyalty fields). Fire-and-forget a CRM lookup so the Collect Bill loyalty
  // preview can populate. `lookupCustomer` returns null on most failures and
  // throws on CRM_TIMEOUT (BUG-078) — both are intentionally swallowed here;
  // the loyalty section gracefully falls back to "Loyalty program unavailable"
  // when the blob is missing. Re-`setCustomer` uses the callback form to merge
  // with whatever the user may have edited between the initial restore and the
  // lookup resolving.
  const enrichCustomerLoyaltyFromCRM = (phone) => {
    if (!phone?.trim()) return;
    lookupCustomer(phone.trim())
      .then((enriched) => {
        if (!enriched) return;
        setCustomer((prev) => ({
          ...(prev || {}),
          id:            enriched.id || prev?.id || null,
          tier:          enriched.tier ?? prev?.tier,
          totalPoints:   enriched.totalPoints ?? prev?.totalPoints,
          pointsValue:   enriched.pointsValue ?? prev?.pointsValue,
          walletBalance: enriched.walletBalance ?? prev?.walletBalance,
          loyalty:       enriched.loyalty ?? prev?.loyalty,
        }));
      })
      .catch(() => {
        // Silent: lookupCustomer already logs CRM timeouts via [CRM] warning.
        // Loyalty section will render the "Loyalty program unavailable" fallback.
      });
  };
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
  // CR-008 / Bucket D1-Cap (May-2026): AddressFormModal now passes a second arg
  // `newCharge` alongside the address form. We persist it into OrderEntry state so
  // the next place/update payload carries it (no backend change to saved-address).
  const handleAddAddress = async (formData, newCharge = 0) => {
    if (!customer?.id || customer.id.startsWith('CUST-')) {
      // Local-only customer — store address locally
      const localAddr = { ...formData, id: `local_${Date.now()}`, isDefault: true };
      setDeliveryAddresses(prev => [...prev, localAddr]);
      setSelectedAddress(localAddr);
      setDeliveryCharge(Number(newCharge) || 0);
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
      setDeliveryCharge(Number(newCharge) || 0);
      setShowAddressForm(false);
    } catch (err) {
      // CR-027 Decision C: addAddress (CRM) re-throws — surface the failure
      console.error('[OrderEntry] Add address failed:', err);
      toast({ title: "Could not save address", description: err.readableMessage, variant: "destructive" });
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
        // BUG-065 (Wave 7): Strip country code prefix (+91) from phone for
        // CartPanel CRM search compatibility (expects 10-digit national format).
        const rawPhone = (orderData.phone || '').replace(/^\+91/, '');
        // BUG-065: For room orders, fallback to roomInfo.guestName when
        // customerName is empty (backend stores check-in name in room_info).
        const resolvedName = orderData.customerName || orderData.roomInfo?.guestName || '';
        setCustomer({
          // BUG-003 (QA, Apr 2026): use actual user-entered customerName from the
          // transform — never the synthetic display label (customer can be
          // 'Walk-In' | 'TA' | 'Del'). Leaking the label into customer.name
          // caused CollectPaymentPanel to pre-fill the Credit/TAB Name field
          // with 'Walk-In' for walk-in orders (and 'TA'/'Del' similarly).
          name: resolvedName,
          phone: rawPhone,
        });
        // BUG-108 Loyalty Pipeline Fix (2026-05-23): fire-and-forget CRM
        // enrichment so the Collect Bill loyalty section shows real tier /
        // points / ₹ available for the restored customer. Non-blocking;
        // failures silently fall back to "Loyalty program unavailable".
        enrichCustomerLoyaltyFromCRM(rawPhone);
      }
      // Initialize financials from orderData
      if (orderData) {
        setOrderFinancials({
          amount: orderData.amount || 0,
          subtotalAmount: orderData.subtotalAmount || 0,
          subtotalBeforeTax: orderData.subtotalBeforeTax || 0,
          // BUG-019 (Apr-2026): propagate delivery_charge on savedCart restore.
          deliveryCharge: orderData.deliveryCharge || 0,
        });
        // CR-008 / Bucket D1-Cap (May-2026): mirror delivery_charge onto local state
        // so CartPanel display + Collect Bill button + place/update payload stay in sync.
        setDeliveryCharge(orderData.deliveryCharge || 0);
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
        const rawPhone = (orderData.phone || '').replace(/^\+91/, '');
        const resolvedName = orderData.customerName || orderData.roomInfo?.guestName || '';
        setCustomer({
          // BUG-003 (QA, Apr 2026): use actual user-entered customerName from the
          // transform — never the synthetic display label. See detailed comment
          // in the savedCart branch above.
          name: resolvedName,
          phone: rawPhone,
        });
        // BUG-108 Loyalty Pipeline Fix (2026-05-23): same fire-and-forget CRM
        // enrichment as the savedCart branch above. Non-blocking; silent on
        // failure. See `enrichCustomerLoyaltyFromCRM` definition above.
        enrichCustomerLoyaltyFromCRM(rawPhone);
      }
      // Initialize financials from orderData
      setOrderFinancials({
        amount: orderData.amount || 0,
        subtotalAmount: orderData.subtotalAmount || 0,
        subtotalBeforeTax: orderData.subtotalBeforeTax || 0,
        // BUG-019 (Apr-2026): propagate delivery_charge on existing-order re-engage.
        deliveryCharge: orderData.deliveryCharge || 0,
      });
      // CR-008 / Bucket D1-Cap (May-2026): mirror delivery_charge onto local state
      // on existing-order re-engage.
      setDeliveryCharge(orderData.deliveryCharge || 0);
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
          // ROOM_CHECKIN_FIX_V2: propagate synthetic "Check In" marker so UI/math
          // consumers can filter it out (see ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md).
          isCheckInMarker: item.isCheckInMarker === true,
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
      // BUG-019 (Apr-2026): socket context refresh must also propagate delivery_charge.
      deliveryCharge: orderFromContext.deliveryCharge || 0,
    });
    // CR-008 / Bucket D1-Cap (May-2026): mirror delivery_charge onto local state
    // on socket context refresh (keeps CartPanel + Collect Bill button in sync).
    setDeliveryCharge(orderFromContext.deliveryCharge || 0);
  }, [placedOrderId, orders]);

  // Get current menu items based on category, search, and dietary filters
  const getFilteredItems = () => {
    let items;
    if (activeCategory === "all") {
      items = products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct);
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
    cartItems.forEach(ci => {
      // ROOM_CHECKIN_FIX_V2: synthetic Check-In marker never counted.
      if (ci.isCheckInMarker) return;
      map[ci.id] = (map[ci.id] || 0) + ci.qty;
    });
    return map;
  }, [cartItems]);

  // Add item to cart with flash feedback
  const addToCart = (item) => {
    // CR-010: Weight item intercept — before dynamic-price check.
    // Weight items are identified by non-empty itemUnit. Mutually exclusive with price=1 (D8/MISC-001).
    if (item.isWeightItem) {
      if (getWeightPromptEnabled()) {
        setWeightEntryItem(item);
        return;
      }
      // Prompt disabled → add with default 1 base unit (1 Kg or 1 L; 100 for gm/ml)
      const defaultWeight = (item.itemUnit === 'gm' || item.itemUnit === 'ml') ? 100 : 1;
      setCartItems([...cartItems, {
        ...item,
        qty: defaultWeight,
        price: item.itemUnitPrice,
        totalPrice: item.itemUnitPrice * defaultWeight,
        status: 'preparing',
        placed: false,
        addedAt: new Date().toISOString(),
      }]);
      setFlashItemId(item.id);
      setTimeout(() => setFlashItemId(null), 400);
      return;
    }
    // BUG-035 (Apr-2026): if base price is exactly 1, treat as dynamic-price item.
    // Intercept before cart insertion and show price-entry prompt.
    if (Number(item.price) === 1) {
      setDynamicPriceItem(item);
      setDynamicPriceInput('');
      setDynamicPriceError('');
      return;
    }
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

  // BUG-035 (Apr-2026): confirm dynamic price entry and add item to cart with
  // the cashier-supplied price as the authoritative unit price.
  const confirmDynamicPriceAndAdd = () => {
    const entered = parseFloat(dynamicPriceInput);
    if (!dynamicPriceInput || isNaN(entered) || entered <= 0) {
      setDynamicPriceError('Please enter a valid price greater than 0');
      return;
    }
    const item = dynamicPriceItem;
    const enrichedItem = { ...item, price: entered };
    const existingIndex = cartItems.findIndex(ci => ci.id === enrichedItem.id && !ci.customizations && !ci.placed && ci._isDynamicPrice);
    if (existingIndex >= 0) {
      // Same dynamic-price item already in cart: bump qty only if price matches
      if (cartItems[existingIndex].price === entered) {
        const updated = [...cartItems];
        updated[existingIndex].qty += 1;
        setCartItems(updated);
      } else {
        // Different runtime price — add as a separate line
        setCartItems([...cartItems, {
          ...enrichedItem,
          qty: 1,
          status: 'preparing',
          placed: false,
          _isDynamicPrice: true,
          addedAt: new Date().toISOString()
        }]);
      }
    } else {
      setCartItems([...cartItems, {
        ...enrichedItem,
        qty: 1,
        status: 'preparing',
        placed: false,
        _isDynamicPrice: true,
        addedAt: new Date().toISOString()
      }]);
    }
    setFlashItemId(enrichedItem.id);
    setTimeout(() => setFlashItemId(null), 400);
    setDynamicPriceItem(null);
    setDynamicPriceInput('');
    setDynamicPriceError('');
  };

  // CR-010: Confirm weight entry and add weight item to cart
  const confirmWeightAndAdd = (weightInBaseUnit) => {
    const item = weightEntryItem;
    setCartItems([...cartItems, {
      ...item,
      qty: weightInBaseUnit,
      price: item.itemUnitPrice,
      totalPrice: item.itemUnitPrice * weightInBaseUnit,
      status: 'preparing',
      placed: false,
      addedAt: new Date().toISOString(),
    }]);
    setFlashItemId(item.id);
    setTimeout(() => setFlashItemId(null), 400);
    setWeightEntryItem(null);
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
      // CR-010: Weight items — recalculate totalPrice from itemUnitPrice × weight
      if (item.isWeightItem) {
        const unitPrice = item.itemUnitPrice || item.price || 0;
        return { ...item, qty: newQty, totalPrice: unitPrice * newQty };
      }
      // BUG-017 (Apr-2026): Recompute totalPrice on qty change for customized items.
      // Plain items (no customization) have no `totalPrice` — the render fallback
      // `item.price * item.qty` already handles them correctly.
      if (item.totalPrice !== undefined && item.totalPrice !== null) {
        const basePrice = (item.selectedSize?.price ?? item.price) || 0;
        // FO-B1-01 (May-2026): Use shape-aware helper. Multi-select groups store
        // selectedVariants[groupId] as an option array; the prior inline reduce treated
        // every entry as a single object and silently dropped multi-select prices.
        // Helper mirrors ItemCustomizationModal.jsx:100-105 + orderTransform.js:390-403.
        const variantsPrice = calculateSelectedVariantsPrice(item.selectedVariants);
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

  // BUG-018 Part 2 (Apr-2026): toggle runtime-complimentary flag on a cart item.
  // Catalog-complimentary items (item.isComplementary === true) are locked — the
  // callback refuses to flip them back to billable. UI layer also disables the
  // checkbox for these items (double-guard).
  const toggleItemComplimentary = useCallback((itemId) => {
    setCartItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      if (item.isComplementary === true) return item; // catalog lock
      return { ...item, isComplementaryRuntime: !item.isComplementaryRuntime };
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
    (item.status === 'cancelled' || item.isCheckInMarker) ? sum : sum + (item.totalPrice || (item.price * item.qty)), 0
  );
  // Calculate local tax for unplaced items
  const localTax = cartItems.reduce((sum, item) => {
    if (item.status === 'cancelled' || item.placed || item.isCheckInMarker) return sum;
    const linePrice = item.totalPrice || (item.price * item.qty);
    const taxPct = parseFloat(item.tax?.percentage) || 0;
    if (taxPct === 0) return sum;
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
  }, 0);
  const unplacedSubtotal = cartItems
    .filter(i => !i.placed && i.status !== 'cancelled' && !i.isCheckInMarker)
    .reduce((sum, item) => sum + (item.totalPrice || (item.price * item.qty)), 0);
  const unplacedTax = cartItems.reduce((sum, item) => {
    if (item.status === 'cancelled' || item.placed || item.isCheckInMarker) return sum;
    const linePrice = item.totalPrice || (item.price * item.qty);
    const taxPct = parseFloat(item.tax?.percentage) || 0;
    if (taxPct === 0) return sum;
    const isInclusive = item.tax?.calculation === 'Inclusive';
    return sum + (isInclusive ? linePrice - (linePrice / (1 + taxPct / 100)) : linePrice * (taxPct / 100));
  }, 0);
  // total = final amount including tax + round-off (for Collect Bill button)
  // CR-SC-COLLECT-BILL-BTN (2026-05-15): include item-level Service Charge + SC GST
  // in the pre-place Collect Bill button so the cashier-visible number matches
  // the Collect Payment Grand Total (and the backend-echoed order_amount after
  // place). DISPLAY-ONLY: no payload change, no toggle, no CartPanel change —
  // CollectPaymentPanel still owns the actual SC checkbox (BUG-028 Round 4).
  // Gate is byte-identical to the place / update / place-with-payment payload
  // gate at L820–L823 / L759–L762 / L1456–L1459 so takeaway, delivery,
  // autoServiceCharge=false, and pct=0 stay byte-identical to today.
  const localSCApplicable =
    (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
    && !!restaurant?.autoServiceCharge
    && (restaurant?.serviceChargePercentage || 0) > 0;
  const localSCRate    = localSCApplicable ? (restaurant.serviceChargePercentage / 100) : 0;
  const localSCTaxRate = localSCApplicable ? ((restaurant?.serviceChargeTaxPct || 0) / 100) : 0;
  const localServiceCharge    = Math.round(localSubtotal    * localSCRate    * 100) / 100;
  const localScGst            = Math.round(localServiceCharge * localSCTaxRate * 100) / 100;
  const unplacedServiceCharge = Math.round(unplacedSubtotal * localSCRate    * 100) / 100;
  const unplacedScGst         = Math.round(unplacedServiceCharge * localSCTaxRate * 100) / 100;
  const rawLocalTotal    = Math.round((localSubtotal    + localServiceCharge    + localScGst    + localTax)    * 100) / 100;
  const rawUnplacedTotal = Math.round((unplacedSubtotal + unplacedServiceCharge + unplacedScGst + unplacedTax) * 100) / 100;
  const applyRoundOff = (raw) => {
    const ceil = Math.ceil(raw);
    const diff = Math.round((ceil - raw) * 100) / 100;
    return diff >= 0.10 ? ceil : Math.floor(raw);
  };
  // CR-008 Sub-CR #1 Round-3 hotfix (May-2026): make `total` symmetric across
  // the placed/unplaced split so it ALWAYS includes the per-order delivery
  // charge for delivery orders. Round-2 (May-2026) folded delivery into
  // calcOrderTotals → backend-echoed `orderFinancials.amount`, so the placed
  // branch already has delivery baked in. Pre-place branch now mirrors that
  // by adding deliveryCharge to the local raw total. CartPanel.jsx:867 is
  // simultaneously stripped of its `+ deliveryCharge` so the button no longer
  // double-counts on the placed branch.
  const deliveryAddOn = orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0;
  // BUG-046 (May-2026, owner-approved 2026-05-12 — gate doc:
  // BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md). Placed-branch delivery-charge
  // delta. After the order is placed, `orderFinancials.amount` carries the
  // place-time delivery charge baked in (per CR-008 Sub-CR #1 Round-2). When
  // the cashier inline-edits `deliveryCharge` on the cart screen after place,
  // the placed branch must move the displayed total by the *delta* between
  // the live state and the backend echo — so the Collect Bill button label
  // tracks the edit. Delta is zero when the cashier has not edited (live ===
  // echo) so first open / re-engage / scan paths render identically to today.
  // Delta can be negative (downward edit); DO NOT clamp. Gated on
  // `orderType === 'delivery'` so walk-in / dine-in / take-away / room flows
  // stay bit-identical. Render-time only — no auto-PATCH, no payload change,
  // no `orderFinancials.amount` overwrite.
  const placedBaseDelivery  = Number(orderFinancials.deliveryCharge) || 0;
  const placedDeliveryDelta = orderType === 'delivery'
    ? (Number(deliveryCharge) || 0) - placedBaseDelivery
    : 0;
  const total = hasPlacedItems
    ? (orderFinancials.amount || 0)
      + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0)
      + placedDeliveryDelta
    : applyRoundOff(rawLocalTotal) + deliveryAddOn;

  // CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): single internal helper
  // that routes every OrderEntry-scoped success-path callsite through the
  // existing `mygenie_stay_on_order_after_bill` toggle.
  //   - ON  → call `onCollectBillStayOnOrder()` (parent bumps reset-nonce,
  //           OrderEntry remounts via `key`, internal state resets to
  //           constructor defaults — same pattern shipped under CR-008 D1).
  //   - OFF → call `onClose()` (today's redirect-to-dashboard via parent's
  //           `handleOrderEntryClose`).
  // Helper is a local closure: it closes over the `onClose` and
  // `onCollectBillStayOnOrder` props, so card-level handlers in
  // DashboardPage.jsx (Cancel Order from card, Mark Ready/Served, etc.) are
  // structurally incapable of invoking it. Owner scope clarification
  // 2026-01-16: this CR applies ONLY to actions initiated inside OrderEntry.
  const navigateAfterOrderAction = () => {
    if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
      onCollectBillStayOnOrder();
    } else {
      onClose();
    }
  };

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
          // BUG-028 Round 5 (Apr-2026): place-flow now honours auto_service_charge flag,
          // matching CollectPaymentPanel.jsx:219-223. Owners with auto=No must opt in via
          // the Collect Payment toggle; place flow no longer pre-stamps SC into order_amount.
          serviceChargePercentage: (
            (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
            && !!restaurant?.autoServiceCharge
          ) ? (restaurant?.serviceChargePercentage || 0) : 0,
          addressId: selectedAddress?.id || null,
          // CR-008 / Bucket D1-Cap (May-2026): thread per-order delivery charge.
          deliveryCharge: orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0,
          // CR-013 (May-2026): thread component-specific GST rate pcts so the
          // update-order payload echoes the corrected tax_amount / order_amount.
          serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
          deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
          // CR-POS2-003-REOPEN-A (May-2026): thread printer agents for update-order KOT.
          printerAgents: printerAgents || [],
          // BUG-052: profile-driven round-off gate.
          roundOffEnabled: restaurant?.totalRound !== false,
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
            const apiMsg = err.readableMessage;
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
          { restaurantId: restaurant?.id, orderNotes, total, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (
            (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
            && !!restaurant?.autoServiceCharge
          ) ? (restaurant?.serviceChargePercentage || 0) : 0,
            // CR-008 / Bucket D1-Cap (May-2026): thread per-order delivery charge.
            deliveryCharge: orderType === 'delivery' ? (Number(deliveryCharge) || 0) : 0,
            // CR-013 (May-2026): thread component-specific GST rate pcts.
            serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
            deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
            // CR-POS2-003 (May-2026): thread printer agents for KOT match on place-order.
            printerAgents: printerAgents || [],
            // BUG-052: profile-driven round-off gate.
            roundOffEnabled: restaurant?.totalRound !== false,
            // CR-018: Schedule Order
            scheduled: isScheduled,
            scheduleAt }
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
            const apiMsg = err.readableMessage;
            toast({ title: "Order Failed", description: apiMsg, variant: "destructive" });
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
        navigateAfterOrderAction();
        return; // Exit early
      }

      // Redirect to dashboard (for Update Order path)
      navigateAfterOrderAction();
    } catch (err) {
      console.log('[PlaceOrder] ERROR status:', err?.response?.status);
      console.log('[PlaceOrder] ERROR response:', err?.response?.data);
      const apiMsg = err.readableMessage;
      toast({ title: "Order Failed", description: apiMsg, variant: "destructive" });
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
        const msg = err.readableMessage;
        toast({ title: "Transfer Failed", description: msg, variant: "destructive" });
      });

    setTransferItem(null);
    if (engagePromise) await engagePromise;
    console.log('[TransferFood] Socket engaged — redirecting to dashboard');
    navigateAfterOrderAction();
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
          const msg = err.readableMessage;
          toast({ title: "Merge Failed", description: msg, variant: "destructive" });
        });
    }

    if (engagePromise) await engagePromise;
    console.log('[MergeTable] Socket engaged — redirecting to dashboard');
    navigateAfterOrderAction();
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
        const msg = err.readableMessage;
        toast({ title: "Shift Failed", description: msg, variant: "destructive" });
      });

    if (engagePromise) await engagePromise;
    console.log('[ShiftTable] Socket engaged — redirecting to dashboard');
    navigateAfterOrderAction();
  };

  const handleCancelFood = async ({ item, reason, cancelQuantity }) => {
    setIsPlacingOrder(true);
    const orderId = effectiveTable?.orderId || placedOrderId;
    const engagePromise = orderId ? waitForOrderEngaged(orderId) : null;

    const payload = orderToAPI.cancelItem(effectiveTable, item, reason, cancelQuantity, {
      // CR-POS2-003-REOPEN-A (May-2026): printer agents + cart for all-stations rule.
      printerAgents: printerAgents || [],
      allCartItems: cartItems,
    });
    api.put(API_ENDPOINTS.CANCEL_ITEM, payload)
      .then(() => {
        toast({
          title: "Item Cancelled",
          description: `${item?.name} cancelled successfully`,
        });
      })
      .catch(err => {
        console.error('[CancelFood] CRITICAL:', err?.response?.status, err?.response?.data);
        const msg = err.readableMessage;
        toast({ title: "Cancel Failed", description: msg, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    if (engagePromise) await engagePromise;
    console.log('[CancelFood] Socket engaged — redirecting to dashboard');
    setCancelItem(null);
    navigateAfterOrderAction();
  };

  const handleCancelOrder = async (reason) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    if (!orderId) return;

    setIsPlacingOrder(true);
    const engagePromise = waitForOrderEngaged(orderId);

    const payload = orderToAPI.cancelOrder(orderId, permissions?.[0] || 'Manager', reason, {
      // CR-POS2-003-REOPEN-A (May-2026): printer agents + cart for all-stations rule.
      printerAgents: printerAgents || [],
      allCartItems: cartItems,
    });
    api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload)
      .catch(err => {
        console.error('[CancelOrder] CRITICAL:', err?.response?.status, err?.response?.data);
        toast({ title: "Cancel Failed", description: err.readableMessage, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    await engagePromise;
    console.log('[CancelOrder] Socket engaged — redirecting to dashboard');
    toast({
      title: "Order Cancelled",
      description: `Order cancelled for ${table?.label || table?.id}`,
    });
    navigateAfterOrderAction();
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

  // BUG-099 REVISED (May-2026): QSR "Place & Pay" — single-step billing.
  // Fresh orders (no placed items): placeOrderWithPayment → PLACE_ORDER (one API call).
  // Already-placed orders (edge case): collectBillExisting → BILL_PAYMENT (fallback).
  // Non-QSR flow is completely unaffected — this handler is only called from QSR billing section.
  const handleQsrCollectBill = useCallback(async (paymentData) => {
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    setIsPlacingOrder(true);

    const qsrAutoKot = !!restaurant?.settings?.autoKot;
    const qsrAutoBill = !!restaurant?.settings?.autoBill;
    const hasPlaced = cartItems.some(i => i.placed);

    try {
      if (!hasPlaced) {
        // === FRESH ORDER: Place + Pay in one shot (mirrors Scenario 2 prepaid at L1611) ===
        const tableId = Number(effectiveTable?.tableId || table?.tableId);
        const engagePromise = tableId ? waitForTableEngaged(tableId, 10000) : null;

        const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || effectiveTable?.isRoom)
          && !!restaurant?.autoServiceCharge;

        const payload = orderToAPI.placeOrderWithPayment(
          effectiveTable, cartItems, customer, orderType, paymentData,
          {
            restaurantId: restaurant?.id,
            orderNotes,
            printAllKOT: qsrAutoKot,
            addressId: selectedAddress?.id || null,
            deliveryAddress: selectedAddress || null,
            serviceChargePercentage: scApplicable ? (restaurant?.serviceChargePercentage || 0) : 0,
            autoBill: qsrAutoBill,
            serviceChargeTaxPct: restaurant?.serviceChargeTaxPct || 0,
            deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
            printerAgents: printerAgents || [],
            roundOffEnabled: restaurant?.totalRound !== false,
            // CR-018: Schedule Order
            scheduled: isScheduled,
            scheduleAt,
          }
        );
        const formData = new FormData();
        formData.append('data', JSON.stringify(payload));
        console.log('[QSR PlaceAndPay] payload:', JSON.stringify(payload, null, 2));

        let apiFailed = false;
        let newOrderId = null;
        const placePromise = api.post(API_ENDPOINTS.PLACE_ORDER, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
          .then(res => {
            console.log('[QSR PlaceAndPay] response:', res.data);
            const o1 = res?.data?.order_id;
            const o2 = res?.data?.data?.order_id;
            const o3 = res?.data?.new_order_ids?.[0];
            newOrderId = o1 || o2 || o3 || null;
          })
          .catch(err => {
            apiFailed = true;
            console.error('[QSR PlaceAndPay] CRITICAL:', err?.response?.status, err?.response?.data);
            const msg = err.readableMessage;
            toast({ title: "Payment Failed", description: msg, variant: "destructive" });
            setIsPlacingOrder(false);
          });

        if (engagePromise) {
          console.log('[QSR PlaceAndPay] Waiting for table engage socket...');
          await engagePromise;
        } else {
          // PROD-HOTFIX-005 (2026-05-27): reduced from 500ms to 200ms for faster cashier turnaround
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        if (apiFailed) return;

        // BUG-112 (POS 4.0): If HTTP already responded during engage/delay,
        // fire auto-print NOW. Otherwise fall back to background path.
        if (qsrAutoBill && !effectiveTable?.isRoom) {
          if (newOrderId) {
            console.log('[QSR PlaceAndPay][BUG-112] HTTP responded during engage/delay — firing auto-print immediately');
            waitForOrderReady(Number(newOrderId), 500).then(order => {
              if (order?.rawOrderDetails) {
                const discountAmount = Math.round(
                  ((paymentData?.discounts?.manual || 0)
                    + (paymentData?.discounts?.preset || 0)
                    + (paymentData?.discounts?.couponDiscount || 0)) * 100
                ) / 100;
                const overrides = {
                  orderItemTotal:      paymentData?.itemTotal,
                  orderSubtotal:       paymentData?.subtotal,
                  paymentAmount:       paymentData?.finalTotal,
                  discountAmount,
                  couponCode:          paymentData?.discounts?.couponCode || '',
                  couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                  serviceChargeAmount: paymentData?.serviceCharge || 0,
                  deliveryCharge:      paymentData?.deliveryCharge || 0,
                  gstTax:              paymentData?.printGstTax,
                  vatTax:              paymentData?.printVatTax,
                  tip:                 paymentData?.tip || 0,
                  ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                };
                printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                  .then(() => console.log('[QSR PlaceAndPay] auto-print completed for order:', newOrderId))
                  .catch(err => {
                    // OD-027-A5 (c): surface background auto-print failure with order context
                    console.error('[QSR PlaceAndPay] auto-print error:', err?.message);
                    toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                  });
              }
            }).catch(err => {
              console.error('[QSR PlaceAndPay] waitForOrderReady error:', err?.message);
              toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
            });
          } else {
            // HTTP still pending — background wait
            placePromise.then(() => {
              if (newOrderId) {
                console.log('[QSR PlaceAndPay][BUG-112] HTTP responded after redirect — firing auto-print from background');
                waitForOrderReady(Number(newOrderId), 500).then(order => {
                  if (order?.rawOrderDetails) {
                    const discountAmount = Math.round(
                      ((paymentData?.discounts?.manual || 0)
                        + (paymentData?.discounts?.preset || 0)
                        + (paymentData?.discounts?.couponDiscount || 0)) * 100
                    ) / 100;
                    const overrides = {
                      orderItemTotal:      paymentData?.itemTotal,
                      orderSubtotal:       paymentData?.subtotal,
                      paymentAmount:       paymentData?.finalTotal,
                      discountAmount,
                      couponCode:          paymentData?.discounts?.couponCode || '',
                      couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                      serviceChargeAmount: paymentData?.serviceCharge || 0,
                      deliveryCharge:      paymentData?.deliveryCharge || 0,
                      gstTax:              paymentData?.printGstTax,
                      vatTax:              paymentData?.printVatTax,
                      tip:                 paymentData?.tip || 0,
                      ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                    };
                    printOrder(Number(newOrderId), 'bill', null, order, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || [])
                      .then(() => console.log('[QSR PlaceAndPay] background auto-print completed for order:', newOrderId))
                      .catch(err => {
                        // OD-027-A5 (c)
                        console.error('[QSR PlaceAndPay] background auto-print error:', err?.message);
                        toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                      });
                  }
                }).catch(err => {
                  console.error('[QSR PlaceAndPay] background waitForOrderReady error:', err?.message);
                  toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                });
              }
            }).catch(() => {});
          }
        }

        if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
          console.log('[QSR PlaceAndPay] staying on Order Entry');
          onCollectBillStayOnOrder();
        } else {
          console.log('[QSR PlaceAndPay] redirecting to dashboard');
          onClose();
        }
      } else {
        // === ALREADY-PLACED ORDER (edge case): Collect Bill on existing order ===
        const collectOrderId = effectiveTable?.orderId || placedOrderId;
        const engagePromise = collectOrderId ? waitForOrderEngaged(collectOrderId) : null;

        const payload = orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, {
          autoBill: qsrAutoBill,
          waiterId: user?.employeeId || '',
          restaurantName: restaurant?.name || '',
        });
        console.log('[QSR Pay] collect-bill payload:', JSON.stringify(payload, null, 2));

        let billPaymentFailed = false;
        await api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
          .then(res => console.log('[QSR Pay] response:', res.data))
          .catch(err => {
            billPaymentFailed = true;
            console.error('[QSR Pay] CRITICAL:', err?.response?.status, err?.response?.data);
            const msg = err.readableMessage;
            toast({ title: "Payment Failed", description: msg, variant: "destructive" });
            setIsPlacingOrder(false);
          });

        if (billPaymentFailed) return;

        if (qsrAutoBill && collectOrderId && !effectiveTable?.isRoom) {
          try {
            const orderForPrint = getOrderById(Number(collectOrderId));
            if (orderForPrint?.rawOrderDetails) {
              const discountAmount = Math.round(
                ((paymentData?.discounts?.manual || 0)
                  + (paymentData?.discounts?.preset || 0)
                  + (paymentData?.discounts?.couponDiscount || 0)) * 100
              ) / 100;
              const overrides = {
                orderItemTotal:      paymentData?.itemTotal,
                orderSubtotal:       paymentData?.subtotal,
                paymentAmount:       paymentData?.finalTotal,
                discountAmount,
                couponCode:          paymentData?.discounts?.couponCode || '',
                couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                serviceChargeAmount: paymentData?.serviceCharge || 0,
                deliveryCharge:      paymentData?.deliveryCharge || 0,
                gstTax:              paymentData?.printGstTax,
                vatTax:              paymentData?.printVatTax,
                tip:                 paymentData?.tip || 0,
                ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
              };
              await printOrder(Number(collectOrderId), 'bill', null, orderForPrint, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || []);
            }
          } catch (err) {
            console.error('[QSR Pay AutoPrint] non-blocking error:', err?.message);
          }
        }

        if (engagePromise) await engagePromise;
        if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
          onCollectBillStayOnOrder();
        } else {
          onClose();
        }
      }
    } catch (err) {
      const msg = err.readableMessage;
      toast({ title: "Payment Failed", description: msg, variant: "destructive" });
      setIsPlacingOrder(false);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [effectiveTable, table, placedOrderId, cartItems, customer, restaurant, user, orderType, orderNotes, selectedAddress, printerAgents, isProcessingPayment, toast, onClose, onCollectBillStayOnOrder, getOrderById, waitForOrderEngaged, waitForTableEngaged, waitForOrderReady, printOrder]);

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
        <div className="flex-1 flex flex-col" style={{ borderRight: `1px solid ${COLORS.borderGray}` }}>
          {/* Single Compact Header Row: Search + Action Icons */}
          <div className="px-4 py-3 flex-shrink-0 flex items-center gap-3" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
            {/* Search Input - Limited width */}
            <div className="relative flex-1 max-w-xs">
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

            {/* Spacer — pushes icons right with breathing room */}
            <div className="flex-1" />

            {/* CR-007 / A2.2 (May-2026): Order ID chip — relocated from the
                right-panel header row to here so the right-panel header has
                room for the Print Bill button next to the order-type pill. */}
            {/* BUG-071 (Wave 5): chip visibility + visible text now keyed on
                `orderNumber` (user-facing). `data-testid` stays on DB id for
                stable test selectors. Pre-engage cards render no chip. */}
            {effectiveTable?.orderNumber && (
              <span
                data-testid={`order-entry-order-id-chip-${effectiveTable?.orderId || placedOrderId}`}
                className="text-sm flex-shrink-0"
                style={{ color: COLORS.grayText }}
              >
                #{effectiveTable.orderNumber}
              </span>
            )}

            {/* Action Icons: Plus, Customer, Notes, Shift, Merge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Add Custom Item */}
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="p-2.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                style={{ border: `1px solid ${COLORS.borderGray}` }}
                title="Add Custom Item"
                data-testid="add-custom-item-btn"
              >
                <Plus className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
              </button>

              {/* Customer Info — position 2 (most used action, unconditional) */}
              <button 
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors" 
                title="Customer Info"
                onClick={() => setShowCustomerModal(true)}
                data-testid="customer-info-btn"
              >
                <UserPlus className="w-5 h-5" style={{ color: customer ? COLORS.primaryGreen : COLORS.grayText }} />
              </button>

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
                    {/* CR-010: Weight item badge */}
                    {item.isWeightItem && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                        ₹{item.itemUnitPrice}/{item.itemUnit}
                      </span>
                    )}
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
              roomInfo={orderData?.roomInfo || null}
              orderFinancials={orderFinancials}
              hasPlacedItems={cartItems.some(i => i.placed)}
              isProcessingPayment={isProcessingPayment}
              orderType={orderType}
              // CR-008 / Bucket D1-Gate (May-2026): isPrepaid drives the
              // delivery-charge readOnly rule on CollectPaymentPanel (replaces
              // BUG-019's `initialDeliveryCharge > 0` rule). Prepaid orders
              // (scan / customer-app paid) stay locked because the customer
              // already paid; non-prepaid orders unlock so cashiers can correct
              // typos / waive / add forgotten amounts at Collect Bill.
              isPrepaid={isPrepaid}
              // POS2-002 Phase 2 (May-2026): web-channel axis for the delivery
              // charge lock. Sourced from the live order model (Phase 1 added
              // `orderData.isWebOrder` via orderTransform.fromAPI.order). When
              // a web order arrives with a customer-entered delivery charge,
              // CollectPaymentPanel's combined predicate (`isPrepaid ||
              // (isWebOrder && initialDeliveryCharge > 0)`) keeps the field
              // locked — protects the customer's web-entered DC value from
              // cashier overwrite. Non-web orders pass false here and keep
              // the existing CR-008 D1-Gate behaviour.
              isWebOrder={orderData?.isWebOrder || effectiveTable?.isWebOrder || false}
              // BUG-032 (Apr-2026): pass restaurant-facing order number for header display.
              // Sourced from orderData (placed order) or effectiveTable (re-engaged order).
              // Pre-place screens show no ID (empty fallback).
              orderNumber={orderData?.orderNumber || effectiveTable?.orderNumber || ''}
              onBack={() => setShowPaymentPanel(false)}
              // BUG-018 Part 2 (Apr-2026): runtime-complimentary toggle callback.
              // Cashier-driven per-item marking; catalog-complimentary items locked.
              onToggleComplimentary={toggleItemComplimentary}
              // BUG-019 (Apr-2026): seed delivery-charge input from backend-echoed value
              // (scan orders / re-engaged delivery orders). CollectPaymentPanel renders
              // the field readOnly when this value > 0.
              //
              // CR-013 Phase 1.5 Fix-2 (May-2026, owner-approved 2026-05-05):
              // Fall back to OrderEntry's local `deliveryCharge` state for the
              // pre-place fresh-delivery flow. Without this fallback the cashier-
              // typed delivery charge silently drops to ₹0 on the Collect Bill
              // screen → delivery row hidden, Delivery GST hidden, Pay total
              // off by (delivery + delivery GST). Backend-echoed value still
              // wins when present, so BUG-019 prepaid scan / re-engage paths
              // and D1-Gate `readOnly={isPrepaid}` remain untouched.
              //
              // BUG-046 (May-2026, owner-approved 2026-05-12, Option B-2 —
              // gate doc: BUG_046_PRE_IMPLEMENTATION_CODE_GATE.md). When the
              // cashier has inline-edited `deliveryCharge` on the cart screen
              // such that it differs from the backend-echoed value, the
              // Collect Payment panel must open seeded with the cashier's
              // live value, not the stale echo. Detection is numeric
              // inequality (`Number(live) !== Number(echo || 0)`). On first
              // open / re-engage / scan paths the cashier has not edited yet
              // → live === echo → expression resolves to the backend echo
              // exactly as today, so CR-013 Phase 1.5 Fix-2, BUG-019, CR-008
              // D1-Gate (`isPrepaid`), and POS2-002 Phase 2 web-lock behavior
              // are all preserved bit-identically. No new state, no new prop
              // on CollectPaymentPanel; CollectPaymentPanel.jsx is untouched.
              initialDeliveryCharge={
                Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
                  ? (Number(deliveryCharge) || 0)
                  : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
              }
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
                  await printOrder(printOrderId, 'bill', null, order, restaurant?.serviceChargePercentage || 0, printOverrides, printerAgents || []);
                  toast({ title: "Bill request sent", description: `Order #${printOrderId}` });
                } catch (err) {
                  console.error('[PrintBill] error:', err?.response?.status, err?.response?.data);
                  const msg = err.readableMessage;
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
                    if (!printAllBill) {
                      console.warn('[AutoPrintBill] SKIPPED — printAllBill is falsy. Value:', printAllBill, 'settings.autoBill:', settings?.autoBill);
                      return;
                    }
                    // REQ3 (Apr-2026, AD-302A): suppress auto-bill for room orders
                    // even when settings.autoBill=true. Manual `Print Bill` remains
                    // available. Applies to both Scenario 1 (postpaid) below and
                    // Scenario 2 (prepaid place+pay) here. See
                    // /app/memory/REQ3_ROOM_BILL_PRINT_DEEPDIVE.md §10 Q-3A.
                    if (effectiveTable?.isRoom) {
                      console.log('[AutoPrintBill] SKIPPED — isRoom (Req 3 / AD-302A). orderId:', newOrderId);
                      return;
                    }
                    if (!newOrderId) {
                      console.error('[AutoPrintBill] SKIPPED — no order_id returned from place-order response (capture returned null)');
                      return;
                    }
                    console.log(`[AutoPrintBill] waiting for order ${newOrderId} to settle in context (500ms cap)...`);
                    // BUG-112 (POS 4.0): reduced from 3000ms to 500ms. Socket new-order delivers
                    // the order to ordersRef before HTTP responds, so waitForOrderReady resolves
                    // instantly (~50ms for engage release). 500ms is safety-only.
                    const order = await waitForOrderReady(Number(newOrderId), 500);
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
                      couponCode:          paymentData?.discounts?.couponCode || '',
                      couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
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
                      printerAgents || [],
                    );
                    console.log('[AutoPrintBill] printOrder COMPLETED for order:', newOrderId);
                  } catch (err) {
                    console.error('[AutoPrintBill] THREW (non-blocking):', err?.response?.status, err?.response?.data || err?.message, err);
                    // OD-027-A5 (c): surface background auto-print failure with order context
                    toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                  }
                };

                try {
                  // Scenario 3 — Transfer to Room (Phase 2B)
                  if (paymentData.isTransferToRoom && paymentData.roomId) {
                    const payload = orderToAPI.transferToRoom(effectiveTable, paymentData, paymentData.roomId);
                    const res = await api.post(API_ENDPOINTS.ORDER_SHIFTED_ROOM, payload);
                    // BUG-060 (Wave 7): Optimistic FE context clearing — free the source
                    // table immediately after a successful room-transfer POST. The socket
                    // handler for `update-food-status` (which backend emits after this
                    // endpoint) always calls updateOrder() and never removeOrder(), so
                    // without this the source table stays "occupied". The guard at
                    // handleUpdateFoodStatus L356 skips re-adding once the order is gone.
                    const sourceOrderId = effectiveTable?.orderId;
                    const sourceTableId = Number(effectiveTable?.tableId || 0);
                    if (sourceOrderId) {
                      removeOrder(sourceOrderId);
                    }
                    if (sourceTableId) {
                      updateTableStatus(sourceTableId, 'available');
                      if (setTableEngaged) setTableEngaged(sourceTableId, false);
                    }
                    // CR POST_ACTION_NAVIGATION_ORDERENTRY (Jan-2026): replaced
                    // the prior hardcoded manual reset block ("Prepaid cleanup
                    // — stay on order screen" with 9 setter calls including
                    // setCartItems / setShowPaymentPanel / setPlacedOrderId /
                    // setOrderFinancials / setDeliveryCharge / setOrderNotes /
                    // setCustomer / onSelectTable(null) / onOrderTypeChange).
                    // Both navigation paths (onClose unmount, or
                    // onCollectBillStayOnOrder remount-via-key) reset every
                    // one of those fields to constructor defaults — strictly
                    // a superset of the manual list. Behaviour now follows
                    // the same toggle as Place+Pay / Collect Bill. Toggle OFF
                    // → Dashboard via onClose(). Toggle ON → stay on OE with
                    // fresh walk-in cart via parent remount. No transferToRoom
                    // payload change, no room billing change.
                    navigateAfterOrderAction();
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
                      { restaurantId: restaurant?.id, orderNotes, printAllKOT, addressId: selectedAddress?.id || null, deliveryAddress: selectedAddress || null, serviceChargePercentage: (
                        (orderType === 'dineIn' || orderType === 'walkIn' || table?.isRoom)
                        && !!restaurant?.autoServiceCharge
                      ) ? (restaurant?.serviceChargePercentage || 0) : 0, autoBill: printAllBill,
                        // CR-013 (May-2026): thread component-specific GST rate pcts.
                        serviceChargeTaxPct:  restaurant?.serviceChargeTaxPct  || 0,
                        deliveryChargeGstPct: restaurant?.deliveryChargeGstPct || 0,
                        // CR-POS2-003 (May-2026): thread printer agents for KOT match on place-order.
                        printerAgents: printerAgents || [],
                        // BUG-052: profile-driven round-off gate.
                        roundOffEnabled: restaurant?.totalRound !== false,
                        // CR-018: Schedule Order
                        scheduled: isScheduled,
                        scheduleAt }
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
                      })
                      .catch(err => {
                        apiFailed = true;
                        console.error('[Prepaid] CRITICAL:', err?.response?.status, err?.response?.data);
                        const msg = err.readableMessage;
                        toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                        setIsPlacingOrder(false);
                      });

                    if (engagePromise) {
                      console.log('[Prepaid] Waiting for update-table engage socket...');
                      await engagePromise;
                    } else {
                      // Walk-in/TakeAway/Delivery — no physical table, brief delay for UX
                      console.log('[Prepaid] No physical table, adding 0.2s delay...');
                      // PROD-HOTFIX-005 (2026-05-27): reduced from 500ms to 200ms for faster cashier turnaround
                      await new Promise(resolve => setTimeout(resolve, 200));
                    }

                    if (apiFailed) return;

                    // BUG-112 (POS 4.0): If HTTP already responded during engage/delay,
                    // fire auto-print NOW (socket has already delivered the order to context).
                    // Otherwise fall back to background placePromise.then() path.
                    if (!apiFailed && newOrderId) {
                      console.log('[Prepaid][BUG-112] HTTP responded during engage/delay — firing auto-print immediately');
                      autoPrintNewOrderIfEnabled(newOrderId)
                        .catch(err => {
                          // OD-027-A5 (c)
                          console.error('[Prepaid] auto-print error:', err?.message);
                          toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                        });
                    } else {
                      // HTTP still pending — background wait
                      placePromise.then(() => {
                        if (!apiFailed && newOrderId) {
                          console.log('[Prepaid][BUG-112] HTTP responded after redirect — firing auto-print from background');
                          autoPrintNewOrderIfEnabled(newOrderId)
                            .catch(err => {
                              // OD-027-A5 (c)
                              console.error('[Prepaid] background auto-print error:', err?.message);
                              toast({ title: `Auto-print failed — Order #${newOrderId}`, description: err.readableMessage, variant: "destructive" });
                            });
                        }
                      }).catch(() => {});
                    }

                    if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
                      console.log('[Prepaid] Socket/delay done — staying on Order Entry');
                      onCollectBillStayOnOrder();
                    } else {
                      console.log('[Prepaid] Socket/delay done — redirecting to dashboard');
                      onClose();
                    }

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
                      autoBill: printAllBill,
                      waiterId: user?.employeeId || '',
                      restaurantName: restaurant?.name || '',
                    });
                    console.log('[CollectBill] payload:', JSON.stringify(payload, null, 2));

                    // BUG-002: await the bill-payment so we can gate auto-print on success.
                    let billPaymentFailed = false;
                    await api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
                      .then(res => {
                        console.log('[CollectBill] response:', res.data);
                      })
                      .catch(err => {
                        billPaymentFailed = true;
                        console.error('[CollectBill] CRITICAL:', err?.response?.status, err?.response?.data);
                        const msg = err.readableMessage;
                        toast({ title: "Payment Failed", description: msg, variant: "destructive" });
                        setIsPlacingOrder(false);
                      });

                    if (billPaymentFailed) return;

                    // BUG-002 (QA, Apr 2026): fire auto-print AFTER successful collect-bill.
                    // Non-blocking (wrapped in try/catch); if print fails, payment remains
                    // collected and manual "Print Bill" stays available as fallback.
                    // REQ3 (Apr-2026, AD-302A): suppress for room orders — manual
                    // `Print Bill` button remains the supported path for rooms.
                    if (printAllBill && collectOrderId && !effectiveTable?.isRoom) {
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
                            couponCode:          paymentData?.discounts?.couponCode || '',
                            couponDiscount:      paymentData?.discounts?.couponDiscount || 0,
                            loyaltyAmount:       paymentData?.discounts?.loyaltyPoints || 0,
                            walletAmount:        paymentData?.discounts?.walletBalance || 0,
                            serviceChargeAmount: paymentData?.serviceCharge || 0,
                            deliveryCharge:      paymentData?.deliveryCharge || 0,
                            gstTax:              paymentData?.printGstTax,
                            vatTax:              paymentData?.printVatTax,
                            tip:                 paymentData?.tip || 0,
                            // BUG-012: inject delivery address for print
                            ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
                            // BUG-021 (Apr-2026, v2): forward runtime-complimentary
                            // row IDs (+ catalog IDs as secondary) so
                            // buildBillPrintPayload can zero their price/tax on the
                            // printed bill. `rawOrderDetails[].is_complementary` is
                            // stale on the postpaid auto-print path (no socket
                            // re-engage between order-bill-payment and print);
                            // overrides make the carve-out frontend-authoritative.
                            // Row ID (cartItem.id === detail.id) ensures only the
                            // exact ticked row is zeroed, not all rows with the same
                            // catalog food.
                            runtimeComplimentaryFoodIds: (cartItems || [])
                              .filter(i => i.isComplementaryRuntime === true && i.status !== 'cancelled')
                              .flatMap(i => [i.id, i.foodId].filter(v => v !== undefined && v !== null && v !== '')),
                          };
                          console.log('[AutoPrintCollectBill] overrides:', collectBillOverrides);
                          await printOrder(
                            Number(collectOrderId),
                            'bill',
                            null,
                            orderForPrint,
                            restaurant?.serviceChargePercentage || 0,
                            collectBillOverrides,
                            printerAgents || [],
                          );
                          console.log('[AutoPrintCollectBill] printOrder COMPLETED for order:', collectOrderId);
                        } else {
                          console.warn('[AutoPrintCollectBill] SKIPPED — order or rawOrderDetails missing for', collectOrderId);
                        }
                      } catch (err) {
                        console.error('[AutoPrintCollectBill] THREW (non-blocking):', err?.response?.status, err?.response?.data || err?.message, err);
                        // OD-027-A5 (c)
                        toast({ title: `Auto-print failed — Order #${collectOrderId}`, description: err.readableMessage, variant: "destructive" });
                      }
                    }

                    if (engagePromise) await engagePromise;
                    // CR-008 #4 Phase A / Bucket D1 (May-2026): branch on the
                    // browser-local "Stay on Order Entry After Collect Bill"
                    // preference. ON  → invoke parent callback that resets
                    // OrderEntry to walk-in fresh state (cart, customer,
                    // payment panel cleared via prop-change reactions).
                    // OFF → existing redirect-to-dashboard via onClose().
                    // Engage timing is preserved verbatim — the await above
                    // is unchanged. Only the final navigation step branches.
                    if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
                      console.log('[CollectBill] Socket engaged — staying on Order Entry (walk-in)');
                      onCollectBillStayOnOrder();
                    } else {
                      console.log('[CollectBill] Socket engaged — redirecting to dashboard');
                      onClose();
                    }
                    return; // Skip finally cleanup — isPlacingOrder cleared by onClose unmount
                  }
                } catch (err) {
                  const msg = err.readableMessage;
                  toast({ title: "Payment Failed", description: msg, variant: "destructive" });
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
                      {ORDER_TYPES.filter(type => {
                        if (type.id === 'delivery') return features.delivery;
                        if (type.id === 'takeAway') return features.takeaway;
                        return true;
                      }).map(type => {
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

                {/* CR-007 / A2.2 (May-2026): Order ID chip next to the table
                    pill. Sits in the same flex row, between the table-picker
                    dropdown wrapper and the flex-1 spacer that pushes the
                    Cancel button to the right. Auto-hides when no order yet
                    placed (placedOrderId / effectiveTable.orderId both null). */}
                {/* CR-007 / A2.3 (May-2026): Print Bill button next to the
                    order-id chip in the same flex row. Mirrors the Print Bill
                    button inside CollectPaymentPanel verbatim (Q-O4 "same as
                    collect bill, try to reuse components and code").
                    Visibility gate: canPrintBill permission + at least one
                    placed cart item + an orderId resolved.
                    BUG-057 (Wave 4, May-2026): added the missing canPrintBill
                    gate that the comment above promised — aligns the
                    order-screen Print Bill with every other print action
                    (which all gate on `print_icon`). Behavior on prepaid
                    orders is preserved: button remains visible when the role
                    has `print_icon`. */}
                {canPrintBill && hasPlacedItems && (effectiveTable?.orderId || placedOrderId) && (
                  <PrintBillButton orderId={effectiveTable?.orderId || placedOrderId} />
                )}

                {/* CR-018 G6: Schedule indicator in OrderEntry header */}
                {isScheduled && scheduleAt && (
                  <span
                    data-testid="order-entry-sch-badge"
                    className="text-[11px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}
                  >
                    SCH {new Date(scheduleAt.replace(' ', 'T')).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Cancel Order/Clear Cart - Prominent styling */}
                {(() => {
                  const hasUnplaced = cartItems.some(i => !i.placed);
                  const hasPlaced = cartItems.some(i => i.placed && i.status !== 'cancelled');
                  if (!hasUnplaced && !hasPlaced) return null;
                  if (!hasUnplaced && hasPlaced && !isOrderCancelAllowed) return null;
                  // ROOM_CHECKIN_GAP4 (2026-04-25): for rooms, the bulk
                  // "Cancel Order" path would wipe the entire order_id —
                  // including the check-in marker — destroying the room
                  // booking. Backend models marker + room-service food under
                  // a single order_id, so a single cancel = full cancel.
                  // Per-item cancel (`cancelItem`) preserves the marker
                  // correctly, so for rooms we hide the bulk-cancel API
                  // path and force operators to use the per-item X buttons.
                  // The "Clear unplaced items" frontend-only cleanup branch
                  // (hasUnplaced=true) is preserved because it does not call
                  // the cancel API. See
                  // /app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md.
                  if (!hasUnplaced && hasPlaced && table?.isRoom) return null;
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
                roomInfo={orderData?.roomInfo || null}
                onAddNote={(item, cartIndex) => setItemNotesModal({ item, cartIndex })}
                onCustomize={(item) => setCustomizationItem(item)}
                customer={customer}
                onCustomerChange={setCustomer}
                selectedAddress={selectedAddress}
                onAddressClick={() => {
                  if (customer?.phone) fetchDeliveryAddresses(customer.phone);
                  setShowAddressPicker(true);
                }}
                // CR-008 / Bucket D1-Cap (May-2026): editable delivery-charge row
                // below items + include charge in Collect Bill button total.
                deliveryCharge={deliveryCharge}
                onDeliveryChargeChange={setDeliveryCharge}
                // POS2-002 Phase 2 EXTENSION (2026-05-15): symmetry with
                // CollectPaymentPanel — web/scan orders with a pre-captured DC
                // lock the inline row too. Same `isWebOrder` and
                // `initialDeliveryCharge` expressions used at L1237 / L1272 for
                // CollectPaymentPanel. `isPrepaid` already passed at L1227.
                isWebOrder={orderData?.isWebOrder || effectiveTable?.isWebOrder || false}
                initialDeliveryCharge={
                  Number(deliveryCharge) !== Number(orderFinancials.deliveryCharge || 0)
                    ? (Number(deliveryCharge) || 0)
                    : (orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0))
                }
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
                printAllKOT={printAllKOT}
                setPrintAllKOT={setPrintAllKOT}
                printAllBill={printAllBill}
                setPrintAllBill={setPrintAllBill}
                qsrMode={qsrMode}
                qsrDiscountEnabled={qsrDiscountEnabled}
                onQsrCollectBill={handleQsrCollectBill}
                restaurant={restaurant}
                onFullBilling={() => setShowPaymentPanel(true)}
                placedOrderData={placedOrderId ? orders.find(o => o.orderId === placedOrderId) || orderData : null}
                // CR-018: Schedule Order
                isScheduled={isScheduled}
                setIsScheduled={setIsScheduled}
                scheduleAt={scheduleAt}
                setScheduleAt={setScheduleAt}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {customizationItem && (
        <ItemCustomizationModal item={customizationItem} onClose={() => setCustomizationItem(null)} onAddToOrder={addCustomizedItemToCart} />
      )}

      {/* BUG-035 (Apr-2026): Dynamic-price item entry modal.
          Shown when cashier taps a menu item whose catalog price is exactly 1.
          The cashier-entered price becomes the authoritative unit price for this
          cart line; all downstream totals / payment / print use it. */}
      {dynamicPriceItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setDynamicPriceItem(null); setDynamicPriceError(''); }}
          data-testid="dynamic-price-overlay"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
            data-testid="dynamic-price-modal"
          >
            <h3 className="text-base font-semibold mb-1" style={{ color: COLORS.darkText }}>
              Enter Price
            </h3>
            <p className="text-sm mb-4" style={{ color: COLORS.grayText }}>
              {dynamicPriceItem.name} — set the actual price for this order
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-medium" style={{ color: COLORS.darkText }}>₹</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="flex-1 border rounded-lg px-3 py-2 text-base focus:outline-none"
                style={{ borderColor: dynamicPriceError ? '#EF4444' : COLORS.borderGray, color: COLORS.darkText }}
                value={dynamicPriceInput}
                onChange={(e) => { setDynamicPriceInput(e.target.value); setDynamicPriceError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmDynamicPriceAndAdd(); }}
                autoFocus
                data-testid="dynamic-price-input"
              />
            </div>
            {dynamicPriceError && (
              <p className="text-xs mb-3" style={{ color: '#EF4444' }} data-testid="dynamic-price-error">
                {dynamicPriceError}
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                className="flex-1 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
                onClick={() => { setDynamicPriceItem(null); setDynamicPriceError(''); }}
                data-testid="dynamic-price-cancel"
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2 rounded-lg text-sm font-bold"
                style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
                onClick={confirmDynamicPriceAndAdd}
                data-testid="dynamic-price-confirm"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CR-010: Weight Entry Modal */}
      {weightEntryItem && (
        <WeightEntryModal
          item={weightEntryItem}
          onConfirm={confirmWeightAndAdd}
          onClose={() => setWeightEntryItem(null)}
        />
      )}
      {showNotesModal && (
        <OrderNotesModal 
          tableId={table?.id} 
          onClose={() => setShowNotesModal(false)} 
          onSave={(notes) => setOrderNotes(notes)} 
          initialNotes={orderNotes}
          customerId={customer?.id || null}
          customerIntel={customerIntel}
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
          customerIntel={customerIntel}
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
          customerIntel={customerIntel}
          customerIntelLoading={customerIntelLoading}
          onAddToCart={addToCart}
          onCustomizeItem={setCustomizationItem}
          menuItems={products.filter(p => p.isActive && !p.isDisabled).map(adaptProduct)}
          cartItems={cartItems}
          orderType={orderType}
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
          // CR-008 / Bucket D1-Cap (May-2026): seed the Delivery Charge field from
          // current OrderEntry state so reopening the modal shows the current value.
          initialDeliveryCharge={deliveryCharge}
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
                    // BUG-019 (Apr-2026): split-bill new order must also propagate delivery_charge.
                    deliveryCharge: newOrder.deliveryCharge || 0,
                  });
                  // CR-008 / Bucket D1-Cap (May-2026): mirror delivery_charge onto
                  // local state for the newly-split order.
                  setDeliveryCharge(newOrder.deliveryCharge || 0);
                  
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
