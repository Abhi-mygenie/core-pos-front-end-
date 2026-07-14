import { useMemo } from "react";
import { COLORS } from "../../constants";

/**
 * Compute duration between two timestamps
 * @param {string} startTime - ISO timestamp
 * @param {string} endTime - ISO timestamp or null (uses now)
 * @returns {string} - Duration string (e.g., "14m", "2h", "3d")
 */
const computeDuration = (startTime, endTime) => {
  if (!startTime) return "";
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end - start;
  
  if (diffMs < 0) return "0m";
  
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

/**
 * OrderTimeline - Compact dot timeline showing order progression
 * 
 * Format: ●──14m──●──3m──●
 *         Placed  Ready  Served
 * 
 * @param {Object} props
 * @param {string} props.createdAt - Order placed timestamp
 * @param {string|null} props.readyAt - Ready timestamp
 * @param {string|null} props.servedAt - Served timestamp
 * @param {number} props.fOrderStatus - 1=Preparing, 2=Ready, 3=Served
 */
const OrderTimeline = ({ createdAt, readyAt, servedAt, fOrderStatus }) => {
  const timeline = useMemo(() => {
    // Stage 1: Placed → Ready
    const stage1Duration = readyAt 
      ? computeDuration(createdAt, readyAt)
      : computeDuration(createdAt, null); // Still cooking
    
    // Stage 2: Ready → Served
    const stage2Duration = servedAt && readyAt
      ? computeDuration(readyAt, servedAt)
      : readyAt 
        ? computeDuration(readyAt, null) // Waiting to serve
        : "";
    
    // Stage 3: Served → Bill (now)
    const stage3Duration = servedAt
      ? computeDuration(servedAt, null)
      : "";
    
    return {
      stage1: stage1Duration,
      stage2: stage2Duration,
      stage3: stage3Duration,
      isReady: fOrderStatus >= 2,
      isServed: fOrderStatus >= 3,
    };
  }, [createdAt, readyAt, servedAt, fOrderStatus]);

  // Don't render if no createdAt
  if (!createdAt) return null;

  return (
    <div className="flex items-center gap-0.5" data-testid="order-timeline">
      {/* Stage 1: Placed (always filled) */}
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: COLORS.primaryGreen }}
        title="Order Placed"
      />
      
      {/* Duration: Placed → Ready */}
      <div className="flex items-center">
        <div className="w-2 h-0.5" style={{ backgroundColor: COLORS.borderGray }} />
        <span className="text-xs px-0.5" style={{ color: COLORS.grayText, fontSize: '10px' }}>
          {timeline.stage1}
        </span>
        <div className="w-2 h-0.5" style={{ backgroundColor: COLORS.borderGray }} />
      </div>
      
      {/* Stage 2: Ready */}
      <div 
        className="w-2 h-2 rounded-full"
        style={{ 
          backgroundColor: timeline.isReady ? COLORS.primaryGreen : 'transparent',
          border: timeline.isReady ? 'none' : `1.5px solid ${COLORS.borderGray}`
        }}
        title="Ready"
      />
      
      {/* Duration: Ready → Served (only show if Ready) */}
      {timeline.isReady && (
        <div className="flex items-center">
          <div className="w-2 h-0.5" style={{ backgroundColor: COLORS.borderGray }} />
          <span className="text-xs px-0.5" style={{ color: COLORS.grayText, fontSize: '10px' }}>
            {timeline.stage2}
          </span>
          <div className="w-2 h-0.5" style={{ backgroundColor: COLORS.borderGray }} />
        </div>
      )}
      
      {/* Stage 3: Served (only show if Ready) */}
      {timeline.isReady && (
        <div 
          className="w-2 h-2 rounded-full"
          style={{ 
            backgroundColor: timeline.isServed ? COLORS.primaryGreen : 'transparent',
            border: timeline.isServed ? 'none' : `1.5px solid ${COLORS.borderGray}`
          }}
          title="Served"
        />
      )}
    </div>
  );
};

export default OrderTimeline;
