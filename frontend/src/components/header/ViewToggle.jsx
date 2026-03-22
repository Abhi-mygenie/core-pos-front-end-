import { Grid3X3, List } from "lucide-react";
import { COLORS } from "../../constants";

/**
 * ViewToggle - Table/Order view toggle buttons
 */
const ViewToggle = ({ activeView, setActiveView }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        data-testid="table-view-btn"
        className={`p-2.5 rounded-md transition-colors ${
          activeView === "table" ? "bg-white shadow-sm" : ""
        }`}
        style={{ color: activeView === "table" ? COLORS.primaryOrange : COLORS.grayText }}
        onClick={() => setActiveView("table")}
        title="Table View"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>
      <button
        data-testid="order-view-btn"
        className={`p-2.5 rounded-md transition-colors ${
          activeView === "order" ? "bg-white shadow-sm" : ""
        }`}
        style={{ color: activeView === "order" ? COLORS.primaryOrange : COLORS.grayText }}
        onClick={() => setActiveView("order")}
        title="Order View"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ViewToggle;
