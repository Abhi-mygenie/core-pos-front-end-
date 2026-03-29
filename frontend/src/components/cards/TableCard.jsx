import React, { useMemo } from "react";
import { Printer, Clock, X, Check, PlusSquare, ShoppingBag, Bike } from "lucide-react";
import PropTypes from 'prop-types';
import { COLORS, CONFIG } from "../../constants";
import { mockOrderItems } from "../../data";
import { getTableStatusConfig, isTableActive } from "../../utils";
import { IconButton, TextButton } from "./buttons";
import { CARD_BASE_STYLE } from "./TableCard.styles";

// Table Card Component - Simplified (no expansion, uses modal)
const TableCard = ({ table, onClick, onOpenModal, onUpdateStatus, isSnoozed, onToggleSnooze, currencySymbol = '₹' }) => {
  const statusConfig = getTableStatusConfig(table.status);
  const isActive = isTableActive(table.status);
  const hasOrders = ["occupied", "billReady"].includes(table.status);
  const isYetToConfirm = table.status === "yetToConfirm";
  
  const orderData = mockOrderItems[table.id] || { waiter: "", items: [] };

  // Memoize dynamic styles to prevent unnecessary re-renders
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `3px solid ${statusConfig.borderColor}`,
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [statusConfig.borderColor]);

  const headerPillStyle = useMemo(() => {
    // Different background colors by order type
    let bg = '#E5E7EB'; // Default gray for dine-in/walk-in
    if (table.orderType === 'takeAway') bg = '#FFF3E0'; // Light amber
    else if (table.orderType === 'delivery') bg = '#E3F2FD'; // Light blue
    return {
      backgroundColor: bg,
      color: COLORS.darkText,
    };
  }, [table.orderType]);

  const handleCardClick = () => {
    if (hasOrders || isYetToConfirm) {
      onOpenModal(table);
    } else {
      onClick(table);
    }
  };

  return (
    <div
      data-testid={`table-card-${table.id}`}
      onClick={handleCardClick}
      className={`rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md ${isSnoozed ? 'opacity-60' : ''}`}
      style={cardStyle}
    >
      {/* Card Content */}
      <div className="p-2.5 h-full flex flex-col">
        {/* Header Pill */}
        <div
          className="w-full px-4 py-1.5 rounded-xl flex items-center justify-between font-bold"
          style={headerPillStyle}
        >
          <div className="flex items-center gap-2">
            {table.orderType === 'takeAway' && <ShoppingBag className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />}
            {table.orderType === 'delivery' && <Bike className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />}
            <span className="text-sm font-bold">{table.label || table.id}</span>
            {table.status === "reserved" ? (
              <span className="text-xs font-semibold" style={{ color: COLORS.primaryOrange }}>Reserved</span>
            ) : table.amount ? (
              <span className="text-xs font-semibold">{currencySymbol}{table.amount.toLocaleString()}</span>
            ) : null}
          </div>
          
          {/* Snooze Button - Only for yetToConfirm orders */}
          {isYetToConfirm && onToggleSnooze && (
            <button
              data-testid={`snooze-btn-${table.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSnooze(table.id);
              }}
              className={`p-1 rounded transition-colors ${isSnoozed ? 'bg-white/30' : 'hover:bg-white/20'}`}
              title={isSnoozed ? "Unsnooze" : "Snooze"}
              aria-label={isSnoozed ? `Unsnooze order for table ${table.id}` : `Snooze order for table ${table.id}`}
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Available - Add order icon centered + Available label at bottom */}
        {!isActive && (
          <>
            <div className="flex-1 flex items-center justify-center">
              <PlusSquare className="w-6 h-6" style={{ color: COLORS.primaryOrange }} />
            </div>
            <div
              className="flex items-center justify-center rounded-lg text-xs font-semibold py-3"
              style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}
              data-testid={`available-label-${table.id}`}
            >
              Available
            </div>
          </>
        )}

        {/* Active content */}
        {isActive && (
          <div className="mt-2.5 flex-1 flex flex-col">
            {/* Primary name — Rooms: customer, Tables: waiter */}
            <div className="text-lg font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.darkText }}>
              {table.status === "reserved" 
                ? table.reservedFor 
                : table.isRoom
                  ? (table.customer || 'NA')
                  : (table.waiter || 'NA')}
            </div>
            
            {/* Time */}
            <div className="text-sm mt-1 mb-2 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: COLORS.grayText }}>
              <span>{table.status === "reserved" ? table.reservedTime : table.time}</span>
            </div>

            {/* Action Buttons */}
            {isYetToConfirm ? (
              /* Yet to Confirm: Cancel (red X) left + Confirm (green tick) right */
              <div className="flex justify-between">
                <IconButton
                  icon={X}
                  onClick={() => onUpdateStatus?.(table.id, "available")}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-btn-${table.id}`}
                  title="Cancel Order"
                  ariaLabel={`Cancel order for table ${table.id}`}
                />
                <IconButton
                  icon={Check}
                  onClick={() => onUpdateStatus?.(table.id, "occupied")}
                  backgroundColor={COLORS.primaryGreen}
                  iconColor="white"
                  testId={`confirm-btn-${table.id}`}
                  title="Confirm Order"
                  ariaLabel={`Confirm order for table ${table.id}`}
                />
              </div>
            ) : hasOrders ? (
              /* Button rules (CHG-008 final):
                 fOrderStatus 1 (preparing) → KOT button (left) + "Preparing" label (right)
                 fOrderStatus 2 (ready)     → "Ready" label full width
                 fOrderStatus 5 (served)    → "Served" badge (left) + Bill button (right) */
              <div className="flex gap-2">
                {table.fOrderStatus === 1 && (
                  <>
                    <IconButton
                      icon={Printer}
                      onClick={() => {/* Print KOT - integrate with printer service */}}
                      backgroundColor={COLORS.borderGray}
                      testId={`print-btn-${table.id}`}
                      title="Print KOT"
                      ariaLabel={`Print KOT for table ${table.id}`}
                    />
                    <div
                      className="flex-1 flex items-center justify-center rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: COLORS.sectionBg, color: COLORS.primaryOrange }}
                      data-testid={`status-label-${table.id}`}
                    >
                      Preparing
                    </div>
                  </>
                )}
                {table.fOrderStatus === 2 && (
                  <div
                    className="flex-1 flex items-center justify-center rounded-lg text-xs font-semibold py-3"
                    style={{ backgroundColor: COLORS.sectionBg, color: COLORS.primaryGreen }}
                    data-testid={`status-label-${table.id}`}
                  >
                    Ready
                  </div>
                )}
                {table.fOrderStatus === 5 && (
                  <>
                    <div
                      className="p-3 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: COLORS.sectionBg }}
                      data-testid={`served-badge-${table.id}`}
                    >
                      <Check className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
                    </div>
                    <TextButton
                      onClick={() => onUpdateStatus?.(table.id, "paid")}
                      testId={`collect-btn-${table.id}`}
                      ariaLabel={`Collect payment for table ${table.id}`}
                      fullWidth={true}
                    >
                      {table.isRoom ? 'C/Out' : 'Bill'}
                    </TextButton>
                  </>
                )}
              </div>
            ) : table.status === "reserved" ? (
              /* Reserved: Cancel (red X) left + Seat button right */
              <div className="flex gap-2">
                <IconButton
                  icon={X}
                  onClick={() => onUpdateStatus?.(table.id, "available")}
                  backgroundColor={COLORS.errorBg}
                  iconColor={COLORS.errorText}
                  testId={`cancel-reservation-btn-${table.id}`}
                  title="Cancel Reservation"
                  ariaLabel={`Cancel reservation for table ${table.id}`}
                />
                <TextButton
                  onClick={() => onClick(table)}
                  backgroundColor={COLORS.primaryOrange}
                  testId={`seat-btn-${table.id}`}
                  ariaLabel={`Seat customer at table ${table.id}`}
                >
                  Seat
                </TextButton>
              </div>
            ) : statusConfig.buttonText && (
              /* Paid: Clear button - directly sets table to available */
              <TextButton
                onClick={() => onUpdateStatus?.(table.id, "available")}
                testId={`action-btn-${table.id}`}
                ariaLabel={`${statusConfig.buttonText} for table ${table.id}`}
                fullWidth={true}
              >
                {statusConfig.buttonText}
              </TextButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

TableCard.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.oneOf([
      'available', 
      'occupied', 
      'reserved', 
      'paid', 
      'yetToConfirm', 
      'billReady'
    ]).isRequired,
    amount: PropTypes.number,
    reservedFor: PropTypes.string,
    reservedTime: PropTypes.string,
    time: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  onOpenModal: PropTypes.func,
  onUpdateStatus: PropTypes.func,
  isSnoozed: PropTypes.bool,
  onToggleSnooze: PropTypes.func,
};

TableCard.defaultProps = {
  onOpenModal: null,
  onUpdateStatus: null,
  isSnoozed: false,
  onToggleSnooze: null,
};

export default TableCard;
