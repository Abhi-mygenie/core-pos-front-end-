import { useState, useEffect } from "react";
import { X, Minus, Plus, StickyNote } from "lucide-react";
import { COLORS } from "../../constants";

const ItemCustomizationModal = ({ item, onClose, onAddToOrder }) => {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedVariants, setSelectedVariants] = useState({}); // { groupId: optionId }
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({}); // { addonId: quantity }
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Initialize with first size/variant options if available
  useEffect(() => {
    if (item?.sizes?.length > 0) {
      setSelectedSize(item.sizes[0]);
    }
    // Initialize variant groups with first option
    if (item?.variantGroups?.length > 0) {
      const initialVariants = {};
      item.variantGroups.forEach(group => {
        if (group.options?.length > 0) {
          initialVariants[group.id] = group.options[0];
        }
      });
      setSelectedVariants(initialVariants);
    }
  }, [item]);

  // Calculate total price
  const calculateTotal = () => {
    // Base price from size or item price
    let basePrice = selectedSize?.price || item?.price || 0;
    
    // Add variant group prices
    const variantsPrice = Object.values(selectedVariants).reduce((sum, option) => {
      return sum + (option?.price || 0);
    }, 0);
    
    // Add addons price
    const addonsPrice = Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
      const addon = item.addons?.find(a => a.id === addonId);
      return sum + (addon?.price || 0) * qty;
    }, 0);
    
    return (basePrice + variantsPrice + addonsPrice) * quantity;
  };

  // Handle variant selection
  const selectVariant = (groupId, option) => {
    setSelectedVariants(prev => ({ ...prev, [groupId]: option }));
  };

  // Handle addon toggle/quantity
  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      if (prev[addon.id]) {
        const { [addon.id]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addon.id]: 1 };
    });
  };

  // Update addon quantity
  const updateAddonQuantity = (addonId, delta) => {
    setSelectedAddons((prev) => {
      const newQty = (prev[addonId] || 1) + delta;
      if (newQty <= 0) {
        const { [addonId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [addonId]: newQty };
    });
  };

  // Handle quantity change
  const updateQuantity = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Check if all required variants are selected
  const allRequiredSelected = () => {
    if (!item?.variantGroups) return true;
    return item.variantGroups
      .filter(g => g.required)
      .every(g => selectedVariants[g.id]);
  };

  // Handle add to order
  const handleAddToOrder = () => {
    const addonsArray = Object.entries(selectedAddons).map(([addonId, qty]) => {
      // Use loose comparison to handle string/number ID mismatch from Object.entries
      const addon = item.addons?.find(a => String(a.id) === String(addonId));
      return { ...addon, quantity: qty };
    });

    const customizedItem = {
      ...item,
      selectedSize,
      selectedVariants,
      quantity,
      selectedAddons: addonsArray,
      notes,
      totalPrice: calculateTotal(),
      customizations: {
        size: selectedSize?.name,
        variants: Object.entries(selectedVariants).map(([groupId, option]) => {
          const group = item.variantGroups?.find(g => g.id === groupId);
          return `${group?.name}: ${option?.name}`;
        }),
        addons: addonsArray.map((a) => `${a.name} x${a.quantity}`),
        notes,
      },
    };
    onAddToOrder(customizedItem);
    onClose();
  };

  if (!item) return null;

  const hasVariants = item.sizes && item.sizes.length > 0;
  const hasVariantGroups = item.variantGroups && item.variantGroups.length > 0;
  const hasAddons = item.addons && item.addons.length > 0;

  // Get dietary tags
  const getDietaryTags = () => {
    const tags = [];
    if (item.type === "veg") tags.push({ label: "Veg", color: COLORS.primaryGreen });
    if (item.type === "nonveg") tags.push({ label: "Non-Veg", color: "#dc2626" });
    if (item.type === "egg") tags.push({ label: "Egg", color: "#f59e0b" });
    if (item.glutenFree) tags.push({ label: "Gluten Free", color: COLORS.grayText });
    if (item.jain) tags.push({ label: "Jain", color: COLORS.grayText });
    if (item.vegan) tags.push({ label: "Vegan", color: COLORS.grayText });
    return tags;
  };

  const dietaryTags = getDietaryTags();
  const canAddToOrder = (!hasVariants || selectedSize) && allRequiredSelected();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center"
      data-testid="item-customization-modal"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        data-testid="modal-backdrop"
      />

      {/* Modal Content */}
      <div 
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="modal-content"
      >
        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 
                className="text-xl font-bold"
                style={{ color: COLORS.darkText }}
                data-testid="modal-item-name"
              >
                {item.name}
              </h2>
              {/* Dietary Tags */}
              {dietaryTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {dietaryTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                        border: `1px solid ${tag.color}30`
                      }}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
              {/* Base Price */}
              {!hasVariants && !hasVariantGroups && (
                <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                  ₹{item.price}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors -mr-1 -mt-1"
              data-testid="modal-close-btn"
            >
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          {/* Size Section - Horizontal Pills (legacy support) */}
          {hasVariants && (
            <div data-testid="size-section">
              <label 
                className="text-xs font-medium mb-2 block uppercase tracking-wide"
                style={{ color: COLORS.grayText }}
              >
                Size
              </label>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      data-testid={`size-option-${size.id}`}
                      onClick={() => setSelectedSize(size)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-center min-w-[80px]"
                      style={{
                        backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.sectionBg,
                        color: isSelected ? "white" : COLORS.darkText,
                        border: `1px solid ${isSelected ? COLORS.primaryGreen : COLORS.borderGray}`,
                      }}
                    >
                      <span>{size.name}</span>
                      <span className="text-xs mt-0.5" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : COLORS.grayText }}>
                        ₹{size.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant Groups - Multiple selection groups */}
          {hasVariantGroups && item.variantGroups.map((group) => (
            <div key={group.id} data-testid={`variant-group-${group.id}`}>
              <label 
                className="text-xs font-medium mb-2 block uppercase tracking-wide"
                style={{ color: COLORS.grayText }}
              >
                {group.name} {group.required && <span style={{ color: COLORS.primaryOrange }}>*</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isSelected = selectedVariants[group.id]?.id === option.id;
                  return (
                    <button
                      key={option.id}
                      data-testid={`variant-${group.id}-${option.id}`}
                      onClick={() => selectVariant(group.id, option)}
                      className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: isSelected ? COLORS.primaryGreen : COLORS.sectionBg,
                        color: isSelected ? "white" : COLORS.darkText,
                        border: `1px solid ${isSelected ? COLORS.primaryGreen : COLORS.borderGray}`,
                      }}
                    >
                      <span>{option.name}</span>
                      {option.price > 0 && (
                        <span className="text-xs" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : COLORS.grayText }}>
                          +₹{option.price}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Addon Section - Pill Buttons with Quantity */}
          {hasAddons && (
            <div data-testid="addon-section">
              <label 
                className="text-xs font-medium mb-2 block uppercase tracking-wide"
                style={{ color: COLORS.grayText }}
              >
                Addons
              </label>
              <div className="flex flex-wrap gap-2">
                {item.addons.map((addon) => {
                  const addonQty = selectedAddons[addon.id] || 0;
                  const isSelected = addonQty > 0;
                  return (
                    <div
                      key={addon.id}
                      data-testid={`addon-option-${addon.id}`}
                      className="rounded-xl text-sm font-medium transition-all flex items-center overflow-hidden"
                      style={{
                        backgroundColor: isSelected ? `${COLORS.primaryOrange}15` : COLORS.sectionBg,
                        border: `1px solid ${isSelected ? COLORS.primaryOrange : COLORS.borderGray}`,
                      }}
                    >
                      {isSelected ? (
                        <>
                          {/* Decrease button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); updateAddonQuantity(addon.id, -1); }}
                            className="px-2 py-2 hover:bg-black/5 transition-colors"
                            data-testid={`addon-decrease-${addon.id}`}
                          >
                            <Minus className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                          </button>
                          
                          {/* Addon name and quantity */}
                          <span 
                            className="px-1 py-2"
                            style={{ color: COLORS.primaryOrange }}
                          >
                            {addon.name} <span className="font-bold">×{addonQty}</span>
                          </span>
                          
                          {/* Increase button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); updateAddonQuantity(addon.id, 1); }}
                            className="px-2 py-2 hover:bg-black/5 transition-colors"
                            data-testid={`addon-increase-${addon.id}`}
                          >
                            <Plus className="w-3.5 h-3.5" style={{ color: COLORS.primaryOrange }} />
                          </button>
                          
                          {/* Price */}
                          <span 
                            className="text-xs pr-3 py-2"
                            style={{ color: COLORS.primaryOrange }}
                          >
                            ₹{addon.price * addonQty}
                          </span>
                        </>
                      ) : (
                        <button
                          onClick={() => toggleAddon(addon)}
                          className="px-3 py-2 flex items-center gap-2"
                        >
                          <span style={{ color: COLORS.darkText }}>{addon.name}</span>
                          <span 
                            className="text-xs"
                            style={{ color: COLORS.grayText }}
                          >
                            +₹{addon.price}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Section - Compact */}
          <div data-testid="notes-section">
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-2 text-sm transition-colors hover:opacity-80"
                style={{ color: COLORS.grayText }}
              >
                <StickyNote className="w-4 h-4" />
                <span>Add note...</span>
              </button>
            ) : (
              <input
                type="text"
                placeholder="Add special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: COLORS.borderGray,
                  backgroundColor: COLORS.sectionBg,
                }}
                data-testid="notes-input"
              />
            )}
          </div>
        </div>

        {/* Footer - Quantity + Total + Action */}
        <div 
          className="p-4 border-t"
          style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
        >
          {/* Quantity and Total Row */}
          <div className="flex items-center justify-between mb-4">
            {/* Quantity Stepper */}
            <div 
              className="flex items-center gap-1 rounded-full px-1 py-1 bg-white"
              style={{ border: `1px solid ${COLORS.borderGray}` }}
              data-testid="quantity-section"
            >
              <button
                onClick={() => updateQuantity(-1)}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                data-testid="quantity-decrease-btn"
              >
                <Minus className="w-4 h-4" style={{ color: COLORS.darkText }} />
              </button>
              <span 
                className="w-8 text-center font-bold text-lg"
                style={{ color: COLORS.darkText }}
                data-testid="quantity-value"
              >
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(1)}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                data-testid="quantity-increase-btn"
              >
                <Plus className="w-4 h-4" style={{ color: COLORS.darkText }} />
              </button>
            </div>

            {/* Total Price */}
            <div className="text-right">
              <span className="text-xs block" style={{ color: COLORS.grayText }}>Total</span>
              <span 
                className="text-2xl font-bold"
                style={{ color: COLORS.primaryGreen }}
                data-testid="total-price"
              >
                ₹{calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add to Order Button */}
          <button
            onClick={handleAddToOrder}
            disabled={!canAddToOrder}
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="add-to-order-btn"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCustomizationModal;
