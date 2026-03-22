import { User, X, CheckCircle, Clock } from "lucide-react";
import { COLORS, SOURCE_COLORS } from "../../constants";
import { getOrderStatusConfig, getRiderStatusConfig } from "../../utils";

// Compact Delivery/TakeAway Card Component (XD Design) - Reduced size
const DeliveryCard = ({ order, isSnoozed, onToggleSnooze }) => {
  const sourceColor = SOURCE_COLORS[order.source] || SOURCE_COLORS.own;
  
  // Get source initial for logo
  const getSourceLogo = () => {
    switch (order.source) {
      case "swiggy": return "S";
      case "zomato": return "Z";
      default: return "O"; // Own
    }
  };

  const orderStatus = getOrderStatusConfig(order.status);
  const riderStatus = getRiderStatusConfig(order.riderStatus);

  return (
    <div
      data-testid={`delivery-card-${order.id}`}
      className={`rounded-lg shadow-sm overflow-hidden ${isSnoozed ? 'opacity-60' : ''}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1.5px solid ${COLORS.borderGray}` }}
    >
      {/* Header Row */}
      <div className="px-3 py-2 flex items-center justify-between border-b flex-nowrap" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-2 flex-nowrap min-w-0">
          {/* Source Logo */}
          <div 
            className="w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
            style={{ backgroundColor: sourceColor }}
          >
            {getSourceLogo()}
          </div>
          
          {/* Order ID + Customer Name + Phone + Time - all in one line */}
          <span className="text-sm font-bold flex-shrink-0" style={{ color: COLORS.darkText }}>#{order.id}</span>
          {order.customer && (
            <span className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{order.customer}</span>
          )}
          {order.phone && (
            <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: COLORS.grayText }}>{order.phone}</span>
          )}
          <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: COLORS.grayText }}>{order.time}</span>
        </div>
        
        {/* Order Status + Snooze */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <span 
            className="px-1.5 py-0.5 text-[10px] font-bold rounded whitespace-nowrap"
            style={{ backgroundColor: `${orderStatus.color}20`, color: orderStatus.color }}
          >
            {orderStatus.label}
          </span>
          {/* Snooze Button */}
          {onToggleSnooze && (
            <button 
              data-testid={`snooze-btn-${order.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze(order.id);
              }}
              className={`p-1 rounded flex-shrink-0 transition-colors ${isSnoozed ? 'bg-orange-100' : 'hover:bg-gray-100'}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
            >
              <Clock className="w-3.5 h-3.5" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="px-3 py-2 border-b" style={{ borderColor: COLORS.borderGray }}>
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-1.5 py-0.5">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.status === "ready" ? COLORS.primaryGreen : COLORS.primaryOrange }}
            />
            <span className="text-xs" style={{ color: COLORS.darkText }}>
              {item.name} ({item.qty})
            </span>
          </div>
        ))}
        
        {/* Total */}
        <div className="flex justify-end mt-1.5 pt-1.5 border-t border-dashed" style={{ borderColor: COLORS.borderGray }}>
          <span className="font-bold text-sm" style={{ color: COLORS.primaryOrange }}>
            ₹{order.amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Rider Section (for delivery) */}
      {order.orderType === "delivery" && (
        <div className="px-3 py-1.5 border-b flex items-center gap-2" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: COLORS.borderGray }}
          >
            <User className="w-3 h-3" style={{ color: COLORS.grayText }} />
          </div>
          <div className="flex-1">
            {order.rider ? (
              <>
                <div className="text-xs font-medium" style={{ color: COLORS.darkText }}>{order.rider}</div>
                <div className="text-[10px]" style={{ color: COLORS.grayText }}>
                  {order.riderPhone}
                </div>
              </>
            ) : (
              <div className="text-xs" style={{ color: COLORS.grayText }}>
                Awaiting Runner
              </div>
            )}
          </div>
          {/* Rider Status Pill */}
          {riderStatus && (
            <span 
              className="px-1.5 py-0.5 text-[9px] font-medium rounded"
              style={{ backgroundColor: `${riderStatus.color}20`, color: riderStatus.color }}
            >
              {riderStatus.label}
            </span>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: COLORS.sectionBg }}>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 text-xs font-medium rounded border"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          >
            Bill
          </button>
          <button
            className="px-4 py-2 text-xs font-medium rounded border"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
          >
            KOT
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* OTP */}
          {order.otp && (
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: COLORS.grayText }}>OTP:</span>
              <span className="font-bold text-sm" style={{ color: COLORS.primaryGreen }}>{order.otp}</span>
            </div>
          )}
          
          {/* Dynamic Action Button based on status */}
          {order.status === "yetToConfirm" && (
            <div className="flex items-center gap-1.5">
              <button
                className="p-1.5 rounded border"
                style={{ borderColor: "#EF4444", color: "#EF4444" }}
                onClick={() => console.log(`Cancel order ${order.id}`)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                className="px-2.5 py-1.5 text-[10px] font-bold rounded border"
                style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
                onClick={() => console.log(`Edit order ${order.id}`)}
              >
                Edit
              </button>
              <button
                className="px-2.5 py-1.5 text-[10px] font-bold rounded"
                style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
                onClick={() => console.log(`Confirm order ${order.id}`)}
              >
                Confirm
              </button>
            </div>
          )}
          
          {order.status === "ready" && (
            <button
              className="px-3 py-1.5 text-[10px] font-bold rounded"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={() => console.log(`${order.source === "own" ? "Assign Rider" : "Dispatch"} order ${order.id}`)}
            >
              {order.source === "own" ? "Assign Rider" : "Dispatch"}
            </button>
          )}
          
          {order.status === "dispatched" && (
            <button
              className="px-3 py-1.5 text-[10px] font-bold rounded"
              style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
              onClick={() => console.log(`Mark delivered ${order.id}`)}
            >
              Delivered
            </button>
          )}
          
          {order.status === "delivered" && (
            <span 
              className="px-3 py-1.5 text-[10px] font-bold rounded flex items-center gap-1"
              style={{ backgroundColor: `${COLORS.primaryGreen}20`, color: COLORS.primaryGreen }}
            >
              <CheckCircle className="w-3 h-3" /> Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryCard;
