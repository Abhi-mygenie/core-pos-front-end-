import { useState } from "react";
import { User, CheckCircle, ChevronDown, ChevronUp, X, MessageCircle, Utensils, Clock } from "lucide-react";
import { COLORS } from "../../constants";
import { mockOrderItems } from "../../data";
import { getTableStatusConfig } from "../../utils";

// Dine-In Order Card Component - Neutral design with full functionality
const DineInCard = ({ table, onEdit, isSnoozed, onToggleSnooze }) => {
  const [showServedItems, setShowServedItems] = useState(false);
  
  const orderData = mockOrderItems[table.id] || { waiter: "", customer: "", phone: "", items: [] };
  const preparingItems = orderData.items.filter(item => item.status === "preparing");
  const readyItems = orderData.items.filter(item => item.status === "ready");
  const servedItems = orderData.items.filter(item => item.status === "served");

  const statusConfig = getTableStatusConfig(table.status);

  const handleServeItem = (itemId) => { /* TODO: serve item */ };

  const handleServeAll = () => { /* TODO: serve all */ };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(table);
    }
  };

  return (
    <div
      data-testid={`dinein-card-${table.id}`}
      className={`rounded-lg shadow-sm overflow-hidden ${isSnoozed ? 'opacity-60' : ''}`}
      style={{ backgroundColor: COLORS.lightBg, border: `1.5px solid ${COLORS.borderGray}` }}
    >
      {/* Header Row - Same style as Delivery */}
      <div className="px-4 py-3 flex items-center justify-between border-b flex-nowrap" style={{ borderColor: COLORS.borderGray }}>
        <div className="flex items-center gap-2 flex-nowrap min-w-0">
          {/* Dine-In Icon */}
          <div 
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: COLORS.dineIn }}
          >
            <Utensils className="w-4 h-4 text-white" />
          </div>
          
          {/* Table ID + Customer Name + Phone + Time - all in one line */}
          <span className="text-base font-bold flex-shrink-0" style={{ color: COLORS.darkText }}>{table.id}</span>
          {orderData.customer && (
            <span className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{orderData.customer}</span>
          )}
          {orderData.phone && (
            <span className="text-xs flex-shrink-0 whitespace-nowrap" style={{ color: COLORS.grayText }}>{orderData.phone}</span>
          )}
          <span className="text-sm flex-shrink-0 whitespace-nowrap" style={{ color: COLORS.grayText }}>{table.time}</span>
        </div>
        
        {/* Status + Snooze */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span 
            className="px-2 py-1 text-xs font-bold rounded whitespace-nowrap"
            style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
          >
            {statusConfig.label}
          </span>
          {/* Snooze Button */}
          {onToggleSnooze && (
            <button 
              data-testid={`snooze-btn-${table.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze(table.id);
              }}
              className={`p-1.5 rounded flex-shrink-0 transition-colors ${isSnoozed ? 'bg-orange-100' : 'hover:bg-gray-100'}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
            >
              <Clock className="w-4 h-4" style={{ color: isSnoozed ? COLORS.primaryOrange : COLORS.grayText }} />
            </button>
          )}
          <button className="p-1.5 hover:bg-gray-100 rounded flex-shrink-0">
            <MessageCircle className="w-4 h-4" style={{ color: COLORS.grayText }} />
          </button>
        </div>
      </div>

      {/* Items List with Serve buttons */}
      <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
        {/* Preparing Items */}
        {preparingItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.primaryOrange }}
              />
              <span className="text-sm" style={{ color: COLORS.primaryOrange }}>
                {item.name} ({item.qty})
              </span>
            </div>
            <span className="text-xs" style={{ color: COLORS.grayText }}>Preparing</span>
          </div>
        ))}

        {/* Ready Items with Serve button */}
        {readyItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS.primaryGreen }}
              />
              <span className="text-sm" style={{ color: COLORS.darkText }}>
                {item.name} ({item.qty})
              </span>
            </div>
            <button
              className="px-3 py-1 text-xs font-medium rounded"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={() => handleServeItem(item.id)}
            >
              Serve
            </button>
          </div>
        ))}
        
        {/* Total */}
        <div className="flex justify-end mt-2 pt-2 border-t border-dashed" style={{ borderColor: COLORS.borderGray }}>
          <span className="font-bold text-base" style={{ color: COLORS.primaryOrange }}>
            ₹{table.amount?.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Customer + Waiter Section */}
      <div className="px-4 py-2 border-b flex items-center gap-2" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: COLORS.borderGray }}
        >
          <User className="w-4 h-4" style={{ color: COLORS.grayText }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium" style={{ color: COLORS.darkText }}>
            {orderData.customer || "Walk-in"}
          </div>
          <div className="text-xs" style={{ color: COLORS.grayText }}>
            Waiter: {orderData.waiter}
          </div>
        </div>
      </div>

      {/* Served Items - Collapsible */}
      {servedItems.length > 0 && (
        <div className="px-4 py-2 border-b" style={{ borderColor: COLORS.borderGray }}>
          <button
            className="w-full flex items-center justify-between text-sm"
            style={{ color: COLORS.grayText }}
            onClick={() => setShowServedItems(!showServedItems)}
          >
            <span>Served Items ({servedItems.length})</span>
            {showServedItems ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showServedItems && (
            <div className="mt-2 pl-3 border-l-2" style={{ borderColor: COLORS.primaryGreen }}>
              {servedItems.map(item => (
                <div key={item.id} className="py-1 flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" style={{ color: COLORS.primaryGreen }} />
                  <span className="text-xs" style={{ color: COLORS.grayText }}>
                    {item.name} ({item.qty})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: COLORS.sectionBg }}>
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
          <button
            className="p-2 rounded border"
            style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}
          >
            <X className="w-4 h-4" />
          </button>
          {readyItems.length > 0 && (
            <button
              className="px-4 py-2 text-xs font-bold rounded"
              style={{ backgroundColor: COLORS.primaryOrange, color: "white" }}
              onClick={handleServeAll}
            >
              Serve
            </button>
          )}
          <button
            className="px-4 py-2 text-xs font-bold rounded"
            style={{ backgroundColor: COLORS.primaryGreen, color: "white" }}
            onClick={handleEditClick}
          >
            Collect
          </button>
        </div>
      </div>
    </div>
  );
};

export default DineInCard;
