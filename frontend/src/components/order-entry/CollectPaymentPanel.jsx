import { useState, useMemo } from "react";
import { ChevronLeft, CreditCard, Smartphone, Banknote, Split, FileText, Check, ArrowRightLeft, ChevronDown, ChevronUp, BellRing, RefreshCw, MoreHorizontal, Printer, Scissors } from "lucide-react";
import { COLORS } from "../../constants";
import { useRestaurant, useTables, useSettings } from "../../contexts";
import { PAYMENT_METHODS, filterLayoutByApiTypes, getDynamicPaymentTypes, DEFAULT_PAYMENT_LAYOUT } from "../../config/paymentMethods";
import PaymentMethodButton, { PaymentMethodButtonInline } from "./PaymentMethodButton";

const CollectPaymentPanel = ({ 
  cartItems, 
  total, 
  onBack, 
  onPaymentComplete, 
  onPrintBill,
  onOpenSplitBill, // BUG-004: null when not eligible; called with live finalTotal on click
  customer: passedCustomer, 
  isRoom, 
  associatedOrders = [],
  orderFinancials = {},
  hasPlacedItems = false,
  isProcessingPayment = false,
  orderType = 'dineIn',
}) => {
  const customer = passedCustomer;
  const { discountTypes, paymentMethods: restaurantPaymentMethods, paymentTypes: restaurantPaymentTypes, restaurant, settings: restaurantSettings } = useRestaurant();
  const { tables } = useTables();
  const { paymentLayoutConfig } = useSettings();

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

  // DEBUG LOGS - Payment Configuration
  console.log('[CollectPaymentPanel] Payment Debug:', {
    restaurantPaymentMethods,
    restaurantPaymentTypes,
    paymentLayoutConfig,
    hasRooms,
    enabledLayout,
    dynamicPaymentTypes,
  });

  // Filter out cancelled items for calculations, keep for display
  const activeItems = useMemo(() => 
    (cartItems || []).filter(item => item.status !== 'cancelled'),
    [cartItems]
  );
  const cancelledItems = useMemo(() => 
    (cartItems || []).filter(item => item.status === 'cancelled'),
    [cartItems]
  );

  // Occupied rooms for "Transfer to Room" picker (exclude current table)
  const occupiedRooms = useMemo(() => 
    (tables || []).filter(t => t.isRoom && t.isOccupied),
    [tables]
  );
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showTransferredOrders, setShowTransferredOrders] = useState(false);
  const [showRoomService, setShowRoomService] = useState(false);
  const [deliveryChargeInput, setDeliveryChargeInput] = useState('');

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
  const taxTotals = useMemo(() => {
    let sgst = 0, cgst = 0;
    activeItems.forEach(item => {
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
      }
    });
    return {
      sgst: Math.round(sgst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
    };
  }, [activeItems]);

  // Rewards state
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(customer?.walletBalance || 0);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [discountType, setDiscountType] = useState(null); // 'percent' or 'flat'
  const [discountValue, setDiscountValue] = useState("");

  // BUG-276: Service charge toggle — default ON, staff can uncheck per order
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);

  // BUG-277: Manual bill print state
  const [isPrintingBill, setIsPrintingBill] = useState(false);

  // BUG-281: Tip input — flat ₹, gated by restaurant.features.tip profile flag
  const tipEnabled = !!restaurant?.features?.tip;
  const [tipInput, setTipInput] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [showSplit, setShowSplit] = useState(false);
  const [splitType, setSplitType] = useState(null); // 'payment' or 'station'
  const [splitPayments, setSplitPayments] = useState([
    { method: "cash", amount: "", transactionId: "" },
    { method: "card", amount: "", transactionId: "" },
  ]);

  // BUG-239: TAB/Credit customer info
  const [tabName, setTabName] = useState(customer?.name || "");
  const [tabPhone, setTabPhone] = useState(customer?.phone || "");

  // BUG-240: Card transaction ID (last 4 digits)
  const [cardTxnId, setCardTxnId] = useState("");

  // Helper: TAB can arrive as 'credit' (internal) or 'tab'/'TAB' (API dynamic name)
  const isTabPayment = paymentMethod === 'credit' || paymentMethod.toLowerCase() === 'tab';
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
  const itemTotal = activeItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);
  
  // Discount from restaurant preset types (from RestaurantContext)
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  const presetDiscount = selectedDiscountType
    ? Math.round((itemTotal * selectedDiscountType.discountPercent) / 100)
    : 0;

  const manualDiscount = discountType === 'percent'
    ? Math.round((itemTotal * parseFloat(discountValue || 0)) / 100)
    : parseFloat(discountValue || 0);
  
  const loyaltyDiscount = useLoyalty && customer?.loyaltyPoints 
    ? Math.min(customer.loyaltyPoints, itemTotal - manualDiscount) 
    : 0;
  
  const couponDiscount = selectedCoupon
    ? selectedCoupon.type === "percent"
      ? Math.min(Math.round((itemTotal * selectedCoupon.discount) / 100), selectedCoupon.maxDiscount || Infinity)
      : selectedCoupon.discount
    : 0;
  
  const walletDiscount = useWallet && customer?.walletBalance 
    ? Math.min(walletAmount || customer.walletBalance, itemTotal - manualDiscount - loyaltyDiscount - couponDiscount) 
    : 0;

  const totalDiscount = manualDiscount + presetDiscount + loyaltyDiscount + couponDiscount + walletDiscount;
  const subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount);

  // BUG-269: Parse delivery charge from input (only for delivery orders)
  const deliveryCharge = orderType === 'delivery' ? (parseFloat(deliveryChargeInput) || 0) : 0;

  // BUG-281: Tip (flat ₹) — only contributes when feature flag enabled
  const tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0;

  // BUG-006 (AD-101): Service charge on POST-discount subtotal.
  // Order: items → discount → service charge → tax → tip.
  // BUG-276: toggle-able per order.
  // BUG-013: SC applies only to dine-in, walk-in, and room orders.
  const scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom;
  const serviceCharge = scApplicable && serviceChargeEnabled && serviceChargePercentage > 0
    ? Math.round(subtotalAfterDiscount * serviceChargePercentage / 100 * 100) / 100
    : 0;

  // BUG-006: Tax calculation
  //   1. Item tax prorated by discount ratio (post-discount base)
  //   2. GST on service charge, tip, and delivery charge (per user: "GST on everything")
  //   Uses average item GST rate as the markup rate for SC/tip/delivery.
  const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
  const avgGstRate    = itemTotal > 0
    ? (taxTotals.sgst + taxTotals.cgst) / itemTotal
    : 0;

  const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
  const scGst               = serviceCharge  * avgGstRate;
  const tipGst              = tip            * avgGstRate;
  const deliveryGst         = deliveryCharge * avgGstRate;

  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const sgst = Math.round((totalGst / 2) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;

  // Subtotal = pre-tax total = postDiscountItems + SC + tip
  // (Delivery is added after tax in rawFinalTotal; delivery's own GST is already in sgst/cgst.)
  const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip) * 100) / 100;

  const rawFinalTotal = Math.round((subtotal + sgst + cgst + deliveryCharge) * 100) / 100;

  // BUG-009: Round-off based on fractional part (old POS parity).
  // If fractional > 0.10 → ceil; if fractional <= 0.10 → floor.
  const fractional = Math.round((rawFinalTotal - Math.floor(rawFinalTotal)) * 100) / 100;
  const finalTotal = rawFinalTotal > 0
    ? (fractional > 0.10 ? Math.ceil(rawFinalTotal) : Math.floor(rawFinalTotal))
    : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;

  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - finalTotal) : 0;

  // Apply coupon code
  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode) return;
    
    // Check in customer coupons or general coupons
    const generalCoupons = [
      { code: "FLAT50", description: "₹50 off", discount: 50, minOrder: 500, type: "flat" },
      { code: "SAVE10", description: "10% off (max ₹100)", discount: 10, type: "percent", maxDiscount: 100 },
    ];
    
    const allCoupons = [...(customer?.coupons || []), ...generalCoupons];
    const foundCoupon = allCoupons.find(
      (c) => c.code.toLowerCase() === couponCode.toLowerCase()
    );
    
    if (foundCoupon) {
      if (foundCoupon.minOrder && itemTotal < foundCoupon.minOrder) {
        setCouponError(`Min order ₹${foundCoupon.minOrder} required`);
      } else {
        setSelectedCoupon(foundCoupon);
        setCouponCode("");
      }
    } else {
      setCouponError("Invalid coupon code");
    }
  };

  // handlePayment — CHG-038: Collect Payment API
  // TODO: Wire to API when Flow B (collect payment on existing order) endpoint is provided
  const handlePayment = () => {
    const roomHasTransfers = isRoom && associatedOrders.length > 0;
    const effectiveTotal = roomHasTransfers ? finalTotal + associatedTotal : finalTotal;
    const paymentData = {
      method:          paymentMethod,
      finalTotal:      effectiveTotal,
      sgst,
      cgst,
      vatAmount:       0,
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
        couponDiscount:       couponDiscount,
        couponTitle:          selectedCoupon?.code || '',
        couponType:           selectedCoupon?.type || '',
        discountType:         discountType || '',
        orderDiscountType:    discountType === 'percent' ? 'Percent' : discountType === 'flat' ? 'Amount' : '',
        loyaltyPoints:        loyaltyDiscount,
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
      printVatTax: 0,
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
        paymentAmount:       finalTotal,
        discountAmount,
        couponCode:          selectedCoupon?.code || '',
        loyaltyAmount:       loyaltyDiscount,
        walletAmount:        walletDiscount,
        serviceChargeAmount: serviceCharge,
        deliveryCharge,
        gstTax:              Math.round((sgst + cgst) * 100) / 100, // BUG-006: UI tax value
        vatTax:              0,                                     // VAT not aggregated in UI
        tip,                                                        // BUG-281: was hardcoded 0
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
          #D-108219
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
                isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal
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
            ₹{(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* BUG-006 UX (Apr-2026): ADJUSTMENTS — all editable controls grouped
            ABOVE the Bill Summary so cashier edits and computed results share a
            natural top-to-bottom flow. Previously Discount/Coupon/Loyalty/Wallet
            sat below Bill Summary, forcing a scroll-back to verify. */}
        {!(isRoom && associatedOrders.length > 0) && (
        <>
        <div className="text-xs font-bold uppercase tracking-wider px-1 -mb-2" style={{ color: COLORS.grayText }}>
          🎛 Adjustments
        </div>

        {/* 1. Discount Section - Always visible */}
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="discount-section"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
            <div className="flex gap-2 flex-1 justify-end">
              <select
                value={discountType || ""}
                onChange={(e) => setDiscountType(e.target.value || null)}
                className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray, minWidth: "80px" }}
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
                  className="w-20 px-2 py-1.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: COLORS.borderGray }}
                />
              )}
              {manualDiscount > 0 && (
                <span className="text-sm font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Coupon Section - Only if customer entered and coupons enabled in profile */}
        {customer && restaurantSettings?.isCoupon && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="coupon-section"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🎫 Coupon</span>
              <input
                type="text"
                placeholder="Enter code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="coupon-input"
              />
              <button
                onClick={handleApplyCoupon}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                data-testid="apply-coupon-btn"
              >
                Apply
              </button>
            </div>
            {couponError && <div className="text-xs mt-1 ml-16" style={{ color: "#D32F2F" }}>{couponError}</div>}
            {selectedCoupon && (
              <div className="flex items-center justify-between mt-2 px-2 py-1 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}10` }}>
                <span className="text-sm" style={{ color: COLORS.primaryGreen }}>✓ {selectedCoupon.code} (-₹{couponDiscount})</span>
                <button onClick={() => setSelectedCoupon(null)} className="text-xs" style={{ color: COLORS.grayText }}>Remove</button>
              </div>
            )}
          </div>
        )}

        {/* 3. Loyalty Section - Only if customer selected and loyalty enabled in profile */}
        {customer && restaurantSettings?.isLoyalty && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="loyalty-section"
          >
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useLoyalty}
                  onChange={(e) => setUseLoyalty(e.target.checked)}
                  disabled={!customer?.loyaltyPoints}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50"
                  data-testid="use-loyalty-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>⭐ Loyalty</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>({customer?.loyaltyPoints || 0} pts)</span>
              </div>
              <span className="text-sm font-medium" style={{ color: useLoyalty && loyaltyDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                {useLoyalty && loyaltyDiscount > 0 ? `-₹${loyaltyDiscount}` : customer?.loyaltyPoints > 0 ? `₹${customer.loyaltyPoints} available` : "No points"}
              </span>
            </label>
          </div>
        )}

        {/* 4. Wallet Section - Only if customer selected and wallet enabled in profile */}
        {customer && restaurantSettings?.isCustomerWallet && (
          <div
            className="p-3 rounded-lg border"
            style={{ borderColor: COLORS.borderGray }}
            data-testid="wallet-section"
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  disabled={!customer?.walletBalance}
                  className="w-4 h-4 accent-green-600 disabled:opacity-50"
                  data-testid="use-wallet-checkbox"
                />
                <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>💰 Wallet</span>
                <span className="text-xs" style={{ color: COLORS.grayText }}>(₹{customer?.walletBalance || 0})</span>
              </label>
              <div className="flex items-center gap-2">
                {useWallet && customer?.walletBalance > 0 && (
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
        {tipEnabled && (
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
                  className="w-24 px-2 py-1.5 rounded-lg border text-sm outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                      Room Service
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
                      {(cartItems || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between">
                              <span style={{ color: COLORS.darkText }}>{item.name}</span>
                              <span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
                            </div>
                            {item.customizations && (
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
                          <span className="ml-4 font-medium" style={{ color: COLORS.darkText }}>
                            ₹{getItemLinePrice(item).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Item Total */}
                    <div className="px-3 pt-2 border-t flex justify-between font-medium" style={{ borderColor: COLORS.borderGray }}>
                      <span style={{ color: COLORS.darkText }}>Item Total</span>
                      <span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span>
                    </div>

                    {/* --- Discount/Coupon/Loyalty/Wallet inside Room Service --- */}
                    {/* Discount */}
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🏷️ Discount</span>
                        <div className="flex gap-2 flex-1 justify-end">
                          <select
                            value={discountType || ""}
                            onChange={(e) => setDiscountType(e.target.value || null)}
                            className="px-2 py-1 rounded-lg border text-xs outline-none"
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
                              className="w-16 px-2 py-1 rounded-lg border text-xs outline-none"
                              style={{ borderColor: COLORS.borderGray }}
                            />
                          )}
                          {manualDiscount > 0 && (
                            <span className="text-xs font-medium self-center" style={{ color: COLORS.primaryGreen }}>-₹{manualDiscount}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coupon */}
                    {customer && restaurantSettings?.isCoupon && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium whitespace-nowrap" style={{ color: COLORS.darkText }}>🎫 Coupon</span>
                        <input
                          type="text"
                          placeholder="Enter code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 px-2 py-1 rounded-lg border text-xs outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          className="px-2 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                        >
                          Apply
                        </button>
                      </div>
                      {couponError && <div className="text-xs mt-1 ml-14" style={{ color: "#D32F2F" }}>{couponError}</div>}
                      {selectedCoupon && (
                        <div className="flex items-center justify-between mt-1 px-2 py-1 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}10` }}>
                          <span className="text-xs" style={{ color: COLORS.primaryGreen }}>✓ {selectedCoupon.code} (-₹{couponDiscount})</span>
                          <button onClick={() => setSelectedCoupon(null)} className="text-xs" style={{ color: COLORS.grayText }}>Remove</button>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Loyalty */}
                    {customer && restaurantSettings?.isLoyalty && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                      <label className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" checked={useLoyalty} onChange={(e) => setUseLoyalty(e.target.checked)} disabled={!customer?.loyaltyPoints} className="w-3.5 h-3.5 accent-green-600 disabled:opacity-50" />
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>⭐ Loyalty</span>
                          <span className="text-xs" style={{ color: COLORS.grayText }}>({customer?.loyaltyPoints || 0} pts)</span>
                        </div>
                        <span className="text-xs font-medium" style={{ color: useLoyalty && loyaltyDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                          {useLoyalty && loyaltyDiscount > 0 ? `-₹${loyaltyDiscount}` : customer?.loyaltyPoints > 0 ? `₹${customer.loyaltyPoints} available` : "No points"}
                        </span>
                      </label>
                    </div>
                    )}

                    {/* Wallet */}
                    {customer && restaurantSettings?.isCustomerWallet && (
                    <div className="px-3 pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} disabled={!customer?.walletBalance} className="w-3.5 h-3.5 accent-green-600 disabled:opacity-50" />
                          <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>💰 Wallet</span>
                          <span className="text-xs" style={{ color: COLORS.grayText }}>(₹{customer?.walletBalance || 0})</span>
                        </label>
                        <div className="flex items-center gap-1">
                          {useWallet && customer?.walletBalance > 0 && (
                            <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(Math.min(parseFloat(e.target.value) || 0, customer.walletBalance))} className="w-14 px-1 py-0.5 text-xs text-right rounded border" style={{ borderColor: COLORS.borderGray }} />
                          )}
                          <span className="text-xs font-medium" style={{ color: useWallet && walletDiscount > 0 ? COLORS.primaryGreen : COLORS.grayText }}>
                            {useWallet && walletDiscount > 0 ? `-₹${walletDiscount}` : customer?.walletBalance > 0 ? "" : "No balance"}
                          </span>
                        </div>
                      </div>
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
                    {serviceChargePercentage > 0 && (
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
                    {tipEnabled && tip > 0 && (
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
                      <span style={{ color: COLORS.darkText }}>Room Service Total</span>
                      <span style={{ color: COLORS.darkText }}>₹{finalTotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t" style={{ borderColor: COLORS.borderGray }}>
                <div className="flex justify-between font-bold">
                  <span style={{ color: COLORS.darkText }}>Total</span>
                  <span style={{ color: COLORS.primaryOrange }}>₹{(finalTotal + associatedTotal).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
          /* === DEFAULT: Table / Room without transfers — show item details === */
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Items
            </div>
            <div className="space-y-2 pb-3 border-b" style={{ borderColor: COLORS.borderGray }}>
              {(cartItems || []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span style={{ color: COLORS.darkText }}>{item.name}</span>
                      <span className="ml-2" style={{ color: COLORS.grayText }}>x{item.qty}</span>
                    </div>
                    {item.customizations && (
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
                  <span className="ml-4 font-medium" style={{ color: COLORS.darkText }}>
                    ₹{getItemLinePrice(item).toLocaleString()}
                  </span>
                </div>
              ))}
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
                      Loyalty Points ({customer?.loyaltyPoints} pts)
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
          {tipEnabled && tip > 0 && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="tip-row">
              <div className="flex justify-between text-sm">
                <span style={{ color: COLORS.grayText }}>Tip</span>
                <span style={{ color: COLORS.darkText }}>₹{tip.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* BUG-281: Subtotal = pre-tax complete (itemTotal − discount + SC + tip) */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
            <div className="flex justify-between text-sm font-medium">
              <span style={{ color: COLORS.grayText }}>Subtotal</span>
              <span style={{ color: COLORS.darkText }} data-testid="bill-subtotal-value">₹{subtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Taxes */}
          <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }}>
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: COLORS.grayText }}>
              Taxes
            </div>
            <div className="space-y-1 text-sm">
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
          </div>
          </>
          )}
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
          <div className="grid grid-cols-3 gap-2 mb-2">
            {/* Get first 3 payment methods from API (cash, upi, card, etc.) */}
            {(() => {
              // Known primary methods that should go in Row 1
              const primaryMethodIds = ['cash', 'upi', 'card'];
              const row1Methods = primaryMethodIds
                .filter(id => enabledLayout.row1.includes(id))
                .slice(0, 3);
              
              return row1Methods.map((methodId) => {
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
          
          {/* Row 2: Split + First Dynamic Type + Dropdown */}
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
            
            {/* To Room Button - only for non-room postpaid orders with rooms available (hidden for prepaid/Place+Pay) */}
            {!isRoom && hasRooms && hasPlacedItems && (
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

              {/* Split by Payment */}
              {splitType === "payment" && (
                <div className="space-y-2">
                  {splitPayments.map((sp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex gap-2">
                        <select
                          value={sp.method}
                          onChange={(e) => {
                            const newSplit = [...splitPayments];
                            newSplit[idx].method = e.target.value;
                            if (e.target.value !== 'card') newSplit[idx].transactionId = '';
                            setSplitPayments(newSplit);
                          }}
                          className="px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={sp.amount}
                          onChange={(e) => {
                            const newSplit = [...splitPayments];
                            newSplit[idx].amount = e.target.value;
                            setSplitPayments(newSplit);
                          }}
                          className="flex-1 px-2 py-1.5 rounded-lg border text-sm outline-none"
                          style={{ borderColor: COLORS.borderGray }}
                        />
                      </div>
                      {/* BUG-241: Inline Txn ID for card split rows */}
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
                              borderColor: (sp.transactionId || '').length === 4 ? COLORS.primaryGreen : '#ef4444',
                              backgroundColor: (sp.transactionId || '').length === 4 ? `${COLORS.primaryGreen}08` : '#fef2f2',
                            }}
                            data-testid={`split-txn-id-${idx}`}
                          />
                          {(sp.transactionId || '').length > 0 && (sp.transactionId || '').length < 4 && (
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
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-lg outline-none mb-2"
                style={{ borderColor: COLORS.borderGray }}
                data-testid="cash-received-input"
              />
              <div className="flex gap-2">
                {[finalTotal, Math.ceil(finalTotal / 100) * 100, Math.ceil(finalTotal / 500) * 500].map((amt, idx) => (
                  <button
                    key={`cash-${idx}`}
                    onClick={() => setAmountReceived(amt.toString())}
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
          {isTabPayment && !showSplit && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.borderGray }} data-testid="tab-customer-section">
              <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>Credit Customer Details</div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: !tabName.trim() ? '#ef4444' : COLORS.primaryGreen,
                    backgroundColor: !tabName.trim() ? '#fef2f2' : `${COLORS.primaryGreen}08`,
                  }}
                  data-testid="tab-customer-name-input"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Phone Number * (10 digits)"
                  value={tabPhone}
                  onChange={(e) => setTabPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: tabPhone.replace(/\D/g, '').length === 10 ? COLORS.primaryGreen : '#ef4444',
                    backgroundColor: tabPhone.replace(/\D/g, '').length === 10 ? `${COLORS.primaryGreen}08` : '#fef2f2',
                  }}
                  data-testid="tab-customer-phone-input"
                />
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
              <div className="text-xs mb-2 font-medium" style={{ color: COLORS.grayText }}>Select Room</div>
              {occupiedRooms.length === 0 ? (
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
            (cartItems || []).length === 0 ||
            (paymentMethod === 'transferToRoom' && !selectedRoom) ||
            (paymentMethod === 'card' && !showSplit && cardTxnId.length !== 4) ||
            (isTabPayment && !showSplit && (!tabName.trim() || tabPhone.replace(/\D/g, '').length !== 10)) ||
            (showSplit && splitType === 'payment' && splitPayments.some(sp => sp.method === 'card' && (!sp.transactionId || sp.transactionId.length !== 4))) ||
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
            : `${isRoom ? 'Checkout' : 'Pay'} ₹${(isRoom && associatedOrders.length > 0 ? finalTotal + associatedTotal : finalTotal).toLocaleString()}`}
        </button>
      </div>
    </div>
  );
};

export default CollectPaymentPanel;
