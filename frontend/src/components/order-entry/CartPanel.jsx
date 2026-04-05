import { useState, useEffect, useRef, useMemo } from "react";
import { Utensils, XCircle, Pencil, CookingPot, UtensilsCrossed, Check, User, Phone, Trash2, ArrowLeftRight, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers } from "../../api/services/customerService";
import RePrintButton from "./RePrintButton";

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
const PlacedItemRow = ({ item, setCancelItem, setTransferItem, editingQtyItemId, setEditingQtyItemId, updateQuantity }) => {
  const { Icon: StatusIcon, color: statusColor, bg: statusBg } = getItemStatusIcon(item.status);
  const isCancelled = item.status === 'cancelled';

  return (
    <div
      className="px-3 py-2.5 flex items-start gap-2"
      style={{ borderBottom: `1px solid ${COLORS.borderGray}`, opacity: isCancelled ? 0.5 : 1 }}
    >
      {/* Status icon */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: statusBg }}>
        <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
      </div>

      {/* Cancel button — hidden for cancelled items */}
      {!isCancelled && (
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
        {item.customizations && !isCancelled && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.customizations.size && <span>{item.customizations.size}</span>}
            {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
          </div>
        )}
        {/* Fallback for existing API orders — variation/addOns not in customizations */}
        {!item.customizations && !isCancelled && (item.variation?.length > 0 || item.addOns?.length > 0) && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.variation?.length > 0 && (
              <span>{item.variation.map(v => v.name || v.label || '').filter(Boolean).join(', ')}</span>
            )}
            {item.addOns?.length > 0 && (
              <span> + {item.addOns.map(a => a.name || '').filter(Boolean).join(', ')}</span>
            )}
          </div>
        )}
        {item.notes && item.notes.trim() && !isCancelled && (
          <div className="text-xs mt-0.5 italic" style={{ color: COLORS.grayText }}>
            📝 {item.notes}
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: COLORS.grayText }}>
            {item.addedAt ? getTimeAgo(item.addedAt) : `${item.time} mins ago`}
          </span>
          {/* Transfer button — pill with icon, hidden for cancelled items */}
          {!isCancelled && (
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
          {editingQtyItemId === item.id ? (
            <>
              <button onClick={() => { if (item.qty > 1) updateQuantity(item.id, item.qty - 1); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.grayText }}>−</button>
              <span className="font-bold w-5 text-center" style={{ color: COLORS.primaryGreen }}>{item.qty}</span>
              <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.primaryGreen }}>+</button>
            </>
          ) : (
            <>
              <span className="font-bold" style={{ color: COLORS.primaryGreen }}>{item.qty}</span>
              <button onClick={() => setEditingQtyItemId(item.id)} className="p-2 hover:bg-gray-100 rounded-lg" data-testid={`qty-edit-${item.id}`}>
                <Pencil className="w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Price — strikethrough for cancelled */}
      <div className="w-16 text-right pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
        <span
          className="font-bold text-sm"
          style={{ color: isCancelled ? '#9CA3AF' : COLORS.primaryOrange, textDecoration: isCancelled ? 'line-through' : 'none' }}
        >
          ₹{(item.price * item.qty).toLocaleString()}
        </span>
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
      {item.customizations && (
        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
          {item.customizations.size && <span>{item.customizations.size}</span>}
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
      <button onClick={() => { if (item.qty > 1) updateQuantity(item.id, item.qty - 1); }} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.grayText }} data-testid={`qty-minus-${item.id}`}>−</button>
      <span className="font-bold w-5 text-center" style={{ color: COLORS.primaryGreen }}>{item.qty}</span>
      <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-lg font-bold" style={{ color: COLORS.primaryGreen }} data-testid={`qty-plus-${item.id}`}>+</button>
    </div>
    <div className="w-16 text-right pl-2 flex-shrink-0" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>
      <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>₹{(item.totalPrice || (item.price * item.qty)).toLocaleString()}</span>
    </div>
  </div>
);

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
  orderNotes = [],
  onEditOrderNotes,
}) => {
  const newItemCount = cartItems.filter(i => !i.placed).length;
  const [customerName, setCustomerName] = useState(customer?.name || "");
  const [customerPhone, setCustomerPhone] = useState(customer?.phone || "");
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredByName, setFilteredByName] = useState([]);
  const [isCustomerSelected, setIsCustomerSelected] = useState(false); // Track if customer was selected from suggestions
  const [showAssociatedOrders, setShowAssociatedOrders] = useState(false);
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
      setIsCustomerSelected(!!customer.id);
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
    onCustomerChange?.({ id: c.id, name: c.name, phone: c.phone });
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
    const newPhone = e.target.value;
    setCustomerPhone(newPhone);
    
    // If phone is cleared and a customer was previously selected, clear name too
    if (!newPhone.trim() && isCustomerSelected) {
      setCustomerName("");
      setIsCustomerSelected(false);
      onCustomerChange?.(null);
    }
  };

  // Handle field blur - update customer (no delay needed with onMouseDown)
  const handleFieldBlur = () => {
    if (customerName.trim() || customerPhone.trim()) {
      onCustomerChange?.({
        id: customer?.id || null,
        name: customerName.trim(),
        phone: customerPhone.trim(),
      });
    }
  };

  return (
    <>
      {/* Quick Customer Fields */}
      <div 
        className="px-3 py-3 grid grid-cols-2 gap-2"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="relative" ref={nameInputRef}>
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 z-10" style={{ color: COLORS.grayText }} />
          <input
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={handleNameChange}
            onBlur={handleFieldBlur}
            onFocus={() => customerName.length >= 2 && setShowNameSuggestions(filteredByName.length > 0)}
            className="w-full pl-8 pr-2 py-2 rounded-lg text-sm border focus:outline-none focus:ring-1"
            style={{ borderColor: COLORS.borderGray, fontSize: "13px" }}
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
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: COLORS.grayText }} />
          <input
            type="tel"
            placeholder="Phone number"
            value={customerPhone}
            onChange={handlePhoneChange}
            onBlur={handleFieldBlur}
            onFocus={() => customerPhone.length >= 3 && setShowPhoneSuggestions(filteredCustomers.length > 0)}
            className="w-full pl-8 pr-2 py-2 rounded-lg text-sm border focus:outline-none focus:ring-1"
            style={{ borderColor: COLORS.borderGray, fontSize: "13px" }}
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

      {/* Column Headers */}
      <div className="px-4 py-2 flex items-center text-xs font-medium" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
        <span className="flex-1">Items</span>
        <span className="w-16 text-center" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Qty</span>
        <span className="w-20 text-right" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Price</span>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cartItems.length === 0 ? (
          <div className="p-8 text-center" style={{ color: COLORS.grayText }}>
            <Utensils className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No items in order</p>
            <p className="text-sm mt-1">Tap menu items to add</p>
          </div>
        ) : (
          cartItems.map((item, index) => {
            const prevItem = index > 0 ? cartItems[index - 1] : null;
            const showKotSeparator = prevItem && prevItem.placed && !item.placed;

            return (
              <div key={`${item.id}-${index}`}>
                {showKotSeparator && (
                  <div className="px-4 py-2" style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}>
                    <RePrintButton />
                  </div>
                )}
                {item.placed ? (
                  <PlacedItemRow
                    item={item}
                    setCancelItem={setCancelItem}
                    setTransferItem={setTransferItem}
                    editingQtyItemId={editingQtyItemId}
                    setEditingQtyItemId={setEditingQtyItemId}
                    updateQuantity={updateQuantity}
                  />
                ) : (
                  <NewItemRow
                    item={item}
                    cartIndex={index}
                    onDeleteItem={onDeleteItem}
                    updateQuantity={updateQuantity}
                    onAddNote={onAddNote}
                    onCustomize={onCustomize}
                  />
                )}
              </div>
            );
          })
        )}

        {/* Re-Print at end of placed items */}
        {cartItems.some(i => i.placed) && (
          <div className="px-4 py-3">
            <RePrintButton />
          </div>
        )}
      </div>

      {/* Associated Orders — transferred table orders (rooms only) */}
      {isRoom && associatedOrders.length > 0 && (
        <div style={{ borderTop: `1px solid ${COLORS.borderGray}` }} data-testid="associated-orders-section">
          <button
            onClick={() => setShowAssociatedOrders(!showAssociatedOrders)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            data-testid="associated-orders-toggle"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4" style={{ color: COLORS.primaryOrange }} />
              <span className="text-xs font-semibold" style={{ color: COLORS.darkText }}>
                Transferred Orders ({associatedOrders.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: COLORS.primaryOrange }}>
                ₹{associatedTotal.toLocaleString()}
              </span>
              {showAssociatedOrders
                ? <ChevronUp className="w-4 h-4" style={{ color: COLORS.grayText }} />
                : <ChevronDown className="w-4 h-4" style={{ color: COLORS.grayText }} />
              }
            </div>
          </button>
          {showAssociatedOrders && (
            <div className="max-h-40 overflow-y-auto" style={{ backgroundColor: `${COLORS.primaryOrange}05` }}>
              {associatedOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="px-4 py-2 flex items-center justify-between text-xs"
                  style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
                  data-testid={`associated-order-${order.orderId}`}
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
      <div className="p-4 flex gap-3" style={{ borderTop: `1px solid ${COLORS.borderGray}` }}>
        <button
          data-testid="place-order-btn"
          onClick={handlePlaceOrder}
          disabled={newItemCount === 0 || isPlacingOrder}
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
        <button
          data-testid="collect-bill-btn"
          onClick={() => setShowPaymentPanel(true)}
          disabled={cartItems.length === 0}
          className="flex-1 py-3 rounded-lg font-bold text-sm text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#2E7D32" }}
        >
          <span>{isRoom ? 'Checkout' : 'Collect Bill'}</span>
          <span>₹{total.toLocaleString()}</span>
        </button>
      </div>
    </>
  );
};

export default CartPanel;
