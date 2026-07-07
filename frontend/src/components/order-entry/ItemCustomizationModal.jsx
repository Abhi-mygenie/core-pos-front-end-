import { useState, useEffect } from "react";
import { X, Minus, Plus, StickyNote, Check } from "lucide-react";
import { COLORS } from "../../constants";

const ItemCustomizationModal = ({ item, onClose, onAddToOrder }) => {
  const [selectedSize, setSelectedSize] = useState(null);
  // CR-006 Phase B / Bucket B1 (May-2026, multi-select variations):
  // selectedVariants supports BOTH shapes per group:
  //   - single-select (group.type === 'single' | undefined): { groupId: option }
  //   - multi-select  (group.type === 'multi'):              { groupId: option[] }
  // The shape per groupId is determined by the group config — never mixed.
  // Outbound transform (orderTransform.js::buildCartItem) normalises both
  // shapes into the backend's `{ values: { label: [...] } }` array contract.
  const [selectedVariants, setSelectedVariants] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({}); // { addonId: quantity }
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  // BUG-035 (Apr-2026, customisable variant): inline runtime price entry for ₹1 items
  // that are also customisable (have variants/addons). The plain ₹1 path uses
  // OrderEntry's standalone Enter-Price modal; this is the single-modal Option C.
  const [basePriceOverride, setBasePriceOverride] = useState('');
  const [basePriceError, setBasePriceError] = useState('');

  // Initialize with saved selections (re-edit from cart) or defaults (fresh from menu)
  useEffect(() => {
    if (!item) return;

    // Size: restore saved or default to first
    if (item.selectedSize) {
      setSelectedSize(item.selectedSize);
    } else if (item.sizes?.length > 0) {
      setSelectedSize(item.sizes[0]);
    }

    // Variant groups: restore saved or default to first option per group
    if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
      setSelectedVariants(item.selectedVariants);
    } else if (item.variantGroups?.length > 0) {
      const initialVariants = {};
      item.variantGroups.forEach(group => {
        // CR-006 Phase A / Sub-A1.1 (May-2026): only pre-select for REQUIRED
        // single-select groups. Optional groups stay empty until the user
        // clicks a pill, so the cart never carries a phantom auto-pick the
        // customer did not ask for. Multi-select rendering is Phase B / B1.
        if (group.required && group.type !== 'multi' && group.options?.length > 0) {
          initialVariants[group.id] = group.options[0];
        }
      });
      setSelectedVariants(initialVariants);
    }

    // Addons: restore saved (array → map) or empty
    if (item.selectedAddons?.length > 0) {
      const addonMap = {};
      item.selectedAddons.forEach(a => { addonMap[a.id] = a.quantity || 1; });
      setSelectedAddons(addonMap);
    } else {
      setSelectedAddons({});
    }

    // Quantity: restore saved or default to 1
    setQuantity(item.qty || item.quantity || 1);

    // BUG-035 (Apr-2026, customisable variant): reset dynamic-price entry on
    // each item change. Re-edits of placed dynamic items have item.price > 1 so
    // the entry block won't render; reset is harmless.
    setBasePriceOverride('');
    setBasePriceError('');

    // Notes: restore saved (convert itemNotes array to string if needed)
    const notesStr = item.notes
      || (Array.isArray(item.itemNotes) ? item.itemNotes.map(n => n.label).join(', ') : '')
      || '';
    if (notesStr) {
      setNotes(notesStr);
      setShowNotes(true);
    } else {
      setNotes('');
      setShowNotes(false);
    }
  }, [item]);

  // Calculate total price
  const calculateTotal = () => {
    // BUG-035 (Apr-2026, customisable variant): when item is dynamic-priced (₹1)
    // and no size is selected, basePrice comes from the cashier-entered override
    // instead of the catalog placeholder. Same _isDynamicPrice contract as the
    // plain-item path in OrderEntry (L477, L487).
    const isDynamic = Number(item?.price) === 1 && !selectedSize;
    const overridden = parseFloat(basePriceOverride);
    let basePrice = isDynamic
      ? (Number.isFinite(overridden) && overridden > 0 ? overridden : 0)
      : (selectedSize?.price || item?.price || 0);
    
    // Add variant group prices.
    // CR-006 Phase B / Bucket B1: each entry in selectedVariants is either
    // a single option object (single-select) or an array of options (multi-
    // select). Sum across both shapes uniformly.
    const variantsPrice = Object.values(selectedVariants).reduce((sum, sel) => {
      if (Array.isArray(sel)) {
        return sum + sel.reduce((s, opt) => s + (opt?.price || 0), 0);
      }
      return sum + (sel?.price || 0);
    }, 0);
    
    // Add addons price
    const addonsPrice = Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
      const addon = item.addons?.find(a => String(a.id) === String(addonId));
      return sum + (addon?.price || 0) * qty;
    }, 0);
    
    return (basePrice + variantsPrice + addonsPrice) * quantity;
  };

  // Handle variant selection
  const selectVariant = (groupId, option) => {
    const group = item.variantGroups?.find(g => g.id === groupId);

    // CR-006 Phase B / Bucket B1 (May-2026, multi-select): toggle option
    // in/out of the array. Respect group.max — once max reached, ignore
    // further selection clicks (existing options can still be deselected).
    // Empty arrays are stored as [] so re-edits round-trip cleanly; the
    // outbound transform skips groups with zero labels via Object.entries
    // filtering on truthy values (see L386 below).
    if (group?.type === 'multi') {
      setSelectedVariants(prev => {
        const current = Array.isArray(prev[groupId]) ? prev[groupId] : [];
        const exists = current.some(o => o.id === option.id);
        if (exists) {
          // Toggle off
          return { ...prev, [groupId]: current.filter(o => o.id !== option.id) };
        }
        // Cap at max (max=0 means no limit)
        if (group.max > 0 && current.length >= group.max) {
          return prev;
        }
        return { ...prev, [groupId]: [...current, option] };
      });
      return;
    }

    // CR-006 Phase A / Sub-A1.3 (May-2026): OPTIONAL single-select groups
    // toggle off when the cashier clicks the currently-selected pill — so a
    // pre-selection (or a customer's "actually, never mind") can be cleared
    // with one tap. Required groups stay replace-only because a required
    // pick cannot be empty.
    const isOptionalSingle = group && !group.required;
    setSelectedVariants(prev => {
      if (isOptionalSingle && prev[groupId]?.id === option.id) {
        const { [groupId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [groupId]: option };
    });
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

  // Check if all required variants are selected.
  // CR-006 Phase B / Bucket B1 (May-2026):
  //   - Required SINGLE group → must have a truthy selection (unchanged).
  //   - Required MULTI group  → array length must be >= max(1, group.min).
  //   - Optional MULTI group with min > 0 (rare) → if user picked anything,
  //     they still must hit min; empty array is allowed.
  const allRequiredSelected = () => {
    if (!item?.variantGroups) return true;
    return item.variantGroups.every(g => {
      const sel = selectedVariants[g.id];
      if (g.type === 'multi') {
        const count = Array.isArray(sel) ? sel.length : 0;
        if (g.required) {
          const minNeeded = Math.max(1, g.min || 0);
          return count >= minNeeded;
        }
        // Optional multi: if anything picked, enforce min; else fine.
        if (count > 0 && (g.min || 0) > 0) return count >= g.min;
        return true;
      }
      // Single-select
      if (g.required) return !!sel;
      return true;
    });
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
      // BUG-035 (Apr-2026, customisable variant): runtime price override flows
      // through cart, payment, print as the authoritative unit price. _isDynamicPrice
      // tag matches OrderEntry plain-item path (OrderEntry.jsx L477, L487).
      ...(Number(item?.price) === 1 && !selectedSize
        ? { price: parseFloat(basePriceOverride), _isDynamicPrice: true }
        : {}),
      customizations: {
        size: selectedSize?.name,
        // CR-006 Phase B / Bucket B1 (May-2026): handle both single-select
        // (option object) and multi-select (option array). Single emits one
        // line "Group: X". Multi emits "Group: X, Y, Z". Empty multi groups
        // are filtered out (no line printed) so receipts/KOTs stay clean.
        variants: Object.entries(selectedVariants)
          .map(([groupId, sel]) => {
            const group = item.variantGroups?.find(g => g.id === groupId);
            if (Array.isArray(sel)) {
              if (sel.length === 0) return null;
              return `${group?.name}: ${sel.map(o => o?.name).filter(Boolean).join(', ')}`;
            }
            if (!sel) return null;
            return `${group?.name}: ${sel?.name}`;
          })
          .filter(Boolean),
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
  // BUG-035 (Apr-2026, customisable variant): require positive override price
  // when the item is dynamic-priced and no size locks the base price.
  const isDynamicEntry = Number(item?.price) === 1 && !selectedSize;
  const dynamicPriceOk = !isDynamicEntry || (parseFloat(basePriceOverride) > 0);
  const canAddToOrder = (!hasVariants || selectedSize) && allRequiredSelected() && dynamicPriceOk;

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
          {/* BUG-035 (Apr-2026, customisable variant): inline Set Price field for
              ₹1 dynamic-priced customisable items. Only renders when no size is
              selected (size price wins as authoritative base when present). */}
          {isDynamicEntry && (
            <div data-testid="custom-dynamic-price-section">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: COLORS.grayText }}>
                Set Price <span style={{ color: COLORS.primaryOrange }}>*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-base font-medium" style={{ color: COLORS.darkText }}>₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={basePriceOverride}
                  onChange={(e) => { setBasePriceOverride(e.target.value); setBasePriceError(''); }}
                  className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 text-sm"
                  style={{ borderColor: basePriceError ? '#EF4444' : COLORS.borderGray, color: COLORS.darkText }}
                  data-testid="custom-dynamic-price-input"
                  autoFocus
                />
              </div>
              {basePriceError && (
                <p className="text-xs mt-1" style={{ color: '#EF4444' }} data-testid="custom-dynamic-price-error">
                  {basePriceError}
                </p>
              )}
            </div>
          )}

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

          {/* Variant Groups - Multiple selection groups.
              CR-006 Phase B / Bucket B1 (May-2026): branches on `group.type`.
              - 'single' (or undefined) → solid pill buttons (legacy look).
              - 'multi'                → outlined pills with checkmark icon
                                          (multi-select, choice 1b). A subtle
                                          inline hint shows min/max constraints
                                          and current count. */}
          {hasVariantGroups && item.variantGroups.map((group) => {
            const isMulti = group.type === 'multi';
            const selected = selectedVariants[group.id];
            const selectedArr = Array.isArray(selected) ? selected : [];
            const selectedCount = selectedArr.length;
            const minNeeded = group.min || 0;
            const maxAllowed = group.max || 0; // 0 = unlimited
            const maxReached = isMulti && maxAllowed > 0 && selectedCount >= maxAllowed;
            const minNotMet = isMulti && minNeeded > 0 && selectedCount > 0 && selectedCount < minNeeded;
            const requiredMultiUnmet = isMulti && group.required && selectedCount < Math.max(1, minNeeded);

            // Build hint text (only when relevant)
            let hintText = '';
            let hintColor = COLORS.grayText;
            if (isMulti) {
              if (requiredMultiUnmet || minNotMet) {
                const need = Math.max(1, minNeeded);
                hintText = `Pick at least ${need}`;
                hintColor = COLORS.primaryOrange;
              } else if (maxReached) {
                hintText = `Maximum ${maxAllowed} reached`;
                hintColor = COLORS.primaryOrange;
              } else if (maxAllowed > 0 || minNeeded > 0) {
                hintText = `${selectedCount} selected`
                  + (minNeeded > 0 ? ` • min ${minNeeded}` : '')
                  + (maxAllowed > 0 ? ` • max ${maxAllowed}` : '');
              }
            }

            return (
              <div key={group.id} data-testid={`variant-group-${group.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="text-xs font-medium block uppercase tracking-wide"
                    style={{ color: COLORS.grayText }}
                  >
                    {group.name} {group.required ? (
                      <span style={{ color: COLORS.primaryOrange }}>*</span>
                    ) : (
                      <span style={{ color: COLORS.grayText, fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
                    )}
                  </label>
                  {hintText && (
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: hintColor, textTransform: 'none' }}
                      data-testid={`variant-hint-${group.id}`}
                    >
                      {hintText}
                    </span>
                  )}
                </div>

                {isMulti ? (
                  // Multi-select: outlined pill with checkmark icon (choice 1b).
                  <div
                    className="flex flex-wrap gap-2"
                    data-testid={`variant-pills-multi-${group.id}`}
                  >
                    {group.options.map((option) => {
                      const isSelected = selectedArr.some(o => o.id === option.id);
                      const isDisabled = !isSelected && maxReached;
                      return (
                        <button
                          key={option.id}
                          data-testid={`variant-multi-${group.id}-${option.id}`}
                          onClick={() => selectVariant(group.id, option)}
                          disabled={isDisabled}
                          title={isDisabled ? `Maximum ${maxAllowed} reached` : ''}
                          className="px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: isSelected ? `${COLORS.primaryGreen}10` : 'white',
                            color: isSelected ? COLORS.primaryGreen : COLORS.darkText,
                            border: `1.5px solid ${isSelected ? COLORS.primaryGreen : COLORS.borderGray}`,
                          }}
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: isSelected ? COLORS.primaryGreen : 'transparent',
                              border: `1.5px solid ${isSelected ? COLORS.primaryGreen : COLORS.borderGray}`,
                            }}
                          >
                            {isSelected && <Check className="w-3 h-3" style={{ color: 'white' }} strokeWidth={3} />}
                          </span>
                          <span>{option.name}</span>
                          {option.price > 0 && (
                            <span className="text-xs" style={{ color: isSelected ? COLORS.primaryGreen : COLORS.grayText }}>
                              +₹{option.price}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Single-select (legacy): solid pill buttons. Behaviour unchanged.
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
                )}
              </div>
            );
          })}

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
            onClick={() => {
              // BUG-035 (Apr-2026, customisable variant): inline error when the
              // dynamic-price entry is missing/invalid. Disabled gate above
              // already blocks the click when canAddToOrder is false; this
              // surfaces the error message if the user somehow triggers it.
              if (isDynamicEntry && !(parseFloat(basePriceOverride) > 0)) {
                setBasePriceError('Please enter a valid price greater than 0');
                return;
              }
              handleAddToOrder();
            }}
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
