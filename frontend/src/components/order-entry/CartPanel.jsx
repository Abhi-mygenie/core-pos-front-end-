import { useState, useEffect, useRef, useMemo } from "react";
import { Utensils, XCircle, Pencil, CookingPot, UtensilsCrossed, Check, User, Phone, Trash2, ArrowLeftRight, RefreshCw, ChevronDown, ChevronUp, LayoutGrid, MapPin, FileText, Banknote, CreditCard, Smartphone, Clock } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers, lookupCustomer } from "../../api/services/customerService";
import { RePrintOnlyButton, KotBillCheckboxes } from "./RePrintButton";
import { useSettings } from "../../contexts/SettingsContext";

// CR-018: Generate 15-minute interval time slots for schedule picker
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      slots.push(`${hh}:${mm}:00`);
    }
  }
  return slots;
};

// Get icon, color, and bg for food item status
const getItemStatusIcon = (status) => {
  switch (status) {
    case "preparing":
      return { Icon: CookingPot, color: COLORS.primaryOrange, bg: `${COLORS.primaryOrange}15` };
    case "ready":
      return { Icon: UtensilsCrossed, color: COLORS.primaryGreen, bg: `${COLORS.primaryGreen}15` };
    case "served":
      return { Icon: Check, color: COLORS.primaryGreen, bg: `${COLORS.primaryGreen}15` };
    case "cancelled":
      return { Icon: XCircle, color: '#9CA3AF', bg: '#F3F4F6' };
    default:
      return { Icon: CookingPot, color: COLORS.primaryOrange, bg: `${COLORS.primaryOrange}15` };
  }
};

const getTimeAgo = (isoString) => {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  if (diff < 1) return "Just now";
  return `${diff} mins ago`;
};

// Placed item row (sent to kitchen)
const PlacedItemRow = ({ item, displayQty, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity, canCancelItem = true, canFoodTransfer = true, isItemCancelAllowed }) => {
  const { Icon: StatusIcon, color: statusColor, bg: statusBg } = getItemStatusIcon(item.status);
  const isCancelled = item.status === 'cancelled';
  const showCancelBtn = !isCancelled && canCancelItem && (!isItemCancelAllowed || isItemCancelAllowed(item));
  const showTransferBtn = !isCancelled && canFoodTransfer;
  const originalQty = item._originalQty || item.qty; // BUG-237: min qty for placed items
  const shownQty = displayQty || item.qty; // BUG-237: combined qty (original + delta)

  return (
    <div
      className="px-3 py-2.5 flex items-start gap-2"
      style={{ borderBottom: `1px solid ${COLORS.borderGray}`, opacity: isCancelled ? 0.5 : 1 }}
    >
      {/* Status icon */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: statusBg }}>
        <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
      </div>

      {/* Cancel button — hidden for cancelled items and permission/cancellation-gated */}
      {showCancelBtn && (
        <button onClick={() => setCancelItem(item)} className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-gray-100" style={{ backgroundColor: COLORS.sectionBg }} data-testid={`cancel-item-btn-${item.id}`}>
          <XCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        {/* Item name — strikethrough if cancelled */}
        <div
          className="font-medium text-sm truncate"
          style={{ color: isCancelled ? '#9CA3AF' : COLORS.darkText, textDecoration: isCancelled ? 'line-through' : 'none' }}
        >
          {item.name}
          {isCancelled && <span className="ml-2 text-xs font-normal">(Cancelled)</span>}
        </div>
        {item.customizations && !isCancelled && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.customizations.size && <span>{item.customizations.size}</span>}
            {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
            {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
          </div>
        )}
        {/* Fallback for existing API orders — variation/addOns not in customizations */}
        {!item.customizations && !isCancelled && (item.variation?.length > 0 || item.addOns?.length > 0) && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.variation?.length > 0 && (
              <span>{item.variation.map(v => {
                // Socket format: values = [{label: "Large", optionPrice: "40"}] (array of objects)
                // API send format: values = {label: ["Large"]} (object with label array)
                let labels;
                if (Array.isArray(v.values)) {
                  labels = v.values.map(val => val.label).filter(Boolean);
                } else if (Array.isArray(v.values?.label)) {
                  labels = v.values.label;
                }
                if (labels && labels.length > 0) {
                  return `${v.name}: ${labels.join(', ')}`;
                }
                return v.name || v.label || '';
              }).filter(Boolean).join(', ')}</span>
            )}
            {item.addOns?.length > 0 && (
              <span>{item.variation?.length > 0 ? ' + ' : '+ '}{item.addOns.map(a => {
                const name = a.name || '';
                const qty = a.quantity || a.qty || 1;
                return qty > 1 ? `${name} x${qty}` : name;
              }).filter(Boolean).join(', ')}</span>
            )}
          </div>
        )}
        {item.notes && item.notes.trim() && !(item.itemNotes?.length > 0) && !isCancelled && (
          <div className="text-xs mt-0.5" style={{ color: COLORS.primaryOrange }}>
            📝 {item.notes}
          </div>
        )}
        {item.itemNotes && item.itemNotes.length > 0 && !isCancelled && (
          <div className="text-xs mt-0.5" style={{ color: COLORS.primaryOrange }}>
            📝 {item.itemNotes.map(n => n.label).join(", ")}
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: COLORS.grayText }}>
            {item.addedAt || item.createdAt ? getTimeAgo(item.addedAt || item.createdAt) : ''}
          </span>
          {/* Transfer button — pill with icon, hidden for cancelled items and permission-gated */}
          {showTransferBtn && (
            <button
              onClick={() => setTransferItem(item)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors whitespace-nowrap hover:opacity-80"
              style={{
                color: COLORS.primaryOrange,
                border: `1px solid ${COLORS.primaryOrange}40`,
                backgroundColor: `${COLORS.primaryOrange}08`,
              }}
              data-testid={`transfer-food-btn-${item.id}`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Transfer
            </button>
          )}
        </div>
      </div>

      {/* Qty — hidden for cancelled items */}
      {!isCancelled && (
        <div className="flex items-center gap-0.5 pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
          {/* CR-010: Weight items show weight display (not editable for placed items — cancel + re-add) */}
          {item.isWeightItem ? (
            <span className="font-bold text-sm px-1" style={{ color: COLORS.primaryGreen }}>
              {item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
                ? `${Math.round(item.qty * 1000)} ${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
                : `${parseFloat((item.qty || 0).toFixed(2))} ${item.itemUnit}`}
            </span>
          ) : editingQtyItemId === item.id ? (
            <>
              <button onClick={() => { if (shownQty > originalQty) updateQuantity(item.id, shownQty - 1, true); }} disabled={shownQty <= originalQty} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold disabled:opacity-30" style={{ color: COLORS.grayText }}>−</button>
              <input type="number" value={shownQty} min={originalQty} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= originalQty) updateQuantity(item.id, val, true); }} className="font-bold w-8 text-center bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style={{ color: COLORS.primaryGreen }} data-testid={`qty-input-placed-${item.id}`} />
              <button onClick={() => updateQuantity(item.id, shownQty + 1, true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.primaryGreen }}>+</button>
            </>
          ) : (
            <>
              <span className="font-bold" style={{ color: COLORS.primaryGreen }}>{shownQty}</span>
              <button onClick={() => setEditingQtyItemId(item.id)} className="p-2 hover:bg-gray-100 rounded-lg" data-testid={`qty-edit-${item.id}`}>
                <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Price — strikethrough for cancelled */}
      <div className="w-20 text-right pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
        {/* CR-010: Weight items show breakdown */}
        {item.isWeightItem && !isCancelled ? (
          <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>
            ₹{(item.totalPrice || (item.itemUnitPrice || item.price) * item.qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ) : (
        <span
          className="font-bold text-sm"
          style={{ color: isCancelled ? '#9CA3AF' : COLORS.primaryOrange, textDecoration: isCancelled ? 'line-through' : 'none' }}
        >
          ₹{(item.totalPrice ? Math.round(item.totalPrice / (item.qty || 1) * shownQty) : (() => {
            const base = (item.price || 0) * (shownQty || 1);
            const addonSum = (item.addOns || []).reduce((s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)), 0);
            const varSum = (item.variation || []).reduce((s, group) => {
              // variation format: {name, values: [{label, optionPrice}]}
              const groupSum = Array.isArray(group.values)
                ? group.values.reduce((gs, val) => gs + (parseFloat(val.optionPrice) || 0), 0)
                : (parseFloat(group.price) || 0);
              return s + groupSum;
            }, 0);
            return base + ((addonSum + varSum) * (shownQty || 1));
          })()).toLocaleString()}
        </span>
        )}
      </div>
    </div>
  );
};

// New item row (not yet placed — editable with Customize/Add Note)
const NewItemRow = ({ item, cartIndex, onDeleteItem, updateQuantity, onAddNote, onCustomize }) => (
  <div className="px-3 py-2.5 flex items-start gap-2" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
    {/* Trash delete — removes unplaced item directly from cart (no cancel modal) */}
    <button
      onClick={() => onDeleteItem(item)}
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 hover:bg-red-50 transition-colors"
      style={{ backgroundColor: COLORS.sectionBg }}
      data-testid={`delete-item-btn-${item.id}`}
      title="Remove item"
    >
      <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
    </button>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm truncate" style={{ color: COLORS.darkText }}>{item.name}</div>
      {item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
          {item.customizations.size && <span>{item.customizations.size}</span>}
          {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
          {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
        </div>
      )}
      {item.notes && item.notes.trim() && !(item.itemNotes?.length > 0) && (
        <div className="text-xs mt-0.5" style={{ color: COLORS.primaryOrange }}>
          📝 {item.notes}
        </div>
      )}
      {item.itemNotes && item.itemNotes.length > 0 && (
        <div className="text-xs mt-0.5" style={{ color: COLORS.primaryOrange }}>
          📝 {item.itemNotes.map(n => n.label).join(", ")}
        </div>
      )}
      <div className="flex items-center gap-1 mt-1 -ml-2">
        <button 
          onClick={() => onCustomize && onCustomize(item)}
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: COLORS.primaryGreen }}
          data-testid={`customize-btn-${item.id}`}
        >
          Customize
        </button>
        <button 
          className="px-2 py-1.5 text-xs hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap" 
          style={{ color: (item.itemNotes?.length > 0 || item.notes?.trim()) ? COLORS.primaryOrange : COLORS.grayText }}
          onClick={() => onAddNote(item, cartIndex)}
          data-testid={`add-note-btn-${item.id}`}
        >
          {(item.itemNotes?.length > 0 || item.notes?.trim()) ? "Edit Note" : "Add Note"}
        </button>
      </div>
    </div>
    {/* Qty controls */}
    <div className="flex items-center gap-0.5 pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
      {/* CR-010: Weight items use weight stepper with 50gm/ml step */}
      {item.isWeightItem ? (
        <>
          <button onClick={() => {
            const step = (item.itemUnit === 'Kg' || item.itemUnit === 'L') ? 0.05 : 50;
            const minVal = step;
            if (item.qty > minVal) updateQuantity(item.id, Math.round((item.qty - step) * 100) / 100);
          }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.grayText }} data-testid={`weight-minus-${item.id}`}>−</button>
          <span className="font-bold text-xs text-center min-w-[3rem] px-0.5" style={{ color: COLORS.primaryGreen }}>
            {item.qty < 1 && (item.itemUnit === 'Kg' || item.itemUnit === 'L')
              ? `${Math.round(item.qty * 1000)}${item.itemUnit === 'Kg' ? 'gm' : 'ml'}`
              : `${parseFloat((item.qty || 0).toFixed(2))}${item.itemUnit}`}
          </span>
          <button onClick={() => {
            const step = (item.itemUnit === 'Kg' || item.itemUnit === 'L') ? 0.05 : 50;
            updateQuantity(item.id, Math.round((item.qty + step) * 100) / 100);
          }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.primaryGreen }} data-testid={`weight-plus-${item.id}`}>+</button>
        </>
      ) : (
        <>
          <button onClick={() => { if (item.qty > 1) updateQuantity(item.id, item.qty - 1); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.grayText }} data-testid={`qty-minus-${item.id}`}>−</button>
          <input type="number" value={item.qty} min={1} onChange={(e) => { const val = parseInt(e.target.value); if (!isNaN(val) && val >= 1) updateQuantity(item.id, val); }} className="font-bold w-8 text-center bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style={{ color: COLORS.primaryGreen }} data-testid={`qty-input-${item.id}`} />
          <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.primaryGreen }} data-testid={`qty-plus-${item.id}`}>+</button>
        </>
      )}
    </div>
    <div className="w-20 text-right pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
      {/* CR-010: Weight items show total from unit_price × weight */}
      <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>
        ₹{(item.isWeightItem
          ? ((item.itemUnitPrice || item.price) * item.qty)
          : (item.totalPrice || (item.price * item.qty))
        ).toLocaleString(undefined, item.isWeightItem ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined)}
      </span>
    </div>
  </div>
);

// BUG-099 (May-2026): QSR Quick Billing inline section.
// Renders after Place Order when QSR mode is ON. Contains compact bill
// calculation, payment pills, and Collect Bill CTA. Uses same financial
// math as CollectPaymentPanel but with QSR exclusions.
const QsrBillingSection = ({
  cartItems, total, orderType, restaurant, qsrDiscountEnabled,
  deliveryCharge: dcProp, onDeliveryChargeChange,
  isPrepaid, isWebOrder, initialDeliveryCharge,
  isRoom, associatedOrders = [], roomInfo,
  onQsrCollectBill, onFullBilling, isPlacingOrder,
  hasPlacedItems = false,
  hasValidationErrors = false,
  placedOrderData = null,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState(null);
  const [discountValue, setDiscountValue] = useState('');
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  const [tipInput] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [cardTxnId, setCardTxnId] = useState('');
  const [qsrDeliveryCharge, setQsrDeliveryCharge] = useState(
    orderType === 'delivery' ? String(dcProp || '') : ''
  );
  const cashTouched = useRef(false);

  const discountTypes = restaurant?.discountTypes || [];
  const scPct = restaurant?.serviceChargePercentage || 0;
  const autoSC = !!restaurant?.autoServiceCharge;
  const scApplicable = (orderType === 'dineIn' || orderType === 'walkIn' || isRoom) && scPct > 0 && autoSC;
  const roundOffEnabled = restaurant?.totalRound !== false;
  const scTaxRate = (restaurant?.serviceChargeTaxPct || 0) / 100;
  const delTaxRate = (restaurant?.deliveryChargeGstPct || 0) / 100;

  // Payment methods from restaurant config + Hold (PayLater prepaid path)
  const enabledMethods = useMemo(() => {
    const methods = [];
    if (restaurant?.paymentMethods?.cash !== false) methods.push({ id: 'cash', label: 'Cash', Icon: Banknote });
    if (restaurant?.paymentMethods?.card !== false) methods.push({ id: 'card', label: 'Card', Icon: CreditCard });
    if (restaurant?.paymentMethods?.upi !== false) methods.push({ id: 'upi', label: 'UPI', Icon: Smartphone });
    methods.push({ id: 'paylater', label: 'Hold', Icon: Clock });
    return methods.length > 0 ? methods : [{ id: 'cash', label: 'Cash', Icon: Banknote }];
  }, [restaurant?.paymentMethods]);

  // Bill calculation — same formulas as CollectPaymentPanel
  const billableItems = useMemo(() =>
    (cartItems || []).filter(i => i.status !== 'cancelled' && !i.isCheckInMarker && !i.isComplementary && !i.isComplementaryRuntime),
    [cartItems]
  );

  const getItemLinePrice = (item) => {
    if (item.totalPrice) return item.totalPrice;
    const base = (item.price || 0) * (item.qty || 1);
    const addonSum = (item.addOns || []).reduce((s, a) => s + ((parseFloat(a.price) || 0) * (a.quantity || a.qty || 1)), 0);
    const varSum = (item.variation || []).reduce((s, group) => {
      const groupSum = Array.isArray(group.values)
        ? group.values.reduce((gs, val) => gs + (parseFloat(val.optionPrice) || 0), 0)
        : (parseFloat(group.price) || 0);
      return s + groupSum;
    }, 0);
    return base + ((addonSum + varSum) * (item.qty || 1));
  };

  const itemTotal = billableItems.reduce((sum, item) => sum + getItemLinePrice(item), 0);

  // CR-028: Items eligible for discount (excludes give_discount='No' items)
  const discountableTotal = useMemo(() =>
    billableItems.filter(i => i.giveDiscount !== false).reduce((sum, item) => sum + getItemLinePrice(item), 0),
    [billableItems]
  );

  // Tax
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
      if ((tax.type || 'GST').toUpperCase() === 'GST') {
        sgst += taxAmt / 2;
        cgst += taxAmt / 2;
      } else if ((tax.type || '').toUpperCase() === 'VAT') {
        vat += taxAmt;
      }
    });
    return { sgst: Math.round(sgst * 100) / 100, cgst: Math.round(cgst * 100) / 100, vat: Math.round(vat * 100) / 100 };
  }, [billableItems]);

  // Discount
  // CR-028: % discounts computed on discountableTotal (excludes give_discount='No' items)
  const presetDiscount = selectedDiscountType ? Math.round((discountableTotal * selectedDiscountType.discountPercent)) / 100 : 0;
  const manualDiscount = discountType === 'percent'
    ? Math.round((discountableTotal * parseFloat(discountValue || 0))) / 100
    : Math.min(parseFloat(discountValue || 0), discountableTotal);
  const totalDiscount = manualDiscount + presetDiscount;
  const subtotalAfterDiscount = Math.max(0, itemTotal - totalDiscount);

  // Delivery charge
  const deliveryCharge = orderType === 'delivery' ? (parseFloat(qsrDeliveryCharge) || 0) : 0;

  // Tip — always 0 in QSR mode
  const tip = 0;

  // Service charge (auto from profile)
  const serviceCharge = scApplicable ? Math.round(subtotalAfterDiscount * scPct / 100 * 100) / 100 : 0;

  // GST on components
  const discountRatio = itemTotal > 0 ? totalDiscount / itemTotal : 0;
  const itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio);
  const scGst = serviceCharge * scTaxRate;
  const tipGst = tip * scTaxRate;
  const deliveryGst = deliveryCharge * delTaxRate;
  const totalGst = itemGstPostDiscount + scGst + tipGst + deliveryGst;
  const sgst = Math.round((totalGst / 2) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const vatAmount = taxTotals.vat * (1 - discountRatio);

  const subtotal = Math.round((subtotalAfterDiscount + serviceCharge + tip + deliveryCharge) * 100) / 100;
  const rawFinalTotal = Math.round((subtotal + sgst + cgst + vatAmount) * 100) / 100;
  const finalTotal = rawFinalTotal > 0
    ? (roundOffEnabled ? Math.ceil(rawFinalTotal) : Math.round(rawFinalTotal * 100) / 100)
    : 0;
  const roundOff = Math.round((finalTotal - rawFinalTotal) * 100) / 100;

  const roomBalance = isRoom && roomInfo ? Math.max(0, roomInfo.balancePayment || 0) : 0;
  const associatedTotal = associatedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
  // POS3.1 BUG-111 (2026-05-27): on placed orders, prefer the server-authoritative
  // `total` prop (= orderFinancials.amount + deltas, computed at OrderEntry.jsx:788-792)
  // over the local recompute. Mirrors the Full Mode total branch upstream so QSR and
  // Full Mode display the same Grand Total when Full Mode applied discount/coupon/
  // loyalty/wallet. Unplaced orders keep local compute so the QSR Discount selector
  // remains interactive. See POS3_1_BUG_111_QSR_BILL_PARITY_PLAN_2026_05_27.md.
  const authoritativeTotal = hasPlacedItems ? total : finalTotal;
  const effectiveTotal = authoritativeTotal + (isRoom ? associatedTotal : 0) + roomBalance;

  // Auto-fill cash
  useEffect(() => {
    if (paymentMethod === 'cash' && effectiveTotal > 0 && !cashTouched.current) {
      setCashReceived(String(effectiveTotal));
    }
  }, [effectiveTotal, paymentMethod]);

  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - effectiveTotal) : 0;

  const handleCollectBill = () => {
    if (!onQsrCollectBill) return;
    const paymentData = {
      method: paymentMethod,
      finalTotal: effectiveTotal,
      roundOff,            // CR-029 G2 (Gate 3): QSR parity with CollectPaymentPanel — food-only round-off ₹.
      roomBalance,
      sgst, cgst,
      vatAmount: Math.round(vatAmount * 100) / 100,
      transactionId: paymentMethod === 'card' ? cardTxnId : '',
      tip,
      splitPayments: null,
      tabContact: null,
      discounts: {
        manual: manualDiscount,
        preset: presetDiscount,
        total: totalDiscount,
        orderDiscountPercent: discountType === 'percent' ? parseFloat(discountValue || 0) : 0,
        presetDiscountPercent: selectedDiscountType?.discountPercent || 0,
        couponDiscount: 0,
        couponCode: '',
        couponTitle: '',
        couponType: '',
        // CR-029 G3 + BUG-114 parity (QSR, Gate 3 2026-06-12): mirror Full Mode
        // (CollectPaymentPanel.jsx:1064-1071). QSR exposes preset/category-discount
        // picker; payload must carry category identity for reporting joins.
        // Owner decision 2026-06-12: mirror Full Mode for reporting parity.
        discountType: selectedDiscountType
                        ? selectedDiscountType.name
                        : (discountType || ''),
        orderDiscountType: selectedDiscountType
                        ? 'Percent'
                        : (discountType === 'percent' ? 'Percent'
                        :  discountType === 'flat'    ? 'Amount' : ''),
        discountMemberCategoryId:   selectedDiscountType?.id || 0,
        discountMemberCategoryName: selectedDiscountType?.name || '',
        loyaltyPoints: 0,
        loyaltyPointsRedeemed: 0,
        loyaltyRedemptionId: null,
        walletBalance: 0,
      },
      customer: null,
      itemTotal,
      subtotal,
      serviceCharge,
      deliveryCharge,
      printGstTax: Math.round((sgst + cgst) * 100) / 100,
      printVatTax: Math.round(vatAmount * 100) / 100,
      serviceGstTaxAmount: Math.round(scGst * 100) / 100,
      tipTaxAmount: Math.round(tipGst * 100) / 100,
      deliveryGstAmount: Math.round(deliveryGst * 100) / 100,
    };
    onQsrCollectBill(paymentData);
  };

  return (
    <div style={{ borderTop: `2px solid ${COLORS.primaryGreen}` }} data-testid="qsr-billing-section">
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.primaryGreen }}>QSR Billing</span>
      </div>

      <div className="px-4 py-2 space-y-1.5 text-xs">
        {/* Discount — editable if QSR Discount toggle ON */}
        {qsrDiscountEnabled && (
          <div className="flex items-center justify-between gap-2 pb-1.5" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
            <span style={{ color: COLORS.darkText }} className="font-medium">Discount</span>
            <div className="flex gap-1.5 items-center">
              <select
                value={selectedDiscountType ? `preset_${selectedDiscountType.id}` : (discountType || "")}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') { setDiscountType(null); setDiscountValue(""); setSelectedDiscountType(null); }
                  else if (val === 'percent' || val === 'flat') { setDiscountType(val); setSelectedDiscountType(null); }
                  else if (val.startsWith('preset_')) {
                    const found = discountTypes.find(dt => String(dt.id) === val.replace('preset_', ''));
                    setSelectedDiscountType(found || null);
                    setDiscountType(null); setDiscountValue("");
                  }
                }}
                className="px-1.5 py-1 rounded border text-xs outline-none"
                style={{ borderColor: COLORS.borderGray, minWidth: "60px" }}
                data-testid="qsr-discount-type-select"
              >
                <option value="">None</option>
                <option value="percent">%</option>
                <option value="flat">₹</option>
                {discountTypes.map((dt) => (
                  <option key={dt.id} value={`preset_${dt.id}`}>{dt.name} — {dt.discountPercent}%</option>
                ))}
              </select>
              {discountType && !selectedDiscountType && (
                <input type="number" placeholder={discountType === 'percent' ? "%" : "₹"} value={discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (e.target.value === '' || e.target.value === '-') { setDiscountValue(''); return; }
                    if (val < 0) { setDiscountValue(''); return; }
                    if (discountType === 'percent' && val > 100) { setDiscountValue('100'); return; }
                    setDiscountValue(e.target.value);
                  }}
                  className="w-14 px-1.5 py-1 rounded border text-xs outline-none text-right"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="qsr-discount-value-input"
                />
              )}
              {totalDiscount > 0 && <span className="font-medium" style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toFixed(2)}</span>}
            </div>
          </div>
        )}

        {/* Delivery Charge — editable for delivery orders */}
        {orderType === 'delivery' && (
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: COLORS.darkText }} className="font-medium">Delivery</span>
            <div className="flex items-center gap-1">
              <span style={{ color: COLORS.grayText }}>₹</span>
              <input type="number" value={qsrDeliveryCharge} placeholder="0"
                onChange={(e) => {
                  setQsrDeliveryCharge(e.target.value);
                  if (onDeliveryChargeChange) onDeliveryChargeChange(parseFloat(e.target.value) || 0);
                }}
                readOnly={isPrepaid || (isWebOrder && initialDeliveryCharge > 0)}
                className={`w-16 px-1.5 py-1 rounded border text-xs outline-none text-right ${(isPrepaid || (isWebOrder && initialDeliveryCharge > 0)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                style={{ borderColor: COLORS.borderGray }}
                data-testid="qsr-delivery-charge-input"
              />
            </div>
          </div>
        )}


        {/* Bill summary rows — POS3.1 BUG-111 Phase 2 (2026-05-27):
            3 states: (A) placed + server data available → server-derived breakdown,
            (B) placed + no server data yet → hidden (Phase 1 behaviour),
            (C) unplaced → local compute (unchanged).
            Gate: subtotalAmount > 0 proves socket carried financial breakdown.
            Discount = single aggregated row derived from existing fields.
            Owner directive: "loyalty coupon and other discounts all shd club in single discount for qsr view". */}
        {hasPlacedItems && placedOrderData && (placedOrderData.subtotalAmount || 0) > 0 ? (
        <div className="pt-1.5 space-y-1" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
          <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Item Total</span><span style={{ color: COLORS.darkText }}>₹{(placedOrderData.subtotalAmount || 0).toLocaleString()}</span></div>
          {(() => { const d = (placedOrderData.subtotalAmount || 0) - (placedOrderData.subtotalBeforeTax || 0) + (placedOrderData.serviceTax || 0) + (placedOrderData.tipAmount || 0) + (placedOrderData.deliveryCharge || 0); return d > 0 ? <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Discount</span><span style={{ color: COLORS.primaryGreen }}>-₹{d.toFixed(2)}</span></div> : null; })()}
          {(placedOrderData.subtotalBeforeTax || 0) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Subtotal</span><span style={{ color: COLORS.darkText }}>₹{(placedOrderData.subtotalBeforeTax || 0).toLocaleString()}</span></div>}
          {(placedOrderData.serviceTax || 0) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Service Charge</span><span style={{ color: COLORS.darkText }}>₹{(placedOrderData.serviceTax || 0).toFixed(2)}</span></div>}
          {(placedOrderData.deliveryCharge || 0) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Delivery</span><span style={{ color: COLORS.darkText }}>₹{(placedOrderData.deliveryCharge || 0).toFixed(2)}</span></div>}
          {(placedOrderData.tipAmount || 0) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Tip</span><span style={{ color: COLORS.darkText }}>₹{(placedOrderData.tipAmount || 0).toFixed(2)}</span></div>}
          {(() => { const tax = (placedOrderData.amount || 0) - (placedOrderData.subtotalBeforeTax || 0); return tax > 0 ? <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Tax</span><span style={{ color: COLORS.darkText }}>₹{tax.toFixed(2)}</span></div> : null; })()}
        </div>
        ) : !hasPlacedItems ? (
        <div className="pt-1.5 space-y-1" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
          <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Item Total</span><span style={{ color: COLORS.darkText }}>₹{itemTotal.toLocaleString()}</span></div>
          {totalDiscount > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Discount</span><span style={{ color: COLORS.primaryGreen }}>-₹{totalDiscount.toFixed(2)}</span></div>}
          {serviceCharge > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Service Charge ({scPct}%)</span><span style={{ color: COLORS.darkText }}>₹{serviceCharge.toFixed(2)}</span></div>}
          {deliveryCharge > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Delivery</span><span style={{ color: COLORS.darkText }}>₹{deliveryCharge.toFixed(2)}</span></div>}
          {(sgst + cgst) > 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Tax (GST)</span><span style={{ color: COLORS.darkText }}>₹{(sgst + cgst).toFixed(2)}</span></div>}
          {vatAmount > 0.01 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>VAT</span><span style={{ color: COLORS.darkText }}>₹{vatAmount.toFixed(2)}</span></div>}
          {roundOff !== 0 && <div className="flex justify-between"><span style={{ color: COLORS.grayText }}>Round-off</span><span style={{ color: COLORS.darkText }}>₹{roundOff.toFixed(2)}</span></div>}
        </div>
        ) : null}

        {/* Grand Total */}
        <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: `1px solid ${COLORS.darkText}` }}>
          <span style={{ color: COLORS.darkText }}>Grand Total</span>
          <span style={{ color: COLORS.primaryOrange, fontSize: '14px' }}>₹{effectiveTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Pills */}
      <div className="px-4 py-2">
        <div className="flex gap-2">
          {enabledMethods.map(({ id, label, Icon }) => {
            const isSelected = paymentMethod === id;
            return (
              <button key={id}
                onClick={() => { setPaymentMethod(id); cashTouched.current = false; setCashReceived(String(effectiveTotal)); }}
                className="flex-1 py-2.5 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors"
                style={{ borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray, backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : 'white' }}
                data-testid={`qsr-payment-${id}-btn`}
              >
                <Icon className="w-4 h-4" style={{ color: isSelected ? COLORS.primaryGreen : COLORS.grayText }} />
                <span className="text-xs" style={{ color: isSelected ? COLORS.primaryGreen : COLORS.darkText }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Cash: auto-filled, editable — hidden for Hold */}
        {paymentMethod === 'cash' && (
          <div className="mt-2">
            <div className="text-xs mb-1" style={{ color: COLORS.grayText }}>Cash Received</div>
            <input type="number" value={cashReceived}
              onChange={(e) => { cashTouched.current = true; setCashReceived(e.target.value); }}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: cashReceived && parseFloat(cashReceived) < effectiveTotal ? '#ef4444' : COLORS.borderGray,
                       backgroundColor: cashReceived && parseFloat(cashReceived) < effectiveTotal ? '#fef2f2' : 'white' }}
              data-testid="qsr-cash-received-input"
            />
            {change > 0 && (
              <div className="mt-1 text-center py-1 rounded" style={{ backgroundColor: COLORS.lightBg }}>
                <span className="text-xs" style={{ color: COLORS.grayText }}>Change: </span>
                <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }}>₹{change.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Card: optional TXN ID — hidden for Hold */}
        {paymentMethod === 'card' && (
          <div className="mt-2">
            <div className="text-xs mb-1" style={{ color: COLORS.grayText }}>TXN ID (optional)</div>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="_ _ _ _"
              value={cardTxnId} onChange={(e) => setCardTxnId(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none tracking-widest text-center"
              style={{ borderColor: COLORS.borderGray }}
              data-testid="qsr-card-txn-input"
            />
          </div>
        )}
      </div>

      {/* Collect Bill CTA + Full Billing link */}
      {/* POS3.1 BUG-110 (2026-05-27, M-B): when QSR order is paid prepaid AND
          has placed items, hide BOTH the Pay button and Full Billing link.
          Matches Full Mode L1272 / L1293 prepaid-lock pattern. */}
      {!(isPrepaid && hasPlacedItems) && (
      <div className="p-4" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
        <button
          onClick={handleCollectBill}
          disabled={
            isPlacingOrder ||
            hasValidationErrors ||
            (paymentMethod === 'cash' && cashReceived && parseFloat(cashReceived) < effectiveTotal)
          }
          className="w-full py-3 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: COLORS.primaryGreen }}
          data-testid="qsr-collect-bill-btn"
        >
          {isPlacingOrder ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
          ) : paymentMethod === 'paylater' ? (
            <>{hasPlacedItems ? 'Hold' : 'Place & Hold'} ₹{effectiveTotal.toLocaleString()}</>
          ) : (
            <>{hasPlacedItems ? 'Pay' : 'Place & Pay'} ₹{effectiveTotal.toLocaleString()}</>
          )}
        </button>
        {onFullBilling && (
          <button
            onClick={onFullBilling}
            className="w-full mt-2 text-xs text-center py-1"
            style={{ color: COLORS.grayText }}
            data-testid="qsr-full-billing-link"
          >
            Full Billing →
          </button>
        )}
      </div>
      )}
    </div>
  );
};

const CartPanel = ({
  cartItems,
  total,
  editingQtyItemId,
  setEditingQtyItemId,
  updateQuantity,
  setCancelItem,
  setTransferItem,
  handlePlaceOrder,
  isPlacingOrder = false,
  hasPlacedItems = false,
  setShowPaymentPanel,
  onAddNote,
  onCustomize,
  customer,
  onCustomerChange,
  onClearCart,
  onDeleteItem,
  isRoom,
  associatedOrders = [],
  roomInfo = null, // ROOM_CHECKIN_GAP3 (Stage 2 follow-up, 2026-04-25): room booking financials for the flat Room indicator pill + Checkout button amount.
  orderNotes = [],
  onEditOrderNotes,
  canCancelItem = true,
  canFoodTransfer = true,
  canBill = true,
  canPrintBill = true,
  isItemCancelAllowed,
  orderType,
  walkInTableName = "",
  onWalkInTableNameChange,
  orderId = null,
  isPrepaid = false,
  isServed = false,
  hasUnplacedItems = false,
  selectedAddress = null,
  onAddressClick,
  // CR-008 / Bucket D1-Cap (May-2026, delivery-charge capture): per-order delivery
  // charge owned by OrderEntry. Editable via the row below items; also flows into
  // the Collect Bill button total (delivery orders only).
  deliveryCharge = 0,
  onDeliveryChargeChange,
  // POS2-002 Phase 2 EXTENSION (2026-05-15): inline delivery-charge row inherits
  // the same lock predicate as CollectPaymentPanel.jsx:974 so web/scan orders
  // with a pre-captured delivery charge cannot be edited from the Order Entry
  // surface either. Predicate kept byte-identical: `isPrepaid || (isWebOrder &&
  // initialDeliveryCharge > 0)`. Defaults preserve today's behaviour for any
  // legacy caller that hasn't been updated to pass the new props.
  isWebOrder = false,
  initialDeliveryCharge = 0,
  // BUG-3B/3C (Apr-2026): printAllKOT / printAllBill owned by OrderEntry; passed
  // through to KotBillCheckboxes which is now a controlled component.
  printAllKOT,
  setPrintAllKOT,
  printAllBill,
  setPrintAllBill,
  // BUG-099 (May-2026): QSR Quick Billing mode
  qsrMode = false,
  qsrDiscountEnabled = false,
  onQsrCollectBill,
  restaurant = null,
  onFullBilling,
  placedOrderData = null,
  // CR-018: Schedule Order
  isScheduled = false,
  setIsScheduled,
  scheduleAt = null,
  setScheduleAt,
}) => {
  const { enableDynamicTables } = useSettings();
  // ROOM_CHECKIN_FIX_V2: synthetic "Check In" marker must never be counted,
  // rendered, or gate any cart-screen action (see ROOM_CHECKIN_UPDATE_ORDER_FIX_V2.md).
  const visibleCartItems = cartItems.filter(i => !i.isCheckInMarker);
  const newItemCount = cartItems.filter(i => !i.placed && !i.isCheckInMarker).length;
  // ROOM_CHECKIN_GAP2 (Step B): marker-only room (checked-in with no real food items)
  // must remain checkoutable. Used to bypass the `visibleCartItems.length === 0`
  // and `hasPlacedItems && !isServed` disable gates below. Covers both Case A
  // (₹0 pure checkout) and Case B (marker + transferred associated orders).
  // See /app/memory/ROOM_CHECKIN_NEXT_AGENT_GAPS_VALIDATED_HANDOVER.md.
  const hasCheckInMarker = cartItems.some(i => i.isCheckInMarker);
  const isMarkerOnlyRoom = isRoom && hasCheckInMarker && visibleCartItems.length === 0;

  // Validation: required fields per order type
  const isNameRequired = orderType === 'takeAway' || orderType === 'delivery';
  const isPhoneRequired = orderType === 'delivery';
  const isAddressRequired = orderType === 'delivery';

  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredByName, setFilteredByName] = useState([]);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false); // Track if customer was selected from suggestions

  // Check if required fields are missing (for button disable + visual hints)
  const nameMissing = isNameRequired && !customerName.trim();
  const phoneMissing = isPhoneRequired && customerPhone.replace(/\D/g, '').length !== 10;
  const addressMissing = isAddressRequired && !selectedAddress;
  const hasValidationErrors = nameMissing || phoneMissing || addressMissing;
  // ROOM_CHECKIN_GAP3 (2026-04-25): showAssociatedOrders state previously
  // gated the cart-level Transferred Orders expansion. The pill was flattened
  // to amount-only (no chevron); state hook removed.
  const phoneInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Associated orders total
  const associatedTotal = useMemo(() =>
    associatedOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    [associatedOrders]
  );

  // Sync with customer prop
  useEffect(() => {
    if (customer) {
      setCustomerName(customer.name || "");
      setCustomerPhone(customer.phone || "");
      setIsCustomerSelected(!!(customer.id || (customer.name && customer.phone)));
    }
  }, [customer]);

  // Filter customers based on phone search — async API call
  // CHG-036: Now calls customerService.searchByPhone() with graceful fallback
  useEffect(() => {
    if (isCustomerSelected) {
      setFilteredCustomers([]);
      setShowPhoneSuggestions(false);
      return;
    }
    if (customerPhone.trim() && customerPhone.length >= 3) {
      searchCustomers(customerPhone).then(filtered => {
        setFilteredCustomers(filtered);
        setShowPhoneSuggestions(filtered.length > 0);
      });
    } else {
      setFilteredCustomers([]);
      setShowPhoneSuggestions(false);
    }
  }, [customerPhone, isCustomerSelected]);

  // Filter customers based on name search — async API call
  useEffect(() => {
    if (isCustomerSelected) {
      setFilteredByName([]);
      setShowNameSuggestions(false);
      return;
    }
    if (customerName.trim() && customerName.length >= 2) {
      searchCustomers(customerName).then(filtered => {
        setFilteredByName(filtered);
        setShowNameSuggestions(filtered.length > 0);
      });
    } else {
      setFilteredByName([]);
      setShowNameSuggestions(false);
    }
  }, [customerName, isCustomerSelected]);

  // Close suggestions on outside click (but not when clicking suggestions)
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Check if clicking on a suggestion button - if so, don't close
      if (e.target.closest('[data-suggestion="true"]')) {
        return;
      }
      if (phoneInputRef.current && !phoneInputRef.current.contains(e.target)) {
        setShowPhoneSuggestions(false);
      }
      if (nameInputRef.current && !nameInputRef.current.contains(e.target)) {
        setShowNameSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Select customer from suggestions (from phone or name)
  const selectCustomer = (c) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setShowPhoneSuggestions(false);
    setShowNameSuggestions(false);
    setIsCustomerSelected(true);
    // BUG-108 Phase B: pass CRM loyalty/wallet data so CollectPaymentPanel can display preview
    onCustomerChange?.({ id: c.id, name: c.name, phone: c.phone, tier: c.tier, totalPoints: c.totalPoints, pointsValue: c.pointsValue, walletBalance: c.walletBalance, loyalty: c.loyalty });
  };

  // Handle name change - if customer was selected and name is cleared, clear phone too
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setCustomerName(newName);
    
    // If name is cleared and a customer was previously selected, clear phone too
    if (!newName.trim() && isCustomerSelected) {
      setCustomerPhone("");
      setIsCustomerSelected(false);
      onCustomerChange?.(null);
    }
  };

  // Handle phone change - if customer was selected and phone is cleared, clear name too
  const handlePhoneChange = (e) => {
    const newPhone = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(newPhone);
    
    // If phone is cleared and a customer was previously selected, clear name too
    if (!newPhone.trim() && isCustomerSelected) {
      setCustomerName("");
      setIsCustomerSelected(false);
      onCustomerChange?.(null);
    }
  };

  // Handle field blur - update customer (no delay needed with onMouseDown)
  // BUG-108 Loyalty Pipeline Fix (2026-05-23): merge with existing `customer`
  // prop instead of overwriting it. Previously this branch shipped only
  // `{ id, name, phone }`, which clobbered the loyalty/tier/totalPoints/
  // pointsValue/loyalty blob established by `selectCustomer` on any subsequent
  // focus loss (e.g. when the cashier clicked the menu or Place Order). The
  // merge preserves enrichment while still propagating user edits to name/phone.
  //
  // CR-002 Fix (2026-05-27): when phone is a valid 10-digit number and
  // customer.id is not yet set, auto-lookup the CRM customer so
  // useCustomerIntel can fetch notes/suggestions. Without this, typing a
  // phone without selecting from the dropdown leaves customer.id null and
  // the intel hook never fires.
  const handleFieldBlur = () => {
    if (customerName.trim() || customerPhone.trim()) {
      const merged = {
        ...(customer || {}),
        id: customer?.id ?? null,
        name: customerName.trim(),
        phone: customerPhone.trim(),
      };
      onCustomerChange?.(merged);

      // Auto-enrich: if 10-digit phone and no CRM id yet, lookup customer
      const phone10 = customerPhone.replace(/\D/g, '');
      if (phone10.length === 10 && !merged.id) {
        lookupCustomer(phone10)
          .then((enriched) => {
            if (!enriched?.id) return;
            onCustomerChange?.({
              ...merged,
              id:            enriched.id,
              name:          enriched.name || merged.name,
              phone:         enriched.phone || merged.phone,
              tier:          enriched.tier,
              totalPoints:   enriched.totalPoints,
              pointsValue:   enriched.pointsValue,
              walletBalance: enriched.walletBalance,
              loyalty:       enriched.loyalty,
            });
          })
          .catch(() => {
            // Silent: CRM lookup failure is non-blocking
          });
      }
    }
  };

  return (
    <>
      {/* Walk-In Table Name Field */}
      {/* Dynamic Table Name - Only shown for walk-in orders AND when enabled in settings */}
      {orderType === "walkIn" && enableDynamicTables && (
        <div 
          className="px-3 py-3"
          style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
        >
          <div className="relative">
            <LayoutGrid className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: COLORS.primaryOrange }} />
            <input
              type="text"
              placeholder="Table name (e.g., Patio 1, Garden)"
              value={walkInTableName}
              onChange={(e) => onWalkInTableNameChange?.(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border-2 focus:outline-none focus:ring-2"
              style={{ 
                borderColor: COLORS.primaryOrange,
                fontSize: "13px",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(249, 115, 22, 0.15)"
              }}
              data-testid="walkin-table-name"
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: COLORS.grayText }}>
            Optional: If empty, customer name will be used as table label
          </p>
        </div>
      )}

      {/* Quick Customer Fields */}
      <div 
        className="px-3 py-4 grid grid-cols-2 gap-3"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="relative" ref={nameInputRef}>
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: nameMissing ? '#ef4444' : COLORS.grayText }} />
          <input
            type="text"
            placeholder={isNameRequired ? "Customer name *" : "Customer name"}
            value={customerName}
            onChange={handleNameChange}
            onBlur={handleFieldBlur}
            onFocus={() => !isRoom && customerName.length >= 2 && setShowNameSuggestions(filteredByName.length > 0)}
            readOnly={isRoom}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
            style={{ 
              borderColor: nameMissing ? '#ef4444' : COLORS.borderGray, 
              fontSize: "13px",
              backgroundColor: isRoom ? '#f3f4f6' : (nameMissing ? '#fef2f2' : "#f9fafb"),
              boxShadow: nameMissing ? "0 1px 3px rgba(239,68,68,0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
              cursor: isRoom ? 'not-allowed' : 'text',
            }}
            data-testid="quick-customer-name"
          />
          {/* Name Auto-suggest */}
          {showNameSuggestions && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden max-h-40 overflow-y-auto"
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
              data-testid="name-suggestions-dropdown"
            >
              {filteredByName.map((c) => (
                <button
                  key={c.id}
                  data-suggestion="true"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur from firing
                    selectCustomer(c);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid={`name-suggestion-${c.id}`}
                >
                  <div className="font-medium" style={{ color: COLORS.darkText, fontSize: "12px" }}>{c.name}</div>
                  <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={phoneInputRef}>
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: phoneMissing ? '#ef4444' : COLORS.grayText }} />
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder={isPhoneRequired ? "Phone number * (10 digits)" : "Phone number"}
            value={customerPhone}
            onChange={handlePhoneChange}
            onBlur={handleFieldBlur}
            onFocus={() => !isRoom && customerPhone.length >= 3 && setShowPhoneSuggestions(filteredCustomers.length > 0)}
            readOnly={isRoom}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:ring-2"
            style={{ 
              borderColor: phoneMissing ? '#ef4444' : COLORS.borderGray, 
              fontSize: "13px",
              backgroundColor: isRoom ? '#f3f4f6' : (phoneMissing ? '#fef2f2' : "#f9fafb"),
              boxShadow: phoneMissing ? "0 1px 3px rgba(239,68,68,0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
              cursor: isRoom ? 'not-allowed' : 'text',
            }}
            data-testid="quick-customer-phone"
          />
          {/* Phone Auto-suggest */}
          {showPhoneSuggestions && (
            <div
              className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 overflow-hidden max-h-40 overflow-y-auto"
              style={{ backgroundColor: "white", border: `1px solid ${COLORS.borderGray}` }}
            >
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  data-suggestion="true"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur from firing
                    selectCustomer(c);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                  style={{ borderColor: COLORS.borderGray }}
                >
                  <div className="font-medium" style={{ color: COLORS.darkText, fontSize: "12px" }}>{c.name}</div>
                  <div className="text-xs" style={{ color: COLORS.grayText }}>{c.phone}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Address Strip — only for delivery orders */}
      {orderType === "delivery" && (
        <button
          onClick={onAddressClick}
          className="w-full px-3 py-2.5 flex items-start gap-2 text-left transition-colors hover:bg-gray-50"
          style={{ 
            borderBottom: `1px solid ${COLORS.borderGray}`,
            backgroundColor: addressMissing ? '#fef2f2' : 'transparent',
          }}
          data-testid="delivery-address-strip"
        >
          <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: selectedAddress ? COLORS.primaryGreen : addressMissing ? '#ef4444' : COLORS.primaryOrange }} />
          {selectedAddress ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: COLORS.darkText }}>{selectedAddress.addressType || 'Address'}</span>
                {selectedAddress.isDefault && (
                  <span className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: `${COLORS.primaryGreen}20`, color: COLORS.primaryGreen }}>Default</span>
                )}
              </div>
              {/* BUG-278: show FULL address (no truncation).
                  CRM `address` field is already the formatted "street, city, state, pincode, country"
                  string, so we don't re-append city/state/pincode (would duplicate). `house` is a
                  separate line (e.g., "Flat 12B" / "my first address"). */}
              <p className="text-xs break-words whitespace-normal" style={{ color: COLORS.darkText }}>
                {[selectedAddress.house, selectedAddress.address].filter(Boolean).join(' · ')}
                {!selectedAddress.address && selectedAddress.pincode ? ` · ${selectedAddress.pincode}` : ''}
              </p>
              {selectedAddress.contactPersonName && (
                <p className="text-[11px] mt-0.5" style={{ color: COLORS.grayText }}>
                  Contact: {selectedAddress.contactPersonName}
                  {selectedAddress.contactPersonNumber ? ` · ${selectedAddress.contactPersonNumber}` : ''}
                </p>
              )}
              {selectedAddress.deliveryInstructions && (
                <p className="text-[11px] mt-0.5 italic" style={{ color: COLORS.primaryOrange }}>
                  {selectedAddress.deliveryInstructions}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs flex-1" style={{ color: addressMissing ? '#ef4444' : COLORS.primaryOrange }}>
              Tap to select delivery address *
            </span>
          )}
          {/* BUG-278: explicit Change affordance for address re-selection */}
          <span
            className="flex items-center gap-0.5 flex-shrink-0 text-[11px] font-semibold mt-0.5"
            style={{ color: COLORS.primaryOrange }}
            data-testid="delivery-address-change"
          >
            {selectedAddress ? 'Change' : ''}
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </button>
      )}

      {/* Column Headers */}
      <div className="px-4 py-2 flex items-center text-xs font-medium" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
        <span className="flex-1">Items</span>
        <span className="w-16 text-center" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Qty</span>
        <span className="w-20 text-right" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Price</span>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {visibleCartItems.length === 0 ? (
          <div className="p-8 text-center" style={{ color: COLORS.grayText }}>
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No items in order</p>
            <p className="text-sm mt-1">Tap menu items to add</p>
          </div>
        ) : (
          visibleCartItems.map((item, index) => {
            // BUG-237: Hide delta items — their qty is shown on the placed item row
            if (item._deltaForId && !item.placed) return null;

            const prevItem = index > 0 ? visibleCartItems[index - 1] : null;
            const showKotSeparator = prevItem && prevItem.placed && !item.placed && !item._deltaForId;

            return (
              <div key={`${item.id}-${index}`}>
                {showKotSeparator && canPrintBill && (
                  <div className="px-4 py-2" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
                    <RePrintOnlyButton orderId={orderId} cartItems={cartItems} />
                  </div>
                )}
                {item.placed ? (
                  <PlacedItemRow
                    item={item}
                    displayQty={item.qty + (cartItems.find(d => d._deltaForId === item.id && !d.placed)?.qty || 0)}
                    setCancelItem={setCancelItem}
                    setTransferItem={setTransferItem}
                    editingQtyItemId={editingQtyItemId}
                    setEditingQtyItemId={setEditingQtyItemId}
                    updateQuantity={updateQuantity}
                    canCancelItem={canCancelItem}
                    canFoodTransfer={canFoodTransfer && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid}
                    isItemCancelAllowed={isItemCancelAllowed}
                  />
                ) : (
                  <div style={{ opacity: isPlacingOrder ? 0.5 : 1, pointerEvents: isPlacingOrder ? 'none' : 'auto' }}>
                    <NewItemRow
                      item={item}
                      cartIndex={index}
                      onDeleteItem={onDeleteItem}
                      updateQuantity={updateQuantity}
                      onAddNote={onAddNote}
                      onCustomize={onCustomize}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Re-Print at end of placed items - ONLY if there are placed items and NO new items after */}
        {canPrintBill && cartItems.some(i => i.placed && !i.isCheckInMarker) && !cartItems.some(i => !i.placed) && (
          <div className="px-4 py-3">
            <RePrintOnlyButton orderId={orderId} cartItems={cartItems} />
          </div>
        )}

        {/* KOT/Bill checkboxes - ONLY if there are new (unplaced) items */}
        {/* BUG-099: hidden in QSR mode — KOT/Bill auto-handled from profile */}
        {!qsrMode && cartItems.some(i => !i.placed) && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
            <KotBillCheckboxes
              printAllKOT={printAllKOT}
              setPrintAllKOT={setPrintAllKOT}
              printAllBill={printAllBill}
              setPrintAllBill={setPrintAllBill}
            />
          </div>
        )}

        {/* CR-018: Schedule Order checkbox + date/time picker.
            Visible: unplaced items exist + not QSR + not dineIn (with table) + not room. */}
        {!qsrMode && cartItems.some(i => !i.placed) && orderType !== 'dineIn' && !isRoom && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
            <label className="flex items-center gap-2 cursor-pointer" data-testid="schedule-order-checkbox">
              <input
                type="checkbox"
                checked={!!isScheduled}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (setIsScheduled) setIsScheduled(checked);
                  if (!checked && setScheduleAt) setScheduleAt(null);
                }}
                disabled={hasPlacedItems}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                style={{ accentColor: '#1976D2' }}
              />
              <Clock className="w-3.5 h-3.5" style={{ color: isScheduled ? '#1976D2' : COLORS.grayText }} />
              <span className="text-sm font-medium" style={{ color: COLORS.darkText }}>Schedule Order</span>
            </label>

            {/* Expandable date/time picker — visible when checkbox is checked */}
            {isScheduled && (
              <div className="mt-2 flex items-center gap-2" data-testid="schedule-datetime-picker">
                <input
                  type="date"
                  data-testid="schedule-date-input"
                  value={scheduleAt ? scheduleAt.split(' ')[0] : ''}
                  min={new Date().toISOString().split('T')[0]}
                  max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; })()}
                  onChange={(e) => {
                    const date = e.target.value;
                    const time = scheduleAt ? scheduleAt.split(' ')[1] : '';
                    if (setScheduleAt) {
                      if (date && time) setScheduleAt(`${date} ${time}`);
                      else if (date) setScheduleAt(date);
                    }
                  }}
                  disabled={hasPlacedItems}
                  className="flex-1 px-2 py-1.5 text-sm border rounded"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                />
                <select
                  data-testid="schedule-time-select"
                  value={scheduleAt ? scheduleAt.split(' ')[1] || '' : ''}
                  onChange={(e) => {
                    const time = e.target.value;
                    const date = scheduleAt ? scheduleAt.split(' ')[0] : new Date().toISOString().split('T')[0];
                    if (setScheduleAt && date && time) setScheduleAt(`${date} ${time}`);
                  }}
                  disabled={hasPlacedItems}
                  className="px-2 py-1.5 text-sm border rounded"
                  style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                >
                  <option value="">Time</option>
                  {generateTimeSlots().map(slot => (
                    <option key={slot} value={slot}>{slot.slice(0, 5)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Read-only display for already-placed scheduled orders */}
            {hasPlacedItems && isScheduled && scheduleAt && (
              <p className="mt-1 text-xs" style={{ color: COLORS.grayText }}>
                Scheduled for: {scheduleAt}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CR-008 / Bucket D1-Cap (May-2026, delivery-charge capture): editable
          per-order delivery-charge row below items. Visible for delivery orders
          only. Same flat treatment as Transferred Orders / Room rows. Value is
          owned by OrderEntry and flows into placeOrder / updateOrder payloads and
          the Collect Bill button total below. */}
      {orderType === 'delivery' && (() => {
        // POS2-002 Phase 2 EXTENSION (2026-05-15): byte-identical predicate to
        // CollectPaymentPanel.jsx:974 — web/scan orders with a pre-captured DC
        // are locked; non-web or DC=0/missing remain editable (D1-Cap parity).
        const deliveryLocked = isPrepaid || (isWebOrder && initialDeliveryCharge > 0);
        const lockedTitle = isPrepaid
          ? (initialDeliveryCharge > 0
              ? 'Delivery charge already collected from customer — not editable'
              : 'Order is prepaid — delivery charge cannot be modified')
          : (isWebOrder && initialDeliveryCharge > 0
              ? 'Delivery charge captured from web order — not editable'
              : 'Enter or edit delivery charge');
        return (
        <div
          style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
          className="px-4 py-2.5 flex items-center justify-between"
          data-testid="cart-delivery-charge-row"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MapPin className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
              Delivery Charge
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs" style={{ color: COLORS.grayText }}>₹</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={deliveryCharge || ''}
              placeholder="0"
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (onDeliveryChargeChange) onDeliveryChargeChange(isNaN(v) ? 0 : v);
              }}
              readOnly={deliveryLocked}
              title={lockedTitle}
              className={`w-20 px-2 py-1 text-xs text-right rounded border focus:outline-none focus:ring-2 ${deliveryLocked ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="cart-delivery-charge-input"
            />
          </div>
        </div>
        );
      })()}

      {/* Associated Orders — flat row showing transferred-orders total
          (rooms only). User decision 2026-04-25: no expansion / chevron on
          the Order Entry screen, just amount indication. Detail expansion
          remains on the Collect Bill screen. */}
      {isRoom && associatedOrders.length > 0 && (
        <div
          style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
          className="px-4 py-2.5 flex items-center justify-between"
          data-testid="associated-orders-section"
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
              Transferred Orders ({associatedOrders.length})
            </span>
          </div>
          <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }}>
            ₹{associatedTotal.toLocaleString()}
          </span>
        </div>
      )}

      {/* ROOM_CHECKIN_GAP3 (Stage 2 follow-up, 2026-04-25): Room booking
          balance — flat indicator below Transferred Orders on the Order
          Entry screen. Same flat treatment as Transferred Orders (no
          chevron, no expansion). Detailed breakdown is on the Collect Bill
          screen only. Renders only for rooms with a hydrated room_info. */}
      {isRoom && roomInfo && (
        <div
          style={{ borderTop: `1px solid ${COLORS.borderGray}` }}
          className="px-4 py-2.5 flex items-center justify-between"
          data-testid="cart-room-section"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
            <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
              Room
            </span>
          </div>
          <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }} data-testid="cart-room-balance">
            ₹{(roomInfo.balancePayment || 0).toLocaleString()}
          </span>
        </div>
      )}

      {/* Order Notes Banner */}
      {orderNotes.length > 0 && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderTop: `1px solid ${COLORS.borderGray}`, backgroundColor: `${COLORS.primaryGreen}08` }}
          data-testid="order-notes-banner"
        >
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: COLORS.grayText }}>Order Notes</span>
            <p className="text-sm truncate mt-0.5" style={{ color: COLORS.darkText }}>
              {orderNotes.map(n => n.label).join(', ')}
            </p>
          </div>
          {onEditOrderNotes && (
            <button
              onClick={onEditOrderNotes}
              className="ml-2 px-3 py-1 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ color: COLORS.primaryGreen }}
              data-testid="edit-order-notes-btn"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Bottom Action Buttons */}
      {/* BUG-099 REVISED: QSR billing shows immediately when items exist in cart.
          "Place & Pay" does place + pay in one API call. Non-QSR flow untouched. */}
      {qsrMode ? (
        visibleCartItems.length > 0 ? (
        <QsrBillingSection
          cartItems={cartItems}
          total={total}
          orderType={orderType}
          restaurant={restaurant}
          qsrDiscountEnabled={qsrDiscountEnabled}
          deliveryCharge={deliveryCharge}
          onDeliveryChargeChange={onDeliveryChargeChange}
          isPrepaid={isPrepaid}
          isWebOrder={isWebOrder}
          initialDeliveryCharge={initialDeliveryCharge}
          isRoom={isRoom}
          associatedOrders={associatedOrders}
          roomInfo={roomInfo}
          onQsrCollectBill={onQsrCollectBill}
          onFullBilling={onFullBilling}
          isPlacingOrder={isPlacingOrder}
          hasPlacedItems={hasPlacedItems}
          hasValidationErrors={hasValidationErrors}
          placedOrderData={placedOrderData}
        />
      ) : null
      ) : (
      <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
        {/* Update Order / Place Order — hidden for prepaid existing orders */}
        {!(isPrepaid && hasPlacedItems) && (
        <button
          data-testid="place-order-btn"
          onClick={handlePlaceOrder}
          disabled={newItemCount === 0 || isPlacingOrder || hasValidationErrors || (isScheduled && (!scheduleAt?.trim() || !scheduleAt?.includes(':')))}
          className="flex-1 py-3 rounded-lg font-bold text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: COLORS.primaryOrange }}
        >
          {isPlacingOrder ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Placing...
            </>
          ) : hasPlacedItems ? (
            <>Update Order{newItemCount > 0 ? ` (${newItemCount})` : ""}</>
          ) : (
            <>Place Order{newItemCount > 0 ? ` (${newItemCount})` : ""}</>
          )}
        </button>
        )}
        {/* Collect Bill — only in non-QSR flow */}
        {canBill && !(isPrepaid && hasPlacedItems) && (
        <button
          data-testid="collect-bill-btn"
          onClick={() => setShowPaymentPanel(true)}
          disabled={
            (!isMarkerOnlyRoom && visibleCartItems.length === 0) ||
            (!hasPlacedItems && hasValidationErrors) ||
            (hasPlacedItems && hasUnplacedItems) ||
            (hasPlacedItems && !isServed && !isMarkerOnlyRoom) ||
            (isScheduled && (!scheduleAt?.trim() || !scheduleAt?.includes(':')))
          }
          className="flex-1 py-3 rounded-lg font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#2E7D32" }}
        >
          {/* BUG-097 (2026-05-21): delivery orders now use "Collect Bill" (was "Delivered") */}
          <span>{isRoom ? 'Checkout' : 'Collect Bill'}</span>
          <span>₹{(total + (isRoom ? associatedTotal + Math.max(0, roomInfo?.balancePayment || 0) : 0)).toLocaleString()}</span>
        </button>
        )}
      </div>
      )}
    </>
  );
};

export default CartPanel;
