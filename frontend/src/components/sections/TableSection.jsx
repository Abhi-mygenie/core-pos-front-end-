import { COLORS } from "../../constants";
import TableCard from "../cards/TableCard";
import { sortByActiveFirst, TABLE_STATUS_PRIORITY } from "../../utils";

// Section Component for Table View
const TableSection = ({ section, onTableClick, onOpenModal, onUpdateStatus, activeFirst, searchQuery, matchingTableIds, snoozedOrders, onToggleSnooze, currencySymbol }) => {
  // Filter tables based on search
  const filteredTables = matchingTableIds === null 
    ? section.tables 
    : section.tables.filter(t => matchingTableIds.has(t.id));

  // Sort tables using priority-based utility
  const sortedTables = sortByActiveFirst(filteredTables, TABLE_STATUS_PRIORITY, activeFirst);

  // Don't render section if no matching tables
  if (searchQuery && sortedTables.length === 0) {
    return null;
  }

  return (
    <div data-testid={`section-${section.prefix}`} className="flex-1 min-w-[280px] max-w-[360px]">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.grayText }}>
        <span className="font-medium" style={{ color: COLORS.darkText }}>{section.name}</span>
        {searchQuery && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.primaryOrange, color: 'white' }}>
            {sortedTables.length} found
          </span>
        )}
      </div>

      {/* Tables Grid - 2 columns with fixed width */}
      <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(2, 160px)' }}>
        {sortedTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onClick={onTableClick}
            onOpenModal={onOpenModal}
            onUpdateStatus={onUpdateStatus}
            isSnoozed={snoozedOrders?.has(table.id)}
            onToggleSnooze={onToggleSnooze}
            currencySymbol={currencySymbol}
          />
        ))}
      </div>
    </div>
  );
};

export default TableSection;
