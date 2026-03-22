import { COLORS } from "../../constants";

/**
 * MenuItemPill - Single menu item as a pill button
 */
const MenuItemPill = ({
  item,
  cartCount,
  isFlashing,
  onAddToCart,
  onCustomize,
}) => {
  const handleClick = () => {
    if (item.customizable) {
      onCustomize(item);
    } else {
      onAddToCart(item);
    }
  };

  return (
    <button
      data-testid={`menu-item-${item.id}`}
      onClick={handleClick}
      className="relative px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2"
      style={{
        backgroundColor: isFlashing ? `${COLORS.primaryGreen}20` : "white",
        border: `1px solid ${cartCount > 0 ? COLORS.primaryGreen : COLORS.borderGray}`,
        color: COLORS.darkText,
        transition: "background-color 0.3s ease, border-color 0.3s ease",
        transform: isFlashing ? "scale(1.03)" : "scale(1)",
      }}
    >
      <span>{item.name}</span>
      {item.customizable && (
        <span className="text-xs font-medium" style={{ color: COLORS.primaryGreen }}>
          Customize
        </span>
      )}
      {cartCount > 0 && (
        <span
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
          style={{ backgroundColor: COLORS.primaryOrange }}
        >
          {cartCount}
        </span>
      )}
    </button>
  );
};

/**
 * MenuItemsGrid - Grid of menu item pills
 */
const MenuItemsGrid = ({
  items,
  cartCountMap,
  flashItemId,
  onAddToCart,
  onCustomize,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap gap-3">
        {items.map(item => (
          <MenuItemPill
            key={item.id}
            item={item}
            cartCount={cartCountMap[item.id] || 0}
            isFlashing={flashItemId === item.id}
            onAddToCart={onAddToCart}
            onCustomize={onCustomize}
          />
        ))}
      </div>
    </div>
  );
};

export { MenuItemPill };
export default MenuItemsGrid;
