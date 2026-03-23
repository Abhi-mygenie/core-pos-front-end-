import { useState } from "react";
import { User, X, ChevronDown, ChevronUp, MapPin, Clock } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";

// Item status config for dine-in item-level display
const ITEM_STATUS = {
  preparing: { label: "Preparing", color: COLORS.primaryOrange, action: "Ready" },
  ready: { label: "Ready", color: COLORS.primaryGreen, action: "Serve" },
  served: { label: "Served", color: COLORS.primaryGreen, action: "Cancel" },
};

/**
 * Unified Order Card - Handles Dine-In, TakeAway, and Delivery
 * 
 * @param {object}  order      - Full canonical order object from OrderContext
 * @param {string}  orderType  - 'dineIn' | 'takeAway' | 'delivery'
 * @param {string}  tableLabel - Dine-in only: table label ("T1", "WC")
 * @param {boolean} isSnoozed
 * @param {func}    onToggleSnooze
 * @param {func}    onEdit     - Opens OrderEntry for this order
 */
const OrderCard = ({
  order,
  orderType,
  tableLabel,
  isSnoozed,
  onToggleSnooze,
  onEdit,
}) => {
  const [showServed, setShowServed] = useState(false);
  const [showAddress, setShowAddress] = useState(false);

  if (!order) return null;

  const source = order.source || "own";
  const isOwn = source === "own";
  const isDineIn = orderType === "dineIn";
  const isDelivery = orderType === "delivery";
  const orderId = order.orderId || order.id;

  // Items grouped by status
  const items = order.items || [];
  const activeItems = items.filter(i => i.status !== "served");
  const servedItems = items.filter(i => i.status === "served");

  // Source logo
  const renderLogo = () => {
    if (isOwn) {
      return (
        <img
          src="/mygenie-logo.png"
          alt="MG"
          className="w-7 h-7 rounded flex-shrink-0 object-cover"
        />
      );
    }
    const color = SOURCE_COLORS[source] || SOURCE_COLORS.own;
    const letter = source === "swiggy" ? "S" : source === "zomato" ? "Z" : "O";
    return (
      <div
        className="w-7 h-7 rounded flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {letter}
      </div>
    );
  };

  // Primary ID: table label for dine-in, order # for others
  const primaryId = isDineIn ? (tableLabel || "T?") : `#${order.orderNumber || orderId}`;

  // Handle item action (Ready/Serve/Cancel) — logs for now (Phase 2 POST)
  const handleItemAction = (itemId, action) => {
    console.log(`[OrderCard] ${action} item ${itemId} on order ${orderId}`);
  };

  // Handle order-level actions — logs for now (Phase 2 POST)
  const handleAccept = () => console.log(`[OrderCard] Accept order ${orderId}`);
  const handleCollect = () => {
    if (onEdit) onEdit(order);
  };

  const isYetToConfirm = order.status === "yetToConfirm" || order.status === "pending";

  return (
    <div
      data-testid={`order-card-${orderId}`}
      className={`rounded-lg shadow-sm overflow-hidden ${isSnoozed ? "opacity-60" : ""}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1.5px solid ${COLORS.borderGray}` }}
    >
      {/* ── HEADER — 3-zone layout: Left (ID+Name) | Center (Waiter+Time) | Right (Price+Snooze) ── */}
      <div
        className="px-4 py-3 flex items-center border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        {/* LEFT: Logo + Stacked (ID on top, Customer below) + Address icon */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          {renderLogo()}
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold" style={{ color: COLORS.darkText }}>
              {primaryId}
            </span>
            <span className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>
              {order.customer || "WC"}
            </span>
          </div>
          {isDelivery && isOwn && (
            <button
              data-testid={`address-btn-${orderId}`}
              className="p-2.5 hover:bg-gray-100 rounded flex-shrink-0"
              onClick={() => setShowAddress(!showAddress)}
              title="View address"
            >
              <MapPin className="w-4 h-4" style={{ color: COLORS.grayText }} />
            </button>
          )}
        </div>

        {/* CENTER: Waiter + Time */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {isOwn && order.waiter && (
            <span className="text-xs" style={{ color: COLORS.grayText }}>
              {order.waiter}
            </span>
          )}
          <span className="text-xs" style={{ color: COLORS.grayText }}>
            · {order.time}
          </span>
        </div>

        {/* RIGHT: Amount + Snooze */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-bold text-xl" style={{ color: COLORS.primaryOrange }}>
            ₹{(order.amount || 0).toLocaleString()}
          </span>
          {onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${orderId}`}
              onClick={(e) => { e.stopPropagation(); onToggleSnooze(String(orderId)); }}
              className={`p-2.5 rounded flex-shrink-0 transition-colors ${isSnoozed ? "bg-orange-100" : "hover:bg-gray-100"}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
            >
              <Clock className="w-4 h-4" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
            </button>
          )}
        </div>
      </div>

      {/* ── ADDRESS POPUP (own delivery) ── */}
      {showAddress && isDelivery && isOwn && (
        <div className="px-4 py-2 border-b text-xs" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
            <span style={{ color: COLORS.darkText }}>
              {order.deliveryAddress?.formatted || order.deliveryAddress?.address || "No address provided"}
            </span>
          </div>
        </div>
      )}

      {/* ── ITEMS SECTION ── */}
      <div className="px-4 py-2 border-b" style={{ borderColor: COLORS.borderGray }}>
        {isDineIn ? (
          /* Dine-In: Item-level status + actions */
          activeItems.length > 0 ? (
            activeItems.map((item) => {
              const cfg = ITEM_STATUS[item.status] || ITEM_STATUS.preparing;
              return (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-sm truncate" style={{ color: COLORS.darkText }}>
                      {item.name} ({item.qty})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                    {cfg.action && item.status !== "served" && (
                      <button
                        data-testid={`item-action-${item.id}`}
                        className="px-4 py-2 text-xs font-bold rounded min-h-[44px] min-w-[44px]"
                        style={{
                          backgroundColor: item.status === "ready" ? COLORS.primaryGreen : COLORS.primaryOrange,
                          color: "white",
                        }}
                        onClick={() => handleItemAction(item.id, cfg.action)}
                      >
                        {cfg.action}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-2 text-xs" style={{ color: COLORS.grayText }}>
              No active items
            </div>
          )
        ) : (
          /* TakeAway / Delivery: Simple item list, no actions */
          items.length > 0 ? (
            items.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center gap-2 py-1">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS.primaryGreen }}
                />
                <span className="text-sm" style={{ color: COLORS.darkText }}>
                  {item.name} ({item.qty})
                </span>
              </div>
            ))
          ) : (
            <div className="py-2 text-xs" style={{ color: COLORS.grayText }}>
              No items
            </div>
          )
        )}
      </div>

      {/* ── SERVED ITEMS COLLAPSED (Dine-In only) ── */}
      {isDineIn && servedItems.length > 0 && (
        <div className="border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            data-testid={`served-toggle-${orderId}`}
            className="w-full px-4 py-3 flex items-center justify-between text-xs hover:bg-gray-50 min-h-[44px]"
            style={{ color: COLORS.grayText }}
            onClick={() => setShowServed(!showServed)}
          >
            <span>Served Items ({servedItems.length})</span>
            {showServed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showServed && (
            <div className="px-4 pb-2">
              {servedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS.primaryGreen }}
                    />
                    <span className="text-xs" style={{ color: COLORS.grayText }}>
                      {item.name} ({item.qty})
                    </span>
                    <span className="text-[10px]" style={{ color: COLORS.primaryGreen }}>Served</span>
                  </div>
                  <button
                    data-testid={`cancel-item-${item.id}`}
                    className="px-3 py-2 text-xs font-medium rounded border min-h-[44px]"
                    style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
                    onClick={() => handleItemAction(item.id, "Cancel")}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RIDER SECTION (Delivery + Aggregator only) ── */}
      {isDelivery && !isOwn && (
        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <User className="w-3 h-3" style={{ color: COLORS.grayText }} />
          </div>
          <div className="flex-1 min-w-0">
            {order.rider ? (
              <>
                <div className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>{order.rider}</div>
                <div className="text-[10px]" style={{ color: COLORS.grayText }}>{order.riderPhone}</div>
              </>
            ) : (
              <div className="text-xs" style={{ color: COLORS.grayText }}>Awaiting Runner</div>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ACTIONS ── */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: COLORS.sectionBg }}>
        <div className="flex items-center gap-3">
          <button
            data-testid={`bill-btn-${orderId}`}
            className="px-4 py-2.5 text-sm font-medium rounded border min-h-[44px]"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          >
            Bill
          </button>
          <button
            data-testid={`kot-btn-${orderId}`}
            className="px-4 py-2.5 text-sm font-medium rounded border min-h-[44px]"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          >
            KOT
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isYetToConfirm ? (
            /* New online order — Accept flow */
            <>
              <button
                data-testid={`reject-btn-${orderId}`}
                className="p-2.5 rounded border min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ borderColor: COLORS.errorText, color: COLORS.errorText }}
              >
                <X className="w-5 h-5" />
              </button>
              <button
                data-testid={`accept-btn-${orderId}`}
                className="px-5 py-2.5 text-sm font-bold rounded min-h-[44px]"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                onClick={handleAccept}
              >
                Accept
              </button>
            </>
          ) : (
            /* Normal flow — Cancel + Collect */
            <>
              <button
                data-testid={`cancel-btn-${orderId}`}
                className="p-2.5 rounded border min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
              >
                <X className="w-5 h-5" />
              </button>
              <button
                data-testid={`collect-btn-${orderId}`}
                className="px-5 py-2.5 text-sm font-bold rounded min-h-[44px]"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                onClick={handleCollect}
              >
                Collect
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
