import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, CreditCard, Smartphone, Banknote, Split, FileText, Check, ArrowRightLeft, ChevronDown, ChevronUp, BellRing, RefreshCw, MoreHorizontal, Printer, Scissors } from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant, useTables, useSettings, useMenu } from "../../contexts";
import { PAYMENT_METHODS, filterLayoutByApiTypes, getDynamicPaymentTypes, DEFAULT_PAYMENT_LAYOUT } from "../../config/paymentMethods";
import * as tableService from "../../api/services/tableService";
// BUG-038 (May-2026): CRM typeahead helper for the Credit/TAB customer
// block. Mirrors CartPanel.jsx usage. Mobile remains the unique key —
// no `customer_id` propagation, no payload-shape change.
import { searchCustomers } from "../../api/services/customerService";
import PaymentMethodButton, { PaymentMethodButtonInline } from "./PaymentMethodButton";
// BUG-108 P1 (May-2026): Feature flags for Coupon/Loyalty/Wallet CRM integration.
// All flags default `false` — sections render disabled with helper text;
// `orderTransform.js` force-zeros corresponding payload fields. See
// `POS3_0_BUG_108_P1_BUG_099_HOTSPOT_CHECK_AND_CR_PLAYBOOK_HANDOFF_2026_05_22.md`.
import { BUG108_FLAGS, BUG108_COPY } from "../../utils/BUG108_FLAGS";
// BUG-108 Phase C corrected (2026-05-24): non-mutating CRM calculation.
import { getMaxRedeemable } from "../../api/services/loyaltyService";
// BUG-108 V1B (2026-05-25): coupon CRM wiring — type-ahead /available +
// debounced auto-apply /validate. Mirrors the Phase C loyalty pattern.
import { getAvailableCoupons, validateCoupon } from "../../api/services/couponService";
import { toAPI as couponToAPI } from "../../api/transforms/couponTransform";
import { toast } from "sonner";

const CollectPaymentPanel = ({ 
  cartItems, 
  total, 
  onBack, 
  onPaymentComplete, 
  onPrintBill,
  onOpenSplitBill, // BUG-004: null when not eligible; called with live finalTotal on click
  onToggleComplimentary, // BUG-018 Part 2: (itemId) => toggle runtime-complimentary flag
  initialDeliveryCharge = 0, // BUG-019: seeded delivery charge from backend (scan/re-engage). Lock rule moved to isPrepaid below.
  customer: passedCustomer, 
  isRoom, 
  associatedOrders = [],
  roomInfo = null, // ROOM_CHECKIN_GAP3 (Stage 2): room booking financials (price/advance/balance) for the Room section + grand_total payload field. NULL for non-room orders.
  orderFinancials = {},
  hasPlacedItems = false,
  isProcessingPayment = false,
  orderType = 'dineIn',
  // CR-008 / Bucket D1-Gate (May-2026): drives delivery-charge readOnly rule.
  // Prepaid (scan/customer-app paid) orders → field locked, money already
  // collected. Non-prepaid orders → editable so cashier can correct typos /
  // waive / add forgotten amount. Replaces BUG-019's `initialDeliveryCharge>0`
  // rule which had the side-effect of locking POS-punched in-house delivery
  // orders too (post-CR-008 D1-Cap).
  isPrepaid = false,
  // POS2-002 Phase 2 (May-2026): web-channel axis for the delivery-charge
  // lock. Layered ON TOP OF `isPrepaid` (additive, not replacement). Owner-
  // locked rules:
  //   • Use the FROZEN `initialDeliveryCharge` prop at panel open — the
  //     predicate must NOT re-evaluate against the live `deliveryChargeInput`
  //     state while the cashier is typing.
  //   • Lock activates only when `isWebOrder && initialDeliveryCharge > 0`
  //     — i.e. customer entered a delivery charge on the web at order time.
  //     Zero frozen value → cashier may add (new web order, no customer DC).
  //   • Non-web orders keep existing CR-008 D1-Gate behaviour (isPrepaid
  //     only; postpaid POS delivery orders remain editable).
  // The combined predicate at L917 is `isPrepaid || (isWebOrder && DC>0)`.
  isWebOrder = false,
  // BUG-032 (Apr-2026): restaurant-facing order number for header display; falls
  // back to empty string so pre-place screens show no stale ID.
  orderNumber = '',
  // BUG-042-A (Feb-2026): Audit Report → Hold tab Collect Bill restriction.
  // When provided as an array of method ids (e.g., ['cash','card','upi']),
  // the rail is restricted to ONLY those primary methods AND all of Row 2
  // (Split, Credit/Tab dynamic button, "More" dropdown, To Room) is hidden.
  // The Row 1 filter against `restaurantPaymentTypes` still applies, so a
  // method passed in `allowedMethods` only renders if it is ALSO configured
  // by the restaurant. When undefined (dashboard caller) → existing
  // behaviour is preserved verbatim.
  allowedMethods,
}) => {
  const customer = passedCustomer;
  const { discountTypes, paymentMethods: restaurantPaymentMethods, paymentTypes: restaurantPaymentTypes, restaurant, settings: restaurantSettings } = useRestaurant();
  const { tables } = useTables();
  const { paymentLayoutConfig } = useSettings();
  const { getCategoryById } = useMenu();

  // Service charge from restaurant profile
  const serviceChargePercentage = (restaurant?.features?.serviceCharge && restaurant?.serviceChargePercentage) || 0;

  // Check if restaurant has rooms
  const hasRooms = useMemo(() => 
    (tables || []).some(t => t.isRoom),
    [tables]
  );

  // Get filtered layout based on API paymentTypes
  const enabledLayout = useMemo(() => 
    filterLayoutByApiTypes(
      paymentLayoutConfig || DEFAULT_PAYMENT_LAYOUT,
      restaurantPaymentTypes || [],
      hasRooms
    ),
    [paymentLayoutConfig, restaurantPaymentTypes, hasRooms]
  );

  // Get dynamic payment types from API (dineout, zomato_gold, etc.)
  const dynamicPaymentTypes = useMemo(() => 
    getDynamicPaymentTypes(restaurantPaymentTypes || []),
    [restaurantPaymentTypes]
  );

  // BUG-080: Primary methods enabled in BOTH API paymentTypes AND restaurant
  // boolean config. UI hides disabled methods. Payload unchanged (always 3 entries).
  const enabledPrimaryMethods = useMemo(() => {
    const mapping = { cash: 'cash', upi: 'upi', card: 'card' };
    return ['cash', 'upi', 'card'].filter(id =>
      enabledLayout.row1.includes(id) &&
      restaurantPaymentMethods?.[mapping[id]] !== false
    );
  }, [enabledLayout, restaurantPaymentMethods]);

  // DEBUG LOGS - Payment Configuration
  console.log('[CollectPaymentPanel] Payment Debug:', {
    restaurantPaymentMethods,
    restaurantPaymentTypes,
    paymentLayoutConfig,
    hasRooms,
    enabledLayout,
    enabledPrimaryMethods,
    dynamicPaymentTypes,
  });

  // Filter out cancelled items for calculations, keep for display
  // ROOM_CHECKIN_FIX_V2 (Step 2): exclude synthetic "Check In" marker from every
  // billable/display derivation. Marker has price:0/tax:0 so math already stays
  // correct, but the row would otherwise render in the items list.
  const activeItems = useMemo(() => 
    (cartItems || []).filter(item => item.status !== 'cancelled' && !item.isCheckInMarker),
    [cartItems]
  );
  // BUG-018 Part 2 (Apr-2026): complimentary lines (catalog OR runtime-marked)
  // carved out of billable math. Plain orders have billableItems === activeItems
  // → zero arithmetic drift vs pre-fix.
  const isLineComplimentary = (item) =>
    item.isComplementary === true || item.isComplementaryRuntime === true;
  const billableItems = useMemo(
    () => activeItems.filter(item => !isLineComplimentary(item)),
    [activeItems]
  );
  const cancelledItems = useMemo(() => 
    (cartItems || []).filter(item => item.status === 'cancelled' && !item.isCheckInMarker),
    [cartItems]
  );

  // ROOM_CHECKIN_GAP2 (Step C): marker-only room (checked-in with no real food
  // items) must keep the Pay button enabled so the operator can complete the
  // ₹0 / associated-orders-only checkout. Bypasses ONLY the visible-cart
  // length===0 disable clause below; other gates (tab-name, card-txn,
  // processing flag) remain intact. `visibleCartItemCount` mirrors the
  // CartPanel.jsx visibleCartItems semantics (marker filtered, cancelled
  // retained). See /app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md.
  const visibleCartItemCount = useMemo(
    () => (cartItems || []).filter(i => !i.isCheckInMarker).length,
    [cartItems]
  );
  const hasCheckInMarker = useMemo(
    () => (cartItems || []).some(i => i.isCheckInMarker),
    [cartItems]
  );
  const isMarkerOnlyRoom = isRoom && hasCheckInMarker && visibleCartItemCount === 0;

  // ROOM_CHECKIN_GAP3 (Stage 2): outstanding room balance (clamped ≥0). Pure
  // pass-through ₹ amount — NO GST, NO service charge, NO discount applies to
  // it (see L2 rule in handover). Added to grand total at payload level via
  // the `grand_total` field (interpretation i: combined payable). Always 0
  // when isRoom is false or roomInfo is null.
  const roomBalance = useMemo(
    () => (isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0),
    [isRoom, roomInfo]
  );

  // Occupied rooms for "Transfer to Room" picker.
  // ROOM_TRANSFER_FRESH_FETCH (Task 2, Apr-2026): the cached `tables` from
  // useTables() can go stale because socket events for room check-in are not
  // always delivered to every client. To avoid showing "No checked-in rooms
  // available" when a room IS in fact checked-in via another POS, we hit the
  // existing all-table-list endpoint on demand the first time the user picks
  // "To Room", and use that response (filtered to isRoom && isOccupied)
  // instead of the cached context. Context is left untouched — fresh state is
  // panel-local. See /app/memory/FIVE_TASK_VALIDATION_HANDOVER.md §Task 2.
  const occupiedRoomsCached = useMemo(() =>
    (tables || []).filter(t => t.isRoom && t.isOccupied),
    [tables]
  );
  const [freshRooms, setFreshRooms] = useState(null);   // null = not fetched yet
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);
  const fetchReqIdRef = useRef(0);                       // ignore stale resolves
  const occupiedRooms = freshRooms !== null ? freshRooms : occupiedRoomsCached;
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTransferredOrders, setShowTransferredOrders] = useState(false);
  const [showRoomService, setShowRoomService] = useState(false);
  // ROOM_CHECKIN_GAP3 (Stage 2): collapsible state for the Room booking section.
  const [showRoomBooking, setShowRoomBooking] = useState(false);
  const [deliveryChargeInput, setDeliveryChargeInput] = useState(
    // BUG-019 (Apr-2026): lazy-init from backend-seeded value (scan orders / re-engage).
    // Empty string when no backend value so placeholder shows for fresh in-POS delivery.
    initialDeliveryCharge > 0 ? String(initialDeliveryCharge) : ''
  );

  // Associated orders total
  const associatedTotal = useMemo(() =>
    associatedOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    [associatedOrders]
  );

  // Helper: get full line price for an item (includes addons + variations)
  const getItemLinePrice = (item) => {
    if (item.totalPrice) return item.totalPrice;
    const base = (item.price || 0) * (item.qty || 1);
    const addonSum = (item.addOns || []).reduce((s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)), 0);
    const varSum = (item.variation || []).reduce((s, group) => {
      // variation format: {name, values: [{label, optionPrice}]}
      const groupSum = Array.isArray(group.values)
        ? group.values.reduce((gs, val) => gs + (parseFloat(val.optionPrice) || 0), 0)
        : (parseFloat(group.price) || 0);
      return s + groupSum;
    }, 0);
    return base + ((addonSum + varSum) * (item.qty || 1));
  };

  // Per-item tax computation — uses product.tax if available, else 0%
  // Only calculate for active (non-cancelled) items
  // BUG-018 Part 2 (Apr-2026): iterate `billableItems` so complimentary lines are
  // carved out of the tax base. (CR-013 May-2026: SC/Tip/Delivery GST no longer
  // use the item-blended `avgGstRate`; they pull from per-component profile pcts.
  // Item GST proration via `discountRatio` still uses billableItems-derived totals.)
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0, vat = 0;
    billableItems.forEach(item => {
      const tax = item.tax;
      if (!tax || tax.percentage === 0) return;
      const linePrice = getItemLinePrice(item);
      let taxAmt;
      if (tax.isInclusive) {
        taxAmt = linePrice - (linePrice / (1 + tax.percentage / 100));
      } else {
        taxAmt = linePrice * (tax.percentage / 100);
      }
      // Split into SGST + CGST for GST type (India dine-in)
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2;
        cgst += taxAmt / 2;
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        // VAT items: full taxAmt accumulates into single VAT bucket
        // (no SGST/CGST half-split). See VAT_FIX_IMPLEMENTATION_HANDOVER.md.
        vat += taxAmt;
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      vat:  Math.round(vat  * 100) / 100,
    };
  }, [billableItems]);

  // Rewards state
  const [useLoyalty, setUseLoyalty] = useState(false);
  // BUG-108 Phase C corrected (2026-05-24): CRM max-redeemable state.
  // `maxRedeemable` holds the response from POST /pos/max-redeemable.
  // POS displays CRM-calculated values. No direct redeem call.
  const [maxRedeemable, setMaxRedeemable] = useState(null);
  const [maxRedeemableLoading, setMaxRedeemableLoading] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(customer?.walletBalance || 0);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  // BUG-108 V1B (2026-05-25): coupon type-ahead state.
  // `availableCoupons`    – cached list from GET /pos/coupons/available
  // `couponLoading`       – /validate in-flight indicator (disables Apply)
  // `couponInstruction`   – CRM `pos_instruction` text (rendered below error)
  // `showCouponDropdown`  – focus-driven dropdown visibility
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponInstruction, setCouponInstruction] = useState(null);
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
  const [discountValue, setDiscountValue] = useState("");

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
  // BUG-028 (Apr-2026): Default service-charge toggle to OFF; cashier must
  // explicitly enable it per bill. Applicability gating (dineIn/walkIn/room)
  // and manual toggle behaviour are preserved unchanged.
  // BUG-028 rework (REOPENED): Owner-confirmed behavior — when SC is configured
  // (serviceChargePercentage > 0) AND order type is applicable (dineIn/walkIn/room),
  // the checkbox must default TICKED (ON) and SC auto-collected. Takeaway/delivery
  // stay hidden (guarded elsewhere). Cashier may still manually untick per bill.
  // BUG-028 rework (Round 4 — REOPENED): Honor backend `auto_service_charge`
  // flag (mapped to `restaurant.autoServiceCharge` in profileTransform.js). If
  // the restaurant has SC enabled but auto_service_charge = "No", the checkbox
  // must default UNTICKED so cashier opts in explicitly.
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(
    (orderType === 'dineIn' || orderType === 'walkIn' || isRoom)
    && serviceChargePercentage > 0
    && !!restaurant?.autoServiceCharge
  );

  // BUG-277: Manual bill print state
  const [isPrintingBill, setIsPrintingBill] = useState(false);

  // BUG-281: Tip input — flat ₹, gated by restaurant.features.tip profile flag
  const tipEnabled = !!restaurant?.features?.tip;
  // BUG-075 / TIP-003: Tip applies only to dine-in, walk-in, room — mirrors
  // BUG-013 SC pattern. Takeaway/delivery tip = 0 and input hidden.
  const tipApplicable = tipEnabled && (orderType === 'dineIn' || orderType === 'walkIn' || isRoom);
  const [tipInput, setTipInput] = useState('');

  // Payment state
  // BUG-042-A: In Hold-Collect mode (allowedMethods provided), default the
  // selected method to the first allowed method that is ALSO configured by
  // the restaurant. Cash stays the preferred default when available; if not
  // configured, fall back to the first configured allowed method. Dashboard
  // callers (no allowedMethods prop) keep the literal 'cash' default.
  const [paymentMethod, setPaymentMethod] = useState(() => {
    if (!Array.isArray(allowedMethods) || allowedMethods.length === 0) return 'cash';
    const row1 = enabledLayout?.row1 || [];
    const configured = allowedMethods.filter((id) => row1.includes(id));
    if (configured.includes('cash')) return 'cash';
    return configured[0] || 'cash';
  });
  // BUG-042-A: derived flag — true iff a non-empty `allowedMethods` list was
  // passed (i.e. Audit Report → Hold tab Collect Bill). Used to hide Row 2
  // (Split / Credit dynamic / "More" dropdown / To Room) entirely.
  const isHoldContext = Array.isArray(allowedMethods) && allowedMethods.length > 0;
  const [amountReceived, setAmountReceived] = useState("");
  // BUG-CASH-PREFILL (Apr-2026): tracks whether the cashier has manually edited
  // Cash Received (typed or clicked a quick-pill). While false, the auto-seed
  // effect below keeps `amountReceived` synced to `effectiveTotal` so the
  // cashier doesn't need an extra click on the exact-tender quick-pill.
  const hasTouchedCashReceived = useRef(false);
  const [showSplit, setShowSplit] = useState(false);
  const [splitType, setSplitType] = useState(null); // 'payment' or 'station'
  // BUG-080: One row per enabled primary method. Method is fixed per row
  // (no dropdown). Cashier only enters amounts. Disabled methods don't appear.
  const [splitPayments, setSplitPayments] = useState(() => {
    return (enabledPrimaryMethods.length > 0 ? enabledPrimaryMethods : ['cash']).map(m => ({
      method: m, amount: "", transactionId: "",
    }));
  });

  // ROOM_TRANSFER_FRESH_FETCH (Task 2): when "To Room" is selected for the
  // first time in this panel mount, refetch the rooms list from the server
  // (via the existing all-table-list endpoint) so we don't rely on stale
  // socket-driven context state. Race-safe via reqId guard.
  const fetchOccupiedRooms = async () => {
    const reqId = fetchReqIdRef.current + 1;
    fetchReqIdRef.current = reqId;
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const fresh = await tableService.getTables();
      // ignore stale response if user toggled away and back
      if (reqId !== fetchReqIdRef.current) return;
      const rooms = (fresh || []).filter(t => t.isRoom && t.isOccupied);
      setFreshRooms(rooms);
    } catch (err) {
      if (reqId !== fetchReqIdRef.current) return;
      setRoomsError(err.readableMessage || err?.message || 'Unable to fetch rooms');
    } finally {
      if (reqId === fetchReqIdRef.current) setRoomsLoading(false);
    }
  };
  useEffect(() => {
    if (paymentMethod === 'transferToRoom' && freshRooms === null && !roomsLoading && !roomsError) {
      fetchOccupiedRooms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod]);

  // BUG-239: TAB/Credit customer info
  const [tabName, setTabName] = useState(customer?.name || "");
  const [tabPhone, setTabPhone] = useState(customer?.phone || "");

  // BUG-038 (May-2026): CRM typeahead state for the Credit/TAB customer
  // block, mirroring CartPanel.jsx:323–333. Mobile is the unique key.
  // We deliberately do NOT capture c.id — owner decision: no customer_id
  // in the bill-payment payload, mobile-only dedupe on backend.
  const [tabFilteredByPhone, setTabFilteredByPhone] = useState([]);
  const [tabFilteredByName, setTabFilteredByName] = useState([]);
  const [tabShowPhoneSuggestions, setTabShowPhoneSuggestions] = useState(false);
  const [tabShowNameSuggestions, setTabShowNameSuggestions] = useState(false);
  // BUG-038 GAP-A (May-2026): always seed false. In CartPanel the gate
  // protects an in-progress order build; in Collect Payment the cashier
  // may legitimately want to bill a different/verified credit customer
  // even when the order already has an upstream customer.id (e.g.
  // re-engaged orders, corporate invoice flow, record verification).
  // Pre-fix value `!!customer?.id` permanently blocked search on
  // re-engaged orders. Picking a suggestion still flips this true via
  // selectTabCustomer; blank-out still resets via handleTab*Change.
  const [tabIsCustomerSelected, setTabIsCustomerSelected] = useState(false);
  const tabPhoneInputRef = useRef(null);
  const tabNameInputRef = useRef(null);

  // BUG-240: Card transaction ID (last 4 digits)
  const [cardTxnId, setCardTxnId] = useState("");

  // Helper: TAB can arrive as 'credit' (internal) or 'tab'/'TAB' (API dynamic name)
  const isTabPayment = paymentMethod === 'credit' || paymentMethod.toLowerCase() === 'tab';

  // BUG-038 (May-2026): CRM typeahead effects for the Credit/TAB block.
  // Mirrors CartPanel.jsx:349–384 verbatim — same searchCustomers helper,
  // same thresholds (phone ≥3 chars, name ≥2 chars), same
  // isCustomerSelected gate. Effects no-op when the user is on a non-TAB
  // payment method so they cost nothing for Cash/UPI/Card/Split flows.
  // searchCustomers is graceful-failure-by-design (returns [] on CRM
  // outage and logs a [CRM] warning) — manual entry path stays usable.
  useEffect(() => {
    if (!isTabPayment) return;
    if (tabIsCustomerSelected) {
      setTabFilteredByPhone([]);
      setTabShowPhoneSuggestions(false);
      return;
    }
    if (tabPhone.trim() && tabPhone.length >= 3) {
      searchCustomers(tabPhone).then((filtered) => {
        setTabFilteredByPhone(filtered);
        setTabShowPhoneSuggestions(filtered.length > 0);
      });
    } else {
      setTabFilteredByPhone([]);
      setTabShowPhoneSuggestions(false);
    }
  }, [tabPhone, tabIsCustomerSelected, isTabPayment]);

  useEffect(() => {
    if (!isTabPayment) return;
    if (tabIsCustomerSelected) {
      setTabFilteredByName([]);
      setTabShowNameSuggestions(false);
      return;
    }
    if (tabName.trim() && tabName.length >= 2) {
      searchCustomers(tabName).then((filtered) => {
        setTabFilteredByName(filtered);
        setTabShowNameSuggestions(filtered.length > 0);
      });
    } else {
      setTabFilteredByName([]);
      setTabShowNameSuggestions(false);
    }
  }, [tabName, tabIsCustomerSelected, isTabPayment]);

  // BUG-038: outside-click closes the Credit/TAB suggestion overlays.
  // Uses data-suggestion-tab="true" marker to keep this surface
  // independent from CartPanel's data-suggestion="true" marker.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('[data-suggestion-tab="true"]')) return;
      if (tabPhoneInputRef.current && !tabPhoneInputRef.current.contains(e.target)) {
        setTabShowPhoneSuggestions(false);
      }
      if (tabNameInputRef.current && !tabNameInputRef.current.contains(e.target)) {
        setTabShowNameSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // BUG-038: pick handler — fills tabName + tabPhone only. c.id is
  // intentionally DISCARDED to enforce owner decision: no customer_id
  // in the bill-payment payload, mobile is the unique key.
  const selectTabCustomer = (c) => {
    setTabName(c.name);
    setTabPhone(c.phone);
    setTabShowPhoneSuggestions(false);
    setTabShowNameSuggestions(false);
    setTabIsCustomerSelected(true);
  };

  // BUG-038: blank-out resets selection so the cashier can start a fresh
  // CRM search after clearing either field. Mirrors CartPanel.jsx
  // handleNameChange / handlePhoneChange parity.
  const handleTabNameChange = (e) => {
    const newName = e.target.value;
    setTabName(newName);
    if (!newName.trim() && tabIsCustomerSelected) {
      setTabPhone("");
      setTabIsCustomerSelected(false);
    }
  };

  const handleTabPhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setTabPhone(newPhone);
    if (!newPhone.trim() && tabIsCustomerSelected) {
      setTabName("");
      setTabIsCustomerSelected(false);
    }
  };

  const [stationPayments, setStationPayments] = useState({
    bar: { method: "cash", paid: false },
    kitchen: { method: "cash", paid: false },
  });

  // Group items by station (only active items)
  const barItems = activeItems.filter(item => item.station === "bar");
  const kitchenItems = activeItems.filter(item => item.station === "kitchen" || !item.station);
  const barTotal = barItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);
  const kitchenTotal = kitchenItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);

  // Calculate bill — always from ALL active cart items (placed + unplaced)
  // BUG-018 Part 2 (Apr-2026): itemTotal now sums billable (non-complimentary) items
  // only so SC base, discount base, and item-GST proration all carve out
  // complimentary lines. (CR-013 May-2026: SC/Tip/Delivery GST no longer use
  // the item-blended `avgGstRate`; they pull from per-component profile pcts.)
  const itemTotal = billableItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);

  // CR-028: Items eligible for discount (excludes give_discount='No' items)
  const discountableTotal = useMemo(() =>
    billableItems.filter(i => i.giveDiscount !== false).reduce((sum, item) => sum + getItemLinePrice(item), 0),
    [billableItems]
  );
  
  // Discount from restaurant preset types (from RestaurantContext)
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  // BUG-020 (Apr-2026): Discount amounts retain 2-decimal precision.
  // Prior code used `Math.round((itemTotal * pct) / 100)` which rounded to INTEGER
  // (e.g. 10% of ₹45 = 4.5 → Math.round(4.5) = 5). Corrected to 2-dp so that
  // `subtotalAfterDiscount` (SC base) and downstream GST / Sub Total stay accurate.
  // CR-028: % discounts computed on discountableTotal (excludes give_discount='No' items)
  const presetDiscount = selectedDiscountType
    ? Math.round((discountableTotal * selectedDiscountType.discountPercent)) / 100
    : 0;

  const manualDiscount = discountType === 'percent'
    ? Math.round((discountableTotal * parseFloat(discountValue || 0))) / 100
    : Math.min(parseFloat(discountValue || 0), discountableTotal);
  
  // BUG-108 Phase C corrected (2026-05-24):
  // Loyalty discount comes from CRM /pos/max-redeemable response.
  // POS does NOT calculate tier/ratio/cap business rules.
  const loyaltyDiscount = (BUG108_FLAGS.loyaltyRatioLive && useLoyalty && maxRedeemable?.maxDiscountValue > 0)
    ? maxRedeemable.maxDiscountValue
    : 0;
  
  // BUG-108 V1B (2026-05-25, E-2): CRM is now the source of truth for the
  // coupon discount value. POS no longer recomputes % vs flat math — the
  // pre-V1B selectedCoupon.{type, discount, maxDiscount} legacy shape is
  // retired. `selectedCoupon.computedDiscount` comes from
  // `couponTransform.fromAPI.validateCoupon` (CRM /validate response).
  const couponDiscount = (selectedCoupon)
    ? Math.max(0, parseFloat(selectedCoupon.computedDiscount) || 0)
    : 0;
  
  const walletDiscount = (BUG108_FLAGS.walletDebitLive && useWallet && customer?.walletBalance)
    ? Math.min(walletAmount || customer.walletBalance, itemTotal - manualDiscount - loyaltyDiscount - couponDiscount) 
    : 0;

  const totalDiscount = manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount;
  const subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount);

  // BUG-269: Parse delivery charge from input (only for delivery orders)
  const deliveryCharge = orderType === 'delivery' ? (parseFloat(deliveryChargeInput) || 0) : 0;

  // BUG-281 + BUG-075: Tip only for applicable order types
  const tip = tipApplicable ? (parseFloat(tipInput) || 0) : 0;

  // BUG-006 (AD-101): Service charge on POST-discount subtotal.
  // Order: items → discount → service charge → tax → tip.
  // BUG-276: toggle-able per order.
  // BUG-013: SC applies only to dine-in, walk-in, and room orders.
  const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;
  const serviceCharge = scApplicable && serviceChargeEnabled && serviceChargePercentage > 0
    ? Math.round(subtotalAfterDiscount * serviceChargePercentage / 100 * 100) / 100
    : 0;

  // CR-013 (May-2026): GST on items (post-discount), SC, tip, delivery.
  //   1. Item GST is prorated by discount ratio (post-discount base).
  //   2. SC / Tip / Delivery GST now use component-specific rates from the
  //      restaurant profile (parsed in profileTransform.js Bucket D-GST-1):
  //        - SC GST + Tip GST   → restaurant.serviceChargeTaxPct
  //        - Delivery GST       → restaurant.deliveryChargeGstPct
  //      Tip rides SC rate (frozen rule §1 row 9): if SC rate = 0 → tip GST = 0.
  //      Missing / null / blank / non-numeric / negative profile values were
  //      already forced to 0 upstream by parseTaxPct. Owner directive 2026-05-05:
  //      "correct, coz it's bug" — instant cut-over to per-config rates.
  //   Pre-CR-013: SC/Tip/Delivery used `avgGstRate` (item-blended) which
  //   over-taxed high-item-GST carts and ignored configured rates entirely.
  const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
  const scTaxRate     = (restaurant?.serviceChargeTaxPct  || 0) / 100;
  const delTaxRate    = (restaurant?.deliveryChargeGstPct || 0) / 100;

  const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
  const scGst               = serviceCharge  * scTaxRate;
  const tipGst              = tip            * scTaxRate;
  const deliveryGst         = deliveryCharge * delTaxRate;

  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const sgst = Math.round((totalGst / 2) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;

  // CR-013 Phase 1.5 D-GST-4 parity guardrail (May-2026, owner-approved):
  // Compare component-sum vs composite BEFORE final round-off (per owner
  // directive 2026-05-05: round-off applies ONLY to Grand Total, never to
  // tax components). Tolerance ₹0.01 (one paisa). Diagnostic-only — never
  // blocks the bill, never toasts. If this warns in production, owner / dev
  // should investigate rate config drift or item.tax structure changes.
  const _cr013ComponentSum = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const _cr013Composite    = totalGst;
  const _cr013Diff         = Math.abs(_cr013ComponentSum - _cr013Composite);
  if (_cr013Diff > 0.01) {
    console.warn('[CR-013 PARITY] Component-sum vs composite GST mismatch', {
      itemGstPostDiscount: Math.round(itemGstPostDiscount * 100) / 100,
      scGst:               Math.round(scGst               * 100) / 100,
      tipGst:              Math.round(tipGst              * 100) / 100,
      deliveryGst:         Math.round(deliveryGst         * 100) / 100,
      sum:                 Math.round(_cr013ComponentSum  * 100) / 100,
      composite:           Math.round(_cr013Composite     * 100) / 100,
      diff:                Math.round(_cr013Diff          * 100) / 100,
      restaurantId:        restaurant?.id,
      orderType,
    });
  }

  // Subtotal = pre-tax complete = postDiscountItems + SC + tip + delivery
  // (Algebraic rearrangement of pre-fix behavior: delivery principal now sits inside
  //  Subtotal so the UI Subtotal row matches the visible chain — Item Total → Discount
  //  → SC → Delivery → Tip → Subtotal → Taxes → Grand Total. delivery's own GST is
  //  still aggregated into sgst/cgst upstream — not double-counted.)
  const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;

  // BUG-054: VAT proration mirrors GST (frozen TAX-003).
  // SC / Tip / Delivery tax math intentionally untouched per owner decision.
  const vat = taxTotals.vat * (1 - discountRatio);

  const rawFinalTotal = Math.round((subtotal + sgst + cgst + vat) * 100) / 100;

  // BUG-051 / ROUND-001: always-ceil round-off, replacing BUG-009 fractional
  // rule. BUG-052: gated by profile boolean (restaurant.totalRound).
  // When totalRound is false, use raw total (2-decimal precision).
  // ROUND-002: round-off applies ONLY to Grand Total.
  const roundOffEnabled = restaurant?.totalRound !== false;  // default true
  const finalTotal = rawFinalTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawFinalTotal) : Math.round(rawFinalTotal * 100) / 100)
    : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;

  // BUG-ROOM-CASH-PILLS (Apr-2026): centralised grand total used by every
  // "amount payable" surface — Cash quick-pills (L1825), change calculation
  // (just below), Grand-Total row (L1481), Split-Bill total (L561/573), and
  // the payment payload (handlePayment L416). Was previously inlined in 4
  // places with two omissions (cash pills + change) that produced a food-only
  // number on room orders carrying associated transfers and/or a room balance.
  // For non-room orders associatedTotal & roomBalance are 0, so
  // effectiveTotal === finalTotal and behavior is unchanged.
  const effectiveTotal =
    finalTotal +
    (isRoom && associatedOrders.length > 0 ? associatedTotal : 0) +
    roomBalance;

  // BUG-CASH-PREFILL (Apr-2026): auto-seed Cash Received with the live grand
  // total so the cashier doesn't need to click the exact-tender quick-pill on
  // the most common flow. Stays in sync with discount/tip/SC changes until the
  // cashier types or clicks a quick-pill, after which the field becomes sticky
  // (`hasTouchedCashReceived.current === true`). Guarded on cash + non-split so
  // UPI / Card / Credit / Split flows are untouched.
  useEffect(() => {
    if (
      paymentMethod === 'cash' &&
      !showSplit &&
      effectiveTotal > 0 &&
      !hasTouchedCashReceived.current
    ) {
      setAmountReceived(String(effectiveTotal));
    }
  }, [effectiveTotal, paymentMethod, showSplit]);

  // CR-021 B2: Clear all split amounts when effectiveTotal changes (discount,
  // tip, SC, coupon, loyalty, wallet). Owner decision OD-021-2/3: clear ALL
  // on both drop and rise — cashier re-enters from scratch. BUG-113 contract
  // respected — this fires on bill change, not on keystroke.
  const prevEffectiveTotal = useRef(effectiveTotal);
  useEffect(() => {
    if (!showSplit) {
      prevEffectiveTotal.current = effectiveTotal;
      return;
    }
    if (prevEffectiveTotal.current !== effectiveTotal) {
      prevEffectiveTotal.current = effectiveTotal;
      setSplitPayments(prev =>
        prev.map(sp => ({ ...sp, amount: '', transactionId: '' }))
      );
    }
  }, [effectiveTotal, showSplit]);

  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - effectiveTotal) : 0;

  // BUG-108 V1B (2026-05-25, B-4, B-5): coupon CRM wiring.
  //   • `/available` is fetched on coupon-input focus (max 3 calls per
  //     panel mount per B-5). Cached in `availableCoupons` state.
  //   • `/validate` is called by two paths:
  //       1. Debounced auto-apply (500ms) — picks highest `expectedDiscount`
  //          match for the typed prefix per B-4.
  //       2. Manual Apply button — for unknown / out-of-list codes (SQ-3).
  //   • Outside-window coupons are skipped in auto-apply but remain visible
  //     in the dropdown (greyed) so cashier can see why they're unavailable.
  const couponAvailableCallCountRef = useRef(0);
  const couponAvailableFetchedForRef = useRef(null);  // tracks {customerId} of last fetch
  const couponDebounceRef = useRef(null);

  const fetchAvailableCoupons = async () => {
    if (!customer?.id || !restaurantSettings?.isCoupon) return;
    // Cap: max 3 calls per panel session per Owner B-5.
    if (couponAvailableCallCountRef.current >= 3) return;
    // Skip if we already fetched for this customer this session.
    if (couponAvailableFetchedForRef.current === customer.id) return;
    couponAvailableCallCountRef.current += 1;
    setCouponLoading(true);
    try {
      const orderTotalForAvail = Math.max(0, itemTotal - manualDiscount - presetDiscount);
      const result = await getAvailableCoupons({
        customerId: customer.id,
        orderTotal: orderTotalForAvail,
        channel:    couponToAPI.channel(orderType),
      });
      // Sort: active coupons first (by expectedDiscount desc), greyed-out (outside window) last.
      const sorted = (result.coupons || []).slice().sort((a, b) => {
        const aActive = a.withinWindowNow !== false;
        const bActive = b.withinWindowNow !== false;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        return (b.expectedDiscount || 0) - (a.expectedDiscount || 0);
      });
      // Store the full sorted CRM response. Client-side filtering (loyalty
      // stacking, cart eligibility) is applied reactively via displayedCoupons
      // useMemo so that toggling useLoyalty instantly hides non-stackable coupons
      // without a re-fetch.
      setAvailableCoupons(sorted);
      couponAvailableFetchedForRef.current = customer.id;
      setCouponLoading(false);
      if (result.error?.code === 'NETWORK') {
        setCouponInstruction('Unable to load coupons. Try again.');
      }
    } catch (e) {
      // Defensive — couponService already handles network errors.
      // eslint-disable-next-line no-console
      console.warn('[Coupon] fetchAvailableCoupons error:', e);
      couponAvailableFetchedForRef.current = customer.id;
      setCouponLoading(false);
    }
  };

  // Reset coupon-available cache when customer changes.
  useEffect(() => {
    setAvailableCoupons([]);
    couponAvailableFetchedForRef.current = null;
    couponAvailableCallCountRef.current = 0;
  }, [customer?.id]);

  // Reactive client-side filter of cached CRM coupons. Re-runs instantly when
  // useLoyalty toggles or cart changes — no extra API call needed.
  const displayedCoupons = useMemo(() => {
    if (!availableCoupons.length) return [];
    const cartFoodIds = new Set(billableItems.map(i => String(i.foodId || i.id)));
    const cartCategoryNames = new Set(
      billableItems.map(i => (getCategoryById?.(i.categoryId)?.categoryName || '').toLowerCase()).filter(Boolean)
    );
    return availableCoupons.filter(c => {
      if (useLoyalty && c.stackableWithLoyalty === false) return false;
      if (!c.requiresCartValidation) return true;
      const hint = c.eligibleMatchHint;
      if (!hint) return true;
      if (hint.type === 'food_ids' && Array.isArray(hint.values)) {
        return hint.values.some(fid => cartFoodIds.has(String(fid)));
      }
      if (hint.type === 'category_names' && Array.isArray(hint.values)) {
        return hint.values.some(cn => cartCategoryNames.has((cn || '').toLowerCase()));
      }
      if (hint.kind === 'bogo' || hint.kind === 'bxg') {
        const buyHint = hint.buy;
        if (buyHint?.type === 'food_ids') return buyHint.values?.some(fid => cartFoodIds.has(String(fid)));
        if (buyHint?.type === 'category_names') return buyHint.values?.some(cn => cartCategoryNames.has((cn || '').toLowerCase()));
        return false;
      }
      if (hint.kind === 'nth_item') {
        const elig = hint.eligibility;
        if (elig?.type === 'food_ids') return elig.values?.some(fid => cartFoodIds.has(String(fid)));
        if (elig?.type === 'category_names') return elig.values?.some(cn => cartCategoryNames.has((cn || '').toLowerCase()));
        return false;
      }
      return true;
    });
  }, [availableCoupons, useLoyalty, billableItems, getCategoryById]);


  // Auto-fetch coupons on panel open (not just on input focus).
  // Enables auto-apply of best coupon without cashier clicking the input.
  useEffect(() => {
    if (customer?.id && restaurantSettings?.isCoupon) {
      fetchAvailableCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  // Auto-apply best order-scope coupon when displayedCoupons changes
  // (after initial fetch or after useLoyalty toggle re-filters the list).
  useEffect(() => {
    if (selectedCoupon || couponCode || !displayedCoupons.length) return;
    const best = displayedCoupons.find(c => !c.requiresCartValidation && c.withinWindowNow !== false);
    if (best) runValidate(best.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedCoupons]);

  // BUG-108 V1B (B-2): auto-remove a non-stackable coupon when cashier
  // enables loyalty redemption — silent removal + toast (no Pay-button block).
  useEffect(() => {
    if (
      useLoyalty &&
      selectedCoupon &&
      selectedCoupon.stackableWithLoyalty === false
    ) {
      setSelectedCoupon(null);
      setCouponCode('');
      setCouponError('');
      setCouponInstruction(null);
      try {
        toast('Coupon removed — incompatible with loyalty', { duration: 4000 });
      } catch (_e) { /* toast surface unavailable in some test envs */ }
    }
  }, [useLoyalty, selectedCoupon]);

  // BUG-108 V1B error-code → cashier copy (covers all 9 V1 CRM codes + 2 POS).
  const errorCodeToCopy = (code) => ({
    INVALID_CODE:                  'Invalid coupon code',
    EXPIRED:                       'Coupon has expired',
    INACTIVE:                      'Coupon is no longer active',
    MIN_ORDER_NOT_MET:             'Minimum order value not met',
    USAGE_LIMIT_REACHED:           'Coupon fully redeemed',
    CUSTOMER_USAGE_LIMIT_REACHED:  'You have used this coupon the maximum number of times',
    CUSTOMER_NOT_ELIGIBLE:         'Coupon not available for this customer',
    CHANNEL_NOT_VALID:             'Coupon not valid for this order type',
    STACKING_NOT_ALLOWED:          'Cannot combine coupon with loyalty points',
    OUTSIDE_TIME_WINDOW:           'Coupon not active right now',
    NETWORK:                       'Unable to validate coupon. Try again.',
    MISSING_ITEMS_FOR_ITEM_COUPON: 'Cart items required for this coupon',
    NO_ELIGIBLE_ITEMS_IN_CART:     'No eligible items in cart for this coupon',
    MIN_ITEM_QTY_NOT_MET:          'Minimum item quantity not met',
    MISSING_ITEMS_FOR_CATEGORY_COUPON: 'Cart items required for this coupon',
    NO_ELIGIBLE_CATEGORY_IN_CART:  'No eligible items in cart for this coupon',
    MISSING_ITEMS_FOR_BXGY_COUPON: 'Cart items required for this offer',
    BUY_REQUIREMENT_NOT_MET:       'Not enough qualifying items to buy',
    GET_REQUIREMENT_NOT_MET:       'Required free/discount item not in cart',
    NO_ELIGIBLE_BUY_ITEMS_IN_CART: 'No eligible buy items in cart',
    NO_ELIGIBLE_GET_ITEMS_IN_CART: 'Required item not in cart',
    BXGY_CONFIG_INVALID:           'Offer configuration error',
    UNSUPPORTED_BENEFIT_TYPE:      'Offer configuration error',
    MISSING_ITEMS_FOR_EVERY_NTH_COUPON: 'Cart items required for this offer',
    NTH_REQUIREMENT_NOT_MET:       'Not enough items to qualify',
    NO_ELIGIBLE_NTH_ITEMS_IN_CART: 'No eligible items in cart',
    EVERY_NTH_CONFIG_INVALID:      'Offer configuration error',
    UNSUPPORTED_NTH_BENEFIT_TYPE:  'Offer configuration error',
  }[code] || 'Coupon could not be applied');

  const runValidate = async (codeToValidate) => {
    if (!codeToValidate) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponInstruction(null);
    try {
      const orderTotalForValidate = Math.max(0, itemTotal - manualDiscount - presetDiscount);
      // BUG-108 V2 (2026-05-25): build items[] for item/category coupons
      const couponMeta = availableCoupons.find(c => (c.code || '').toUpperCase() === codeToValidate.toUpperCase());
      const needsItems = couponMeta?.requiresCartValidation === true;
      const items = needsItems
        ? billableItems.filter(i => i.status !== 'cancelled').map(i => couponToAPI.posCartItem(i, getCategoryById))
        : null;
      const result = await validateCoupon({
        code:              codeToValidate,
        customerId:        customer?.id,
        orderTotal:        orderTotalForValidate,
        channel:           couponToAPI.channel(orderType),
        loyaltyPointsUsed: (useLoyalty && maxRedeemable?.maxPointsRedeemable > 0)
          ? maxRedeemable.maxPointsRedeemable
          : 0,
        items,
      });
      if (result.valid) {
        // CR-028 E-5: reject coupon if any benefit_items target a give_discount='No' item
        if (result.benefitItems?.length > 0) {
          const benefitFoodIds = new Set(result.benefitItems.map(bi => String(bi.food_id || bi.id)));
          const nonDiscountableTarget = billableItems.find(
            i => benefitFoodIds.has(String(i.foodId || i.id)) && i.giveDiscount === false
          );
          if (nonDiscountableTarget) {
            setSelectedCoupon(null);
            setCouponError(`Coupon cannot apply: "${nonDiscountableTarget.name}" is not eligible for discounts.`);
            return;
          }
        }
        setSelectedCoupon(result);
      } else {
        setSelectedCoupon(null);
        setCouponError(errorCodeToCopy(result.error?.code));
        setCouponInstruction(result.posInstruction || null);
      }
    } finally {
      setCouponLoading(false);
    }
  };

  // Debounced auto-apply (500ms) on typed prefix per B-4.
  useEffect(() => {
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    if (!couponCode || selectedCoupon || displayedCoupons.length === 0) return;
    couponDebounceRef.current = setTimeout(() => {
      const typed = couponCode.trim().toUpperCase();
      if (!typed) return;
      const filtered = displayedCoupons
        .filter(c => c.withinWindowNow === true)
        .filter(c => c.requiresCartValidation !== true) // V2: skip item/category coupons from auto-apply
        .filter(c => (c.code || '').startsWith(typed))
        .sort((a, b) => (b.expectedDiscount || 0) - (a.expectedDiscount || 0));
      const best = filtered[0];
      if (best && !couponLoading) {
        runValidate(best.code);
      }
    }, 500);
    return () => { if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, displayedCoupons, selectedCoupon]);

  // Apply coupon code (manual Apply button or dropdown row click).
  // BUG-108 V1B (2026-05-25, E-3): real /validate call replaces the no-op.
  const handleApplyCoupon = async (codeOverride) => {
    if (!customer?.id) return;
    const code = (typeof codeOverride === 'string' ? codeOverride : couponCode).trim();
    if (!code) return;
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    setShowCouponDropdown(false);
    await runValidate(code);
  };

  // BUG-108 Phase C corrected (2026-05-24): call POST /pos/max-redeemable
  // whenever customer + bill amount are available. Non-mutating, safe to re-call.
  const maxRedeemableRef = useRef(null); // debounce ref
  useEffect(() => {
    // Clear on customer change / unmount
    if (!customer?.id && !customer?.phone) {
      setMaxRedeemable(null);
      setUseLoyalty(false);
      return;
    }
    if (!restaurantSettings?.isLoyalty || !BUG108_FLAGS.loyaltyRatioLive) {
      setMaxRedeemable(null);
      return;
    }
    const billAmount = Math.max(0, itemTotal - manualDiscount - presetDiscount);
    if (billAmount <= 0) {
      setMaxRedeemable(null);
      setUseLoyalty(false);
      return;
    }

    // Debounce 400ms
    if (maxRedeemableRef.current) clearTimeout(maxRedeemableRef.current);
    maxRedeemableRef.current = setTimeout(async () => {
      setMaxRedeemableLoading(true);
      try {
        const result = await getMaxRedeemable({
          posId: 'mygenie',
          restaurantId: restaurant?.id,
          customerId: customer?.id,
          custMobile: customer?.phone,
          billAmount,
        });
        setMaxRedeemable(result);
        // Loyalty available but NOT auto-applied. Cashier must choose to redeem.
        // Coupons auto-apply first without stacking conflicts.
        if (result.error || !result.maxDiscountValue) {
          setUseLoyalty(false);
        }
      } catch (e) {
        console.warn('[Loyalty] max-redeemable useEffect error:', e);
        setMaxRedeemable(null);
        setUseLoyalty(false);
      } finally {
        setMaxRedeemableLoading(false);
      }
    }, 400);

    return () => { if (maxRedeemableRef.current) clearTimeout(maxRedeemableRef.current); };
  }, [customer?.id, customer?.phone, itemTotal, manualDiscount, presetDiscount, restaurant?.id, restaurantSettings?.isLoyalty]);

  // handlePayment — CHG-038: Collect Payment API
  // BUG-108 Phase C corrected (2026-05-24): no direct CRM redeem call.
  // Loyalty values come from max-redeemable state. POS Backend handles actual redemption.
  const handlePayment = async () => {
    // BUG-CASH-UNDERPAY (Apr-2026): hard guard — cash received cannot be less
    // than the full payable. UI Pay button is already disabled in this state
    // (see disabled-clause at the bottom of this component); this is a
    // belt-and-braces check in case any caller invokes handlePayment
    // programmatically (keyboard shortcut, future test harness, etc.).
    if (paymentMethod === 'cash' && !showSplit) {
      const received = parseFloat(amountReceived) || 0;
      if (received < effectiveTotal) {
        console.warn(
          `[CollectPayment] Cash received (₹${received}) is less than Grand Total (₹${effectiveTotal}). Aborting.`
        );
        return;
      }
    }

    // BUG-108 Phase C corrected: loyalty fields from CRM max-redeemable (no direct redeem).
    const finalLoyaltyDiscount = (useLoyalty && maxRedeemable?.maxDiscountValue > 0) ? maxRedeemable.maxDiscountValue : 0;
    const finalLoyaltyPoints   = (useLoyalty && maxRedeemable?.maxPointsRedeemable > 0) ? maxRedeemable.maxPointsRedeemable : 0;

    // ROOM_CHECKIN_GAP3 (Stage 2): grand total payable to backend now includes
    // the room outstanding balance (`roomBalance`) for room orders. Backend
    // field convention (interpretation i, verified on preprod 2026-04-25):
    //   grand_amount = food-grand only (pre-existing semantics)
    //   grand_total  = full payable = food-grand + associatedTotal + roomBalance
    //   payment_amount = grand_total (what cashier collects)
    // roomBalance carries NO SC, NO GST, NO discount (L2 rule).
    // effectiveTotal is now defined at top-level (after BUG-ROOM-CASH-PILLS
    // fix); local recomputation removed — top-level const is the single
    // source of truth for the combined grand total.
    const paymentData = {
      method:          paymentMethod,
      finalTotal:      effectiveTotal,
      // CR-029 G2 (Gate 3, 2026-06-12): thread food-only round-off ₹ into
      // BILL_PAYMENT builder. Source: L643 (finalTotal − rawFinalTotal).
      // Consumer: orderTransform.collectBillExisting L1569 (replaces hardcoded 0).
      roundOff,
      // ROOM_CHECKIN_GAP3 (Stage 2): pass roomBalance through so the
      // collect-bill payload builder (orderTransform.collectBillExisting)
      // emits the `grand_total` field correctly. `finalTotal` above already
      // contains the combined number for the cashier UI; `roomBalance`
      // surfaces the room-only carve-out separately for any consumer that
      // needs it (split detection, audit log, etc.).
      roomBalance,
      sgst,
      cgst,
      vatAmount:       Math.round(vat * 100) / 100,
      transactionId:   paymentMethod === 'card' ? cardTxnId : '',
      tip,
      splitPayments:   showSplit ? splitPayments.map(p => ({ method: p.method, amount: parseFloat(p.amount) || 0, transactionId: p.method === 'card' ? (p.transactionId || '') : '' })) : null,
      tabContact:      isTabPayment ? { name: tabName, phone: tabPhone } : null,
      // discount info — all fields needed by collect bill payload (OLD POS parity)
      discounts: {
        manual:               manualDiscount,
        preset:               presetDiscount,
        total:                totalDiscount,
        orderDiscountPercent: discountType === 'percent' ? parseFloat(discountValue || 0) : 0,
        presetDiscountPercent: selectedDiscountType?.discountPercent || 0,
        couponDiscount:       couponDiscount,
        // BUG-108 V1B (2026-05-25, E-6): emit canonical CRM-shape fields.
        //   - `couponCode`  → CRM `coupon_code` (NEW per Owner SQ-1 = A)
        //   - `couponTitle` → CRM `coupon_title` (informational display name,
        //                     was incorrectly carrying `selectedCoupon.code`)
        //   - `couponType`  → CRM `coupon_type` ('order'|'item'|'category';
        //                     was the legacy `'percent'|'flat'` mock value)
        couponCode:           selectedCoupon?.code || '',
        couponTitle:          selectedCoupon?.title || '',
        couponType:           selectedCoupon?.couponType || '',
        // CR-028 Phase 3B: benefit items for item/category/BOGO coupon distribution
        benefitItems:         selectedCoupon?.benefitItems || [],
        // BUG-114 (POS 4.0): thread category discount metadata so transform
        // builders can emit discount_type, discount_member_category_id/name.
        // When preset selected: discountType = category name, orderDiscountType = 'Percent'.
        // When manual: original logic preserved.
        discountType:         selectedDiscountType
                                ? selectedDiscountType.name
                                : (discountType || ''),
        orderDiscountType:    selectedDiscountType
                                ? 'Percent'
                                : (discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : ''),
        discountMemberCategoryId:   selectedDiscountType?.id || 0,
        discountMemberCategoryName: selectedDiscountType?.name || '',
        loyaltyPoints:        finalLoyaltyDiscount,
        // BUG-108 Phase C corrected (2026-05-24): CRM max-redeemable values.
        // POS Backend handles actual redemption. No redemption ID from POS Frontend.
        loyaltyPointsRedeemed: finalLoyaltyPoints,
        loyaltyRedemptionId:   null,
        walletBalance:        walletDiscount,
      },
      customer,
      itemTotal,
      // BUG-281: subtotal is now pre-tax complete (was subtotalAfterDiscount before Feb-2026).
      // Consumers: OrderEntry auto-print override (BUG-273) reads pd.subtotal.
      subtotal,
      serviceCharge,
      deliveryCharge,
      // BUG-006 (AD-101, Apr-2026): UI sgst/cgst are now post-discount with GST
      // on SC/tip/delivery already included. printGstTax mirrors the UI tax for
      // any consumer that needs an explicit print field.
      printGstTax: Math.round((sgst + cgst) * 100) / 100,
      printVatTax: Math.round(vat * 100) / 100,
      // CR-013 Phase 1.5 D-GST-3 (May-2026): pass component-wise GST ₹ amounts
      // through to the BILL_PAYMENT and transferToRoom payload builders so
      // backend persists `service_gst_tax_amount` and `tip_tax_amount` with
      // real values (was hardcoded 0 pre-Phase-1.5).
      serviceGstTaxAmount: Math.round(scGst  * 100) / 100,
      tipTaxAmount:        Math.round(tipGst * 100) / 100,
      // BUG-083: pass delivery GST amount for collectBillExisting and print payload.
      deliveryGstAmount:   Math.round(deliveryGst * 100) / 100,
    };

    // Transfer to Room — attach room selection
    if (paymentMethod === 'transferToRoom' && selectedRoom) {
      paymentData.isTransferToRoom = true;
      paymentData.roomId = selectedRoom.tableId;
    }

    onPaymentComplete(paymentData);
  };

  // BUG-277 + BUG-006: Manual "Print Bill" — sends current CollectPaymentPanel values
  // as overrides so printout reflects live discounts / service-charge toggle /
  // delivery charge / tip before payment is collected.
  // BUG-006 (AD-101): UI SGST/CGST are now post-discount + include GST on SC/tip/delivery.
  // Bill print now reuses the same UI tax values — single source of truth.
  const handlePrintBill = async () => {
    if (!onPrintBill || !hasPlacedItems || isPrintingBill) return;
    setIsPrintingBill(true);
    try {
      // discount_amount groups non-loyalty/non-wallet discounts (manual + preset + coupon)
      const discountAmount = Math.round((manualDiscount + presetDiscount + couponDiscount) * 100) / 100;
      const overrides = {
        orderItemTotal:      itemTotal,
        orderSubtotal:       subtotal,               // BUG-281: pre-tax complete
        // PRINT-CORRECTIVE (May-2026, PRINT-002): pass TWO distinct money
        // values that map to the receipt's two distinct lines:
        //   paymentAmount → "Total" line       → food-only finalTotal
        //   grantAmount   → "Grand Total" line → effectiveTotal (food + assoc
        //                                          + roomBalance for rooms;
        //                                          = finalTotal otherwise)
        // The previous Mini-CR sent only paymentAmount: effectiveTotal which
        // caused the printed "Total" line to equal the Grand Total on room
        // orders (receipt #3 in owner's 2026-05-17 evidence).
        paymentAmount:       finalTotal,
        grantAmount:         effectiveTotal,
        discountAmount,
        couponCode:          selectedCoupon?.code || '',
        // BUG-108 V1B (2026-05-25, E-7, Owner Q5 = A): forward coupon discount
        // ₹ amount to the print payload so the bill template renders a
        // "Coupon <CODE>  −₹X" line (mirrors loyalty_dicount_amount pattern).
        couponDiscount:      couponDiscount,
        loyaltyAmount:       loyaltyDiscount,
        walletAmount:        walletDiscount,
        serviceChargeAmount: serviceCharge,
        deliveryCharge,
        gstTax:              Math.round((sgst + cgst) * 100) / 100, // BUG-006: UI tax value
        vatTax:              Math.round(vat * 100) / 100,           // CR-VAT-COLLECT: item-level VAT
        tip,                                                        // BUG-281: was hardcoded 0
        // BUG-021 (Apr-2026, v2): forward runtime-complimentary row IDs
        // (+ catalog IDs as secondary) so the manual Print Bill output zeros
        // complimentary lines even if the backend-hydrated rawOrderDetails
        // still show them as priced. Row ID ensures only the exact ticked row
        // is zeroed, not all rows sharing the same catalog food.
        runtimeComplimentaryFoodIds: (cartItems || [])
          .filter(i => i.isComplementaryRuntime === true && i.status !== 'cancelled' && !i.isCheckInMarker)
          .flatMap(i => [i.id, i.foodId].filter(v => v !== undefined && v !== null && v !== '')),
      };
      await onPrintBill(overrides);
    } finally {
      setIsPrintingBill(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="collect-payment-panel">
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center gap-3 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full"
          data-testid="payment-back-btn"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
        </button>
        <span className="font-semibold" style={{ color: COLORS.darkText }}>
          {isRoom ? 'Checkout' : 'Collect Payment'}
        </span>
        <span className="ml-auto text-sm" style={{ color: COLORS.grayText }}>
          {orderNumber ? `#${orderNumber}` : ''}
        </span>
      </div>

      {/* Sticky Bill Summary Header */}
      <div 
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b bg-white"
        style={{ borderColor: COLORS.borderGray }}
        data-testid="bill-summary-header"
      >
        <div className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
          📋 BILL SUMMARY
        </div>
        <div className="flex items-center gap-3">
          {hasPlacedItems && onPrintBill && (
            <button
              onClick={handlePrintBill}
              disabled={isPrintingBill}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
              data-testid="print-bill-btn"
              title="Print Bill"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrintingBill ? 'Printing…' : 'Print Bill'}</span>
            </button>
          )}
          {/* BUG-004 (QA, Apr 2026): Split Bill button — opens modal with LIVE
              finalTotal as the authoritative total for splitting. Only shown
              when parent passes onOpenSplitBill (eligibility gated in OrderEntry). */}
          {onOpenSplitBill && (
            <button
              onClick={() => onOpenSplitBill(
                (isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance
              )}
              className="flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
              data-testid="split-bill-btn"
              title="Split Bill"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split Bill</span>
            </button>
          )}
          <div className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
            ₹{((isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* BUG-006 UX (Apr-2026): ADJUSTMENTS — all editable controls grouped
            ABOVE the Bill Summary so cashier edits and computed results share a
            natural top-to-bottom flow. Previously Discount/Coupon/Loyalty/Wallet
            sat below Bill Summary, forcing a scroll-back to verify.
            ROOM_CHECKIN_GAP3 (2026-04-25): also hide when a room has zero
            food/room-service items in cart — adjustments do not apply to
            room-balance-only or transferred-only checkouts. */}
        {!(isRoom && (associatedOrders.length > 0 || visibleCartItemCount === 0)) && (
        <>
        <div className="text-xs font-bold uppercase tracking-wider px-1 -mb-2" style={{ color: COLORS.grayText }}>
          🎛 Adjustments
        </div>

        {/* 1. Discount Section - Always visible
            BUG-056: Preset discount categories from restaurant profile added to the
            same dropdown. Always percentage. Mutually exclusive with manual % / ₹.
            When a preset is selected, the value input is hidden (% is fixed).
            Selecting manual (% or ₹) clears preset. Selecting preset clears manual. */}
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: COLORS.borderGray, opacity: selectedCoupon ? 0.6 : 1 }}
          data-testid="discount-section"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
            <div className="flex gap-2 flex-1 justify-end">
              <select
                value={selectedDiscountType ? `preset_${selectedDiscountType.id}` : (discountType || "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    // "None" — clear everything
                    setDiscountType(null);
                    setDiscountValue("");
                    setSelectedDiscountType(null);
                  } else if (val === 'percent' || val === 'flat') {
                    // Manual mode — clear preset
                    setDiscountType(val);
                    setSelectedDiscountType(null);
                  } else if (val.startsWith('preset_')) {
                    // Preset mode — clear manual
                    const presetId = val.replace('preset_', '');
                    const found = (discountTypes || []).find(dt => String(dt.id) === presetId);
                    setSelectedDiscountType(found || null);
                    setDiscountType(null);
                    setDiscountValue("");
                  }
                }}
                disabled={selectedCoupon !== null}
                className="px-2 py-1.5 rounded-lg border text-sm outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ borderColor: COLORS.borderGray, minWidth: "80px" }}
                data-testid="discount-type-select"
              >
                <option value="">None</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
                {/* BUG-056: Preset discount categories (always percentage) */}
                {Array.isArray(discountTypes) && discountTypes.length > 0 &&
                  discountTypes.map((dt) => (
                    <option key={dt.id} value={`preset_${dt.id}`}>
                      {dt.name} — {dt.discountPercent}%
                    </option>
                  ))
                }
              </select>
              {/* Manual input — shown only for manual % or ₹, hidden for preset */}
              {discountType && !selectedDiscountType && (
                <input
                  type="number"
                  placeholder={discountType === 'percent' ? "%" : "₹"}
                  value={discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (e.target.value === '' || e.target.value === '-') { setDiscountValue(''); return; }
                    if (val < 0) { setDiscountValue(''); return; }
                    if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
                    setDiscountValue(e.target.value);
                  }}
                  min="0"
                  max={discountType === 'percent' ? "100" : undefined}
                  disabled={selectedCoupon !== null}
                  className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="discount-value-input"
                />
              )}
              {(manualDiscount > 0 || presetDiscount > 0) && (
                <span className="text-sm font-medium self-center" style={{ color: COLORS.primaryGreen }}>
                  -₹{manualDiscount > 0 ? manualDiscount : presetDiscount}
                </span>
              )}
            </div>
          </div>
          {/* BUG-108 P1 Q10: Discount disabled when a coupon is applied. */}
          {selectedCoupon && (
            <div className="text-xs mt-1 ml-6 italic" style={{ color: COLORS.grayText }} data-testid="discount-helper-text">
              {BUG108_COPY.discountBlockedByCoupon}
            </div>
          )}
        </div>

        {/* 2. Coupon Section - Only if customer entered and coupons enabled in profile */}
        {/* BUG-108 V1B (2026-05-25): full type-ahead dropdown UX (E-8).
            Helper text "Coming soon" path retained for safety when
            `couponLive=false` — removed at V1 closure (Step 4). */}
        {customer && restaurantSettings?.isCoupon && (() => {
          const isManualActive = (manualDiscount > 0 || presetDiscount > 0);
          const couponBlocked = isManualActive;
          const helperText = isManualActive
              ? BUG108_COPY.couponBlockedByDiscount
              : null;
          const showDropdown = showCouponDropdown && !couponBlocked && !selectedCoupon && displayedCoupons.length > 0;
          const showEmptyHint = showCouponDropdown && !couponBlocked && !selectedCoupon && displayedCoupons.length === 0 && !couponLoading && couponAvailableFetchedForRef.current === customer?.id;
          const formatWindowTime = (iso) => {
            if (!iso) return '';
            try {
              return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
            } catch (_e) { return ''; }
          };
          return (
          <div
            className="p-3 rounded-lg border relative"
            style={{ borderColor: COLORS.borderGray, opacity: couponBlocked ? 0.6 : 1 }}
            data-testid="coupon-section"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🎫 Coupon</span>
              <input
                type="text"
                placeholder="Enter code or pick…"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  if (couponError) setCouponError('');
                  if (couponInstruction) setCouponInstruction(null);
                }}
                onFocus={() => {
                  setShowCouponDropdown(true);
                  fetchAvailableCoupons();
                }}
                onBlur={() => { setTimeout(() => setShowCouponDropdown(false), 150); }}
                disabled={couponBlocked || couponLoading}
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="coupon-input"
              />
              <button
                onClick={() => handleApplyCoupon()}
                disabled={couponBlocked || couponLoading || !couponCode}
                className="px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                data-testid="apply-coupon-btn"
              >
                {couponLoading ? '…' : 'Apply'}
              </button>
            </div>
            {/* Type-ahead dropdown (max 5 visible, scrollable) */}
            {showDropdown && (
              <div
                className="absolute left-3 right-3 mt-1 rounded-lg border bg-white shadow-lg max-h-48 overflow-y-auto"
                style={{ borderColor: COLORS.borderGray, zIndex: 50 }}
                data-testid="coupon-suggestions-dropdown"
              >
                {displayedCoupons.slice(0, 5).map((c) => {
                  const inWindow = c.withinWindowNow !== false;
                  return (
                    <div
                      key={c.id || c.code}
                      onMouseDown={() => { if (inWindow && !couponLoading) handleApplyCoupon(c.code); }}
                      className={`px-3 py-2 text-sm flex items-center justify-between ${inWindow && !couponLoading ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed'}`}
                      style={{ opacity: inWindow && !couponLoading ? 1 : 0.5 }}
                      data-testid={`coupon-suggestion-${c.code}`}
                    >
                      <span style={{ color: COLORS.darkText }}>{c.code}</span>
                      {inWindow ? (
                        c.expectedDiscount
                          ? <span style={{ color: COLORS.primaryGreen }}>−₹{Math.round(c.expectedDiscount * 100) / 100}</span>
                          : <span className="text-xs" style={{ color: COLORS.grayText }}>{c.title}</span>
                      ) : (
                        <span className="text-xs" style={{ color: COLORS.grayText }} data-testid="coupon-outside-window-hint">
                          {c.nextWindowStart ? `Available from ${formatWindowTime(c.nextWindowStart)}` : 'Not active'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {showEmptyHint && (
              <div className="text-xs mt-1 ml-16 italic" style={{ color: COLORS.grayText }} data-testid="coupon-empty-hint">
                No coupons available for this customer
              </div>
            )}
            {helperText && (
              <div className="text-xs mt-1 ml-16 italic" style={{ color: COLORS.grayText }} data-testid="coupon-helper-text">
                {helperText}
              </div>
            )}
            {couponError && <div className="text-xs mt-1 ml-16" style={{ color: "#D32F2F" }} data-testid="coupon-error-text">{couponError}</div>}
            {couponInstruction && <div className="text-xs mt-1 ml-16" style={{ color: COLORS.grayText }} data-testid="coupon-pos-instruction-text">{couponInstruction}</div>}
            {selectedCoupon && (
              <div className="flex items-center justify-between mt-2 px-2 py-1 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}10` }} data-testid="applied-coupon-chip">
                <span className="text-sm" style={{ color: COLORS.primaryGreen }}>✓ {selectedCoupon.code} (-₹{couponDiscount})</span>
                <button onClick={() => { setSelectedCoupon(null); setCouponCode(''); setCouponError(''); setCouponInstruction(null); }} className="text-xs" style={{ color: COLORS.grayText }} data-testid="remove-coupon-btn">Remove</button>
              </div>
            )}
            {selectedCoupon?.benefitItems?.length > 0 && (
              <div className="text-xs mt-1 ml-4" style={{ color: COLORS.grayText }} data-testid="coupon-benefit-items">
                {selectedCoupon.benefitItems.map((bi, idx) => (
                  <div key={idx}>
                    {bi.quantity}× {bi.name} {bi.line_discount >= (bi.unit_price * bi.quantity) ? 'FREE' : `−₹${bi.line_discount}`}
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* 3. Loyalty Section — BUG-108 Phase C corrected (2026-05-24):
            CRM max-redeemable drives display. No frontend business logic. */}
        {customer && restaurantSettings?.isLoyalty && BUG108_FLAGS.loyaltyRatioLive && (
          (() => {
            // Hide section entirely for LOYALTY_DISABLED, SETTINGS_MISSING, CUSTOMER_NOT_FOUND, INVALID_REQUEST
            const errCode = maxRedeemable?.error?.code;
            if (errCode === 'LOYALTY_DISABLED' || errCode === 'SETTINGS_MISSING' || errCode === 'CUSTOMER_NOT_FOUND' || errCode === 'INVALID_REQUEST') return null;

            const mrTier = maxRedeemable?.tier || customer?.loyalty?.tier || customer?.tier || '';
            const mrPoints = maxRedeemable?.availablePoints ?? customer?.loyalty?.total_points ?? customer?.totalPoints ?? 0;
            const mrDiscount = maxRedeemable?.maxDiscountValue || 0;
            const mrMaxPts = maxRedeemable?.maxPointsRedeemable || 0;
            const mrRatio = maxRedeemable?.ratioPerPoint || 0;
            const mrMin = maxRedeemable?.minRedemptionPoints || 0;
            const isBelowMin = errCode === 'BELOW_MIN_REDEMPTION';
            const hasData = maxRedeemable && !maxRedeemable.error;

            return (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray, opacity: hasData ? 1 : 0.8 }}
            data-testid="loyalty-section"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => setUseLoyalty(e.target.checked)}
                  disabled={maxRedeemableLoading || !hasData || isBelowMin || mrDiscount <= 0}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="use-loyalty-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Loyalty</span>
                {mrTier && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f0f0f0', color: COLORS.grayText }}>{mrTier}</span>
                )}
                {mrPoints > 0 && (
                  <span className="text-xs" style={{ color: COLORS.grayText }}>({mrPoints} pts)</span>
                )}
              </div>
              <span className="text-sm font-medium" style={{ color: hasData && mrDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }} data-testid="loyalty-preview-value">
                {maxRedeemableLoading
                  ? 'Calculating...'
                  : hasData && mrDiscount > 0
                    ? `₹${mrDiscount} discount`
                    : isBelowMin
                      ? `Earn ${mrMin - mrPoints} more`
                      : mrPoints > 0 ? `${mrPoints} pts` : ''}
              </span>
            </label>
            <div className="text-xs mt-1 ml-6 italic" style={{ color: COLORS.grayText }} data-testid="loyalty-helper-text">
              {maxRedeemableLoading
                ? BUG108_COPY.loyaltyLoadingHelper
                : hasData && mrDiscount > 0 && useLoyalty
                  ? `${mrMaxPts} pts redeemed · ratio ₹${mrRatio}/pt`
                  : hasData && mrDiscount > 0 && !useLoyalty
                    ? `Tick to apply ₹${mrDiscount} loyalty discount`
                    : isBelowMin
                      ? `Minimum ${mrMin} points required`
                      : maxRedeemable?.error
                        ? BUG108_COPY.loyaltyFailedHelper
                        : !maxRedeemable
                          ? ''
                          : ''}
            </div>
            {/* PROD-HOTFIX-007 (2026-05-29): Show projected earn points */}
            {!maxRedeemableLoading && maxRedeemable?.projectedPointsEarned > 0 && (
              <div className="text-xs mt-1 ml-6 font-medium" style={{ color: COLORS.primaryGreen }} data-testid="loyalty-earn-preview">
                You'll earn {maxRedeemable.projectedPointsEarned} pts on this order
                {maxRedeemable.earnRatioDisplay ? ` (${maxRedeemable.earnRatioDisplay})` : ''}
              </div>
            )}
          </div>
            );
          })()
        )}

        {/* 4. Wallet Section - Only if customer selected and wallet enabled in profile */}
        {/* BUG-108 P1: Visible read-only when `walletDebitLive=false`. Amount
            input hidden until P2 wallet debit CR ships. */}
        {customer && restaurantSettings?.isCustomerWallet && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray, opacity: BUG108_FLAGS.walletDebitLive ? 1 : 0.7 }}
            data-testid="wallet-section"
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  disabled={!BUG108_FLAGS.walletDebitLive || !customer?.walletBalance}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="use-wallet-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>💰 Wallet</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>(₹{customer?.walletBalance || 0})</span>
              </label>
              <div className="flex items-center gap-2">
                {BUG108_FLAGS.walletDebitLive && useWallet && customer?.walletBalance > 0 && (
                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(Math.min(parseFloat(e.target.value) || 0, customer.walletBalance))}
                    className="w-16 px-2 py-1 text-sm text-right rounded border"
                    style={{ borderColor: COLORS.borderGray }}
                  />
                )}
                <span className="text-sm font-medium" style={{ color: useWallet && walletDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                  {useWallet && walletDiscount > 0 ? `-₹${walletDiscount}` : customer?.walletBalance > 0 ? "" : "No balance"}
                </span>
              </div>
            </div>
            {!BUG108_FLAGS.walletDebitLive && (
              <div className="text-xs mt-1 ml-6 italic" style={{ color: COLORS.grayText }} data-testid="wallet-helper-text">
                {BUG108_COPY.walletDisabledHelper}
              </div>
            )}
          </div>
        )}

        {/* BUG-006 UX v2 (Apr-2026): Service Charge toggle — moved from inside Bill Summary */}
        {/* BUG-013: Only show for dine-in, walk-in, and room orders */}
        {scApplicable && serviceChargePercentage > 0 && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="service-charge-section"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={serviceChargeEnabled}
                  onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                  data-testid="service-charge-toggle-main"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>⚙️ Service Charge</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>({serviceChargePercentage}%)</span>
              </div>
            </label>
          </div>
        )}

        {/* BUG-006 UX v2: Tip input — moved from inside Bill Summary */}
        {tipApplicable && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="tip-section"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>💸 Tip</span>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: COLORS.grayText }}>₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={tipInput}
                  onChange={(e) => {
                    if (e.target.value === '' || e.target.value === '-') { setTipInput(''); return; }
                    const val = parseFloat(e.target.value);
                    if (val < 0) { setTipInput(''); return; }
                    setTipInput(e.target.value);
                  }}
                  min="0"
                  className="w-24 px-2 py-1.5 rounded-lg border text-sm outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="tip-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* BUG-006 UX v2: Delivery Charge input — moved from inside Bill Summary, delivery orders only */}
        {orderType === 'delivery' && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="delivery-charge-section"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🚚 Delivery Charge</span>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: COLORS.grayText }}>₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={deliveryChargeInput}
                  onChange={(e) => setDeliveryChargeInput(e.target.value)}
                  min="0"
                  // CR-008 / Bucket D1-Gate (May-2026): readOnly rule swapped from
                  // BUG-019's `initialDeliveryCharge > 0` (which over-locked POS-
                  // punched in-house delivery orders after CR-008 D1-Cap began
                  // persisting their charges). The new rule ties the lock to the
                  // actual concern — money already collected. Prepaid (scan /
                  // customer-app paid) → locked. Non-prepaid → editable for
                  // cashier corrections / waivers / forgotten-amount entry.
                  //
                  // POS2-002 Phase 2 (May-2026): SECOND lock layer added on top —
                  // web orders with a customer-entered delivery charge protect
                  // the customer's value. Predicate uses the FROZEN
                  // `initialDeliveryCharge` (prop, set once at panel open), NOT
                  // the live `deliveryChargeInput` state — so typing never re-
                  // evaluates the lock (owner rule: do not dynamically re-lock
                  // while cashier is typing).
                  readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}
                  title={
                    isPrepaid
                      ? (initialDeliveryCharge > 0
                          ? 'Delivery charge already collected from customer — not editable'
                          : 'Order is prepaid — delivery charge cannot be modified')
                      : (isWebOrder && initialDeliveryCharge > 0
                          ? 'Delivery charge captured from web order — not editable'
                          : 'Enter or edit delivery charge')
                  }
                  className={`w-24 px-2 py-1.5 rounded-lg border text-sm outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${(isPrepaid || (isWebOrder && initialDeliveryCharge > 0)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="delivery-charge-input"
                />
              </div>
            </div>
          </div>
        )}

        <div className="text-xs font-bold uppercase tracking-wider px-1 pt-2 -mb-2" style={{ color: COLORS.grayText }}>
          📋 Bill Summary <span className="ml-1 font-normal normal-case tracking-normal" style={{ color: COLORS.grayText, opacity: 0.6 }}>— computed, read-only</span>
        </div>
        </>
        )}

        {/* Bill Items */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="bill-summary-section"
        >

          {/* ROOM_CHECKIN_GAP3 (Stage 2): Room booking section — first block in
              the bill summary whenever the order is a checked-in room with
              room_info hydrated from backend. Renders independently of
              associatedOrders presence (Case A: marker-only ₹balance only;
              Case B: full room+transfers+food). Architectural rule (L2):
              roomBalance carries NO SC, NO GST, NO discount — values are
              displayed as-is from backend `room_info`. */}
          {isRoom && roomInfo && (
            <div className="pb-2 mb-2 border-b" style={{ borderColor: COLORS.borderGray }}>
              <button
                onClick={() => setShowRoomBooking(!showRoomBooking)}
                className="w-full flex items-center justify-between py-1"
                data-testid="checkout-room-booking-toggle"
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                    Room
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: COLORS.primaryOrange }} data-testid="checkout-room-balance">
                    ₹{roomBalance.toLocaleString()}
                  </span>
                  {showRoomBooking
                    ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />}
                </div>
              </button>
              {showRoomBooking && (
                <div className="mt-1 mb-1 px-3 py-2 text-xs space-y-1 rounded-lg" style={{ backgroundColor: `${COLORS.primaryOrange}05` }}>
                  <div className="flex justify-between">
                    <span style={{ color: COLORS.grayText }}>Room Charge</span>
                    <span style={{ color: COLORS.darkText }} data-testid="checkout-room-price">
                      ₹{(roomInfo.roomPrice || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: COLORS.grayText }}>Advance Paid</span>
                    <span style={{ color: COLORS.darkText }} data-testid="checkout-room-advance">
                      −₹{(roomInfo.advancePayment || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t" style={{ borderColor: COLORS.borderGray }}>
                    <span style={{ color: COLORS.darkText }}>Balance</span>
                    <span style={{ color: COLORS.primaryOrange }}>₹{roomBalance.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === ROOM WITH ASSOCIATED ORDERS: Transferred Orders first, then Room Service total === */}
          {isRoom && associatedOrders.length > 0 ? (
            <div className="space-y-2 text-sm">
              {/* Transferred Orders — collapsible */}
              <div>
                <button
                  onClick={() => setShowTransferredOrders(!showTransferredOrders)}
                  className="w-full flex items-center justify-between py-1"
                  data-testid="checkout-transferred-toggle"
                >
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                      Transferred Orders ({associatedOrders.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: COLORS.primaryOrange }}>₹{associatedTotal.toLocaleString()}</span>
                    {showTransferredOrders
                      ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />}
                  </div>
                </button>
                {showTransferredOrders && (
                  <div className="mt-1 mb-2 max-h-40 overflow-y-auto rounded-lg" style={{ backgroundColor: `${COLORS.primaryOrange}05` }}>
                    {associatedOrders.map((order) => (
                      <div
                        key={order.orderId}
                        className="px-3 py-1.5 flex items-center justify-between text-xs"
                        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
                        data-testid={`checkout-assoc-${order.orderId}`}
                      >
                        <div>
                          <span className="font-medium" style={{ color: COLORS.darkText }}>#{order.orderNumber}</span>
                          {order.transferredAt && (
                            <span className="ml-2" style={{ color: COLORS.grayText }}>
                              {new Date(order.transferredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold" style={{ color: COLORS.darkText }}>₹{order.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room Service — collapsible with full breakdown */}
              <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                <button
                  onClick={() => setShowRoomService(!showRoomService)}
                  className="w-full flex items-center justify-between py-1"
                  data-testid="checkout-room-service-toggle"
                >
                  <div className="flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5" style={{ color: COLORS.darkText }} />
                    <span className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>
                      Room Orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: COLORS.darkText }}>₹{finalTotal.toLocaleString()}</span>
                    {showRoomService
                      ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />}
                  </div>
                </button>
                {showRoomService && (
                  <div className="mt-1 mb-1 text-xs space-y-2" style={{ backgroundColor: `${COLORS.lightBg}` }}>
                    {/* Items list */}
                    <div className="px-3 pt-2 space-y-1.5 max-h-48 overflow-y-auto">
                      {(cartItems || []).filter(i => !i.isCheckInMarker).map((item, idx) => {
                        const isComp = isLineComplimentary(item);
                        const isCatalogLocked = item.isComplementary === true;
                        // BUG-022 (Apr-2026): cancelled lines must render strikethrough + gray.
                        const isCancelled = item.status === 'cancelled';
                        return (
                        <div key={idx} className="flex justify-between items-start gap-2">
                          {/* BUG-018 Part 2: complimentary checkbox (locked for catalog items) */}
                          <input
                            type="checkbox"
                            className="mt-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            checked={isComp}
                            disabled={isCatalogLocked || !onToggleComplimentary || isCancelled}
                            onChange={() => onToggleComplimentary && onToggleComplimentary(item.id)}
                            data-testid={`complimentary-checkbox-${item.id}`}
                            title={isCatalogLocked ? 'Catalog-complimentary — cannot be unchecked' : 'Mark as complimentary'}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <span
                                style={{
                                  color: isCancelled ? '#9CA3AF' : COLORS.darkText,
                                  textDecoration: isCancelled ? 'line-through' : 'none',
                                }}
                              >
                                {item.name}
                                {isComp && (
                                  <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                                    (Complimentary)
                                  </span>
                                )}
                                {isCancelled && (
                                  <span className="ml-1 text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>
                                    (Cancelled)
                                  </span>
                                )}
                              </span>
                              <span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
                            </div>
                            {/* BUG-073: guard against empty customization wrapper */}
                            {item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
                              <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
                                └─ {item.customizations.size}
                                {item.customizations.variants?.length > 0 && (item.customizations.size ? ', ' : '') + item.customizations.variants.join(", ")}
                                {item.customizations.addons?.length > 0 && ` + ${item.customizations.addons.join(", ")}`}
                              </div>
                            )}
                            {!item.customizations && (item.variation?.length > 0 || item.addOns?.length > 0) && (
                              <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
                                └─ {item.variation?.map(v => {
                                  const labels = Array.isArray(v.values)
                                    ? v.values.map(val => val.label).filter(Boolean)
                                    : (Array.isArray(v.values?.label) ? v.values.label : []);
                                  return labels.length > 0 ? `${v.name}: ${labels.join(', ')}` : v.name;
                                }).filter(Boolean).join(', ')}
                                {item.addOns?.length > 0 && `${item.variation?.length > 0 ? ' + ' : ''}${item.addOns.map(a => {
                                  const qty = a.quantity || a.qty || 1;
                                  return qty > 1 ? `${a.name} x${qty}` : a.name;
                                }).filter(Boolean).join(', ')}`}
                              </div>
                            )}
                          </div>
                          <span
                            className={`ml-4 font-medium ${(isComp || isCancelled) ? 'line-through' : ''}`}
                            style={{ color: (isComp || isCancelled) ? COLORS.grayText : COLORS.darkText }}
                          >
                            ₹{getItemLinePrice(item).toLocaleString()}
                          </span>
                        </div>
                        );
                      })}
                    </div>
                    {/* Item Total */}
                    <div className="px-3 pt-2 border-t flex justify-between font-medium" style={{ borderColor: COLORS.borderGray }}>
                      <span style={{ color: COLORS.darkText }}>Item Total</span>
                      <span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
                    </div>

                    {/* --- Discount/Coupon/Loyalty/Wallet inside Room Service --- */}
                    {/* Discount */}
                    {/* BUG-108 P1 Q10: Inline-mirror — disabled when a coupon is applied. */}
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray, opacity: selectedCoupon ? 0.6 : 1 }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
                        <div className="flex gap-2 flex-1 justify-end">
                          <select
                            value={discountType || ""}
                            onChange={(e) => setDiscountType(e.target.value || null)}
                            disabled={selectedCoupon !== null}
                            className="px-2 py-1 rounded-lg border text-xs outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            style={{ borderColor: COLORS.borderGray, minWidth: "70px" }}
                          >
                            <option value="">None</option>
                            <option value="percent">%</option>
                            <option value="flat">₹</option>
                          </select>
                          {discountType && (
                            <input
                              type="number"
                              placeholder={discountType === 'percent' ? "%" : "₹"}
                              value={discountValue}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (e.target.value === '' || e.target.value === '-') { setDiscountValue(''); return; }
                                if (val < 0) { setDiscountValue(''); return; }
                                if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
                                setDiscountValue(e.target.value);
                              }}
                              min="0"
                              max={discountType === 'percent' ? "100" : undefined}
                              disabled={selectedCoupon !== null}
                              className="w-16 px-2 py-1 rounded-lg border text-xs outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                              style={{ borderColor: COLORS.borderGray }}
                            />
                          )}
                          {manualDiscount > 0 && (
                            <span className="text-xs font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
                          )}
                        </div>
                      </div>
                      {selectedCoupon && (
                        <div className="text-xs mt-1 ml-5 italic" style={{ color: COLORS.grayText }}>
                          {BUG108_COPY.discountBlockedByCoupon}
                        </div>
                      )}
                    </div>

                    {/* Coupon */}
                    {/* BUG-108 V1B (2026-05-25): inline-mirror parity with main coupon UI.
                        Smaller text classes; shares the same state hooks. */}
                    {customer && restaurantSettings?.isCoupon && (() => {
                      const isManualActiveInline = (manualDiscount > 0 || presetDiscount > 0);
                      const couponBlockedInline = isManualActiveInline;
                      const helperTextInline = isManualActiveInline
                          ? BUG108_COPY.couponBlockedByDiscount
                          : null;
                      const showDropdownInline = showCouponDropdown && !couponBlockedInline && !selectedCoupon && displayedCoupons.length > 0;
                      const showEmptyHintInline = showCouponDropdown && !couponBlockedInline && !selectedCoupon && displayedCoupons.length === 0 && !couponLoading && couponAvailableFetchedForRef.current === customer?.id;
                      const formatWindowTimeInline = (iso) => {
                        if (!iso) return '';
                        try { return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }); }
                        catch (_e) { return ''; }
                      };
                      return (
                    <div className="px-3 pt-2 border-t relative" style={{ borderColor: COLORS.borderGray, opacity: couponBlockedInline ? 0.6 : 1 }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🎫 Coupon</span>
                        <input
                          type="text"
                          placeholder="Enter code or pick…"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponError) setCouponError('');
                            if (couponInstruction) setCouponInstruction(null);
                          }}
                          onFocus={() => { setShowCouponDropdown(true); fetchAvailableCoupons(); }}
                          onBlur={() => { setTimeout(() => setShowCouponDropdown(false), 150); }}
                          disabled={couponBlockedInline || couponLoading}
                          className="flex-1 px-2 py-1 rounded-lg border text-xs outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                          style={{ borderColor: COLORS.borderGray }}
                        />
                        <button
                          onClick={() => handleApplyCoupon()}
                          disabled={couponBlockedInline || couponLoading || !couponCode}
                          className="px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                        >
                          {couponLoading ? '…' : 'Apply'}
                        </button>
                      </div>
                      {showDropdownInline && (
                        <div
                          className="absolute left-3 right-3 mt-1 rounded-lg border bg-white shadow-lg max-h-40 overflow-y-auto"
                          style={{ borderColor: COLORS.borderGray, zIndex: 50 }}
                        >
                          {displayedCoupons.slice(0, 5).map((c) => {
                            const inWindow = c.withinWindowNow !== false;
                            return (
                              <div
                                key={c.id || c.code}
                                onMouseDown={() => { if (inWindow && !couponLoading) handleApplyCoupon(c.code); }}
                                className={`px-3 py-1.5 text-xs flex items-center justify-between ${inWindow && !couponLoading ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed'}`}
                                style={{ opacity: inWindow && !couponLoading ? 1 : 0.5 }}
                              >
                                <span style={{ color: COLORS.darkText }}>{c.code}</span>
                                {inWindow ? (
                                  c.expectedDiscount
                                    ? <span style={{ color: COLORS.primaryGreen }}>−₹{Math.round(c.expectedDiscount * 100) / 100}</span>
                                    : <span className="text-xs" style={{ color: COLORS.grayText }}>{c.title}</span>
                                ) : (
                                  <span style={{ color: COLORS.grayText }}>
                                    {c.nextWindowStart ? `From ${formatWindowTimeInline(c.nextWindowStart)}` : 'Not active'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {showEmptyHintInline && (
                        <div className="text-xs mt-1 ml-14 italic" style={{ color: COLORS.grayText }}>
                          No coupons available for this customer
                        </div>
                      )}
                      {helperTextInline && (
                        <div className="text-xs mt-1 ml-14 italic" style={{ color: COLORS.grayText }}>
                          {helperTextInline}
                        </div>
                      )}
                      {couponError && <div className="text-xs mt-1 ml-14" style={{ color: "#D32F2F" }}>{couponError}</div>}
                      {couponInstruction && <div className="text-xs mt-1 ml-14" style={{ color: COLORS.grayText }}>{couponInstruction}</div>}
                      {selectedCoupon && (
                        <div className="flex items-center justify-between mt-1 px-2 py-1 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}10` }}>
                          <span className="text-xs" style={{ color: COLORS.primaryGreen }}>✓ {selectedCoupon.code} (-₹{couponDiscount})</span>
                          <button onClick={() => { setSelectedCoupon(null); setCouponCode(''); setCouponError(''); setCouponInstruction(null); }} className="text-xs" style={{ color: COLORS.grayText }}>Remove</button>
                        </div>
                      )}
                      {selectedCoupon?.benefitItems?.length > 0 && (
                        <div className="text-xs mt-1 ml-3" style={{ color: COLORS.grayText }}>
                          {selectedCoupon.benefitItems.map((bi, idx) => (
                            <div key={idx}>{bi.quantity}× {bi.name} {bi.line_discount >= (bi.unit_price * bi.quantity) ? 'FREE' : `−₹${bi.line_discount}`}</div>
                          ))}
                        </div>
                      )}
                    </div>
                      );
                    })()}

                    {/* Loyalty — Phase C corrected: CRM max-redeemable driven */}
                    {customer && restaurantSettings?.isLoyalty && BUG108_FLAGS.loyaltyRatioLive && maxRedeemable && !maxRedeemable.error && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" checked={useLoyalty} onChange={(e) => setUseLoyalty(e.target.checked)} disabled={!maxRedeemable || maxRedeemable.maxDiscountValue <= 0} className="w-3.5 h-3.5 accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>Loyalty</span>
                          {maxRedeemable.tier && (
                            <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: '#f0f0f0', color: COLORS.grayText }}>{maxRedeemable.tier}</span>
                          )}
                          <span className="text-xs" style={{ color: COLORS.grayText }}>({maxRedeemable.availablePoints} pts)</span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: maxRedeemable.maxDiscountValue > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                          {maxRedeemable.maxDiscountValue > 0 ? `₹${maxRedeemable.maxDiscountValue} discount` : ''}
                        </span>
                      </label>
                    </div>
                    )}

                    {/* Wallet */}
                    {/* BUG-108 P1: Inline-mirror parity — disabled until wallet debit CR ships. */}
                    {customer && restaurantSettings?.isCustomerWallet && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray, opacity: BUG108_FLAGS.walletDebitLive ? 1 : 0.7 }}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} disabled={!BUG108_FLAGS.walletDebitLive || !customer?.walletBalance} className="w-3.5 h-3.5 accent-green-600 disabled:opacity-50 disabled:cursor-not-allowed" />
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>💰 Wallet</span>
                          <span className="text-xs" style={{ color: COLORS.grayText }}>(₹{customer?.walletBalance || 0})</span>
                        </label>
                        <div className="flex items-center gap-1">
                          {BUG108_FLAGS.walletDebitLive && useWallet && customer?.walletBalance > 0 && (
                            <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(Math.min(parseFloat(e.target.value) || 0, customer.walletBalance))} className="w-14 px-1 py-0.5 text-xs text-right rounded border" style={{ borderColor: COLORS.borderGray }} />
                          )}
                          <span className="text-xs font-medium" style={{ color: useWallet && walletDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                            {useWallet && walletDiscount > 0 ? `-₹${walletDiscount}` : customer?.walletBalance > 0 ? "" : "No balance"}
                          </span>
                        </div>
                      </div>
                      {!BUG108_FLAGS.walletDebitLive && (
                        <div className="text-xs mt-1 ml-5 italic" style={{ color: COLORS.grayText }}>
                          {BUG108_COPY.walletDisabledHelper}
                        </div>
                      )}
                    </div>
                    )}

                    {/* Discounts summary (if any applied) */}
                    {totalDiscount > 0 && (
                      <div className="px-3 pt-2 border-t space-y-1" style={{ borderColor: COLORS.borderGray }}>
                        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Applied Discounts</div>
                        {manualDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.darkText }}>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat'})</span><span style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount.toLocaleString()}</span></div>}
                        {couponDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.darkText }}>Coupon: {selectedCoupon?.code}</span><span style={{ color: COLORS.primaryGreen }}>-₹{couponDiscount.toLocaleString()}</span></div>}
                        {loyaltyDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.darkText }}>Loyalty</span><span style={{ color: COLORS.primaryGreen }}>-₹{loyaltyDiscount.toLocaleString()}</span></div>}
                        {walletDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.darkText }}>Wallet</span><span style={{ color: COLORS.primaryGreen }}>-₹{walletDiscount.toLocaleString()}</span></div>}
                        <div className="flex justify-between font-medium" style={{ color: COLORS.primaryGreen }}><span>Total Discount</span><span>-₹{totalDiscount.toLocaleString()}</span></div>
                      </div>
                    )}

                    {/* BUG-281: Order SC → Subtotal (pre-tax) → Taxes */}
                    {/* Service Charge — BUG-276: checkbox toggle */}
                    {/* BUG-028 rework: gate Adjustments-panel SC toggle by scApplicable so takeaway/delivery never show it */}
                    {scApplicable && serviceChargePercentage > 0 && (
                      <div className="px-3 pt-2 border-t flex justify-between items-center" style={{ borderColor: COLORS.borderGray }}>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={serviceChargeEnabled}
                            onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                            className="w-3.5 h-3.5 accent-green-600"
                            data-testid="service-charge-toggle"
                          />
                          <span style={{ color: COLORS.grayText }}>Service Charge ({serviceChargePercentage}%)</span>
                        </label>
                        <span style={{ color: COLORS.darkText }}>₹{serviceCharge.toFixed(2)}</span>
                      </div>
                    )}
                    {tipApplicable && tip > 0 && (
                      <div className="px-3 pt-1 flex justify-between">
                        <span style={{ color: COLORS.grayText }}>Tip</span>
                        <span style={{ color: COLORS.darkText }}>₹{tip.toFixed(2)}</span>
                      </div>
                    )}
                    {/* BUG-281: Subtotal (pre-tax complete) */}
                    <div className="px-3 pt-2 border-t flex justify-between font-medium" style={{ borderColor: COLORS.borderGray }}>
                      <span style={{ color: COLORS.grayText }}>Subtotal</span>
                      <span style={{ color: COLORS.darkText }}>₹{subtotal.toLocaleString()}</span>
                    </div>
                    {/* Taxes */}
                    <div className="px-3 space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span style={{ color: COLORS.grayText }}>SGST</span>
                        <span style={{ color: COLORS.darkText }}>₹{sgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: COLORS.grayText }}>CGST</span>
                        <span style={{ color: COLORS.darkText }}>₹{cgst.toFixed(2)}</span>
                      </div>
                      {roundOff !== 0 && (
                        <div className="flex justify-between">
                          <span style={{ color: COLORS.grayText }}>Round Off</span>
                          <span style={{ color: COLORS.darkText }}>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {/* Room Service Grand Total */}
                    <div className="px-3 py-2 border-t flex justify-between font-bold" style={{ borderColor: COLORS.borderGray }}>
                      <span style={{ color: COLORS.darkText }}>Room Orders Total</span>
                      <span style={{ color: COLORS.darkText }}>₹{finalTotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ROOM_CHECKIN_GAP3 (Stage 2 follow-up, 2026-04-25): single
                  "Total" row removed — replaced by the Grand-Total Stack
                  rendered below the bill-summary card via <GrandTotalStack/>. */}
            </div>
          ) : (
          /* === DEFAULT: Table / Room without transfers — show item details === */
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Items
            </div>
            <div className="space-y-2 pb-3 border-b" style={{ borderColor: COLORS.borderGray }}>
              {(cartItems || []).filter(i => !i.isCheckInMarker).map((item, idx) => {
                const isComp = isLineComplimentary(item);
                const isCatalogLocked = item.isComplementary === true;
                // BUG-022 (Apr-2026): cancelled lines must render strikethrough + gray,
                // matching CartPanel.jsx behaviour on the Order page. Math already
                // excludes cancelled via activeItems/billableItems; this is display-only.
                const isCancelled = item.status === 'cancelled';
                return (
                <div key={idx} className="flex justify-between items-start gap-2">
                  {/* BUG-018 Part 2: complimentary checkbox (locked for catalog items) */}
                  <input
                    type="checkbox"
                    className="mt-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    checked={isComp}
                    disabled={isCatalogLocked || !onToggleComplimentary || isCancelled}
                    onChange={() => onToggleComplimentary && onToggleComplimentary(item.id)}
                    data-testid={`complimentary-checkbox-${item.id}`}
                    title={isCatalogLocked ? 'Catalog-complimentary — cannot be unchecked' : 'Mark as complimentary'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span
                        style={{
                          color: isCancelled ? '#9CA3AF' : COLORS.darkText,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}
                      >
                        {item.name}
                        {isComp && (
                          <span className="ml-1 text-[10px] font-semibold" style={{ color: COLORS.primaryGreen }}>
                            (Complimentary)
                          </span>
                        )}
                        {isCancelled && (
                          <span className="ml-1 text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>
                            (Cancelled)
                          </span>
                        )}
                      </span>
                      <span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
                    </div>
                    {/* BUG-073: guard against empty customization wrapper */}
                    {item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
                      <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
                        └─ {item.customizations.size}
                        {item.customizations.variants?.length > 0 && (item.customizations.size ? ', ' : '') + item.customizations.variants.join(", ")}
                        {item.customizations.addons?.length > 0 && ` + ${item.customizations.addons.join(", ")}`}
                      </div>
                    )}
                    {!item.customizations && (item.variation?.length > 0 || item.addOns?.length > 0) && (
                      <div className="text-xs mt-0.5 pl-2" style={{ color: COLORS.primaryGreen }}>
                        └─ {item.variation?.map(v => {
                          const labels = Array.isArray(v.values)
                            ? v.values.map(val => val.label).filter(Boolean)
                            : (Array.isArray(v.values?.label) ? v.values.label : []);
                          return labels.length > 0 ? `${v.name}: ${labels.join(', ')}` : v.name;
                        }).filter(Boolean).join(', ')}
                        {item.addOns?.length > 0 && `${item.variation?.length > 0 ? ' + ' : ''}${item.addOns.map(a => {
                          const qty = a.quantity || a.qty || 1;
                          return qty > 1 ? `${a.name} x${qty}` : a.name;
                        }).filter(Boolean).join(', ')}`}
                      </div>
                    )}
                  </div>
                  <span
                    className={`ml-4 font-medium ${(isComp || isCancelled) ? 'line-through' : ''}`}
                    style={{ color: (isComp || isCancelled) ? COLORS.grayText : COLORS.darkText }}
                  >
                    ₹{getItemLinePrice(item).toLocaleString()}
                  </span>
                </div>
                );
              })}
            </div>
            
            {/* Item Total */}
            <div className="flex justify-between py-2 font-medium">
              <span style={{ color: COLORS.darkText }}>Item Total</span>
              <span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
            </div>
          </div>
          )}

          {/* Discounts/Subtotal/Taxes — only for tables and rooms WITHOUT transfers */}
          {!(isRoom && associatedOrders.length > 0) && (
          <>
          {/* Discounts Section */}
          {totalDiscount > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
                Discounts
              </div>
              <div className="space-y-1.5 text-sm">
                {manualDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Discount ({discountType === 'percent' ? `${discountValue}%` : 'Flat'})
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount.toLocaleString()}</span>
                  </div>
                )}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Loyalty Points ({maxRedeemable?.maxPointsRedeemable ?? 0} pts)
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{loyaltyDiscount.toLocaleString()}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Coupon: {selectedCoupon?.code}
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1" style={{ color: COLORS.darkText }}>
                      <Check className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                      Wallet
                    </span>
                    <span style={{ color: COLORS.primaryGreen }}>-₹{walletDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 font-medium" style={{ color: COLORS.primaryGreen }}>
                  <span>Total Discount</span>
                  <span>-₹{totalDiscount.toLocaleString()}</span>
                </div>
                {/* BUG-006 UX: Post-discount base — transparency for cashier on what SC/tax is computed against */}
                <div className="flex justify-between text-xs pt-1 mt-1 border-t" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                  <span>↳ Post-discount</span>
                  <span data-testid="bill-post-discount-value">₹{subtotalAfterDiscount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* BUG-281: Order is now — Discounts(−) → Service Charge(+) → Delivery → Tip(+) → Subtotal(pre-tax) → Taxes → Round Off */}

          {/* BUG-006 UX v2 (Apr-2026): Service Charge, Delivery Charge, and Tip are
              now READ-ONLY display rows here. The editable controls (toggle / inputs)
              live in the "🎛 Adjustments" panel ABOVE Bill Summary. */}

          {/* Service Charge — read-only display */}
          {/* BUG-013: Only show for dine-in, walk-in, and room orders */}
          {scApplicable && serviceChargePercentage > 0 && serviceChargeEnabled && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="service-charge-row">
              <div className="flex justify-between text-sm items-center">
                <span style={{ color: COLORS.grayText }}>
                  Service Charge <span className="text-xs" style={{ opacity: 0.7 }}>@ {serviceChargePercentage}%{totalDiscount > 0 ? ` on ₹${subtotalAfterDiscount.toLocaleString()}` : ''}</span>
                </span>
                <span style={{ color: COLORS.darkText }}>₹{serviceCharge.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Delivery Charge — read-only display, only when > 0 */}
          {orderType === 'delivery' && deliveryCharge > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="delivery-charge-row">
              <div className="flex justify-between text-sm">
                <span style={{ color: COLORS.grayText }}>Delivery Charge</span>
                <span style={{ color: COLORS.darkText }}>₹{deliveryCharge.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Tip — read-only display, only when > 0 */}
          {tipApplicable && tip > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="tip-row">
              <div className="flex justify-between text-sm">
                <span style={{ color: COLORS.grayText }}>Tip</span>
                <span style={{ color: COLORS.darkText }}>₹{tip.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* BUG-281: Subtotal = pre-tax complete (itemTotal − discount + SC + tip + delivery) */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
            <div className="flex justify-between text-sm font-medium">
              <span style={{ color: COLORS.grayText }}>Subtotal</span>
              <span style={{ color: COLORS.darkText }} data-testid="bill-subtotal-value">₹{subtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Taxes — CR-013 Phase 1.5 D-GST-4 (May-2026, owner-approved):
              per-component breakdown. Each component pair (CGST+SGST) renders
              ONLY when its value > 0 to avoid clutter on low-tax restaurants.
              Item GST shown without rate label because items can carry mixed
              rates; SC / Tip / Delivery carry the single configured rate
              (`serviceChargeTaxPct` for SC + Tip, `deliveryChargeGstPct` for
              Delivery — half on each side). Round-off is NOT folded into
              these values (BUG-009 round-off applies ONLY to Grand Total per
              owner directive 2026-05-05). */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="bill-tax-breakdown">
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Taxes
            </div>
            <div className="space-y-1 text-sm">
              {/* Item GST — half each on CGST + SGST side; mixed-rate items
                  hide the rate label. Always renders if either half > 0. */}
              {(taxTotals.sgst > 0 || taxTotals.cgst > 0) && (
                <>
                  <div className="flex justify-between" data-testid="bill-tax-cgst-items">
                    <span style={{ color: COLORS.grayText }}>CGST</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((itemGstPostDiscount / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="bill-tax-sgst-items">
                    <span style={{ color: COLORS.grayText }}>SGST</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((itemGstPostDiscount / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              {/* Item VAT — single row (no SGST/CGST split). CR-VAT-COLLECT 2026-05.
                  BUG-054: display the post-discount prorated `vat` (not raw taxTotals.vat).
                  Gated on prorated vat > 0, mirrors CGST/SGST row gating. */}
              {vat > 0 && (
                <div className="flex justify-between" data-testid="bill-tax-vat-items">
                  <span style={{ color: COLORS.grayText }}>VAT</span>
                  <span style={{ color: COLORS.darkText }}>₹{(Math.round(vat * 100) / 100).toFixed(2)}</span>
                </div>
              )}
              {/* SC GST — gated on scGst > 0; rate label = scTaxRate × 100 / 2 per side. */}
              {scGst > 0 && (
                <>
                  <div className="flex justify-between" data-testid="bill-tax-cgst-sc">
                    <span style={{ color: COLORS.grayText }}>CGST on Service Charge {((restaurant?.serviceChargeTaxPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((scGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="bill-tax-sgst-sc">
                    <span style={{ color: COLORS.grayText }}>SGST on Service Charge {((restaurant?.serviceChargeTaxPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((scGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              {/* Tip GST — gated on tipGst > 0; rides SC rate per CR-013 §1.9. */}
              {tipGst > 0 && (
                <>
                  <div className="flex justify-between" data-testid="bill-tax-cgst-tip">
                    <span style={{ color: COLORS.grayText }}>CGST on Tip {((restaurant?.serviceChargeTaxPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((tipGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="bill-tax-sgst-tip">
                    <span style={{ color: COLORS.grayText }}>SGST on Tip {((restaurant?.serviceChargeTaxPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((tipGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              {/* Delivery GST — gated on deliveryGst > 0. */}
              {deliveryGst > 0 && (
                <>
                  <div className="flex justify-between" data-testid="bill-tax-cgst-delivery">
                    <span style={{ color: COLORS.grayText }}>CGST on Delivery {((restaurant?.deliveryChargeGstPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((deliveryGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="bill-tax-sgst-delivery">
                    <span style={{ color: COLORS.grayText }}>SGST on Delivery {((restaurant?.deliveryChargeGstPct || 0) / 2).toFixed(2)}%</span>
                    <span style={{ color: COLORS.darkText }}>₹{(Math.round((deliveryGst / 2) * 100) / 100).toFixed(2)}</span>
                  </div>
                </>
              )}
              {/* Round Off — display-only; round-off applies ONLY to Grand
                  Total, never to component GST values (owner directive). */}
              {roundOff !== 0 && (
                <div className="flex justify-between" data-testid="bill-round-off">
                  <span style={{ color: COLORS.grayText }}>Round Off</span>
                  <span style={{ color: COLORS.darkText }}>{roundOff > 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        {/* ROOM_CHECKIN_GAP3 (Stage 2 follow-up, 2026-04-25): Grand-Total Stack
            — Variant α (clean). Sub-rows render only for room flows; non-room
            flows show only the GRAND TOTAL line (single row, hide all sub-rows
            when only Food is non-zero). For rooms, sub-rows auto-hide when
            their value is 0 — Architecture rule L2 (no SC/GST/discount on
            room balance) is preserved because Food Total already contains all
            food-side modifiers, and Room Balance is added flat. */}
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="bill-grand-total-stack"
        >
          {isRoom && (
            <>
              {finalTotal > 0 && (
                <div className="flex justify-between text-sm py-1" data-testid="bill-stack-food">
                  <span style={{ color: COLORS.grayText }}>Food Total</span>
                  <span style={{ color: COLORS.darkText, fontWeight: 600 }}>₹{finalTotal.toLocaleString()}</span>
                </div>
              )}
              {associatedTotal > 0 && (
                <div className="flex justify-between text-sm py-1" data-testid="bill-stack-transferred">
                  <span style={{ color: COLORS.grayText }}>Transferred Total</span>
                  <span style={{ color: COLORS.darkText, fontWeight: 600 }}>₹{associatedTotal.toLocaleString()}</span>
                </div>
              )}
              {roomBalance > 0 && (
                <div className="flex justify-between text-sm py-1" data-testid="bill-stack-room-balance">
                  <span style={{ color: COLORS.grayText }}>Room Balance</span>
                  <span style={{ color: COLORS.darkText, fontWeight: 600 }}>₹{roomBalance.toLocaleString()}</span>
                </div>
              )}
            </>
          )}
          <div
            className={`flex justify-between font-bold ${isRoom ? 'pt-2 mt-1 border-t' : ''}`}
            style={{ borderColor: COLORS.borderGray }}
            data-testid="bill-grand-total"
          >
            <span style={{ color: COLORS.darkText, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '13px' }}>Grand Total</span>
            <span style={{ color: COLORS.primaryOrange, fontSize: '16px' }}>
              ₹{(finalTotal + (isRoom ? associatedTotal + roomBalance : 0)).toLocaleString()}
            </span>
          </div>
        </div>

        {/* BUG-006 UX (Apr-2026): Discount/Coupon/Loyalty/Wallet controls moved ABOVE the Bill Summary card — see "ADJUSTMENTS" section earlier in this render tree. Former location kept as empty placeholder for diff readability. */}

        {/* Payment Method */}
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="payment-method-section"
        >
          <div className="text-sm font-semibold mb-3" style={{ color: COLORS.darkText }}>
            💳 PAYMENT METHOD
          </div>
          
          {/* Row 1: 3 Primary Payment Methods from API */}
          <div className={`grid gap-2 mb-2`} style={{ gridTemplateColumns: `repeat(${Math.min(enabledPrimaryMethods.length, 3) || 3}, 1fr)` }}>
            {/* BUG-080: Row 1 filtered by enabledPrimaryMethods (API + restaurant config) */}
            {(() => {
              return enabledPrimaryMethods.map((methodId) => {
                const method = PAYMENT_METHODS[methodId];
                if (!method) return null;
                const Icon = method.icon;
                const isSelected = paymentMethod === methodId && !showSplit;
                
                return (
                  <button
                    key={methodId}
                    onClick={() => { setPaymentMethod(methodId); setShowSplit(false); setSplitType(null); }}
                    className="py-3 px-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors"
                    style={{
                      borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                      backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : "white",
                    }}
                    data-testid={`payment-${methodId}-btn`}
                  >
                    <Icon className="w-5 h-5" style={{ color: isSelected ? COLORS.primaryGreen : COLORS.grayText }} />
                    <span className="text-xs" style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}>
                      {method.label}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
          
          {/* Row 2: Split + First Dynamic Type + Dropdown + To Room.
              BUG-042-A (Feb-2026): hidden entirely when the panel is mounted
              in Hold-Collect context (Audit Report → Hold tab Collect Bill).
              The owner-locked rule for that flow is "primary methods only"
              — Cash / Card / UPI from Row 1. Row 2 surfaces (Split, Credit
              dynamic button, "More" dropdown, To Room) remain available on
              the dashboard caller (no allowedMethods prop). */}
          {!isHoldContext && (
          <div className="grid grid-cols-3 gap-2">
            {/* Split Button */}
            {enabledLayout.row2.includes('split') && (
              <button
                onClick={() => { setShowSplit(!showSplit); if (!showSplit) setSplitType("payment"); }}
                className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors w-full"
                style={{
                  borderColor: showSplit ? COLORS.primaryGreen : COLORS.borderGray,
                  backgroundColor: showSplit ? `${COLORS.primaryGreen}10` : "white",
                }}
                data-testid="payment-split-btn"
              >
                <Split className="w-4 h-4" style={{ color: showSplit ? COLORS.primaryGreen : COLORS.grayText }} />
                <span className="text-xs" style={{ color: showSplit ? COLORS.primaryGreen : COLORS.darkText }}>Split</span>
              </button>
            )}
            
            {/* First Dynamic Type as Button (no icon, just label) */}
            {dynamicPaymentTypes.length > 0 && (
              <button
                onClick={() => { setPaymentMethod(dynamicPaymentTypes[0].id); setShowSplit(false); setSplitType(null); }}
                className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors"
                style={{
                  borderColor: paymentMethod === dynamicPaymentTypes[0].id && !showSplit ? COLORS.primaryGreen : COLORS.borderGray,
                  backgroundColor: paymentMethod === dynamicPaymentTypes[0].id && !showSplit ? `${COLORS.primaryGreen}10` : "white",
                }}
                data-testid={`payment-${dynamicPaymentTypes[0].id}-btn`}
              >
                <span className="text-xs font-medium" style={{ color: paymentMethod === dynamicPaymentTypes[0].id && !showSplit ? COLORS.primaryGreen : COLORS.darkText }}>
                  {dynamicPaymentTypes[0].displayName}
                </span>
              </button>
            )}
            
            {/* Dropdown for remaining dynamic types */}
            {dynamicPaymentTypes.length > 1 && (
              <select
                value={dynamicPaymentTypes.slice(1).some(dt => dt.id === paymentMethod) ? paymentMethod : ""}
                onChange={(e) => { 
                  if (e.target.value) {
                    setPaymentMethod(e.target.value); 
                    setShowSplit(false); 
                    setSplitType(null); 
                  }
                }}
                className="py-3 px-2 rounded-lg border-2 text-xs"
                style={{ 
                  borderColor: dynamicPaymentTypes.slice(1).some(dt => dt.id === paymentMethod) ? COLORS.primaryGreen : COLORS.borderGray,
                  backgroundColor: dynamicPaymentTypes.slice(1).some(dt => dt.id === paymentMethod) ? `${COLORS.primaryGreen}10` : "white",
                  color: COLORS.darkText,
                }}
                data-testid="payment-dynamic-dropdown"
              >
                <option value="">More...</option>
                {dynamicPaymentTypes.slice(1).map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.displayName}
                  </option>
                ))}
              </select>
            )}
            
            {/* To Room Button — dine-in/walk-in only, non-room, postpaid, rooms available (BUG-062: hidden for takeaway/delivery/prepaid/Place+Pay) */}
            {!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' || orderType === 'walkIn') && (
              <button
                onClick={() => { setPaymentMethod("transferToRoom"); setShowSplit(false); setSplitType(null); }}
                className="py-3 px-2 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors"
                style={{
                  borderColor: paymentMethod === "transferToRoom" && !showSplit ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: paymentMethod === "transferToRoom" && !showSplit ? `${COLORS.primaryOrange}10` : "white",
                }}
                data-testid="payment-transfer-room-btn"
              >
                <ArrowRightLeft className="w-4 h-4" style={{ color: paymentMethod === "transferToRoom" && !showSplit ? COLORS.primaryOrange : COLORS.grayText }} />
                <span className="text-xs" style={{ color: paymentMethod === "transferToRoom" && !showSplit ? COLORS.primaryOrange : COLORS.darkText }}>To Room</span>
              </button>
            )}
          </div>
          )}

          {/* Split Options */}
          {showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              {/* Split Type Toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSplitType("payment")}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: splitType === "payment" ? COLORS.primaryGreen : COLORS.lightBg,
                    color: splitType === "payment" ? "white" : COLORS.darkText,
                  }}
                >
                  By Payment
                </button>
                <button
                  onClick={() => setSplitType("station")}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: splitType === "station" ? COLORS.primaryGreen : COLORS.lightBg,
                    color: splitType === "station" ? "white" : COLORS.darkText,
                  }}
                >
                  By Station
                </button>
              </div>

              {/* Split by Payment — BUG-080: one fixed row per enabled method, no dropdown */}
              {splitType === "payment" && (
                <div className="space-y-2">
                  {splitPayments.map((sp, idx) => (
                    <div key={sp.method} className="space-y-1.5">
                      <div className="flex gap-2 items-center">
                        {/* Fixed method label — not a dropdown */}
                        <span
                          className="px-3 py-1.5 rounded-lg border text-sm font-medium min-w-[60px] text-center"
                          style={{
                            borderColor: COLORS.primaryGreen,
                            backgroundColor: `${COLORS.primaryGreen}10`,
                            color: COLORS.primaryGreen,
                          }}
                          data-testid={`split-method-label-${sp.method}`}
                        >
                          {sp.method === 'cash' ? 'Cash' : sp.method === 'card' ? 'Card' : 'UPI'}
                        </span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={sp.amount}
                          onChange={(e) => {
                            // BUG-113 (POS 4.0): Free typing — no real-time capping,
                            // no auto-fill on keystroke. User can type any amount.
                            // Validation + auto-fill happens on blur only.
                            const typedVal = e.target.value;
                            setSplitPayments(prev => {
                              const newSplit = prev.map(s => ({ ...s }));
                              newSplit[idx].amount = typedVal;
                              return newSplit;
                            });
                          }}
                          onBlur={() => {
                            // BUG-113 (POS 4.0): On blur — clamp to max, auto-fill
                            // the other row if exactly 2 rows and other is empty.
                            setSplitPayments(prev => {
                              const newSplit = prev.map(s => ({ ...s }));
                              const typedNum = parseFloat(newSplit[idx].amount) || 0;
                              const othersSum = newSplit.reduce((sum, s, i) => i !== idx ? sum + (parseFloat(s.amount) || 0) : sum, 0);
                              const maxForThisRow = Math.max(0, Math.round((effectiveTotal - othersSum) * 100) / 100);
                              // Clamp if over max
                              if (typedNum > maxForThisRow) {
                                newSplit[idx].amount = String(maxForThisRow);
                              }
                              const clampedNum = Math.min(typedNum, maxForThisRow);
                              // Auto-fill other row only if 2 rows and other row is empty
                              if (newSplit.length === 2) {
                                const otherIdx = idx === 0 ? 1 : 0;
                                if (!newSplit[otherIdx].amount || newSplit[otherIdx].amount === '0') {
                                  const remaining = Math.max(0, Math.round((effectiveTotal - clampedNum) * 100) / 100);
                                  newSplit[otherIdx].amount = remaining > 0 ? String(remaining) : "";
                                }
                              }
                              return newSplit;
                            });
                          }}
                          min="0"
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                          data-testid={`split-amount-${sp.method}`}
                        />
                      </div>
                      {/* BUG-241: Inline Txn ID for card row */}
                      {sp.method === 'card' && (
                        <div className="ml-1 flex items-center gap-2">
                          <span className="text-xs whitespace-nowrap" style={{ color: COLORS.grayText }}>Txn ID:</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            placeholder="Last 4"
                            value={sp.transactionId || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              const newSplit = [...splitPayments];
                              newSplit[idx].transactionId = val;
                              setSplitPayments(newSplit);
                            }}
                            className="w-20 px-2 py-1 rounded-lg border text-sm outline-none tracking-widest text-center"
                            style={{
                              borderColor: parseFloat(sp.amount) > 0
                                ? ((sp.transactionId || '').length === 4 ? COLORS.primaryGreen : '#ef4444')
                                : COLORS.borderGray,
                              backgroundColor: parseFloat(sp.amount) > 0
                                ? ((sp.transactionId || '').length === 4 ? `${COLORS.primaryGreen}08` : '#fef2f2')
                                : 'white',
                            }}
                            data-testid={`split-txn-id-${idx}`}
                          />
                          {parseFloat(sp.amount) > 0 && (sp.transactionId || '').length > 0 && (sp.transactionId || '').length < 4 && (
                            <span className="text-xs" style={{ color: COLORS.primaryOrange }}>4 digits</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-xs text-right" style={{ color: COLORS.grayText }}>
                    Remaining: ₹{Math.max(0, finalTotal - splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0)).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Split by Station */}
              {splitType === "station" && (
                <div className="space-y-3">
                  {/* Bar Items */}
                  {barItems.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>🍺 Bar ({barItems.length} items)</span>
                        <span className="text-sm font-bold" style={{ color: COLORS.primaryOrange }}>₹{barTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-xs mb-2 space-y-0.5" style={{ color: COLORS.grayText }}>
                        {barItems.map((item, idx) => (
                          <div key={idx}>{item.name} x{item.qty}</div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={stationPayments.bar.method}
                          onChange={(e) => setStationPayments({...stationPayments, bar: {...stationPayments.bar, method: e.target.value}})}
                          className="px-2 py-1.5 rounded border text-xs"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <button
                          onClick={() => setStationPayments({...stationPayments, bar: {...stationPayments.bar, paid: true}})}
                          disabled={stationPayments.bar.paid}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          style={{ 
                            backgroundColor: stationPayments.bar.paid ? COLORS.lightBg : COLORS.primaryGreen,
                            color: stationPayments.bar.paid ? COLORS.grayText : "white"
                          }}
                        >
                          {stationPayments.bar.paid ? "✓ Paid" : `Pay ₹${barTotal}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kitchen Items */}
                  {kitchenItems.length > 0 && (
                    <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>🍳 Kitchen ({kitchenItems.length} items)</span>
                        <span className="text-sm font-bold" style={{ color: COLORS.primaryOrange }}>₹{kitchenTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-xs mb-2 space-y-0.5" style={{ color: COLORS.grayText }}>
                        {kitchenItems.map((item, idx) => (
                          <div key={idx}>{item.name} x{item.qty}</div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={stationPayments.kitchen.method}
                          onChange={(e) => setStationPayments({...stationPayments, kitchen: {...stationPayments.kitchen, method: e.target.value}})}
                          className="px-2 py-1.5 rounded border text-xs"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <button
                          onClick={() => setStationPayments({...stationPayments, kitchen: {...stationPayments.kitchen, paid: true}})}
                          disabled={stationPayments.kitchen.paid}
                          className="flex-1 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                          style={{ 
                            backgroundColor: stationPayments.kitchen.paid ? COLORS.lightBg : COLORS.primaryGreen,
                            color: stationPayments.kitchen.paid ? COLORS.grayText : "white"
                          }}
                        >
                          {stationPayments.kitchen.paid ? "✓ Paid" : `Pay ₹${kitchenTotal}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cancelled Items - Show strikethrough */}
                  {cancelledItems.length > 0 && (
                    <div className="p-3 rounded-lg opacity-60" style={{ backgroundColor: COLORS.lightBg }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium line-through" style={{ color: COLORS.grayText }}>❌ Cancelled ({cancelledItems.length} items)</span>
                        <span className="text-sm font-bold line-through" style={{ color: COLORS.grayText }}>₹0</span>
                      </div>
                      <div className="text-xs space-y-0.5" style={{ color: COLORS.grayText }}>
                        {cancelledItems.map((item, idx) => (
                          <div key={idx} className="line-through">{item.name} x{item.qty} - ₹{getItemLinePrice(item)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cash Received */}
          {paymentMethod === "cash" && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
              <div className="text-xs mb-2" style={{ color: COLORS.grayText }}>Cash Received</div>
              <input
                type="number"
                placeholder="Amount"
                value={amountReceived}
                onChange={(e) => { hasTouchedCashReceived.current = true; setAmountReceived(e.target.value); }}
                className="w-full px-4 py-3 rounded-lg border text-lg outline-none mb-2"
                style={{
                  borderColor: amountReceived && parseFloat(amountReceived) < effectiveTotal
                    ? '#ef4444'
                    : COLORS.borderGray,
                  backgroundColor: amountReceived && parseFloat(amountReceived) < effectiveTotal
                    ? '#fef2f2'
                    : 'white',
                }}
                data-testid="cash-received-input"
              />
              {amountReceived && parseFloat(amountReceived) < effectiveTotal && (
                <div
                  className="text-xs mb-2"
                  style={{ color: '#ef4444' }}
                  data-testid="cash-short-warning"
                >
                  Need at least ₹{effectiveTotal.toLocaleString()} — short by ₹{(effectiveTotal - parseFloat(amountReceived)).toLocaleString()}
                </div>
              )}
              <div className="flex gap-2">
                {[effectiveTotal, Math.ceil(effectiveTotal / 100) * 100, Math.ceil(effectiveTotal / 500) * 500].map((amt, idx) => (
                  <button
                    key={`cash-${idx}`}
                    onClick={() => { hasTouchedCashReceived.current = true; setAmountReceived(amt.toString()); }}
                    className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
                    style={{ borderColor: COLORS.borderGray }}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>
              {change > 0 && (
                <div className="mt-3 text-center py-2 rounded-lg" style={{ backgroundColor: COLORS.lightBg }}>
                  <span className="text-sm" style={{ color: COLORS.grayText }}>Change: </span>
                  <span className="font-bold" style={{ color: COLORS.primaryOrange }}>₹{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* BUG-240: Card — Transaction ID (last 4 digits) */}
          {paymentMethod === "card" && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="card-txn-section">
              <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>Transaction ID (last 4 digits)</div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="_ _ _ _"
                value={cardTxnId}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCardTxnId(val);
                }}
                className="w-full px-4 py-3 rounded-lg border text-lg outline-none tracking-widest text-center"
                style={{
                  borderColor: cardTxnId.length === 4 ? COLORS.primaryGreen : cardTxnId.length > 0 ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: cardTxnId.length === 4 ? `${COLORS.primaryGreen}08` : 'white',
                }}
                data-testid="card-txn-id-input"
              />
              {cardTxnId.length > 0 && cardTxnId.length < 4 && (
                <div className="text-xs mt-1.5" style={{ color: COLORS.primaryOrange }}>
                  Enter all 4 digits to proceed
                </div>
              )}
            </div>
          )}

          {/* BUG-239: Credit/TAB — Customer Name + Phone */}
          {/* BUG-038 (May-2026): CRM typeahead wired here. Mirrors
              CartPanel.jsx pattern. No payload change — selectTabCustomer
              discards c.id; only c.name and c.phone reach state. */}
          {isTabPayment && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="tab-customer-section">
              <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>Credit Customer Details</div>
              <div className="space-y-2">
                <div className="relative" ref={tabNameInputRef}>
                  <input
                    type="text"
                    placeholder="Customer Name *"
                    value={tabName}
                    onChange={handleTabNameChange}
                    onFocus={() => { if (tabFilteredByName.length > 0) setTabShowNameSuggestions(true); }}
                    className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                    style={{
                      borderColor: !tabName.trim() ? '#ef4444' : COLORS.primaryGreen,
                      backgroundColor: !tabName.trim() ? '#fef2f2' : `${COLORS.primaryGreen}08`,
                    }}
                    data-testid="tab-customer-name-input"
                  />
                  {tabShowNameSuggestions && tabFilteredByName.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid="tab-customer-name-suggestions"
                    >
                      {tabFilteredByName.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          data-suggestion-tab="true"
                          onMouseDown={() => selectTabCustomer(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                          data-testid={`tab-customer-name-suggestion-${c.id}`}
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative" ref={tabPhoneInputRef}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Phone Number * (10 digits)"
                    value={tabPhone}
                    onChange={handleTabPhoneChange}
                    onFocus={() => { if (tabFilteredByPhone.length > 0) setTabShowPhoneSuggestions(true); }}
                    className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                    style={{
                      borderColor: tabPhone.replace(/\D/g, '').length === 10 ? COLORS.primaryGreen : '#ef4444',
                      backgroundColor: tabPhone.replace(/\D/g, '').length === 10 ? `${COLORS.primaryGreen}08` : '#fef2f2',
                    }}
                    data-testid="tab-customer-phone-input"
                  />
                  {tabShowPhoneSuggestions && tabFilteredByPhone.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                      style={{ borderColor: COLORS.borderGray }}
                      data-testid="tab-customer-phone-suggestions"
                    >
                      {tabFilteredByPhone.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          data-suggestion-tab="true"
                          onMouseDown={() => selectTabCustomer(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                          data-testid={`tab-customer-phone-suggestion-${c.id}`}
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {(!tabName.trim() || tabPhone.replace(/\D/g, '').length !== 10) && (
                <div className="text-xs mt-1.5" style={{ color: '#ef4444' }}>
                  {!tabName.trim() && tabPhone.replace(/\D/g, '').length !== 10
                    ? 'Name and 10-digit phone are required for credit/TAB orders'
                    : !tabName.trim()
                    ? 'Name is required for credit/TAB orders'
                    : `Enter 10-digit phone number (${tabPhone.replace(/\D/g, '').length}/10)`}
                </div>
              )}
            </div>
          )}

          {/* Transfer to Room — Room Picker */}
          {paymentMethod === "transferToRoom" && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="room-picker-section">
              <div className="text-xs mb-2 font-medium flex items-center justify-between" style={{ color: COLORS.grayText }}>
                <span>Select Room</span>
                <button
                  type="button"
                  onClick={() => { setFreshRooms(null); setRoomsError(null); fetchOccupiedRooms(); }}
                  data-testid="rooms-refresh-btn"
                  disabled={roomsLoading}
                  className="text-xs hover:underline disabled:opacity-50"
                  style={{ color: COLORS.primaryOrange }}
                >
                  {roomsLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
              {roomsLoading && freshRooms === null ? (
                <div className="text-sm py-4 text-center rounded-lg flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.lightBg, color: COLORS.grayText }} data-testid="rooms-loading">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading rooms…
                </div>
              ) : roomsError ? (
                <div className="text-sm py-3 px-3 rounded-lg flex items-center justify-between gap-2" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }} data-testid="rooms-error">
                  <span className="truncate">Couldn't load rooms — {roomsError}</span>
                  <button
                    type="button"
                    onClick={() => { setFreshRooms(null); setRoomsError(null); fetchOccupiedRooms(); }}
                    data-testid="rooms-retry-btn"
                    className="text-xs font-semibold underline whitespace-nowrap"
                  >
                    Retry
                  </button>
                </div>
              ) : occupiedRooms.length === 0 ? (
                <div className="text-sm py-4 text-center rounded-lg" style={{ backgroundColor: COLORS.lightBg, color: COLORS.grayText }}>
                  No checked-in rooms available
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {occupiedRooms.map((room) => (
                    <button
                      key={room.tableId}
                      onClick={() => setSelectedRoom(room)}
                      className="p-2 rounded-lg border-2 text-left transition-colors"
                      style={{
                        borderColor: selectedRoom?.tableId === room.tableId ? COLORS.primaryOrange : COLORS.borderGray,
                        backgroundColor: selectedRoom?.tableId === room.tableId ? `${COLORS.primaryOrange}10` : "white",
                      }}
                      data-testid={`room-pick-${room.tableNumber}`}
                    >
                      <div className="text-sm font-semibold" style={{ color: COLORS.darkText }}>{room.displayName || room.tableNumber}</div>
                      {room.customerName && (
                        <div className="text-xs truncate" style={{ color: COLORS.grayText }}>{room.customerName}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pay Button */}
      <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray }}>
        <button
          onClick={handlePayment}
          disabled={
            (!isMarkerOnlyRoom && (cartItems || []).filter(i => !i.isCheckInMarker).length === 0) ||
            (paymentMethod === 'transferToRoom' && !selectedRoom) ||
            (paymentMethod === 'card' && !showSplit && cardTxnId.length !== 4) ||
            (paymentMethod === 'cash' && !showSplit && (parseFloat(amountReceived || 0) < effectiveTotal)) ||
            (isTabPayment && !showSplit && (!tabName.trim() || tabPhone.replace(/\D/g, '').length !== 10)) ||
            (showSplit && splitType === 'payment' && splitPayments.some(sp => sp.method === 'card' && parseFloat(sp.amount) > 0 && (!sp.transactionId || sp.transactionId.length !== 4))) ||
            (showSplit && splitType === 'payment' && splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < effectiveTotal) ||
            isProcessingPayment
          }
          className="w-full py-4 rounded-lg font-bold text-lg text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: paymentMethod === 'transferToRoom' ? COLORS.primaryOrange : COLORS.primaryGreen }}
          data-testid="complete-payment-btn"
        >
          {isProcessingPayment ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : paymentMethod === 'transferToRoom'
            ? `Transfer ₹${finalTotal.toLocaleString()} to ${selectedRoom?.displayName || selectedRoom?.tableNumber || 'Room'}`
            : `${isRoom ? 'Checkout' : 'Pay'} ₹${((isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal) + roomBalance).toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

export default CollectPaymentPanel;
