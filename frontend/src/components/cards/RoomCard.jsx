import { useState } from "react";
import { User, Calendar, CreditCard, Phone, MessageSquare, X, MoreVertical, Wrench, SprayCan, RefreshCw, XCircle, Clock, FileText, Ban, CheckCircle, ChevronRight } from "lucide-react";
import { COLORS, ROOM_COLORS, BOOKING_SOURCES } from "../../constants";

// Room Card Component - Expandable
const RoomCard = ({ room, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const isActive = ["checkedIn", "reserved", "checkedOut", "housekeeping", "maintenance"].includes(room.status);
  
  const borderColor = ROOM_COLORS[room.status] || COLORS.borderGray;
  const badgeColor = ROOM_COLORS[room.status] || COLORS.sectionBg;
  
  // Check if room needs X icon overlay
  const needsXIcon = room.status === "housekeeping" || room.status === "maintenance";
  const xIconColor = room.status === "maintenance" ? "#EF4444" : COLORS.amber;
  
  // Get status label
  const getStatusLabel = () => {
    switch (room.status) {
      case "checkedIn": return "Checked In";
      case "checkedOut": return "Checked Out";
      case "reserved": return "Reserved";
      case "housekeeping": return "Housekeeping";
      case "maintenance": return "Maintenance";
      default: return "Available";
    }
  };

  // Get action button config
  const getButtonConfig = () => {
    switch (room.status) {
      case "reserved": return { text: "Check In" };
      case "checkedIn": return { text: "Check Out" };
      case "checkedOut": return { text: "Housekeeping" };
      case "housekeeping": return { text: "Mark Ready" };
      case "maintenance": return { text: "Mark Ready" };
      default: return { text: "Book" };
    }
  };

  // Get secondary actions based on status
  const getSecondaryActions = () => {
    switch (room.status) {
      case "available":
        return [
          { id: "maintenance", label: "Maintenance", icon: Wrench, color: "#EF4444" },
          { id: "block", label: "Block Room", icon: Ban, color: COLORS.grayText },
        ];
      case "reserved":
        return [
          { id: "housekeeping", label: "Housekeeping", icon: SprayCan, color: COLORS.amber },
          { id: "maintenance", label: "Maintenance", icon: Wrench, color: "#EF4444" },
          { id: "changeRoom", label: "Change Room", icon: RefreshCw, color: COLORS.primaryOrange },
          { id: "cancel", label: "Cancel Booking", icon: XCircle, color: "#EF4444" },
        ];
      case "checkedIn":
        return [
          { id: "housekeeping", label: "Request Housekeeping", icon: SprayCan, color: COLORS.amber },
          { id: "maintenance", label: "Report Issue", icon: Wrench, color: "#EF4444" },
          { id: "extend", label: "Extend Stay", icon: Clock, color: COLORS.primaryGreen },
          { id: "changeRoom", label: "Change Room", icon: RefreshCw, color: COLORS.primaryOrange },
        ];
      case "checkedOut":
        return [
          { id: "maintenance", label: "Maintenance", icon: Wrench, color: "#EF4444" },
          { id: "markAvailable", label: "Mark Available", icon: CheckCircle, color: COLORS.primaryGreen },
        ];
      case "housekeeping":
        return [
          { id: "maintenance", label: "Maintenance", icon: Wrench, color: "#EF4444" },
          { id: "extendTime", label: "Extend Time", icon: Clock, color: COLORS.amber },
        ];
      case "maintenance":
        return [
          { id: "housekeeping", label: "Housekeeping", icon: SprayCan, color: COLORS.amber },
          { id: "updateNotes", label: "Update Notes", icon: FileText, color: COLORS.grayText },
        ];
      default:
        return [];
    }
  };

  const buttonConfig = getButtonConfig();
  const secondaryActions = getSecondaryActions();
  const bookingSource = room.bookingSource ? BOOKING_SOURCES[room.bookingSource] : null;

  const handleSecondaryAction = (actionId) => {
    // TODO: implement secondary action handler
    setShowMenu(false);
  };

  return (
    <div
      data-testid={`room-card-${room.id}`}
      className={`rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-md flex flex-col ${isExpanded ? 'col-span-2' : 'min-h-[320px]'}`}
      style={{
        backgroundColor: COLORS.lightBg,
        border: `3px solid ${borderColor}`,
        overflow: "visible",
      }}
      onClick={() => isActive && setIsExpanded(!isExpanded)}
    >
      {/* Header Pill */}
      <div className="p-4 pb-0">
        <div className="relative mb-4">
          <div
            className="w-full px-4 py-3 rounded-xl flex items-center justify-between font-bold"
            style={{
              backgroundColor: badgeColor,
              color: room.status === "available" || needsXIcon ? COLORS.grayText : "white",
            }}
          >
            {/* Left: OTA Icon + Category */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {needsXIcon && (
                <X className="w-5 h-5 flex-shrink-0" style={{ color: xIconColor, strokeWidth: 3 }} />
              )}
              {bookingSource && (
                <div
                  className="w-7 h-7 rounded text-sm font-bold flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: bookingSource.color, color: "white" }}
                  title={room.bookingSource}
                >
                  {bookingSource.label}
                </div>
              )}
              <span className="text-sm font-medium">{room.type}</span>
            </div>
            
            {/* Right: Room Number + More Menu */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-base font-bold">{room.id}</span>
              <button
                data-testid={`room-more-btn-${room.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded transition-colors hover:bg-white/20 flex items-center justify-center flex-shrink-0"
              >
                <MoreVertical className="w-5 h-5 flex-shrink-0" style={{ color: room.status === "available" || needsXIcon ? COLORS.grayText : "white" }} />
              </button>
            </div>
          </div>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div 
              className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border z-[100] min-w-[180px]"
              style={{ borderColor: COLORS.borderGray }}
            >
              {secondaryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    data-testid={`room-action-${action.id}-${room.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSecondaryAction(action.id);
                    }}
                    className="w-full px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                    style={{ color: COLORS.darkText }}
                  >
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className={`px-4 pb-4 flex-1 flex flex-col ${isExpanded && isActive ? 'flex-row gap-6' : ''}`}>
        {/* Left Side - Main Info */}
        <div className={isExpanded && isActive ? 'flex-1 min-w-0' : ''}>
          {/* Active rooms */}
          {isActive && (
            <div className="flex flex-col flex-1">
              {/* Content area */}
              <div className="space-y-2">
                {/* Row 1: Guest Name */}
                <div>
                  {room.guestName && (
                    <div 
                      className="text-lg font-semibold leading-tight" 
                      style={{ color: COLORS.darkText }}
                    >
                      {room.guestName}
                    </div>
                  )}
                  {room.status === "housekeeping" && room.lastGuest && (
                    <div className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                      Last: {room.lastGuest}
                    </div>
                  )}
                  {room.status === "maintenance" && room.note && (
                    <div className="text-sm mt-1" style={{ color: "#EF4444" }}>
                      {room.note}
                    </div>
                  )}
                </div>

                {/* Row 2: Amount */}
                {room.total && (
                  <div className="text-right">
                    <span className="text-xl font-bold" style={{ color: COLORS.primaryOrange }}>
                      ₹{room.total.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Row 3: Out/In date + Payment status */}
                <div className="flex items-center justify-between">
                  <div>
                    {room.checkOut && room.status === "checkedIn" && (
                      <span className="text-sm" style={{ color: COLORS.grayText }}>
                        Out: {room.checkOut.split(",")[0]}
                      </span>
                    )}
                    {room.checkIn && room.status === "reserved" && (
                      <span className="text-sm" style={{ color: COLORS.grayText }}>
                        In: {room.checkIn.split(",")[0]}
                      </span>
                    )}
                  </div>
                  {room.paymentStatus && (
                    <span 
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ 
                        backgroundColor: room.paymentStatus === "paid" ? `${COLORS.primaryGreen}20` : `${COLORS.amber}20`,
                        color: room.paymentStatus === "paid" ? COLORS.primaryGreen : COLORS.amber,
                      }}
                    >
                      {room.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </span>
                  )}
                </div>
                
                {/* Row 4: Status Badge */}
                {["checkedIn", "reserved", "checkedOut"].includes(room.status) && (
                  <div>
                    <span 
                      className="inline-block text-xs px-3 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${borderColor}20`,
                        color: borderColor,
                      }}
                    >
                      {getStatusLabel()}
                    </span>
                  </div>
                )}
              </div>

              {/* Button + Arrow */}
              <div className="mt-auto pt-3">
                <button
                  data-testid={`room-action-btn-${room.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick && onClick(room);
                  }}
                  className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: COLORS.primaryGreen,
                    color: "white",
                  }}
                >
                  {buttonConfig.text}
                </button>
                
                {/* Expand Arrow */}
                {!isExpanded && (
                  <div className="flex justify-end pt-2">
                    <ChevronRight className="w-5 h-5" style={{ color: COLORS.grayText }} />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Available room */}
          {!isActive && (
            <div className="flex flex-col flex-1">
              <div className="mt-auto">
                <button
                  data-testid={`room-action-btn-${room.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick && onClick(room);
                  }}
                  className="w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: COLORS.primaryGreen,
                    color: "white",
                  }}
                >
                  {buttonConfig.text}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Expanded Details */}
        {isExpanded && isActive && (
          <div 
            className="flex-1 border-l pl-6 flex flex-col justify-center"
            style={{ borderColor: COLORS.borderGray }}
          >
            <div className="space-y-2">
              {/* Check-in */}
              {room.checkIn && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                  <span className="flex-shrink-0" style={{ color: COLORS.grayText }}>In:</span>
                  <span style={{ color: COLORS.darkText }}>{room.checkIn}</span>
                </div>
              )}
              {/* Check-out */}
              {room.checkOut && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                  <span className="flex-shrink-0" style={{ color: COLORS.grayText }}>Out:</span>
                  <span style={{ color: COLORS.darkText }}>{room.checkOut}</span>
                </div>
              )}
              
              {/* Guests */}
              {room.guests && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                  <span style={{ color: COLORS.darkText }}>
                    {room.guests.adults} Adult{room.guests.adults > 1 ? "s" : ""}
                    {room.guests.children > 0 && `, ${room.guests.children} Child`}
                  </span>
                </div>
              )}
              
              {/* Payment */}
              {room.paymentStatus && (
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                  <span 
                    className="px-2 py-0.5 rounded flex-shrink-0"
                    style={{ 
                      backgroundColor: room.paymentStatus === "paid" ? `${COLORS.primaryGreen}20` : `${COLORS.amber}20`,
                      color: room.paymentStatus === "paid" ? COLORS.primaryGreen : COLORS.amber,
                    }}
                  >
                    {room.paymentStatus === "paid" ? "Paid" : "Pending"}
                  </span>
                  {room.rate && (
                    <span style={{ color: COLORS.grayText }}>
                      @ ₹{room.rate.toLocaleString()}/night
                    </span>
                  )}
                </div>
              )}
              
              {/* Phone */}
              {room.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.grayText }} />
                  <span style={{ color: COLORS.darkText }}>{room.phone}</span>
                </div>
              )}
              
              {/* Special Requests */}
              {room.requests && (
                <div className="flex items-start gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.grayText }} />
                  <span style={{ color: COLORS.darkText }}>{room.requests}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCard;
