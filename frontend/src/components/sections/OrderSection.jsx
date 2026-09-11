import { COLORS } from "../../constants";
import DineInCard from "../cards/DineInCard";

// Order Section Component - Shows DineIn Cards for Order View (using neutral design)
const OrderSection = ({ section, onTableClick, onOpenOrderEntry }) => {
  // Only show tables with orders (occupied or billReady)
  const tablesWithOrders = section.tables.filter(table => 
    ["occupied", "billReady"].includes(table.status)
  );

  // Sort: billReady first, then occupied (by time urgency)
  const sortedTables = [...tablesWithOrders].sort((a, b) => {
    if (a.status === "billReady" && b.status !== "billReady") return -1;
    if (a.status !== "billReady" && b.status === "billReady") return 1;
    return 0;
  });

  if (sortedTables.length === 0) {
    return null; // Don't show section if no orders
  }

  return (
    <div data-testid={`order-section-${section.prefix}`} className="flex-1 min-w-[350px]">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
        <span className="font-medium" style={{ color: COLORS.darkText }}>{section.name}</span>
        <span style={{ color: COLORS.borderGray }}>|</span>
        <span>{sortedTables.length} Active Orders</span>
      </div>

      {/* Order Cards Grid - Now using DineInCard with neutral design */}
      <div className="grid grid-cols-1 gap-4">
        {sortedTables.map((table) => (
          <DineInCard
            key={table.id}
            table={table}
            onEdit={onOpenOrderEntry}
          />
        ))}
      </div>
    </div>
  );
};

export default OrderSection;
