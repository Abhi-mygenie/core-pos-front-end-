import { useState } from "react";
import { X } from "lucide-react";
import { COLORS } from "../../constants";
import CategoryList from "./menu/CategoryList";
import ProductList from "./menu/ProductList";

const MenuManagementPanel = ({ isOpen, onClose, sidebarWidth }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [menuType, setMenuType] = useState("Normal");

  const handleClose = () => {
    setSelectedCategoryId(null);
    onClose();
  };

  return (
    <div
      data-testid="menu-management-panel"
      className="fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl"
      style={{
        left: `${sidebarWidth || 70}px`,
        backgroundColor: COLORS.lightBg,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${COLORS.borderGray}` }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Menu Management
          </h2>
          <select
            value={menuType}
            onChange={(e) => setMenuType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border outline-none bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
            data-testid="menu-type-selector"
          >
            <option value="Normal">Normal</option>
            <option value="Party">Party</option>
            <option value="Premium">Premium</option>
          </select>
        </div>
        <button
          data-testid="menu-close-btn"
          onClick={handleClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Categories (30%) */}
        <div
          className="w-[30%] p-4 overflow-hidden flex flex-col"
          style={{ borderRight: `1px solid ${COLORS.borderGray}` }}
        >
          <CategoryList
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        {/* Right: Products (70%) */}
        <div className="w-[70%] p-4 overflow-hidden flex flex-col">
          <ProductList selectedCategoryId={selectedCategoryId} />
        </div>
      </div>
    </div>
  );
};

export default MenuManagementPanel;
